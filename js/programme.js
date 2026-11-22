// Programme guidé : l'app choisit ta séance du jour.
// Quatre séances tournent (pompes, jambes, dips, complet). Un cycle = 4 semaines :
// semaine 1 normale, semaine 2 une série de plus sur les exercices principaux,
// semaine 3 encore une série de plus et la dernière série au maximum, semaine 4 = re-test de tes qualités.
// Chaque exercice principal monte tout seul à sa version plus dure quand tu as atteint le cap (ex. 10 pistols assistés → pistol).
import { ALIAS } from './data.js';
import { figure } from './anim.js';
import { state, save, exoName, measureOf } from './store.js';
import { esc, plural, ui, ACTIONS, ICON, sheet, setsSummary } from './ui.js';

const DAY = 86400000;
const ORDER = ['push', 'legs', 'dips', 'full'];

// Une ligne = un exercice. ladder = du plus facile au plus dur, up = le cap à atteindre pour passer au suivant.
// main = exercice principal (une série de plus en semaines 2 et 3).
const POMPES = { ladder: ['Push Up', 'Decline Push Up', 'Diamond Push Up', 'Archer Push Up', 'One Arm Push Up'], up: [25, 20, 15, 10] };
const PIKE = { ladder: ['Pike Pushup', 'Elevated Pike Push Up', 'Wall Handstand Push Up Negative', 'Wall Handstand Push Up'], up: [15, 12, 8] };
const PISTOL = { ladder: ['Assisted Pistol Squats', 'Pistol Squat'], up: [10] };
const EXPLO = { ladder: ['Explosive Push Up', 'Clap Push Up'], up: [12] };

export const TYPES = {
  push: { label: 'Pompes et épaules', desc: 'Pompes, épaules, explosivité', slots: [
    Object.assign({ main: true, sets: 4, r: 12 }, POMPES),
    Object.assign({ main: true, sets: 4, r: 8 }, PIKE),
    Object.assign({ sets: 3, r: 5 }, EXPLO),
    { ladder: ['Seated Overhead Press (Dumbbell)'], sets: 3, r: 10, w: 10 },
    { ladder: ['Hollow Rock'], sets: 2, t: 30 },
    { ladder: ['Lateral Raise (Dumbbell)'], sets: 2, r: 12, w: 10 },
  ], bonus: [{ ladder: ['Wide Push Up'], sets: 2, r: 15 }, { ladder: ['Bench Dip'], sets: 2, r: 15 }] },
  legs: { label: 'Jambes et abdos', desc: 'Pistol, fentes, sauts, abdos', slots: [
    Object.assign({ main: true, sets: 4, r: 4 }, PISTOL),
    { main: true, ladder: ['Reverse Lunge'], sets: 4, r: 12, w: 20 },
    { ladder: ['Jump Squat'], sets: 3, r: 10 },
    { ladder: ['Standing Calf Raise (Dumbbell)'], sets: 3, r: 12, w: 10 },
    { ladder: ['Hanging Leg Raise'], sets: 3, r: 8 },
    { ladder: ['Russian Twist (Bodyweight)'], sets: 2, r: 40, w: 10 },
  ], bonus: [{ ladder: ['Bulgarian Split Squat (Dumbbell)'], sets: 2, r: 10, w: 10 }, { ladder: ['Tuck Jump'], sets: 2, r: 8 }] },
  dips: { label: 'Dips et dos', desc: 'Dips lestés, rowing, bras', slots: [
    { main: true, ladder: ['Triceps Dip'], sets: 4, r: 8, w: 15 },
    { main: true, ladder: ['Bent Over Row (Dumbbell)'], sets: 4, r: 12, w: 20 },
    { ladder: ['Bent Over Row (Band)'], sets: 3, r: 12, w: 55 },
    { ladder: ['Decline Push Up'], sets: 3, r: 12 },
    { ladder: ['Hammer Curl (Dumbbell)'], sets: 3, r: 10, w: 10 },
    { ladder: ['Explosive Dip'], sets: 2, r: 6 },
  ], bonus: [{ ladder: ['Bicep Curl (Band)'], sets: 2, r: 12 }, { ladder: ['Hollow Rock'], sets: 2, t: 30 }] },
  full: { label: 'Complet', desc: 'Un peu de tout, en enchaînant', slots: [
    Object.assign({ main: true, sets: 4, r: 15 }, POMPES),
    { main: true, ladder: ['Triceps Dip'], sets: 4, r: 10, w: 15 },
    Object.assign({ sets: 3, r: 4 }, PISTOL),
    { ladder: ['Bent Over Row (Dumbbell)'], sets: 3, r: 12, w: 20 },
    { ladder: ['Burpee'], sets: 2, r: 10 },
    { ladder: ['Hollow Rock'], sets: 2, t: 30 },
  ], bonus: [{ ladder: ['Russian Twist (Bodyweight)'], sets: 2, r: 40, w: 10 }, Object.assign({ sets: 2, r: 8 }, PIKE)] },
};

