// Service worker : garde l'app dans le téléphone pour qu'elle s'ouvre tout de suite, même sans réseau.
// À chaque mise à jour : augmenter VERSION ici, VERSION dans js/ui.js, et ajouter les nouveautés dans js/data.js.
// L'app compare elle-même son numéro à celui de ce fichier en ligne et se met à jour (voir la fin de js/app.js).
const VERSION = 'ascension-10';
const FILES = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/ui.js', 'js/seance.js', 'js/progress.js', 'js/stats.js', 'js/photos.js', 'js/store.js', 'js/data.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-512.png'];

// À l'installation, on télécharge tous les fichiers avec le numéro de version dans l'adresse :
// ça oblige le site à donner la toute dernière copie, jamais une ancienne gardée en route.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(FILES.map((f) => fetch(f + '?v=' + VERSION, { cache: 'no-store' }).then((res) => { if (!res.ok) throw new Error(f); return c.put(f, res); }))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Le cache d'abord : pas d'attente du réseau, donc pas d'écran noir à l'ouverture. Le réseau seulement pour ce qui manque.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Les vérifications de version passent toujours par le réseau.
  if (new URL(e.request.url).searchParams.has('fresh')) return;
  e.respondWith(
    caches.open(VERSION).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone()).catch(() => {});
      return res;
    })))
  );
});
