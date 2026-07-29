#!/usr/bin/env bash
# First-time local dev setup. See README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

cp -n backend/.env.example backend/.env
docker compose up -d --build

echo "==> Generating VAPID keypair for Web Push (required for friend request notifications)"
docker compose exec app php artisan webpush:vapid
docker compose restart app queue
