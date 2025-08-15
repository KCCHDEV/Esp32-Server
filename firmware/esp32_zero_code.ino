#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <EEPROM.h>
#include <Wire.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>

// Configuration
#define FIRMWARE_VERSION "1.0.0"
#define EEPROM_SIZE 512
#define CONFIG_START 0
#define LED_PIN 2
#define RESET_PIN 0

// WiFi Configuration Portal
AsyncWebServer server(80);
bool isConfigMode = false;
bool isConnected = false;
String apiKey = "";
String serverUrl = "http://localhost:3001";

// Device Configuration
struct Config {
  char ssid[32];
  char password[64];
  char apiKey[64];
  char serverUrl[128];
  bool configured;
};

Config config;

// Timing
unsigned long lastHeartbeat = 0;
unsigned long lastSensorRead = 0;
unsigned long heartbeatInterval = 30000; // 30 seconds
unsigned long sensorInterval = 5000;     // 5 seconds

// Pin states
struct PinState {
  int number;
  String mode;
  int value;
  bool isUsed;
  String label;
};

PinState pins[40]; // ESP32 has up to 40 pins
int pinCount = 0;

// Sensor data
struct SensorData {
  String type;
  int pin;
  String name;
  float value;
  String unit;
};

SensorData sensors[10];
int sensorCount = 0;

// I2C devices
struct I2CDevice {
  uint8_t address;
  String name;
  String type;
  bool connected;
};

I2CDevice i2cDevices[16];
int i2cDeviceCount = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Zero Code Platform v" + String(FIRMWARE_VERSION));
  
  // Initialize EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(RESET_PIN, INPUT_PULLUP);
  
  // Load configuration
  loadConfig();
  
  // Check if reset button is pressed (enter config mode)
  if (digitalRead(RESET_PIN) == LOW) {
    delay(5000); // Hold for 5 seconds
    if (digitalRead(RESET_PIN) == LOW) {
      Serial.println("Entering configuration mode...");
      enterConfigMode();
      return;
    }
  }
  
  // If not configured or can't connect, enter config mode
  if (!config.configured || !connectToWiFi()) {
    enterConfigMode();
    return;
  }
  
  // Initialize I2C
  Wire.begin();
  
  // Scan for I2C devices on startup
  scanI2CDevices();
  
  // Get device configuration from server
  getDeviceConfig();
  
  // Send initial heartbeat
  sendHeartbeat();
  
  Serial.println("ESP32 Zero Code Platform ready!");
  Serial.println("API Key: " + String(config.apiKey));
  Serial.println("Server: " + String(config.serverUrl));
}

void loop() {
  unsigned long currentTime = millis();
  
  // Handle WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    if (isConnected) {
      Serial.println("WiFi disconnected, attempting to reconnect...");
      isConnected = false;
    }
    connectToWiFi();
    delay(5000);
    return;
  } else if (!isConnected) {
    Serial.println("WiFi reconnected!");
    isConnected = true;
  }
  
  // Send heartbeat
  if (currentTime - lastHeartbeat >= heartbeatInterval) {
    sendHeartbeat();
    lastHeartbeat = currentTime;
  }
  
  // Read sensors
  if (currentTime - lastSensorRead >= sensorInterval) {
    readSensors();
    sendSensorData();
    lastSensorRead = currentTime;
  }
  
  // Blink LED to show alive status
  digitalWrite(LED_PIN, (millis() / 1000) % 2);
  
  // Check for reset button
  if (digitalRead(RESET_PIN) == LOW) {
    delay(100);
    if (digitalRead(RESET_PIN) == LOW) {
      unsigned long pressStart = millis();
      while (digitalRead(RESET_PIN) == LOW && millis() - pressStart < 10000) {
        delay(10);
      }
      if (millis() - pressStart >= 10000) {
        Serial.println("Factory reset triggered...");
        factoryReset();
      }
    }
  }
  
  delay(100);
}

void loadConfig() {
  EEPROM.get(CONFIG_START, config);
  if (strlen(config.ssid) == 0) {
    config.configured = false;
  }
  
  // Set API key and server URL from config
  apiKey = String(config.apiKey);
  serverUrl = String(config.serverUrl);
  
  Serial.println("Configuration loaded:");
  Serial.println("SSID: " + String(config.ssid));
  Serial.println("Configured: " + String(config.configured ? "Yes" : "No"));
}

