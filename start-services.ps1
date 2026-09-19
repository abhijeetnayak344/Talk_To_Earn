# Start Talk to Earn Services

Write-Host "Starting infrastructure services..." -ForegroundColor Cyan
docker-compose up -d postgres redis zookeeper kafka minio
if ($LASTEXITCODE -eq 0) {
    Write-Host "Infrastructure started successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to start infrastructure" -ForegroundColor Red
    exit 1
}

Write-Host "`nWaiting 30 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`nCreating Kafka topics..." -ForegroundColor Cyan
$topics = @("message.sent", "engagement.calculated", "points.awarded", "notification.send")
foreach ($topic in $topics) {
    docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic $topic --partitions 3 --replication-factor 1 --if-not-exists 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Created topic: $topic" -ForegroundColor Green
    }
}

Write-Host "`nStarting application services..." -ForegroundColor Cyan
docker-compose up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "All services started!" -ForegroundColor Green
} else {
    Write-Host "Failed to start application services" -ForegroundColor Red
    exit 1
}

Write-Host "`nWaiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Services Status:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
docker-compose ps

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Gateway:    http://localhost:8000" -ForegroundColor White
Write-Host "Grafana:        http://localhost:3000" -ForegroundColor White
Write-Host "MinIO Console:  http://localhost:9001" -ForegroundColor White
Write-Host "Prometheus:     http://localhost:9090" -ForegroundColor White

Write-Host "`nSetup complete! Run migrations next:" -ForegroundColor Yellow
Write-Host "cd services\auth-service" -ForegroundColor White
Write-Host "npm install" -ForegroundColor White
Write-Host "npm run migrate" -ForegroundColor White
