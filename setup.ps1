# Talk to Earn - Project Setup Script for Windows
# This script sets up the development environment

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Talk to Earn - Project Setup" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✓ Docker found" -ForegroundColor Green
} else {
    Write-Host "✗ Docker not found. Please install Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check Docker Compose
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    Write-Host "✓ Docker Compose found" -ForegroundColor Green
} else {
    Write-Host "✗ Docker Compose not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Create .env file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env file created" -ForegroundColor Green
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Starting Infrastructure Services" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Start infrastructure
Write-Host "Starting PostgreSQL, Redis, Kafka, MinIO..." -ForegroundColor Yellow
docker-compose up -d postgres redis zookeeper kafka minio

Write-Host ""
Write-Host "Waiting for services to be ready (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Creating Kafka Topics" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Create Kafka topics
$topics = @(
    "message.sent",
    "engagement.calculated",
    "points.awarded",
    "notification.send",
    "call.completed",
    "status.posted",
    "fraud.detected"
)

foreach ($topic in $topics) {
    Write-Host "Creating topic: $topic" -ForegroundColor Yellow
    docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic $topic --partitions 3 --replication-factor 1 --if-not-exists 2>$null
}

Write-Host "✓ Kafka topics created" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Starting Application Services" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Start all services
Write-Host "Starting all microservices..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  API Gateway:     http://localhost:8000" -ForegroundColor White
Write-Host "  Grafana:         http://localhost:3000 (admin/admin)" -ForegroundColor White
Write-Host "  MinIO Console:   http://localhost:9001 (minioadmin/minioadmin)" -ForegroundColor White
Write-Host "  Prometheus:      http://localhost:9090" -ForegroundColor White
Write-Host ""

Write-Host "Services Status:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check logs: docker-compose logs -f" -ForegroundColor White
Write-Host "  2. Test API: curl http://localhost:8000/health" -ForegroundColor White
Write-Host "  3. Read documentation in docs/ folder" -ForegroundColor White
Write-Host "  4. Start building features!" -ForegroundColor White
Write-Host ""

Write-Host "For more commands, see the Makefile or run:" -ForegroundColor Yellow
Write-Host "  docker-compose --help" -ForegroundColor White
Write-Host ""
