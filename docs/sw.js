/* Forge — service worker.
 *
 * RÈGLE DE RELEASE : à CHAQUE modification d'un fichier de docs/, incrémenter CACHE
 * (forge-v9 -> forge-v10 …). Un fichier JS/CSS ajouté dans docs/ doit AUSSI être
 * ajouté à ASSETS, sinon il ne sera pas disponible hors-ligne.
 *
 * Stratégie : network-first, avec trois garde-fous appris à la relecture.
 *  1. Une réponse d'ERREUR (404, 503, portail captif) n'est jamais servie ni mise
 *     en cache tant qu'une copie valide existe : un réseau qui répond mal est pire
 *     qu'un réseau absent, car il court-circuite silencieusement le hors-ligne.
 *  2. Un réseau agonisant ne doit pas bloquer le lancement : passé 3,5 s on sert
 *     la copie locale, et la requête réseau finit tranquillement en arrière-plan.
 *  3. L'installation met en cache fichier par fichier : avec cache.addAll, un seul
 *     404 rejette tout le lot et laisse un cache VIDE alors que le service worker
 *     prend la main — l'app devient inutilisable hors-ligne sans le signaler.
 */
const CACHE = 'forge-v9';
const DELAI_RESEAU = 3500;

const ASSETS = [
  './',
  'index.html',
  'style.css',
  'exercises.js',
  'engine.js',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((u) =>
        c.add(u).catch((e) => { console.warn('[forge] non mis en cache :', u, e); })
      )))
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

/** Réponse réseau exploitable, ou rejet. */
function reseau(req) {
  return fetch(req).then((res) => {
    if (!res || !res.ok) throw new Error('reponse ' + (res && res.status));
    return res;
  });
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    caches.match(req).then((copie) => {
      const enCours = reseau(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => { });
        return res;
      });

      // Sans copie locale, pas le choix : on attend le réseau.
      if (!copie) {
        return enCours.catch(() =>
          caches.match('index.html').then((h) => h || Response.error())
        );
      }

      // Avec une copie : le réseau a 3,5 s pour faire mieux, sinon on sert le cache.
      return Promise.race([
        enCours,
        new Promise((ok) => setTimeout(() => ok(copie), DELAI_RESEAU))
      ]).catch(() => copie);
    })
  );
});
