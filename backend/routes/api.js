const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbHelpers } = require('../lib/prisma');
const { verifyDeviceApiKey } = require('../middleware/auth');

const router = express.Router();

// Device heartbeat and status update (รองรับหลายอุปกรณ์)
router.post('/heartbeat', verifyDeviceApiKey, [
  body('uptime').optional().isNumeric(),
  body('freeHeap').optional().isNumeric(),
  body('usedHeap').optional().isNumeric(),
  body('wifiSignal').optional().isNumeric(),
  body('firmwareVersion').optional().isString(),
  body('wifiConnected').optional().isBoolean(),
  body('chipModel').optional().isString(),
  body('flashSize').optional().isString(),
  body('cpuFreq').optional().isNumeric(),
  body('platform').optional().isString()  // ESP32 | RASPBERRY_PI | OTHER
], async (req, res) => {
  try {
    const device = req.device;
    const {
      uptime,
      freeHeap,
      usedHeap,
      wifiSignal,
      firmwareVersion,
      wifiConnected,
      chipModel,
      flashSize,
      cpuFreq,
      platform
    } = req.body;

    const updateData = {
      lastSeen: new Date(),
      isOnline: true
    };

    const platformMap = { raspberry_pi: 'RASPBERRY_PI', raspi: 'RASPBERRY_PI', rpi: 'RASPBERRY_PI', esp32: 'ESP32' };
    if (platform) {
      const normalized = (platformMap[String(platform).toLowerCase()] || String(platform).toUpperCase());
      if (['ESP32', 'RASPBERRY_PI', 'OTHER'].includes(normalized)) updateData.platform = normalized;
    }
    if (firmwareVersion) updateData.firmwareVersion = firmwareVersion;
    if (uptime !== undefined) updateData.uptime = Math.round(Number(uptime));
    if (freeHeap !== undefined) {
      updateData.freeHeap = freeHeap;
      updateData.memoryUsage = freeHeap;
    }
    if (usedHeap !== undefined) updateData.usedHeap = usedHeap;
    if (wifiSignal !== undefined) updateData.wifiSignalStrength = wifiSignal;
    if (wifiConnected !== undefined) updateData.wifiConnected = wifiConnected;
    if (chipModel) updateData.chipModel = chipModel;
    if (flashSize) updateData.flashSize = flashSize;
    if (cpuFreq !== undefined) updateData.cpuFreq = cpuFreq;

    await dbHelpers.device.update(device.id, updateData);

    res.json({ 
      message: 'Heartbeat received', 
      timestamp: new Date(),
      status: 'online'
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get device configuration (รวม pins ให้ firmware ใช้)
router.get('/config', verifyDeviceApiKey, async (req, res) => {
  try {
    const device = req.device;
    const { prisma } = require('../lib/prisma');
    const full = await prisma.device.findUnique({
      where: { id: device.id },
      include: { pins: true, sensors: true }
    });
    const pins = (full?.pins || []).map(p => ({
      number: p.number,
      mode: p.mode,
      value: p.value,
      isUsed: p.isUsed,
      label: p.label || ''
    }));

    res.json({
      message: 'Device configuration',
      config: {
        deviceId: device.deviceId,
        name: device.name,
        platform: device.platform || 'ESP32',
        firmwareVersion: device.firmwareVersion,
        updateInterval: 30000,
        sensors: full?.sensors || device.sensors || [],
        settings: {
          wifiReconnectDelay: 5000,
          maxRetries: 3
        }
      },
      pins
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send sensor data
router.post('/sensor-data', verifyDeviceApiKey, [
  body('sensorId').notEmpty().withMessage('Sensor ID is required'),
  body('value').isNumeric().withMessage('Value must be numeric'),
  body('unit').optional().isString(),
  body('timestamp').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const device = req.device;
    const { sensorId, value, unit, timestamp } = req.body;

    // In a real implementation, you would save sensor data
    // For now, just acknowledge receipt
    console.log(`Sensor data from ${device.name}: ${sensorId} = ${value} ${unit || ''}`);

    res.json({ 
      message: 'Sensor data received',
      sensorId,
      value,
      timestamp: timestamp || new Date()
    });

  } catch (error) {
    console.error('Sensor data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get device commands (for remote control)
router.get('/commands', verifyDeviceApiKey, async (req, res) => {
  try {
    const device = req.device;

    // In a real implementation, you would fetch pending commands from database
    // For now, return empty commands
    res.json({
      message: 'Device commands',
      commands: [],
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get commands error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update device status
router.post('/status', verifyDeviceApiKey, [
  body('status').isIn(['online', 'offline', 'error']).withMessage('Invalid status'),
  body('message').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const device = req.device;
    const { status, message } = req.body;

    const updateData = {
      isOnline: status === 'online',
      lastSeen: new Date()
    };

    if (message) updateData.statusMessage = message;

    await dbHelpers.device.update(device.id, updateData);

    res.json({ 
      message: 'Status updated',
      status,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Device log endpoint
router.post('/logs', verifyDeviceApiKey, [
  body('level').isIn(['debug', 'info', 'warn', 'error']).withMessage('Invalid log level'),
  body('message').notEmpty().withMessage('Log message is required'),
  body('timestamp').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const device = req.device;
    const { level, message, timestamp } = req.body;

    // Log to console for now (in production, save to database)
    console.log(`[${device.name}] ${level.toUpperCase()}: ${message}`);

    res.json({ 
      message: 'Log received',
      timestamp: timestamp || new Date()
    });

  } catch (error) {
    console.error('Log error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get device time (for synchronization)
router.get('/time', verifyDeviceApiKey, (req, res) => {
  try {
    const now = new Date();
    res.json({
      message: 'Current server time',
      timestamp: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      timezone: 'UTC'
    });

  } catch (error) {
    console.error('Get time error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Firmware update check
router.get('/firmware/check', verifyDeviceApiKey, async (req, res) => {
  try {
    const device = req.device;
    const currentVersion = device.firmwareVersion || '1.0.0';

    // In a real implementation, check for firmware updates
    res.json({
      message: 'Firmware update check',
      currentVersion,
      latestVersion: '1.0.0',
      updateAvailable: false,
      updateUrl: null
    });

  } catch (error) {
    console.error('Firmware check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;