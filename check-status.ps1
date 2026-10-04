Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  Talk to Earn - Service Status"  -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

$containers = docker ps --format "{{.Names}}" | Select-String "talktoearn"

$services = @{
    "talktoearn_postgres" = "PostgreSQL Database"
    "talktoearn_redis" = "Redis Cache"
    "talktoearn_kafka" = "Kafka Event Stream"
    "talktoearn_zookeeper" = "Zookeeper"
    "talktoearn_minio" = "MinIO Storage"
    "talktoearn_api_gateway" = "API Gateway (8000)"
    "talktoearn_frontend" = "Frontend (3006)"
    "talktoearn_auth_service" = "Auth Service (3001)"
    "talktoearn_chat_service" = "Chat Service (3002)"
    "talktoearn_user_service" = "User Service (3003)"
    "talktoearn_engagement_service" = "Engagement Engine (8001)"
    "talktoearn_reward_service" = "Reward Service (3004)"
    "talktoearn_notification_service" = "Notification Service (3005)"
}

$running = 0
foreach ($key in $services.Keys) {
    if ($containers -match $key) {
        Write-Host "[RUNNING]" -ForegroundColor Green -NoNewline
        Write-Host " $($services[$key])" -ForegroundColor White
        $running++
    } else {
        Write-Host "[BUILDING]" -ForegroundColor Yellow -NoNewline
        Write-Host " $($services[$key])" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Status: $running / $($services.Count) services running" -ForegroundColor White
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

if ($running -eq $services.Count) {
    Write-Host "ALL SERVICES READY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Open: http://localhost:3006" -ForegroundColor Cyan
    Write-Host "Login: alice / Test123!" -ForegroundColor Cyan
} else {
    Write-Host "Build in progress... Run this script again in 2-3 minutes" -ForegroundColor Yellow
}

Write-Host ""
