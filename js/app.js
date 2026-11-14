// Point d'entrée de l'app : accueil, historique, course, réglages, et l'affichage général.
// La séance est dans seance.js, l'onglet Progression dans progress.js, les briques communes dans ui.js.
import {
  state, save, exoName, sorted, runs, xpOf, totalXp, levelInfo, weekStreak,
  fr, dur, clock, pace, dateFr, setText, workoutText, importHevy, exportJson, importJson,
  dailyQuests, weekDays, totals, xpBreakdown,
} from './store.js';
import { rankInfo, heat } from './stats.js';
import { $, esc, plural, toNum, ui, ACTIONS, ICON, checkDark, rankSvg, emblem, toast, sheet, closeSheet, closeSheet2, closeBtn, copyText, titleOf } from './ui.js';
import { viewWorkout, nextRoutine, usualTime, tick, renderRest, keepAwake, onInput } from './seance.js';
import { viewProgress, rankTeaser, checkRankUp, photoDue, loadPhotos } from './progress.js';

const DAY = 864e5;
const midnight = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

// ---------- Accueil ----------
function viewHome() {
  const has = state.workouts.length > 0;
  const quests = has ? dailyQuests() : []; // avant le calcul d'XP : une quête réussie rapporte tout de suite
  const xp = totalXp();
  const lv = levelInfo(xp);
  const info = rankInfo();
  const streak = weekStreak();
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const rs = runs();
  const t0 = midnight();

  let h = '<div class="row between"><div class="col" style="gap:2px"><span class="small mut">' + esc(today.charAt(0).toUpperCase() + today.slice(1)) + '</span><h1 class="h1">Ascension</h1></div>'
    + '<button type="button" class="iconbtn glass" data-act="settings" aria-label="Réglages">' + ICON.gear + '</button></div>';

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

  // La séance du jour
  if (state.active) {
    h += '<section class="glass card hud row"><div class="col grow"><span class="label violet">Séance en cours</span><span class="h2">' + esc(state.active.label) + '</span>'
      + '<span class="small mut">Commencée il y a ' + dur((Date.now() - state.active.start) / 1000) + '</span></div>'
      + '<button type="button" class="pill gold-btn" data-tab="workout">Reprendre</button></section>';
  } else {
    const doneToday = state.workouts.find((w) => w.start >= t0 && w.exercises.some((e) => e.name !== 'Running'));
    const ranToday = rs.some((r) => r.date >= t0);
    if (new Date().getDay() === 0 && !ranToday) {
      h += '<section class="glass card hud row"><div class="col grow"><span class="label violet">Dimanche</span><span class="h2">Course du dimanche</span>'
        + '<span class="small mut">' + (rs.length ? 'La dernière : ' + fr(rs[0].d) + ' km en ' + dur(rs[0].t) : 'Note ta distance et ton temps') + '</span></div>'
        + '<button type="button" class="pill gold-btn" data-tab="run">Noter</button></section>';
    }
    const r = nextRoutine();
    if (r) {
      h += '<section class="glass card hud row tap" role="button" tabindex="0" data-act="routine" data-id="' + esc(r.id) + '"><div class="col grow"><span class="label violet">' + (doneToday ? 'Séance faite aujourd’hui · la prochaine' : 'Ta prochaine séance') + '</span><span class="h2">' + esc(r.label) + '</span>'
        + '<span class="small mut">' + plural(r.exercises.length, 'exercice', 'exercices') + ' · ' + usualTime(r) + '</span></div>'
        + '<button type="button" class="pill gold-btn" data-act="start" data-id="' + esc(r.id) + '">Commencer</button></section>';
    }
  }

  if (has) {
    h += '<section class="glass card col tap" role="button" tabindex="0" data-act="week" style="gap:14px"><div class="row between"><span class="h2">Ta semaine</span>'
      + '<span class="row small mut" style="gap:4px">' + plural(streak, 'semaine', 'semaines') + ' d’affilée' + ICON.chev + '</span></div>'
      + '<div class="week">' + weekDays().map((d) => '<div class="day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') + '"><span class="dot">' + (d.done ? checkDark : '') + '</span><span class="small">' + d.letter + '</span></div>').join('') + '</div></section>';
  }

  if (quests.length) {
    const doneCount = quests.filter((q) => q.done).length;
    h += '<div class="sec"><span class="h2">Quêtes du jour</span><span class="small mut">' + doneCount + ' sur ' + quests.length + '</span></div>'
      + '<section class="glass card list tap" role="button" tabindex="0" data-act="quests" style="padding:4px 16px">' + quests.map((q) => '<div class="item"><span class="qmark' + (q.done ? ' done' : '') + '">' + (q.done ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#D8BD82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') + '</span>'
      + '<div class="col grow" style="gap:1px"><span' + (q.done ? ' class="mut" style="text-decoration:line-through"' : '') + '>' + esc(q.label) + '</span>' + (q.done || !q.cur ? '' : '<span class="small mut">' + q.cur + ' sur ' + q.goal + '</span>') + '</div>'
      + '<span class="gold-text small" style="font-weight:600">+' + q.xp + ' XP</span></div>').join('') + '</section>';
  }

  if (has) h += rankTeaser(info);

  if (photoDue()) {
    h += '<section class="glass card row tap" role="button" tabindex="0" data-act="photos"><div class="col grow"><span class="label violet">Rappel</span><span class="h2">C’est le moment de ta photo</span><span class="small mut">Ta dernière photo de suivi a plus de deux semaines.</span></div>' + ICON.chev + '</section>';
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
  for (const q of dailyQuests()) {
    h += '<div class="exo"><div class="row between"><span style="font-weight:600">' + esc(q.label) + '</span><span class="gold-text" style="font-weight:600">+' + q.xp + ' XP</span></div>'
      + '<div class="bar' + (q.done ? ' gold' : '') + '"><div style="width:' + Math.round((q.cur / q.goal) * 100) + '%"></div></div>'
      + '<span class="small mut">' + (q.done ? 'Réussie' : q.cur + ' sur ' + q.goal + ' ' + q.unit) + '</span></div>';
  }
  sheet(h + '<span class="small mut">Trois nouvelles quêtes chaque jour, tirées de tes exercices actuels. Elles se valident quand tu termines ta séance ou enregistres ta course, et l’XP s’ajoute tout de suite.</span>' + closeBtn);
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

  // Calendrier de régularité : 18 semaines, une colonne par semaine.
  const cols = heat(18);
  const active = cols.reduce((n, c) => n + c.filter((d) => d.n).length, 0);
  h += '<section class="glass card hud col" style="gap:12px"><div class="row between"><span class="h2">Régularité</span><span class="small mut">' + plural(active, 'jour actif', 'jours actifs') + ' sur 18 semaines</span></div>'
    + '<div class="heat">' + cols.map((c) => '<div role="button" tabindex="0" data-act="week" data-m="' + c[0].start + '" aria-label="Semaine du ' + new Date(c[0].start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + '">' + c.map((d) => '<i class="' + (d.future ? 'future' : (d.n > 1 ? 'n2' : (d.n ? 'n1' : ''))) + (d.today ? ' today' : '') + '"></i>').join('') + '</div>').join('') + '</div>'
    + '<span class="small mut">Chaque colonne est une semaine, du lundi au dimanche. Touche une colonne pour voir ses séances.</span></section>';

  h += '<section class="glass card list" style="padding:4px 16px">';
  let month = '';
  for (const w of all.slice(0, ui.historyLimit)) {
    const m = new Date(w.start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (m !== month) { month = m; h += '<span class="label month">' + esc(m) + '</span>'; }
    h += '<button type="button" class="item" data-act="detail" data-id="' + esc(w.id) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(titleOf(w)) + (w.prs ? ' <span class="gold-text small">· ' + plural(w.prs, 'record', 'records') + '</span>' : '') + '</span><span class="small mut">' + esc(summary(w)) + '</span></div>'
      + '<span class="small mut" style="white-space:nowrap">' + new Date(w.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) + '</span></button>';
  }
  h += '</section>';
  if (all.length > ui.historyLimit) h += '<button type="button" class="pill glass wide" data-act="more">Voir plus</button>';
  return h;
}

export function sheetDetail(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return;
  const time = new Date(w.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  sheet('<div class="col"><span class="label">' + dateFr(w.start, true) + ' · ' + time + '</span><h1 class="h1">' + esc(titleOf(w)) + '</h1>'
    + '<span class="small mut">' + esc(summary(w)) + ' · <span class="gold-text" style="font-weight:600">+' + xpOf(w) + ' XP</span>' + (w.prs ? ' · ' + plural(w.prs, 'record', 'records') : '') + '</span></div>'
    + '<div class="list">' + w.exercises.map((e) => '<button type="button" class="item" data-act="exo" data-name="' + esc(e.name) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(e.name)) + (e.sets.some((x) => x.pr) ? ' <span class="gold-text small">· record</span>' : '') + '</span><span class="small mut">'
      + esc(e.name === 'Running' ? e.sets.map((s) => setText(s) + ' · ' + pace(s.d, s.t)).join(', ') : e.sets.map(setText).join(', ')) + '</span></div>' + ICON.chev + '</button>').join('') + '</div>'
    + '<button type="button" class="pill glass wide" data-act="copy" data-id="' + esc(w.id) + '" style="color:var(--gold)">' + ICON.copy + 'Copier pour Claude</button>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="edit-workout" data-id="' + esc(w.id) + '">Modifier</button><button type="button" class="pill glass grow" data-act="delete" data-id="' + esc(w.id) + '" style="color:var(--mut)">Supprimer</button></div>' + closeBtn);
}

// ---------- Course ----------
function viewRun() {
  const rs = runs();
  let h = '<div class="col" style="gap:2px"><span class="small mut">' + plural(rs.length, 'course', 'courses') + '</span><h1 class="h1">Course</h1></div>';
  h += '<section class="glass card hud col" style="gap:12px"><h2 class="h2">Ajouter une course</h2>'
    + '<div class="row"><label class="field grow" style="height:52px"><input id="run-d" inputmode="decimal" placeholder="0" aria-label="Distance en kilomètres"><span class="unit">km</span></label>'
    + '<label class="field grow" style="height:52px"><input id="run-m" inputmode="numeric" placeholder="0" aria-label="Minutes"><span class="unit">min</span></label>'
    + '<label class="field grow" style="height:52px"><input id="run-s" inputmode="numeric" placeholder="0" aria-label="Secondes"><span class="unit">s</span></label></div>'
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
      + ten.map((x, i) => '<button type="button" data-act="detail" data-id="' + esc(x.id) + '" aria-label="' + fr(x.d) + ' km, ' + dateFr(x.date) + '" style="display:flex;align-items:flex-end;height:90px;padding:0 4px"><span style="display:block;width:14px;border-radius:7px;height:' + Math.max(8, Math.round((x.d / max) * 90)) + 'px;background:' + (i === ten.length - 1 ? 'linear-gradient(180deg,#A08AF5,#6F55D8)' : 'rgba(255,255,255,0.16)') + '"></span></button>').join('') + '</div></section>';
    h += '<section class="glass card list" style="padding:4px 16px">' + rs.slice(0, 20).map((x) => '<button type="button" class="item" data-act="detail" data-id="' + esc(x.id) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + fr(x.d) + ' km</span><span class="small mut">' + dur(x.t) + ' · ' + pace(x.d, x.t) + '</span></div><span class="small mut">' + dateFr(x.date) + '</span>' + ICON.chev + '</button>').join('') + '</section>';
  }
  return h;
}

// ---------- Réglages et fichiers ----------
function sheetSettings() {
  const rest = state.settings.rest || 90;
  sheet('<h1 class="h1">Réglages</h1>'
    + '<div class="col" style="gap:8px"><span class="label">Temps de repos par défaut</span><div class="row" style="flex-wrap:wrap;gap:8px">'
    + [60, 90, 120, 150, 180].map((s) => '<button type="button" class="pill sm ' + (s === rest ? 'gold-btn' : 'glass') + '" data-act="set-rest" data-s="' + s + '">' + clock(s) + '</button>').join('') + '</div>'
    + '<span class="small mut">Tu peux aussi régler un repos différent pour chaque exercice pendant la séance.</span></div>'
    + '<div class="col" style="gap:8px"><span class="label">Hevy</span><button type="button" class="pill glass wide" data-act="pick-hevy">Importer mon historique Hevy</button>'
    + '<span class="small mut">Dans Hevy : Profil, Réglages, Exporter les données. Choisis ensuite le fichier workouts.csv ici.</span></div>'
    + '<div class="col" style="gap:8px"><span class="label">Sauvegarde</span><div class="row"><button type="button" class="pill glass grow" data-act="export">Exporter</button><button type="button" class="pill glass grow" data-act="pick-backup">Restaurer</button></div>'
    + '<span class="small mut">Tes données restent sur ce téléphone. Exporte une sauvegarde de temps en temps pour ne rien perdre.</span></div>' + closeBtn);
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

// ---------- Actions de ce fichier ----------
Object.assign(ACTIONS, {
  settings: () => sheetSettings(),
  close: () => closeSheet(),
  close2: () => closeSheet2(),
  level: () => sheetLevel(),
  week: (el) => sheetWeek(el.dataset.m ? +el.dataset.m : 0),
  quests: () => sheetQuests(),
  copy: (el) => { const w = state.workouts.find((x) => x.id === el.dataset.id); if (w) copyText(workoutText(w)); },
  detail: (el) => sheetDetail(el.dataset.id),
  delete: (el) => { if (confirm('Supprimer définitivement cette séance ?')) { state.workouts = state.workouts.filter((x) => x.id !== el.dataset.id); save(); closeSheet(); render(); } },
  more: () => { ui.historyLimit += 40; render(); },
  'set-rest': (el) => { state.settings.rest = +el.dataset.s; save(); sheetSettings(); },
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
    state.workouts.push({ id: 'r' + now, title: 'Course', start: now - t * 1000, end: now, exercises: [{ name: 'Running', sets: [{ d, t, done: true }] }] });
    save(); render(); toast('Course enregistrée, +' + (Math.round(d * 20) + 50) + ' XP');
  },
});

// ---------- Affichage général ----------
export function render() {
  const views = { home: viewHome, workout: viewWorkout, progress: viewProgress, history: viewHistory, run: viewRun };
  // L'animation d'arrivée ne joue que quand on change d'écran, pas à chaque série cochée.
  $('app').classList.toggle('enter', ui.enter);
  ui.enter = false;
  $('app').innerHTML = (views[ui.tab] || viewHome)();
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  // Un rang gagné se fête sur l'accueil, quand aucune autre fenêtre n'est ouverte.
  if (ui.tab === 'home' && state.workouts.length && !$('sheet').firstElementChild) checkRankUp(rankInfo());
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
document.addEventListener('input', (ev) => { onInput(ev.target); });
// Sélectionne le contenu d'une case quand on la touche, pour taper directement la nouvelle valeur.
document.addEventListener('focusin', (ev) => { if (ev.target.matches && ev.target.matches('.field input, .bignum, .midnum')) setTimeout(() => ev.target.select(), 0); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { keepAwake(); renderRest(); } });

setInterval(tick, 500);

if (state.active) { ui.tab = 'workout'; keepAwake(); }
render();
renderRest();
loadPhotos().then(() => { if (ui.tab === 'home' && photoDue()) render(); });

// Le cache hors ligne ne s'active que sur la vraie adresse en ligne, pas pendant les tests sur le PC.
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && window.isSecureContext && !local) navigator.serviceWorker.register('sw.js').catch(() => {});
