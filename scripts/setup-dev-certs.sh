#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v mkcert &>/dev/null; then
  echo "mkcert not found. Install it first:"
  echo "  brew install mkcert"
  exit 1
fi

mkcert -install

mkdir -p certs
mkcert -cert-file certs/dex.localhost.pem -key-file certs/dex.localhost-key.pem dex.localhost
mkcert -cert-file certs/rabbitmq.localhost.pem -key-file certs/rabbitmq.localhost-key.pem rabbitmq.localhost
cp "$(mkcert -CAROOT)/rootCA.pem" certs/rootCA.pem

echo "Done. Certs written to ./certs (gitignored, run this script on each machine)."
