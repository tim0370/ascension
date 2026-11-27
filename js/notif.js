// Notifications : fin du repos, séance du jour (jours prévus), programme de 30 jours, semaine pas validée le dimanche,
// bilan et nouveau défi le lundi. Chaque sorte se coupe dans les Réglages.
// v49 : envoyées en texte brut (avant, le format JSON demandait une requête préalable qui échouait quand
// l'iPhone mettait l'app en veille : les rappels n'étaient jamais enregistrés).
// L'app calcule elle-même ses prochains rappels et les confie au petit programme Cloudflare (dossier ascension-push),
// qui les envoie à l'heure exacte. Sur iPhone : seulement si Ascension est ouverte depuis l'icône de l'écran d'accueil.
import { state, save, exoName } from './store.js';
import { ACTIONS, toast } from './ui.js';
import { streak } from './quetes.js';
import { TYPES, nextType, testDue } from './programme.js';
import { weekPlan } from './semaine.js';
import { status as p30Status, dayPlan as p30Day } from './prog30.js';

export const PUSH = 'https://ascension-push.tim0370.workers.dev';
const DAY = 864e5;

export const pushPossible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const pushOn = () => state.settings.push === true && 'Notification' in window && Notification.permission === 'granted';
export const notifHour = () => (state.settings.notifHour === undefined ? 18 : state.settings.notifHour);

function post(path, data, keep) {
  return fetch(PUSH + path, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(Object.assign({ id: state.settings.pushId }, data)), keepalive: !!keep });
}

const midnight = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const atHour = (dayStart, h) => { const d = new Date(dayStart); d.setHours(h, 0, 0, 0); return d.getTime(); };

// Chaque sorte de rappel peut être coupée dans les Réglages (settings.notifOff = { day: true, … }).
export const KINDS = [
  ['rest', 'Fin du repos', 'Quand tu es sur une autre app pendant le repos.'],
  ['day', 'Séance du jour', 'À ton heure, seulement les jours prévus dans ta semaine, si la séance n’est pas faite.'],
  ['p30', 'Programme de 30 jours', 'À ton heure, si le jour du programme n’est pas fait.'],
  ['sunday', 'Semaine pas encore validée', 'Le dimanche à 17 h, s’il te manque une séance ou la course.'],
  ['monday', 'Lundi : ta semaine et ton ombre', 'Le lundi à midi : le bilan de ta semaine et le nouveau défi.'],
];
const kindOn = (k) => !(state.settings.notifOff || {})[k];

