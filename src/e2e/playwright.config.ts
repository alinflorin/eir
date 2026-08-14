import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Local, gitignored overrides (see .env.example) — same pattern as the
// repo-root .env used by docker-compose.
dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) })

const baseURL = process.env.E2E_BASE_URL ?? 'https://eir.localhost'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // The stack (Caddy, Dex, RabbitMQ, ui, invoicing) is expected to already
  // be up via `docker compose up` — mkcert-trusted certs from
  // ../../scripts/setup-dev.sh make https://eir.localhost / dex.localhost
  // resolve and trust locally, so no webServer/ignoreHTTPSErrors hooks are
  // needed here. Point elsewhere with E2E_BASE_URL if needed.
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],
})
