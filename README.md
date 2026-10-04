# 💬 Talk to Earn - Full-Stack Chat & Rewards Platform

> **Production-ready chat application where engaging conversations earn you points**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

---

## 🌟 Features

- ✅ **Real-Time Chat** with WebSocket (Socket.io)
- ✅ **Intelligent Rewards** based on engagement quality (not message count!)
- ✅ **6-Signal Engagement Algorithm** with ML-based scoring
- ✅ **Anti-Spam Protection** - Duplicate detection, spam filtering
- ✅ **Microservices Architecture** - Scalable and maintainable
- ✅ **Production-Ready** - Docker, monitoring, health checks
- ✅ **Complete Frontend** - Next.js with TypeScript & Tailwind CSS
- ✅ **Full Authentication** - JWT with refresh tokens

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- At least 8GB RAM available
- Ports 3000-9092 available

### One-Command Setup

```powershell
cd "E:\TALK TO EARN"
.\deploy.ps1
```

**This will:**
1. Build all Docker images (5-10 minutes first time)
2. Start 13+ containers (frontend, backend services, infrastructure)
3. Run database migrations
4. Seed test data (alice, bob, charlie)
5. Show you the access URLs

---

## 🌐 Access the Application

Once deployed, open your browser:

**Main Application:** http://localhost:3006

**Test Accounts:**
- Username: `alice` / Password: `Test123!`
- Username: `bob` / Password: `Test123!`
- Username: `charlie` / Password: `Test123!`

**Other Services:**
- API Gateway: http://localhost:8000
- Grafana Monitoring: http://localhost:3000 (admin/admin)

---

## 📖 What Makes This Special?

### 🧠 Intelligent Engagement Scoring

**Not just message counting!** Our 6-signal algorithm analyzes:

| Signal | Weight | What It Measures |
|--------|--------|------------------|
| Two-way Participation | 25% | Balanced conversation flow |
| Response Time | 15% | Natural communication timing |
| Conversation Continuity | 20% | Context and relevance |
| Message Length | 15% | Substantive content |
| Interaction Variety | 15% | Message diversity |
| Message Uniqueness | 10% | No spam/duplicates |

**Result:** Users earn **0-3 points per message** based on quality:
- 3 points = Excellent engagement (score ≥ 0.7)
- 2 points = Good engagement (score ≥ 0.5)
- 1 point = Basic engagement (score ≥ 0.3)
- 0 points = Low quality/spam (score < 0.3)

### 🛡️ Anti-Fraud Features
- Exact duplicate detection
- Near-duplicate detection (Levenshtein distance)
- Spam pattern matching
- Daily earning limits
- Bot behavior detection

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│              http://localhost:3006                           │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (Port 8000)                     │
│            Rate Limiting │ CORS │ Routing                    │
└──────┬──────────┬─────────┬─────────┬────────┬──────────────┘
       │          │         │         │        │
       ▼          ▼         ▼         ▼        ▼
   ┌────────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐
   │  Auth  │ │ Chat │ │ User │ │Reward  │ │ Notif    │
   │Service │ │Service│ │Service│ │Service│ │ Service  │
   │  3001  │ │ 3002 │ │ 3003 │ │  3004 │ │  3005    │
   └───┬────┘ └───┬──┘ └───┬──┘ └───┬────┘ └─────┬────┘
       │          │        │        │            │
       │          │        │        │            │
       └──────────┴────────┴────────┴────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
         ┌────────────┐      ┌────────────┐
         │ PostgreSQL │      │   Redis    │
         │    5432    │      │    6379    │
         └────────────┘      └────────────┘
                │
                ▼
         ┌─────────────────┐
         │ Engagement       │
         │ Service (Python) │
         │      8001        │
         └─────────┬────────┘
                   │
                   ▼
            ┌──────────┐
            │  Kafka   │
            │   9092   │
            └──────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Socket.io Client** - Real-time WebSocket
- **Axios** - HTTP client

### Backend
- **Node.js 18** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - WebSocket server
- **Python 3.11** - Engagement service
- **FastAPI** - Python web framework

### Infrastructure
- **PostgreSQL 15** - Primary database
- **Redis 7** - Caching & pub/sub
- **Apache Kafka** - Event streaming
- **MinIO** - Object storage (S3-compatible)
- **Prometheus** - Metrics
- **Grafana** - Dashboards

---

## 📁 Project Structure

