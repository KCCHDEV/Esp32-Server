const serverless = require('serverless-http');
const path = require('path');

// Set environment variables for backend
process.env.NETLIFY = 'true';

// Ensure the backend directory is in the path
const backendPath = path.join(__dirname, '../../backend');
process.chdir(backendPath);

// Import the Express app
const app = require('../../backend/server');

// Create serverless handler
const handler = serverless(app, {
  // Binary media types that should be handled as binary
  binary: ['image/*', 'font/*', 'application/pdf', 'application/zip'],
  
  // Request/response transformations
  request: (request, event, context) => {
    // Add Netlify context to request
    request.netlify = { event, context };
    
    // Handle base64 encoded body for binary content
    if (event.isBase64Encoded && event.body) {
      request.body = Buffer.from(event.body, 'base64');
    }
  },
  
  response: (response, event, context) => {
    // Add CORS headers for all responses
    if (!response.headers) response.headers = {};
    
    response.headers['Access-Control-Allow-Origin'] = '*';
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key';
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      response.statusCode = 200;
      response.body = '';
    }
  }
});

// Export the handler
module.exports.handler = async (event, context) => {
  // Set context timeout
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const result = await handler(event, context);
    return result;
  } catch (error) {
    console.error('Netlify function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};