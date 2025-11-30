<#
.SYNOPSIS
    Create Secret Manager secrets if missing and optionally seed them from local files.

.DESCRIPTION
    For each secret name provided, this script will create a Google Secret Manager
    secret (automatic replication) if it does not already exist. Optionally it will
    seed the secret from a local file at ./secrets/<secretName>.txt when -SeedFromFiles
    is provided and the file exists.

    After creation/seed, the script ensures the provided runtime service account has
    the roles/secretmanager.secretAccessor permission on the secret. Optionally
    binds the deploy service account as well.

.PARAMETER ProjectId
    GCP project id (required)

.PARAMETER Secrets
    Array of secret NAMES to create (required)

.PARAMETER RuntimeServiceAccount
    The runtime service account email (Cloud Run service account) which will need
    access to the secrets (required)

.PARAMETER DeployServiceAccount
    Optional: the deploy service account to grant secretAccessor to (useful for CI)

.PARAMETER SeedFromFiles
    If specified, will look for ./secrets/<secretName>.txt and add that as the first
    version of the secret when creating it.

#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)] [string]$ProjectId,
    [Parameter(Mandatory=$true)] [string[]]$Secrets,
    [Parameter(Mandatory=$true)] [string]$RuntimeServiceAccount,
    [string]$DeployServiceAccount,
    [switch]$SeedFromFiles
)

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud not found in PATH. Install Google Cloud SDK and authenticate (gcloud auth login)."
    exit 2
}

Write-Host "Creating/verifying secrets in project: $ProjectId"

foreach ($s in $Secrets) {
    if (-not $s) { continue }
    Write-Host "\nProcessing secret: $s"

    # Check existence
    $exists = $true
    $describe = gcloud secrets describe $s --project=$ProjectId 2>&1
    if ($LASTEXITCODE -ne 0) {
        $exists = $false
    }

    if (-not $exists) {
        Write-Host "Secret $s not found. Creating..."
        $out = gcloud secrets create $s --project=$ProjectId --replication-policy="automatic" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create secret $s. gcloud output: $out"
            continue
        }
        Write-Host "Created secret $s"

        # Seed from file if requested
        if ($SeedFromFiles) {
            $path = Join-Path -Path (Get-Location) -ChildPath "secrets\$s.txt"
            if (Test-Path $path) {
                Write-Host "Seeding $s from $path"
                $add = gcloud secrets versions add $s --project=$ProjectId --data-file=$path 2>&1
                if ($LASTEXITCODE -ne 0) { Write-Warning "Failed to seed $s: $add" } else { Write-Host "Seeded $s" }
            } else {
                Write-Host "No seed file found at $path; skipping seed for $s"
            }
        }
    } else {
        Write-Host "Secret $s already exists"
    }

    # Bind runtime service account with secretAccessor role on this secret
    if ($RuntimeServiceAccount) {
        Write-Host "Granting roles/secretmanager.secretAccessor to runtime SA: $RuntimeServiceAccount on $s"
        $policy = gcloud secrets get-iam-policy $s --project=$ProjectId --format=json 2>&1
        if ($LASTEXITCODE -ne 0) { Write-Warning "Could not fetch IAM policy for $s: $policy" }
        $grant = gcloud secrets add-iam-policy-binding $s --project=$ProjectId --member="serviceAccount:$RuntimeServiceAccount" --role="roles/secretmanager.secretAccessor" 2>&1
        if ($LASTEXITCODE -ne 0) { Write-Warning "Failed to bind runtime SA for $s: $grant" } else { Write-Host "Bound runtime SA to $s" }
    }

    # Optionally bind deploy service account
    if ($DeployServiceAccount) {
        Write-Host "Granting roles/secretmanager.secretAccessor to deploy SA: $DeployServiceAccount on $s"
        $grant2 = gcloud secrets add-iam-policy-binding $s --project=$ProjectId --member="serviceAccount:$DeployServiceAccount" --role="roles/secretmanager.secretAccessor" 2>&1
        if ($LASTEXITCODE -ne 0) { Write-Warning "Failed to bind deploy SA for $s: $grant2" } else { Write-Host "Bound deploy SA to $s" }
    }
}

Write-Host "\nDone. Review above output for any warnings/errors."
exit 0
