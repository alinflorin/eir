#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker &>/dev/null; then
  echo "docker not found. Install Docker Desktop first."
  exit 1
fi

docker compose up -d
trap 'docker compose down' EXIT
docker compose logs -f
