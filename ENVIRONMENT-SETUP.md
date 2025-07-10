# Environment Setup Guide

This guide explains how to configure environment variables for the NestJS Quickstarter application.

## 📋 Quick Setup

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Configure Required Variables

**Essential Configuration:**

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/nestjs-quickstarter

# Security (Generate strong secrets!)
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-change-this-in-production

# Redis (Required for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 🔐 Security Configuration

### JWT Secrets

Generate strong, random secrets for production:

```bash
# Generate secure JWT secrets (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### OAuth Setup

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL:
   - `http://localhost:3000/auth/github/callback` (development)
   - `https://yourdomain.com/auth/github/callback` (production)

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 🗄️ Database Configuration

### MongoDB

```bash
# Local development
MONGODB_URI=mongodb://localhost:27017/nestjs-quickstarter

# MongoDB Atlas (production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nestjs-quickstarter

# With authentication
MONGODB_URI=mongodb://username:password@localhost:27017/nestjs-quickstarter
```

### Redis

```bash
# Local development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600

# Redis Cloud or production
REDIS_HOST=redis-12345.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## 🚀 Deployment Environments

### Development

```bash
NODE_ENV=development
PORT=3000
DEBUG=true
LOG_LEVEL=debug
```

### Production

```bash
NODE_ENV=production
PORT=8080
DEBUG=false
LOG_LEVEL=info
```

### Staging

```bash
NODE_ENV=staging
PORT=3000
DEBUG=false
LOG_LEVEL=warn
```

## 🔧 Service Dependencies

### Required Services

- **MongoDB**: Database storage
- **Redis**: Caching and session management

### Start Services (Development)

```bash
# MongoDB (if using local installation)
mongod

# Redis (if using local installation)
redis-server

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
docker run -d -p 6379:6379 --name redis redis:latest
```

## 📧 Email Configuration (Future)

For password reset and email verification:

```bash
# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
SMTP_FROM=noreply@yourdomain.com

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
```

## 📁 File Upload Configuration (Future)

```bash
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
```

## 🌐 CORS Configuration

```bash
# Development - allow multiple origins
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4200

# Production - restrict to your domain
FRONTEND_URL=https://yourdomain.com
```

## 📊 Monitoring & Analytics (Future)

```bash
# Error tracking
SENTRY_DSN=your-sentry-dsn

# Analytics
GOOGLE_ANALYTICS_ID=your-google-analytics-id

# AWS (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
```

## ✅ Environment Validation

The application validates environment variables on startup. Check the console for any missing or invalid configuration.

### Test Your Configuration

```bash
# Start the application
bun run start:dev

# Check the logs for:
# ✅ Database connection successful
# ✅ Redis connection successful
# ✅ Server running on port 3000
# ✅ Swagger available at /api/docs
```

## 🔍 Common Issues

### MongoDB Connection Failed

- Ensure MongoDB is running
- Check connection string format
- Verify database permissions

### Redis Connection Failed

- Ensure Redis server is running
- Check Redis host and port
- Verify Redis authentication if enabled

### OAuth Not Working

- Check client IDs and secrets
- Verify redirect URIs match exactly
- Ensure OAuth apps are enabled

### Build Failures

- Run `bun install` to ensure all dependencies
- Check TypeScript compilation errors
- Verify environment variable names

## 📝 Environment Files

- `.env` - Your local development configuration (never commit)
- `.env.example` - Template with example values (safe to commit)
- `.env.production` - Production configuration (never commit)
- `.env.staging` - Staging configuration (never commit)

## 🔒 Security Best Practices

1. **Never commit .env files** - Already in .gitignore
2. **Use strong, unique secrets** - Generate with crypto.randomBytes()
3. **Rotate secrets regularly** - Especially in production
4. **Use environment-specific configs** - Different secrets per environment
5. **Limit OAuth redirect URIs** - Only add necessary domains
6. **Use HTTPS in production** - Especially for OAuth callbacks

---

**Need help?** Check the main README.md or create an issue in the repository.
