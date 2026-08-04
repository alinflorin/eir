import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    port: 3000,
    fs: {
      // Allow serving the "domain" workspace package, resolved through the
      // monorepo's node_modules symlink to ../domain (outside src/ui, the
      // vite project root).
      allow: ['..'],
    },
  },
  build: {
    // Preserve class/function names so runtime lookups like
    // `payload.constructor.name` (used by useEventBus) survive minification.
    rollupOptions: {
      output: {
        keepNames: true,
      },
    },
  },
})
