// La petite IA du coach, dans le téléphone (aucun service en ligne pour comprendre).
// Elle ne fait que COMPRENDRE la question (le sujet) ; la réponse reste calculée par coach.js, donc elle n'invente rien.
// Les fichiers (~80 Mo, dossier ia/) sont téléchargés une fois, sur demande, et gardés dans le cache « ascension-ia-1 »
// (sw.js le laisse en place à chaque mise à jour et sert ia/ depuis ce cache).
// Carnet : les questions mal comprises sont gardées (state.iaLog) et envoyées de temps en temps au programme
// Cloudflare (PUSH/carnet), pour qu'on ajoute des exemples. Rien d'autre n'est envoyé.
import { state, save } from './store.js';
import { VERSION, ACTIONS, ICON, sheet, $, esc } from './ui.js';

export const IA_CACHE = 'ascension-ia-1';
const BASE = new URL('../ia/', import.meta.url).href;
const PUSH = 'https://ascension-push.tim0370.workers.dev';
let files = null; // ia/liste.json : [{ f, n }] (nom, octets)
let st = 'off'; // off | dl | load | ready | error
let pct = 0, err = '', enc = null, bank = null, mod = null, loading = null;
const subs = new Set();
const tell = () => subs.forEach((f) => { try { f(); } catch (e) { /* rien */ } });
export const iaOn = (f) => { subs.add(f); return () => subs.delete(f); };
export const iaState = () => ({ st, pct, err, mo: files ? Math.round(files.reduce((a, x) => a + x.n, 0) / 1e6) : 80 });
export const iaWanted = () => !!(state.settings && state.settings.ia);

