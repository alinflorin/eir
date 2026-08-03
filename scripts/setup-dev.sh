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
mkcert -cert-file certs/eir.localhost.pem -key-file certs/eir.localhost-key.pem eir.localhost
mkcert -cert-file certs/dex.localhost.pem -key-file certs/dex.localhost-key.pem dex.localhost
mkcert -cert-file certs/rabbitmq.localhost.pem -key-file certs/rabbitmq.localhost-key.pem rabbitmq.localhost
cp "$(mkcert -CAROOT)/rootCA.pem" certs/rootCA.pem

echo "Certs written to ./certs (gitignored, run this script on each machine)."

HOSTS="eir.localhost dex.localhost rabbitmq.localhost"
MISSING=""
for h in $HOSTS; do
  if ! grep -qE "(^|[[:space:]])$h([[:space:]]|$)" /etc/hosts; then
    MISSING="$MISSING $h"
  fi
done

if [ -n "$MISSING" ]; then
  echo "Adding to /etc/hosts (needs sudo):$MISSING"
  sudo sh -c "printf '127.0.0.1\t%s\n' \"${MISSING# }\" >> /etc/hosts"
else
  echo "/etc/hosts already has entries for:$HOSTS"
fi

echo "Done."
