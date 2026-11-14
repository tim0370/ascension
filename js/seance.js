// Tout ce qui concerne une séance : routines, échauffement, vue d'ensemble, exercice en grand,
// repos, choix et fiche d'un exercice, modification d'une routine ou d'une séance passée, bilan de fin.
import { EXOS, FICHES, WARMUP } from './data.js';
import {
  state, save, exoName, lastSets, kindOf, sorted, xpOf, totalXp, levelInfo, countPrs, isRecord,
  fr, dur, clock, dateFr, setText, dailyQuests, exoHistory, routines, measureOf, lestOf, restOf, setPref,
} from './store.js';
import { $, esc, norm, clean, plural, toNum, ui, ACTIONS, ICON, checkDark, toast, sheet, closeSheet, closeSheet2, closeBtn, burst, setsSummary, chartSvg } from './ui.js';
import { render, sheetDetail } from './app.js';

const curExo = () => state.active && state.active.exercises[state.active.idx];
const curSet = () => { const ex = curExo(); return ex && ex.sets[state.active.setIdx]; };
const exDone = (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done);
const firstTodo = (ex) => { const i = ex.sets.findIndex((s) => !s.done); return i < 0 ? Math.max(0, ex.sets.length - 1) : i; };
const chipLabel = (name, s) => (measureOf(name) === 'time' ? (s.t || 0) + ' s' : String(s.r || 0));
const top = () => window.scrollTo(0, 0);

// ---------- Routines ----------
// La routine à proposer : celle qui n'a pas été faite la dernière fois.
export function nextRoutine() {
  const all = routines();
  if (!all.length) return null;
  const last = sorted().find((w) => all.some((r) => norm(r.title) === norm(w.title)));
  if (!last) return all[0];
  const i = all.findIndex((r) => norm(r.title) === norm(last.title));
  return all[(i + 1) % all.length];
}

// Durée habituelle d'une routine, d'après la dernière fois.
export function usualTime(r) {
  const last = sorted().find((w) => norm(w.title) === norm(r.title) && w.end > w.start);
  return last ? 'environ ' + dur(Math.round((last.end - last.start) / 300000) * 300) : plural(r.exercises.reduce((n, e) => n + e.sets.length, 0), 'série', 'séries');
}

export function sheetRoutine(id) {
  const r = routines().find((x) => x.id === id);
  if (!r) return;
  const last = sorted().find((w) => norm(w.title) === norm(r.title));
  const count = state.workouts.filter((w) => norm(w.title) === norm(r.title)).length;
  const warm = !!state.settings.warm;
  let h = '<div class="col"><span class="label">' + plural(r.exercises.length, 'exercice', 'exercices') + ' · ' + usualTime(r) + '</span><h1 class="h1">' + esc(r.label) + '</h1>'
    + '<span class="small mut">' + (last ? 'Faite ' + count + ' fois · dernière fois ' + dateFr(last.start) : 'Jamais faite pour le moment') + '</span></div><div class="list">'
    + r.exercises.map((e, i) => '<button type="button" class="item" data-act="exo" data-name="' + esc(e.name) + '"><span class="num dim" style="width:20px">' + (i + 1) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(e.name)) + '</span><span class="small mut">' + esc(setsSummary(e.sets)) + '</span></div>' + ICON.chev + '</button>').join('')
    + '</div>' + (r.exercises.length ? '' : '<span class="mut">Cette routine est vide, ajoute des exercices.</span>');
  if (!state.active && r.exercises.length) {
    h += '<button type="button" class="pill sm glass wide' + (warm ? ' on' : '') + '" data-act="toggle-warm" data-id="' + esc(r.id) + '">' + (warm ? 'Échauffement guidé : oui' : 'Échauffement guidé : non') + '</button>'
      + '<div class="row"><button type="button" class="pill glass grow" data-act="start" data-id="' + esc(r.id) + '" data-express="1">Express</button>'
      + '<button type="button" class="pill gold-btn grow" data-act="start" data-id="' + esc(r.id) + '">Commencer</button></div>'
      + '<span class="small mut" style="text-align:center">Express : la même séance en version courte, quand tu n’as pas le temps.</span>';
  }
  h += '<div class="row"><button type="button" class="pill sm glass grow" data-act="edit-routine" data-id="' + esc(r.id) + '">Modifier</button><button type="button" class="pill sm glass grow" data-act="close" style="color:var(--mut)">Fermer</button></div>';
  sheet(h);
}

// ---------- Démarrer ----------
// Prépare un exercice pour la séance : valeurs de la dernière fois, et un objectif un cran au-dessus.
function buildExo(name, sets, title) {
  const last = title && sorted().find((w) => norm(w.title) === norm(title) && w.exercises.some((e) => e.name === name));
  const prev = last ? last.exercises.find((e) => e.name === name).sets : lastSets(name);
  const time = measureOf(name) === 'time';
  return {
    name,
    sets: sets.map((s, i) => { const p = (prev && prev[i]) || s; return { r: time ? 0 : (p.r || s.r || 0), w: p.w || s.w || 0, t: time ? (p.t || s.t || 0) : 0, done: false }; }),
    goals: sets.map((s, i) => { const p = prev && (prev[i] || prev[prev.length - 1]); if (!p) return null; if (time) return p.t ? { t: p.t + 5 } : null; return p.r ? { r: p.r + 1 } : null; }),
    prev: prev ? prev.map(setText).join(', ') : '',
    // La note laissée la dernière fois sur cet exercice revient toute seule.
    note: (() => { const w = sorted().find((x) => x.exercises.some((e) => e.name === name && e.note)); return w ? w.exercises.find((e) => e.name === name && e.note).note : ''; })(),
  };
}

// opts.express : version courte (2 séries sur les 4 premiers exercices, 1 sur les autres).
export function startWorkout(id, opts) {
  const o = opts || {};
  const routine = routines().find((r) => r.id === id);
  const a = { title: routine ? routine.title : 'Séance libre', label: routine ? routine.label : 'Séance libre', routineId: routine ? routine.id : null, start: Date.now(), view: 'list', idx: 0, setIdx: 0, exercises: [], rest: null };
  if (routine) {
    a.exercises = routine.exercises.map((e, i) => buildExo(e.name, o.express ? e.sets.slice(0, i < 4 ? 2 : 1) : e.sets, routine.title));
    if (o.express) { a.express = true; a.label += ' · express'; }
    if (state.settings.warm) a.warm = { i: 0, end: Date.now() + WARMUP[0].secs * 1000 };
  }
  state.active = a;
  save();
  closeSheet();
  ui.tab = 'workout';
  ui.enter = true;
  keepAwake();
  render();
  top();
}