async function list() {
  // La liste en ligne d'abord (« fresh » : sw.js la laisse passer), pour voir tout de suite un fichier refait ; sinon celle gardée.
  if (!files) {
    try { const r = await fetch(BASE + 'liste.json?fresh=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error('liste'); files = await r.json(); }
    catch (e) { files = await (await fetch(BASE + 'liste.json')).json(); }
  }
  return files;
}
const cacheOk = () => typeof caches !== 'undefined' && location.protocol === 'https:';

// Télécharge ce qui manque (avec la progression), puis charge le modèle.
export function iaStart() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const L = await list();
      if (cacheOk()) {
        const c = await caches.open(IA_CACHE);
        const miss = [];
        // Un fichier change de taille quand on refait l'IA (nouvelles phrases) : on le retélécharge.
        const same = async (hit, x) => { if (!hit) return false; const n = hit.headers.get('X-N'); if (n) return +n === x.n; if (x.n > 2e6) return true; return (await hit.clone().arrayBuffer()).byteLength === x.n; };
        for (const x of L) if (!(await same(await c.match(BASE + x.f), x))) miss.push(x);
        if (miss.length) {
          st = 'dl'; pct = 0; tell();
          const total = miss.reduce((a, x) => a + x.n, 0);
          let got = 0;
          for (const x of miss) {
            const r = await fetch(BASE + x.f + '?v=' + x.n, { cache: 'no-store' });
            if (!r.ok || !r.body) throw new Error('Téléchargement impossible (' + x.f + ')');
            const rd = r.body.getReader(), parts = [];
            for (;;) {
              const { done, value } = await rd.read();
              if (done) break;
              parts.push(value); got += value.length;
              const p = Math.min(99, Math.floor((got / total) * 100));
              if (p !== pct) { pct = p; tell(); }
            }
            await c.put(BASE + x.f, new Response(new Blob(parts), { headers: { 'Content-Type': x.f.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream', 'X-N': String(x.n) } }));
          }
        }
      }
      st = 'load'; tell();
      await boot(L);
      st = 'ready'; pct = 100; tell();
      if (!state.settings.ia) { state.settings.ia = Date.now(); save(); }
    } catch (e) {
      console.error(e);
      st = 'error'; err = String((e && e.message) || e); loading = null; tell();
    }
  })();
  return loading;
}
async function bytes(f) {
  if (cacheOk()) { const c = await caches.open(IA_CACHE); const r = await c.match(BASE + f); if (r) return r.arrayBuffer(); }
  const r = await fetch(BASE + f);
  if (!r.ok) throw new Error(f);
  return r.arrayBuffer();
}
async function boot(L) {
  // Les fichiers de ia/ sont servis par sw.js depuis le cache de l'IA : ça marche aussi sans réseau.
  const [ort, tok, core] = await Promise.all([import(BASE + 'ort.wasm.min.mjs'), import('../ia/tok.js'), import('../ia/core.js')]);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = BASE;
  const V = tok.loadVocab(await bytes('vocab.bin'));
  const parts = await Promise.all(L.filter((x) => /^modele\.\d+\.bin$/.test(x.f)).sort((a, b) => a.f.localeCompare(b.f)).map((x) => bytes(x.f)));
  const model = new Uint8Array(parts.reduce((a, b) => a + b.byteLength, 0));
  let o = 0;
  for (const p of parts) { model.set(new Uint8Array(p), o); o += p.byteLength; }
  enc = await core.makeEncoder(ort, V, model);
  bank = core.loadBank(await bytes('sujets.bin'));
  mod = core;
}

// Le sujet de la question : { id (ou null si pas sûr), p, top: [[id, p]…] }, ou null si l'IA n'est pas prête.
// kw = scores des mots-clés de cerveau.js ([[id, points]…]), qui aident quand l'IA hésite.
export async function iaGuess(text, kw) {
  if (st !== 'ready') { if (iaWanted() && st === 'off') iaStart(); return null; }
  try {
    const t0 = performance.now();
    const v = await enc(mod.prep(text));
    const r = mod.classify(bank, v, Object.fromEntries(kw || []));
    r.ms = Math.round(performance.now() - t0);
    return r;
  } catch (e) { console.error(e); return null; }
}
// Préchargement discret : seulement si la personne a déjà activé l'IA.
export function iaWarm() { if (iaWanted() && st === 'off') setTimeout(() => { if (st === 'off') iaStart(); }, 2500); }

// ---------- Carnet des questions mal comprises ----------
// e = { q, ia: top, mot: id des mots-clés, dit: sujet choisi par le coach ('' = pas compris), choix: bouton touché ensuite }
export function iaNote(e) {
  try {
    const L = state.iaLog || (state.iaLog = []);
    L.push(Object.assign({ at: Date.now(), sent: 0 }, e, { q: String(e.q || '').slice(0, 240) }));
    if (L.length > 200) L.splice(0, L.length - 200);
    save();
    iaSend();
  } catch (err2) { /* rien */ }
}
// Le bouton touché après « Tu voulais dire… » : c'est la bonne réponse, on la note sur la dernière question.
export function iaPicked(id) {
  const L = state.iaLog || [];
  const e = L[L.length - 1];
  if (e && !e.choix && Date.now() - e.at < 10 * 60000) { e.choix = id; e.sent = 0; save(); iaSend(); }
}
let sending = false;
// Envoi groupé, au plus toutes les 30 minutes (ou tout de suite à partir de 5 questions en attente).
export function iaSend(force) {
  const L = state.iaLog || [];
  const wait = L.filter((e) => !e.sent);
  if (!wait.length || sending || state.settings.iaShare === false) return;
  const lastSent = state.settings.iaSent || 0;
  if (!force && wait.length < 5 && Date.now() - lastSent < 30 * 60000) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (!state.settings.pushId) state.settings.pushId = Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 20);
  sending = true;
  const items = wait.slice(0, 60).map((e) => ({ q: e.q, at: e.at, ia: e.ia || [], mot: e.mot || '', dit: e.dit || '', choix: e.choix || '' }));
  fetch(PUSH + '/carnet', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ id: state.settings.pushId, v: String(VERSION), items }) })
    .then((r) => { if (r.ok) { const t = Date.now(); wait.slice(0, 60).forEach((e) => { e.sent = t; }); state.settings.iaSent = t; save(); } })
    .catch(() => {})
    .finally(() => { sending = false; });
}

