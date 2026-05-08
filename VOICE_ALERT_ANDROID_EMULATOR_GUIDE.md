# Voice Alert Test Guide (Android Emulator Presentation)

This guide uses the dedicated Node-RED flow file:
- [node-red-voice-alert-tests.json](node-red-voice-alert-tests.json)

It demonstrates all 3 required voice cases:
1. Approaching a paid destination at about 5 km
2. Missed stop by about 20 km
3. Bus moving while a passenger is still outside during bus break

## 1) One-time setup

1. Start backend:
```powershell
cd backend
python manage.py runserver 0.0.0.0:8000
```

2. Start Node-RED (from project root):
```powershell
node-red
```

3. Start app on Android emulator:
```powershell
cd SmartBusApp
npx expo start
```
Then press `a` to launch Android emulator.

4. In Node-RED (`http://localhost:1880`):
- Menu -> Import
- Select [node-red-voice-alert-tests.json](node-red-voice-alert-tests.json)
- Click Deploy

## 2) Presentation flow (exact order)

### Single-click option (recommended)

After importing and deploying the flow, click:
- `START SINGLE-CLICK TIMED DEMO`

This will run timed stages automatically:
1. `T+1s` create demo trip
2. `T+8s` open confirmation screen
3. `T+18s` trigger ~5km approaching voice
4. `T+30s` trigger ~20km missed-stop voice
5. `T+40s` open bus-break screen
6. `T+45s` backend bus_break_out
7. `T+50s` reminder to tap `Confirm Exit` in emulator app
8. `T+58s` set baseline GPS
9. `T+66s` move bus >0.3km (outside-moving voice trigger)
10. `T+74s` backend cleanup bus_break_in

Keep Node-RED debug panel open so you can read stage prompts during presentation.

### A. Prepare active trip

1. Click `STEP 1: Create Demo Trip`
- In debug panel, copy the `qr_code` shown.

2. In emulator app, complete normal flow up to Confirmation:
- Destination -> Payment -> Confirmation
- Use the same QR code from Node-RED when needed.

3. Click `STEP 2: Open Confirmation Screen` if you need to jump back quickly.

If you are using single-click mode, this is automatic and you can skip manual stage buttons.

## 3) Scenario 1: Approaching destination voice (~5 km)

1. Ensure trip is active on Confirmation/in-journey state.
2. Click `A1: Set GPS ~5km from destination`.
3. Wait a few seconds for location update.
4. Expected result:
- Voice notification about approaching destination
- Visual approaching alert

Technical trigger in app:
- Voice fires when distance to destination is `<= 5 km`.

## 4) Scenario 2: Missed stop voice (~20 km)

Important:
- Run Scenario 1 first in the same active trip so the approach state is already set.

1. Click `B1: Set GPS ~20km away (missed stop)`.
2. Wait a few seconds.
3. Expected result:
- Voice notification that passenger missed destination
- Visual missed-destination alert

Technical trigger in app:
- Missed voice fires when distance is `>= 20 km` after approach alert was already triggered.

## 5) Scenario 3: Bus moving while passenger is outside (voice)

This scenario needs the app local outside list, so do this in emulator:

1. Click `STEP 3: Open Bus-Break Screen`.
2. On emulator Bus Break screen:
- Select Going Out
- Enter or scan the same demo QR
- Tap Confirm Exit

Optional backend mirror:
- Click `C0 (Optional): Backend mark bus_break_out`

3. Click `C1: Set baseline GPS`.
4. Click `C2: Move bus >0.3km`.
5. Expected result:
- Voice alert that bus is moving while passengers are outside.

Cleanup:
- In app, mark passenger back in (Confirm Return)
- Optionally click `C3 (Cleanup): Backend mark bus_break_in`

## 6) Live presentation script (short)

1. "I create an active trip and keep its QR code."
2. "I move bus GPS to around 5 km and the approaching voice alert plays."
3. "Without resetting trip, I move GPS to around 20 km and missed-stop voice alert plays."
4. "I mark passenger outside during bus break, move bus by more than 0.3 km, and the safety voice alert plays."

## 7) Troubleshooting

1. If no screen navigation from Node-RED:
- Run `adb devices` and ensure emulator is listed.
- Keep emulator unlocked and visible.

2. If no voice is heard:
- Raise emulator media volume.
- Confirm trip is active (not just on home screen).
- Wait 5-15 seconds for location watcher update.

3. If GPS buttons do not affect app:
- In emulator settings, ensure location is enabled.
- Retry baseline then movement buttons.

4. If backend validate fails:
- Ensure backend is running on port 8000.
- Re-run `STEP 1: Create Demo Trip` and use new QR.
