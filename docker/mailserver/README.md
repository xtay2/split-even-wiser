# docker-mailserver

This is the spec's chosen mail-sending technology
("nutzt docker-mailserver für den E-Mail-Versand"). It's a full postfix+dovecot stack meant
for actually delivering mail from a real domain (DKIM, SPF, TLS, DNS records, the works),
which makes it overkill for everyday local development — for that, `docker compose up`
already routes outbound mail through **Mailhog** instead (view sent mail at
http://localhost:8026, nothing leaves your machine, no setup required).

Use this when you specifically want to exercise the real mailserver path.

## One-time setup

1. Start it: `docker compose up -d mailserver`
2. Create the account the app sends as (matches `MAIL_USERNAME` in `backend/.env.example`):

   ```
   docker compose exec mailserver setup email add noreply@split-even-wiser.local <a-password>
   ```

   This writes the hashed credentials into `docker/mailserver/config/` (gitignored —
   it's runtime state, not source).

3. Point the app at it instead of Mailhog — override in `backend/.env`:

   ```
   MAIL_HOST=mailserver
   MAIL_PORT=587
   MAIL_USERNAME=noreply@split-even-wiser.local
   MAIL_PASSWORD=<the password you set above>
   ```

   Restart the `app` and `queue` containers to pick up the change (or unset the
   `MAIL_HOST`/`MAIL_PORT`/etc. overrides in `docker-compose.yml`'s `app`/`queue` services,
   which currently pin those to Mailhog for local dev).

4. Mail sent through `mailserver` won't actually leave the container without real DNS
   (MX records, SPF, DKIM) pointing at wherever you're running this — that's expected for
   local testing. Check delivery with `docker compose logs mailserver` or connect an IMAP
   client to `localhost:993` with the account you created.

See the [docker-mailserver docs](https://docker-mailserver.github.io/docker-mailserver/latest/)
for DKIM key generation, DNS setup, and everything needed to actually deliver mail from a
real domain.
