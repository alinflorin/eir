#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../src/e2e"

# Assumes the stack is already up (docker compose up, or an equivalent
# reachable at E2E_BASE_URL) — this script does not start it.

if [ ! -f .env ]; then
  echo ".env not found. Copy .env.example to .env and fill in E2E_ADMIN_PASSWORD first."
  exit 1
fi

if [ ! -d node_modules ]; then
  npm install
fi

# No-op if the browser is already installed.
npx playwright install chromium

npm test -- "$@"
