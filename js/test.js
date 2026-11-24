// Test physique du mois : 6 épreuves, une fois par mois, comparées aux garçons de 16 à 19 ans.
// Repères : pompes d'après les normes ACSM (15-19 ans), saut en longueur et course d'après les tests Eurofit ;
// dips, burpees et chaise sont des estimations (aucune norme officielle) : affichés comme « repère approximatif ».
import { state, save, runs, fr } from './store.js';
import { $, esc, plural, toNum, ACTIONS, ICON, sheet, closeSheet, closeBtn, toast, burst } from './ui.js';
import { camOk, sheetCam } from './camera.js';
import { beep } from './sound.js';

const DAY = 864e5;
const rerender = () => import('./app.js').then((a) => a.render());
// p = valeurs aux 10e, 25e, 50e, 75e et 90e centiles. low = plus petit vaut mieux.
export const TESTS = [
  { k: 'pompes', name: 'Pompes', exo: 'Push Up', unit: 'rép.', p: [12, 18, 25, 33, 42], how: 'Le plus de pompes d’affilée, sans pause en haut de plus de 2 secondes. Poitrine près du sol à chaque fois.', src: 'normes ACSM' },
  { k: 'dips', name: 'Dips', exo: 'Triceps Dip', unit: 'rép.', p: [4, 7, 11, 16, 22], how: 'Le plus de dips d’affilée, sans lest, bras à 90 degrés en bas.', approx: 1 },
  { k: 'burpees', name: 'Burpees en 1 minute', exo: 'Burpee', unit: 'rép.', p: [14, 17, 21, 25, 29], how: 'Le plus de burpees en 60 secondes : poitrine au sol, saut bras tendus en haut.', timer: 60, approx: 1 },
  { k: 'saut', name: 'Saut en longueur sans élan', unit: 'cm', p: [180, 200, 220, 237, 252], how: 'Pieds joints derrière une ligne, saute le plus loin possible. Mesure jusqu’au talon le plus proche. Garde le meilleur de 3 essais.', src: 'tests Eurofit' },
  { k: 'chaise', name: 'Chaise contre le mur', exo: 'Wall Sit', unit: 's', p: [40, 60, 85, 115, 150], how: 'Dos au mur, cuisses parallèles au sol. Tiens le plus longtemps possible.', chrono: 1, approx: 1 },
  { k: 'course', name: 'Allure de course', unit: '/km', p: [390, 345, 310, 280, 255], low: 1, auto: 1, how: 'Calculée toute seule d’après ta meilleure course d’au moins 2 km ces 60 derniers jours.', src: 'tests Eurofit' },
];
const CP = [10, 25, 50, 75, 90];
export function percentile(t, v) {
  if (v === null || v === undefined) return null;
  const p = t.low ? t.p.map((x) => -x) : t.p, x = t.low ? -v : v;
  if (x <= p[0]) return Math.max(2, Math.round(10 - ((p[0] - x) / Math.max(1, p[1] - p[0])) * 8));
  if (x >= p[4]) return Math.min(98, Math.round(90 + ((x - p[4]) / Math.max(1, p[4] - p[3])) * 8));
  for (let i = 0; i < 4; i++) if (x <= p[i + 1]) return Math.round(CP[i] + ((x - p[i]) / (p[i + 1] - p[i])) * (CP[i + 1] - CP[i]));
  return 50;
}
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
const show = (t, v) => (v === null || v === undefined ? '–' : t.k === 'course' ? mmss(v) + ' /km' : v + ' ' + t.unit);
function runPace() {
  const R = runs().filter((r) => r.d >= 2 && r.t && Date.now() - r.date < 60 * DAY);
  return R.length ? Math.round(Math.min(...R.map((r) => r.t / r.d))) : null;
}
export const tests = () => (state.tests || []).slice().sort((a, b) => b.d - a.d);
export function testDueMonth() {
  const L = tests();
  if (state.workouts.length < 5) return false;
  if (!L.length) return true;
  const d = new Date(L[0].d), n = new Date();
  return d.getMonth() !== n.getMonth() || d.getFullYear() !== n.getFullYear();
}
export function testCard() {
  if (!testDueMonth()) return '';
  const last = tests()[0];
  return '<section class="glass card row tap tint t-orange" role="button" tabindex="0" data-act="mtest" style="gap:12px"><span class="ico" style="color:var(--flamme)">' + ICON.target + '</span><div class="col grow" style="gap:2px;min-width:0"><span class="label" style="color:var(--flamme)">Test du mois</span><span style="font-weight:700">' + (last ? 'Compare-toi au mois dernier' : 'Où tu te situes pour ton âge') + '</span><span class="small mut">6 épreuves, environ 20 minutes, comparées aux garçons de 16 à 19 ans.</span></div>' + ICON.chev + '</section>';
}

