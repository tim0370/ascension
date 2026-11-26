// Ta forme du jour, façon montre de sport mais sans montre : un bilan du matin en 4 touches
// (sommeil, courbatures, énergie, stress), mélangé à la fatigue de tes muscles et à ta charge d'entraînement.
// Chaque point du score est expliqué. Aussi : la charge des semaines, les douleurs signalées
// (le programme évite alors les exercices qui les sollicitent) et « ce qui te réussit », lu dans ton historique.
import { EXOS } from './data.js';
import { state, save, sorted, exoName } from './store.js';
import { bodyStats, musclesOf, ZONES } from './corps.js';
import { $, esc, plural, ACTIONS, ICON, sheet, closeBtn, toast } from './ui.js';
import { pulseHtml, startPulse, stopPulse, wristHtml, startWrist, stopWrist, reactHtml, startReaction, stopReaction, median } from './mesure.js';

const DAY = 864e5;
const day0 = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const monday0 = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
export const dayKey = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rerender = () => import('./app.js').then((a) => a.render());
// La forme se calcule toujours sur la séance du jour, comme sur l'accueil.
let todayRef = null; // la séance du jour, connue une fois programme.js chargé
const openForme = () => import('./programme.js').then((p) => { todayRef = p.todayList; sheetForme(p.todayList()); });
setTimeout(() => import('./programme.js').then((p) => { todayRef = p.todayList; }), 0);

// ---------- Le bilan du matin ----------
export const CI = [
  { k: 's', q: 'Comment as-tu dormi ?', name: 'Sommeil', o: ['Moins de 5 h', '5 à 6 h', '6 à 7 h', '7 à 8 h', 'Plus de 8 h'] },
  { k: 'c', q: 'Des courbatures ?', name: 'Courbatures', o: ['Très fortes', 'Fortes', 'Un peu', 'Presque pas', 'Aucune'] },
  { k: 'e', q: 'Ton énergie ce matin ?', name: 'Énergie', o: ['À plat', 'Faible', 'Normale', 'Bonne', 'Au top'] },
  { k: 'x', q: 'Ton niveau de stress ?', name: 'Stress', o: ['Très stressé', 'Stressé', 'Normal', 'Calme', 'Très calme'] },
];
export function checkin(ms) { return (state.checkins || {})[dayKey(ms || Date.now())] || null; }
const ciList = () => Object.entries(state.checkins || {}).map(([k, v]) => Object.assign({ k }, v)).sort((a, b) => (a.k < b.k ? 1 : -1));

// Le bilan en 6 étapes (environ 1 min 30) : heures de sommeil, 3 ressentis en une touche, pouls au repos (60 s), réaction (20 s).
// Pouls et réaction sont des mesures, pas des impressions : comparés à TA moyenne, ils trahissent la fatigue.
const STEPS = ['sleep', 'c', 'e', 'x', 'pulse', 'react'];
const hm = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
export function sleepHours(bed, wake) {
  const a = hm(bed), b = hm(wake);
  if (a === null || b === null) return null;
  let d = b - a;
  if (d <= 0) d += 1440;
  return Math.round((d / 60) * 4) / 4;
}
const hTxt = (h) => Math.floor(h) + ' h' + (h % 1 ? ' ' + String(Math.round((h % 1) * 60)).padStart(2, '0') : '');
const sFromH = (h) => (h < 5 ? 1 : h < 6 ? 2 : h < 7 ? 3 : h < 8 ? 4 : 5);

