# eir

## Local dev setup

Before running `docker compose up`, generate a locally-trusted TLS cert for Dex (needed once per machine):

**macOS / Linux (or Windows with Git Bash):**
```
brew install mkcert   # macOS; see mkcert docs for Linux package managers
./scripts/setup-dev.sh
```

**Windows (PowerShell):**
```
choco install mkcert   # or: scoop install mkcert
./scripts/setup-dev-certs.ps1
```

Either script installs a local mkcert CA (via `mkcert -install`, prompts for admin/password), writes certs for `eir.localhost`, `dex.localhost`, and `rabbitmq.localhost` to `./certs/` (gitignored), and adds those hostnames to `/etc/hosts` pointing at `127.0.0.1` (prompts for sudo) so browsers can resolve them.

## Testing

- Component tests live alongside each app (e.g. `src/ui`, run via `npm test` there — Vitest in browser mode).
- End-to-end tests live in [`src/e2e`](src/e2e/README.md) (Playwright), driving the whole stack through a real browser against `https://eir.localhost`.
