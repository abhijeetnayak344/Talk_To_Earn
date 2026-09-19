@echo off
echo ========================================
echo  Starting Talk to Earn Platform
echo ========================================
echo.

cd /d "E:\TALK TO EARN"

echo [1/4] Starting infrastructure services...
docker-compose up -d postgres redis zookeeper kafka minio
if %errorlevel% neq 0 (
    echo ERROR: Failed to start infrastructure
    pause
    exit /b 1
)

echo [2/4] Waiting 30 seconds for services to initialize...
timeout /t 30 /nobreak

echo [3/4] Creating Kafka topics...
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic message.sent --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic engagement.calculated --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic points.awarded --partitions 3 --replication-factor 1 --if-not-exists
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic notification.send --partitions 3 --replication-factor 1 --if-not-exists

echo [4/4] Starting all application services...
docker-compose up -d

echo.
echo Waiting 15 seconds for services to start...
timeout /t 15 /nobreak

echo.
echo ========================================
echo  Services Status
echo ========================================
docker-compose ps

echo.
echo ========================================
echo  Access URLs
echo ========================================
echo API Gateway:  http://localhost:8000
echo Grafana:      http://localhost:3000
echo MinIO:        http://localhost:9001
echo Prometheus:   http://localhost:9090
echo.
echo ========================================
echo  Next Steps
echo ========================================
echo 1. Run migrations:
echo    cd services\auth-service
echo    npm install
echo    npm run migrate
echo    npm run seed
echo.
echo 2. Test API:
echo    curl http://localhost:8000/health
echo.
echo 3. View logs:
echo    docker-compose logs -f
echo.
pause
