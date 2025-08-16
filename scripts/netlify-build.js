#!/usr/bin/env node

/**
 * Netlify Build Script
 * Handles Prisma Client generation and database setup specifically for Netlify
 */

const { spawn } = require('child_process');

console.log('🌐 Netlify Build Script Starting...');
console.log('===========================================');

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}: ${command} ${args.join(' ')}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function netlifyBuild() {
  const startTime = Date.now();
  
  try {
    // Check environment variables
    console.log('🔍 Checking environment variables...');
    const requiredEnvs = ['JWT_SECRET', 'JWT_EXPIRE', 'NETLIFY_DATABASE_URL', 'NETLIFY_DATABASE_URL_UNPOOLED'];
    let missingEnvs = [];
    
    requiredEnvs.forEach(env => {
      if (!process.env[env]) {
        missingEnvs.push(env);
      } else {
        console.log(`✅ ${env}: ${env.includes('SECRET') ? '[HIDDEN]' : 'SET'}`);
      }
    });
    
    if (missingEnvs.length > 0) {
      console.log('❌ Missing environment variables:');
      missingEnvs.forEach(env => console.log(`   - ${env}`));
      console.log('⚠️  Build will continue but may fail...');
    } else {
      console.log('✅ All environment variables are set');
    }
    
    console.log('📦 Step 1: Installing dependencies...');
    
    // Install project dependencies
    await runCommand('npm', ['run', 'install']);
    console.log('✅ Project dependencies installed');
    
    // Install Netlify Functions dependencies
    await runCommand('npm', ['install'], {
      cwd: './netlify/functions'
    });
    console.log('✅ Netlify Functions dependencies installed');
    
    console.log('🔧 Step 2: Generating Prisma Client...');
    
    // Generate Prisma client for backend
    await runCommand('npx', ['prisma', 'generate'], {
      cwd: './backend',
      env: {
        ...process.env,
        NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL,
        NETLIFY_DATABASE_URL_UNPOOLED: process.env.NETLIFY_DATABASE_URL_UNPOOLED
      }
    });
    console.log('✅ Backend Prisma client generated');
    
    // Generate Prisma client for functions
    await runCommand('npx', ['prisma', 'generate'], {
      cwd: './netlify/functions',
      env: {
        ...process.env,
        NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL,
        NETLIFY_DATABASE_URL_UNPOOLED: process.env.NETLIFY_DATABASE_URL_UNPOOLED
      }
    });
    console.log('✅ Functions Prisma client generated');
    
    console.log('🏗️  Step 3: Building frontend...');
    await runCommand('npm', ['run', 'build'], {
      cwd: './frontend'
    });
    console.log('✅ Frontend built');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('===========================================');
    console.log(`🎉 Netlify build completed successfully in ${duration}s`);
    console.log('===========================================');
    
  } catch (error) {
    console.error('❌ Netlify build failed:', error.message);
    process.exit(1);
  }
}

netlifyBuild();