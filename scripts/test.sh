#!/usr/bin/env bash
# Run the backend test suite. See README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose exec app ./vendor/bin/pest "$@"