// ---------- Fenêtre « La petite IA du coach » (réglages, coach) ----------
function iaHtml() {
  const S = iaState(), share = state.settings.iaShare !== false;
  let h = '<div id="iasheet" class="col" style="gap:14px"><span class="label violet">Coach</span><h1 class="h1">La petite IA du coach</h1>'
    + '<p class="small" style="color:var(--soft);margin:0">Elle aide le coach à comprendre tes questions, même écrites vite, avec des fautes ou des abréviations (« jsuis creuvé », « cmb de séances »).</p>'
    + '<p class="small mut" style="margin:0">Elle est rangée dans ton téléphone et marche sans internet. Les réponses restent calculées sur tes séances : elle n’invente rien.</p>';
  if (S.st === 'ready') h += '<div class="glass card col" style="gap:6px"><span class="row iaok" style="gap:8px;align-items:center">' + ICON.check + '<span class="mt">Prête</span></span><span class="small mut">Pose une question au coach, comme tu parles.</span></div>';
  else if (S.st === 'dl' || S.st === 'load') h += '<div class="glass card col" style="gap:8px"><span class="mt">' + (S.st === 'dl' ? 'Téléchargement… ' + S.pct + ' %' : 'Préparation…') + '</span><div class="bar"><div style="width:' + (S.st === 'dl' ? S.pct : 100) + '%"></div></div><span class="small mut">Tu peux fermer cette fenêtre : ça continue tant que l’app est ouverte.</span></div>';
  else {
    if (S.st === 'error') h += '<div class="glass card col" style="gap:4px"><span class="mt">Ça n’a pas marché</span><span class="small mut">' + esc(S.err) + '. Vérifie ta connexion et réessaie.</span></div>';
    h += '<span class="small mut">Téléchargement : ' + S.mo + ' Mo, une seule fois. Fais-le en Wi-Fi.</span>'
      + '<button type="button" class="pill gold-btn wide" data-act="ia-get">' + (S.st === 'error' ? 'Réessayer' : 'Télécharger la petite IA') + '</button>';
  }
  h += '<div class="slist"><button type="button" class="srow" data-act="ia-share" role="switch" aria-checked="' + share + '"><span class="mico">' + ICON.up + '</span><span class="col grow" style="gap:1px;min-width:0"><span class="mt">Envoyer ce qu’il ne comprend pas</span><span class="small mut">Le texte seul, pour qu’on ajoute des exemples.</span></span><span class="sw' + (share ? ' on' : '') + '"><i></i></span></button></div>';
  if (S.st === 'ready') h += '<button type="button" class="pill glass wide" data-act="ia-del">Retirer la petite IA (libère ' + S.mo + ' Mo)</button>';
  return h + '</div>';
}
let layer = 0;
export function sheetIa(l2) { layer = l2 ? 2 : 0; sheet(iaHtml() + (l2 ? '<button type="button" class="pill gold-btn wide" data-act="close2">Retour</button>' : '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>'), l2 ? 2 : undefined); }
iaOn(() => { const b = $('iasheet'); if (b) b.outerHTML = iaHtml(); });
Object.assign(ACTIONS, {
  'ia-open': (el) => sheetIa(el && el.dataset && el.dataset.l2),
  'ia-get': () => { iaStart(); const b = $('iasheet'); if (b) b.outerHTML = iaHtml(); },
  'ia-share': () => { state.settings.iaShare = state.settings.iaShare === false; save(); const b = $('iasheet'); if (b) b.outerHTML = iaHtml(); },
  'ia-del': async () => {
    if (!confirm('Retirer la petite IA ? Le coach comprendra moins bien. Tu pourras la retélécharger.')) return;
    try { if (typeof caches !== 'undefined') await caches.delete(IA_CACHE); } catch (e) { /* rien */ }
    state.settings.ia = 0; save(); st = 'off'; enc = null; bank = null; loading = null; tell();
  },
});
