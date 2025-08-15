#!/usr/bin/env node

/**
 * Database Migration Script
 * Run this to manually setup/migrate your database
 * 
 * Usage:
 *   node scripts/migrate.js
 *   npm run db:migrate
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Use appropriate database URL
const databaseUrl = process.env.NETLIFY_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ No database URL found. Please set NETLIFY_DATABASE_URL');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasourceUrl: databaseUrl,
});

async function main() {
  try {
    console.log('🚀 Starting database migration...');
    console.log(`📍 Database URL: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Check if database is already setup
    try {
      const userCount = await prisma.user.count();
      console.log(`📊 Found ${userCount} users in database`);
      
      if (userCount > 0) {
        console.log('✅ Database appears to be already setup');
        const adminUser = await prisma.user.findUnique({
          where: { email: 'admin@esp32platform.com' }
        });
        
        if (adminUser) {
          console.log('✅ Admin user exists');
        } else {
          console.log('⚠️  No admin user found, creating one...');
          await createAdminUser();
        }
        
        return;
      }
    } catch (error) {
      console.log('🔄 Database tables not found, creating schema...');
    }
    
    // Run Prisma migrations
    console.log('🔄 Pushing database schema...');
    const { spawn } = require('child_process');
    
    await new Promise((resolve, reject) => {
      const process = spawn('npx', ['prisma', 'db', 'push'], {
        cwd: __dirname + '/..',
        env: { 
          ...process.env,
          NETLIFY_DATABASE_URL: databaseUrl
        },
        stdio: 'inherit'
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Database schema updated');
          resolve();
        } else {
          reject(new Error(`Prisma db push failed with code ${code}`));
        }
      });
    });
    
    // Generate Prisma client
    console.log('🔄 Generating Prisma client...');
    await new Promise((resolve, reject) => {
      const process = spawn('npx', ['prisma', 'generate'], {
        cwd: __dirname + '/..',
        stdio: 'inherit'
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Prisma client generated');
          resolve();
        } else {
          reject(new Error(`Prisma generate failed with code ${code}`));
        }
      });
    });
    
    // Create admin user
    await createAdminUser();
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createAdminUser() {
  try {
    console.log('👤 Creating admin user...');
    
    const adminPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@esp32platform.com' },
      update: {},
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
    
    console.log('✅ Admin user created/updated');
    console.log('📧 Email: admin@esp32platform.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login!');
    
    return admin;
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, createAdminUser };