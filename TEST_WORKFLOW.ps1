# 🎯 COMPLETE TESTING WORKFLOW
# Run this script to test the full demonstration system

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Smart Bus Conductor - Complete Testing Workflow            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Create Trip via Node-RED API
Write-Host "STEP 1: Creating Test Trip via API..." -ForegroundColor Yellow
$tripData = @{
    qr_code = "MANUAL-TEST-001"
    phone_number = "+2637712345678"
    origin_lat = -17.8292
    origin_lng = 31.0522
    destination_name = "Bulawayo City Centre"
    destination_lat = -20.1500
    destination_lng = 28.5667
    distance_km = 439
    fare = 15.00
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/create/" -Method POST -Body $tripData -ContentType "application/json"
    Write-Host "✅ Trip Created Successfully!" -ForegroundColor Green
    Write-Host "   QR Code: $($response.qr_code)" -ForegroundColor White
    Write-Host "   Trip ID: $($response.trip_id)`n" -ForegroundColor White
    $qrCode = $response.qr_code
} catch {
    Write-Host "❌ Failed to create trip: $($_.Exception.Message)`n" -ForegroundColor Red
    exit
}

# Step 2: Verify trip is in database
Write-Host "STEP 2: Verifying trip in database..." -ForegroundColor Yellow
$trips = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/active/"
Write-Host "✅ Found $($trips.Count) active trip(s)`n" -ForegroundColor Green

# Step 3: Validate QR Code (simulating payment)
Write-Host "STEP 3: Validating QR Code (simulating payment)..." -ForegroundColor Yellow
$validateData = @{
    qr_code = $qrCode
    action = "validate"
} | ConvertTo-Json

try {
    $validResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/validate/" -Method POST -Body $validateData -ContentType "application/json"
    Write-Host "✅ QR Code Validation: $($validResponse.status)" -ForegroundColor Green
    Write-Host "   Message: $($validResponse.message)`n" -ForegroundColor White
} catch {
    Write-Host "❌ Validation failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Manual Testing Instructions
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   📱 NOW TEST IN THE APP                                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "➤ OPTION A: Test Payment Screen" -ForegroundColor Yellow
Write-Host "  1. In the app, tap 'Choose Destination'" -ForegroundColor White
Write-Host "  2. Select 'Bulawayo City Centre'" -ForegroundColor White
Write-Host "  3. Tap 'Confirm' → Goes to Payment screen" -ForegroundColor White
Write-Host "  4. Enter QR code: $qrCode" -ForegroundColor Cyan
Write-Host "  5. Tap 'Proceed to Pay'" -ForegroundColor White
Write-Host "  6. Tap 'Confirm Payment' in mock Paynow dialog`n" -ForegroundColor White

Write-Host "➤ OPTION B: Test Disembark Scanner" -ForegroundColor Yellow
Write-Host "  1. In the app, go to Disembark screen (bottom tabs)" -ForegroundColor White
Write-Host "  2. Enter QR code: $qrCode" -ForegroundColor Cyan
Write-Host "  3. Tap 'Validate QR Manually'`n" -ForegroundColor White

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🎮 NODE-RED TESTING                                        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "1. Open Node-RED: " -ForegroundColor White -NoNewline
Write-Host "http://localhost:1880" -ForegroundColor Cyan
Write-Host "2. Click '🎬 SCENARIO: Normal Journey' button" -ForegroundColor White
Write-Host "   → Creates trip with QR: DEMO-NORMAL-001" -ForegroundColor Gray
Write-Host "3. After payment in app, click '📍 Trigger: Approaching Alert'" -ForegroundColor White
Write-Host "   → Simulates GPS near destination" -ForegroundColor Gray
Write-Host "4. Watch the app for automatic alert popup!`n" -ForegroundColor White

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Setup Complete - Happy Testing!                         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
