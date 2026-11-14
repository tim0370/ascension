// Point d'entrée de l'app : accueil, historique, course, réglages, et l'affichage général.
// La séance est dans seance.js, l'onglet Progression dans progress.js, les briques communes dans ui.js.
import {
  state, save, exoName, sorted, runs, xpOf, totalXp, levelInfo, weekStreak,
  fr, dur, clock, pace, dateFr, setText, workoutText, importHevy, exportJson, importJson,
  dailyQuests, weekDays, totals, xpBreakdown, weekQuest, weekGoal, routines,
} from './store.js';
import { NEWS } from './data.js';
import { rankInfo, heat } from './stats.js';
import { $, esc, norm, plural, toNum, ui, ACTIONS, ICON, checkDark, rankSvg, emblem, toast, sheet, closeSheet, closeSheet2, closeBtn, copyText, titleOf, VERSION, ring, chartSvg } from './ui.js';
import { viewWorkout, nextRoutine, usualTime, tick, renderRest, keepAwake, onInput, feelPills } from './seance.js';
import { viewProgress, rankTeaser, checkRankUp, photoDue, loadPhotos, onPhotoDate } from './progress.js';

const DAY = 864e5;
const local = ['localhost', '127.0.0.1'].includes(location.hostname); // tests sur le PC
const midnight = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

