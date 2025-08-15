const jwt = require('jsonwebtoken');
const { dbHelpers } = require('../lib/prisma');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await dbHelpers.user.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Admin role verification middleware
const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

// Premium subscription verification middleware
const verifyPremium = (req, res, next) => {
  const isActive = req.user ? dbHelpers.user.isSubscriptionActive(req.user) : false;
  if (req.user && isActive && (req.user.subscription === 'PREMIUM' || req.user.subscription === 'PRO')) {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Premium subscription required.',
      subscription: req.user?.subscription,
      isActive
    });
  }
};

// Device API key verification (for ESP32 devices)
const verifyDeviceApiKey = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key') || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({ message: 'API key required.' });
    }

    const device = await dbHelpers.device.findByApiKey(apiKey);
    
    if (!device || !device.isActive) {
      return res.status(401).json({ message: 'Invalid API key.' });
    }

    // Update device last seen
    await dbHelpers.device.updateLastSeen(device.id);

    req.device = device;
    req.user = device.user;
    next();
  } catch (error) {
    console.error('Device API key verification error:', error);
    return res.status(401).json({ message: 'Invalid API key.' });
  }
};

// Check device ownership or admin access
const verifyDeviceAccess = async (req, res, next) => {
  try {
    const deviceId = req.params.deviceId || req.params.id;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID required.' });
    }

    const device = await dbHelpers.device.findById(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    // Check if user owns the device or is admin
    if (device.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied to this device.' });
    }

    req.device = device;
    next();
  } catch (error) {
    console.error('Device access verification error:', error);
    return res.status(500).json({ message: 'Error verifying device access.' });
  }
};

// Check project ownership or admin access
const verifyProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID required.' });
    }

    const project = await dbHelpers.project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Check if user owns the project, has shared access, or is admin
    const hasAccess = 
      project.userId === req.user.id ||
      req.user.role === 'ADMIN' ||
      project.sharedWith.some(share => 
        share.userId === req.user.id
      );

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this project.' });
    }

    req.project = project;
    next();
  } catch (error) {
    console.error('Project access verification error:', error);
    return res.status(500).json({ message: 'Error verifying project access.' });
  }
};

// Check device and project limits based on subscription
const checkLimits = (type) => {
  return async (req, res, next) => {
    try {
      const { prisma } = require('../lib/prisma');
      const limits = dbHelpers.user.getEffectiveLimits(req.user);
      
      if (type === 'device') {
        const deviceCount = await prisma.device.count({ where: { userId: req.user.id } });
        
        if (deviceCount >= limits.devices) {
          return res.status(403).json({ 
            message: 'Device limit reached. Upgrade to premium for more devices.',
            current: deviceCount,
            limit: limits.devices,
            subscription: req.user.subscription
          });
        }
      } else if (type === 'project') {
        const projectCount = await prisma.project.count({ where: { userId: req.user.id } });
        
        if (projectCount >= limits.projects) {
          return res.status(403).json({ 
            message: 'Project limit reached. Upgrade to premium for more projects.',
            current: projectCount,
            limit: limits.projects,
            subscription: req.user.subscription
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('Limits check error:', error);
      return res.status(500).json({ message: 'Error checking limits.' });
    }
  };
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyPremium,
  verifyDeviceApiKey,
  verifyDeviceAccess,
  verifyProjectAccess,
  checkLimits
};