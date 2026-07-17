# Split Even Wiser

A free, mobile-first Splitwise alternative. Passwordless (email-token) accounts, friends with
push notifications, groups with fully versioned/audited expenses, and transitive per-currency
debt simplification.

## Stack
- Backend: PHP 8.5, Laravel 12 (REST API), PostgreSQL, Sanctum auth, Web Push
- Frontend: React 19, Redux Toolkit (RTK Query), Bootstrap 5, Vite PWA
- Infra: Docker Compose, Mailhog for local mail testing, docker-mailserver for the
  production-shaped mail path (see `docker/mailserver/README.md`)

## First-time setup

```
cp backend/.env.example backend/.env
docker compose up --build
docker compose exec app php artisan webpush:vapid
```

The last step generates a VAPID keypair into `backend/.env` — required before push
notifications will work (friend requests use them). Restart `app`/`queue` after generating it
(`docker compose restart app queue`).

`backend/.env` is gitignored on purpose (it ends up holding the VAPID private key); everything
else in it is safe local-dev defaults out of the box.

## Running it

```
docker compose up
```

- Frontend (PWA): http://localhost:5173
- Backend API: http://localhost:8000/api
- Sent mail (Mailhog UI — login links land here in dev): http://localhost:8026
- Postgres: localhost:5433 (off the default 5432 to avoid clashing with a host-local Postgres)

The `app` container's entrypoint installs Composer dependencies, generates `APP_KEY` if
missing, runs migrations, and symlinks `public/storage` on every boot. The `frontend`
container runs `npm install && npm run dev` on boot. Both are safe to restart freely.

### Trying it out

1. Open http://localhost:5173, enter any email, and hit "Send me a login link."
2. Open http://localhost:8026 (Mailhog), open the mail, click the login link.
3. First time with that email, you'll be asked to pick a username — after that you're in.
4. Create a group, add a friend/member, add an expense, watch the balance update.

### Tests

```
docker compose exec app ./vendor/bin/pest
```

## Deploying to production

There's no CI/CD pipeline — deploys are a manual `git pull` on the VPS followed by a couple of
`docker compose` commands using the prod overlay (`docker-compose.prod.yml`). Always pass both
compose files together; the base file alone starts the dev-only `frontend` vite server and skips
`nginx`'s prod config/certbot:

```
ssh <user>@split-even-wiser.com
cd split-even-wiser
git pull
```

### Backend changes (Laravel API)

```
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart app queue
```

`backend/` is bind-mounted into `app`/`queue`, so PHP source changes are visible immediately —
restarting re-runs `docker/php/entrypoint.sh`, which applies pending migrations
(`php artisan migrate --force`) and re-symlinks `public/storage`. The restart mainly matters so
the long-lived `queue:work` process picks up the new code and so migrations actually run.

If `composer.json`/`composer.lock` changed, install first (the entrypoint only runs
`composer install` when `vendor/` is missing, which it won't be after the first deploy):
```
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app composer install --no-interaction --prefer-dist
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart app queue
```

If `docker/php/Dockerfile` changed (new PHP extensions/system packages), rebuild the image
instead of just restarting:
```
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build app queue
```

### Frontend changes (React SPA)

The SPA is a static build baked into a shared volume that nginx serves from `/var/www/frontend`;
it does not rebuild automatically on `up`:

```
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm frontend-build
```

This runs `npm ci && npm run build` against `VITE_API_URL=https://split-even-wiser.com/api` and
writes straight into the volume nginx reads from — no restart needed afterwards.

### After deploying

```
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app queue nginx
```

`mailserver` and `certbot` only need touching when their own config changes — see
`docker/mailserver/README.md` and `docker/certbot/init-letsencrypt.sh`.

## Repository layout

```
backend/     Laravel 12 API
frontend/    React 19 + Vite PWA
docker/      Dockerfiles, nginx config, mailserver config
```
