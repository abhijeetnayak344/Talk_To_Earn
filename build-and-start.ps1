Set-Location "E:\TALK TO EARN"

Write-Host "`n=== Building Application Services ===" -ForegroundColor Cyan
Write-Host "This will take 3-5 minutes..." -ForegroundColor Yellow

docker-compose up -d --build

Write-Host "`n=== Checking Service Status ===" -ForegroundColor Cyan
Start-Sleep -Seconds 10
docker-compose ps

Write-Host "`n=== SUCCESS! ===" -ForegroundColor Green
Write-Host "`nAccess URLs:" -ForegroundColor Cyan
Write-Host "  API Gateway:  http://localhost:8000"
Write-Host "  Auth Service: http://localhost:3001"
Write-Host "  Chat Service: http://localhost:3002"
Write-Host "  Grafana:      http://localhost:3000"
Write-Host "`nNext: Run migrations"
Write-Host "  cd services\auth-service"
Write-Host "  npm install"
Write-Host "  npm run migrate"
Write-Host "  npm run seed"