// Re-test (semaine 4) : une seule série au maximum par exercice, avec un long repos.
const TEST = [
  { ladder: ['Push Up'], label: 'Max de pompes', r: 20 },
  { ladder: ['Triceps Dip'], label: 'Max de dips sans lest', r: 12 },
  Object.assign({ label: 'Max de pistols' }, PISTOL, { r: 4 }),
  Object.assign({ label: 'Max de pompes explosives' }, EXPLO, { r: 5 }),
  { ladder: ['Hollow Rock'], label: 'Hollow rock le plus long', t: 30 },
];

// ---------- Où tu en es ----------
const day0 = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function prog() {
  if (!state.prog) { state.prog = { cycle: 1, start: day0(Date.now()) }; save(); }
  return state.prog;
}
// 0, 1, 2 = semaines d'entraînement ; 3 (ou plus) = re-test à faire.
export function weekIdx() { return Math.max(0, Math.floor((day0(Date.now()) - prog().start) / (7 * DAY))); }
export function testDue() { return weekIdx() >= 3; }

const same = (a, b) => a === b || ALIAS[a] === b || ALIAS[b] === a || (ALIAS[a] && ALIAS[a] === ALIAS[b]);
function best(name) {
  let m = 0;
  for (const w of state.workouts) for (const e of w.exercises) if (same(e.name, name)) for (const s of e.sets) m = Math.max(m, s.r || s.t || 0);
  return m;
}
function done(name) { return state.workouts.some((w) => w.exercises.some((e) => same(e.name, name))); }

// Le bon échelon : on monte tant que le cap de l'échelon est atteint, ou si tu as déjà fait plus dur.
function pickLevel(slot) {
  const L = slot.ladder;
  let i = 0;
  for (let k = L.length - 1; k > 0; k--) if (done(L[k])) { i = k; break; }
  while (i < L.length - 1 && slot.up && best(L[i]) >= slot.up[i]) i++;
  return { name: L[i], fresh: i > 0 && !done(L[i]), next: L[i + 1] || null, cap: slot.up ? slot.up[i] : null };
}

// La prochaine séance de la rotation : celle qui suit la dernière faite dans le programme.
export function nextType() {
  const last = [...state.workouts].sort((a, b) => b.start - a.start).find((w) => w.prog && ORDER.includes(w.prog.type));
  return last ? ORDER[(ORDER.indexOf(last.prog.type) + 1) % ORDER.length] : 'push';
}