let draft = null, chrono = null;
function stopChrono() { if (chrono) { clearInterval(chrono.iv); chrono = null; } }
function sheetStep(i) {
  stopChrono();
  const T = TESTS.filter((t) => !t.auto);
  if (i >= T.length) { finish(); return; }
  const t = T[i];
  const prev = tests()[0];
  let h = '<div class="col" style="gap:6px"><span class="label" style="color:var(--flamme)">Test du mois · ' + (i + 1) + ' sur ' + T.length + '</span><h1 class="h1">' + t.name + '</h1><span class="small" style="color:var(--soft)">' + t.how + '</span></div>'
    + '<div class="seg" aria-hidden="true">' + T.map((_, j) => '<i class="' + (j <= i ? 'on' : '') + '"></i>').join('') + '</div>';
  if (t.timer || t.chrono) h += '<section class="glass card col center" style="gap:8px;padding:18px"><span class="num" id="mt-clock" style="font-size:56px;line-height:1">' + (t.timer ? t.timer : 0) + '</span><button type="button" class="pill gold-btn" data-act="mt-clock" data-i="' + i + '" id="mt-cb">' + (t.timer ? 'Lancer les 60 secondes' : 'Lancer le chrono') + '</button></section>';
  h += '<label class="field" style="height:64px"><input id="mt-v" inputmode="numeric" value="' + (draft[t.k] != null ? draft[t.k] : '') + '" placeholder="' + (prev && prev.r[t.k] != null ? prev.r[t.k] : t.p[2]) + '" aria-label="Résultat"><span class="unit">' + t.unit + '</span></label>'
    + (t.exo && camOk(t.exo) ? '<button type="button" class="pill glass wide" data-act="mt-cam" data-i="' + i + '">' + ICON.camera + 'Compter avec la caméra</button>' : '')
    + (prev && prev.r[t.k] != null ? '<span class="small mut">Le mois dernier : ' + show(t, prev.r[t.k]) + '</span>' : '')
    + '<div class="row"><button type="button" class="pill glass" data-act="mt-skip" data-i="' + i + '">Passer</button><button type="button" class="pill gold-btn grow" data-act="mt-ok" data-i="' + i + '">Suivant</button></div>'
    + '<span class="small dim">Repos complet entre deux épreuves (2 à 3 minutes).</span>';
  sheet(h, 1, 'full');
}
function finish() {
  stopChrono();
  const r = Object.assign({}, draft);
  const pace = runPace();
  if (pace) r.course = pace;
  if (!Object.keys(r).length) { closeSheet(); return; }
  state.tests = (state.tests || []).concat({ d: Date.now(), r });
  // Les épreuves comptent aussi comme une séance (records, qualités, XP), sans entrer dans l'objectif de la semaine.
  const ex = [];
  for (const t of TESTS) if (t.exo && r[t.k] != null) ex.push({ name: t.exo, sets: [t.k === 'chaise' ? { t: r[t.k], done: true } : { r: r[t.k], w: 0, done: true }] });
  if (ex.length) state.workouts.push({ id: 'mt' + Date.now().toString(36), title: 'Test du mois', start: Date.now() - 20 * 60e3, end: Date.now(), quick: true, mtest: true, prs: 0, exercises: ex });
  save();
  draft = null;
  rerender();
  burst();
  sheetResult(state.tests[state.tests.length - 1]);
}
export function sheetResult(T0) {
  const res = T0 || tests()[0];
  if (!res) return;
  const prev = tests().find((x) => x.d < res.d);
  const ps = TESTS.map((t) => percentile(t, res.r[t.k])).filter((x) => x !== null);
  const avg = ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null;
  let h = '<div class="col center" style="gap:6px"><span class="label" style="color:var(--flamme)">Test du mois · ' + new Date(res.d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</span>'
    + (avg !== null ? '<span class="num" style="font-size:60px;line-height:1">' + avg + '<span class="mut" style="font-size:22px"> %</span></span><span class="small" style="color:var(--soft);text-align:center">En moyenne, tu fais mieux que ' + avg + ' % des garçons de 16 à 19 ans.</span>' : '') + '</div>';
  h += '<section class="glass card col" style="gap:14px">' + TESTS.map((t) => {
    const v = res.r[t.k], pc = percentile(t, v), pv = prev ? prev.r[t.k] : null;
    if (v == null) return '<div class="row between"><span style="font-weight:600">' + t.name + '</span><span class="small mut">non fait</span></div>';
    const better = pv != null && (t.low ? v < pv : v > pv), worse = pv != null && (t.low ? v > pv : v < pv);
    return '<div class="col" style="gap:5px"><div class="row between" style="gap:10px"><span style="font-weight:600">' + t.name + '</span><span class="small" style="white-space:nowrap">' + show(t, v) + (pv != null ? ' <span style="color:' + (better ? 'var(--vert)' : worse ? 'var(--rouge)' : 'var(--mut)') + '">' + (better ? '▲' : worse ? '▼' : '=') + '</span>' : '') + '</span></div>'
      + '<div class="pbar"><i style="left:' + pc + '%"></i></div><span class="small mut">Mieux que ' + pc + ' % des garçons de ton âge' + (t.approx ? ' (repère approximatif)' : '') + (pv != null ? ' · le mois dernier : ' + show(t, pv) : '') + '</span></div>';
  }).join('') + '</section>'
    + '<span class="small dim">Repères : pompes (normes ACSM), saut en longueur et course (tests Eurofit) pour les garçons de 16 à 19 ans. Les autres épreuves n’ont pas de norme officielle : ce sont des estimations. Le prochain test se débloque le mois prochain.</span>';
  if (tests().length > 1) h += '<button type="button" class="pill sm glass wide" data-act="mt-hist">Tous mes tests</button>';
  sheet(h + closeBtn, 1, 'full');
}
function sheetHist() {
  const L = tests();
  let h = '<div class="col" style="gap:4px"><span class="label" style="color:var(--flamme)">Tests du mois</span><h1 class="h1">Ton évolution</h1></div><section class="glass card" style="padding:4px 16px"><div class="list">'
    + L.map((x, i) => { const ps = TESTS.map((t) => percentile(t, x.r[t.k])).filter((p) => p !== null); const a = ps.length ? Math.round(ps.reduce((s, p) => s + p, 0) / ps.length) : 0; return '<button type="button" class="item" data-act="mt-see" data-i="' + i + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + new Date(x.d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</span><span class="small mut">Mieux que ' + a + ' % en moyenne</span></div>' + ICON.chev + '</button>'; }).join('')
    + '</div></section>';
  sheet(h + closeBtn);
}

Object.assign(ACTIONS, {
  mtest: () => { if (!testDueMonth() && tests().length) { sheetResult(); return; } draft = {}; sheetStep(0); },
  'mt-ok': (el) => {
    const i = +el.dataset.i, t = TESTS.filter((x) => !x.auto)[i];
    const v = Math.round(toNum($('mt-v').value));
    if (!(v > 0) || v > (t.k === 'saut' ? 400 : 600)) { toast('Indique ton résultat, ou touche Passer'); return; }
    draft[t.k] = v;
    sheetStep(i + 1);
  },
  'mt-skip': (el) => { sheetStep(+el.dataset.i + 1); },
  'mt-cam': (el) => {
    const i = +el.dataset.i, t = TESTS.filter((x) => !x.auto)[i];
    sheetCam({ name: t.exo, keep: (n) => { if (n > 0) draft[t.k] = n; sheetStep(i); } });
  },
  'mt-clock': (el) => {
    const i = +el.dataset.i, t = TESTS.filter((x) => !x.auto)[i];
    if (chrono) { // arrêter le chrono de la chaise
      const s = Math.round((Date.now() - chrono.t0) / 1000);
      stopChrono();
      if (t.chrono) { $('mt-v').value = s; $('mt-cb').textContent = 'Relancer le chrono'; }
      return;
    }
    const t0 = Date.now();
    try { beep(); } catch (e) { /* son bloqué */ }
    chrono = { t0, iv: setInterval(() => {
      const c = $('mt-clock');
      if (!c) { stopChrono(); return; }
      const s = Math.floor((Date.now() - t0) / 1000);
      if (t.timer) { const left = Math.max(0, t.timer - s); c.textContent = left; if (!left) { stopChrono(); try { beep(); } catch (e) { /* son */ } $('mt-cb').textContent = 'Terminé'; $('mt-v').focus(); } }
      else c.textContent = s;
    }, 200) };
    $('mt-cb').textContent = t.timer ? 'En cours…' : 'Arrêter';
  },
  'mt-hist': () => sheetHist(),
  'mt-see': (el) => sheetResult(tests()[+el.dataset.i]),
});
