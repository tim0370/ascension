// Photos de suivi : rangées dans le téléphone (IndexedDB), jamais envoyées sur Internet.
// Elles sont réduites avant d'être gardées pour ne pas remplir la mémoire.

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ascension-photos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction('photos', mode);
    const out = fn(t.objectStore('photos'));
    t.oncomplete = () => resolve(out && out.result);
    t.onerror = () => reject(t.error);
  }));
}

// Réduit l'image à 1280 px maximum et la convertit en JPEG.
function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('conversion impossible'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')); };
    img.src = url;
  });
}

// Ajoute une photo. La date retenue est celle du fichier (pour garder la bonne date quand on importe d'anciennes photos).
let seq = 0;
export async function addPhoto(file) {
  const blob = await shrink(file);
  const now = Date.now();
  const d = file.lastModified && file.lastModified < now ? file.lastModified : now;
  seq += 1;
  await tx('readwrite', (s) => s.put({ id: 'p' + now + '-' + seq, d, blob }));
  return d;
}

// Change la date d'une photo (utile quand la date du fichier n'est pas la bonne).
export async function setPhotoDate(id, d) {
  const p = await tx('readonly', (s) => s.get(id));
  if (!p) return;
  p.d = d;
  await tx('readwrite', (s) => s.put(p));
}

// Toutes les photos sous forme de fichiers, pour les exporter : ascension-photo-2026-11-14.jpg
export async function photoFiles() {
  const all = (await tx('readonly', (s) => s.getAll())) || [];
  const seen = {};
  return all.sort((a, b) => a.d - b.d).map((p) => {
    const day = new Date(p.d).toISOString().slice(0, 10);
    seen[day] = (seen[day] || 0) + 1;
    return new File([p.blob], 'ascension-photo-' + day + (seen[day] > 1 ? '-' + seen[day] : '') + '.jpg', { type: 'image/jpeg' });
  });
}

// Liste des photos, de la plus récente à la plus ancienne : [{ id, d, url }]
export async function listPhotos() {
  const all = (await tx('readonly', (s) => s.getAll())) || [];
  return all.sort((a, b) => b.d - a.d).map((p) => ({ id: p.id, d: p.d, url: URL.createObjectURL(p.blob) }));
}

export function deletePhoto(id) { return tx('readwrite', (s) => s.delete(id)); }