let draft = null;
function stepHead(i, q) {
  return '<div class="col" style="gap:6px"><span class="label violet">Bilan du matin · ' + (i + 1) + ' sur ' + STEPS.length + '</span><h1 class="h1">' + q + '</h1></div>'
    + '<div class="seg" aria-hidden="true">' + STEPS.map((_, j) => '<i class="' + (j <= i ? 'on' : '') + '"></i>').join('') + '</div>';
}
const backBtn = (i) => (i ? '<button type="button" class="pill sm glass wide" data-act="ci-back" data-i="' + (i - 1) + '">Retour</button>' : '');
function sheetCheckin(step) {
  const i = step || 0;
  const k = STEPS[i];
  draft = draft || {};
  stopPulse(); stopWrist(); stopReaction();
  let h;
  if (k === 'sleep') {
    const last = ciList().find((x) => x.bed) || {};
    const bed = draft.bed || last.bed || '23:00', wake = draft.wake || last.wake || '07:00';
    h = stepHead(i, 'Ta nuit')
      + '<div class="ci-times"><label class="col" style="gap:6px"><span class="label">Couché à</span><input type="time" class="textin bigtime" id="ci-bed" value="' + bed + '"></label>'
      + '<label class="col" style="gap:6px"><span class="label">Levé à</span><input type="time" class="textin bigtime" id="ci-wake" value="' + wake + '"></label></div>'
      + '<section class="glass card col center" style="gap:2px;padding:16px"><span class="num" id="ci-h" style="font-size:40px;line-height:1">' + hTxt(sleepHours(bed, wake) || 0) + '</span><span class="small mut" id="ci-hs">de sommeil</span></section>'
      + '<button type="button" class="pill gold-btn wide big" data-act="ci-sleep">Suivant</button>'
      + '<span class="small mut">L’heure où tu t’es endormi à peu près, pas celle où tu as posé ton téléphone. À ton âge, il faut 8 à 10 h pour bien récupérer.</span>';
  } else if (k === 'pulse') {
    h = stepHead(i, 'Ton pouls au repos') + '<div id="ci-pz">' + (draft.wrist ? wristHtml() : pulseHtml()) + '</div>'
      + (draft.wrist ? '' : '<span class="small mut">60 secondes, assis, sans bouger. Le flash s’allume si ton téléphone le permet ; sinon mets-toi face à une lampe ou une fenêtre.</span>')
      + '<div class="row"><button type="button" class="pill glass grow" data-act="ci-skip" data-i="' + i + '">Passer</button><button type="button" class="pill glass grow" data-act="ci-wrist">' + (draft.wrist ? 'Avec la caméra' : 'Au poignet') + '</button></div>' + backBtn(i);
  } else if (k === 'react') {
    h = stepHead(i, 'Ta réaction') + reactHtml()
      + '<span class="small mut">20 secondes. Quand tu es fatigué, ton cerveau répond plus lentement que d’habitude, même si tu ne le sens pas.</span>'
      + '<div class="row"><button type="button" class="pill glass grow" data-act="ci-skip" data-i="' + i + '">Passer</button></div>' + backBtn(i);
  } else {
    const Q = CI.find((q) => q.k === k);
    h = stepHead(i, Q.q)
      + '<div class="col" style="gap:10px">' + Q.o.map((o, v) => '<button type="button" class="ciopt glass' + (draft[k] === v + 1 ? ' on' : '') + '" data-act="ci" data-i="' + i + '" data-v="' + (v + 1) + '"><span class="cidot c' + (v + 1) + '"></span><span class="grow">' + o + '</span></button>').join('') + '</div>' + backBtn(i);
  }
  sheet(h, 1, k === 'pulse' || k === 'react' ? 'full' : '');
  if (k === 'pulse' && !draft.wrist) startPulse((r) => {
    if (r) { draft.hr = r.bpm; draft.hrq = r.q; draft.hrm = 'cam'; toast(r.bpm + ' battements par minute'); sheetCheckin(i + 1); }
    else { const st = $('pl-st'); if (st) st.textContent = 'Mesure pas assez nette. Réessaie sans bouger, ou prends ton pouls au poignet.'; const z = $('ci-pz'); if (z) z.insertAdjacentHTML('beforeend', '<button type="button" class="pill gold-btn wide" data-act="ci-retry" data-i="' + i + '">Réessayer</button>'); }
  });
  if (k === 'react') startReaction((r) => { if (r) { draft.rt = r.ms; setTimeout(() => saveCheckin(), 1200); } else setTimeout(() => { if ($('rt-z')) sheetCheckin(i); }, 1800); });
}
document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'ci-bed' && ev.target.id !== 'ci-wake') return;
  const h = sleepHours($('ci-bed').value, $('ci-wake').value);
  $('ci-h').textContent = h === null ? '–' : hTxt(h);
  $('ci-hs').textContent = h !== null && (h < 3 || h > 13) ? 'vérifie les heures' : 'de sommeil';
});

function saveCheckin() {
  if (!draft) return;
  stopPulse(); stopWrist(); stopReaction();
  const prev = checkin() || {};
  const c = Object.assign({ at: Date.now() }, draft);
  delete c.wrist;
  if (!c.c || !c.e || !c.x) { sheetCheckin(STEPS.findIndex((k) => !c[k])); return; }
  if (prev.hr && !c.hr) { c.hr = prev.hr; c.hrq = prev.hrq; c.hrm = prev.hrm; } // refaire le bilan garde la mesure déjà faite
  if (prev.rt && !c.rt) c.rt = prev.rt;
  state.checkins = state.checkins || {};
  const key = dayKey(Date.now());
  state.checkins[key] = c;
  // Le score du matin est gardé : on le compare plus tard à ta séance pour savoir s'il voit juste.
  const f = forme(todayRef ? todayRef() : null);
  c.f = f.score;
  c.pv = {};
  for (const p of f.parts) if (p.k) c.pv[p.k] = Math.round(p.v);
  const keys = Object.keys(state.checkins).sort();
  while (keys.length > 400) delete state.checkins[keys.shift()];
  save();
  draft = null;
  rerender();
  openForme();
}

// ---------- Ta base : ta moyenne des matins précédents ----------
const BASE_N = 7;
export function baseOf(field, beforeKey) {
  const L = ciList().filter((x) => x.k < beforeKey && x[field] && Date.now() - new Date(x.k + 'T12:00:00').getTime() < 60 * DAY).slice(0, 21).map((x) => x[field]);
  return { n: L.length, v: L.length >= BASE_N ? median(L) : null };
}

// Les morceaux du bilan, notés de 0 à 100, avec leur poids de base (total 50).
const CI_W = { sl: 16, hr: 10, rt: 6, c: 6, e: 8, x: 4 };
const CI_N = { sl: 'Sommeil', hr: 'Pouls au repos', rt: 'Réaction', c: 'Courbatures', e: 'Énergie', x: 'Stress' };
function ciParts(ci, key) {
  const out = [];
  // Sommeil : 4 h 30 ou moins = 0, 8 h 30 ou plus = 100.
  if (ci.h) {
    const b = baseOf('h', key);
    let v = clamp(((ci.h - 4.5) / 4) * 100, 0, 100);
    let txt = hTxt(ci.h) + (ci.bed ? ' (' + ci.bed + ' → ' + ci.wake + ')' : '');
    if (b.v && ci.h < b.v - 0.75) { txt += ', ' + hTxt(Math.round((b.v - ci.h) * 4) / 4) + ' de moins que d’habitude'; v = Math.max(0, v - 10); }
    out.push({ k: 'sl', v, txt });
  } else if (ci.s) out.push({ k: 'sl', v: pct(ci.s), txt: CI[0].o[ci.s - 1] });
  if (ci.hr) {
    const b = baseOf('hr', key);
    if (b.v) {
      const d = ci.hr - b.v;
      out.push({ k: 'hr', v: clamp(100 - Math.max(0, d - 1) * 9, 0, 100), txt: ci.hr + ' bpm, ' + (d >= 3 ? Math.round(d) + ' de plus que ta base (' + Math.round(b.v) + ') : ton corps récupère encore' : d <= -2 ? 'sous ta base (' + Math.round(b.v) + ') : bien reposé' : 'comme d’habitude (' + Math.round(b.v) + ')') });
    } else out.push({ k: 'hr', v: 75, txt: ci.hr + ' bpm · ta base est connue après ' + BASE_N + ' mesures (encore ' + (BASE_N - b.n) + ')' });
  }
  if (ci.rt) {
    const b = baseOf('rt', key);
    if (b.v) {
      const r = ci.rt / b.v;
      out.push({ k: 'rt', v: clamp(100 - Math.max(0, r - 1.02) * 600, 0, 100), txt: ci.rt + ' ms, ' + (r > 1.06 ? Math.round((r - 1) * 100) + ' % plus lent que ta base (' + Math.round(b.v) + ' ms)' : r < 0.97 ? 'plus vif que d’habitude' : 'comme d’habitude (' + Math.round(b.v) + ' ms)') });
    } else out.push({ k: 'rt', v: 75, txt: ci.rt + ' ms · ta base est connue après ' + BASE_N + ' tests (encore ' + (BASE_N - b.n) + ')' });
  }
  for (const q of CI.slice(1)) if (ci[q.k]) out.push({ k: q.k, v: pct(ci[q.k]), txt: q.o[ci[q.k] - 1] });
  return out;
}

