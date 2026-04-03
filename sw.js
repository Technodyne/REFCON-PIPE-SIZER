const CACHE_NAME = 'refrisystem-v28-cache'; // Bumped version to force browser update

// Core local files to cache immediately
const coreAssets = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event: Cache core files and force the worker to activate
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching core assets');
      return cache.addAll(coreAssets);
    })
  );
  self.skipWaiting(); 
});

// Activate Event: Delete old caches when the version bumps
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Dynamic Caching
self.addEventListener('fetch', event => {
  // Exclude non-HTTP requests (like Chrome extensions)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Return the cached file if we have it (Offline support)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. If it's not in the cache, fetch it from the network
      return fetch(event.request).then(networkResponse => {
        // 3. Ensure the response is valid before caching
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        // 4. Clone the successful network response and put it in the cache for next time
        let responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
        
      }).catch(() => {
        // Fallback: If offline and the fetch fails, force route directory hits back to index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
