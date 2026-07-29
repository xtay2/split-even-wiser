#!/usr/bin/env bash
# One-time production mailserver setup: create the sending account and
# generate the DKIM key. See docker/mailserver/README.md.
#
# Run docker/certbot/init-letsencrypt.sh first - it also requests the
# mail.split-even-wiser.com cert and starts mailserver with it.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
DOMAIN="split-even-wiser.com"
ACCOUNT="noreply@$DOMAIN"

read -rsp "Password for $ACCOUNT: " PASSWORD
echo

$COMPOSE exec mailserver setup email add "$ACCOUNT" "$PASSWORD"

echo "==> Generating DKIM key for $DOMAIN"
$COMPOSE exec mailserver setup config dkim domain "$DOMAIN"

cat <<EOF

Next steps:
1. Set in the server's backend/.env:
     MAIL_HOST=mail.$DOMAIN
     MAIL_USERNAME=$ACCOUNT
     MAIL_PASSWORD=<the password you just set>
2. Publish the DKIM TXT record from
     docker/mailserver/config/opendkim/keys/$DOMAIN/mail.txt
   as: mail._domainkey.$DOMAIN
   (DNS providers that split TXT records into 255-char chunks handle this
   automatically - paste the whole v=DKIM1; k=rsa; p=... value.)
3. Verify with: dig txt mail._domainkey.$DOMAIN
   (or send a test mail to https://www.mail-tester.com/)
4. Once DKIM/SPF are verified, add a DMARC record (start permissive, tighten later):
     _dmarc.$DOMAIN   v=DMARC1; p=none; rua=mailto:postmaster@$DOMAIN
EOF
