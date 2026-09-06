# Quick Start Guide

Get Talk to Earn running on your local machine in under 10 minutes.

## Prerequisites

Make sure you have these installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose)
- [Node.js 18+](https://nodejs.org/) (for local development)
- [Python 3.11+](https://www.python.org/) (for engagement service)
- [Make](https://www.gnu.org/software/make/) (optional, for convenience)
- Git

## Option 1: Quick Start with Make (Recommended)

If you have `make` installed:

```bash
# Clone the repository
git clone https://github.com/yourusername/talk-to-earn.git
cd talk-to-earn

# Complete setup and start everything
make quickstart
```

This single command will:
1. Copy `.env.example` to `.env`
2. Start all infrastructure services (PostgreSQL, Redis, Kafka, MinIO)
3. Create required Kafka topics
4. Start all microservices

Wait 2-3 minutes for all services to start, then verify:

```bash
make health
```

## Option 2: Manual Setup

If you don't have `make`:

### Step 1: Clone and Configure

```bash
git clone https://github.com/yourusername/talk-to-earn.git
cd talk-to-earn

# Create environment file
cp .env.example .env

# Edit .env if needed (defaults work for local development)
```

### Step 2: Start Infrastructure

```bash
docker-compose up -d postgres redis zookeeper kafka minio
```

Wait 30 seconds for services to initialize.

### Step 3: Create Kafka Topics

```bash
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic message.sent --partitions 3 --replication-factor 1
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic engagement.calculated --partitions 3 --replication-factor 1
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic points.awarded --partitions 3 --replication-factor 1
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic notification.send --partitions 3 --replication-factor 1
```

### Step 4: Start Services

```bash
docker-compose up -d
```

### Step 5: Initialize Database

```bash
# Run migrations
docker-compose exec auth-service npm run migrate

# Seed test data (optional)
docker-compose exec auth-service npm run seed
```

## Verify Installation

Check that services are running:

```bash
# Using make
make ps

# Or with docker-compose
docker-compose ps
```

All services should show "Up" status.

### Test the API

```bash
# Health check
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","service":"api-gateway","timestamp":"..."}
```

## Access Points

Once everything is running:

| Service | URL | Credentials |
|---------|-----|-------------|
| API Gateway | http://localhost:8000 | - |
| API Documentation | http://localhost:8000/docs | - |
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |

## Test the System

### 1. Register a User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "phone_number": "+1234567890",
    "password": "Test123!",
    "display_name": "Test User"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "Test123!"
  }'
```

Save the `access_token` from the response.

### 3. Get Profile

```bash
curl http://localhost:8000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## View Logs

```bash
# All services
make logs

# Specific service
make logs-service SERVICE=auth-service

# Or with docker-compose
docker-compose logs -f auth-service
```

## Common Commands

```bash
# Start all services
make start

# Stop all services
make stop

# Restart services
make restart

# View service status
make ps

# Open database shell
make db-shell

# Open Redis CLI
make redis-cli

# View Kafka topics
make kafka-topics

# Run tests
make test

# Check service health
make health
```

## Project Structure

```
talk-to-earn/
├── services/               # Microservices
│   ├── auth-service/      # Authentication & JWT
│   ├── chat-service/      # Real-time messaging
│   ├── user-service/      # User profiles
│   ├── engagement-service/ # Engagement scoring (Python)
│   ├── reward-service/    # Points & rewards
│   └── notification-service/ # Push notifications
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md    # System design
│   ├── DATABASE_SCHEMA.md # Database design
│   ├── API_SPECIFICATIONS.md # API docs
│   └── ENGAGEMENT_ENGINE.md # Engagement algorithm
├── infrastructure/        # Docker & monitoring configs
└── docker-compose.yml     # Service orchestration
```

## Next Steps

1. **Read the Documentation**
   - [Architecture Overview](docs/ARCHITECTURE.md)
   - [Database Schema](docs/DATABASE_SCHEMA.md)
   - [API Specifications](docs/API_SPECIFICATIONS.md)
   - [Engagement Engine](docs/ENGAGEMENT_ENGINE.md)

2. **Explore the Services**
   - Check the code in `services/`
   - Each service has its own README
   - Look at the engagement engine algorithms

3. **Set Up Development**
   - Install dependencies in each service
   - Set up your IDE
   - Run tests: `make test`

4. **Build a Feature**
   - Pick an issue from GitHub
   - Create a feature branch
   - Read [CONTRIBUTING.md](CONTRIBUTING.md)

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# Check logs for errors
docker-compose logs

# Restart everything
make stop
make clean
make quickstart
```

### Database connection errors

```bash
# Make sure PostgreSQL is healthy
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Kafka connection errors

```bash
# Kafka takes longer to start (30-60 seconds)
# Check if it's healthy
docker-compose ps kafka

# Check logs
docker-compose logs kafka

# Verify topics exist
make kafka-topics
```

### Port already in use

If you get "port already in use" errors:

```bash
# Find what's using the port (example for port 8000)
# On Linux/Mac:
lsof -i :8000

# On Windows:
netstat -ano | findstr :8000

# Either stop that process or change the port in docker-compose.yml
```

### Services can't connect to each other

```bash
# Make sure all services are on the same network
docker network ls | grep talktoearn

# Recreate the network
docker-compose down
docker-compose up -d
```

### Need to reset everything?

```bash
# This will delete all data!
make clean

# Then start fresh
make quickstart
```

## Get Help

- 📚 Read the [full documentation](docs/)
- 🐛 [Report issues](https://github.com/yourusername/talk-to-earn/issues)
- 💬 Ask questions in [Discussions](https://github.com/yourusername/talk-to-earn/discussions)
- 📧 Email: support@talktoearn.com

## What's Next?

Explore the system:

1. **Try the Engagement Engine**
   - Send messages between users
   - Watch engagement scores in logs
   - See how duplicate detection works

2. **Explore Rewards**
   - Check point balances
   - View available rewards
   - Test redemption flow

3. **Monitor the System**
   - Open Grafana dashboards
   - Check Prometheus metrics
   - View service logs

4. **Read the Code**
   - Start with the engagement engine (most unique)
   - Look at the authentication flow
   - Understand the database schema

---

**You're now ready to develop on Talk to Earn!** 🚀

For detailed system design information, see the [documentation](docs/).
