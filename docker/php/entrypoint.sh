#!/bin/sh
set -e

attempts=0
until php -r "new PDO('pgsql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT').';dbname='.getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'));" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 60 ]; then
        echo "Postgres not reachable at ${DB_HOST}:${DB_PORT} after ${attempts}s, giving up." >&2
        exit 1
    fi
    echo "Waiting for postgres... (${attempts}s)"
    sleep 1
done

if [ ! -d vendor ]; then
    composer install --no-interaction --prefer-dist
fi

# The bind-mounted source tree is owned by the host user, but php-fpm's worker
# processes run as www-data - keep the runtime-writable dirs open so both can write.
chmod -R ugo+rwX storage bootstrap/cache

if [ ! -f .env ]; then
    cp .env.example .env
    php artisan key:generate --ansi
fi

php artisan migrate --force

if [ ! -L public/storage ]; then
    php artisan storage:link
fi

exec "$@"
