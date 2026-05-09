# Realtor Autopilot Setup & Prerequisite Checker
# Run this before 'npm start'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Realtor Autopilot - Setup Check" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check Node.js
Write-Host "Checking Node.js..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = (node -v)
    Write-Host "[OK] Node.js is installed: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "[X] Node.js is NOT installed! Please download and install from https://nodejs.org/" -ForegroundColor Red
    exit
}

# 2. Check NPM dependencies
Write-Host "Checking npm dependencies..."
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[OK] node_modules exists." -ForegroundColor Green
}

# 3. Check ADB (Android Debug Bridge)
Write-Host "Checking Android Debug Bridge (ADB)..."
if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Host "[OK] ADB is installed globally." -ForegroundColor Green
} elseif (Test-Path ".\platform-tools\adb.exe") {
    Write-Host "[OK] Local ADB found in platform-tools." -ForegroundColor Green
} else {
    Write-Host "[X] ADB NOT FOUND!" -ForegroundColor Red
    Write-Host "Please download Android Platform Tools, extract it, and place 'platform-tools' in this directory." -ForegroundColor Yellow
    Write-Host "Download: https://developer.android.com/tools/releases/platform-tools" -ForegroundColor Yellow
}

# 4. Check device connection
if (Test-Path ".\platform-tools\adb.exe") {
    $devices = .\platform-tools\adb.exe devices
    if ($devices -match "device$") {
         Write-Host "[OK] Android device is connected via USB!" -ForegroundColor Green
    } else {
         Write-Host "[!] No Android device connected. Please connect your phone via USB and enable USB Debugging." -ForegroundColor Yellow
    }
}

# 5. Check .env file
if (Test-Path ".env") {
    Write-Host "[OK] .env configuration file found." -ForegroundColor Green
} else {
    Write-Host "[X] .env file NOT found!" -ForegroundColor Red
    Write-Host "Creating .env from template..." -ForegroundColor Yellow
    Copy-Item "setup.env.template" ".env"
    Write-Host "Please open .env and fill in your Google Sheets and email credentials!" -ForegroundColor Yellow
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Run 'npm run validate' to check your API keys." -ForegroundColor Cyan
Write-Host "If everything is green, run 'npm start'!" -ForegroundColor Cyan