// ---------- Écrans de séance ----------
export function viewWorkout() {
  const a = state.active;
  if (!a) {
    let h = '<div class="col" style="gap:2px"><span class="small mut">Choisis ta séance</span><h1 class="h1">Séance</h1></div>';
    for (const r of routines()) {
      h += '<section class="glass card row tap" role="button" tabindex="0" data-act="routine" data-id="' + esc(r.id) + '"><div class="col grow"><span class="h2">' + esc(r.label) + '</span>'
        + '<span class="small mut">' + plural(r.exercises.length, 'exercice', 'exercices') + ' · ' + usualTime(r) + '</span></div>'
        + '<button type="button" class="pill gold-btn" data-act="start" data-id="' + esc(r.id) + '">Commencer</button></section>';
    }
    h += '<div class="row"><button type="button" class="pill glass grow" data-act="new-routine">Nouvelle routine</button><button type="button" class="pill glass grow" data-act="start" data-id="">Séance libre</button></div>'
      + '<span class="small mut" style="text-align:center">Touche une routine pour voir ses exercices, la modifier ou lancer la version express.</span>';
    return h;
  }
  if (a.warm) return viewWarmup(a);
  a.idx = Math.max(0, Math.min(a.idx || 0, a.exercises.length - 1));
  return a.view === 'focus' && a.exercises.length ? viewFocus(a) : viewList(a);
}

function viewWarmup(a) {
  const m = WARMUP[a.warm.i];
  return '<div class="row between"><div class="col" style="gap:2px"><span class="small mut">' + esc(a.label) + '</span><h1 class="h1">Échauffement</h1></div><button type="button" class="pill sm glass" data-act="warm-skip">Passer</button></div>'
    + '<div class="seg">' + WARMUP.map((x, i) => '<i class="' + (i <= a.warm.i ? 'on' : '') + '"></i>').join('') + '</div>'
    + '<section class="glass card hud col center" style="border-radius:32px;padding:34px 20px;gap:12px"><span class="label violet">Mouvement ' + (a.warm.i + 1) + ' sur ' + WARMUP.length + '</span>'
    + '<span class="h1" style="font-size:30px">' + esc(m.name) + '</span><span class="num" id="warm-time" style="font-size:80px;line-height:1.05;letter-spacing:-2px">' + Math.max(0, Math.ceil((a.warm.end - Date.now()) / 1000)) + '</span>'
    + '<span class="mut">' + esc(m.tip) + '</span></section>'
    + '<button type="button" class="pill gold-btn wide big" data-act="warm-next">' + (a.warm.i < WARMUP.length - 1 ? 'Mouvement suivant' : 'Commencer la séance') + '</button>';
}

// Vue d'ensemble : toute la séance, on touche un exercice pour l'ouvrir en grand.
function viewList(a) {
  const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const cur = a.exercises.findIndex((e) => !exDone(e));
  let h = '<div class="row between"><div class="col" style="gap:2px"><span class="small mut">Séance en cours</span><h1 class="h1">' + esc(a.label) + '</h1></div>'
    + '<span class="num" id="elapsed" style="font-size:22px;color:var(--soft)">' + clock((Date.now() - a.start) / 1000) + '</span></div>';
  h += '<section class="glass card hud col" style="gap:10px"><div class="row between"><span class="h2">' + done + ' sur ' + plural(total, 'série', 'séries') + '</span><span class="gold-text num" style="font-size:17px">+' + (done * 10) + ' XP</span></div>'
    + '<div class="bar gold"><div style="width:' + (total ? Math.round((done / total) * 100) : 0) + '%"></div></div></section>';
  a.exercises.forEach((e, i) => {
    const d = exDone(e);
    const w = Math.max(0, ...e.sets.map((s) => s.w || 0));
    const todo = e.sets.findIndex((s) => !s.done);
    h += '<button type="button" class="ins" data-act="picker" data-at="' + i + '" aria-label="Ajouter un exercice ici">' + ICON.plus + '</button>';
    h += '<section class="glass card col tap excard' + (i === cur ? ' cur' : '') + (d ? ' done' : '') + '" role="button" tabindex="0" data-act="goto" data-i="' + i + '" style="gap:12px">'
      + '<div class="row"><span class="badge' + (d ? ' done' : '') + '">' + (d ? checkDark : (i + 1)) + '</span>'
      + '<div class="col grow" style="gap:2px"><span style="font-weight:600;font-size:16px">' + esc(exoName(e.name)) + '</span><span class="small mut">' + plural(e.sets.length, 'série', 'séries') + (w ? ' · ' + fr(w, 1) + ' kg' : '') + '</span></div>'
      + '<button type="button" class="iconbtn" data-act="ex-menu" data-i="' + i + '" aria-label="Options de l’exercice">' + ICON.more + '</button></div>'
      + '<div class="chips">' + e.sets.map((s, k) => '<span class="chip' + (s.done ? ' done' : (k === todo && i === cur ? ' sel' : '')) + (s.pr ? ' pr' : '') + '">' + chipLabel(e.name, s) + '</span>').join('') + '</div></section>';
  });
  h += '<button type="button" class="pill glass wide" data-act="picker" data-at="' + a.exercises.length + '" style="margin-top:4px">Ajouter un exercice</button>'
    + '<div class="row" style="margin-top:8px"><button type="button" class="pill glass grow" data-act="cancel" style="color:var(--mut)">Abandonner</button>'
    + '<button type="button" class="pill gold-btn grow" data-act="finish">Terminer</button></div>'
    + '<div style="height:90px"></div>'; // place pour le bandeau de repos
  return h;
}

