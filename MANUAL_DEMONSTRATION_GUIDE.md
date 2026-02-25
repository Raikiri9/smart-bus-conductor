# 🎬 Manual Demonstration Guide
## Smart Bus Conductor - Hybrid Testing Approach

> **Approach:** Manual app navigation + Node-RED backend automation  
> **Why:** Works immediately with Expo Go, demonstrates full functionality  
> **Runtime:** Expo Go on Android Emulator  

---

## 📋 Prerequisites

### Running Services:
1. ✅ **Django Backend** - Port 8000
2. ✅ **Node-RED** - Port 1880  
3. ✅ **Expo Go** - Android Emulator (emulator-5554)

### Setup Commands:
```powershell
# Terminal 1: Start Backend
cd "C:\Users\USER\Desktop\Smart Bus Conductor Mobile Application\backend"
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Start Node-RED  
cd "C:\Users\USER\Desktop\Smart Bus Conductor Mobile Application"
node-red

# Terminal 3: Start Expo
cd "C:\Users\USER\Desktop\Smart Bus Conductor Mobile Application\SmartBusApp"
npx expo start
```

### Import Node-RED Flows:
1. Open Node-RED: http://localhost:1880
2. Click menu (☰) → Import
3. Select file: `node-red-manual-demo.json`
4. Click **Deploy** button (top right)

---

## 🎯 Complete Journey Demonstration

### **SCENARIO 1: Normal Journey (Destination Reached)**

#### Step 1: Create Trip (Node-RED)
1. In Node-RED, click **"🎬 SCENARIO: Normal Journey"**
2. Check debug panel → Should show: `✅ Trip Created`
3. Note the QR code: `DEMO-NORMAL-001`

#### Step 2: Select Destination (Manual - App)
1. Open app in Expo Go
2. Tap **"Choose Destination"** button
3. Select **"Bulawayo City Centre"** from list
4. Tap **"Confirm"** → Navigates to Payment screen

#### Step 3: Payment (Manual - App)
1. On Payment screen, scan QR code OR enter manually: `DEMO-NORMAL-001`
2. Fare amount shown: **$15.00**
3. Tap **"Proceed to Pay"**
4. Shows mock Paynow dialog
5. Tap **"Confirm Payment"** → Navigates to Confirmation

#### Step 4: Trip Confirmation (Manual - App)
1. Confirmation screen shows:
   - ✅ Origin: Harare Bus Terminal
   - ✅ Destination: Bulawayo City Centre  
   - ✅ Fare: $15.00
   - ✅ QR Code: DEMO-NORMAL-001
2. **Wait 3 seconds** - GPS monitoring starts automatically
3. Status changes to **"Trip in progress..."**

#### Step 5: Trigger Approaching Alert (Node-RED)
1. In Node-RED, click **"📍 Trigger: Approaching Alert"**
2. This sets GPS location 3km from destination
3. **Watch the app** - Alert appears within 2 seconds:
   ```
   📍 Approaching Destination
   You are 3.0 km away from Bulawayo City Centre
   [Disembark]  [Continue]
   ```

#### Step 6: Disembark (Node-RED)
1. In app, tap **"Disembark"** button on alert
2. OR in Node-RED, click **"🚪 Trigger: Disembark"**
3. Watch app navigate to Disembark success screen
4. Shows: **"Journey completed successfully!"**

**✅ Scenario 1 Complete** - Demonstrates: Trip creation, payment, GPS monitoring, destination alerts, successful disembark

---

### **SCENARIO 2: Bus Break**

#### Prerequisites:
- Complete Steps 1-4 from Scenario 1 (trip must be active)

#### Step 1: Passenger Needs Break
1. In Node-RED, click **"🚻 Trigger: Bus Break"**
2. Backend updates: `on_bus_break = True`
3. Check debug: `✅ Passenger marked as on break`

#### Step 2: Manual Navigation (App)
1. In app, navigate to **Bus Break** screen
2. Tap **"I'm Taking a Break"**
3. Shows confirmation message
4. Passenger status: **"On break"**

#### Step 3: Return from Break (Node-RED)
1. Create new function node with action: `bus_break_in`
2. OR manually navigate back in app
3. Tap **"I'm Back on Bus"**
4. Backend updates: `on_bus_break = False`

#### Step 4: QR Scan Validation (Node-RED)
1. Click **"📱 Simulate: QR Scan"** 
2. Check debug panel:
   - Status: `valid`
   - On Break: `False`
   - Message: Passenger back on bus

