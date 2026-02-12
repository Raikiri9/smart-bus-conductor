# Quick Start Guide

## How to Start the Application (No IP Address Changes Needed!)

### Option 1: Double-click (Easiest)
Simply double-click **`START_APP.bat`** in the project root folder.

### Option 2: Command Line
```bash
cd SmartBusApp
npm start
```

### Option 3: PowerShell
```powershell
.\START_APP.ps1
```

## What Happens Automatically?

When you use any of the methods above, the system will:

1. ✅ **Start ngrok tunnel** - Creates a stable public URL that never changes
2. ✅ **Update .env file** - Automatically updates the backend URL
3. ✅ **Start Django backend** - Runs on port 8000
4. ✅ **Start Expo** - Opens the development server

## Important: Don't Use `npx expo start` Directly!

❌ **DON'T**: `npx expo start` (skips backend and ngrok setup)
✅ **DO**: `npm start` or use the START_APP scripts

## The ngrok Tunnel Solution

The app uses **ngrok** to create a stable public HTTPS URL that:
- Works across Wi-Fi network changes
- Never requires updating IP addresses manually
- Accessible from any device on any network
- Automatically updates the `.env` file with the correct URL

Your ngrok URL will look like: `https://something-random-words.ngrok-free.dev`

## Testing Backend Connection

Once started, you can test if everything is working:

```powershell
# Test local backend
Invoke-WebRequest http://localhost:8000/api/trips/health/ -UseBasicParsing

# View ngrok dashboard
Start-Process http://localhost:4040
```

## Troubleshooting

### "Network request failed" error?
- Make sure you used `npm start` instead of `npx expo start`
- Check if backend is running: http://localhost:8000/api/trips/health/
- Check ngrok dashboard: http://localhost:4040

### Backend not starting?
```bash
cd backend
python manage.py runserver
```

### Ngrok not starting?
```bash
ngrok http 8000
```
Then run: `.\scripts\start-ngrok.ps1` to update .env

## Need to Stop Everything?

Press `Ctrl+C` in the terminal where you ran the start command.

Or close all terminal windows.
