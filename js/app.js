// Point d'entrée de l'app : accueil, historique, course, réglages, et l'affichage général.
// La séance est dans seance.js, l'onglet Progression dans progress.js, les briques communes dans ui.js.
import {
  state, save, exoName, sorted, runs, xpOf, totalXp, levelInfo, weekStreak,
  fr, dur, clock, pace, dateFr, setText, workoutText, importHevy, exportJson, importJson,
  weekDays, totals, xpBreakdown, weekQuest, weekGoal, routines, isHevy, unknownExos, renameExo, guessExo, isBand,
} from './store.js';
import { NEWS, EXOS, AKA } from './data.js';
import { rankInfo, heat, bodyLog, addWeight } from './stats.js';
import { beep, wakeAudio, initSound, soundError } from './sound.js';
import { hint, $, esc, norm, plural, toNum, ui, ACTIONS, ICON, checkDark, rankSvg, emblem, toast, toastUndo, sheet, closeSheet, closeSheet2, closeBtn, copyText, titleOf, VERSION, ring, chartSvg, burst } from './ui.js';
import { routinesCard, viewWorkout, usualTime, tick, renderRest, keepAwake, onInput, feelPills } from './seance.js';
import { progCard, progOn, isBeginner, todayList, nextInfo } from './programme.js';
import { formeCard, painCard } from './forme.js';
import { weekCard, lundiBanner } from './semaine.js';
import { campNow, checkCamp } from './campagne.js';
import { monthChCard, paliersCard, duelCard, checkDuels, checkMonth, shareImage } from './defis.js';
import { dojoView } from './dojo.js';
import { p30Card, status as p30Status } from './prog30.js';
import { capCard, ensureCap, bigGoal } from './cap.js';
import { testCard } from './test.js';
import { dailyQuests, streak, SHIELD_MAX, SHIELD_EVERY, feats, myTitle, titles, skins, SKINS } from './quetes.js';
import { bossCard, weekBoss } from './boss.js';
import './course.js';
import { monthBanner } from './bilan.js';
import { quickCard } from './jour.js';
import './chrono.js';
import './retour.js';
import { coachCard } from './coach.js';
import { initFan } from './fan.js';
import { applyBg, bgThumb, FONDS, setBgInfo } from './fond.js';
import './parcours.js';
import { seasonCard, celebrateSeason, sheetSeason, seasonImage, season } from './saison.js';
import { checkGoals, celebrateGoals, goalRow } from './objectifs.js';
import { enablePush, disablePush, initPush, pushOn, notifHour, resync, KINDS as NKINDS } from './notif.js';
import { viewProgress, hevyCard, rankTeaser, checkRankUp, photoDue, loadPhotos, onPhotoDate, radarSvg } from './progress.js';
import { routeSvg, runRecords, routesAll, fmtTime } from './course.js';

const DAY = 864e5;
const local = ['localhost', '127.0.0.1'].includes(location.hostname); // tests sur le PC
const midnight = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

// ---------- Accueil ----------
// Ordre : qui tu es (niveau, flamme), la séance du jour, le boss, rang et hauts faits, quêtes, semaine.
const QICO = { volume: 'stack', record: 'target', seance: 'bolt', rare: 'star' };
const qCat = (q) => (q.rare ? 'rare' : q.id.startsWith('v-') ? 'volume' : q.id.startsWith('r-') ? 'record' : 'seance');
export function questRow(q) {
  const cat = qCat(q);
  return '<div class="quest' + (q.done ? ' done' : '') + (q.rare ? ' rare' : '') + '"><span class="qico ' + (q.done ? 'done' : cat) + '">' + (q.done ? ICON.check : ICON[QICO[cat]]) + '</span>'
    + '<div class="col grow" style="gap:0">' + (q.rare ? '<span class="label" style="color:var(--gold)">Quête rare</span>' : '')
    + '<span class="qlabel" style="font-weight:600">' + esc(q.label) + '</span>'
    + (q.done ? '<span class="small" style="color:var(--vert)">Réussie</span>' : '<div class="bar"><div style="width:' + Math.round((q.cur / q.goal) * 100) + '%"></div></div><span class="small mut" style="margin-top:4px">' + q.cur + ' sur ' + q.goal + ' ' + esc(q.unit) + '</span>') + '</div>'
    + '<span class="xptag ' + (q.done ? 'mut' : 'gold-text') + '">+' + q.xp + ' XP</span></div>';
}

const head = (t, c, right) => '<div class="sechead"><span class="h2 row" style="gap:10px"><i class="secdot ' + c + '"></i>' + t + '</span>' + (right || '') + '</div>';

function flamePill(st) {
  return '<button type="button" class="flame' + (st.n ? '' : ' off') + (st.danger ? ' danger' : '') + '" data-act="flame" aria-label="Flamme de ' + st.n + ' semaine' + (st.n > 1 ? 's' : '') + (st.shields ? ', ' + st.shields + ' bouclier' + (st.shields > 1 ? 's' : '') : '') + '">' + ICON.flame + st.n + '<small class="fl-u">sem.</small>' + (st.shields ? '<span class="fshield">' + ICON.shield + (st.shields > 1 ? '<b>' + st.shields + '</b>' : '') + '</span>' : '') + '</button>';
}

// Selon l'heure : le soir, on fait le point sur la journée au lieu de pousser une grosse séance.
function momentCard(done) {
  const hr = new Date().getHours();
  if (hr < 21 || !state.workouts.length) return '';
  const t0 = midnight(), W = state.workouts.filter((w) => w.start >= t0);
  const sets = W.reduce((n, w) => n + w.exercises.reduce((k, e) => k + e.sets.filter((x) => x.done !== false).length, 0), 0);
  if (done || sets) return ''; // la carte du coach et la forme le disent déjà : pas trois fois la même chose
  return '<section class="glass card tap tint t-blue row" role="button" tabindex="0" data-act="prog" style="gap:12px;align-items:center"><div class="col grow" style="gap:4px"><span class="label violet">Ce soir</span><span style="font-weight:700">Trop tard pour une grosse séance</span><span class="small mut">Après 21 h, une séance dure gêne le sommeil. Fais la version 10 minutes, ou repose-toi et fais-la demain.</span></div>' + ICON.chev + '</section>';
}

function weekBlock(wq) {
  return progOn() ? weekCard() : '<section class="glass card col tap tint t-blue" role="button" tabindex="0" data-act="week" style="gap:14px"><div class="row between"><span class="h2">Ta semaine</span><span class="row small mut" style="gap:4px">' + (wq.done ? 'Objectif atteint' : wq.cur + ' sur ' + wq.goal + ' séances') + ICON.chev + '</span></div><div class="week">' + weekDays().map((d) => '<div class="day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') + '"><span class="dot">' + (d.done ? checkDark : '') + '</span><span class="small">' + d.letter + '</span></div>').join('') + '</div></section>';
}