**✅ Scenario 2 Complete** - Demonstrates: Bus break functionality, QR validation, state management

---

### **SCENARIO 3: Missed Destination**

#### Step 1: Setup (Node-RED + Manual)
1. Create trip: Click **"🎬 SCENARIO: Normal Journey"**
2. Manually navigate through: Destination → Payment → Confirmation

#### Step 2: Trigger Approaching Alert (Node-RED)
1. Click **"📍 Trigger: Approaching Alert"**
2. Alert appears in app: **"You are 3.0 km away..."**

#### Step 3: Miss the Stop (Manual)
1. In alert dialog, tap **"Continue"** (instead of Disembark)
2. App continues GPS monitoring
3. Bus passes the destination

#### Step 4: Missed Alert (Automatic)
- After passing destination (simulated by backend):
- App shows: **"⚠️ Missed Destination - You have passed your stop!"**
- Demonstrates real-time GPS tracking beyond destination

**✅ Scenario 3 Complete** - Demonstrates: GPS precision, missed stop detection, alert system

---

## 🧪 Individual Feature Tests

### Test 1: QR Code Validation
```
Action: Click "📱 Simulate: QR Scan" in Node-RED
Expected: 
- Status: "valid"
- Trip details returned
- Passenger count incremented
```

### Test 2: Offline Mode
```
Action: 
1. Stop Django backend (Ctrl+C)
2. In app, try to select destination
3. Payment → QR scan

Expected:
- Offline indicator shows (top of screen)
- Actions queued locally
- Shows "Working offline" message
- When backend restarts, queue syncs automatically
```

### Test 3: Payment Flow
```
Action: Manual payment with different amounts
Expected:
- Shows Paynow mock dialog
- Validates amount matches fare
- Updates trip status: "paid"
```

### Test 4: GPS Simulation
```
Action: Create custom GPS path in Node-RED
Code:
msg.payload = {
    session_id: "custom-path-001",
    waypoints: [
        { lat: -17.8292, lng: 31.0522, heading: 90, speed: 80 },  // Harare
        { lat: -19.0154, lng: 29.1549, heading: 220, speed: 70 }, // Midpoint
        { lat: -20.1500, lng: 28.5667, heading: 270, speed: 60 }  // Bulawayo
    ]
};
return msg;

Expected: App polls /api/trips/simulate/gps/next/{session_id}/ every 2 seconds
```

---

## 📊 Demonstration Checklist

Use this checklist during presentation:

- [ ] **Backend APIs Working**
  - [ ] Trip creation endpoint responds
  - [ ] Validation endpoint accepts QR codes
  - [ ] GPS simulation creates sessions
  
- [ ] **App Screens Functional**
  - [ ] Destination selection loads cities
  - [ ] Payment screen accepts QR input
  - [ ] Confirmation shows trip details
  - [ ] Bus break screen toggles state
  - [ ] Disembark screen completes journey

- [ ] **Real-Time Features**
  - [ ] GPS monitoring triggers at 5km
  - [ ] Alerts display with distance
  - [ ] Offline indicator appears when backend down
  - [ ] Queue syncs when connection restored

- [ ] **Node-RED Automation**
  - [ ] Flows imported successfully
  - [ ] Debug panel shows responses
  - [ ] Backend state updates propagate to app

---

## 🎥 Presentation Script

### Introduction (30 seconds)
*"This is a self-service bus ticketing kiosk designed for tablet devices. It handles destination selection, payment processing, QR-based validation, and GPS-based alerts. I'll demonstrate the complete passenger journey using a hybrid testing approach."*

### Live Demonstration (3-4 minutes)

**Part 1: Ticket Purchase**
1. *"First, the passenger selects their destination..."* [Tap destination]
2. *"The system calculates the fare and shows payment options..."* [Show payment screen]  
3. *"After scanning their unique QR code..."* [Show QR]
4. *"Payment is processed through Paynow..."* [Tap proceed]
5. *"Trip confirmation displays all details..."* [Show confirmation]

**Part 2: Journey Monitoring**
1. *"The system automatically monitors GPS location..."* [Point to status]
2. *"When approaching the destination..."* [Click Node-RED button]
3. *"An alert appears with exact distance..."* [Show alert popup]
4. *"Passenger can disembark or continue..."* [Tap disembark]

**Part 3: Special Features**
1. *"If a passenger needs a break..."* [Navigate to bus break]
2. *"The system tracks their status..."* [Click Node-RED button]
3. *"And validates when they return..."* [Show QR scan]

