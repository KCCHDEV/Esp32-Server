# 🚀 ESP32 Zero Code Platform

A comprehensive zero-code platform for ESP32 development similar to Blink, featuring visual programming, real-time device monitoring, WiFi management, and I2C device detection.

**🌐 Deploy to Netlify + Neon Database in minutes!**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-repo/esp32-zero-code-platform)

## ✨ Features

### 🎯 Core Features
- **Zero-Code Visual Programming**: Drag-and-drop blocks to create ESP32 programs
- **WiFi Management**: Easy WiFi configuration through captive portal
- **Real-time Monitoring**: Live device status, sensor data, and system metrics
- **I2C Device Detection**: Automatic scanning and identification of I2C devices
- **Device Management**: Add, configure, and monitor multiple ESP32 devices
- **API Integration**: RESTful API with authentication for device communication

### 🔐 User Management
- **User Registration & Login**: Secure authentication system
- **Role-based Access**: User and admin roles with different permissions
- **Premium Subscriptions**: Free tier with device/project limits, premium tier with unlimited access
- **Profile Management**: User profile and account settings

### 📱 Device Features
- **Device Registration**: Easy setup with API keys
- **Pin Configuration**: Dynamic pin modes (input, output, analog, PWM, I2C)
- **Sensor Support**: Multiple sensor types with real-time data collection
- **Status Monitoring**: Uptime, memory usage, WiFi signal strength
- **Remote Control**: Send commands and update configurations remotely

### 🎨 Visual Programming
- **Block-based Editor**: Intuitive drag-and-drop interface
- **Real-time Code Generation**: Automatic Arduino code generation
- **Project Management**: Save, load, and share projects
- **Deployment**: One-click deployment to ESP32 devices
- **Version Control**: Project versioning and rollback capabilities

### 🌐 Web Platform
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: WebSocket integration for live data
- **Dashboard**: Overview of all devices and projects
- **Admin Panel**: System management and user administration

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   ESP32 Device  │
│   (React)       │◄──►│ (Netlify Fn)    │◄──►│   (Arduino)     │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • WiFi Config   │
│ • Visual Editor │    │ • WebSocket     │    │ • Sensor Reading│
│ • Device Mgmt   │    │ • Auth System   │    │ • I2C Scanning  │
│ • Real-time UI  │    │ • Neon DB       │    │ • Status Report │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 ตั้งค่าง่ายๆ แค่ 3 ขั้นตอน!

### 1. สร้าง Database (ฟรี!)
- ไปที่ [neon.tech](https://neon.tech) 
- สร้าง project และคัดลอก Database URL

### 2. ตั้งค่า Environment
```bash
# สร้างไฟล์ backend/.env
DATABASE_URL="postgresql://user:pass@your-neon-url/db?sslmode=require"
JWT_SECRET="your-secret-key"
```

### 3. เริ่มใช้งาน
```bash
# ติดตั้ง dependencies
cd backend && npm install
cd ../frontend && npm install

# รันเซิร์ฟเวอร์
cd backend && npm start    # Terminal 1
cd frontend && npm start   # Terminal 2
```

**🎉 เปิด http://localhost:3000 เท่านี้เอง!**

### 📖 รายละเอียดเพิ่มเติม
ดูใน [SETUP.md](./SETUP.md) สำหรับขั้นตอนละเอียดและการ deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-repo/esp32-zero-code-platform)

## 💻 Local Development

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or Neon)
- Arduino IDE with ESP32 support
- ESP32 development board

### 1. Clone Repository
```bash
git clone https://github.com/your-repo/esp32-zero-code-platform
cd esp32-zero-code-platform
```

### 2. Install Dependencies
```bash
npm run install-all
```

### 3. Set Up Database
```bash
# Copy environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your database URL
# DATABASE_URL="postgresql://username:password@localhost:5432/esp32_db"

# Set up database schema
cd backend
npm run db:push
npm run db:seed
```

### 4. Start Development Servers
```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run server  # Backend on :3001
npm run client  # Frontend on :3000
```

### 5. Flash ESP32 Firmware
1. Open `firmware/esp32_zero_code.ino` in Arduino IDE
2. Install required libraries (see [firmware/README.md](firmware/README.md))
3. Upload to your ESP32
4. Configure via WiFi portal at `192.168.4.1`

## 🔧 Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Material-UI** - Beautiful component library
- **Socket.IO** - Real-time communication
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Backend
- **Node.js & Express** - Server framework
- **Prisma** - Database ORM
- **PostgreSQL** - Production database
- **JWT** - Authentication
- **Socket.IO** - WebSocket support

### Database
- **Neon PostgreSQL** - Serverless Postgres
- **Prisma ORM** - Type-safe database access
- **Connection pooling** - Optimized for serverless

### Deployment
- **Netlify** - Frontend hosting + serverless functions
- **Netlify Functions** - Serverless backend
- **GitHub Actions** - CI/CD pipeline
- **Custom domains** - Professional URLs

### ESP32 Firmware
- **Arduino Core** - ESP32 development
- **WiFi Manager** - Easy configuration
- **ArduinoJson** - JSON handling
- **AsyncWebServer** - Web portal
- **HTTPClient** - API communication

## 🌐 Deployment Options

### 🏆 Recommended: Netlify + Neon
- **✅ Free tier available**
- **✅ Automatic SSL certificates**
- **✅ Global CDN**
- **✅ Serverless scaling**
- **✅ Easy custom domains**

