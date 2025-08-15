const serverless = require('serverless-http');

// Set environment variables for serverless
process.env.NETLIFY = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import the Express app with comprehensive error handling
let app;
let initializationError = null;

try {
  console.log('🔄 Loading Express app...');
  
  // Try to import the backend server
  app = require('../../backend/server');
  
  console.log('✅ Express app loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Express app:', error);
  initializationError = error;
  
  // Create a fallback Express app for debugging
  const express = require('express');
  const cors = require('cors');
  
  app = express();
  
  // Enable CORS for all requests
  app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }));
  
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'error',
      message: 'Backend failed to initialize',
      error: initializationError.message,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NETLIFY: process.env.NETLIFY,
        hasDatabase: !!process.env.NETLIFY_DATABASE_URL,
        hasJWT: !!process.env.JWT_SECRET
      }
    });
  });
  
  // All other routes
  app.use('*', (req, res) => {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Backend initialization failed',
      details: initializationError.message,
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl,
      method: req.method
    });
  });
}

// Create serverless handler with better error handling
const handler = serverless(app, {
  binary: ['image/*', 'font/*', 'application/pdf', 'application/zip'],
  
  request: (request, event, context) => {
    // Add Netlify context
    request.netlify = { event, context };
    
    // Add request logging
    console.log(`📨 ${event.httpMethod} ${event.path}`, {
      headers: event.headers,
      query: event.queryStringParameters
    });
    
    // Handle base64 encoded body
    if (event.isBase64Encoded && event.body) {
      request.body = Buffer.from(event.body, 'base64');
    }
  },
  
  response: (response, event, context) => {
    // Ensure headers exist
    if (!response.headers) response.headers = {};
    
    // Add comprehensive CORS headers
    response.headers['Access-Control-Allow-Origin'] = '*';
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key, X-Requested-With';
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    response.headers['Access-Control-Max-Age'] = '86400';
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      response.statusCode = 200;
      response.body = '';
    }
    
    // Add response logging
    console.log(`📤 ${response.statusCode} ${event.httpMethod} ${event.path}`);
  }
});

// Export the handler with comprehensive error handling
exports.handler = async (event, context) => {
  // Configure context
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function timeout')), 25000); // 25 second timeout
    });
    
    const handlerPromise = handler(event, context);
    
    const result = await Promise.race([handlerPromise, timeoutPromise]);
    return result;
    
  } catch (error) {
    console.error('💥 Netlify function error:', {
      message: error.message,
      stack: error.stack,
      event: {
        httpMethod: event.httpMethod,
        path: event.path,
        headers: event.headers
      }
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: {
          message: 'Internal server error',
          type: 'SERVERLESS_ERROR',
          timestamp: new Date().toISOString(),
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          requestId: context.awsRequestId
        }
      })
    };
  }
};