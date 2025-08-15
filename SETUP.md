# 🚀 ESP32 Zero-Code Platform - Setup Guide

## ขั้นตอนการติดตั้งง่ายๆ (เพียง 4 ตัวแปร!)

### 1. สร้าง Neon Database
1. ไปที่ [neon.tech](https://neon.tech) และสมัครสมาชิก (ฟรี)
2. สร้าง Project ใหม่
3. คัดลอก Database URL (ทั้ง pooled และ unpooled)

### 2. ตั้งค่า Environment Variables

#### สำหรับ Backend
สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/`:
```bash
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRE="7d"
NETLIFY_DATABASE_URL="postgresql://username:password@your-endpoint.neon.tech/your-database?sslmode=require"
NETLIFY_DATABASE_URL_UNPOOLED="postgresql://username:password@your-endpoint.neon.tech/your-database?sslmode=require"
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
2. เพิ่ม **เพียง 4 ตัวแปรนี้**:
   - `JWT_SECRET`: ใส่ JWT Secret ที่สร้างไว้
   - `JWT_EXPIRE`: ใส่ "7d"
   - `NETLIFY_DATABASE_URL`: ใส่ URL จาก Neon (pooled)
   - `NETLIFY_DATABASE_URL_UNPOOLED`: ใส่ URL จาก Neon (unpooled)
   
**หรือใช้ Neon Extension (แนะนำ):**
- ติดตั้ง Neon extension ใน Netlify
- มันจะตั้งค่า `NETLIFY_DATABASE_URL*` อัตโนมัติ
- ต้องตั้งแค่ `JWT_SECRET` และ `JWT_EXPIRE` เอง

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

## 📝 Environment Variables ทั้งหมด (แค่ 4 ตัว!)

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret สำหรับ JWT tokens | `"abc123xyz..."` |
| `JWT_EXPIRE` | ระยะเวลา JWT หมดอายุ | `"7d"` |
| `NETLIFY_DATABASE_URL` | Neon Database URL (pooled) | `"postgresql://user:pass@..."` |
| `NETLIFY_DATABASE_URL_UNPOOLED` | Neon Database URL (unpooled) | `"postgresql://user:pass@..."` |

## 📞 Support

หากมีปัญหา check:
1. Environment variables ครบ 4 ตัวหรือไม่
2. Database URLs ถูกต้องหรือไม่
3. JWT Secret มีความยาวเพียงพอหรือไม่
4. ดู Console logs สำหรับ error messages