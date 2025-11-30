# Deployment Guide — Cloud Run + Firebase Hosting (Automated)

This guide documents a secure, automated deployment pipeline for WhisperBox:
- Backend: Google Cloud Run (containerized)
- Frontend: Firebase Hosting
- CI: GitHub Actions (build, test, deploy)

Goal: when you push to `main`, GitHub Actions will build the backend Docker image, push it to Google Container Registry (GCR) or Artifact Registry, deploy to Cloud Run, and publish the frontend to Firebase Hosting.

Files added to this repo for automation:
- `.github/workflows/deploy.yml` — GitHub Actions workflow for deployment
- `.github/workflows/build-test.yml` — build & test workflow (created earlier)
- `README_DEV_DOCKER.md`, `docker-compose.yml` — local dev
- `INSTALL_PHP_COMPOSER.ps1` — one-click Windows installer
- `DEPLOYMENT_GUIDE.md` — this guide
- `deploy_local.ps1` — local deploy helper (Windows PowerShell) (created alongside this guide)

---

## High-level flow

1. Developer pushes to `main` branch (or opens a PR to `main`).
2. `build-test.yml` runs unit checks, composer install, PHP lint, builds Docker image (for verification).
3. `deploy.yml` runs (on push to `main`):
   - Authenticates to GCP with a service account
   - Builds and pushes Docker image to GCR/Artifact Registry
   - Deploys container to Cloud Run using environment variables
   - Runs `firebase deploy` to publish the frontend

All sensitive credentials are stored as GitHub secrets — never commit keys to the repo.

---

## Prerequisites (GCP & Firebase)

