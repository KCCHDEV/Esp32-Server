#!/usr/bin/env node

/**
 * Netlify Build Script
 * Handles Prisma Client generation and database setup specifically for Netlify
 */

const { execSync } = require('child_process');
const path = require('path');

async function build() {
  console.log('🚀 Starting Netlify build process...');

  try {
    // Check required environment variables
    const requiredEnvVars = ['NETLIFY_DATABASE_URL', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('⚠️ Missing environment variables:', missingVars.join(', '));
      console.log('📝 The app will still build but setup will be required after deployment');
    } else {
      console.log('✅ All required environment variables found');
    }

    // Install root dependencies
    console.log('📦 Installing root dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    // Install frontend dependencies and build
    console.log('📦 Installing frontend dependencies...');
    execSync('npm install', { cwd: './frontend', stdio: 'inherit' });

    // Install Netlify Functions dependencies
    console.log('📦 Installing Netlify Functions dependencies...');
    execSync('npm install', { cwd: './netlify/functions', stdio: 'inherit' });

    // Copy prisma files to functions directory for serverless use (but preserve functions schema)
    console.log('📁 Setting up Prisma for Netlify Functions...');
    execSync('cp backend/prisma/seed.js netlify/functions/prisma/ 2>/dev/null || true', { stdio: 'inherit' });
    // Note: schema.prisma in functions directory is already optimized for serverless

    // Generate Prisma client for backend
    console.log('🔧 Generating Prisma client for backend...');
    execSync('npx prisma generate', {
      cwd: './backend',
      stdio: 'inherit',
      env: {
        ...process.env,
        NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL
      }
    });

    // Generate Prisma client for Netlify Functions
    console.log('🔧 Generating Prisma client for Netlify Functions...');
    execSync('npx prisma generate', {
      cwd: './netlify/functions',
      stdio: 'inherit',
      env: {
        ...process.env,
        NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL
      }
    });

    // Auto-setup database schema if environment variables are available
    if (process.env.NETLIFY_DATABASE_URL && process.env.JWT_SECRET) {
      console.log('🗄️ Setting up database schema automatically...');
      
      try {
                 // Try to push the schema to the database
         console.log('🔄 Running database schema push...');
         try {
           execSync('npx prisma db push --force-reset --accept-data-loss', {
             cwd: './netlify/functions',
             stdio: 'inherit',
             env: {
               ...process.env,
               NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL
             }
           });
         } catch (pushError) {
           console.log('⚠️ Schema push failed, trying without force reset...');
           execSync('npx prisma db push', {
             cwd: './netlify/functions',
             stdio: 'inherit',
             env: {
               ...process.env,
               NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL
             }
           });
         }
        
        console.log('✅ Database schema setup completed successfully!');
        
        // Try to create admin user during build
        console.log('👤 Creating admin user...');
        
        const createAdminScript = `
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.NETLIFY_DATABASE_URL
      }
    }
  });

  try {
    await prisma.$connect();
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@esp32platform.com' }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Generate random password for admin
    const adminPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@esp32platform.com',
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@esp32platform.com');
    console.log('🔑 Password:', adminPassword);
    console.log('🚨 IMPORTANT: Save these credentials! They will not be shown again.');
    
    // Save credentials to build log
    console.log('\\n=== ADMIN CREDENTIALS ===');
    console.log('Email: admin@esp32platform.com');
    console.log('Password:', adminPassword);
    console.log('=========================\\n');
    
  } catch (error) {
    console.log('⚠️ Could not create admin user during build:', error.message);
    console.log('💡 You can create it later by visiting /auto-setup');
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin().catch(console.error);
        `;
        
        // Write and execute the admin creation script
        require('fs').writeFileSync('./create-admin-temp.js', createAdminScript);
        execSync('node create-admin-temp.js', {
          cwd: './netlify/functions',
          stdio: 'inherit',
          env: {
            ...process.env,
            NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL
          }
        });
        
        // Clean up temp file
        require('fs').unlinkSync('./create-admin-temp.js');
        
      } catch (dbError) {
        console.log('⚠️ Database setup failed during build:', dbError.message);
        console.log('💡 Database will be set up automatically on first visit to /auto-setup');
        console.log('🔧 This is normal for new deployments');
      }
    } else {
      console.log('⚠️ Database auto-setup skipped (missing environment variables)');
      console.log('💡 Set NETLIFY_DATABASE_URL and JWT_SECRET in Netlify dashboard');
      console.log('🔧 Then visit /auto-setup after deployment');
    }

    // Build frontend
    console.log('🎨 Building frontend...');
    execSync('npm run build', { cwd: './frontend', stdio: 'inherit' });

    console.log('🎉 Build completed successfully!');
    
    if (process.env.NETLIFY_DATABASE_URL && process.env.JWT_SECRET) {
      console.log('✅ Your platform should be ready to use immediately!');
      console.log('🌐 Visit your site and it should work without additional setup');
    } else {
      console.log('⚠️ Remember to set environment variables and visit /auto-setup');
    }

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();