// Un exercice en grand : gros chiffres, plus et moins, un seul bouton pour valider.
function viewFocus(a) {
  const ex = a.exercises[a.idx];
  const n = a.exercises.length;
  const time = measureOf(ex.name) === 'time';
  const lest = lestOf(ex.name) || ex.sets.some((s) => s.w > 0);
  a.setIdx = Math.max(0, Math.min(a.setIdx || 0, ex.sets.length - 1));
  const s = ex.sets[a.setIdx];
  const goal = ex.goals && ex.goals[a.setIdx];
  let h = '<div class="row between"><button type="button" class="pill sm glass" data-act="list">' + ICON.back + 'Séance</button>'
    + '<span class="num" id="elapsed" style="font-size:20px;color:var(--soft)">' + clock((Date.now() - a.start) / 1000) + '</span>'
    + '<button type="button" class="iconbtn" data-act="ex-menu" data-i="' + a.idx + '" aria-label="Options de l’exercice">' + ICON.more + '</button></div>';
  h += '<div class="col" style="gap:4px"><span class="label violet">Exercice ' + (a.idx + 1) + ' sur ' + n + '</span><h1 class="h1" style="font-size:30px">' + esc(exoName(ex.name)) + '</h1>'
    + '<span class="small mut">' + (ex.prev ? 'La dernière fois : ' + esc(ex.prev) : 'Première fois sur cet exercice') + '</span>'
    + (ex.note ? '<span class="small" style="color:var(--gold)">Note : ' + esc(ex.note) + '</span>' : '') + '</div>';
  h += '<div class="chips">' + ex.sets.map((x, k) => '<button type="button" class="chip' + (x.done ? ' done' : '') + (k === a.setIdx ? ' sel' : '') + (x.pr ? ' pr' : '') + '" data-act="sel-set" data-i="' + k + '" aria-label="Série ' + (k + 1) + '">' + chipLabel(ex.name, x) + '</button>').join('') + '</div>';
  if (s) {
    const f = time ? 't' : 'r';
    const step = time ? 5 : 1;
    const goalText = goal ? 'Objectif : ' + (time ? goal.t + ' s' : goal.r) : '';
    h += '<section class="glass card hud col" style="border-radius:32px;padding:24px 18px;gap:18px;align-items:stretch">'
      + '<div class="row between" style="padding:0 6px"><span class="label">Série ' + (a.setIdx + 1) + ' sur ' + ex.sets.length + '</span>' + (goalText ? '<span class="gold-text small" style="font-weight:600">' + goalText + '</span>' : '') + '</div>'
      + '<div class="row" style="gap:10px"><button type="button" class="stepbtn" data-act="step" data-f="' + f + '" data-d="-' + step + '" aria-label="Moins">' + ICON.minus + '</button>'
      + '<div class="col grow" style="align-items:center;gap:0"><input class="bignum" inputmode="numeric" data-f="' + f + '" data-i="' + a.setIdx + '" value="' + (s[f] || 0) + '" aria-label="' + (time ? 'Secondes' : 'Répétitions') + '"><span class="small mut">' + (time ? 'secondes' : 'répétitions') + '</span></div>'
      + '<button type="button" class="stepbtn" data-act="step" data-f="' + f + '" data-d="' + step + '" aria-label="Plus">' + ICON.plus + '</button></div>';
    if (lest) {
      h += '<div class="hair"></div><div class="row" style="gap:10px"><button type="button" class="stepbtn sm" data-act="step" data-f="w" data-d="-1" aria-label="Moins de lest">' + ICON.minus + '</button>'
        + '<div class="col grow" style="align-items:center;gap:0"><input class="midnum" inputmode="decimal" data-f="w" data-i="' + a.setIdx + '" value="' + (s.w ? fr(s.w, 1) : 0) + '" aria-label="Lest en kilos"><span class="small mut">kg de lest</span></div>'
        + '<button type="button" class="stepbtn sm" data-act="step" data-f="w" data-d="1" aria-label="Plus de lest">' + ICON.plus + '</button></div>';
    }
    // Chrono intégré pour les exercices en secondes : il remplit la durée tout seul.
    if (time && !s.done) {
      h += '<button type="button" class="pill glass wide' + (a.chrono ? ' on' : '') + '" data-act="chrono">' + (a.chrono ? 'Arrêter le chrono' : 'Lancer le chrono') + '</button>';
    }
    h += (s.done
      ? '<button type="button" class="pill glass wide big" data-act="unvalidate" style="color:var(--gold)">Série validée · annuler</button>'
      : '<button type="button" class="pill gold-btn wide big" data-act="validate">Valider la série</button>') + '</section>';
  }
  h += '<div class="row"><button type="button" class="pill sm glass grow" data-act="add-set">Ajouter une série</button>'
    + (ex.sets.length > 1 ? '<button type="button" class="pill sm glass grow" data-act="del-set">Retirer cette série</button>' : '') + '</div>';
  h += '<div class="row">'
    + (a.idx > 0 ? '<button type="button" class="pill glass grow" data-act="goto" data-i="' + (a.idx - 1) + '">Précédent</button>' : '')
    + (a.idx < n - 1 ? '<button type="button" class="pill glass grow" data-act="goto" data-i="' + (a.idx + 1) + '">Suivant</button>' : '<button type="button" class="pill glass grow" data-act="list">Voir toute la séance</button>')
    + '</div>';
  if (a.idx < n - 1) h += '<span class="small mut" style="text-align:center">Ensuite : ' + esc(exoName(a.exercises[a.idx + 1].name)) + '</span>';
  return h + '<div style="height:90px"></div>';
}

// Options d'un exercice pendant la séance : fiche, déplacer, remplacer, type, lest, repos, retirer.
function sheetExMenu(i) {
  const a = state.active;
  const ex = a && a.exercises[i];
  if (!ex) return;
  const time = measureOf(ex.name) === 'time', lest = lestOf(ex.name), rest = restOf(ex.name), n = a.exercises.length;
  const item = (act, label) => '<button type="button" class="item" data-act="' + act + '" data-i="' + i + '"><span class="grow" style="font-weight:500">' + label + '</span>' + ICON.chev + '</button>';
  sheet('<div class="col"><span class="label">Exercice ' + (i + 1) + ' sur ' + n + '</span><h1 class="h1">' + esc(exoName(ex.name)) + '</h1></div><div class="list">'
    + '<button type="button" class="item" data-act="exo" data-name="' + esc(ex.name) + '"><span class="grow" style="font-weight:500">' + (FICHES[ex.name] ? 'Comment le faire, mon historique et mon record' : 'Mon historique et mon record') + '</span>' + ICON.chev + '</button>'
    + (i > 0 ? item('ex-up', 'Monter dans la séance') : '') + (i < n - 1 ? item('ex-down', 'Descendre dans la séance') : '')
    + item('ex-replace', 'Remplacer par un autre exercice')
    + item('ex-measure', time ? 'Compter en répétitions' : 'Compter en secondes')
    + item('ex-lest', lest ? 'Enlever le lest' : 'Ajouter un lest')
    + item('del-exo', 'Retirer de la séance') + '</div>'
    + '<label class="col" style="gap:8px"><span class="label">Note pour cet exercice</span><input class="textin" id="ex-note" data-i="' + i + '" placeholder="Par exemple : prise large, banc au cran 3" value="' + esc(ex.note || '') + '"></label>'
    + '<div class="col" style="gap:8px"><span class="label">Repos après chaque série</span><div class="row" style="flex-wrap:wrap;gap:8px">'
    + [45, 60, 90, 120, 150, 180].map((s) => '<button type="button" class="pill sm ' + (s === rest ? 'gold-btn' : 'glass') + '" data-act="ex-rest" data-i="' + i + '" data-s="' + s + '">' + clock(s) + '</button>').join('') + '</div></div>' + closeBtn);
}

function moveExo(i, d) {
  const a = state.active, j = i + d;
  if (j < 0 || j >= a.exercises.length) return;
  [a.exercises[i], a.exercises[j]] = [a.exercises[j], a.exercises[i]];
  if (a.idx === i) a.idx = j; else if (a.idx === j) a.idx = i;
  save(); render(); sheetExMenu(j);
}

