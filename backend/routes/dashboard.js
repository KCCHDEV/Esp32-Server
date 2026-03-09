const express = require('express');
const { dbHelpers } = require('../lib/prisma');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// สถิติสำหรับ dashboard + รายการล่าสุด (แสดงผลและกดไปหน้ารายละเอียดได้)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { prisma } = require('../lib/prisma');

    const [devicesTotal, devicesOnline, projectsTotal, recentDevices, recentProjects] = await Promise.all([
      prisma.device.count({ where: { userId } }),
      prisma.device.count({ where: { userId, isOnline: true } }),
      prisma.project.count({ where: { userId } }),
      prisma.device.findMany({
        where: { userId },
        orderBy: { lastSeen: 'desc' },
        take: 8,
        select: {
          id: true,
          name: true,
          deviceId: true,
          platform: true,
          isOnline: true,
          lastSeen: true,
          firmwareVersion: true
        }
      }),
      prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          isActive: true,
          deploymentStatus: true,
          updatedAt: true
        }
      })
    ]);

    res.json({
      message: 'Dashboard stats',
      stats: {
        devicesTotal,
        devicesOnline,
        devicesOffline: devicesTotal - devicesOnline,
        projectsTotal
      },
      recentDevices,
      recentProjects
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
