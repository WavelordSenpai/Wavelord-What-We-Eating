/* sw.js — PWA service worker for "What We Eating?" — AT ROOT, not in netlify/functions/ */
const VER = "wwe-shell-v2.1.0"; // <-- bump this every deploy or phones keep old code
const RT = "wwe-runtime-v2";
const SHELL = [
  "./",
  "index.html",
  "style.css",   // <-- was missing, caused blank offline page
  "app.js",      // <-- was missing
  "manifest.json",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VER && k !== RT).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => c.delete(k)));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.includes("/.netlify/functions/")) return; // never cache API
  if (!/^https?:$/.test(url.protocol)) return;

  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname === "/")) {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VER).then((c) => c.put("index.html", copy)); return res; })
        .catch(() => caches.match("index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(sameOrigin ? VER : RT).then((c) => { c.put(req, copy); if (!sameOrigin) trim(RT, 150); });
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