// ---------- Fiche d'un exercice : comment faire, courbe, meilleures séries, historique ----------
export function sheetExo(name) {
  const { list, most, heavy } = exoHistory(name);
  const time = measureOf(name) === 'time';
  const f = FICHES[name];
  let h = '<div class="col"><span class="label">' + (f ? esc(f.muscles) : plural(list.length, 'séance', 'séances')) + '</span><h1 class="h1">' + esc(exoName(name)) + '</h1></div>';
  if (f) {
    h += '<div class="exo"><span class="label violet">Comment faire</span>'
      + f.steps.map((s, i) => '<div class="row" style="align-items:flex-start"><span class="num gold-text" style="width:18px;font-size:16px">' + (i + 1) + '</span><span class="grow" style="color:var(--soft)">' + esc(s) + '</span></div>').join('')
      + '<div class="hair"></div><span class="small mut">Erreur fréquente : ' + esc(f.erreur.charAt(0).toLowerCase() + f.erreur.slice(1)) + '</span></div>';
  }
  if (list.length >= 2) {
    const values = list.slice(0, 24).reverse().map((x) => Math.max(...x.sets.map((s) => s.r || s.t || 0)));
    h += '<div class="exo"><span class="label">Meilleure série de chaque séance</span>' + chartSvg(values, time ? ' s' : ' rép.') + '</div>';
  }
  if (most) {
    h += '<div class="row" style="align-items:stretch"><div class="exo grow"><span class="label">' + (time ? 'Le plus long' : 'Le plus de répétitions') + '</span><span class="num gold-text" style="font-size:22px">' + esc(setText(most.set)) + '</span><span class="small mut">' + dateFr(most.date, true) + '</span></div>'
      + (heavy ? '<div class="exo grow"><span class="label">Le plus lourd</span><span class="num gold-text" style="font-size:22px">' + esc(setText(heavy.set)) + '</span><span class="small mut">' + dateFr(heavy.date, true) + '</span></div>' : '') + '</div>';
  }
  if (list.length) {
    h += '<span class="label">' + plural(list.length, 'séance', 'séances') + ' · les dernières</span><div class="list">' + list.slice(0, 12).map((x) => '<button type="button" class="item" data-act="detail" data-id="' + esc(x.id) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + dateFr(x.date, true) + '</span><span class="small mut">' + esc(x.sets.map(setText).join(', ')) + '</span></div>' + ICON.chev + '</button>').join('') + '</div>';
  } else {
    h += '<span class="mut">Tu n’as encore jamais fait cet exercice.</span>';
  }
  sheet(h + closeBtn);
}

// ---------- Choisir un exercice ----------
// ui.pick dit à quoi sert le choix : { mode: 'insert', at } | { mode: 'replace', i } | { mode: 'edit' }
function sheetPicker() {
  const mine = new Set();
  for (const r of routines()) for (const e of r.exercises) mine.add(e.name);
  const names = new Set(Object.keys(EXOS));
  for (const w of state.workouts) for (const e of w.exercises) names.add(e.name);
  for (const n of mine) names.add(n);
  names.delete('Running');
  mine.delete('Running');
  const q = norm(ui.pickerQuery);
  const match = (n) => !q || norm(exoName(n)).includes(q) || norm(n).includes(q);
  const byName = (x, y) => exoName(x).localeCompare(exoName(y), 'fr');
  const row = (n) => '<button type="button" class="item" data-act="add-exo" data-name="' + esc(n) + '"><span class="grow" style="font-weight:500">' + esc(exoName(n)) + '</span><span class="small mut">' + (measureOf(n) === 'time' ? 'durée' : 'répétitions') + (lestOf(n) ? ' · lest' : '') + '</span></button>';
  const a1 = [...mine].filter(match).sort(byName);
  const a2 = [...names].filter((n) => !mine.has(n) && match(n)).sort(byName);
  const exact = [...names].some((n) => norm(exoName(n)) === q || norm(n) === q);
  let items = '';
  if (a1.length) items += '<span class="label" style="padding:10px 0 4px">Tes exercices actuels</span>' + a1.map(row).join('');
  if (a2.length) items += '<span class="label" style="padding:14px 0 4px">Tous les exercices</span>' + a2.map(row).join('');
  // Créer son propre exercice : proposé en dernier, pour ne pas le toucher par erreur.
  if (q && !exact) {
    const typed = clean(ui.pickerQuery);
    const made = typed.charAt(0).toUpperCase() + typed.slice(1);
    items += '<span class="label" style="padding:14px 0 4px">Pas dans la liste ?</span><button type="button" class="item" data-act="add-exo" data-name="' + esc(made) + '"><span class="grow gold-text" style="font-weight:600">Créer « ' + esc(made) + ' »</span></button>';
  }
  const old = $('picker-list');
  if (old) { old.innerHTML = items; return; }
  const title = ui.pick && ui.pick.mode === 'replace' ? 'Remplacer par' : 'Ajouter un exercice';
  sheet('<h1 class="h1">' + title + '</h1>'
    + '<input class="textin" id="picker-q" placeholder="Chercher ou créer un exercice" aria-label="Chercher ou créer un exercice" value="' + esc(ui.pickerQuery) + '">'
    + '<div class="list" id="picker-list">' + items + '</div>', 2);
}

// Séries par défaut d'un exercice qu'on ajoute : celles de la dernière fois, sinon 3 séries simples.
function defaultSets(name) {
  const prev = lastSets(name);
  const time = kindOf(name) === 'time';
  return prev ? prev.map((s) => ({ r: s.r || 0, w: s.w || 0, t: s.t || 0 })) : [1, 2, 3].map(() => ({ r: time ? 0 : 8, w: 0, t: time ? 30 : 0 }));
}

