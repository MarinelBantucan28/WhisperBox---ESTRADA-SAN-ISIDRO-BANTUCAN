# Required IAM Permissions for WhisperBox deploys

This file documents the minimal, recommended, and bootstrap IAM roles required to run the repository's CI/CD deploy workflow (Cloud Build + Cloud Run + Secret Manager) and to allow the Cloud Run runtime service account to access runtime secrets.

Use these commands from an account with appropriate permissions (Owner or IAM Admin) to grant or verify roles.

---

## Terminology
- Deploy SA / CI SA: the Google service account impersonated by GitHub Actions (the account CI uses to run gcloud operations).
- Runtime SA: the Cloud Run service's identity (the account the container runs as). Must be granted Secret Manager access to read secret values.

## Minimal roles required for the Deploy (CI) service account

These roles allow CI to build, push, and deploy, and to read Secret Manager secrets that are needed during deployment.

- roles/run.admin — deploy to Cloud Run (`gcloud run deploy`)
- roles/cloudbuild.builds.builder — submit builds with Cloud Build (`gcloud builds submit`)
- roles/secretmanager.secretAccessor — access secret payloads (`gcloud secrets versions access`)
- roles/secretmanager.viewer — view secret metadata and list secrets (optional but useful for verification)
- roles/storage.admin (or Artifact Registry-specific role) — push image artifacts if using storage-backed registry
- roles/iam.serviceAccountUser — allow acting as other service accounts when deploying Cloud Run (sometimes required)

Sample grant commands (replace PROJECT_ID and SA_EMAIL):

```powershell
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:SA_EMAIL" --role="roles/run.admin"
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:SA_EMAIL" --role="roles/cloudbuild.builds.builder"
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:SA_EMAIL" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:SA_EMAIL" --role="roles/secretmanager.viewer"
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:SA_EMAIL" --role="roles/storage.admin"
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:SA_EMAIL" --role="roles/iam.serviceAccountUser"
```

Notes:
- If you use Artifact Registry instead of GCR, replace `roles/storage.admin` with the appropriate Artifact Registry role(s), for example `roles/artifactregistry.writer`.

## Minimal roles required for the Cloud Run runtime service account

The runtime service account only needs permission to read secrets and any Cloud resources your app uses at runtime (e.g., Cloud Storage, Cloud SQL). For Secret Manager:

- roles/secretmanager.secretAccessor — required for the runtime to read secret values

Grant example (replace RUNTIME_SA and PROJECT_ID):

```powershell
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --project=PROJECT_ID \
  --member="serviceAccount:RUNTIME_SA" \
  --role="roles/secretmanager.secretAccessor"
```

If your app uses more services (Cloud SQL, GCS), grant only the needed roles (e.g., `roles/cloudsql.client`, `roles/storage.objectViewer`).

## Bootstrap roles (for CI to create & seed secrets)

If you want CI to create Secret Manager secrets and set IAM bindings during the first run, the deploy SA needs higher privileges for that step. Grant the admin role temporarily and remove after bootstrap.

- roles/secretmanager.admin — allows creating secrets and managing IAM policies on them

Bootstrap grant example (temporary):

```powershell
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:SA_EMAIL" --role="roles/secretmanager.admin"

# After seeding, remove the admin role and keep only secretAccessor
gcloud projects remove-iam-policy-binding PROJECT_ID --member="serviceAccount:SA_EMAIL" --role="roles/secretmanager.admin"
```

Security note: avoid keeping `secretmanager.admin` in long-term. Prefer seeding secrets from a trusted developer workstation or a secure admin job, then grant only `secretAccessor` to CI.

## Verification commands

1) Check which roles a service account currently has (project-level bindings):

```powershell
gcloud projects get-iam-policy PROJECT_ID --flatten="bindings[]" --filter="bindings.members:serviceAccount:SA_EMAIL" --format="table(bindings.role)"
```

2) For Secret Manager specific checks:

- Verify secret exists:

```powershell
gcloud secrets describe SECRET_NAME --project=PROJECT_ID
```

- Verify access to latest version (use this to check CI/deploy SA access):

```powershell
gcloud secrets versions access latest --secret=SECRET_NAME --project=PROJECT_ID
```

- Show IAM policy for a secret to check bound members:

```powershell
gcloud secrets get-iam-policy SECRET_NAME --project=PROJECT_ID --format=json
```

3) Inspect Cloud Run service for runtime SA (if service already exists):

```powershell
gcloud run services describe SERVICE_NAME --region=REGION --project=PROJECT_ID --format='value(spec.template.spec.serviceAccountName)'
```

4) Quick script to assert required roles for CI SA (example):

```powershell
$project = 'PROJECT_ID'
$sa = 'SA_EMAIL'
$required = @('roles/run.admin','roles/cloudbuild.builds.builder','roles/secretmanager.secretAccessor','roles/storage.admin','roles/iam.serviceAccountUser')
$have = gcloud projects get-iam-policy $project --flatten="bindings[]" --format="json" | ConvertFrom-Json
# This is a simple check — prefer more robust parsing in production.
```

## Common troubleshooting
- If `gcloud secrets describe` fails with a permission error for the CI run, ensure the CI SA has at least `roles/secretmanager.viewer` to list/describe and `roles/secretmanager.secretAccessor` to read payloads.
- If `gcloud run deploy` fails, confirm `roles/run.admin` and `roles/iam.serviceAccountUser` are present.
- If `gcloud builds submit` fails with permission errors, ensure Cloud Build roles are present.

## Workload Identity (GitHub Actions) notes

If you use Workload Identity Federation (recommended), ensure the GitHub OIDC provider and the IAM binding are set up so that your GitHub repo's runner identity can impersonate the Deploy SA. See `DEPLOYMENT_OIDC_SETUP.md` for exact commands.

---

If you want, I can also add a small GitHub Actions step that asserts the Deploy SA has these roles (dry-run) and fails early with an actionable message. Say the word and I'll add it to `.github/workflows/deploy.yml`.
