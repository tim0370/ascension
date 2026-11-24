// Données de l'app : sauvegarde dans le téléphone (localStorage), XP, import Hevy, export.
// Une séance : { id, title, start, end, prs, exercises: [{ name, sets: [{ r, w, t, d, done }] }] }
//   r = répétitions, w = charge (kg), t = durée (secondes), d = distance (km). start/end en millisecondes.
import { EXOS, ROUTINES, ALIAS, AKA } from './data.js';

const KEY = 'ascension.v1';

export const state = load();
// migrate() est lancé tout en bas du fichier, une fois toutes les fonctions et tables prêtes.

// Hevy en français : « Pompes », « Dips », « Course à pied »… On retrouve l'exercice du catalogue par son nom affiché.
const plain = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/\((lestees|leste|lestee|lestes|weighted|avec lest|poids du corps|bodyweight)\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const SYN = { 'pompe': 'Push Up', 'pompes classiques': 'Push Up', 'dips triceps': 'Triceps Dip', 'dip': 'Triceps Dip', 'dips lestes': 'Triceps Dip', 'course': 'Running', 'course a pied': 'Running', 'footing': 'Running', 'jogging': 'Running', 'planche': 'Plank', 'gainage': 'Plank', 'squat pistol': 'Pistol Squat', 'pistol': 'Pistol Squat', 'squat': 'Squat (Bodyweight)', 'squats': 'Squat (Bodyweight)', 'burpees': 'Burpee', 'fente': 'Lunge', 'fentes': 'Lunge', 'pompes pike': 'Pike Pushup', 'pompe pike': 'Pike Pushup' };
let FRMAP = null;
export function frenchName(name) {
  if (EXOS[name] || ALIAS[name]) return null;
  if (!FRMAP) {
    FRMAP = {}; LOOSE = {};
    const put = (key, v) => {
      for (const k of [key, key.replace(/s/g, '')]) FRMAP[k] = FRMAP[k] || v;
      const l = loose(key); if (l) LOOSE[l] = LOOSE[l] === undefined ? v : LOOSE[l] === v ? v : null; // null = ambigu
    };
    for (const k of Object.keys(SYN)) put(k, SYN[k]);
    for (const k of Object.keys(EXOS)) if (!EXOS[k].old) { put(plain(EXOS[k].fr), k); put(plain(k), k); for (const a of AKA[k] || []) put(plain(a), k); }
    for (const k of Object.keys(EXOS)) { put(plain(EXOS[k].fr), k); put(plain(k), k); }
  }
  const p = plain(name);
  const hit = FRMAP[p] || FRMAP[p.replace(/s/g, '')];
  if (hit) return hit;
  // Second essai, plus large : sans le matériel entre parenthèses ni les petits mots (« Pompe en pique (poids du corps) »).
  const l = loose(name);
  return (l && LOOSE[l]) || null;
}
// Version « large » d'un nom : sans parenthèses, sans matériel ni petits mots, au singulier, mots triés.
let LOOSE = null;
const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'en', 'a', 'au', 'aux', 'sur', 'avec', 'et', 'un', 'une', 'haltere', 'dumbbell', 'poids', 'corps', 'bodyweight', 'machine', 'leste', 'weighted']);
function loose(x) {
  const w = plain(String(x).replace(/\([^)]*\)/g, ' ')).replace(/push up/g, 'pushup').split(' ')
    .map((m) => (m.length > 3 ? m.replace(/[sx]$/, '') : m)).filter((m) => m && !STOP.has(m));
  return w.sort().join(' ');
}

// Regroupe les variantes d'un même exercice (avec ou sans lest) sous un seul nom, voir ALIAS dans data.js.
function canon(o) {
  if (!o || !o.exercises) return;
  const out = [];
  for (const e of o.exercises) {
    const name = ALIAS[e.name] || frenchName(e.name) || e.name;
    const same = out.find((x) => x.name === name);
    if (same && (ALIAS[e.name] || same.merged)) { same.sets.push(...e.sets); if (same.goals) delete same.goals; continue; }
    out.push(Object.assign({}, e, { name, merged: !!ALIAS[e.name] }));
  }
  for (const e of out) delete e.merged;
  o.exercises = out;
}