// ---------- Modifier une routine ou une séance passée ----------
function openEditor(type, id) {
  let draft;
  if (type === 'routine') {
    const r = id ? routines().find((x) => x.id === id) : { label: '', exercises: [] };
    if (!r) return;
    draft = { label: r.label, exercises: JSON.parse(JSON.stringify(r.exercises)) };
  } else {
    const w = state.workouts.find((x) => x.id === id);
    if (!w) return;
    const local = new Date(w.start - new Date(w.start).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    draft = { label: clean(w.title), exercises: JSON.parse(JSON.stringify(w.exercises)), when: local };
  }
  ui.edit = { type, id, draft };
  sheetEditor();
}

function sheetEditor() {
  const { type, id, draft } = ui.edit;
  const box = document.querySelector('#sheet .sheet > div');
  const scroll = box ? box.scrollTop : 0;
  const n = draft.exercises.length;
  let h = '<div class="col"><span class="label">' + (type === 'routine' ? (id ? 'Modifier la routine' : 'Nouvelle routine') : 'Modifier la séance') + '</span>'
    + '<input class="textin" id="edit-label" placeholder="Nom" aria-label="Nom" value="' + esc(draft.label) + '" style="margin-top:6px">'
    + (type === 'workout' ? '<label class="col" style="gap:6px;margin-top:8px"><span class="label">Date et heure</span><input class="textin" type="datetime-local" id="edit-date" value="' + esc(draft.when) + '"></label>' : '') + '</div>';
  draft.exercises.forEach((e, ei) => {
    const kind = e.name === 'Running' ? 'run' : kindOf(e.name);
    const two = kind === 'weight' || kind === 'run';
    h += '<div class="exo"><div class="row"><span class="grow" style="font-weight:600">' + esc(exoName(e.name)) + '</span>'
      + '<button type="button" class="iconbtn" data-act="ed-up" data-e="' + ei + '" aria-label="Monter"' + (ei === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>'
      + '<button type="button" class="iconbtn" data-act="ed-down" data-e="' + ei + '" aria-label="Descendre"' + (ei === n - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>'
      + '<button type="button" class="iconbtn" data-act="ed-del-exo" data-e="' + ei + '" aria-label="Retirer l’exercice">' + ICON.x + '</button></div>';
    e.sets.forEach((s, i) => {
      const at = ' data-e="' + ei + '" data-i="' + i + '"';
      let fields;
      if (kind === 'run') fields = '<label class="field"><input inputmode="decimal" data-ef="d"' + at + ' value="' + (s.d ? fr(s.d) : '') + '" aria-label="Distance"><span class="unit">km</span></label><label class="field"><input inputmode="text" data-ef="clock"' + at + ' value="' + (s.t ? clock(s.t) : '') + '" placeholder="min:s" aria-label="Durée"></label>';
      else if (kind === 'time') fields = '<label class="field"><input inputmode="numeric" data-ef="t"' + at + ' value="' + (s.t || '') + '" aria-label="Durée"><span class="unit">s</span></label>';
      else fields = '<label class="field"><input inputmode="numeric" data-ef="r"' + at + ' value="' + (s.r || '') + '" aria-label="Répétitions"><span class="unit">rép.</span></label>'
        + (two ? '<label class="field"><input inputmode="decimal" data-ef="w"' + at + ' value="' + (s.w ? fr(s.w, 1) : '') + '" aria-label="Charge"><span class="unit">kg</span></label>' : '');
      h += '<div class="sets ' + (two ? '' : 'one') + '"><span class="idx">' + (i + 1) + '</span>' + fields
        + '<button type="button" class="iconbtn" data-act="ed-del-set"' + at + ' aria-label="Retirer la série ' + (i + 1) + '">' + ICON.x + '</button></div>';
    });
    if (kind !== 'run') h += '<button type="button" class="pill sm glass wide" data-act="ed-add-set" data-e="' + ei + '">Ajouter une série</button>';
    h += '</div>';
  });
  h += '<button type="button" class="pill glass wide" data-act="ed-add-exo">Ajouter un exercice</button>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="close" style="color:var(--mut)">Annuler</button><button type="button" class="pill gold-btn grow" data-act="ed-save">Enregistrer</button></div>';
  if (type === 'routine' && id) h += '<div class="row"><button type="button" class="pill sm glass grow" data-act="ed-dup">Dupliquer</button><button type="button" class="pill sm glass grow" data-act="ed-del-routine" style="color:var(--mut)">Supprimer</button></div>';
  sheet(h);
  document.querySelector('#sheet .sheet > div').scrollTop = scroll;
}

function saveEditor() {
  const { type, id, draft } = ui.edit;
  const label = clean(draft.label);
  if (!label) { toast('Donne un nom'); return; }
  if (type === 'routine') {
    const exercises = draft.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ r: s.r || 0, w: s.w || 0, t: s.t || 0 })) }));
    const list = routines();
    const r = id && list.find((x) => x.id === id);
    if (r) { r.label = label; r.exercises = exercises; } else list.push({ id: 'rt' + Date.now(), title: label, label, exercises });
    save(); closeSheet(); render(); toast('Routine enregistrée');
    return;
  }
  const w = state.workouts.find((x) => x.id === id);
  const exercises = draft.exercises
    .map((e) => { const x = { name: e.name, sets: e.sets.filter((s) => s.r || s.t || s.d || s.w).map((s) => { const o = { done: true }; for (const k of ['r', 'w', 't', 'd']) if (s[k]) o[k] = s[k]; return o; }) }; if (e.note) x.note = e.note; return x; })
    .filter((e) => e.sets.length);
  if (!exercises.length) { toast('Il faut au moins une série'); return; }
  // Nouvelle date : on déplace la séance en gardant sa durée.
  const when = Date.parse(draft.when);
  if (!isNaN(when) && when !== w.start && when <= Date.now()) { const len = Math.max(0, w.end - w.start); w.start = when; w.end = when + len; }
  w.title = label;
  w.exercises = exercises;
  w.prs = countPrs(w);
  save(); closeSheet(); render(); sheetDetail(w.id); toast('Séance modifiée');
}

// ---------- Terminer : enregistrement et bilan ----------
function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map((e) => { const o = { name: e.name, sets: e.sets.filter((s) => s.done && (s.r || s.t)).map((s) => { const x = { done: true }; if (s.r) x.r = s.r; if (s.w) x.w = s.w; if (s.t) x.t = s.t; return x; }) }; if (e.note && clean(e.note)) o.note = clean(e.note); return o; })
    .filter((e) => e.sets.length);
  if (!exercises.length) { toast('Valide au moins une série avant de terminer'); return; }
  const left = a.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
  if (left && !confirm('Il reste ' + plural(left, 'série non validée', 'séries non validées') + '. Terminer quand même ?')) return;
  delete a.chrono;
  const xpBefore = totalXp();
  const qBefore = new Set(dailyQuests().filter((q) => q.done).map((q) => q.id));
  const w = { id: 'a' + a.start, title: a.title, start: a.start, end: Date.now(), exercises };
  state.workouts.push(w);
  w.prs = countPrs(w);
  // Si tu as ajouté ou retiré des exercices ou des séries, on propose de garder ce changement (pas en express).
  const routine = !a.express && a.routineId && routines().find((r) => r.id === a.routineId);
  if (routine) {
    const shape = (list) => list.map((e) => e.name + ':' + e.sets.length).join('|');
    if (shape(a.exercises) !== shape(routine.exercises) && confirm('Tu as changé les exercices ou le nombre de séries. Mettre la routine « ' + routine.label + ' » à jour pour la prochaine fois ?')) {
      routine.exercises = a.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ r: s.r || 0, w: s.w || 0, t: s.t || 0 })) }));
    }
  }
  state.active = null;
  save();
  const qNew = dailyQuests().filter((q) => q.done && !qBefore.has(q.id)); // quêtes remplies par cette séance
  ui.tab = 'home';
  ui.enter = true;
  render();
  top();
  sheetSummary(w, a.label, xpBefore, qNew);
}

// Ressenti de la séance : trois boutons, celui choisi passe en or.
export function feelPills(w) {
  return ['Facile', 'Bien', 'Dur'].map((f) => '<button type="button" class="pill sm grow ' + (w.feel === f ? 'gold-btn' : 'glass') + '" data-act="feel" data-id="' + esc(w.id) + '" data-v="' + f + '">' + f + '</button>').join('');
}

