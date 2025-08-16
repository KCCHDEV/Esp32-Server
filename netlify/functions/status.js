// Simple status page function for debugging deployment issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'text/html'
};

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

    // Check environment variables
    const envVars = {
      NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      JWT_EXPIRE: !!process.env.JWT_EXPIRE,
      NODE_ENV: process.env.NODE_ENV || 'not set'
    };

    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => key !== 'NODE_ENV' && !value)
      .map(([key]) => key);

    // Test database connection if vars are present
    let dbStatus = 'Not tested';
    let dbError = null;
    
    if (envVars.NETLIFY_DATABASE_URL) {
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient({
          datasources: {
            db: {
              url: process.env.NETLIFY_DATABASE_URL
            }
          }
        });
        
        await prisma.$connect();
        dbStatus = 'Connected ✅';
        await prisma.$disconnect();
      } catch (error) {
        dbStatus = 'Failed ❌';
        dbError = error.message;
      }
    } else {
      dbStatus = 'No URL configured ⚠️';
    }

    // Generate HTML status page
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESP32 Platform - Setup Status</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #1976d2; margin-bottom: 10px; }
        h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .status { padding: 15px; border-radius: 4px; margin: 10px 0; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .error { background: #ffeaea; border-left: 4px solid #f44336; }
        .warning { background: #fff8e1; border-left: 4px solid #ff9800; }
        .info { background: #e3f2fd; border-left: 4px solid #2196f3; }
        .code { background: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace; overflow-x: auto; }
        .button {
            display: inline-block;
            background: #1976d2;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin: 5px;
        }
        .button:hover { background: #1565c0; }
        .step { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 ESP32 Zero-Code Platform</h1>
        <p><strong>Setup Status & Configuration Guide</strong></p>
        
        <h2>📊 Current Status</h2>
        
        <div class="status ${missingVars.length === 0 ? 'success' : 'error'}">
            <strong>Environment Variables:</strong> ${missingVars.length === 0 ? '✅ All set' : `❌ Missing: ${missingVars.join(', ')}`}
        </div>
        
        <div class="status ${dbStatus.includes('✅') ? 'success' : dbStatus.includes('⚠️') ? 'warning' : 'error'}">
            <strong>Database Connection:</strong> ${dbStatus}
            ${dbError ? `<br><small>Error: ${dbError}</small>` : ''}
        </div>
        
        ${missingVars.length > 0 ? `
        <h2>⚙️ Setup Required</h2>
        <div class="status error">
            <strong>Action Needed:</strong> Set missing environment variables in Netlify Dashboard
        </div>
        
        <div class="step">
            <h3>Step 1: Go to Netlify Dashboard</h3>
            <p>Go to your Netlify site → <strong>Site Settings</strong> → <strong>Environment Variables</strong></p>
        </div>
        
        <div class="step">
            <h3>Step 2: Add Required Variables</h3>
            <ul>
                ${missingVars.includes('NETLIFY_DATABASE_URL') ? '<li><strong>NETLIFY_DATABASE_URL</strong> - Your Neon PostgreSQL connection string</li>' : ''}
                ${missingVars.includes('JWT_SECRET') ? '<li><strong>JWT_SECRET</strong> - Random 32+ character string for JWT signing</li>' : ''}
                ${missingVars.includes('JWT_EXPIRE') ? '<li><strong>JWT_EXPIRE</strong> - Token expiration time (e.g., "7d")</li>' : ''}
            </ul>
        </div>
        
        <div class="step">
            <h3>Step 3: Get Database URL</h3>
            <ol>
                <li>Go to <a href="https://neon.tech" target="_blank">Neon.tech</a> and create a free account</li>
                <li>Create a new project</li>
                <li>Go to Dashboard → Connection Details</li>
                <li>Copy the "Pooled connection" string</li>
                <li>Paste as NETLIFY_DATABASE_URL</li>
            </ol>
        </div>
        
        <div class="step">
            <h3>Step 4: Generate JWT Secret</h3>
            <p>Run this command to generate a secure JWT secret:</p>
            <div class="code">node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"</div>
            <p>Or use: <a href="https://generate-secret.vercel.app/32" target="_blank">Online Generator</a></p>
        </div>
        
        <div class="step">
            <h3>Step 5: Redeploy</h3>
            <p>After setting all variables, trigger a new deployment in Netlify</p>
        </div>
        ` : `
        <h2>✅ Setup Complete!</h2>
        <div class="status success">
            Your ESP32 Zero-Code Platform is properly configured!
        </div>
        
                 <div class="step">
             <h3>Next Steps:</h3>
             <ol>
                 <li>Visit <a href="/auto-setup" class="button">Auto-Setup</a> to create admin user</li>
                 <li>Go to <a href="/login" class="button">Login Page</a> to access dashboard</li>
                 <li>Check <a href="/health" class="button">System Health</a> for detailed status</li>
             </ol>
         </div>
         
         ${dbError && dbError.includes('does not exist') ? `
         <div class="step">
             <h3>🔧 Schema Issue Detected:</h3>
             <p>Your database exists but the schema is outdated. Click below to automatically update it:</p>
             <a href="/migrate-schema" class="button" style="background-color: #ff9800;">
                 Update Database Schema
             </a>
         </div>
         ` : ''}
        `}
        
        <h2>🔧 Diagnostic Tools</h2>
                 <div class="status info">
             <strong>Available Endpoints:</strong>
             <ul>
                 <li><a href="/env-check" target="_blank">/env-check</a> - Detailed environment validation</li>
                 <li><a href="/connection-test" target="_blank">/connection-test</a> - Database connection testing</li>
                 <li><a href="/health" target="_blank">/health</a> - System health monitoring</li>
                 <li><a href="/auto-setup" target="_blank">/auto-setup</a> - Complete automated setup</li>
                 <li><a href="/migrate-schema" target="_blank">/migrate-schema</a> - Update database schema</li>
             </ul>
         </div>
        
        <h2>📋 Environment Details</h2>
        <div class="code">
Environment Variables:
• NETLIFY_DATABASE_URL: ${envVars.NETLIFY_DATABASE_URL ? '✅ Set' : '❌ Missing'}
• JWT_SECRET: ${envVars.JWT_SECRET ? '✅ Set' : '❌ Missing'}  
• JWT_EXPIRE: ${envVars.JWT_EXPIRE ? '✅ Set' : '❌ Missing'}
• NODE_ENV: ${envVars.NODE_ENV}

Database Status: ${dbStatus}
Timestamp: ${new Date().toISOString()}
        </div>
        
        <div class="status info">
            <strong>Need Help?</strong> Check the repository documentation or visit the diagnostic endpoints above for detailed error information.
        </div>
    </div>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: html
    };

  } catch (error) {
    console.error('Status page error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: `
<!DOCTYPE html>
<html>
<head><title>Status Error</title></head>
<body>
    <h1>Status Check Failed</h1>
    <p>Error: ${error.message}</p>
    <p>Please check Netlify Function logs for details.</p>
</body>
</html>`
    };
  }
};