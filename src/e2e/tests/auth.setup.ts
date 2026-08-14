import { test as setup } from '@playwright/test'
import { requiredEnv } from './support/env.js'

// Runs once (the "setup" project in playwright.config.ts) before the
// "chromium" project, which reuses the saved storage state — so individual
// specs don't each pay for a full Dex round trip.
const authFile = 'playwright/.auth/admin.json'

setup('authenticate as the Dex static admin user', async ({ page, baseURL }) => {
  const email = requiredEnv('E2E_ADMIN_EMAIL')
  const password = requiredEnv('E2E_ADMIN_PASSWORD')

  // Dex is served on a sibling "dex." subdomain of the app's own "eir."
  // subdomain in both local dev (eir.localhost / dex.localhost) and
  // staging (E2E_BASE_URL) — derive it instead of hardcoding a host, so
  // this works against either.
  const appHost = new URL(baseURL!).hostname
  const dexHost = appHost.replace(/^eir\./, 'dex.')

  // The Avatar's aria-label doubles as "Account" when signed out and the
  // signed-in display name (name ?? email, see UserMenu.tsx) once signed
  // in, so it can't be used as a stable locator across the login. The
  // aria-haspopup="menu" that Fluent's MenuTrigger sets on it doesn't
  // change, and it's the only such trigger in the header.
  const accountMenuTrigger = page.locator('[aria-haspopup="menu"]')

  await page.goto('/')

  // Opens the account menu (see UserMenu.tsx) and triggers
  // auth.signinRedirect(), which sends us to Dex at a different origin —
  // Playwright follows cross-origin navigation transparently within a
  // single page/test.
  await accountMenuTrigger.click()
  await page.getByRole('menuitem', { name: 'Login' }).click()

  // Dex's built-in password-connector login form. Field ids come from
  // Dex's bundled theme (see staticPasswords in ../../dex-config.yml) and
  // aren't controlled by this repo — if Dex changes its template, update
  // the selectors here.
  await page.waitForURL((url) => url.hostname === dexHost)
  await page.locator('#login').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#submit-login').click()

  // Back on our origin. oidc-client-ts still needs to exchange the ?code=
  // for tokens and strip it from the URL (history.replaceState) before
  // auth.isAuthenticated flips true, so wait for that to finish rather
  // than just the redirect landing.
  await page.waitForURL((url) => url.hostname === appHost && !url.searchParams.has('code'))

  // Authenticated: reopen the account menu and confirm it now offers
  // Logout instead of Login.
  await accountMenuTrigger.click()
  await page.getByRole('menuitem', { name: 'Logout' }).waitFor()

  await page.context().storageState({ path: authFile })
})
