// Calculs tirés de l'historique : rang et épreuves, arbres de progression, équilibre du corps, calendrier, poids.
import { RANKS, TREES, CAT, QUALITES, LETTRES, SEUILS, MAITRISE } from './data.js';
import { state, save, runs, fr, dur, setText, exoName } from './store.js';

// ---------- Rang et épreuves ----------
function setsOf(names) {
  const out = [];
  for (const w of state.workouts) for (const e of w.exercises) if (names.includes(e.name)) for (const s of e.sets) out.push(s);
  return out;
}

// Où tu en es sur une épreuve : { done, ratio (0 à 1), best (texte) }
export function testStatus(t) {
  if (t.run) {
    let best = null, done = false;
    for (const r of runs()) {
      if (!best || r.d > best.d) best = r;
      if (r.d >= t.run && (!t.pace || (r.t > 0 && r.t / r.d <= t.pace))) done = true;
    }
    return { done, ratio: done ? 1 : Math.min(0.97, best ? best.d / t.run : 0), best: best ? 'Ta plus longue : ' + fr(best.d) + ' km en ' + dur(best.t) : 'Aucune course enregistrée' };
  }
  const goal = t.reps || t.secs;
  let ratio = 0, bestSet = null;
  for (const s of setsOf([t.exo].concat(t.alt || []))) {
    const a = t.secs ? (s.t || 0) : (s.r || 0);
    const r = Math.min(1, a / goal) * (t.lest ? Math.min(1, (s.w || 0) / t.lest) : 1);
    if (r > ratio) { ratio = r; bestSet = s; }
  }
  return { done: ratio >= 1, ratio, best: bestSet ? 'Ton meilleur : ' + setText(bestSet) : 'Pas encore fait' };
}

// ---------- Les 5 qualités (lettres de E à Z) ----------
// Une note de 0 à 6 : 0 à 1 = E, 1 à 2 = D, … 5 à 6 = S, 6 = Z. La partie après la virgule = l'avancée vers la lettre suivante.
function levelOf(v, th, lower) {
  if (!(v > 0)) return 0;
  if (lower) {
    if (v > th[0]) return Math.min(0.99, th[0] / v);
    for (let i = 0; i < 5; i++) if (v > th[i + 1]) return i + 1 + (th[i] - v) / (th[i] - th[i + 1]);
    return 6;
  }
  if (v < th[0]) return Math.min(0.99, v / th[0]);
  for (let i = 0; i < 5; i++) if (v < th[i + 1]) return i + 1 + (v - th[i]) / (th[i + 1] - th[i]);
  return 6;
}
export const letterOf = (score) => LETTRES[Math.min(6, Math.floor(score + 1e-9))];

// Ton poids (dernière pesée, sinon 70 kg) et l'ajustement selon l'âge : on est au plus fort entre 18 et 34 ans,
// donc la même performance vaut un peu plus avant et après.
export function bodyInfo() {
  const log = bodyLog();
  const bw = log.length ? log[0].kg : 70;
  const age = state.settings.age || 0;
  const ageF = !age ? 1 : age < 16 ? 1.08 : age < 18 ? 1.04 : age < 35 ? 1 : age < 45 ? 1.05 : age < 55 ? 1.1 : 1.18;
  return { bw, known: log.length > 0, age, ageF, wf: Math.min(1.2, Math.max(0.85, Math.sqrt(bw / 70))) };
}

// Facteurs : ce que vaut une répétition de chaque variante par rapport à la version de référence.
const PUSH_F = { 'Push Up': 1, 'Knee Push Up': 0.6, 'Incline Push Up': 0.7, 'Decline Push Up': 1.15, 'Wide Push Up': 1, 'Diamond Push Up': 1.1, 'Slow Push Up': 1.1, 'Deficit Push Up': 1.1, 'Spiderman Push Up': 1.05, 'Hindu Push Up': 1, 'Explosive Push Up': 1.05, 'Clap Push Up': 1.15, 'Pseudo Planche Push Up': 1.45, 'Archer Push Up': 1.8, 'One Arm Push Up': 2.9, 'Pike Pushup': 1.1, 'Elevated Pike Push Up': 1.35, 'Wall Handstand Push Up Negative': 1.6, 'Wall Handstand Push Up': 2.3 };
const LEG_F = { 'Pistol Squat': 1, 'Assisted Pistol Squats': 0.6, 'Bulgarian Split Squat (Dumbbell)': 0.6, 'Cossack Squat': 0.65, 'Squat (Bodyweight)': 0.45, 'Goblet Squat': 0.45, 'Reverse Lunge': 0.5, 'Lunge': 0.5, 'Step Up': 0.5 };
const EXPLO_F = { 'Clap Push Up': 1, 'Explosive Push Up': 0.5, 'Explosive Dip': 0.6, 'Tuck Jump': 0.45, 'Broad Jump': 0.6, 'Jump Squat': 0.25, 'Jumping Lunge': 0.2, 'Burpee': 0.2 };
const ENDU_PUSH = { 'Push Up': 1, 'Wide Push Up': 1, 'Diamond Push Up': 1.1, 'Decline Push Up': 1.1, 'Incline Push Up': 0.6, 'Knee Push Up': 0.5 };
const ENDU_CORE = { 'Plank': 1, 'Side Plank': 1.5, 'Hollow Hold': 2 };

