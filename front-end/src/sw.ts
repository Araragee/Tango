/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// ─── Precache (Vite injectManifest fills __WB_MANIFEST) ─────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ─── SPA navigation fallback ────────────────────────────────────────────────
// Without this, an offline refresh or deep-link to /app/* (which has no file on
// disk) fails. Serve the precached app shell (index.html) for all navigations
// so the SPA router can take over. Supabase calls are cross-origin connect/fetch,
// not navigations, so they're unaffected.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// ─── Runtime caching ─────────────────────────────────────────────────────────
// Google Fonts stylesheet — small, may change; revalidate in the background.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' }),
)

// Google Fonts + Material Symbols webfont files — immutable, cache aggressively.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
)

// Supabase storage images (avatars/receipts) — cache after first view so they
// survive offline. Capped so the cache can't grow without bound.
registerRoute(
  ({ url, request }) => url.hostname.endsWith('.supabase.co') && request.destination === 'image',
  new CacheFirst({
    cacheName: 'supabase-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
)

// ─── Push ────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; icon?: string; url?: string }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Tango', body: event.data.text() }
  }

  const title = payload.title ?? 'Tango'
  const options = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: payload.url ?? '/app/budget' },
    tag: 'tango-push',
    renotify: true,
  } satisfies NotificationOptions & { renotify?: boolean }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ─── Notification click ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/app/budget'

  event.waitUntil(
    (self.clients as Clients)
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => {
          try { return new URL(c.url).origin === self.location.origin } catch { return false }
        })
        if (existing) {
          existing.focus()
          ;(existing as WindowClient).navigate(url)
        } else {
          ;(self.clients as Clients).openWindow(url)
        }
      })
  )
})

// ─── Skip waiting on message ─────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