// ---------- Accueil ----------
function viewHome() {
  const has = state.workouts.length > 0;
  const quests = has ? dailyQuests() : []; // avant le calcul d'XP : une quête réussie rapporte tout de suite
  const wq = has ? weekQuest() : null;
  const xp = totalXp();
  const lv = levelInfo(xp);
  const info = rankInfo();
  const streak = weekStreak();
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const rs = runs();
  const t0 = midnight();
  const tick = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#D8BD82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let h = '<div class="row between"><div class="col" style="gap:2px"><span class="small mut">' + esc(today.charAt(0).toUpperCase() + today.slice(1)) + '</span><h1 class="h1">Ascension</h1></div>'
    + (has ? '<button type="button" class="pill sm glass" data-act="week">' + plural(streak, 'semaine', 'semaines') + '</button>' : '') + '</div>';

  const t = totals();
  h += '<section class="glass hero hud tap" role="button" tabindex="0" data-act="level">' + emblem(info.rank.letter, lv.into / lv.need)
    + '<div class="col center" style="gap:6px"><span class="gold-text" style="font-size:11px;font-weight:600;letter-spacing:2.4px">RANG ' + info.rank.letter + ' · ' + esc(info.rank.name.toUpperCase()) + '</span>'
    + '<span class="big">Niveau ' + lv.level + '</span>'
    + '<span class="small mut">' + lv.into.toLocaleString('fr-FR') + ' sur ' + lv.need.toLocaleString('fr-FR') + ' XP · encore ' + (lv.need - lv.into) + ' pour le niveau ' + (lv.level + 1) + '</span></div>'
    + '<div class="hair" style="width:100%"></div><div class="stats3">'
    + '<div><span class="num" style="font-size:20px">' + t.sessions + '</span><span class="small mut">séances</span></div>'
    + '<div><span class="num" style="font-size:20px">' + t.sets.toLocaleString('fr-FR') + '</span><span class="small mut">séries</span></div>'
    + '<div><span class="num" style="font-size:20px">' + fr(t.km, 0) + ' km</span><span class="small mut">courus</span></div></div></section>';

  if (!has) {
    h += '<section class="glass card col" style="gap:12px"><h2 class="h2">Récupère ton historique</h2>'
      + '<span class="small mut">Importe ton fichier Hevy (workouts.csv) pour retrouver toutes tes séances, tes records et ton XP.</span>'
      + '<button type="button" class="pill gold-btn wide" data-act="pick-hevy">Importer depuis Hevy</button></section>';
  }

  // Le bloc principal : la séance à faire
  if (state.active) {
    const a = state.active;
    const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
    const done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    h += '<section class="cta hud"><div class="col" style="gap:4px"><span class="label violet">Séance en cours</span><span class="h1">' + esc(a.label) + '</span>'
      + '<span class="small" style="color:var(--soft)">' + done + ' sur ' + plural(total, 'série', 'séries') + ' · commencée il y a ' + dur((Date.now() - a.start) / 1000) + '</span></div>'
      + '<div class="bar gold"><div style="width:' + (total ? Math.round((done / total) * 100) : 0) + '%"></div></div>'
      + '<button type="button" class="pill gold-btn wide" data-tab="workout">Reprendre la séance</button></section>';
  } else {
    const doneToday = state.workouts.find((w) => w.start >= t0 && w.exercises.some((e) => e.name !== 'Running'));
    const ranToday = rs.some((r) => r.date >= t0);
    const sunday = new Date().getDay() === 0 && !ranToday;
    const r = nextRoutine();
    if (sunday) {
      h += '<section class="cta hud"><div class="col" style="gap:4px"><span class="label violet">Dimanche</span><span class="h1">Course du dimanche</span>'
        + '<span class="small" style="color:var(--soft)">' + (rs.length ? 'La dernière : ' + fr(rs[0].d) + ' km en ' + dur(rs[0].t) : 'Note ta distance et ton temps') + '</span></div>'
        + '<button type="button" class="pill gold-btn wide" data-act="run">Noter ma course</button></section>';
    }
    if (r) {
      const names = r.exercises.slice(0, 4).map((e) => exoName(e.name)).join(' · ') + (r.exercises.length > 4 ? ' · +' + (r.exercises.length - 4) : '');
      h += '<section class="' + (sunday ? 'glass card' : 'cta') + ' hud tap" role="button" tabindex="0" data-act="routine" data-id="' + esc(r.id) + '"' + (sunday ? ' style="display:flex;flex-direction:column;gap:14px"' : '') + '><div class="col" style="gap:4px"><span class="label violet">' + (doneToday ? 'Séance faite aujourd’hui · la prochaine' : 'Ta prochaine séance') + '</span>'
        + '<span class="h1">' + esc(r.label) + '</span><span class="small" style="color:var(--soft)">' + plural(r.exercises.length, 'exercice', 'exercices') + ' · ' + usualTime(r) + '</span>'
        + '<span class="small mut">' + esc(names) + '</span></div>'
        + '<div class="row"><button type="button" class="pill glass" data-act="start" data-id="' + esc(r.id) + '" data-express="1">Express</button>'
        + '<button type="button" class="pill gold-btn grow" data-act="start" data-id="' + esc(r.id) + '">Commencer</button></div></section>';
    }
  }

  if (has) {
    h += '<section class="glass card col tap" role="button" tabindex="0" data-act="week" style="gap:14px"><div class="row between"><span class="h2">Ta semaine</span>'
      + '<span class="row small mut" style="gap:4px">' + (wq.done ? 'Objectif atteint' : wq.cur + ' sur ' + wq.goal + ' séances') + ICON.chev + '</span></div>'
      + '<div class="week">' + weekDays().map((d) => '<div class="day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') + '"><span class="dot">' + (d.done ? checkDark : '') + '</span><span class="small">' + d.letter + '</span></div>').join('') + '</div>'
      + '<div class="bar' + (wq.done ? ' gold' : '') + '"><div style="width:' + Math.round((wq.cur / wq.goal) * 100) + '%"></div></div></section>';

    // Deux tuiles : l'examen de rang et la course
    h += '<div class="tiles">';
    if (info.next) {
      const todo = info.tests.find((x) => !x.done);
      h += '<section class="glass tile tap" role="button" tabindex="0" data-act="rank"><span class="label violet">Examen rang ' + info.next.letter + '</span>'
        + ring(info.passed / info.tests.length, info.passed + '/' + info.tests.length, true)
        + '<span class="small mut">' + (todo ? esc(todo.label) : 'Tout est réussi') + '</span></section>';
    } else {
      h += '<section class="glass tile tap" role="button" tabindex="0" data-act="rank"><span class="label violet">Rang</span>' + rankSvg(info.rank.letter) + '<span class="small mut">Tu es au sommet</span></section>';
    }
    if (rs.length) {
      const six = rs.slice(0, 6).reverse();
      const max = Math.max(...six.map((x) => x.d));
      h += '<section class="glass tile tap" role="button" tabindex="0" data-act="run"><span class="label">Dernière course</span>'
        + '<div class="col" style="gap:2px"><span class="num" style="font-size:26px">' + fr(rs[0].d) + ' km</span><span class="small mut">' + dur(rs[0].t) + ' · ' + pace(rs[0].d, rs[0].t).replace(' par km', '/km') + '</span></div>'
        + '<div class="bars" style="height:38px;margin-top:auto" role="img" aria-label="Distance des dernières courses">' + six.map((x, i) => '<div class="' + (i === six.length - 1 ? 'last' : '') + '" style="height:' + Math.max(5, Math.round((x.d / max) * 38)) + 'px"></div>').join('') + '</div></section>';
    } else {
      h += '<section class="glass tile tap" role="button" tabindex="0" data-act="run"><span class="label">Course</span><span class="h2">Aucune course</span><span class="small mut" style="margin-top:auto">Touche pour en noter une</span></section>';
    }
    h += '</div>';
  }

  if (quests.length) {
    const all = quests.concat([wq]);
    const doneCount = all.filter((q) => q.done).length;
    h += '<div class="sec"><span class="h2">Quêtes</span><span class="small mut">' + doneCount + ' sur ' + all.length + '</span></div>'
      + '<section class="glass card list tap" role="button" tabindex="0" data-act="quests" style="padding:4px 16px">' + all.map((q) => '<div class="item"><span class="qmark' + (q.done ? ' done' : '') + '">' + (q.done ? tick : '') + '</span>'
      + '<div class="col grow" style="gap:1px"><span' + (q.done ? ' class="mut" style="text-decoration:line-through"' : '') + '>' + esc(q.label) + (q.id === 'week' ? ' <span class="tag" style="margin-left:4px">Semaine</span>' : '') + '</span>' + (q.done || !q.cur ? '' : '<span class="small mut">' + q.cur + ' sur ' + q.goal + '</span>') + '</div>'
      + '<span class="gold-text small" style="font-weight:600">+' + q.xp + ' XP</span></div>').join('') + '</section>';
  }

  if (photoDue()) {
    h += '<section class="glass card row tap" role="button" tabindex="0" data-act="photos"><span class="ico">' + ICON.cam + '</span><div class="col grow"><span class="h2">C’est le moment de ta photo</span><span class="small mut">La dernière a plus de deux semaines.</span></div>' + ICON.chev + '</section>';
  }
  // Rappel de sauvegarde : toutes les deux semaines, tant que rien n'a été exporté.
  if (!state.installed) { state.installed = Date.now(); save(); }
  if (has && Date.now() - (state.lastExport || state.installed) > 14 * DAY) {
    h += '<section class="glass card row tap" role="button" tabindex="0" data-act="settings"><span class="ico gold">' + ICON.save + '</span><div class="col grow"><span class="h2">Pense à sauvegarder</span><span class="small mut">Tes séances n’existent que dans ce téléphone.</span></div>' + ICON.chev + '</section>';
  }
  return h;
}

