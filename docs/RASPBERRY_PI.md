# Raspberry Pi – การเชื่อมต่อกับ Platform

ระบบรองรับอุปกรณ์ Raspberry Pi ผ่านชุด API เดียวกับ ESP32 โดยใช้ prefix **`/api/raspi/`** แทน `/api/esp32/`.

## ขั้นตอนใช้งาน

1. **สร้าง Device บนเว็บ**  
   - เข้า Devices → Add Device → ตั้งชื่อ (เช่น "Raspi Living Room")  
   - เลือก Platform: **Raspberry Pi** (หรือปล่อย ESP32 แล้วส่ง `platform` จาก Raspi ใน heartbeat ก็ได้)  
   - Copy **API Key**

2. **เรียก API จาก Raspi**  
   ใช้ Base URL ของคุณ เช่น `https://your-site.netlify.app`  
   ทุก request ต้องมี header: `X-API-Key: <API_KEY>`

## Endpoints (ใช้เหมือน ESP32)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST   | `/api/raspi/heartbeat` | ส่งสถานะ (ควรส่งทุก 30 วินาที) |
| GET    | `/api/raspi/config`    | ดึง config และ pins |
| POST   | `/api/raspi/sensor-data` | ส่งค่าจาก sensor |
| GET    | `/api/raspi/time`      | เวลา server (sync) |
| POST   | `/api/raspi/status`    | อัปเดต status (online/offline/error) |
| POST   | `/api/raspi/logs`      | ส่ง log ขึ้น platform |

## ตัวอย่าง Heartbeat (Python)

```python
import requests
import time

API_BASE = "https://your-site.netlify.app"
API_KEY = "dev_xxxx_yyyy"

def heartbeat():
    r = requests.post(
        f"{API_BASE}/api/raspi/heartbeat",
        headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
        json={
            "platform": "raspberry_pi",   # หรือ "raspi" / "rpi"
            "uptime": int(time.time()),   # วินาทีหรือ ms
            "firmwareVersion": "1.0.0",
            "chipModel": "Raspberry Pi 4",
            "cpuFreq": 1500,
            "wifiConnected": True
        },
        timeout=10
    )
    return r.status_code == 200

while True:
    heartbeat()
    time.sleep(30)
```

## ตัวอย่าง cURL

```bash
# Heartbeat
curl -X POST "https://your-site.netlify.app/api/raspi/heartbeat" \
  -H "X-API-Key: dev_xxxx_yyyy" \
  -H "Content-Type: application/json" \
  -d '{"platform":"raspberry_pi","uptime":3600,"firmwareVersion":"1.0.0"}'

# ดึง config
curl -X GET "https://your-site.netlify.app/api/raspi/config" \
  -H "X-API-Key: dev_xxxx_yyyy"
```

## ค่า `platform` ที่รองรับ

- `raspberry_pi`, `raspi`, `rpi` → บันทึกเป็น **RASPBERRY_PI**
- `esp32` → **ESP32**
- อื่นๆ → **OTHER**

ส่งใน body ของ `POST /api/raspi/heartbeat` (หรือ `/api/esp32/heartbeat`) ครั้งแรกหรือเมื่อเปลี่ยนประเภทอุปกรณ์