function viewHome() {
  const has = state.workouts.length > 0;
  const quests = has ? dailyQuests() : []; // avant le calcul d'XP : une quête réussie rapporte tout de suite
  const fx = feats(); // hauts faits (et ceux qui viennent d'être réussis)
  celebrateGoals(checkGoals()); // objectifs atteints
  checkCamp(); // étapes de la campagne
  try { checkMonth(); checkDuels(); } catch (e) { /* rien */ } // défi du mois, duels (defis.js)
  const wq = has ? weekQuest() : null;
  const xp = totalXp();
  const lv = levelInfo(xp);
  const info = rankInfo();
  const st = streak();
  if (st.shields > (state.settings.shSeen || 0)) setTimeout(() => toast('Bouclier gagné : ta flamme est protégée une semaine de plus', true), 1200);
  if (st.shields !== (state.settings.shSeen || 0)) { state.settings.shSeen = st.shields; save(); }
  const t0 = midnight();
  const title = myTitle();
  if (fx.fresh.length) setTimeout(() => { burst(); toast('Haut fait : ' + fx.fresh[0].label, true); }, 600);

  let h = '<div class="topbar"><button type="button" class="emb tap" data-act="profile" aria-label="Mon profil">' + rankSvg(info.rank.letter, false, null, 'emb') + '</button>'
    + '<button type="button" class="who tap" data-act="level"><span class="label violet">' + (title ? esc(title) : 'Rang ' + info.rank.letter + ' · ' + esc(info.rank.name)) + '</span>'
    + '<span class="h2">Niveau ' + lv.level + '</span><div class="bar thin" style="width:100%"><div style="width:' + Math.round((lv.into / lv.need) * 100) + '%"></div></div></button>'
    + flamePill(st) + '</div>';
  { const d = new Date(); const wd = d.toLocaleDateString('fr-FR', { weekday: 'long' }); h = '<header class="homehead">' + h + '<div class="today">' + wd + ' ' + d.getDate() + '<small>' + d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</small></div></header>'; }


  // Le bloc principal : la séance en cours, ou celle du programme
  if (state.active) {
    const a = state.active;
    const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
    const done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    h += '<section class="cta hud"><div class="col" style="gap:4px"><span class="label violet">Séance en cours</span><span class="h1">' + esc(a.label) + '</span>'
      + '<span class="small" style="color:var(--soft)">' + done + ' sur ' + plural(total, 'série', 'séries') + ' · commencée il y a ' + dur((Date.now() - a.start) / 1000) + '</span></div>'
      + '<div class="seg">' + a.exercises.map((e) => '<i class="' + (e.sets.length && e.sets.every((x) => x.done) ? 'on' : '') + '"></i>').join('') + '</div>'
      + '<button type="button" class="pill gold-btn wide" data-tab="workout">Reprendre la séance</button></section>';
  } else {
    // La dernière séance du jour (s'il y en a eu deux, on montre la plus récente).
    const doneToday = state.workouts.filter((w) => w.start >= t0 && !w.boss && !w.quick && w.exercises.some((e) => e.name !== 'Running')).sort((a, b) => b.start - a.start)[0];
    if (!state.settings.modeSet && state.workouts.length < 30) h += modeCard();
    h += painCard();
    const fc = has && progOn() && show('forme');
    h += doneToday && progOn() ? doneCard(doneToday) : progOn() ? progCard(true, !!doneToday, fc) : routinesCard();
    h += momentCard(!!doneToday);
    for (const k of homeOrder()) {
      if (k === 'forme' && fc) h += formeCard(todayList());
      else if (k === 'coach' && has && show('coach') && progOn()) h += coachCard();
      else if (k === 'week' && has && show('week')) h += weekBlock(wq);
      else if (k === 'p30' && has && show('p30') && p30Status()) h += p30Card();
      else if (k === 'prog' && has && show('prog')) h += progressCard();
    }
  }

  if (has) h += monthBanner() + lundiBanner();
  if (!has || state.workouts.length < 40) h += hevyCard();
  // Rappels utiles (sauvegarde, photo) : juste sous le programme, car ils demandent une action.
  const DAYMS = 864e5;
  if (state.workouts.length >= 5 && Date.now() - (state.lastExport || state.installed || 0) > 7 * DAYMS && Date.now() > (state.settings.backupSnooze || 0)) {
    h += '<section class="glass card col backupcard tint t-blue" style="gap:10px"><div class="row" style="gap:12px;align-items:center"><span class="ico">' + ICON.save + '</span><div class="col grow" style="gap:2px"><span style="font-weight:700">Sauvegarde tes progrès</span><span class="small mut">' + (state.lastExport ? 'Dernière sauvegarde il y a ' + Math.floor((Date.now() - state.lastExport) / DAYMS) + ' jours.' : 'Tu n’as jamais sauvegardé.') + ' Tes ' + state.workouts.length + ' séances ne sont que dans ce téléphone. Un fichier dans Fichiers ou iCloud, et rien ne se perd.</span></div></div>'
      + '<div class="row"><button type="button" class="pill glass" data-act="backup-later">Plus tard</button><button type="button" class="pill glass grow" data-act="export" style="color:var(--violet-soft)">Sauvegarder</button></div></section>';
  }
  if (photoDue()) {
    h += '<section class="glass card row tap tint t-pink" role="button" tabindex="0" data-act="photos"><span class="ico">' + ICON.cam + '</span><div class="col grow"><span class="h2">C’est le moment de ta photo</span><span class="small mut">La dernière a plus de deux semaines.</span></div>' + ICON.chev + '</section>';
  }
  // Sous la séance du jour : ta semaine, ton programme de 30 jours. Tout le reste (quêtes, boss, campagne…) est dans Défis.
  if (state.active && has && show('week')) h += weekBlock(wq);
  void quests; void fx; void info;

  // Rappel de sauvegarde : toutes les deux semaines, tant que rien n'a été exporté.
  if (!state.installed) { state.installed = Date.now(); save(); }
  return h;
}

// ---------- Défis : tout ce qui se joue, rangé par rythme ----------
function viewDefis() {
  const has = state.workouts.length > 0;
  try { checkMonth(); checkDuels(); } catch (e) { /* rien */ }
  const quests = has ? dailyQuests() : [];
  const fx = feats();
  let h = '<div class="col" style="gap:4px"><h1 class="h1">Défis</h1><span class="small mut">Tout ce qui rapporte de l’XP en plus de tes séances, rangé du plus court au plus long.</span></div>';
  if (quests.length) {
    const n = quests.filter((q) => q.done).length;
    h += head('Quêtes du jour', 't-teal', '<span class="small mut">' + n + ' sur ' + quests.length + ' réussie' + (n > 1 ? 's' : '') + '</span>')
      + '<section class="glass card tap tint t-teal" role="button" tabindex="0" data-act="quests" style="padding:4px 16px">' + quests.map(questRow).join('') + '</section>';
  }
  if (has) h += head('Défi de la semaine', 't-red') + bossCard() + duelCard();
  h += head('Ce mois-ci', 't-gold') + (has ? monthChCard() : '') + p30Card() + (has ? testCard() + seasonCard() : '');
  if (has) celebrateSeason();
  h += head('Campagne', 't-violet', '<button type="button" class="small mut row hdrtap" style="gap:4px" data-act="camp-all">Les 6 chapitres' + ICON.chev + '</button>') + campNow();
  h += head('Figures', 't-pink') + dojoView();
  const got = fx.list.filter((f) => f.done).length;
  h += head('Hauts faits', 't-gold') + '<section class="glass card row tap tint t-gold" role="button" tabindex="0" data-act="feats" style="gap:14px"><span class="medal" style="background:linear-gradient(160deg,#F3DFA8,#B8913F);color:#24190A;border:none">' + ICON.medal + '</span><div class="col grow" style="gap:2px"><span class="h2">' + got + ' sur ' + fx.list.length + '</span><span class="small mut">Des exploits durs, gagnés une seule fois. Certains donnent une couleur d’emblème.</span></div>' + ICON.chev + '</section>';
  if (has) h += paliersCard();
  return h;
}

// ---------- Moi : profil, historique, réglages ----------
function viewMoi() {
  const lv = levelInfo(totalXp()), info = rankInfo(), title = myTitle();
  let h = '<section class="glass card row tap" role="button" tabindex="0" data-act="profile" style="gap:14px;align-items:center"><span class="moiemb">' + rankSvg(info.rank.letter, false, null, 'emb') + '</span><div class="col grow" style="gap:4px;min-width:0"><span class="label violet">' + (title ? esc(title) : 'Rang ' + info.rank.letter + ' · ' + esc(info.rank.name)) + '</span><span class="h2">Niveau ' + lv.level + '</span><div class="bar thin"><div style="width:' + Math.round((lv.into / lv.need) * 100) + '%"></div></div><span class="small mut">' + (lv.need - lv.into) + ' XP pour le niveau ' + (lv.level + 1) + '</span></div>' + ICON.chev + '</section>';
  h += '<div class="tiles3">' + [['settings', ICON.gear, 'Réglages'], ['guide', ICON.book, 'Guide'], ['export', ICON.save, 'Sauvegarder']].map(([a, ic, l]) => '<button type="button" class="glass tile3" data-act="' + a + '"><span class="ico">' + ic + '</span><span class="small" style="font-weight:600">' + l + '</span></button>').join('') + '</div>';
  return h + viewHistory();
}

// ---------- Exercices non reconnus ----------
// Un nom venu de Hevy (ou tapé à la main) qui n'est pas dans le catalogue ne compte ni comme pompes ni dans les qualités.
function sheetUnknown() {
  const list = unknownExos();
  const opts = '<option value="">Choisir…</option>' + Object.keys(EXOS).filter((k) => !EXOS[k].old).sort((a, b) => exoName(a).localeCompare(exoName(b), 'fr')).map((k) => '<option value="' + esc(k) + '">' + esc(exoName(k)) + '</option>').join('');
  let h = '<div class="col" style="gap:4px"><span class="label violet">Historique</span><h1 class="h1">Exercices non reconnus</h1><span class="small mut">Ces noms ne sont pas dans le catalogue d’Ascension : leurs séries ne comptent pas dans tes pompes à vie, tes dips ni ton rang. Relie chacun à l’exercice qui correspond, ou laisse-le s’il n’a rien à voir.</span></div>';
  if (!list.length) h += '<section class="glass card"><span class="mut">Tout ton historique est reconnu.</span></section>';
  h += list.map((x, i) => '<section class="glass card col" style="gap:10px"><div class="col" style="gap:2px"><span style="font-weight:700">' + esc(x.name) + '</span><span class="small mut">' + plural(x.sets, 'série', 'séries') + ' · ' + plural(x.n, 'séance', 'séances') + ' · dernière le ' + dateFr(x.last, true) + '</span></div>'
    + '<div class="row" style="gap:8px"><label class="field grow" style="height:48px"><select id="unk-' + i + '" aria-label="Exercice correspondant" style="width:100%;background:none;border:0;color:inherit;font:inherit">' + (guessExo(x.name) ? opts.replace('value="' + esc(guessExo(x.name)) + '"', 'value="' + esc(guessExo(x.name)) + '" selected') : opts) + '</select></label><button type="button" class="pill gold-btn" data-act="unknown-set" data-i="' + i + '" data-name="' + esc(x.name) + '">Relier</button></div></section>').join('');
  sheet(h + closeBtn, 1, 'full');
}

// ---------- Guide de l'app ----------
const GUIDE = [
  ['S’entraîner', [
    ['menu', 'Le bouton rond', 'En bas au milieu de chaque écran. Un toucher ouvre ta séance (un anneau montre où tu en es si elle est commencée). Garde le doigt dessus : un éventail s’ouvre (Course, Progrès, Aujourd’hui, Défis, Menu). Glisse sur un choix et lâche pour y aller, lâche sur le bouton pour annuler.'],
    ['prog', 'Programme guidé', 'Full Body A et B en alternance, la course le dimanche. Chaque exercice a une fourchette de répétitions : quand toutes tes séries touchent le haut, l’app te propose l’étape suivante (lest, variante, descente lente). Rien ne change sans ton accord.'],
    ['plan', 'Plan de la semaine', 'Tes 7 jours remplis par l’app : séances, course du dimanche, repos. Il se refait tout seul si tu rates un jour.'],
    ['settings', 'Choisir son programme', 'Dans les Réglages : programme complet, programme débutant (3 séances faciles au poids du corps) ou sans programme (tes routines sur l’accueil).'],
    ['routines', 'Mes routines', 'Tes listes d’exercices : touche une routine, puis « Modifier les exercices » pour en ajouter ou en retirer. Et la séance libre.'],
    ['quick', 'Pompes du jour', 'Note une série en une touche, n’importe quand, pour viser 100 pompes dans la journée.'],
    ['chrono2', 'Chrono', 'Tabata, EMOM, AMRAP et intervalles, avec voix.'],
    ['cooldown', 'Retour au calme', '6 étirements guidés en 3 minutes.'],
    ['gps', 'Course GPS', 'Distance, allure, lièvre, voix à chaque kilomètre et tracé de la course.'],
  ]],
  ['Défis', [
    ['p30', 'Programmes de 30 jours', 'Un but précis (pompes +50 %, 60 s en équilibre, premier pistol…), 10 à 15 minutes par jour en plus de ta semaine. Test au jour 1, ajustement aux jours 10 et 20, test final au jour 30.'],
    ['camp-all', 'Campagne', '6 chapitres de 5 étapes, chacun fini par une épreuve finale. Chaque étape est une vraie performance, vérifiée dans ton historique. +50 XP par étape, +250 par épreuve finale.'],
    ['', 'Figures', '9 figures (équilibre, corbeau, L-sit, planche…) en étapes, avec un chrono de tenue. Les étapes réussies font monter ta ceinture, de blanche à noire.'],
  ]],
  ['Être guidé', [
    ['checkin', 'Bilan du matin et forme', 'Environ 1 min 30 le matin : heures de sommeil, courbatures, énergie, stress, pouls au repos (le doigt sur la caméra de derrière, 60 s) et test de réaction (20 s). Après 7 matins, tout est comparé à ta propre moyenne, et le score apprend tout seul ce qui annonce tes bonnes séances (fiabilité affichée).'],
    ['forme', 'Charge et ce qui te réussit', 'Ta charge des 8 dernières semaines, la semaine légère conseillée quand il faut, et ce qui te fait mieux performer (heure, repos, sommeil).'],
    ['pain', 'Signaler une douleur', 'Épaules, poignets, genoux… pendant 7 jours, tes séances évitent les exercices qui la sollicitent.'],
    ['coach', 'Coach', 'Écris-lui ta question comme à un ami (« jsuis crevé », « mon record aux dips », « j’ai mal au genou », « j’ai 20 min »). Il lit tes séances, ton bilan du matin et ta balance, dans ton téléphone, sans internet. Point du jour en haut, mot du coach en fin de séance.'],
    ['cap', 'Grand objectif', 'Un but de 12 semaines choisi d’après ton point faible. Ses progrès se calculent depuis tes séances, et la date d’arrivée est estimée.'],
    ['mtest', 'Test du mois', '6 épreuves une fois par mois (pompes, dips, burpees, saut, chaise, course), comparées aux garçons de 16 à 19 ans.'],
    ['', 'Pendant la séance', 'Objectif par série, fantôme de la dernière fois, compteur de pompes à la caméra, et « facile, bien, très dur » pour régler la séance suivante.'],
    ['', 'Voix du coach', 'Dans les réglages, partie Son : elle annonce chaque série à la fin du repos.'],
    ['', 'Notifications', 'Dans les réglages : fin du repos, séance du jour, programme de 30 jours, dimanche si la semaine n’est pas validée, bilan du lundi. Chaque rappel se coupe à part.'],
  ]],
  ['Jouer', [
    ['level', 'Niveaux et XP', '10 XP par série, 50 par séance, 25 par record, plus les quêtes.'],
    ['quests', 'Quêtes du jour', 'Trois défis calés sur tes records, et parfois une quête rare.'],
    ['boss', 'Ton ombre', 'Le défi de la semaine : battre ta propre meilleure tentative. Un nouveau défi chaque lundi.'],
    ['season', 'Saison du mois', '30 paliers, médailles de bronze, d’argent et d’or.'],
    ['flame', 'Flamme et boucliers', 'Semaines d’affilée où ton objectif est atteint ; un bouclier toutes les 4 semaines la protège.'],
    ['lundi', 'Bilan du lundi', 'Ta semaine passée en chiffres et en équivalents parlants, tes records et ceux qui arrivent.'],
    ['feats', 'Hauts faits', 'Des défis durs : +100 XP chacun, certains débloquent une couleur d’emblème.'],
    ['profile', 'Profil', 'Ton niveau, ton rang et la couleur de ton emblème.'],
  ]],
  ['Voir ses progrès', [
    ['rank', 'Rang et 5 qualités', 'Force, explosivité, vitesse, endurance, maîtrise : de E à Z.'],
    ['goal-new', 'Objectifs', 'Fixe un but, l’app te dit quand tu y seras.'],
    ['career', 'Ma carrière', 'Tes compteurs depuis le début.'],
    ['bilans', 'Bilans du mois', 'Ton mois en diapositives, à partager.'],
    ['parcours', 'Mon parcours', 'La frise de tes grands moments.'],
    ['measures', 'Mensurations', 'Bras, taille, cuisses… au mètre ruban.'],
    ['', 'Carte du corps', 'Onglet Progrès : la récupération de chaque muscle.'],
  ]],
  ['Ne rien perdre', [
    ['export', 'Sauvegarder', 'Un fichier avec toutes tes données, à garder dans Fichiers ou iCloud.'],
    ['home-edit', 'Personnaliser l’accueil', 'Choisis les cartes affichées.'],
    ['', 'Fond de l’accueil', 'Réglages, Fond de l’accueil : le stade, la salle, la route, l’emblème, ta flamme, ton rang, ton ombre, ta saison ou ta photo derrière les cartes. Les quatre derniers changent avec tes chiffres.'],
    ['', 'Raccourcis en haut des onglets', 'En haut de Progrès, de Défis et des Réglages : touche un nom pour aller directement à cette partie.'],
  ]],
];
function sheetGuide() {
  let h = '<div class="col" style="gap:4px"><span class="label violet">Guide</span><h1 class="h1">Tout ce que fait Ascension</h1><span class="small mut">Touche une ligne pour l’ouvrir. Tout marche sans internet, et tes données restent dans ton téléphone.</span></div>';
  for (const [title, items] of GUIDE) {
    h += '<span class="label">' + title + '</span><div class="list">' + items.map(([act, name, txt]) => '<' + (act ? 'button type="button" data-act="' + act + '"' : 'div') + ' class="item"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + name + '</span><span class="small mut">' + txt + '</span></div>' + (act ? ICON.chev : '') + '</' + (act ? 'button' : 'div') + '>').join('') + '</div>';
  }
  sheet(h + closeBtn, 1, 'full');
}

// ---------- Personnaliser l'accueil ----------
const HOME_CARDS = [['forme', 'Ta forme du jour'], ['coach', 'Coach'], ['prog', 'Tes progrès'], ['week', 'Ta semaine'], ['p30', 'Programme de 30 jours']];
function show(k) { return !(state.settings.hide || {})[k]; }
// Ordre des cartes sous la séance du jour (réglable, flèches dans « Personnaliser »).
function homeOrder() { const o = (state.settings.homeOrder || []).filter((k) => HOME_CARDS.some(([x]) => x === k)); return o.concat(HOME_CARDS.map(([k]) => k).filter((k) => !o.includes(k))); }
function sheetHomeEdit() {
  const O = homeOrder(), lab = Object.fromEntries(HOME_CARDS);
  const h = '<div class="col" style="gap:4px"><span class="label violet">Accueil</span><h1 class="h1">Personnaliser</h1><span class="small mut">Choisis les cartes affichées sur l’accueil et leur ordre avec les flèches. La séance du programme reste toujours en haut. Tout reste accessible ailleurs.</span></div>'
    + '<section class="glass card" style="padding:4px 16px">' + O.map((k, i) => '<div class="row" style="gap:6px;border-bottom:1px solid var(--line)"><button type="button" class="row between grow" data-act="home-toggle" data-k="' + k + '" style="padding:14px 0;border:0;background:none;color:inherit;font:inherit;min-width:0"><span style="font-weight:600;text-align:left">' + lab[k] + '</span><span class="switch' + (show(k) ? ' on' : '') + '"><i></i></span></button>'
      + '<button type="button" class="iconbtn" data-act="home-move" data-k="' + k + '" data-d="-1" aria-label="Monter"' + (i ? '' : ' disabled') + '>' + ICON.up + '</button><button type="button" class="iconbtn" data-act="home-move" data-k="' + k + '" data-d="1" aria-label="Descendre"' + (i < O.length - 1 ? '' : ' disabled') + '>' + ICON.down + '</button></div>').join('') + '</section>';
  sheet(h + closeBtn);
}

// ---------- Détails : niveau, semaine, quêtes ----------
function sheetLevel() {
  const xp = totalXp();
  const lv = levelInfo(xp);
  const info = rankInfo();
  const b = xpBreakdown();
  const line = (label, detail, value) => '<div class="item"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + label + '</span><span class="small mut">' + detail + '</span></div><span class="gold-text" style="font-weight:600;white-space:nowrap">' + value.toLocaleString('fr-FR') + ' XP</span></div>';
  sheet('<div class="row" style="gap:14px">' + rankSvg(info.rank.letter) + '<div class="col grow"><span class="label" style="color:var(--gold)">Rang ' + info.rank.letter + ' · ' + esc(info.rank.name.toUpperCase()) + '</span><span class="big">Niveau ' + lv.level + '</span><span class="small mut">' + xp.toLocaleString('fr-FR') + ' XP gagnés en tout</span></div></div>'
    + '<div class="col" style="gap:8px"><div class="bar"><div style="width:' + Math.round((lv.into / lv.need) * 100) + '%"></div></div><span class="small mut">' + lv.into + ' sur ' + lv.need + ' XP pour atteindre le niveau ' + (lv.level + 1) + '. Chaque niveau demande 50 XP de plus que le précédent.</span></div>'
    + '<button type="button" class="pill glass wide" data-act="rank">Voir mon rang et les épreuves</button>'
    + '<span class="label">D’où vient ton XP</span><div class="list">'
    + line('Séries validées', b.sets.toLocaleString('fr-FR') + ' séries × 10 XP', b.sets * 10)
    + line('Séances terminées', b.sessions + ' séances × 50 XP', b.sessions * 50)
    + line('Course à pied', fr(b.km, 1) + ' km × 20 XP', Math.round(b.km * 20))
    + line('Records battus', b.prs + ' × 25 XP', b.prs * 25)
    + line('Quêtes du jour', plural(b.quests, 'quête réussie', 'quêtes réussies'), b.questXp)
    + line('Ombres battues', state.workouts.filter((w) => w.boss && w.boss.win).length + ' × 300 XP', state.workouts.filter((w) => w.boss && w.boss.win).length * 300)
    + line('Hauts faits', Object.keys(state.feats || {}).length + ' × 100 XP', Object.keys(state.feats || {}).length * 100) + '</div>'
    + '<span class="small mut">Le niveau monte avec l’XP. Le rang, lui, vient de tes 5 qualités.</span>' + closeBtn);
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
  let h = '<div class="col"><span class="label">Changent chaque jour à minuit</span><h1 class="h1">Quêtes du jour</h1></div>'
    + '<section class="glass card" style="padding:4px 16px">' + dailyQuests().map(questRow).join('') + '</section>'
    + '<div class="col" style="gap:8px">' + dailyQuests().map((q) => '<div class="row" style="align-items:flex-start;gap:10px"><span class="errdot"></span><span class="small mut"><b style="color:var(--soft)">' + esc(q.label) + '</b> · ' + esc(q.hint) + '</span></div>').join('') + '</div>'
    + '<span class="small mut">Trois défis par jour, calés sur tes records : un de volume, un de record, un pendant la séance. Environ un jour sur quatre, une quête rare rapporte beaucoup plus. Ce qui se fait tout seul (faire ta séance) n’est plus une quête.</span>';
  sheet(h + closeBtn);
}

// La flamme : semaines d'affilée où l'objectif de séances est atteint.
function sheetFlame() {
  const st = streak();
  const days = weekDays();
  const msg = st.weekDone ? 'Objectif de la semaine atteint : la flamme a grandi.'
    : st.using ? 'Cette semaine ne peut plus être finie : un bouclier va sauver ta flamme.'
      : st.lost ? (st.n ? 'Cette semaine ne peut plus être finie : la flamme repartira de zéro lundi.' : 'La semaine prochaine, vise ' + plural(st.goal, 'séance', 'séances') + ' pour l’allumer.')
        : 'Encore ' + plural(st.need, 'séance', 'séances') + ' cette semaine, il reste ' + plural(st.left, 'jour', 'jours') + '.' + (st.danger ? ' C’est serré.' : '');
  let h = '<div class="col center" style="gap:8px"><span class="flame-big">' + ICON.flame + '</span><span class="big">' + plural(st.n, 'semaine', 'semaines') + '</span>'
    + '<span class="small mut" style="text-align:center">' + msg + '</span></div>'
    + '<section class="glass card col" style="gap:12px"><div class="row between"><span class="label violet">Cette semaine</span><span class="small mut">' + Math.min(st.cur, st.goal) + ' sur ' + st.goal + '</span></div><div class="week">' + days.map((d) => '<div class="day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') + '"><span class="dot">' + (d.done ? checkDark : '') + '</span><span class="small">' + d.letter + '</span></div>').join('') + '</div></section>'
    + '<div class="stats3 glass card"><div><span class="num" style="font-size:22px">' + st.n + '</span><span class="small mut">en cours</span></div><div><span class="num" style="font-size:22px">' + st.best + '</span><span class="small mut">record</span></div><div><span class="num" style="font-size:22px">' + st.goal + '</span><span class="small mut">séances / sem.</span></div></div>'
    + '<section class="glass card col" style="gap:10px"><div class="row between"><span class="label violet">Boucliers</span><span class="small mut">' + st.shields + ' sur ' + SHIELD_MAX + '</span></div>'
    + '<div class="row" style="gap:10px">' + Array.from({ length: SHIELD_MAX }, (_, i) => '<span class="shieldslot' + (i < st.shields ? ' on' : '') + '">' + ICON.shield + '</span>').join('') + '</div>'
    + '<span class="small mut">' + (st.shields >= SHIELD_MAX ? 'Réserve pleine. Un bouclier sauve tout seul une semaine ratée.' : 'Prochain bouclier dans ' + plural(st.next, 'semaine', 'semaines') + ' réussie' + (st.next > 1 ? 's' : '') + '.') + '</span>'
    + (st.saved ? '<span class="small" style="color:var(--violet2, #B6A4FF)">Tes boucliers ont déjà sauvé ' + plural(st.saved, 'semaine', 'semaines') + ' de cette flamme.</span>' : '') + '</section>'
    + '<span class="small mut">Une semaine compte quand tu fais ton objectif (' + plural(st.goal, 'séance', 'séances') + ', réglable dans les Réglages). Séances, courses et re-tests comptent ; ton ombre et les pompes du jour non. La semaine en cours ne casse jamais ta flamme avant dimanche soir. Toutes les ' + SHIELD_EVERY + ' semaines réussies, tu gagnes un bouclier (2 au plus). Hauts faits : 4 semaines, puis 12.</span>';
  sheet(h + closeBtn);
}

// Hauts faits : la liste, groupée, avec la récompense de chacun.
function sheetFeats() {
  const fx = feats();
  const got = fx.list.filter((f) => f.done).length;
  let h = '<div class="col"><span class="label" style="color:var(--gold)">' + got + ' sur ' + fx.list.length + ' · +100 XP chacun</span><h1 class="h1">Hauts faits</h1><span class="small mut">Des défis durs, qui se gagnent une seule fois. Certains donnent aussi une couleur d’emblème.</span></div>';
  const groups = [...new Set(fx.list.map((f) => f.group))];
  for (const g of groups) {
    h += '<span class="label">' + esc(g) + '</span><section class="glass card" style="padding:2px 16px">';
    for (const f of fx.list.filter((x) => x.group === g)) {
      const rw = f.reward.skin ? '+100 XP et la couleur ' + SKINS[f.reward.skin].name : '+100 XP';
      h += '<div class="feat' + (f.done ? ' done' : '') + '"><span class="medal">' + (f.done ? ICON.medal : ICON.lock) + '</span><div class="col grow" style="gap:3px"><span style="font-weight:600">' + esc(f.label) + '</span>'
        + (f.done ? '<span class="small" style="color:var(--gold)">' + esc(rw) + ' · réussi le ' + new Date(f.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + '</span>' : '<div class="bar thin gold" style="margin-top:4px"><div style="width:' + Math.round((f.cur / f.goal) * 100) + '%"></div></div><span class="small dim">' + f.cur + ' sur ' + f.goal + ' · ' + esc(rw) + '</span>') + '</div></div>';
    }
    h += '</section>';
  }
  h += '<button type="button" class="pill glass wide" data-act="profile">Choisir la couleur de mon emblème</button>';
  sheet(h + closeBtn, 1, 'full');
}

// Profil : niveau, rang, couleur de l'emblème, liens vers la carrière et les bilans.
function sheetProfile() {
  const info = rankInfo();
  const ks = skins(), lv = levelInfo(totalXp());
  const ck = ks.includes(state.settings.skin) ? state.settings.skin : 'or';
  let h = '<div class="col center" style="gap:8px">' + rankSvg(info.rank.letter, false, null, 'emblem-sm') + '<h1 class="h1">Profil</h1><span class="small mut">Rang ' + info.rank.letter + ' · ' + esc(info.rank.name) + ' · niveau ' + lv.level + '</span><span class="small mut">' + (lv.need - lv.into) + ' XP pour le niveau ' + (lv.level + 1) + '</span></div>'
    + '<span class="label">Couleur de l’emblème</span><div class="skins">'
    + Object.keys(SKINS).map((k) => { const on = ks.includes(k); return '<button type="button" class="skin' + (k === ck ? ' on' : '') + (on ? '' : ' lock') + '" data-act="' + (on ? 'set-skin' : 'feats') + '" data-k="' + k + '">' + rankSvg(info.rank.letter, false, SKINS[k], 'x') + esc(SKINS[k].name) + '</button>'; }).join('')
    + '</div><span class="small mut">Les couleurs grisées se gagnent avec les hauts faits et la saison (palier 15).</span>'
    ;
  h += '<div class="row"><button type="button" class="pill glass grow" data-act="career">Ma carrière</button><button type="button" class="pill glass grow" data-act="bilans">Bilans du mois</button></div><button type="button" class="pill glass wide" data-act="parcours">Mon parcours</button>';
  sheet(h + closeBtn);
}

// ---------- Historique ----------
function summary(w) {
  const r = w.exercises.find((e) => e.name === 'Running');
  if (r && w.exercises.length === 1) { const s = r.sets[0] || {}; return fr(s.d || 0) + ' km · ' + dur(s.t || 0); }
  const sets = w.exercises.reduce((k, e) => k + e.sets.length, 0);
  // Durée arrondie à la minute dans les listes (les secondes n'aident pas à relire une séance).
  const sec = (w.end - w.start) / 1000;
  return plural(w.exercises.length, 'exercice', 'exercices') + ' · ' + plural(sets, 'série', 'séries') + (sec > 0 ? ' · ' + (sec >= 3600 ? dur(sec - (sec % 60)) : sec >= 60 ? Math.round(sec / 60) + ' min' : dur(sec)) : '');
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
    h += '<button type="button" class="item" data-act="detail" data-id="' + esc(w.id) + '"><span class="ico' + (run ? ' gold' : '') + '">' + (run ? ICON.run : ICON.bell) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(titleOf(w)) + (w.prs ? ' <span class="gold-text small">· ' + plural(w.prs, 'record', 'records') + '</span>' : '') + '</span><span class="small mut">' + esc(summary(w)).replace(/(\d) (min|h|km|s)\b/g, '$1 $2').replace(/(min|h) (\d)/g, '$1 $2') + '</span></div>'
      + (w.grade ? '<span class="gradechip g' + w.grade + '">' + w.grade + '</span>' : '') + '<span class="small mut" style="white-space:nowrap">' + new Date(w.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) + '</span></button>';
  }
  h += '</section>';
  if (shown.length > ui.historyLimit) h += '<button type="button" class="pill glass wide" data-act="more">Voir plus</button>';
  return h;
}

function viewHistory() {
  const all = sorted();
  let h = '<div class="col" style="gap:2px"><span class="small mut">' + plural(all.length, 'séance enregistrée', 'séances enregistrées') + '</span><h1 class="h1">Historique</h1></div>';
  if (all.length) h += hint('historique', 'Touche une séance pour la revoir. En bas de la séance : « Modifier » (répétitions, kilos, exercices, date) ou « Supprimer ».');
  if (!all.length) return h + '<section class="glass card col" style="gap:12px"><span class="mut">Aucune séance pour le moment.</span><button type="button" class="pill gold-btn wide" data-act="pick-hevy">Importer depuis Hevy</button></section>';

  // Calendrier de régularité : 18 semaines, une colonne par semaine.
  const cols = heat(18);
  const active = cols.reduce((n, c) => n + c.filter((d) => d.n).length, 0);
  h += '<section class="glass card hud col tint t-gold" style="gap:12px"><div class="row between"><span class="h2">Régularité</span><span class="small mut">' + plural(active, 'jour actif', 'jours actifs') + ' sur 18 semaines</span></div>'
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
      + esc(e.name === 'Running' ? e.sets.map((s) => setText(s) + ' · ' + pace(s.d, s.t)).join(', ') : e.sets.map((s) => setText(s, e.name)).join(', ')) + '</span>' + (e.note ? '<span class="small" style="color:var(--gold)">Note : ' + esc(e.note) + '</span>' : '') + '</div>' + ICON.chev + '</button>').join('') + '</div>'
    + (w.path && w.path.length > 1 ? '<section class="glass card col" style="gap:8px"><span class="label violet">Ton tracé</span>' + routeSvg(w.path) + '<span class="small dim">Départ en vert, arrivée en or. Le tracé reste dans ton téléphone.</span></section>' : '')
    + (w.splits && w.splits.length ? '<section class="glass card col" style="gap:6px"><span class="label violet">Temps par kilomètre (GPS)</span>' + w.splits.map((x, i) => { const b = Math.min(...w.splits); return '<div class="row between small"><span class="mut">Km ' + (i + 1) + '</span><span class="num"' + (x === b && w.splits.length > 1 ? ' style="color:var(--vert)"' : '') + '>' + Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0') + '</span></div>'; }).join('') + '</section>' : '')
    + '<div class="col" style="gap:8px"><span class="label">Ressenti</span><div class="row" id="feel-row">' + feelPills(w) + '</div></div>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="share" data-id="' + esc(w.id) + '">' + ICON.share + 'Partager</button>'
    + '<button type="button" class="pill glass grow" data-act="copy" data-id="' + esc(w.id) + '" style="color:var(--gold)">' + ICON.copy + 'Pour Claude</button></div>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="edit-workout" data-id="' + esc(w.id) + '">Modifier</button><button type="button" class="pill glass grow" data-act="delete" data-id="' + esc(w.id) + '" style="color:var(--mut)">Supprimer</button></div>' + closeBtn);
}

// Tes progrès sur l'accueil (v61) : ce qui a monté en un mois, au même lest, et ton dernier record.
function progressCard() {
  const DAYMS = 864e5, now = Date.now(), ws = sorted();
  const recent = ws.filter((w) => now - w.start < 14 * DAYMS), old = ws.filter((w) => now - w.start >= 28 * DAYMS && now - w.start < 70 * DAYMS);
  const val = (s) => s.r || s.t || 0;
  const best = (list, name, kg) => Math.max(0, ...list.flatMap((w) => w.exercises.filter((e) => e.name === name).flatMap((e) => e.sets.filter((s) => (s.w || 0) === kg).map(val))));
  const seen = new Set(), gains = [];
  for (const w of recent) for (const e of w.exercises) {
    if (e.name === 'Running' || seen.has(e.name) || !e.sets.length) continue;
    seen.add(e.name);
    const kg = e.sets[0].w || 0, r1 = best(recent, e.name, kg), r0 = best(old, e.name, kg);
    if (r0 && r1 > r0) gains.push({ name: e.name, kg: isBand(e.name) ? 0 : kg, r0, r1, t: !e.sets[0].r && !!e.sets[0].t, p: (r1 - r0) / r0 });
  }
  gains.sort((a, b) => b.p - a.p);
  let rec = null;
  for (const w of ws) { if (now - w.start > 30 * DAYMS) break; for (const e of w.exercises) { const s = e.sets.find((x) => x.pr); if (s && e.name !== 'Running') { rec = { w, e, s }; break; } } if (rec) break; }
  if (!gains.length && !rec) return '';
  const u = (g, v) => (g.t ? dur(v) : v + ' rép.');
  return '<section class="glass card col tap progcard" role="button" tabindex="0" data-tab="progress" style="gap:10px"><div class="row between"><span class="label" style="color:var(--gold)">Tes progrès · en un mois</span>' + ICON.chev + '</div>'
    + gains.slice(0, 3).map((g) => '<div class="row between" style="gap:10px"><span style="font-weight:600;min-width:0">' + esc(exoName(g.name)) + (g.kg ? ' <span class="small mut">' + String(g.kg).replace('.', ',') + ' kg</span>' : '') + '</span><span class="num gold-text" style="font-size:17px;white-space:nowrap">' + u(g, g.r0) + ' → ' + u(g, g.r1) + '</span></div>').join('')
    + (rec ? '<span class="small mut">Dernier record : ' + esc(exoName(rec.e.name)) + ', ' + esc(setText(rec.s, rec.e.name)) + ' · ' + (() => { const d = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(rec.w.start).setHours(0, 0, 0, 0)) / DAYMS); return d === 0 ? 'aujourd’hui' : d === 1 ? 'hier' : 'il y a ' + d + ' jours'; })() + '</span>' : '')
    + '</section>';
}

