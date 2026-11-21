// SteVal service worker: network first, cache as offline fallback (same-origin only)
const CACHE = 'steval-v3';
const SHELL = ['./', 'style.css', 'app.js', 'config.js', 'i18n.js', 'manifest.webmanifest', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // Supabase calls pass straight through
  if (url.pathname.endsWith('admin.html') || url.pathname.endsWith('admin.js')) return; // never cache admin
  e.respondWith(
    fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r; })
      .catch(() => caches.match(req))
  );
});
