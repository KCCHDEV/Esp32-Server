const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
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
  if (req.user && User.isSubscriptionActive(req.user) && req.user.subscription === 'PREMIUM') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Premium subscription required.',
      subscription: req.user?.subscription,
      isActive: req.user ? User.isSubscriptionActive(req.user) : false
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

    const { prisma } = require('../lib/database');
    const device = await prisma.device.findUnique({
      where: { apiKey },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            subscription: true,
            role: true
          }
        }
      }
    });
    
    if (!device || !device.isActive) {
      return res.status(401).json({ message: 'Invalid API key.' });
    }

    // Update device last seen
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        isOnline: true
      }
    });

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

    const { prisma } = require('../lib/database');
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        user: true
      }
    });
    
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

    const { prisma } = require('../lib/database');
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: true,
        sharedWith: {
          include: {
            user: true
          }
        }
      }
    });
    
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
      const limits = User.getEffectiveLimits(req.user);
      
      if (type === 'device') {
        const deviceCount = await User.countDevices(req.user.id);
        
        if (deviceCount >= limits.devices) {
          return res.status(403).json({ 
            message: 'Device limit reached. Upgrade to premium for more devices.',
            current: deviceCount,
            limit: limits.devices,
            subscription: req.user.subscription
          });
        }
      } else if (type === 'project') {
        const projectCount = await User.countProjects(req.user.id);
        
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