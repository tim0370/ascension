// Deux mesures du matin, faites avec le téléphone seul, hors ligne (aucune image gardée ni envoyée) :
// 1. Le pouls au repos : le doigt posé sur l'objectif de derrière. À chaque battement, le sang rend le doigt
//    un tout petit peu plus sombre : l'app suit la couleur rouge de l'image et compte le rythme.
// 2. Le temps de réaction : un écran qui passe au vert au hasard, tu touches le plus vite possible.
//    Fatigue, manque de sommeil : le cerveau répond plus lentement que d'habitude.
import { $ } from './ui.js';
import { beep } from './sound.js';

// ---------- Pouls par la caméra ----------
const PULSE_S = 60;
let P = null;

export function pulseHtml() {
  return '<div class="pulsebox"><canvas id="pl-wave" width="600" height="160"></canvas>'
    + '<div class="pulsenum"><span class="num" id="pl-bpm">--</span><span class="small mut">battements / min</span></div></div>'
    + '<div class="bar"><div id="pl-bar" style="width:0%"></div></div>'
    + '<span class="small" id="pl-st" style="color:var(--soft);text-align:center;min-height:40px">Préparation de la caméra…</span>'
    + '<video id="pl-v" playsinline muted autoplay style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"></video>';
}

const say = (t) => { const st = $('pl-st'); if (st) st.textContent = t; };

export async function startPulse(onDone) {
  stopPulse();
  const me = { onDone, raw: [], good: 0, est: [], lostAt: 0, t0: 0, raf: 0, stream: null, torch: false, done: false };
  P = me;
  try {
    me.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } }, audio: false });
  } catch (e) {
    say('Caméra refusée ou absente. Autorise-la pour Ascension, ou prends ton pouls au poignet.');
    if (P === me) me.fail = true;
    return false;
  }
  if (P !== me) { me.stream.getTracks().forEach((t) => t.stop()); return false; }
  const track = me.stream.getVideoTracks()[0];
  // Le flash allumé en continu (Android surtout). Sur iPhone, la lumière d'une lampe à travers le doigt suffit.
  try {
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (caps.torch) { await track.applyConstraints({ advanced: [{ torch: true }] }); me.torch = true; }
  } catch (e) { /* pas de flash pilotable */ }
  const v = $('pl-v');
  if (!v) { stopPulse(); return false; }
  v.srcObject = me.stream;
  try { await v.play(); } catch (e) { /* lecture automatique */ }
  me.cv = document.createElement('canvas'); me.cv.width = 40; me.cv.height = 30;
  me.ctx = me.cv.getContext('2d', { willReadFrequently: true });
  say(me.torch ? 'Pose le bout de ton index sur l’objectif de derrière, sans appuyer fort.' : 'Pose le bout de ton index sur l’objectif de derrière, face à une lampe ou une fenêtre.');
  loopPulse();
  return true;
}

export function stopPulse() {
  if (!P) return;
  cancelAnimationFrame(P.raf);
  if (P.stream) P.stream.getTracks().forEach((t) => t.stop());
  P = null;
}

function loopPulse() {
  const me = P;
  if (!me || me.done) return;
  const v = $('pl-v');
  if (!v) { stopPulse(); return; }
  me.raf = requestAnimationFrame(loopPulse);
  if (!v.videoWidth) return;
  const now = performance.now();
  me.ctx.drawImage(v, 0, 0, 40, 30);
  const d = me.ctx.getImageData(0, 0, 40, 30).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  r /= n; g /= n; b /= n;
  // Doigt posé : image rouge, assez lumineuse, sans vert ni bleu.
  const finger = r > 45 && r > g * 1.7 && r > b * 1.7;
  if (!finger) {
    if (me.t0 && !me.lostAt) me.lostAt = now;
    if (me.t0 && now - me.lostAt > 2500) { me.raw = []; me.est = []; me.t0 = 0; me.good = 0; }
    say(me.t0 ? 'Garde ton doigt bien posé sur l’objectif.' : r < 45 && r > g * 1.7 ? 'Trop sombre : approche-toi d’une lampe ou d’une fenêtre.' : (me.torch ? 'Pose le bout de ton index sur l’objectif de derrière.' : 'Pose ton index sur l’objectif de derrière, face à une lampe.'));
    return;
  }
  me.lostAt = 0;
  if (!me.t0) { me.t0 = now; say('Ne bouge plus, respire normalement.'); }
  me.raw.push([now, r]);
  while (me.raw.length && now - me.raw[0][0] > 14000) me.raw.shift();
  const el = (now - me.t0) / 1000;
  const bar = $('pl-bar'); if (bar) bar.style.width = Math.min(100, (el / PULSE_S) * 100) + '%';
  if (now - (me.tick || 0) > 250) { me.tick = now; drawWave(me); }
  if (now - (me.calc || 0) > 1000 && el > 6) {
    me.calc = now;
    const e = estimate(me.raw);
    if (e && e.q > 0.35) {
      me.est.push(e.bpm); me.good++;
      const show = median(me.est.slice(-8));
      const el2 = $('pl-bpm'); if (el2) el2.textContent = Math.round(show);
      say('Ne bouge plus · ' + Math.max(0, Math.ceil(PULSE_S - el)) + ' s');
    } else say('Signal faible : ne bouge pas, appuie un tout petit peu moins fort.');
  }
  if (el >= PULSE_S) finishPulse(me);
}

