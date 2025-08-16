const { logger } = require('./errorHandler');
const { prisma } = require('../lib/prisma');

// API usage tracking middleware
const trackApiUsage = async (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log API usage asynchronously (don't block response)
    setImmediate(async () => {
      try {
        await prisma.apiUsage.create({
          data: {
            userId: req.user?.id || null,
            endpoint: req.route?.path || req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || null
          }
        });
      } catch (error) {
        logger.error('Failed to log API usage:', error);
      }
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Audit logging for sensitive actions
const auditLogger = (action, resource = null) => {
  return async (req, res, next) => {
    // Override res.json to capture success/failure
    const originalJson = res.json;
    res.json = function(data) {
      const success = res.statusCode < 400;
      
      // Log audit trail asynchronously
      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.id || null,
              action,
              resource: resource || req.params.id || null,
              details: {
                method: req.method,
                endpoint: req.originalUrl,
                body: req.method !== 'GET' ? req.body : undefined,
                params: req.params,
                query: req.query
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent') || null,
              success,
              errorMessage: success ? null : data?.error?.message || 'Unknown error'
            }
          });
        } catch (error) {
          logger.error('Failed to log audit trail:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Security event logging
const logSecurityEvent = async (userId, event, details = {}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: `SECURITY_${event}`,
        details,
        ipAddress: details.ipAddress || null,
        userAgent: details.userAgent || null,
        success: details.success !== false
      }
    });
    
    logger.warn('Security event logged:', {
      userId,
      event,
      details
    });
  } catch (error) {
    logger.error('Failed to log security event:', error);
  }
};

// Health check endpoint with detailed system status
const healthCheck = async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {}
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // Check disk space if in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      health.services.filesystem = {
        status: 'healthy',
        available: true
      };
    } catch (error) {
      health.services.filesystem = {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  health.responseTime = Date.now() - startTime;

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
};

// Metrics endpoint for monitoring dashboards
const getMetrics = async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get various metrics
    const [
      totalUsers,
      activeUsersToday,
      totalDevices,
      onlineDevices,
      totalProjects,
      apiCallsLastHour,
      errorRate
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLogin: { gte: oneDayAgo }
        }
      }),
      prisma.device.count(),
      prisma.device.count({
        where: { isOnline: true }
      }),
      prisma.project.count(),
      prisma.apiUsage.count({
        where: {
          createdAt: { gte: oneHourAgo }
        }
      }),
      prisma.apiUsage.count({
        where: {
          createdAt: { gte: oneHourAgo },
          statusCode: { gte: 400 }
        }
      })
    ]);

    const metrics = {
      timestamp: now.toISOString(),
      users: {
        total: totalUsers,
        activeToday: activeUsersToday
      },
      devices: {
        total: totalDevices,
        online: onlineDevices,
        onlinePercentage: totalDevices > 0 ? (onlineDevices / totalDevices * 100).toFixed(2) : 0
      },
      projects: {
        total: totalProjects
      },
      api: {
        callsLastHour: apiCallsLastHour,
        errorRate: apiCallsLastHour > 0 ? (errorRate / apiCallsLastHour * 100).toFixed(2) : 0
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  trackApiUsage,
  auditLogger,
  logSecurityEvent,
  healthCheck,
  getMetrics
};