// ---------- Le score s'ajuste tout seul ----------
// Pour chaque morceau du bilan : est-ce qu'il annonce vraiment tes bonnes et tes mauvaises séances ?
// Ce qui prédit bien pèse plus, ce qui ne prédit rien pèse moins.
let calCache = null;
function perfByDay() {
  const m = {};
  for (const x of perfs()) m[dayKey(x.w.start)] = x.p;
  return m;
}
const corr = (a, b) => {
  const n = a.length;
  if (n < 3) return 0;
  const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
};
export function calibration() {
  const sig = state.workouts.length + ':' + Object.keys(state.checkins || {}).length;
  if (calCache && calCache.sig === sig) return calCache;
  const P = perfByDay();
  const rows = ciList().filter((x) => P[x.k] !== undefined);
  const w = {}, info = {};
  for (const k of Object.keys(CI_W)) {
    const xs = [], ys = [];
    for (const x of rows) {
      const v = x.pv && x.pv[k] !== undefined ? x.pv[k] : k === 'sl' && x.s ? pct(x.s) : CI.find((q) => q.k === k) && x[k] ? pct(x[k]) : null;
      if (v !== null) { xs.push(v); ys.push(P[x.k]); }
    }
    const r = corr(xs, ys);
    w[k] = xs.length >= 8 ? CI_W[k] * clamp(1 + 1.5 * r, 0.5, 1.8) : CI_W[k];
    info[k] = { n: xs.length, r };
  }
  // Fiabilité : le score du matin a-t-il annoncé juste (au-dessus de ta moyenne = séance meilleure que d'habitude) ?
  const pairs = rows.filter((x) => x.f).map((x) => [x.f, P[x.k]]);
  let hits = 0;
  if (pairs.length) {
    const mf = median(pairs.map((p) => p[0])), mp = median(pairs.map((p) => p[1]));
    for (const [f, p] of pairs) if ((f >= mf) === (p >= mp)) hits++;
  }
  calCache = { sig, w, info, n: pairs.length, hits, rows: rows.length };
  return calCache;
}
export function reliability() {
  const c = calibration();
  if (c.n < 6) return { level: 'learn', txt: 'En apprentissage : ' + c.n + ' séance' + (c.n > 1 ? 's' : '') + ' sur 6 avec un bilan du matin. Plus tu le fais, plus le score devient juste.', n: c.n };
  const r = c.hits / c.n;
  const level = r >= 0.7 ? 'high' : r >= 0.55 ? 'mid' : 'low';
  return { level, n: c.n, hits: c.hits, txt: 'Ton score du matin a vu juste ' + c.hits + ' fois sur ' + c.n + ' (bonne ou moins bonne séance que d’habitude). ' + (level === 'high' ? 'Fiabilité élevée.' : level === 'mid' ? 'Fiabilité correcte, elle monte avec le temps.' : 'Fiabilité encore faible : le score ajuste ses poids tout seul.') };
}

// ---------- La charge d'entraînement ----------
// Une série vaut 1 point (plus avec du lest, plus si tu l'as trouvée très dure), un km de course 1,5 point.
export function loadOf(w) {
  let n = 0;
  for (const e of w.exercises) {
    const f = e.feel === 'd' ? 1.25 : e.feel === 'f' ? 0.85 : 1;
    for (const s of e.sets) {
      if (s.done === false) continue;
      if (e.name === 'Running') n += (s.d || 0) * 1.5;
      else n += f * (1 + (s.w || 0) / 40);
    }
  }
  return n;
}
export function charge(now = Date.now()) {
  const ws = sorted();
  let acute = 0, chronic = 0;
  const weeks = [];
  const m0 = monday0(now);
  for (let i = 7; i >= 0; i--) weeks.push({ m: m0 - i * 7 * DAY, v: 0 });
  for (const w of ws) {
    const age = now - w.start;
    if (age > 70 * DAY) break;
    const l = loadOf(w);
    if (age < 7 * DAY) acute += l;
    else if (age < 35 * DAY) chronic += l;
    const wk = weeks.find((x) => w.start >= x.m && w.start < x.m + 7 * DAY);
    if (wk) wk.v += l;
  }
  chronic /= 4;
  const ratio = chronic >= 8 ? acute / chronic : null;
  const zone = ratio === null ? 'debut' : ratio < 0.7 ? 'basse' : ratio <= 1.3 ? 'bonne' : ratio <= 1.5 ? 'haute' : 'trop';
  return { acute: Math.round(acute), chronic: Math.round(chronic), ratio, zone, weeks };
}
export const lightWeek = () => state.settings.lightWeek === monday0(Date.now());
// Semaine plus légère conseillée : charge qui grimpe trop vite, ou plusieurs bilans du matin mauvais d'affilée.
export function lightAdvice() {
  if (lightWeek()) return null;
  const c = charge();
  const L = ciList().filter((x) => Date.now() - new Date(x.k).getTime() < 5 * DAY);
  const low = L.length >= 3 && L.reduce((n, x) => n + ciScore(x), 0) / L.length < 45;
  if (c.ratio !== null && c.ratio > 1.4) return 'Ta charge des 7 derniers jours est ' + Math.round((c.ratio - 1) * 100) + ' % au-dessus de ta moyenne. Une semaine plus légère évite de te blesser et te fait repartir plus fort.';
  if (low) return 'Tes derniers bilans du matin sont bas. Une semaine plus légère (une série de moins partout) te remettra d’aplomb.';
  return null;
}

