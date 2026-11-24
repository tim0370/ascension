// Programme guidé : l'app choisit ta séance du jour.
// Quatre séances tournent (pompes, jambes, dips, complet). Un cycle = 4 semaines :
// semaine 1 normale, semaine 2 une série de plus sur les exercices principaux,
// semaine 3 encore une série de plus et la dernière série au maximum, semaine 4 = re-test de tes qualités.
// Chaque exercice principal monte tout seul à sa version plus dure quand tu as atteint le cap (ex. 10 pistols assistés → pistol).
import { ALIAS } from './data.js';
import { bodyStats, musclesOf, ZONES } from './corps.js';
import { figure } from './anim.js';
import { state, save, exoName, measureOf } from './store.js';
import { esc, plural, ui, ACTIONS, ICON, sheet, setsSummary } from './ui.js';
import { rankInfo } from './stats.js';
import { forme, applyPains, lightWeek, monday0, predictions, whenTxt } from './forme.js';

const DAY = 86400000;
const ORDER_FULL = ['push', 'legs', 'dips', 'full'];
const ORDER_DEB = ['d-haut', 'd-bas', 'd-tout'];
// Niveau choisi dans les réglages (settings.level) : 'debutant' = programme facile, sinon le programme complet.
export const isBeginner = () => state.settings.level === 'debutant';
const order = () => (isBeginner() ? ORDER_DEB : ORDER_FULL);
// Sans programme (settings.noProg) : l'accueil montre les routines à la place.
export const progOn = () => !state.settings.noProg;

// Une ligne = un exercice. ladder = du plus facile au plus dur, up = le cap à atteindre pour passer au suivant.
// main = exercice principal (une série de plus en semaines 2 et 3).
const POMPES = { ladder: ['Push Up', 'Decline Push Up', 'Diamond Push Up', 'Archer Push Up', 'One Arm Push Up'], up: [25, 20, 15, 10] };
const PIKE = { ladder: ['Pike Pushup', 'Elevated Pike Push Up', 'Wall Handstand Push Up Negative', 'Wall Handstand Push Up'], up: [15, 12, 8] };
const PISTOL = { ladder: ['Assisted Pistol Squats', 'Pistol Squat'], up: [10] };
const EXPLO = { ladder: ['Explosive Push Up', 'Clap Push Up'], up: [12] };

