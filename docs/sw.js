/* Forge — service worker.
 *
 * RÈGLE DE RELEASE : à CHAQUE modification d'un fichier de docs/, incrémenter CACHE
 * (forge-v1 -> forge-v2 …). Un fichier JS/CSS ajouté dans docs/ doit AUSSI être
 * ajouté à ASSETS, sinon il ne sera pas disponible hors-ligne.
 *
 * Stratégie : network-first. Le téléphone récupère donc la dernière version dès
 * qu'il a du réseau, et garde une copie complète pour les séances hors-ligne.
 */
const CACHE = 'forge-v1';

const ASSETS = [
  './',
  'index.html',
  'style.css',
  'exercises.js',
  'engine.js',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => { });
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match('index.html'))
      )
  );
});
