// What We Eating? - Service Worker
// Bump this version EVERY time you change icon / manifest
const CACHE_NAME = 'wwe-v3-icon-fix';

const CORE_FILES = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './icon-512.png',
  './icon-192.png',
  './assets/icon-512.png',
  './assets/icon-192.png'
];

// Install - cache core files + new icons
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_FILES);
    }).then(() => self.skipWaiting())
  );
});

// Activate - DELETE all old caches, so old icon is gone
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network first for manifest + icons, cache first for rest
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // ALWAYS fetch fresh manifest + icons, never use old cached ones
  if (url.includes('manifest.json') || url.includes('icon-')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
