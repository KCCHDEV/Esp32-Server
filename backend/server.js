const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { connectDatabase } = require('./lib/database');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const premiumRoutes = require('./routes/premium');
const apiRoutes = require('./routes/api');

const app = express();

// Determine CORS origin based on environment
const corsOrigin = process.env.NODE_ENV === 'production' 
  ? [process.env.CORS_ORIGIN_PROD, process.env.CORS_ORIGIN]
  : process.env.CORS_ORIGIN || "http://localhost:3000";

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Rate limiting (more lenient for development)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 / 60),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and in development
    return req.path === '/api/health' || process.env.NODE_ENV === 'development';
  },
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (before database connection)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Initialize server
let server;
let io;

// Only create HTTP server and Socket.IO in non-serverless environments
if (!process.env.NETLIFY_DEV && !process.env.NETLIFY) {
  server = createServer(app);
  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"]
    }
  });

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-device-room', (deviceId) => {
      socket.join(`device-${deviceId}`);
      console.log(`Socket ${socket.id} joined device room: ${deviceId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Make io available to routes
  app.use((req, res, next) => {
    req.io = io;
    next();
  });
} else {
  // In serverless environment, create a mock io object
  app.use((req, res, next) => {
    req.io = {
      emit: () => {},
      to: () => ({
        emit: () => {}
      })
    };
    next();
  });
}

// Database connection
async function initializeDatabase() {
  try {
    await connectDatabase();
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/esp32', apiRoutes); // ESP32 device API endpoints

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Prisma-specific error handling
  if (err.code === 'P2002') {
    return res.status(400).json({
      message: 'A record with this information already exists.',
      field: err.meta?.target?.[0] || 'unknown'
    });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      message: 'Record not found.',
    });
  }

  // Generic error response
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server function
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    const PORT = process.env.PORT || 3001;
    
    if (server) {
      // Traditional server mode
      server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 CORS origin: ${corsOrigin}`);
        console.log(`🔌 Socket.IO enabled`);
      });
    } else {
      // Serverless mode (Netlify Functions)
      app.listen(PORT, () => {
        console.log(`🚀 Serverless mode - API ready on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Export for Netlify Functions or start server
if (process.env.NETLIFY || process.env.NETLIFY_DEV) {
  // For Netlify Functions
  module.exports = app;
  
  // Initialize database for serverless
  initializeDatabase().catch(console.error);
} else {
  // Start traditional server
  startServer();
}