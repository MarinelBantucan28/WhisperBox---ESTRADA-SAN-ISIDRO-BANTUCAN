# WhisperBox: XAMPP Setup & Configuration
#
# This script:
# 1. Detects XAMPP installation
# 2. Copies WhisperBox to XAMPP htdocs
# 3. Runs composer install in the backend folder
# 4. Sets up database and starts services
# 5. Provides testing instructions
#
# Usage:
#   1. Install XAMPP from https://www.apachefriends.org/
#   2. Run XAMPP Control Panel as Administrator
#   3. Start Apache and MySQL services
#   4. Run this script as Administrator:
#      Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
#      & ".\XAMPP_SETUP.ps1"
#
# Prerequisites:
# - Windows 10 or later
# - XAMPP installed and running
# - Administrator privileges
# - Internet access for composer packages

# Force script to stop on errors
$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "WhisperBox XAMPP Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]'Administrator')
if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/6] Detecting XAMPP installation..." -ForegroundColor Green

# Common XAMPP installation paths
$xamppPaths = @(
    "C:\xampp",
    "C:\Program Files\xampp",
    "C:\Program Files (x86)\xampp",
    "${env:ProgramFiles}\xampp",
    "${env:ProgramFiles(x86)}\xampp"
)

$xamppPath = $null
foreach ($path in $xamppPaths) {
    if (Test-Path $path) {
        $xamppPath = $path
        break
    }
}

if (-not $xamppPath) {
    Write-Host "ERROR: XAMPP not found in standard locations." -ForegroundColor Red
    Write-Host "Please install XAMPP from https://www.apachefriends.org/" -ForegroundColor Yellow
    Write-Host "Or specify the XAMPP path manually:" -ForegroundColor Yellow
    $xamppPath = Read-Host "Enter XAMPP installation path"
    if (-not (Test-Path $xamppPath)) {
        Write-Host "ERROR: Invalid XAMPP path." -ForegroundColor Red
        exit 1
    }
}

$htdocsPath = Join-Path $xamppPath "htdocs"
$phpPath = Join-Path $xamppPath "php\php.exe"
$mysqlPath = Join-Path $xamppPath "mysql\bin\mysql.exe"

Write-Host "✓ XAMPP found at: $xamppPath" -ForegroundColor Green
Write-Host "✓ htdocs path: $htdocsPath" -ForegroundColor Green

Write-Host ""
Write-Host "[2/6] Checking XAMPP services..." -ForegroundColor Green

# Check if Apache and MySQL are running
$apacheRunning = Get-Process httpd -ErrorAction SilentlyContinue
$mysqlRunning = Get-Process mysqld -ErrorAction SilentlyContinue

if (-not $apacheRunning) {
    Write-Host "WARNING: Apache is not running. Please start it in XAMPP Control Panel." -ForegroundColor Yellow
} else {
    Write-Host "✓ Apache is running" -ForegroundColor Green
}

if (-not $mysqlRunning) {
    Write-Host "WARNING: MySQL is not running. Please start it in XAMPP Control Panel." -ForegroundColor Yellow
} else {
    Write-Host "✓ MySQL is running" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/6] Copying WhisperBox to htdocs..." -ForegroundColor Green

# Get current directory (WhisperBox root)
$whisperBoxPath = Get-Location
$destinationPath = Join-Path $htdocsPath "whisperbox"

if (Test-Path $destinationPath) {
    Write-Host "WhisperBox already exists in htdocs. Removing old version..." -ForegroundColor Yellow
    Remove-Item $destinationPath -Recurse -Force
}

Write-Host "Copying files to $destinationPath..." -ForegroundColor Yellow
Copy-Item -Path "$whisperBoxPath\CSS\whisperbox" -Destination $destinationPath -Recurse -Force

Write-Host "✓ WhisperBox copied to htdocs" -ForegroundColor Green

Write-Host ""
Write-Host "[4/6] Setting up backend dependencies..." -ForegroundColor Green

$backendPath = Join-Path $destinationPath "backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: Backend folder not found at $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Cyan