// ---------- Le score de forme ----------
function pct(v) { return ((v - 1) / 4) * 100; }
// Note du bilan seul (0 à 100), avec les poids ajustés.
function ciScore(c) {
  const P = ciParts(c, c.k || dayKey(c.at || Date.now()));
  const W = calibration().w;
  const tw = P.reduce((n, p) => n + W[p.k], 0);
  return tw ? P.reduce((n, p) => n + p.v * W[p.k], 0) / tw : 50;
}

// Récupération des muscles que la séance va travailler (ou de ceux travaillés ces 4 derniers jours).
function muscles(list) {
  const z = bodyStats();
  let sum = 0, wsum = 0;
  const tired = {};
  if (list && list.length) {
    for (const e of list) {
      const m = musclesOf(e.name);
      for (const k of Object.keys(m)) { const wt = m[k] * (e.sets ? e.sets.length : 3); sum += z[k].rec * wt; wsum += wt; if (z[k].rec < 70 && m[k] >= 1) tired[k] = 1; }
    }
  } else {
    for (const k of Object.keys(z)) if (z[k].last && Date.now() - z[k].last < 4 * DAY) { const wt = ZONES[k].big ? 2 : 1; sum += z[k].rec * wt; wsum += wt; if (z[k].rec < 70) tired[k] = 1; }
  }
  return { pct: wsum ? Math.round(sum / wsum) : 100, tired: Object.keys(tired).map((k) => ZONES[k].name.toLowerCase()) };
}

export function forme(list) {
  const ci = checkin();
  const mu = muscles(list);
  const ch = charge();
  const cs = ch.ratio === null || ch.ratio <= 1.15 ? 100 : ch.ratio >= 1.6 ? 20 : Math.round(100 - ((ch.ratio - 1.15) / 0.45) * 80);
  const chTxt = ch.ratio === null ? 'Pas encore assez d’historique récent pour la comparer.' : ch.ratio > 1.15 ? '7 derniers jours : ' + Math.round((ch.ratio - 1) * 100) + ' % au-dessus de ta moyenne.' : ch.ratio < 0.7 ? '7 derniers jours plus calmes que d’habitude : tu es frais.' : '7 derniers jours dans ta moyenne.';
  const muTxt = mu.tired.length ? 'Encore fatigués : ' + mu.tired.slice(0, 3).join(', ') + '.' : mu.pct >= 90 ? 'Tout ce que tu vas travailler est récupéré.' : 'Presque récupéré.';
  let parts;
  if (ci) {
    // Les poids du bilan (50 points) : ceux de base, ajustés d'après tes séances, répartis entre les mesures faites.
    const P = ciParts(ci, dayKey(Date.now()));
    const W = calibration().w;
    const tw = P.reduce((n, p) => n + W[p.k], 0);
    parts = P.map((p) => ({ k: p.k, name: CI_N[p.k], max: (W[p.k] / tw) * 50, v: p.v, txt: p.txt }));
    parts.push({ name: 'Muscles', max: 35, v: mu.pct, txt: muTxt }, { name: 'Charge', max: 15, v: cs, txt: chTxt });
  } else {
    parts = [{ name: 'Muscles', max: 70, v: mu.pct, txt: muTxt }, { name: 'Charge', max: 30, v: cs, txt: chTxt }];
  }
  parts.forEach((p) => { p.pts = Math.round((p.max * p.v) / 100); });
  const score = clamp(parts.reduce((n, p) => n + (p.max * p.v) / 100, 0), 0, 100);
  const s = Math.round(score);
  const tone = s >= 70 ? 'ok' : s >= 45 ? 'mid' : 'low';
  const word = s >= 85 ? 'Au top' : s >= 70 ? 'Bonne forme' : s >= 45 ? 'Forme moyenne' : 'Forme basse';
  const t0 = day0(Date.now());
  const trained = state.workouts.some((w) => w.start >= t0 && !w.quick && !w.boss);
  const mode = s < 45 || lightWeek() ? 'leger' : s >= 85 && ci ? 'record' : '';
  const advice = trained ? 'Séance faite aujourd’hui. Ta forme de demain se joue cette nuit : dors bien.' : mode === 'leger' ? (lightWeek() ? 'Semaine légère : une série de moins partout, pour recharger.' : 'Séance allégée aujourd’hui (une série de moins partout), ou repos.')
    : mode === 'record' ? 'Jour idéal pour battre un record : donne tout sur les exercices principaux.'
      : s >= 70 ? 'Fais ta séance en entier.' : 'Séance normale, sans forcer la toute dernière série.';
  return { score: s, est: !ci, ci, parts, tone, word, mode, advice, muscles: mu, charge: ch };
}

