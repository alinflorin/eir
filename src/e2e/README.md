# e2e

Playwright Test suite covering full user journeys against the real dockerized
stack (ui, notifications, RabbitMQ, Dex, Caddy) — as opposed to `src/ui`'s
Vitest-browser component tests, which cover individual components in
isolation.

## Setup

1. Bring the stack up (from the repo root):
   ```
   docker compose up
   ```
   with mkcert certs installed per the root [README](../../README.md), so
   `https://eir.localhost` resolves and is trusted.

2. Install dependencies and browsers:
   ```
   npm install
   npx playwright install chromium
   ```

3. Copy `.env.example` to `.env` and fill in `E2E_ADMIN_PASSWORD` — the
   plaintext behind `DEX_ADMIN_PASSWORD_HASH` in the repo-root `.env`
   (see `../../dex-config.yml`, `staticPasswords`).

## Running

```
npm test              # headless, all tests
npm run test:headed   # watch it drive a real browser window
npm run test:ui       # Playwright's interactive UI mode
npm run report        # open the HTML report from the last run
npm run codegen       # record a new test by clicking through the app
```

## Structure

- `tests/auth.setup.ts` — logs in once as the Dex static admin user and
  saves the session to `playwright/.auth/admin.json` (gitignored); the
  `chromium` project depends on this and reuses that storage state, so
  individual specs start already authenticated.
- `tests/support/` — shared helpers (env var loading, etc.).
- Everything else under `tests/` is a spec, matched by Playwright's default
  `**/*.spec.ts`.

To exercise a logged-out flow within an otherwise-authenticated suite,
override storage state per test/file:

```ts
test.use({ storageState: { cookies: [], origins: [] } })
```
