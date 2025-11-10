const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Import services
const AzureService = require('./services/azureService');
const AIService = require('./services/aiService');

// Initialize services
const azureService = new AzureService();
const aiService = new AIService();

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      azure: azureService.isInitialized ? 'ready' : 'initializing',
      ai: aiService.isInitialized ? 'ready' : 'initializing'
    }
  });
});

// API Routes
app.use('/api/azure', require('./routes/azure'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/environment', require('./routes/environment'));
app.use('/api/ai-agent', require('./routes/aiAgent'));

// Serve static files only in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
} else {
  // Development mode - don't serve static files, return API info
  app.get('/', (req, res) => {
    res.json({
      message: 'Azure AI Assistant Backend - Development Mode',
      status: 'running',
      timestamp: new Date().toISOString(),
      note: 'Frontend should be running on http://localhost:3000',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/api/health',
        azure: '/api/azure/*',
        ai: '/api/ai/*',
        chat: '/api/chat/*'
      }
    });
  });
  
  // Handle other static file requests in development
  app.get('/favicon.ico', (req, res) => {
    res.status(404).json({ error: 'Favicon not served in development mode' });
  });
  
  app.get('/manifest.json', (req, res) => {
    res.status(404).json({ error: 'Manifest not served in development mode' });
  });
  
  app.get('/service-worker.js', (req, res) => {
    res.status(404).json({ error: 'Service worker not served in development mode' });
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Handle real-time chat updates
  socket.on('chat_message', (data) => {
    io.emit('chat_update', data);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});

const PORT = process.env.PORT || 5000;

// Initialize services before starting server
async function initializeServices() {
  try {
    console.log('🚀 Initializing Azure AI Assistant services...');
    
    // Debug environment variables
    console.log('🔍 Environment Variables Status:');
    console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`  - AZURE_SUBSCRIPTION_ID: ${process.env.AZURE_SUBSCRIPTION_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - AZURE_TENANT_ID: ${process.env.AZURE_TENANT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - AZURE_CLIENT_ID: ${process.env.AZURE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - AZURE_CLIENT_SECRET: ${process.env.AZURE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`  - PORT: ${process.env.PORT || '5000 (default)'}`);
    
    // Initialize Azure service
    console.log('\n🔧 Initializing Azure service...');
    await azureService.initialize();
    console.log(`✅ Azure service initialized: ${azureService.isInitialized ? 'READY' : 'FAILED'}`);
    
    // Initialize AI service
    console.log('\n🤖 Initializing AI service...');
    await aiService.initialize();
    console.log(`✅ AI service initialized: ${aiService.isInitialized ? 'READY' : 'FAILED'}`);
    
    // Start server
    server.listen(PORT, () => {
      console.log('\n🚀 Server running on port', PORT);
      console.log(`🌐 Backend API: http://localhost:${PORT}`);
      console.log(`📱 Frontend should run on: http://localhost:3000`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔑 Azure Service: ${azureService.isInitialized ? 'READY' : 'MOCK DATA MODE'}`);
      console.log(`🤖 AI Service: ${aiService.isInitialized ? 'READY' : 'FALLBACK MODE'}`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

initializeServices();
