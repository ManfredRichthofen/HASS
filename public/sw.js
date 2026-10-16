/* Casa PWA service worker — runtime cache for shell assets.
   Avoids precaching hashed bundles (TanStack Start build pipeline). */

const VERSION = 'casa-v1'
const ASSET_CACHE = `${VERSION}-assets`
const SHELL_CACHE = `${VERSION}-shell`

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      await cache.addAll(['/manifest.webmanifest', '/icons/icon-192.png'])
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('casa-') && !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

function isAssetRequest(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.woff2'))
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never cache Home Assistant / API traffic
  if (url.pathname.startsWith('/api') || url.hostname.includes('ui.nabu.casa')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(SHELL_CACHE)
          cache.put(request, fresh.clone())
          return fresh
        } catch {
          const cached =
            (await caches.match(request)) ||
            (await caches.match('/')) ||
            (await caches.match('/index.html'))
          if (cached) return cached
          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      })(),
    )
    return
  }

  if (!isAssetRequest(url)) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE)
      const cached = await cache.match(request)
      if (cached) {
        event.waitUntil(
          fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone())
            })
            .catch(() => {}),
        )
        return cached
      }
      const fresh = await fetch(request)
      if (fresh.ok) cache.put(request, fresh.clone())
      return fresh
    })(),
  )
})
