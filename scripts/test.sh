#!/usr/bin/env bash
# Run the backend test suite. See README.md.
#
# Tests run against a separate split_even_wiser_test database (see backend/phpunit.xml),
# created here on first run so RefreshDatabase never touches the dev database.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose exec -T postgres sh -c '
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname = '"'"'split_even_wiser_test'"'"'" | grep -q 1 \
    || createdb -U "$POSTGRES_USER" split_even_wiser_test'

docker compose exec app ./vendor/bin/pest "$@"
