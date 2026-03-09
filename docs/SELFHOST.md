# Self-Host – ลงรันบนเซิร์ฟเวอร์ตัวเอง

รันทั้ง Backend + Frontend บน VPS, Raspberry Pi, หรือเครื่องที่รัน Node.js ได้ โดยไม่ใช้ Netlify

## สิ่งที่ต้องมี

- **Node.js 18+**
- **PostgreSQL** (ติดตั้งบนเครื่อง หรือใช้ Neon/ Supabase ฝั่ง cloud ก็ได้)
- พอร์ต **3001** (หรือตั้ง `PORT` เอง) ว่างสำหรับแอป

## 1. โคลนและติดตั้ง

```bash
git clone <repo-url>
cd Esp32-Server
npm run install-all
```

## 2. ตั้งค่า Environment

```bash
cp backend/.env.example backend/.env
# แก้ backend/.env
```

ใน `backend/.env` ต้องมีอย่างน้อย:

```env
# Database – self-host ใช้ PostgreSQL ธรรมดาได้ (ใส่ URL เดียวกันทั้งสองก็ได้)
DATABASE_URL="postgresql://user:password@localhost:5432/esp32_db"
DIRECT_URL="postgresql://user:password@localhost:5432/esp32_db"

# JWT (ต้องเปลี่ยนเป็นค่าลับอย่างน้อย 32 ตัวอักษร)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters

# พอร์ตที่ backend ฟัง
PORT=3001

# ถ้าเปิดเว็บจาก domain อื่น ตั้ง CORS (ไม่ตั้งได้ ใช้ *)
CORS_ORIGIN=http://localhost:3000
# Production: CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
```

## 3. สร้างตารางและ seed (ครั้งแรก)

```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
```

## 4. รันแบบแยก port (dev / ใช้สอง process)

- **Backend:** `npm run server` → API ที่ `http://localhost:3001`
- **Frontend:** `npm run client` → เว็บที่ `http://localhost:3000` (proxy ไป backend อยู่แล้ว)

หรือรันพร้อมกัน:

```bash
npm run dev
```

จากนั้นเปิดเบราว์เซอร์ที่ `http://localhost:3000`

## 5. รันแบบ port เดียว (production self-host)

ให้ backend เสิร์ฟ frontend ด้วย (หนึ่ง port, เหมาะกับ reverse proxy):

```bash
# Build frontend ก่อน
npm run build:frontend

# เปิดให้ backend เสิร์ฟโฟลเดอร์ frontend/build
cd backend
set SERVE_FRONTEND=1
node server.js
```

หรือ (Linux/macOS):

```bash
npm run build:frontend
SERVE_FRONTEND=1 node backend/server.js
```

หรือใช้ script จาก root (เพิ่มใน package.json):

```bash
npm run start:selfhost
```

จากนั้นเปิด `http://localhost:3001` จะได้ทั้งเว็บและ API (`/api/*`)

## 6. ใส่หลัง Nginx / reverse proxy (แนะนำ)

ตัวอย่าง Nginx รับที่พอร์ต 80 แล้วส่งไปที่ backend (รันที่ 3001):

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

ถ้าใช้ HTTPS กับ Let's Encrypt ใช้ `certbot` หรือ config SSL ตามปกติ

## 7. ESP32 / Raspi ชี้มาที่ self-host

ใน firmware หรือสคริปต์บน Raspi ตั้ง **Server URL** เป็น:

- `http://your-server-ip:3001`  
หรือ  
- `https://your-domain.com` (ถ้าเปิด HTTPS ผ่าน Nginx)

API เหมือนเดิม:

- `POST /api/esp32/heartbeat`
- `POST /api/raspi/heartbeat`
- `GET /api/esp32/config` / `/api/raspi/config`
- ฯลฯ

Header: `X-API-Key: <API_KEY>` เหมือนเดิม

## 8. ตัวแปรสำคัญ (สรุป)

| ตัวแปร | ความหมาย |
|--------|----------|
| `DATABASE_URL` | Connection string ของ PostgreSQL (ใช้กับ Prisma + runtime) |
| `DIRECT_URL` | Direct connection (migrate) – ถ้าใช้ PostgreSQL ธรรมดาใส่เหมือน `DATABASE_URL` ได้ |
| `JWT_SECRET` | ค่าลับสำหรับ JWT (อย่างน้อย 32 ตัวอักษร) |
| `PORT` | พอร์ตที่ backend ฟัง (default 3001) |
| `SERVE_FRONTEND` | ตั้งเป็น `1` ถ้าต้องการให้ backend เสิร์ฟ frontend (port เดียว) |
| `CORS_ORIGIN` | Origin ของเว็บฝั่ง frontend (ถ้าไม่ตั้ง production ใช้ `*`) |

---

---

## 9. รันด้วย Docker (หนึ่งคำสั่ง)

มี PostgreSQL ใน Docker ด้วย (ไม่ต้องติดตั้ง PostgreSQL บนเครื่อง):

```bash
docker-compose up -d
```

จากนั้นเปิด `http://localhost:3001` (ตาราง DB จะถูกสร้างจาก Prisma ให้อัตโนมัติ)

- แก้รหัสผ่าน DB / JWT ใน `docker-compose.yml` ก่อนใช้จริง
- ถ้าใช้ DB ภายนอก เอา service `db` ออก แล้วตั้ง `DATABASE_URL` / `DIRECT_URL` ชี้ไปที่ DB นั้น

Build ภาพใหม่หลังแก้โค้ด:

```bash
docker-compose up -d --build
```

---

**หมายเหตุ:** ตอน deploy บน Netlify ใช้ `DATABASE_URL` และ `DIRECT_URL` ใน Netlify dashboard เหมือนกัน (เช่น จาก Neon: pooled + unpooled)
