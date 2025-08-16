// Minimal health check function
const { PrismaClient } = require('@prisma/client');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    const startTime = Date.now();
    let prisma;
    let dbStatus = 'disconnected';
    let dbError = null;

    try {
      // Test database connection
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.NETLIFY_DATABASE_URL
          }
        }
      });

      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1 as test`;
      dbStatus = 'connected';
    } catch (error) {
      dbError = error.message;
      console.error('Database connection error:', error);
    } finally {
      if (prisma) {
        await prisma.$disconnect();
      }
    }

    const responseTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NETLIFY: process.env.NETLIFY,
          hasDatabase: !!process.env.NETLIFY_DATABASE_URL,
          hasJWT: !!process.env.JWT_SECRET,
          functionName: context.functionName
        },
        database: {
          status: dbStatus,
          error: dbError
        },
        memory: {
          used: process.memoryUsage().heapUsed / 1024 / 1024,
          total: process.memoryUsage().heapTotal / 1024 / 1024
        }
      })
    };

  } catch (error) {
    console.error('Health check error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      })
    };
  }
};