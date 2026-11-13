// Écrans de l'app. Chaque fonction view*() renvoie le HTML d'un écran ; render() l'affiche.
// Les fenêtres de détail sont les fonctions sheet*(). Les boutons portent un attribut data-act, traité dans ACTIONS.
import { EXOS, RANKS } from './data.js';
import {
  state, save, exoName, lastSets, kindOf, sorted, runs, xpOf, totalXp, levelInfo, weekStreak, countPrs,
  fr, dur, clock, pace, dateFr, setText, workoutText, importHevy, exportJson, importJson,
  dailyQuests, weekDays, totals, xpBreakdown, exoHistory, routines,
} from './store.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
const clean = (s) => String(s).replace(/\s+/g, ' ').trim();
const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
const toNum = (v) => parseFloat(String(v).replace(',', '.')) || 0;
// ui.edit = brouillon en cours de modification : { type: 'routine' | 'workout', id, draft }
const ui = { tab: 'home', historyLimit: 30, pickerQuery: '', enter: true, edit: null };

// ---------- Petits éléments ----------
const svg = (body, extra) => '<svg aria-hidden="true" ' + (extra || '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
const ICON = {
  check: '<svg aria-hidden="true" viewBox="0 0 44 44"><circle cx="22" cy="22" r="14" fill="none" stroke="#CDAA62" stroke-width="1.6"/><path d="M16 22.5l4.2 4.2L28.5 18" fill="none" stroke="#D8BD82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  todo: '<svg aria-hidden="true" viewBox="0 0 44 44"><circle cx="22" cy="22" r="14" fill="none" stroke="#8468E8" stroke-width="2"/></svg>',
  gear: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', 'width="20" height="20"'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>', 'width="18" height="18"'),
  chev: svg('<path d="M9 6l6 6-6 6"/>', 'class="chev"'),
  up: svg('<path d="M6 14l6-6 6 6"/>'),
  down: svg('<path d="M6 10l6 6 6-6"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
};

function rankSvg(letter, small) {
  return '<svg class="rank" role="img" aria-label="Rang ' + letter + '" viewBox="0 0 72 80"' + (small ? ' style="width:34px;height:38px;animation:none"' : '') + '><defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4E6BC"/><stop offset="0.55" stop-color="#CDAA62"/><stop offset="1" stop-color="#8F6D33"/></linearGradient></defs>'
    + '<polygon points="36,3 68,21 68,59 36,77 4,59 4,21" fill="rgba(10,9,15,0.55)" stroke="url(#gold)" stroke-width="' + (small ? 4 : 2) + '"/>'
    + (small ? '' : '<polygon points="36,11 61,25 61,55 36,69 11,55 11,25" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>')
    + '<text x="36" y="' + (small ? 53 : 50) + '" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="' + (small ? 38 : 30) + '" font-weight="700" fill="url(#gold)">' + letter + '</text></svg>';
}

function toast(msg) {
  $('toast').innerHTML = '<div class="toast glass">' + esc(msg) + '</div>';
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { $('toast').innerHTML = ''; }, 2600);
}

function sheet(html, layer) { $(layer === 2 ? 'sheet2' : 'sheet').innerHTML = '<div class="sheet"><div>' + html + '</div></div>'; }
function closeSheet() { $('sheet').innerHTML = ''; $('sheet2').innerHTML = ''; ui.edit = null; }
function closeSheet2() { $('sheet2').innerHTML = ''; }
const closeBtn = '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Séance copiée, colle-la dans Claude');
}

// "3 × 8 à 15 kg" quand toutes les séries sont pareilles, sinon la liste.
function setsSummary(sets) {
  if (!sets.length) return 'Aucune série';
  const same = sets.every((s) => (s.r || 0) === (sets[0].r || 0) && (s.w || 0) === (sets[0].w || 0) && (s.t || 0) === (sets[0].t || 0) && !s.d);
  if (!same) return sets.map(setText).join(', ');
  const s = sets[0];
  if (s.t && !s.r) return sets.length + ' × ' + dur(s.t);
  return sets.length + ' × ' + (s.r || 0) + (s.w ? ' à ' + fr(s.w, 1) + ' kg' : '');
}

// ---------- Accueil ----------
function nextRoutine() {
  const all = routines();
  if (!all.length) return null;
  const last = sorted().find((w) => all.some((r) => norm(r.title) === norm(w.title)));
  if (!last) return all[0];
  const i = all.findIndex((r) => norm(r.title) === norm(last.title));
  return all[(i + 1) % all.length];
}

