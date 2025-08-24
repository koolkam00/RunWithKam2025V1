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

// In-memory data storage (replace with database in production)
let runs = [
    {
        id: '1',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        time: '06:00',
        location: 'Central Park',
        pace: '8:30/mile',
        description: 'Morning run around the reservoir'
    },
    {
        id: '2',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        time: '17:30',
        location: 'Brooklyn Bridge',
        pace: '9:00/mile',
        description: 'Sunset run across the bridge'
    },
    {
        id: '3',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        time: '07:00',
        location: 'Prospect Park',
        pace: '7:30/mile',
        description: 'Speed workout on the loop'
    }
];

// Helper function to find run by ID
function findRunById(id) {
    return runs.find(run => run.id === id);
}

// Helper function to validate run data
function validateRunData(runData) {
    const required = ['date', 'time', 'location', 'pace'];
    for (const field of required) {
        if (!runData[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    // Validate date format
    if (isNaN(Date.parse(runData.date))) {
        throw new Error('Invalid date format');
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(runData.time)) {
        throw new Error('Invalid time format. Use HH:MM format');
    }
    
    return true;
}

// Routes

// GET /api/runs - Get all runs
app.get('/api/runs', (req, res) => {
    try {
        // Sort runs by date
        const sortedRuns = [...runs].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        res.json({
            success: true,
            data: sortedRuns,
            count: sortedRuns.length,
            message: 'Runs retrieved successfully'
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
        
        // Validate input data
        validateRunData(runData);
        
        // Create new run with unique ID
        const newRun = {
            id: uuidv4(),
            date: runData.date,
            time: runData.time,
            location: runData.location,
            pace: runData.pace,
            description: runData.description || ''
        };
        
        // Add to runs array
        runs.push(newRun);
        
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
        
        // Validate input data
        validateRunData(runData);
        
        // Update the run
        const updatedRun = {
            ...runs[runIndex],
            ...runData,
            id: runId // Ensure ID doesn't change
        };
        
        runs[runIndex] = updatedRun;
        
        res.json({
            success: true,
            data: updatedRun,
            count: 1,
            message: 'Run updated successfully'
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Run With Kam API server running on port ${PORT}`);
    console.log(`📱 iOS app can connect to: http://localhost:${PORT}/api`);
    console.log(`🌐 Web admin can connect to: http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Total runs loaded: ${runs.length}`);
});

module.exports = app;