// ---------- Détails : niveau, semaine, quêtes ----------
function sheetLevel() {
  const xp = totalXp();
  const lv = levelInfo(xp);
  const info = rankInfo();
  const b = xpBreakdown();
  const line = (label, detail, value) => '<div class="item"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + label + '</span><span class="small mut">' + detail + '</span></div><span class="gold-text" style="font-weight:600;white-space:nowrap">' + value.toLocaleString('fr-FR') + ' XP</span></div>';
  sheet('<div class="row" style="gap:14px">' + rankSvg(info.rank.letter) + '<div class="col grow"><span class="gold-text" style="font-size:11px;font-weight:600;letter-spacing:2px">RANG ' + info.rank.letter + ' · ' + esc(info.rank.name.toUpperCase()) + '</span><span class="big">Niveau ' + lv.level + '</span><span class="small mut">' + xp.toLocaleString('fr-FR') + ' XP gagnés en tout</span></div></div>'
    + '<div class="col" style="gap:8px"><div class="bar"><div style="width:' + Math.round((lv.into / lv.need) * 100) + '%"></div></div><span class="small mut">' + lv.into + ' sur ' + lv.need + ' XP pour atteindre le niveau ' + (lv.level + 1) + '. Chaque niveau demande 50 XP de plus que le précédent.</span></div>'
    + '<button type="button" class="pill glass wide" data-act="rank">Voir mon rang et les épreuves</button>'
    + '<span class="label">D’où vient ton XP</span><div class="list">'
    + line('Séries validées', b.sets.toLocaleString('fr-FR') + ' séries × 10 XP', b.sets * 10)
    + line('Séances terminées', b.sessions + ' séances × 50 XP', b.sessions * 50)
    + line('Course à pied', fr(b.km, 1) + ' km × 20 XP', Math.round(b.km * 20))
    + line('Records battus', b.prs + ' × 25 XP', b.prs * 25)
    + line('Quêtes du jour', plural(b.quests, 'quête réussie', 'quêtes réussies'), b.questXp) + '</div>'
    + '<span class="small mut">Le niveau monte avec l’XP. Le rang, lui, se gagne en réussissant des épreuves.</span>' + closeBtn);
}

