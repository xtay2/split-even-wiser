#!/usr/bin/env bash
# Deploy backend (Laravel API) changes to production. See README.md.
#
# Usage: scripts/deploy-backend.sh [--install] [--build]
#   --install  run `composer install` first (composer.json/composer.lock changed;
#              the entrypoint only does this itself when vendor/ is missing)
#   --build    rebuild the app/queue image instead of just restarting
#              (docker/php/Dockerfile changed - new PHP extensions/system packages)
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
INSTALL=0
BUILD=0

for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    --build) BUILD=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

if [[ "$BUILD" == 1 ]]; then
  $COMPOSE up -d --build app queue
  exit 0
fi

if [[ "$INSTALL" == 1 ]]; then
  $COMPOSE exec app composer install --no-interaction --prefer-dist
fi

# backend/ is bind-mounted into app/queue, so PHP source changes are already visible;
# restarting re-runs docker/php/entrypoint.sh (applies pending migrations, re-symlinks
# public/storage) and makes the long-lived queue:work process pick up the new code.
$COMPOSE restart app queue
