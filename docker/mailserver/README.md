# docker-mailserver

This is the spec's chosen mail-sending technology
("nutzt docker-mailserver für den E-Mail-Versand"). It's a full postfix+dovecot stack meant
for actually delivering mail from a real domain (DKIM, SPF, TLS, DNS records, the works),
which makes it overkill for everyday local development - for that, `docker compose up`
already routes outbound mail through **Mailhog** instead (view sent mail at
http://localhost:8026, nothing leaves your machine, no setup required).

Use this when you specifically want to exercise the real mailserver path.

## One-time setup

```bash
scripts/mailserver-setup-dev.sh
```

This starts `mailserver`, prompts for a password, and creates the account the app sends as
(matches `MAIL_USERNAME` in `backend/.env.example`) - writing the hashed credentials into
`docker/mailserver/config/` (gitignored - it's runtime state, not source). It then prints the
`backend/.env` overrides needed to point the app at it instead of Mailhog; restart the `app` and
`queue` containers afterwards to pick up the change (or comment out the `MAIL_HOST`/`MAIL_PORT`/
etc. overrides in `docker-compose.override.yml`'s `app`/`queue` services, which currently pin
those to Mailhog for local dev).

Mail sent through `mailserver` won't actually leave the container without real DNS
(MX records, SPF, DKIM) pointing at wherever you're running this - that's expected for
local testing. Check delivery with `docker compose logs mailserver` or connect an IMAP
client to `localhost:993` with the account you created.

See the [docker-mailserver docs](https://docker-mailserver.github.io/docker-mailserver/latest/)
for DKIM key generation, DNS setup, and everything needed to actually deliver mail from a
real domain.

## Production setup

The prod overlay (`docker-compose.prod.yml`) points `mailserver` at the real hostname
`mail.split-even-wiser.com` with `SSL_TYPE=letsencrypt` instead of the dev-shaped
self-signed `.local` config above.

1. DNS - the `A` record must exist before step 2 (it's an HTTP-01 challenge), the rest can
   follow any time before you care about actual deliverability:
   - `A` record: `mail.split-even-wiser.com` → the VPS's public IP.
   - `MX` record: `split-even-wiser.com` → `mail.split-even-wiser.com` (priority 10).
   - SPF TXT record on `split-even-wiser.com`: `v=spf1 mx ~all`.
2. Run `docker/certbot/init-letsencrypt.sh` once - it now also requests the
   `mail.split-even-wiser.com` cert and starts `mailserver` with it.
3. Create the account and generate DKIM (note the account uses the apex domain, not the
   mailserver's own hostname; do this before sending real mail - most providers spam-box or
   reject unsigned mail from a domain with an MX record):
   ```bash
   scripts/mailserver-setup-prod.sh
   ```
   This prompts for a password, creates `noreply@split-even-wiser.com`, and writes the DKIM
   key pair and a ready-to-paste record to
   `docker/mailserver/config/opendkim/keys/split-even-wiser.com/mail.txt` on the host
   (gitignored, same as the account credentials) - then prints the `backend/.env` values and
   the DKIM TXT record to publish:
   - Name: `mail._domainkey.split-even-wiser.com`
   - Value: the `v=DKIM1; k=rsa; p=...` string from `mail.txt` (DNS providers that split TXT
     records into 255-char chunks handle this automatically - paste the whole value).
4. Once DKIM/SPF are live and verified (`dig txt mail._domainkey.split-even-wiser.com` should
   echo the record back, or send a test mail to [mail-tester.com](https://www.mail-tester.com/)),
   add a DMARC record - start permissive, tighten later:
   - Name: `_dmarc.split-even-wiser.com`
   - Value: `v=DMARC1; p=none; rua=mailto:postmaster@split-even-wiser.com`

Certs auto-renew via the existing `certbot` service - no separate renewal setup needed for
the mail cert. DKIM keys don't expire and don't need renewal.
