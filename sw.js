const CACHE_NAME = 'wwe-v4-gptoss-fix';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => { if(k !== CACHE_NAME) return caches.delete(k); })))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(url.pathname.includes('/.netlify/functions/')) return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
