/* EnGame service worker: offline shell, static assets and downloaded lesson media.
 * API data is never cached here (lessons for offline use live in IndexedDB, see src/lib/offline.ts). */
const VERSION = 'v1';
const SHELL = `engame-shell-${VERSION}`;
const STATIC = `engame-static-${VERSION}`;
const MEDIA = `engame-media-${VERSION}`;
const PRECACHE = ['/', '/play/offline', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];
const MEDIA_LIMIT = 400;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('engame-') && ![SHELL, STATIC, MEDIA].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.status === 200) {
    await cache.put(request, res.clone());
    if (cacheName === MEDIA) trim(MEDIA, MEDIA_LIMIT);
  }
  return res;
}

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    // Pages are client-rendered shells without personal data, so they are safe to keep for offline use.
    if (res.ok && res.type === 'basic') await cache.put(request, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match('/play/offline')) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/v1/media/')) {
    // Media files are content-addressed (immutable), so cache-first is safe.
    event.respondWith(cacheFirst(request, MEDIA));
    return;
  }
  if (url.pathname.startsWith('/api/')) return; // always network
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  }
});

self.addEventListener('message', (event) => {
  // Sent on sign-out so a shared device does not keep the previous family's media.
  if (event.data === 'clear-media') event.waitUntil(caches.delete(MEDIA));
});
