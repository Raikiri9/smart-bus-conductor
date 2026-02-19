$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
  Write-Host "ngrok not found. Install from https://ngrok.com/download and restart this script." -ForegroundColor Red
  exit 1
}

Write-Host "Checking if ngrok is already running..." -ForegroundColor Cyan

# Check if ngrok is already running
$ngrokApi = "http://127.0.0.1:4040/api/tunnels"
$apiUp = $false
try {
  $response = Invoke-WebRequest -Uri $ngrokApi -UseBasicParsing -TimeoutSec 2
  $apiUp = $true
  Write-Host "ngrok is already running" -ForegroundColor Green
} catch {
  $apiUp = $false
}

if (-not $apiUp) {
  Write-Host "Starting ngrok tunnel to port 8000..." -ForegroundColor Yellow
  Start-Process ngrok -ArgumentList "http", "8000" -WindowStyle Normal
  Write-Host "Waiting for ngrok to initialize..." -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}

# Wait for tunnel to be ready (max 15 seconds)
$maxAttempts = 15
$attempt = 0

while ($attempt -lt $maxAttempts) {
  try {
    $response = Invoke-WebRequest -Uri $ngrokApi -UseBasicParsing -TimeoutSec 2
    $data = $response.Content | ConvertFrom-Json
    $tunnel = $data.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    
    if ($tunnel) {
      Write-Host "ngrok tunnel found!" -ForegroundColor Green
      break
    }
  } catch {
    # Ignore errors during polling
  }
  
  $attempt++
  Write-Host "Waiting for ngrok tunnel... ($attempt/$maxAttempts)" -ForegroundColor Yellow
  Start-Sleep -Seconds 1
}

try {
  $response = Invoke-WebRequest -Uri $ngrokApi -UseBasicParsing
  $data = $response.Content | ConvertFrom-Json
  $tunnel = $data.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
  
  if (-not $tunnel) {
    Write-Host "No https tunnel found after waiting. Check ngrok output." -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. ngrok is authenticated (run: ngrok authtoken YOUR_TOKEN)" -ForegroundColor Yellow
    Write-Host "  2. Backend is running on port 8000" -ForegroundColor Yellow
    Write-Host "  3. No firewall is blocking ngrok" -ForegroundColor Yellow
    exit 1
  }

  $publicUrl = $tunnel.public_url
  $envPath = Join-Path $PSScriptRoot "..\SmartBusApp\.env"

  $lines = @()
  if (Test-Path $envPath) {
    $lines = Get-Content $envPath
  }

  $updated = $false
  $lines = $lines | ForEach-Object {
    if ($_ -match '^EXPO_PUBLIC_API_BASE_URL=') {
      $updated = $true
      "EXPO_PUBLIC_API_BASE_URL=$publicUrl"
    } else {
      $_
    }
  }

  if (-not $updated) {
    $lines += "EXPO_PUBLIC_API_BASE_URL=$publicUrl"
  }

  Set-Content -Path $envPath -Value $lines
  Write-Host "Updated .env with $publicUrl"
  Write-Host "Restart Expo: npx expo start -c"
} catch {
  Write-Host "Failed to fetch ngrok tunnel. Ensure ngrok is running." 
  exit 1
}
