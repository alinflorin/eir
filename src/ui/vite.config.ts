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
      workbox: {
        // App shell (JS/CSS/HTML + icons/manifest) is precached at build
        // time so the app boots offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Anything not covered by the precache manifest (e.g. images/fonts
        // fetched at runtime) is cached lazily with a stale-while-revalidate
        // strategy: served from cache instantly, refreshed in the background.
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'runtime-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
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
