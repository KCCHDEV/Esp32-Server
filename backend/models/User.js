const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  deviceLimit: {
    type: Number,
    default: 3 // Free users get 3 devices
  },
  projectLimit: {
    type: Number,
    default: 5 // Free users get 5 projects
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if subscription is active
userSchema.methods.isSubscriptionActive = function() {
  if (this.subscription === 'free') return true;
  return this.subscriptionExpiry && this.subscriptionExpiry > new Date();
};

// Get effective limits based on subscription
userSchema.methods.getEffectiveLimits = function() {
  const isActive = this.isSubscriptionActive();
  
  if (this.subscription === 'premium' && isActive) {
    return {
      devices: 50,
      projects: 100
    };
  }
  
  return {
    devices: this.deviceLimit,
    projects: this.projectLimit
  };
};

module.exports = mongoose.model('User', userSchema);