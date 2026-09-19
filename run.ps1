# Quick start script for Talk to Earn
Write-Host "`n=== Starting Infrastructure ===" -ForegroundColor Cyan
docker-compose up -d postgres redis zookeeper kafka minio

Write-Host "`nWaiting 30s for initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n=== Creating Kafka Topics ===" -ForegroundColor Cyan
$topics = "message.sent","engagement.calculated","points.awarded","notification.send"
foreach ($t in $topics) {
    docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --create --topic $t --partitions 3 --replication-factor 1 --if-not-exists 2>$null
}

Write-Host "`n=== Starting Application Services ===" -ForegroundColor Cyan
docker-compose up -d

Start-Sleep -Seconds 15

Write-Host "`n=== Status ===" -ForegroundColor Green
docker-compose ps

Write-Host "`n=== Access URLs ===" -ForegroundColor Cyan
Write-Host "API Gateway: http://localhost:8000"
Write-Host "Grafana:     http://localhost:3000"
Write-Host "`nNext: Run migrations in services\auth-service" -ForegroundColor Yellow
