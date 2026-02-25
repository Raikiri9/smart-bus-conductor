# 🎯 Manual + Backend Automation - Quick Start

## ✅ Current Status

**All services are running:**
- ✅ Django Backend → Port 8000
- ✅ Node-RED → Port 1880  
- ✅ Android Emulator → emulator-5554

---

## 📦 What's Been Created

### 1. **Node-RED Demonstration Flows** 
File: `node-red-manual-demo.json`

**Features:**
- 🎬 Normal Journey scenario (create trip)
- 📍 Approaching destination trigger
- 🚻 Bus break simulation
- 🚪 Disembark action
- 📱 QR code validation

**How to Import:**
```
1. Open http://localhost:1880
2. Menu (☰) → Import
3. Select file: node-red-manual-demo.json
4. Click Deploy button
```

### 2. **Complete Demonstration Guide**
File: `MANUAL_DEMONSTRATION_GUIDE.md`

**Contains:**
- 📋 Prerequisites checklist
- 🎯 3 complete scenarios (Normal Journey, Bus Break, Missed Destination)
- 🧪 Individual feature tests
- 🎥 Presentation script
- 🔧 Troubleshooting guide
- 📁 File references

### 3. **Quick Launcher Script**
File: `START_DEMO.ps1`

**Usage:**
```powershell
.\START_DEMO.ps1
```

**Does:**
- Checks running services
- Auto-starts missing services
- Opens Node-RED and Django Admin
- Shows next steps

---

## 🚀 How to Demonstrate

### **Option A: Simple Start (If services running)**

1. **Import Node-RED flows** (one-time)
   - http://localhost:1880 → Import → node-red-manual-demo.json → Deploy

2. **Start Expo app**
   ```powershell
   cd SmartBusApp
   npx expo start
   ```

3. **Follow demonstration guide**
   - Open: `MANUAL_DEMONSTRATION_GUIDE.md`
   - Run Scenario 1: Normal Journey

### **Option B: Complete Setup (From scratch)**

1. **Run launcher**
   ```powershell
   .\START_DEMO.ps1
   ```

2. **Import Node-RED flows** (shown in launcher output)

3. **Start Expo** (manual step)
   ```powershell
   cd SmartBusApp
   npx expo start
   ```

4. **Follow guide** → `MANUAL_DEMONSTRATION_GUIDE.md`

---

## 🎬 Demonstration Flow (3-5 minutes)

### **Phase 1: Ticket Purchase** (60 seconds)
```
Node-RED: Click "🎬 SCENARIO: Normal Journey"
         → Creates trip with QR: DEMO-NORMAL-001

App:     Tap "Choose Destination" 
         → Select "Bulawayo City Centre"
         → Enter QR: DEMO-NORMAL-001
         → Proceed to Pay
         → Confirm Payment
         → Shows trip confirmation
```

### **Phase 2: Journey Monitoring** (60 seconds)
```
Node-RED: Click "📍 Trigger: Approaching Alert"
         → Sets GPS 3km from destination

App:     Alert appears: "You are 3.0 km away..."
         → Tap "Disembark"
         → Success screen shown
```

### **Phase 3: Special Features** (90 seconds)
```
Node-RED: Click "🚻 Trigger: Bus Break"
         → Updates backend: on_bus_break = True

App:     Navigate to Bus Break screen
         → Shows break status
         
         Demonstrate offline mode:
         → Stop backend (Ctrl+C)
         → Try action → Shows offline indicator
         → Restart backend → Queue syncs
```

---

## 📊 What This Demonstrates

✅ **Complete passenger journey** - Selection → Payment → Monitoring → Disembark  
✅ **Real-time GPS alerts** - Distance-based notifications at 5km threshold  
✅ **Payment integration** - QR codes, Paynow mock, fare validation  
✅ **Special scenarios** - Bus breaks, missed stops, offline mode  
✅ **Backend automation** - Node-RED controls state while UI updates  
✅ **Full-stack integration** - Django REST ↔ React Native ↔ Testing tools  

---

## 🔧 Quick Commands

### Check Services:
```powershell
netstat -ano | findstr ":8000 :1880"  # Check ports
adb devices                            # Check emulator
```

### Restart Services:
```powershell
# Backend
cd backend
python manage.py runserver 0.0.0.0:8000

# Node-RED
node-red

# Expo
cd SmartBusApp
npx expo start
```

### Test Backend API:
```powershell
$body = @{qr_code="TEST-001"; action=""} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/api/trips/validate/" -Method POST -Body $body -ContentType "application/json"
```

---

## 📱 Device URLs

- **Emulator backend**: `http://10.0.2.2:8000/api/trips/`
- **Localhost backend**: `http://localhost:8000/api/trips/`
- **Node-RED editor**: `http://localhost:1880`
- **Django admin**: `http://localhost:8000/admin`

---

## 🎓 Why This Approach?

**Technical Reasons:**
- Custom URL schemes require dev builds (not supported in Expo Go)
- Build environment issues (Java 25 vs 21, gradle conflicts)
- Time constraint vs functionality

**Academic Value:**
- Demonstrates full integration
- Shows real-world testing strategy
- Proves technical understanding
- Hybrid approach = API testing + UI demonstration

**Production Relevance:**
- Mirrors real testing: Backend automation + manual QA
- Faster iteration than full E2E
- Better debugging visibility

---

## 📞 Troubleshooting

**Backend not responding:**
```powershell
# Check process
netstat -ano | findstr ":8000"

# Kill and restart
taskkill /F /PID <PID>
cd backend; python manage.py runserver 0.0.0.0:8000
```

**Node-RED flows not deployed:**
1. Look for red "Deploy" button (top right)
2. Click it
3. Should show "Successfully deployed"

**App not connecting:**
- Check [utils/api.ts](SmartBusApp/utils/api.ts) has `10.0.2.2:8000`
- Verify emulator is running: `adb devices`
- Check backend logs for incoming requests

**GPS alerts not triggering:**
- Threshold is 5km (see [TripContext.tsx](SmartBusApp/utils/TripContext.tsx))
- Verify destination coordinates match
- Check console logs for distance calculations

---

## 📁 Important Files

**Created Today:**
- `node-red-manual-demo.json` - Automation flows
- `MANUAL_DEMONSTRATION_GUIDE.md` - Complete guide
- `START_DEMO.ps1` - Quick launcher
- `DEMO_SETUP_SUMMARY.md` - This file

**Existing Implementation:**
- `backend/trips/views.py` - API endpoints
- `backend/trips/models.py` - Data models
- `SmartBusApp/utils/api.ts` - API client
- `SmartBusApp/utils/TripContext.tsx` - GPS monitoring
- `SmartBusApp/utils/OfflineQueueManager.ts` - Offline sync

---

## ✅ Ready Checklist

Before demonstration:
- [ ] Backend running (port 8000)
- [ ] Node-RED running (port 1880)
- [ ] Flows imported and deployed
- [ ] Emulator running (adb devices shows device)
- [ ] Expo app started (npx expo start)
- [ ] Read MANUAL_DEMONSTRATION_GUIDE.md
- [ ] Practice Scenario 1 once

---

## 🎉 Success!

You now have a **fully functional demonstration system** that:
- Works **immediately** (no build required)
- Shows **all features** (trip flow, GPS, payment, offline)
- Uses **production code** (real API calls, real UI)
- Demonstrates **integration** (Frontend ↔ Backend ↔ Testing)

**Next Step:** Open `MANUAL_DEMONSTRATION_GUIDE.md` and run Scenario 1!

---

🚌 **Good luck with your demonstration!**
