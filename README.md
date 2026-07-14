# Split Even Wiser

A free, mobile-first Splitwise alternative. Passwordless (email-token) accounts, friends with push
notifications, groups with fully versioned/audited expenses, and transitive per-currency debt
simplification.

## Stack
- Backend: PHP 8.5, Laravel 12 (REST API), PostgreSQL, Sanctum auth, Web Push
- Frontend: React 19, Redux Toolkit (RTK Query), Bootstrap 5, Vite PWA
- Infra: Docker Compose, docker-mailserver for outbound mail

## Development

```
docker compose up --build
```

- Backend API: http://localhost:8000
- Frontend dev server: http://localhost:5173
- Postgres: localhost:5432
- Mail (SMTP submission): localhost:587

The `app` container's entrypoint installs composer dependencies, generates `APP_KEY` if missing,
and runs migrations on boot. The `frontend` container runs `npm install` + `npm run dev` on boot.

See `backend/.env.example` for required environment variables (copy to `backend/.env` and adjust
before first boot — a default dev `.env` is already checked out of `.gitignore` scope on first
`composer create-project` and is not committed).

Further setup notes (mailserver account provisioning, VAPID key generation) are documented as
those pieces land.
