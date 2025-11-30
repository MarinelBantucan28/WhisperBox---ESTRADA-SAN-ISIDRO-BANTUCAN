# PHP & Composer Installation Guide (Windows) — Step-by-step

Goal: prepare another laptop to run the WhisperBox PHP backend locally and run `composer install`, run quick smoke tests (login → refresh), and/or use alternative ways (Docker/WSL/CI) when installing system-wide PHP is not desired.

This document covers:
- Recommended approach (Docker) — professional, reproducible
- Direct Windows install (Chocolatey) — fastest on Windows
- Manual Windows install + composer.phar — minimal global changes
- WSL (Ubuntu) — good if you already use WSL
- CI / Docker alternatives (no local PHP install)
- Common troubleshooting and checklist

---

## 0) Pre-checks on the other laptop

- Windows version and privileges: admin access needed for Chocolatey or system PATH changes.
- Available disk space (Composer + vendor packages can require 100–500 MB).
- Network access to packagist.org (firewall/proxy may block composer downloads).
- If you plan to use Docker, install Docker Desktop first.

---

## 1) Professional recommendation (best for reproducibility): Use Docker

Why: avoids per-developer PHP installs, ensures identical runtime across local and production (Cloud Run). Production will run in a container anyway.

A minimal Docker workflow:
1. Install Docker Desktop for Windows and enable WSL2 backend.
2. From the project root (the repo has your backend under `CSS/whisperbox/backend`): create a small helper `Dockerfile` if one doesn't exist. Example (PHP 8.2):

```dockerfile
FROM php:8.2-cli
WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y git unzip libonig-dev libzip-dev && docker-php-ext-install pdo pdo_mysql mbstring zip
# Install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-interaction --no-dev --prefer-dist
CMD ["php", "-S", "0.0.0.0:8000", "-t", "./"]
```

3. Build and run:

```powershell
# from repo root
docker build -t whisperbox-backend -f CSS\whisperbox\backend\Dockerfile .
docker run --rm -it -p 8000:8000 -v ${PWD}/CSS/whisperbox/backend:/app whisperbox-backend
```

4. Test endpoints at `http://localhost:8000/api/auth.php` etc.

Pros: reproducible, identical to Cloud Run build, no local PHP required.
Cons: Slightly more setup initially.

---

## 2) Quick Windows route (Chocolatey) — easiest for Windows users