// Séance du jour faite : l'accueil montre ce que tu as fait, la suivante en petit (v61).
function doneCard(w) {
  const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0), reps = w.exercises.reduce((n, e) => n + e.sets.reduce((m, s) => m + (s.r || 0), 0), 0);
  let nx = null; try { nx = nextInfo(); } catch (e) { /* rien */ }
  return '<section class="glass card col donecard tap" role="button" tabindex="0" data-act="detail" data-id="' + esc(w.id) + '">'
    + '<div class="row" style="gap:14px;align-items:center"><span class="donering">' + ICON.check + '</span><div class="col grow" style="gap:3px;min-width:0"><span class="label" style="color:var(--vert)">Séance faite aujourd’hui</span><span class="h1" style="font-size:28px">' + esc(titleOf(w)) + '</span></div>'
    + (w.grade ? '<span class="grade sm g' + w.grade + '">' + w.grade + '</span>' : '') + '</div>'
    + '<div class="stats3 donestats"><div><span class="num">' + ((w.end - w.start) >= 60e3 ? Math.round((w.end - w.start) / 60e3) + ' min' : dur((w.end - w.start) / 1000)) + '</span><span class="small mut">durée</span></div><div><span class="num">' + sets + '</span><span class="small mut">séries</span></div><div><span class="num">' + reps + '</span><span class="small mut">répétitions</span></div></div>'
    + (w.prs ? '<span class="small gold-text" style="font-weight:600">' + plural(w.prs, 'record battu', 'records battus') + ' aujourd’hui</span>' : '')
    + '<div class="row between" style="gap:10px"><span class="small mut">' + (nx ? 'Prochaine : ' + esc(nx.title) + ' · environ ' + nx.min + ' min' : '') + '</span><span class="small" style="color:var(--violet-soft);font-weight:600;white-space:nowrap">Voir le bilan</span></div>'
    + '</section>';
}

