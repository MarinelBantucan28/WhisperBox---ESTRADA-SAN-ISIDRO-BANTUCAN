<#
.SYNOPSIS
    Verify Secret Manager secrets exist and are accessible by the current principal and runtime SA.

.DESCRIPTION
    Checks that each named secret exists in the project and that the current environment (or CI
    service account) can access the latest version. Optionally checks that a provided runtime
    service account is present in the secret's IAM policy.

.PARAMETER ProjectId
    GCP project id (required)

.PARAMETER Secrets
    Array of secret NAMES to verify (required)

.PARAMETER RuntimeServiceAccount
    Optional runtime service account to verify presence in secret IAM policies

#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)] [string]$ProjectId,
    [Parameter(Mandatory=$true)] [string[]]$Secrets,
    [string]$RuntimeServiceAccount
)

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud not found in PATH. Install Google Cloud SDK and authenticate (gcloud auth login)."
    exit 2
}

foreach ($s in $Secrets) {
    if (-not $s) { continue }
    Write-Host "\nVerifying secret: $s"

    if (-not (gcloud secrets describe $s --project=$ProjectId >/dev/null 2>&1)) {
        Write-Error "Secret $s not found in project $ProjectId"
        exit 1
    }

    Write-Host "Attempting to access latest version of $s to verify access..."
    $access = gcloud secrets versions access latest --secret=$s --project=$ProjectId 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Cannot access latest version of $s. Deploy/CI service account likely lacks access. gcloud output: $access"
        exit 1
    }
    Write-Host "Access to $s verified"

    if ($RuntimeServiceAccount) {
        Write-Host "Checking IAM policy for $s for runtime SA: $RuntimeServiceAccount"
        $policy = gcloud secrets get-iam-policy $s --project=$ProjectId --format=json 2>&1
        if ($LASTEXITCODE -ne 0) { Write-Warning "Failed to get IAM policy for $s: $policy"; continue }
        if ($policy -notmatch [regex]::Escape($RuntimeServiceAccount)) {
            Write-Warning "Runtime SA $RuntimeServiceAccount not present in IAM policy for $s. Ensure it has roles/secretmanager.secretAccessor."
        } else {
            Write-Host "Runtime SA present in IAM policy for $s"
        }
    }
}

Write-Host "\nAll provided secrets verified (or warnings printed)."
exit 0
