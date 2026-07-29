#!/usr/bin/env bash
# Deploy landing page (www.split-even-wiser.com) changes to production. See README.md.
#
# Plain static HTML/CSS/JS in landing/, no build step - nginx serves it straight
# from a bind mount, so a change just needs nginx to pick up the new files.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