// Les exercices d'une séance. mode : '' (normale), 'court' ou 'gros'.
export function plan(type, mode) {
  if (type === 'test') {
    return TEST.map((s) => { const p = pickLevel(s); return { name: p.name, label: s.label, fresh: p.fresh, sets: [s.t ? { t: s.t } : { r: s.r }] }; });
  }
  const T = TYPES[type], wk = Math.min(2, weekIdx());
  let slots = T.slots.slice();
  if (mode === 'gros') slots = slots.concat(T.bonus);
  return slots.map((s, i) => {
    let n = s.sets + (s.main && wk >= 1 ? 1 : 0) + (mode === 'gros' && i < 2 ? 1 : 0);
    if (mode === 'court') n = i < 4 ? 2 : 1;
    const p = pickLevel(s);
    const one = s.t ? { t: s.t } : { r: s.r, w: s.w || 0 };
    return { name: p.name, fresh: p.fresh, main: !!s.main, next: p.next, cap: p.cap, sets: Array.from({ length: n }, () => Object.assign({}, one)) };
  }).slice(0, mode === 'court' ? 5 : 99);
}

const nSets = (list) => list.reduce((n, e) => n + e.sets.length, 0);
// Environ 2 minutes par série (effort + repos), plus l'installation.
export function minutes(list, test) { return Math.round(((test ? 4 : 2.1) * nSets(list) + 6) / 5) * 5; }
function title(type) { return type === 'test' ? 'Re-test' : TYPES[type].label; }

// Ce qu'il faut pour démarrer la séance (lancée par startPlan dans seance.js).
export function progPlan(type, mode) {
  const list = plan(type, mode);
  const p = prog();
  const extra = mode === 'court' ? ' · courte' : mode === 'gros' ? ' · grosse séance' : '';
  return {
    title: title(type), label: title(type) + extra, exercises: list,
    prog: { type, cycle: p.cycle, week: Math.min(3, weekIdx()) + 1 },
    test: type === 'test', express: mode === 'court',
  };
}

// Appelé à la fin d'une séance du programme.
export function progDone(w) {
  if (!w.prog || w.prog.type !== 'test') return '';
  const p = prog();
  p.cycle += 1;
  p.start = day0(Date.now()) + DAY;
  save();
  return 'Re-test fait : le cycle ' + p.cycle + ' commence demain.';
}

// ---------- Affichage ----------
function weekLabel() {
  const wk = weekIdx();
  return 'Cycle ' + prog().cycle + ' · ' + (wk >= 3 ? 'semaine de re-test' : 'semaine ' + (wk + 1) + ' sur 4');
}
function weekNote(type) {
  if (type === 'test') return 'Une seule série par exercice, au maximum, avec 3 minutes de repos. Tes lettres se mettent à jour.';
  const wk = weekIdx();
  if (wk === 0) return 'Semaine 1 : le rythme de base. Bats ton chiffre de la dernière fois.';
  if (wk === 1) return 'Semaine 2 : une série de plus sur les exercices principaux.';
  return 'Semaine 3 : la plus dure. Dernière série des exercices principaux au maximum.';
}
function weeksBar() {
  const wk = Math.min(3, weekIdx());
  return '<div class="seg" aria-label="Semaine ' + (wk + 1) + ' sur 4">' + [0, 1, 2, 3].map((i) => '<i class="' + (i <= wk ? 'on' : '') + '"></i>').join('') + '</div>';
}

// La carte du programme (accueil et onglet Séance). main = grande carte dorée.
export function progCard(main, doneToday) {
  const type = testDue() ? 'test' : nextType();
  const list = plan(type, '');
  const fresh = list.find((e) => e.fresh);
  const names = list.slice(0, 4).map((e) => exoName(e.name)).join(' · ') + (list.length > 4 ? ' · +' + (list.length - 4) : '');
  return '<section class="' + (main ? 'cta' : 'glass card') + ' hud tap" role="button" tabindex="0" data-act="prog" style="display:flex;flex-direction:column;gap:14px">'
    + (main && list.length ? '<div class="ctafig">' + figure(list[0].name) + '</div>' : '') + '<div class="col ctahead" style="gap:4px">'
    + '<span class="label violet">' + (doneToday ? 'Faite aujourd’hui · suivante' : weekLabel()) + '</span>'
    + '<span class="h1">' + esc(title(type)) + '</span>'
    + '<span class="small" style="color:var(--soft)">' + plural(list.length, 'exercice', 'exercices') + ' · environ ' + minutes(list, type === 'test') + ' min</span>'
    + (main ? '' : '<span class="small mut">' + esc(names) + '</span>')
    + (fresh ? '<span class="small gold-text">Nouveau : ' + esc(exoName(fresh.name)) + '</span>' : '') + '</div>'
    + weeksBar()
    + '<div class="row">' + (type === 'test' ? '' : '<button type="button" class="pill glass" data-act="prog-start" data-type="' + type + '" data-mode="court">Courte</button>')
    + '<button type="button" class="pill gold-btn grow" data-act="prog-start" data-type="' + type + '">' + (type === 'test' ? 'Faire le re-test' : 'Commencer') + '</button></div></section>';
}

