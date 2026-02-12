$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
  Write-Host "ngrok not found. Install from https://ngrok.com/download and restart this script."
  exit 1
}

# Start ngrok if the local API is not responding
$ngrokApi = "http://127.0.0.1:4040/api/tunnels"
$apiUp = $false
try {
  Invoke-WebRequest -Uri $ngrokApi -UseBasicParsing | Out-Null
  $apiUp = $true
} catch {
  $apiUp = $false
}

if (-not $apiUp) {
  Start-Process ngrok -ArgumentList "http 8000" -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 2
}

try {
  $response = Invoke-WebRequest -Uri $ngrokApi -UseBasicParsing
  $data = $response.Content | ConvertFrom-Json
  $tunnel = $data.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
  if (-not $tunnel) {
    Write-Host "No https tunnel found. Check ngrok output."
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
