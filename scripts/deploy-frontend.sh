#!/usr/bin/env bash
# Deploy frontend (React SPA) changes to production. See README.md.
#
# The SPA is a static build baked into a shared volume that nginx serves from
# /var/www/frontend; it does not rebuild automatically on `up`. This runs
# `npm ci && npm run build` against VITE_API_URL=https://split-even-wiser.com/api
# and writes straight into the volume nginx reads from - no restart needed after.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm frontend-build
