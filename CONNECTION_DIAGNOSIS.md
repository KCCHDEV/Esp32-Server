# 🔍 Database Connection Diagnosis Guide

## 🚨 **Current Issue: "Database connection failed"**

This guide will help you systematically diagnose and fix the database connection issue.

## 🛠️ **Step-by-Step Diagnosis**

### **Step 1: Check Environment Variables**
```bash
curl https://your-app.netlify.app/env-check
```

**Look for:**
- ✅ `NETLIFY_DATABASE_URL.exists: true`
- ✅ `JWT_SECRET.exists: true`
- ❌ Any issues in the `validation.issues` array

**If environment variables are missing:**
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add the missing variables:
   ```
   NETLIFY_DATABASE_URL = postgresql://username:password@host:port/database?sslmode=require
   JWT_SECRET = your_secure_random_string
   ```

### **Step 2: Test Raw Database Connection**
```bash
curl https://your-app.netlify.app/connection-test
```

**Expected Response (Success):**
```json
{
  "success": true,
  "tests": {
    "rawConnection": {
      "connected": true,
      "query": true
    },
    "prismaConnection": {
      "connected": true
    }
  }
}
```

**Expected Response (Failure):**
```json
{
  "success": false,
  "tests": {
    "rawConnection": {
      "connected": false,
      "error": "connection error details"
    }
  },
  "troubleshooting": {
    "nextSteps": [
      "Check NETLIFY_DATABASE_URL in Netlify dashboard",
      "Verify Neon database is not sleeping"
    ]
  }
}
```

### **Step 3: Verify Connection String Format**

**Correct Format:**
```
postgresql://username:password@hostname:port/database?sslmode=require
```

**Common Issues:**
- ❌ Missing `sslmode=require` for cloud databases
- ❌ Wrong protocol (`postgres://` vs `postgresql://`)
- ❌ Missing password or username
- ❌ Wrong port (should be 5432 for PostgreSQL)

## 🔧 **Common Connection Problems & Solutions**

### **Problem 1: Environment Variable Not Set**
**Symptoms:**
- `env-check` shows `NETLIFY_DATABASE_URL.exists: false`

**Solution:**
1. Go to Netlify Dashboard
2. Site Settings → Environment Variables
3. Add: `NETLIFY_DATABASE_URL` with your Neon connection string

### **Problem 2: Neon Database Sleeping**
**Symptoms:**
- Connection timeout errors
- `connection-test` shows connection failed

**Solution:**
1. Go to Neon Dashboard
2. Check if database is in "Sleep" state
3. Wake up the database by accessing it
4. Consider upgrading to paid plan for always-on

### **Problem 3: Wrong Connection String Format**
**Symptoms:**
- `env-check` shows `database.valid: false`
- URL parsing errors

**Solution:**
```bash
# Get connection string from Neon Dashboard
# Format should be:
postgresql://[username]:[password]@[hostname]/[database]?sslmode=require
```

### **Problem 4: SSL/TLS Issues**
**Symptoms:**
- SSL negotiation errors
- Certificate verification failures

**Solution:**
- Ensure connection string includes `?sslmode=require`
- For self-signed certificates, use `?sslmode=require&sslcert=false`

### **Problem 5: Network/Firewall Issues**
**Symptoms:**
- Connection timeouts
- Network unreachable errors

**Solution:**
- Check if Neon has IP restrictions
- Verify Netlify Functions can access external databases
- Test connection from different environment

## 📋 **Connection String Examples**

### **Neon (Recommended)**
```
postgresql://username:password@ep-example-123456.us-east-1.aws.neon.tech/database?sslmode=require
```

### **Supabase**
```
postgresql://postgres.project-ref.supabase.co:5432/postgres?password=password&sslmode=require
```

### **Railway**
```
postgresql://postgres:password@containers.railway.app:port/database?sslmode=require
```

## 🧪 **Full Testing Sequence**

Run these tests in order after deployment:

```bash
# 1. Environment validation
curl https://your-app.netlify.app/env-check

# 2. Raw connection test
curl https://your-app.netlify.app/connection-test

# 3. Health check
curl https://your-app.netlify.app/health

# 4. Database setup
curl -X POST https://your-app.netlify.app/setup

# 5. Login test
curl -X POST https://your-app.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@esp32platform.com","password":"GENERATED_PASSWORD"}'
```

## 🔍 **Debugging Commands**

### **Generate Secure JWT Secret**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### **Test Connection String Locally**
```bash
# Install pg client
npm install pg

# Test connection
node -e "
const { Client } = require('pg');
const client = new Client('YOUR_CONNECTION_STRING');
client.connect()
  .then(() => console.log('✅ Connection successful'))
  .catch(err => console.error('❌ Connection failed:', err.message))
  .finally(() => client.end());
"
```

### **Check Neon Database Status**
1. Login to Neon Dashboard
2. Check database status (Active/Sleep)
3. View connection details
4. Test connection from dashboard

## 📞 **Next Steps Based on Results**

### **✅ If connection-test passes:**
- Database connection is working
- Proceed to test schema with `/setup`
- Test login functionality

### **❌ If connection-test fails:**
1. Check environment variables with `/env-check`
2. Verify Neon database is active
3. Validate connection string format
4. Check Netlify Function logs for detailed errors

### **🔄 If intermittent failures:**
- Database might be sleeping (Neon free tier)
- Consider connection pooling
- Check for rate limits

The new diagnostic tools will help identify exactly where the connection is failing! 🔧