function finishPulse(me) {
  me.done = true;
  const ok = me.est.length >= 12;
  const est = me.est.slice(-40);
  const bpm = ok ? Math.round(median(est)) : null;
  // Régularité des mesures : plus elles se ressemblent, plus le chiffre est fiable.
  const spread = ok ? (percentile(est, 0.8) - percentile(est, 0.2)) : 99;
  stopPulse();
  try { beep(); } catch (e) { /* son bloqué */ }
  me.onDone(ok && bpm >= 38 && bpm <= 150 ? { bpm, q: spread <= 6 ? 'bonne' : spread <= 12 ? 'moyenne' : 'faible' } : null);
}

// Signal sur une grille régulière de 30 mesures par seconde, sans la lente dérive (moyenne glissante d'1 s).
function resample(raw, hz) {
  if (raw.length < 20) return null;
  const t0 = raw[0][0], t1 = raw[raw.length - 1][0];
  const out = [];
  let j = 0;
  for (let t = t0; t <= t1; t += 1000 / hz) {
    while (j < raw.length - 2 && raw[j + 1][0] < t) j++;
    const a = raw[j], b = raw[j + 1] || a;
    const k = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    out.push(a[1] + (b[1] - a[1]) * k);
  }
  const w = hz, hp = [];
  for (let i = 0; i < out.length; i++) {
    let s = 0, c = 0;
    for (let k = Math.max(0, i - w / 2); k < Math.min(out.length, i + w / 2); k++) { s += out[k]; c++; }
    hp.push(out[i] - s / c);
  }
  const sm = hp.map((_, i) => { let s = 0, c = 0; for (let k = Math.max(0, i - 2); k <= Math.min(hp.length - 1, i + 2); k++) { s += hp[k]; c++; } return s / c; });
  return sm;
}

// Rythme par autocorrélation : le décalage pour lequel le signal ressemble le plus à lui-même = la durée d'un battement.
function estimate(raw) {
  const hz = 30;
  const x = resample(raw.filter((p) => p[0] > raw[raw.length - 1][0] - 10000), hz);
  if (!x || x.length < hz * 6) return null;
  const n = x.length;
  let e0 = 0;
  for (let i = 0; i < n; i++) e0 += x[i] * x[i];
  if (!e0) return null;
  const lo = Math.floor((60 / 170) * hz), hi = Math.ceil((60 / 40) * hz);
  const ac = [];
  for (let L = 0; L <= hi + 1; L++) { let s = 0; for (let i = 0; i + L < n; i++) s += x[i] * x[i + L]; ac[L] = s / e0 * (n / (n - L)); }
  let best = -1, bl = 0;
  for (let L = lo; L <= hi; L++) if (ac[L] > best && ac[L] >= ac[L - 1] && ac[L] >= ac[L + 1]) { best = ac[L]; bl = L; }
  if (!bl) return null;
  // Si la moitié du décalage marche presque aussi bien, c'était un battement sur deux.
  const half = Math.round(bl / 2);
  if (half >= lo && ac[half] > best * 0.85) bl = half;
  const a = ac[bl - 1], b = ac[bl], c = ac[bl + 1];
  const den = a - 2 * b + c;
  const off = den ? (0.5 * (a - c)) / den : 0;
  const lag = bl + Math.max(-0.5, Math.min(0.5, off));
  return { bpm: (60 * hz) / lag, q: ac[bl] };
}

function drawWave(me) {
  const cv = $('pl-wave');
  if (!cv) return;
  const x = resample(me.raw.filter((p) => p[0] > me.raw[me.raw.length - 1][0] - 4500), 30);
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  if (!x || x.length < 10) return;
  let mx = 0.001;
  for (const v of x) mx = Math.max(mx, Math.abs(v));
  c.lineWidth = 5; c.lineJoin = 'round'; c.lineCap = 'round';
  const grad = c.createLinearGradient(0, 0, cv.width, 0);
  grad.addColorStop(0, 'rgba(255,90,110,0.15)'); grad.addColorStop(1, '#FF5A6E');
  c.strokeStyle = grad;
  c.beginPath();
  x.forEach((v, i) => { const px = (i / (x.length - 1)) * cv.width, py = cv.height / 2 + (v / mx) * (cv.height * 0.4); if (i) c.lineTo(px, py); else c.moveTo(px, py); });
  c.stroke();
}

export const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const percentile = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