**Part 4: Offline Capability**
1. *"If network connection is lost..."* [Stop backend]
2. *"The app queues actions locally..."* [Try action, show offline indicator]
3. *"And syncs when connection returns..."* [Start backend, watch sync]

### Technical Explanation (1 minute)
*"The backend is Django with REST APIs, frontend is React Native with Expo, and Node-RED orchestrates testing. We use hybrid testing: Node-RED automates backend state while I manually demonstrate the UI. This shows full integration without build complexity."*

---

## 🔧 Troubleshooting

### Backend not responding:
```powershell
# Check if running
netstat -ano | findstr :8000

# Restart
cd backend
python manage.py runserver 0.0.0.0:8000
```

### App not connecting:
- Emulator uses `10.0.2.2:8000` (not `localhost`)
- Check [utils/api.ts](SmartBusApp/utils/api.ts#L1) - should have emulator URL

### Node-RED flows not working:
1. Check flows are deployed (red **Deploy** button shouldn't show)
2. Verify debug panel is open (bug icon in sidebar)
3. Check backend URL is correct in HTTP request nodes

### GPS alerts not triggering:
- Check [TripContext.tsx](SmartBusApp/utils/TripContext.tsx) - threshold is 5km
- Verify destination coordinates match
- Use console logs: `console.log('Distance:', distanceKm)`

---

## 📁 File References

### Key Implementation Files:
- **Backend API**: [backend/trips/views.py](backend/trips/views.py)
- **Trip Models**: [backend/trips/models.py](backend/trips/models.py)
- **API Client**: [SmartBusApp/utils/api.ts](SmartBusApp/utils/api.ts)
- **GPS Monitoring**: [SmartBusApp/utils/TripContext.tsx](SmartBusApp/utils/TripContext.tsx)
- **Offline Queue**: [SmartBusApp/utils/OfflineQueueManager.ts](SmartBusApp/utils/OfflineQueueManager.ts)
- **Offline DB**: [SmartBusApp/utils/offlineDatabase.ts](SmartBusApp/utils/offlineDatabase.ts)

### Configuration Files:
- **Node-RED Flows**: [node-red-manual-demo.json](node-red-manual-demo.json)
- **App Config**: [SmartBusApp/app.json](SmartBusApp/app.json)
- **Backend Settings**: [backend/smartbus_backend/settings.py](backend/smartbus_backend/settings.py)

---

## 💡 Tips for Best Demonstration

1. **Practice the flow** - Run through once before presentation
2. **Keep terminals visible** - Shows backend activity
3. **Open Node-RED debug panel** - Demonstrates API responses
4. **Use large fonts** - For visibility during screen sharing
5. **Prepare backup** - Have screenshots if live demo fails
6. **Explain trade-offs** - "We chose Expo Go for rapid development, deep links would require full build"

---

## ✅ Success Criteria

Your demonstration successfully shows:

✅ **Complete journey workflow** - Selection to disembark  
✅ **Payment integration** - QR codes and Paynow
✅ **Real-time GPS monitoring** - Distance-based alerts  
✅ **Special cases** - Bus breaks, missed stops  
✅ **Offline functionality** - Queue-based sync  
✅ **Backend automation** - Node-RED state control  
✅ **System integration** - Frontend ↔ Backend ↔ Testing tools

---

## 🎓 Academic Context

**For Examiners/Assessors:**

This project demonstrates:
- **Full-stack development**: Django REST + React Native
- **Real-time systems**: GPS monitoring, WebSocket-ready architecture
- **Offline-first design**: Local queue + sync strategy
- **Testing methodology**: Hybrid manual + automated approach
- **API design**: RESTful endpoints with proper validation
- **Mobile UX**: Touch-optimized tablet kiosk interface
- **DevOps**: Multi-service orchestration (Backend, Node-RED, Emulator)

**Why hybrid testing?**
- Expo Go limitation: Custom URL schemes require standalone builds
- Build environment complexity: Java version conflicts, gradle issues
- Time constraint: Manual + backend automation demonstrates same functionality
- Real-world relevance: Mirrors production testing strategies (UI testing + API mocking)

---

## 📞 Need Help?

If issues arise during demonstration:
1. Check all terminals are running (backend, node-red, expo)
2. Verify Android emulator is connected: `adb devices`
3. Test backend manually: `http://localhost:8000/admin`
4. Check Node-RED logs: http://localhost:1880

**Remember:** The system is fully functional. Manual navigation + Node-RED backend control demonstrates complete integration without build tooling complexity.

---

🎬 **You're ready to demonstrate!** Good luck with your presentation!
