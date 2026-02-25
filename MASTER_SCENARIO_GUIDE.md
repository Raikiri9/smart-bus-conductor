# 🎬 Master Scenario - Complete Visual Journey

Watch your Smart Bus app automatically navigate through every screen on your Android emulator!

---

## 🎯 What This Does

This master simulation **automatically** walks through the complete passenger journey:

1. **📍 Destination Selection** → Opens destination screen
2. **💳 Payment** → Opens payment screen  
3. **✅ Confirmation** → Shows trip confirmation
4. **🚌 Journey Active** → You choose the ending:
   - **🔔 Approaching Destination** → Alert → **🚪 Disembark**
   - **⚠️ Missed Destination** → Warning alert
   - **🚻 Bus Break** → Leave bus → Return to bus

**You'll see each screen appear on your emulator automatically with timing delays!**

---

## 🚀 Quick Start

### Step 1: Open Your Android Emulator
```powershell
cd SmartBusApp
npx expo start
# Press 'a' for Android
```

**Position the emulator window where you can see it clearly!** 📱

### Step 2: Import Master Flow to Node-RED
1. Open http://localhost:1880
2. Click ☰ → Import
3. Select **`node-red-master-scenario.json`**
4. Click Import
5. Click **Deploy**

### Step 3: Start the Simulation
1. Make sure your emulator is visible 👀
2. Click the **▶️ START FULL JOURNEY** button
3. Watch your emulator! 🎭

---

## 🎬 What You'll See

### Automatic Sequence:

**Second 0-1:** Initialization
- Console shows: "🎬 MASTER SIMULATION STARTING"

**Second 1-6:** 📍 **Destination Selection Screen**
- Emulator navigates to destination screen automatically
- You see the map and destination selection interface
- *Wait 5 seconds (simulating user selecting destination)*

**Second 6-10:** 💳 **Payment Screen**
- Emulator automatically opens payment screen
- You see EcoCash/Card payment options
- *Wait 4 seconds (simulating payment processing)*

**Second 10-13:** ✅ **Confirmation Screen**
- Emulator shows trip confirmation with details
- QR code displayed
- *Wait 3 seconds (trip starting)*

**Second 13+:** 🚌 **Journey in Progress**
- Console shows: "Choose scenario ending"
- **NOW YOU CHOOSE** which ending to see...

---

## 🎯 Choose Your Ending

After the journey starts (Step 4), click ONE of these:

### Option A: 🔔 Normal Arrival (Recommended for first test)

**Click: "🔔 Approaching Destination → Disembark"**

What happens:
1. Alert pops up: "📍 Approaching Destination - You are 500m away from Harare"
2. Wait 3 seconds
3. Emulator navigates to **Disembark screen**
4. Console shows: "🎉 JOURNEY COMPLETE!"

**Total Duration:** ~20 seconds

---

### Option B: ⚠️ Missed Destination

**Click: "⚠️ Missed Destination Alert"**

What happens:
1. Alert pops up: "⚠️ Missed Destination - You have passed Harare. Please notify the driver."
2. Console shows: "⚠️ MISSED DESTINATION SCENARIO COMPLETE"

**Total Duration:** ~16 seconds

---

### Option C: 🚻 Bus Break

**Click: "🚻 Bus Break Scenario"**

What happens:
1. Emulator navigates to **Bus Break screen**
2. Shows passenger leaving bus temporarily
3. Wait 5 seconds (simulating rest stop)
4. Console shows: "Passenger returning to bus..."
5. Console shows: "🚻 BUS BREAK SCENARIO COMPLETE"

**Total Duration:** ~21 seconds

---

## 📱 Visual Screenshots Flow

### What Your Emulator Will Show:

```
[Home Screen] 
     ↓
     ↓ (automatically)
     ↓
[Destination Screen] ← You see map, search box
     ↓
     ↓ (5 seconds later)
     ↓
[Payment Screen] ← You see payment options
     ↓
     ↓ (4 seconds later)
     ↓
[Confirmation Screen] ← You see trip details, QR code
     ↓
     ↓ (3 seconds later)
     ↓
[Journey Active] ← You manually choose ending...
     ↓
     ├─→ [Approaching Alert] → [Disembark Screen] ← Normal ending
     ├─→ [Missed Alert] ← Missed stop
     └─→ [Bus Break Screen] ← Rest stop
```

