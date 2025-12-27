const CACHE_NAME = 'superpwdhash-v5';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './prefix.js',
  './md5.js',
  './hashed-password.js',
  './js/app.js',
  './css/style.css',
  './icons/icon-192x192.svg',
  './icons/icon-512x512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? Promise.resolve() : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
