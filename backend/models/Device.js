const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    unique: true,
    default: uuidv4
  },
  apiKey: {
    type: String,
    unique: true,
    default: () => `esp32_${uuidv4().replace(/-/g, '')}`
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  firmwareVersion: {
    type: String,
    default: '1.0.0'
  },
  wifiConfig: {
    ssid: String,
    connected: {
      type: Boolean,
      default: false
    },
    signalStrength: Number,
    ipAddress: String
  },
  hardware: {
    chipModel: String,
    flashSize: String,
    cpuFreq: Number,
    freeHeap: Number,
    usedHeap: Number
  },
  pins: [{
    number: {
      type: Number,
      required: true
    },
    mode: {
      type: String,
      enum: ['input', 'output', 'input_pullup', 'input_pulldown', 'analog_input', 'pwm_output', 'i2c_sda', 'i2c_scl'],
      default: 'input'
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: 0
    },
    label: String,
    isUsed: {
      type: Boolean,
      default: false
    }
  }],
  i2cDevices: [{
    address: {
      type: String,
      required: true
    },
    name: String,
    type: String,
    isConnected: {
      type: Boolean,
      default: false
    },
    lastRead: Date,
    data: mongoose.Schema.Types.Mixed
  }],
  sensors: [{
    type: {
      type: String,
      required: true
    },
    pin: Number,
    name: String,
    value: mongoose.Schema.Types.Mixed,
    unit: String,
    lastRead: Date,
    config: mongoose.Schema.Types.Mixed
  }],
  actuators: [{
    type: {
      type: String,
      required: true
    },
    pin: Number,
    name: String,
    state: mongoose.Schema.Types.Mixed,
    config: mongoose.Schema.Types.Mixed
  }],
  location: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  statistics: {
    totalUptime: {
      type: Number,
      default: 0
    },
    restartCount: {
      type: Number,
      default: 0
    },
    lastRestart: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
deviceSchema.index({ userId: 1, isActive: 1 });
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ apiKey: 1 });
deviceSchema.index({ isOnline: 1 });

// Update last seen when device comes online
deviceSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.isOnline = true;
  return this.save();
};

// Set device offline
deviceSchema.methods.setOffline = function() {
  this.isOnline = false;
  return this.save();
};

// Add or update pin configuration
deviceSchema.methods.updatePin = function(pinNumber, config) {
  const existingPin = this.pins.find(p => p.number === pinNumber);
  
  if (existingPin) {
    Object.assign(existingPin, config);
  } else {
    this.pins.push({ number: pinNumber, ...config });
  }
  
  return this.save();
};

// Add or update I2C device
deviceSchema.methods.updateI2CDevice = function(address, deviceInfo) {
  const existingDevice = this.i2cDevices.find(d => d.address === address);
  
  if (existingDevice) {
    Object.assign(existingDevice, deviceInfo);
  } else {
    this.i2cDevices.push({ address, ...deviceInfo });
  }
  
  return this.save();
};

// Get device status summary
deviceSchema.methods.getStatusSummary = function() {
  return {
    deviceId: this.deviceId,
    name: this.name,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    wifiConnected: this.wifiConfig?.connected || false,
    signalStrength: this.wifiConfig?.signalStrength,
    activePins: this.pins.filter(p => p.isUsed).length,
    i2cDevices: this.i2cDevices.length,
    sensors: this.sensors.length,
    actuators: this.actuators.length,
    freeHeap: this.hardware?.freeHeap,
    uptime: this.statistics?.totalUptime || 0
  };
};

module.exports = mongoose.model('Device', deviceSchema);