function viewHome() {
  const quests = state.workouts.length ? dailyQuests() : []; // avant le calcul d'XP : une quête réussie rapporte tout de suite
  const xp = totalXp();
  const lv = levelInfo(xp);
  const streak = weekStreak();
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const rs = runs();
  let h = '<div class="row between"><div class="col" style="gap:2px"><span class="small mut">' + esc(today.charAt(0).toUpperCase() + today.slice(1)) + '</span><h1 class="h1">Ascension</h1></div>'
    + '<button type="button" class="pill sm glass" data-act="settings" aria-label="Réglages">' + ICON.gear + '</button></div>';

  h += '<section class="glass card tap" role="button" tabindex="0" data-act="level" style="border-radius:28px;padding:20px;display:flex;flex-direction:column;gap:18px">'
    + '<div class="row" style="gap:16px">' + rankSvg(lv.rank.letter)
    + '<div class="col grow"><span class="gold-text" style="font-size:11px;font-weight:600;letter-spacing:2px">RANG ' + lv.rank.letter + ' · ' + esc(lv.rank.name.toUpperCase()) + '</span>'
    + '<span class="big">Niveau ' + lv.level + '</span>'
    + '<span class="small mut">Encore ' + (lv.need - lv.into) + ' XP avant le niveau ' + (lv.level + 1) + '</span></div>' + ICON.chev + '</div>'
    + '<div class="col" style="gap:8px"><div class="bar"><div style="width:' + Math.round((lv.into / lv.need) * 100) + '%"></div></div>'
    + '<div class="row between small mut"><span>' + lv.into + ' XP</span><span>' + lv.need + ' XP</span></div></div>';
  if (state.workouts.length) {
    const t = totals();
    h += '<div class="hair"></div><div class="row between">'
      + '<div class="col" style="gap:2px"><span class="num" style="font-size:20px">' + t.sessions + '</span><span class="small mut">séances</span></div>'
      + '<div class="col" style="gap:2px;align-items:center"><span class="num" style="font-size:20px">' + t.sets.toLocaleString('fr-FR') + '</span><span class="small mut">séries</span></div>'
      + '<div class="col" style="gap:2px;align-items:flex-end"><span class="num" style="font-size:20px">' + fr(t.km, 0) + ' km</span><span class="small mut">courus</span></div></div>';
  }
  h += '</section>';

  if (!state.workouts.length) {
    h += '<section class="glass card col" style="gap:12px"><h2 class="h2">Récupère ton historique</h2>'
      + '<span class="small mut">Importe ton fichier Hevy (workouts.csv) pour retrouver toutes tes séances, tes records et ton XP.</span>'
      + '<button type="button" class="pill gold-btn wide" data-act="pick-hevy">Importer depuis Hevy</button></section>';
  }

  if (state.active) {
    h += '<section class="glass card row"><div class="col grow"><span class="label violet">Séance en cours</span><span class="h2">' + esc(state.active.label) + '</span>'
      + '<span class="small mut">Commencée il y a ' + dur((Date.now() - state.active.start) / 1000) + '</span></div>'
      + '<button type="button" class="pill gold-btn" data-tab="workout">Reprendre</button></section>';
  } else {
    const r = nextRoutine();
    if (r) {
      h += '<section class="glass card row tap" role="button" tabindex="0" data-act="routine" data-id="' + esc(r.id) + '"><div class="col grow"><span class="label violet">Prochaine séance</span><span class="h2">' + esc(r.label) + '</span>'
        + '<span class="small mut">' + plural(r.exercises.length, 'exercice', 'exercices') + ' · voir le détail</span></div>'
        + '<button type="button" class="pill gold-btn" data-act="start" data-id="' + esc(r.id) + '">Commencer</button></section>';
    }
  }

  if (state.workouts.length) {
    h += '<section class="glass card col tap" role="button" tabindex="0" data-act="week" style="gap:14px"><div class="row between"><span class="h2">Ta semaine</span>'
      + '<span class="row small mut" style="gap:4px">' + plural(streak, 'semaine', 'semaines') + " d'affilée" + ICON.chev + '</span></div>'
      + '<div class="week">' + weekDays().map((d) => '<div class="day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') + '"><span class="dot">' + (d.done ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#17120A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') + '</span><span class="small">' + d.letter + '</span></div>').join('') + '</div></section>';
  }

  if (quests.length) {
    const doneCount = quests.filter((q) => q.done).length;
    h += '<div class="col" style="gap:10px"><div class="row between" style="align-items:baseline"><span class="h2">Quêtes du jour</span><span class="small mut">' + doneCount + ' sur ' + quests.length + '</span></div>'
      + '<section class="glass card list tap" role="button" tabindex="0" data-act="quests" style="padding:4px 16px;border-radius:22px">' + quests.map((q) => '<div class="item"><span class="qmark' + (q.done ? ' done' : '') + '">' + (q.done ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#D8BD82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') + '</span>'
      + '<span class="grow' + (q.done ? ' mut' : '') + '"' + (q.done ? ' style="text-decoration:line-through"' : '') + '>' + esc(q.label) + '</span><span class="gold-text small" style="font-weight:600">+' + q.xp + ' XP</span></div>').join('') + '</section></div>';
  }

  if (rs.length) {
    const six = rs.slice(0, 6).reverse();
    const max = Math.max(...six.map((x) => x.d));
    h += '<section class="glass card row tap" role="button" tabindex="0" data-act="detail" data-id="' + esc(rs[0].id) + '" style="gap:16px"><div class="col grow"><span class="label">Dernière course</span>'
      + '<span class="num" style="font-size:24px">' + fr(rs[0].d) + ' km</span>'
      + '<span class="small mut">' + dur(rs[0].t) + ' · ' + pace(rs[0].d, rs[0].t) + '</span></div>'
      + '<div class="bars" role="img" aria-label="Distance des dernières courses">' + six.map((x, i) => '<div class="' + (i === six.length - 1 ? 'last' : '') + '" style="height:' + Math.max(6, Math.round((x.d / max) * 60)) + 'px"></div>').join('') + '</div></section>';
  }
  return h;
}

// ---------- Détails : niveau, semaine, quêtes ----------
function sheetLevel() {
  const xp = totalXp();
  const lv = levelInfo(xp);
  const b = xpBreakdown();
  const line = (label, detail, value) => '<div class="item"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + label + '</span><span class="small mut">' + detail + '</span></div><span class="gold-text" style="font-weight:600;white-space:nowrap">' + value.toLocaleString('fr-FR') + ' XP</span></div>';
  let h = '<div class="row" style="gap:14px">' + rankSvg(lv.rank.letter) + '<div class="col grow"><span class="gold-text" style="font-size:11px;font-weight:600;letter-spacing:2px">RANG ' + lv.rank.letter + ' · ' + esc(lv.rank.name.toUpperCase()) + '</span><span class="big">Niveau ' + lv.level + '</span><span class="small mut">' + xp.toLocaleString('fr-FR') + ' XP gagnés en tout</span></div></div>'
    + '<div class="col" style="gap:8px"><div class="bar"><div style="width:' + Math.round((lv.into / lv.need) * 100) + '%"></div></div><span class="small mut">' + lv.into + ' sur ' + lv.need + ' XP pour atteindre le niveau ' + (lv.level + 1) + '. Chaque niveau demande 50 XP de plus que le précédent.</span></div>';
  h += '<span class="label">D’où vient ton XP</span><div class="list">'
    + line('Séries validées', b.sets.toLocaleString('fr-FR') + ' séries × 10 XP', b.sets * 10)
    + line('Séances terminées', b.sessions + ' séances × 50 XP', b.sessions * 50)
    + line('Course à pied', fr(b.km, 1) + ' km × 20 XP', Math.round(b.km * 20))
    + line('Records battus', b.prs + ' × 25 XP', b.prs * 25)
    + line('Quêtes du jour', plural(b.quests, 'quête réussie', 'quêtes réussies'), b.questXp) + '</div>';
  h += '<span class="label">Les rangs</span><div class="list">' + RANKS.map((r) => {
    const reached = lv.level >= r.min;
    const current = r.letter === lv.rank.letter;
    const status = current ? 'Ton rang actuel' : (reached ? 'Atteint' : 'Dans ' + plural(r.min - lv.level, 'niveau', 'niveaux'));
    return '<div class="item"' + (reached ? '' : ' style="opacity:0.55"') + '>' + rankSvg(r.letter, true) + '<div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(r.name) + '</span><span class="small mut">À partir du niveau ' + r.min + '</span></div><span class="small ' + (current ? 'gold-text' : 'mut') + '" style="font-weight:600">' + status + '</span></div>';
  }).join('') + '</div>'
    + '<span class="small mut">Bientôt, il faudra réussir un examen pour changer de rang.</span>' + closeBtn;
  sheet(h);
}

function sheetWeek() {
  const days = weekDays();
  const names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const streak = weekStreak();
  let h = '<div class="col"><span class="label">' + plural(streak, 'semaine', 'semaines') + " d'affilée</span><h1 class=\"h1\">Ta semaine</h1></div><div class=\"list\">";
  days.forEach((d, i) => {
    const list = state.workouts.filter((w) => w.start >= d.start && w.start < d.start + 864e5).sort((a, b) => a.start - b.start);
    const head = '<span style="font-weight:600' + (d.today ? ';color:var(--gold)' : '') + '">' + names[i] + ' ' + new Date(d.start).getDate() + (d.today ? ' · aujourd’hui' : '') + '</span>';
    if (!list.length) h += '<div class="item"><div class="col grow" style="gap:2px">' + head + '<span class="small mut">' + (d.start > Date.now() ? 'À venir' : 'Repos') + '</span></div></div>';
    for (const w of list) h += '<button type="button" class="item" data-act="detail" data-id="' + esc(w.id) + '"><div class="col grow" style="gap:2px">' + head + '<span class="small mut">' + esc(clean(w.title)) + ' · ' + esc(summary(w)) + '</span></div>' + ICON.chev + '</button>';
  });
  h += '</div><span class="small mut">Une semaine compte dès que tu fais au moins une séance. La série ne se casse pas tant que la semaine en cours n’est pas finie.</span>' + closeBtn;
  sheet(h);
}

function sheetQuests() {
  const quests = dailyQuests();
  let h = '<div class="col"><span class="label">Se cochent toutes seules</span><h1 class="h1">Quêtes du jour</h1></div>';
  for (const q of quests) {
    h += '<div class="exo"><div class="row between"><span style="font-weight:600">' + esc(q.label) + '</span><span class="gold-text" style="font-weight:600">+' + q.xp + ' XP</span></div>'
      + '<div class="bar"><div style="width:' + Math.round((q.cur / q.goal) * 100) + '%;' + (q.done ? 'background:linear-gradient(90deg,#EBD7A3,#C6A35B)' : '') + '"></div></div>'
      + '<span class="small mut">' + (q.done ? 'Réussie' : q.cur + ' sur ' + q.goal + ' ' + q.unit) + '</span></div>';
  }
  h += '<span class="small mut">Trois nouvelles quêtes chaque jour, tirées de tes exercices actuels. Elles se valident quand tu termines ta séance ou enregistres ta course, et l’XP s’ajoute tout de suite.</span>' + closeBtn;
  sheet(h);
}

// ---------- Détails : routine et exercice ----------
function sheetRoutine(id) {
  const r = routines().find((x) => x.id === id);
  if (!r) return;
  const last = sorted().find((w) => norm(w.title) === norm(r.title));
  const count = state.workouts.filter((w) => norm(w.title) === norm(r.title)).length;
  let h = '<div class="col"><span class="label">' + plural(r.exercises.length, 'exercice', 'exercices') + ' · ' + plural(r.exercises.reduce((n, e) => n + e.sets.length, 0), 'série', 'séries') + '</span><h1 class="h1">' + esc(r.label) + '</h1>'
    + '<span class="small mut">' + (last ? 'Faite ' + count + ' fois · dernière fois ' + dateFr(last.start) : 'Jamais faite pour le moment') + '</span></div><div class="list">'
    + r.exercises.map((e, i) => '<button type="button" class="item" data-act="exo" data-name="' + esc(e.name) + '"><span class="num dim" style="width:20px">' + (i + 1) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(e.name)) + '</span><span class="small mut">' + esc(setsSummary(e.sets)) + '</span></div>' + ICON.chev + '</button>').join('')
    + '</div>' + (r.exercises.length ? '' : '<span class="mut">Cette routine est vide, ajoute des exercices.</span>')
    + '<div class="row"><button type="button" class="pill glass grow" data-act="edit-routine" data-id="' + esc(r.id) + '">Modifier</button>'
    + (state.active ? '' : '<button type="button" class="pill gold-btn grow" data-act="start" data-id="' + esc(r.id) + '">Commencer</button>') + '</div>'
    + '<button type="button" class="pill sm glass wide" data-act="close" style="color:var(--mut)">Fermer</button>';
  sheet(h);
}

function sheetExo(name) {
  const { list, best } = exoHistory(name);
  let h = '<div class="col"><span class="label">' + plural(list.length, 'séance', 'séances') + '</span><h1 class="h1">' + esc(exoName(name)) + '</h1></div>';
  if (best) h += '<div class="exo"><span class="label">Record</span><span class="num gold-text" style="font-size:24px">' + esc(setText(best.set)) + '</span><span class="small mut">' + dateFr(best.date, true) + '</span></div>';
  if (list.length) {
    h += '<span class="label">Dernières fois</span><div class="list">' + list.slice(0, 12).map((x) => '<button type="button" class="item" data-act="detail" data-id="' + esc(x.id) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + dateFr(x.date, true) + '</span><span class="small mut">' + esc(x.sets.map(setText).join(', ')) + '</span></div>' + ICON.chev + '</button>').join('') + '</div>';
  } else {
    h += '<span class="mut">Tu n’as encore jamais fait cet exercice.</span>';
  }
  sheet(h + closeBtn);
}

// ---------- Séance ----------
function startWorkout(id) {
  const routine = routines().find((r) => r.id === id);
  const a = { title: routine ? routine.title : 'Séance libre', label: routine ? routine.label : 'Séance libre', routineId: routine ? routine.id : null, start: Date.now(), idx: 0, exercises: [], rest: null };
  if (routine) {
    // La routine donne les exercices et le nombre de séries ; les valeurs viennent de ta dernière séance du même nom.
    const last = sorted().find((w) => norm(w.title) === norm(routine.title));
    a.exercises = routine.exercises.map((e) => {
      const prev = last && last.exercises.find((x) => x.name === e.name);
      return { name: e.name, sets: e.sets.map((s, i) => { const p = (prev && prev.sets[i]) || s; return { r: p.r || 0, w: p.w || 0, t: p.t || 0, done: false }; }) };
    });
  }
  state.active = a;
  save();
  closeSheet();
  ui.tab = 'workout';
  ui.enter = true;
  keepAwake();
  render();
  window.scrollTo(0, 0);
}

function viewWorkout() {
  const a = state.active;
  if (!a) {
    let h = '<div class="col" style="gap:2px"><span class="small mut">Choisis ta séance</span><h1 class="h1">Séance</h1></div>';
    for (const r of routines()) {
      const last = sorted().find((w) => norm(w.title) === norm(r.title));
      h += '<section class="glass card row tap" role="button" tabindex="0" data-act="routine" data-id="' + esc(r.id) + '"><div class="col grow"><span class="h2">' + esc(r.label) + '</span>'
        + '<span class="small mut">' + plural(r.exercises.length, 'exercice', 'exercices') + (last ? ' · dernière fois ' + dateFr(last.start) : '') + '</span></div>'
        + '<button type="button" class="pill gold-btn" data-act="start" data-id="' + esc(r.id) + '">Commencer</button></section>';
    }
    h += '<div class="row"><button type="button" class="pill glass grow" data-act="new-routine">Nouvelle routine</button><button type="button" class="pill glass grow" data-act="start" data-id="">Séance libre</button></div>'
      + '<span class="small mut">Touche une routine pour voir ses exercices ou la modifier.</span>';
    return h;
  }

  const n = a.exercises.length;
  a.idx = Math.min(a.idx, Math.max(0, n - 1));
  let h = '<div class="row between"><div class="col" style="gap:2px"><span class="small mut">' + (n ? 'Exercice ' + (a.idx + 1) + ' sur ' + n : 'Aucun exercice') + '</span><h1 class="h1">' + esc(a.label) + '</h1></div>'
    + '<span class="num" id="elapsed" style="font-size:20px;color:var(--soft)">' + clock((Date.now() - a.start) / 1000) + '</span></div>';

  if (n) {
    h += '<div class="segs">' + a.exercises.map((e, i) => '<button type="button" data-act="goto" data-i="' + i + '" aria-label="Exercice ' + (i + 1) + '" class="' + (i === a.idx ? 'cur' : (e.sets.length && e.sets.every((s) => s.done) ? 'done' : '')) + '"></button>').join('') + '</div>';
    const ex = a.exercises[a.idx];
    const kind = kindOf(ex.name);
    // "La dernière fois" : d'abord la dernière séance du même nom, sinon la dernière fois que l'exercice a été fait.
    const same = sorted().find((w) => norm(w.title) === norm(a.title) && w.exercises.some((e) => e.name === ex.name));
    const prev = same ? same.exercises.find((e) => e.name === ex.name).sets : lastSets(ex.name);
    const two = kind === 'weight';
    h += '<section class="glass card col" style="border-radius:26px;gap:12px"><div class="row" style="align-items:flex-start"><div class="col grow"><span class="num" style="font-size:22px">' + esc(exoName(ex.name)) + '</span>'
      + '<span class="small mut">' + (prev ? 'La dernière fois : ' + esc(prev.map(setText).join(', ')) : 'Première fois sur cet exercice') + '</span></div>'
      + '<button type="button" class="pill sm glass" data-act="exo" data-name="' + esc(ex.name) + '">Détails</button></div>';
    h += '<div class="sets ' + (two ? '' : 'one') + ' label"><span>Série</span><span style="text-align:center">' + (kind === 'time' ? 'Durée' : 'Répétitions') + '</span>' + (two ? '<span style="text-align:center">Charge</span>' : '') + '<span></span></div>';
    ex.sets.forEach((s, i) => {
      const main = kind === 'time'
        ? '<label class="field"><input inputmode="numeric" data-f="t" data-i="' + i + '" value="' + (s.t || '') + '" aria-label="Durée en secondes, série ' + (i + 1) + '"><span class="unit">s</span></label>'
        : '<label class="field"><input inputmode="numeric" data-f="r" data-i="' + i + '" value="' + (s.r || '') + '" aria-label="Répétitions, série ' + (i + 1) + '"></label>';
      const load = two ? '<label class="field"><input inputmode="decimal" data-f="w" data-i="' + i + '" value="' + (s.w ? fr(s.w, 1) : '') + '" aria-label="Charge en kilos, série ' + (i + 1) + '"><span class="unit">kg</span></label>' : '';
      h += '<div class="sets setrow ' + (two ? '' : 'one') + (s.done ? ' done' : '') + '"><span class="idx">' + (i + 1) + '</span>' + main + load
        + '<button type="button" class="check" data-act="check" data-i="' + i + '" aria-label="' + (s.done ? 'Annuler la série ' : 'Valider la série ') + (i + 1) + '">' + (s.done ? ICON.check : ICON.todo) + '</button></div>';
    });
    h += '<div class="row"><button type="button" class="pill sm glass grow" data-act="add-set">Ajouter une série</button>'
      + (ex.sets.length > 1 ? '<button type="button" class="pill sm glass grow" data-act="del-set">Retirer la dernière</button>' : '')
      + '</div></section>';

    const allDone = ex.sets.length && ex.sets.every((s) => s.done);
    h += '<div class="row">'
      + (a.idx > 0 ? '<button type="button" class="pill glass grow" data-act="goto" data-i="' + (a.idx - 1) + '">Précédent</button>' : '')
      + (a.idx < n - 1 ? '<button type="button" class="pill grow ' + (allDone ? 'gold-btn' : 'glass') + '" data-act="goto" data-i="' + (a.idx + 1) + '">Exercice suivant</button>' : '')
      + '</div>';

    if (a.idx < n - 1) {
      h += '<div class="col" style="gap:8px"><span class="label">Ensuite</span><section class="glass card list" style="padding:4px 16px;border-radius:22px">'
        + a.exercises.slice(a.idx + 1).map((e, k) => '<button type="button" class="item" data-act="goto" data-i="' + (a.idx + 1 + k) + '"><span class="grow" style="font-weight:500">' + esc(exoName(e.name)) + '</span><span class="small mut">' + esc(setsSummary(e.sets)) + '</span></button>').join('')
        + '</section></div>';
    }
  }

  h += '<button type="button" class="pill glass wide" data-act="picker">Ajouter un exercice</button>';
  if (n) h += '<button type="button" class="pill sm glass wide" data-act="del-exo" style="color:var(--mut)">Retirer cet exercice de la séance</button>';
  h += '<div class="row" style="margin-top:8px"><button type="button" class="pill glass grow" data-act="cancel" style="color:var(--mut)">Abandonner</button>'
    + '<button type="button" class="pill gold-btn grow" data-act="finish">Terminer</button></div>'
    + '<div style="height:90px"></div>'; // place pour le bandeau de repos
  return h;
}

function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map((e) => ({ name: e.name, sets: e.sets.filter((s) => s.done && (s.r || s.t)).map((s) => { const o = { done: true }; if (s.r) o.r = s.r; if (s.w) o.w = s.w; if (s.t) o.t = s.t; return o; }) }))
    .filter((e) => e.sets.length);
  if (!exercises.length) { toast('Valide au moins une série avant de terminer'); return; }
  const before = levelInfo(totalXp());
  const w = { id: 'a' + a.start, title: a.title, start: a.start, end: Date.now(), exercises };
  state.workouts.push(w);
  w.prs = countPrs(w);

  // Si tu as ajouté ou retiré des exercices ou des séries pendant la séance, on propose de garder ce changement.
  const routine = a.routineId && routines().find((r) => r.id === a.routineId);
  if (routine) {
    const shape = (list) => list.map((e) => e.name + ':' + e.sets.length).join('|');
    if (shape(a.exercises) !== shape(routine.exercises) && confirm('Tu as changé les exercices ou le nombre de séries. Mettre la routine « ' + routine.label + ' » à jour pour la prochaine fois ?')) {
      routine.exercises = a.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ r: s.r || 0, w: s.w || 0, t: s.t || 0 })) }));
    }
  }
  state.active = null;
  save();
  dailyQuests(); // valide tout de suite les quêtes remplies par cette séance
  const after = levelInfo(totalXp());
  ui.tab = 'home';
  ui.enter = true;
  render();
  window.scrollTo(0, 0);
  const sets = exercises.reduce((k, e) => k + e.sets.length, 0);
  let h = '<div class="col"><span class="label violet">Séance terminée</span><h1 class="h1">' + esc(a.label) + '</h1></div>'
    + '<div class="row between"><div class="col"><span class="label">Durée</span><span class="h2">' + dur((w.end - w.start) / 1000) + '</span></div>'
    + '<div class="col"><span class="label">Séries</span><span class="h2">' + sets + '</span></div>'
    + '<div class="col"><span class="label">Gagné</span><span class="h2 gold-text">+' + xpOf(w) + ' XP</span></div></div>';
  if (w.prs) h += '<span class="gold-text" style="font-weight:600">' + plural(w.prs, 'record battu', 'records battus') + '</span>';
  if (after.level > before.level) h += '<span class="gold-text num" style="font-size:22px">Niveau ' + after.level + ' atteint</span>';
  h += '<button type="button" class="pill glass wide" data-act="detail" data-id="' + w.id + '">Voir le détail</button>'
    + '<button type="button" class="pill glass wide" data-act="copy" data-id="' + w.id + '" style="color:var(--gold)">' + ICON.copy + 'Copier pour Claude</button>' + closeBtn;
  sheet(h);
}