// Image de la séance à partager (dessinée dans le téléphone, rien n'est envoyé ailleurs).
async function shareImage(w) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#08070C'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(820, 180, 0, 820, 180, 700);
  glow.addColorStop(0, 'rgba(124,92,224,0.55)'); glow.addColorStop(1, 'rgba(124,92,224,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const gold = g.createLinearGradient(0, 0, 0, H);
  gold.addColorStop(0, '#F4E6BC'); gold.addColorStop(0.5, '#CDAA62'); gold.addColorStop(1, '#A07C3C');
  const text = (t, x, y, font, color, align) => { g.font = font; g.fillStyle = color; g.textAlign = align || 'left'; g.fillText(t, x, y); };
  let sets = 0, reps = 0;
  for (const e of w.exercises) for (const s of e.sets) { sets += 1; reps += s.r || 0; }
  const r = routines().find((x) => norm(x.title) === norm(w.title));
  text('ASCENSION', 80, 130, '600 34px "Space Grotesk", sans-serif', '#B9A8F5');
  text(dateFr(w.start, true), W - 80, 130, '500 34px Inter, sans-serif', '#A29DB0', 'right');
  text(r ? r.label : clean(w.title), 80, 260, '700 84px "Space Grotesk", sans-serif', '#F4F2F8');
  text('+' + xpOf(w) + ' XP', 80, 400, '700 120px "Space Grotesk", sans-serif', gold);
  const stats = [[dur((w.end - w.start) / 1000), 'durée'], [String(sets), 'séries'], [String(reps), 'répétitions']];
  if (w.prs) stats.push([String(w.prs), w.prs > 1 ? 'records' : 'record']);
  stats.forEach((st, i) => { const x = 80 + i * ((W - 160) / stats.length); text(st[0], x, 520, '700 56px "Space Grotesk", sans-serif', '#F4F2F8'); text(st[1], x, 566, '500 30px Inter, sans-serif', '#A29DB0'); });
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(80, 620, W - 160, 2);
  let y = 700;
  for (const e of w.exercises.slice(0, 9)) {
    text(exoName(e.name), 80, y, '600 38px Inter, sans-serif', '#F4F2F8');
    let line = e.sets.map(setText).join(', ');
    g.font = '500 32px Inter, sans-serif';
    while (g.measureText(line).width > 520 && line.length > 4) line = line.slice(0, -2);
    text(line, W - 80, y, '500 32px Inter, sans-serif', e.sets.some((s) => s.pr) ? '#D8BD82' : '#A29DB0', 'right');
    y += 68;
  }
  if (w.exercises.length > 9) text('et ' + (w.exercises.length - 9) + ' de plus', 80, y, '500 30px Inter, sans-serif', '#8D889C');
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const file = new File([blob], 'ascension-seance-' + new Date(w.start).toISOString().slice(0, 10) + '.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  toast('Image enregistrée');
}

function sheetSummary(w, label, xpBefore, qNew) {
  const xpAfter = totalXp();
  const before = levelInfo(xpBefore), after = levelInfo(xpAfter);
  const gained = xpAfter - xpBefore;
  const levelUp = after.level > before.level;
  let sets = 0, reps = 0, kg = 0;
  for (const e of w.exercises) for (const s of e.sets) { sets += 1; reps += s.r || 0; kg += (s.w || 0) * (s.r || 0); }
  const prev = sorted().find((o) => o.id !== w.id && o.start < w.start && norm(o.title) === norm(w.title));
  const total = (e) => e.sets.reduce((n, s) => n + (s.r || s.t || 0), 0);
  const lines = w.exercises.map((e) => {
    const pe = prev && prev.exercises.find((x) => x.name === e.name);
    const unit = e.sets[0] && !e.sets[0].r ? ' s' : ' rép.';
    let delta = '';
    if (prev && !pe) delta = 'Nouveau';
    else if (pe) { const d = total(e) - total(pe); delta = d > 0 ? '+' + d + unit : (d < 0 ? d + unit : 'Pareil'); }
    return { name: e.name, text: e.sets.map(setText).join(', '), delta, up: delta.charAt(0) === '+', rec: e.sets.some((s) => s.pr) };
  });
  const recs = lines.filter((l) => l.rec);
  const stat = (k, v) => '<div><span class="num" style="font-size:20px">' + v + '</span><span class="small mut">' + k + '</span></div>';

  let h = '<div class="col center" style="gap:6px"><span class="label violet">Séance terminée</span><h1 class="h1" style="font-size:30px">' + esc(label) + '</h1>'
    + '<span class="num gold-text" style="font-size:66px;line-height:1.1">+<span id="xp-count">0</span> XP</span></div>';
  h += '<section class="glass card hud col" style="gap:10px"><div class="row between"><span class="h2">Niveau ' + after.level + '</span>'
    + (levelUp ? '<span class="tag gold">Niveau supérieur</span>' : '<span class="small mut">Encore ' + (after.need - after.into) + ' XP</span>') + '</div>'
    + '<div class="bar"><div id="xp-bar" style="transition:width 1.2s cubic-bezier(0.2,0.8,0.2,1);width:' + (levelUp ? 0 : Math.round((before.into / before.need) * 100)) + '%"></div></div></section>';
  h += '<section class="glass card"><div class="stats3" style="grid-template-columns:repeat(' + (kg ? 4 : 3) + ',minmax(0,1fr))">' + stat('durée', dur((w.end - w.start) / 1000)) + stat(sets > 1 ? 'séries' : 'série', sets) + stat('répétitions', reps) + (kg ? stat('kg soulevés', Math.round(kg).toLocaleString('fr-FR')) : '') + '</div></section>';
  if (recs.length) {
    h += '<section class="glass card col" style="gap:8px;border-color:rgba(205,170,98,0.5)"><span class="gold-text h2">' + plural(recs.length, 'record battu', 'records battus') + '</span>'
      + recs.map((l) => '<div class="row between"><span style="font-weight:500">' + esc(exoName(l.name)) + '</span><span class="small mut">' + esc(l.text) + '</span></div>').join('') + '</section>';
  }
  if (qNew.length) {
    h += '<section class="glass card col" style="gap:8px"><span class="h2">' + plural(qNew.length, 'quête réussie', 'quêtes réussies') + '</span>'
      + qNew.map((q) => '<div class="row between"><span>' + esc(q.label) + '</span><span class="gold-text" style="font-weight:600">+' + q.xp + ' XP</span></div>').join('') + '</section>';
  }
  h += '<span class="label">' + (prev ? 'Par rapport à la dernière fois' : 'Ta séance') + '</span><div class="list">'
    + lines.map((l) => '<button type="button" class="item" data-act="exo" data-name="' + esc(l.name) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(l.name)) + '</span><span class="small mut">' + esc(l.text) + '</span></div>'
      + (l.delta ? '<span class="small ' + (l.up ? 'gold-text' : 'mut') + '" style="font-weight:600;white-space:nowrap">' + l.delta + '</span>' : '') + '</button>').join('') + '</div>';
  h += '<div class="col" style="gap:8px"><span class="label">Comment c’était ?</span><div class="row" id="feel-row">' + feelPills(w) + '</div></div>';
  h += '<div class="row"><button type="button" class="pill glass grow" data-act="share" data-id="' + esc(w.id) + '">Partager en image</button>'
    + '<button type="button" class="pill glass grow" data-act="copy" data-id="' + esc(w.id) + '" style="color:var(--gold)">' + ICON.copy + 'Pour Claude</button></div>' + closeBtn;
  sheet(h, 1, 'full');

  // Le compteur d'XP grimpe et la barre de niveau se remplit.
  const el = $('xp-count');
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / 900);
    el.textContent = Math.round(gained * (1 - Math.pow(1 - k, 3)));
    if (k < 1 && el.isConnected) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(() => { if (el.isConnected) el.textContent = gained; const b = $('xp-bar'); if (b) b.style.width = Math.round((after.into / after.need) * 100) + '%'; }, 1000);
  if (recs.length || levelUp) burst();
}

// ---------- Repos, son, écran allumé ----------
let audio = null;
function beep() {
  try {
    if (!audio || state.settings.sound === false) return;
    [0, 0.25, 0.5].forEach((d) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, audio.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.4, audio.currentTime + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + d + 0.18);
      o.start(audio.currentTime + d); o.stop(audio.currentTime + d + 0.2);
    });
  } catch (e) { /* pas de son disponible */ }
}
function wakeAudio() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { /* ignore */ }
}
function startRest() {
  wakeAudio();
  const ex = curExo();
  const total = ex ? restOf(ex.name) : (state.settings.rest || 90);
  state.active.rest = { end: Date.now() + total * 1000, total, rang: false };
}

