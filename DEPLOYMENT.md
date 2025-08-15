# 🚀 ESP32 Zero Code Platform - Deployment Guide

This guide will walk you through deploying the ESP32 Zero Code Platform to **Netlify** with **Neon PostgreSQL** database.

## 📋 Prerequisites

- **GitHub Account** (for code repository)
- **Netlify Account** (free tier available)
- **Neon Database Account** (free tier available)
- **Node.js 18+** installed locally

## 🗄️ Step 1: Set Up Neon Database

### 1.1 Create Neon Database
1. Go to [neon.tech](https://neon.tech)
2. Sign up or log in
3. Create a new project
4. Choose **PostgreSQL 15+**
5. Select region closest to your users
6. Note down the connection details

### 1.2 Get Database URLs
In your Neon dashboard:
1. Go to **Dashboard** → **Connection Details**
2. Copy the **Connection String** (this will be your `DATABASE_URL`)
3. Copy the **Direct Connection String** (this will be your `DIRECT_URL`)

Example format:
```
DATABASE_URL="postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

## 🔧 Step 2: Prepare Your Code

### 2.1 Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: ESP32 Zero Code Platform"
git branch -M main
git remote add origin https://github.com/yourusername/esp32-zero-code-platform.git
git push -u origin main
```

### 2.2 Install Dependencies
```bash
npm run install-all
```

### 2.3 Set Up Database Schema
```bash
# Set your database URL in backend/.env
echo "DATABASE_URL=your_neon_database_url" >> backend/.env
echo "DIRECT_URL=your_neon_direct_url" >> backend/.env

# Generate Prisma client and push schema
cd backend
npm run db:push

# Seed the database with initial data
npm run db:seed
```

## 🌐 Step 3: Deploy to Netlify

### 3.1 Connect Repository
1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and select your repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
   - **Functions directory**: `netlify/functions`

### 3.2 Environment Variables
In Netlify dashboard, go to **Site settings** → **Environment variables** and add:

#### Required Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# Environment
NODE_ENV=production
NETLIFY=true

# CORS (replace with your actual Netlify domain)
CORS_ORIGIN_PROD=https://your-app-name.netlify.app
CORS_ORIGIN=http://localhost:3000

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_admin_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Optional Variables (for premium features)
```bash
# Stripe (for premium subscriptions)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 3.3 Deploy
1. Click **"Deploy site"**
2. Wait for build to complete (~5-10 minutes)
3. Your site will be available at `https://your-app-name.netlify.app`

## 🔧 Step 4: Configure Custom Domain (Optional)

### 4.1 Add Custom Domain
1. In Netlify dashboard, go to **Domain settings**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `esp32platform.com`)
4. Follow DNS configuration instructions

### 4.2 Enable HTTPS
1. Netlify automatically provides SSL certificates
2. Update your environment variables:
   ```bash
   CORS_ORIGIN_PROD=https://yourdomain.com
   ```

## 📱 Step 5: Update ESP32 Firmware

Update the firmware to use your production server:

```cpp
// In esp32_zero_code.ino, update the server URL
String serverUrl = "https://your-app-name.netlify.app";

// Or in the configuration portal default value
<input type="text" id="server" name="server" value="https://your-app-name.netlify.app" placeholder="Server URL" required>
```

## ✅ Step 6: Verification