// Mise à niveau des données déjà enregistrées dans le téléphone (une seule fois par version).
function migrate() {
  const v = state.v || 1;
  if (v < 2) {
    for (const w of state.workouts) canon(w);
    for (const r of state.routines || []) canon(r);
    canon(state.active);
  }
  // v3 : nouvelle règle des records, recalculée pour les séances faites dans l'app.
  if (v < 3) for (const w of state.workouts) if (w.src !== 'hevy') w.prs = countPrs(w);
  if (v < 3) { state.v = 3; save(); }
  // Séances importées de Hevy avant que l'app les marque : leur identifiant commence par h suivi de la date.
  let fixed = false;
  for (const w of state.workouts) if (!w.src && /^h\d{9,}/.test(String(w.id))) { w.src = 'hevy'; fixed = true; }
  // v36 : noms d'exercices en français venus de Hevy, reliés au catalogue (une fois).
  if (v < 4) {
    for (const w of state.workouts) if (w.exercises.some((e) => frenchName(e.name))) { canon(w); fixed = true; }
    for (const r of state.routines || []) canon(r);
    state.v = 4; fixed = true;
  }
  if ((state.v || 0) < 5) {
    // v41 : beaucoup plus de noms reconnus (noms Hevy en français, « Pompe en pique », « Développé militaire »…).
    const moved = {};
    for (const w of state.workouts) for (const e of w.exercises || []) { const n = frenchName(e.name); if (n) moved[e.name] = n; }
    for (const w of state.workouts) if ((w.exercises || []).some((e) => moved[e.name])) canon(w);
    for (const r of state.routines || []) canon(r);
    // Les réglages d'un exercice (lest, repos…) suivent son nouveau nom.
    const prefs = state.prefs || {};
    for (const [a, b] of Object.entries(moved)) if (prefs[a]) { prefs[b] = Object.assign({}, prefs[a], prefs[b] || {}); delete prefs[a]; }
    state.v = 5; fixed = true;
  }
  if ((state.v || 0) < 6) {
    // v42 : son développé militaire se fait ASSIS. La v41 l'avait relié à la version debout : on le remet.
    const A = 'Overhead Press (Dumbbell)', B = 'Seated Overhead Press (Dumbbell)';
    const move = (o) => {
      if (!o || !Array.isArray(o.exercises)) return;
      const src = o.exercises.find((e) => e.name === A);
      if (!src) return;
      const dst = o.exercises.find((e) => e.name === B);
      if (dst) { dst.sets.push(...src.sets); o.exercises.splice(o.exercises.indexOf(src), 1); } else src.name = B;
    };
    for (const w of state.workouts) move(w);
    for (const r of state.routines || []) move(r);
    move(state.active);
    const prefs = state.prefs || {};
    if (prefs[A]) { prefs[B] = Object.assign({}, prefs[A], prefs[B] || {}); delete prefs[A]; }
    state.v = 6; fixed = true;
  }
  if ((state.v || 0) < 7) {
    // v44 : boxe et étirements ajoutés au catalogue : on relie les noms d'avant qui correspondent.
    const moved = {};
    for (const w of state.workouts) for (const e of w.exercises || []) { const n = frenchName(e.name); if (n) moved[e.name] = n; }
    for (const w of state.workouts) if ((w.exercises || []).some((e) => moved[e.name])) canon(w);
    for (const r of state.routines || []) canon(r);
    const prefs = state.prefs || {};
    for (const [a, b] of Object.entries(moved)) if (prefs[a]) { prefs[b] = Object.assign({}, prefs[a], prefs[b] || {}); delete prefs[a]; }
    state.v = 7; fixed = true;
  }
  if (fixed) save();
}

function load() {
  const base = { workouts: [], active: null, settings: { rest: 90 }, quests: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(base, JSON.parse(raw));
  } catch (e) { /* stockage indisponible : on démarre à vide */ }
  return base;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* stockage plein ou bloqué */ }
}

