const express = require('express');
const { body, validationResult } = require('express-validator');
const Device = require('../models/Device');
const { verifyToken, verifyDeviceAccess, checkLimits } = require('../middleware/auth');

const router = express.Router();

// Get all user devices
router.get('/', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id, isActive: true };
    
    // Add search filter
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (req.query.status) {
      filter.isOnline = req.query.status === 'online';
    }

    const devices = await Device.find(filter)
      .select('-apiKey') // Don't send API key in list
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Device.countDocuments(filter);

    // Get status summary for each device
    const devicesWithStatus = devices.map(device => ({
      ...device.toObject(),
      statusSummary: device.getStatusSummary()
    }));

    res.json({
      devices: devicesWithStatus,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDevices: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single device details
router.get('/:id', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const device = req.device;

    res.json({
      device: {
        ...device.toObject(),
        statusSummary: device.getStatusSummary()
      }
    });

  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new device
router.post('/', verifyToken, checkLimits('device'), [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Device name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { name, description, location, tags } = req.body;

    const device = new Device({
      name,
      description,
      userId: req.user._id,
      location,
      tags: tags || []
    });

    await device.save();

    // Emit device creation event
    req.io.emit('device-created', {
      userId: req.user._id,
      device: device.getStatusSummary()
    });

    res.status(201).json({
      message: 'Device created successfully',
      device: {
        ...device.toObject(),
        statusSummary: device.getStatusSummary()
      }
    });

  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update device
router.put('/:id', verifyToken, verifyDeviceAccess, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Device name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const device = req.device;
    const { name, description, location, tags } = req.body;

    // Update fields if provided
    if (name !== undefined) device.name = name;
    if (description !== undefined) device.description = description;
    if (location !== undefined) device.location = location;
    if (tags !== undefined) device.tags = tags;

    await device.save();

    // Emit device update event
    req.io.emit('device-updated', {
      userId: req.user._id,
      device: device.getStatusSummary()
    });

    res.json({
      message: 'Device updated successfully',
      device: {
        ...device.toObject(),
        statusSummary: device.getStatusSummary()
      }
    });

  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete device (soft delete)
router.delete('/:id', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const device = req.device;

    device.isActive = false;
    await device.save();

    // Emit device deletion event
    req.io.emit('device-deleted', {
      userId: req.user._id,
      deviceId: device._id
    });

    res.json({ message: 'Device deleted successfully' });

  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Regenerate API key
router.post('/:id/regenerate-key', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const device = req.device;
    const { v4: uuidv4 } = require('uuid');

    // Generate new API key
    device.apiKey = `esp32_${uuidv4().replace(/-/g, '')}`;
    await device.save();

    res.json({
      message: 'API key regenerated successfully',
      apiKey: device.apiKey
    });

  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Configure device pins
router.put('/:id/pins', verifyToken, verifyDeviceAccess, [
  body('pins')
    .isArray()
    .withMessage('Pins must be an array'),
  body('pins.*.number')
    .isInt({ min: 0, max: 50 })
    .withMessage('Pin number must be between 0 and 50'),
  body('pins.*.mode')
    .isIn(['input', 'output', 'input_pullup', 'input_pulldown', 'analog_input', 'pwm_output', 'i2c_sda', 'i2c_scl'])
    .withMessage('Invalid pin mode')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const device = req.device;
    const { pins } = req.body;

    // Update pins configuration
    device.pins = pins.map(pin => ({
      number: pin.number,
      mode: pin.mode,
      label: pin.label || `Pin ${pin.number}`,
      value: pin.value || 0,
      isUsed: pin.isUsed || false
    }));

    await device.save();

    // Emit pin configuration update
    req.io.to(`device-${device._id}`).emit('pins-updated', {
      deviceId: device._id,
      pins: device.pins
    });

    res.json({
      message: 'Pin configuration updated successfully',
      pins: device.pins
    });

  } catch (error) {
    console.error('Update pins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get device statistics
router.get('/:id/stats', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const device = req.device;
    const timeRange = req.query.range || '24h'; // 1h, 24h, 7d, 30d

    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // In a real implementation, you would fetch historical data from a time-series database
    // For now, return current status
    const stats = {
      timeRange,
      uptime: device.statistics?.totalUptime || 0,
      restartCount: device.statistics?.restartCount || 0,
      lastRestart: device.statistics?.lastRestart,
      memoryUsage: {
        free: device.hardware?.freeHeap || 0,
        used: device.hardware?.usedHeap || 0,
        total: (device.hardware?.freeHeap || 0) + (device.hardware?.usedHeap || 0)
      },
      connectivity: {
        wifiSignal: device.wifiConfig?.signalStrength || 0,
        isConnected: device.wifiConfig?.connected || false,
        lastSeen: device.lastSeen
      },
      sensors: device.sensors.map(sensor => ({
        name: sensor.name,
        type: sensor.type,
        value: sensor.value,
        unit: sensor.unit,
        lastRead: sensor.lastRead
      }))
    };

    res.json({ stats });

  } catch (error) {
    console.error('Get device stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Scan for I2C devices
router.post('/:id/scan-i2c', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const device = req.device;

    // Emit I2C scan request to device
    req.io.to(`device-${device._id}`).emit('scan-i2c-request', {
      deviceId: device._id
    });

    res.json({ 
      message: 'I2C scan initiated. Results will be updated in real-time.',
      scanning: true
    });

  } catch (error) {
    console.error('I2C scan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reboot device
router.post('/:id/reboot', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const device = req.device;

    // Emit reboot command to device
    req.io.to(`device-${device._id}`).emit('reboot-command', {
      deviceId: device._id
    });

    // Update statistics
    device.statistics.restartCount += 1;
    device.statistics.lastRestart = new Date();
    await device.save();

    res.json({ 
      message: 'Reboot command sent to device.',
      restartCount: device.statistics.restartCount
    });

  } catch (error) {
    console.error('Reboot device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;