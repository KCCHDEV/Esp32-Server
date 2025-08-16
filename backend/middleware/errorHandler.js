const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'esp32-platform' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Error types for consistent handling
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, type = ErrorTypes.INTERNAL_ERROR, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Database error handler
const handlePrismaError = (error) => {
  logger.error('Prisma error:', { error: error.message, code: error.code });
  
  switch (error.code) {
    case 'P2002':
      return new AppError(
        'A record with this information already exists',
        400,
        ErrorTypes.VALIDATION_ERROR
      );
    case 'P2025':
      return new AppError(
        'Record not found',
        404,
        ErrorTypes.NOT_FOUND_ERROR
      );
    case 'P2003':
      return new AppError(
        'Invalid reference - related record not found',
        400,
        ErrorTypes.VALIDATION_ERROR
      );
    case 'P2014':
      return new AppError(
        'The change you are trying to make would violate the required relation',
        400,
        ErrorTypes.VALIDATION_ERROR
      );
    default:
      return new AppError(
        'Database operation failed',
        500,
        ErrorTypes.DATABASE_ERROR
      );
  }
};

// JWT error handler
const handleJWTError = (error) => {
  logger.error('JWT error:', { error: error.message });
  
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401, ErrorTypes.AUTHENTICATION_ERROR);
  }
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401, ErrorTypes.AUTHENTICATION_ERROR);
  }
  return new AppError('Authentication failed', 401, ErrorTypes.AUTHENTICATION_ERROR);
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  });

  // Handle different error types
  if (err.code && err.code.startsWith('P')) {
    error = handlePrismaError(err);
  } else if (err.name && err.name.includes('JWT')) {
    error = handleJWTError(err);
  } else if (err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON in request body', 400, ErrorTypes.VALIDATION_ERROR);
  } else if (!err.isOperational) {
    // Log unexpected errors more prominently
    logger.error('UNEXPECTED ERROR:', {
      error: err,
      stack: err.stack,
      request: {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body
      }
    });
    
    error = new AppError(
      'Something went wrong',
      500,
      ErrorTypes.INTERNAL_ERROR
    );
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      type: error.type || ErrorTypes.INTERNAL_ERROR,
      message: error.message,
      statusCode: error.statusCode || 500,
    }
  };

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  // Add error ID for tracking
  const errorId = require('crypto').randomBytes(8).toString('hex');
  errorResponse.error.id = errorId;
  
  logger.error(`Error ID: ${errorId}`, { error: error.message });

  // Send error response
  res.status(error.statusCode || 500).json(errorResponse);
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    ErrorTypes.NOT_FOUND_ERROR
  );
  next(error);
};

// Async wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ErrorTypes,
  logger
};