// ---------- Repos ----------
let audio = null;
function beep() {
  try {
    if (!audio) return;
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
function startRest() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { /* ignore */ }
  const total = state.settings.rest || 90;
  state.active.rest = { end: Date.now() + total * 1000, total, rang: false };
}
function renderRest() {
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
    + '<div class="col grow" style="gap:0"><span class="label violet">' + (over ? 'Repos terminé' : 'Repos') + '</span><span class="num" id="rest-time" style="font-size:28px;line-height:1.1">' + (over ? "C'est reparti" : clock(left)) + '</span></div>'
    + (over ? '' : '<button type="button" class="pill sm glass" data-act="rest-more">+ 15 s</button>')
    + '<button type="button" class="pill sm glass" data-act="rest-skip">' + (over ? 'OK' : 'Passer') + '</button></div>';
}

let lock = null;
async function keepAwake() {
  try { if (state.active && navigator.wakeLock && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) { /* non disponible */ }
}

// ---------- Historique ----------
function summary(w) {
  const r = w.exercises.find((e) => e.name === 'Running');
  if (r && w.exercises.length === 1) { const s = r.sets[0] || {}; return fr(s.d || 0) + ' km · ' + dur(s.t || 0); }
  const sets = w.exercises.reduce((k, e) => k + e.sets.length, 0);
  return plural(w.exercises.length, 'exercice', 'exercices') + ' · ' + plural(sets, 'série', 'séries') + (w.end > w.start ? ' · ' + dur((w.end - w.start) / 1000) : '');
}
function viewHistory() {
  const all = sorted();
  let h = '<div class="col" style="gap:2px"><span class="small mut">' + plural(all.length, 'séance enregistrée', 'séances enregistrées') + '</span><h1 class="h1">Historique</h1></div>';
  if (!all.length) return h + '<section class="glass card col" style="gap:12px"><span class="mut">Aucune séance pour le moment.</span><button type="button" class="pill gold-btn wide" data-act="pick-hevy">Importer depuis Hevy</button></section>';
  h += '<section class="glass card list" style="padding:4px 16px">' + all.slice(0, ui.historyLimit).map((w) => '<button type="button" class="item" data-act="detail" data-id="' + esc(w.id) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(clean(w.title)) + '</span><span class="small mut">' + esc(summary(w)) + '</span></div><span class="small mut" style="white-space:nowrap">' + dateFr(w.start, new Date(w.start).getFullYear() !== new Date().getFullYear()) + '</span></button>').join('') + '</section>';
  if (all.length > ui.historyLimit) h += '<button type="button" class="pill glass wide" data-act="more">Voir plus</button>';
  return h;
}
function sheetDetail(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return;
  const time = new Date(w.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  let h = '<div class="col"><span class="label">' + dateFr(w.start, true) + ' · ' + time + '</span><h1 class="h1">' + esc(clean(w.title)) + '</h1>'
    + '<span class="small mut">' + esc(summary(w)) + ' · <span class="gold-text" style="font-weight:600">+' + xpOf(w) + ' XP</span>' + (w.prs ? ' · ' + plural(w.prs, 'record', 'records') : '') + '</span></div>'
    + '<div class="list">' + w.exercises.map((e) => '<button type="button" class="item" data-act="exo" data-name="' + esc(e.name) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(e.name)) + '</span><span class="small mut">' + esc(e.name === 'Running' ? e.sets.map((s) => setText(s) + ' · ' + pace(s.d, s.t)).join(', ') : e.sets.map(setText).join(', ')) + '</span></div>' + ICON.chev + '</button>').join('') + '</div>'
    + '<button type="button" class="pill glass wide" data-act="copy" data-id="' + esc(w.id) + '" style="color:var(--gold)">' + ICON.copy + 'Copier pour Claude</button>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="edit-workout" data-id="' + esc(w.id) + '">Modifier</button><button type="button" class="pill glass grow" data-act="delete" data-id="' + esc(w.id) + '" style="color:var(--mut)">Supprimer</button></div>' + closeBtn;
  sheet(h);
}

// ---------- Modifier une routine ou une séance passée ----------
function openEditor(type, id) {
  let draft;
  if (type === 'routine') {
    const r = id ? routines().find((x) => x.id === id) : { label: '', title: '', exercises: [] };
    if (!r) return;
    draft = { label: r.label, exercises: JSON.parse(JSON.stringify(r.exercises)) };
  } else {
    const w = state.workouts.find((x) => x.id === id);
    if (!w) return;
    draft = { label: clean(w.title), exercises: JSON.parse(JSON.stringify(w.exercises)) };
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
    + '<input class="textin" id="edit-label" placeholder="Nom" aria-label="Nom" value="' + esc(draft.label) + '" style="margin-top:6px"></div>';
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
  if (type === 'routine' && id) h += '<button type="button" class="pill sm glass wide" data-act="ed-del-routine" style="color:var(--mut)">Supprimer cette routine</button>';
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
    .map((e) => ({ name: e.name, sets: e.sets.filter((s) => s.r || s.t || s.d || s.w).map((s) => { const o = { done: true }; for (const k of ['r', 'w', 't', 'd']) if (s[k]) o[k] = s[k]; return o; }) }))
    .filter((e) => e.sets.length);
  if (!exercises.length) { toast('Il faut au moins une série'); return; }
  w.title = label;
  w.exercises = exercises;
  w.prs = countPrs(w);
  save(); closeSheet(); render(); sheetDetail(w.id); toast('Séance modifiée');
}

// ---------- Course ----------
function viewRun() {
  const rs = runs();
  let h = '<div class="col" style="gap:2px"><span class="small mut">' + plural(rs.length, 'course', 'courses') + '</span><h1 class="h1">Course</h1></div>';
  h += '<section class="glass card col" style="gap:12px"><h2 class="h2">Ajouter une course</h2>'
    + '<div class="row"><label class="field grow"><input id="run-d" inputmode="decimal" placeholder="0" aria-label="Distance en kilomètres"><span class="unit">km</span></label>'
    + '<label class="field grow"><input id="run-m" inputmode="numeric" placeholder="0" aria-label="Minutes"><span class="unit">min</span></label>'
    + '<label class="field grow"><input id="run-s" inputmode="numeric" placeholder="0" aria-label="Secondes"><span class="unit">s</span></label></div>'
    + '<button type="button" class="pill gold-btn wide" data-act="add-run">Enregistrer</button></section>';
  if (rs.length) {
    const longest = rs.reduce((a, b) => (b.d > a.d ? b : a));
    const timed = rs.filter((x) => x.d >= 3 && x.t > 0);
    const fastest = timed.length ? timed.reduce((a, b) => (b.t / b.d < a.t / a.d ? b : a)) : null;
    h += '<div class="row" style="align-items:stretch"><section class="glass card col grow tap" role="button" tabindex="0" data-act="detail" data-id="' + esc(longest.id) + '"><span class="label">Plus longue</span><span class="h2 gold-text">' + fr(longest.d) + ' km</span><span class="small mut">' + dateFr(longest.date, true) + '</span></section>'
      + (fastest ? '<section class="glass card col grow tap" role="button" tabindex="0" data-act="detail" data-id="' + esc(fastest.id) + '"><span class="label">Meilleure allure</span><span class="h2 gold-text">' + pace(fastest.d, fastest.t) + '</span><span class="small mut">' + fr(fastest.d) + ' km · ' + dateFr(fastest.date, true) + '</span></section>' : '') + '</div>';
    const ten = rs.slice(0, 10).reverse();
    const max = Math.max(...ten.map((x) => x.d));
    h += '<section class="glass card col" style="gap:14px"><span class="label">10 dernières courses</span><div class="bars" style="height:90px;justify-content:space-between">'
      + ten.map((x, i) => '<button type="button" data-act="detail" data-id="' + esc(x.id) + '" aria-label="' + fr(x.d) + ' km, ' + dateFr(x.date) + '" style="display:flex;align-items:flex-end;height:90px;padding:0 4px"><div class="' + (i === ten.length - 1 ? 'last' : '') + '" style="width:14px;border-radius:7px;height:' + Math.max(8, Math.round((x.d / max) * 90)) + 'px;background:' + (i === ten.length - 1 ? 'var(--violet)' : 'rgba(255,255,255,0.16)') + '"></div></button>').join('') + '</div></section>';
    h += '<section class="glass card list" style="padding:4px 16px">' + rs.slice(0, 20).map((x) => '<button type="button" class="item" data-act="detail" data-id="' + esc(x.id) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + fr(x.d) + ' km</span><span class="small mut">' + dur(x.t) + ' · ' + pace(x.d, x.t) + '</span></div><span class="small mut">' + dateFr(x.date) + '</span>' + ICON.chev + '</button>').join('') + '</section>';
  }
  return h;
}

// ---------- Réglages, choix d'exercice, fichiers ----------
function sheetSettings() {
  const rest = state.settings.rest || 90;
  sheet('<h1 class="h1">Réglages</h1>'
    + '<div class="col" style="gap:8px"><span class="label">Temps de repos</span><div class="row" style="flex-wrap:wrap;gap:8px">'
    + [60, 90, 120, 150, 180].map((s) => '<button type="button" class="pill sm ' + (s === rest ? 'gold-btn' : 'glass') + '" data-act="set-rest" data-s="' + s + '">' + clock(s) + '</button>').join('') + '</div></div>'
    + '<div class="col" style="gap:8px"><span class="label">Hevy</span><button type="button" class="pill glass wide" data-act="pick-hevy">Importer mon historique Hevy</button>'
    + '<span class="small mut">Dans Hevy : Profil, Réglages, Exporter les données. Choisis ensuite le fichier workouts.csv ici.</span></div>'
    + '<div class="col" style="gap:8px"><span class="label">Sauvegarde</span><div class="row"><button type="button" class="pill glass grow" data-act="export">Exporter</button><button type="button" class="pill glass grow" data-act="pick-backup">Restaurer</button></div>'
    + '<span class="small mut">Tes données restent sur ce téléphone. Exporte une sauvegarde de temps en temps pour ne rien perdre.</span></div>' + closeBtn);
}

function sheetPicker() {
  const names = new Set(Object.keys(EXOS));
  for (const w of state.workouts) for (const e of w.exercises) names.add(e.name);
  names.delete('Running');
  const q = norm(ui.pickerQuery);
  const list = [...names].map((n) => ({ n, f: exoName(n) })).filter((x) => !q || norm(x.f).includes(q) || norm(x.n).includes(q)).sort((a, b) => a.f.localeCompare(b.f, 'fr'));
  const items = list.map((x) => '<button type="button" class="item" data-act="add-exo" data-name="' + esc(x.n) + '"><span class="grow" style="font-weight:500">' + esc(x.f) + '</span></button>').join('');
  const old = $('picker-list');
  if (old) { old.innerHTML = items; return; }
  sheet('<div class="row between"><h1 class="h1">Ajouter un exercice</h1><button type="button" class="pill sm glass" data-act="close2">Fermer</button></div>'
    + '<input class="textin" id="picker-q" placeholder="Chercher un exercice" aria-label="Chercher un exercice" value="' + esc(ui.pickerQuery) + '">'
    + '<div class="list" id="picker-list">' + items + '</div>', 2);
}

// Séries par défaut d'un exercice qu'on ajoute : celles de la dernière fois, sinon 3 séries simples.
function defaultSets(name, done) {
  const prev = lastSets(name);
  const kind = kindOf(name);
  const base = prev ? prev.map((s) => ({ r: s.r || 0, w: s.w || 0, t: s.t || 0 })) : [1, 2, 3].map(() => ({ r: kind === 'time' ? 0 : 8, w: 0, t: kind === 'time' ? 30 : 0 }));
  return done === undefined ? base : base.map((s) => Object.assign(s, { done }));
}

function pickFile(accept, onText) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result));
    reader.readAsText(f);
  };
  input.click();
}

