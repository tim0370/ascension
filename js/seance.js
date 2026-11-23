// Tout ce qui concerne une séance : routines, échauffement, vue d'ensemble, exercice en grand,
// repos, choix et fiche d'un exercice, modification d'une routine ou d'une séance passée, bilan de fin.
import { EXOS, FICHES, WARMUP, GROUPES } from './data.js';
import { figure } from './anim.js';
import { progCard, progDone, progPlan } from './programme.js';
import { camOk } from './camera.js';
import { dailyQuests, feats } from './quetes.js';
import { beep, wakeAudio } from './sound.js';
import {
  state, save, exoName, lastSets, kindOf, sorted, xpOf, totalXp, levelInfo, countPrs, isRecord,
  fr, dur, clock, dateFr, setText, exoHistory, routines, measureOf, lestOf, restOf, setPref,
} from './store.js';
import { $, esc, norm, clean, plural, toNum, ui, ACTIONS, ICON, checkDark, toast, sheet, closeSheet, closeSheet2, closeBtn, burst, setsSummary, chartSvg, xpFly, levelUp as levelUp_ } from './ui.js';
import { render, sheetDetail } from './app.js';

const curExo = () => state.active && state.active.exercises[state.active.idx];
const curSet = () => { const ex = curExo(); return ex && ex.sets[state.active.setIdx]; };
const exDone = (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done);
const firstTodo = (ex) => { const i = ex.sets.findIndex((s) => !s.done); return i < 0 ? Math.max(0, ex.sets.length - 1) : i; };
// Duel contre le fantôme : 1 = battu, 0 = égalité, -1 = il est devant. Le lest compte (environ 70 kg de poids du corps).
const ghostOf = (ex, i) => ex.ghost && ex.ghost.length ? ex.ghost[Math.min(i, ex.ghost.length - 1)] : null;
function duel(s, g) {
  const v = (x) => (x.r || x.t || 0) * (70 + (x.w || 0)) / 70;
  const a = v(s), b = v(g);
  return a > b + 0.01 ? 1 : a < b - 0.01 ? -1 : 0;
}
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
  return last && last.end - last.start >= 300000 ? 'environ ' + dur(Math.round((last.end - last.start) / 300000) * 300) : plural(r.exercises.reduce((n, e) => n + e.sets.length, 0), 'série', 'séries');
}

