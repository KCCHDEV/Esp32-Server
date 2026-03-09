# การรองรับระบบจำนวนมาก (Scaling)

เอกสารนี้สรุปฟีเจอร์และค่าที่ใช้เมื่อรันระบบกับ **ผู้ใช้/อุปกรณ์จำนวนมาก** (production scale)

---

## 1. Pagination

API ที่คืนรายการหลายรายใช้ **limit** และ **offset** เพื่อไม่ให้โหลดข้อมูลครั้งละมากเกินไป

### GET /api/devices

| Query   | ค่าเริ่มต้น | สูงสุด | ความหมาย |
|--------|-------------|--------|----------|
| `limit`  | 50  | 200 | จำนวน device ต่อหน้า |
| `offset` | 0   | -   | ข้ามกี่รายการ |

**ตัวอย่าง:** `GET /api/devices?limit=100&offset=200`

**Response:** มี `pagination: { limit, offset, total }` ให้ใช้คำนวณหน้าถัดไป

### GET /api/projects

ใช้ `limit` และ `offset` แบบเดียวกัน (default 50, max 200)

---

## 2. Health และ Readiness

- **GET /api/health** – ไม่ต่อ DB ใช้สำหรับ liveness (ว่า process ยังรันอยู่)
- **GET /api/ready** – ต่อ DB (`SELECT 1`) ใช้สำหรับ readiness (ว่าแอปพร้อมรับ traffic)

ใน Kubernetes / Load Balancer แนะนำให้:
- Liveness probe ชี้ไปที่ `/api/health`
- Readiness probe ชี้ไปที่ `/api/ready`

---

## 3. Cache สำหรับ Device API Key

เมื่อมีอุปกรณ์จำนวนมาก แต่ละ request จะต้องตรวจ API key; ถ้าไปถาม DB ทุกครั้งจะเกิด load สูง

- ระบบใช้ **in-memory cache** สำหรับผลลัพธ์การตรวจ API key
- **TTL:** กำหนดด้วย env `DEVICE_CACHE_TTL_SEC` (วินาที) ค่าเริ่มต้น **60**
- หลัง regenerate API key จะ invalidate cache ของ key เก่าทันที
- การปิดการใช้งาน device จะมีผลเต็มที่ภายในช่วง TTL (อย่างมาก 60 วินาที)

**ตัวอย่าง (production):**
```env
DEVICE_CACHE_TTL_SEC=120
```

---

## 4. Rate Limit

- **Path ที่ไม่ถูกจำกัด:** `/api/health`, `/api/ready`, `/api/esp32/*`, `/api/raspi/*`
- **Path อื่น:** ใช้ rate limit ตาม IP  
  - กำหนดด้วย `RATE_LIMIT_WINDOW_MS` และ `RATE_LIMIT_MAX_REQUESTS`  
  - ค่าเริ่มต้น: 2000 requests / 15 นาที

**ตัวอย่าง:**
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5000
```

---

## 5. Database (Production)

- ใช้ **connection pooling** ทาง connection string (เช่น Neon, PgBouncer)
- Prisma ใช้ `DATABASE_URL` (pooled) และ `DIRECT_URL` (ตรงไปที่ DB สำหรับ migrate)
- ถ้ารันหลาย instance ควรให้แต่ละ instance ใช้ pool ขนาดพอดี ไม่ใหญ่เกินไป

---

## 6. ข้อจำกัดต่อ User (Subscription)

| Tier    | Devices | Projects |
|--------|---------|----------|
| FREE   | 10      | 5        |
| PRO    | 30      | 50       |
| PREMIUM| 100     | 100      |

ค่าพวกนี้อยู่ใน backend; ถ้าต้องการปรับให้รองรับจำนวนมากกว่าสามารถแก้ใน `backend/lib/prisma.js` ที่ `getEffectiveLimits`

---

## 7. สรุป env ที่เกี่ยวกับจำนวนมาก

| ตัวแปร | ความหมาย | ค่าเริ่มต้น |
|--------|----------|-------------|
| `DEVICE_CACHE_TTL_SEC` | TTL cache การตรวจ API key (วินาที) | 60 |
| `RATE_LIMIT_WINDOW_MS` | ช่วงเวลานับ request (มิลลิวินาที) | 900000 (15 นาที) |
| `RATE_LIMIT_MAX_REQUESTS` | จำนวน request สูงสุดต่อ IP ต่อช่วง | 2000 |

---

การ deploy แบบ self-host หรือหลาย instance ดูเพิ่มใน [SELFHOST.md](SELFHOST.md)
