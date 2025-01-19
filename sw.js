const CACHE_NAME = 'FemFlow-cache-v1';

// Precache files for offline use
toolbox.precache([
  'companion.js',
  'index.html',
  'main.js',
  'styles.css',
]);

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/main.js',
        '/companion.js',
      ]);
    })
  );
});

// Activate event for cache cleanup
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName); // Clean up old caches
          }
        })
      );
    })
  );
});

// Fetch event with caching logic
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return cached response
      }
      return fetch(event.request).then((response) => {
        if (event.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone()); // Cache new response
          });
        }
        return response;
      });
    })
  );
});