// Appelé deux fois par seconde : chrono de séance, repos, échauffement.
export function tick() {
  const a = state.active;
  const e = $('elapsed');
  if (e && a) e.textContent = clock((Date.now() - a.start) / 1000);
  if (a && a.warm) {
    const left = Math.ceil((a.warm.end - Date.now()) / 1000);
    const el = $('warm-time');
    if (left <= 0) { beep(); warmNext(); } else if (el) el.textContent = left;
  }
  // Chrono d'un exercice en secondes : la durée monte toute seule, avec un bip à l'objectif.
  if (a && a.chrono) {
    const s = curSet();
    if (!s || s.done) { delete a.chrono; }
    else {
      s.t = Math.floor((Date.now() - a.chrono.t0) / 1000);
      const big = document.querySelector('.bignum');
      if (big && document.activeElement !== big) big.value = s.t;
      const goal = curExo().goals && curExo().goals[a.setIdx];
      if (goal && goal.t && s.t >= goal.t && !a.chrono.rang) { a.chrono.rang = true; beep(); toast('Objectif atteint, tiens encore si tu peux'); }
    }
  }
  renderRest();
}

function warmNext() {
  const a = state.active;
  if (!a || !a.warm) return;
  wakeAudio();
  if (a.warm.i >= WARMUP.length - 1) { delete a.warm; a.start = Date.now(); ui.enter = true; }
  else { a.warm.i += 1; a.warm.end = Date.now() + WARMUP[a.warm.i].secs * 1000; }
  save(); render(); top();
}

export function renderRest() {
  const a = state.active;
  if (!a || !a.rest) { if ($('rest').innerHTML) $('rest').innerHTML = ''; return; }
  const left = (a.rest.end - Date.now()) / 1000;
  if (left <= 0 && !a.rest.rang) { a.rest.rang = true; beep(); save(); }
  if (left < -30) { a.rest = null; save(); $('rest').innerHTML = ''; return; }
  const ratio = Math.max(0, Math.min(1, left / a.rest.total));
  const over = left <= 0;
  const offset = (169.6 * (1 - ratio)).toFixed(1);
  // Si le bandeau est déjà affiché dans le bon état, on ne met à jour que le chrono (sinon les boutons rateraient des appuis).
  const box = $('rest').firstElementChild;
  if (box && box.dataset.over === String(over)) {
    if (!over) { $('rest-time').textContent = clock(left); $('rest-ring').setAttribute('stroke-dashoffset', offset); }
    return;
  }
  $('rest').innerHTML = '<div class="rest glass row' + (over ? ' end' : '') + '" data-over="' + over + '" style="gap:14px">'
    + '<svg role="img" aria-label="Repos" width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="4"/>'
    + '<circle id="rest-ring" cx="32" cy="32" r="27" fill="none" stroke="' + (over ? '#D8BD82' : '#8468E8') + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="169.6" stroke-dashoffset="' + offset + '" transform="rotate(-90 32 32)"/></svg>'
    + '<div class="col grow" style="gap:0"><span class="label violet">' + (over ? 'Repos terminé' : 'Repos') + '</span><span class="num" id="rest-time" style="font-size:28px;line-height:1.1">' + (over ? 'C’est reparti' : clock(left)) + '</span></div>'
    + (over ? '' : '<button type="button" class="pill sm glass" data-act="rest-more">+ 15 s</button>')
    + '<button type="button" class="pill sm glass" data-act="rest-skip">' + (over ? 'OK' : 'Passer') + '</button></div>';
}

