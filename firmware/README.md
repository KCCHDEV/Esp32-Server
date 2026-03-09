# ESP32 Zero Code Firmware

This firmware enables ESP32 devices to work with the Zero Code Platform, providing WiFi management, automatic device registration, and zero-code programming capabilities.

## Features

- **WiFi Configuration Portal**: Easy setup via web interface when device is in configuration mode
- **Automatic Device Registration**: Connects to the platform using API keys
- **Real-time Monitoring**: Sends device status, sensor data, and system information
- **I2C Device Detection**: Automatically scans and reports connected I2C devices
- **Pin Management**: Dynamic pin configuration based on visual programming projects
- **OTA Updates**: Ready for over-the-air firmware updates
- **Factory Reset**: Hold reset button for 10 seconds to clear configuration

## Required Libraries

Install these libraries via Arduino IDE Library Manager:

```
- WiFi (ESP32 Core)
- HTTPClient (ESP32 Core)
- ArduinoJson (by Benoit Blanchon) - Version 6.x
- ESPAsyncWebServer (by me-no-dev)
- AsyncTCP (by me-no-dev)
- Wire (ESP32 Core)
- EEPROM (ESP32 Core)
```

## Hardware Setup

### Basic Connections
- **LED_PIN (GPIO 2)**: Status LED (built-in on most ESP32 boards)
- **RESET_PIN (GPIO 0)**: Configuration/reset button (BOOT button on most boards)
- **I2C**: GPIO 21 (SDA), GPIO 22 (SCL) - default I2C pins

### Initial Setup

1. **Flash the firmware** to your ESP32
2. **Enter Configuration Mode**:
   - Hold the BOOT button (GPIO 0) while powering on
   - OR hold BOOT button for 5+ seconds during normal operation
3. **Connect to WiFi**:
   - Look for WiFi network: `ESP32-ZeroCode-XXXXXX`
   - Connect to it (no password required)
   - Open browser and go to `192.168.4.1`
4. **Configure Device**:
   - Scan and select your WiFi network
   - Enter WiFi password
   - Enter API key from your web platform device settings
   - Enter server URL (default: `http://localhost:3001`)
   - Click "Save Configuration"

## Configuration Portal

When in configuration mode, the ESP32 creates a WiFi access point and serves a web configuration interface at `192.168.4.1`.

### Configuration Page Features:
- **Device Information**: Shows chip model, memory, MAC address
- **WiFi Scanner**: Scans and displays available networks with signal strength
- **Network Selection**: Click on scanned networks to auto-fill SSID
- **Secure Configuration**: Password field for WiFi credentials
- **API Integration**: Enter API key and server URL for platform connection

## API Communication

The firmware communicates with the platform via RESTful API:

### Endpoints Used:
- `POST /api/esp32/heartbeat` - Regular status updates (every 30 seconds)
- `POST /api/esp32/pins` - Pin state updates (every 5 seconds)
- `POST /api/esp32/sensors` - Sensor data updates
- `POST /api/esp32/i2c-scan` - I2C device scan results
- `GET /api/esp32/config` - Get device configuration from platform
- `POST /api/esp32/wifi-status` - WiFi connection status updates
- `POST /api/esp32/logs` - Send log messages to platform

### Raspberry Pi (ใช้ชุด endpoint เดียวกัน แค่เปลี่ยน prefix เป็น `/api/raspi/`)
- `POST /api/raspi/heartbeat` - ส่ง `platform: "raspberry_pi"` หรือ `"raspi"` ใน body เพื่อให้ระบบบันทึกเป็น Raspi
- `GET /api/raspi/config` - ดึง config และ pins
- `POST /api/raspi/sensor-data`, `GET /api/raspi/time`, `POST /api/raspi/status`, `POST /api/raspi/logs` ฯลฯ ใช้ path เดียวกับ esp32 แทน prefix เป็น `raspi`

### Authentication:
All API calls use the API key in the `X-API-Key` header for authentication.

## Supported Pin Modes

- **Digital Input**: `input`, `input_pullup`, `input_pulldown`
- **Digital Output**: `output`
- **Analog Input**: `analog_input` (ADC pins)
- **PWM Output**: `pwm_output` (with configurable frequency and resolution)
- **I2C**: `i2c_sda`, `i2c_scl`

## I2C Device Detection

The firmware automatically detects common I2C devices:

| Address | Device Type |
|---------|-------------|
| 0x27 | LCD1602 |
| 0x3C, 0x3D | OLED Display |
| 0x48 | ADS1115 (ADC) |
| 0x68 | DS3231 RTC / MPU6050 IMU |
| 0x76, 0x77 | BME280 / BMP280 |
| 0x5A | MLX90614 IR Thermometer |

## Status Indicators

- **LED Blinking (1Hz)**: Normal operation, connected to platform
- **LED Fast Blinking (5Hz)**: Configuration mode
- **Serial Output**: Detailed status and debug information

## Factory Reset

To perform a factory reset:
1. Hold the BOOT button (GPIO 0) for 10+ seconds during operation
2. Release the button
3. Device will clear all configuration and restart in configuration mode

## Memory Usage

- **EEPROM**: 512 bytes for configuration storage
- **RAM**: Optimized for minimal memory usage
- **Flash**: ~1MB firmware size (fits on 4MB+ ESP32 modules)

## Troubleshooting

### Cannot Connect to WiFi
- Check SSID and password in configuration
- Ensure WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- Try factory reset and reconfigure

### Cannot Connect to Platform
- Verify API key is correct (copy from device settings in web platform)
- Check server URL format (include `http://` or `https://`)
- Ensure platform server is running and accessible
- Check firewall settings

### I2C Devices Not Detected
- Verify I2C wiring (SDA to GPIO 21, SCL to GPIO 22)
- Check device power supply (3.3V or 5V as required)
- Use I2C scanner to verify device addresses
- Ensure proper pull-up resistors (usually built into modules)

### Configuration Portal Not Accessible
- Ensure device is in configuration mode (fast blinking LED)
- Connect to the ESP32 WiFi network first
- Try different browsers or clear browser cache
- Check if another device is using IP 192.168.4.1

## Development Notes

### Extending Functionality
To add new sensor types or I2C devices:
1. Add device detection logic in `getI2CDeviceType()`
2. Implement sensor reading functions
3. Update `readSensors()` to include new sensor types
4. Add appropriate data transmission in `sendSensorData()`

### Debugging
Enable detailed serial output (115200 baud) for troubleshooting:
- WiFi connection status
- API communication results
- I2C scan results
- Configuration changes
- Error messages

### Performance Optimization
- Heartbeat interval: 30 seconds (adjustable)
- Sensor reading interval: 5 seconds (adjustable)
- Automatic WiFi reconnection on disconnection
- Efficient JSON serialization for API communication

## Version History

- **v1.0.0**: Initial release
  - WiFi configuration portal
  - Basic device registration
  - Pin management
  - I2C device detection
  - Real-time status reporting