// Séances de la semaine en cours (ou d'une autre semaine si on donne son lundi).
function sheetWeek(monday) {
  const names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const start = monday || weekDays()[0].start;
  const t0 = midnight();
  let n = 0;
  let h = '';
  for (let i = 0; i < 7; i++) {
    const d0 = new Date(start); d0.setDate(d0.getDate() + i);
    const a = d0.getTime(), b = a + DAY;
    const list = state.workouts.filter((w) => w.start >= a && w.start < b).sort((x, y) => x.start - y.start);
    n += list.length;
    const isToday = a === t0;
    const head = '<span style="font-weight:600' + (isToday ? ';color:var(--gold)' : '') + '">' + names[i] + ' ' + d0.getDate() + (isToday ? ' · aujourd’hui' : '') + '</span>';
    if (!list.length) h += '<div class="item"><div class="col grow" style="gap:2px">' + head + '<span class="small mut">' + (a > Date.now() ? 'À venir' : 'Repos') + '</span></div></div>';
    for (const w of list) h += '<button type="button" class="item" data-act="detail" data-id="' + esc(w.id) + '"><div class="col grow" style="gap:2px">' + head + '<span class="small mut">' + esc(titleOf(w)) + ' · ' + esc(summary(w)) + '</span></div>' + ICON.chev + '</button>';
  }
  const prev = start - 7 * DAY, next = start + 7 * DAY;
  sheet('<div class="row between"><div class="col"><span class="label">' + plural(n, 'séance', 'séances') + '</span><h1 class="h1">Semaine du ' + new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + '</h1></div></div>'
    + '<div class="row"><button type="button" class="pill sm glass grow" data-act="week" data-m="' + prev + '">Semaine d’avant</button>' + (next <= Date.now() ? '<button type="button" class="pill sm glass grow" data-act="week" data-m="' + next + '">Semaine d’après</button>' : '') + '</div>'
    + '<div class="list">' + h + '</div><span class="small mut">' + plural(weekStreak(), 'semaine', 'semaines') + ' d’affilée avec au moins une séance. La série ne se casse pas tant que la semaine en cours n’est pas finie.</span>' + closeBtn);
}

function sheetQuests() {
  let h = '<div class="col"><span class="label">Se cochent toutes seules</span><h1 class="h1">Quêtes du jour</h1></div>';
  for (const q of dailyQuests().concat([weekQuest()])) {
    h += '<div class="exo"><div class="row between"><span style="font-weight:600">' + esc(q.label) + '</span><span class="gold-text" style="font-weight:600">+' + q.xp + ' XP</span></div>'
      + '<div class="bar' + (q.done ? ' gold' : '') + '"><div style="width:' + Math.round((q.cur / q.goal) * 100) + '%"></div></div>'
      + '<span class="small mut">' + (q.done ? 'Réussie' : q.cur + ' sur ' + q.goal + ' ' + q.unit) + '</span></div>';
  }
  sheet(h + '<span class="small mut">Trois nouvelles quêtes chaque jour, tirées de tes exercices actuels, plus une quête pour la semaine. Elles se valident quand tu termines ta séance ou enregistres ta course, et l’XP s’ajoute tout de suite. Tu règles ton objectif de la semaine dans les réglages.</span>' + closeBtn);
}

// ---------- Historique ----------
function summary(w) {
  const r = w.exercises.find((e) => e.name === 'Running');
  if (r && w.exercises.length === 1) { const s = r.sets[0] || {}; return fr(s.d || 0) + ' km · ' + dur(s.t || 0); }
  const sets = w.exercises.reduce((k, e) => k + e.sets.length, 0);
  return plural(w.exercises.length, 'exercice', 'exercices') + ' · ' + plural(sets, 'série', 'séries') + (w.end > w.start ? ' · ' + dur((w.end - w.start) / 1000) : '');
}

const isRun = (w) => w.exercises.some((e) => e.name === 'Running');