// ---------- Pouls au poignet (secours) ----------
let W = null;
export function wristHtml() {
  return '<div class="col center" style="gap:8px"><span class="num" id="wr-n" style="font-size:72px;line-height:1">15</span><span class="small mut" id="wr-st">Pose deux doigts sur ton poignet ou ton cou, puis touche Démarrer.</span></div>'
    + '<button type="button" class="pill gold-btn wide big" data-act="wr-go" id="wr-go">Démarrer les 15 secondes</button>'
    + '<div class="col" id="wr-in" style="gap:10px;display:none"><span class="small" style="color:var(--soft)">Combien de battements as-tu comptés ?</span>'
    + '<label class="field" style="height:56px"><input id="wr-c" inputmode="numeric" placeholder="18" aria-label="Battements comptés"><span class="unit">battements</span></label>'
    + '<button type="button" class="pill gold-btn wide" data-act="wr-ok">Valider</button></div>';
}
export function startWrist() {
  stopWrist();
  const me = { end: Date.now() + 15000 };
  W = me;
  const go = $('wr-go'); if (go) go.style.display = 'none';
  try { beep(); } catch (e) { /* son bloqué */ }
  $('wr-st').textContent = 'Compte les battements…';
  me.iv = setInterval(() => {
    const left = Math.max(0, Math.ceil((me.end - Date.now()) / 1000));
    const n = $('wr-n');
    if (!n) { stopWrist(); return; }
    n.textContent = left;
    if (left <= 0) {
      stopWrist();
      try { beep(); } catch (e) { /* son bloqué */ }
      $('wr-st').textContent = 'Stop.';
      $('wr-in').style.display = 'flex';
      setTimeout(() => { const c = $('wr-c'); if (c) c.focus(); }, 50);
    }
  }, 200);
}
export function stopWrist() { if (W) { clearInterval(W.iv); W = null; } }

// ---------- Temps de réaction ----------
const RT_S = 20;
let R = null;
export function reactHtml() {
  return '<button type="button" class="rtzone wait" id="rt-z"><span class="h1" id="rt-big">Touche pour commencer</span><span class="small" id="rt-sub">Dès que l’écran devient vert, touche-le le plus vite possible.</span></button>'
    + '<div class="row between small mut"><span id="rt-left">20 s</span><span id="rt-last">&nbsp;</span></div>';
}
export function startReaction(onDone) {
  stopReaction();
  const z = $('rt-z');
  if (!z) return;
  const me = { onDone, trials: [], early: 0, state: 'idle', t0: 0, timer: 0, end: 0 };
  R = me;
  const set = (cls, big, sub) => { z.className = 'rtzone ' + cls; $('rt-big').textContent = big; $('rt-sub').textContent = sub || ''; };
  const arm = () => {
    if (R !== me) return;
    if (performance.now() >= me.end) return finish();
    me.state = 'wait';
    set('wait', 'Attends le vert…', '');
    me.timer = setTimeout(() => {
      if (R !== me) return;
      me.state = 'go';
      set('go', 'Touche !', '');
      requestAnimationFrame(() => { me.t0 = performance.now(); });
    }, 900 + Math.random() * 2100);
  };
  const finish = () => {
    clearTimeout(me.timer);
    me.state = 'done';
    const T = me.trials.length > 4 ? me.trials.slice(1) : me.trials;
    const ms = T.length >= 3 ? Math.round(median(T)) : null;
    set('done', ms ? ms + ' ms' : 'Pas assez d’essais', ms ? 'Ton temps de réaction (médiane de ' + T.length + ' essais).' : 'Recommence en touchant dès que c’est vert.');
    stopReaction();
    me.onDone(ms ? { ms, n: T.length, early: me.early } : null);
  };
  me.tick = setInterval(() => {
    const el = $('rt-left');
    if (!el) { stopReaction(); return; }
    if (me.end) el.textContent = Math.max(0, Math.ceil((me.end - performance.now()) / 1000)) + ' s';
  }, 250);
  me.down = (ev) => {
    ev.preventDefault();
    const now = performance.now();
    if (me.state === 'idle') { me.end = now + RT_S * 1000; arm(); return; }
    if (me.state === 'wait') {
      clearTimeout(me.timer); me.early++;
      set('early', 'Trop tôt', 'Attends bien le vert.');
      me.state = 'pause';
      setTimeout(arm, 900);
      return;
    }
    if (me.state === 'go' && me.t0) {
      const ms = now - me.t0;
      me.state = 'pause';
      if (ms > 120 && ms < 1500) me.trials.push(ms);
      $('rt-last').textContent = 'Dernier : ' + Math.round(ms) + ' ms';
      set('pause', Math.round(ms) + ' ms', '');
      setTimeout(() => (me.trials.length >= 8 ? finish() : arm()), 650);
    }
  };
  z.addEventListener('pointerdown', me.down);
}
export function stopReaction() {
  if (!R) return;
  clearTimeout(R.timer); clearInterval(R.tick);
  const z = $('rt-z'); if (z && R.down) z.removeEventListener('pointerdown', R.down);
  R = null;
}
