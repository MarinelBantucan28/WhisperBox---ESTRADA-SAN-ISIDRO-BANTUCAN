<#
deploy_local.ps1

Local deploy helper for WhisperBox (Windows PowerShell).
Prerequisites:
 - gcloud CLI installed and authenticated (https://cloud.google.com/sdk/docs/install)
 - firebase CLI installed and authenticated (https://firebase.google.com/docs/cli)
 - Docker installed and running

This script will:
 - build the Docker image from CSS/whisperbox/backend
 - push it to GCR (gcr.io/<PROJECT_ID>/whisperbox-backend:latest)
 - deploy to Cloud Run with provided env vars
 - deploy frontend to Firebase Hosting

Usage: Run in repository root:
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\deploy_local.ps1
#>

param()

function PromptIfEmpty([string]$name, [string]$current) {
    if ([string]::IsNullOrWhiteSpace($current)) {
        return Read-Host -Prompt "Enter $name"
    }
    return $current
}

# Ensure required CLIs
$missing = @()
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) { $missing += 'gcloud' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { $missing += 'docker' }
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) { $missing += 'firebase' }

if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing required CLI(s): $($missing -join ', ')" -ForegroundColor Red
    Write-Host "Install them before running this script. See DEPLOYMENT_GUIDE.md for details." -ForegroundColor Yellow
    exit 1
}

# Gather configuration (allow environment variables or prompt)
$project = $env:GCP_PROJECT
$project = PromptIfEmpty 'GCP project ID (GCP_PROJECT)' $project
$region = $env:GCR_REGION
if ([string]::IsNullOrWhiteSpace($region)) { $region = 'us-central1' }
$service = $env:CLOUD_RUN_SERVICE
$service = PromptIfEmpty 'Cloud Run service name (CLOUD_RUN_SERVICE)' $service
$imageName = "gcr.io/$project/whisperbox-backend:latest"

# Database and app env vars
$dbHost = $env:DB_HOST; $dbHost = PromptIfEmpty 'DB_HOST' $dbHost
$dbName = $env:DB_NAME; $dbName = PromptIfEmpty 'DB_NAME' $dbName
$dbUser = $env:DB_USER; $dbUser = PromptIfEmpty 'DB_USER' $dbUser
$dbPass = $env:DB_PASS; $dbPass = PromptIfEmpty 'DB_PASS' $dbPass
$appSecret = $env:APP_SECRET; $appSecret = PromptIfEmpty 'APP_SECRET (JWT secret)' $appSecret

# Confirm
Write-Host "About to deploy to Cloud Run" -ForegroundColor Cyan
Write-Host "Project: $project" -ForegroundColor Cyan
Write-Host "Region: $region" -ForegroundColor Cyan
Write-Host "Service: $service" -ForegroundColor Cyan
Write-Host "Image: $imageName" -ForegroundColor Cyan

$confirm = Read-Host "Proceed with build & deploy? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Aborted by user." -ForegroundColor Yellow
    exit 0
}

# Authenticate (ensure gcloud is set to the right project)
Write-Host "Setting gcloud project: $project" -ForegroundColor Green
gcloud config set project $project --quiet

# Build Docker image
Write-Host "Building Docker image..." -ForegroundColor Green
cd "CSS\whisperbox\backend"

docker build -t $imageName .
if ($LASTEXITCODE -ne 0) { Write-Host "Docker build failed" -ForegroundColor Red; exit 1 }

# Push to GCR
Write-Host "Pushing image to GCR..." -ForegroundColor Green
# Ensure docker is authenticated with gcloud
gcloud auth configure-docker --quiet

docker push $imageName
if ($LASTEXITCODE -ne 0) { Write-Host "Docker push failed" -ForegroundColor Red; exit 1 }

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Green
$envVars = "DB_HOST=$dbHost,DB_NAME=$dbName,DB_USER=$dbUser,DB_PASS=$dbPass,APP_SECRET=$appSecret"

gcloud run deploy $service --image $imageName --region $region --platform managed --allow-unauthenticated --set-env-vars $envVars --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "Cloud Run deploy failed" -ForegroundColor Red; exit 1 }

# Deploy frontend to Firebase
Write-Host "Deploying frontend to Firebase Hosting..." -ForegroundColor Green
$firebaseProject = Read-Host "Enter Firebase project ID (or press Enter to skip)"
if (-not [string]::IsNullOrWhiteSpace($firebaseProject)) {
    firebase deploy --only hosting --project $firebaseProject --token $env:FIREBASE_TOKEN
    if ($LASTEXITCODE -ne 0) { Write-Host "Firebase deploy failed" -ForegroundColor Red; exit 1 }
} else {
    Write-Host "Skipping Firebase deploy" -ForegroundColor Yellow
}

Write-Host "Deployment finished successfully." -ForegroundColor Green
Write-Host "You can view Cloud Run service in console: https://console.cloud.google.com/run?project=$project" -ForegroundColor Cyan