let lock = null;
export async function keepAwake() {
  try { if (state.active && navigator.wakeLock && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) { /* non disponible */ }
}

// ---------- Saisie dans les cases (appelé par app.js) ----------
export function onInput(t) {
  if (t.id === 'picker-q') { ui.pickerQuery = t.value; sheetPicker(); return true; }
  if (t.id === 'edit-label' && ui.edit) { ui.edit.draft.label = t.value; return true; }
  if (t.id === 'edit-date' && ui.edit) { ui.edit.draft.when = t.value; return true; }
  if (t.id === 'ex-note' && state.active) { state.active.exercises[+t.dataset.i].note = t.value; save(); return true; }
  if (t.dataset.ef && ui.edit) {
    const s = ui.edit.draft.exercises[+t.dataset.e].sets[+t.dataset.i];
    if (t.dataset.ef === 'clock') {
      // "31:40" = 31 min 40 s ; "1:02:30" = 1 h 02 min 30 s ; un nombre seul = des minutes.
      const p = String(t.value).split(':').map(toNum);
      s.t = Math.round(p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60);
    } else s[t.dataset.ef] = toNum(t.value);
    return true;
  }
  if (t.dataset.f && state.active && curExo()) { curExo().sets[+t.dataset.i][t.dataset.f] = toNum(t.value); save(); return true; }
  return false;
}

// ---------- Actions ----------
const edExo = (el) => ui.edit.draft.exercises[+el.dataset.e];
Object.assign(ACTIONS, {
  routine: (el) => sheetRoutine(el.dataset.id),
  exo: (el) => sheetExo(el.dataset.name),
  start: (el) => startWorkout(el.dataset.id, { express: !!el.dataset.express }),
  'toggle-warm': (el) => { state.settings.warm = !state.settings.warm; save(); sheetRoutine(el.dataset.id); },
  'warm-next': () => warmNext(),
  'warm-skip': () => { const a = state.active; delete a.warm; a.start = Date.now(); save(); ui.enter = true; render(); },
  goto: (el) => { const a = state.active; a.idx = +el.dataset.i; a.view = 'focus'; a.setIdx = firstTodo(a.exercises[a.idx]); save(); closeSheet(); ui.enter = true; render(); top(); },
  list: () => { state.active.view = 'list'; save(); ui.enter = true; render(); top(); },
  'sel-set': (el) => { state.active.setIdx = +el.dataset.i; save(); render(); },
  step: (el) => { const s = curSet(), f = el.dataset.f; s[f] = Math.max(0, Math.round(((s[f] || 0) + (+el.dataset.d)) * 10) / 10); save(); render(); },
  validate: () => {
    const a = state.active, ex = curExo(), s = curSet();
    const time = measureOf(ex.name) === 'time';
    delete a.chrono;
    if (!(time ? s.t : s.r)) { toast(time ? 'Indique la durée' : 'Indique les répétitions'); return; }
    s.done = true;
    const amt = (x) => x.r || x.t || 0;
    const record = isRecord(ex.name, s) && !ex.sets.some((x) => x !== s && x.done && (x.w || 0) >= (s.w || 0) && amt(x) >= amt(s));
    if (record) s.pr = true;
    const goal = ex.goals && ex.goals[a.setIdx];
    const beat = goal && (time ? s.t >= goal.t : s.r >= goal.r);
    startRest();
    const next = ex.sets.findIndex((x) => !x.done);
    if (next >= 0) {
      a.setIdx = next;
      if (beat) toast('Objectif atteint');
    } else {
      let ni = a.exercises.findIndex((e, i) => i > a.idx && !exDone(e));
      if (ni < 0) ni = a.exercises.findIndex((e) => !exDone(e));
      if (ni >= 0) { a.idx = ni; a.setIdx = firstTodo(a.exercises[ni]); ui.enter = true; toast(beat ? 'Objectif atteint, exercice suivant' : 'Exercice terminé'); top(); }
      else { a.view = 'list'; ui.enter = true; toast('Toutes les séries sont faites'); top(); }
    }
    if (record) { toast('Record battu', true); burst(); }
    save(); render(); renderRest();
  },
  unvalidate: () => { const s = curSet(); s.done = false; delete s.pr; state.active.rest = null; save(); render(); renderRest(); },
  'add-set': () => { const ex = curExo(); const last = ex.sets[ex.sets.length - 1] || {}; ex.sets.push({ r: last.r || 0, w: last.w || 0, t: last.t || 0, done: false }); if (ex.goals) ex.goals.push(null); state.active.setIdx = ex.sets.length - 1; save(); render(); },
  'del-set': () => { const a = state.active, ex = curExo(); ex.sets.splice(a.setIdx, 1); if (ex.goals) ex.goals.splice(a.setIdx, 1); a.setIdx = Math.max(0, Math.min(a.setIdx, ex.sets.length - 1)); save(); render(); },
  'ex-menu': (el) => sheetExMenu(+el.dataset.i),
  'ex-up': (el) => moveExo(+el.dataset.i, -1),
  'ex-down': (el) => moveExo(+el.dataset.i, 1),
  'ex-replace': (el) => { ui.pick = { mode: 'replace', i: +el.dataset.i }; ui.pickerQuery = ''; sheetPicker(); },
  'ex-measure': (el) => {
    const i = +el.dataset.i, ex = state.active.exercises[i];
    const to = measureOf(ex.name) === 'time' ? 'reps' : 'time';
    setPref(ex.name, { measure: to });
    for (const s of ex.sets) if (!s.done) { if (to === 'time') { s.t = s.t || 30; s.r = 0; } else { s.r = s.r || 8; s.t = 0; } }
    ex.goals = ex.sets.map(() => null);
    save(); render(); sheetExMenu(i);
  },
  'ex-lest': (el) => {
    const i = +el.dataset.i, ex = state.active.exercises[i];
    const on = !lestOf(ex.name);
    setPref(ex.name, { lest: on });
    if (!on) for (const s of ex.sets) if (!s.done) s.w = 0;
    save(); render(); sheetExMenu(i);
  },
  'ex-rest': (el) => { const i = +el.dataset.i; setPref(state.active.exercises[i].name, { rest: +el.dataset.s }); sheetExMenu(i); },
  'del-exo': (el) => {
    const a = state.active, i = +el.dataset.i;
    if (!confirm('Retirer cet exercice de la séance ?')) return;
    a.exercises.splice(i, 1);
    if (a.idx > i) a.idx -= 1;
    a.idx = Math.max(0, Math.min(a.idx, a.exercises.length - 1));
    if (!a.exercises.length) a.view = 'list'; else a.setIdx = firstTodo(a.exercises[a.idx]);
    save(); closeSheet(); render();
  },
  picker: (el) => { const n = state.active.exercises.length; ui.pick = { mode: 'insert', at: el.dataset.at === undefined ? n : +el.dataset.at }; ui.pickerQuery = ''; sheetPicker(); },
  'add-exo': (el) => {
    const name = el.dataset.name, p = ui.pick || {};
    closeSheet2();
    if (p.mode === 'edit' && ui.edit) { ui.edit.draft.exercises.push({ name, sets: defaultSets(name) }); sheetEditor(); const box = document.querySelector('#sheet .sheet > div'); box.scrollTop = box.scrollHeight; return; }
    const a = state.active;
    const ex = buildExo(name, defaultSets(name), a.title);
    if (p.mode === 'replace') { a.exercises[p.i] = ex; if (a.idx === p.i) a.setIdx = 0; closeSheet(); toast('Exercice remplacé'); }
    else { a.exercises.splice(p.at, 0, ex); if (a.view === 'focus' && p.at <= a.idx) a.idx += 1; toast(exoName(name) + ' ajouté en position ' + (p.at + 1)); }
    save(); render();
  },
  cancel: () => { if (confirm('Abandonner la séance ? Rien ne sera enregistré.')) { state.active = null; save(); ui.tab = 'home'; ui.enter = true; render(); renderRest(); } },
  finish: () => { finishWorkout(); renderRest(); },
  'rest-more': () => { state.active.rest.end += 15000; state.active.rest.total += 15; save(); renderRest(); },
  'rest-skip': () => { state.active.rest = null; save(); renderRest(); },
  chrono: () => {
    const a = state.active;
    wakeAudio();
    if (a.chrono) delete a.chrono; else { curSet().t = 0; a.chrono = { t0: Date.now() }; a.rest = null; }
    save(); render(); renderRest();
  },
  feel: (el) => {
    const w = state.workouts.find((x) => x.id === el.dataset.id);
    if (!w) return;
    w.feel = w.feel === el.dataset.v ? '' : el.dataset.v;
    save();
    const row = $('feel-row');
    if (row) row.innerHTML = feelPills(w);
  },
  share: (el) => { const w = state.workouts.find((x) => x.id === el.dataset.id); if (w) shareImage(w); },
  'ed-dup': () => {
    const d = ui.edit.draft;
    routines().push({ id: 'rt' + Date.now(), title: clean(d.label) + ' (copie)', label: clean(d.label) + ' (copie)', exercises: d.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ r: s.r || 0, w: s.w || 0, t: s.t || 0 })) })) });
    save(); closeSheet(); render(); toast('Routine dupliquée');
  },
  'new-routine': () => openEditor('routine', null),
  'edit-routine': (el) => openEditor('routine', el.dataset.id),
  'edit-workout': (el) => openEditor('workout', el.dataset.id),
  'ed-add-set': (el) => { const sets = edExo(el).sets; const last = sets[sets.length - 1] || { r: 8 }; sets.push({ r: last.r || 0, w: last.w || 0, t: last.t || 0 }); sheetEditor(); },
  'ed-del-set': (el) => { edExo(el).sets.splice(+el.dataset.i, 1); sheetEditor(); },
  'ed-del-exo': (el) => { ui.edit.draft.exercises.splice(+el.dataset.e, 1); sheetEditor(); },
  'ed-up': (el) => { const l = ui.edit.draft.exercises, i = +el.dataset.e; if (i > 0) { [l[i - 1], l[i]] = [l[i], l[i - 1]]; sheetEditor(); } },
  'ed-down': (el) => { const l = ui.edit.draft.exercises, i = +el.dataset.e; if (i < l.length - 1) { [l[i + 1], l[i]] = [l[i], l[i + 1]]; sheetEditor(); } },
  'ed-add-exo': () => { ui.pick = { mode: 'edit' }; ui.pickerQuery = ''; sheetPicker(); },
  'ed-save': () => saveEditor(),
  'ed-del-routine': () => { if (confirm('Supprimer cette routine ? Tes séances passées restent dans l’historique.')) { state.routines = routines().filter((r) => r.id !== ui.edit.id); save(); closeSheet(); render(); } },
});