// Toutes les séries faites, regroupées par exercice.
function setsByExo() {
  const m = {};
  for (const w of state.workouts) for (const e of w.exercises) for (const s of e.sets) (m[e.name] = m[e.name] || []).push(s);
  return m;
}
// Meilleure source pour une table de facteurs : value(s, f) donne la valeur d'une série.
function best(m, table, value) {
  let out = null;
  for (const name of Object.keys(table)) for (const s of m[name] || []) {
    const v = value(s, table[name], name);
    if (v > 0 && (!out || v > out.v)) out = { v, s, name };
  }
  return out;
}
const top = (scores, w) => { const x = scores.slice().sort((a, b) => b - a); return w.reduce((k, wi, i) => k + wi * (x[i] || 0), 0); };
const src = (label, b, sc) => ({ label, best: b ? exoShort(b.name) + ' : ' + setText(b.s, b.name) : 'Pas encore fait', score: sc, name: b && b.name });
const exoShort = (n) => (n === 'Running' ? 'Course' : exoName(n));

export function qualities() {
  const m = setsByExo();
  const B = bodyInfo(), bw = B.bw;
  const rm = (r) => 1 + Math.min(r || 0, 12) / 30; // force estimée sur une répétition (formule d'Epley, plafonnée)
  const lestF = (s) => 1 + ((s.w || 0) / bw) * 1.5;

  // Force
  const fDips = best(m, { 'Triceps Dip': 1, 'Chest Dip': 1 }, (s) => (s.r ? ((0.95 * bw + (s.w || 0)) * rm(s.r) / bw) * B.ageF : 0));
  const fPush = best(m, PUSH_F, (s, f) => (s.r ? ((0.65 * bw * f + (s.w || 0)) * rm(s.r) / bw) * B.ageF : 0));
  const fLegs = best(m, LEG_F, (s, f) => (s.r ? ((0.9 * bw * f + (s.w || 0)) * rm(s.r) / bw) * B.ageF : 0));
  const force = [src('Dips', fDips, levelOf(fDips && fDips.v, SEUILS.dips)), src('Pompes', fPush, levelOf(fPush && fPush.v, SEUILS.pompesForce)), src('Jambes', fLegs, levelOf(fLegs && fLegs.v, SEUILS.jambesForce))];

  // Explosivité
  const ex = best(m, EXPLO_F, (s, f) => (s.r || 0) * f * lestF(s) * B.wf * B.ageF);
  const explo = [src('Meilleure série explosive', ex, levelOf(ex && ex.v, SEUILS.explo))];

  // Vitesse : la course la plus rapide ramenée à 5 km (formule de Riegel).
  let run = null;
  for (const r of runs()) if (r.d >= 1 && r.t > 0) { const t5 = r.t * Math.pow(5 / r.d, 1.06) / B.ageF; if (!run || t5 < run.t5) run = Object.assign({}, r, { t5 }); }
  const vitesse = [{ label: 'Course', best: run ? fr(run.d) + ' km en ' + dur(run.t) + ' (' + dur(run.t5) + ' sur 5 km)' : 'Aucune course enregistrée', score: levelOf(run && run.t5, SEUILS.course5k, true), name: 'Running' }];

  // Endurance
  const ePush = best(m, ENDU_PUSH, (s, f) => (s.r || 0) * f * lestF(s) * B.wf * B.ageF);
  const eDips = best(m, { 'Triceps Dip': 1, 'Chest Dip': 1, 'Bench Dip': 0.45 }, (s, f) => (s.r || 0) * f * lestF(s) * B.wf * B.ageF);
  const eCore = best(m, ENDU_CORE, (s, f) => (s.t || 0) * f * lestF(s) * B.ageF);
  let longest = null;
  for (const r of runs()) if (!longest || r.d > longest.d) longest = r;
  const endu = [src('Pompes d’affilée', ePush, levelOf(ePush && ePush.v, SEUILS.pompesEndu)), src('Dips d’affilée', eDips, levelOf(eDips && eDips.v, SEUILS.dipsEndu)),
    { label: 'Plus longue course', best: longest ? fr(longest.d) + ' km' : 'Aucune course enregistrée', score: levelOf(longest && longest.d * B.ageF, SEUILS.courseLongue), name: 'Running' },
    src('Gainage', eCore, levelOf(eCore && eCore.v, SEUILS.gainage))];

  // Maîtrise du corps
  const mait = [];
  for (const name of Object.keys(MAITRISE)) {
    const T = MAITRISE[name];
    const b = best(m, { [name]: 1 }, (s) => (T.t ? (s.t || 0) : (s.r || 0)) * lestF(s) * B.ageF);
    if (b) mait.push(src(exoShort(name), b, levelOf(b.v, T.t || T.r)));
  }
  mait.sort((a, b) => b.score - a.score);
  if (!mait.length) mait.push({ label: 'Figures', best: 'Pas encore fait', score: 0 });

  const sc = {
    force: top(force.map((x) => x.score), [0.75, 0.25]),
    explo: explo[0].score,
    vitesse: vitesse[0].score,
    endu: top(endu.map((x) => x.score), [0.6, 0.25, 0.15]),
    maitrise: top(mait.map((x) => x.score), [0.65, 0.35]),
  };
  const det = { force, explo, vitesse, endu, maitrise: mait.slice(0, 4) };
  // Aucune performance de ce type dans l'historique : la qualité n'est pas encore mesurée (pas « 0 % »).
  const none = { explo: !ex, vitesse: !run };
  return QUALITES.map((q) => { const s = Math.min(6, sc[q.id]); return Object.assign({}, q, { score: s, letter: letterOf(s), frac: s >= 6 ? 1 : s % 1, sources: det[q.id], none: !!none[q.id] }); });
}

