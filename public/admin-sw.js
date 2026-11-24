const ADMIN_CACHE = 'vanguard-admin-v1';
const ADMIN_ASSETS = ['./admin.html', './admin-manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ADMIN_CACHE).then((cache) => cache.addAll(ADMIN_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