// ---------- Course (une fenêtre, plus un onglet) ----------
function sheetRun() {
  const rs = runs();
  const todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  let h = '<div class="col"><span class="label">' + plural(rs.length, 'course', 'courses') + '</span><h1 class="h1">Course à pied</h1></div>';
  h += '<button type="button" class="pill gold-btn wide big" data-act="gps">' + ICON.run + 'Courir avec le GPS</button>'
    + '<span class="small mut" style="text-align:center;margin-top:-6px">Chrono, distance, un lièvre à battre et une voix à chaque kilomètre.</span>';
  h += '<div class="exo"><span class="label violet">Ou noter une course déjà faite (tapis, sans GPS)</span>'
    + '<div class="row"><label class="field grow" style="height:52px"><input id="run-d" inputmode="decimal" placeholder="0" aria-label="Distance en kilomètres"><span class="unit">km</span></label>'
    + '<label class="field grow" style="height:52px"><input id="run-m" inputmode="numeric" placeholder="0" aria-label="Minutes"><span class="unit">min</span></label>'
    + '<label class="field grow" style="height:52px"><input id="run-s" inputmode="numeric" placeholder="0" aria-label="Secondes"><span class="unit">s</span></label></div>'
    + '<label class="row" style="gap:10px"><span class="small mut">Jour</span><input class="textin grow" type="date" id="run-date" value="' + todayIso + '" max="' + todayIso + '" style="height:46px"></label>'
    + '<button type="button" class="pill glass wide" data-act="add-run" style="color:var(--violet-soft)">Enregistrer cette course</button></div>';
  if (rs.length) {
    const longest = rs.reduce((a, b) => (b.d > a.d ? b : a));
    const timed = rs.filter((x) => x.d >= 3 && x.t > 0);
    const fastest = timed.length ? timed.reduce((a, b) => (b.t / b.d < a.t / a.d ? b : a)) : null;
    h += '<div class="row" style="align-items:stretch"><button type="button" class="exo grow" style="text-align:left" data-act="detail" data-id="' + esc(longest.id) + '"><span class="label">Plus longue</span><span class="h2 gold-text">' + fr(longest.d) + ' km</span><span class="small mut">' + dateFr(longest.date, true) + '</span></button>'
      + (fastest ? '<button type="button" class="exo grow" style="text-align:left" data-act="detail" data-id="' + esc(fastest.id) + '"><span class="label">Meilleure allure</span><span class="h2 gold-text">' + pace(fastest.d, fastest.t) + '</span><span class="small mut">' + fr(fastest.d) + ' km · ' + dateFr(fastest.date, true) + '</span></button>' : '') + '</div>';
    const RR = runRecords();
    const rec = (v, k) => '<div><span class="num ' + (v ? 'gold-text' : 'dim') + '" style="font-size:' + (v ? 20 : 15) + 'px">' + (v ? fmtTime(v) : 'pas encore') + '</span><span class="small mut">' + k + '</span></div>';
    h += '<div class="exo"><span class="label">Tes records</span><div class="stats3">' + rec(RR.km1, '1 km') + rec(RR.km5, '5 km') + rec(RR.km10, '10 km') + '</div>'
      + (RR.p10 ? '<span class="small mut">Prévision d’après ta meilleure course : 5 km en ' + fmtTime(RR.p5) + ', 10 km en ' + fmtTime(RR.p10) + ', semi-marathon en ' + fmtTime(RR.p21) + '.</span>' : '') + '</div>';
    const ra = routesAll();
    if (ra) h += '<div class="exo"><span class="label">Tous tes parcours, ramenés au même départ</span>' + ra + '</div>';
    if (rs.length >= 2) h += '<div class="exo"><span class="label">Distance de tes dernières courses</span>' + chartSvg(rs.slice(0, 16).reverse().map((x) => x.d), ' km') + '</div>';
    h += '<span class="label">Dernières courses</span><div class="list">' + rs.slice(0, 15).map((x) => '<button type="button" class="item" data-act="detail" data-id="' + esc(x.id) + '"><span class="ico gold">' + ICON.run + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + fr(x.d) + ' km</span><span class="small mut">' + dur(x.t) + ' · ' + pace(x.d, x.t) + '</span></div><span class="small mut">' + dateFr(x.date) + '</span></button>').join('') + '</div>';
  }
  sheet(h + closeBtn);
}

