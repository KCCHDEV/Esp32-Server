# 🚨 Quick Fix: 503 Service Unavailable Error

## **The Problem**
`GET /api/auth/database-status 503 (Service Unavailable)` means the environment variables are not set in your Netlify deployment.

## ⚡ **Quick Fix (2 minutes)**

### **Step 1: Visit Status Page**
Go to: **`https://your-app.netlify.app/status`**

This will show you exactly what's missing!

### **Step 2: Add Environment Variables**
1. Go to **Netlify Dashboard** → Your Site → **Site Settings** → **Environment Variables**
2. Add these 4 variables:

| Variable | Value | How to Get |
|----------|-------|------------|
| `NETLIFY_DATABASE_URL` | `postgresql://...` | Copy from Neon.tech dashboard |
| `JWT_SECRET` | Random 32+ chars | Generate below ⬇️ |
| `JWT_EXPIRE` | `7d` | Type manually |
| `NODE_ENV` | `production` | Type manually |

### **Step 3: Generate JWT Secret**
**Option A:** Run this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option B:** Use online generator: https://generate-secret.vercel.app/32

### **Step 4: Get Database URL**
1. Go to [Neon.tech](https://neon.tech) (free)
2. Create new project
3. Dashboard → **Connection Details** 
4. Copy **"Pooled connection"** string
5. Should look like: `postgresql://username:password@host/db?sslmode=require`

### **Step 5: Redeploy**
1. **Save** all environment variables
2. Go to **Deploys** tab in Netlify
3. Click **"Trigger deploy"** → **"Deploy site"**
4. Wait for build to complete

## 🧪 **Test After Fix**

### **1. Check Status Page**
Visit: `https://your-app.netlify.app/status`
- Should show: ✅ Environment Variables: All set
- Should show: ✅ Database Connection: Connected

### **2. Test Database Status**
Visit: `https://your-app.netlify.app/api/auth/database-status`
- Should return JSON with `"success": true`

### **3. Complete Setup**
Visit: `https://your-app.netlify.app/auto-setup`
- Should create admin user and give you credentials

## 🎯 **Common Issues**

### **Issue: Database URL Wrong Format**
❌ Wrong: `postgres://...`  
✅ Correct: `postgresql://...?sslmode=require`

### **Issue: Neon Database Sleeping**
- Go to Neon Dashboard
- Check if database status is "Sleep"
- Click to wake it up

### **Issue: Variables Not Saving**
- Make sure to click **"Save"** after adding each variable
- Check there are no extra spaces in values
- Redeploy after adding all variables

## 🆘 **If Still Not Working**

### **Check Logs:**
1. Netlify Dashboard → **Functions** → **View logs**
2. Look for specific error messages

### **Diagnostic Endpoints:**
- `/status` - Visual status page with setup instructions
- `/env-check` - Detailed environment validation (JSON)
- `/connection-test` - Database connection testing (JSON)
- `/health` - System health monitoring (JSON)

### **Most Likely Cause:**
The 503 error means **environment variables are missing**. The status page will tell you exactly which ones!

---

**After setting the 4 environment variables and redeploying, the 503 error should be resolved!** 🚀