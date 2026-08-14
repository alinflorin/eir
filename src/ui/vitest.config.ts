import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

// Separate from vite.config.ts (which wires up the react-compiler babel
// plugin used only for the production build) to keep the test toolchain
// minimal and fast.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Without this, Vite's dep pre-bundling can end up serving two copies
    // of React to the browser (one pulled in via vitest-browser-react, one
    // via @fluentui/react-components), which trips "Invalid hook call".
    dedupe: ['react', 'react-dom'],
  },
  server: {
    fs: {
      // Same reason as vite.config.ts: tests import from src/domain, a
      // sibling of this project's root, so the dev server needs to be
      // allowed to serve it.
      allow: ['..', '/domain'],
    },
  },
  // Note: vite.config.ts's build.rollupOptions.output.keepNames (needed so
  // `payload.constructor.name` survives production minification, used by
  // useEventBus) has no test-time equivalent to set here — nothing in the
  // test/dev transform pipeline minifies or renames, so names already come
  // through as-is (see Settings.test.tsx, which relies on this).
  test: {
    setupFiles: ['./src/test-setup.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      // Headless by default so `npm test` works unattended in CI/Docker;
      // override locally with `npm test -- --browser.headless=false` to
      // watch the run in a real window.
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
})