// ---------- Réglages et fichiers ----------
// Réglages : rangés comme ceux de l'iPhone. Une ligne = un réglage ; les choix à plusieurs valeurs
// s'ouvrent dans une petite fenêtre par-dessus (ui.sub), les oui/non se basculent sur place.
const srow = (act, ic, t, v, extra) => '<button type="button" class="srow" data-act="' + act + '"' + (extra || '') + '><span class="mico">' + (ICON[ic] || '') + '</span><span class="grow mt">' + t + '</span>' + (v !== undefined ? '<span class="sv">' + v + '</span>' : '') + ICON.chev + '</button>';
const stog = (act, ic, t, on, sub) => '<button type="button" class="srow" data-act="' + act + '" role="switch" aria-checked="' + !!on + '"><span class="mico">' + (ICON[ic] || '') + '</span><span class="col grow" style="gap:1px;min-width:0"><span class="mt">' + t + '</span>' + (sub ? '<span class="small mut">' + sub + '</span>' : '') + '</span><span class="sw' + (on ? ' on' : '') + '"><i></i></span></button>';
const sgroup = (t, rows, note) => '<div class="sgroup"' + (t ? ' id="sg-' + norm(t).replace(/[^a-z]/g, '') + '"' : '') + '>' + (t ? '<span class="label">' + t + '</span>' : '') + '<div class="slist">' + rows.join('') + '</div>' + (note ? '<span class="small mut note">' + note + '</span>' : '') + '</div>';

function sheetSettings() {
  const rest = state.settings.rest || 90;
  const kg = bodyLog().length ? fr(bodyLog()[0].kg, 1) + ' kg' : 'à noter';
  const unk = unknownExos().length;
  let h = '<h1 class="h1">Réglages</h1>';
  h += '<nav class="secnav insheet" aria-label="Parties des réglages">' + ['Entraînement', 'Son et voix', 'Notifications', 'Profil', 'Données', 'À propos'].map((t) => '<button type="button" class="secchip" data-sec="sg-' + norm(t).replace(/[^a-z]/g, '') + '">' + t + '</button>').join('') + '</nav>';
  h += sgroup('Entraînement', [
    srow('set-sub', 'dumbbell', 'Façon de t’entraîner', esc({ full: 'Programme complet', debutant: 'Débutant', libre: 'Sans programme' }[modeNow()]), ' data-k="mode"'),
    srow('set-sub', 'calendar', 'Objectif par semaine', plural(weekGoal(), 'séance', 'séances'), ' data-k="goal"'),
    srow('set-sub', 'timer', 'Repos par défaut', clock(rest), ' data-k="rest"'),
    srow('home-edit', 'home', 'Cartes de l’accueil'),
    srow('set-sub', 'star', 'Fond de l’accueil', esc((FONDS.find((f) => f[0] === (state.settings.bg || '')) || FONDS[0])[1]), ' data-k="bg"'),
    stog('toggle-textbig', 'book', 'Texte plus grand', !!state.settings.textBig, 'Tous les textes un peu plus gros'),
    stog('toggle-light', 'star', 'Mode clair', !!state.settings.light, 'Fond clair, pratique en plein soleil'),
    ...(navigator.vibrate ? [stog('toggle-haptics', 'bell', 'Vibrations', state.settings.haptics !== false, 'Une petite vibration à chaque série validée et à chaque record')] : []),
    stog('toggle-zen', 'dumbbell', 'Séance épurée', !!state.settings.zen, 'Cache l’XP et le fantôme pendant la séance : juste tes séries'),
  ]);
  h += sgroup('Son et voix', [
    stog('toggle-sound', 'sound', 'Bip de fin de repos', state.settings.sound !== false),
    stog('toggle-silent', 'sound', 'Bip discret', state.settings.soundSilent === false, 'Garde ta musique, mais ne sonne plus en mode silencieux'),
    stog('toggle-voice', 'voice', 'Voix du coach', !!state.settings.voiceCoach, 'Annonce la série suivante à la fin du repos'),
    srow('test-sound', 'sound', 'Tester le son'),
  ]);
  h += sgroup('Notifications', pushOn()
    ? [stog('notif-off', 'notif', 'Notifications', true), srow('set-sub', 'clock', 'Heure des rappels', notifHour() + ' h', ' data-k="notif"'), srow('notif-test', 'notif', 'Envoyer une notification d’essai')]
    : [srow('notif-on', 'notif', 'Activer les notifications')],
    pushOn() ? 'Choisis l’heure et les rappels que tu veux recevoir dans « Heure des rappels ».' : 'Sur iPhone, ouvre Ascension depuis son icône de l’écran d’accueil pour pouvoir les activer.');
  h += sgroup('Profil', [
    '<label class="srow"><span class="mico">' + ICON.user + '</span><span class="grow mt">Âge</span><input id="set-age" class="sin" inputmode="numeric" placeholder="—" aria-label="Ton âge" value="' + (state.settings.age || '') + '"><span class="sv">ans</span></label>',
    srow('body', 'scale', 'Poids', kg),
    srow('profile', 'medal', 'Niveau, rang et emblème'),
  ], 'Ton âge et ton poids ajustent les lettres de tes 5 qualités : 20 pompes ne valent pas la même chose à 55 kg et à 90 kg.');
  h += sgroup('Données', [
    srow('export', 'save', 'Sauvegarder mes données'),
    srow('pick-backup', 'save', 'Restaurer une sauvegarde'),
    srow('transfer', 'up', 'Changer de téléphone'),
    srow('export-csv', 'stack', 'Exporter en tableau', 'Excel'),
    srow('pick-hevy', 'stack', 'Importer mon historique Hevy', state.workouts.some(isHevy) ? state.workouts.filter(isHevy).length + ' séances' : undefined),
  ].concat(liveTrash().length ? [srow('trash', 'x', 'Corbeille', String(liveTrash().length))] : []).concat(unk ? [srow('unknown', 'target', 'Exercices non reconnus', String(unk))] : []),
    'Tes données restent sur ce téléphone. Sauvegarde-les de temps en temps dans Fichiers pour ne rien perdre.' + (state.workouts.some(isHevy) ? '' : ' Pour Hevy : dans Hevy, Profil, Réglages, Exporter les données, puis choisis workouts.csv ici.'));
  h += sgroup('À propos', [
    srow('guide', 'book', 'Guide de l’app'),
    srow('welcome', 'star', 'Revoir la présentation'),
    srow('news', 'star', 'Nouveautés'),
    srow('update', 'up', 'Mettre à jour', 'version ' + VERSION),
  ]);
  sheet(h + closeBtn);
  if (ui.sub && $('sheet2').firstElementChild) sheetSub(ui.sub);
}

// Les petites fenêtres de choix des réglages.
function sheetSub(k) {
  ui.sub = k;
  const pick = (act, attr, list, cur, fmt) => '<div class="slist">' + list.map((v) => '<button type="button" class="srow" data-act="' + act + '" ' + attr + '="' + v[0] + '"><span class="col grow" style="gap:1px"><span class="mt">' + v[1] + '</span>' + (v[2] ? '<span class="small mut">' + v[2] + '</span>' : '') + '</span>' + (String(v[0]) === String(cur) ? '<span class="tick">' + ICON.check + '</span>' : '') + '</button>').join('') + '</div>';
  let h = '';
  if (k === 'mode') h = '<h1 class="h1">Façon de t’entraîner</h1>' + pick('set-mode', 'data-m', MODES, modeNow()).replace(/data-act="set-mode"/g, 'data-act="set-mode" data-from="settings"');
  if (k === 'goal') h = '<h1 class="h1">Objectif par semaine</h1>' + pick('set-goal', 'data-n', [2, 3, 4, 5, 6].map((n) => [n, plural(n, 'séance', 'séances'), n === 5 ? '4 séances + la course du dimanche' : '']), weekGoal()) + '<span class="small mut">La course compte. Atteindre ton objectif valide ta semaine : ta flamme continue (+150 XP).</span>';
  if (k === 'rest') h = '<h1 class="h1">Repos par défaut</h1>' + pick('set-rest', 'data-s', [60, 90, 120, 150, 180].map((x) => [x, clock(x), x === 90 ? 'Le plus courant' : x >= 150 ? 'Pour la force, avec lest' : '']), rest0()) + '<span class="small mut">Tu peux aussi régler un repos différent pour chaque exercice pendant la séance (bouton ⋯).</span>';
  if (k === 'notif') {
    const off = state.settings.notifOff || {};
    h = '<h1 class="h1">Rappels</h1><div class="slist"><div class="srow"><span class="mico">' + ICON.clock + '</span><span class="grow mt">Heure</span><button type="button" class="stepbtn sm" data-act="notif-hour" data-d="-1" aria-label="Plus tôt">' + ICON.minus + '</button><span class="num" style="font-size:24px;min-width:56px;text-align:center">' + notifHour() + ' h</span><button type="button" class="stepbtn sm" data-act="notif-hour" data-d="1" aria-label="Plus tard">' + ICON.plus + '</button></div></div>'
      + '<div class="slist">' + NKINDS.map(([kk, t, d]) => stog('notif-kind', 'notif', t, !off[kk], d).replace('data-act="notif-kind"', 'data-act="notif-kind" data-k="' + kk + '"')).join('') + '</div>';
  }
  if (k === 'bg') {
    const cur = state.settings.bg || '';
    h = '<h1 class="h1">Fond de l’accueil</h1><span class="small mut">Une image derrière l’accueil, les cartes deviennent transparentes. Seulement sur l’accueil, pas en mode clair.</span>'
      + '<div class="bggrid">' + FONDS.map(([kk, t]) => '<button type="button" class="bgopt' + (kk === cur ? ' on' : '') + '" data-act="set-bg" data-k="' + kk + '" aria-pressed="' + (kk === cur) + '">' + bgThumb(kk) + '<span class="bgname">' + t + '</span></button>').join('') + '</div>'
      + (cur === 'photo' ? '<button type="button" class="pill glass wide" data-act="set-bg" data-k="photo" data-new="1">Choisir une autre photo</button>' : '')
      + (state.settings.light ? '<span class="small" style="color:var(--violet-soft)">Tu es en mode clair : le fond ne s’affiche pas. Coupe le mode clair pour le voir.</span>' : '');
  }
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close2">OK</button>', 2);
}
const rest0 = () => state.settings.rest || 90;