// Pensé pour être fort partout (force, muscle, endurance, figures) chez toi, sans barre de traction.
// Chaque séance suit le même ordre : une figure quand tu es frais (habileté), la force, l'explosivité,
// le muscle, puis le gainage ou l'endurance. La course du dimanche travaille la vitesse et le souffle.
const HAND = { ladder: ['Handstand Hold'], sets: 3, t: 20, bloc: 'Habileté' };
const LSIT = { ladder: ['Tuck L-Sit', 'L-Sit Hold'], up: [20], sets: 3, t: 10, bloc: 'Habileté' };
const CROW = { ladder: ['Crow Pose', 'Planche Hold (Tuck)'], up: [30], sets: 3, t: 15, bloc: 'Habileté' };
const SAUTS = { ladder: ['Jump Squat', 'Tuck Jump'], up: [15] };
export const TYPES = {
  push: { label: 'Pompes et épaules', desc: 'Équilibre, pompes, épaules, explosivité', slots: [
    HAND,
    Object.assign({ main: true, sets: 4, r: 12, bloc: 'Force' }, POMPES),
    Object.assign({ main: true, sets: 4, r: 8, bloc: 'Force' }, PIKE),
    Object.assign({ sets: 3, r: 5, bloc: 'Explosivité' }, EXPLO),
    { ladder: ['Seated Overhead Press (Dumbbell)'], sets: 3, r: 10, w: 10, bloc: 'Muscle' },
    { ladder: ['Hollow Rock'], sets: 2, t: 30, bloc: 'Gainage' },
  ], bonus: [{ ladder: ['Lateral Raise (Dumbbell)'], sets: 2, r: 12, w: 10, bloc: 'Muscle' }, { ladder: ['Wide Push Up'], sets: 2, r: 15, bloc: 'Endurance' }] },
  legs: { label: 'Jambes et abdos', desc: 'Pistol, fentes, sauts, abdos', slots: [
    Object.assign({ main: true, sets: 4, r: 4, bloc: 'Force' }, PISTOL),
    { main: true, ladder: ['Reverse Lunge'], sets: 4, r: 12, w: 20, bloc: 'Force' },
    Object.assign({ sets: 3, r: 10, bloc: 'Explosivité' }, SAUTS),
    { ladder: ['Standing Calf Raise (Dumbbell)'], sets: 3, r: 12, w: 10, bloc: 'Muscle' },
    { ladder: ['Hanging Leg Raise'], sets: 3, r: 8, bloc: 'Gainage' },
    { ladder: ['Russian Twist (Bodyweight)'], sets: 2, r: 40, w: 10, bloc: 'Gainage' },
  ], bonus: [{ ladder: ['Bulgarian Split Squat (Dumbbell)'], sets: 2, r: 10, w: 10, bloc: 'Muscle' }, { ladder: ['Wall Sit'], sets: 1, t: 60, bloc: 'Endurance' }] },
  dips: { label: 'Dips et dos', desc: 'L-sit, dips lestés, dos, bras', slots: [
    LSIT,
    { main: true, ladder: ['Triceps Dip'], sets: 4, r: 8, w: 15, bloc: 'Force' },
    { main: true, ladder: ['Bent Over Row (Dumbbell)'], sets: 4, r: 12, w: 20, bloc: 'Force' },
    { ladder: ['Explosive Dip'], sets: 2, r: 6, bloc: 'Explosivité' },
    { ladder: ['Decline Push Up'], sets: 3, r: 12, bloc: 'Muscle' },
    { ladder: ['Hammer Curl (Dumbbell)'], sets: 3, r: 10, w: 10, bloc: 'Muscle' },
  ], bonus: [{ ladder: ['Bent Over Row (Band)'], sets: 3, r: 12, w: 55, bloc: 'Muscle' }, { ladder: ['Bicep Curl (Band)'], sets: 2, r: 12, bloc: 'Muscle' }] },
  full: { label: 'Complet', desc: 'Corbeau, pompes, dips, jambes, cardio', slots: [
    CROW,
    Object.assign({ main: true, sets: 4, r: 15, bloc: 'Endurance' }, POMPES),
    { main: true, ladder: ['Triceps Dip'], sets: 4, r: 10, w: 15, bloc: 'Force' },
    Object.assign({ sets: 3, r: 4, bloc: 'Force' }, PISTOL),
    { ladder: ['Bent Over Row (Dumbbell)'], sets: 3, r: 12, w: 20, bloc: 'Muscle' },
    { ladder: ['Burpee'], sets: 2, r: 10, bloc: 'Endurance' },
  ], bonus: [{ ladder: ['Hollow Rock'], sets: 2, t: 30, bloc: 'Gainage' }, Object.assign({ sets: 2, r: 8, bloc: 'Force' }, PIKE)] },
};

