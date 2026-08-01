const CACHE_VERSION = 'coachfolio-shell-2026-08-01-v2';
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
    const scopePath = new URL(self.registration.scope).pathname;
    const indexPath = `${scopePath.replace(/\/?$/, '/')}index.html`;
    const isAppShellNavigation = requestUrl.pathname === scopePath
      || requestUrl.pathname === scopePath.replace(/\/$/, '')
      || requestUrl.pathname === indexPath;
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 약관·개인정보·404 응답이 앱 셸을 덮어쓰지 않도록 앱 진입 URL만 저장한다.
          if (response.ok && isAppShellNavigation) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          if (isAppShellNavigation) {
            return (await caches.match('./index.html'))
              || (await caches.match('./'))
              || new Response('오프라인 상태입니다.', { status: 503 });
          }
          return (await caches.match(event.request))
            || new Response('오프라인에서는 이 페이지를 열 수 없습니다.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }),
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