// Liste des nouveautés de la version : montrée une fois après chaque mise à jour, et depuis les réglages.
// Les nouveautés depuis la dernière version vue (toutes, si plusieurs mises à jour d'un coup).
function sheetNews(from) {
  const list = NEWS.filter((n) => typeof from === 'number' && n.v > from);
  const show = list.length ? list : [NEWS[0]];
  const check = '<span class="qmark done"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#D8BD82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  const n = show.reduce((k, x) => k + x.items.length, 0);
  let h = '<div class="col"><span class="label violet">' + (show.length > 1 ? 'Versions ' + show[show.length - 1].v + ' à ' + show[0].v + ' · ' + n + ' nouveautés' : 'Version ' + show[0].v) + '</span><h1 class="h1">' + (show.length > 2 ? 'Grosse mise à jour' : 'Nouveautés') + '</h1></div>';
  for (const x of show) {
    if (show.length > 1) h += '<span class="label">Version ' + x.v + '</span>';
    h += '<div class="list">' + x.items.map((t) => '<div class="item">' + check + '<span class="grow">' + esc(t) + '</span></div>').join('') + '</div>';
  }
  sheet(h + closeBtn, 1, show.length > 2 ? 'full' : '');
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

// ---------- Corbeille (30 jours) ----------
function liveTrash() {
  const L = (state.trash || []).filter((x) => x && x.w && Date.now() - x.at < 30 * 864e5);
  if (L.length !== (state.trash || []).length) { state.trash = L; save(); }
  return L;
}
function restoreTrash(id) {
  const t = liveTrash().find((x) => x.w.id === id); if (!t) return;
  state.trash = state.trash.filter((x) => x !== t);
  if (!state.workouts.some((w) => w.id === id)) state.workouts.push(t.w);
  save(); render(); toast('Séance « ' + t.w.title + ' » remise dans ton historique');
}
function sheetTrash() {
  const L = liveTrash().slice().reverse();
  let h = '<div class="col" style="gap:4px"><span class="label violet">Données</span><h1 class="h1">Corbeille</h1><span class="small mut">Les séances supprimées restent ici 30 jours. Elles ne comptent plus nulle part tant qu’elles y sont.</span></div>';
  h += L.length ? '<div class="list">' + L.map((x) => '<div class="item"><div class="col grow" style="gap:2px;min-width:0"><span style="font-weight:600">' + esc(x.w.title) + '</span><span class="small mut">' + dateFr(x.w.start, true) + ' · supprimée le ' + dateFr(x.at, true) + '</span></div><button type="button" class="pill sm glass" data-act="trash-back" data-id="' + esc(x.w.id) + '">Remettre</button></div>').join('') + '</div><button type="button" class="pill glass wide" data-act="trash-empty" style="color:var(--mut)">Vider la corbeille</button>'
    : '<section class="glass card"><span class="mut">La corbeille est vide.</span></section>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close2">Fermer</button>', 2);
}

