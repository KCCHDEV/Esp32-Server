#!/usr/bin/env node

/**
 * Build-time Database Setup Script
 * This runs during Netlify build to automatically setup database
 * 
 * Features:
 * - Auto-detects database connection
 * - Creates tables if needed
 * - Creates admin user
 * - Handles errors gracefully
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { spawn } = require('child_process');

console.log('🏗️  Build-time Database Setup Starting...');
console.log('===============================================');

// Environment detection
const isNetlify = process.env.NETLIFY === 'true';
const isCI = process.env.CI === 'true';
const isBuild = process.env.NODE_ENV === 'production' || isNetlify || isCI;

console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📦 Netlify: ${isNetlify ? 'Yes' : 'No'}`);
console.log(`🏗️  CI/Build: ${isBuild ? 'Yes' : 'No'}`);

// Use appropriate database URL with priority order
const databaseUrl = process.env.NETLIFY_DATABASE_URL || 
                   process.env.DATABASE_URL || 
                   process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  console.log('⚠️  No database URL found - skipping database setup');
  console.log('   Available variables: NETLIFY_DATABASE_URL, DATABASE_URL, NEON_DATABASE_URL');
  console.log('   This is normal for frontend-only builds or when DB is not configured');
  
  if (isNetlify || isCI) {
    console.log('   Build will continue without database setup');
    process.exit(0);
  } else {
    console.log('   For local development, please set DATABASE_URL in .env file');
    process.exit(0);
  }
}

console.log('📍 Database URL found, proceeding with setup...');
console.log(`🔗 URL: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);

let prisma;

async function buildTimeSetup() {
  const startTime = Date.now();
  
  try {
    // Generate Prisma Client first (required for Netlify)
    console.log('🔄 Generating Prisma Client for Netlify...');
    try {
      await generatePrismaClient();
      console.log('✅ Prisma Client generated successfully');
    } catch (generateError) {
      console.log('⚠️  Prisma Client generation failed, continuing with existing client...');
      console.log('   Error:', generateError.message);
    }

    // Initialize Prisma Client after generation
    prisma = new PrismaClient({
      datasourceUrl: databaseUrl,
      log: process.env.NODE_ENV === 'development' ? ['error'] : []
    });
    
    console.log('🔄 Testing database connection...');
    
    // Test connection with timeout (30 seconds for Netlify builds)
    const connectionTest = prisma.$connect();
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
    );
    
    await Promise.race([connectionTest, timeout]);
    console.log('✅ Database connection successful');
    
    // Check if database is already setup
    let isSetup = false;
    let userCount = 0;
    
    try {
      userCount = await prisma.user.count();
      console.log(`📊 Found ${userCount} users in database`);
      isSetup = userCount > 0;
    } catch (error) {
      console.log('🔄 Database tables not found, will create schema...');
      isSetup = false;
    }
    
    if (isSetup) {
      console.log('✅ Database already setup, checking admin user...');
      await ensureAdminUser();
      console.log('🎉 Build-time database check completed!');
      logSetupComplete(startTime, 'verified');
      return;
    }
    
    // Database needs setup
    console.log('🔧 Setting up database schema...');
    
    // Try Prisma method first (cleaner)
    try {
      await setupDatabaseWithPrisma();
    } catch (prismaError) {
      console.log('⚠️  Prisma method failed, trying raw SQL method...');
      await setupDatabaseWithSQL();
    }
    
    console.log('👤 Creating admin user...');
    await createAdminUser();
    
    console.log('🎉 Build-time database setup completed successfully!');
    console.log('📧 Admin: admin@esp32platform.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change admin password after first login');
    
    logSetupComplete(startTime, 'created');
    
  } catch (error) {
    console.error('❌ Build-time database setup failed:', error.message);
    
    // In build environment, we'll continue even if DB setup fails
    if (isNetlify || isCI) {
      console.log('⚠️  Continuing build despite database setup failure');
      console.log('💡 Database can be setup manually after deployment');
      console.log('💡 Use the /api/auth/setup-database endpoint or registration page');
      logSetupComplete(startTime, 'failed');
      process.exit(0);
    } else {
      logSetupComplete(startTime, 'failed');
      process.exit(1);
    }
      } finally {
      if (prisma) {
        await prisma.$disconnect();
      }
    }
}

async function setupDatabaseWithPrisma() {
  try {
    console.log('📋 Using Prisma to create schema...');
    
    // Try to use Prisma db push if available
    const { spawn } = require('child_process');
    
    await new Promise((resolve, reject) => {
      const env = { 
        ...process.env,
        DATABASE_URL: databaseUrl
      };
      
      const dbPush = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
        cwd: __dirname + '/..',
        env,
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      dbPush.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      dbPush.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      dbPush.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Prisma schema push successful');
          resolve();
        } else {
          reject(new Error(`Prisma db push failed with code ${code}: ${errorOutput}`));
        }
      });
      
      dbPush.on('error', (error) => {
        reject(error);
      });
      
      // Timeout after 60 seconds
      setTimeout(() => {
        dbPush.kill();
        reject(new Error('Prisma db push timeout'));
      }, 60000);
    });
    
  } catch (error) {
    console.log('⚠️  Prisma method failed:', error.message);
    throw error;
  }
}

async function setupDatabaseWithSQL() {
  try {
    console.log('📋 Creating database schema with raw SQL...');
    
    // Use raw SQL for reliable table creation
    await prisma.$executeRaw`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `;
    
    // Create users table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "username" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "subscription" TEXT NOT NULL DEFAULT 'FREE',
        "subscriptionExpiry" TIMESTAMP(3),
        "deviceLimit" INTEGER NOT NULL DEFAULT 3,
        "projectLimit" INTEGER NOT NULL DEFAULT 5,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastLogin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resetPasswordToken" TEXT,
        "resetPasswordExpire" TIMESTAMP(3),
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "emailVerificationToken" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Create devices table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "devices" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "description" TEXT,
        "userId" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "apiKey" TEXT NOT NULL,
        "isOnline" BOOLEAN NOT NULL DEFAULT false,
        "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "firmwareVersion" TEXT NOT NULL DEFAULT '1.0.0',
        "hardwareVersion" TEXT,
        "ipAddress" TEXT,
        "location" TEXT,
        "uptime" INTEGER,
        "memoryUsage" INTEGER,
        "cpuUsage" DOUBLE PRECISION,
        "wifiSignal" INTEGER,
        "statusMessage" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Create projects table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "description" TEXT,
        "userId" TEXT NOT NULL,
        "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "code" TEXT,
        "configuration" JSONB,
        "version" TEXT NOT NULL DEFAULT '1.0.0',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Create unique indexes (with IF NOT EXISTS for safety)
    try {
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
      `;
      
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
      `;
      
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "devices_deviceId_key" ON "devices"("deviceId");
      `;
      
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "devices_apiKey_key" ON "devices"("apiKey");
      `;
    } catch (indexError) {
      console.log('⚠️  Some indexes already exist (this is normal)');
    }
    
    // Create foreign key constraints (with error handling)
    try {
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'devices_userId_fkey'
          ) THEN
            ALTER TABLE "devices" 
            ADD CONSTRAINT "devices_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `;
      
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'projects_userId_fkey'
          ) THEN
            ALTER TABLE "projects" 
            ADD CONSTRAINT "projects_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `;
    } catch (fkError) {
      console.log('⚠️  Foreign key constraints already exist (this is normal)');
    }
    
    console.log('✅ Database schema created successfully');
    
  } catch (error) {
    // Handle constraint already exists errors gracefully
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('✅ Database schema already exists');
    } else {
      throw error;
    }
  }
}

async function createAdminUser() {
  try {
    const adminPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@esp32platform.com' },
      update: {
        password: adminPassword,
        role: 'ADMIN',
        subscription: 'PREMIUM',
        isActive: true
      },
      create: {
        username: 'admin',
        email: 'admin@esp32platform.com',
        password: adminPassword,
        role: 'ADMIN',
        subscription: 'PREMIUM',
        emailVerified: true,
        isActive: true
      }
    });
    
    console.log('✅ Admin user created/updated successfully');
    return admin;
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    throw error;
  }
}

async function ensureAdminUser() {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@esp32platform.com' }
    });
    
    if (!admin) {
      console.log('⚠️  Admin user not found, creating...');
      await createAdminUser();
    } else {
      console.log('✅ Admin user exists');
    }
    
  } catch (error) {
    console.log('⚠️  Could not check admin user:', error.message);
    // Try to create admin user anyway
    await createAdminUser();
  }
}

function logSetupComplete(startTime, status) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('===============================================');
  console.log(`⏱️  Database setup completed in ${duration}s (${status})`);
  console.log('===============================================');
}

function generatePrismaClient() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Running: npx prisma generate');
    
    const env = { 
      ...process.env,
      DATABASE_URL: databaseUrl,
      NETLIFY_DATABASE_URL: databaseUrl
    };
    
    const generate = spawn('npx', ['prisma', 'generate'], {
      cwd: __dirname + '/..',
      env,
      stdio: 'inherit'
    });
    
    generate.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Prisma generate failed with code ${code}`));
      }
    });
    
    generate.on('error', (error) => {
      reject(error);
    });
    
    // Timeout after 60 seconds
    setTimeout(() => {
      generate.kill();
      reject(new Error('Prisma generate timeout'));
    }, 60000);
  });
}

// Run setup
buildTimeSetup();