// Séances venues de Hevy (marquées, ou déjà importées avant la v34)
export const isHevy = (w) => w.src === 'hevy' || /^h\d{9,}/.test(String(w.id));

// Exercices de l'historique absents du catalogue : ils ne comptent ni comme pompes, ni comme dips, ni dans les qualités.
export function unknownExos() {
  const m = {};
  for (const w of state.workouts) for (const e of w.exercises) if (!EXOS[e.name]) { const x = m[e.name] || (m[e.name] = { name: e.name, sets: 0, n: 0, last: 0 }); x.sets += e.sets.length; x.n += 1; x.last = Math.max(x.last, w.start); }
  return Object.values(m).sort((a, b) => b.sets - a.sets);
}
// Meilleure supposition pour un nom inconnu : le plus de mots en commun avec un nom du catalogue.
export function guessExo(name) {
  const w = plain(name).split(' ').filter((x) => x.length > 2).map((x) => x.replace(/s$/, ''));
  let best = null, bs = 0;
  for (const k of Object.keys(EXOS)) {
    if (EXOS[k].old) continue;
    const v = plain(EXOS[k].fr + ' ' + k + ' ' + (AKA[k] || []).join(' ')).split(' ').map((x) => x.replace(/s$/, ''));
    const sc = w.filter((x) => v.includes(x)).length / Math.max(w.length, 1);
    if (sc > bs) { bs = sc; best = k; }
  }
  return bs >= 0.5 ? best : null;
}
// Relie un exercice inconnu à un exercice du catalogue, dans toutes les séances (et les routines).
export function renameExo(from, to) {
  const fix = (o) => { if (!o || !o.exercises) return; for (const e of o.exercises) if (e.name === from) e.name = to; canon(o); };
  for (const w of state.workouts) fix(w);
  for (const r of state.routines || []) fix(r);
  fix(state.active);
  if (state.prefs && state.prefs[from] && !state.prefs[to]) state.prefs[to] = state.prefs[from];
  save();
}

// ---------- Exercices ----------
export function exoName(name) { return (EXOS[name] && EXOS[name].fr) || name; }

export function lastSets(name, before) {
  for (const w of sorted()) {
    if (before && w.start >= before) continue;
    const ex = w.exercises.find((e) => e.name === name);
    if (ex && ex.sets.length) return ex.sets;
  }
  return null;
}

// Réglages par exercice choisis par l'utilisateur : { measure: 'reps' | 'time', lest: true | false, rest: secondes }
export function prefOf(name) { return (state.prefs && state.prefs[name]) || {}; }
export function setPref(name, patch) { state.prefs = state.prefs || {}; state.prefs[name] = Object.assign({}, state.prefs[name], patch); save(); }

// Un exercice se compte en répétitions ou en secondes : ton réglage d'abord, sinon ce que tu as noté la dernière fois, sinon le catalogue.
export function measureOf(name) {
  const p = prefOf(name);
  if (p.measure) return p.measure;
  const s = lastSets(name);
  if (s && s[0]) { if (s[0].t && !s[0].r) return 'time'; if (s[0].r) return 'reps'; }
  return EXOS[name] && EXOS[name].kind === 'time' ? 'time' : 'reps';
}
// Le lest est facultatif pour tous les exercices.
export function lestOf(name) {
  const p = prefOf(name);
  if (typeof p.lest === 'boolean') return p.lest;
  const s = lastSets(name);
  if (s) return s.some((x) => x.w > 0);
  return !!(EXOS[name] && EXOS[name].kind === 'weight');
}
export function restOf(name) { return prefOf(name).rest || state.settings.rest || 90; }
export function kindOf(name) {
  if (name === 'Running') return 'run';
  if (measureOf(name) === 'time') return 'time';
  return lestOf(name) ? 'weight' : 'reps';
}

export function sorted() { return [...state.workouts].sort((a, b) => b.start - a.start); }

