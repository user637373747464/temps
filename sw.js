/* Service worker : l'app se charge même sans réseau (réseau d'abord, copie locale en secours). */
const VERSION = 'temps-v1';
const FICHIERS = ['./', 'index.html', 'styles.css', 'app.js', 'logique.js', 'donnees.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/favicon.svg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(FICHIERS.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copie = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copie)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
