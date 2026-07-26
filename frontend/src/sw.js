import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)

// There's no in-app update prompt, so without this a newly deployed service worker (e.g.
// carrying a fix like the push cache exclusion below) sits in "waiting" until every open tab
// is closed - the old worker keeps controlling the page and serving stale responses in the
// meantime. Activating and taking control immediately means a reload is enough to pick up
// worker changes.
self.skipWaiting()
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Deep-linking or hard-reloading into a client-routed URL (e.g. /groups/42) while offline is
// otherwise a hard network error - nothing precached matches that exact path. Falling back to
// the cached app shell lets the SPA router take over and render from the API cache below.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }))

export const API_CACHE_NAME = 'api-cache'

// Reads (groups, expenses, balances, friends, …) are cached so the last known state stays
// visible while offline; a short network timeout keeps things snappy once back online instead
// of waiting out a slow/broken connection before falling back to cache.
registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    // The VAPID public key must always come from the network - if it's ever served stale
    // (e.g. cached from before VAPID_PUBLIC_KEY was configured), pushManager.subscribe()
    // rejects with "Invalid raw ECDSA P-256 public key" and there's no way to recover
    // without clearing the cache by hand.
    !url.pathname.startsWith('/api/push/'),
  new NetworkFirst({
    cacheName: API_CACHE_NAME,
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
)

self.addEventListener('push', (event) => {
  if (!event.data) return

  const payload = event.data.json()

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data ?? {},
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).origin === self.location.origin)
      if (existing) {
        return existing.navigate(url).then((client) => client.focus())
      }
      return self.clients.openWindow(url)
    }),
  )
})