export function runs() {
  const out = [];
  for (const w of sorted()) for (const e of w.exercises) if (e.name === 'Running') {
    for (const s of e.sets) if (s.d > 0) out.push({ id: w.id, date: w.start, d: s.d, t: s.t || 0 });
  }
  return out;
}

// ---------- XP, niveaux, rangs ----------
export function xpOf(w) {
  let sets = 0, km = 0;
  for (const e of w.exercises) for (const s of e.sets) {
    if (e.name === 'Running') km += s.d || 0; else sets += 1;
  }
  return sets * 10 + Math.round(km * 20) + (w.quick ? 0 : 50) + (w.prs || 0) * 25 + (w.boss && w.boss.win ? 300 : 0);
}

export function totalXp() {
  let n = state.workouts.reduce((k, w) => k + xpOf(w), 0);
  for (const day of Object.values(state.quests || {})) for (const xp of Object.values(day)) n += xp;
  n += Object.keys(state.feats || {}).length * 100; // hauts faits
  n += (state.goals || []).filter((g) => g.done).length * 150; // objectifs atteints (objectifs.js)
  return n;
}

// Les quêtes du jour sont dans quetes.js (state.quests garde l'XP gagnée, jour par jour).

function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

// Jours de la semaine en cours (lundi à dimanche) : entraîné ou non.
export function weekDays() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const trained = new Set(state.workouts.map((w) => dayKey(new Date(w.start))));
  return ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((letter, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return { letter, start: d.getTime(), done: trained.has(dayKey(d)), today: dayKey(d) === dayKey(now) };
  });
}

// D'où vient l'XP : séries, séances, course, records, quêtes.
export function xpBreakdown() {
  const b = { sets: 0, sessions: state.workouts.filter((w) => !w.quick).length, km: 0, prs: 0, quests: 0, questXp: 0 };
  for (const w of state.workouts) {
    b.prs += w.prs || 0;
    for (const e of w.exercises) for (const x of e.sets) { if (e.name === 'Running') b.km += x.d || 0; else b.sets += 1; }
  }
  for (const day of Object.values(state.quests || {})) for (const xp of Object.values(day)) { b.quests += 1; b.questXp += xp; }
  return b;
}

// Historique d'un exercice (du plus récent au plus ancien), série avec le plus de répétitions et série la plus lourde.
export function exoHistory(name) {
  const list = [];
  let most = null, heavy = null;
  for (const w of sorted()) {
    const ex = w.exercises.find((e) => e.name === name);
    if (!ex || !ex.sets.length) continue;
    list.push({ id: w.id, date: w.start, title: w.title, sets: ex.sets });
    for (const s of ex.sets) {
      if (!most || amount(s) > amount(most.set) || (amount(s) === amount(most.set) && (s.w || 0) > (most.set.w || 0))) most = { set: s, date: w.start };
      if (s.w && (!heavy || s.w > heavy.set.w || (s.w === heavy.set.w && amount(s) > amount(heavy.set)))) heavy = { set: s, date: w.start };
    }
  }
  return { list, most, heavy };
}

// ---------- Routines (modifiables) ----------
// Créées une première fois à partir de data.js, puis enregistrées avec le reste.
export function routines() {
  if (!state.routines) {
    state.routines = ROUTINES.map((r, i) => ({ id: 'rt' + i, title: r.title, label: r.label, exercises: r.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ r: s.r || 0, w: s.w || 0, t: s.t || 0 })) })) }));
    for (const r of state.routines) canon(r);
    save();
  }
  return state.routines;
}

export function totals() {
  let sets = 0, km = 0;
  for (const w of state.workouts) for (const e of w.exercises) for (const x of e.sets) { if (e.name === 'Running') km += x.d || 0; else sets += 1; }
  return { sessions: state.workouts.length, sets, km };
}

// Passer du niveau L au niveau L+1 coûte 200 + 50 × L points.
export function levelInfo(xp) {
  let level = 1, rest = xp;
  while (rest >= 200 + 50 * level) { rest -= 200 + 50 * level; level += 1; }
  const need = 200 + 50 * level;
  return { level, into: rest, need }; // le rang, lui, vient des épreuves (stats.js)
}

