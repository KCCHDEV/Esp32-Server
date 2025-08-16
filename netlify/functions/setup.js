const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

    console.log('🔄 Starting database setup and test...');

    // Check environment variables first
    const requiredEnvs = ['NETLIFY_DATABASE_URL', 'JWT_SECRET'];
    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
    
    if (missingEnvs.length > 0) {
      return createResponse(400, {
        success: false,
        error: 'Missing required environment variables',
        missing: missingEnvs,
        message: 'Please set the required environment variables in Netlify dashboard'
      });
    }

    let prisma;
    let results = {
      connection: false,
      schema: false,
      admin: false,
      error: null
    };

    try {
      // Step 1: Test database connection
      console.log('📡 Testing database connection...');
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.NETLIFY_DATABASE_URL
          }
        },
        log: ['error']
      });

      await prisma.$connect();
      results.connection = true;
      console.log('✅ Database connection successful');

      // Step 2: Test schema
      console.log('🔍 Testing database schema...');
      try {
        // Try to query the users table
        const userCount = await prisma.user.count();
        results.schema = true;
        results.userCount = userCount;
        console.log(`✅ Database schema exists. Found ${userCount} users.`);

        // Step 3: Check/create admin user
        if (event.httpMethod === 'POST') {
          console.log('👤 Setting up admin user...');
          
          // Generate secure admin password
          const adminPassword = Math.random().toString(36).slice(-12) + 'A1!';
          const hashedPassword = await bcryptjs.hash(adminPassword, 12);

          const adminUser = await prisma.user.upsert({
            where: { email: 'admin@esp32platform.com' },
            update: {
              password: hashedPassword,
              isActive: true
            },
            create: {
              username: 'admin',
              email: 'admin@esp32platform.com',
              password: hashedPassword,
              role: 'ADMIN',
              isActive: true,
              deviceLimit: 999,
              projectLimit: 999
            }
          });

          results.admin = true;
          results.adminPassword = adminPassword;
          console.log('✅ Admin user setup completed');
        }

      } catch (schemaError) {
        console.error('❌ Database schema error:', schemaError.message);
        results.error = `Schema error: ${schemaError.message}`;
        
        return createResponse(503, {
          success: false,
          error: 'Database schema not ready',
          message: 'Database tables do not exist. Please run database migration.',
          details: schemaError.message,
          suggestion: 'Run: npx prisma db push in your backend directory',
          results
        });
      }

    } catch (connectionError) {
      console.error('❌ Database connection error:', connectionError.message);
      results.error = `Connection error: ${connectionError.message}`;
      
      return createResponse(503, {
        success: false,
        error: 'Database connection failed',
        details: connectionError.message,
        suggestion: 'Check your NETLIFY_DATABASE_URL environment variable',
        results
      });

    } finally {
      if (prisma) {
        await prisma.$disconnect();
      }
    }

    // Success response
    const response = {
      success: true,
      message: 'Database setup completed successfully',
      results,
      timestamp: new Date().toISOString()
    };

    if (results.adminPassword) {
      response.adminCredentials = {
        email: 'admin@esp32platform.com',
        password: results.adminPassword,
        note: 'Please save this password and change it after first login'
      };
    }

    return createResponse(200, response);

  } catch (error) {
    console.error('❌ Setup function error:', error);
    
    return createResponse(500, {
      success: false,
      error: 'Setup function failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};