const COL = { ok: '#3FD69B', mid: '#FFB03B', low: '#FF5A6E' };
export function formeRing(f, size) {
  const r = 30, C = 2 * Math.PI * r;
  return '<div class="fring" style="width:' + size + 'px;height:' + size + 'px"><svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"/>'
    + '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="' + COL[f.tone] + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - f.score / 100)).toFixed(1) + '" transform="rotate(-90 36 36)"' + (f.est ? ' stroke-opacity="0.55"' : '') + '/></svg>'
    + '<span class="num" style="font-size:' + Math.round(size * 0.3) + 'px">' + f.score + '</span></div>';
}

// La carte de l'accueil : bilan du matin à faire, ou le score du jour.
export function formeCard(list) {
  const f = forme(list);
  if (!f.ci) {
    // Le bilan du matin n'est proposé que le matin ; après 14 h, la carte montre juste le score estimé.
    const am = new Date().getHours() < 14;
    return '<section class="glass card formecard tap tint t-teal" role="button" tabindex="0" data-act="' + (am ? 'checkin' : 'forme') + '"><div class="row" style="gap:14px;align-items:center">' + formeRing(f, 58)
      + '<div class="col grow" style="gap:2px;min-width:0"><span class="label violet">Forme estimée</span>'
      + (am ? '<span style="font-weight:700">Fais ton bilan du matin</span><span class="small mut">1 min 30 : sommeil, pouls, réaction. Un vrai score, pas une estimation.</span>'
        : '<span class="small" style="color:var(--soft)">' + esc(f.advice) + '</span>')
      + '</div>' + ICON.chev + '</div></section>';
  }
  const low = f.parts.slice().sort((a, b) => a.pts / a.max - b.pts / b.max)[0];
  return '<section class="glass card formecard tap tint t-teal" role="button" tabindex="0" data-act="forme"><div class="row" style="gap:14px;align-items:center">' + formeRing(f, 58)
    + '<div class="col grow" style="gap:2px;min-width:0"><span class="label" style="color:' + COL[f.tone] + '">Forme · ' + f.word + '</span><span class="small" style="color:var(--soft)">' + esc(f.advice) + '</span>'
    + (low && low.pts / low.max < 0.6 ? '<span class="small mut">Ce qui te freine : ' + esc(low.name.toLowerCase()) + '.</span>' : '') + '</div>' + ICON.chev + '</div></section>';
}

// ---------- La fenêtre « Ta forme » ----------
export function sheetForme(list) {
  const f = forme(list);
  let h = '<div class="col center" style="gap:8px">' + formeRing(f, 120) + '<span class="h1" style="color:' + COL[f.tone] + '">' + f.word + '</span>'
    + '<span class="small" style="color:var(--soft);text-align:center">' + esc(f.advice) + '</span>'
    + (f.est ? '<span class="small mut" style="text-align:center">Score estimé sans ton bilan du matin.</span>' : '') + '</div>';
  if (f.est) h += '<button type="button" class="pill gold-btn wide" data-act="checkin">Faire mon bilan du matin</button>';
  h += '<section class="glass card col" style="gap:12px"><span class="label violet">D’où vient ton score</span>'
    + f.parts.map((p) => '<div class="col" style="gap:5px"><div class="row between" style="gap:10px"><span style="font-weight:600">' + p.name + '</span><span class="small mut" style="white-space:nowrap">' + p.pts + ' sur ' + Math.round(p.max) + '</span></div>'
      + '<div class="bar thin"><div style="width:' + Math.round(p.v) + '%;background:' + COL[p.v >= 70 ? 'ok' : p.v >= 45 ? 'mid' : 'low'] + '"></div></div><span class="small mut">' + esc(p.txt) + '</span></div>').join('')
    + '<span class="small dim">Le bilan du matin compte pour la moitié (sommeil, pouls, réaction et ressentis), la fatigue de tes muscles pour un tiers, ta charge d’entraînement pour le reste.</span></section>';
  // Fiabilité
  const R0 = reliability(), cal = calibration();
  const moved = Object.keys(CI_W).filter((k) => cal.info[k].n >= 8 && Math.abs(cal.w[k] / CI_W[k] - 1) >= 0.2);
  h += '<section class="glass card col" style="gap:8px"><div class="row between" style="gap:10px"><span class="label violet">Fiabilité du score</span><span class="relpill r-' + R0.level + '">' + ({ learn: 'En apprentissage', high: 'Élevée', mid: 'Correcte', low: 'À affiner' })[R0.level] + '</span></div>'
    + '<span class="small" style="color:var(--soft)">' + esc(R0.txt) + '</span>'
    + (moved.length ? '<span class="small mut">Ajusté pour toi : ' + moved.map((k) => CI_N[k].toLowerCase() + (cal.w[k] > CI_W[k] ? ' compte plus' : ' compte moins')).join(', ') + ', d’après tes ' + cal.rows + ' séances avec bilan.</span>' : '<span class="small mut">Après 8 séances avec un bilan, chaque mesure pèse selon ce qu’elle annonce vraiment chez toi.</span>')
    + '</section>';
  // Charge
  const c = f.charge;
  const mx = Math.max(10, ...c.weeks.map((w) => w.v));
  const ZT = { debut: 'Pas encore assez d’historique.', basse: 'Plus calme que d’habitude : tu peux en faire un peu plus.', bonne: 'Dans la bonne zone : tu progresses sans te cramer.', haute: 'Plus haute que d’habitude : surveille ta fatigue.', trop: 'Bien plus haute que d’habitude : risque de blessure, lève le pied.' };
  h += '<section class="glass card col" style="gap:12px"><span class="label violet">Charge d’entraînement</span>'
    + '<div class="lbars">' + c.weeks.map((w, i) => '<div class="lb"><i style="height:' + Math.max(4, Math.round((w.v / mx) * 100)) + '%' + (i === 7 ? ';background:var(--violet)' : '') + '"></i><span>' + new Date(w.m).getDate() + '</span></div>').join('') + '</div>'
    + '<span class="small" style="color:var(--soft)">' + c.acute + ' points ces 7 derniers jours' + (c.ratio !== null ? ', pour ' + c.chronic + ' en moyenne. ' : '. ') + ZT[c.zone] + '</span>'
    + '<span class="small dim">Une série = 1 point (plus avec du lest ou si tu l’as trouvée très dure), un km de course = 1,5 point. Sous chaque barre, le lundi de la semaine ; la dernière est la semaine en cours.</span>';
  const adv = lightAdvice();
  if (lightWeek()) h += '<span class="small" style="color:var(--vert)">Semaine légère en cours : le programme enlève une série partout.</span><button type="button" class="pill sm glass" data-act="light-off">Revenir à la normale</button>';
  else if (adv) h += '<span class="small" style="color:var(--flamme)">' + esc(adv) + '</span><button type="button" class="pill sm gold-btn" data-act="light-on">Passer cette semaine en légère</button>';
  h += '</section>';
  // Ce qui te réussit
  const R = reussites();
  h += '<section class="glass card col" style="gap:10px"><span class="label violet">Ce qui te réussit</span>' + R.map((r) => '<div class="row" style="gap:10px;align-items:flex-start"><span class="errdot" style="margin-top:7px"></span><span class="small" style="color:var(--soft)">' + esc(r) + '</span></div>').join('') + '</section>';
  // Derniers bilans
  const L = ciList().slice(0, 7);
  if (L.length) h += '<section class="glass card col" style="gap:8px"><span class="label">Tes derniers bilans</span>' + L.map((x) => '<div class="row between" style="gap:10px"><span class="small">' + new Date(x.k + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) + '</span><span class="small mut" style="text-align:right">'
    + [x.h ? hTxt(x.h) + ' de sommeil' : x.s ? CI[0].o[x.s - 1] : '', x.hr ? x.hr + ' bpm' : '', x.rt ? x.rt + ' ms' : '', x.f ? 'forme ' + x.f : ''].filter(Boolean).join(' · ') + '</span></div>').join('') + '</section>';
  if (!f.est) h += '<button type="button" class="pill sm glass wide" data-act="checkin">Refaire mon bilan du matin</button>';
  h += '<span class="small dim">Calculé dans ton téléphone, à partir de ton bilan du matin et de tes séances. Ce n’est pas un avis médical.</span>';
  sheet(h + closeBtn, 1, 'full');
}

