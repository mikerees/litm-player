const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Import our modules
const SessionManager = require('./sessions');
const GameObjectManager = require('./gameObjects');
const GameStateManager = require('./gameState');
const WebSocketHandler = require('./websocket');

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.io instance
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize managers
const sessionManager = new SessionManager();
const gameObjectManager = new GameObjectManager();
const gameStateManager = new GameStateManager(gameObjectManager);

// Initialize WebSocket handler
const webSocketHandler = new WebSocketHandler(io, sessionManager, gameStateManager);

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Parse JSON bodies
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'scene-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API endpoint to get all saved sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await sessionManager.getSavedSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// API endpoint to get session data
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionData = gameStateManager.getSessionData(sessionId);
    res.json(sessionData);
  } catch (error) {
    console.error('Error getting session data:', error);
    res.status(500).json({ error: 'Failed to get session data' });
  }
});

// API endpoint to get session players
app.get('/api/sessions/:sessionId/players', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const players = await sessionManager.getSessionPlayers(sessionId);
    res.json({ sessionId, players });
  } catch (error) {
    console.error('Error getting session players:', error);
    res.status(500).json({ error: 'Failed to get session players' });
  }
});

// API endpoint to get session statistics
app.get('/api/sessions/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = await sessionManager.getSessionStats(sessionId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({ error: 'Failed to get session stats' });
  }
});

// API endpoint to delete a session
app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await sessionManager.deleteSession(sessionId);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// API endpoint to get game objects by type
app.get('/api/sessions/:sessionId/objects/:type', (req, res) => {
  const { sessionId, type } = req.params;
  const objects = gameObjectManager.getSessionObjects(sessionId, type);
  res.json(objects);
});

// API endpoint for image upload
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Return the file path that can be used in the application
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      fileUrl: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Error handler for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

// Catch-all route to serve the main HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 LitMPlayer server running on port ${PORT}`);
  console.log(`📁 Data directory: ${path.join(process.cwd(), 'data')}`);
  console.log(`🌐 Access the game at: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  // Save all active sessions
  const activeSessions = sessionManager.getActiveSessions();
  for (const session of activeSessions) {
    try {
      const gameState = gameStateManager.getSessionState(session.id);
      await sessionManager.saveSession(session.id, gameState);
      console.log(`💾 Saved session ${session.id}`);
    } catch (error) {
      console.error(`Error saving session ${session.id}:`, error);
    }
  }
  
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});

module.exports = { app, server, io };