// La liste des prochains rappels (8 jours au plus). withRest : on ajoute la fin du repos (quand l'app passe en arrière-plan).
export function planItems(withRest) {
  const now = Date.now(), items = [];
  const a = state.active;
  if (withRest && kindOn('rest') && a && a.rest && !a.rest.rang && a.rest.end > now + 2000) {
    const ex = a.exercises[a.idx];
    items.push({ at: a.rest.end, title: 'Repos terminé', body: ex ? 'À toi : ' + exoName(ex.name) + ', série suivante.' : 'Série suivante.', tag: 'rest' });
  }
  const st = streak();
  const t0 = midnight(now), h = notifHour();
  const name = testDue() ? 'Re-test du programme' : (TYPES[nextType()] || {}).label || 'Ta séance';
  let P = null;
  try { P = weekPlan(); } catch (e) { /* plan indisponible : rappels simples */ }
  // Séance du jour : les jours prévus de cette semaine (aujourd'hui compris s'il n'est pas encore l'heure).
  if (kindOn('day')) {
    const days = P ? P.days.filter((d) => !d.done.length && (d.kind === 'seance' || d.kind === 'course') && d.i >= (new Date(now).getDay() + 6) % 7) : [];
    // Séance en cours : pas de rappel « séance du jour » pour aujourd'hui (il arrivait pendant la séance).
    const busy = a && midnight(a.start || now) === t0;
    for (const d of days) {
      const at = atHour(d.a + 3 * 3600e3, h);
      if (at <= now) continue;
      if (busy && midnight(at) === t0) continue;
      const run = d.kind === 'course';
      items.push({ at, title: run ? 'Course du jour' : (d.label || 'Séance du jour'), body: (run ? 'C’est le jour de ta course.' : 'Ta séance du jour t’attend' + (d.sub ? ', ' + d.sub : '') + '.') + (st.n ? ' Ta flamme : ' + st.n + ' semaine' + (st.n > 1 ? 's' : '') + '.' : ''), tag: 'day' });
    }
    // Semaine prochaine (lundi) si l'app n'est pas ouverte d'ici là.
    const dow = (new Date(now).getDay() + 6) % 7;
    items.push({ at: atHour(t0 + (7 - dow) * DAY + 3 * 3600e3, h), title: 'Nouvelle semaine', body: name + ' t’attend pour bien commencer la semaine.', tag: 'day' });
  }
  // Programme de 30 jours : le jour à faire, à ton heure (aujourd'hui puis les 2 jours suivants).
  if (kindOn('p30')) {
    try {
      const s = p30Status();
      if (s && !s.finished) {
        for (let k = s.doneToday ? 1 : 0; k <= 2; k++) {
          const dn = s.day + k - (s.doneToday ? 1 : 0);
          if (dn > 30) break;
          if (k === 0 && a && a.p30) continue; // le jour du défi est en cours
          const pl = p30Day(s.p, dn);
          if (pl.rest) continue;
          const at = atHour(t0 + k * DAY + 3 * 3600e3, h);
          if (at <= now) continue;
          const what = pl.test ? 'jour ' + dn + ' du défi, le test au maximum' : 'jour ' + dn + ' du défi (' + pl.sets.map((x) => (s.p.t ? x.t + ' s' : x.r)).join('-') + ')';
          // Le même jour qu'un rappel de séance : un seul message qui dit les deux, sinon l'un cache l'autre.
          const same = items.find((x) => x.tag === 'day' && Math.abs(x.at - at) < 12 * 3600e3 && midnight(x.at) === midnight(at));
          if (same) { same.title += ' + défi'; same.body = same.body.replace(/\.( Ta flamme.*)?$/, '') + ', et le ' + what + '.' + ((same.body.match(/ Ta flamme.*$/) || [''])[0]); continue; }
          items.push({ at, title: s.p.name + ' · jour ' + dn, body: pl.test ? 'Jour de test : une seule série, au maximum.' : pl.text, tag: 'p30' });
        }
      }
    } catch (e) { /* rien */ }
  }
  // Dimanche 17 h : la semaine n'est pas encore validée.
  const dow = (new Date(now).getDay() + 6) % 7; // 0 = lundi
  if (kindOn('sunday') && P && P.left > 0) {
    const sun = atHour(t0 + (6 - dow) * DAY + 3 * 3600e3, 17);
    if (sun > now) items.push({ at: sun, title: 'Ta semaine n’est pas validée', body: 'Il te manque ' + P.left + ' séance' + (P.left > 1 ? 's' : '') + ' pour atteindre ton objectif' + (st.n ? ' et garder ta flamme de ' + st.n + ' semaine' + (st.n > 1 ? 's' : '') : '') + '.', tag: 'sunday' });
  }
  // Lundi midi : le bilan de la semaine et le nouveau défi de l'ombre.
  if (kindOn('monday')) {
    const monday = atHour(t0 + ((7 - dow) % 7) * DAY + 3 * 3600e3, 12);
    const nextMon = monday > now ? monday : atHour(t0 + (7 - dow) * DAY + 3 * 3600e3, 12);
    items.push({ at: nextMon, title: 'Ta semaine en chiffres', body: 'Ton bilan de la semaine est prêt, et ton ombre a un nouveau défi.', tag: 'monday' });
  }
  return items.sort((x, y) => x.at - y.at).slice(0, 28);
}

