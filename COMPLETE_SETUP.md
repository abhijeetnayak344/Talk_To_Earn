# 🎉 Talk to Earn - Complete Full-Stack Application

## ✅ What's Included

### Frontend (Next.js + TypeScript + Tailwind CSS)
- **Landing Page** - Marketing page with features
- **Authentication** - Login & Registration forms
- **Chat Interface** - Real-time messaging with WebSocket
- **Rewards Dashboard** - Points balance and transaction history
- **Responsive UI** - Mobile-friendly design

### Backend Services (Microservices Architecture)
- **API Gateway** (Port 8000) - Request routing and rate limiting
- **Auth Service** (Port 3001) - JWT authentication, user management
- **Chat Service** (Port 3002) - WebSocket messaging, Redis pub/sub
- **User Service** (Port 3003) - User profiles and search
- **Engagement Service** (Port 8001) - 6-signal scoring algorithm (Python)
- **Reward Service** (Port 3004) - Points system with Kafka events
- **Notification Service** (Port 3005) - Push notifications

### Infrastructure
- **PostgreSQL** - Database with full schema
- **Redis** - Caching and pub/sub
- **Kafka** - Event streaming
- **MinIO** - Object storage (S3-compatible)
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards

---

## 🚀 Quick Start (One Command)

```powershell
cd "E:\TALK TO EARN"
.\start-everything.ps1
```

**This will:**
1. Build all Docker images (5-10 minutes first time)
2. Start all 13+ containers
3. Wait for services to initialize
4. Run database migrations
5. Seed test data (alice, bob, charlie)
6. Show service status

---

## 🌐 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3006 | Main application |
| API Gateway | http://localhost:8000 | Backend API |
| Auth Service | http://localhost:3001 | Authentication |
| Chat Service | http://localhost:3002 | WebSocket chat |
| Engagement Service | http://localhost:8001 | Scoring engine |
| Reward Service | http://localhost:3004 | Points system |
| Grafana | http://localhost:3000 | Monitoring (admin/admin) |
| MinIO Console | http://localhost:9001 | Storage (minioadmin/minioadmin) |

---

## 👤 Test Accounts

After running migrations, use these accounts to test:

| Username | Password | Points |
|----------|----------|--------|
| alice | Test123! | 1000 |
| bob | Test123! | 1000 |
| charlie | Test123! | 1000 |

---

## 🧪 Test the Complete System

### 1. Open Frontend
```
http://localhost:3006
```

### 2. Login
- Username: `alice`
- Password: `Test123!`

### 3. Start Chatting
- Select a conversation
- Send messages
- Watch points increase in real-time!

### 4. View Rewards
- Click "Rewards" button
- See point balance and transactions
- View engagement scores

### 5. Test WebSocket
- Open two browser windows
- Login as alice and bob
- Send messages between them
- See real-time updates

---

## 📊 How Engagement Scoring Works

The system analyzes **6 signals** for each message:

| Signal | Weight | Description |
|--------|--------|-------------|
| Two-way Participation | 25% | Balanced conversation |
| Response Time | 15% | Natural timing |
| Conversation Continuity | 20% | Flow and context |
| Message Length | 15% | Substantive content |
| Interaction Variety | 15% | Different message types |
| Message Uniqueness | 10% | No duplicates/spam |

**Points Awarded:**
- Score ≥ 0.7 → **3 points** (Excellent)
- Score ≥ 0.5 → **2 points** (Good)
- Score ≥ 0.3 → **1 point** (Basic)
- Score < 0.3 → **0 points** (Low quality)

---

## 🛠️ Development Commands

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f frontend
docker-compose logs -f engagement-service
```

### Restart Services
```powershell
# All services
docker-compose restart

# Specific service
docker-compose restart frontend
docker-compose restart chat-service
```

### Stop Everything
```powershell
docker-compose down
```

### Rebuild Single Service
```powershell
docker-compose up -d --build frontend
```

### Run Migrations Again
```powershell
cd services/auth-service
npm run migrate
```

### Check Service Status
```powershell
docker-compose ps
```

---

## 🗄️ Database

### Connect to PostgreSQL
```powershell
docker-compose exec postgres psql -U talktoearn -d talktoearn_db
```

### Useful SQL Queries
```sql
-- View all users
SELECT id, username, display_name, email FROM users;

-- View point balances
SELECT u.username, pa.balance 
FROM users u 
JOIN point_accounts pa ON u.id = pa.user_id;

-- View recent messages
SELECT m.content, u.display_name, m.created_at 
FROM messages m 
JOIN users u ON m.sender_id = u.id 
ORDER BY m.created_at DESC 
LIMIT 10;

