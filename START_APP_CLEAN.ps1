Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Starting Smart Bus Conductor App (Clean)" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variable to suppress Expo doctor checks
$env:EXPO_NO_DOCTOR = 1

# Step 1: Start Django backend in background
Write-Host "[1/2] Starting Django backend..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Django Backend Server' -ForegroundColor Cyan; python manage.py runserver 0.0.0.0:8000"
Start-Sleep -Seconds 3
Write-Host "[OK] Backend server running on http://localhost:8000" -ForegroundColor Green
Write-Host ""

# Step 2: Start Expo app
Write-Host "[2/2] Starting Expo app..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "OPTIONS:" -ForegroundColor Green
Write-Host "  Press 'a' for Android emulator" -ForegroundColor White
Write-Host "  Press 'i' for iOS simulator" -ForegroundColor White
Write-Host "  Press 'w' for web" -ForegroundColor White
Write-Host "  Scan QR with Expo Go for quick test" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
$appPath = Join-Path $PSScriptRoot "SmartBusApp"
Set-Location $appPath
$env:EXPO_NO_DOCTOR = 1
npx expo start
