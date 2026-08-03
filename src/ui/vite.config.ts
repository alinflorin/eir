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
      // Allow serving src/domain, mounted as a sibling of the project root
      // (/domain) in docker-compose so it lines up with the local layout
      // (src/ui and src/domain as siblings under src/).
      allow: ['..', '/domain'],
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
