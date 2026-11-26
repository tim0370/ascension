// Service worker : garde l'app dans le téléphone pour qu'elle s'ouvre tout de suite, même sans réseau.
// À chaque mise à jour : augmenter VERSION ici, VERSION dans js/ui.js, et ajouter les nouveautés dans js/data.js.
// L'app compare elle-même son numéro à celui de ce fichier en ligne et se met à jour (voir la fin de js/app.js).
const VERSION = 'ascension-56';
const FILES = ['./', 'index.html', 'css/app.css', 'fonts/barlow-400.woff2', 'fonts/barlow-500.woff2', 'fonts/barlow-600.woff2', 'fonts/barlow-700.woff2', 'fonts/barlowc-600.woff2', 'fonts/barlowc-700.woff2', 'fonts/barlowc-800.woff2', 'js/app.js', 'js/ui.js', 'js/seance.js', 'js/progress.js', 'js/stats.js', 'js/photos.js', 'js/store.js', 'js/data.js', 'js/anim.js', 'js/sound.js', 'js/programme.js', 'js/quetes.js', 'js/boss.js', 'js/course.js', 'js/camera.js', 'js/notif.js', 'js/corps.js', 'js/bilan.js', 'js/objectifs.js', 'js/jour.js', 'js/chrono.js', 'js/retour.js', 'js/coach.js', 'js/saison.js', 'js/parcours.js', 'js/mesures.js', 'js/forme.js', 'js/mesure.js', 'js/semaine.js', 'js/cerveau.js', 'js/cap.js', 'js/test.js', 'js/campagne.js', 'js/dojo.js', 'js/prog30.js', 'js/analyse.js', 'js/defis.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-512.png'];

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
  // La page elle-même : le réseau d'abord (3 s au plus), pour qu'une réparation arrive toujours ; le cache sinon.
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(VERSION).then((c) => new Promise((ok) => {
      let done = false;
      const fallback = () => c.match('index.html').then((hit) => { if (!done) { done = true; ok(hit || fetch(e.request)); } });
      const t = setTimeout(fallback, 3000);
      fetch(e.request, { cache: 'no-store' }).then((res) => {
        if (done) return;
        if (!res.ok) { clearTimeout(t); fallback(); return; }
        done = true; clearTimeout(t); c.put('index.html', res.clone()).catch(() => {}); ok(res);
      }).catch(() => { clearTimeout(t); fallback(); });
    })));
    return;
  }
  e.respondWith(
    caches.open(VERSION).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone()).catch(() => {});
      return res;
    })))
  );
});

// Notifications envoyées par le programme Cloudflare (dossier ascension-push).
self.addEventListener('push', (e) => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (err) { m = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(m.title || 'Ascension', {
    body: m.body || '', tag: m.tag || 'ascension', renotify: true, icon: 'icons/icon-180.png', badge: 'icons/icon-180.png',
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
