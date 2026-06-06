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
  Write-Host "Starting ngrok tunnels for port 8000 (backend) and port 3001 (OSRM)..." -ForegroundColor Yellow
  Start-Process ngrok -ArgumentList "start", "--all", "--config", "$PSScriptRoot\..\ngrok.yml" -WindowStyle Normal
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
    $backendTunnel = $data.tunnels | Where-Object { $_.config.addr -match ":8000$" } | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    $osrmTunnel = $data.tunnels | Where-Object { $_.config.addr -match ":3001$" } | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    
    if ($backendTunnel -and $osrmTunnel) {
      Write-Host "Both ngrok tunnels found!" -ForegroundColor Green
      break
    }
  } catch {
    # Ignore errors during polling
  }
  
  $attempt++
  Write-Host "Waiting for ngrok tunnels... ($attempt/$maxAttempts)" -ForegroundColor Yellow
  Start-Sleep -Seconds 1
}

try {
  $response = Invoke-WebRequest -Uri $ngrokApi -UseBasicParsing
  $data = $response.Content | ConvertFrom-Json
  $backendTunnel = $data.tunnels | Where-Object { $_.config.addr -match ":8000$" } | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
  $osrmTunnel = $data.tunnels | Where-Object { $_.config.addr -match ":3001$" } | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
  
  if (-not $backendTunnel) {
    Write-Host "No backend https tunnel found after waiting. Check ngrok output." -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. ngrok is authenticated (run: ngrok authtoken YOUR_TOKEN)" -ForegroundColor Yellow
    Write-Host "  2. Backend is running on port 8000" -ForegroundColor Yellow
    Write-Host "  3. No firewall is blocking ngrok" -ForegroundColor Yellow
    exit 1
  }

  if (-not $osrmTunnel) {
    Write-Host "Warning: OSRM tunnel not found. Check if OSRM proxy is running on port 3001." -ForegroundColor Yellow
    Write-Host "Run: node osrm-proxy.js from project root" -ForegroundColor Yellow
  }

  $backendUrl = $backendTunnel.public_url
  $osrmUrl = if ($osrmTunnel) { $osrmTunnel.public_url } else { "" }
  
  $envPath = Join-Path $PSScriptRoot "..\SmartBusApp\.env"

  $lines = @()
  if (Test-Path $envPath) {
    $lines = Get-Content $envPath
  }

  # Update backend URL
  $backendUpdated = $false
  $lines = $lines | ForEach-Object {
    if ($_ -match '^EXPO_PUBLIC_API_BASE_URL=') {
      $backendUpdated = $true
      "EXPO_PUBLIC_API_BASE_URL=$backendUrl"
    } else {
      $_
    }
  }

  if (-not $backendUpdated) {
    $lines += "EXPO_PUBLIC_API_BASE_URL=$backendUrl"
  }

  # Update OSRM URL if tunnel exists
  if ($osrmUrl) {
    $osrmUpdated = $false
    $lines = $lines | ForEach-Object {
      if ($_ -match '^EXPO_PUBLIC_OSRM_NGROK_URL=') {
        $osrmUpdated = $true
        "EXPO_PUBLIC_OSRM_NGROK_URL=$osrmUrl"
      } else {
        $_
      }
    }

    if (-not $osrmUpdated) {
      $lines += "EXPO_PUBLIC_OSRM_NGROK_URL=$osrmUrl"
    }
  }

  Set-Content -Path $envPath -Value $lines
  Write-Host "✅ Updated .env with backend URL: $backendUrl" -ForegroundColor Green
  if ($osrmUrl) {
    Write-Host "✅ Updated .env with OSRM URL: $osrmUrl" -ForegroundColor Green
  }
  Write-Host "Restart Expo: npx expo start -c"
} catch {
  Write-Host "Failed to fetch ngrok tunnels. Ensure ngrok is running." 
  exit 1
}