void saveConfig() {
  EEPROM.put(CONFIG_START, config);
  EEPROM.commit();
  Serial.println("Configuration saved");
}

bool connectToWiFi() {
  if (strlen(config.ssid) == 0) {
    return false;
  }
  
  Serial.println("Connecting to WiFi: " + String(config.ssid));
  WiFi.begin(config.ssid, config.password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.println("IP address: " + WiFi.localIP().toString());
    Serial.println("Signal strength: " + String(WiFi.RSSI()) + " dBm");
    isConnected = true;
    return true;
  } else {
    Serial.println("\nWiFi connection failed");
    return false;
  }
}

void enterConfigMode() {
  Serial.println("Starting WiFi configuration portal...");
  isConfigMode = true;
  
  // Create WiFi AP
  WiFi.softAP("ESP32-ZeroCode-" + String(ESP.getEfuseMac(), HEX));
  Serial.println("AP started: ESP32-ZeroCode-" + String(ESP.getEfuseMac(), HEX));
  Serial.println("IP address: " + WiFi.softAPIP().toString());
  
  // Setup web server for configuration
  setupConfigServer();
  
  // Wait for configuration
  while (isConfigMode) {
    delay(100);
    // Blink LED rapidly in config mode
    digitalWrite(LED_PIN, (millis() / 200) % 2);
  }
}

void setupConfigServer() {
  // Serve configuration page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    String html = generateConfigHTML();
    request->send(200, "text/html", html);
  });
  
  // Handle WiFi scan
  server.on("/scan", HTTP_GET, [](AsyncWebServerRequest *request){
    String networks = scanWiFiNetworks();
    request->send(200, "application/json", networks);
  });
  
  // Handle configuration save
  server.on("/save", HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("ssid", true) && 
        request->hasParam("password", true) &&
        request->hasParam("apikey", true) &&
        request->hasParam("server", true)) {
      
      String ssid = request->getParam("ssid", true)->value();
      String password = request->getParam("password", true)->value();
      String apikey = request->getParam("apikey", true)->value();
      String serverurl = request->getParam("server", true)->value();
      
      // Save configuration
      ssid.toCharArray(config.ssid, sizeof(config.ssid));
      password.toCharArray(config.password, sizeof(config.password));
      apikey.toCharArray(config.apiKey, sizeof(config.apiKey));
      serverurl.toCharArray(config.serverUrl, sizeof(config.serverUrl));
      config.configured = true;
      
      saveConfig();
      
      request->send(200, "text/plain", "Configuration saved! Device will restart...");
      
      // Restart device
      delay(2000);
      ESP.restart();
    } else {
      request->send(400, "text/plain", "Missing parameters");
    }
  });
  
  // Handle device info
  server.on("/info", HTTP_GET, [](AsyncWebServerRequest *request){
    DynamicJsonDocument doc(512);
    doc["chipModel"] = ESP.getChipModel();
    doc["chipRevision"] = ESP.getChipRevision();
    doc["flashSize"] = ESP.getFlashChipSize();
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["totalHeap"] = ESP.getHeapSize();
    doc["firmware"] = FIRMWARE_VERSION;
    doc["mac"] = WiFi.macAddress();
    
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });
  
  server.begin();
}