// ---------- Douleurs ----------
export const PAINS = { epaules: 'Épaules', poignets: 'Poignets', coudes: 'Coudes', genoux: 'Genoux', dos: 'Bas du dos', chevilles: 'Chevilles' };
const PAIN_OF = { epaules: 'aux épaules', poignets: 'aux poignets', coudes: 'aux coudes', genoux: 'aux genoux', dos: 'au bas du dos', chevilles: 'aux chevilles' };
export const activePains = () => (state.pains || []).filter((p) => PAINS[p.z] && Date.now() - p.d < 7 * DAY);
export function hurts(name, z) {
  const m = musclesOf(name), g = (EXOS[name] && EXOS[name].g) || '';
  if (z === 'epaules') return m.epaules === 1 || g === 'dips' || /Handstand|Pike|Planche|Overhead|Lateral/.test(name);
  if (z === 'poignets') return g === 'pompes' || /Handstand|Planche|Crow|Burpee|Plank|Mountain|Shoulder Taps|L-Sit|Bench Dip/.test(name);
  if (z === 'coudes') return m.triceps === 1 || m.biceps === 1 || g === 'dips' || /Diamond|Curl/.test(name);
  if (z === 'genoux') return m.quadri === 1 || /Jump|Pistol|Lunge|Squat|Burpee|Running|Sprint|Skater|Box|High Knees/.test(name);
  if (z === 'dos') return m.lombaires >= 0.5 || /Row|Superman|Russian|Dragon|Deadlift|Good Morning/.test(name);
  if (z === 'chevilles') return /Jump|Running|Sprint|Calf|Skater|Burpee|High Knees|Box|Pistol/.test(name);
  return false;
}
const SAFE = { epaules: ['Glute Bridge', 'Hollow Rock', 'Wall Sit'], poignets: ['Hollow Rock', 'Wall Sit', 'Glute Bridge'], coudes: ['Wall Sit', 'Glute Bridge', 'Hollow Rock'], genoux: ['Glute Bridge', 'Hollow Rock', 'Superman'], dos: ['Wall Sit', 'Dead Bug', 'Glute Bridge'], chevilles: ['Glute Bridge', 'Hollow Rock', 'Wall Sit'] };
// Retire ou remplace les exercices qui sollicitent une zone douloureuse.
export function applyPains(list, noSwap) {
  const P = activePains().map((p) => p.z);
  if (!P.length) return list;
  const bad = (n) => P.some((z) => hurts(n, z));
  const out = [];
  for (const e of list) {
    if (!bad(e.name)) { out.push(e); continue; }
    if (noSwap) continue;
    const rep = P.flatMap((z) => SAFE[z]).find((n) => !bad(n) && !out.some((x) => x.name === n) && !list.some((x) => x.name === n));
    if (!rep) continue;
    const time = EXOS[rep] && EXOS[rep].kind === 'time';
    out.push(Object.assign({}, e, { name: rep, swap: e.name, bloc: '', main: false, fresh: false, next: null, cap: null, sets: e.sets.map(() => (time ? { t: 30 } : { r: 12, w: 0 })) }));
  }
  return out;
}
export function painCard() {
  const P = activePains();
  if (!P.length) return '';
  const old = P.some((p) => p.n >= 2 || Date.now() - (p.since || p.d) > 10 * DAY);
  return '<section class="glass card col tint t-red" style="gap:10px"><div class="row" style="gap:12px;align-items:center"><span class="ico" style="color:var(--rouge)">' + ICON.shield + '</span><div class="col grow" style="gap:2px;min-width:0"><span style="font-weight:700">Douleur ' + P.map((p) => PAIN_OF[p.z]).join(' et ') + '</span>'
    + '<span class="small mut">' + (old ? 'Ça dure : montre-la à un médecin ou un kiné. En attendant, ' : 'Pendant quelques jours, ') + 'tes séances évitent les exercices qui la sollicitent.</span></div></div>'
    + '<div class="row"><button type="button" class="pill glass" data-act="pain-still">Encore mal</button><button type="button" class="pill gold-btn grow" data-act="pain-ok">Ça va mieux</button></div></section>';
}
function sheetPain() {
  const on = new Set(activePains().map((p) => p.z));
  let h = '<div class="col" style="gap:4px"><span class="label violet">Signaler une douleur</span><h1 class="h1">Où as-tu mal ?</h1><span class="small mut">Pendant 7 jours, le programme retire ou remplace les exercices qui sollicitent cette zone. Touche encore pour l’enlever.</span></div>'
    + '<div class="chips2">' + Object.keys(PAINS).map((z) => '<button type="button" class="pill ' + (on.has(z) ? 'gold-btn' : 'glass') + '" data-act="pain-toggle" data-z="' + z + '">' + PAINS[z] + '</button>').join('') + '</div>'
    + '<span class="small mut">Douleur vive, gonflement, ou qui dure plus d’une semaine : va voir un médecin ou un kiné. L’app ne remplace pas un avis médical.</span>';
  sheet(h + closeBtn, 2);
}