1. Open an *elevated* PowerShell (Run as Administrator).
2. Install Chocolatey (if you don't have it):

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force;
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072;
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
```

3. Install PHP and Composer via Chocolatey:

```powershell
choco install -y php
choco install -y composer
```

4. Close and re-open PowerShell to refresh PATH. Verify:

```powershell
php -v
composer --version
```

5. Run composer install in the backend folder:

```powershell
cd "C:\Users\swiflef\OneDrive\Documents\WHISPERBOX GIT CLONE\WhisperBox---ESTRADA-SAN-ISIDRO-BANTUCAN\CSS\whisperbox\backend"
composer install
```

Notes:
- If `composer` is not recognized even after install, double-check PATH and restart terminal.
- Chocolatey installs PHP in a folder added to PATH; use `where php` to confirm.

---

## 3) Manual Windows install + composer.phar (if you prefer not to use a package manager)

1. Download PHP zip from https://windows.php.net/download/ (choose Thread Safe version matching your machine).
2. Extract to `C:\php` (or a folder you control).
3. Add `C:\php` to your PATH (via System Environment Variables or PowerShell):

```powershell
[Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\php', 'User')
# Open a new PowerShell after this step
```

4. Verify:

```powershell
php -v
```

5. Install composer locally (no admin):

```powershell
cd "C:\Users\swiflef\OneDrive\Documents\WHISPERBOX GIT CLONE\WhisperBox---ESTRADA-SAN-ISIDRO-BANTUCAN\CSS\whisperbox\backend"
php -r "copy('https://getcomposer.org/installer','composer-setup.php');"
php composer-setup.php --install-dir=./ --filename=composer.phar
php -r "unlink('composer-setup.php');"
php composer.phar install
```

6. Optionally move `composer.phar` to a folder on PATH or rename to `composer` and run with `php composer.phar`.

---

## 4) Using WSL (Ubuntu) — recommended if you use WSL

1. Ensure WSL2 and Ubuntu are installed.
2. In WSL terminal:

```bash
sudo apt update && sudo apt install -y php-cli unzip curl git
# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
# Run composer in your mounted Windows repo (path example)
cd "/mnt/c/Users/swiflef/OneDrive/Documents/WHISPERBOX GIT CLONE/WhisperBox---ESTRADA-SAN-ISIDRO-BANTUCAN/CSS/whisperbox/backend"
composer install
```

Pros: Linux environment closer to production; fewer Windows-specific issues.

---

## 5) CI / No-local-install alternatives

- Use GitHub Actions / Cloud Build: add a workflow that runs `composer install` and builds/deploys the Docker image for Cloud Run. This is how production will be built.
- Copy `vendor/` from one machine to another (quick but brittle). If you commit `vendor/` to your repo (not recommended), you can avoid composer install on the other laptop. Better: use Docker or CI.

---

## 6) Composer install common problems & fixes

- "php: not recognized": PHP is not in PATH. Restart terminal after PATH changes or install PHP.
- SSL/Transport errors downloading packages: corporate proxy / firewall blocking packagist — configure proxy in Composer (`composer config -g http-basic` or use env vars HTTP_PROXY/HTTPS_PROXY).
- Missing PHP extensions (e.g., ext-pdo, ext-mbstring): composer will list errors like "ext-mbstring missing" — install the extension (Windows: enable in php.ini or install appropriate PHP build; in Docker apt-get install then docker-php-ext-install). For MySQL support ensure `pdo_mysql` is available.
- composer memory limit exhaustion: `php -d memory_limit=-1 composer.phar install`.

---

## 7) Quick smoke test after `composer install`

1. Start a PHP built-in server from the backend folder:

```powershell
cd "CSS\whisperbox\backend"
php -S localhost:8000
```

2. Test registration or login (example with PowerShell):

```powershell
$body = @{ action = 'login'; email = 'shadow@example.com'; password = 'password123' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/auth.php -Method Post -Body $body -ContentType 'application/json'
```

3. If login returns `refresh_token`, copy it and test refresh:

```powershell
$refreshBody = @{ refresh_token = '<REFRESH_TOKEN>' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/refresh.php -Method Post -Body $refreshBody -ContentType 'application/json'
```

You should get a new `token` in the response.

---

## 8) Security / Production notes (professional advice)

- Do not commit `APP_SECRET` or database credentials to the repo. Use environment variables. Ensure `APP_SECRET` is strong (at least 32 random bytes).
- Commit `composer.lock` and use `composer install --no-dev --prefer-dist` in CI to ensure reproducible builds.
- Prefer Docker-based local development for parity with production (Cloud Run uses containers). If you use Docker, reuse your Dockerfile for CI to avoid divergence.
- Consider enabling refresh token rotation and device management later.

---

## 9) Checklist to hand to the other laptop user

- [ ] Decide approach: Docker / Chocolatey / Manual / WSL
- [ ] If Docker: install Docker Desktop, then build the image and run tests (see Docker section)
- [ ] If Chocolatey: run the commands shown and verify `php -v` and `composer --version`
- [ ] Run `composer install` in `CSS/whisperbox/backend`
- [ ] Start PHP server and run the two smoke tests (login → refresh)
- [ ] Report any errors (paste terminal output) and I will diagnose package/extension or network errors

---

## 10) TL;DR — Which to choose?
- If you want the most robust, production-like environment: use Docker. I'll help you write the Dockerfile and run the container.
- If you want to get up-and-running fastest on Windows: use Chocolatey to install PHP & Composer globally, then `composer install`.
- If you don't want to install anything system-wide: use Docker or WSL.

---

If you want, I can now:
- (A) Provide a ready-to-run Dockerfile and docker run commands tailored to your backend, or
- (B) Provide a single one-click PowerShell script to run the Chocolatey path and run `composer install` (you'll still need admin rights), or
- (C) Walk you through the manual steps interactively and fix extension errors as they appear.

Which would you like me to prepare next? (I recommend Docker for reliability.)
