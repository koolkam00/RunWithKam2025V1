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

// Helper function to create properly formatted dates
function createFormattedDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    // Set time to midnight UTC to ensure maximum compatibility
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
}

// In-memory data storage (replace with database in production)
let runs = [
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
    
    // Normalize and validate date
    let normalizedDate;
    try {
        // Try to parse the date
        const parsedDate = new Date(runData.date);
        if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date format');
        }
        
        // Ensure date is set to start of day for consistency and proper ISO format
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth();
        const day = parsedDate.getDate();
        
        // Create a new date at midnight UTC for maximum compatibility
        const normalizedDateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        normalizedDate = normalizedDateObj.toISOString();
        
        console.log(`📅 Date normalized: ${runData.date} -> ${normalizedDate}`);
    } catch (error) {
        throw new Error('Invalid date format. Please use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)');
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
            message: 'Runs retrieved successfully'
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
        
        console.log(`✅ Created new run with ID: ${newRun.id}`);
        
        res.status(201).json({
            success: true,
            data: newRun,
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

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'Run With Kam API',
            version: '1.0.0',
            endpoints: {
                runs: '/api/runs',
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
    
    // Regenerate sample data with proper dates
    regenerateSampleData();
    
    console.log(`🚀 Run With Kam API server running on port ${PORT}`);
    console.log(`📱 iOS app can connect to: http://localhost:${PORT}/api`);
    console.log(`🌐 Web admin can connect to: http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Total runs loaded: ${runs.length}`);
    
    // Log all run IDs and dates for verification
    runs.forEach((run, index) => {
        console.log(`  Run ${index + 1}: ID=${run.id} (${isValidUUID(run.id) ? '✅ Valid' : '❌ Invalid'})`);
        console.log(`    Date: ${run.date} (${new Date(run.date).toISOString() === run.date ? '✅ Valid ISO' : '❌ Invalid ISO'})`);
    });
});

module.exports = app;