// Semaines d'affilée avec au moins une séance (la semaine en cours ne casse pas la série).
export function weekStreak() {
  const weeks = new Set(state.workouts.map((w) => weekKey(w.start)));
  let n = 0;
  const d = new Date();
  if (!weeks.has(weekKey(d.getTime()))) d.setDate(d.getDate() - 7);
  while (weeks.has(weekKey(d.getTime()))) { n += 1; d.setDate(d.getDate() - 7); }
  return n;
}
function weekKey(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi de la semaine
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

// Une série est un record si tu n'as jamais fait autant (répétitions ou secondes) avec un lest égal ou plus lourd.
// Exemple : 40 pompes sans lest est un record même si tu as déjà fait 6 pompes avec 20 kg.
function amount(s) { return s.r || s.t || 0; }
export function isRecord(name, s, before, skipId) {
  const a = amount(s), w = s.w || 0;
  if (!a) return false;
  let seen = false;
  for (const o of state.workouts) {
    if (o.id === skipId || (before && o.start >= before)) continue;
    for (const e of o.exercises) {
      if (e.name !== name) continue;
      for (const x of e.sets) { seen = true; if ((x.w || 0) >= w && amount(x) >= a) return false; }
    }
  }
  return seen; // la toute première fois d'un exercice ne compte pas comme un record
}

// Marque les séries record d'une séance (s.pr) et compte les exercices concernés (w.prs).
export function countPrs(w) {
  let n = 0;
  for (const e of w.exercises) {
    if (e.name === 'Running') continue;
    let any = false;
    for (const s of e.sets) { if (isRecord(e.name, s, w.start, w.id)) { s.pr = true; any = true; } else delete s.pr; }
    if (any) n += 1;
  }
  return n;
}

// ---------- Affichage ----------
export const fr = (n, dec = 2) => String(Math.round(n * 10 ** dec) / 10 ** dec).replace('.', ',');
export function dur(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return h + ' h ' + String(m).padStart(2, '0');
  if (m) return m + ' min' + (s ? ' ' + String(s).padStart(2, '0') : '');
  return s + ' s';
}
export function clock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}
export function pace(km, sec) {
  if (!km || !sec) return '';
  const p = Math.round(sec / km);
  return Math.floor(p / 60) + "'" + String(p % 60).padStart(2, '0') + ' par km';
}
export function dateFr(ms, withYear) {
  const o = { weekday: 'short', day: 'numeric', month: 'short' };
  if (withYear) o.year = 'numeric';
  return new Date(ms).toLocaleDateString('fr-FR', o);
}
export function setText(s) {
  if (s.d && s.t) return fr(s.d) + ' km en ' + dur(s.t);
  if (s.t && !s.r) return dur(s.t);
  if (s.w && !s.r) return fr(s.w, 1) + ' kg' + (s.d ? ' sur ' + Math.round(s.d * 1000) + ' m' : '');
  return (s.r || 0) + (s.w ? ' × ' + fr(s.w, 1) + ' kg' : ' rép.');
}

// Texte d'une séance, prêt à coller dans une conversation avec Claude.
export function workoutText(w) {
  const lines = ['Séance : ' + w.title.replace(/\s+/g, ' ') + ' — ' + dateFr(w.start, true) + (w.end > w.start ? ', ' + dur((w.end - w.start) / 1000) : '')];
  w.exercises.forEach((e, i) => {
    if (e.name === 'Running') {
      for (const s of e.sets) lines.push((i + 1) + '. Course à pied : ' + fr(s.d) + ' km en ' + dur(s.t || 0) + ' (' + pace(s.d, s.t) + ')');
    } else {
      lines.push((i + 1) + '. ' + exoName(e.name) + ' : ' + e.sets.map(setText).join(', ') + (e.note ? ' (note : ' + e.note + ')' : ''));
    }
  });
  if (w.feel) lines.push('Ressenti : ' + w.feel);
  return lines.join('\n');
}

