const express = require('express');
const { body, validationResult } = require('express-validator');
const Device = require('../models/Device');
const Project = require('../models/Project');
const { verifyDeviceApiKey } = require('../middleware/auth');

const router = express.Router();

// Device heartbeat and status update
router.post('/heartbeat', verifyDeviceApiKey, [
  body('uptime').optional().isNumeric(),
  body('freeHeap').optional().isNumeric(),
  body('usedHeap').optional().isNumeric(),
  body('wifiSignal').optional().isNumeric(),
  body('wifiConnected').optional().isBoolean()
], async (req, res) => {
  try {
    const device = req.device;
    const { 
      uptime, 
      freeHeap, 
      usedHeap, 
      wifiSignal, 
      wifiConnected, 
      chipModel, 
      flashSize, 
      cpuFreq,
      firmwareVersion 
    } = req.body;

    // Update device status
    device.isOnline = true;
    device.lastSeen = new Date();

    // Update hardware info
    if (freeHeap !== undefined) device.hardware.freeHeap = freeHeap;
    if (usedHeap !== undefined) device.hardware.usedHeap = usedHeap;
    if (chipModel) device.hardware.chipModel = chipModel;
    if (flashSize) device.hardware.flashSize = flashSize;
    if (cpuFreq) device.hardware.cpuFreq = cpuFreq;

    // Update WiFi info
    if (wifiSignal !== undefined) device.wifiConfig.signalStrength = wifiSignal;
    if (wifiConnected !== undefined) device.wifiConfig.connected = wifiConnected;

    // Update firmware version
    if (firmwareVersion) device.firmwareVersion = firmwareVersion;

    // Update uptime statistics
    if (uptime !== undefined) device.statistics.totalUptime = uptime;

    await device.save();

    // Emit real-time status update
    req.io.to(`device-${device._id}`).emit('device-status', {
      deviceId: device._id,
      status: device.getStatusSummary(),
      timestamp: new Date()
    });

    res.json({ 
      status: 'ok', 
      timestamp: new Date(),
      commands: [] // Future: return pending commands
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update pin values
router.post('/pins', verifyDeviceApiKey, [
  body('pins').isArray().withMessage('Pins must be an array'),
  body('pins.*.number').isInt({ min: 0, max: 50 }),
  body('pins.*.value').exists()
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
    const { pins } = req.body;

    // Update pin values
    pins.forEach(pinUpdate => {
      const existingPin = device.pins.find(p => p.number === pinUpdate.number);
      if (existingPin) {
        existingPin.value = pinUpdate.value;
      }
    });

    await device.save();

    // Emit real-time pin updates
    req.io.to(`device-${device._id}`).emit('pins-data', {
      deviceId: device._id,
      pins: pins,
      timestamp: new Date()
    });

    res.json({ status: 'ok', updated: pins.length });

  } catch (error) {
    console.error('Pin update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update sensor readings
router.post('/sensors', verifyDeviceApiKey, [
  body('sensors').isArray().withMessage('Sensors must be an array'),
  body('sensors.*.type').notEmpty(),
  body('sensors.*.value').exists()
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
    const { sensors } = req.body;

    // Update sensor readings
    sensors.forEach(sensorData => {
      const existingSensor = device.sensors.find(s => 
        s.type === sensorData.type && s.pin === sensorData.pin
      );
      
      if (existingSensor) {
        existingSensor.value = sensorData.value;
        existingSensor.lastRead = new Date();
      } else {
        device.sensors.push({
          type: sensorData.type,
          pin: sensorData.pin,
          name: sensorData.name || sensorData.type,
          value: sensorData.value,
          unit: sensorData.unit,
          lastRead: new Date()
        });
      }
    });

    await device.save();

    // Emit real-time sensor data
    req.io.to(`device-${device._id}`).emit('sensor-data', {
      deviceId: device._id,
      sensors: sensors,
      timestamp: new Date()
    });

    res.json({ status: 'ok', updated: sensors.length });

  } catch (error) {
    console.error('Sensor update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Report I2C scan results
router.post('/i2c-scan', verifyDeviceApiKey, [
  body('devices').isArray().withMessage('Devices must be an array'),
  body('devices.*.address').notEmpty()
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
    const { devices } = req.body;

    // Update I2C devices
    device.i2cDevices = devices.map(i2cDevice => ({
      address: i2cDevice.address,
      name: i2cDevice.name || `Device@${i2cDevice.address}`,
      type: i2cDevice.type || 'Unknown',
      isConnected: true,
      lastRead: new Date(),
      data: i2cDevice.data || {}
    }));

    await device.save();

    // Emit I2C scan results
    req.io.to(`device-${device._id}`).emit('i2c-scan-results', {
      deviceId: device._id,
      devices: device.i2cDevices,
      timestamp: new Date()
    });

    res.json({ 
      status: 'ok', 
      message: 'I2C scan results updated',
      deviceCount: devices.length 
    });

  } catch (error) {
    console.error('I2C scan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get device configuration
router.get('/config', verifyDeviceApiKey, async (req, res) => {
  try {
    const device = req.device;

    // Get active project for the device
    const activeProject = await Project.findOne({
      deviceId: device._id,
      isActive: true,
      'deployment.isDeployed': true
    });

    const config = {
      deviceId: device.deviceId,
      name: device.name,
      pins: device.pins,
      activeProject: activeProject ? {
        id: activeProject._id,
        name: activeProject.name,
        version: activeProject.deployment.version,
        canvas: activeProject.canvas
      } : null,
      settings: {
        reportInterval: 30000, // 30 seconds
        enableDeepSleep: false,
        wifiTimeout: 30000
      }
    };

    res.json(config);

  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Report WiFi networks scan
router.post('/wifi-scan', verifyDeviceApiKey, [
  body('networks').isArray().withMessage('Networks must be an array')
], async (req, res) => {
  try {
    const device = req.device;
    const { networks } = req.body;

    // Emit WiFi scan results to frontend
    req.io.to(`device-${device._id}`).emit('wifi-scan-results', {
      deviceId: device._id,
      networks: networks,
      timestamp: new Date()
    });

    res.json({ 
      status: 'ok', 
      message: 'WiFi scan results received',
      networkCount: networks.length 
    });

  } catch (error) {
    console.error('WiFi scan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update WiFi connection status
router.post('/wifi-status', verifyDeviceApiKey, [
  body('connected').isBoolean(),
  body('ssid').optional().isString(),
  body('ip').optional().isString(),
  body('signal').optional().isNumeric()
], async (req, res) => {
  try {
    const device = req.device;
    const { connected, ssid, ip, signal } = req.body;

    // Update WiFi configuration
    device.wifiConfig.connected = connected;
    if (ssid) device.wifiConfig.ssid = ssid;
    if (ip) device.wifiConfig.ipAddress = ip;
    if (signal !== undefined) device.wifiConfig.signalStrength = signal;

    await device.save();

    // Emit WiFi status update
    req.io.to(`device-${device._id}`).emit('wifi-status', {
      deviceId: device._id,
      wifiConfig: device.wifiConfig,
      timestamp: new Date()
    });

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('WiFi status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Log messages from device
router.post('/logs', verifyDeviceApiKey, [
  body('level').isIn(['debug', 'info', 'warn', 'error']),
  body('message').notEmpty(),
  body('component').optional().isString()
], async (req, res) => {
  try {
    const device = req.device;
    const { level, message, component } = req.body;

    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      component: component || 'system',
      deviceId: device._id
    };

    // Emit log to frontend
    req.io.to(`device-${device._id}`).emit('device-log', logEntry);

    // In production, you would store logs in a separate collection or logging system
    console.log(`[${device.name}] ${level.toUpperCase()}: ${message}`);

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending commands for device
router.get('/commands', verifyDeviceApiKey, async (req, res) => {
  try {
    const device = req.device;

    // In a real implementation, you would fetch pending commands from a queue
    // For now, return empty array
    const commands = [];

    res.json({ commands });

  } catch (error) {
    console.error('Get commands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Firmware update endpoint
router.post('/firmware-info', verifyDeviceApiKey, [
  body('version').notEmpty(),
  body('buildDate').optional().isString(),
  body('features').optional().isArray()
], async (req, res) => {
  try {
    const device = req.device;
    const { version, buildDate, features } = req.body;

    device.firmwareVersion = version;
    await device.save();

    // Check if there's a newer firmware version available
    const latestVersion = '1.0.0'; // In production, fetch from a firmware repository
    const updateAvailable = version !== latestVersion;

    res.json({ 
      status: 'ok',
      currentVersion: version,
      latestVersion,
      updateAvailable,
      updateUrl: updateAvailable ? `/api/firmware/download/${latestVersion}` : null
    });

  } catch (error) {
    console.error('Firmware info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Error reporting
router.post('/error', verifyDeviceApiKey, [
  body('error').notEmpty(),
  body('stackTrace').optional(),
  body('component').optional()
], async (req, res) => {
  try {
    const device = req.device;
    const { error, stackTrace, component } = req.body;

    const errorReport = {
      timestamp: new Date(),
      error,
      stackTrace,
      component: component || 'unknown',
      deviceId: device._id,
      deviceName: device.name
    };

    // Emit error to frontend
    req.io.to(`device-${device._id}`).emit('device-error', errorReport);

    // Log error
    console.error(`[${device.name}] ERROR in ${component}: ${error}`);
    if (stackTrace) {
      console.error(`Stack trace: ${stackTrace}`);
    }

    res.json({ status: 'ok', message: 'Error report received' });

  } catch (error) {
    console.error('Error report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;