# Local Development with Docker (WhisperBox)

This guide helps you run the WhisperBox backend locally using Docker + MySQL without installing PHP or Composer on the host.

Prerequisites
- Docker Desktop (Windows) with WSL2 backend recommended
- At least 2GB free disk space

Quick start
1. From the repo root, build and start services:

```powershell
docker-compose up --build
```

2. Wait until the MySQL service is healthy and the backend container starts. The backend container exposes port 8000.

3. Access the backend endpoints:

- Login / auth endpoint: http://localhost:8000/api/auth.php
- Refresh endpoint: http://localhost:8000/api/refresh.php

Smoke tests (PowerShell examples)

Login:
```powershell
$body = @{ action = 'login'; email = 'shadow@example.com'; password = 'password123' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/auth.php -Method Post -Body $body -ContentType 'application/json'
```

Refresh (paste refresh_token from login response):
```powershell
$refreshBody = @{ refresh_token = '<REFRESH_TOKEN>' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/refresh.php -Method Post -Body $refreshBody -ContentType 'application/json'
```

Troubleshooting
- Container fails to start because port 8000/3306 already in use: stop other services or change ports in `docker-compose.yml`.
- `composer install` errors: check network/firewall; in the Dockerfile we attempt to run composer install at build time—if it failed, rebuild and inspect build logs.
- Database connection errors: confirm environment variables are set in `docker-compose.yml` and backend `config/database.php` uses them.

Notes & Production Parity
- The Dockerfile provided uses Apache (Cloud Run-friendly). It will run the webserver inside the container.
- For true production parity, use the same Dockerfile in CI (GitHub Actions) and deploy to Cloud Run using the produced image.
- Remember to set a strong `APP_SECRET` and secure DB credentials in your production environment.

Stopping and cleaning up
```powershell
docker-compose down -v
```

If you prefer not to use Docker, see `PHP_COMPOSER_INSTALL_AND_ALTERNATIVES.md` for Chocolatey, WSL, and manual install options.
