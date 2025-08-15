# 🚀 ESP32 Zero-Code Platform - Setup Guide

## ขั้นตอนการติดตั้งง่ายๆ

### 1. สร้าง Neon Database
1. ไปที่ [neon.tech](https://neon.tech) และสมัครสมาชิก (ฟรี)
2. สร้าง Project ใหม่
3. คัดลอก Database URL

### 2. ตั้งค่า Environment Variables

#### สำหรับ Backend
สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/`:
```bash
# 🗄️ Database
DATABASE_URL="postgresql://username:password@your-endpoint.neon.tech/your-database?sslmode=require"

# 🔐 Authentication  
JWT_SECRET="your-super-secret-jwt-key-here"

# 🌐 Server (Optional)
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

#### สร้าง JWT Secret Key
```bash
# วิธีสร้าง JWT Secret (Linux/Mac)
openssl rand -base64 32

# หรือใช้ Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. เริ่มใช้งาน

#### ติดตั้งและเริ่มใช้งาน
```bash
# ติดตั้ง dependencies ทั้งหมด
npm run install

# ตั้งค่า database
npm run db:setup

# เริ่มเซิร์ฟเวอร์ (รันทั้ง backend และ frontend)
npm run dev
```

หรือเริ่มแยกกัน:
```bash
npm run server  # Backend (Terminal 1)
npm run client  # Frontend (Terminal 2)
```

### 4. Deploy บน Netlify

#### เพิ่ม Environment Variables ใน Netlify:
1. ไปที่ Netlify Dashboard → Site Settings → Environment Variables
2. เพิ่ม:
   - `DATABASE_URL`: ใส่ URL จาก Neon
   - `JWT_SECRET`: ใส่ JWT Secret ที่สร้างไว้
   
**หรือใช้ Neon Extension (แนะนำ):**
- ติดตั้ง Neon extension ใน Netlify
- มันจะตั้งค่า `NETLIFY_DATABASE_URL` และ `NETLIFY_DATABASE_URL_UNPOOLED` อัตโนมัติ

#### Deploy
```bash
git push origin main
```

Netlify จะ build และ deploy อัตโนมัติ!

---

## 🎯 เท่านี้เอง!

ระบบจะสร้าง:
- ✅ Database Tables อัตโนมัติ
- ✅ Admin User อัตโนมัติ (admin@esp32platform.com / admin123)
- ✅ พร้อมใช้งานทันที

## 📞 Support

หากมีปัญหา check:
1. Database URL ถูกต้องหรือไม่
2. JWT Secret ตั้งค่าแล้วหรือไม่
3. ดู Console logs สำหรับ error messages