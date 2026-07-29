#!/usr/bin/env bash
# Tail logs after a production deploy. See README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app queue nginx