### 6.1 Test the Platform
1. Visit your deployed site
2. Register a new account
3. Log in to the dashboard
4. Try creating a device (you'll get an API key)

### 6.2 Test ESP32 Connection
1. Flash the updated firmware to your ESP32
2. Enter configuration mode (hold BOOT button)
3. Connect to ESP32 WiFi network
4. Configure with your production server URL and API key
5. Verify device appears online in your dashboard

### 6.3 Test API Endpoints
```bash
# Health check
curl https://your-app-name.netlify.app/api/health

# Should return:
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

## 🔍 Step 7: Monitoring & Maintenance

### 7.1 Netlify Functions Logs
- Go to **Functions** tab in Netlify dashboard
- Monitor function execution and errors
- Check for timeout issues (15-second limit)

### 7.2 Database Monitoring
- Monitor Neon database usage in dashboard
- Check connection limits and performance
- Set up alerts for high usage

### 7.3 Performance Optimization
```bash
# Enable build optimizations in netlify.toml
[build]
  command = "npm run build"
  environment = { NODE_ENV = "production" }

# Function-specific optimizations
[functions]
  node_bundler = "esbuild"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Fails
```bash
# Check build logs in Netlify dashboard
# Common fixes:

# Ensure all dependencies are installed
npm run install-all

# Check Node.js version
node --version  # Should be 18+

# Verify environment variables are set
```

#### 2. Database Connection Issues
```bash
# Test connection locally
cd backend
npm run db:generate
npm run db:push

# Check database URL format
# Ensure SSL mode is required: ?sslmode=require
```

#### 3. Function Timeout
```bash
# Netlify Functions have 10-second timeout
# For longer operations, consider:
# - Background jobs
# - Webhook patterns
# - Client-side processing
```

#### 4. CORS Issues
```bash
# Ensure CORS_ORIGIN_PROD matches your domain exactly
# Check for trailing slashes
# Verify protocol (http vs https)
```

#### 5. ESP32 Can't Connect
```bash
# Check server URL format
# Ensure API key is valid
# Verify device is active in database
# Check firewall/security groups
```

## 🔄 Continuous Deployment

### Auto-Deploy on Push
Netlify automatically deploys on every push to main branch.

### Manual Deploy
```bash
# Deploy specific branch
netlify deploy --prod --dir=frontend/build

# Deploy with custom message
git commit -m "fix: update ESP32 firmware URL"
git push origin main
```

## 📊 Performance Optimization

### Frontend Optimization
```bash
# Optimize bundle size
npm run build:frontend

# Enable compression in netlify.toml
[[headers]]
  for = "*.js"
  [headers.values]
    Content-Encoding = "gzip"
```

### Database Optimization
```sql
-- Add indexes for better performance
-- These are already included in schema.prisma

-- Monitor slow queries in Neon dashboard
-- Consider read replicas for high traffic
```

### Caching Strategy
```javascript
// Add caching headers for static assets
[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## 🔒 Security Checklist

- ✅ **Environment Variables**: All secrets stored securely in Netlify
- ✅ **Database**: SSL connections enforced
- ✅ **JWT**: Strong secret key (32+ characters)
- ✅ **CORS**: Restricted to your domain
- ✅ **Rate Limiting**: Enabled for API endpoints
- ✅ **HTTPS**: Enforced via Netlify
- ✅ **Headers**: Security headers configured

## 💰 Cost Considerations

### Netlify (Free Tier)
- 100GB bandwidth/month
- 300 build minutes/month
- 125,000 function invocations/month

### Neon Database (Free Tier)
- 0.5GB storage
- 1 database
- No connection pooling

### Scaling Up
When you exceed free tiers:
- **Netlify Pro**: $19/month
- **Neon Pro**: $19/month
- Consider upgrading based on actual usage

## 📈 Monitoring & Analytics

### Netlify Analytics
- Enable in site settings
- Track page views and performance
- Monitor function usage

### Custom Monitoring
```javascript
// Add error tracking
// Consider services like:
// - Sentry for error tracking
// - LogRocket for user sessions
// - Google Analytics for usage
```

## 🆘 Support

If you encounter issues:

1. **Check Netlify Build Logs**: Detailed error messages
2. **Neon Dashboard**: Database connection status
3. **GitHub Issues**: Community support
4. **Documentation**: Refer to this guide

## 🎉 Success!

Your ESP32 Zero Code Platform is now live! Users can:
- ✅ Register and manage accounts
- ✅ Add ESP32 devices via WiFi portal
- ✅ Create zero-code projects
- ✅ Monitor devices in real-time
- ✅ Deploy to production-ready infrastructure

**Your platform is ready for the IoT community! 🚀**