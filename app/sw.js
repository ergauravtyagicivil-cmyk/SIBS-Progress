// SIBS Editor app service worker. Always loads live from the site (no stale copies).
// A working fetch handler is kept so Android Chrome offers "Install app".
const VERSION = 'sibs-editor-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && new URL(e.request.url).pathname.includes('/app/')) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || new Response('You are offline. Connect to the internet to update progress.', { headers: { 'Content-Type': 'text/plain' } })))
  );
});
