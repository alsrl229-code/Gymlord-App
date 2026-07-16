const CACHE_VERSION = 'coachfolio-shell-2026-07-16-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/coachfolio-app-icon-192.png',
  './assets/coachfolio-app-icon-512.png',
  './assets/coachfolio-favicon.svg',
  './assets/login-bg-gym.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => Promise.allSettled(
      APP_SHELL.map(async (url) => {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response);
      }),
    )),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./'))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
      }
      return response;
    })),
  );
});
