import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      // We drive the "update available" UX ourselves (see useServiceWorkerUpdate),
      // so the new service worker must wait for our confirmation instead of
      // activating on its own.
      registerType: 'prompt',
      injectRegister: false,
      // injectManifest (rather than the default generateSW) because
      // src/sw.ts needs its own custom 'push'/'notificationclick' handlers
      // for web push — generateSW only lets you configure caching, not add
      // arbitrary event listeners.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'ui',
        short_name: 'ui',
        description: 'ui',
        theme_color: '#863bff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // App shell (JS/CSS/HTML + icons/manifest) is precached at build
        // time so the app boots offline. Runtime caching for anything else
        // (e.g. images/fonts fetched at runtime) is set up by hand in
        // src/sw.ts, since injectManifest has no equivalent of generateSW's
        // `runtimeCaching` option.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      devOptions: {
        // Lets `npm run dev` register a (dev-mode) service worker too, so
        // the update flow can be exercised without a production build.
        enabled: true,
        type: 'module',
      },
    }),
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