// La liste des séances, filtrée par la recherche (nom de séance, exercice, mois…).
function historyList() {
  const q = norm(ui.hQuery || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const flat = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const monthOf = (w) => new Date(w.start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const shown = sorted().filter((w) => !q || flat(titleOf(w) + ' ' + w.title + ' ' + monthOf(w) + ' ' + w.exercises.map((e) => exoName(e.name) + ' ' + (e.note || '')).join(' ') + (isRun(w) ? ' course courir' : '') + (w.feel ? ' ' + w.feel : '')).includes(q));
  if (!shown.length) return '<section class="glass card"><span class="mut">Aucune séance ne correspond à « ' + esc(ui.hQuery) + ' ».</span></section>';
  // Bilan de chaque mois : nombre de séances, de séries et de kilomètres.
  const recap = {};
  for (const w of shown) { const r = recap[monthOf(w)] || (recap[monthOf(w)] = { n: 0, sets: 0, km: 0 }); r.n += 1; for (const e of w.exercises) for (const s of e.sets) { if (e.name === 'Running') r.km += s.d || 0; else r.sets += 1; } }
  let h = (q ? '<span class="small mut">' + plural(shown.length, 'séance trouvée', 'séances trouvées') + '</span>' : '') + '<section class="glass card list" style="padding:4px 16px">';
  let month = '';
  for (const w of shown.slice(0, ui.historyLimit)) {
    const m = monthOf(w);
    if (m !== month) { month = m; const r = recap[m]; h += '<div class="row between month"><span class="label">' + esc(m) + '</span><span class="small mut">' + plural(r.n, 'séance', 'séances') + (r.sets ? ' · ' + r.sets + ' séries' : '') + (r.km ? ' · ' + fr(r.km, 1) + ' km' : '') + '</span></div>'; }
    const run = isRun(w) && w.exercises.length === 1;
    h += '<button type="button" class="item" data-act="detail" data-id="' + esc(w.id) + '"><span class="ico' + (run ? ' gold' : '') + '">' + (run ? ICON.run : ICON.bell) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(titleOf(w)) + (w.prs ? ' <span class="gold-text small">· ' + plural(w.prs, 'record', 'records') + '</span>' : '') + '</span><span class="small mut">' + esc(summary(w)) + '</span></div>'
      + '<span class="small mut" style="white-space:nowrap">' + new Date(w.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) + '</span></button>';
  }
  h += '</section>';
  if (shown.length > ui.historyLimit) h += '<button type="button" class="pill glass wide" data-act="more">Voir plus</button>';
  return h;
}

function viewHistory() {
  const all = sorted();
  let h = '<div class="col" style="gap:2px"><span class="small mut">' + plural(all.length, 'séance enregistrée', 'séances enregistrées') + '</span><h1 class="h1">Historique</h1></div>';
  if (!all.length) return h + '<section class="glass card col" style="gap:12px"><span class="mut">Aucune séance pour le moment.</span><button type="button" class="pill gold-btn wide" data-act="pick-hevy">Importer depuis Hevy</button></section>';

  // Calendrier de régularité : 18 semaines, une colonne par semaine.
  const cols = heat(18);
  const active = cols.reduce((n, c) => n + c.filter((d) => d.n).length, 0);
  h += '<section class="glass card hud col" style="gap:12px"><div class="row between"><span class="h2">Régularité</span><span class="small mut">' + plural(active, 'jour actif', 'jours actifs') + ' sur 18 semaines</span></div>'
    + '<div class="heat">' + cols.map((c) => '<div role="button" tabindex="0" data-act="week" data-m="' + c[0].start + '" aria-label="Semaine du ' + new Date(c[0].start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + '">' + c.map((d) => '<i class="' + (d.future ? 'future' : (d.n > 1 ? 'n2' : (d.n ? 'n1' : ''))) + (d.today ? ' today' : '') + '"></i>').join('') + '</div>').join('') + '</div>'
    + '<span class="small mut">Chaque colonne est une semaine. Touche une colonne pour voir ses séances.</span></section>';

  h += '<input class="textin" id="h-search" type="search" placeholder="Chercher une séance, un exercice, un mois" aria-label="Chercher dans l’historique" value="' + esc(ui.hQuery || '') + '">';
  return h + '<div id="h-list" class="col" style="gap:16px">' + historyList() + '</div>';
}

export function sheetDetail(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return;
  const time = new Date(w.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  sheet('<div class="col"><span class="label">' + dateFr(w.start, true) + ' · ' + time + '</span><h1 class="h1">' + esc(titleOf(w)) + '</h1>'
    + '<span class="small mut">' + esc(summary(w)) + ' · <span class="gold-text" style="font-weight:600">+' + xpOf(w) + ' XP</span>' + (w.prs ? ' · ' + plural(w.prs, 'record', 'records') : '') + '</span></div>'
    + '<div class="list">' + w.exercises.map((e) => '<button type="button" class="item" data-act="exo" data-name="' + esc(e.name) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(e.name)) + (e.sets.some((x) => x.pr) ? ' <span class="gold-text small">· record</span>' : '') + '</span><span class="small mut">'
      + esc(e.name === 'Running' ? e.sets.map((s) => setText(s) + ' · ' + pace(s.d, s.t)).join(', ') : e.sets.map(setText).join(', ')) + '</span>' + (e.note ? '<span class="small" style="color:var(--gold)">Note : ' + esc(e.note) + '</span>' : '') + '</div>' + ICON.chev + '</button>').join('') + '</div>'
    + '<div class="col" style="gap:8px"><span class="label">Ressenti</span><div class="row" id="feel-row">' + feelPills(w) + '</div></div>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="share" data-id="' + esc(w.id) + '">Partager en image</button>'
    + '<button type="button" class="pill glass grow" data-act="copy" data-id="' + esc(w.id) + '" style="color:var(--gold)">' + ICON.copy + 'Pour Claude</button></div>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="edit-workout" data-id="' + esc(w.id) + '">Modifier</button><button type="button" class="pill glass grow" data-act="delete" data-id="' + esc(w.id) + '" style="color:var(--mut)">Supprimer</button></div>' + closeBtn);
}

// ---------- Course (une fenêtre, plus un onglet) ----------
function sheetRun() {
  const rs = runs();
  const todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  let h = '<div class="col"><span class="label">' + plural(rs.length, 'course', 'courses') + '</span><h1 class="h1">Course à pied</h1></div>';
  h += '<div class="exo"><span class="label violet">Noter une course</span>'
    + '<div class="row"><label class="field grow" style="height:52px"><input id="run-d" inputmode="decimal" placeholder="0" aria-label="Distance en kilomètres"><span class="unit">km</span></label>'
    + '<label class="field grow" style="height:52px"><input id="run-m" inputmode="numeric" placeholder="0" aria-label="Minutes"><span class="unit">min</span></label>'
    + '<label class="field grow" style="height:52px"><input id="run-s" inputmode="numeric" placeholder="0" aria-label="Secondes"><span class="unit">s</span></label></div>'
    + '<label class="row" style="gap:10px"><span class="small mut">Jour</span><input class="textin grow" type="date" id="run-date" value="' + todayIso + '" max="' + todayIso + '" style="height:46px"></label>'
    + '<button type="button" class="pill gold-btn wide" data-act="add-run">Enregistrer</button></div>';
  if (rs.length) {
    const longest = rs.reduce((a, b) => (b.d > a.d ? b : a));
    const timed = rs.filter((x) => x.d >= 3 && x.t > 0);
    const fastest = timed.length ? timed.reduce((a, b) => (b.t / b.d < a.t / a.d ? b : a)) : null;
    h += '<div class="row" style="align-items:stretch"><button type="button" class="exo grow" style="text-align:left" data-act="detail" data-id="' + esc(longest.id) + '"><span class="label">Plus longue</span><span class="h2 gold-text">' + fr(longest.d) + ' km</span><span class="small mut">' + dateFr(longest.date, true) + '</span></button>'
      + (fastest ? '<button type="button" class="exo grow" style="text-align:left" data-act="detail" data-id="' + esc(fastest.id) + '"><span class="label">Meilleure allure</span><span class="h2 gold-text">' + pace(fastest.d, fastest.t) + '</span><span class="small mut">' + fr(fastest.d) + ' km · ' + dateFr(fastest.date, true) + '</span></button>' : '') + '</div>';
    if (rs.length >= 2) h += '<div class="exo"><span class="label">Distance de tes dernières courses</span>' + chartSvg(rs.slice(0, 16).reverse().map((x) => x.d), ' km') + '</div>';
    h += '<span class="label">Dernières courses</span><div class="list">' + rs.slice(0, 15).map((x) => '<button type="button" class="item" data-act="detail" data-id="' + esc(x.id) + '"><span class="ico gold">' + ICON.run + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + fr(x.d) + ' km</span><span class="small mut">' + dur(x.t) + ' · ' + pace(x.d, x.t) + '</span></div><span class="small mut">' + dateFr(x.date) + '</span></button>').join('') + '</div>';
  }
  sheet(h + closeBtn);
}

// ---------- Réglages et fichiers ----------
function sheetSettings() {
  const rest = state.settings.rest || 90;
  sheet('<h1 class="h1">Réglages</h1>'
    + '<div class="col" style="gap:8px"><span class="label">Temps de repos par défaut</span><div class="row" style="flex-wrap:wrap;gap:8px">'
    + [60, 90, 120, 150, 180].map((s) => '<button type="button" class="pill sm ' + (s === rest ? 'gold-btn' : 'glass') + '" data-act="set-rest" data-s="' + s + '">' + clock(s) + '</button>').join('') + '</div>'
    + '<span class="small mut">Tu peux aussi régler un repos différent pour chaque exercice pendant la séance.</span>'
    + '<button type="button" class="pill sm glass wide' + (state.settings.sound === false ? '' : ' on') + '" data-act="toggle-sound">' + (state.settings.sound === false ? 'Bip de fin de repos : non' : 'Bip de fin de repos : oui') + '</button></div>'
    + '<div class="col" style="gap:8px"><span class="label">Objectif de séances par semaine</span><div class="row" style="flex-wrap:wrap;gap:8px">'
    + [2, 3, 4, 5, 6].map((n) => '<button type="button" class="pill sm ' + (n === weekGoal() ? 'gold-btn' : 'glass') + '" data-act="set-goal" data-n="' + n + '">' + n + '</button>').join('') + '</div>'
    + '<span class="small mut">Les courses comptent. L’atteindre valide la quête de la semaine (+150 XP).</span></div>'
    + '<div class="col" style="gap:8px"><span class="label">Hevy</span><button type="button" class="pill glass wide" data-act="pick-hevy">Importer mon historique Hevy</button>'
    + '<span class="small mut">Dans Hevy : Profil, Réglages, Exporter les données. Choisis ensuite le fichier workouts.csv ici.</span></div>'
    + '<div class="col" style="gap:8px"><span class="label">Sauvegarde</span><div class="row"><button type="button" class="pill glass grow" data-act="export">Exporter</button><button type="button" class="pill glass grow" data-act="pick-backup">Restaurer</button></div>'
    + '<span class="small mut">Tes données restent sur ce téléphone. Exporte une sauvegarde de temps en temps pour ne rien perdre.</span></div>'
    + '<div class="col" style="gap:8px"><span class="label">Version ' + VERSION + '</span><div class="row"><button type="button" class="pill glass grow" data-act="news">Nouveautés</button><button type="button" class="pill glass grow" data-act="update">Mettre à jour</button></div></div>' + closeBtn);
}

// Liste des nouveautés de la version : montrée une fois après chaque mise à jour, et depuis les réglages.
function sheetNews() {
  const n = NEWS[0];
  sheet('<div class="col"><span class="label violet">Version ' + n.v + '</span><h1 class="h1">Nouveautés</h1></div><div class="list">'
    + n.items.map((t) => '<div class="item"><span class="qmark done"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#D8BD82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="grow">' + esc(t) + '</span></div>').join('') + '</div>' + closeBtn);
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
  state.lastExport = Date.now();
  save();
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- Actions de ce fichier ----------
Object.assign(ACTIONS, {
  settings: () => sheetSettings(),
  // Pendant une modification, on demande avant de fermer pour ne pas perdre le travail par erreur.
  close: () => { if (ui.edit && !confirm('Fermer sans enregistrer les modifications ?')) return; closeSheet(); },
  close2: () => closeSheet2(),
  level: () => sheetLevel(),
  week: (el) => sheetWeek(el.dataset.m ? +el.dataset.m : 0),
  quests: () => sheetQuests(),
  run: () => sheetRun(),
  copy: (el) => { const w = state.workouts.find((x) => x.id === el.dataset.id); if (w) copyText(workoutText(w)); },
  detail: (el) => sheetDetail(el.dataset.id),
  delete: (el) => { if (confirm('Supprimer définitivement cette séance ?')) { state.workouts = state.workouts.filter((x) => x.id !== el.dataset.id); save(); closeSheet(); render(); } },
  more: () => { ui.historyLimit += 40; render(); },
  'set-rest': (el) => { state.settings.rest = +el.dataset.s; save(); sheetSettings(); },
  'set-goal': (el) => { state.settings.weekGoal = +el.dataset.n; save(); render(); sheetSettings(); },
  'toggle-sound': () => { state.settings.sound = state.settings.sound === false; save(); sheetSettings(); },
  news: () => sheetNews(),
  update: async () => {
    if (!('serviceWorker' in navigator) || local) { toast('Mise à jour indisponible ici'); return; }
    toast('Recherche d’une mise à jour…');
    const v = await onlineVersion();
    if (!v) { toast('Pas de réseau pour vérifier'); return; }
    if (v <= VERSION) { toast('Tu as la dernière version (' + VERSION + ')'); return; }
    closeSheet();
    toast('Installation de la version ' + v + '…');
    forceUpdate();
  },
  'pick-hevy': () => pickFile('.csv,text/csv,text/comma-separated-values', (text) => {
    try { const r = importHevy(text); closeSheet(); ui.enter = true; render(); toast(r.added + ' séances importées' + (r.skipped ? ', ' + r.skipped + ' déjà là' : '')); } catch (e) { toast(e.message); }
  }),
  'pick-backup': () => pickFile('.json,application/json', (text) => {
    try { const r = importJson(text); closeSheet(); ui.enter = true; render(); toast(r.added + ' séances restaurées'); } catch (e) { toast('Ce fichier n’est pas une sauvegarde valide'); }
  }),
  export: () => exportBackup(),
  'add-run': () => {
    const d = toNum($('run-d').value), t = Math.round(toNum($('run-m').value) * 60 + toNum($('run-s').value));
    if (d <= 0 || t <= 0) { toast('Indique la distance et la durée'); return; }
    const now = Date.now();
    // Aujourd'hui : la course vient de finir. Un autre jour : on la place à midi ce jour-là.
    const day = Date.parse($('run-date').value + 'T12:00:00');
    const today = new Date(now - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const end = !isNaN(day) && $('run-date').value !== today && day < now ? day + t * 1000 : now;
    state.workouts.push({ id: 'r' + now, title: 'Course', start: end - t * 1000, end, exercises: [{ name: 'Running', sets: [{ d, t, done: true }] }] });
    save(); render(); sheetRun(); toast('Course enregistrée, +' + (Math.round(d * 20) + 50) + ' XP');
  },
});

// ---------- Affichage général ----------
export function render() {
  const views = { home: viewHome, workout: viewWorkout, progress: viewProgress, history: viewHistory };
  // L'animation d'arrivée ne joue que quand on change d'écran, pas à chaque série cochée.
  $('app').classList.toggle('enter', ui.enter);
  ui.enter = false;
  $('app').innerHTML = (views[ui.tab] || viewHome)();
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  // Un rang gagné se fête sur l'accueil, quand aucune autre fenêtre n'est ouverte.
  if (ui.tab === 'home' && state.workouts.length && !$('sheet').firstElementChild) checkRankUp(rankInfo());
  // Après une mise à jour, on montre une fois ce qui a changé.
  if (ui.tab === 'home' && state.seenVersion !== VERSION && !$('sheet').firstElementChild && !state.active) {
    const first = state.seenVersion === undefined && !state.workouts.length;
    state.seenVersion = VERSION; save();
    if (!first) sheetNews();
  }
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act], [data-tab]');
  if (el && el.disabled) return;
  if (el && el.dataset.act && ACTIONS[el.dataset.act]) { ACTIONS[el.dataset.act](el); return; }
  if (el && el.dataset.tab) { ui.tab = el.dataset.tab; ui.enter = true; closeSheet(); render(); window.scrollTo(0, 0); return; }
  // Toucher le fond sombre ferme la fenêtre (sauf pendant une modification, pour ne rien perdre par erreur).
  if (ev.target.classList.contains('sheet')) { if (ev.target.parentElement.id === 'sheet2') closeSheet2(); else if (!ui.edit) closeSheet(); }
});
document.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[role=button]')) { ev.preventDefault(); ev.target.click(); }
});
document.addEventListener('input', (ev) => {
  // Recherche dans l'historique : on ne redessine que la liste, pour garder le clavier ouvert.
  if (ev.target.id === 'h-search') { ui.hQuery = ev.target.value; ui.historyLimit = 40; $('h-list').innerHTML = historyList(); return; }
  onInput(ev.target);
});
document.addEventListener('change', (ev) => { if (ev.target.id === 'photo-date') onPhotoDate(ev.target); });

// Tirer une fenêtre vers le bas la ferme (quand elle est en haut de son contenu, et hors modification).
let drag = null;
document.addEventListener('touchstart', (ev) => {
  const box = ev.target.closest && ev.target.closest('.sheet > div');
  drag = box && box.scrollTop <= 0 && !ui.edit && !ev.target.closest('input') ? { y: ev.touches[0].clientY, box, dy: 0 } : null;
}, { passive: true });
document.addEventListener('touchmove', (ev) => {
  if (!drag) return;
  drag.dy = ev.touches[0].clientY - drag.y;
  if (drag.dy > 0) { drag.box.style.transition = 'none'; drag.box.style.transform = 'translateY(' + drag.dy + 'px)'; }
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!drag) return;
  const { box, dy } = drag;
  drag = null;
  if (dy > 110) { if (box.closest('#sheet2')) closeSheet2(); else closeSheet(); return; }
  box.style.transition = 'transform 0.25s';
  box.style.transform = '';
});
// Sélectionne le contenu d'une case quand on la touche, pour taper directement la nouvelle valeur.
document.addEventListener('focusin', (ev) => { if (ev.target.matches && ev.target.matches('.field input, .bignum, .midnum')) setTimeout(() => ev.target.select(), 0); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { keepAwake(); renderRest(); } });

