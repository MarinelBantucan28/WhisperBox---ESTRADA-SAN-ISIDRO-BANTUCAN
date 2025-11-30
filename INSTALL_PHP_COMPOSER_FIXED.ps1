# WhisperBox: One-Click PHP + Composer Install & Setup
#
# This script:
# 1. Installs Chocolatey (if not present)
# 2. Installs PHP 8.2 and Composer via Chocolatey
# 3. Runs composer install in the backend folder
# 4. Optionally starts a PHP dev server and runs smoke tests
#
# Usage:
#   1. Right-click PowerShell, select "Run as Administrator"
#   2. Paste the entire content of this script and press Enter
#   OR
#   3. Save as INSTALL_PHP_COMPOSER.ps1, then run:
#      Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
#      & ".\INSTALL_PHP_COMPOSER.ps1"
#
# Prerequisites:
# - Windows 10 or later
# - Administrator privileges
# - Internet access to download PHP, Composer, and packages

# Force script to stop on errors
$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "WhisperBox PHP + Composer Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]'Administrator')
if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/5] Checking for Chocolatey..." -ForegroundColor Green

# Check if Chocolatey is installed
$chocoPath = & where choco 2>$null
if (-not $chocoPath) {
    Write-Host "Chocolatey not found. Installing..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
    Write-Host "Chocolatey installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Chocolatey is already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/5] Installing PHP 8.2..." -ForegroundColor Green

# Install PHP
if (& where php 2>$null) {
    $phpVersion = php -v | Select-Object -First 1
    Write-Host "PHP already installed: $phpVersion" -ForegroundColor Green
} else {
    choco install -y php
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "PHP installed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/5] Installing Composer..." -ForegroundColor Green

# Install Composer
if (& where composer 2>$null) {
    $composerVersion = composer --version
    Write-Host "Composer already installed: $composerVersion" -ForegroundColor Green
} else {
    choco install -y composer
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "Composer installed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/5] Verifying installations..." -ForegroundColor Green

# Verify PHP and Composer
$phpVersion = php -v | Select-Object -First 1
$composerVersion = composer --version

Write-Host "✓ PHP: $phpVersion" -ForegroundColor Green
Write-Host "✓ Composer: $composerVersion" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Running composer install in backend folder..." -ForegroundColor Green

# Find the backend folder and run composer install
# Assume we're in the repo root or navigate to it
$repoRoot = Get-Location
$backendFolder = Join-Path $repoRoot "CSS\whisperbox\backend"

if (-not (Test-Path $backendFolder)) {
    Write-Host "ERROR: Backend folder not found at $backendFolder" -ForegroundColor Red
    Write-Host "Please run this script from the WhisperBox repository root." -ForegroundColor Yellow
    exit 1
}

Set-Location $backendFolder
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Cyan

# Run composer install
Write-Host "Running 'composer install'..." -ForegroundColor Yellow
composer install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Composer install completed successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Composer install failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Offer to start PHP dev server and run smoke tests
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start PHP dev server:"
Write-Host "   php -S localhost:8000"
Write-Host ""
Write-Host "2. Test login (in another PowerShell window):"
Write-Host "   `$body = @{ action = 'login'; email = 'shadow@example.com'; password = 'password123' } | ConvertTo-Json"
Write-Host "   Invoke-RestMethod -Uri http://localhost:8000/api/auth.php -Method Post -Body `$body -ContentType 'application/json'"
Write-Host ""
Write-Host "3. Test refresh (use refresh_token from login response):"
Write-Host "   `$refreshBody = @{ refresh_token = '<REFRESH_TOKEN>' } | ConvertTo-Json"
Write-Host "   Invoke-RestMethod -Uri http://localhost:8000/api/refresh.php -Method Post -Body `$refreshBody -ContentType 'application/json'"
Write-Host ""

# Ask if user wants to start the dev server now
$startServer = Read-Host "Start PHP dev server now? (y/n)"
if ($startServer -eq 'y' -or $startServer -eq 'Y') {
    Write-Host 'Starting PHP dev server at http://localhost:8000' -ForegroundColor Green
    Write-Host 'Press Ctrl+C to stop the server.' -ForegroundColor Yellow
    Write-Host ''
    php -S localhost:8000
} else {
    Write-Host 'Setup complete. You can manually start the server by running: php -S localhost:8000' -ForegroundColor Green
}
