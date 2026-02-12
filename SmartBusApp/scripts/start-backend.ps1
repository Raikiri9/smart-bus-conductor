# Start backend and ngrok before Expo
Write-Host "Setting up backend services..." -ForegroundColor Yellow

# Setup ngrok tunnel
Set-Location "$PSScriptRoot\..\.."
.\scripts\start-ngrok.ps1

# Start Django backend in background
Write-Host "Starting Django backend in background..." -ForegroundColor Yellow
$BackendPath = "$PSScriptRoot\..\..\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; Write-Host 'Django Backend - Keep this window open' -ForegroundColor Cyan; python manage.py runserver 0.0.0.0:8000" -WindowStyle Normal

Write-Host "[OK] Backend ready! Starting Expo..." -ForegroundColor Green
Start-Sleep -Seconds 2