1. Google Cloud Project (create one at https://console.cloud.google.com).
2. Enable APIs in that project:
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry or Container Registry API
   - Cloud SQL Admin API (if using Cloud SQL)
3. Firebase project connected to the same GCP project (https://console.firebase.google.com).

Create a service account for GitHub Actions with the following roles (least privilege recommended):
- Cloud Run Admin (roles/run.admin)
- Service Account User (roles/iam.serviceAccountUser)
- Storage Admin (roles/storage.admin) — if using Artifact Registry with storage
- Cloud Build Editor (roles/cloudbuild.builds.editor)
- Viewer (roles/viewer)

Generate and download a JSON key for the service account. Keep it safe.

---

## Required GitHub Secrets

In the repository Settings → Secrets and variables → Actions, add the following secrets:


Note: For production we recommend storing sensitive values in Google Secret Manager and not as raw GitHub secrets. The deploy workflow now supports Secret Manager integration: instead of supplying DB credentials directly to GitHub Secrets, create secrets in Secret Manager and add the secret *names* to GitHub Secrets as the following variables:

- `SECRET_DB_HOST_NAME` — the Secret Manager secret name that stores DB host (e.g., `db-host`)
- `SECRET_DB_NAME_NAME` — the Secret Manager secret name for DB name (e.g., `db-name`)
- `SECRET_DB_USER_NAME` — the Secret Manager secret name for DB user (e.g., `db-user`)
- `SECRET_DB_PASS_NAME` — the Secret Manager secret name for DB password (e.g., `db-pass`)
- `SECRET_APP_SECRET_NAME` — the Secret Manager secret name for the `APP_SECRET`/JWT secret
- `SECRET_GCS_BUCKET_NAME` — optional secret name for GCS bucket credentials or bucket name

The workflow will then map Cloud Run environment variables to the Secret Manager versions using `--set-secrets` so Cloud Run fetches them at runtime.

Notes:
- For `GCP_SA_KEY`, you can store raw JSON. GitHub Secrets supports multiline secrets.
- For tight security, create a dedicated service account per environment (staging/production). Use deploy-time secrets rather than embedding sensitive values in the image.

---

## GitHub Actions deployment workflow (what it does)

The workflow defined in `.github/workflows/deploy.yml` will:

1. Trigger on push to `main`.
2. Checkout repository.
3. Authenticate to GCP using `GCP_SA_KEY` via `google-github-actions/auth`.
4. Build and push server container image to `gcr.io/${{ secrets.GCP_PROJECT }}/${{ env.IMAGE_NAME }}` using `docker/build-push-action`.
5. Deploy the pushed image to Cloud Run using `gcloud run deploy` or `google-github-actions/deploy-cloudrun`.
6. Run `firebase deploy --only hosting` using `FIREBASE_TOKEN` secret.

After successful run the backend will be reachable at the Cloud Run service URL and the frontend at your Firebase Hosting URL.

---

## Local manual deployment (PowerShell) — `deploy_local.ps1`

If you prefer to deploy from your laptop manually (with gcloud & firebase CLI installed), use `deploy_local.ps1` (provided) which does the following:

- Authenticate `gcloud auth login` or activate service account
- Configure project: `gcloud config set project <PROJECT_ID>`
- Build container and push to `gcr.io` or Artifact Registry
- Deploy to Cloud Run: `gcloud run deploy <SERVICE> --image <IMAGE> --platform managed --region <REGION> --allow-unauthenticated` (or without `--allow-unauthenticated` if you need auth)
- Deploy frontend with `firebase deploy --project <FIREBASE_PROJECT> --token <FIREBASE_TOKEN>`

Run locally only if you have `gcloud` and `firebase` CLIs installed and authenticated.

---

## Cloud Run environment variables

When deploying the Cloud Run service, set these environment variables (minimum):
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `APP_SECRET` (or `JWT_SECRET`) — secret used by `jwt_create()`
- `GOOGLE_CLOUD_PROJECT` — optional

You can configure these in the Cloud Console, or pass via command line in `gcloud run deploy` with `--set-env-vars`.

---

## Example: How to add the GitHub secrets (step-by-step)

1. Copy the contents of the service account JSON to your clipboard.
2. In GitHub repo → Settings → Secrets and variables → Actions → New repository secret.
3. Name: `GCP_SA_KEY`, paste the JSON, Save.
4. Add `GCP_PROJECT`, `GCR_REGION`, `CLOUD_RUN_SERVICE`, `FIREBASE_TOKEN`, and other secrets similarly.

---

## Rollback plan

- Cloud Run supports traffic split by revision; you can revert by deploying the previous revision or using the Cloud Console to split traffic back.
- Keep your last working Docker image tag or use tags with `git rev-parse --short HEAD` to identify images.

---

## Troubleshooting checklist

- Workflow fails with `permission denied` or `401`: verify `GCP_SA_KEY` is valid and has required roles.
- Build fails with Composer errors: check composer.lock, network/proxy settings, and `composer install` logs.
- Firebase deploy fails: verify `FIREBASE_TOKEN` and `FIREBASE_PROJECT` values.
- Database connection errors in Cloud Run: check VPC connector or Cloud SQL IAM if using Cloud SQL; set correct `DB_HOST`.

---

## Secret Manager integration (recommended)

Use Secret Manager to store DB credentials and other sensitive values. Steps:

1. Create each secret in Secret Manager:

```bash
# Example: create secret and add a value
gcloud secrets create db-pass --replication-policy="automatic"
echo -n "supersecretpassword" | gcloud secrets versions add db-pass --data-file=-
```

2. Grant access to the Cloud Run runtime service account (the service's identity) to access the secret:

```bash
# Find your Cloud Run service account (replace SERVICE and REGION)
SERVICE_ACCOUNT=$(gcloud run services describe $SERVICE --region $REGION --format='value(spec.template.spec.serviceAccountName)')

# If empty, you may be using the project's default compute service account (use project number to find it).

gcloud secrets add-iam-policy-binding db-pass \
   --member="serviceAccount:${SERVICE_ACCOUNT}" \
   --role="roles/secretmanager.secretAccessor"
```

3. In GitHub Secrets, add the names of the Secret Manager secrets (NOT the secret values):

- `SECRET_DB_PASS_NAME` = `db-pass`
- `SECRET_DB_USER_NAME` = `db-user`
- `SECRET_DB_HOST_NAME` = `db-host`
- `SECRET_APP_SECRET_NAME` = `app-secret`

4. The GitHub Actions `deploy.yml` will automatically map these Secret Manager secrets into Cloud Run environment variables using `--set-secrets`.

Notes:
- Ensure the service account used by GitHub Actions (deploy service account) has permission to read Secret Manager secret metadata and to deploy Cloud Run.
- Ensure the Cloud Run runtime service account has `roles/secretmanager.secretAccessor` for each secret.

---

## Activate deployment automation

1. Add the required GitHub secrets.
2. Ensure `deploy.yml` is present in `.github/workflows/` (it is — created by this repo change).
3. Push a commit to `main` and watch Actions → build & deploy pipeline.

---

## Security recommendations (professional)

- Use Artifact Registry instead of GCR if you want fine-grained permissions.
- Store secrets in Secret Manager and grant Cloud Run access to them, rather than embedding secrets as environment variables in the Console.
- Rotate service account keys and Firebase tokens periodically.
- Use least-privilege IAM roles; consider a separate deploy SA for CI.

---

## Workload Identity Federation (OIDC) — recommended

This repository and workflow now support using Workload Identity Federation so GitHub Actions can authenticate to GCP without a long-lived JSON key. This is the recommended, more secure approach.

Key points:
- The workflow uses `google-github-actions/auth@v1` and expects two repository secrets:
   - `WIF_PROVIDER` — the Workload Identity Provider resource name (projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER)
   - `GCP_SA_EMAIL` — the Google service account email that Actions will impersonate (e.g., whisperbox-gh-actions@PROJECT_ID.iam.gserviceaccount.com)
- Follow `DEPLOYMENT_OIDC_SETUP.md` (added in the repo) for the exact `gcloud` commands to create the pool, provider, and service account and to grant the `roles/iam.workloadIdentityUser` binding for your GitHub repo.
- After OIDC is configured, remove the `GCP_SA_KEY` JSON secret from GitHub to reduce attack surface.

If you want, I can produce a small checklist and the exact commands to run locally to seed Secret Manager and run one test deployment — say the word and I'll add it.

---

If you want, I will now:
- (A) create the GitHub Actions deployment workflow (`.github/workflows/deploy.yml`) and a `deploy_local.ps1` script (I will create these files now), or
- (B) only generate `DEPLOYMENT_GUIDE.md` and let you add secrets and workflow manually.

Which do you prefer? (You said “yes create deployment guide like something when the chat analyze the md it will run automatically” — I can create the workflow so pushing to `main` runs it automatically.)
