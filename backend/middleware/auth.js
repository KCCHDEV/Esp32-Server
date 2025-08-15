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
    const user = await User.findById(decoded.userId).select('-password');
    
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
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

// Premium subscription verification middleware
const verifyPremium = (req, res, next) => {
  if (req.user && req.user.isSubscriptionActive() && req.user.subscription === 'premium') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Premium subscription required.',
      subscription: req.user?.subscription,
      isActive: req.user?.isSubscriptionActive()
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

    const Device = require('../models/Device');
    const device = await Device.findOne({ apiKey, isActive: true })
      .populate('userId', 'username email subscription');
    
    if (!device) {
      return res.status(401).json({ message: 'Invalid API key.' });
    }

    // Update device last seen
    device.updateLastSeen();

    req.device = device;
    req.user = device.userId;
    next();
  } catch (error) {
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

    const Device = require('../models/Device');
    const device = await Device.findById(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    // Check if user owns the device or is admin
    if (device.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied to this device.' });
    }

    req.device = device;
    next();
  } catch (error) {
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

    const Project = require('../models/Project');
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Check if user owns the project, has shared access, or is admin
    const hasAccess = 
      project.userId.toString() === req.user._id.toString() ||
      req.user.role === 'admin' ||
      project.sharing.sharedWith.some(share => 
        share.userId.toString() === req.user._id.toString()
      );

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this project.' });
    }

    req.project = project;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error verifying project access.' });
  }
};

// Check device and project limits based on subscription
const checkLimits = (type) => {
  return async (req, res, next) => {
    try {
      const limits = req.user.getEffectiveLimits();
      
      if (type === 'device') {
        const Device = require('../models/Device');
        const deviceCount = await Device.countDocuments({ 
          userId: req.user._id, 
          isActive: true 
        });
        
        if (deviceCount >= limits.devices) {
          return res.status(403).json({ 
            message: 'Device limit reached. Upgrade to premium for more devices.',
            current: deviceCount,
            limit: limits.devices,
            subscription: req.user.subscription
          });
        }
      } else if (type === 'project') {
        const Project = require('../models/Project');
        const projectCount = await Project.countDocuments({ 
          userId: req.user._id
        });
        
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