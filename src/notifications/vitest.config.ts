import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Without this, vitest's default glob also picks up the tsc build
    // output under dist/ (e.g. dist/notifications/src/config.test.js) and
    // runs every test twice.
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
})
