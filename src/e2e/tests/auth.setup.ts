import { test as setup } from '@playwright/test'
import { requiredEnv } from './support/env.js'

// Runs once (the "setup" project in playwright.config.ts) before the
// "chromium" project, which reuses the saved storage state — so individual
// specs don't each pay for a full Dex round trip.
const authFile = 'playwright/.auth/admin.json'

setup('authenticate as the Dex static admin user', async ({ page }) => {
  const email = requiredEnv('E2E_ADMIN_EMAIL')
  const password = requiredEnv('E2E_ADMIN_PASSWORD')

  await page.goto('/')

  // Opens the account menu (see UserMenu.tsx) and triggers
  // auth.signinRedirect(), which sends us to Dex at a different origin
  // (dex.localhost) — Playwright follows cross-origin navigation
  // transparently within a single page/test.
  await page.getByLabel('Account').click()
  await page.getByRole('menuitem', { name: 'Login' }).click()

  // Dex's built-in password-connector login form. Field ids come from
  // Dex's bundled theme (see staticPasswords in ../../dex-config.yml) and
  // aren't controlled by this repo — if Dex changes its template, update
  // the selectors here.
  await page.waitForURL(/dex\.localhost/)
  await page.locator('#login').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#submit-login').click()

  // Back on our origin. oidc-client-ts still needs to exchange the ?code=
  // for tokens and strip it from the URL (history.replaceState) before
  // auth.isAuthenticated flips true, so wait for that to finish rather
  // than just the redirect landing.
  await page.waitForURL((url) => url.hostname === 'eir.localhost' && !url.searchParams.has('code'))

  // Authenticated: the account menu now shows the signed-in user's
  // name/email instead of the generic "Account" label (see UserMenu.tsx —
  // displayName = name ?? email), and offers Logout.
  await page.getByRole('menuitem', { name: 'Logout' }).waitFor()

  await page.context().storageState({ path: authFile })
})
