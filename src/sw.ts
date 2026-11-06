// Service worker, built by vite-plugin-pwa (injectManifest) into dist/sw.js.
// Precaches every built file (hashed names), so the app opens and runs offline; a new build
// gets a new precache list, so installed apps update on their next visit.
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

// Caches made by the hand-written sw.js used up to v54 ('fut-academy-stats-v54' etc.).
const LEGACY_CACHE_PREFIX = 'fut-academy-stats-v';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Opening the app (any #/… route) serves the precached page, also offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// A new version takes over straight away, as before.
void self.skipWaiting();
clientsClaim();

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith(LEGACY_CACHE_PREFIX)).map((k) => caches.delete(k))),
      ),
  );
});
