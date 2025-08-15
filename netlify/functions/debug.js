// Simple debug function to test Netlify Functions
exports.handler = async (event, context) => {
  try {
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        message: 'Netlify Functions are working!',
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          NETLIFY: process.env.NETLIFY,
          hasDatabase: !!process.env.NETLIFY_DATABASE_URL,
          hasJWT: !!process.env.JWT_SECRET,
          hasCORS: !!process.env.CORS_ORIGIN
        },
        request: {
          method: event.httpMethod,
          path: event.path,
          headers: event.headers,
          query: event.queryStringParameters
        },
        context: {
          requestId: context.awsRequestId,
          functionName: context.functionName,
          functionVersion: context.functionVersion
        }
      })
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      response.statusCode = 200;
      response.body = '';
    }

    return response;
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};