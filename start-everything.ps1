Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Talk to Earn - Complete Startup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Set-Location "E:\TALK TO EARN"

# Step 1: Build and start all services
Write-Host "[1/4] Building and starting all services..." -ForegroundColor Yellow
Write-Host "This will take 5-10 minutes for the first build...`n" -ForegroundColor Gray

docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Failed to start services" -ForegroundColor Red
    exit 1
}

# Step 2: Wait for services to be ready
Write-Host "`n[2/4] Waiting for services to initialize (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Step 3: Run database migrations
Write-Host "`n[3/4] Running database migrations..." -ForegroundColor Yellow

Set-Location "services/auth-service"
npm install 2>&1 | Out-Null

Write-Host "Installing dependencies..." -ForegroundColor Gray
npm install

Write-Host "Running migrations..." -ForegroundColor Gray
npm run migrate

Write-Host "Seeding database..." -ForegroundColor Gray
npm run seed

Set-Location "../.."

# Step 4: Show status
Write-Host "`n[4/4] Checking service status...`n" -ForegroundColor Yellow
docker-compose ps

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup Complete! ✓" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:         http://localhost:3006" -ForegroundColor White
Write-Host "  API Gateway:      http://localhost:8000" -ForegroundColor White
Write-Host "  Auth Service:     http://localhost:3001" -ForegroundColor White
Write-Host "  Chat Service:     http://localhost:3002" -ForegroundColor White
Write-Host "  Engagement:       http://localhost:8001" -ForegroundColor White
Write-Host "  Grafana:          http://localhost:3000" -ForegroundColor White

Write-Host "`nTest Accounts:" -ForegroundColor Cyan
Write-Host "  alice   / Test123!" -ForegroundColor White
Write-Host "  bob     / Test123!" -ForegroundColor White
Write-Host "  charlie / Test123!" -ForegroundColor White

Write-Host "`nQuick Test:" -ForegroundColor Yellow
Write-Host "  1. Open http://localhost:3006" -ForegroundColor White
Write-Host "  2. Login with alice / Test123!" -ForegroundColor White
Write-Host "  3. Start chatting and earning points!" -ForegroundColor White

Write-Host "`nUseful Commands:" -ForegroundColor Yellow
Write-Host "  View logs:        docker-compose logs -f" -ForegroundColor White
Write-Host "  Stop all:         docker-compose down" -ForegroundColor White
Write-Host "  Restart:          docker-compose restart" -ForegroundColor White
Write-Host ""
