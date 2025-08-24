# Run With Kam - Backend API Server 🏃‍♂️

A Node.js/Express backend server that provides a RESTful API for the Run With Kam running app and web admin panel.

## 🚀 Quick Start

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

3. **Server will start on:** `http://localhost:3000`

## 📱 API Endpoints

### Runs Management
- `GET /api/runs` - Get all scheduled runs
- `GET /api/runs/:id` - Get a specific run
- `POST /api/runs` - Create a new run
- `PUT /api/runs/:id` - Update an existing run
- `DELETE /api/runs/:id` - Delete a run

### System
- `GET /api/health` - Health check
- `GET /` - API information

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)

### Data Storage
Currently uses in-memory storage. For production, consider:
- PostgreSQL
- MongoDB
- SQLite
- Redis

## 📊 Data Format

### Run Object Structure
```json
{
  "id": "uuid-string",
  "date": "2025-01-20T06:00:00.000Z",
  "time": "06:00",
  "location": "Central Park",
  "pace": "8:30/mile",
  "description": "Morning run around the reservoir"
}
```

### API Response Format
```json
{
  "success": true,
  "data": [...],
  "count": 3,
  "message": "Runs retrieved successfully"
}
```

## 🔌 Integration

### iOS App
The iOS app connects to `http://localhost:3000/api` and uses the `APIService` class to:
- Fetch all runs
- Create new runs
- Update existing runs
- Delete runs
- Real-time updates every 10 seconds

### Web Admin
The web admin panel connects to the same API endpoints and provides:
- Calendar view of all runs
- Add/edit/delete functionality
- Real-time synchronization
- Mobile-responsive interface

## 🛡️ Security Features

- **CORS enabled** for cross-origin requests
- **Helmet.js** for security headers
- **Input validation** for all endpoints
- **Error handling** with proper HTTP status codes

## 🧪 Testing

### Manual Testing
1. **Health Check:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Get All Runs:**
   ```bash
   curl http://localhost:3000/api/runs
   ```

3. **Create a Run:**
   ```bash
   curl -X POST http://localhost:3000/api/runs \
     -H "Content-Type: application/json" \
     -d '{
       "date": "2025-01-25T07:00:00.000Z",
       "time": "07:00",
       "location": "Prospect Park",
       "pace": "7:30/mile",
       "description": "Speed workout"
     }'
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   
   # Kill the process
   kill -9 <PID>
   ```

2. **CORS issues:**
   - Ensure the server is running
   - Check that CORS middleware is enabled
   - Verify the client is making requests to the correct URL

3. **Data not persisting:**
   - Current implementation uses in-memory storage
   - Data will be lost when server restarts
   - Implement database storage for persistence

### Logs
The server uses Morgan for logging. Check the console for:
- HTTP requests
- Error messages
- Server startup information

## 🔄 Development

### File Structure
```
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
└── README.md         # This file
```

### Adding New Features
1. **New Endpoints:** Add routes in `server.js`
2. **Data Validation:** Extend the `validateRunData` function
3. **Middleware:** Add new middleware before routes
4. **Error Handling:** Extend error handling in catch blocks

## 🚀 Production Deployment

### Considerations
- **Environment Variables:** Set `NODE_ENV=production`
- **Process Manager:** Use PM2 or similar
- **Reverse Proxy:** Nginx or Apache
- **SSL/TLS:** HTTPS certificates
- **Database:** Persistent storage solution
- **Monitoring:** Health checks and logging
- **Backup:** Regular data backups

### Example PM2 Configuration
```json
{
  "name": "runwithkam-api",
  "script": "server.js",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```

## 📞 Support

For issues or questions:
1. Check the console logs
2. Verify API endpoints are accessible
3. Test with curl commands
4. Check iOS app and web admin connectivity

---

**Built with ❤️ for the Run With Kam community**
