#!/usr/bin/env bash
# One-time: create the account the app sends as when exercising the real
# docker-mailserver path locally instead of Mailhog. See docker/mailserver/README.md.
#
# Matches MAIL_USERNAME in backend/.env.example.
set -euo pipefail
cd "$(dirname "$0")/.."

ACCOUNT="noreply@split-even-wiser.local"
read -rsp "Password for $ACCOUNT: " PASSWORD
echo

docker compose up -d mailserver
docker compose exec mailserver setup email add "$ACCOUNT" "$PASSWORD"

cat <<EOF

Account created. Point backend/.env at it to use it instead of Mailhog:
  MAIL_HOST=mailserver
  MAIL_PORT=587
  MAIL_USERNAME=$ACCOUNT
  MAIL_PASSWORD=<the password you just set>

Then restart the app/queue containers to pick up the change (or comment out the
MAIL_HOST/... overrides in docker-compose.override.yml's app/queue services,
which currently pin those to Mailhog for local dev).
EOF