// ---------- Ce qui te réussit ----------
// Pour chaque séance : tes meilleures séries comparées à la fois d'avant sur les mêmes exercices.
// Puis on regarde si tu fais mieux le soir ou le matin, après un repos, après une bonne nuit…
const amount = (s) => (s.r || s.t || 0) * (1 + (s.w || 0) / 40);
function perfs() {
  const ws = sorted().filter((w) => !w.quick && !w.boss && !(w.prog && w.prog.type === 'test')).reverse();
  const last = {}, out = [];
  let prev = null;
  for (const w of ws) {
    const r = [];
    for (const e of w.exercises) {
      if (e.name === 'Running' || !e.sets.length) continue;
      const b = Math.max(...e.sets.filter((s) => s.done !== false).map(amount), 0);
      if (!b) continue;
      const L = last[e.name];
      if (L && w.start - L.at < 35 * DAY && L.v) r.push(clamp(b / L.v, 0.6, 1.6));
      last[e.name] = { v: b, at: w.start };
    }
    if (r.length >= 2) out.push({ w, p: r.reduce((a, b) => a + b, 0) / r.length, gap: prev ? Math.round((day0(w.start) - day0(prev.start)) / DAY) : null });
    prev = w;
  }
  return out;
}
function compare(list, groupOf, names, min) {
  const g = {};
  for (const x of list) { const k = groupOf(x); if (k == null) continue; (g[k] = g[k] || []).push(x.p); }
  const ok = Object.keys(g).filter((k) => g[k].length >= min).map((k) => ({ k, n: g[k].length, m: g[k].reduce((a, b) => a + b, 0) / g[k].length }));
  if (ok.length < 2) return null;
  ok.sort((a, b) => b.m - a.m);
  const best = ok[0], worst = ok[ok.length - 1];
  const d = Math.round((best.m / worst.m - 1) * 100);
  if (d < 2) return null;
  return { best: names[best.k], worst: names[worst.k], d, n: best.n + worst.n };
}
const que = (x) => (/^[aeiouhéèêàâ]/i.test(x) ? 'qu’' : 'que ') + x;
export function reussites() {
  const P = perfs();
  const out = [];
  if (P.length < 8) return ['Il me faut au moins 8 séances avec des exercices déjà faits avant pour trouver ce qui te réussit. Continue, ça vient vite.'];
  const t = compare(P, (x) => { const h = new Date(x.w.start).getHours(); return h < 12 ? 'm' : h < 18 ? 'a' : 's'; }, { m: 'le matin', a: 'l’après-midi', s: 'le soir' }, 4);
  if (t) out.push('Tu es ' + t.d + ' % plus performant ' + t.best + ' ' + que(t.worst) + ' (sur ' + t.n + ' séances).');
  const r = compare(P, (x) => (x.gap === null || x.gap === 0 ? null : x.gap === 1 ? 'j1' : 'j2'), { j1: 'le lendemain d’une séance', j2: 'après au moins un jour de repos' }, 4);
  if (r) out.push('Tu fais ' + r.d + ' % mieux ' + r.best + ' ' + que(r.worst) + ' (sur ' + r.n + ' séances).');
  const C = P.filter((x) => checkin(x.w.start));
  const s = compare(C, (x) => { const v = checkin(x.w.start).s; return v >= 4 ? 'b' : v <= 2 ? 'm' : null; }, { b: 'après plus de 7 h de sommeil', m: 'après moins de 6 h' }, 3);
  if (s) out.push('Tes séances sont ' + s.d + ' % meilleures ' + s.best + ' ' + que(s.worst) + '.');
  const e = compare(C, (x) => { const v = checkin(x.w.start).e; return v >= 4 ? 'b' : v <= 2 ? 'm' : null; }, { b: 'les jours où tu te sens en forme', m: 'les jours à plat' }, 3);
  if (e) out.push('Tu performes ' + e.d + ' % mieux ' + e.best + ' ' + que(e.worst) + ' : ton bilan du matin dit vrai.');
  if (!s && C.length < 6) out.push('Encore ' + plural(Math.max(1, 6 - C.length), 'séance', 'séances') + ' avec un bilan du matin, et je pourrai te dire combien le sommeil change tes perfs.');
  if (!out.length || (out.length === 1 && !t && !r)) out.unshift('Pas de grosse différence selon l’heure ou le repos : tu es régulier, c’est une force.');
  return out;
}

