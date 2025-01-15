importScripts('sw-toolbox.js');

toolbox.precache([
  'companion.js',
  'index.html',
  'main.js',
  'styles.css',
]);

// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('FemFlow-cache').then((cache) => {
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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
