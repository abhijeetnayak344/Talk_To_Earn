# 🚀 Vercel Deployment Guide

## Overview

This guide explains how to deploy Talk to Earn on Vercel as serverless functions.

## Architecture Changes for Vercel

### What Changed

**From:** Microservices with Docker
**To:** Serverless Functions on Vercel

```
Before (Docker):
- 6 separate Node.js/Python services
- Long-running processes
- WebSocket support
- Kafka event streaming

After (Vercel):
- Serverless API routes
- Stateless functions
- External database (Vercel Postgres/Neon/Supabase)
- API-only (no WebSocket in basic plan)
```

### Folder Structure

```
talk-to-earn/
├── api/                          # Serverless functions
│   ├── index.js                 # Main entry point
│   ├── auth/
│   │   └── index.js            # Auth endpoints
│   ├── users/
│   │   └── index.js            # User endpoints
│   ├── rewards/
│   │   └── index.js            # Rewards endpoints
│   └── messages/
│       └── index.js            # Messages endpoints
├── lib/                         # Shared utilities
│   ├── db.js                   # Database connection
│   └── auth.js                 # Auth middleware
├── vercel.json                 # Vercel configuration
└── package.json                # Dependencies
```

## Prerequisites

1. **Vercel Account** (free tier works)
2. **PostgreSQL Database** - Choose one:
   - Vercel Postgres (recommended)
   - Neon (free tier available)
   - Supabase (free tier available)
   - Any other PostgreSQL provider

3. **GitHub Account** (for deployment)

## Setup Steps

### Step 1: Create Database

#### Option A: Vercel Postgres (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Storage" → "Create Database"
3. Select "Postgres"
4. Note the connection string

#### Option B: Neon (Free)

1. Go to [Neon](https://neon.tech)
2. Create account
3. Create new project
4. Copy connection string

#### Option C: Supabase (Free)

1. Go to [Supabase](https://supabase.com)
2. Create project
3. Get database URL from Settings → Database

### Step 2: Run Database Migrations

```bash
# Install dependencies
npm install

# Set database URL
$env:DATABASE_URL="your_connection_string"

# Run migrations
cd services/auth-service
npm install
node src/database/migrate.js

# Seed test data (optional)
node src/database/seed.js
```

### Step 3: Deploy to Vercel

#### Option A: Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts to configure your project
```

#### Option B: Deploy via GitHub

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/talk-to-earn.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   
   Add these in Vercel Dashboard → Settings → Environment Variables:
   
   ```
   DATABASE_URL = your_postgresql_connection_string
   JWT_SECRET = your_random_secret_key
   JWT_REFRESH_SECRET = your_random_refresh_secret
   NODE_ENV = production
   ```

4. **Deploy**
   - Vercel will automatically deploy
   - Wait for deployment to complete

### Step 4: Test Your Deployment

```bash
# Get your deployment URL from Vercel
# Example: https://talk-to-earn.vercel.app

# Test health endpoint
curl https://your-app.vercel.app/api

# Test registration
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "display_name": "Test User"
  }'

# Test login
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "Test123!"
  }'
```

## API Endpoints

Base URL: `https://your-app.vercel.app`

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/verify` - Verify token

### Users
- `GET /api/users/:userId` - Get profile
- `PUT /api/users/:userId` - Update profile
- `GET /api/users/search?q=query` - Search users
- `POST /api/users/:userId/block` - Block user
- `DELETE /api/users/:userId/block` - Unblock user

### Rewards
- `GET /api/rewards/balance` - Get points balance
- `GET /api/rewards/transactions` - Get transaction history
- `GET /api/rewards` - Get available rewards

## Limitations on Vercel

### Free Tier Limits
- **Function Duration**: 10 seconds (hobby), 60 seconds (pro)
- **Bandwidth**: 100 GB/month (hobby)
- **Functions**: Unlimited
- **Builds**: 100 hours/month

### What's Not Included (vs Docker Version)

❌ **WebSocket support** (requires Pro plan + custom setup)
❌ **Kafka event streaming** (use webhooks or external service)
❌ **Redis caching** (use Upstash Redis or Vercel KV)
❌ **Background jobs** (use Vercel Cron or external service)
❌ **Engagement service** (Python - needs separate deployment)

### Workarounds

1. **Real-time Chat**
   - Use Pusher, Ably, or Socket.io with serverless
   - Or deploy WebSocket server separately (Railway, Render)

2. **Background Processing**
   - Use Vercel Cron for scheduled tasks
   - Use webhooks for event processing
   - Deploy worker separately (Railway, Render)

3. **Engagement Service (Python)**
   - Deploy to Vercel as Python serverless function
   - Or use Railway, Render for continuous Python service

4. **Redis**
   - Use [Upstash Redis](https://upstash.com) (free tier)
   - Add to Vercel integrations

## Advanced: Add Upstash Redis

```bash
# Install Upstash Redis integration in Vercel
# Or manually add environment variable:

REDIS_URL=redis://default:password@your-upstash-endpoint.upstash.io:6379
```

Update `lib/db.js` to use Redis for caching.

## Advanced: Deploy Engagement Service

Create `api/engagement/index.py`:

```python
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Engagement analysis logic
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "success": True,
            "engagement_score": 0.75,
            "points_awarded": 2
        }
        
        self.wfile.write(json.dumps(response).encode())
```

## Monitoring

### View Logs
```bash
vercel logs
```

### View Analytics
- Vercel Dashboard → Your Project → Analytics

### Set Up Alerts
- Vercel Dashboard → Your Project → Settings → Notifications

## Continuous Deployment

Every push to `main` branch automatically deploys:

```bash
git add .
git commit -m "Update API"
git push origin main

# Vercel automatically deploys
```

## Custom Domain

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Update DNS records as shown
4. Wait for SSL certificate

## Environment Variables Management

```bash
# Add via CLI
vercel env add DATABASE_URL production

# Add via Dashboard
# Vercel → Project → Settings → Environment Variables

# Pull environment variables
vercel env pull
```

## Cost Estimation

### Free Tier (Hobby)
- ✅ Perfect for development and small projects
- ✅ 100 GB bandwidth
- ✅ Unlimited API requests
- ✅ SSL included

### Pro Tier ($20/month)
- ✅ WebSocket support
- ✅ 60s function duration
- ✅ 1 TB bandwidth
- ✅ Analytics
- ✅ Password protection

## Troubleshooting

### "Module not found" Error
```bash
# Ensure all dependencies in package.json
npm install --save missing-package
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push
```

### Database Connection Issues
```bash
# Check connection string format
# PostgreSQL: postgresql://user:pass@host:5432/db
# Add ?sslmode=require if needed
```

### CORS Errors
- Ensure CORS headers are set in each API file
- Check vercel.json configuration

### Cold Starts
- First request may be slow (cold start)
- Subsequent requests are fast
- Pro plan has faster cold starts

## Migration from Docker to Vercel

If you want both Docker (development) and Vercel (production):

```
Development (Local):
- Use docker-compose.yml
- Full microservices
- WebSocket support
- Kafka streaming

Production (Vercel):
- Use serverless functions
- External database
- API-only or use external services for real-time
```

## Complete Checklist

- [ ] Create PostgreSQL database
- [ ] Run migrations
- [ ] Push code to GitHub
- [ ] Connect repository to Vercel
- [ ] Add environment variables
- [ ] Deploy
- [ ] Test all endpoints
- [ ] (Optional) Add custom domain
- [ ] (Optional) Set up monitoring

## Next Steps

1. **Add Frontend**: Deploy React/Next.js app separately
2. **Add Redis**: Use Upstash for caching
3. **Add Real-time**: Use Pusher or deploy WebSocket server
4. **Add Monitoring**: Use Sentry or LogRocket
5. **Add Analytics**: Use PostHog or Mixpanel

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Discord](https://vercel.com/discord)
- [GitHub Issues](https://github.com/yourusername/talk-to-earn/issues)

---

**Status**: ✅ Ready for Vercel Deployment
**Estimated Setup Time**: 15-30 minutes
**Monthly Cost**: $0 (free tier) or $20 (pro tier)