async function exportBackup() {
  const name = 'ascension-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json';
  const file = new File([exportJson()], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- Actions ----------
const curExo = () => state.active && state.active.exercises[state.active.idx];
const edExo = (el) => ui.edit.draft.exercises[+el.dataset.e];

const ACTIONS = {
  settings: () => sheetSettings(),
  close: () => closeSheet(),
  close2: () => closeSheet2(),
  level: () => sheetLevel(),
  week: () => sheetWeek(),
  quests: () => sheetQuests(),
  routine: (el) => sheetRoutine(el.dataset.id),
  exo: (el) => sheetExo(el.dataset.name),
  start: (el) => startWorkout(el.dataset.id),
  goto: (el) => { state.active.idx = +el.dataset.i; save(); render(); window.scrollTo(0, 0); },
  check: (el) => {
    const s = curExo().sets[+el.dataset.i];
    s.done = !s.done;
    if (s.done) startRest(); else state.active.rest = null;
    save(); render(); renderRest();
  },
  'add-set': () => { const sets = curExo().sets; const last = sets[sets.length - 1] || {}; sets.push({ r: last.r || 0, w: last.w || 0, t: last.t || 0, done: false }); save(); render(); },
  'del-set': () => { curExo().sets.pop(); save(); render(); },
  'del-exo': () => { if (confirm('Retirer cet exercice de la séance ?')) { state.active.exercises.splice(state.active.idx, 1); save(); render(); } },
  picker: () => { ui.pickerQuery = ''; sheetPicker(); },
  'add-exo': (el) => {
    const name = el.dataset.name;
    closeSheet2();
    if (ui.edit) { ui.edit.draft.exercises.push({ name, sets: defaultSets(name) }); sheetEditor(); const box = document.querySelector('#sheet .sheet > div'); box.scrollTop = box.scrollHeight; return; }
    state.active.exercises.push({ name, sets: defaultSets(name, false) });
    state.active.idx = state.active.exercises.length - 1;
    save(); render(); window.scrollTo(0, 0);
  },
  cancel: () => { if (confirm('Abandonner la séance ? Rien ne sera enregistré.')) { state.active = null; save(); ui.tab = 'home'; render(); renderRest(); } },
  finish: () => { finishWorkout(); renderRest(); },
  'rest-more': () => { state.active.rest.end += 15000; state.active.rest.total += 15; save(); renderRest(); },
  'rest-skip': () => { state.active.rest = null; save(); renderRest(); },
  copy: (el) => { const w = state.workouts.find((x) => x.id === el.dataset.id); if (w) copyText(workoutText(w)); },
  detail: (el) => sheetDetail(el.dataset.id),
  delete: (el) => { if (confirm('Supprimer définitivement cette séance ?')) { state.workouts = state.workouts.filter((x) => x.id !== el.dataset.id); save(); closeSheet(); render(); } },
  more: () => { ui.historyLimit += 30; render(); },
  'new-routine': () => openEditor('routine', null),
  'edit-routine': (el) => openEditor('routine', el.dataset.id),
  'edit-workout': (el) => openEditor('workout', el.dataset.id),
  'ed-add-set': (el) => { const sets = edExo(el).sets; const last = sets[sets.length - 1] || { r: 8 }; sets.push({ r: last.r || 0, w: last.w || 0, t: last.t || 0 }); sheetEditor(); },
  'ed-del-set': (el) => { edExo(el).sets.splice(+el.dataset.i, 1); sheetEditor(); },
  'ed-del-exo': (el) => { ui.edit.draft.exercises.splice(+el.dataset.e, 1); sheetEditor(); },
  'ed-up': (el) => { const l = ui.edit.draft.exercises, i = +el.dataset.e; if (i > 0) { [l[i - 1], l[i]] = [l[i], l[i - 1]]; sheetEditor(); } },
  'ed-down': (el) => { const l = ui.edit.draft.exercises, i = +el.dataset.e; if (i < l.length - 1) { [l[i + 1], l[i]] = [l[i], l[i + 1]]; sheetEditor(); } },
  'ed-add-exo': () => { ui.pickerQuery = ''; sheetPicker(); },
  'ed-save': () => saveEditor(),
  'ed-del-routine': () => { if (confirm('Supprimer cette routine ? Tes séances passées restent dans l’historique.')) { state.routines = routines().filter((r) => r.id !== ui.edit.id); save(); closeSheet(); render(); } },
  'set-rest': (el) => { state.settings.rest = +el.dataset.s; save(); sheetSettings(); },
  'pick-hevy': () => pickFile('.csv,text/csv,text/comma-separated-values', (text) => {
    try { const r = importHevy(text); closeSheet(); render(); toast(r.added + ' séances importées' + (r.skipped ? ', ' + r.skipped + ' déjà là' : '')); } catch (e) { toast(e.message); }
  }),
  'pick-backup': () => pickFile('.json,application/json', (text) => {
    try { const r = importJson(text); closeSheet(); render(); toast(r.added + ' séances restaurées'); } catch (e) { toast("Ce fichier n'est pas une sauvegarde valide"); }
  }),
  export: () => exportBackup(),
  'add-run': () => {
    const d = toNum($('run-d').value), t = Math.round(toNum($('run-m').value) * 60 + toNum($('run-s').value));
    if (d <= 0 || t <= 0) { toast('Indique la distance et la durée'); return; }
    const now = Date.now();
    state.workouts.push({ id: 'r' + now, title: 'Course', start: now - t * 1000, end: now, exercises: [{ name: 'Running', sets: [{ d, t, done: true }] }] });
    save(); render(); toast('Course enregistrée, +' + (Math.round(d * 20) + 50) + ' XP');
  },
};

document.addEventListener('click', (ev) => {
  const tabBtn = ev.target.closest('[data-tab]');
  if (tabBtn) { ui.tab = tabBtn.dataset.tab; ui.enter = true; closeSheet(); render(); window.scrollTo(0, 0); return; }
  const el = ev.target.closest('[data-act]');
  if (el && !el.disabled && ACTIONS[el.dataset.act]) { ACTIONS[el.dataset.act](el); return; }
  // Toucher le fond sombre ferme la fenêtre (sauf pendant une modification, pour ne rien perdre par erreur).
  if (ev.target.classList.contains('sheet')) { if (ev.target.parentElement.id === 'sheet2') closeSheet2(); else if (!ui.edit) closeSheet(); }
});
document.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[role=button][data-act]')) { ev.preventDefault(); ev.target.click(); }
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'picker-q') { ui.pickerQuery = t.value; sheetPicker(); return; }
  if (t.id === 'edit-label' && ui.edit) { ui.edit.draft.label = t.value; return; }
  if (t.dataset.ef && ui.edit) {
    const s = ui.edit.draft.exercises[+t.dataset.e].sets[+t.dataset.i];
    if (t.dataset.ef === 'clock') {
      // "31:40" = 31 min 40 s ; "1:02:30" = 1 h 02 min 30 s ; un nombre seul = des minutes.
      const p = String(t.value).split(':').map(toNum);
      s.t = Math.round(p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60);
    } else s[t.dataset.ef] = toNum(t.value);
    return;
  }
  if (t.dataset.f && state.active) {
    curExo().sets[+t.dataset.i][t.dataset.f] = toNum(t.value);
    save();
  }
});
// Sélectionne le contenu d'une case quand on la touche, pour taper directement la nouvelle valeur.
document.addEventListener('focusin', (ev) => { if (ev.target.matches && ev.target.matches('.field input')) setTimeout(() => ev.target.select(), 0); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { keepAwake(); renderRest(); } });

function render() {
  const views = { home: viewHome, workout: viewWorkout, history: viewHistory, run: viewRun };
  // L'animation d'arrivée ne joue que quand on change d'écran, pas à chaque série cochée.
  $('app').classList.toggle('enter', ui.enter);
  ui.enter = false;
  $('app').innerHTML = (views[ui.tab] || viewHome)();
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
}

setInterval(() => {
  renderRest();
  const e = $('elapsed');
  if (e && state.active) e.textContent = clock((Date.now() - state.active.start) / 1000);
}, 500);

if (state.active) { ui.tab = 'workout'; keepAwake(); }
render();
renderRest();

if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
