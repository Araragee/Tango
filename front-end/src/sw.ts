/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// ─── Precache (Vite injectManifest fills __WB_MANIFEST) ─────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

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
