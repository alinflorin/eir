# eir

## Local dev setup

Before running `docker compose up`, generate a locally-trusted TLS cert for Dex (needed once per machine):

**macOS / Linux (or Windows with Git Bash):**
```
brew install mkcert   # macOS; see mkcert docs for Linux package managers
./scripts/setup-dev-certs.sh
```

**Windows (PowerShell):**
```
choco install mkcert   # or: scoop install mkcert
./scripts/setup-dev-certs.ps1
```

Either script installs a local mkcert CA (via `mkcert -install`, prompts for admin/password) and writes a cert for `dex.localhost` to `./certs/` (gitignored).