---

## 🎮 How It Works (Technical)

### Deep Links
Each step sends an ADB command like:
```bash
adb shell am start -a android.intent.action.VIEW -d "smartbusapp://navigate?screen=destination"
```

### Timing
- `delay` nodes in Node-RED control timing
- Each screen stays visible for realistic duration
- You can adjust delays in Node-RED flow

### Screen Navigation
- `SimulationContext.tsx` handles deep links
- Uses `expo-router` to navigate between screens
- No manual tapping needed!

---

## 🔧 Customization

### Change Screen Display Times

In Node-RED, edit the `delay` nodes:

- **"Wait 5s (Select Destination)"** → Change from 5 to 10 for more time
- **"Wait 4s (Processing Payment)"** → Change from 4 to 8 for longer
- **"Wait 3s (Journey Starts)"** → Adjust as needed

### Add More Steps

Add new function nodes between existing steps:
```javascript
// Example: Add "Seat Selection" step
node.warn('\n🪑 STEP 2.5: SEAT SELECTION');
const deepLink = 'smartbusapp://navigate?screen=seat-selection';
msg.adbCommand = `adb shell am start -a android.intent.action.VIEW -d "${deepLink}"`;
return msg;
```

### Change Alert Messages

Edit function nodes like `func_approaching`:
```javascript
// Modify the alert parameters
const deepLink = 'smartbusapp://simulate?type=approaching&destination=Bulawayo&distance=1000';
```

---

## 🐛 Troubleshooting

### Emulator Doesn't Navigate

**Problem:** Screens don't change automatically

**Solutions:**
1. Check emulator is running: `adb devices` (should show device)
2. Verify deep linking works:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "smartbusapp://navigate?screen=destination"
   ```
3. Rebuild app: `npx expo start --clear`

---

### "adb is not recognized"

**Problem:** ADB command not found

**Solutions:**
1. Install Android SDK Platform Tools
2. Add to PATH:
   ```powershell
   # Windows
   $env:Path += ";C:\Users\<username>\AppData\Local\Android\Sdk\platform-tools"
   ```
3. Restart terminal and try again

---

### Screens Change Too Fast

**Problem:** Can't see what's happening

**Solutions:**
1. Open Node-RED flow
2. Double-click delay nodes
3. Increase delay times:
   - Destination: 5→10 seconds
   - Payment: 4→8 seconds
   - Confirmation: 3→6 seconds

---

### No Alerts Showing

**Problem:** Approaching/Missed alerts don't appear

**Solutions:**
1. Check `SimulationContext.tsx` is imported in `app/_layout.tsx`
2. Verify `SimulationProvider` wraps all screens
3. Check expo terminal for error messages
4. Alert should use `Alert.alert()` - visible in Android

---

## 📊 Console Output Example

```
🎬 ===== MASTER SIMULATION STARTING =====
📱 Make sure your Android emulator is visible!
🎫 QR Code: BUS-1708901234567-JOURNEY
🗺️ Session: journey-1708901234567

📍 STEP 1: DESTINATION SELECTION
   Opening destination selection screen...
   ADB: adb shell am start -a android.intent.action.VIEW -d "smartbusapp://navigate?screen=destination"

💳 STEP 2: PAYMENT SELECTION
   Opening payment screen...
   ADB: adb shell am start -a android.intent.action.VIEW -d "smartbusapp://navigate?screen=payment"

✅ STEP 3: TRIP CONFIRMATION
   Opening confirmation screen...
   ADB: adb shell am start -a android.intent.action.VIEW -d "smartbusapp://navigate?screen=confirmation"

🚌 Journey in progress...
   Choose scenario ending:
   - Click "Approaching Destination" for normal ending
   - Click "Missed Destination" for missed stop
   - Click "Bus Break" for rest stop scenario

🔔 APPROACHING DESTINATION
   Showing proximity alert...
   ADB: adb shell am start -a android.intent.action.VIEW -d "smartbusapp://simulate?type=approaching&destination=Harare&distance=500"