# Check if composer is available in XAMPP PHP
$composerPath = Join-Path $xamppPath "php\composer.bat"
if (Test-Path $composerPath) {
    Write-Host "Using XAMPP's Composer..." -ForegroundColor Yellow
    $composerCmd = $composerPath
} else {
    # Try system composer
    $composerCmd = Get-Command composer -ErrorAction SilentlyContinue
    if ($composerCmd) {
        $composerCmd = $composerCmd.Source
        Write-Host "Using system Composer..." -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: Composer not found. Please install Composer." -ForegroundColor Red
        Write-Host "Download from: https://getcomposer.org/" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Running 'composer install'..." -ForegroundColor Yellow
& $composerCmd install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Composer install completed successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Composer install failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[5/6] Setting up database..." -ForegroundColor Green

# Database setup
$dbSetupPath = Join-Path $backendPath "database_setup.sql"
if (Test-Path $dbSetupPath) {
    Write-Host "Setting up database..." -ForegroundColor Yellow

    # Default XAMPP MySQL credentials
    $mysqlUser = "root"
    $mysqlPass = ""

    # Run database setup
    $mysqlArgs = @(
        "-u", $mysqlUser,
        "-p$mysqlPass",
        "-e", "CREATE DATABASE IF NOT EXISTS whisperbox;"
    )

    & $mysqlPath $mysqlArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database created successfully!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Database creation failed." -ForegroundColor Red
        Write-Host "Please check MySQL credentials and try again." -ForegroundColor Yellow
    }

    # Import database schema
    $mysqlImportArgs = @(
        "-u", $mysqlUser,
        "-p$mysqlPass",
        "whisperbox"
    )

    Get-Content $dbSetupPath | & $mysqlPath $mysqlImportArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database schema imported successfully!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Database import failed." -ForegroundColor Red
    }
} else {
    Write-Host "WARNING: Database setup file not found at $dbSetupPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/6] Testing setup..." -ForegroundColor Green

# Test PHP
& $phpPath --version | Select-Object -First 1
Write-Host ""

# Test database connection
$testDbPath = Join-Path $backendPath "test_db.php"
if (Test-Path $testDbPath) {
    Write-Host "Testing database connection..." -ForegroundColor Yellow
    & $phpPath $testDbPath
} else {
    Write-Host "Creating database test file..." -ForegroundColor Yellow
    $testDbContent = @'
<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=whisperbox", "root", "");
    echo "✓ Database connection successful!\n";
} catch (PDOException $e) {
    echo "✗ Database connection failed: " . $e->getMessage() . "\n";
}
?>
'@
    $testDbContent | Out-File -FilePath $testDbPath -Encoding UTF8
    & $phpPath $testDbPath
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

Write-Host "WhisperBox is now available at:" -ForegroundColor Cyan
Write-Host "http://localhost/whisperbox/" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open your browser and go to: http://localhost/whisperbox/" -ForegroundColor Green
Write-Host "2. Test the application by submitting a letter" -ForegroundColor Green
Write-Host "3. Check the browser console for any JavaScript errors" -ForegroundColor Green
Write-Host ""

Write-Host "API endpoints:" -ForegroundColor Cyan
Write-Host "• Authentication: http://localhost/whisperbox/backend/api/auth.php" -ForegroundColor Green
Write-Host "• Posts: http://localhost/whisperbox/backend/api/posts.php" -ForegroundColor Green
Write-Host "• User: http://localhost/whisperbox/backend/api/user.php" -ForegroundColor Green
Write-Host ""

Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "• If you see PHP errors, check XAMPP's php\logs\php_error_log" -ForegroundColor Yellow
Write-Host "• If database connection fails, check XAMPP's mysql\data\mysql_error.log" -ForegroundColor Yellow
Write-Host "• Make sure Apache and MySQL are running in XAMPP Control Panel" -ForegroundColor Yellow
Write-Host ""

Write-Host "Setup completed successfully! 🎉" -ForegroundColor Green
