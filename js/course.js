// Course en direct avec le GPS : chrono, distance, allure, un lièvre à battre et une voix qui annonce chaque kilomètre.
// Sur iPhone, le GPS d'une web app ne marche que si l'app est ouverte à l'écran : on garde l'écran allumé (wake lock).
import { state, save, runs, fr, dur, pace } from './store.js';
import { $, esc, ui, ACTIONS, ICON, sheet, closeSheet, toast, burst } from './ui.js';
import { render } from './app.js';

let live = null; // la course en cours
let lock = null;

// ---------- Outils ----------
function haversine(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const mmss = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const paceTxt = (secPerKm) => (secPerKm && isFinite(secPerKm) && secPerKm < 1800 ? mmss(secPerKm) : '–:––');
// Pour la voix : « 5 minutes 32 »
const spokenTime = (sec) => {
  sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = [];
  if (h) p.push(h + ' heure' + (h > 1 ? 's' : ''));
  if (m) p.push(m + ' minute' + (m > 1 ? 's' : ''));
  if (s || !p.length) p.push(m || h ? String(s) : s + ' seconde' + (s > 1 ? 's' : ''));
  return p.join(' ');
};

function say(text) {
  if (!live || !live.voice) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch (e) { /* pas de voix */ }
}
async function keepScreen() {
  try { if (navigator.wakeLock && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) { /* non disponible */ }
}

// Ton allure de référence : la meilleure sur 3 km ou plus, sinon 6:00 par km.
function bestPace() {
  const t = runs().filter((r) => r.d >= 3 && r.t > 0);
  return t.length ? Math.round(Math.min(...t.map((r) => r.t / r.d))) : 360;
}

// ---------- Réglages avant de partir ----------
export function sheetGps() {
  if (live && live.started) { drawLive(); return; }
  const bp = bestPace();
  const s = state.settings;
  const hare = ui.hare || s.harePace || bp - 5;
  ui.hare = hare;
  const goal = ui.runGoal !== undefined ? ui.runGoal : (s.runGoal || 5);
  ui.runGoal = goal;
  const voice = s.runVoice !== false;
  let h = '<div class="col"><span class="label violet">Course en direct</span><h1 class="h1">Prêt à courir</h1><span class="small mut">Le GPS mesure ta course. Garde l’app ouverte, l’écran reste allumé.</span></div>';
  h += '<section class="glass card col" style="gap:12px"><div class="row between"><span class="h2">Le lièvre</span><span class="tag gold">' + paceTxt(hare) + ' /km</span></div>'
    + '<span class="small mut">Il court à allure constante. Reste devant lui.' + (runs().length ? ' Ta meilleure allure : ' + paceTxt(bp) + ' /km.' : '') + '</span>'
    + '<div class="row" style="gap:10px"><button type="button" class="stepbtn sm" data-act="hare" data-d="5" aria-label="Plus lent">' + ICON.minus + '</button>'
    + '<div class="col grow center"><span class="num" style="font-size:34px">' + paceTxt(hare) + '</span><span class="small mut">par kilomètre</span></div>'
    + '<button type="button" class="stepbtn sm" data-act="hare" data-d="-5" aria-label="Plus rapide">' + ICON.plus + '</button></div>'
    + '<div class="row" style="gap:8px;flex-wrap:wrap">' + [[bp + 45, 'Tranquille'], [bp, 'Mon allure'], [bp - 5, 'Plus vite']].map(([v, l]) => '<button type="button" class="pill sm ' + (v === hare ? 'gold-btn' : 'glass') + ' grow" data-act="hare-set" data-v="' + v + '">' + l + '</button>').join('') + '</div></section>';
  h += '<section class="glass card col" style="gap:10px"><span class="h2">Distance visée</span><div class="row" style="gap:8px">'
    + [[0, 'Libre'], [3, '3 km'], [5, '5 km'], [10, '10 km']].map(([v, l]) => '<button type="button" class="pill sm ' + (v === goal ? 'gold-btn' : 'glass') + ' grow" data-act="run-goal" data-v="' + v + '">' + l + '</button>').join('') + '</div>'
    + (goal ? '<span class="small mut">Temps visé avec le lièvre : ' + mmss(goal * hare) + '</span>' : '') + '</section>';
  h += '<button type="button" class="pill glass wide' + (voice ? ' on' : '') + '" data-act="run-voice">' + (voice ? 'Voix : oui, à chaque kilomètre' : 'Voix : non') + '</button>';
  h += '<button type="button" class="pill gold-btn wide big" data-act="run-start">Partir</button>'
    + '<span class="small mut" style="text-align:center">Le GPS met parfois quelques secondes à trouver ta position. Écran verrouillé ou app fermée : l’iPhone arrête le GPS.</span>';
  sheet(h, 1, 'full');
}

// ---------- Pendant la course ----------
function start() {
  if (!navigator.geolocation) { toast('Ce téléphone ne donne pas le GPS à l’app'); return; }
  live = { started: Date.now(), paused: 0, pauseAt: 0, d: 0, last: null, win: [], splits: [], hare: ui.hare, goal: ui.runGoal || 0, voice: state.settings.runVoice !== false, acc: null, ahead: null, aheadAt: 0, done: false };
  state.settings.harePace = ui.hare; state.settings.runGoal = ui.runGoal; save();
  // La voix doit être lancée pendant le toucher pour être autorisée sur iPhone.
  say('C’est parti. Le lièvre court à ' + spokenTime(live.hare) + ' au kilomètre.');
  keepScreen();
  live.watch = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  live.timer = setInterval(tickLive, 1000);
  drawLive();
}

function onErr(e) {
  if (!live) return;
  live.err = e && e.code === 1 ? 'GPS refusé : autorise la position pour Ascension dans les réglages de l’iPhone.' : 'Recherche du GPS…';
  const el = $('gps-st'); if (el) el.textContent = live.err;
}

export function onPos(p) {
  if (!live || live.done) return;
  const c = p.coords, pt = { lat: c.latitude, lon: c.longitude, ts: p.timestamp || Date.now() };
  live.acc = Math.round(c.accuracy || 99);
  live.err = '';
  if (live.pauseAt) { live.last = pt; return; }
  if (c.accuracy > 35) return; // point trop imprécis
  if (live.last) {
    const dist = haversine(live.last, pt), dt = Math.max(0.5, (pt.ts - live.last.ts) / 1000);
    if (dist / dt > 9) return; // saut impossible en courant : on ignore
    if (dist < 3) return; // on attend d'avoir vraiment bougé
    const before = live.d;
    live.d += dist;
    // Un kilomètre de plus : temps intermédiaire et annonce.
    const km = Math.floor(live.d / 1000);
    if (km > Math.floor(before / 1000)) kmDone(km);
  }
  live.last = pt;
  const t = elapsed();
  live.win.push([t, live.d]);
  while (live.win.length > 2 && t - live.win[0][0] > 30) live.win.shift();
}

const elapsed = () => (live ? ((live.pauseAt || Date.now()) - live.started - live.paused) / 1000 : 0);

function kmDone(km) {
  const t = elapsed();
  const prev = live.splits.reduce((a, b) => a + b, 0);
  live.splits.push(t - prev);
  const gap = live.d / 1000 * live.hare - t; // > 0 : en avance
  let msg = km + ' kilomètre' + (km > 1 ? 's' : '') + '. Temps ' + spokenTime(t) + '. Ce kilomètre en ' + spokenTime(t - prev) + '. ';
  msg += Math.abs(gap) < 3 ? 'Tu es au niveau du lièvre.' : gap > 0 ? 'Tu as ' + spokenTime(gap) + ' d’avance sur le lièvre.' : 'Le lièvre a ' + spokenTime(-gap) + ' d’avance. Accélère.';
  if (live.goal && km === live.goal) { msg = 'Objectif atteint : ' + km + ' kilomètres en ' + spokenTime(t) + '. Bravo.'; burst(); }
  else if (live.goal && km < live.goal) msg += ' Plus que ' + (live.goal - km) + ' kilomètre' + (live.goal - km > 1 ? 's.' : '.');
  say(msg);
}

function tickLive() {
  if (!live) return;
  const t = elapsed();
  const gap = live.d / 1000 * live.hare - t;
  // Le lièvre te double ou tu le doubles : une annonce, pas plus d'une fois par minute.
  const ahead = gap >= 0;
  if (live.d > 150 && live.ahead !== null && ahead !== live.ahead && Date.now() - live.aheadAt > 60000) {
    say(ahead ? 'Tu repasses devant le lièvre.' : 'Le lièvre vient de te doubler.');
    live.aheadAt = Date.now();
  }
  if (live.d > 150) live.ahead = ahead;
  updateLive();
}

function curPace() {
  const w = live.win;
  if (w.length < 2) return null;
  const dt = w[w.length - 1][0] - w[0][0], dd = w[w.length - 1][1] - w[0][1];
  return dd > 10 ? dt / (dd / 1000) : null;
}

function drawLive() {
  let h = '<div class="col" style="gap:2px"><span class="label violet">Course en direct</span><span class="small" id="gps-st" style="color:var(--mut)">Recherche du GPS…</span></div>'
    + '<div class="col center" style="gap:2px;margin-top:6px"><span class="num" id="lv-time" style="font-size:72px;line-height:1">0:00</span><span class="small mut">temps</span></div>'
    + '<div class="stats3 glass card" style="padding:16px 6px"><div><span class="num" id="lv-d" style="font-size:30px">0,00</span><span class="small mut">km</span></div>'
    + '<div><span class="num" id="lv-avg" style="font-size:24px">–:––</span><span class="small mut">allure moy.</span></div>'
    + '<div><span class="num" id="lv-cur" style="font-size:24px">–:––</span><span class="small mut">allure actuelle</span></div></div>'
    + '<section class="glass card col" style="gap:12px"><div class="row between"><span class="h2">Le lièvre</span><span class="small mut">' + paceTxt(live.hare) + ' /km</span></div>'
    + '<div class="hare"><i class="hare-line"></i><b id="lv-hare" class="hare-dot"></b><b id="lv-me" class="me-dot"></b></div><div class="row between small mut" style="margin-top:-6px"><span>Derrière</span><span><b style="color:var(--violet)">Toi</b> · <b style="color:var(--gold)">Lièvre</b></span><span>Devant</span></div>'
    + '<span class="h2" id="lv-gap" style="text-align:center">Au départ</span></section>'
    + (live.goal ? '<div class="col" style="gap:6px"><div class="row between"><span class="small mut">Objectif ' + live.goal + ' km</span><span class="small mut" id="lv-left"></span></div><div class="bar"><div id="lv-goal" style="width:0%"></div></div></div>' : '')
    + '<div class="col" id="lv-splits" style="gap:4px"></div>'
    + '<div class="row"><button type="button" class="pill glass grow big" data-act="run-pause" id="lv-pause">' + (live.pauseAt ? 'Reprendre' : 'Pause') + '</button>'
    + '<button type="button" class="pill gold-btn grow big" data-act="run-stop">Terminer</button></div>';
  sheet(h, 1, 'full');
  updateLive();
}

function updateLive() {
  if (!live || !$('lv-time')) return;
  const t = elapsed(), km = live.d / 1000;
  $('lv-time').textContent = mmss(t);
  $('lv-d').textContent = (Math.floor(km * 100) / 100).toFixed(2).replace('.', ',');
  $('lv-avg').textContent = km > 0.05 ? paceTxt(t / km) : '–:––';
  $('lv-cur').textContent = paceTxt(curPace());
  const st = $('gps-st');
  if (st) { st.textContent = live.pauseAt ? 'En pause' : live.err ? live.err : live.acc ? 'GPS ± ' + live.acc + ' m' : 'Recherche du GPS…'; st.style.color = live.acc && live.acc <= 20 ? 'var(--vert)' : 'var(--mut)'; }
  // Piste : 400 m autour de toi, le lièvre devant ou derrière.
  const hareD = t / live.hare * 1000;
  const gapM = live.d - hareD, gapS = km * live.hare - t;
  const pos = (m) => Math.max(4, Math.min(96, 50 + m / 4));
  $('lv-me').style.left = '50%';
  $('lv-hare').style.left = pos(hareD - live.d) + '%';
  const g = $('lv-gap');
  if (t < 5) g.textContent = 'Au départ';
  else if (Math.abs(gapS) < 2) { g.textContent = 'Au niveau du lièvre'; g.style.color = 'var(--txt)'; }
  else if (gapS > 0) { g.textContent = mmss(gapS) + ' d’avance · ' + Math.round(gapM) + ' m'; g.style.color = 'var(--vert)'; }
  else { g.textContent = mmss(-gapS) + ' de retard · ' + Math.round(-gapM) + ' m'; g.style.color = 'var(--rouge)'; }
  if (live.goal && $('lv-goal')) { $('lv-goal').style.width = Math.min(100, km / live.goal * 100) + '%'; $('lv-left').textContent = km >= live.goal ? 'Atteint' : 'Encore ' + fr(live.goal - km, 2) + ' km'; }
  const sp = $('lv-splits');
  if (sp && sp.childElementCount !== live.splits.length) sp.innerHTML = live.splits.map((x, i) => '<div class="row between small"><span class="mut">Km ' + (i + 1) + '</span><span class="num">' + mmss(x) + '</span></div>').join('');
}

function stop(saveIt) {
  if (!live) return;
  clearInterval(live.timer);
  try { navigator.geolocation.clearWatch(live.watch); } catch (e) { /* rien */ }
  try { if (lock) lock.release(); } catch (e) { /* rien */ }
  live.done = true;
  const t = Math.round(elapsed()), d = Math.round(live.d / 10) / 100;
  if (saveIt && d >= 0.05) {
    const now = Date.now();
    const w = { id: 'r' + now, title: 'Course', start: live.started, end: now, gps: true, exercises: [{ name: 'Running', sets: [{ d, t, done: true }] }] };
    if (live.splits.length) w.splits = live.splits.map((x) => Math.round(x));
    state.workouts.push(w);
    save();
    say('Course terminée. ' + fr(d) + ' kilomètres en ' + spokenTime(t) + '.');
    live = null;
    closeSheet(); render();
    toast(fr(d) + ' km en ' + dur(t) + ' · +' + (Math.round(d * 20) + 50) + ' XP', true);
    burst();
    return;
  }
  live = null;
  closeSheet();
  if (saveIt) toast('Course trop courte : rien n’est enregistré');
}

Object.assign(ACTIONS, {
  gps: () => sheetGps(),
  hare: (el) => { ui.hare = Math.max(150, Math.min(900, (ui.hare || bestPace()) + Number(el.dataset.d))); sheetGps(); },
  'hare-set': (el) => { ui.hare = Number(el.dataset.v); sheetGps(); },
  'run-goal': (el) => { ui.runGoal = Number(el.dataset.v); sheetGps(); },
  'run-voice': () => { state.settings.runVoice = state.settings.runVoice === false; save(); sheetGps(); },
  'run-start': () => start(),
  'run-pause': () => {
    if (!live) return;
    if (live.pauseAt) { live.paused += Date.now() - live.pauseAt; live.pauseAt = 0; live.win = []; say('Reprise.'); }
    else { live.pauseAt = Date.now(); say('Pause.'); }
    const b = $('lv-pause'); if (b) b.textContent = live.pauseAt ? 'Reprendre' : 'Pause';
    updateLive();
  },
  'run-stop': () => {
    if (!live) return;
    if (live.d < 50) { if (confirm('Moins de 50 mètres : arrêter sans enregistrer ?')) stop(false); return; }
    if (confirm('Terminer et enregistrer la course ?')) stop(true);
  },
});
