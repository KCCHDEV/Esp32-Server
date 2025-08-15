const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@esp32platform.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      // Hash admin password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          subscription: 'PREMIUM',
          emailVerified: true,
          deviceLimit: 100,
          projectLimit: 200,
        },
      });

      console.log('✅ Admin user created:', admin.email);
    } else {
      console.log('ℹ️ Admin user already exists:', existingAdmin.email);
    }

    // Create sample demo user
    const demoEmail = 'demo@esp32platform.com';
    const existingDemo = await prisma.user.findUnique({
      where: { email: demoEmail }
    });

    if (!existingDemo) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('demo123', salt);

      const demoUser = await prisma.user.create({
        data: {
          username: 'demo',
          email: demoEmail,
          password: hashedPassword,
          role: 'USER',
          subscription: 'FREE',
          emailVerified: true,
        },
      });

      console.log('✅ Demo user created:', demoUser.email);

      // Create sample device for demo user
      const sampleDevice = await prisma.device.create({
        data: {
          name: 'ESP32 Demo Device',
          description: 'Sample ESP32 device for demonstration',
          userId: demoUser.id,
          apiKey: `esp32_demo_${Date.now()}`,
          chipModel: 'ESP32-WROOM-32',
          flashSize: '4MB',
          cpuFreq: 240,
        },
      });

      console.log('✅ Sample device created:', sampleDevice.name);

      // Create sample pins for the device
      const samplePins = [
        { number: 2, mode: 'OUTPUT', label: 'Built-in LED', isUsed: true },
        { number: 4, mode: 'INPUT', label: 'Button', isUsed: true },
        { number: 34, mode: 'ANALOG_INPUT', label: 'Sensor Input', isUsed: true },
        { number: 18, mode: 'PWM_OUTPUT', label: 'PWM Pin', isUsed: false },
        { number: 21, mode: 'I2C_SDA', label: 'I2C SDA', isUsed: false },
        { number: 22, mode: 'I2C_SCL', label: 'I2C SCL', isUsed: false },
      ];

      for (const pin of samplePins) {
        await prisma.pin.create({
          data: {
            ...pin,
            deviceId: sampleDevice.id,
          },
        });
      }

      console.log('✅ Sample pins created');

      // Create sample project
      const sampleProject = await prisma.project.create({
        data: {
          name: 'LED Blink Project',
          description: 'Simple LED blinking project for demonstration',
          userId: demoUser.id,
          deviceId: sampleDevice.id,
          category: 'OTHER',
          canvasBlocks: JSON.stringify([
            {
              id: 'block-1',
              type: 'digital_output',
              position: { x: 100, y: 100 },
              properties: { pin: 2, state: 'HIGH' }
            },
            {
              id: 'block-2',
              type: 'delay',
              position: { x: 300, y: 100 },
              properties: { duration: 1000 }
            }
          ]),
          canvasConnections: JSON.stringify([
            {
              id: 'conn-1',
              sourceBlock: 'block-1',
              targetBlock: 'block-2'
            }
          ]),
          generatedCode: `
// Auto-generated LED Blink code
void setup() {
  pinMode(2, OUTPUT);
}

void loop() {
  digitalWrite(2, HIGH);
  delay(1000);
  digitalWrite(2, LOW);
  delay(1000);
}
          `.trim(),
        },
      });

      console.log('✅ Sample project created:', sampleProject.name);

    } else {
      console.log('ℹ️ Demo user already exists:', existingDemo.email);
    }

    console.log('🎉 Database seed completed successfully!');

  } catch (error) {
    console.error('❌ Database seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });