const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Minimal Prisma client setup for Netlify Functions
const { PrismaClient } = require('@prisma/client');

let prisma;
try {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error']
  });
} catch (error) {
  console.error('Failed to initialize Prisma:', error);
  prisma = null;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

// Helper function to create JSON response
const createResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

// Login handler
const handleLogin = async (event) => {
  try {
    if (!prisma) {
      return createResponse(503, {
        success: false,
        error: 'Database connection failed'
      });
    }

    const { email, login, password } = JSON.parse(event.body || '{}');
    
    // Support both email and login field (for compatibility)
    const loginField = email || login;

    if (!loginField || !password) {
      return createResponse(400, {
        success: false,
        error: 'Email/username and password are required'
      });
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginField.toLowerCase() },
          { username: loginField.toLowerCase() }
        ]
      }
    });

    if (!user) {
      return createResponse(401, {
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(password, user.password);
    if (!isValidPassword) {
      return createResponse(401, {
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return createResponse(200, {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return createResponse(500, {
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Register handler
const handleRegister = async (event) => {
  try {
    if (!prisma) {
      return createResponse(503, {
        success: false,
        error: 'Database connection failed'
      });
    }

    const { username, email, password } = JSON.parse(event.body || '{}');

    if (!username || !email || !password) {
      return createResponse(400, {
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return createResponse(400, {
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists (email or username)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return createResponse(409, {
        success: false,
        error: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        deviceLimit: 5,
        projectLimit: 10
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return createResponse(201, {
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    return createResponse(500, {
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Database status handler
const handleDatabaseStatus = async (event) => {
  try {
    if (!prisma) {
      return createResponse(503, {
        success: false,
        error: 'Database connection failed',
        status: 'disconnected'
      });
    }

    // Test database connection and check if setup is needed
    const result = await prisma.$connect();
    
    try {
      // Check if users table exists and has data
      const userCount = await prisma.user.count();
      const adminExists = await prisma.user.findUnique({
        where: { email: 'admin@esp32platform.com' }
      });

      return createResponse(200, {
        success: true,
        status: 'connected',
        data: {
          userCount,
          adminExists: !!adminExists,
          setupRequired: userCount === 0,
          message: userCount === 0 ? 'Database setup required' : 'Database ready'
        }
      });

    } catch (schemaError) {
      return createResponse(503, {
        success: false,
        error: 'Database schema not ready',
        status: 'schema_missing',
        message: 'Database tables do not exist. Setup required.',
        setupRequired: true
      });
    }

  } catch (error) {
    console.error('Database status error:', error);
    return createResponse(503, {
      success: false,
      error: 'Database status check failed',
      status: 'error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
};

// Database setup handler
const handleSetupDatabase = async (event) => {
  try {
    if (!prisma) {
      return createResponse(503, {
        success: false,
        error: 'Database connection failed'
      });
    }

    // Check if users already exist
    const userCount = await prisma.user.count();
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@esp32platform.com' }
    });
    
    if (adminExists) {
      return createResponse(200, {
        success: true,
        message: 'Admin user already exists',
        data: {
          adminExists: true,
          userCount,
          note: 'Admin user is already set up. Use existing credentials or reset password if needed.'
        }
      });
    }

    // Generate random admin password
    const adminPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const hashedPassword = await bcryptjs.hash(adminPassword, 12);

    // Create admin user
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

    return createResponse(200, {
      success: true,
      message: 'Database setup completed successfully',
      data: {
        adminCredentials: {
          email: 'admin@esp32platform.com',
          password: adminPassword,
          note: 'Please save this password and change it after first login'
        }
      }
    });

  } catch (error) {
    console.error('Database setup error:', error);
    return createResponse(500, {
      success: false,
      error: 'Database setup failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Main handler
exports.handler = async (event, context) => {
  // Configure context
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Parse the path to determine which auth endpoint to handle
    const path = event.path.replace('/.netlify/functions/auth', '').replace('/api/auth', '');
    
    console.log(`Auth handler: ${event.httpMethod} ${path}`);

    // Route to appropriate handler
    switch (path) {
      case '/login':
        if (event.httpMethod === 'POST') {
          return await handleLogin(event);
        }
        break;
      
      case '/register':
        if (event.httpMethod === 'POST') {
          return await handleRegister(event);
        }
        break;
      
      case '/setup-database':
        if (event.httpMethod === 'POST') {
          return await handleSetupDatabase(event);
        }
        break;
      
      case '/database-status':
        if (event.httpMethod === 'GET') {
          return await handleDatabaseStatus(event);
        }
        break;
      
      default:
        return createResponse(404, {
          success: false,
          error: 'Auth endpoint not found',
          availableEndpoints: ['/login', '/register', '/setup-database', '/database-status']
        });
    }

    return createResponse(405, {
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Auth function error:', error);
    return createResponse(500, {
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Clean up database connection
    if (prisma) {
      await prisma.$disconnect();
    }
  }
};