// Notifications (étape 4) : fin de repos même quand tu es sur une autre app, rappel de la séance du jour,
// flamme en danger, nouveau boss le lundi.
// L'app calcule elle-même ses prochains rappels et les confie au petit programme Cloudflare (dossier ascension-push),
// qui les envoie à l'heure exacte. Sur iPhone : seulement si Ascension est ouverte depuis l'icône de l'écran d'accueil.
import { state, save, exoName } from './store.js';
import { ACTIONS, toast } from './ui.js';
import { streak } from './quetes.js';
import { TYPES, nextType, testDue } from './programme.js';

export const PUSH = 'https://ascension-push.tim0370.workers.dev';
const DAY = 864e5;

export const pushPossible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const pushOn = () => state.settings.push === true && 'Notification' in window && Notification.permission === 'granted';
export const notifHour = () => (state.settings.notifHour === undefined ? 18 : state.settings.notifHour);

function post(path, data, keep) {
  return fetch(PUSH + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ id: state.settings.pushId }, data)), keepalive: !!keep });
}

const midnight = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const atHour = (dayStart, h) => { const d = new Date(dayStart); d.setHours(h, 0, 0, 0); return d.getTime(); };

// La liste des prochains rappels. withRest : on ajoute la fin du repos (quand l'app passe en arrière-plan).
export function planItems(withRest) {
  const now = Date.now(), items = [];
  const a = state.active;
  if (withRest && a && a.rest && !a.rest.rang && a.rest.end > now + 2000) {
    const ex = a.exercises[a.idx];
    items.push({ at: a.rest.end, title: 'Repos terminé', body: ex ? 'À toi : ' + exoName(ex.name) + ', série suivante.' : 'Série suivante.', tag: 'rest' });
  }
  const st = streak();
  const t0 = midnight(now), h = notifHour();
  const name = testDue() ? 'Re-test du programme' : (TYPES[nextType()] || {}).label || 'Ta séance';
  // Aujourd'hui, si pas encore entraîné
  const today = atHour(t0, h);
  if (!st.todayDone && today > now) {
    items.push(st.n
      ? { at: today, title: 'Ta flamme : ' + st.n + ' semaine' + (st.n > 1 ? 's' : ''), body: st.weekDone ? 'Objectif de la semaine déjà atteint. ' + name + ' en bonus ?' : 'Encore ' + st.need + ' séance' + (st.need > 1 ? 's' : '') + ' cette semaine' + (st.danger ? ', c’est serré' : '') + '. ' + name + ' t’attend.', tag: 'day' }
      : { at: today, title: 'Séance du jour', body: name + ' t’attend. Une séance courte suffit.', tag: 'day' });
  }
  // Les deux jours suivants, au cas où tu n'ouvres pas l'app
  for (let d = 1; d <= 2; d++) {
    items.push({ at: atHour(t0 + d * DAY + 3 * 3600e3, h), title: d === 1 && st.n ? 'Ta flamme t’attend' : 'Séance du jour', body: name + ' t’attend. Une séance courte suffit.', tag: 'day' });
  }
  // Lundi midi : nouveau boss
  const dow = (new Date(now).getDay() + 6) % 7; // 0 = lundi
  const monday = atHour(t0 + ((7 - dow) % 7) * DAY + 3 * 3600e3, 12);
  const nextMon = monday > now ? monday : atHour(t0 + (7 - dow) * DAY + 3 * 3600e3, 12);
  items.push({ at: nextMon, title: 'Nouveau boss', body: 'Un nouveau boss t’attend cette semaine. Victoire : +300 XP.', tag: 'boss' });
  return items;
}

let lastSent = '';
export function syncPlan(withRest) {
  if (!pushOn() || !state.settings.pushId) return;
  const items = planItems(withRest);
  const key = JSON.stringify(items);
  if (key === lastSent) return;
  lastSent = key;
  post('/plan', { items }, true).catch(() => { lastSent = ''; });
}

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
}

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
  document.addEventListener('visibilitychange', () => syncPlan(document.visibilityState === 'hidden'));
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

Object.assign(ACTIONS, {
  'notif-test': async () => {
    try { const r = await post('/test', {}); toast(r.ok ? 'Notification envoyée : elle arrive dans quelques secondes' : 'Échec de l’envoi, désactive puis réactive'); } catch (e) { toast('Pas de connexion'); }
  },
});
