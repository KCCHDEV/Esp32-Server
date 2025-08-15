const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  canvas: {
    blocks: [{
      id: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true,
        enum: [
          'sensor_input', 'digital_input', 'analog_input',
          'digital_output', 'analog_output', 'pwm_output',
          'delay', 'timer', 'condition', 'logic_and', 'logic_or', 'logic_not',
          'math_add', 'math_subtract', 'math_multiply', 'math_divide',
          'comparison_equal', 'comparison_greater', 'comparison_less',
          'wifi_send', 'http_request', 'mqtt_publish', 'mqtt_subscribe',
          'i2c_read', 'i2c_write', 'lcd_display', 'servo_control',
          'variable_set', 'variable_get', 'function_call', 'loop',
          'button', 'switch', 'slider', 'text_input'
        ]
      },
      position: {
        x: Number,
        y: Number
      },
      properties: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      inputs: [{
        id: String,
        type: String,
        value: mongoose.Schema.Types.Mixed,
        connected: Boolean,
        source: String
      }],
      outputs: [{
        id: String,
        type: String,
        value: mongoose.Schema.Types.Mixed,
        connected: Boolean,
        targets: [String]
      }]
    }],
    connections: [{
      id: String,
      sourceBlock: String,
      sourceOutput: String,
      targetBlock: String,
      targetInput: String
    }],
    variables: [{
      name: String,
      type: String,
      value: mongoose.Schema.Types.Mixed,
      scope: {
        type: String,
        enum: ['global', 'local'],
        default: 'local'
      }
    }],
    functions: [{
      name: String,
      parameters: [String],
      blocks: [String],
      returnType: String
    }]
  },
  generatedCode: {
    arduino: String,
    lastGenerated: Date
  },
  deployment: {
    isDeployed: {
      type: Boolean,
      default: false
    },
    deployedAt: Date,
    version: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['pending', 'deployed', 'failed', 'stopped'],
      default: 'pending'
    }
  },
  scheduling: {
    enabled: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['interval', 'cron', 'event'],
      default: 'interval'
    },
    interval: Number, // milliseconds
    cronExpression: String,
    eventTriggers: [String]
  },
  monitoring: {
    enabled: {
      type: Boolean,
      default: true
    },
    logLevel: {
      type: String,
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info'
    },
    alertsEnabled: {
      type: Boolean,
      default: false
    },
    metrics: [{
      name: String,
      value: Number,
      timestamp: Date,
      unit: String
    }]
  },
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'edit'],
        default: 'view'
      }
    }],
    publicUrl: String
  },
  version: {
    type: Number,
    default: 1
  },
  tags: [String],
  category: {
    type: String,
    enum: ['automation', 'monitoring', 'control', 'iot', 'sensor', 'display', 'communication', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

// Index for efficient queries
projectSchema.index({ userId: 1, isActive: 1 });
projectSchema.index({ deviceId: 1 });
projectSchema.index({ 'sharing.isPublic': 1 });
projectSchema.index({ category: 1 });

// Generate Arduino code from canvas
projectSchema.methods.generateArduinoCode = function() {
  // This would contain the logic to convert visual blocks to Arduino C++ code
  // For now, return a placeholder
  const code = `
// Auto-generated code for project: ${this.name}
// Generated at: ${new Date().toISOString()}

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// Project configuration
const char* PROJECT_NAME = "${this.name}";
const int PROJECT_VERSION = ${this.version};

void setup() {
  Serial.begin(115200);
  
  // Initialize pins based on canvas configuration
  ${this.canvas.blocks
    .filter(block => block.type.includes('output'))
    .map(block => `pinMode(${block.properties.pin || 2}, OUTPUT);`)
    .join('\n  ')}
  
  Serial.println("Project ${this.name} initialized");
}

void loop() {
  // Main loop logic generated from canvas
  ${this.generateLoopCode()}
  
  delay(100);
}

${this.generateHelperFunctions()}
`;

  this.generatedCode.arduino = code;
  this.generatedCode.lastGenerated = new Date();
  return code;
};

// Generate loop code from canvas blocks
projectSchema.methods.generateLoopCode = function() {
  // Simplified code generation - in reality this would be much more complex
  return this.canvas.blocks
    .filter(block => block.type === 'digital_output')
    .map(block => `digitalWrite(${block.properties.pin || 2}, ${block.properties.state || 'HIGH'});`)
    .join('\n  ');
};

// Generate helper functions
projectSchema.methods.generateHelperFunctions = function() {
  return `
// Helper functions
void sendStatus() {
  // Send device status
}

void handleCommand(String command) {
  // Handle incoming commands
}
`;
};

// Deploy project to device
projectSchema.methods.deploy = async function() {
  this.deployment.status = 'pending';
  this.deployment.deployedAt = new Date();
  this.deployment.version += 1;
  
  // Generate fresh code
  this.generateArduinoCode();
  
  // In a real implementation, this would compile and upload to device
  // For now, just mark as deployed
  this.deployment.isDeployed = true;
  this.deployment.status = 'deployed';
  
  return this.save();
};

// Stop project on device
projectSchema.methods.stop = async function() {
  this.deployment.isDeployed = false;
  this.deployment.status = 'stopped';
  this.isActive = false;
  
  return this.save();
};

// Add metric data point
projectSchema.methods.addMetric = function(name, value, unit = '') {
  this.monitoring.metrics.push({
    name,
    value,
    timestamp: new Date(),
    unit
  });
  
  // Keep only last 1000 data points
  if (this.monitoring.metrics.length > 1000) {
    this.monitoring.metrics = this.monitoring.metrics.slice(-1000);
  }
  
  return this.save();
};

module.exports = mongoose.model('Project', projectSchema);