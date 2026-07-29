#!/usr/bin/env bash
# One-time setup on an existing production host (not needed for a fresh
# docker/certbot/init-letsencrypt.sh bootstrap, which already requests both
# names): expand the existing certificate to also cover www.split-even-wiser.com
# as a SAN. See README.md.
#
# The DNS A record for www.split-even-wiser.com must already point at this
# server before running this.
set -euo pipefail
cd "$(dirname "$0")/.."

read -rp "Email for Let's Encrypt notifications: " EMAIL

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

$COMPOSE run --rm --entrypoint sh certbot -c \
  "certbot certonly --webroot -w /var/www/certbot -d split-even-wiser.com -d www.split-even-wiser.com --expand --email $EMAIL --agree-tos --no-eff-email"
$COMPOSE exec nginx nginx -s reload
