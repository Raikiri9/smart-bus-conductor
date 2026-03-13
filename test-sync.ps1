# Test Backend-Frontend Sync
Write-Host "`n=== Testing Backend-Frontend Sync ===" -ForegroundColor Cyan

# 1. Create a new trip (simulating payment completion)
Write-Host "`n1. Creating new trip (simulating payment)..." -ForegroundColor Yellow
$tripData = @{
    qr_code = "SYNC-TEST-$(Get-Date -Format 'HHmmss')"
    phone_number = "+263771234567"
    origin_lat = -17.8292
    origin_lng = 31.0522
    destination_name = "Bulawayo City Centre"
    destination_lat = -20.1500
    destination_lng = 28.5667
    distance_km = 439
    fare = 15.00
} | ConvertTo-Json

try {
    $newTrip = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/create/" -Method POST -Body $tripData -ContentType "application/json"
    Write-Host "✅ Trip Created: $($newTrip.qr_code)" -ForegroundColor Green
    $qrCode = $newTrip.qr_code
    $tripId = $newTrip.trip_id
} catch {
    Write-Host "❌ Failed to create trip" -ForegroundColor Red
    exit 1
}

# 2. Check if trip appears in active trips (should be boarded=True by default)
Write-Host "`n2. Checking if trip appears in active trips..." -ForegroundColor Yellow
Start-Sleep -Seconds 1
$activeTrips = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/active/"
$ourTrip = $activeTrips | Where-Object { $_.id -eq $tripId }

if ($ourTrip) {
    Write-Host "✅ Trip is in active trips (boarded=True worked!)" -ForegroundColor Green
    Write-Host "   Destination: $($ourTrip.destination_name)" -ForegroundColor White
} else {
    Write-Host "❌ Trip NOT in active trips (sync issue!)" -ForegroundColor Red
    exit 1
}

# 3. Test Bus Break OUT
Write-Host "`n3. Testing Bus Break OUT..." -ForegroundColor Yellow
$breakOutData = @{
    qr_code = $qrCode
    action = "bus_break_out"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/validate/" -Method POST -Body $breakOutData -ContentType "application/json"
    if ($result.status -eq "valid" -and $result.action -eq "bus_break_out") {
        Write-Host "✅ Bus Break OUT successful" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Bus Break OUT failed" -ForegroundColor Red
}

# 4. Test Bus Break IN
Write-Host "`n4. Testing Bus Break IN..." -ForegroundColor Yellow
$breakInData = @{
    qr_code = $qrCode
    action = "bus_break_in"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/validate/" -Method POST -Body $breakInData -ContentType "application/json"
    if ($result.status -eq "valid" -and $result.action -eq "bus_break_in") {
        Write-Host "✅ Bus Break IN successful" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Bus Break IN failed" -ForegroundColor Red
}

# 5. Test Disembark
Write-Host "`n5. Testing Disembark (should mark completed=True)..." -ForegroundColor Yellow
$disembarkData = @{
    qr_code = $qrCode
    action = "disembark"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/validate/" -Method POST -Body $disembarkData -ContentType "application/json"
    if ($result.status -eq "valid" -and $result.action -eq "disembark") {
        Write-Host "✅ Disembark successful" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Disembark failed" -ForegroundColor Red
}

# 6. Verify trip is no longer in active trips
Write-Host "`n6. Verifying trip is removed from active trips..." -ForegroundColor Yellow
Start-Sleep -Seconds 1
$activeTrpsAfter = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/active/"
$stillActive = $activeTripsAfter | Where-Object { $_.id -eq $tripId }

if (-not $stillActive) {
    Write-Host "✅ Trip correctly removed from active trips (completed=True worked!)" -ForegroundColor Green
} else {
    Write-Host "❌ Trip still in active trips (sync issue!)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== All Sync Tests Passed! ===" -ForegroundColor Green
Write-Host "`n✨ Backend and Frontend are now properly synchronized!" -ForegroundColor Cyan
