# Node-RED Testing Guide for Smart Bus Conductor

## Overview
This guide shows you how to use Node-RED to test the bus-break and disembark scenarios without needing the mobile app.

## Prerequisites
1. **Install Node-RED** (if not already installed):
   ```powershell
   npm install -g node-red
   ```

2. **Start Node-RED**:
   ```powershell
   node-red
   ```
   Access at: http://localhost:1880

3. **Ensure Backend is Running**:
   ```powershell
   cd backend
   python manage.py runserver
   ```
   Backend should be at: http://localhost:8000

---

## API Endpoints Reference

### 1. Create Trip (POST)
**URL:** `http://localhost:8000/api/trips/create/`
```json
{
  "phone_number": "+263771234567",
  "origin_lat": -17.8292,
  "origin_lng": 31.0522,
  "destination_name": "Harare",
  "destination_lat": -17.8252,
  "destination_lng": 31.0335,
  "distance_km": 5.2,
  "fare": 1.0,
  "qr_code": "BUS-1234567890-ABC123"
}
```
**Response:**
```json
{
  "status": "success",
  "qr_code": "BUS-1234567890-ABC123",
  "trip_id": 1
}
```

### 2. Validate QR (POST) - Used for Disembark & Bus-Break
**URL:** `http://localhost:8000/api/trips/validate/`
```json
{
  "qr_code": "BUS-1234567890-ABC123"
}
```
**Response:**
```json
{
  "status": "valid"
}
```
or
```json
{
  "status": "invalid"
}
```

### 3. Get Active Trips (GET)
**URL:** `http://localhost:8000/api/trips/active/`
**Response:**
```json
[
  {
    "id": 1,
    "destination_lat": -17.8252,
    "destination_lng": 31.0335,
    "destination_name": "Harare",
    "distance_km": 5.2
  }
]
```

### 4. Health Check (GET)
**URL:** `http://localhost:8000/api/trips/health/`
**Response:**
```json
{
  "status": "ok"
}
```

---

## Node-RED Flow Configurations

### Flow 1: Complete Passenger Journey Test

#### Nodes Setup:
1. **Inject Node** (Start Test) → Triggers the flow
2. **Function Node** (Generate Ticket) → Creates test data
3. **HTTP Request Node** (Create Trip) → POST to `/api/trips/create/`
4. **Delay Node** (Simulate Journey) → Wait 5 seconds
5. **Function Node** (Prepare Validation) → Extract ticket ID
6. **HTTP Request Node** (Validate QR) → POST to `/api/trips/validate/`
7. **Debug Node** (Show Result) → Display validation result

#### Function Node Code:

**Generate Ticket Function:**
```javascript
// Generate unique ticket ID
const timestamp = Date.now();
const random = Math.random().toString(36).substring(2, 8).toUpperCase();
const ticketId = `BUS-${timestamp}-${random}`;

// Create trip data
msg.payload = {
    phone_number: "+263771234567",
    origin_lat: -20.1500,     // Bulawayo
    origin_lng: 28.5667,
    destination_name: "Harare",
    destination_lat: -17.8292, // Harare
    destination_lng: 31.0522,
    distance_km: 439.2,
    fare: 15.0,
    qr_code: ticketId
};

// Store ticket ID for later validation
flow.set('currentTicketId', ticketId);
node.status({fill:"blue", shape:"dot", text:`Created: ${ticketId}`});

return msg;
```

**Prepare Validation Function:**
```javascript
// Get the ticket ID from flow context
const ticketId = flow.get('currentTicketId');

msg.payload = {
    qr_code: ticketId
};

node.status({fill:"yellow", shape:"ring", text:`Validating: ${ticketId}`});

return msg;
```

---

### Flow 2: Bus-Break Scenario Test

This simulates passengers going out during a rest stop and coming back.

#### Nodes Setup:
1. **Inject Node** (Passenger Goes Out) → Manual trigger
2. **Function Node** (Mark Outside) → Record passenger leaving
3. **HTTP Request Node** (Validate Going Out) → POST to `/api/trips/validate/`
4. **Debug Node** (Going Out Status)
5. **Delay Node** (Rest Stop Duration) → Wait 30 seconds
6. **Inject Node** (Passenger Returns) → Manual trigger
7. **Function Node** (Mark Inside) → Record passenger returning
8. **HTTP Request Node** (Validate Returning) → POST to `/api/trips/validate/`
9. **Debug Node** (Return Status)

