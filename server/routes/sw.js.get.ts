const CACHE_VERSION_SOURCE = [
  process.env.COMMIT_REF,
  process.env.DEPLOY_ID,
  process.env.BUILD_ID,
  process.env.NUXT_BUILD_ID,
  process.env.npm_package_version,
  'local'
].find(Boolean) ?? 'local'

function cacheVersion() {
  return CACHE_VERSION_SOURCE
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 24) || 'local'
}

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/javascript; charset=utf-8')
  setHeader(event, 'cache-control', 'no-cache, no-store, must-revalidate')

  return `
const CACHE_NAME = ${JSON.stringify(`diamondpanel-static-${cacheVersion()}`)}
const OFFLINE_URL = '/offline.html'
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa/icon.svg',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/maskable-icon-512.png',
  '/pwa/apple-touch-icon.png',
  '/images/landing-softball-dashboard.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(() => undefined)
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/uploads/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )

    return
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request))
  }
})

function isStaticAsset(pathname) {
  return pathname.startsWith('/_nuxt/')
    || pathname.startsWith('/pwa/')
    || pathname.startsWith('/images/')
    || pathname.startsWith('/result-card/')
    || pathname === '/favicon.ico'
    || pathname === '/apple-touch-icon.png'
}

async function cacheFirst(request) {
  const cached = await caches.match(request)

  if (cached) return cached

  const response = await fetch(request)

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)

    cache.put(request, response.clone())
  }

  return response
}
`.trimStart()
})
