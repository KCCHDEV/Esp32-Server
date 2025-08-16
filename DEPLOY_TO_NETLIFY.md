# 🚀 Deploy to Netlify in 3 Steps

## 1-Click Deploy Button
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/esp32-zero-code-platform)

## ⚡ Quick Setup (5 minutes)

### Step 1: Deploy to Netlify
1. Click the **"Deploy to Netlify"** button above
2. Connect your GitHub account
3. Choose a site name
4. Click **"Deploy site"**

### Step 2: Create Neon Database (Free)
1. Go to [Neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string

### Step 3: Set Environment Variables
Go to your Netlify site → **Site Settings** → **Environment Variables** and add:

| Variable | Value | How to Get |
|----------|-------|------------|
| `NETLIFY_DATABASE_URL` | `postgresql://...` | Copy from Neon Dashboard |
| `JWT_SECRET` | Random string | Generate below ⬇️ |
| `JWT_EXPIRE` | `7d` | Type manually |
| `NODE_ENV` | `production` | Type manually |

#### Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Or use: https://generate-secret.vercel.app/32

### Step 4: Auto-Setup
1. **Redeploy** your site (trigger new deploy)
2. Wait for build to complete
3. Visit: `https://your-site.netlify.app/auto-setup`
4. **Save the admin credentials** shown!

## 🎉 Done! Your Platform is Ready

- ✅ **Login**: Use the admin credentials from auto-setup
- ✅ **Dashboard**: Manage users, devices, projects
- ✅ **API**: All endpoints working
- ✅ **Database**: Connected and configured

## 📋 Environment Variables Explained

### Required (4 variables):
```env
NETLIFY_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your_super_secure_random_string_32_chars_plus
JWT_EXPIRE=7d
NODE_ENV=production
```

### How to Get Neon Database URL:
1. Login to [Neon.tech](https://neon.tech)
2. Create new project
3. Go to **Dashboard** → **Connection Details**
4. Copy **Connection String**
5. Use the "Pooled connection" URL

## 🔧 Troubleshooting

### If auto-setup fails:
1. Check environment variables are set correctly
2. Visit `/env-check` to validate configuration
3. Visit `/connection-test` to test database
4. Check Netlify Function logs for errors

### Common Issues:
- **"Missing environment variables"** → Add all 4 variables in Netlify
- **"Database connection failed"** → Check Neon database URL
- **"Database schema not ready"** → Run `npx prisma db push` locally

### Test Endpoints:
- `/env-check` - Validate environment
- `/connection-test` - Test database connection
- `/health` - System health check
- `/auto-setup` - Complete setup process

## 🌟 Features Included

- ✅ **User Management** - Registration, login, roles
- ✅ **Device Management** - ESP32 device registration
- ✅ **Project Management** - IoT project creation
- ✅ **Admin Dashboard** - Complete admin interface
- ✅ **API Authentication** - JWT-based security
- ✅ **Database Integration** - PostgreSQL with Prisma
- ✅ **Real-time Features** - WebSocket support (disabled in serverless)
- ✅ **Responsive UI** - Works on all devices

## 🔄 Updates & Maintenance

### To update your deployment:
1. Push changes to your GitHub repository
2. Netlify will auto-deploy
3. Visit `/auto-setup` if needed after major updates

### Backup your data:
- Export data from Neon Dashboard
- Or use the built-in backup endpoints

## 📞 Support

If you need help:
1. Check the troubleshooting section above
2. Visit the diagnostic endpoints for detailed error info
3. Check Netlify Function logs
4. Review the full documentation in the repository

---

**That's it! 🎉 Your ESP32 Zero-Code Platform is ready to use!**