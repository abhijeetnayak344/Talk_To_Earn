Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Talk to Earn Platform" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "E:\TALK TO EARN"

Write-Host "[1/4] Building and starting all services..." -ForegroundColor Yellow
docker-compose up -d --build

Write-Host "[2/4] Waiting 60 seconds for initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

Write-Host "[3/4] Running database migrations..." -ForegroundColor Yellow
Set-Location "services\auth-service"
npm install
npm run migrate
npm run seed
Set-Location "..\..\"

Write-Host "[4/4] Checking status..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:     http://localhost:3006" -ForegroundColor White
Write-Host "API Gateway:  http://localhost:8000" -ForegroundColor White
Write-Host "Grafana:      http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Test Accounts: alice, bob, charlie / Test123!" -ForegroundColor Cyan
Write-Host ""