// ---------- Import Hevy (fichier workouts.csv) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const MONTHS = [['jan', 0], ['fev', 1], ['feb', 1], ['mar', 2], ['avr', 3], ['apr', 3], ['mai', 4], ['may', 4], ['juil', 6], ['jul', 6], ['jui', 5], ['jun', 5], ['aou', 7], ['aug', 7], ['sep', 8], ['oct', 9], ['nov', 10], ['dec', 11]];
function parseDate(s) {
  const m = /(\d{1,2})\s+(\S+?)\.?,?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(s || '');
  if (m) {
    const key = m[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const hit = MONTHS.find((x) => key.startsWith(x[0]));
    if (hit) return new Date(+m[3], hit[1], +m[1], +m[4], +m[5]).getTime();
  }
  // 2026-11-23 18:45(:00) : Safari (iPhone) ne sait pas lire cette forme seul.
  const iso = /(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(s || '');
  if (iso) return new Date(+iso[1], iso[2] - 1, +iso[3], +iso[4], +iso[5]).getTime();
  // 23/11/2026 18:45 ou 11/23/2026 6:45 PM
  const sl = /(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(s || '');
  if (sl) {
    let d = +sl[1], mo = +sl[2], h = +sl[4];
    if (sl[6] || mo > 12) { const x = d; d = mo; mo = x; }
    if (sl[6]) h = (h % 12) + (/p/i.test(sl[6]) ? 12 : 0);
    return new Date(+sl[3], mo - 1, d, h, +sl[5]).getTime();
  }
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}

// Renvoie { added, skipped } ; ne crée pas de doublon si on importe deux fois le même fichier.
export function importHevy(text) {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  const col = (n) => head.indexOf(n);
  const need = ['title', 'start_time', 'exercise_title'];
  if (need.some((n) => col(n) < 0)) throw new Error("Ce fichier ne ressemble pas à un export Hevy (workouts.csv).");
  const num = (v) => (v === '' || v == null ? 0 : parseFloat(v) || 0);
  const known = new Set(state.workouts.map((w) => w.title + '|' + w.start));
  const map = new Map();
  for (const r of rows) {
    if (r.length < head.length) continue;
    const start = parseDate(r[col('start_time')]);
    if (start == null) continue;
    const key = r[col('title')] + '|' + start;
    if (!map.has(key)) {
      map.set(key, { id: 'h' + start + '-' + map.size, title: r[col('title')], start, end: parseDate(r[col('end_time')]) || start, exercises: [], src: 'hevy' });
    }
    const w = map.get(key);
    const name = r[col('exercise_title')];
    let ex = w.exercises[w.exercises.length - 1];
    if (!ex || ex.name !== name) { ex = { name, sets: [] }; w.exercises.push(ex); }
    const s = { done: true };
    if (col('set_type') >= 0 && /warm/i.test(r[col('set_type')])) continue; // séries d'échauffement : pas comptées
    const wkg = col('weight_kg') >= 0 ? num(r[col('weight_kg')]) : Math.round(num(r[col('weight_lbs')]) * 0.4536 * 10) / 10;
    const reps = num(r[col('reps')]), t = num(r[col('duration_seconds')]);
    const d = col('distance_km') >= 0 ? num(r[col('distance_km')]) : Math.round(num(r[col('distance_miles')]) * 1.609 * 100) / 100;
    if (!wkg && !reps && !d && !t) continue;
    if (wkg) s.w = wkg;
    if (reps) s.r = reps;
    if (d) s.d = d;
    if (t) s.t = t;
    ex.sets.push(s);
  }
  for (const w of map.values()) canon(w);
  let added = 0, skipped = 0;
  const mine = state.workouts.filter((w) => !isHevy(w)).map((w) => w.start);
  for (const [key, w] of map) {
    // Déjà là, ou même séance notée aussi dans Ascension (moins de 90 minutes d'écart) : pas de doublon.
    if (known.has(key) || mine.some((t) => Math.abs(t - w.start) < 90 * 60000)) { skipped += 1; continue; }
    if (!w.exercises.length) continue;
    state.workouts.push(w);
    added += 1;
  }
  save();
  const first = Math.min(...[...map.values()].map((w) => w.start));
  return { added, skipped, first: isFinite(first) ? first : 0 };
}

// ---------- Sauvegarde complète ----------
export function exportJson() { return JSON.stringify({ app: 'ascension', version: 1, exported: Date.now(), workouts: state.workouts, settings: state.settings, quests: state.quests, routines: state.routines, prefs: state.prefs, body: state.body, rankSeen: state.rankSeen, feats: state.feats, goals: state.goals, prog: state.prog, rankV: state.rankV, measures: state.measures, checkins: state.checkins, pains: state.pains, food: state.food }); }
export function importJson(text) {
  const data = JSON.parse(text);
  if (!data || data.app !== 'ascension' || !Array.isArray(data.workouts)) throw new Error("Ce fichier n'est pas une sauvegarde de l'app.");
  const known = new Set(state.workouts.map((w) => w.id));
  let added = 0;
  for (const w of data.workouts) if (!known.has(w.id)) { canon(w); state.workouts.push(w); added += 1; }
  if (data.settings) Object.assign(state.settings, data.settings);
  if (data.quests) state.quests = Object.assign({}, data.quests, state.quests);
  if (data.routines && !state.routines) { state.routines = data.routines; for (const r of state.routines) canon(r); }
  if (data.prefs) state.prefs = Object.assign({}, data.prefs, state.prefs);
  if (data.body && !(state.body && state.body.length)) state.body = data.body;
  // Ajouts des versions 20 et plus : hauts faits, objectifs, cycle du programme, mensurations.
  if (data.feats) state.feats = Object.assign({}, data.feats, state.feats);
  if (Array.isArray(data.goals)) { const ids = new Set((state.goals || []).map((g) => g.id)); state.goals = (state.goals || []).concat(data.goals.filter((g) => !ids.has(g.id))); }
  if (data.prog && (!state.prog || added >= state.workouts.length - added)) state.prog = data.prog;
  if (data.rankV) state.rankV = data.rankV;
  if (data.checkins && typeof data.checkins === 'object') state.checkins = Object.assign({}, data.checkins, state.checkins);
  if (data.food && typeof data.food === 'object') state.food = Object.assign({}, data.food, state.food);
  if (Array.isArray(data.measures)) { const k = new Set((state.measures || []).map((m) => m.d + m.k)); state.measures = (state.measures || []).concat(data.measures.filter((m) => !k.has(m.d + m.k))); }
  save();
  return { added };
}

// ---------- Objectif de la semaine ----------
export function weekGoal() { return state.settings.weekGoal || 4; }
export function weekQuest() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
  // Ce n'est plus une quête (ça se fait tout seul) : juste ton objectif de la semaine. Les boss ne comptent pas comme séance.
  const cur = state.workouts.filter((w) => w.start >= monday && !w.boss && !w.quick).length;
  const goal = weekGoal();
  return { id: 'week', label: goal + ' séances cette semaine', cur: Math.min(cur, goal), goal, done: cur >= goal, unit: 'séances' };
}

// Mise à niveau des données, en dernier : elle utilise des tables définies plus haut (noms français…).
// Filet de sécurité : une séance abîmée (liste d'exercices ou de séries manquante) ne doit jamais bloquer l'app.
try {
  if (!Array.isArray(state.workouts)) state.workouts = [];
  state.workouts = state.workouts.filter((w) => w && typeof w === 'object' && Number.isFinite(Number(w.start)));
  for (const w of state.workouts) {
    w.start = Number(w.start);
    if (!Array.isArray(w.exercises)) w.exercises = [];
    w.exercises = w.exercises.filter((e) => e && typeof e === 'object' && e.name);
    for (const e of w.exercises) { e.name = String(e.name); if (!Array.isArray(e.sets)) e.sets = []; e.sets = e.sets.filter((x) => x && typeof x === 'object'); }
  }
} catch (e) { console.error('nettoyage', e); }
try { migrate(); } catch (e) { console.error('migrate', e); }
