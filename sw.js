/* Seventy-Three offline worker.
   The app and its core data are saved on install; each book's commentary is saved the first time it is opened
   (or all at once from Settings). Everything is served from the device first, so the app works without internet. */
const CORE = 's73-core-bcbfb69b60', FATHERS = 's73-fathers-f3572ceb7e';
const FILES = ["./", "data/bible.json", "data/calendar.json", "data/calendar_CA.json", "data/calendar_US.json", "data/credits.json", "data/fathers/_authors.json", "data/fathers/_counts.json", "data/licenses/divinum-officium-MIT.txt", "data/licenses/litcal-Apache-2.0.txt", "data/licenses/romcal-MIT.txt", "data/licenses/sate-MIT.txt", "data/licenses/tamil-lectionary-Unlicense.txt", "data/martyrology.json", "data/offline.json", "data/quotes.json", "data/saints.json", "data/xrefs.json", "fonts/EBGaramond-greek-6d852e.woff2", "fonts/EBGaramond-greek-dd7645.woff2", "fonts/EBGaramond-latin-88e225.woff2", "fonts/EBGaramond-latin-ad9197.woff2", "fonts/EBGaramond-latin-ext-5b9269.woff2", "fonts/EBGaramond-latin-ext-9e53e4.woff2", "fonts/Manrope-latin-a96caf.woff2", "fonts/Manrope-latin-ext-c30f5e.woff2", "fonts/OFL-EBGaramond.txt", "fonts/OFL-Manrope.txt", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "index.html", "manifest.webmanifest"];

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
