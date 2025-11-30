# Setting up Workload Identity Federation (GitHub Actions → GCP)

This document shows step-by-step gcloud commands to configure Workload Identity Federation so GitHub Actions can authenticate to Google Cloud without a long-lived JSON key. After following these steps you'll update GitHub Secrets with the provider ID and the Google service account email and then the CI workflow can use `google-github-actions/auth@v1`.

Notes:
- Run these commands with an account that has `roles/owner` or sufficient IAM permissions to create service accounts, set IAM policies, and create workload identity pools/providers.
- Replace PROJECT_ID and PROJECT_NUMBER with your project values. You can get the project number with `gcloud projects describe PROJECT_ID --format='value(projectNumber)'`.
- Replace REPO with the GitHub repo in the format `owner/repo` (e.g., `MarinelBantucan28/WhisperBox---ESTRADA-SAN-ISIDRO-BANTUCAN`).

Steps (PowerShell-friendly, run as a user with gcloud authenticated):

1) Variables — set these to your environment values

```powershell
$projectId = "PROJECT_ID"
$projectNumber = (gcloud projects describe $projectId --format='value(projectNumber)')
$workloadPoolId = "whisperbox-pool"
$providerId = "whisperbox-provider"
$githubRepo = "MarinelBantucan28/WhisperBox---ESTRADA-SAN-ISIDRO-BANTUCAN"
$serviceAccount = "whisperbox-gh-actions@$projectId.iam.gserviceaccount.com"
$region = "us-central1"
```

2) Create the Google service account to be impersonated by GitHub Actions

```powershell
gcloud iam service-accounts create whisperbox-gh-actions \
  --project=$projectId \
  --description="Service account for GitHub Actions deploys" \
  --display-name="whisperbox-gh-actions"

# Grant minimal roles needed (adjust to your needs)
gcloud projects add-iam-policy-binding $projectId --member="serviceAccount:$serviceAccount" --role="roles/run.admin"
gcloud projects add-iam-policy-binding $projectId --member="serviceAccount:$serviceAccount" --role="roles/cloudbuild.builds.builder"
gcloud projects add-iam-policy-binding $projectId --member="serviceAccount:$serviceAccount" --role="roles/secretmanager.secretAccessor"

# Optional: If you plan to have CI create Secret Manager secrets and seed them during the first run,
# you may temporarily grant the service account `roles/secretmanager.admin` so it can create secrets and
# set IAM policies. After bootstrap, it's safer to remove the admin role and keep only `secretAccessor`.
#
# Example (temporary bootstrap):
# gcloud projects add-iam-policy-binding $projectId --member="serviceAccount:$serviceAccount" --role="roles/secretmanager.admin"
gcloud projects add-iam-policy-binding $projectId --member="serviceAccount:$serviceAccount" --role="roles/storage.admin"
```

3) Create a Workload Identity Pool

```powershell
gcloud iam workload-identity-pools create $workloadPoolId \
  --project=$projectId \
  --location="global" \
  --display-name="WhisperBox GitHub Actions pool"

POOL_RESOURCE="projects/$projectNumber/locations/global/workloadIdentityPools/$workloadPoolId"
```

4) Create a provider that trusts GitHub Actions OIDC tokens (restrict to your repo)

```powershell
gcloud iam workload-identity-pools providers create-oidc $providerId \
  --project=$projectId \
  --location="global" \
  --workload-identity-pool="$workloadPoolId" \
  --display-name="GitHub provider for WhisperBox" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --allowed-audiences="https://github.com/" 

PROVIDER_RESOURCE="$POOL_RESOURCE/providers/$providerId"
```

5) Allow the GitHub repo to impersonate the Google service account (grant the `roles/iam.workloadIdentityUser` binding)

```powershell
gcloud iam service-accounts add-iam-policy-binding $serviceAccount \
  --project=$projectId \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/$POOL_RESOURCE/attribute.repository/$githubRepo"
```

6) Save the provider resource name and service account email for GitHub Secrets

You will need to add the following GitHub repository secrets:
- `WIF_PROVIDER` = `projects/$projectNumber/locations/global/workloadIdentityPools/$workloadPoolId/providers/$providerId`
- `GCP_SA_EMAIL` = `whisperbox-gh-actions@$projectId.iam.gserviceaccount.com`
- `GCP_PROJECT` = your project id

7) Update GitHub Actions workflow

In your workflow (already updated by the repo), authenticate using `google-github-actions/auth@v1`:

```yaml
- name: Authenticate to Google Cloud (Workload Identity Federation)
  uses: google-github-actions/auth@v1
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.GCP_SA_EMAIL }}
```

That step will configure credentials for subsequent `gcloud` and Google actions in the job.

8) Test locally then run CI

- Push a branch or trigger the workflow manually. If any permission is missing, the step that attempts to use `gcloud` will fail and print a recommended missing permission.

Security notes:
- After verifying OIDC works, remove any stored JSON service account key from GitHub secrets to reduce risk.
- Limit the IAM roles granted to the service account to the minimum required for deploy.
