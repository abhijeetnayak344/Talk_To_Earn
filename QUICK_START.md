# Quick Start Guide - Talk to Earn

## Run These Commands in Your Terminal

Open PowerShell in `E:\TALK TO EARN` and run these commands:

### Step 1: Start Infrastructure Services
```powershell
docker-compose up -d postgres redis zookeeper kafka minio
```

Wait 30 seconds for services to initialize.

### Step 2: Create Kafka Topics
```powershell
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic message.sent --partitions 3 --replication-factor 1 --if-not-exists

docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic engagement.calculated --partitions 3 --replication-factor 1 --if-not-exists

docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic points.awarded --partitions 3 --replication-factor 1 --if-not-exists

docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic notification.send --partitions 3 --replication-factor 1 --if-not-exists
```

### Step 3: Install Dependencies and Run Migrations
```powershell
cd services\auth-service
npm install
npm run migrate
npm run seed
cd ..\..
```

### Step 4: Start All Application Services
```powershell
docker-compose up -d
```

### Step 5: Check Status
```powershell
docker-compose ps
```

All services should show as "Up" or "Running".

### Step 6: Test the API
```powershell
# Test health endpoint
curl http://localhost:8000/health

# Register a user
curl -X POST http://localhost:8000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "phone_number": "+1234567890",
    "password": "Test123!",
    "display_name": "Test User"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "identifier": "testuser",
    "password": "Test123!"
  }'
```

## Access URLs

- **API Gateway**: http://localhost:8000
- **Auth Service**: http://localhost:3001
- **Chat Service**: http://localhost:3002
- **User Service**: http://localhost:3003
- **Reward Service**: http://localhost:3004
- **Grafana**: http://localhost:3000 (admin/admin)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Prometheus**: http://localhost:9090

## Pre-seeded Test Accounts

After running `npm run seed`:
- **alice** / Test123!
- **bob** / Test123!
- **charlie** / Test123!

## View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f engagement-service
```

## Stop All Services

```powershell
docker-compose down
```

## Troubleshooting

### Port Already in Use
```powershell
# Find what's using the port
netstat -ano | findstr :8000

# Stop conflicting containers
docker ps
docker stop <container-name>
```

### Services Not Starting
```powershell
# Restart everything
docker-compose down
docker-compose up -d
```

### Database Issues
```powershell
# Check PostgreSQL
docker-compose logs postgres

# Access database
docker-compose exec postgres psql -U talktoearn -d talktoearn_db
```

## Success Indicators

✅ All containers showing "Up" in `docker-compose ps`  
✅ API Gateway responds at http://localhost:8000  
✅ Can register and login users  
✅ Database has tables (check via psql)  
✅ Kafka topics exist  

## Next Steps

1. **Test the engagement engine** - Send messages via WebSocket
2. **Check point rewards** - See points awarded based on engagement
3. **Monitor with Grafana** - View metrics and dashboards
4. **Add frontend** - Build React/Next.js UI
5. **Deploy to cloud** - AWS, GCP, or Azure

---

**For detailed documentation**, see:
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)
- [docs/API_SPECIFICATIONS.md](./docs/API_SPECIFICATIONS.md)
- [docs/ENGAGEMENT_ENGINE.md](./docs/ENGAGEMENT_ENGINE.md)
