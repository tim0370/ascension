// Données de l'app : sauvegarde dans le téléphone (localStorage), XP, import Hevy, export.
// Une séance : { id, title, start, end, prs, exercises: [{ name, sets: [{ r, w, t, d, done }] }] }
//   r = répétitions, w = charge (kg), t = durée (secondes), d = distance (km). start/end en millisecondes.
import { EXOS, ROUTINES, ALIAS } from './data.js';

const KEY = 'ascension.v1';

export const state = load();
migrate();

// Regroupe les variantes d'un même exercice (avec ou sans lest) sous un seul nom, voir ALIAS dans data.js.
function canon(o) {
  if (!o || !o.exercises) return;
  const out = [];
  for (const e of o.exercises) {
    const name = ALIAS[e.name] || e.name;
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
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}

// Renvoie { added, skipped } ; ne crée pas de doublon si on importe deux fois le même fichier.
export function importHevy(text) {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const head = rows.shift() || [];
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
    const wkg = num(r[col('weight_kg')]), reps = num(r[col('reps')]), d = num(r[col('distance_km')]), t = num(r[col('duration_seconds')]);
    if (wkg) s.w = wkg;
    if (reps) s.r = reps;
    if (d) s.d = d;
    if (t) s.t = t;
    ex.sets.push(s);
  }
  for (const w of map.values()) canon(w);
  let added = 0, skipped = 0;
  for (const [key, w] of map) {
    if (known.has(key)) { skipped += 1; continue; }
    state.workouts.push(w);
    added += 1;
  }
  save();
  return { added, skipped };
}

// ---------- Sauvegarde complète ----------
export function exportJson() { return JSON.stringify({ app: 'ascension', version: 1, exported: Date.now(), workouts: state.workouts, settings: state.settings, quests: state.quests, routines: state.routines, prefs: state.prefs, body: state.body, rankSeen: state.rankSeen, feats: state.feats, goals: state.goals, prog: state.prog, rankV: state.rankV, measures: state.measures }); }
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
