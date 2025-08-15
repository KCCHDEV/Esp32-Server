# 🚀 ESP32 Zero Code Platform

A comprehensive zero-code platform for ESP32 development similar to Blink, featuring visual programming, real-time device monitoring, WiFi management, and I2C device detection.

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
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Arduino)     │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • WiFi Config   │
│ • Visual Editor │    │ • WebSocket     │    │ • Sensor Reading│
│ • Device Mgmt   │    │ • Auth System   │    │ • I2C Scanning  │
│ • Real-time UI  │    │ • Database      │    │ • Status Report │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MongoDB 4.4+
- Arduino IDE with ESP32 support
- ESP32 development board

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/esp32-zero-code-platform
cd esp32-zero-code-platform
```

### 2. Setup Backend
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your MongoDB URI and other settings

# Start backend server
npm run dev
```

### 3. Setup Frontend
```bash
# In a new terminal, install frontend dependencies
cd frontend
npm install

# Start frontend development server
npm start
```

### 4. Setup Database
```bash
# Make sure MongoDB is running
# The application will create collections automatically
```

### 5. Flash ESP32 Firmware
1. Open Arduino IDE
2. Install required libraries (see [firmware/README.md](firmware/README.md))
3. Open `firmware/esp32_zero_code.ino`
4. Select your ESP32 board and port
5. Upload the firmware

### 6. Configure ESP32
1. Power on your ESP32
2. Hold the BOOT button for 5+ seconds to enter config mode
3. Connect to WiFi network `ESP32-ZeroCode-XXXXXX`
4. Open browser and go to `192.168.4.1`
5. Configure WiFi, API key, and server settings

### 7. Access the Platform
1. Open http://localhost:3000
2. Register a new account
3. Add your ESP32 device using the generated API key
4. Start creating zero-code projects!

## 📖 Detailed Setup

### Backend Configuration

Edit `backend/.env`:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/esp32_zero_code
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d

# Admin credentials
ADMIN_EMAIL=admin@esp32platform.com
ADMIN_PASSWORD=admin123

# CORS settings
CORS_ORIGIN=http://localhost:3000
```

### Available Scripts

#### Root Directory
```bash
npm run dev          # Start both frontend and backend
npm run install-all  # Install all dependencies
npm run build        # Build frontend and backend
```

#### Backend
```bash
npm start           # Start production server
npm run dev         # Start development server with nodemon
```

#### Frontend
```bash
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
```

## 🔧 ESP32 Firmware

### Required Libraries
Install via Arduino IDE Library Manager:
- ArduinoJson (6.x)
- ESPAsyncWebServer
- AsyncTCP
- WiFi (ESP32 Core)
- HTTPClient (ESP32 Core)

### Hardware Connections
- **Status LED**: GPIO 2 (built-in LED)
- **Config Button**: GPIO 0 (BOOT button)
- **I2C**: GPIO 21 (SDA), GPIO 22 (SCL)

### Configuration
1. **WiFi Setup**: Use configuration portal at `192.168.4.1`
2. **API Key**: Get from device settings in web platform
3. **Server URL**: Default `http://localhost:3001`

See [firmware/README.md](firmware/README.md) for detailed firmware documentation.

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

### Code Generation
The visual blocks automatically generate Arduino C++ code that runs on the ESP32. The generated code includes:
- Pin initialization
- Main loop logic
- Helper functions
- Library includes

## 🌐 API Documentation

### Authentication
All API calls require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### User Endpoints
```
POST /api/auth/register    # Register new user
POST /api/auth/login       # User login
GET  /api/auth/profile     # Get user profile
PUT  /api/auth/profile     # Update profile
```

### Device Endpoints
```
GET    /api/devices           # Get user devices
POST   /api/devices           # Create new device
GET    /api/devices/:id       # Get device details
PUT    /api/devices/:id       # Update device
DELETE /api/devices/:id       # Delete device
POST   /api/devices/:id/reboot # Reboot device
```

### ESP32 API Endpoints
```
POST /api/esp32/heartbeat    # Device status update
POST /api/esp32/pins         # Pin state update
POST /api/esp32/sensors      # Sensor data update
POST /api/esp32/i2c-scan     # I2C scan results
GET  /api/esp32/config       # Get device config
```

Authentication for ESP32 devices uses API key:
```
X-API-Key: esp32_your_device_api_key
```

## 📊 Real-time Features

### WebSocket Events
The platform uses WebSocket for real-time communication:

#### Client → Server
- `join-device-room`: Subscribe to device updates

#### Server → Client
- `device-status`: Real-time device status
- `sensor-data`: Live sensor readings
- `pins-data`: Pin state changes
- `i2c-scan-results`: I2C device detection
- `device-log`: Device log messages

## 💳 Premium Features

### Free Tier Limits
- 3 ESP32 devices
- 5 projects
- Basic monitoring
- Community support

### Premium Tier Benefits
- Unlimited devices (up to 50)
- Unlimited projects (up to 100)
- Advanced analytics
- Priority support
- Custom integrations
- Export capabilities

## 🛠️ Development

### Project Structure
```
esp32-zero-code-platform/
├── backend/                 # Node.js backend
│   ├── models/             # MongoDB models
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
└── docs/                   # Additional documentation
```

### Adding New Features

#### Backend
1. Create new routes in `backend/routes/`
2. Add middleware in `backend/middleware/`
3. Update models in `backend/models/`
4. Test API endpoints

#### Frontend
1. Create components in `frontend/src/components/`
2. Add pages in `frontend/src/pages/`
3. Update routing in `App.js`
4. Add API calls

#### Firmware
1. Add new functions to `esp32_zero_code.ino`
2. Update API communication
3. Test on hardware
4. Update documentation

## 🐛 Troubleshooting

### Common Issues

#### Backend Won't Start
- Check MongoDB is running
- Verify `.env` configuration
- Check port availability (3001)

#### ESP32 Won't Connect
- Verify WiFi credentials
- Check API key format
- Ensure server is accessible
- Check serial monitor for errors

#### Frontend Build Errors
- Clear node_modules and reinstall
- Check React version compatibility
- Verify all dependencies

#### Database Connection Issues
- Check MongoDB URI
- Verify database permissions
- Test connection manually

### Debug Mode
Enable debug output:
```bash
# Backend
DEBUG=* npm run dev

# ESP32 (Serial Monitor)
# Set baud rate to 115200
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Test on actual hardware

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Arduino Community**: For the amazing ESP32 ecosystem
- **React Team**: For the excellent frontend framework
- **Material-UI**: For the beautiful component library
- **Node.js Community**: For the robust backend platform

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check the `/docs` folder for detailed guides
- **Community**: Join our Discord server (link coming soon)
- **Email**: support@esp32platform.com (premium users)

## 🗺️ Roadmap

### Version 1.1
- [ ] Mobile app (React Native)
- [ ] Cloud deployment guide
- [ ] More sensor blocks
- [ ] Firmware OTA updates

### Version 1.2
- [ ] Collaboration features
- [ ] Project templates
- [ ] Marketplace for blocks
- [ ] Advanced analytics

### Version 2.0
- [ ] Support for other microcontrollers
- [ ] AI-assisted programming
- [ ] Cloud storage integration
- [ ] Advanced deployment options

---

**Made with ❤️ for the IoT community**

> Transform your ESP32 development experience with zero-code visual programming!
