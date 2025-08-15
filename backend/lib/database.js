const { PrismaClient } = require('@prisma/client');

// Create Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasourceUrl: process.env.DATABASE_URL,
});

// Database connection function
async function connectDatabase() {
  try {
    // Test the connection
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database via Prisma');
    
    // Optional: Test with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database query test successful');
    
    return prisma;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

// Graceful shutdown
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Disconnected from database');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, closing database connection...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, closing database connection...');
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase
};