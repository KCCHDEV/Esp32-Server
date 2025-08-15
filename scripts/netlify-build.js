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
    await runCommand('npm', ['run', 'install']);
    console.log('✅ Dependencies installed');
    
    console.log('🔧 Step 2: Generating Prisma Client...');
    await runCommand('npx', ['prisma', 'generate'], {
      cwd: './backend',
      env: {
        ...process.env,
        // Ensure NETLIFY_DATABASE_URL is available for Prisma
        NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL,
        NETLIFY_DATABASE_URL_UNPOOLED: process.env.NETLIFY_DATABASE_URL_UNPOOLED
      }
    });
    console.log('✅ Prisma Client generated');
    
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