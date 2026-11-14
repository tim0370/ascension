// Service worker : garde l'app dans le téléphone pour qu'elle s'ouvre tout de suite, même sans réseau.
// À chaque mise à jour : augmenter VERSION. Le téléphone télécharge alors tous les fichiers d'un coup,
// puis l'app se recharge toute seule sur la nouvelle version.
const VERSION = 'ascension-8';
const FILES = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/ui.js', 'js/seance.js', 'js/progress.js', 'js/stats.js', 'js/photos.js', 'js/store.js', 'js/data.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(FILES.map((f) => fetch(f, { cache: 'reload' }).then((res) => { if (!res.ok) throw new Error(f); return c.put(f, res); }))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Le cache d'abord : pas d'attente du réseau, donc pas d'écran noir à l'ouverture. Le réseau seulement pour ce qui manque.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(VERSION).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone()).catch(() => {});
      return res;
    })))
  );
});
