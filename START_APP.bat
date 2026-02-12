@echo off
echo ============================================
echo Starting Smart Bus Conductor Application
echo ============================================
echo.

REM Step 1: Setup ngrok tunnel
echo [1/3] Setting up ngrok tunnel...
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-ngrok.ps1"
echo.

REM Step 2: Start Django backend in background
echo [2/3] Starting Django backend in new window...
cd /d "%~dp0backend"
start "Django Backend" cmd /k "python manage.py runserver 0.0.0.0:8000"
timeout /t 3 /nobreak > nul
echo.

REM Step 3: Start Expo (QR code will show here)
echo [3/3] Starting Expo...
echo.
echo ============================================
echo SCAN QR CODE BELOW WITH EXPO GO APP
echo ============================================
echo.
cd /d "%~dp0SmartBusApp"
npx expo start
pause
