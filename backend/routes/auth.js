const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbHelpers } = require('../lib/prisma');
const { verifyToken } = require('../middleware/auth');
const { manualDatabaseSetup } = require('../lib/database');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Database setup endpoint (for first-time setup)
router.post('/setup-database', async (req, res) => {
  try {
    console.log('📋 Database setup requested');
    
    // Check if database is already setup
    try {
      const userCount = await dbHelpers.user.findByEmail('admin@esp32platform.com');
      if (userCount) {
        return res.status(400).json({ 
          message: 'Database is already set up',
          setupComplete: true
        });
      }
    } catch (error) {
      // Database might not be setup yet, continue with setup
      console.log('🔄 Database needs setup');
    }
    
    // Run manual database setup
    await manualDatabaseSetup();
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    
    try {
      await dbHelpers.user.create({
        username: 'admin',
        email: 'admin@esp32platform.com',
        password: adminPassword,
        role: 'ADMIN',
        subscription: 'PREMIUM',
        emailVerified: true,
        isActive: true
      });
      
      console.log('✅ Admin user created successfully');
    } catch (error) {
      console.log('⚠️ Admin user might already exist');
    }
    
    res.json({
      message: 'Database setup completed successfully!',
      adminCredentials: {
        email: 'admin@esp32platform.com',
        password: 'admin123',
        note: 'Please change the admin password after first login'
      },
      setupComplete: true
    });
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    res.status(500).json({ 
      message: 'Database setup failed',
      error: error.message,
      setupComplete: false
    });
  }
});

// Check database status
router.get('/database-status', async (req, res) => {
  try {
    // Try to count users to check if database is working
    const userCount = await dbHelpers.user.findByEmail('admin@esp32platform.com');
    
    res.json({
      message: 'Database is working',
      isSetup: !!userCount,
      hasAdminUser: !!userCount,
      status: 'connected'
    });
    
  } catch (error) {
    console.error('Database status check failed:', error);
    res.status(500).json({
      message: 'Database connection failed',
      isSetup: false,
      hasAdminUser: false,
      status: 'error',
      error: error.message
    });
  }
});

// Register new user
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
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

    const { username, email, password } = req.body;

    // Auto-setup database if not setup yet
    try {
      await dbHelpers.user.findByEmail('admin@esp32platform.com');
    } catch (error) {
      console.log('🔄 Database not setup, attempting auto-setup...');
      try {
        await manualDatabaseSetup();
        console.log('✅ Database auto-setup completed');
      } catch (setupError) {
        return res.status(500).json({
          message: 'Database not setup. Please contact administrator or call /api/auth/setup-database',
          needsSetup: true,
          setupError: setupError.message
        });
      }
    }

    // Check if user already exists
    const existingEmail = await dbHelpers.user.findByEmail(email);
    const existingUsername = await dbHelpers.user.findByUsername(username);

    if (existingEmail) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    if (existingUsername) {
      return res.status(400).json({ 
        message: 'Username is already taken' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = await dbHelpers.user.create({
      username,
      email,
      password: hashedPassword,
      role: 'USER',
      subscription: 'FREE',
      isActive: true,
      emailVerified: false
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login user
router.post('/login', [
  body('login')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { login, password } = req.body;

    // Find user by email or username
    let user = await dbHelpers.user.findByEmail(login);
    if (!user) {
      user = await dbHelpers.user.findByUsername(login);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await dbHelpers.user.update(user.id, { lastLogin: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await dbHelpers.user.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User profile retrieved successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        subscriptionExpiry: user.subscriptionExpiry,
        deviceLimit: user.deviceLimit,
        projectLimit: user.projectLimit,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', [
  verifyToken,
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { username, email } = req.body;
    const updateData = {};

    // Check if username is being updated and not taken
    if (username && username !== req.user.username) {
      const existingUsername = await dbHelpers.user.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      updateData.username = username;
    }

    // Check if email is being updated and not taken
    if (email && email !== req.user.email) {
      const existingEmail = await dbHelpers.user.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
      updateData.email = email;
      updateData.emailVerified = false; // Reset email verification
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    // Update user
    const updatedUser = await dbHelpers.user.update(req.user.id, updateData);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        subscription: updatedUser.subscription
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change password
router.put('/password', [
  verifyToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await dbHelpers.user.findById(req.user.id);
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await dbHelpers.user.update(req.user.id, { password: hashedNewPassword });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout (client-side token removal)
router.post('/logout', verifyToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;