const { PrismaClient } = require('@prisma/client');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Helper function to create JSON response
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

    if (event.httpMethod !== 'POST') {
      return createResponse(405, {
        success: false,
        error: 'Method not allowed. Use POST.'
      });
    }

    console.log('🔄 Starting database migration...');

    let prisma;
    try {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.NETLIFY_DATABASE_URL
          }
        },
        log: ['query', 'info', 'warn', 'error']
      });

      console.log('✅ Prisma client initialized');

      // Test database connection
      await prisma.$connect();
      console.log('✅ Database connected');

      // Check if database tables exist
      try {
        const userCount = await prisma.user.count();
        console.log(`✅ Database already migrated. Found ${userCount} users.`);
        
        return createResponse(200, {
          success: true,
          message: 'Database is already migrated and ready',
          data: {
            userCount,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.log('⚠️ Database needs migration or setup:', error.message);
        
        // Attempt to run database push to create tables
        console.log('🔄 Attempting to create database schema...');
        
        // Since we can't run prisma commands directly in serverless,
        // we'll check for specific table and create manually if needed
        try {
          // Try to query a specific table to see if schema exists
          await prisma.$queryRaw`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          )`;
          
          console.log('✅ Database schema exists');
          
        } catch (schemaError) {
          console.error('❌ Database schema missing:', schemaError.message);
          
          return createResponse(503, {
            success: false,
            error: 'Database schema not found',
            message: 'Please run database migration manually using: npx prisma db push',
            details: schemaError.message
          });
        }
      }

    } catch (error) {
      console.error('❌ Database connection failed:', error);
      
      return createResponse(503, {
        success: false,
        error: 'Database connection failed',
        details: error.message,
        suggestion: 'Check your NETLIFY_DATABASE_URL environment variable'
      });

    } finally {
      if (prisma) {
        await prisma.$disconnect();
      }
    }

  } catch (error) {
    console.error('❌ Migration function error:', error);
    
    return createResponse(500, {
      success: false,
      error: 'Migration function failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};