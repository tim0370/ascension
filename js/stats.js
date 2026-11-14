// Calculs tirés de l'historique : rang et épreuves, arbres de progression, équilibre du corps, calendrier, poids.
import { RANKS, TREES, CAT } from './data.js';
import { state, save, runs, fr, dur, setText } from './store.js';

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

// Ton rang = le plus haut dont toutes les épreuves sont réussies, sans en sauter.
export function rankInfo() {
  let idx = 0;
  for (let i = 1; i < RANKS.length; i++) { if (RANKS[i].tests.every((t) => testStatus(t).done)) idx = i; else break; }
  const next = RANKS[idx + 1] || null;
  const tests = next ? next.tests.map((t) => Object.assign({ label: t.label, exo: t.exo }, testStatus(t))) : [];
  return { rank: RANKS[idx], idx, next, tests, passed: tests.filter((x) => x.done).length };
}

// ---------- Arbres de progression ----------
function nodeStatus(n) {
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
