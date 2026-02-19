# Start Django backend server
Write-Host "Starting Django backend server..." -ForegroundColor Green

$backendPath = Join-Path $PSScriptRoot "..\..\backend"

# Check if backend directory exists
if (-not (Test-Path $backendPath)) {
    Write-Host "Error: Backend directory not found at $backendPath" -ForegroundColor Red
    exit 1
}

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python manage.py runserver 0.0.0.0:8000"

Write-Host "Backend server starting in new window..." -ForegroundColor Green
Start-Sleep -Seconds 3
