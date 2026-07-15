#!/usr/bin/env bash
# One-time TLS bootstrap for the prod compose overlay. Run this once on the VPS
# before the first `docker compose ... up -d`, from the repo root.
#
# Problem it solves: nginx's prod config references a Let's Encrypt cert that
# doesn't exist yet, so it can't start; but certbot needs nginx running on :80 to
# prove domain ownership (the HTTP-01 webroot challenge). Fix: boot nginx with a
# throwaway self-signed cert first, then swap in the real one.
set -euo pipefail

DOMAIN="split-even-wiser.com"
MAIL_DOMAIN="mail.split-even-wiser.com"
EMAIL="dennis.woithe@codesupply.de"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "==> Building frontend and creating a temporary self-signed cert"
$COMPOSE run --rm frontend-build

$COMPOSE run --rm --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN &&
  apk add --no-cache openssl >/dev/null &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=$DOMAIN'
"

echo "==> Starting nginx with the temporary cert"
$COMPOSE up -d postgres redis app queue nginx

echo "==> Requesting the real certificate from Let's Encrypt"
$COMPOSE run --rm --entrypoint sh certbot -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf &&
  certbot certonly --webroot -w /var/www/certbot -d $DOMAIN \
    --email $EMAIL --agree-tos --no-eff-email
"

echo "==> Reloading nginx with the real certificate"
$COMPOSE exec nginx nginx -s reload

# Separate cert (not a SAN on $DOMAIN) because docker-mailserver's SSL_TYPE=letsencrypt
# looks up /etc/letsencrypt/live/<its own hostname>/ directly. Requires the DNS A record
# for $MAIL_DOMAIN to already point at this host - the webroot HTTP-01 challenge is
# served by the same nginx :80 block regardless of which hostname requested it.
echo "==> Requesting the mailserver certificate from Let's Encrypt"
$COMPOSE run --rm --entrypoint sh certbot -c "
  certbot certonly --webroot -w /var/www/certbot -d $MAIL_DOMAIN \
    --email $EMAIL --agree-tos --no-eff-email
"

echo "==> Starting the renewal loop"
$COMPOSE up -d certbot

echo "==> Starting mailserver with its Let's Encrypt certificate"
$COMPOSE up -d mailserver

echo "Done. https://$DOMAIN should now be live."
