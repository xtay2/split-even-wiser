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

## Repository layout

```
backend/     Laravel 12 API
frontend/    React 19 + Vite PWA
docker/      Dockerfiles, nginx config, mailserver config
```
