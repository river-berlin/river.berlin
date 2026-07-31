// Minimal service worker so /admin is installable as a PWA.
// Deliberately no caching: a stale cache on this site caused enough
// mysteries already - the app is tiny and always loaded fresh.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
