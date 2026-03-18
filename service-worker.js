/* ═══════════════════════════════════════════════════════════
   TCGPotes — service-worker.js
   Cache offline de tous les assets du projet
═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'tcgpotes-v3';

// Tous les fichiers à mettre en cache pour le mode offline
const ASSETS_TO_CACHE = [
  '/TCGPotes/',
  '/TCGPotes/index.html',
  '/TCGPotes/style.css',
  '/TCGPotes/app.js',
  '/TCGPotes/manifest.json',
  '/TCGPotes/icons/icon-192.png',
  '/TCGPotes/icons/icon-512.png',
  '/TCGPotes/musique/musique.mp3',
  // Cartes Lycée
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
  // Fonts Google (tentative — peut échouer si offline dès le 1er chargement)
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap',
];

// ── INSTALL : mise en cache de tous les assets ────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On cache tout ce qu'on peut, mais on ignore les erreurs individuelles
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Impossible de cacher :', url, err);
          })
        )
      );
    }).then(() => {
      console.log('[SW] Installation terminée');
      return self.skipWaiting(); // Activer immédiatement sans attendre
    })
  );
});

// ── ACTIVATE : supprimer les anciens caches ───────────────
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
      console.log('[SW] Activation terminée');
      return self.clients.claim(); // Prendre le contrôle immédiatement
    })
  );
});

// ── FETCH : stratégie Cache First, réseau en fallback ─────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les appels API (JSONBin, Firebase)
  if (
    url.hostname === 'api.jsonbin.io' ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname === 'www.gstatic.com'
  ) {
    // Laisser passer directement vers le réseau
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Retourner le cache et mettre à jour en arrière-plan (stale-while-revalidate)
        const networkFetch = fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
            }
            return response;
          })
          .catch(() => {/* offline, pas grave */});
        return cached;
      }
      // Pas en cache → réseau, puis mise en cache
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => {
          // Offline total et pas en cache → page de fallback
          if (event.request.destination === 'document') {
            return caches.match('/TCGPotes/index.html');
          }
        });
    })
  );
});

// ── MESSAGE : forcer la mise à jour depuis l'app ──────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