// Séance « point faible » : une fois par semaine, elle cible ta qualité la plus basse (hors vitesse, qui se travaille en courant).
const WEAK = {
  force: { name: 'Force', slots: [
    { main: true, ladder: ['Triceps Dip'], sets: 5, r: 5, w: 20, bloc: 'Force' },
    Object.assign({ main: true, sets: 4, r: 6, w: 10, bloc: 'Force' }, POMPES),
    Object.assign({ sets: 4, r: 3, bloc: 'Force' }, PISTOL),
    { ladder: ['Bulgarian Split Squat (Dumbbell)'], sets: 3, r: 8, w: 10, bloc: 'Force' },
    { ladder: ['Bent Over Row (Dumbbell)'], sets: 3, r: 8, w: 20, bloc: 'Force' },
  ] },
  explo: { name: 'Explosivité', slots: [
    Object.assign({ main: true, sets: 5, r: 5, bloc: 'Explosivité' }, EXPLO),
    { main: true, ladder: ['Explosive Dip'], sets: 4, r: 5, bloc: 'Explosivité' },
    Object.assign({ sets: 4, r: 6, bloc: 'Explosivité' }, SAUTS),
    { ladder: ['Burpee'], sets: 3, r: 8, bloc: 'Explosivité' },
    { ladder: ['Skater Jump'], sets: 2, r: 10, bloc: 'Explosivité' },
  ] },
  endu: { name: 'Endurance', slots: [
    { main: true, ladder: ['Push Up'], sets: 3, r: 25, bloc: 'Endurance' },
    { main: true, ladder: ['Triceps Dip'], sets: 3, r: 15, bloc: 'Endurance' },
    { ladder: ['Wall Sit'], sets: 2, t: 60, bloc: 'Endurance' },
    { ladder: ['Plank'], sets: 2, t: 60, bloc: 'Gainage' },
    { ladder: ['Burpee'], sets: 2, r: 15, bloc: 'Endurance' },
  ] },
  maitrise: { name: 'Maîtrise du corps', slots: [
    Object.assign({}, HAND, { main: true, sets: 4 }),
    CROW,
    LSIT,
    Object.assign({ sets: 3, r: 4, bloc: 'Force' }, PISTOL),
    { ladder: ['Hollow Rock'], sets: 3, t: 30, bloc: 'Gainage' },
    { ladder: ['Dragon Flag'], sets: 3, r: 3, bloc: 'Gainage' },
  ] },
};
// La qualité visée : la plus basse de tes 5 (la vitesse passe par la course du dimanche).
export function weakQuality() {
  const q = rankInfo().q.filter((x) => WEAK[x.id]).sort((a, b) => a.score - b.score)[0];
  return q || { id: 'force', name: 'Force', letter: 'E' };
}
Object.defineProperty(TYPES, 'faible', { enumerable: false, get() { const q = weakQuality(); return { label: 'Point faible · ' + WEAK[q.id].name, desc: 'Ta qualité la plus basse (' + q.letter + ')', slots: WEAK[q.id].slots, bonus: [] }; } });

// Programme débutant : 3 séances courtes au poids du corps, qui tournent. Les exercices montent tout seuls
// (pompes sur les genoux, puis inclinées, puis normales…) quand le cap est atteint.
const POMPES_DEB = { ladder: ['Knee Push Up', 'Incline Push Up', 'Push Up', 'Decline Push Up'], up: [15, 15, 15] };
const SQUAT_DEB = { ladder: ['Squat (Bodyweight)', 'Jump Squat'], up: [20] };
const PONT_DEB = { ladder: ['Glute Bridge', 'Single Leg Glute Bridge'], up: [20] };
Object.assign(TYPES, {
  'd-haut': { label: 'Haut du corps', desc: 'Pompes, dos, épaules, gainage', slots: [
    Object.assign({ main: true, sets: 3, r: 8 }, POMPES_DEB),
    { main: true, ladder: ['Bench Dip'], sets: 3, r: 8 },
    { ladder: ['Superman'], sets: 3, r: 10 },
    { ladder: ['Shoulder Taps'], sets: 2, r: 16 },
    { ladder: ['Plank'], sets: 2, t: 20 },
  ], bonus: [{ ladder: ['Wide Push Up'], sets: 2, r: 8 }, { ladder: ['Dead Bug'], sets: 2, r: 10 }] },
  'd-bas': { label: 'Bas du corps', desc: 'Squats, fessiers, fentes, abdos', slots: [
    Object.assign({ main: true, sets: 3, r: 12 }, SQUAT_DEB),
    Object.assign({ main: true, sets: 3, r: 12 }, PONT_DEB),
    { ladder: ['Reverse Lunge'], sets: 2, r: 8 },
    { ladder: ['Wall Sit'], sets: 2, t: 20 },
    { ladder: ['Crunch'], sets: 2, r: 12 },
  ], bonus: [{ ladder: ['Single Leg Standing Calf Raise'], sets: 2, r: 12 }, { ladder: ['Side Plank'], sets: 2, t: 15 }] },
  'd-tout': { label: 'Tout le corps', desc: 'Un peu de tout, avec du cardio', slots: [
    Object.assign({ main: true, sets: 3, r: 8 }, POMPES_DEB),
    Object.assign({ main: true, sets: 3, r: 12 }, SQUAT_DEB),
    { ladder: ['Jumping Jack'], sets: 2, t: 30 },
    { ladder: ['Mountain Climber'], sets: 2, t: 20 },
    Object.assign({ sets: 2, r: 12 }, PONT_DEB),
    { ladder: ['Plank'], sets: 2, t: 20 },
  ], bonus: [{ ladder: ['Burpee'], sets: 2, r: 6 }, { ladder: ['Superman'], sets: 2, r: 10 }] },
});
const TEST_DEB = [
  Object.assign({ label: 'Max de pompes' }, POMPES_DEB, { r: 10 }),
  Object.assign({ label: 'Max de squats' }, SQUAT_DEB, { r: 20 }),
  { ladder: ['Plank'], label: 'Gainage le plus long', t: 30 },
];

