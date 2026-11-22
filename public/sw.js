/* Minimal SW: claim clients immediately and prefer network for HTML/JS/CSS so
   GitHub Pages deploys are not stuck on a stale shell in WKWebView/Brave. */
const CACHE = 'seance-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isNav = req.mode === 'navigate';
  const isShell =
    isNav ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('/sw.js');

  if (!isShell) return;

  // Network-first for app shell so new deploys win over HTTP/disk cache
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok && !isNav) {
          const cache = await caches.open(CACHE);
          void cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw new Error('offline');
      }
    })()
  );
});
