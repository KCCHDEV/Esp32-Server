const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

    console.log('🚀 Starting auto-setup process...');

    // Step 1: Check environment variables
    const requiredEnvs = ['NETLIFY_DATABASE_URL', 'JWT_SECRET'];
    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
    
    if (missingEnvs.length > 0) {
      return createResponse(400, {
        success: false,
        error: 'Missing required environment variables',
        missing: missingEnvs,
        message: '⚠️ Setup Required: Add environment variables in Netlify Dashboard',
        instructions: {
          step1: 'Go to Netlify Dashboard → Site Settings → Environment Variables',
          step2: 'Add these 4 variables:',
          variables: {
            NETLIFY_DATABASE_URL: 'Your Neon PostgreSQL connection string',
            JWT_SECRET: 'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
            JWT_EXPIRE: '7d (optional, defaults to 7 days)',
            NODE_ENV: 'production (optional, auto-set)'
          },
          step3: 'Redeploy your site after adding variables',
          step4: 'Visit /auto-setup again to complete setup'
        }
      });
    }

    let setupResults = {
      environment: true,
      connection: false,
      schema: false,
      admin: false,
      ready: false,
      errors: []
    };

    let prisma;
    let adminCredentials = null;

    try {
      // Step 2: Test database connection
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
      setupResults.connection = true;
      console.log('✅ Database connection successful');

      // Step 3: Check/Create schema
      console.log('🔍 Checking database schema...');
      try {
        // Try to count users to test schema
        const userCount = await prisma.user.count();
        setupResults.schema = true;
        console.log(`✅ Database schema exists. Found ${userCount} users.`);

        // Step 4: Setup admin user
        console.log('👤 Setting up admin user...');
        
        // Check if admin already exists
        const existingAdmin = await prisma.user.findUnique({
          where: { email: 'admin@esp32platform.com' }
        });

        if (existingAdmin) {
          setupResults.admin = true;
          console.log('✅ Admin user already exists');
        } else {
          // Create new admin user
          const adminPassword = Math.random().toString(36).slice(-12) + 'A1!';
          const hashedPassword = await bcryptjs.hash(adminPassword, 12);

          const adminUser = await prisma.user.create({
            data: {
              username: 'admin',
              email: 'admin@esp32platform.com',
              password: hashedPassword,
              role: 'ADMIN',
              isActive: true,
              deviceLimit: 999,
              projectLimit: 999
            }
          });

          setupResults.admin = true;
          adminCredentials = {
            email: 'admin@esp32platform.com',
            password: adminPassword
          };
          console.log('✅ Admin user created successfully');
        }

        setupResults.ready = true;

      } catch (schemaError) {
        console.error('❌ Database schema error:', schemaError.message);
        setupResults.errors.push(`Schema error: ${schemaError.message}`);
        
        return createResponse(503, {
          success: false,
          error: 'Database schema not ready',
          message: '🔧 Database Setup Required',
          setupResults,
          instructions: {
            problem: 'Database tables do not exist',
            solution: 'Run database migration',
            steps: [
              '1. Clone this repository locally',
              '2. Set NETLIFY_DATABASE_URL in your environment',
              '3. Run: cd backend && npx prisma db push',
              '4. Redeploy your Netlify site',
              '5. Visit /auto-setup again'
            ],
            alternative: 'Use Neon Dashboard to import schema.sql or run migration scripts'
          }
        });
      }

    } catch (connectionError) {
      console.error('❌ Database connection error:', connectionError.message);
      setupResults.errors.push(`Connection error: ${connectionError.message}`);
      
      return createResponse(503, {
        success: false,
        error: 'Database connection failed',
        message: '🔌 Connection Problem',
        setupResults,
        instructions: {
          problem: 'Cannot connect to database',
          common_causes: [
            'NETLIFY_DATABASE_URL is incorrect',
            'Neon database is sleeping (free tier)',
            'Connection string missing sslmode=require',
            'Database credentials are wrong'
          ],
          solutions: [
            '1. Check NETLIFY_DATABASE_URL in Netlify Dashboard',
            '2. Go to Neon Dashboard and wake up database',
            '3. Copy fresh connection string from Neon',
            '4. Ensure format: postgresql://user:pass@host/db?sslmode=require'
          ]
        }
      });

    } finally {
      if (prisma) {
        await prisma.$disconnect();
      }
    }

    // Success response
    const response = {
      success: true,
      message: '🎉 Auto-setup completed successfully!',
      status: 'ready',
      timestamp: new Date().toISOString(),
      setupResults,
      nextSteps: [
        '✅ Your ESP32 Zero-Code Platform is ready to use!',
        '🔑 Use the admin credentials below to login',
        '📱 Access your dashboard and start creating projects',
        '🔧 Add users, devices, and configure your IoT platform'
      ]
    };

    if (adminCredentials) {
      response.adminCredentials = {
        ...adminCredentials,
        note: '⚠️ IMPORTANT: Save these credentials! They are generated once.',
        loginUrl: `${event.headers.origin || 'https://your-app.netlify.app'}/login`
      };
    } else {
      response.adminInfo = {
        email: 'admin@esp32platform.com',
        note: 'Admin user already exists. Use existing password or reset if needed.',
        loginUrl: `${event.headers.origin || 'https://your-app.netlify.app'}/login`
      };
    }

    return createResponse(200, response);

  } catch (error) {
    console.error('❌ Auto-setup error:', error);
    
    return createResponse(500, {
      success: false,
      error: 'Auto-setup failed',
      message: '💥 Setup Error',
      details: error.message,
      instructions: {
        step1: 'Check Netlify Function logs for detailed error',
        step2: 'Verify all 4 environment variables are set',
        step3: 'Test individual endpoints: /env-check, /connection-test',
        step4: 'Contact support if issues persist'
      }
    });
  }
};