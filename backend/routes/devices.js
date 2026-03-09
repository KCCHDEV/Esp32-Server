const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbHelpers } = require('../lib/prisma');
const { verifyToken, verifyDeviceAccess, checkLimits, invalidateDeviceCache } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all user devices (รองรับจำนวนมาก: pagination ใช้ limit, offset)
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const { items, total } = await dbHelpers.device.findByUserIdPaginated(req.user.id, { limit, offset });

    res.json({
      message: 'Devices retrieved successfully',
      devices: items.map(device => ({
        id: device.id,
        name: device.name,
        description: device.description,
        deviceId: device.deviceId,
        platform: device.platform || 'ESP32',
        isOnline: device.isOnline,
        lastSeen: device.lastSeen,
        firmwareVersion: device.firmwareVersion,
        createdAt: device.createdAt,
        sensors: device.sensors
      })),
      pagination: { limit, offset, total }
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new device
router.post('/', [
  verifyToken,
  checkLimits('device'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Device name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('platform').optional().isIn(['ESP32', 'RASPBERRY_PI', 'OTHER'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { name, description, platform } = req.body;

    const deviceId = uuidv4();
    const apiKey = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const device = await dbHelpers.device.create({
      name,
      description,
      userId: req.user.id,
      deviceId,
      apiKey,
      platform: platform || 'ESP32',
      isOnline: false,
      firmwareVersion: '1.0.0'
    });

    res.status(201).json({
      message: 'Device created successfully',
      device: {
        id: device.id,
        name: device.name,
        description: device.description,
        deviceId: device.deviceId,
        apiKey: device.apiKey,
        platform: device.platform,
        isOnline: device.isOnline,
        createdAt: device.createdAt
      }
    });

  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific device
router.get('/:id', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const device = req.device; // from verifyDeviceAccess middleware

    res.json({
      message: 'Device retrieved successfully',
      device: {
        id: device.id,
        name: device.name,
        description: device.description,
        deviceId: device.deviceId,
        apiKey: device.apiKey,
        platform: device.platform || 'ESP32',
        isOnline: device.isOnline,
        lastSeen: device.lastSeen,
        firmwareVersion: device.firmwareVersion,
        hardwareVersion: device.hardwareVersion,
        ipAddress: device.ipAddress,
        location: device.location,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
        sensors: device.sensors
      }
    });

  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update device
router.put('/:id', [
  verifyToken,
  verifyDeviceAccess,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Device name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { name, description, location } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (location) updateData.location = location;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const updatedDevice = await dbHelpers.device.update(req.params.id, updateData);

    res.json({
      message: 'Device updated successfully',
      device: {
        id: updatedDevice.id,
        name: updatedDevice.name,
        description: updatedDevice.description,
        location: updatedDevice.location,
        updatedAt: updatedDevice.updatedAt
      }
    });

  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete device
router.delete('/:id', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    await dbHelpers.device.delete(req.params.id);

    res.json({ message: 'Device deleted successfully' });

  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get device status
router.get('/:id/status', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const device = req.device;

    res.json({
      message: 'Device status retrieved successfully',
      status: {
        id: device.id,
        name: device.name,
        isOnline: device.isOnline,
        lastSeen: device.lastSeen,
        firmwareVersion: device.firmwareVersion,
        ipAddress: device.ipAddress,
        uptime: device.uptime,
        memoryUsage: device.memoryUsage,
        cpuUsage: device.cpuUsage
      }
    });

  } catch (error) {
    console.error('Get device status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Regenerate device API key
router.post('/:id/regenerate-key', verifyToken, verifyDeviceAccess, async (req, res) => {
  try {
    const oldApiKey = req.device.apiKey;
    const newApiKey = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    invalidateDeviceCache(oldApiKey);

    const updatedDevice = await dbHelpers.device.update(req.params.id, { 
      apiKey: newApiKey 
    });

    res.json({
      message: 'API key regenerated successfully',
      apiKey: updatedDevice.apiKey
    });

  } catch (error) {
    console.error('Regenerate API key error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;