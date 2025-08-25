const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
let Pool;
try { ({ Pool } = require('pg')); } catch (_) { /* pg optional for local */ }

const app = express();
const PORT = process.env.PORT || 3000;
const USE_DB = !!process.env.DATABASE_URL && typeof Pool === 'function';
let pool = null;
if (USE_DB) {
    const isProd = process.env.NODE_ENV === 'production';
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isProd ? { rejectUnauthorized: false } : undefined
    });
}

// Middleware
app.use(helmet({
    // Allow loading fonts/CSS from CDNs used by the admin UI
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Disable COEP to avoid blocking cross-origin resources
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// === Postgres bootstrap ===
async function ensureTables() {
    if (!USE_DB) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS runs (
            id UUID PRIMARY KEY,
            date_iso TEXT NOT NULL,
            time TEXT NOT NULL,
            location TEXT NOT NULL,
            pace TEXT NOT NULL,
            description TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS leaderboard_users (
            id UUID PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            username TEXT UNIQUE,
            total_runs INTEGER NOT NULL DEFAULT 0,
            total_miles DOUBLE PRECISION NOT NULL DEFAULT 0,
            last_updated TEXT NOT NULL,
            app_user_id TEXT,
            is_registered BOOLEAN NOT NULL DEFAULT false
        );
        CREATE TABLE IF NOT EXISTS rsvps (
            id UUID PRIMARY KEY,
            run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            username TEXT,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rsvps_run ON rsvps(run_id);
    `);
}

async function dbGetRuns() {
    const { rows } = await pool.query('SELECT id, date_iso AS date, time, location, pace, description FROM runs ORDER BY date_iso ASC');
    return rows;
}

async function dbGetRunWithRsvps(runId) {
    const runRes = await pool.query('SELECT id, date_iso AS date, time, location, pace, description FROM runs WHERE id = $1', [runId]);
    if (runRes.rowCount === 0) return null;
    const rsvpsRes = await pool.query('SELECT id, run_id AS "runId", first_name AS "firstName", last_name AS "lastName", username, status, timestamp FROM rsvps WHERE run_id = $1 ORDER BY timestamp DESC', [runId]);
    return { ...runRes.rows[0], rsvps: rsvpsRes.rows };
}

async function dbCreateRun(newRun) {
    await pool.query(
        'INSERT INTO runs (id, date_iso, time, location, pace, description) VALUES ($1,$2,$3,$4,$5,$6)',
        [newRun.id, newRun.date, newRun.time, newRun.location, newRun.pace, newRun.description]
    );
    return newRun;
}

async function dbCountRuns() {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM runs');
    return rows[0].count;
}

async function dbUpdateRun(updatedRun) {
    await pool.query(
        'UPDATE runs SET date_iso=$2, time=$3, location=$4, pace=$5, description=$6 WHERE id=$1',
        [updatedRun.id, updatedRun.date, updatedRun.time, updatedRun.location, updatedRun.pace, updatedRun.description]
    );
    return updatedRun;
}

async function dbDeleteRun(runId) {
    await pool.query('DELETE FROM runs WHERE id = $1', [runId]);
}

async function dbGetLeaderboard(includeAll) {
    const { rows } = await pool.query(
        `SELECT id, first_name AS "firstName", last_name AS "lastName", username, total_runs AS "totalRuns",
                total_miles AS "totalMiles", last_updated AS "lastUpdated", app_user_id AS "appUserId",
                is_registered AS "isRegistered"
         FROM leaderboard_users ${includeAll ? '' : 'WHERE is_registered = true'} ORDER BY total_miles DESC`
    );
    return rows;
}

async function dbCreateLeaderboardUser(user) {
    await pool.query(
        `INSERT INTO leaderboard_users (id, first_name, last_name, username, total_runs, total_miles, last_updated, app_user_id, is_registered)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [user.id, user.firstName, user.lastName, user.username, user.totalRuns, user.totalMiles, user.lastUpdated, user.appUserId, user.isRegistered]
    );
    return user;
}

async function dbUpdateLeaderboardUser(userId, patch) {
    const { firstName, lastName, totalRuns, totalMiles, appUserId, isRegistered } = patch;
    const now = new Date().toISOString();
    await pool.query(
        `UPDATE leaderboard_users SET first_name=$2, last_name=$3, total_runs=$4, total_miles=$5, last_updated=$6,
                app_user_id=COALESCE($7, app_user_id), is_registered=COALESCE($8, is_registered) WHERE id=$1`,
        [userId, firstName, lastName, totalRuns, totalMiles, now, appUserId ?? null, typeof isRegistered === 'boolean' ? isRegistered : null]
    );
    const { rows } = await pool.query(
        `SELECT id, first_name AS "firstName", last_name AS "lastName", username, total_runs AS "totalRuns",
                total_miles AS "totalMiles", last_updated AS "lastUpdated", app_user_id AS "appUserId", is_registered AS "isRegistered"
         FROM leaderboard_users WHERE id=$1`,
        [userId]
    );
    return rows[0];
}

async function dbDeleteLeaderboardUser(userId) {
    await pool.query('DELETE FROM leaderboard_users WHERE id=$1', [userId]);
}

async function dbCreateOrUpdateRSVP(runId, entry) {
    // If username present, replace existing username entry for this run
    if (entry.username) {
        await pool.query('DELETE FROM rsvps WHERE run_id=$1 AND LOWER(COALESCE(username, \'\')) = LOWER($2)', [runId, entry.username]);
    }
    await pool.query(
        `INSERT INTO rsvps (id, run_id, first_name, last_name, username, status, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [entry.id, runId, entry.firstName, entry.lastName, entry.username, entry.status, entry.timestamp]
    );
    return entry;
}

// Timezone helpers: Convert America/New_York wall time to UTC ISO string reliably
function formatInTimeZone(date, timeZone) {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = dtf.formatToParts(date);
    const map = {};
    for (const part of parts) {
        if (part.type !== 'literal') map[part.type] = part.value;
    }
    return {
        year: parseInt(map.year, 10),
        monthZero: parseInt(map.month, 10) - 1,
        day: parseInt(map.day, 10),
        hour: parseInt(map.hour, 10),
        minute: parseInt(map.minute, 10),
        second: parseInt(map.second, 10)
    };
}

// Convert America/New_York wall time to the exact UTC instant (DST-safe)
function easternWallTimeToISOString(year, monthZeroBased, day, hour, minute) {
    const timeZone = 'America/New_York';
    // Start with a UTC guess having the desired wall components
    const utcGuessMs = Date.UTC(year, monthZeroBased, day, hour, minute, 0, 0);
    const utcGuess = new Date(utcGuessMs);
    // What wall time do we get in the zone for this instant?
    const wallFromGuess = formatInTimeZone(utcGuess, timeZone);
    // Build a UTC ms for the wall-from-guess components (interpreted as UTC)
    const wallFromGuessMs = Date.UTC(
        wallFromGuess.year,
        wallFromGuess.monthZero,
        wallFromGuess.day,
        wallFromGuess.hour,
        wallFromGuess.minute,
        wallFromGuess.second
    );
    // Our intended wall components (interpreted as UTC)
    const intendedWallMs = Date.UTC(year, monthZeroBased, day, hour, minute, 0, 0);
    // Difference tells us how far off the guess is; subtract to correct
    const diffMs = wallFromGuessMs - intendedWallMs;
    const correctedUtcMs = utcGuessMs - diffMs;
    return new Date(correctedUtcMs).toISOString();
}

// Serve static files from web-admin directory with cache control
app.use(express.static('web-admin', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        if (path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Add cache control headers to prevent caching issues
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
});

// Helper function to create properly formatted dates in Eastern Time
function createFormattedDate(daysFromNow, timeString = "06:00") {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    
    // Parse the time to get hours and minutes
    let timeHours = 6; // Default to 6 AM
    let timeMinutes = 0;
    
    if (timeString && timeString.includes(':')) {
        const timeParts = timeString.split(':');
        timeHours = parseInt(timeParts[0], 10);
        timeMinutes = parseInt(timeParts[1], 10);
    }
    
        // Set time to the specified time exactly as specified
        // This ensures the date stays exactly as specified without timezone shifting
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        return easternWallTimeToISOString(year, month, day, timeHours, timeMinutes);
}

// In-memory data storage (replace with database in production)
let runs = [];

// In-memory notification storage (replace with database in production)
let notifications = [];

// In-memory leaderboard storage (replace with database in production)
let leaderboardUsers = [];
// In-memory RSVPs per runId
let runRsvps = {}; // { [runId]: [{ id, runId, firstName, lastName, username, status, timestamp }] }

// Helper function to send notifications to all users
function sendRunNotification(run) {
    const notification = {
        id: uuidv4(),
        type: 'new_run',
        title: 'New Run Scheduled! 🏃‍♂️',
        message: `Join Kam for a run at ${run.location} on ${new Date(run.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })} at ${run.time}`,
        details: {
            runId: run.id,
            date: run.date,
            time: run.time,
            location: run.location,
            pace: run.pace,
            description: run.description
        },
        timestamp: new Date().toISOString(),
        read: false
    };
    
    notifications.push(notification);
    
    // Log the notification
    console.log(`🔔 Notification sent: ${notification.title}`);
    console.log(`   Message: ${notification.message}`);
    
    // In a real app, you would send push notifications here
    // For now, we'll store them and clients can poll for updates
    
    return notification;
}

// Function to normalize existing run dates to ISO format
function normalizeExistingRunDates() {
    console.log('🔧 Normalizing existing run dates to ISO format...');
    runs.forEach(run => {
        try {
            const dateInput = String(run.date);
            let year, month, day;
            const ymdMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (ymdMatch) {
                year = parseInt(ymdMatch[1], 10);
                month = parseInt(ymdMatch[2], 10) - 1;
                day = parseInt(ymdMatch[3], 10);
            } else {
                const parsedDate = new Date(dateInput);
                if (!isNaN(parsedDate.getTime())) {
                    year = parsedDate.getUTCFullYear();
                    month = parsedDate.getUTCMonth();
                    day = parsedDate.getUTCDate();
                } else {
                    return; // skip invalid
                }
            }
                
                // Parse the time to get hours and minutes
                let timeHours = 0;
                let timeMinutes = 0;
                
                if (run.time && run.time.includes(':')) {
                    const timeParts = run.time.split(':');
                    timeHours = parseInt(timeParts[0], 10);
                    timeMinutes = parseInt(timeParts[1], 10);
                }
                
                // Convert America/New_York wall time to exact UTC ISO (DST-safe)
                const isoDate = easternWallTimeToISOString(year, month, day, timeHours, timeMinutes);
                
                if (run.date !== isoDate) {
                    console.log(`📅 Normalizing date and time to Eastern Time: ${run.date} ${run.time} -> ${isoDate}`);
                    run.date = isoDate;
                }
        } catch (error) {
            console.error(`❌ Error normalizing date for run ${run.id}:`, error);
        }
    });
    console.log('✅ Date normalization complete');
}

// Initialize with sample data
function initializeSampleData() {
    runs = [
        {
            id: uuidv4(),
            date: createFormattedDate(1, '06:00'), // Tomorrow
            time: '06:00',
            location: 'Central Park',
            pace: '8:30/mile',
            description: 'Morning run around the reservoir'
        },
        {
            id: uuidv4(),
            date: createFormattedDate(3, '17:30'), // 3 days from now
            time: '17:30',
            location: 'Brooklyn Bridge',
            pace: '9:00/mile',
            description: 'Sunset run across the bridge'
        },
        {
            id: uuidv4(),
            date: createFormattedDate(7, '07:00'), // 7 days from now
            time: '07:00',
            location: 'Prospect Park',
            pace: '7:30/mile',
            description: 'Speed workout on the loop'
        }
    ];
    
    // Initialize sample leaderboard users
    leaderboardUsers = [
        {
            id: uuidv4(),
            firstName: 'John',
            lastName: 'Smith',
            username: 'johnsmith',
            totalRuns: 15,
            totalMiles: 45.5,
            lastUpdated: new Date().toISOString(),
            appUserId: 'sample-john',
            isRegistered: true
        },
        {
            id: uuidv4(),
            firstName: 'Sarah',
            lastName: 'Johnson',
            username: 'sarahj',
            totalRuns: 12,
            totalMiles: 38.2,
            lastUpdated: new Date().toISOString(),
            appUserId: 'sample-sarah',
            isRegistered: true
        },
        {
            id: uuidv4(),
            firstName: 'Mike',
            lastName: 'Davis',
            username: 'miked',
            totalRuns: 8,
            totalMiles: 25.0,
            lastUpdated: new Date().toISOString(),
            appUserId: 'sample-mike',
            isRegistered: true
        }
    ];
    
    // Send notifications for sample data
    runs.forEach(run => {
        sendRunNotification(run);
    });
    
    console.log(`📊 Sample data initialized: ${runs.length} runs, ${notifications.length} notifications, ${leaderboardUsers.length} leaderboard users`);
}

// Helper function to validate UUID format
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Helper function to find run by ID
function findRunById(id) {
    return runs.find(run => run.id === id);
}

// Helper function to validate and normalize run data
function validateAndNormalizeRunData(runData) {
    const required = ['date', 'time', 'location', 'pace'];
    for (const field of required) {
        if (!runData[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    // Validate and normalize date format to ensure consistency
    let normalizedDate;
    try {
        const dateInput = String(runData.date).trim();

        // Parse the time to get hours and minutes
        let timeHours = 0;
        let timeMinutes = 0;
        if (runData.time && runData.time.includes(':')) {
            const timeParts = runData.time.split(':');
            timeHours = parseInt(timeParts[0], 10);
            timeMinutes = parseInt(timeParts[1], 10);
        }

        // Extract date parts without timezone effects
        let year, month, day;
        const ymdMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymdMatch) {
            year = parseInt(ymdMatch[1], 10);
            month = parseInt(ymdMatch[2], 10) - 1; // zero-based
            day = parseInt(ymdMatch[3], 10);
        } else {
            const parsedDate = new Date(dateInput);
            if (isNaN(parsedDate.getTime())) {
                throw new Error('Invalid date format');
            }
            // Use UTC getters to avoid local TZ shifting on pure dates
            year = parsedDate.getUTCFullYear();
            month = parsedDate.getUTCMonth();
            day = parsedDate.getUTCDate();
        }

        // Convert America/New_York wall time to an exact UTC ISO (DST-safe)
        normalizedDate = easternWallTimeToISOString(year, month, day, timeHours, timeMinutes);

        console.log(`📅 Date stored (no TZ shift): ${dateInput} ${runData.time} -> ${normalizedDate}`);
    } catch (error) {
        throw new Error('Invalid date format. Please use YYYY-MM-DD format (e.g., 2025-08-27)');
    }
    
    // Normalize and validate time
    let normalizedTime;
    if (typeof runData.time === 'string') {
        // Handle various time formats
        const timeStr = runData.time.trim();
        
        // Check if it's already in HH:MM format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (timeRegex.test(timeStr)) {
            normalizedTime = timeStr;
        } else {
            // Try to parse other time formats
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
                
                if (period === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (period === 'AM' && hours === 12) {
                    hours = 0;
                }
                
                normalizedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
            } else {
                throw new Error('Invalid time format. Please use HH:MM format (e.g., 06:00, 14:30)');
            }
        }
    } else {
        throw new Error('Time must be a string');
    }
    
    // Normalize location (trim whitespace, capitalize first letter)
    const normalizedLocation = runData.location.trim().replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
    
    // Normalize pace (ensure consistent format)
    const normalizedPace = runData.pace.trim();
    if (!normalizedPace.match(/^[\d:]+(\/mile|\/km)$/)) {
        throw new Error('Invalid pace format. Please use format like "8:30/mile" or "5:15/km"');
    }
    
    // Normalize description (trim whitespace, default to empty string)
    const normalizedDescription = (runData.description || '').trim();
    
    return {
        date: normalizedDate,
        time: normalizedTime,
        location: normalizedLocation,
        pace: normalizedPace,
        description: normalizedDescription
    };
}

// Routes

// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        endpoints: {
            runs: '/api/runs',
            leaderboard: '/api/leaderboard',
            notifications: '/api/notifications'
        }
    });
});

// GET /api/runs - Get all runs
app.get('/api/runs', async (req, res) => {
    try {
        let list;
        if (USE_DB) {
            list = await dbGetRuns();
        } else {
            list = [...runs].sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        res.json({ success: true, data: list, count: list.length, message: 'Runs retrieved successfully', timestamp: new Date().toISOString(), version: '1.0.0' });
    } catch (error) {
        console.error('❌ Error in GET /api/runs:', error);
        res.status(500).json({ success: false, data: null, count: 0, message: error.message });
    }
});

// GET /api/runs/:id - Get a specific run
app.get('/api/runs/:id', async (req, res) => {
    try {
        const runId = req.params.id;
        let result;
        if (USE_DB) {
            result = await dbGetRunWithRsvps(runId);
        } else {
            const run = findRunById(runId);
            if (!run) return res.status(404).json({ success: false, data: null, count: 0, message: 'Run not found' });
            const rsvps = runRsvps[run.id] || [];
            result = { ...run, rsvps };
        }
        if (!result) return res.status(404).json({ success: false, data: null, count: 0, message: 'Run not found' });
        res.json({ success: true, data: result, count: (result.rsvps || []).length, message: 'Run retrieved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, data: null, count: 0, message: error.message });
    }
});

// POST /api/runs - Create a new run
app.post('/api/runs', async (req, res) => {
    try {
        const runData = req.body;
        const normalizedData = validateAndNormalizeRunData(runData);
        const newRun = { id: uuidv4(), ...normalizedData };
        if (!newRun.id || typeof newRun.id !== 'string' || newRun.id.length !== 36) throw new Error('Failed to generate valid UUID');
        if (USE_DB) {
            await dbCreateRun(newRun);
        } else {
            runs.push(newRun);
        }
        const notification = sendRunNotification(newRun);
        res.status(201).json({ success: true, data: newRun, notification, count: 1, message: 'Run created successfully' });
    } catch (error) {
        res.status(400).json({ success: false, data: null, count: 0, message: error.message });
    }
});

// PUT /api/runs/:id - Update an existing run
app.put('/api/runs/:id', async (req, res) => {
    try {
        const runId = req.params.id;
        if (!isValidUUID(runId)) return res.status(400).json({ success: false, data: null, count: 0, message: 'Invalid run ID format' });
        const normalizedData = validateAndNormalizeRunData(req.body);
        const updatedRun = { id: runId, ...normalizedData };
        if (USE_DB) {
            await dbUpdateRun(updatedRun);
        } else {
            const runIndex = runs.findIndex(run => run.id === runId);
            if (runIndex === -1) return res.status(404).json({ success: false, data: null, count: 0, message: 'Run not found' });
            runs[runIndex] = updatedRun;
        }
        res.json({ success: true, data: updatedRun, count: 1, message: 'Run updated successfully' });
    } catch (error) {
        console.error('❌ Error in PUT /api/runs:', error);
        res.status(400).json({ success: false, data: null, count: 0, message: error.message });
    }
});

// DELETE /api/runs/:id - Delete a run
app.delete('/api/runs/:id', async (req, res) => {
    try {
        const runId = req.params.id;
        if (USE_DB) {
            await dbDeleteRun(runId);
            return res.json({ success: true, data: { id: runId }, count: 1, message: 'Run deleted successfully' });
        }
        const runIndex = runs.findIndex(run => run.id === runId);
        if (runIndex === -1) return res.status(404).json({ success: false, data: null, count: 0, message: 'Run not found' });
        const deletedRun = runs.splice(runIndex, 1)[0];
        res.json({ success: true, data: deletedRun, count: 1, message: 'Run deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, data: null, count: 0, message: error.message });
    }
});

// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0'
        },
        count: 1,
        message: 'Server is running'
    });
});

// GET /api/notifications - Get all notifications
app.get('/api/notifications', (req, res) => {
    try {
        // Sort notifications by timestamp (newest first)
        const sortedNotifications = [...notifications].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        res.json({
            success: true,
            data: sortedNotifications,
            count: sortedNotifications.length,
            message: 'Notifications retrieved successfully',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Error getting notifications:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }
});

// PUT /api/notifications/:id/read - Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
    try {
        const notificationId = req.params.id;
        const notification = notifications.find(n => n.id === notificationId);
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
        });
        }
        
        notification.read = true;
        
        res.json({
            success: true,
            data: notification,
            message: 'Notification marked as read',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }
});

// Leaderboard API Endpoints
// POST /api/runs/:id/rsvp - Create or update RSVP for a run
app.post('/api/runs/:id/rsvp', async (req, res) => {
    try {
        const runId = req.params.id;
        if (USE_DB) {
            const run = await dbGetRunWithRsvps(runId);
            if (!run) return res.status(404).json({ success: false, message: 'Run not found' });
        } else {
            const run = findRunById(runId);
            if (!run) return res.status(404).json({ success: false, message: 'Run not found' });
        }
        const { firstName, lastName, username, status } = req.body || {};
        if (!firstName || !lastName || !status || !['yes','no'].includes(String(status).toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Missing firstName/lastName/status or invalid status' });
        }
        const uname = username ? String(username).toLowerCase() : null;
        const entry = { id: uuidv4(), runId, firstName: String(firstName).trim(), lastName: String(lastName).trim(), username: uname, status: String(status).toLowerCase(), timestamp: new Date().toISOString() };
        if (USE_DB) {
            await dbCreateOrUpdateRSVP(runId, entry);
        } else {
            const list = runRsvps[runId] || [];
            let updated = false;
            if (uname) {
                for (let i = 0; i < list.length; i++) {
                    if ((list[i].username || '').toLowerCase() === uname) { list[i] = entry; updated = true; break; }
                }
            }
            if (!updated) list.push(entry);
            runRsvps[runId] = list;
        }
        res.status(201).json({ success: true, data: entry, count: 1, message: 'RSVP saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// POST /api/users/create - Create account with firstName, lastName, username
app.post('/api/users/create', (req, res) => {
    try {
        const { firstName, lastName, username } = req.body || {};
        if (!firstName || !lastName || !username) {
            return res.status(400).json({ success: false, message: 'Missing firstName, lastName or username' });
        }
        const uname = String(username).trim().toLowerCase();
        // Username: allow letters, numbers, underscore, dot, hyphen; 3-32 chars
        const unameOk = /^[a-z0-9_.-]{3,32}$/.test(uname);
        if (!unameOk) return res.status(400).json({ success: false, message: 'Invalid username format' });
        if (leaderboardUsers.some(u => (u.username || '').toLowerCase() === uname)) {
            return res.status(409).json({ success: false, message: 'Username already taken' });
        }
        const user = {
            id: uuidv4(),
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            username: uname,
            totalRuns: 0,
            totalMiles: 0,
            lastUpdated: new Date().toISOString(),
            appUserId: null,
            isRegistered: true
        };
        leaderboardUsers.push(user);
        console.log(`👤 Account created: ${user.firstName} ${user.lastName} (@${user.username})`);
        res.status(201).json({ success: true, data: user, message: 'Account created' });
    } catch (error) {
        console.error('❌ Error creating account:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal error' });
    }
});
// POST /api/users/register - Mark or create a leaderboard user as registered from the app
app.post('/api/users/register', (req, res) => {
    try {
        const { appUserId, firstName, lastName } = req.body || {};
        if (!appUserId) {
            return res.status(400).json({ success: false, message: 'Missing appUserId' });
        }

        // Try to find by appUserId
        let user = leaderboardUsers.find(u => u.appUserId === appUserId);
        if (!user) {
            user = {
                id: uuidv4(),
                firstName: (firstName || '').trim(),
                lastName: (lastName || '').trim(),
                username: null,
                totalRuns: 0,
                totalMiles: 0,
                lastUpdated: new Date().toISOString(),
                appUserId,
                isRegistered: true
            };
            leaderboardUsers.push(user);
            console.log(`🆕 Registered new app user on leaderboard: ${user.firstName} ${user.lastName}`);
        } else {
            user.isRegistered = true;
            user.firstName = (firstName || user.firstName).trim();
            user.lastName = (lastName || user.lastName).trim();
            user.lastUpdated = new Date().toISOString();
            console.log(`✅ Marked existing leaderboard user as registered: ${user.firstName} ${user.lastName}`);
        }

        res.json({ success: true, data: user, message: 'User registered' });
    } catch (error) {
        console.error('❌ Error registering user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/leaderboard - Get all leaderboard users
app.get('/api/leaderboard', (req, res) => {
    try {
        const includeAll = req.query.includeAll === '1';
        const handle = async () => {
            let list;
            if (USE_DB) {
                list = await dbGetLeaderboard(includeAll);
            } else {
                list = [...leaderboardUsers];
                if (!includeAll) list = list.filter(u => u.isRegistered === true);
            }
            const sortedUsers = list.sort((a, b) => b.totalMiles - a.totalMiles);
            sortedUsers.forEach((user, index) => { user.rank = index + 1; });
            res.json({ success: true, data: sortedUsers, count: sortedUsers.length, message: 'Leaderboard retrieved successfully', timestamp: new Date().toISOString(), version: '1.0.0' });
        };
        if (USE_DB) { handle(); } else { handle(); }
    } catch (error) {
        console.error('❌ Error getting leaderboard:', error);
        res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString(), version: '1.0.0' });
    }
});

// POST /api/leaderboard - Create new leaderboard user
app.post('/api/leaderboard', async (req, res) => {
    try {
        const { firstName, lastName, totalRuns, totalMiles, appUserId, isRegistered, username } = req.body;
        if (!firstName || !lastName || totalRuns === undefined || totalMiles === undefined) {
            return res.status(400).json({ success: false, error: 'Missing required fields: firstName, lastName, totalRuns, totalMiles', timestamp: new Date().toISOString(), version: '1.0.0' });
        }
        const newUser = {
            id: uuidv4(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username ? String(username).trim().toLowerCase() : null,
            totalRuns: parseInt(totalRuns) || 0,
            totalMiles: parseFloat(totalMiles) || 0,
            lastUpdated: new Date().toISOString(),
            appUserId: appUserId || null,
            isRegistered: !!isRegistered
        };
        if (USE_DB) {
            await dbCreateLeaderboardUser(newUser);
        } else {
            leaderboardUsers.push(newUser);
        }
        res.status(201).json({ success: true, data: newUser, message: 'User added to leaderboard successfully', timestamp: new Date().toISOString(), version: '1.0.0' });
    } catch (error) {
        console.error('❌ Error creating leaderboard user:', error);
        res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString(), version: '1.0.0' });
    }
});

// PUT /api/leaderboard/:id - Update leaderboard user
app.put('/api/leaderboard/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { firstName, lastName, totalRuns, totalMiles, appUserId, isRegistered } = req.body;
        if (USE_DB) {
            const updated = await dbUpdateLeaderboardUser(userId, { firstName: firstName.trim(), lastName: lastName.trim(), totalRuns: parseInt(totalRuns) || 0, totalMiles: parseFloat(totalMiles) || 0, appUserId, isRegistered });
            return res.json({ success: true, data: updated, message: 'User updated successfully', timestamp: new Date().toISOString(), version: '1.0.0' });
        }
        const userIndex = leaderboardUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) return res.status(404).json({ success: false, error: 'User not found', timestamp: new Date().toISOString(), version: '1.0.0' });
        leaderboardUsers[userIndex] = { ...leaderboardUsers[userIndex], firstName: firstName.trim(), lastName: lastName.trim(), totalRuns: parseInt(totalRuns) || 0, totalMiles: parseFloat(totalMiles) || 0, lastUpdated: new Date().toISOString(), appUserId: appUserId !== undefined ? appUserId : leaderboardUsers[userIndex].appUserId, isRegistered: typeof isRegistered === 'boolean' ? isRegistered : leaderboardUsers[userIndex].isRegistered };
        res.json({ success: true, data: leaderboardUsers[userIndex], message: 'User updated successfully', timestamp: new Date().toISOString(), version: '1.0.0' });
    } catch (error) {
        console.error('❌ Error updating leaderboard user:', error);
        res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString(), version: '1.0.0' });
    }
});

// DELETE /api/leaderboard/:id - Delete leaderboard user
app.delete('/api/leaderboard/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        if (USE_DB) {
            await dbDeleteLeaderboardUser(userId);
            return res.json({ success: true, data: { id: userId }, message: 'User deleted successfully', timestamp: new Date().toISOString(), version: '1.0.0' });
        }
        const userIndex = leaderboardUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) return res.status(404).json({ success: false, error: 'User not found', timestamp: new Date().toISOString(), version: '1.0.0' });
        const deletedUser = leaderboardUsers.splice(userIndex, 1)[0];
        res.json({ success: true, data: deletedUser, message: 'User deleted successfully', timestamp: new Date().toISOString(), version: '1.0.0' });
    } catch (error) {
        console.error('❌ Error deleting leaderboard user:', error);
        res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString(), version: '1.0.0' });
    }
});

// Root endpoint - serve web admin
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/web-admin/index.html');
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'Run With Kam API',
            version: '1.0.0',
            endpoints: {
                runs: '/api/runs',
                notifications: '/api/notifications',
                leaderboard: '/api/leaderboard',
                registerUser: '/api/users/register',
                health: '/api/health'
            }
        },
        count: 1,
        message: 'Welcome to Run With Kam API'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        data: null,
        count: 0,
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        data: null,
        count: 0,
        message: 'Internal server error'
    });
});

// Clean up any invalid IDs in existing data
function cleanupInvalidIDs() {
    let cleanedCount = 0;
    runs = runs.map(run => {
        if (!isValidUUID(run.id)) {
            console.log(`🔄 Fixing invalid ID: ${run.id} -> ${uuidv4()}`);
            cleanedCount++;
            return { ...run, id: uuidv4() };
        }
        return run;
    });
    
    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} invalid IDs`);
    }
}

// Regenerate sample data with proper dates
function regenerateSampleData() {
    console.log('🔄 Regenerating sample data with proper dates...');
    
    runs = [
        {
            id: uuidv4(),
            date: createFormattedDate(1), // Tomorrow
            time: '06:00',
            location: 'Central Park',
            pace: '8:30/mile',
            description: 'Morning run around the reservoir'
        },
        {
            id: uuidv4(),
            date: createFormattedDate(3), // 3 days from now
            time: '17:30',
            location: 'Brooklyn Bridge',
            pace: '9:00/mile',
            description: 'Sunset run across the bridge'
        },
        {
            id: uuidv4(),
            date: createFormattedDate(7), // 7 days from now
            time: '07:00',
            location: 'Prospect Park',
            pace: '7:30/mile',
            description: 'Speed workout on the loop'
        }
    ];
    
    console.log('✅ Sample data regenerated with proper dates');
}

// Ensure leaderboard users have registration fields
function ensureRegistrationFields() {
    let updated = 0;
    leaderboardUsers = leaderboardUsers.map(u => {
        const withDefaults = {
            ...u,
            appUserId: u.appUserId || null,
            isRegistered: typeof u.isRegistered === 'boolean' ? u.isRegistered : false,
        };
        if (withDefaults !== u) updated++;
        return withDefaults;
    });
    if (updated > 0) {
        console.log(`🔧 Backfilled registration fields on ${updated} leaderboard users`);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Run With Kam API server starting on port ${PORT}`);
    try {
        if (USE_DB) {
            await ensureTables();
            const count = await dbCountRuns();
            if (count === 0) {
                // Seed three sample runs like the in-memory initializer
                const samples = [
                    { id: uuidv4(), date: createFormattedDate(1, '06:00'), time: '06:00', location: 'Central Park', pace: '8:30/mile', description: 'Morning run around the reservoir' },
                    { id: uuidv4(), date: createFormattedDate(3, '17:30'), time: '17:30', location: 'Brooklyn Bridge', pace: '9:00/mile', description: 'Sunset run across the bridge' },
                    { id: uuidv4(), date: createFormattedDate(7, '07:00'), time: '07:00', location: 'Prospect Park', pace: '7:30/mile', description: 'Speed workout on the loop' }
                ];
                for (const r of samples) { await dbCreateRun(r); sendRunNotification(r); }
                console.log('🌱 Seeded sample runs into Postgres');
            }
        } else {
            // Local/in-memory boot
            cleanupInvalidIDs();
            initializeSampleData();
            normalizeExistingRunDates();
        }
    } catch (e) {
        console.error('❌ Startup error:', e);
    }

    console.log(`✅ Service ready. Health: /api/health`);
});

module.exports = app;