#### Function Node Code:

**Mark Outside Function:**
```javascript
const ticketId = flow.get('currentTicketId') || 'BUS-1234567890-TEST';

msg.payload = {
    qr_code: ticketId
};

// Track outside status
flow.set('passengerOutside', true);
node.status({fill:"orange", shape:"dot", text:"OUTSIDE - " + ticketId});

return msg;
```

**Mark Inside Function:**
```javascript
const ticketId = flow.get('currentTicketId') || 'BUS-1234567890-TEST';

msg.payload = {
    qr_code: ticketId
};

// Update status
flow.set('passengerOutside', false);
node.status({fill:"green", shape:"dot", text:"INSIDE - " + ticketId});

return msg;
```

---

### Flow 3: Multiple Passengers Disembark Test

Test multiple passengers disembarking sequentially.

#### Function Node Code:

**Create Multiple Passengers:**
```javascript
// Create 3 test passengers
const passengers = [];

for (let i = 1; i <= 3; i++) {
    const timestamp = Date.now() + i;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ticketId = `BUS-${timestamp}-${random}`;
    
    passengers.push({
        phone_number: `+26377${1000000 + i}`,
        origin_lat: -20.1500,
        origin_lng: 28.5667,
        destination_name: `Destination ${i}`,
        destination_lat: -17.8292 + (i * 0.01),
        destination_lng: 31.0522 + (i * 0.01),
        distance_km: 100 + (i * 50),
        fare: 5.0 + i,
        qr_code: ticketId
    });
}

// Store for later use
flow.set('testPassengers', passengers);
node.status({fill:"blue", shape:"dot", text:`Created ${passengers.length} passengers`});

// Return array for split node
msg.payload = passengers;
return msg;
```

---

### Flow 4: Validation Status Monitor

Real-time monitoring of trip status.

#### HTTP Request Node Configuration:
- **Method:** GET
- **URL:** `http://localhost:8000/api/trips/active/`
- **Return:** a parsed JSON object
- **Repeat:** interval (every 5 seconds)

#### Function Node Code (Process Active Trips):
```javascript
const activeTrips = msg.payload;

if (!Array.isArray(activeTrips)) {
    node.status({fill:"red", shape:"ring", text:"Invalid response"});
    return null;
}

// Display count and details
node.status({
    fill: activeTrips.length > 0 ? "green" : "grey",
    shape: "dot",
    text: `Active: ${activeTrips.length} passengers`
});

// Format for display
msg.payload = {
    count: activeTrips.length,
    trips: activeTrips.map(t => ({
        id: t.id,
        destination: t.destination_name,
        distance: t.distance_km
    }))
};

return msg;
```

---

## Complete Node-RED Flow JSON

Copy and paste this into Node-RED (Import → Clipboard):

