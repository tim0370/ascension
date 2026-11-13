// Service worker : garde l'app disponible hors ligne (ne fonctionne qu'en https).
// Change le numéro de version à chaque mise à jour pour que les téléphones récupèrent les nouveaux fichiers.
const VERSION = 'ascension-5';
const FILES = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/store.js', 'js/data.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord (pour avoir la dernière version), cache en secours quand il n'y a pas de connexion.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      // On ne garde en mémoire que les bonnes réponses, jamais une page d'erreur.
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
