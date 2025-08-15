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
  ? process.env.CORS_ORIGIN || false // Must be explicitly set in production
  : process.env.CORS_ORIGIN || "http://localhost:3000";

// Security middleware - Production-ready configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : null].filter(Boolean),
      connectSrc: ["'self'", "ws:", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: ["no-referrer", "strict-origin-when-cross-origin"] },
  xssFilter: true,
}));

// CORS configuration with security considerations
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Production: only allow specific origins
    const allowedOrigins = Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
}));

// Rate limiting - differentiated by endpoint type
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 login attempts per 15 min in production
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import monitoring middleware
const { trackApiUsage, healthCheck, getMetrics } = require('./middleware/monitoring');

// Add API usage tracking to all routes
app.use('/api/', trackApiUsage);

// Health check and metrics endpoints
app.get('/api/health', healthCheck);
app.get('/api/metrics', getMetrics);

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

// Import error handling middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler (must be before error handler)
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

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