// Ton rang = la moyenne de tes 5 lettres. Les épreuves du rang suivant restent comme objectifs concrets.
export function rankInfo() {
  const q = qualities();
  const avg = q.reduce((k, x) => k + x.score, 0) / q.length;
  const idx = Math.min(RANKS.length - 1, Math.floor(avg + 1e-9));
  const next = RANKS[idx + 1] || null;
  const tests = next ? next.tests.map((t) => Object.assign({ label: t.label, exo: t.exo }, testStatus(t))) : [];
  return { rank: RANKS[idx], idx, next, tests, passed: tests.filter((x) => x.done).length, q, avg, ratio: idx >= 6 ? 1 : avg - idx };
}

// ---------- Arbres de progression ----------
function nodeStatus(n) {
  if (n.run) {
    // Palier de course : une distance, avec parfois une allure maximum.
    let ratio = 0, best = '';
    for (const r of runs()) {
      let x = Math.min(1, r.d / n.run);
      if (x >= 1 && n.pace) x = r.t > 0 ? Math.min(1, n.pace / (r.t / r.d)) : 0;
      else if (x < 1 && n.pace) x *= 0.9;
      if (x > ratio) { ratio = x; best = fr(r.d) + ' km en ' + dur(r.t); }
    }
    return { ratio, best };
  }
  const goal = n.secs || n.reps;
  let ratio = 0, best = '';
  for (const w of state.workouts) for (const e of w.exercises) {
    if (e.name !== n.exo) continue;
    const vals = e.sets.filter((s) => (s.w || 0) >= (n.lest || 0)).map((s) => (n.secs ? (s.t || 0) : (s.r || 0))).sort((a, b) => b - a).slice(0, n.sets);
    if (!vals.length) continue;
    const r = vals.reduce((k, v) => k + Math.min(v, goal), 0) / (n.sets * goal);
    if (r > ratio) { ratio = r; best = vals.length + ' × ' + Math.min(...vals) + (n.secs ? ' s' : '') + (n.lest ? ' avec ' + n.lest + ' kg' : ''); }
  }
  return { ratio: Math.min(1, ratio), best };
}

export function treeStatus(tree) {
  const nodes = tree.nodes.map((n) => Object.assign({}, n, nodeStatus(n)));
  let last = -1;
  nodes.forEach((n, i) => { if (n.ratio >= 1) last = i; });
  // Un palier dépassé par un palier plus dur compte comme validé.
  nodes.forEach((n, i) => { n.state = i <= last ? 'done' : (i === last + 1 ? 'current' : 'locked'); });
  return { id: tree.id, name: tree.name, nodes, done: last + 1, current: nodes[last + 1] || null };
}
export function allTrees() { return TREES.map(treeStatus); }

// ---------- Équilibre du corps : séries par famille sur les 28 derniers jours ----------
export function balance() {
  const since = Date.now() - 28 * 864e5;
  const out = { push: 0, pull: 0, legs: 0, core: 0 };
  for (const w of state.workouts) {
    if (w.start < since) continue;
    for (const e of w.exercises) { const c = CAT[e.name]; if (c) out[c] += e.sets.length; }
  }
  return out;
}

// ---------- Calendrier de régularité ----------
const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
// Colonnes de 7 jours (lundi en haut), de la plus ancienne semaine à la semaine en cours.
export function heat(weeks) {
  const count = {};
  for (const w of state.workouts) { const k = dayKey(new Date(w.start)); count[k] = (count[k] || 0) + 1; }
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const cols = [];
  for (let c = weeks - 1; c >= 0; c--) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - c * 7 + r);
      col.push({ start: d.getTime(), n: count[dayKey(d)] || 0, future: d.getTime() > now.getTime(), today: dayKey(d) === dayKey(now), day: d.getDate(), month: d.getMonth() });
    }
    cols.push(col);
  }
  return cols;
}

// ---------- Poids du corps ----------
export function bodyLog() { return (state.body || []).slice().sort((a, b) => b.d - a.d); }
export function addWeight(kg) { state.body = state.body || []; state.body.push({ d: Date.now(), kg }); save(); }
export function delWeight(d) { state.body = (state.body || []).filter((x) => x.d !== d); save(); }