setInterval(tick, 500);

if (state.active) { ui.tab = 'workout'; keepAwake(); }
render();
renderRest();
loadPhotos().then(() => { if (ui.tab === 'home' && photoDue()) render(); });

// ---------- Mises à jour ----------
// L'app est gardée dans le téléphone (voir sw.js). Pour ne jamais rester bloqué sur une ancienne version :
// 1. à chaque ouverture et à chaque retour dans l'app, on demande au site quel est son numéro de version ;
// 2. s'il est plus récent, on télécharge la nouvelle version et l'app se recharge toute seule (sauf en pleine séance) ;
// 3. le bouton « Mettre à jour » des réglages fait la même chose de force.

// Numéro de version en ligne (0 si pas de réseau). Le paramètre "fresh" contourne tous les caches.
async function onlineVersion() {
  try {
    const text = await (await fetch('sw.js?fresh=' + Date.now(), { cache: 'no-store' })).text();
    const m = /ascension-(\d+)/.exec(text);
    return m ? +m[1] : 0;
  } catch (e) { return 0; }
}

// Efface la copie gardée dans le téléphone et recharge depuis le site. Les séances ne sont pas touchées.
async function forceUpdate() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
  } catch (e) { /* on recharge quand même */ }
  location.replace('./?maj=' + Date.now());
}

let checking = false;
async function checkUpdate() {
  if (checking || state.active) return; // jamais en pleine séance
  checking = true;
  const v = await onlineVersion();
  checking = false;
  if (v <= VERSION || state.active || $('sheet').firstElementChild) return;
  // Une seule tentative automatique par ouverture, pour ne pas tourner en rond si le site n'est pas encore à jour.
  if (sessionStorage.getItem('maj') === String(v)) return;
  sessionStorage.setItem('maj', String(v));
  toast('Mise à jour vers la version ' + v + '…');
  forceUpdate();
}

if ('serviceWorker' in navigator && window.isSecureContext && !local) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  setTimeout(checkUpdate, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
}
