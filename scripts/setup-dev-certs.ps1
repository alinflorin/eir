$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Host "mkcert not found. Install it first:"
    Write-Host "  choco install mkcert"
    Write-Host "  # or: scoop install mkcert"
    exit 1
}

mkcert -install

New-Item -ItemType Directory -Force -Path certs | Out-Null
mkcert -cert-file certs/dex.localhost.pem -key-file certs/dex.localhost-key.pem dex.localhost
mkcert -cert-file certs/rabbitmq.localhost.pem -key-file certs/rabbitmq.localhost-key.pem rabbitmq.localhost
Copy-Item (Join-Path (mkcert -CAROOT) "rootCA.pem") certs/rootCA.pem

Write-Host "Done. Certs written to ./certs (gitignored, run this script on each machine)."
