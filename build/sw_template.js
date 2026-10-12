/* Seventy-Three offline worker.
   The app and its core data are saved on install; each book's commentary is saved the first time it is opened
   (or all at once from Settings). Everything is served from the device first, so the app works without internet. */
const CORE = '%CORE%', FATHERS = '%FATHERS%';
const FILES = %FILES%;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE)
    .then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('s73-') && k !== CORE && k !== FATHERS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => {
    if (res.ok && url.pathname.includes('/data/fathers/')) {
      const copy = res.clone();
      caches.open(FATHERS).then(c => c.put(req, copy));
    }
    return res;
  })));
});