// Re-test (semaine 4) : une seule série au maximum par exercice, avec un long repos.
const TEST = [
  { ladder: ['Push Up'], label: 'Max de pompes', r: 20 },
  { ladder: ['Triceps Dip'], label: 'Max de dips sans lest', r: 12 },
  Object.assign({ label: 'Max de pistols' }, PISTOL, { r: 4 }),
  Object.assign({ label: 'Max de pompes explosives' }, EXPLO, { r: 5 }),
  { ladder: ['Hollow Rock'], label: 'Hollow rock le plus long', t: 30 },
];

// Grand objectif (cap.js) : où ajouter son exercice quand il n'est pas déjà dans la séance.
const CAP_INJ = {
  explo: { types: ['legs', 'full'], slot: Object.assign({ sets: 3, r: 5 }, EXPLO) },
  force: { types: ['push'], slot: { ladder: ['Triceps Dip'], sets: 3, r: 6, w: 15 } },
  endu: { types: ['legs', 'dips'], slot: { ladder: ['Push Up'], sets: 2, r: 25 } },
  maitrise: { types: ['legs', 'dips', 'full'], slot: Object.assign({}, HAND, { sets: 3 }) },
};
const bigCap = () => (state.goals || []).find((g) => g.big && !g.big.off && !g.done && Date.now() < g.big.end + 14 * DAY) || null;

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
// Une fois par semaine (après 2 séances du programme), la séance « point faible » passe avant.
function lastRot() { return [...state.workouts].sort((a, b) => b.start - a.start).find((w) => w.prog && order().includes(w.prog.type)); }
function weekProg() { const m = monday0(Date.now()); return state.workouts.filter((w) => w.start >= m && w.prog); }
function faibleOk() { const W = weekProg(); return !isBeginner() && (state.settings.weekGoal || 4) >= 3 && !W.some((w) => w.prog.type === 'faible') && W.filter((w) => order().includes(w.prog.type)).length >= 2; }
export function nextType() {
  if (faibleOk()) return 'faible';
  const last = lastRot();
  const O = order();
  return last && O.includes(last.prog.type) ? O[(O.indexOf(last.prog.type) + 1) % O.length] : O[0];
}
// Les n prochaines séances (pour le plan de la semaine).
export function rotation(n) {
  const O = order(), out = [];
  const last = lastRot();
  let i = last ? O.indexOf(last.prog.type) : -1;
  const W = weekProg();
  let nProg = W.filter((w) => order().includes(w.prog.type)).length;
  let weak = isBeginner() || (state.settings.weekGoal || 4) < 3 || W.some((w) => w.prog.type === 'faible');
  if (testDue()) { out.push('test'); weak = true; }
  while (out.length < n) {
    if (!weak && nProg >= 2) { out.push('faible'); weak = true; continue; }
    i = (i + 1) % O.length; out.push(O[i]); nProg++;
  }
  return out.slice(0, n);
}

