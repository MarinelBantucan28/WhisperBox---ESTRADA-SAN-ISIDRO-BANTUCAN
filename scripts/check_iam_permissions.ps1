<#
.SYNOPSIS
    Verify that a Google service account has the required IAM roles for WhisperBox CI/CD.

.DESCRIPTION
    This script checks project-level IAM bindings to ensure the deploy service account
    has all required roles for deploying WhisperBox (Cloud Run, Cloud Build, Secret Manager, etc.).
    Mirrors the CI verification step in .github/workflows/deploy.yml.

    If roles are missing, prints remediation gcloud commands.

.PARAMETER ProjectId
    Google Cloud project ID (required).

.PARAMETER ServiceAccountEmail
    Service account email to check (required). Example: whisperbox-gh-actions@project.iam.gserviceaccount.com

.PARAMETER AllowMissing
    If set, prints warnings for missing roles instead of failing (exit 1). Useful for dry-runs.

.EXAMPLE
    ./check_iam_permissions.ps1 -ProjectId my-project -ServiceAccountEmail my-sa@my-project.iam.gserviceaccount.com

    ./check_iam_permissions.ps1 -ProjectId my-project -ServiceAccountEmail my-sa@my-project.iam.gserviceaccount.com -AllowMissing

#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,

    [Parameter(Mandatory=$true)]
    [string]$ServiceAccountEmail,

    [switch]$AllowMissing
)

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud not found in PATH. Install Google Cloud SDK and authenticate (gcloud auth login)."
    exit 2
}

# Required roles — keep in sync with .github/workflows/deploy.yml and REQUIRED_IAM_PERMISSIONS.md
$RequiredRoles = @(
    'roles/run.admin',
    'roles/cloudbuild.builds.builder',
    'roles/secretmanager.secretAccessor',
    'roles/secretmanager.viewer',
    'roles/iam.serviceAccountUser',
    'roles/storage.admin'
)

Write-Host "Checking IAM roles for service account: $ServiceAccountEmail"
Write-Host "Project: $ProjectId`n"

# Query project IAM bindings for the service account
Write-Host "Querying project IAM bindings..."
$policyJson = gcloud projects get-iam-policy $ProjectId `
    --flatten="bindings[]" `
    --filter="bindings.members:serviceAccount:$ServiceAccountEmail" `
    --format="value(bindings.role)" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to query IAM policy for project $ProjectId. gcloud error: $policyJson"
    exit 1
}
<#
.SYNOPSIS
    Verify that a Google service account has the required IAM roles for WhisperBox CI/CD.

.DESCRIPTION
    This script checks project-level IAM bindings to ensure the deploy service account
    has all required roles for deploying WhisperBox (Cloud Run, Cloud Build, Secret Manager, etc.).
    Mirrors the CI verification step in .github/workflows/deploy.yml.

    If roles are missing, prints remediation gcloud commands.

.PARAMETER ProjectId
    Google Cloud project ID (required).

.PARAMETER ServiceAccountEmail
    Service account email to check (required). Example: whisperbox-gh-actions@project.iam.gserviceaccount.com

.PARAMETER AllowMissing
    If set, prints warnings for missing roles instead of failing (exit 1). Useful for dry-runs.

.EXAMPLE
    ./check_iam_permissions.ps1 -ProjectId my-project -ServiceAccountEmail my-sa@my-project.iam.gserviceaccount.com

    ./check_iam_permissions.ps1 -ProjectId my-project -ServiceAccountEmail my-sa@my-project.iam.gserviceaccount.com -AllowMissing

#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,

    [Parameter(Mandatory=$true)]
    [string]$ServiceAccountEmail,

    [switch]$AllowMissing
)

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud not found in PATH. Install Google Cloud SDK and authenticate (gcloud auth login)."
    exit 2
}

# Required roles — keep in sync with .github/workflows/deploy.yml and REQUIRED_IAM_PERMISSIONS.md
$RequiredRoles = @(
    'roles/run.admin',
    'roles/cloudbuild.builds.builder',
    'roles/secretmanager.secretAccessor',
    'roles/secretmanager.viewer',
    'roles/iam.serviceAccountUser',
    'roles/storage.admin'
)

Write-Host "Checking IAM roles for service account: $ServiceAccountEmail"
Write-Host "Project: $ProjectId`n"

# Query project IAM bindings for the service account
Write-Host "Querying project IAM bindings..."
$policyJson = gcloud projects get-iam-policy $ProjectId `
    --flatten="bindings[]" `
    --filter="bindings.members:serviceAccount:$ServiceAccountEmail" `
    --format="value(bindings.role)" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to query IAM policy for project $ProjectId. gcloud error: $policyJson"
    exit 1
}

# Parse roles into an array
$HaveRoles = @()
if ($policyJson) {
    $HaveRoles = @($policyJson -split "`n" | Where-Object { $_ -match '\S' })
}

Write-Host "Found roles:`n"
if ($HaveRoles.Count -eq 0) {
    Write-Host "(none)"
} else {
    foreach ($r in $HaveRoles) {
        Write-Host " - $r"
    }
}

# Check for missing roles
Write-Host "`nChecking for required roles...`n"
$Missing = @()
foreach ($req in $RequiredRoles) {
    if ($HaveRoles -contains $req) {
        Write-Host "[OK] $req"
    } else {
        Write-Host "[MISSING] $req"
        $Missing += $req
    }
}

# If roles are missing, print remediation
if ($Missing.Count -gt 0) {
    Write-Host "`nMissing $($Missing.Count) role(s).`n"
    Write-Host "Remediation commands (run as a project admin):`n"
    foreach ($r in $Missing) {
        Write-Host "gcloud projects add-iam-policy-binding $ProjectId --member=\"serviceAccount:$ServiceAccountEmail\" --role=\"$r\""
    }
    Write-Host "`n"

    if ($AllowMissing) {
        Write-Warning "Roles are missing. Re-run without -AllowMissing to fail on missing roles."
        exit 0
    } else {
        Write-Error "Service account is missing required roles. Run the remediation commands above and try again."
        exit 1
    }
}

Write-Host "`nAll required roles present for $ServiceAccountEmail ✓"
exit 0
