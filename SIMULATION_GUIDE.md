# 🎮 Smart Bus Visual Simulation Guide

Complete guide for testing your Smart Bus app with real visual simulations using Node-RED and deep linking.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [How It Works](#how-it-works)
3. [Simulation Types](#simulation-types)
4. [Setup Instructions](#setup-instructions)
5. [Testing Scenarios](#testing-scenarios)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- ✅ Backend running on `http://localhost:8000`
- ✅ Node-RED running on `http://localhost:1880`
- ✅ Expo app running on Android emulator or physical device
- ✅ ADB installed (for emulator testing)

### Import Flow
1. Open Node-RED at http://localhost:1880
2. Click hamburger menu (☰) → Import
3. Select `node-red-simulations.json`
4. Click "Import"
5. Click "Deploy"

---

## 🎯 How It Works

This hybrid solution combines **Deep Links** (instant actions) with **Backend API** (GPS paths):

```
┌─────────────┐
│  Node-RED   │ ──────────────────────────┐
└─────────────┘                            │
       │                                   │
       │ Creates GPS Path                  │ Generates Deep Link
       ▼                                   ▼
┌─────────────┐                    ┌──────────────┐
│   Backend   │ ◄─── Polls ─────── │   Expo App   │
│  Simulation │                     │   (Tablet)   │
│     API     │                     └──────────────┘
└─────────────┘
```

### Deep Links (Instant Triggers)
- Format: `smartbusapp://simulate?type=X&param=Y`
- Examples:
  - `smartbusapp://simulate?type=qr&code=BUS-123` → Simulates QR scan
  - `smartbusapp://simulate?type=approaching&destination=Harare` → Shows alert
  - `smartbusapp://simulate?type=missed&destination=Harare` → Missed alert

### Backend GPS API (Continuous Movement)
- Node-RED creates path with waypoints
- App polls `/api/simulate/gps/next/{session_id}/` every 2 seconds
- Backend returns next GPS coordinate
- App updates location and triggers proximity alerts

---

## 🎨 Simulation Types

### 1. 📷 QR Code Simulation
**What it does:** Instantly simulates scanning a QR code  
**Use case:** Test boarding without physical QR codes

**Steps:**
1. Click "📷 Simulate QR Scan" in Node-RED
2. Copy the deep link from Debug panel
3. Run on emulator:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=qr&code=BUS-123"
   ```
4. App shows QR scan result immediately

---

### 2. 📍 GPS Location Simulation
**What it does:** Sets app GPS to specific coordinates  
**Use case:** Jump to specific location instantly

**Steps:**
1. Click "📍 Simulate GPS Location" in Node-RED
2. Copy the deep link
3. Run on emulator:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=gps&lat=-17.8292&lng=31.0522"
   ```
4. App location updates to Harare

---

### 3. 🔔 Approaching Destination Alert
**What it does:** Triggers "approaching destination" notification  
**Use case:** Test proximity alerts without GPS movement

**Steps:**
1. Click "🔔 Approaching Destination" in Node-RED
2. Copy the deep link
3. Run on emulator:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=approaching&destination=Harare&distance=500"
   ```
4. App shows: "📍 You are 500m away from Harare"

---

### 4. ⚠️ Missed Destination Alert
**What it does:** Triggers "missed destination" warning  
**Use case:** Test missed stop scenarios

**Steps:**
1. Click "⚠️ Missed Destination" in Node-RED
2. Copy the deep link
3. Run on emulator:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=missed&destination=Harare"
   ```
4. App shows: "⚠️ You have passed Harare. Please notify the driver."

---

### 5. 🗺️ GPS Path Simulation (Full Journey)
**What it does:** Simulates realistic GPS movement along a route  
**Use case:** Test complete journey with approaching/arrival alerts

**Steps:**

#### Step 1: Create Journey Path
1. Click "1️⃣ Create Journey Path" in Node-RED
2. This creates a path from Bulawayo to Harare (10 waypoints)
3. Check Debug panel for `session_id`

#### Step 2: Start Journey in App
1. Click "2️⃣ Start Journey in App"
2. Copy the `adb_command` from Debug panel
3. Run on emulator:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate/gps?session_id=journey-1234567890"
   ```

#### What Happens:
- App polls backend every 2 seconds
- GPS location updates automatically
- When within 500m of destination → "Approaching" alert
- At destination → Journey complete
- **Real-time visual feedback on map!**

---

### 6. 🎬 Complete Scenario (All-in-One)
**What it does:** Creates trip + QR code + GPS journey in one click  
**Use case:** Full end-to-end testing

**Steps:**
1. Click "▶️ Run Complete Scenario" in Node-RED
2. Debug panel shows two commands
3. Run both commands:
   ```bash
   # Command 1: Simulate QR scan
   adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=qr&code=BUS-123456"
   
   # Command 2: Start GPS journey
   adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate/gps?session_id=scenario-123"
   ```

4. Watch the app:
   - ✅ QR code scanned
   - ✅ Trip created
   - ✅ GPS updates every 2 seconds
   - ✅ Approaching alert when near
   - ✅ Arrival notification

---

## 🛠️ Setup Instructions

### 1. Start Backend
```powershell
cd backend
python manage.py runserver
```

### 2. Start Node-RED
```powershell
node-red
```
Open http://localhost:1880

### 3. Import Simulation Flow
1. Click ☰ → Import
2. Select `node-red-simulations.json`
3. Deploy

### 4. Start Expo App
```powershell
cd SmartBusApp
npx expo start
```
Press `a` for Android emulator

### 5. Verify Deep Links Work
Test with simple link:
```bash
adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=qr&code=TEST"
```

If you see "QR Scanned" alert → Setup complete! ✅

---

## 🧪 Testing Scenarios

### Scenario 1: QR Boarding Test
**Goal:** Test QR code scanning without physical codes

1. Click "📷 Simulate QR Scan"
2. Copy deep link from debug
3. Run adb command
4. ✅ Verify: QR scan dialog appears with code

---

### Scenario 2: Approaching Destination
**Goal:** Test proximity alerts

1. Create a trip in app
2. Click "🔔 Approaching Destination"
3. Run deep link
4. ✅ Verify: Alert shows "500m away from Harare"

---

### Scenario 3: Complete Journey
**Goal:** Simulate realistic bus journey

1. Click "1️⃣ Create Journey Path"
2. Note the session_id from debug
3. Click "2️⃣ Start Journey in App"
4. Run the adb command
5. ✅ Verify:
   - GPS location updates every 2 seconds
   - Map shows movement
   - Approaching alert at 500m
   - Arrival notification at destination

---

### Scenario 4: Missed Destination
**Goal:** Test missed stop handling

1. Create a trip
2. Click "⚠️ Missed Destination"
3. Run deep link
4. ✅ Verify: Warning alert appears

---

### Scenario 5: Bus Break Testing
**Goal:** Test passenger temporarily leaving bus

1. Create trip with QR code
2. In Node-RED (original flow tab):
   - Click "1. Create Test Trip"
   - Click "3a. Test Bus Break OUT"
   - ✅ Verify: Status = "valid", action = "bus_break_out"
   - Click "3b. Test Bus Break IN"
   - ✅ Verify: Status = "valid", action = "bus_break_in"

---

## 🐛 Troubleshooting

### Issue: Deep links don't work
**Solution:**
1. Check app scheme in `app.json`: `"scheme": "smartbusapp"`
2. Rebuild app: `npx expo start --clear`
3. Test with browser first: Open deep link in Android Chrome
4. ADB alternative:
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "smartbusapp://simulate?type=qr&code=TEST"
   ```

---

### Issue: GPS simulation not moving
**Solution:**
1. Check backend is running: http://localhost:8000/api/trips/health/
2. Verify session created: Click "📋 List All Simulations"
3. Check Debug panel in Node-RED for errors
4. For emulator, use `10.0.2.2:8000` not `localhost:8000`

---

### Issue: "No session found" error
**Solution:**
1. Click "1️⃣ Create Journey Path" FIRST
2. Wait for "Journey Created" in debug
3. Then click "2️⃣ Start Journey in App"

---

### Issue: ADB command not found
**Solution:**
1. Install Android SDK Platform Tools
2. Add to PATH:
   - Windows: `C:\Users\<user>\AppData\Local\Android\Sdk\platform-tools`
   - Mac: `/Users/<user>/Library/Android/sdk/platform-tools`
3. Test: `adb devices`

---

### Issue: Alerts not showing
**Solution:**
1. Check SimulationContext is loaded in app
2. Verify imports in `app/_layout.tsx`:
   ```tsx
   import { SimulationProvider } from '../utils/SimulationContext';
   ```
3. Check console logs: `npx expo start` terminal should show "📱 Deep link received"

---

## 📱 Testing on Physical Device

### Android Device
1. Enable USB debugging
2. Connect via USB
3. Run: `adb devices` (should show your device)
4. Use same adb commands as emulator
5. Or install app that can open deep links (e.g., Chrome)

### Alternative: QR Code Method
1. Generate QR code for deep link: https://www.qr-code-generator.com/
2. Encode: `smartbusapp://simulate?type=qr&code=BUS-123`
3. Scan with camera → Opens in app

---

## 🎓 Advanced Usage

### Custom GPS Path
Edit `func_journey_path` node in Node-RED:
```javascript
const waypoints = [
    {lat: -20.1500, lng: 28.5667, heading: 45, speed: 22},  // Start
    {lat: -19.8000, lng: 28.8000, heading: 45, speed: 25},  // Point 2
    // Add more points...
];
```

### Adjust Simulation Speed
In `SimulationContext.tsx`:
```typescript
const interval = setInterval(async () => {
    // Poll every 2 seconds (default)
    // Change to 1000 for faster, 4000 for slower
}, 2000 / state.simulationSpeed);
```

### Create Custom Scenarios
Add new inject node in Node-RED:
```javascript
// Custom deep link
const deepLink = `smartbusapp://simulate?type=custom&param1=value1`;
msg.payload = { deep_link: deepLink };
return msg;
```

Handle in `SimulationContext.tsx` (handleSimulateAction):
```typescript
case 'custom':
    // Your custom logic
    break;
```

---

## 🎮 Quick Command Reference

```bash
# Test QR scan
adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=qr&code=BUS-TEST"

# Set GPS location
adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=gps&lat=-17.8292&lng=31.0522"

# Approaching alert
adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=approaching&destination=Harare&distance=500"

# Missed destination
adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=missed&destination=Harare"

# Start GPS journey (replace session_id)
adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate/gps?session_id=journey-123"
```

---

## 📊 API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/trips/simulate/gps/create/` | POST | Create GPS simulation path |
| `/api/trips/simulate/gps/next/<session_id>/` | GET | Get next GPS point |
| `/api/trips/simulate/gps/reset/<session_id>/` | POST | Reset simulation to start |
| `/api/trips/simulate/gps/list/` | GET | List all simulations |

---

## ✅ Testing Checklist

- [ ] Backend running on port 8000
- [ ] Node-RED running on port 1880
- [ ] Simulation flows imported and deployed
- [ ] Expo app running on emulator/device
- [ ] ADB working (`adb devices` shows device)
- [ ] Deep links working (test with QR scan)
- [ ] GPS simulation creates path successfully
- [ ] App polls backend and updates location
- [ ] Approaching alerts trigger at 500m
- [ ] Missed destination alerts work
- [ ] Complete scenario runs end-to-end

---

## 🎉 Success Indicators

Your simulations are working when:
1. ✅ Deep links open app and show alerts
2. ✅ GPS updates location on map every 2 seconds
3. ✅ "Approaching" alert appears near destination
4. ✅ Node-RED debug shows "valid" responses
5. ✅ App responds to all simulation types

---

## 📞 Need Help?

- Check Debug panel in Node-RED (right sidebar)
- View app console: `npx expo start` terminal output
- Backend logs: Django terminal shows all API calls
- Test individual pieces before combining

Happy Testing! 🚌
