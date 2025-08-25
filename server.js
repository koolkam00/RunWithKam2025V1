const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

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
    
    // Set time to the specified time in Eastern Time (UTC-5) to ensure dates display correctly
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const easternDate = new Date(Date.UTC(year, month, day, timeHours + 5, timeMinutes, 0, 0));
    
    return easternDate.toISOString();
}

// In-memory data storage (replace with database in production)
let runs = [];

// In-memory notification storage (replace with database in production)
let notifications = [];

// In-memory leaderboard storage (replace with database in production)
let leaderboardUsers = [];

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
            const parsedDate = new Date(run.date);
            if (!isNaN(parsedDate.getTime())) {
                const year = parsedDate.getFullYear();
                const month = parsedDate.getMonth();
                const day = parsedDate.getDate();
                
                // Parse the time to get hours and minutes
                let timeHours = 0;
                let timeMinutes = 0;
                
                if (run.time && run.time.includes(':')) {
                    const timeParts = run.time.split(':');
                    timeHours = parseInt(timeParts[0], 10);
                    timeMinutes = parseInt(timeParts[1], 10);
                }
                
                // Create date in Eastern Time (UTC-5) by adding 5 hours to get to the correct EST time
                const easternDate = new Date(Date.UTC(year, month, day, timeHours + 5, timeMinutes, 0, 0));
                const isoDate = easternDate.toISOString();
                
                if (run.date !== isoDate) {
                    console.log(`📅 Normalizing date and time to Eastern Time: ${run.date} ${run.time} -> ${isoDate}`);
                    run.date = isoDate;
                }
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
            totalRuns: 15,
            totalMiles: 45.5,
            lastUpdated: new Date().toISOString()
        },
        {
            id: uuidv4(),
            firstName: 'Sarah',
            lastName: 'Johnson',
            totalRuns: 12,
            totalMiles: 38.2,
            lastUpdated: new Date().toISOString()
        },
        {
            id: uuidv4(),
            firstName: 'Mike',
            lastName: 'Davis',
            totalRuns: 8,
            totalMiles: 25.0,
            lastUpdated: new Date().toISOString()
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
        // Parse the date and convert to ISO string for consistency
        const parsedDate = new Date(runData.date);
        if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date format');
        }
        
        // Parse the time to get hours and minutes
        let timeHours = 0;
        let timeMinutes = 0;
        
        if (runData.time && runData.time.includes(':')) {
            const timeParts = runData.time.split(':');
            timeHours = parseInt(timeParts[0], 10);
            timeMinutes = parseInt(timeParts[1], 10);
        }
        
        // Convert to Eastern Time by combining date and time
        // When user enters "2025-08-27" and "17:30", we want it to show as August 27th at 5:30 PM EST
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth();
        const day = parsedDate.getDate();
        
        // Create date in Eastern Time (UTC-5) by adding 5 hours to get to the correct EST time
        const easternDate = new Date(Date.UTC(year, month, day, timeHours + 5, timeMinutes, 0, 0));
        normalizedDate = easternDate.toISOString();
        
        console.log(`📅 Date and time normalized to Eastern Time: ${runData.date} ${runData.time} -> ${normalizedDate}`);
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
app.get('/api/runs', (req, res) => {
    try {
        // Sort runs by date
        const sortedRuns = [...runs].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Log the response for debugging
        console.log(`📊 Returning ${sortedRuns.length} runs`);
        sortedRuns.forEach(run => {
            console.log(`  - Run ID: ${run.id} (${typeof run.id}) - ${run.location} at ${run.time}`);
            console.log(`    Date: ${run.date} (Type: ${typeof run.date})`);
        });
        
        // Log the full response structure for debugging
        const responseData = {
            success: true,
            data: sortedRuns,
            count: sortedRuns.length,
            message: 'Runs retrieved successfully'
        };
        console.log(`📤 Response structure:`, JSON.stringify(responseData, null, 2));
        
        res.json({
            success: true,
            data: sortedRuns,
            count: sortedRuns.length,
            message: 'Runs retrieved successfully',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Error in GET /api/runs:', error);
        res.status(500).json({
            success: false,
            data: null,
            count: 0,
            message: error.message
        });
    }
});

// GET /api/runs/:id - Get a specific run
app.get('/api/runs/:id', (req, res) => {
    try {
        const run = findRunById(req.params.id);
        
        if (!run) {
            return res.status(404).json({
                success: false,
                data: null,
                count: 0,
                message: 'Run not found'
            });
        }
        
        res.json({
            success: true,
            data: run,
            count: 1,
            message: 'Run retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            count: 0,
            message: error.message
        });
    }
});

// POST /api/runs - Create a new run
app.post('/api/runs', (req, res) => {
    try {
        const runData = req.body;
        
        // Validate and normalize input data
        const normalizedData = validateAndNormalizeRunData(runData);
        
        // Create new run with unique ID and normalized data
        const newRun = {
            id: uuidv4(),
            ...normalizedData
        };
        
        // Ensure ID is a valid UUID string
        if (!newRun.id || typeof newRun.id !== 'string' || newRun.id.length !== 36) {
            throw new Error('Failed to generate valid UUID');
        }
        
        // Add to runs array
        runs.push(newRun);
        
        // Send notification to all users about the new run
        const notification = sendRunNotification(newRun);
        
        console.log(`✅ Created new run with ID: ${newRun.id}`);
        console.log(`🔔 Notification sent: ${notification.id}`);
        
        res.status(201).json({
            success: true,
            data: newRun,
            notification: notification,
            count: 1,
            message: 'Run created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            data: null,
            count: 0,
            message: error.message
        });
    }
});

// PUT /api/runs/:id - Update an existing run
app.put('/api/runs/:id', (req, res) => {
    try {
        const runId = req.params.id;
        
        // Validate UUID format
        if (!isValidUUID(runId)) {
            return res.status(400).json({
                success: false,
                data: null,
                count: 0,
                message: 'Invalid run ID format'
            });
        }
        
        const runIndex = runs.findIndex(run => run.id === runId);
        
        if (runIndex === -1) {
            return res.status(404).json({
                success: false,
                data: null,
                count: 0,
                message: 'Run not found'
            });
        }
        
        const runData = req.body;
        
        // Validate and normalize input data
        const normalizedData = validateAndNormalizeRunData(runData);
        
        // Update the run
        const updatedRun = {
            ...runs[runIndex],
            ...normalizedData,
            id: runId // Ensure ID doesn't change
        };
        
        runs[runIndex] = updatedRun;
        
        console.log(`✅ Updated run with ID: ${runId}`);
        
        res.json({
            success: true,
            data: updatedRun,
            count: 1,
            message: 'Run updated successfully'
        });
    } catch (error) {
        console.error('❌ Error in PUT /api/runs:', error);
        res.status(400).json({
            success: false,
            data: null,
            count: 0,
            message: error.message
        });
    }
});

// DELETE /api/runs/:id - Delete a run
app.delete('/api/runs/:id', (req, res) => {
    try {
        const runId = req.params.id;
        const runIndex = runs.findIndex(run => run.id === runId);
        
        if (runIndex === -1) {
            return res.status(404).json({
                success: false,
                data: null,
                count: 0,
                message: 'Run not found'
            });
        }
        
        // Remove the run
        const deletedRun = runs.splice(runIndex, 1)[0];
        
        res.json({
            success: true,
            data: deletedRun,
            count: 1,
            message: 'Run deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            count: 0,
            message: error.message
        });
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

// GET /api/leaderboard - Get all leaderboard users
app.get('/api/leaderboard', (req, res) => {
    try {
        // Sort users by total miles (descending)
        const sortedUsers = [...leaderboardUsers].sort((a, b) => b.totalMiles - a.totalMiles);
        
        // Add rank to each user
        sortedUsers.forEach((user, index) => {
            user.rank = index + 1;
        });
        
        res.json({
            success: true,
            data: sortedUsers,
            count: sortedUsers.length,
            message: 'Leaderboard retrieved successfully',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Error getting leaderboard:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }
});

// POST /api/leaderboard - Create new leaderboard user
app.post('/api/leaderboard', (req, res) => {
    try {
        const { firstName, lastName, totalRuns, totalMiles } = req.body;
        
        // Validate required fields
        if (!firstName || !lastName || totalRuns === undefined || totalMiles === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: firstName, lastName, totalRuns, totalMiles',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        }
        
        const newUser = {
            id: uuidv4(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            totalRuns: parseInt(totalRuns) || 0,
            totalMiles: parseFloat(totalMiles) || 0,
            lastUpdated: new Date().toISOString()
        };
        
        leaderboardUsers.push(newUser);
        
        console.log(`🏆 New leaderboard user added: ${newUser.firstName} ${newUser.lastName}`);
        
        res.status(201).json({
            success: true,
            data: newUser,
            message: 'User added to leaderboard successfully',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Error creating leaderboard user:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }
});

// PUT /api/leaderboard/:id - Update leaderboard user
app.put('/api/leaderboard/:id', (req, res) => {
    try {
        const userId = req.params.id;
        const { firstName, lastName, totalRuns, totalMiles } = req.body;
        
        const userIndex = leaderboardUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        }
        
        // Update user data
        leaderboardUsers[userIndex] = {
            ...leaderboardUsers[userIndex],
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            totalRuns: parseInt(totalRuns) || 0,
            totalMiles: parseFloat(totalMiles) || 0,
            lastUpdated: new Date().toISOString()
        };
        
        console.log(`🏆 Leaderboard user updated: ${leaderboardUsers[userIndex].firstName} ${leaderboardUsers[userIndex].lastName}`);
        
        res.json({
            success: true,
            data: leaderboardUsers[userIndex],
            message: 'User updated successfully',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Error updating leaderboard user:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }
});

// DELETE /api/leaderboard/:id - Delete leaderboard user
app.delete('/api/leaderboard/:id', (req, res) => {
    try {
        const userId = req.params.id;
        const userIndex = leaderboardUsers.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
        });
        }
        
        const deletedUser = leaderboardUsers.splice(userIndex, 1)[0];
        
        console.log(`🏆 Leaderboard user deleted: ${deletedUser.firstName} ${deletedUser.lastName}`);
        
        res.json({
            success: true,
            data: deletedUser,
            message: 'User deleted successfully',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Error deleting leaderboard user:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
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

// Start server
app.listen(PORT, () => {
    // Clean up any invalid IDs first
    cleanupInvalidIDs();
    
    // Initialize sample data with notifications
    initializeSampleData();
    
    // Normalize any existing run dates to ISO format
    normalizeExistingRunDates();
    
    console.log(`🚀 Run With Kam API server running on port ${PORT}`);
    console.log(`📱 iOS app can connect to: http://localhost:${PORT}/api`);
    console.log(`🌐 Web admin can connect to: http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Total runs loaded: ${runs.length}`);
    console.log(`🔔 Total notifications created: ${notifications.length}`);
    
    // Log all run IDs and dates for verification
    runs.forEach((run, index) => {
        console.log(`  Run ${index + 1}: ID=${run.id} (${isValidUUID(run.id) ? '✅ Valid' : '❌ Invalid'})`);
        console.log(`    Date: ${run.date} (${new Date(run.date).toISOString() === run.date ? '✅ Valid ISO' : '❌ Invalid ISO'})`);
    });
    
    // Log notifications
    notifications.forEach((notification, index) => {
        console.log(`  Notification ${index + 1}: ${notification.title}`);
        console.log(`    Message: ${notification.message}`);
    });
});

module.exports = app;
