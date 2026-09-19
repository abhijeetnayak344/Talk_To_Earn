# Talk to Earn - Vercel Deployment

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/talk-to-earn)

## What You Get

A production-ready, serverless API for Talk to Earn platform with:

✅ **Authentication** - JWT-based auth with refresh tokens  
✅ **User Management** - Profiles, search, blocking  
✅ **Points & Rewards** - Transaction ledger, balance tracking  
✅ **Serverless** - Auto-scaling, zero DevOps  
✅ **PostgreSQL** - Vercel Postgres or any provider  

## Quick Start (3 Steps)

### 1. Create Database

Choose one:
- **Vercel Postgres** (easiest): [Create here](https://vercel.com/docs/storage/vercel-postgres)
- **Neon** (free): [neon.tech](https://neon.tech)
- **Supabase** (free): [supabase.com](https://supabase.com)

### 2. Deploy to Vercel

```bash
# Clone repository
git clone https://github.com/yourusername/talk-to-earn.git
cd talk-to-earn

# Deploy
vercel

# Add environment variables when prompted:
# - DATABASE_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET
```

### 3. Run Database Migration

```bash
# Install dependencies
npm install

# Set your database URL
export DATABASE_URL="your_connection_string"

# Run migration
cd services/auth-service
npm install
node src/database/migrate.js

# Optional: Add test data
node src/database/seed.js
```

## Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your_secure_random_secret_key
JWT_REFRESH_SECRET=your_secure_refresh_secret_key
NODE_ENV=production
```

## API Endpoints

Base URL: `https://your-app.vercel.app`

### 🔐 Authentication
```bash
POST /api/auth/register   # Register new user
POST /api/auth/login      # Login
POST /api/auth/refresh    # Refresh access token
POST /api/auth/logout     # Logout
POST /api/auth/verify     # Verify token
```

### 👤 Users
```bash
GET  /api/users/:userId       # Get profile
PUT  /api/users/:userId       # Update profile
GET  /api/users/search?q=     # Search users
POST /api/users/:userId/block # Block user
```

### 💰 Rewards
```bash
GET /api/rewards/balance      # Get points balance
GET /api/rewards/transactions # Get history
GET /api/rewards              # Get available rewards
```

## Test Your Deployment

```bash
# Health check
curl https://your-app.vercel.app/api

# Register user
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "display_name": "Test User"
  }'

# Login
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "Test123!"
  }'

# Save the access_token from response!

# Get balance
curl https://your-app.vercel.app/api/rewards/balance \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Project Structure

```
talk-to-earn/
├── api/                    # Serverless functions
│   ├── auth/              # Authentication endpoints
│   ├── users/             # User management
│   ├── rewards/           # Points & rewards
│   └── index.js           # API info
├── lib/                   # Shared utilities
│   ├── db.js             # Database connection
│   └── auth.js           # Auth middleware
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

## Features

### ✅ Implemented
- User registration & authentication
- JWT tokens with refresh
- User profiles & search
- Points balance tracking
- Transaction history
- Blocking users
- CORS enabled
- Error handling
- Input validation

### 🚧 Requires Additional Setup
- WebSocket (real-time chat) - Use Pusher/Ably or deploy separately
- Engagement scoring - Deploy Python service separately
- Background jobs - Use Vercel Cron or external service
- Redis caching - Use Upstash Redis

## Database Schema

The migration creates these tables:
- `users` - User accounts
- `auth_tokens` - Refresh tokens
- `conversations` - Chat conversations
- `messages` - Chat messages
- `point_accounts` - Points balance
- `point_transactions` - Transaction ledger
- `engagement_events` - Engagement tracking
- `rewards` - Available rewards
- `redemptions` - Reward redemptions
- And more...

## Development

```bash
# Install dependencies
npm install

# Run locally
vercel dev

# Test endpoints
curl http://localhost:3000/api
```

## Deployment

### Auto-deploy from GitHub

1. Push to GitHub
2. Connect repo to Vercel
3. Every push to `main` auto-deploys

### Manual deploy

```bash
vercel --prod
```

## Monitoring

```bash
# View logs
vercel logs

# View deployments
vercel ls

# View project info
vercel inspect
```

## Cost

### Free Tier
- ✅ 100 GB bandwidth/month
- ✅ Unlimited API requests
- ✅ Serverless functions
- ✅ SSL certificate
- ✅ Perfect for MVPs

### Pro Tier ($20/month)
- ✅ 1 TB bandwidth
- ✅ Advanced analytics
- ✅ Password protection
- ✅ Faster cold starts

## Limitations

| Feature | Vercel Support | Solution |
|---------|---------------|----------|
| REST API | ✅ Native | Included |
| WebSocket | ⚠️ Pro plan | Use Pusher/Ably |
| Background Jobs | ❌ | Vercel Cron/External |
| Python Services | ⚠️ Limited | Deploy separately |
| Redis | ❌ | Use Upstash |

## Add Real-time Chat

Use one of these services:
- **Pusher** - [pusher.com](https://pusher.com)
- **Ably** - [ably.com](https://ably.com)
- **Socket.io** - Deploy separately on Railway/Render

## Add Engagement Service

Deploy the Python engagement service separately:
- **Railway** - [railway.app](https://railway.app)
- **Render** - [render.com](https://render.com)
- **Heroku** - [heroku.com](https://heroku.com)

## Troubleshooting

### Database Connection Error
- Check `DATABASE_URL` format: `postgresql://user:pass@host:5432/db`
- Add `?sslmode=require` if needed

### CORS Error
- Ensure CORS headers in API files
- Check Vercel configuration

### Function Timeout
- Free tier: 10s limit
- Optimize queries
- Upgrade to Pro for 60s

## Security Checklist

- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable SSL (automatic on Vercel)
- [ ] Set `NODE_ENV=production`
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting (add middleware)
- [ ] Validate all inputs
- [ ] Use parameterized queries

## Documentation

- [Full Documentation](./docs/)
- [API Specifications](./docs/API_SPECIFICATIONS.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)

## Support

- [Vercel Docs](https://vercel.com/docs)
- [GitHub Issues](https://github.com/yourusername/talk-to-earn/issues)
- [Discord Community](https://discord.gg/yourdiscord)

## License

MIT

---

**Ready to deploy?** Click the button at the top or run `vercel` in your terminal!

For local Docker deployment, see [QUICKSTART.md](./QUICKSTART.md)
