// Simple connection test without Prisma to isolate issues
const { Client } = require('pg');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

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

    console.log('🔍 Testing database connection...');

    // Check environment variables
    const dbUrl = process.env.NETLIFY_DATABASE_URL;
    const jwtSecret = process.env.JWT_SECRET;

    const envCheck = {
      NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      NETLIFY: process.env.NETLIFY
    };

    console.log('Environment variables:', envCheck);

    if (!dbUrl) {
      return createResponse(400, {
        success: false,
        error: 'No database URL found',
        environment: envCheck,
        message: 'Set NETLIFY_DATABASE_URL in Netlify dashboard'
      });
    }

    // Parse and validate database URL
    let parsedUrl;
    try {
      parsedUrl = new URL(dbUrl);
      console.log('Database URL parsed successfully');
    } catch (urlError) {
      return createResponse(400, {
        success: false,
        error: 'Invalid database URL format',
        details: urlError.message,
        environment: envCheck,
        suggestion: 'Check your connection string format: postgresql://user:pass@host:port/db'
      });
    }

    const connectionInfo = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 5432,
      database: parsedUrl.pathname?.substring(1),
      username: parsedUrl.username,
      hasPassword: !!parsedUrl.password,
      ssl: parsedUrl.searchParams.get('sslmode') || 'not specified'
    };

    console.log('Connection info:', connectionInfo);

    // Test raw PostgreSQL connection
    let client;
    let connectionResult = {
      connected: false,
      error: null,
      query: false,
      queryError: null
    };

    try {
      client = new Client({
        connectionString: dbUrl,
        ssl: {
          rejectUnauthorized: false // For cloud databases
        }
      });

      console.log('Attempting to connect...');
      await client.connect();
      connectionResult.connected = true;
      console.log('✅ Raw connection successful');

      // Test simple query
      try {
        const result = await client.query('SELECT 1 as test, NOW() as timestamp');
        connectionResult.query = true;
        connectionResult.queryResult = result.rows[0];
        console.log('✅ Query test successful');
      } catch (queryError) {
        connectionResult.queryError = queryError.message;
        console.error('❌ Query failed:', queryError.message);
      }

    } catch (connectionError) {
      connectionResult.error = connectionError.message;
      console.error('❌ Connection failed:', connectionError.message);
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (endError) {
          console.error('Error ending connection:', endError.message);
        }
      }
    }

    // Test Prisma connection
    let prismaResult = {
      loaded: false,
      connected: false,
      error: null
    };

    try {
      const { PrismaClient } = require('@prisma/client');
      prismaResult.loaded = true;

      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl
          }
        },
        log: ['error']
      });

      await prisma.$connect();
      prismaResult.connected = true;
      
      await prisma.$disconnect();
      console.log('✅ Prisma connection successful');

    } catch (prismaError) {
      prismaResult.error = prismaError.message;
      console.error('❌ Prisma connection failed:', prismaError.message);
    }

    return createResponse(200, {
      success: connectionResult.connected,
      message: connectionResult.connected ? 'Connection successful' : 'Connection failed',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      connectionInfo,
      tests: {
        rawConnection: connectionResult,
        prismaConnection: prismaResult
      },
      troubleshooting: {
        nextSteps: connectionResult.connected 
          ? ['Connection works! Check schema with /setup endpoint']
          : [
              'Check NETLIFY_DATABASE_URL in Netlify dashboard',
              'Verify Neon database is not sleeping',
              'Check firewall/IP restrictions',
              'Verify SSL mode requirements'
            ]
      }
    });

  } catch (error) {
    console.error('❌ Connection test error:', error);
    
    return createResponse(500, {
      success: false,
      error: 'Connection test failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};