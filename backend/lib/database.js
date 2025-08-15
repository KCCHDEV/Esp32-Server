const { PrismaClient } = require('@prisma/client');

// Use Netlify environment variables (required)
const databaseUrl = process.env.NETLIFY_DATABASE_URL;

// Create Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasourceUrl: databaseUrl,
});

// Database connection and auto-setup function
async function connectDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    
    // Test the connection
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database via Prisma');
    
    // Auto-setup database tables
    await setupDatabase();
    
    return prisma;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

// Auto-setup database tables and schema
async function setupDatabase() {
  try {
    console.log('🔄 Setting up database schema...');
    
    // Check if tables exist by trying to count users
    try {
      await prisma.user.count();
      console.log('✅ Database tables already exist');
      return;
    } catch (error) {
      console.log('🔄 Database tables not found, creating schema...');
    }
    
    // Push database schema (creates tables)
    const { spawn } = require('child_process');
    
    await new Promise((resolve, reject) => {
      const process = spawn('npx', ['prisma', 'db', 'push', '--force-reset'], {
        cwd: __dirname + '/..',
        env: { 
          ...process.env,
          NETLIFY_DATABASE_URL: databaseUrl
        },
        stdio: 'inherit'
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Database schema created successfully');
          resolve();
        } else {
          reject(new Error(`Prisma db push failed with code ${code}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
    
    // Generate Prisma client
    await new Promise((resolve, reject) => {
      const process = spawn('npx', ['prisma', 'generate'], {
        cwd: __dirname + '/..',
        stdio: 'inherit'
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Prisma client generated successfully');
          resolve();
        } else {
          reject(new Error(`Prisma generate failed with code ${code}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
    
    // Seed database with initial data if needed
    await seedDatabase();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    // Don't throw error - let the app continue with manual setup
    console.log('⚠️  Manual database setup may be required');
  }
}

// Seed database with initial data
async function seedDatabase() {
  try {
    console.log('🔄 Checking for initial data...');
    
    // Check if we already have users
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log('✅ Database already has data');
      return;
    }
    
    console.log('🔄 Seeding database with initial data...');
    
    // Create admin user
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 12);
    
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@esp32platform.com',
        password: adminPassword,
        role: 'ADMIN',
        subscription: 'PREMIUM',
        emailVerified: true,
        isActive: true
      }
    });
    
    console.log('✅ Admin user created: admin@esp32platform.com / admin123');
    console.log('🌱 Database seeded successfully');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    // Don't throw error - seeding is optional
  }
}

// Alternative manual setup function for production
async function manualDatabaseSetup() {
  try {
    console.log('🔄 Running manual database setup...');
    
    // Create tables using raw SQL as fallback
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
    
    // Create unique indexes
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
    `;
    
    console.log('✅ Basic tables created manually');
    
  } catch (error) {
    console.error('❌ Manual database setup failed:', error);
    throw error;
  }
}

// Graceful shutdown
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Disconnected from database');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, closing database connection...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, closing database connection...');
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  setupDatabase,
  manualDatabaseSetup
};