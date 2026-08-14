import { test, expect } from '@playwright/test'

// /settings is wrapped in <ProtectedRoute> (see ProtectedRoute.tsx), which
// redirects through Dex if unauthenticated. Reaching it directly here
// proves the storage state saved by auth.setup.ts is being reused.
test('signed-in user can reach the protected settings page', async ({ page }) => {
  await page.goto('/settings')

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})
