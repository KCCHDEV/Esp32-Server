const { PrismaClient } = require('@prisma/client');

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

// Migration SQL to add missing columns
const migrationSQL = `
-- Add missing columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "storageLimit" INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lockUntil" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "emailVerificationExpire" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
ADD COLUMN IF NOT EXISTS "backupCodes" TEXT[],
ADD COLUMN IF NOT EXISTS "profilePicture" TEXT,
ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS "notificationSettings" JSONB DEFAULT '{"email": true, "push": true}',
ADD COLUMN IF NOT EXISTS "lastPasswordChange" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Create AuditLog table if it doesn't exist
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create UserSession table if it doesn't exist
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceInfo" JSONB,
    "ipAddress" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- Create SystemSetting table if it doesn't exist
CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- Create ApiUsage table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ApiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- Create FileStorage table if it doesn't exist
CREATE TABLE IF NOT EXISTS "FileStorage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileStorage_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_token_key" ON "UserSession"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AuditLog_userId_fkey') THEN
        ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'UserSession_userId_fkey') THEN
        ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ApiUsage_userId_fkey') THEN
        ALTER TABLE "ApiUsage" ADD CONSTRAINT "ApiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FileStorage_userId_fkey') THEN
        ALTER TABLE "FileStorage" ADD CONSTRAINT "FileStorage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
`;

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

    console.log('🔄 Starting schema migration...');

    let prisma;
    let migrationResults = {
      connected: false,
      migrationRun: false,
      tablesCreated: [],
      columnsAdded: [],
      errors: []
    };

    try {
      // Initialize Prisma client
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.NETLIFY_DATABASE_URL
          }
        }
      });

      await prisma.$connect();
      migrationResults.connected = true;
      console.log('✅ Database connected');

      // Run migration SQL
      console.log('🔄 Running migration SQL...');
      await prisma.$executeRawUnsafe(migrationSQL);
      migrationResults.migrationRun = true;
      console.log('✅ Migration SQL executed');

      // Test the schema by trying to count users
      try {
        const userCount = await prisma.user.count();
        console.log(`✅ Schema validation successful. Found ${userCount} users.`);
        
        // Check if admin user exists
        const adminExists = await prisma.user.findUnique({
          where: { email: 'admin@esp32platform.com' }
        });

        return createResponse(200, {
          success: true,
          message: 'Database schema migration completed successfully!',
          results: {
            ...migrationResults,
            userCount,
            adminExists: !!adminExists,
            ready: true
          },
          nextSteps: [
            'Schema migration completed',
            adminExists ? 'Admin user already exists' : 'Visit /auto-setup to create admin user',
            'Your platform is ready to use!'
          ],
          timestamp: new Date().toISOString()
        });

      } catch (validationError) {
        migrationResults.errors.push(`Validation error: ${validationError.message}`);
        console.error('❌ Schema validation failed:', validationError);
        
        return createResponse(500, {
          success: false,
          error: 'Schema migration completed but validation failed',
          results: migrationResults,
          details: validationError.message,
          suggestion: 'Try running the migration again or check the database manually'
        });
      }

    } catch (migrationError) {
      console.error('❌ Migration error:', migrationError);
      migrationResults.errors.push(migrationError.message);
      
      return createResponse(500, {
        success: false,
        error: 'Database schema migration failed',
        results: migrationResults,
        details: migrationError.message,
        instructions: {
          alternative1: 'Try running the migration again',
          alternative2: 'Run local migration: npx prisma db push',
          alternative3: 'Use Neon Dashboard to run the migration SQL manually'
        }
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
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};