// Simple environment variable checker
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const envVars = {
      // Database
      NETLIFY_DATABASE_URL: {
        exists: !!process.env.NETLIFY_DATABASE_URL,
        hasValue: !!process.env.NETLIFY_DATABASE_URL?.length,
        preview: process.env.NETLIFY_DATABASE_URL ? 
          `${process.env.NETLIFY_DATABASE_URL.substring(0, 20)}...` : 
          null
      },
      DATABASE_URL: {
        exists: !!process.env.DATABASE_URL,
        hasValue: !!process.env.DATABASE_URL?.length,
        preview: process.env.DATABASE_URL ? 
          `${process.env.DATABASE_URL.substring(0, 20)}...` : 
          null
      },
      
      // JWT
      JWT_SECRET: {
        exists: !!process.env.JWT_SECRET,
        hasValue: !!process.env.JWT_SECRET?.length,
        length: process.env.JWT_SECRET?.length || 0
      },
      JWT_EXPIRE: {
        exists: !!process.env.JWT_EXPIRE,
        value: process.env.JWT_EXPIRE || 'not set'
      },
      
      // Environment
      NODE_ENV: {
        value: process.env.NODE_ENV || 'not set'
      },
      NETLIFY: {
        value: process.env.NETLIFY || 'not set'
      },
      
      // CORS
      CORS_ORIGIN: {
        exists: !!process.env.CORS_ORIGIN,
        value: process.env.CORS_ORIGIN || 'not set'
      }
    };

    // Check for critical issues
    const issues = [];
    const warnings = [];

    if (!envVars.NETLIFY_DATABASE_URL.exists && !envVars.DATABASE_URL.exists) {
      issues.push('No database URL found (NETLIFY_DATABASE_URL or DATABASE_URL)');
    }

    if (!envVars.JWT_SECRET.exists) {
      issues.push('JWT_SECRET is missing');
    } else if (envVars.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET is shorter than recommended (32+ characters)');
    }

    if (!envVars.JWT_EXPIRE.exists) {
      warnings.push('JWT_EXPIRE not set (defaulting to 7d)');
    }

    // Database URL validation
    let dbValidation = null;
    const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    
    if (dbUrl) {
      try {
        const url = new URL(dbUrl);
        dbValidation = {
          valid: true,
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || 5432,
          database: url.pathname?.substring(1) || 'unknown',
          hasUsername: !!url.username,
          hasPassword: !!url.password,
          ssl: url.searchParams.get('sslmode') || 'not specified'
        };
      } catch (error) {
        dbValidation = {
          valid: false,
          error: error.message
        };
        issues.push('Database URL format is invalid');
      }
    }

    const status = issues.length === 0 ? 'ready' : 'issues';
    const statusCode = issues.length === 0 ? 200 : 400;

    return createResponse(statusCode, {
      success: issues.length === 0,
      status,
      timestamp: new Date().toISOString(),
      context: {
        functionName: context.functionName,
        region: context.invokedFunctionArn?.split(':')[3] || 'unknown',
        runtime: 'Node.js ' + process.version
      },
      environment: envVars,
      database: dbValidation,
      validation: {
        issues,
        warnings,
        summary: `${issues.length} issues, ${warnings.length} warnings`
      },
      recommendations: issues.length > 0 ? [
        'Set missing environment variables in Netlify dashboard',
        'Go to Site Settings → Environment Variables',
        'Add: NETLIFY_DATABASE_URL, JWT_SECRET',
        'Generate JWT_SECRET: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      ] : [
        'Environment looks good!',
        'Test database connection with /connection-test',
        'Setup database with /setup'
      ]
    });

  } catch (error) {
    console.error('❌ Environment check error:', error);
    
    return createResponse(500, {
      success: false,
      error: 'Environment check failed',
      details: error.message
    });
  }
};