let lastSent = '';
export function syncPlan(withRest) {
  if (!pushOn() || !state.settings.pushId) return;
  const items = planItems(withRest);
  const key = JSON.stringify(items);
  if (key === lastSent) return;
  lastSent = key;
  post('/plan', { items }, true).then((r) => {
    // 410 : le serveur n'a plus l'abonnement (l'iPhone l'a changé ou annulé). On se réabonne tout seul et on renvoie.
    if (r && r.status === 410 && !healing) { healing = true; subscribe().then(() => { lastSent = ''; syncPlan(withRest); }).catch(() => { lastSent = ''; }).finally(() => { healing = false; }); }
  }).catch(() => { lastSent = ''; });
}
let healing = false;

function keyBytes(b64) {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const swReady = () => Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('sw')), 6000))]);

async function subscribe() {
  const reg = await swReady();
  const { key } = await (await fetch(PUSH + '/key')).json();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  if (!state.settings.pushId) state.settings.pushId = Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 20);
  const r = await post('/sub', { sub: sub.toJSON() });
  if (!r.ok) throw new Error('sub');
  lastSub = Date.now();
}
let lastSub = 0;

export async function enablePush(after) {
  if (!pushPossible()) { toast('Ouvre Ascension depuis son icône sur l’écran d’accueil pour activer les notifications'); return; }
  // La demande doit partir tout de suite après le toucher, sinon l'iPhone la refuse.
  let perm;
  try { perm = await Notification.requestPermission(); } catch (e) { perm = 'denied'; }
  if (perm !== 'granted') { toast('Notifications refusées : autorise-les dans Réglages de l’iPhone, Notifications, Ascension'); return; }
  try {
    await subscribe();
    state.settings.push = true; save();
    lastSent = ''; syncPlan(false);
    toast('Notifications activées', true);
  } catch (e) {
    toast('Activation impossible pour l’instant. Vérifie ta connexion et réessaie.');
  }
  if (after) after();
}

// À chaque ouverture : on renvoie l'abonnement (il peut changer) et les rappels.
export async function initPush() {
  document.addEventListener('visibilitychange', () => {
    const vis = document.visibilityState === 'visible';
    // L'iPhone garde l'app en mémoire des jours entiers : au retour, on revérifie l'abonnement (au plus toutes les 3 h).
    if (vis && pushOn() && Date.now() - lastSub > 3 * 3600e3) { subscribe().then(() => { lastSent = ''; syncPlan(false); }).catch(() => {}); return; }
    syncPlan(!vis);
  });
  window.addEventListener('pagehide', () => syncPlan(true));
  if (!pushPossible() || !pushOn()) return;
  try { await subscribe(); } catch (e) { /* hors ligne : on réessaiera */ }
  syncPlan(false);
}

export async function disablePush() {
  state.settings.push = false; save();
  try { post('/off', {}); } catch (e) { /* rien */ }
  try { const reg = await swReady(); const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) { /* rien */ }
}
export function resync() { lastSent = ''; syncPlan(false); }

// Fin du repos : le rappel part dès le début du repos, pendant que l'app est encore à l'écran
// (quand on change d'app, l'iPhone coupe souvent l'envoi). Si tu restes dans l'app, il est annulé
// 4 secondes avant la fin : c'est le bip qui prend le relais.
let restKey = '';
function restWatch() {
  if (!pushOn() || !state.settings.pushId || !kindOn('rest')) return;
  const a = state.active, r = a && a.rest;
  const want = r && !r.rang && document.visibilityState === 'visible' && r.end - Date.now() > 4000 ? String(r.end) : '';
  if (want === restKey) return;
  restKey = want;
  syncPlan(!!want);
}
setInterval(restWatch, 1000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') restKey = '-'; });

Object.assign(ACTIONS, {
  'notif-test': async () => {
    try { const r = await post('/test', {}); toast(r.ok ? 'Notification envoyée : elle arrive dans quelques secondes' : 'Échec de l’envoi, désactive puis réactive'); } catch (e) { toast('Pas de connexion'); }
  },
});
