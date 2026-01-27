// Remove old service worker
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Wipe SW caches
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}

      // Unregister self
      try {
        await self.registration.unregister();
      } catch {}

      // Reload controlled tabs so they fetch the new site without SW
      try {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        await Promise.all(clients.map((c) => c.navigate(c.url)));
      } catch {}
    })(),
  );
});