Object.assign(ACTIONS, {
  checkin: () => { draft = {}; sheetCheckin(0); },
  'ci-back': (el) => sheetCheckin(+el.dataset.i),
  'ci-sleep': () => {
    const bed = $('ci-bed').value, wake = $('ci-wake').value, h = sleepHours(bed, wake);
    if (h === null || h < 2 || h > 14) { toast('Vérifie tes heures de coucher et de lever'); return; }
    Object.assign(draft, { bed, wake, h, s: sFromH(h) });
    sheetCheckin(1);
  },
  ci: (el) => {
    const i = +el.dataset.i;
    draft[STEPS[i]] = +el.dataset.v;
    sheetCheckin(i + 1);
  },
  'ci-skip': (el) => { const i = +el.dataset.i; if (i + 1 >= STEPS.length) saveCheckin(); else sheetCheckin(i + 1); },
  'ci-retry': (el) => sheetCheckin(+el.dataset.i),
  'ci-wrist': () => { draft.wrist = !draft.wrist; sheetCheckin(STEPS.indexOf('pulse')); },
  'wr-go': () => startWrist(),
  'wr-ok': () => {
    const n = Math.round(Number(String($('wr-c').value).replace(',', '.')));
    if (!(n >= 8 && n <= 40)) { toast('Indique le nombre de battements comptés en 15 secondes'); return; }
    draft.hr = n * 4; draft.hrm = 'main'; draft.hrq = 'moyenne';
    toast(draft.hr + ' battements par minute');
    sheetCheckin(STEPS.indexOf('pulse') + 1);
  },
  forme: () => openForme(),
  'light-on': () => { state.settings.lightWeek = monday0(Date.now()); save(); toast('Semaine légère : une série de moins partout jusqu’à dimanche'); rerender(); openForme(); },
  'light-off': () => { state.settings.lightWeek = 0; save(); rerender(); openForme(); },
  pain: () => sheetPain(),
  'pain-toggle': (el) => {
    const z = el.dataset.z;
    const on = activePains().some((p) => p.z === z);
    state.pains = (state.pains || []).filter((p) => p.z !== z && Date.now() - p.d < 30 * DAY);
    if (!on) state.pains.push({ z, d: Date.now(), since: Date.now(), n: 1 });
    save(); rerender(); sheetPain();
  },
  'pain-ok': () => { state.pains = []; save(); toast('Tant mieux. Reprends doucement les exercices mis de côté.'); rerender(); },
  'pain-still': () => { for (const p of activePains()) { p.d = Date.now(); p.n = (p.n || 1) + 1; } save(); toast('Noté : tes séances continuent d’éviter cette zone'); rerender(); },
});

// ---------- Records prévus ----------
// Pour chaque exercice fait au moins 4 fois ces 10 dernières semaines avec le même lest : la droite de tes progrès
// dit quand tu devrais dépasser ton record (une répétition ou 5 secondes de plus).
export function predictions(only) {
  const now = Date.now(), by = {};
  for (const w of sorted()) {
    if (now - w.start > 70 * DAY) break;
    if (w.quick) continue;
    for (const e of w.exercises) {
      if (e.name === 'Running' || (only && e.name !== only)) continue;
      const S = e.sets.filter((s) => s.done !== false && (s.r || s.t));
      if (!S.length) continue;
      const b = S.reduce((m, s) => (amount(s) > amount(m) ? s : m), S[0]);
      (by[e.name] = by[e.name] || []).push({ at: w.start, v: b.r || b.t, w: b.w || 0, t: !b.r });
    }
  }
  const out = [];
  for (const name of Object.keys(by)) {
    const L = by[name];
    const wc = L[0].w, time = L[0].t;
    const P = L.filter((x) => Math.abs(x.w - wc) < 0.6 && x.t === time).slice(0, 8);
    if (P.length < 4 || now - P[0].at > 21 * DAY) continue;
    const n = P.length, xs = P.map((p) => (p.at - now) / DAY), ys = P.map((p) => p.v);
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    if (!den) continue;
    const slope = num / den;
    if (slope <= 0.02) continue;
    let rec = 0;
    for (const w of state.workouts) for (const e of w.exercises) if (e.name === name) for (const s of e.sets) if (s.done !== false && (s.w || 0) >= wc - 0.5 && (time ? !s.r : !!s.r)) rec = Math.max(rec, time ? s.t || 0 : s.r || 0);
    const target = rec + (time ? 5 : 1);
    const days = (target - (my - slope * mx)) / slope;
    if (days > 60) continue;
    const at = now + Math.max(1, days) * DAY;
    out.push({ name, target, time, w: wc, at, n, soon: days <= 3, text: (time ? target + ' s' : target + ' rép.') + (wc ? ' avec ' + String(wc).replace('.', ',') + ' kg' : '') });
  }
  return out.sort((a, b) => a.at - b.at);
}
export const whenTxt = (p) => (p.soon ? 'dès ta prochaine séance' : 'vers le ' + new Date(p.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }));
export const predLine = (p) => exoName(p.name) + ' : ' + p.text + ' ' + whenTxt(p);