// Les exercices d'une séance. mode : '' (normale), 'court', 'gros' ou 'leger' (une série de moins partout).
// Pendant une semaine légère, la séance normale devient légère. Les douleurs signalées retirent ou remplacent des exercices.
export function plan(type, mode) {
  if (type === 'test') {
    return applyPains((isBeginner() ? TEST_DEB : TEST).map((s) => { const p = pickLevel(s); return { name: p.name, label: s.label, fresh: p.fresh, sets: [s.t ? { t: s.t } : { r: s.r }] }; }), true);
  }
  const T = TYPES[type] || TYPES[order()[0]], wk = Math.min(2, weekIdx());
  if (!mode && lightWeek()) mode = 'leger';
  let slots = T.slots.slice();
  if (mode === 'gros') slots = slots.concat(T.bonus);
  // Grand objectif : son exercice revient dans plus de séances, au début (quand tu es frais).
  const big = bigCap();
  if (big && !isBeginner() && CAP_INJ[big.big.q] && CAP_INJ[big.big.q].types.includes(type) && !slots.some((s) => s.ladder.includes(big.name))) {
    const at = slots[0] && slots[0].bloc === 'Habileté' ? 1 : 0;
    slots.splice(at, 0, Object.assign({}, CAP_INJ[big.big.q].slot, big.w ? { w: big.w } : {}, { bloc: 'Objectif' }));
  }
  return applyPains(slots.map((s, i) => {
    let n = s.sets + (s.main && wk >= 1 ? 1 : 0) + (mode === 'gros' && i < 2 ? 1 : 0);
    if (mode === 'court') n = i < 4 ? 2 : 1;
    if (mode === 'leger') n = Math.max(s.main ? 2 : 1, n - 1);
    const p = pickLevel(s);
    const one = s.t ? { t: s.t } : { r: s.r, w: s.w || 0 };
    return { name: p.name, fresh: p.fresh, main: !!s.main, bloc: big && p.name === big.name ? 'Objectif' : s.bloc || '', next: p.next, cap: p.cap, sets: Array.from({ length: n }, () => Object.assign({}, one)) };
  }).slice(0, mode === 'court' ? 5 : 99));
}

// La séance du jour (pour la forme de l'accueil).
export function todayList() { return plan(testDue() ? 'test' : nextType(), ''); }

const nSets = (list) => list.reduce((n, e) => n + e.sets.length, 0);
// Environ 2 minutes par série (effort + repos), plus l'installation.
export function minutes(list, test) { return Math.round(((test ? 4 : 2.1) * nSets(list) + 6) / 5) * 5; }
export function title(type) { return type === 'test' ? 'Re-test' : (TYPES[type] || TYPES[order()[0]]).label; }