// Fenêtre « Mes routines » : tes anciennes routines, en secours, et la séance libre.
function sheetRoutines() {
  let h = '<div class="col"><span class="label">En secours</span><h1 class="h1">Mes routines</h1><span class="small mut">Le programme choisit ta séance. Tes routines restent ici si tu veux en faire une.</span></div><div class="list">';
  for (const r of routines()) {
    h += '<button type="button" class="item" data-act="routine" data-id="' + esc(r.id) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(r.label) + '</span><span class="small mut">' + plural(r.exercises.length, 'exercice', 'exercices') + ' · ' + usualTime(r) + '</span></div>' + ICON.chev + '</button>';
  }
  h += '</div><div class="row"><button type="button" class="pill glass grow" data-act="new-routine">Nouvelle routine</button><button type="button" class="pill glass grow" data-act="start" data-id="">Séance libre</button></div>'
    + '<button type="button" class="pill sm glass wide" data-act="close" style="color:var(--mut)">Fermer</button>';
  sheet(h);
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
  const lastEx = last ? last.exercises.find((e) => e.name === name) : (sorted().find((w) => w.exercises.some((e) => e.name === name)) || { exercises: [] }).exercises.find((e) => e.name === name);
  const feel = lastEx && lastEx.feel; // 'f' facile, 'b' bien, 'd' très dur
  const plus = feel === 'f' ? 2 : feel === 'd' ? 0 : 1;
  const topR = prev ? Math.max(0, ...prev.map((x) => x.r || 0)) : 0;
  let coach = '';
  if (feel === 'f') coach = 'C’était facile la dernière fois : vise ' + (time ? '10 s' : '2 répétitions') + ' de plus.';
  else if (feel === 'd') coach = 'Tu avais trouvé ça très dur : refais pareil, mais plus propre.';
  if (!time && lestOf(name) && topR >= 12 && feel !== 'd') coach = 'Tu passes 12 répétitions : ajoute 2,5 kg de lest et repars autour de 8.';
  return {
    name, coach,
    sets: sets.map((s, i) => { const p = (prev && (prev[i] || prev[prev.length - 1])) || s; return { r: time ? 0 : (p.r || s.r || 0), w: p.w || s.w || 0, t: time ? (p.t || s.t || 0) : 0, done: false }; }),
    goals: sets.map((s, i) => { const p = prev && (prev[i] || prev[prev.length - 1]); if (!p) return null; if (time) return p.t ? { t: p.t + 5 * plus } : null; return p.r ? { r: p.r + plus } : null; }),
    prev: prev ? prev.map(setText).join(', ') : '',
    // Le fantôme : ce que tu as fait la dernière fois, série par série.
    ghost: prev ? prev.map((x) => ({ r: x.r || 0, w: x.w || 0, t: x.t || 0 })) : null,
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

// Démarre une séance préparée par le programme guidé (programme.js).
export function startPlan(p) {
  const a = { title: p.title, label: p.label, routineId: null, start: Date.now(), view: 'list', idx: 0, setIdx: 0, rest: null, prog: p.prog,
    exercises: p.exercises.map((e) => buildExo(e.name, e.sets, p.title)) };
  // Re-test : au poids du corps, et sans objectif affiché (c'est ton max du jour).
  if (p.test) { a.test = true; for (const e of a.exercises) { for (const x of e.sets) x.w = 0; e.goals = e.goals.map(() => null); } }
  if (p.express) a.express = true;
  if (p.prog && p.prog.week === 3 && !p.test) a.tip = 'Semaine 3 : dernière série des exercices principaux au maximum.';
  if (p.test) a.tip = 'Re-test : une seule série par exercice, au maximum. 3 minutes de repos entre chaque.';
  if (state.settings.warm) a.warm = { i: 0, end: Date.now() + WARMUP[0].secs * 1000 };
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
    let h = '<div class="col" style="gap:2px"><span class="small mut">Ton programme guidé</span><h1 class="h1">Séance</h1></div>';
    h += progCard(true);
    // Le reste (routines, séance libre, course) est rangé derrière deux tuiles, pour laisser la place au programme.
    h += '<div class="tiles"><section class="glass tile tap" role="button" tabindex="0" data-act="routines"><span class="label">Mes routines</span>'
      + '<span class="h2">' + plural(routines().length, 'routine', 'routines') + '</span><span class="small mut" style="margin-top:auto">Full Body, séance libre</span></section>'
      + '<section class="glass tile tap" role="button" tabindex="0" data-act="run"><span class="label">Course</span><span class="ico gold">' + ICON.run + '</span><span class="small mut" style="margin-top:auto">Avec le GPS, quand tu veux</span></section>'
      + '<section class="glass tile tap" role="button" tabindex="0" data-act="chrono2"><span class="label">Chrono</span><span class="ico">' + ICON.bolt + '</span><span class="small mut" style="margin-top:auto">Tabata, EMOM, AMRAP</span></section>'
      + '<section class="glass tile tap" role="button" tabindex="0" data-act="quick"><span class="label">Pompes du jour</span><span class="ico">' + ICON.plus + '</span><span class="small mut" style="margin-top:auto">Une série hors séance</span></section></div>'
      + '<button type="button" class="pill glass wide" data-act="cooldown">Retour au calme · 3 min d’étirements</button>';
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
    + (m.fig ? '<div class="cdfig" style="width:100%">' + figure(m.fig) + '</div>' : '')
    + '<span class="h1" style="font-size:30px">' + esc(m.name) + '</span><span class="num" id="warm-time" style="font-size:80px;line-height:1.05;letter-spacing:-2px">' + Math.max(0, Math.ceil((a.warm.end - Date.now()) / 1000)) + '</span>'
    + '<span class="mut">' + esc(m.tip) + '</span></section>'
    + '<button type="button" class="pill gold-btn wide big" data-act="warm-next">' + (a.warm.i < WARMUP.length - 1 ? 'Mouvement suivant' : 'Commencer la séance') + '</button>';
}

// Vue d'ensemble : toute la séance, on touche un exercice pour l'ouvrir en grand.
// Après la dernière série d'un exercice : « c'était comment ? » (adapte l'objectif de la prochaine fois).
function feelCard(a) {
  const i = a.feelAsk;
  if (i === undefined || i === null || !a.exercises[i]) return '';
  return '<section class="feelask"><div class="row between"><span class="small" style="font-weight:600">' + esc(exoName(a.exercises[i].name)) + ' : c’était comment ?</span><button type="button" class="feelx" data-act="feel-skip" aria-label="Passer">' + ICON.x + '</button></div>'
    + '<div class="row" style="gap:8px">' + [['f', 'Facile'], ['b', 'Bien'], ['d', 'Très dur']].map(([k, l]) => '<button type="button" class="pill sm glass grow" data-act="feel-ex" data-v="' + k + '">' + l + '</button>').join('') + '</div></section>';
}

function viewList(a) {
  const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const cur = a.exercises.findIndex((e) => !exDone(e));
  let h = '<div class="row between"><div class="col" style="gap:2px"><span class="small mut">Séance en cours</span><h1 class="h1">' + esc(a.label) + '</h1></div>'
    + '<span class="num" id="elapsed" style="font-size:22px;color:var(--soft)">' + clock((Date.now() - a.start) / 1000) + '</span></div>';
  h += feelCard(a);
  h += '<section class="glass card hud col" style="gap:10px"><div class="row between"><span class="h2">' + done + ' sur ' + plural(total, 'série', 'séries') + '</span><span class="gold-text num" style="font-size:17px">+' + (done * 10) + ' XP</span></div>'
    + '<div class="bar gold"><div style="width:' + (total ? Math.round((done / total) * 100) : 0) + '%"></div></div>'
    + (a.tip ? '<span class="small" style="color:var(--violet-soft)">' + esc(a.tip) + '</span>' : '') + '</section>';
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
  h += feelCard(a);
  h += '<div class="row" style="align-items:flex-start;gap:12px"><div class="col grow" style="gap:4px"><span class="label violet">Exercice ' + (a.idx + 1) + ' sur ' + n + '</span><h1 class="h1" style="font-size:30px">' + esc(exoName(ex.name)) + '</h1>'
    + '<span class="small mut">' + (ex.prev ? 'La dernière fois : ' + esc(ex.prev) : 'Première fois sur cet exercice') + '</span>'
    + (ex.coach ? '<span class="coach">' + ICON.bolt + esc(ex.coach) + '</span>' : '')
    + (ex.note ? '<span class="small" style="color:var(--gold)">Note : ' + esc(ex.note) + '</span>' : '') + '</div>'
    + '<button type="button" class="figbtn" data-act="exo" data-name="' + esc(ex.name) + '" aria-label="Voir comment faire">' + figure(ex.name) + '</button></div>';
  h += '<div class="chips">' + ex.sets.map((x, k) => '<button type="button" class="chip' + (x.done ? ' done' : '') + (k === a.setIdx ? ' sel' : '') + (x.pr ? ' pr' : '') + '" data-act="sel-set" data-i="' + k + '" aria-label="Série ' + (k + 1) + '">' + chipLabel(ex.name, x) + '</button>').join('') + '</div>';
  if (s) {
    const f = time ? 't' : 'r';
    const step = time ? 5 : 1;
    const goalText = goal ? 'Objectif : ' + (time ? goal.t + ' s' : goal.r) : '';
    const g = a.prog && !a.test ? ghostOf(ex, a.setIdx) : null;
    const ghostLine = g ? '<div class="ghost' + (s.done && s.gh !== undefined ? (s.gh > 0 ? ' win' : s.gh < 0 ? ' lose' : '') : '') + '"><span class="ghost-ico" aria-hidden="true"></span><span>Fantôme : <b>' + (time ? g.t + ' s' : g.r + ' rép.') + (g.w ? ' à ' + fr(g.w, 1) + ' kg' : '') + '</b></span>'
      + (s.done && s.gh !== undefined ? '<span class="ghost-res">' + (s.gh > 0 ? 'battu' : s.gh < 0 ? 'devant toi' : 'égalité') + '</span>' : '') + '</div>' : '';
    h += '<section class="glass card hud col" style="border-radius:32px;padding:24px 18px;gap:18px;align-items:stretch">'
      + '<div class="row between" style="padding:0 6px"><span class="label">Série ' + (a.setIdx + 1) + ' sur ' + ex.sets.length + '</span>' + (goalText ? '<span class="gold-text small" style="font-weight:600">' + goalText + '</span>' : '') + '</div>' + ghostLine
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
    if (!time && !s.done && camOk(ex.name)) {
      h += '<button type="button" class="pill glass wide" data-act="cam">' + ICON.camera + 'Compter avec la caméra</button>';
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
  const g = EXOS[name] && GROUPES[EXOS[name].g];
  let h = '<div class="col"><span class="label">' + (g ? esc(g) + ' · ' : '') + (list.length ? plural(list.length, 'séance', 'séances') : 'jamais fait') + '</span><h1 class="h1">' + esc(exoName(name)) + '</h1></div>';
  h += figure(name, 'big');
  if (f) {
    h += '<div class="exo"><span class="label">Muscles</span><span style="color:var(--soft)">' + esc(f.muscles) + '</span></div>';
    h += '<div class="exo"><span class="label violet">Comment faire</span>'
      + f.steps.map((x, i) => '<div class="row" style="align-items:flex-start"><span class="num gold-text" style="width:18px;font-size:16px">' + (i + 1) + '</span><span class="grow" style="color:var(--soft)">' + esc(x) + '</span></div>').join('') + '</div>';
    h += '<div class="exo"><span class="label">Erreurs fréquentes</span>'
      + f.erreurs.map((x) => '<div class="row" style="align-items:flex-start;gap:10px"><span class="errdot"></span><span class="grow small" style="color:var(--soft)">' + esc(x) + '</span></div>').join('') + '</div>';
    // Version plus facile et plus dure : touchables pour voir leur fiche.
    const step = (k, label) => {
      if (!k) return '';
      if (k === name) return '<div class="exo grow" style="gap:4px"><span class="label">' + label + '</span><span class="small" style="color:var(--soft)">' + (label === 'Plus dur' ? 'Ajoute du lest : gilet ou haltère' : 'Moins de répétitions, plus lentement') + '</span></div>';
      return '<button type="button" class="exo grow vary" data-act="exo" data-name="' + esc(k) + '">' + figure(k) + '<span class="label">' + label + '</span><span class="small" style="font-weight:600">' + esc(exoName(k)) + '</span></button>';
    };
    if (f.facile || f.dur) h += '<div class="row" style="align-items:stretch">' + step(f.facile, 'Plus facile') + step(f.dur, 'Plus dur') + '</div>';
  }
  if (list.length >= 2) {
    const values = list.slice(0, 24).reverse().map((x) => Math.max(...x.sets.map((s) => s.r || s.t || 0)));
    h += '<div class="exo"><span class="label">Meilleure série de chaque séance</span>' + chartSvg(values, time ? ' s' : ' rép.') + '</div>';
  }
  if (most) {
    h += '<div class="row" style="align-items:stretch"><div class="exo grow"><span class="label">' + (time ? 'Le plus long' : 'Le plus de répétitions') + '</span><span class="num gold-text" style="font-size:22px">' + esc(setText(most.set)) + '</span><span class="small mut">' + dateFr(most.date, true) + '</span></div>'
      + (heavy ? '<div class="exo grow"><span class="label">Le plus lourd</span><span class="num gold-text" style="font-size:22px">' + esc(setText(heavy.set)) + '</span><span class="small mut">' + dateFr(heavy.date, true) + '</span></div>' : '') + '</div>';
  }
  if (list.length && !time && name !== 'Running') h += potential(name, list);
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
  mine.delete('Running');
  // Exercices de l'historique absents du catalogue (anciens ou créés par toi) : proposés à la fin.
  const others = new Set();
  for (const w of state.workouts) for (const e of w.exercises) if (!EXOS[e.name] || EXOS[e.name].old) others.add(e.name);
  for (const n of mine) if (!EXOS[n]) others.add(n);
  others.delete('Running');
  const q = norm(ui.pickerQuery);
  const fam = ui.pickerFam || '';
  const match = (n) => (!q || norm(exoName(n)).includes(q) || norm(n).includes(q)) && (!fam || (EXOS[n] && EXOS[n].g === fam));
  const card = (n) => '<button type="button" class="pcard" data-act="add-exo" data-name="' + esc(n) + '">' + figure(n) + '<span class="pname">' + esc(exoName(n)) + '</span>'
    + '<span class="small mut">' + esc((EXOS[n] && GROUPES[EXOS[n].g]) || 'Perso') + (measureOf(n) === 'time' ? ' · durée' : '') + '</span></button>';
  const row = (n) => '<button type="button" class="item" data-act="add-exo" data-name="' + esc(n) + '"><span class="grow" style="font-weight:500">' + esc(exoName(n)) + '</span><span class="small mut">' + (measureOf(n) === 'time' ? 'durée' : 'répétitions') + '</span></button>';
  const cat = Object.keys(EXOS).filter((n) => !EXOS[n].old && n !== 'Running');
  const a1 = [...mine].filter((n) => EXOS[n] && match(n));
  let items = '';
  if (a1.length && !fam) items += '<span class="label" style="padding:10px 0 2px">Tes exercices actuels</span><div class="pgrid">' + a1.map(card).join('') + '</div>';
  for (const g of Object.keys(GROUPES)) {
    if (fam && g !== fam) continue;
    const list = cat.filter((n) => EXOS[n].g === g && match(n) && (fam || !mine.has(n)));
    if (list.length) items += '<span class="label" style="padding:14px 0 2px">' + GROUPES[g] + '</span><div class="pgrid">' + list.map(card).join('') + '</div>';
  }
  const a3 = [...others].filter((n) => !fam && match(n)).sort((x, y) => exoName(x).localeCompare(exoName(y), 'fr'));
  if (a3.length) items += '<span class="label" style="padding:14px 0 2px">Anciens et perso</span><div class="list">' + a3.map(row).join('') + '</div>';
  const all = cat.concat([...others]);
  const exact = all.some((n) => norm(exoName(n)) === q || norm(n) === q);
  // Créer son propre exercice : proposé en dernier, pour ne pas le toucher par erreur.
  if (q && !exact) {
    const typed = clean(ui.pickerQuery);
    const made = typed.charAt(0).toUpperCase() + typed.slice(1);
    items += '<span class="label" style="padding:14px 0 4px">Pas dans la liste ?</span><button type="button" class="item" data-act="add-exo" data-name="' + esc(made) + '"><span class="grow gold-text" style="font-weight:600">Créer « ' + esc(made) + ' »</span></button>';
  }
  if (!items) items = '<span class="mut" style="padding:20px 0">Aucun exercice ne correspond.</span>';
  const chips = '<div class="fams" id="picker-fams">' + [['', 'Tout']].concat(Object.entries(GROUPES)).map(([k, v]) => '<button type="button" class="pill sm ' + (fam === k ? 'gold-btn' : 'glass') + '" data-act="pick-fam" data-k="' + k + '">' + v + '</button>').join('') + '</div>';
  const old = $('picker-list');
  if (old) { old.innerHTML = items; $('picker-fams').outerHTML = chips; return; }
  const title = ui.pick && ui.pick.mode === 'replace' ? 'Remplacer par' : 'Ajouter un exercice';
  sheet('<h1 class="h1">' + title + '</h1>'
    + '<input class="textin" id="picker-q" placeholder="Chercher ou créer un exercice" aria-label="Chercher ou créer un exercice" value="' + esc(ui.pickerQuery) + '">'
    + chips + '<div class="col" id="picker-list" style="gap:6px">' + items + '</div>', 2, 'full');
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
// Note de la séance, comme dans un jeu : séries faites, objectifs atteints, records, duel contre le fantôme.
export const GRADES = ['S', 'A', 'B', 'C', 'D', 'E'];
function gradeOf(a, w) {
  if (a.test) return null; // le re-test se juge sur les maximums, pas sur une note
  let planned = 0, done = 0, goals = 0, hit = 0;
  for (const e of a.exercises) e.sets.forEach((st, i) => {
    planned += 1;
    if (!st.done || !(st.r || st.t)) return;
    done += 1;
    const g = e.goals && e.goals[i];
    if (g) { goals += 1; if ((g.r && (st.r || 0) >= g.r) || (g.t && (st.t || 0) >= g.t)) hit += 1; }
  });
  if (!planned) return null;
  let score = 40 * (done / planned) + (goals ? 35 * (hit / goals) : 20) + Math.min(15, (w.prs || 0) * 8);
  if (w.ghost) score += w.ghost.won > w.ghost.lost ? 10 : w.ghost.won === w.ghost.lost ? 5 : 0;
  else score += 5;
  w.score = Math.round(score);
  return score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 45 ? 'C' : score >= 30 ? 'D' : 'E';
}
const GRADE_TXT = { S: 'Parfait. Tout fait, objectifs battus.', A: 'Très belle séance.', B: 'Solide. Encore un effort sur les objectifs.', C: 'Correct, mais tu peux faire mieux.', D: 'Séance difficile. Ça arrive.', E: 'Le plus dur, c’était de venir. C’est fait.' };

function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map((e) => { const o = { name: e.name, sets: e.sets.filter((s) => s.done && (s.r || s.t)).map((s) => { const x = { done: true }; if (s.r) x.r = s.r; if (s.w) x.w = s.w; if (s.t) x.t = s.t; return x; }) }; if (e.note && clean(e.note)) o.note = clean(e.note); if (e.feel) o.feel = e.feel; return o; })
    .filter((e) => e.sets.length);
  if (!exercises.length) { toast('Valide au moins une série avant de terminer'); return; }
  const left = a.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
  if (left && !confirm('Il reste ' + plural(left, 'série non validée', 'séries non validées') + '. Terminer quand même ?')) return;
  delete a.chrono;
  const xpBefore = totalXp();
  const qBefore = new Set(dailyQuests().filter((q) => q.done).map((q) => q.id));
  const w = { id: 'a' + a.start, title: a.title, start: a.start, end: Date.now(), exercises };
  if (a.prog) w.prog = a.prog;
  if (a.prog && !a.test) {
    const duels = a.exercises.flatMap((e) => e.sets.filter((x) => x.done && x.gh !== undefined));
    if (duels.length) w.ghost = { won: duels.filter((x) => x.gh > 0).length, lost: duels.filter((x) => x.gh < 0).length, total: duels.length };
  }
  state.workouts.push(w);
  w.prs = countPrs(w);
  w.grade = gradeOf(a, w);
  const progMsg = progDone(w);
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
  const fNew = feats().fresh; // hauts faits réussis par cette séance
  ui.tab = 'home';
  ui.enter = true;
  render();
  top();
  sheetSummary(w, a.label, xpBefore, qNew, fNew);
  if (progMsg) toast(progMsg);
}

// Ton potentiel sur un exercice : total à vie, et ce que tu ferais avec plus de lest (formule d'Epley).
const BODY_SHARE = { dips: 0.95, pompes: 0.65, pecs: 0.65, jambes: 0.9, dos: 0.6 };
function potential(name, list) {
  let reps = 0, kg = 0;
  for (const x of list) for (const s of x.sets) { reps += s.r || 0; kg += (s.w || 0) * (s.r || 0); }
  let h = '<div class="row" style="align-items:stretch"><div class="exo grow"><span class="label">À vie</span><span class="num" style="font-size:22px">' + reps.toLocaleString('fr-FR') + '</span><span class="small mut">répétitions' + (kg ? ' · ' + Math.round(kg).toLocaleString('fr-FR') + ' kg de lest soulevés' : '') + '</span></div>';
  const share = /Pistol/.test(name) ? 0 : BODY_SHARE[(EXOS[name] || {}).g];
  const recent = list.filter((x) => Date.now() - x.date < 42 * 864e5).flatMap((x) => x.sets).filter((s) => s.r >= 3 && s.r <= 20);
  if (share && recent.length) {
    const bw = (state.body && state.body.length) ? state.body.slice().sort((a, b) => b.d - a.d)[0].kg : 70;
    const base = (s) => bw * share + (s.w || 0);
    const best = recent.reduce((m, s) => (base(s) * (1 + s.r / 30) > base(m) * (1 + m.r / 30) ? s : m), recent[0]);
    const L = base(best) * (1 + best.r / 30);
    const w2 = (best.w || 0) + 5;
    const r2 = Math.max(0, Math.floor(30 * (L / (bw * share + w2) - 1)));
    const max1 = Math.max(0, Math.round((L - bw * share) * 2) / 2);
    h += '<div class="exo grow"><span class="label">Ton potentiel</span><span class="num violet-text" style="font-size:22px">' + (r2 >= 1 ? r2 + ' rép.' : String(max1).replace('.', ',') + ' kg') + '</span><span class="small mut">' + (r2 >= 1 ? 'estimé avec ' + String(w2).replace('.', ',') + ' kg de lest' : 'de lest pour une seule répétition') + '</span></div>';
  }
  return h + '</div>';
}

// Voix du coach (réglage « Voix du coach ») : annonce la série suivante à la fin du repos.
export function speak(t) {
  if (!state.settings.voiceCoach) return;
  try { const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 1.05; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { /* pas de voix */ }
}
function announceNext() {
  const a = state.active, ex = curExo(), s = curSet();
  if (!a || !ex || !s || s.done) return;
  const time = measureOf(ex.name) === 'time';
  const g = ex.goals && ex.goals[a.setIdx];
  const n = ex.sets.length;
  speak(exoName(ex.name) + ', série ' + (a.setIdx + 1) + ' sur ' + n + '. ' + (g ? 'Objectif : ' + (time ? g.t + ' secondes' : g.r + ' répétitions') + '.' : 'Vas-y.'));
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

function sheetSummary(w, label, xpBefore, qNew, fNew) {
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
  if (w.grade) h += '<section class="glass card gradecard g' + w.grade + '"><span class="grade">' + w.grade + '</span><div class="col grow" style="gap:3px"><span class="label">Note de la séance</span><span style="font-weight:600">' + esc(GRADE_TXT[w.grade]) + '</span><span class="small mut">Séries faites, objectifs atteints, records et duel contre ton fantôme · ' + w.score + ' sur 100</span></div></section>';
  h += '<section class="glass card hud col" style="gap:10px"><div class="row between"><span class="h2">Niveau ' + after.level + '</span>'
    + (levelUp ? '<span class="tag gold">Niveau supérieur</span>' : '<span class="small mut">Encore ' + (after.need - after.into) + ' XP</span>') + '</div>'
    + '<div class="bar"><div id="xp-bar" style="transition:width 1.2s cubic-bezier(0.2,0.8,0.2,1);width:' + (levelUp ? 0 : Math.round((before.into / before.need) * 100)) + '%"></div></div></section>';
  h += '<section class="glass card"><div class="stats3" style="grid-template-columns:repeat(' + (kg ? 4 : 3) + ',minmax(0,1fr))">' + stat('durée', dur((w.end - w.start) / 1000)) + stat(sets > 1 ? 'séries' : 'série', sets) + stat('répétitions', reps) + (kg ? stat('kg soulevés', Math.round(kg).toLocaleString('fr-FR')) : '') + '</div></section>';
  if (recs.length) {
    h += '<section class="glass card col" style="gap:8px;border-color:rgba(205,170,98,0.5)"><span class="gold-text h2">' + plural(recs.length, 'record battu', 'records battus') + '</span>'
      + recs.map((l) => '<div class="row between"><span style="font-weight:500">' + esc(exoName(l.name)) + '</span><span class="small mut">' + esc(l.text) + '</span></div>').join('') + '</section>';
  }
  if (w.ghost) {
    const g = w.ghost, win = g.won > g.lost;
    h += '<section class="glass card col duel' + (win ? ' win' : '') + '" style="gap:8px"><div class="row between"><span class="h2">' + (win ? 'Duel gagné contre ton fantôme' : g.won === g.lost ? 'Égalité avec ton fantôme' : 'Ton fantôme gagne cette fois') + '</span></div>'
      + '<div class="duelbar"><i style="width:' + Math.round((g.won / g.total) * 100) + '%"></i><b style="width:' + Math.round((g.lost / g.total) * 100) + '%"></b></div>'
      + '<span class="small mut">Contre toi la dernière fois : ' + plural(g.won, 'série gagnée', 'séries gagnées') + ', ' + plural(g.lost, 'perdue', 'perdues') + (g.total - g.won - g.lost ? ', ' + (g.total - g.won - g.lost) + ' à égalité' : '') + '.</span></section>';
  }
  if (fNew && fNew.length) {
    h += '<section class="glass card col feat-new" style="gap:8px"><span class="label">' + plural(fNew.length, 'haut fait réussi', 'hauts faits réussis') + '</span>'
      + fNew.map((f) => '<div class="row between"><div class="col" style="gap:2px"><span class="h2">' + esc(f.label) + '</span><span class="small mut">' + esc(f.desc) + '</span></div><span class="tag gold">' + (f.reward.title ? 'Titre' : 'Couleur') + '</span></div>').join('') + '</section>';
  }
  if (qNew.length) {
    h += '<section class="glass card col" style="gap:8px"><span class="h2">' + plural(qNew.length, 'quête réussie', 'quêtes réussies') + '</span>'
      + qNew.map((q) => '<div class="row between"><span>' + esc(q.label) + '</span><span class="gold-text" style="font-weight:600">+' + q.xp + ' XP</span></div>').join('') + '</section>';
  }
  h += '<span class="label">' + (prev ? 'Par rapport à la dernière fois' : 'Ta séance') + '</span><div class="list">'
    + lines.map((l) => '<button type="button" class="item" data-act="exo" data-name="' + esc(l.name) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(l.name)) + '</span><span class="small mut">' + esc(l.text) + '</span></div>'
      + (l.delta ? '<span class="small ' + (l.up ? 'gold-text' : 'mut') + '" style="font-weight:600;white-space:nowrap">' + l.delta + '</span>' : '') + '</button>').join('') + '</div>';
  h += '<div class="col" style="gap:8px"><span class="label">Comment c’était ?</span><div class="row" id="feel-row">' + feelPills(w) + '</div></div>';
  h += '<button type="button" class="pill glass wide" data-act="cooldown" style="color:var(--violet-soft)">Retour au calme · 3 min d’étirements</button>';
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
  if (recs.length) burst();
  if (levelUp) setTimeout(() => levelUp_(after.level), 700);
}

// ---------- Repos, son, écran allumé ----------
// Le son (bip) est dans sound.js.
function startRest() {
  wakeAudio();
  const ex = curExo();
  const total = state.active.test ? 180 : (ex ? restOf(ex.name) : (state.settings.rest || 90));
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
    if (left <= 0) { if (left > -3) beep(); warmNext(); } else if (el) el.textContent = left;
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
      if (goal && goal.t && s.t >= goal.t && !a.chrono.rang) { a.chrono.rang = true; if (s.t - goal.t < 3) beep(); toast('Objectif atteint, tiens encore si tu peux'); }
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
  // Pas de bip en retard : si l'app était fermée à la fin du repos, on ne sonne pas au retour.
  if (left <= 0 && !a.rest.rang) { a.rest.rang = true; if (left > -3) { beep(); setTimeout(announceNext, 700); } save(); }
  if (left < -30) { a.rest = null; save(); $('rest').innerHTML = ''; return; }
  const ratio = Math.max(0, Math.min(1, left / a.rest.total));
  const over = left <= 0;
  const offset = (169.6 * (1 - ratio)).toFixed(1);
  // Si le bandeau est déjà affiché dans le bon état, on ne met à jour que le chrono (sinon les boutons rateraient des appuis).
  const box = $('rest').firstElementChild;
  if (box && box.dataset.over === String(over)) {
    if (!over) { $('rest-time').textContent = clock(left); $('rest-ring').setAttribute('stroke-dashoffset', offset); box.classList.toggle('soon', left <= 5); }
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
  'prog-start': (el) => {
    if (state.active) { toast('Une séance est déjà en cours'); return; }
    startPlan(progPlan(el.dataset.type, el.dataset.mode || ''));
    ui.progMode = '';
  },
  routine: (el) => sheetRoutine(el.dataset.id),
  routines: () => sheetRoutines(),
  exo: (el) => sheetExo(el.dataset.name),
  start: (el) => startWorkout(el.dataset.id, { express: !!el.dataset.express }),
  'toggle-warm': (el) => { state.settings.warm = !state.settings.warm; save(); sheetRoutine(el.dataset.id); },
  'warm-next': () => warmNext(),
  'warm-skip': () => { const a = state.active; delete a.warm; a.start = Date.now(); save(); ui.enter = true; render(); },
  goto: (el) => { const a = state.active; a.idx = +el.dataset.i; a.view = 'focus'; a.setIdx = firstTodo(a.exercises[a.idx]); save(); closeSheet(); ui.enter = true; render(); top(); },
  list: () => { state.active.view = 'list'; save(); ui.enter = true; render(); top(); },
  'sel-set': (el) => { state.active.setIdx = +el.dataset.i; save(); render(); },
  step: (el) => { const s = curSet(), f = el.dataset.f; s[f] = Math.max(0, Math.round(((s[f] || 0) + (+el.dataset.d)) * 10) / 10); save(); render(); },
  'feel-ex': (el) => {
    const a = state.active; if (!a || a.feelAsk == null) return;
    const ex = a.exercises[a.feelAsk]; if (ex) ex.feel = el.dataset.v;
    delete a.feelAsk; save(); render();
    toast(el.dataset.v === 'f' ? 'Noté : la prochaine fois, objectif plus haut' : el.dataset.v === 'd' ? 'Noté : la prochaine fois, même objectif' : 'Noté');
  },
  'feel-skip': () => { const a = state.active; if (a) { delete a.feelAsk; save(); render(); } },
  validate: () => {
    // Deux appuis trop rapprochés ne valident pas deux séries d'un coup.
    if (Date.now() - (ui.lastValidate || 0) < 600) return;
    ui.lastValidate = Date.now();
    const a = state.active, ex = curExo(), s = curSet();
    const time = measureOf(ex.name) === 'time';
    delete a.chrono;
    if (!(time ? s.t : s.r)) { toast(time ? 'Indique la durée' : 'Indique les répétitions'); return; }
    s.done = true;
    const amt = (x) => x.r || x.t || 0;
    const record = isRecord(ex.name, s) && !ex.sets.some((x) => x !== s && x.done && (x.w || 0) >= (s.w || 0) && amt(x) >= amt(s));
    if (record) s.pr = true;
    const gh = a.prog && !a.test ? ghostOf(ex, a.setIdx) : null;
    if (gh) s.gh = duel(s, gh); else delete s.gh;
    const goal = ex.goals && ex.goals[a.setIdx];
    const beat = goal && (time ? s.t >= goal.t : s.r >= goal.r);
    startRest();
    const next = ex.sets.findIndex((x) => !x.done);
    if (next < 0 && !ex.feel) a.feelAsk = a.exercises.indexOf(ex);
    if (next >= 0) {
      a.setIdx = next;
      if (beat) toast('Objectif atteint');
    } else {
      let ni = a.exercises.findIndex((e, i) => i > a.idx && !exDone(e));
      if (ni < 0) ni = a.exercises.findIndex((e) => !exDone(e));
      if (ni >= 0) { a.idx = ni; a.setIdx = firstTodo(a.exercises[ni]); ui.enter = true; toast(beat ? 'Objectif atteint, exercice suivant' : 'Exercice terminé'); top(); }
      else { a.view = 'list'; ui.enter = true; toast('Toutes les séries sont faites'); top(); }
    }
    if (record) { toast('Record battu', true); burst(); speak('Record battu. Bravo.'); }
    else if (beat) speak('Objectif atteint.');
    else if (gh && s.gh > 0) toast('Fantôme battu');
    const doneIdx = ex.sets.indexOf(s), exIdx = a.exercises.indexOf(ex);
    save(); render(); renderRest();
    // Récompense visible : la puce de la série rebondit et « +10 XP » s'envole.
    try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) { /* pas de vibreur */ }
    const chip = a.view === 'focus' && a.idx === exIdx ? document.querySelectorAll('.chips .chip')[doneIdx] : document.querySelector('[data-act="goto"][data-i="' + exIdx + '"] .chip.done:last-of-type');
    const at = chip || document.querySelector('.chips') || document.getElementById('app');
    if (chip) chip.classList.add('pop');
    xpFly(at, record ? '+35 XP' : '+10 XP');
    // La barre du repos ne doit pas cacher le bouton « Valider » de la série suivante.
    setTimeout(() => {
      const v = document.querySelector('[data-act="validate"]'), rb = document.querySelector('.rest');
      if (!v || !rb) return;
      const over = v.getBoundingClientRect().bottom + 12 - rb.getBoundingClientRect().top;
      if (over > 0) window.scrollBy({ top: over, behavior: 'smooth' });
    }, 80);
  },
  unvalidate: () => { const s = curSet(); s.done = false; delete s.pr; delete s.gh; state.active.rest = null; save(); render(); renderRest(); },
  'add-set': () => { const ex = curExo(); const last = ex.sets[ex.sets.length - 1] || {}; ex.sets.push({ r: last.r || 0, w: last.w || 0, t: last.t || 0, done: false }); if (ex.goals) ex.goals.push(null); state.active.setIdx = ex.sets.length - 1; save(); render(); },
  'del-set': () => { const a = state.active, ex = curExo(); ex.sets.splice(a.setIdx, 1); if (ex.goals) ex.goals.splice(a.setIdx, 1); a.setIdx = Math.max(0, Math.min(a.setIdx, ex.sets.length - 1)); save(); render(); },
  'ex-menu': (el) => sheetExMenu(+el.dataset.i),
  'ex-up': (el) => moveExo(+el.dataset.i, -1),
  'ex-down': (el) => moveExo(+el.dataset.i, 1),
  'ex-replace': (el) => { ui.pick = { mode: 'replace', i: +el.dataset.i }; ui.pickerQuery = ''; ui.pickerFam = ''; sheetPicker(); },
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
  picker: (el) => { const n = state.active.exercises.length; ui.pick = { mode: 'insert', at: el.dataset.at === undefined ? n : +el.dataset.at }; ui.pickerQuery = ''; ui.pickerFam = ''; sheetPicker(); },
  'pick-fam': (el) => { ui.pickerFam = el.dataset.k; sheetPicker(); const b = document.querySelector('#sheet2 .sheet > div'); if (b) b.scrollTop = 0; },
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
  'ed-add-exo': () => { ui.pick = { mode: 'edit' }; ui.pickerQuery = ''; ui.pickerFam = ''; sheetPicker(); },
  'ed-save': () => saveEditor(),
  'ed-del-routine': () => { if (confirm('Supprimer cette routine ? Tes séances passées restent dans l’historique.')) { state.routines = routines().filter((r) => r.id !== ui.edit.id); save(); closeSheet(); render(); } },
});