```json
[
    {
        "id": "inject_start",
        "type": "inject",
        "name": "Start Journey Test",
        "props": [{"p": "payload"}],
        "repeat": "",
        "crontab": "",
        "once": false,
        "onceDelay": 0.1,
        "topic": "",
        "payload": "",
        "payloadType": "date",
        "x": 150,
        "y": 100,
        "wires": [["func_generate"]]
    },
    {
        "id": "func_generate",
        "type": "function",
        "name": "Generate Ticket",
        "func": "const timestamp = Date.now();\nconst random = Math.random().toString(36).substring(2, 8).toUpperCase();\nconst ticketId = `BUS-${timestamp}-${random}`;\n\nmsg.payload = {\n    phone_number: \"+263771234567\",\n    origin_lat: -20.1500,\n    origin_lng: 28.5667,\n    destination_name: \"Harare\",\n    destination_lat: -17.8292,\n    destination_lng: 31.0522,\n    distance_km: 439.2,\n    fare: 15.0,\n    qr_code: ticketId\n};\n\nflow.set('currentTicketId', ticketId);\nnode.status({fill:\"blue\", shape:\"dot\", text:`Created: ${ticketId}`});\n\nreturn msg;",
        "outputs": 1,
        "x": 350,
        "y": 100,
        "wires": [["http_create"]]
    },
    {
        "id": "http_create",
        "type": "http request",
        "name": "Create Trip",
        "method": "POST",
        "ret": "obj",
        "url": "http://localhost:8000/api/trips/create/",
        "x": 550,
        "y": 100,
        "wires": [["delay_journey"]]
    },
    {
        "id": "delay_journey",
        "type": "delay",
        "name": "Simulate Journey (5s)",
        "pauseType": "delay",
        "timeout": "5",
        "timeoutUnits": "seconds",
        "rate": "1",
        "nbRateUnits": "1",
        "rateUnits": "second",
        "randomFirst": "1",
        "randomLast": "5",
        "randomUnits": "seconds",
        "drop": false,
        "x": 760,
        "y": 100,
        "wires": [["func_validate"]]
    },
    {
        "id": "func_validate",
        "type": "function",
        "name": "Prepare Validation",
        "func": "const ticketId = flow.get('currentTicketId');\n\nmsg.payload = {\n    qr_code: ticketId\n};\n\nnode.status({fill:\"yellow\", shape:\"ring\", text:`Validating: ${ticketId}`});\n\nreturn msg;",
        "outputs": 1,
        "x": 150,
        "y": 200,
        "wires": [["http_validate"]]
    },
    {
        "id": "http_validate",
        "type": "http request",
        "name": "Validate QR (Disembark)",
        "method": "POST",
        "ret": "obj",
        "url": "http://localhost:8000/api/trips/validate/",
        "x": 390,
        "y": 200,
        "wires": [["debug_result"]]
    },
    {
        "id": "debug_result",
        "type": "debug",
        "name": "Validation Result",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": true,
        "complete": "payload",
        "x": 630,
        "y": 200,
        "wires": []
    }
]
```

---

## Testing Procedure

### Test 1: Basic Disembark Flow
1. Click "Start Journey Test" inject button
2. Watch Debug panel for:
   - Trip creation confirmation
   - 5-second journey simulation
   - Validation result: `{"status": "valid"}`
3. Second validation attempt should return `{"status": "invalid"}` (already disembarked)

### Test 2: Bus-Break Scenario
1. First create a trip using Flow 1
2. Click "Passenger Goes Out" button
   - Should validate successfully (QR still active)
3. Wait 30 seconds (simulated rest stop)
4. Click "Passenger Returns" button
   - Should validate successfully
   - Passenger marked back inside

### Test 3: Multiple Passengers
1. Create multiple passengers
2. Use Split node to process one at a time
3. Monitor active trips count
4. Validate each passenger sequentially
5. Verify count decrements after each disembarkation

---

## Troubleshooting

### Connection Errors
- **Verify backend is running:** `http://localhost:8000/api/trips/health/`
- **Check port availability:** Ensure port 8000 is not blocked

### Invalid Status
- **Check database:** Passenger may already be marked as disembarked
- **Reset database:** Delete `db.sqlite3` and run `python manage.py migrate`

### No Active Trips
- Create new trips before validating
- Ensure `boarded=True` and `completed=False` in database

---

## Advanced Testing

### Concurrent Disembarkations
Test system under load with multiple passengers at once:
```javascript
// Inject node with repeat every 2 seconds
// Creates one passenger every 2 seconds
// Then batch validate after 30 seconds
```

### Invalid QR Code Tests
```javascript
msg.payload = {
    qr_code: "INVALID-TICKET-ID"
};
```
Expected: `{"status": "invalid"}`

### GPS Alert Simulation
Query `/api/trips/active/` and check distance calculations for voice alerts.

---

## Export Results

Add these nodes to save test results:
1. **File Out Node** → Save validation logs to CSV
2. **Dashboard Node** → Real-time monitoring UI
3. **Email Node** → Alert on validation failures

---

## Summary

You can now:
- ✅ Create test trips programmatically
- ✅ Simulate passenger boarding and disembarking
- ✅ Test bus-break scenarios (going out/coming back)
- ✅ Monitor active trips in real-time
- ✅ Validate system behavior without mobile devices

**Next Steps:**
1. Import the flow JSON into Node-RED
2. Start your backend server
3. Click inject buttons to test scenarios
4. View results in Debug panel
