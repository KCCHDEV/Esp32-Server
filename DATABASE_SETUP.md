# 🗄️ Database Setup Guide

This guide will help you set up your Neon PostgreSQL database for the ESP32 Zero Code Platform.

## 🚀 Quick Setup (Automatic)

### Method 1: Web Interface Setup

1. Visit your deployed application
2. Go to the registration page
3. If database is not setup, you'll see a "Setup Database" button
4. Click it and wait for automatic setup
5. Once complete, you can register your first user

### Method 2: API Endpoint

```bash
# Call the setup endpoint directly
curl -X POST https://your-app.netlify.app/api/auth/setup-database

# Or locally
curl -X POST http://localhost:3001/api/auth/setup-database
```

## 🛠️ Manual Setup

### Method 3: Migration Script

```bash
# From the backend directory
cd backend
npm run db:setup

# Or directly
node scripts/migrate.js
```

### Method 4: Prisma Commands

```bash
# From the backend directory
cd backend

# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Manually create admin user (optional)
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const password = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@esp32platform.com',
      password,
      role: 'ADMIN',
      subscription: 'PREMIUM',
      emailVerified: true,
      isActive: true
    }
  });
  console.log('Admin created:', admin.email);
  process.exit(0);
}

createAdmin().catch(console.error);
"
```

## 📋 Environment Variables

Make sure you have the correct environment variables set:

### For Development (.env)
```bash
DATABASE_URL="postgresql://user:pass@your-neon-host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:pass@your-neon-host/dbname?sslmode=require"
```

### For Netlify Production
```bash
# These are automatically provided by Neon extension
NETLIFY_DATABASE_URL="postgresql://user:pass@your-neon-host/dbname?sslmode=require"
NETLIFY_DATABASE_URL_UNPOOLED="postgresql://user:pass@your-neon-host/dbname?sslmode=require"

# Required for JWT
JWT_SECRET="your-secret-key"
NODE_ENV="production"
```

## 🔧 Neon Database Setup

### 1. Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project

### 2. Get Connection String
1. In your Neon dashboard, go to your project
2. Navigate to "Connection Details"
3. Copy the connection string
4. It should look like:
   ```
   postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### 3. Configure Environment
- **Development**: Add to `.env` file
- **Netlify**: Add to Site Settings → Environment Variables

## 📊 Database Schema

The database will include these tables:

- **users** - User accounts and authentication
- **devices** - ESP32 device registrations
- **projects** - User projects and configurations
- **sensors** - Device sensor configurations
- **sensor_data** - Historical sensor readings
- **project_shares** - Project sharing permissions

## 👤 Default Admin User

After setup, you'll have an admin user:

- **Email**: `admin@esp32platform.com`
- **Password**: `admin123`
- **Role**: ADMIN
- **Subscription**: PREMIUM

⚠️ **Important**: Change the admin password after first login!

## 🔍 Troubleshooting

### Common Issues

#### "Registration failed" Error
- Database tables don't exist
- **Solution**: Run database setup using any method above

#### "Cannot find module" Errors
- Missing dependencies
- **Solution**: Run `npm install` in backend directory

#### Connection Timeout
- Invalid database URL
- **Solution**: Check your Neon connection string

#### Permission Denied
- Database user lacks permissions
- **Solution**: Ensure your Neon user has full access

### Debug Commands

```bash
# Check database connection
npx prisma db pull

# View database schema
npx prisma studio

# Reset database (⚠️ DESTRUCTIVE)
npx prisma db push --force-reset

# Check environment variables
echo $DATABASE_URL
echo $NETLIFY_DATABASE_URL
```

## 📞 Support

If you're still having issues:

1. Check the server logs for specific error messages
2. Verify your Neon database is active
3. Ensure environment variables are correctly set
4. Try the manual setup method
5. Contact support with error details

## 🔄 Database Updates

To update your database schema in the future:

```bash
# 1. Update prisma/schema.prisma
# 2. Push changes
npx prisma db push

# 3. Regenerate client
npx prisma generate
```

For production deployments, database changes are applied automatically during the build process.