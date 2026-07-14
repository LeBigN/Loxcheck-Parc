// Service worker Loxcheck Parc — accès hors ligne complet
// Stratégie : réseau prioritaire avec délai de garde court, repli immédiat sur
// la copie locale (pré-téléchargée à l'installation) si le réseau est lent ou absent.
const CACHE = 'loxcheck-parc-v16';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './vendor/jspdf.umd.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png'
];
const NETWORK_TIMEOUT = 3500; // ms — au-delà, on sert la version locale

// Installation : téléchargement complet de l'application pour le hors ligne
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('loxcheck-parc-') && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function fetchWithTimeout(req){
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT);
    fetch(req).then(res => { clearTimeout(timer); resolve(res); },
                    err => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetchWithTimeout(e.request).then(res => {
      // Réseau OK : on sert la version fraîche et on met la copie locale à jour
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() =>
      // Réseau lent ou absent : copie locale, avec index.html en secours de navigation
      caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
    )
  );
});
