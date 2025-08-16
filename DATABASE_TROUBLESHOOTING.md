# 🔧 Database & Login Troubleshooting Guide

## 🚨 **Current Issues**
- ❌ "Database setup failed"
- ❌ "Login failed"

## 🔍 **Step-by-Step Diagnosis**

### **Step 1: Check Environment Variables**
```bash
curl https://your-app.netlify.app/debug
```

**Expected Response:**
```json
{
  "success": true,
  "environment": {
    "hasDatabase": true,
    "hasJWT": true,
    "NETLIFY": "true"
  }
}
```

**❌ If `hasDatabase: false`:**
- Go to Netlify Dashboard → Site Settings → Environment Variables
- Add: `NETLIFY_DATABASE_URL=your_neon_connection_string`

**❌ If `hasJWT: false`:**
- Add: `JWT_SECRET=your_secure_jwt_secret`

### **Step 2: Test Database Connection**
```bash
curl https://your-app.netlify.app/health
```

**Expected Response:**
```json
{
  "success": true,
  "database": {
    "status": "connected",
    "error": null
  }
}
```

**❌ If `status: "disconnected"`:**
- Check your Neon database URL
- Ensure database is not sleeping (Neon free tier)
- Verify connection string format

### **Step 3: Database Setup & Schema Check**
```bash
# Check schema (GET request)
curl https://your-app.netlify.app/setup

# Setup admin user (POST request)
curl -X POST https://your-app.netlify.app/setup
```

**Expected Response:**
```json
{
  "success": true,
  "results": {
    "connection": true,
    "schema": true,
    "admin": true
  },
  "adminCredentials": {
    "email": "admin@esp32platform.com",
    "password": "generated_password"
  }
}
```

**❌ If `schema: false`:**
Database tables don't exist. **Fix:**
1. Go to your local project
2. Run: `cd backend && npx prisma db push`
3. Or manually create tables in Neon dashboard

### **Step 4: Test Authentication**
```bash
curl -X POST https://your-app.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@esp32platform.com","password":"YOUR_ADMIN_PASSWORD"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "admin@esp32platform.com",
      "username": "admin",
      "role": "ADMIN"
    }
  }
}
```

## 🛠️ **Common Solutions**

### **Problem: Missing Environment Variables**
**Fix in Netlify Dashboard:**
1. Go to Site Settings → Environment Variables
2. Add required variables:
   ```
   NETLIFY_DATABASE_URL = your_neon_connection_string
   JWT_SECRET = your_secure_secret
   JWT_EXPIRE = 7d
   NODE_ENV = production
   ```

### **Problem: Database Schema Missing**
**Option 1 - Local Push:**
```bash
cd backend
export NETLIFY_DATABASE_URL="your_connection_string"
npx prisma db push
```

**Option 2 - Manual SQL (in Neon Dashboard):**
```sql
-- Run the schema creation SQL from schema.prisma
-- This creates all required tables
```

### **Problem: Wrong User Schema**
The User model requires `username` (not `name`). Make sure:
- Login uses `email` + `password`
- Registration uses `username` + `email` + `password`

### **Problem: Database Connection Issues**
**Check Neon Database:**
1. Database not sleeping (free tier sleeps after inactivity)
2. Connection string format: `postgresql://user:pass@host/db?sslmode=require`
3. IP restrictions (if any)

## 🧪 **Testing Sequence**

Run these in order after deployment:

```bash
# 1. Environment check
curl https://your-app.netlify.app/debug

# 2. Database health
curl https://your-app.netlify.app/health

# 3. Database setup
curl -X POST https://your-app.netlify.app/setup

# 4. Login test
curl -X POST https://your-app.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@esp32platform.com","password":"ADMIN_PASSWORD_FROM_SETUP"}'
```

## 📋 **Required Environment Variables**

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NETLIFY_DATABASE_URL` | ✅ | Neon PostgreSQL connection | `postgresql://...` |
| `JWT_SECRET` | ✅ | JWT signing secret | Random 32+ char string |
| `JWT_EXPIRE` | ⚠️ | Token expiration | `7d` |
| `NODE_ENV` | ⚠️ | Environment mode | `production` |

## 🔧 **Generate Secure Secrets**

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use online generator
# https://generate-secret.vercel.app/32
```

## 📁 **New API Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/debug` | GET | Environment debugging |
| `/health` | GET | Database health check |
| `/setup` | GET/POST | Database setup & admin creation |
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | User registration |

## 🚀 **Quick Fix Checklist**

- [ ] Environment variables set in Netlify
- [ ] Database connection working (`/health`)
- [ ] Database schema exists (`/setup`)
- [ ] Admin user created (`/setup` POST)
- [ ] Login test successful

**If all above pass, frontend login should work!** 🎉

## 📞 **Still Having Issues?**

1. **Check Netlify Function Logs:**
   - Netlify Dashboard → Functions → View logs

2. **Browser Console Errors:**
   - Open DevTools → Console tab
   - Check Network tab for failed requests

3. **Database Directly:**
   - Login to Neon dashboard
   - Check if tables exist
   - Verify user records

The new architecture with dedicated functions should resolve both "Database setup failed" and "Login failed" errors! 🔧