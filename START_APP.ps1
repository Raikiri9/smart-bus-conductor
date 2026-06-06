Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Starting Smart Bus Conductor Application" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Start OSRM proxy server (needed for distance calculations via LD Player)
Write-Host "[1/4] Starting OSRM proxy server on port 3001..." -ForegroundColor Yellow
$osrmProcess = Start-Process node -ArgumentList "osrm-proxy.js" -PassThru -NoNewWindow -WorkingDirectory $PSScriptRoot
Start-Sleep -Seconds 2
Write-Host "[OK] OSRM proxy server started (PID: $($osrmProcess.Id))" -ForegroundColor Green
Write-Host ""

# Step 2: Setup ngrok tunnel (for both backend and OSRM)
Write-Host "[2/4] Setting up ngrok tunnels..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot"
.\scripts\start-ngrok.ps1
Write-Host "[OK] Ngrok tunnels ready" -ForegroundColor Green
Write-Host ""

# Step 3: Start Django backend in background
Write-Host "[3/4] Starting Django backend..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Django Backend Server' -ForegroundColor Cyan; python manage.py runserver 0.0.0.0:8000"
Start-Sleep -Seconds 3
Write-Host "[OK] Backend server running on http://localhost:8000" -ForegroundColor Green
Write-Host ""

# Step 4: Start Expo (QR code will show here)
Write-Host "[4/4] Starting Expo..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SCAN QR CODE BELOW WITH EXPO GO APP" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Set-Location "$PSScriptRoot\SmartBusApp"
npx expo start