// ---------- Export en tableau (CSV, pour Excel ou Numbers) ----------
function exportCsv() {
  const q = (v) => { const t = String(v == null ? '' : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const rows = [['Date', 'Heure', 'Séance', 'Exercice', 'Série', 'Répétitions', 'Lest (kg)', 'Secondes', 'Km', 'Record'].join(';')];
  for (const w of sorted().slice().reverse()) {
    const d = new Date(w.start), day = d.toLocaleDateString('fr-FR'), hr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    for (const e of w.exercises) e.sets.forEach((x, i) => { if (x.done === false) return; rows.push([day, hr, q(w.title), q(exoName(e.name)), i + 1, x.r || '', x.w ? String(x.w).replace('.', ',') : '', x.t || '', x.d ? String(x.d).replace('.', ',') : '', x.pr ? 'oui' : ''].join(';')); });
  }
  const name = 'ascension-series-' + new Date().toISOString().slice(0, 10) + '.csv';
  const file = new File(['\ufeff' + rows.join('\r\n')], name, { type: 'text/csv' });
  (async () => {
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  })();
}

// ---------- Changer de téléphone ----------
function sheetTransfer() {
  const steps = ['Sur ce téléphone : Réglages, « Sauvegarder mes données ». Enregistre le fichier dans Fichiers (iCloud Drive) ou envoie-le-toi.', 'Sur le nouveau téléphone : ouvre ' + location.host + location.pathname + ' dans Safari, puis Partager, « Sur l’écran d’accueil ».', 'Ouvre l’app depuis la nouvelle icône, puis Réglages, « Restaurer une sauvegarde », et choisis le fichier.', 'Vérifie que ton historique est là avant de te séparer de l’ancien téléphone.'];
  sheet('<div class="col" style="gap:4px"><span class="label violet">Données</span><h1 class="h1">Changer de téléphone</h1><span class="small mut">Tes données sont dans ce téléphone, pas sur internet : on les passe par un fichier. Rien n’est effacé, la restauration ajoute.</span></div>'
    + '<section class="glass card col" style="gap:12px">' + steps.map((t, i) => '<div class="row" style="gap:12px;align-items:flex-start"><span class="num violet" style="font-size:22px;width:20px">' + (i + 1) + '</span><span class="small" style="line-height:1.5">' + esc(t) + '</span></div>').join('') + '</section>'
    + '<button type="button" class="pill gold-btn wide" data-act="export">Sauvegarder maintenant</button><button type="button" class="pill glass wide" data-act="close2">Fermer</button>', 2);
}

async function exportBackup() {
  const name = 'ascension-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json';
  const file = new File([exportJson()], name, { type: 'application/json' });
  state.lastExport = Date.now();
  save();
  render();
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
  close: () => { if (ui.edit && !confirm('Fermer sans enregistrer les modifications ?')) return; ui.sub = null; closeSheet(); },
  close2: () => { ui.sub = null; closeSheet2(); },
  level: () => sheetLevel(),
  week: (el) => sheetWeek(el.dataset.m ? +el.dataset.m : 0),
  quests: () => sheetQuests(),
  flame: () => sheetFlame(),
  'goals-all': () => { ui.tab = 'progress'; render(); setTimeout(() => { const el = document.querySelector('[data-act="goal-new"]'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 350); },
  feats: () => sheetFeats(),
  profile: () => sheetProfile(),
  'set-skin': (el) => { state.settings.skin = el.dataset.k; save(); sheetProfile(); render(); },
  'set-title': (el) => { state.settings.title = el.dataset.t === 'Aucun' ? '' : el.dataset.t; save(); sheetProfile(); render(); },
  run: () => sheetRun(),
  copy: (el) => { const w = state.workouts.find((x) => x.id === el.dataset.id); if (w) copyText(workoutText(w)); },
  detail: (el) => sheetDetail(el.dataset.id),
  // Une séance supprimée va 30 jours à la corbeille (Réglages, Données), avec « Annuler » tout de suite.
  delete: (el) => {
    const w = state.workouts.find((x) => x.id === el.dataset.id); if (!w) return;
    state.workouts = state.workouts.filter((x) => x !== w);
    state.trash = (state.trash || []).concat([{ w, at: Date.now() }]);
    save(); closeSheet(); render();
    toastUndo('Séance mise à la corbeille', () => restoreTrash(w.id));
  },
  undo: () => { const f = ui.undo; ui.undo = null; $('toast').innerHTML = ''; if (f) f(); },
  trash: () => sheetTrash(),
  'trash-back': (el) => { restoreTrash(el.dataset.id); sheetTrash(); },
  'trash-empty': () => { if (!confirm('Vider la corbeille ? Ces séances seront perdues pour de bon.')) return; state.trash = []; save(); sheetTrash(); },
  'export-csv': () => exportCsv(),
  transfer: () => sheetTransfer(),
  more: () => { ui.historyLimit += 40; render(); },
  'set-rest': (el) => { state.settings.rest = +el.dataset.s; save(); sheetSettings(); },
  'set-sub': (el) => sheetSub(el.dataset.k),
  'bg-refresh': () => { render(); sheetSettings(); },
  'notif-kind': (el) => { const o = Object.assign({}, state.settings.notifOff); o[el.dataset.k] = !o[el.dataset.k]; state.settings.notifOff = o; save(); resync(); sheetSub('notif'); },
  'set-goal': (el) => { state.settings.weekGoal = +el.dataset.n; save(); render(); sheetSettings(); },
  'toggle-sound': () => { state.settings.sound = state.settings.sound === false; save(); sheetSettings(); },
  'home-edit': () => sheetHomeEdit(),
  guide: () => sheetGuide(),
  'home-move': (el) => { const O = homeOrder(), i = O.indexOf(el.dataset.k), j = i + Number(el.dataset.d); if (j < 0 || j >= O.length) return; [O[i], O[j]] = [O[j], O[i]]; state.settings.homeOrder = O; save(); render(); sheetHomeEdit(); },
  'home-toggle': (el) => { const k = el.dataset.k; state.settings.hide = Object.assign({}, state.settings.hide, { [k]: show(k) }); save(); render(); sheetHomeEdit(); },
  'toggle-textbig': () => { state.settings.textBig = !state.settings.textBig; save(); render(); sheetSettings(); },
  'toggle-light': () => { state.settings.light = !state.settings.light; save(); render(); sheetSettings(); },
  'toggle-haptics': () => { state.settings.haptics = state.settings.haptics === false; save(); sheetSettings(); },
  'toggle-zen': () => { state.settings.zen = !state.settings.zen; save(); render(); sheetSettings(); },
  'toggle-voice': () => { state.settings.voiceCoach = !state.settings.voiceCoach; save(); if (state.settings.voiceCoach) { try { const u = new SpeechSynthesisUtterance('Voix du coach activée. Je t’annonce chaque série à la fin du repos.'); u.lang = 'fr-FR'; speechSynthesis.speak(u); } catch (e) { /* pas de voix */ } } sheetSettings(); },
  'toggle-silent': () => { state.settings.soundSilent = state.settings.soundSilent === false; save(); wakeAudio(); sheetSettings(); },
  'test-sound': () => {
    beep(true).then((how) => {
      if (how === 'aucun') toast('Le téléphone bloque le son (' + (soundError() || 'inconnu') + ')');
      else if (how === 'discret') toast('Bip discret envoyé : coupé si l’iPhone est en silencieux');
      else toast('Bip envoyé : monte le volume si tu ne l’entends pas');
    });
  },
  news: () => sheetNews(),
  season: () => sheetSeason(),
  'season-img': () => shareImage(...seasonImage()),
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
  'pick-hevy': () => pickFile('.csv,text/csv,text/comma-separated-values,text/plain', (text) => {
    let r;
    try { r = importHevy(text); } catch (e) { toast(e.message); return; }
    ui.enter = true; render();
    if (!r.added) { toast(r.skipped ? 'Déjà fait : tes ' + r.skipped + ' séances Hevy sont dans l’app et comptent partout' : 'Aucune séance trouvée dans ce fichier'); return; }
    burst();
    sheet('<div class="col center" style="gap:8px;padding-top:10px"><span class="label violet">Historique importé</span><span class="num" style="font-size:64px;line-height:1">' + r.added + '</span><span class="h2">séances ramenées de Hevy</span>'
      + '<span class="small mut" style="text-align:center">Depuis le ' + dateFr(r.first, true) + (r.skipped ? '. ' + r.skipped + ' déjà présentes ont été laissées de côté' : '') + '. Ton rang, tes records, ton niveau, tes pompes à vie et ton parcours comptent maintenant tout depuis le début.</span></div>'
      + '<button type="button" class="pill gold-btn wide" data-act="parcours">Voir mon parcours</button><button type="button" class="pill glass wide" data-tab="progress" data-act="close">Voir mon rang</button>', 1);
  }),
  'hevy-how': () => sheet('<div class="col" style="gap:4px"><span class="label violet">2 minutes</span><h1 class="h1">Importer depuis Hevy</h1><span class="small mut">Le fichier reste dans ton téléphone, rien n’est envoyé.</span></div>'
    + '<section class="glass card col steps" style="gap:14px">' + ['Ouvre Hevy, va sur ton <b>Profil</b> puis la roue des <b>Réglages</b>.', 'Touche <b>Exporter et importer des données</b>, puis <b>Exporter les séances</b>.', 'Choisis <b>Enregistrer dans Fichiers</b> (garde le nom workouts.csv).', 'Reviens ici et touche le bouton ci-dessous, puis choisis ce fichier.']
      .map((t, i) => '<div class="row" style="gap:12px;align-items:flex-start"><span class="stepn">' + (i + 1) + '</span><span>' + t + '</span></div>').join('') + '</section>'
    + '<button type="button" class="pill gold-btn wide" data-act="pick-hevy">Choisir le fichier Hevy</button><button type="button" class="pill glass wide" data-act="close">Plus tard</button>', 1),
  unknown: () => sheetUnknown(),
  'unknown-set': (el) => {
    const to = ($('unk-' + el.dataset.i) || {}).value;
    if (!to) { toast('Choisis l’exercice qui correspond'); return; }
    renameExo(el.dataset.name, to);
    toast(exoName(to) + ' : historique relié');
    sheetUnknown();
  },
  'no-hevy': () => { state.settings.noHevy = true; save(); render(); },
  'pick-backup': () => pickFile('.json,application/json', (text) => {
    try { const r = importJson(text); closeSheet(); ui.enter = true; render(); toast(r.added + ' séances restaurées'); } catch (e) { toast('Ce fichier n’est pas une sauvegarde valide'); }
  }),
  export: () => exportBackup(),
  'backup-later': () => { state.settings.backupSnooze = Date.now() + 3 * 864e5; save(); render(); },
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
// Comment s'entraîner : programme complet, programme débutant ou ses propres routines (settings.level, settings.noProg).
const MODES = [
  ['full', 'Programme complet', 'L’app choisit ta séance : pompes, dips, pistols, avec des exercices qui deviennent plus durs.'],
  ['debutant', 'Programme débutant', 'Pour commencer : 3 séances courtes au poids du corps (pompes sur les genoux, squats, gainage…).'],
  ['libre', 'Mes propres séances', 'Pas de programme : tu crées tes routines et tu choisis quoi faire.'],
];
const modeNow = () => (state.settings.noProg ? 'libre' : isBeginner() ? 'debutant' : 'full');
function modeCard() {
  return '<section class="glass card col tint t-violet" style="gap:10px"><div class="col" style="gap:2px"><span class="label violet">Pour commencer</span><span class="h2">Comment veux-tu t’entraîner ?</span><span class="small mut">Tu pourras changer quand tu veux dans les Réglages.</span></div>'
    + '<div class="list">' + MODES.map(([k, t, d]) => '<button type="button" class="item" data-act="set-mode" data-m="' + k + '"><div class="col grow" style="gap:2px"><span style="font-weight:700">' + t + '</span><span class="small mut">' + d + '</span></div>' + ICON.chev + '</button>').join('') + '</div></section>';
}
function modeSettings() {
  return '<div class="col" style="gap:8px"><span class="label">Programme</span>'
    + MODES.map(([k, t, d]) => '<button type="button" class="pill sm wide ' + (modeNow() === k ? 'gold-btn' : 'glass') + '" data-act="set-mode" data-m="' + k + '" data-from="settings">' + t + '</button>').join('')
    + '<span class="small mut">' + esc(MODES.find((x) => x[0] === modeNow())[2]) + '</span></div>';
}

// ---------- Première ouverture : 3 étapes pour régler l'essentiel ----------
// 1. Toi (âge, poids) · 2. Ta façon de t'entraîner · 3. Ta semaine. Puis comment se repérer.
function sheetWelcome(step) {
  const st = state.settings;
  const dots = '<div class="wdots">' + [0, 1, 2, 3].map((i) => '<i class="' + (i <= step ? 'on' : '') + '"></i>').join('') + '</div>';
  let h = dots;
  if (step === 0) {
    h += '<span class="label violet">Bienvenue</span><h1 class="h1">Ascension</h1><span class="mut">Ton carnet d’entraînement au poids du corps. Il choisit ta séance, compte tes progrès et te donne un rang de E à Z sur 5 qualités : force, explosivité, vitesse, endurance et maîtrise du corps.</span>'
      + '<span class="label">Pour calculer ton rang</span><div class="slist">'
      + '<label class="srow"><span class="mico">' + ICON.user + '</span><span class="grow mt">Âge</span><input id="set-age" class="sin" inputmode="numeric" placeholder="—" value="' + (st.age || '') + '"><span class="sv">ans</span></label>'
      + '<label class="srow"><span class="mico">' + ICON.scale + '</span><span class="grow mt">Poids</span><input id="w-kg" class="sin" inputmode="decimal" placeholder="—" value="' + (bodyLog().length ? bodyLog()[0].kg : '') + '"><span class="sv">kg</span></label></div>'
      + '<span class="small mut">20 pompes ne valent pas la même chose à 14 ans et à 30 ans, à 50 kg et à 90 kg. Tu peux laisser vide et le faire plus tard.</span>'
      + '<button type="button" class="pill gold-btn wide" data-act="wel" data-s="1">Continuer</button>';
  } else if (step === 1) {
    h += '<span class="label violet">Étape 2 sur 3</span><h1 class="h1">Comment t’entraîner ?</h1><span class="mut">Tu pourras changer quand tu veux dans les Réglages.</span><div class="slist">'
      + MODES.map(([k, t, d]) => '<button type="button" class="srow" data-act="wel-mode" data-m="' + k + '"><span class="col grow" style="gap:2px"><span class="mt">' + t + '</span><span class="small mut">' + d + '</span></span>' + (st.modeSet && modeNow() === k ? '<span class="tick">' + ICON.check + '</span>' : '') + '</button>').join('') + '</div>'
      + '<button type="button" class="pill gold-btn wide" data-act="wel" data-s="2">Continuer</button>';
  } else if (step === 2) {
    h += '<span class="label violet">Étape 3 sur 3</span><h1 class="h1">Combien de séances par semaine ?</h1><span class="mut">L’app répartit tes séances et tes jours de repos. Une semaine réussie fait grandir ta flamme.</span><div class="slist">'
      + [2, 3, 4, 5].map((n) => '<button type="button" class="srow" data-act="wel-goal" data-n="' + n + '"><span class="col grow" style="gap:2px"><span class="mt">' + plural(n, 'séance', 'séances') + '</span><span class="small mut">' + ({ 2: 'Pour reprendre doucement', 3: 'Le bon rythme pour progresser', 4: 'Pour progresser vite', 5: '4 séances et une course' })[n] + '</span></span>' + (weekGoal() === n ? '<span class="tick">' + ICON.check + '</span>' : '') + '</button>').join('') + '</div>'
      + '<button type="button" class="pill gold-btn wide" data-act="wel" data-s="3">Continuer</button>';
  } else {
    h += '<span class="label violet">C’est prêt</span><h1 class="h1">Comment se repérer</h1><div class="slist">'
      + [['home', 'Aujourd’hui', 'Ce que tu ouvres chaque jour : ta séance, ta forme, ta semaine.'], ['dumbbell', 'Le bouton rond', 'En bas au milieu. Un toucher : ta séance. Garde le doigt dessus, glisse sur Progrès, Défis… et lâche.'], ['chart', 'Le menu', 'Dans l’éventail du bouton rond : tout le reste de l’app, avec une recherche.'], ['book', 'Le guide', 'Dans le menu : chaque partie de l’app expliquée.']]
        .map(([ic, t, d]) => '<div class="srow"><span class="mico">' + ICON[ic] + '</span><span class="col grow" style="gap:2px"><span class="mt">' + t + '</span><span class="small mut">' + d + '</span></span></div>').join('') + '</div>'
      + '<button type="button" class="pill gold-btn wide" data-act="wel-end">Commencer</button>';
  }
  sheet(h, 1, 'welcome');
}
function welSave() {
  const a = $('set-age'), k = $('w-kg');
  if (a && +a.value > 5 && +a.value < 100) state.settings.age = Math.round(+a.value);
  if (k) { const kg = toNum(k.value); if (kg > 25 && kg < 250 && (!bodyLog().length || bodyLog()[0].kg !== kg)) addWeight(kg); }
  save();
}
Object.assign(ACTIONS, {
  wel: (el) => { welSave(); sheetWelcome(+el.dataset.s); },
  'wel-mode': (el) => { const m = el.dataset.m; state.settings.modeSet = true; state.settings.noProg = m === 'libre'; state.settings.level = m === 'debutant' ? 'debutant' : undefined; save(); sheetWelcome(1); },
  'wel-goal': (el) => { state.settings.weekGoal = +el.dataset.n; save(); sheetWelcome(2); },
  'wel-end': () => { state.settings.onboarded = true; if (!state.settings.modeSet) state.settings.modeSet = true; save(); closeSheet(); render(); },
  welcome: () => sheetWelcome(0),
});

// ---------- Menu (dans l'éventail du bouton rond : fan.js) ----------
// Toute l'app, rangée en quatre groupes. Une ligne = un écran (data-tab) ou une fenêtre (data-act).
// Menu (v63) : 16 cases visibles d'un coup, un mot chacune ; la description sert seulement à la recherche.
// [type, valeur, icône, nom, description, nom court de la case]
const MENU = [
  ['Entraînement', [
    ['tab', 'home', 'home', 'Aujourd’hui', 'Ta séance du jour, ta forme, ta semaine, accueil', 'Accueil'],
    ['tab', 'workout', 'dumbbell', 'Séance', 'Programme, routines, séance libre, pompes du jour'],
    ['act', 'run', 'run', 'Course', 'Noter une course ou courir avec le GPS'],
    ['act', 'chrono2', 'timer', 'Chronos', 'Tabata, EMOM, AMRAP, intervalles'],
  ]],
  ['Suivi', [
    ['tab', 'progress', 'chart', 'Progrès', 'Ton rang, tes objectifs, tes muscles, tes records'],
    ['tab', 'history', 'clock', 'Historique', 'Toutes tes séances, à revoir ou modifier'],
    ['act', 'body', 'scale', 'Poids et mensurations', 'Ta balance et ton tour de bras', 'Poids'],
    ['act', 'photos', 'cam', 'Photos de suivi', 'Ton physique, photo après photo', 'Photos'],
  ]],
  ['Défis', [
    ['tab', 'defis', 'trophy', 'Tous les défis', 'Quêtes du jour, ton ombre, défi du mois, campagne, saison', 'Défis'],
    ['act', 'boss', 'swords', 'Ton ombre', 'Le défi de la semaine'],
    ['act', 'p30', 'calendar', 'Programme de 30 jours', 'Un but précis, 10 à 15 minutes par jour', '30 jours'],
    ['act', 'feats', 'medal', 'Hauts faits', 'Des exploits durs, gagnés une seule fois'],
  ]],
  ['Toi', [
    ['act', 'profile', 'user', 'Profil', 'Niveau, rang, tes chiffres à vie'],
    ['act', 'settings', 'gear', 'Réglages', 'Entraînement, notifications, fond, données'],
    ['act', 'guide', 'book', 'Guide', 'Comment marche chaque partie de l’app'],
    ['act', 'export', 'save', 'Sauvegarder', 'Un fichier avec toutes tes données', 'Sauvegarde'],
  ]],
];
// Recherche dans toute l'app : écrans et fenêtres, exercices (avec leurs autres noms), séances passées.
const MORE_SEARCH = [
  ['act', 'analyse', 'chart', 'Analyse', 'Ce mois contre le mois dernier, meilleures séances, records'],
  ['act', 'week', 'calendar', 'Ta semaine', 'Plan de la semaine, jours fixes, vacances'],
  ['act', 'coach', 'bolt', 'Coach', 'Conseils et questions'],
  ['act', 'checkin', 'notif', 'Bilan du matin', 'Sommeil, courbatures, énergie, pouls'],
  ['act', 'quick', 'plus', 'Pompes du jour', 'Des séries hors séance'],
  ['act', 'boss', 'swords', 'Ton ombre', 'Le défi de la semaine'],
  ['act', 'mch', 'trophy', 'Défi du mois', 'Un gros total à atteindre'],
  ['act', 'paliers', 'medal', 'Paliers', 'Médailles de tes grands records'],
  ['act', 'duels', 'swords', 'Duels', 'Défier quelqu’un avec un code'],
  ['act', 'season', 'star', 'Saison', 'Les 30 paliers du mois'],
  ['act', 'mtest', 'target', 'Test du mois', 'Où tu te situes pour ton âge'],
  ['act', 'goal-new', 'target', 'Nouvel objectif', 'Un but chiffré avec sa date estimée'],
  ['act', 'measures', 'scale', 'Mensurations', 'Tour de bras, de taille…'],
  ['act', 'export', 'save', 'Sauvegarder', 'Un fichier avec toutes tes données'],
];
function searchAll(q) {
  const n = norm(q || '').trim();
  if (n.length < 2) return '<span class="small mut">Écris au moins 2 lettres : un écran, un exercice, une séance.</span>';
  const row = (attr, ic, t, d) => '<button type="button" class="mrow" ' + attr + '><span class="mico">' + (ICON[ic] || '') + '</span><span class="col grow" style="gap:1px;min-width:0"><span class="mt">' + t + '</span><span class="small mut">' + d + '</span></span>' + ICON.chev + '</button>';
  const pages = MENU.flatMap(([, r]) => r).concat(MORE_SEARCH).filter(([, , , t, d, sh]) => norm(t + ' ' + d + ' ' + (sh || '')).includes(n)).slice(0, 6)
    .map(([k, v, ic, t, d]) => row((k === 'tab' ? 'data-tab' : 'data-act') + '="' + v + '"', ic, t, d));
  const ex = Object.keys(EXOS).filter((k) => norm(exoName(k) + ' ' + k + ' ' + (AKA[k] || []).join(' ')).includes(n)).slice(0, 8)
    .map((k) => row('data-act="exo" data-name="' + esc(k) + '"', 'dumbbell', esc(exoName(k)), 'Fiche, historique et record'));
  const ws = sorted().filter((w) => norm(w.title + ' ' + dateFr(w.start, true) + ' ' + w.exercises.map((e) => exoName(e.name)).join(' ')).includes(n)).slice(0, 8)
    .map((w) => row('data-act="detail" data-id="' + esc(w.id) + '"', 'clock', esc(w.title), dateFr(w.start, true)));
  const grp = (t, L) => (L.length ? '<div class="mgroup"><span class="label">' + t + '</span><div class="mlist">' + L.join('') + '</div></div>' : '');
  return (grp('Dans l’app', pages) + grp('Exercices', ex) + grp('Séances', ws)) || '<span class="small mut">Rien trouvé pour « ' + esc(q) + ' ».</span>';
}
function sheetMenu() {
  sheet('<span class="h1">Menu</span><label class="field gsearch"><input id="gsearch" type="search" placeholder="Rechercher un écran, un exercice…" aria-label="Rechercher dans l’app" autocomplete="off"></label><div id="gs-res" class="col" style="gap:14px;display:none"></div><div id="gs-menu" class="col" style="gap:16px">' + MENU.map(([g, rows]) => '<div class="mgroup"><span class="label">' + g + '</span><div class="mgrid">'
    + rows.map(([k, v, ic, t, , sh]) => '<button type="button" class="mtile' + (k === 'tab' && ui.tab === v ? ' on' : '') + '" ' + (k === 'tab' ? 'data-tab' : 'data-act') + '="' + v + '" aria-label="' + t + '"><span class="mico">' + (ICON[ic] || '') + '</span><span class="mtl">' + (sh || t) + '</span></button>').join('')
    + '</div></div>').join('') + '</div>', 1, 'menu');
}
Object.assign(ACTIONS, { menu: () => sheetMenu() });
// Les 5 choix de l'éventail, de gauche à droite (un simple toucher, lui, ouvre la séance).
const FAN = () => [
  { kind: 'act', v: 'run', ic: 'run', t: 'Course' },
  { kind: 'tab', v: 'progress', ic: 'chart', t: 'Progrès' },
  { kind: 'tab', v: 'home', ic: 'home', t: 'Aujourd’hui' },
  { kind: 'tab', v: 'defis', ic: 'trophy', t: 'Défis' },
  { kind: 'act', v: 'menu', ic: 'grid', t: 'Menu' },
];
function fanGo(it) {
  closeSheet();
  if (it.kind === 'tab') { ui.tab = it.v; ui.enter = true; render(); window.scrollTo(0, 0); return; }
  if (ACTIONS[it.v]) ACTIONS[it.v](document.createElement('button'));
}
// Les fonds vivants (flamme, rang, ombre, saison) lisent ces chiffres ; une erreur ne doit jamais casser l'accueil.
setBgInfo(() => {
  const o = {};
  try { o.st = streak(); } catch (e) { /* rien */ }
  try { o.rk = rankInfo(); } catch (e) { /* rien */ }
  try { o.se = season(); } catch (e) { /* rien */ }
  try { o.bo = weekBoss(); } catch (e) { /* rien */ }
  return o;
});
initFan({ items: FAN, go: fanGo, tap: () => fanGo({ kind: 'tab', v: 'workout' }) });

// Sommaire en haut des onglets longs : tout ce que l'onglet contient, visible sans descendre, un toucher pour y aller.
// Un raccourci par élément (trouvé par son bouton), seulement s'il est affiché.
const SECNAV = {
  defis: [['Quêtes', '[data-act="quests"]'], ['Ton ombre', '[data-act="boss"]'], ['Duels', '[data-act="duels"]'], ['Défi du mois', '[data-act="mch"]'], ['30 jours', '[data-act="p30"]'], ['Test du mois', '[data-act="mtest"]'], ['Saison', '[data-act="season"]'], ['Campagne', '.camp, [data-act="camp-all"]'], ['Figures', '.figgrid'], ['Hauts faits', '[data-act="feats"]'], ['Paliers', '[data-act="paliers"]']],
  progress: [['Rang', '[data-act="rank"]'], ['Analyse', '[data-act="analyse"]'], ['Objectifs', '[data-act="cap"], [data-act="goal"], [data-act="goal-new"]'], ['Muscles', '.bodymap'], ['Carrière', '[data-act="career"]'], ['Parcours', '[data-act="parcours"]'], ['Records', '[data-act="exo"]'], ['Équilibre', '.hbar'], ['Poids', '[data-act="body"]'], ['Mensurations', '[data-act="measures"]'], ['Photos', '[data-act="photos"]']],
};
function addSecNav() {
  const rules = SECNAV[ui.tab];
  const app = $('app');
  if (!rules || !app.firstElementChild) return;
  const kids = [...app.children].slice(1);
  const chips = [];
  rules.forEach(([label, sel], i) => {
    const c = kids.find((k) => k.matches(sel) || k.querySelector(sel));
    if (!c) return;
    // Le titre de la partie juste au-dessus reste visible en arrivant.
    const prev = c.previousElementSibling;
    const target = prev && prev.matches('.sechead, .sec') && !prev.id ? prev : c;
    if (!target.id) target.id = 'sec-' + i;
    chips.push('<button type="button" class="secchip" data-sec="' + target.id + '">' + label + '</button>');
  });
  if (chips.length < 3) return;
  const nav = document.createElement('nav');
  nav.className = 'secnav';
  nav.setAttribute('aria-label', 'Dans cet onglet');
  nav.innerHTML = chips.join('');
  app.firstElementChild.after(nav);
}

export function render() {
  const views = { home: viewHome, workout: viewWorkout, progress: viewProgress, history: viewHistory, moi: viewHistory, defis: viewDefis };
  // L'animation d'arrivée ne joue que quand on change d'écran, pas à chaque série cochée.
  $('app').classList.toggle('enter', ui.enter);
  ui.enter = false;
  if (ui.tab === 'repas' || ui.tab === 'aventure') ui.tab = 'defis';
  if (ui.tab === 'moi') ui.tab = 'history';
  let html;
  try { html = (views[ui.tab] || viewHome)(); } catch (e) {
    console.error(e);
    html = '<section class="glass card col" style="gap:10px;margin-top:20px"><span class="h2">Cet écran n’a pas pu s’afficher</span><span class="small mut">Tes données ne sont pas touchées. Envoie une capture de ce message pour que ce soit corrigé.</span>'
      + '<span class="small dim" style="font-family:ui-monospace,monospace;word-break:break-word">' + esc(String(e && e.message || e)) + ' ' + esc(String(e && e.stack || '').split(String.fromCharCode(10)).slice(0, 3).join(' | ')) + '</span>'
      + '<button type="button" class="pill gold-btn wide" onclick="__repair()">Réparer l’app</button></section>';
  }
  // Séance en cours et autre écran : le bouton rond (un toucher = la séance) porte un anneau de progression.
  { const a = state.active, fab = $('fab');
    if (fab) {
      const live = !!a && ui.tab !== 'workout';
      fab.classList.toggle('live', live);
      if (live) { const done = a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0), tot = a.exercises.reduce((n, e) => n + e.sets.length, 0) || 1; fab.style.setProperty('--p', Math.round((360 * done) / tot) + 'deg'); }
      fab.setAttribute('aria-label', live ? 'Reprendre ma séance (garde le doigt dessus pour les autres écrans)' : 'Séance (garde le doigt dessus pour les autres écrans)');
    }
  }
  // Pendant une séance, le bouton Séance flottant ne sert à rien (on y est) et cachait les boutons du haut.
  document.body.classList.toggle('in-session', !!state.active && ui.tab === 'workout');
  // Écran d'un exercice : le bouton rond laisse la place à « Valider ».
  document.body.classList.toggle('in-focus', !!state.active && ui.tab === 'workout' && state.active.view === 'focus' && state.active.exercises.length > 0);
  $('app').innerHTML = html;
  addSecNav();
  document.body.classList.toggle('zen', !!state.settings.zen);
  document.documentElement.classList.toggle('light', !!state.settings.light);
  document.documentElement.classList.toggle('textbig', !!state.settings.textBig);
  applyBg(ui.tab);
  { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = state.settings.light ? '#F3F2F7' : '#0E0E12'; }
  // Un rang gagné se fête sur l'accueil, quand aucune autre fenêtre n'est ouverte.
  if (ui.tab === 'home' && state.workouts.length && !$('sheet').firstElementChild) checkRankUp(rankInfo());
  // Après une mise à jour, on montre une fois ce qui a changé.
  if (ui.tab === 'home' && state.seenVersion !== VERSION && !$('sheet').firstElementChild && !state.active) {
    const first = state.seenVersion === undefined && !state.workouts.length;
    const from = state.seenVersion;
    state.seenVersion = VERSION; save();
    if (!first) sheetNews(from);
  }
  // Tout premier lancement : la présentation en 3 étapes.
  if (ui.tab === 'home' && !state.workouts.length && !state.settings.onboarded && !$('sheet').firstElementChild) sheetWelcome(0);
}

document.addEventListener('click', (ev) => {
  const sec = ev.target.closest('[data-sec]');
  if (sec) { const t = document.getElementById(sec.dataset.sec); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
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
  if (ev.target.id === 'ba-range') { const t = document.querySelector('.ba-top'); if (t) t.style.width = ev.target.value + '%'; return; }
  if (ev.target.id === 'gsearch') { const q = ev.target.value, r = $('gs-res'), m = $('gs-menu'); r.style.display = q ? '' : 'none'; m.style.display = q ? 'none' : ''; r.innerHTML = q ? searchAll(q) : ''; return; }
  if (ev.target.id === 'h-search') { ui.hQuery = ev.target.value; ui.historyLimit = 40; $('h-list').innerHTML = historyList(); return; }
  onInput(ev.target);
});
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'photo-date') onPhotoDate(ev.target);
  if (ev.target.id === 'set-age') {
    const a = Math.round(toNum(ev.target.value));
    if (a && (a < 10 || a > 90)) { toast('Indique ton âge en années'); return; }
    state.settings.age = a || undefined; save(); render(); toast(a ? 'Âge enregistré' : 'Âge retiré');
  }
});

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

// v46 : son choix « 4 séances + course » (objectif 5 par semaine, course comprise) et son grand objectif choisi par l'app.
// Seulement pour le programme complet et un historique fourni (pas pour un débutant qui commence).
try {
  if (!state.settings.g46) {
    state.settings.g46 = 1;
    if (state.settings.level !== 'debutant' && !state.settings.noProg && state.workouts.length >= 30) { state.settings.weekGoal = 5; ensureCap(); }
    save();
  }
} catch (e) { console.error('v46', e); }
if (state.active) { ui.tab = 'workout'; keepAwake(); }
initSound();
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

// Notifications : abonnement renvoyé et rappels mis à jour à chaque ouverture.
initPush();
Object.assign(ACTIONS, {
  'set-mode': (el) => {
    const m = el.dataset.m;
    state.settings.modeSet = true;
    state.settings.noProg = m === 'libre';
    state.settings.level = m === 'debutant' ? 'debutant' : undefined;
    save();
    if (el.dataset.from === 'settings') { render(); sheetSettings(); } else { render(); window.scrollTo(0, 0); }
    toast(m === 'libre' ? 'Sans programme : tes routines sont sur l’accueil' : m === 'debutant' ? 'Programme débutant choisi' : 'Programme complet choisi');
  },
});
Object.assign(ACTIONS, {
  'notif-on': () => enablePush(() => sheetSettings()),
  'notif-off': async () => { await disablePush(); sheetSettings(); toast('Notifications désactivées'); },
  'notif-hour': (el) => { state.settings.notifHour = Math.max(6, Math.min(22, notifHour() + Number(el.dataset.d))); save(); resync(); sheetSettings(); },
});

// Le démarrage est allé au bout : l'écran de secours de index.html ne s'affichera pas.
window.__ascOk = true;
