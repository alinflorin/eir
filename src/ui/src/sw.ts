/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import type { PrecacheEntry } from 'workbox-precaching/_types'

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry | string> }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Anything not covered by the precache manifest above (e.g. images/fonts
// fetched at runtime) is cached lazily with a stale-while-revalidate
// strategy: served from cache instantly, refreshed in the background.
// Equivalent of the old generateSW `runtimeCaching` option, hand-written
// since injectManifest has no config-driven counterpart for it.
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'runtime-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
)

// registerType: 'prompt' means the app itself decides when to activate a
// waiting service worker (see useServiceWorkerUpdate), by posting this
// message once the user confirms — vite-plugin-pwa's registerSW client
// does this for us, but injectManifest requires this listener to actually
// exist.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

interface NotificationPayload {
  title: string
  body: string
  link?: string
}

// Fired when a push message arrives from the server (see notifications'
// pushNotificationService.ts, which sends exactly this JSON shape). Without
// this listener calling showNotification(), the browser shows a generic
// "site was updated in the background" message instead, and repeated
// silent pushes can get the subscription revoked.
self.addEventListener('push', (event) => {
  const payload: NotificationPayload = event.data?.json() ?? { title: 'Notification', body: '' }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: 'pwa-192x192.png',
      data: { link: payload.link },
    }),
  )
})

// Focuses an already-open window on the app if there is one, otherwise
// opens a new one — navigating either to the notification's link, or the
// app root if it didn't carry one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link: string = (event.notification.data as { link?: string } | undefined)?.link ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.navigate(link)
          return client.focus()
        }
      }
      return self.clients.openWindow(link)
    }),
  )
})
