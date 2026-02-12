Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Starting Smart Bus Conductor Application" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Setup ngrok tunnel
Write-Host "[1/3] Setting up ngrok tunnel..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot"
.\scripts\start-ngrok.ps1
Write-Host "[OK] Ngrok tunnel ready" -ForegroundColor Green
Write-Host ""

# Step 2: Start Django backend in background
Write-Host "[2/3] Starting Django backend..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Django Backend Server' -ForegroundColor Cyan; python manage.py runserver 0.0.0.0:8000"
Start-Sleep -Seconds 3
Write-Host "[OK] Backend server running on http://localhost:8000" -ForegroundColor Green
Write-Host ""

# Step 3: Start Expo (QR code will show here)
Write-Host "[3/3] Starting Expo..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SCAN QR CODE BELOW WITH EXPO GO APP" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Set-Location "$PSScriptRoot\SmartBusApp"
npx expo start
