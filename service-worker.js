/* ═══════════════════════════════════════════════════════════
   TCGPotes — service-worker.js
   Stratégie mixte :
   - app.js / index.html / style.css → Network First (toujours frais)
   - images / fonts → Cache First (performances)
═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'tcgpotes-v4';

// Fichiers critiques : toujours récupérés depuis le réseau en priorité
const NETWORK_FIRST = [
  '/TCGPotes/app.js',
  '/TCGPotes/index.html',
  '/TCGPotes/style.css',
  '/TCGPotes/',
];

const ASSETS_TO_CACHE = [
  '/TCGPotes/',
  '/TCGPotes/index.html',
  '/TCGPotes/style.css',
  '/TCGPotes/app.js',
  '/TCGPotes/manifest.json',
  '/TCGPotes/img/Lycee/carte1_exLycee.png',
  '/TCGPotes/img/Lycee/carte2_exLycee.png',
  '/TCGPotes/img/Lycee/carte3_exLycee.png',
  '/TCGPotes/img/Lycee/carte4_exLycee.png',
  '/TCGPotes/img/Lycee/carte5_exLycee.png',
  '/TCGPotes/img/Lycee/carte6_exLycee.png',
  '/TCGPotes/img/Lycee/carte7_exLycee.png',
  '/TCGPotes/img/Lycee/carte8_exLycee.png',
  '/TCGPotes/img/Lycee/carte9_exLycee.png',
  '/TCGPotes/img/Lycee/carte10_exLycee.png',
  '/TCGPotes/img/Lycee/carte11_exLycee.png',
  '/TCGPotes/img/Lycee/carte12_exLycee.png',
  '/TCGPotes/img/Lycee/carte13_exLycee.png',
  '/TCGPotes/img/Lycee/carte14_exLycee.png',
  '/TCGPotes/img/Lycee/carte15_exLycee.png',
  '/TCGPotes/img/Lycee/carte16_exLycee.png',
  '/TCGPotes/img/Lycee/carte17_exLycee.png',
  '/TCGPotes/img/Lycee/carte18_exLycee.png',
  '/TCGPotes/img/Lycee/carte19_exLycee.png',
  '/TCGPotes/img/Lycee/carte20_exLycee.png',
  '/TCGPotes/img/Lycee/carte21_exLycee.png',
  '/TCGPotes/img/Lycee/carte22_exLycee.png',
  '/TCGPotes/img/Lycee/carte23_exLycee.png',
  '/TCGPotes/img/Lycee/carte24_exLycee.png',
  '/TCGPotes/img/Lycee/carte25_exLycee.png',
  '/TCGPotes/img/Lycee/carte26_exLycee.png',
  '/TCGPotes/img/Lycee/carte27_exLycee.png',
  '/TCGPotes/img/Lycee/carte28_exLycee.png',
  '/TCGPotes/img/Lycee/carte29_exLycee.png',
  '/TCGPotes/img/Lycee/carte30_exLycee.png',
  '/TCGPotes/img/Lycee/carte31_exLycee.png',
  '/TCGPotes/img/Lycee/carte32_exLycee.png',
  '/TCGPotes/img/Lycee/carte33_exLycee.png',
  '/TCGPotes/img/Lycee/carte34_exLycee.png',
  '/TCGPotes/img/Lycee/carte35_exLycee.png',
  '/TCGPotes/img/Lycee/carte36_exLycee.png',
  '/TCGPotes/img/Lycee/carte37_exLycee.png',
  '/TCGPotes/img/Lycee/carte38_exLycee.png',
  '/TCGPotes/img/Lycee/carte39_exLycee.png',
  '/TCGPotes/img/Lycee/carte40_exLycee.png',
  '/TCGPotes/img/Lycee/carte41_exLycee.png',
  '/TCGPotes/img/Lycee/carte42_exLycee.png',
  '/TCGPotes/img/Lycee/carte43_exLycee.png',
  '/TCGPotes/img/Lycee/carte44_exLycee.png',
  '/TCGPotes/img/Lycee/carte45_exLycee.png',
  '/TCGPotes/img/Lycee/carte46_exLycee.png',
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap',
];

// ── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Impossible de cacher :', url, err);
          })
        )
      );
    }).then(() => {
      console.log('[SW] Installation v4 terminée');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE : supprimer TOUS les anciens caches ─────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Suppression ancien cache :', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] Activation v4 terminée');
      return self.clients.claim();
    })
  );
});

// ── FETCH : Network First pour les fichiers critiques ─────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les appels API Firebase/JSONBin
  if (
    url.hostname === 'api.jsonbin.io' ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname === 'www.gstatic.com'
  ) {
    return;
  }

  const pathname = url.pathname;
  const isNetworkFirst = NETWORK_FIRST.some(p => pathname === p || pathname.endsWith(p));

  if (isNetworkFirst) {
    // Network First : réseau en priorité, cache si offline
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache First pour les images et autres assets statiques
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'opaque') return response;
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
            return response;
          })
          .catch(() => {
            if (event.request.destination === 'document') {
              return caches.match('/TCGPotes/index.html');
            }
          });
      })
    );
  }
});

// ── MESSAGE : forcer la mise à jour depuis l'app ──────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
