Set-Location "E:\TALK TO EARN"

Write-Host "`n=== Starting Infrastructure ===" -ForegroundColor Cyan
docker-compose up -d postgres redis zookeeper kafka minio

Write-Host "`nWaiting 35 seconds for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 35

Write-Host "`n=== Creating Kafka Topics ===" -ForegroundColor Cyan
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic message.sent --partitions 3 --replication-factor 1 --if-not-exists 2>$null
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic engagement.calculated --partitions 3 --replication-factor 1 --if-not-exists 2>$null
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic points.awarded --partitions 3 --replication-factor 1 --if-not-exists 2>$null
docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic notification.send --partitions 3 --replication-factor 1 --if-not-exists 2>$null
Write-Host "Topics created!" -ForegroundColor Green

Write-Host "`n=== Starting Application Services ===" -ForegroundColor Cyan
docker-compose up -d

Start-Sleep -Seconds 20

Write-Host "`n=== STATUS ===" -ForegroundColor Green
docker-compose ps

Write-Host "`n=== ACCESS URLS ===" -ForegroundColor Cyan
Write-Host "API Gateway:  http://localhost:8000" -ForegroundColor White
Write-Host "Auth Service: http://localhost:3001" -ForegroundColor White
Write-Host "Chat Service: http://localhost:3002" -ForegroundColor White
Write-Host "Grafana:      http://localhost:3000" -ForegroundColor White
Write-Host "`nServices are starting up!" -ForegroundColor Yellow
Write-Host "Run migrations next: cd services\auth-service && npm install && npm run migrate" -ForegroundColor Yellow
