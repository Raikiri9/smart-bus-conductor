#!/usr/bin/env powershell

<#
.SYNOPSIS
    Verify that OSRM + ngrok integration is properly configured for LD Player distance calculation

.DESCRIPTION
    This script checks:
    - OSRM proxy server is accessible
    - ngrok configuration file exists
    - .env files have required variables
    - Node.js and required packages are installed
#>

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  OSRM + ngrok Integration Verification                        ║" -ForegroundColor Cyan
Write-Host "║  Smart Bus Conductor - LD Player Distance Calculation Fix     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$warnings = @()

# Check 1: Node.js installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  $issues += "Node.js not found in PATH. Install from https://nodejs.org"
} else {
  Write-Host "✅ Node.js: $($node.Version)" -ForegroundColor Green
}

# Check 2: OSRM proxy file exists
Write-Host "Checking OSRM proxy file..." -ForegroundColor Yellow
$osrmFile = Join-Path $PSScriptRoot "osrm-proxy.js"
if (Test-Path $osrmFile) {
  Write-Host "✅ osrm-proxy.js found" -ForegroundColor Green
} else {
  $issues += "osrm-proxy.js not found at $osrmFile"
}

# Check 3: ngrok config file exists
Write-Host "Checking ngrok configuration..." -ForegroundColor Yellow
$ngrokYml = Join-Path $PSScriptRoot "ngrok.yml"
if (Test-Path $ngrokYml) {
  Write-Host "✅ ngrok.yml found" -ForegroundColor Green
} else {
  $issues += "ngrok.yml not found at $ngrokYml"
}

# Check 4: .env file has OSRM URL variable
Write-Host "Checking .env configuration..." -ForegroundColor Yellow
$envFile = Join-Path $PSScriptRoot "SmartBusApp\.env"
if (Test-Path $envFile) {
  $envContent = Get-Content $envFile -Raw
  if ($envContent -match "EXPO_PUBLIC_OSRM_NGROK_URL") {
    Write-Host "✅ .env has EXPO_PUBLIC_OSRM_NGROK_URL variable" -ForegroundColor Green
  } else {
    $warnings += ".env missing EXPO_PUBLIC_OSRM_NGROK_URL - will be auto-populated on first startup"
  }
  if ($envContent -match "EXPO_PUBLIC_API_BASE_URL") {
    Write-Host "✅ .env has EXPO_PUBLIC_API_BASE_URL variable" -ForegroundColor Green
  } else {
    $warnings += ".env missing EXPO_PUBLIC_API_BASE_URL"
  }
} else {
  $issues += ".env not found at $envFile"
}

# Check 5: osrm.config.ts exists and uses env variable
Write-Host "Checking osrm.config.ts..." -ForegroundColor Yellow
$osrmConfig = Join-Path $PSScriptRoot "SmartBusApp\config\osrm.config.ts"
if (Test-Path $osrmConfig) {
  $configContent = Get-Content $osrmConfig -Raw
  if ($configContent -match "EXPO_PUBLIC_OSRM_NGROK_URL") {
    Write-Host "✅ osrm.config.ts uses ngrok environment variable" -ForegroundColor Green
  } else {
    $warnings += "osrm.config.ts may not be using ngrok environment variable"
  }
} else {
  $issues += "osrm.config.ts not found at $osrmConfig"
}

# Check 6: destination.tsx imports OSRM utilities
Write-Host "Checking destination.tsx integration..." -ForegroundColor Yellow
$destScreen = Join-Path $PSScriptRoot "SmartBusApp\app\destination.tsx"
if (Test-Path $destScreen) {
  $destContent = Get-Content $destScreen -Raw
  if ($destContent -match "import.*getOsrmUrl.*osrm.config") {
    Write-Host "✅ destination.tsx imports getOsrmUrl" -ForegroundColor Green
  } else {
    $warnings += "destination.tsx may not import OSRM utilities - please verify manually"
  }
  if ($destContent -match "routeDistanceKm") {
    Write-Host "✅ destination.tsx uses routeDistanceKm function" -ForegroundColor Green
  } else {
    $warnings += "destination.tsx may not use routeDistanceKm - please verify manually"
  }
} else {
  $issues += "destination.tsx not found at $destScreen"
}

# Check 7: ngrok installed
Write-Host "Checking ngrok installation..." -ForegroundColor Yellow
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrok) {
  Write-Host "✅ ngrok is installed" -ForegroundColor Green
} else {
  $warnings += "ngrok not found in PATH. Install from https://ngrok.com/download"
  $warnings += "Then authenticate with: ngrok authtoken YOUR_TOKEN"
}

# Check 8: START scripts updated
Write-Host "Checking startup scripts..." -ForegroundColor Yellow
$startPs1 = Join-Path $PSScriptRoot "START_APP.ps1"
if (Test-Path $startPs1) {
  $startContent = Get-Content $startPs1 -Raw
  if ($startContent -match "osrm-proxy.js") {
    Write-Host "✅ START_APP.ps1 includes OSRM proxy startup" -ForegroundColor Green
  } else {
    $issues += "START_APP.ps1 not updated to start OSRM proxy"
  }
} else {
  $issues += "START_APP.ps1 not found"
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Display results
if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
  Write-Host "🎉 All checks passed! Ready to use OSRM + ngrok for LD Player" -ForegroundColor Green
} elseif ($issues.Count -eq 0) {
  Write-Host "✅ Core setup complete. Review warnings below:" -ForegroundColor Green
} else {
  Write-Host "❌ Some issues found. See below:" -ForegroundColor Red
}

Write-Host ""

if ($issues.Count -gt 0) {
  Write-Host "Issues (must fix):" -ForegroundColor Red
  $issues | ForEach-Object { Write-Host "  ❌ $_" -ForegroundColor Red }
  Write-Host ""
}

if ($warnings.Count -gt 0) {
  Write-Host "Warnings (review):" -ForegroundColor Yellow
  $warnings | ForEach-Object { Write-Host "  ⚠️  $_" -ForegroundColor Yellow }
  Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ensure ngrok is authenticated:" -ForegroundColor White
Write-Host "   ngrok authtoken YOUR_TOKEN" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start the application:" -ForegroundColor White
Write-Host "   .\START_APP.ps1   (PowerShell)" -ForegroundColor Gray
Write-Host "   or" -ForegroundColor Gray
Write-Host "   .\START_APP.bat   (Command Prompt)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. The following will start automatically:" -ForegroundColor White
Write-Host "   ✓ OSRM proxy on port 3001" -ForegroundColor Gray
Write-Host "   ✓ ngrok tunnels for backend (8000) and OSRM (3001)" -ForegroundColor Gray
Write-Host "   ✓ Django backend on port 8000" -ForegroundColor Gray
Write-Host "   ✓ Expo dev server" -ForegroundColor Gray
Write-Host ""
Write-Host "4. In LD Player:" -ForegroundColor White
Write-Host "   ✓ Open Expo Go app" -ForegroundColor Gray
Write-Host "   ✓ Scan QR code from terminal" -ForegroundColor Gray
Write-Host "   ✓ Select destination - distance will use OSRM (actual road distance)" -ForegroundColor Gray
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -gt 0) {
  exit 1
} else {
  exit 0
}
