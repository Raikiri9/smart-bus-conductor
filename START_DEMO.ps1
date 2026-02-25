#!/usr/bin/env pwsh
# Smart Bus Conductor - Manual Demonstration Launcher
# Run this script to start all required services

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║         🚌 Smart Bus Conductor - Manual Demo Setup          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Check if services are already running
Write-Host "`nChecking existing services..." -ForegroundColor Yellow

$backendRunning = netstat -ano | findstr ":8000" | Select-Object -First 1
$noderedRunning = netstat -ano | findstr ":1880" | Select-Object -First 1
$emulatorRunning = adb devices 2>&1 | Select-String "emulator-"

Write-Host "`nStatus:" -ForegroundColor Cyan
if ($backendRunning) {
    Write-Host "  ✅ Backend: Already running on port 8000" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Backend: Not running - Starting..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\USER\Desktop\Smart Bus Conductor Mobile Application\backend'; python manage.py runserver 0.0.0.0:8000"
    Write-Host "  ✅ Backend: Started in new terminal" -ForegroundColor Green
}

if ($noderedRunning) {
    Write-Host "  ✅ Node-RED: Already running on port 1880" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Node-RED: Not running - Starting..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\USER\Desktop\Smart Bus Conductor Mobile Application'; node-red"
    Write-Host "  ✅ Node-RED: Started in new terminal" -ForegroundColor Green
}

if ($emulatorRunning) {
    Write-Host "  ✅ Emulator: $emulatorRunning" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Emulator: Not running - Please start manually" -ForegroundColor Yellow
}

# Wait for services to start
if (-not $backendRunning -or -not $noderedRunning) {
    Write-Host "`nWaiting for services to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Open important URLs
Write-Host "`n📂 Opening web interfaces..." -ForegroundColor Cyan
Start-Process "http://localhost:1880"  # Node-RED
Start-Process "http://localhost:8000/admin"  # Django Admin

# Show next steps
Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                     ✅ Setup Complete!                        ║
╚══════════════════════════════════════════════════════════════╝

📋 Next Steps:

1. Import Node-RED Flows:
   - Go to: http://localhost:1880
   - Click menu (☰) → Import
   - Select: node-red-manual-demo.json
   - Click Deploy

2. Start Expo App:
   - Open new terminal
   - Run: cd SmartBusApp
   - Run: npx expo start
   - Scan QR with Expo Go app

3. Read Demonstration Guide:
   - Open: MANUAL_DEMONSTRATION_GUIDE.md
   - Follow scenarios step by step

📖 Quick Reference:
   - Node-RED: http://localhost:1880
   - Backend Admin: http://localhost:8000/admin
   - Backend API: http://localhost:8000/api/trips/
   - Demo Guide: MANUAL_DEMONSTRATION_GUIDE.md

🎬 You're ready to demonstrate!

"@ -ForegroundColor Green

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
