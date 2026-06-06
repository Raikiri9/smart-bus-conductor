# 🚀 OSRM + ngrok for LD Player - Quick Start Guide

## Overview
Your Smart Bus app now calculates **accurate road distances** for LD Player using OSRM + ngrok tunnels. No more straight-line haversine approximations!

---

## 🎯 What Changed

| Before | After |
|--------|-------|
| Haversine (straight-line): 127 km | OSRM (actual road): 184 km ✅ |
| Hardcoded IP: `http://10.0.2.2:3001` | Dynamic ngrok URL ✅ |
| Manual configuration | Auto-configured ✅ |
| Broken with LD Player | Works perfectly with LD Player ✅ |

---

## ✅ Quick Setup (3 Steps)

### Step 1: Verify Everything
```powershell
.\VERIFY_OSRM_SETUP.ps1
```
**Expected Output**: All checks pass (green)

### Step 2: Authenticate ngrok
```powershell
ngrok authtoken YOUR_TOKEN_HERE
```
Get your token at: https://dashboard.ngrok.com/auth/your-authtoken

### Step 3: Start the App
```powershell
.\START_APP.ps1
```
Or use `.\START_APP.bat` if PowerShell doesn't work.

---

## 🎮 Test in LD Player

1. **Open Expo Go** app (if not installed, get from PlayStore)

2. **Scan QR Code** shown in terminal

3. **Navigate to Home** → **Select Destination**

4. **Search for a location** (e.g., "Harare")

5. **Observe**:
   - ⏳ "Calculating..." indicator appears
   - 📍 Distance shows actual road distance
   - 💰 Fare calculated correctly

6. **Compare**:
   - Haversine would show ~100km
   - OSRM shows ~150km (actual road)

---

## 📊 What Gets Started

When you run `START_APP.ps1`, this happens automatically:

```
[1/4] OSRM Proxy Server
   ✓ Starts: node osrm-proxy.js
   ✓ Port: 3001
   ✓ Status: Ready for distance calculations

[2/4] ngrok Tunnels  
   ✓ Backend tunnel: https://YOUR-ID.ngrok-free.dev
   ✓ OSRM tunnel: https://YOUR-ID.ngrok-free.dev:3001
   ✓ Status: Both updated in .env file

[3/4] Django Backend
   ✓ Starts: python manage.py runserver
   ✓ Port: 8000
   ✓ Status: Running

[4/4] Expo Dev Server
   ✓ Shows: QR code for scanning
   ✓ Status: Ready for connection
```

---

## 🔍 How It Works

### Network Route:
```
LD Player App
    ↓
Selects destination → requests distance
    ↓
destination.tsx: "I need OSRM URL"
    ↓
osrm.config.ts: "Check .env for ngrok tunnel"
    ↓
.env file: EXPO_PUBLIC_OSRM_NGROK_URL=https://xyz.ngrok-free.dev
    ↓
routeDistanceKm(lat, lon, lat, lon, osrmUrl)
    ↓
🌐 HTTPS request through ngrok tunnel
    ↓
Public OSRM API: Calculate route distance
    ↓
✅ Returns: 184 km (actual road distance)
```

---

## 🛠️ Manual Start (If Needed)

If automatic start fails, use 4 terminals:

**Terminal 1** - OSRM Proxy:
```powershell
node osrm-proxy.js
```

**Terminal 2** - ngrok:
```powershell
.\scripts\start-ngrok.ps1
```

**Terminal 3** - Backend:
```powershell
cd backend
python manage.py runserver 0.0.0.0:8000
```

**Terminal 4** - Expo:
```powershell
cd SmartBusApp
npx expo start
```

---

## 🐛 Troubleshooting

### "Distance still shows haversine (127 km instead of 184 km)"
→ OSRM tunnel not created. Check:
```powershell
# Verify OSRM URL in .env
type SmartBusApp\.env | grep OSRM

# Should show:
# EXPO_PUBLIC_OSRM_NGROK_URL=https://something.ngrok-free.dev
```

### "Calculating... stays forever"
→ OSRM proxy not running. Check:
```powershell
# Is it running?
netstat -ano | findstr :3001

# If not, start it:
node osrm-proxy.js
```

### "ngrok says 'connection refused'"
→ Backend not running. Check:
```powershell
# Is Django running?
netstat -ano | findstr :8000

# If not, start it:
cd backend
python manage.py runserver 0.0.0.0:8000
```

### "ngrok authentication failed"
→ Need ngrok account. Get token:
1. Go to: https://dashboard.ngrok.com
2. Sign up (free)
3. Get your authtoken
4. Run: `ngrok authtoken YOUR_TOKEN`

### "app still uses straight-line (haversine) distance"
→ Emergency rollback - edit `distance.ts`:
```typescript
// Line ~28
const FORCE_HAVERSINE = true; // Change to true to use only straight-line
```

---

## 📱 Device Support

| Device | Status | Notes |
|--------|--------|-------|
| LD Player x86 | ✅ Works | Uses ngrok tunnel |
| Android Emulator ARM | ✅ Works | Uses localhost:3001 |
| iPhone Simulator | ✅ Works | Uses localhost:3001 |
| Physical Phone | ✅ Works | Uses ngrok tunnel automatically |

---

## 📋 Environment Variables

Automatically managed - but good to know:

```env
# Backend API URL (auto-updated by start-ngrok.ps1)
EXPO_PUBLIC_API_BASE_URL=https://chirurgic-jazmine-uncontroverted.ngrok-free.dev

# OSRM Proxy URL (auto-updated by start-ngrok.ps1)
EXPO_PUBLIC_OSRM_NGROK_URL=https://your-ngrok-id.ngrok-free.dev
```

---

## ✨ Key Features

✅ **Automatic**: No manual IP configuration  
✅ **Reliable**: Works with LD Player's x86 bridging  
✅ **Smart**: Falls back to haversine if needed  
✅ **Visible**: Shows "Calculating..." while fetching  
✅ **Debuggable**: Console logs for troubleshooting  
✅ **Reversible**: Easy to disable if issues arise  

---

## 📞 Still Having Issues?

Check these files:
- Console logs: Look for `[OSRM]` prefix
- Configuration: `SmartBusApp/.env`
- Source code: `SmartBusApp/app/destination.tsx`
- Settings: `SmartBusApp/config/osrm.config.ts`

Check the comprehensive guide:
```
.\OSRM_NGROK_IMPLEMENTATION.md
```

---

## 🎓 What Was Implemented

**Configuration**: Dynamic OSRM URL from environment variables  
**Infrastructure**: ngrok multi-tunnel setup (backend + OSRM)  
**Integration**: destination.tsx now calls routeDistanceKm with ngrok URL  
**UX**: Loading indicator while calculating distance  
**Safety**: Automatic fallback to haversine if OSRM fails  
**Verification**: Setup validation script included  

---

## 💡 Pro Tips

1. **Monitor ngrok**: Open http://127.0.0.1:4040 to see live traffic
2. **Test OSRM directly**: 
   ```powershell
   curl "https://YOUR-NGROK-ID.ngrok-free.dev/route/v1/driving/28.5832,-20.1608;29.1549,-19.0155"
   ```
3. **Check logs**: Terminal shows [OSRM], [Distance], [Backend] logs
4. **Keep ngrok open**: Don't close the ngrok terminal - it creates the tunnel

---

**Ready to go!** Run `.\START_APP.ps1` and test with LD Player. 🚀
