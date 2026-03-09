const { PrismaClient } = require('@prisma/client');

// Create a global Prisma instance
const globalForPrisma = globalThis;

// Use Netlify environment variables if available, fallback to standard DATABASE_URL
const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasourceUrl: databaseUrl,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper functions for common operations
const dbHelpers = {
  // User helpers
  user: {
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    findByUsername: (username) => prisma.user.findUnique({ where: { username } }),
    findById: (id) => prisma.user.findUnique({ 
      where: { id },
      include: {
        devices: true,
        projects: true,
        sharedProjects: true
      }
    }),
    create: (data) => prisma.user.create({ data }),
    update: (id, data) => prisma.user.update({ where: { id }, data }),
    delete: (id) => prisma.user.delete({ where: { id } }),
    
    // Subscription helpers
    isSubscriptionActive: (user) => {
      if (user.subscription === 'FREE') return true;
      if (!user.subscriptionExpiry) return false;
      return new Date() < user.subscriptionExpiry;
    },
    
    getEffectiveLimits: (user) => {
      const isActive = dbHelpers.user.isSubscriptionActive(user);
      
      if (user.subscription === 'PREMIUM' && isActive) {
        return { devices: 100, projects: 100, storage: 5000 }; // รองรับอุปกรณ์แยะ
      } else if (user.subscription === 'PRO' && isActive) {
        return { devices: 30, projects: 50, storage: 2000 };
      }
      
      // FREE tier - เพิ่มให้ลองใช้ได้หลายตัว
      return { devices: 10, projects: 5, storage: 100 };
    }
  },

  // Device helpers
  device: {
    findByApiKey: (apiKey) => prisma.device.findUnique({ 
      where: { apiKey },
      include: { user: true }
    }),
    findById: (id) => prisma.device.findUnique({ 
      where: { id },
      include: { user: true, sensors: true }
    }),
    findByUserId: (userId) => prisma.device.findMany({ 
      where: { userId },
      include: { sensors: true }
    }),
    findByUserIdPaginated: (userId, { limit = 50, offset = 0 } = {}) => {
      const take = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
      const skip = Math.max(0, parseInt(offset, 10) || 0);
      return Promise.all([
        prisma.device.findMany({
          where: { userId },
          include: { sensors: true },
          orderBy: { createdAt: 'desc' },
          take,
          skip
        }),
        prisma.device.count({ where: { userId } })
      ]).then(([items, total]) => ({ items, total }));
    },
    create: (data) => prisma.device.create({ data }),
    update: (id, data) => prisma.device.update({ where: { id }, data }),
    delete: (id) => prisma.device.delete({ where: { id } }),
    
    updateLastSeen: (id) => prisma.device.update({
      where: { id },
      data: { lastSeen: new Date(), isOnline: true }
    }),
    
    setOffline: (id) => prisma.device.update({
      where: { id },
      data: { isOnline: false }
    })
  },

  // Project helpers
  project: {
    findById: (id) => prisma.project.findUnique({ 
      where: { id },
      include: { 
        user: true, 
        sharedWith: { include: { user: true } },
        devices: true
      }
    }),
    findByUserId: (userId) => prisma.project.findMany({ 
      where: { userId },
      include: { devices: true }
    }),
    findByUserIdPaginated: (userId, { limit = 50, offset = 0 } = {}) => {
      const take = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
      const skip = Math.max(0, parseInt(offset, 10) || 0);
      return Promise.all([
        prisma.project.findMany({
          where: { userId },
          include: { devices: true },
          orderBy: { updatedAt: 'desc' },
          take,
          skip
        }),
        prisma.project.count({ where: { userId } })
      ]).then(([items, total]) => ({ items, total }));
    },
    create: (data) => prisma.project.create({ data }),
    update: (id, data) => prisma.project.update({ where: { id }, data }),
    delete: (id) => prisma.project.delete({ where: { id } })
  },

  // Sensor helpers
  sensor: {
    findByDeviceId: (deviceId) => prisma.sensor.findMany({ where: { deviceId } }),
    create: (data) => prisma.sensor.create({ data }),
    update: (id, data) => prisma.sensor.update({ where: { id }, data }),
    delete: (id) => prisma.sensor.delete({ where: { id } })
  },

  // Data helpers
  sensorData: {
    create: (data) => prisma.sensorData.create({ data }),
    findByDeviceId: (deviceId, limit = 100) => prisma.sensorData.findMany({
      where: { sensor: { deviceId } },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { sensor: true }
    }),
    deleteOldData: (beforeDate) => prisma.sensorData.deleteMany({
      where: { timestamp: { lt: beforeDate } }
    })
  }
};

module.exports = {
  prisma,
  dbHelpers
};