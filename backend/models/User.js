const bcrypt = require('bcryptjs');
const { prisma } = require('../lib/database');

class User {
  // Create new user
  static async create(userData) {
    const { username, email, password, role = 'USER', subscription = 'FREE' } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    return await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
        subscription,
      },
    });
  }

  // Find user by ID
  static async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  // Find user by email
  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  // Find user by username
  static async findByUsername(username) {
    return await prisma.user.findUnique({
      where: { username },
    });
  }

  // Find user by email or username
  static async findByEmailOrUsername(login) {
    return await prisma.user.findFirst({
      where: {
        OR: [
          { email: login.toLowerCase() },
          { username: login },
        ],
      },
    });
  }

  // Update user
  static async update(id, updateData) {
    return await prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  // Delete user
  static async delete(id) {
    return await prisma.user.delete({
      where: { id },
    });
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update password
  static async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    return await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  // Update last login
  static async updateLastLogin(id) {
    return await prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  // Check if subscription is active
  static isSubscriptionActive(user) {
    if (user.subscription === 'FREE') return true;
    return user.subscriptionExpiry && user.subscriptionExpiry > new Date();
  }

  // Get effective limits based on subscription
  static getEffectiveLimits(user) {
    const isActive = this.isSubscriptionActive(user);
    
    if (user.subscription === 'PREMIUM' && isActive) {
      return {
        devices: 50,
        projects: 100
      };
    }
    
    return {
      devices: user.deviceLimit,
      projects: user.projectLimit
    };
  }

  // Count user's devices
  static async countDevices(userId) {
    return await prisma.device.count({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  // Count user's projects
  static async countProjects(userId) {
    return await prisma.project.count({
      where: { userId },
    });
  }

  // Get all users (admin only)
  static async findAll(options = {}) {
    const { page = 1, limit = 10, search } = options;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          subscription: true,
          subscriptionExpiry: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: {
              devices: true,
              projects: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // Update subscription
  static async updateSubscription(id, subscription, subscriptionExpiry = null) {
    return await prisma.user.update({
      where: { id },
      data: {
        subscription,
        subscriptionExpiry,
      },
    });
  }

  // Set reset password token
  static async setResetPasswordToken(id, token, expiry) {
    return await prisma.user.update({
      where: { id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpire: expiry,
      },
    });
  }

  // Find user by reset token
  static async findByResetToken(token) {
    return await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpire: {
          gt: new Date(),
        },
      },
    });
  }

  // Clear reset password token
  static async clearResetPasswordToken(id) {
    return await prisma.user.update({
      where: { id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    });
  }

  // Set email verification token
  static async setEmailVerificationToken(id, token) {
    return await prisma.user.update({
      where: { id },
      data: { emailVerificationToken: token },
    });
  }

  // Verify email
  static async verifyEmail(token) {
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) return null;

    return await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });
  }
}

module.exports = User;