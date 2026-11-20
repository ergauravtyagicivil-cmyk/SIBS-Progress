// SIBS Editor app. No offline caching: the editor must always load the live site.
// Clears the cache left by the earlier version of this app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', () => {});