String generateConfigHTML() {
  return R"(
<!DOCTYPE html>
<html>
<head>
    <title>ESP32 Zero Code Configuration</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        .scan-btn { background: #28a745; margin-bottom: 10px; }
        .scan-btn:hover { background: #1e7e34; }
        .network-list { max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; }
        .network-item { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
        .network-item:hover { background: #f8f9fa; }
        .signal-strength { float: right; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 ESP32 Zero Code Setup</h1>
        
        <div class="info">
            <strong>Device Info:</strong><br>
            <div id="deviceInfo">Loading...</div>
        </div>
        
        <form id="configForm">
            <div class="form-group">
                <label>WiFi Network:</label>
                <button type="button" class="scan-btn" onclick="scanNetworks()">🔍 Scan Networks</button>
                <div id="networkList" class="network-list" style="display:none;"></div>
                <input type="text" id="ssid" name="ssid" placeholder="Enter WiFi SSID" required>
            </div>
            
            <div class="form-group">
                <label>WiFi Password:</label>
                <input type="password" id="password" name="password" placeholder="Enter WiFi password">
            </div>
            
            <div class="form-group">
                <label>API Key:</label>
                <input type="text" id="apikey" name="apikey" placeholder="Enter your API key from the web platform" required>
                <small>Get this from your device settings in the web platform</small>
            </div>
            
            <div class="form-group">
                <label>Server URL:</label>
                <input type="text" id="server" name="server" value="http://localhost:3001" placeholder="Server URL" required>
            </div>
            
            <button type="submit">💾 Save Configuration</button>
        </form>
    </div>

    <script>
        // Load device info
        fetch('/info')
            .then(response => response.json())
            .then(data => {
                document.getElementById('deviceInfo').innerHTML = 
                    `Model: ${data.chipModel} Rev ${data.chipRevision}<br>` +
                    `Flash: ${(data.flashSize/1024/1024).toFixed(1)} MB<br>` +
                    `RAM: ${(data.freeHeap/1024).toFixed(1)} KB free<br>` +
                    `MAC: ${data.mac}<br>` +
                    `Firmware: ${data.firmware}`;
            });

        function scanNetworks() {
            document.getElementById('networkList').style.display = 'block';
            document.getElementById('networkList').innerHTML = 'Scanning...';
            
            fetch('/scan')
                .then(response => response.json())
                .then(networks => {
                    let html = '';
                    networks.forEach(network => {
                        html += `<div class="network-item" onclick="selectNetwork('${network.ssid}')">
                            ${network.ssid} 
                            <span class="signal-strength">${network.rssi} dBm ${network.encryption !== 'none' ? '🔒' : '🔓'}</span>
                        </div>`;
                    });
                    document.getElementById('networkList').innerHTML = html;
                });
        }

        function selectNetwork(ssid) {
            document.getElementById('ssid').value = ssid;
            document.getElementById('networkList').style.display = 'none';
        }

        document.getElementById('configForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('ssid', document.getElementById('ssid').value);
            formData.append('password', document.getElementById('password').value);
            formData.append('apikey', document.getElementById('apikey').value);
            formData.append('server', document.getElementById('server').value);
            
            fetch('/save', {
                method: 'POST',
                body: formData
            })
            .then(response => response.text())
            .then(data => {
                alert(data);
            });
        });
    </script>
</body>
</html>
)";
}

String scanWiFiNetworks() {
  WiFi.scanDelete();
  int networkCount = WiFi.scanNetworks();
  
  DynamicJsonDocument doc(2048);
  JsonArray networks = doc.to<JsonArray>();
  
  for (int i = 0; i < networkCount; i++) {
    JsonObject network = networks.createNestedObject();
    network["ssid"] = WiFi.SSID(i);
    network["rssi"] = WiFi.RSSI(i);
    network["encryption"] = WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "none" : "secured";
  }
  
  String result;
  serializeJson(doc, result);
  return result;
}

void factoryReset() {
  Serial.println("Performing factory reset...");
  
  // Clear EEPROM
  for (int i = 0; i < EEPROM_SIZE; i++) {
    EEPROM.write(i, 0);
  }
  EEPROM.commit();
  
  // Restart in config mode
  ESP.restart();
}

void sendHeartbeat() {
  if (!isConnected || strlen(config.apiKey) == 0) return;
  
  HTTPClient http;
  http.begin(String(config.serverUrl) + "/api/esp32/heartbeat");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", config.apiKey);
  
  DynamicJsonDocument doc(1024);
  doc["uptime"] = millis();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["usedHeap"] = ESP.getHeapSize() - ESP.getFreeHeap();
  doc["wifiSignal"] = WiFi.RSSI();
  doc["wifiConnected"] = WiFi.status() == WL_CONNECTED;
  doc["chipModel"] = ESP.getChipModel();
  doc["flashSize"] = String(ESP.getFlashChipSize() / 1024 / 1024) + "MB";
  doc["cpuFreq"] = ESP.getCpuFreqMHz();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Heartbeat sent successfully");
  } else {
    Serial.println("Heartbeat failed: " + String(httpResponseCode));
  }
  
  http.end();
}

void getDeviceConfig() {
  if (!isConnected || strlen(config.apiKey) == 0) return;
  
  HTTPClient http;
  http.begin(String(config.serverUrl) + "/api/esp32/config");
  http.addHeader("X-API-Key", config.apiKey);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    
    DynamicJsonDocument doc(4096);
    deserializeJson(doc, response);
    
    // Process pin configuration
    JsonArray pinsArray = doc["pins"];
    pinCount = 0;
    for (JsonObject pin : pinsArray) {
      if (pinCount < 40) {
        pins[pinCount].number = pin["number"];
        pins[pinCount].mode = pin["mode"].as<String>();
        pins[pinCount].value = pin["value"];
        pins[pinCount].isUsed = pin["isUsed"];
        pins[pinCount].label = pin["label"].as<String>();
        
        // Configure pin based on mode
        configurePinMode(pins[pinCount]);
        pinCount++;
      }
    }
    
    Serial.println("Device configuration updated");
  }
  
  http.end();
}

void configurePinMode(PinState& pin) {
  switch (pin.mode.c_str()[0]) {
    case 'i': // input
      if (pin.mode == "input_pullup") {
        pinMode(pin.number, INPUT_PULLUP);
      } else if (pin.mode == "input_pulldown") {
        pinMode(pin.number, INPUT_PULLDOWN);
      } else {
        pinMode(pin.number, INPUT);
      }
      break;
    case 'o': // output
      pinMode(pin.number, OUTPUT);
      digitalWrite(pin.number, pin.value);
      break;
    case 'a': // analog_input
      // ESP32 analog pins don't need explicit configuration
      break;
    case 'p': // pwm_output
      pinMode(pin.number, OUTPUT);
      // Setup PWM channel (ESP32 specific)
      ledcSetup(pin.number, 5000, 8); // 5kHz, 8-bit resolution
      ledcAttachPin(pin.number, pin.number);
      ledcWrite(pin.number, pin.value);
      break;
  }
}

void readSensors() {
  for (int i = 0; i < pinCount; i++) {
    if (!pins[i].isUsed) continue;
    
    if (pins[i].mode == "analog_input") {
      pins[i].value = analogRead(pins[i].number);
    } else if (pins[i].mode.startsWith("input")) {
      pins[i].value = digitalRead(pins[i].number);
    }
  }
}

void sendSensorData() {
  if (!isConnected || strlen(config.apiKey) == 0) return;
  
  // Send pin data
  HTTPClient http;
  http.begin(String(config.serverUrl) + "/api/esp32/pins");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", config.apiKey);
  
  DynamicJsonDocument doc(2048);
  JsonArray pinsArray = doc.createNestedArray("pins");
  
  for (int i = 0; i < pinCount; i++) {
    if (pins[i].isUsed) {
      JsonObject pinObj = pinsArray.createNestedObject();
      pinObj["number"] = pins[i].number;
      pinObj["value"] = pins[i].value;
    }
  }
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  if (httpResponseCode > 0) {
    // Serial.println("Pin data sent");
  }
  
  http.end();
}

void scanI2CDevices() {
  Serial.println("Scanning I2C devices...");
  i2cDeviceCount = 0;
  
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.println("I2C device found at address 0x" + String(address, HEX));
      
      if (i2cDeviceCount < 16) {
        i2cDevices[i2cDeviceCount].address = address;
        i2cDevices[i2cDeviceCount].name = "Device@0x" + String(address, HEX);
        i2cDevices[i2cDeviceCount].type = getI2CDeviceType(address);
        i2cDevices[i2cDeviceCount].connected = true;
        i2cDeviceCount++;
      }
    }
  }
  
  // Send I2C scan results to server
  sendI2CScanResults();
}

String getI2CDeviceType(uint8_t address) {
  // Common I2C device addresses
  switch (address) {
    case 0x27: return "LCD1602";
    case 0x3C: case 0x3D: return "OLED";
    case 0x48: return "ADS1115";
    case 0x68: return "DS3231/MPU6050";
    case 0x76: case 0x77: return "BME280/BMP280";
    case 0x5A: return "MLX90614";
    default: return "Unknown";
  }
}

void sendI2CScanResults() {
  if (!isConnected || strlen(config.apiKey) == 0) return;
  
  HTTPClient http;
  http.begin(String(config.serverUrl) + "/api/esp32/i2c-scan");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", config.apiKey);
  
  DynamicJsonDocument doc(1024);
  JsonArray devicesArray = doc.createNestedArray("devices");
  
  for (int i = 0; i < i2cDeviceCount; i++) {
    JsonObject deviceObj = devicesArray.createNestedObject();
    deviceObj["address"] = "0x" + String(i2cDevices[i].address, HEX);
    deviceObj["name"] = i2cDevices[i].name;
    deviceObj["type"] = i2cDevices[i].type;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  if (httpResponseCode > 0) {
    Serial.println("I2C scan results sent");
  }
  
  http.end();
}