🚪 STEP 4: DISEMBARK
   Opening disembark screen...
   ADB: adb shell am start -a android.intent.action.VIEW -d "smartbusapp://navigate?screen=disembark"

🎉 ===== JOURNEY COMPLETE! =====
   Total duration: 19 seconds
   Scenario: Approaching → Disembark
   ✅ All steps executed successfully!
```

---

## 🎓 Testing Checklist

Before running the simulation:

- [ ] Android emulator is running and visible
- [ ] Expo app is running (`npx expo start` + press 'a')
- [ ] Backend running on port 8000
- [ ] Node-RED running on port 1880
- [ ] Master scenario flow imported
- [ ] ADB working (`adb devices` shows emulator)
- [ ] Emulator positioned where you can see it

After clicking "▶️ START FULL JOURNEY":

- [ ] Destination screen appears (1-6 seconds)
- [ ] Payment screen appears (6-10 seconds)
- [ ] Confirmation screen appears (10-13 seconds)
- [ ] Console shows "Choose scenario ending" (13+ seconds)

After clicking an ending option:

- [ ] Alert appears (if approaching/missed)
- [ ] Final screen shows (disembark/bus-break)
- [ ] Console shows "COMPLETE!"

---

## 🎯 Success Indicators

✅ **It's Working When:**
1. Emulator screens change automatically without you touching anything
2. Each screen appears in order with delays
3. Alerts popup when choosing approaching/missed scenarios
4. Console shows progress messages in Node-RED debug panel
5. Total duration ~15-25 seconds depending on ending chosen

---

## 📹 Recording Your Simulation

Want to record it? Use **Windows Game Bar**:

1. Press `Win + G` on Windows
2. Click camera icon to start recording
3. Run the master scenario
4. Stop recording when complete
5. Video saved to `Videos/Captures` folder

---

## 🚀 Next Level

### Combine with GPS Simulation

After running the master scenario, add GPS movement:

1. Use the GPS simulation from `node-red-simulations.json`
2. Create journey path with waypoints
3. Start GPS simulation during "Journey Active" phase
4. Watch location update on map in real-time!

### Add Custom Scenarios

Create your own scenarios:
- **Traffic Jam:** Extended journey time
- **Route Change:** Different destination mid-journey
- **Multiple Passengers:** Simulate boarding/disembarking multiple people
- **Payment Failure:** Test error handling

---

## 💡 Tips

1. **First Time:** Run the "Approaching → Disembark" ending - it's the most complete
2. **Demo Mode:** Slow down delays to 10+ seconds each for presentations
3. **Testing Mode:** Speed up delays to 1-2 seconds for rapid testing
4. **Screen Recording:** Record your first successful run to document it
5. **Multiple Runs:** You can click "▶️ START FULL JOURNEY" multiple times

---

## 🎉 What Makes This Special

Unlike manual testing where you:
- ❌ Manually tap through each screen
- ❌ Type fake data
- ❌ Wait for responses
- ❌ Remember which screen is next

This master scenario:
- ✅ **Automatically** navigates all screens
- ✅ **Visually** shows the complete flow
- ✅ **Timed** to feel realistic
- ✅ **Repeatable** - click once, watch it go!
- ✅ **Professional** - perfect for demonstrations

---

## 📚 Files Involved

| File | Purpose |
|------|---------|
| `node-red-master-scenario.json` | Master orchestration flow |
| `SimulationContext.tsx` | Handles deep links & navigation |
| `app/_layout.tsx` | Provides SimulationProvider |
| `app/destination.tsx` | Destination screen |
| `app/payment.tsx` | Payment screen |
| `app/confirmation.tsx` | Confirmation screen |
| `app/disembark.tsx` | Disembark screen |
| `app/bus-break.tsx` | Bus break screen |

---

## 🎬 Ready to Watch The Show?

1. ✅ Position emulator where you can see it
2. ✅ Open Node-RED: http://localhost:1880
3. ✅ Import `node-red-master-scenario.json`
4. ✅ Click **▶️ START FULL JOURNEY**
5. ✅ **Watch your app come alive!** 🎭

Enjoy watching your Smart Bus app automatically navigate through the complete passenger journey! 🚌✨
