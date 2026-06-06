@echo off
echo ============================================
echo Starting Smart Bus Conductor Application
echo ============================================
echo.

REM Step 1: Start OSRM proxy server (needed for distance calculations via LD Player)
echo [1/4] Starting OSRM proxy server on port 3001...
cd /d "%~dp0"
start "OSRM Proxy" cmd /k "node osrm-proxy.js"
timeout /t 2 /nobreak > nul
echo.

REM Step 2: Setup ngrok tunnel (for both backend and OSRM)
echo [2/4] Setting up ngrok tunnels...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-ngrok.ps1"
echo.

REM Step 3: Start Django backend in background
echo [3/4] Starting Django backend in new window...
cd /d "%~dp0backend"
start "Django Backend" cmd /k "python manage.py runserver 0.0.0.0:8000"
timeout /t 3 /nobreak > nul
echo.

REM Step 4: Start Expo (QR code will show here)
echo [4/4] Starting Expo...
echo.
echo ============================================
echo SCAN QR CODE BELOW WITH EXPO GO APP
echo ============================================
echo.
cd /d "%~dp0SmartBusApp"
npx expo start
pause