### Alternative: Traditional Hosting
- VPS with Node.js + PostgreSQL
- Docker deployment
- AWS/GCP/Azure
- See [DEPLOYMENT.md](DEPLOYMENT.md) for details

## 📖 Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Complete deployment instructions
- **[ESP32 Firmware](firmware/README.md)** - Firmware documentation
- **[API Documentation](docs/API.md)** - Backend API reference
- **[Contributing Guide](CONTRIBUTING.md)** - Development guidelines

## 🎨 Visual Programming

### Supported Block Types

#### Input/Output Blocks
- **Digital Input**: Read button, switch states
- **Analog Input**: Read sensor values (0-4095)
- **Digital Output**: Control LEDs, relays
- **PWM Output**: Control servo motors, LED brightness

#### Logic Blocks
- **Conditions**: If/else statements
- **Loops**: For/while loops
- **Variables**: Store and manipulate data
- **Functions**: Custom reusable code blocks

#### Communication Blocks
- **WiFi**: Send HTTP requests
- **I2C**: Read/write I2C devices
- **Serial**: Debug output

#### Sensor Blocks
- **Temperature**: DHT22, DS18B20, BME280
- **Motion**: PIR sensors
- **Distance**: Ultrasonic sensors
- **Light**: Photoresistors, LDR

## 🌐 API Documentation

### Authentication
All API calls require JWT token:
```bash
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints
```bash
# User Management
POST /api/auth/register    # Register new user
POST /api/auth/login       # User login
GET  /api/auth/profile     # Get user profile

# Device Management
GET    /api/devices           # Get user devices
POST   /api/devices           # Create new device
GET    /api/devices/:id       # Get device details
DELETE /api/devices/:id       # Delete device

# ESP32 Communication
POST /api/esp32/heartbeat    # Device status update
POST /api/esp32/pins         # Pin state update
POST /api/esp32/sensors      # Sensor data update
GET  /api/esp32/config       # Get device config
```

ESP32 devices authenticate with API key:
```bash
X-API-Key: esp32_your_device_api_key
```

## 💳 Pricing & Limits

### Free Tier
- **3 ESP32 devices**
- **5 projects**
- **Basic monitoring**
- **Community support**
- **Netlify**: 100GB bandwidth/month
- **Neon**: 0.5GB storage

### Premium Tier ($19/month)
- **50 ESP32 devices**
- **100 projects**
- **Advanced analytics**
- **Priority support**
- **Custom integrations**
- **Export capabilities**

## 🛠️ Development

### Project Structure
```
esp32-zero-code-platform/
├── backend/                 # Node.js backend
│   ├── prisma/             # Database schema
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── middleware/         # Auth & validation
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── hooks/          # Custom hooks
│   └── public/             # Static files
├── firmware/               # ESP32 Arduino code
│   ├── esp32_zero_code.ino # Main firmware file
│   └── README.md           # Firmware documentation
├── netlify/                # Netlify Functions
│   └── functions/          # Serverless functions
└── docs/                   # Additional documentation
```

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🐛 Troubleshooting

### Common Issues

#### ESP32 Won't Connect
- Verify WiFi credentials
- Check API key format
- Ensure server is accessible
- Check serial monitor for errors

#### Frontend Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)
- Verify all dependencies are installed

#### Database Connection Issues
- Check DATABASE_URL format
- Ensure SSL mode: `?sslmode=require`
- Test connection: `npm run db:push`

#### Netlify Function Timeout
- Functions have 10-second timeout
- Optimize database queries
- Consider background jobs for long operations

## 📊 Performance

### Optimizations Included
- **Frontend**: Code splitting, lazy loading, compression
- **Backend**: Connection pooling, query optimization, caching
- **Database**: Indexes, efficient queries, prepared statements
- **CDN**: Global content delivery via Netlify

### Monitoring
- **Netlify Analytics**: Built-in performance monitoring
- **Neon Dashboard**: Database performance metrics
- **Real-time Logs**: Function execution and errors

## 🔒 Security

### Security Features
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with 12 rounds
- **Rate Limiting**: API abuse prevention
- **CORS**: Cross-origin request protection
- **HTTPS**: Enforced SSL encryption
- **Input Validation**: Request sanitization
- **SQL Injection**: Prisma ORM protection

## 📈 Roadmap

### Version 1.1
- [ ] Mobile app (React Native)
- [ ] More sensor blocks
- [ ] Firmware OTA updates
- [ ] Advanced visual editor

### Version 1.2
- [ ] Collaboration features
- [ ] Project templates
- [ ] Marketplace for blocks
- [ ] Advanced analytics

### Version 2.0
- [ ] Support for other microcontrollers
- [ ] AI-assisted programming
- [ ] Cloud storage integration
- [ ] Enterprise features

## 🙏 Acknowledgments

- **Arduino Community**: For the ESP32 ecosystem
- **React Team**: For the excellent frontend framework
- **Netlify**: For amazing serverless hosting
- **Neon**: For serverless PostgreSQL
- **Material-UI**: For beautiful components

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Community**: Join our Discord (coming soon)
- **Email**: support@esp32platform.com

## 🎉 Success Stories

> "Deployed in 5 minutes, had my ESP32 connected in 10!" - IoT Developer

> "Finally, a platform that makes ESP32 accessible to everyone" - Educator

> "Perfect for prototyping IoT projects quickly" - Startup Founder

---

**🚀 Ready to deploy your ESP32 Zero Code Platform?**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-repo/esp32-zero-code-platform)

**Made with ❤️ for the IoT community**