// Ce qu'il faut pour démarrer la séance (lancée par startPlan dans seance.js).
export function progPlan(type, mode) {
  const list = plan(type, mode);
  const p = prog();
  const extra = mode === 'court' ? ' · courte' : mode === 'gros' ? ' · grosse séance' : mode === 'leger' || (!mode && lightWeek() && type !== 'test') ? ' · allégée' : '';
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
  if (type === 'faible') { const q = weakQuality(); return 'Une fois par semaine : ta qualité la plus basse, ' + q.name.toLowerCase() + ' (' + q.letter + '). C’est elle qui fait monter ton rang le plus vite.'; }
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
// Récupération des muscles que la séance va travailler (moyenne pondérée par les séries).
export function readiness(list) {
  const z = bodyStats();
  let sum = 0, wsum = 0;
  const tired = {};
  for (const e of list) {
    const m = musclesOf(e.name);
    for (const k of Object.keys(m)) {
      const wt = m[k] * e.sets.length;
      sum += z[k].rec * wt; wsum += wt;
      if (z[k].rec < 70 && m[k] >= 1) tired[k] = true;
    }
  }
  return { pct: wsum ? Math.round(sum / wsum) : 100, tired: Object.keys(tired).map((k) => ZONES[k].name.toLowerCase()) };
}

// noForme : la forme est déjà affichée au-dessus (accueil).
// Pourquoi cette séance : 2 à 4 raisons concrètes, tirées de tes données (cycle, rotation, forme, point faible, objectif).
export function whyList(type, list, f, auto) {
  const out = [];
  const wk = weekIdx();
  if (type === 'test') out.push('Semaine 4 du cycle : on mesure tes progrès. Une série au maximum par exercice, tes lettres se mettent à jour.');
  else out.push('Semaine ' + (wk + 1) + ' sur 4 du cycle : ' + (wk === 0 ? 'on pose les bases, séries pas trop dures.' : wk === 1 ? 'une série de plus sur les exercices principaux.' : 'encore une série de plus, la dernière au maximum.'));
  const last = state.workouts.filter((w) => w.prog && w.prog.type !== 'test').sort((a, b) => b.start - a.start)[0];
  if (type === 'faible') { const q = weakQuality(); out.push('Ta qualité la plus basse est ' + q.name.toLowerCase() + ' (' + q.letter + ') : une séance par semaine lui est réservée, c’est elle qui fait monter ton rang le plus vite.'); }
  else if (last && type !== 'test') { const d = Math.max(1, Math.round((Date.now() - last.start) / 864e5)); out.push('Dernière séance : « ' + title(last.prog.type) + ' » il y a ' + plural(d, 'jour', 'jours') + '. Aujourd’hui d’autres muscles travaillent, les premiers récupèrent.'); }
  if (f) out.push(auto ? (lightWeek() ? 'Semaine légère : une série de moins partout pour que ton corps rattrape la fatigue accumulée.' : 'Forme ' + f.score + ' % : une série de moins partout, pour progresser sans te cramer.') : f.mode === 'record' ? 'Forme ' + f.score + ' % : c’est un bon jour pour battre un record.' : 'Forme ' + f.score + ' %' + (f.est ? ' (estimée, fais ton bilan du matin pour un vrai score)' : '') + ' : séance normale.');
  const obj = list.find((e) => e.bloc === 'Objectif');
  if (obj) out.push(exoName(obj.name) + ' ajouté au début : c’est l’exercice de ton grand objectif.');
  const fresh = list.find((e) => e.fresh);
  if (fresh) out.push('Nouveau : ' + exoName(fresh.name) + ', parce que tu as atteint le cap de l’exercice d’avant.');
  if (list.some((e) => e.swap)) out.push('Des exercices sont remplacés à cause de la douleur que tu as signalée.');
  out.push('Chaque série vise ta dernière fois + 1 répétition (ou + 5 secondes).');
  return out;
}
export function progCard(main, doneToday, noForme) {
  const type = testDue() ? 'test' : nextType();
  const f = forme(plan(type, ''));
  const auto = type !== 'test' && f.mode === 'leger' ? 'leger' : '';
  const list = plan(type, auto);
  const fresh = list.find((e) => e.fresh);
  const swaps = list.filter((e) => e.swap).length;
  const names = list.slice(0, 4).map((e) => exoName(e.name)).join(' · ') + (list.length > 4 ? ' · +' + (list.length - 4) : '');
  const rec = f.mode === 'record' && !doneToday ? predictions().find((p) => list.some((e) => e.name === p.name)) : null;
  let tag = '';
  if (!doneToday && main) {
    if (auto) tag = '<button type="button" class="ready mid" data-act="forme"><i></i>' + (lightWeek() ? 'Semaine légère' : 'Forme ' + f.score + ' % · séance allégée') + '</button>';
    else if (rec) tag = '<button type="button" class="ready ok" data-act="forme"><i></i>Jour de record · ' + esc(exoName(rec.name)) + ' ' + esc(rec.text) + '</button>';
    else if (!noForme) tag = '<button type="button" class="ready ' + f.tone + '" data-act="forme"><i></i>Forme ' + f.score + ' % · ' + f.word.toLowerCase() + '</button>';
  }
  return '<section class="' + (main ? 'cta' : 'glass card') + ' hud tap" role="button" tabindex="0" data-act="prog" style="display:flex;flex-direction:column;gap:14px">'
    + (main && list.length ? '<div class="ctafig">' + figure(list[0].name) + '</div>' : '') + '<div class="col ctahead" style="gap:4px">'
    + '<span class="label violet">' + (doneToday ? 'Faite aujourd’hui · suivante' : weekLabel()) + '</span>'
    + '<span class="h1">' + esc(title(type)) + '</span>'
    + '<span class="small" style="color:var(--soft)">' + plural(list.length, 'exercice', 'exercices') + ' · environ ' + minutes(list, type === 'test') + ' min</span>'
    + (main ? '' : '<span class="small mut">' + esc(names) + '</span>')
    + (fresh ? '<span class="small gold-text">Nouveau : ' + esc(exoName(fresh.name)) + '</span>' : '')
    + (swaps ? '<span class="small" style="color:#FFB4BE">Adaptée à ta douleur</span>' : '')
    + tag + '</div>'
    + (main && !doneToday ? '<div class="why"><span class="label">Pourquoi cette séance</span>' + whyList(type, list, f, auto).slice(0, 3).map((t) => '<span class="whyl">' + esc(t) + '</span>').join('') + '<button type="button" class="whymore" data-act="prog">Tout le détail ' + ICON.chev + '</button></div>' : '')
    + weeksBar()
    + '<div class="row">' + (type === 'test' ? '' : auto ? '<button type="button" class="pill glass" data-act="prog-start" data-type="' + type + '" data-mode="normal">Normale</button>' : '<button type="button" class="pill glass" data-act="prog-start" data-type="' + type + '" data-mode="court">Courte</button>')
    + '<button type="button" class="pill gold-btn grow" data-act="prog-start" data-type="' + type + '" data-mode="' + auto + '">' + (type === 'test' ? 'Faire le re-test' : 'Commencer') + '</button></div></section>';
}

const BLOC_C = { Objectif: 'var(--gold)', 'Habileté': 'var(--violet-soft)', Force: 'var(--rouge)', 'Explosivité': 'var(--flamme)', Muscle: 'var(--gold)', Gainage: '#6FD3E8', Endurance: 'var(--vert)' };
function planList(list) {
  return '<div class="list">' + list.map((e, i) => '<button type="button" class="item" data-act="exo" data-name="' + esc(e.name) + '"><span class="num dim" style="width:20px">' + (i + 1) + '</span><div class="col grow" style="gap:2px;min-width:0">'
    + (e.bloc ? '<span class="label" style="color:' + (BLOC_C[e.bloc] || 'var(--mut)') + ';font-size:10px">' + esc(e.bloc) + '</span>' : '')
    + '<span style="font-weight:600">' + esc(e.label || exoName(e.name)) + (e.fresh ? ' <span class="small gold-text">nouveau</span>' : '') + '</span>'
    + '<span class="small mut">' + esc(e.label ? exoName(e.name) : setsSummary(e.sets) + (e.main ? ' · principal' : '')) + (e.next && e.cap ? ' · ' + e.cap + (measureOf(e.name) === 'time' ? ' s' : ' rép.') + ' pour passer à ' + esc(exoName(e.next)) : '') + (e.swap ? ' · remplace ' + esc(exoName(e.swap)) + ' (douleur)' : '') + '</span></div>' + ICON.chev + '</button>').join('') + '</div>';
}

// Fenêtre du programme : la séance du jour en détail, le cycle, et le choix d'une autre séance.
export function sheetProg(type) {
  const t = type || (testDue() ? 'test' : nextType());
  const auto = t !== 'test' && forme(plan(t, '')).mode === 'leger' ? 'leger' : '';
  const mode = ui.progMode === undefined || ui.progMode === null ? auto : ui.progMode;
  const list = plan(t, t === 'test' ? '' : mode || 'normal');
  let h = '<div class="col"><span class="label violet">' + weekLabel() + '</span><h1 class="h1">' + esc(title(t)) + '</h1>'
    + '<span class="small mut">' + esc(weekNote(t)) + '</span></div>' + weeksBar();
  h += '<section class="glass card why"><span class="label violet">Pourquoi cette séance est faite pour toi</span>' + whyList(t, list, forme(list), mode === 'leger').map((x) => '<span class="whyl">' + esc(x) + '</span>').join('') + '</section>';
  if (t !== 'test') {
    h += '<div class="modes4">' + [['court', 'Courte'], ['leger', 'Allégée'], ['', 'Normale'], ['gros', 'Grosse']].map(([m, l]) => '<button type="button" class="pill sm ' + (m === mode ? 'gold-btn' : 'glass') + '" data-act="prog-mode" data-mode="' + m + '" data-type="' + t + '">' + l + '</button>').join('') + '</div>';
    if (mode === 'leger') h += '<span class="small mut">Allégée : une série de moins sur chaque exercice. ' + (auto ? 'Conseillée aujourd’hui d’après ta forme.' : '') + '</span>';
  }
  h += '<span class="small" style="color:var(--soft)">' + plural(list.length, 'exercice', 'exercices') + ' · ' + plural(nSets(list), 'série', 'séries') + ' · environ ' + minutes(list, t === 'test') + ' min</span>'
    + planList(list);
  if (!state.active) h += '<button type="button" class="pill gold-btn wide big" data-act="prog-start" data-type="' + t + '" data-mode="' + (t === 'test' ? '' : mode || 'normal') + '">Commencer</button>';
  h += '<div class="col" style="gap:8px"><span class="label">Changer de séance</span><div class="list">'
    + order().concat(isBeginner() ? [] : ['faible'], 'test').filter((x) => x !== t).map((x) => '<button type="button" class="item" data-act="prog" data-type="' + x + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(title(x)) + '</span><span class="small mut">' + esc(x === 'test' ? 'Tes max, pour mettre à jour tes lettres' : TYPES[x].desc) + '</span></div>' + ICON.chev + '</button>').join('')
    + '</div><span class="small mut">' + (isBeginner() ? 'Le programme débutant tourne : haut du corps, bas du corps, tout le corps.' : 'Pensé pour être fort partout, sur 4 séances et une course par semaine. Quatre séances tournent : pompes, jambes, dips, complet. Chacune commence par une figure (quand tu es frais), puis la force, l’explosivité, le muscle et le gainage. Une fois par semaine, la séance « point faible » cible ta qualité la plus basse, et la course du dimanche travaille la vitesse.') + ' Un cycle dure 4 semaines : 3 semaines où ça monte, puis le re-test. Tu peux changer de niveau dans les Réglages.</span></div>'
    + '<button type="button" class="pill sm glass wide" data-act="close" style="color:var(--mut)">Fermer</button>';
  sheet(h);
}

Object.assign(ACTIONS, {
  prog: (el) => { if (!el.dataset.type) ui.progMode = null; sheetProg(el.dataset.type); },
  'prog-mode': (el) => { ui.progMode = el.dataset.mode; sheetProg(el.dataset.type); },
});