-- View engagement events
SELECT ee.overall_score, ee.points_awarded, m.content 
FROM engagement_events ee 
JOIN messages m ON ee.message_id = m.id 
ORDER BY ee.created_at DESC 
LIMIT 10;
```

---

## 📁 Project Structure

```
talk-to-earn/
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── app/                # Pages (Next.js 14 App Router)
│   │   ├── components/         # React components
│   │   ├── lib/                # API client, Socket.io
│   │   ├── store/              # Zustand state management
│   │   └── types/              # TypeScript types
│   └── Dockerfile
│
├── services/                    # Microservices
│   ├── api-gateway/            # Request routing
│   ├── auth-service/           # Authentication
│   ├── chat-service/           # Real-time chat
│   ├── user-service/           # User management
│   ├── engagement-service/     # Scoring engine (Python)
│   ├── reward-service/         # Points system
│   └── notification-service/   # Push notifications
│
├── infrastructure/              # Infrastructure configs
│   ├── postgres/               # DB init scripts
│   ├── prometheus/             # Monitoring config
│   └── grafana/                # Dashboards
│
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_SPECIFICATIONS.md
│   ├── DATABASE_SCHEMA.md
│   └── ENGAGEMENT_ENGINE.md
│
└── docker-compose.yml          # Orchestration
```

---

## 🔧 Troubleshooting

### Services Won't Start
```powershell
# Check if ports are available
netstat -ano | findstr :3006
netstat -ano | findstr :8000

# Restart Docker Desktop
# Then try again
docker-compose up -d
```

### Database Connection Failed
```powershell
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Frontend Can't Connect to Backend
```powershell
# Check API Gateway is running
docker-compose ps api-gateway

# Test API directly
curl http://localhost:8000/health

# Check frontend logs
docker-compose logs frontend
```

### WebSocket Connection Failed
```powershell
# Check chat service
docker-compose ps chat-service

# View logs
docker-compose logs chat-service

# Restart chat service
docker-compose restart chat-service
```

### Kafka Topics Not Created
```powershell
# Create topics manually
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic message.sent --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic engagement.calculated --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic points.awarded --partitions 3 --replication-factor 1 --if-not-exists

# Verify topics
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
```

---

## 🎯 API Testing

### Register New User
```powershell
curl -X POST http://localhost:8000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "username": "newuser",
    "email": "new@example.com",
    "phone_number": "+1234567890",
    "password": "Test123!",
    "display_name": "New User"
  }'
```

### Login
```powershell
curl -X POST http://localhost:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "identifier": "alice",
    "password": "Test123!"
  }'
```

### Get Points Balance
```powershell
# Replace YOUR_TOKEN with actual token from login
curl http://localhost:8000/api/points/balance `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "X-User-ID: USER_ID"
```

---

## 🌟 Features Highlights

### ✅ Complete Authentication
- JWT with refresh tokens
- Session management with Redis
- Password hashing with bcrypt
- Secure logout

### ✅ Real-Time Chat
- WebSocket with Socket.io
- Message persistence
- Read receipts
- Typing indicators
- Online/offline status

### ✅ Intelligent Rewards
- 6-signal engagement algorithm
- Real-time point updates
- Anti-spam protection
- Duplicate detection
- Daily earning limits

### ✅ Production-Ready
- Docker containerization
- Microservices architecture
- Event-driven with Kafka
- Database migrations
- Monitoring with Grafana

---

## 📚 Documentation

For detailed documentation, see:
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design
- [API_SPECIFICATIONS.md](./docs/API_SPECIFICATIONS.md) - API endpoints
- [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) - Database structure
- [ENGAGEMENT_ENGINE.md](./docs/ENGAGEMENT_ENGINE.md) - Scoring algorithm

---

## 🎓 Learning Resources

This project demonstrates:
- **Microservices Architecture** - Service separation and communication
- **Event-Driven Design** - Kafka event streaming
- **Real-Time Communication** - WebSocket implementation
- **Intelligent Algorithms** - Engagement scoring with ML signals
- **Production Patterns** - Idempotency, transactions, caching
- **Full-Stack Development** - Next.js + Node.js + Python
- **DevOps** - Docker, monitoring, observability

---

## 📝 Next Steps

1. **Customize UI** - Update colors, logos, branding
2. **Add Features** - Group chat, file uploads, video calls
3. **Deploy** - AWS, GCP, or Azure deployment
4. **Scale** - Load balancing, horizontal scaling
5. **Monitor** - Set up alerts and dashboards

---

## 🤝 Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Restart services: `docker-compose restart`
3. Rebuild: `docker-compose up -d --build`
4. Check documentation in `/docs`

---

**Built with ❤️ using Next.js, Node.js, Python, PostgreSQL, Redis, Kafka**

**Ready for production, interviews, and portfolios! 🚀**