function planList(list) {
  return '<div class="list">' + list.map((e, i) => '<button type="button" class="item" data-act="exo" data-name="' + esc(e.name) + '"><span class="num dim" style="width:20px">' + (i + 1) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(e.label || exoName(e.name)) + (e.fresh ? ' <span class="small gold-text">nouveau</span>' : '') + '</span>'
    + '<span class="small mut">' + esc(e.label ? exoName(e.name) : setsSummary(e.sets) + (e.main ? ' · principal' : '')) + (e.next && e.cap ? ' · ' + e.cap + (measureOf(e.name) === 'time' ? ' s' : ' rép.') + ' pour passer à ' + esc(exoName(e.next)) : '') + '</span></div>' + ICON.chev + '</button>').join('') + '</div>';
}

// Fenêtre du programme : la séance du jour en détail, le cycle, et le choix d'une autre séance.
export function sheetProg(type) {
  const t = type || (testDue() ? 'test' : nextType());
  const mode = ui.progMode || '';
  const list = plan(t, t === 'test' ? '' : mode);
  let h = '<div class="col"><span class="label violet">' + weekLabel() + '</span><h1 class="h1">' + esc(title(t)) + '</h1>'
    + '<span class="small mut">' + esc(weekNote(t)) + '</span></div>' + weeksBar();
  if (t !== 'test') {
    h += '<div class="row" style="gap:8px">' + [['court', 'Courte'], ['', 'Normale'], ['gros', 'Grosse séance']].map(([m, l]) => '<button type="button" class="pill sm ' + (m === mode ? 'gold-btn' : 'glass') + ' grow" data-act="prog-mode" data-mode="' + m + '" data-type="' + t + '">' + l + '</button>').join('') + '</div>';
  }
  h += '<span class="small" style="color:var(--soft)">' + plural(list.length, 'exercice', 'exercices') + ' · ' + plural(nSets(list), 'série', 'séries') + ' · environ ' + minutes(list, t === 'test') + ' min</span>'
    + planList(list);
  if (!state.active) h += '<button type="button" class="pill gold-btn wide big" data-act="prog-start" data-type="' + t + '" data-mode="' + (t === 'test' ? '' : mode) + '">Commencer</button>';
  h += '<div class="col" style="gap:8px"><span class="label">Changer de séance</span><div class="list">'
    + ORDER.concat('test').filter((x) => x !== t).map((x) => '<button type="button" class="item" data-act="prog" data-type="' + x + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(title(x)) + '</span><span class="small mut">' + esc(x === 'test' ? 'Tes max, pour mettre à jour tes lettres' : TYPES[x].desc) + '</span></div>' + ICON.chev + '</button>').join('')
    + '</div><span class="small mut">Le programme tourne : pompes, jambes, dips, complet. Un cycle dure 4 semaines : 3 semaines où ça monte, puis le re-test.</span></div>'
    + '<button type="button" class="pill sm glass wide" data-act="close" style="color:var(--mut)">Fermer</button>';
  sheet(h);
}

Object.assign(ACTIONS, {
  prog: (el) => { if (!el.dataset.type) ui.progMode = ''; sheetProg(el.dataset.type); },
  'prog-mode': (el) => { ui.progMode = el.dataset.mode; sheetProg(el.dataset.type); },
});