```
talk-to-earn/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # Pages
│   │   ├── components/      # React components
│   │   ├── lib/             # API client, Socket.io
│   │   ├── store/           # State management
│   │   └── types/           # TypeScript types
│   └── Dockerfile
│
├── services/                 # Microservices
│   ├── api-gateway/         # Request routing
│   ├── auth-service/        # Authentication
│   ├── chat-service/        # Real-time chat
│   ├── user-service/        # User management
│   ├── engagement-service/  # Scoring engine (Python)
│   ├── reward-service/      # Points system
│   └── notification-service/# Notifications
│
├── infrastructure/           # Infrastructure configs
│   ├── postgres/            # DB init scripts
│   ├── prometheus/          # Monitoring
│   └── grafana/             # Dashboards
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_SPECIFICATIONS.md
│   ├── DATABASE_SCHEMA.md
│   └── ENGAGEMENT_ENGINE.md
│
└── docker-compose.yml       # Container orchestration
```

---

## 🧪 Testing

### Manual Testing
1. Open http://localhost:3006
2. Login with `alice` / `Test123!`
3. Send messages in chat
4. Watch points increase
5. Check rewards dashboard

### API Testing
```powershell
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"identifier":"alice","password":"Test123!"}'

# Get points
curl http://localhost:8000/api/points/balance `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "X-User-ID: YOUR_USER_ID"
```

For comprehensive testing scenarios, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 📊 Monitoring

### Grafana Dashboards
http://localhost:3000 (admin/admin)

### Prometheus Metrics
http://localhost:9090

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f chat-service
docker-compose logs -f engagement-service
```

---

## 🔧 Development

### Start Services
```powershell
docker-compose up -d
```

### Stop Services
```powershell
docker-compose down
```

### Rebuild Specific Service
```powershell
docker-compose up -d --build frontend
```

### Database Access
```powershell
docker-compose exec postgres psql -U talktoearn -d talktoearn_db
```

### Check Service Status
```powershell
docker-compose ps
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [COMPLETE_SETUP.md](./COMPLETE_SETUP.md) | Detailed setup instructions |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Testing scenarios |
| [FINAL_STATUS.md](./FINAL_STATUS.md) | Current project status |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture |
| [docs/API_SPECIFICATIONS.md](./docs/API_SPECIFICATIONS.md) | API documentation |
| [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | Database schema |
| [docs/ENGAGEMENT_ENGINE.md](./docs/ENGAGEMENT_ENGINE.md) | Scoring algorithm |

---

## 🎯 Use Cases

### For Learning
- Full-stack development
- Microservices architecture
- Real-time systems
- Event-driven design
- ML algorithm implementation

### For Interviews
- Demonstrates multiple concepts
- Production-ready patterns
- Scalable architecture
- Complete documentation

### For Portfolio
- Impressive full-stack project
- Live demo capability
- Professional presentation
- Interview talking points

---

## 🚀 Deployment

### Docker (Current)
```powershell
.\deploy.ps1
```

### Vercel (Serverless Alternative)
See [README.vercel.md](./README.vercel.md) for serverless deployment

### Production
See [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md) for AWS/GCP/Azure

---

## 🤝 Contributing

This is a portfolio/learning project. For significant changes:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📈 Roadmap

### Completed ✅
- Real-time chat with WebSocket
- Intelligent engagement scoring
- Points & rewards system
- Complete frontend UI
- Microservices backend
- Docker orchestration
- Database migrations
- Comprehensive documentation

### Planned 🔜
- Group chat functionality
- File upload in chat
- Video/voice calls
- Mobile apps (React Native)
- Admin dashboard
- Analytics dashboard
- Reward redemption marketplace
- End-to-end encryption

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Node.js](https://nodejs.org/)
- [Python](https://python.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- [Apache Kafka](https://kafka.apache.org/)
- [Socket.io](https://socket.io/)
- [Docker](https://www.docker.com/)

---

## 📞 Support

For issues, questions, or suggestions:
- Check the [documentation](./docs/)
- Review [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- See [COMPLETE_SETUP.md](./COMPLETE_SETUP.md)

---

## ⭐ Key Statistics

- **40+ code files** created
- **15+ documentation files**
- **13+ Docker containers**
- **6 microservices** implemented
- **40+ database tables**
- **15,000+ lines** of code and documentation

---

**🎉 Ready to build, learn, and showcase your skills!**

**Start now:** `.\deploy.ps1` and open http://localhost:3006

---

*Built with ❤️ as a production-ready, interview-worthy, portfolio-grade full-stack project*
