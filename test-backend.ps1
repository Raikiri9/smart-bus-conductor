# Test Backend API Connectivity and State
Write-Host "`n=== Testing Backend Connectivity ===" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n1. Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/health/" -Method GET
    Write-Host "✅ Backend is alive: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not responding!" -ForegroundColor Red
    exit
}

# 2. Check Active Trips
Write-Host "`n2. Checking Active Trips..." -ForegroundColor Yellow
try {
    $trips = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/active/" -Method GET
    Write-Host "Found $($trips.Count) active trips:" -ForegroundColor Green
    foreach ($trip in $trips) {
        Write-Host "  - QR: $($trip.qr_code) | Destination: $($trip.destination_name) | Boarded: $($trip.boarded) | Completed: $($trip.completed) | On Break: $($trip.on_bus_break)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Failed to fetch active trips" -ForegroundColor Red
}

# 3. Create Test Trip via Node-RED endpoint
Write-Host "`n3. Creating Test Trip..." -ForegroundColor Yellow
$tripData = @{
    qr_code = "MANUAL-TEST-$(Get-Date -Format 'HHmmss')"
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
    Write-Host "✅ Trip Created!" -ForegroundColor Green
    Write-Host "  - QR Code: $($response.qr_code)" -ForegroundColor Cyan
    Write-Host "  - Trip ID: $($response.trip_id)" -ForegroundColor Cyan
    Write-Host "`n📱 Use this QR code in the app: $($response.qr_code)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Failed to create trip" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# 4. Check trips again
Write-Host "`n4. Checking Active Trips Again..." -ForegroundColor Yellow
try {
    $trips = Invoke-RestMethod -Uri "http://localhost:8000/api/trips/active/" -Method GET
    Write-Host "Now there are $($trips.Count) active trips" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to fetch active trips" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "`n💡 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open Node-RED at http://localhost:1880" -ForegroundColor White
Write-Host "2. Click the '🎬 SCENARIO: Normal Journey' button" -ForegroundColor White
Write-Host "3. Check the debug panel (right side) for the QR code" -ForegroundColor White
Write-Host "4. In the app, navigate to Payment screen and enter the QR code" -ForegroundColor White
