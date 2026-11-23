// Coach : lit tout ton historique et te parle comme un entraîneur. Tout est calculé dans le téléphone,
// sans internet ni IA : récupération, stagnation, progrès, régularité, équilibre, course, rang.
import { state, sorted, exoName, runs, weekGoal, weekQuest, dur, fr, pace } from './store.js';
import { EXOS, FICHES } from './data.js';
import { esc, plural, ACTIONS, ICON, sheet, $ } from './ui.js';
import { TYPES, nextType, plan, testDue, readiness, minutes, weekIdx } from './programme.js';
import { bodyStats, ZONES } from './corps.js';
import { rankInfo, balance } from './stats.js';
import { streak } from './quetes.js';

const DAY = 864e5;
const day0 = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const real = () => sorted().filter((w) => !w.quick && !w.boss);
const amount = (s) => (s.r || s.t || 0) * (1 + (s.w || 0) / 40); // une série, lest compris
const isTime = (name, s) => !!(s && s.t && !s.r);

// ---------- Analyse des exercices ----------
// Pour chaque exercice récent : séances, meilleure série récente, meilleure avant, progrès ou stagnation.
function exoTrends() {
  const now = Date.now(), by = {};
  for (const w of real()) {
    if (now - w.start > 84 * DAY) break;
    for (const e of w.exercises) {
      if (e.name === 'Running' || !e.sets.length) continue;
      const b = e.sets.reduce((m, s) => (amount(s) > amount(m) ? s : m), e.sets[0]);
      (by[e.name] = by[e.name] || []).push({ date: w.start, best: b, feel: e.feel });
    }
  }
  const out = [];
  for (const name of Object.keys(by)) {
    const L = by[name]; // du plus récent au plus ancien
    if (now - L[0].date > 21 * DAY) continue; // plus fait depuis 3 semaines : abandonné
    const recent = L.slice(0, 3), before = L.slice(3);
    const rBest = Math.max(...recent.map((x) => amount(x.best)));
    const bBest = before.length ? Math.max(...before.map((x) => amount(x.best))) : 0;
    const first = L[L.length - 1];
    const gain = amount(first.best) ? (rBest - amount(first.best)) / amount(first.best) : 0;
    out.push({ name, n: L.length, last: L[0], recent, rBest, bBest, stuck: L.length >= 5 && rBest <= bBest, gain, first, hard: recent.filter((x) => x.feel === 'd').length });
  }
  return out;
}

function stuckTip(t) {
  const f = FICHES[t.name] || {};
  const s = t.last.best;
  const tips = [];
  if (t.hard >= 2) tips.push('Tu l’as trouvé très dur ' + t.hard + ' fois de suite : fais une semaine plus légère (une série de moins), puis repars.');
  if (s.w) tips.push('Garde le même lest mais ajoute une série, ou descends en 3 secondes pour rendre chaque répétition plus dure.');
  else if (isTime(t.name, s)) tips.push('Coupe ton temps en deux séries plus longues que d’habitude, avec 30 s de pause seulement.');
  else if (s.r >= 12 && f.dur) tips.push('Tu fais déjà ' + s.r + ' répétitions : passe à « ' + exoName(f.dur) + ' », plus dur, pour repartir vers le haut.');
  else tips.push('Fais 3 secondes de descente et une petite pause en bas : tu progresseras sur la force, puis les répétitions suivront.');
  tips.push('Dors bien la veille et ne le fais pas en dernier dans la séance.');
  return tips;
}

const showSet = (name, s) => (s.r ? s.r + ' rép.' : s.t ? dur(s.t) : '') + (s.w ? ' avec ' + fr(s.w, 1) + ' kg' : '');

// ---------- Les constats du coach (du plus important au moins important) ----------
export function insights() {
  const out = [];
  const ws = real();
  if (!ws.length) return [{ tone: 'info', title: 'On commence', text: 'Fais ta première séance du programme : je pourrai ensuite lire tes progrès et te conseiller.', act: 'prog' }];
  const now = Date.now(), t0 = day0(now);
  const st = streak();
  const type = testDue() ? 'test' : nextType();
  const rd = readiness(plan(type, ''));
  const doneToday = ws.some((w) => w.start >= t0);
  const since = Math.floor((t0 - day0(ws[0].start)) / DAY);

  // Aujourd'hui
  if (doneToday) out.push({ tone: 'good', title: 'Séance faite', text: 'C’est fait pour aujourd’hui. Mange des protéines, bois, et dors au moins 8 heures : c’est là que le muscle se construit.' });
  else if (rd.pct < 65) out.push({ tone: 'warn', title: 'Corps encore fatigué', text: 'Prêt à ' + rd.pct + ' % pour « ' + (TYPES[type] ? TYPES[type].label : 'le re-test') + ' »' + (rd.tired.length ? ' (' + rd.tired.slice(0, 2).join(', ') + ')' : '') + '. Fais la version courte, ou une course facile à la place.', act: 'today' });
  else if (since >= 3) out.push({ tone: 'warn', title: plural(since, 'jour', 'jours') + ' sans séance', text: 'Pas besoin d’une grosse séance pour repartir : la version courte suffit aujourd’hui.', act: 'today' });
  else out.push({ tone: 'good', title: 'Prêt à ' + rd.pct + ' %', text: 'Ton corps est récupéré : c’est le bon jour pour « ' + (TYPES[type] ? TYPES[type].label : 'le re-test') + ' » en entier.', act: 'today' });

  if (st.danger) out.push({ tone: 'warn', title: 'Flamme en danger', text: 'Ta flamme de ' + plural(st.n, 'jour', 'jours') + ' s’éteint ce soir sans entraînement. 30 pompes du jour suffisent à la garder.', act: 'quick' });

  // Progrès et stagnation
  const tr = exoTrends();
  const best = tr.filter((t) => t.n >= 3 && t.gain >= 0.1 && !t.stuck).sort((a, b) => b.gain - a.gain)[0];
  if (best) out.push({ tone: 'good', title: 'Ton plus gros progrès', text: exoName(best.name) + ' : de ' + showSet(best.name, best.first.best) + ' à ' + showSet(best.name, best.recent.find((x) => amount(x.best) === best.rBest).best) + ' en ' + plural(Math.max(1, Math.round((best.last.date - best.first.date) / (7 * DAY))), 'semaine', 'semaines') + ' (+' + Math.round(best.gain * 100) + ' %).' });
  const stuck = tr.filter((t) => t.stuck).sort((a, b) => b.n - a.n);
  if (stuck.length) out.push({ tone: 'warn', title: 'Tu stagnes sur ' + exoName(stuck[0].name), text: 'Pas mieux que ' + showSet(stuck[0].name, stuck[0].last.best) + ' sur tes 3 dernières séances. ' + stuckTip(stuck[0])[0], act: 'stuck' });

  // Régularité de la semaine
  const wq = weekQuest();
  const dow = (new Date().getDay() + 6) % 7; // 0 = lundi
  const left = 7 - dow, need = wq.goal - wq.cur;
  if (need > 0 && need >= left) out.push({ tone: 'warn', title: 'Objectif de la semaine serré', text: 'Encore ' + plural(need, 'séance', 'séances') + ' pour ' + wq.goal + ', et ' + plural(left, 'jour', 'jours') + ' avant lundi. Les versions courtes comptent.' });
  else if (wq.done) out.push({ tone: 'good', title: 'Semaine réussie', text: wq.cur + ' sur ' + wq.goal + ' séances. Tout ce que tu fais en plus, c’est du bonus.' });

  // Équilibre
  const b = balance();
  const up = b.push + b.pull, low = b.legs;
  if (up > 30 && low * 3 < up) out.push({ tone: 'warn', title: 'Jambes en retard', text: 'Sur 4 semaines : ' + up + ' séries pour le haut du corps, ' + low + ' pour les jambes. Ne saute pas « Jambes et abdos ».' });

  // Course
  const R = runs();
  if (R.length >= 2) {
    const a = R[0], prev = R.slice(1, 6).filter((r) => r.t && r.d);
    if (a.t && a.d && prev.length) {
      const avg = prev.reduce((k, r) => k + r.t / r.d, 0) / prev.length;
      const diff = Math.round(avg - a.t / a.d);
      if (Math.abs(diff) >= 5) out.push({ tone: diff > 0 ? 'good' : 'info', title: 'Course', text: 'Ta dernière course : ' + pace(a.d, a.t) + ', soit ' + Math.abs(diff) + ' s par km ' + (diff > 0 ? 'plus vite' : 'plus lent') + ' que ta moyenne.' + (diff < 0 ? ' Normal si c’était une sortie longue ou fatigué.' : ''), act: 'run' });
    }
  } else if (!R.length) out.push({ tone: 'info', title: 'Vitesse', text: 'Sans course enregistrée, ta qualité « vitesse » reste au plus bas. Une course de 3 km avec le GPS suffit pour la noter.', act: 'run' });

  // Re-test
  if (testDue()) out.push({ tone: 'info', title: 'Re-test du cycle', text: 'C’est la semaine du re-test : chaque exercice au maximum, 3 minutes de repos. C’est lui qui fait monter tes qualités et ton rang.' });
  else if (weekIdx() === 2) out.push({ tone: 'info', title: 'Re-test la semaine prochaine', text: 'Dernière semaine du cycle : pousse sur les séries principales, le re-test arrive.' });

  // Rang
  const ri = rankInfo();
  if (ri.next) {
    const low2 = ri.q.slice().sort((x, y) => x.score - y.score)[0];
    out.push({ tone: 'info', title: 'Vers le rang ' + ri.next.letter, text: 'Tu es à ' + Math.round(ri.ratio * 100) + ' % du chemin. Ta qualité la plus basse : ' + low2.name.toLowerCase() + ' (' + low2.letter + '). C’est elle qui fera monter ta moyenne le plus vite.', act: 'rank' });
  }
  return out;
}

// La phrase du jour sur l'accueil
export function coachCard() {
  const i = insights()[0];
  return '<section class="glass card coachcard tap" role="button" tabindex="0" data-act="coach"><span class="coachav">' + ICON.bolt + '</span><div class="col grow" style="gap:3px;min-width:0"><span class="label violet">Coach · ' + esc(i.title) + '</span><span class="small" style="color:var(--soft)">' + esc(i.text) + '</span></div>' + ICON.chev + '</section>';
}

// ---------- Les réponses aux questions ----------
const Q = [
  ['today', 'Que faire aujourd’hui ?'],
  ['short', 'J’ai seulement 15 minutes'],
  ['tired', 'Je suis fatigué'],
  ['stuck', 'Pourquoi je stagne ?'],
  ['rank', 'Comment monter de rang ?'],
  ['run', 'Courir plus vite'],
  ['week', 'Le bilan de ma semaine'],
  ['pain', 'J’ai mal quelque part'],
  ['food', 'Quoi manger ?'],
];

const btn = (act, label, extra, gold) => '<button type="button" class="pill sm ' + (gold ? 'gold-btn' : 'glass') + '" data-act="' + act + '"' + (extra || '') + '>' + label + '</button>';
const startBtn = (type, mode, label, gold) => btn('coach-go', label, ' data-type="' + type + '" data-mode="' + (mode || '') + '"', gold);

function answer(id, arg) {
  const ws = real(), now = Date.now(), t0 = day0(now);
  const st = streak();
  const type = testDue() ? 'test' : nextType();
  const name = TYPES[type] ? TYPES[type].label : 'Re-test';
  const rd = readiness(plan(type, ''));
  const doneToday = ws.some((w) => w.start >= t0);
  const restOk = st.todayDone || st.n === 0 || !st.danger;

  if (id === 'today') {
    if (doneToday) return { text: ['Tu t’es déjà entraîné aujourd’hui. Le plus utile maintenant : 3 minutes d’étirements, puis récupérer.', 'Si tu as encore de l’énergie, une série de pompes du jour ou une course facile, rien de plus.'], btns: [btn('cooldown', 'Retour au calme', '', true), btn('quick', 'Pompes du jour')] };
    if (rd.pct >= 85) return { text: ['Corps prêt à ' + rd.pct + ' %. Fais « ' + name + ' » en entier, environ ' + minutes(plan(type, ''), type === 'test') + ' minutes.', 'Vise une répétition de plus que la dernière fois sur les exercices principaux.'], btns: [startBtn(type, '', 'Commencer', true), startBtn(type, 'court', 'Version courte')] };
    if (rd.pct >= 65) return { text: ['Corps prêt à ' + rd.pct + ' %' + (rd.tired.length ? ' : ' + rd.tired.slice(0, 2).join(' et ') + ' encore un peu fatigués' : '') + '.', 'Fais « ' + name + ' » en version courte : tu gardes le rythme sans creuser la fatigue.'], btns: [startBtn(type, 'court', 'Version courte', true), startBtn(type, '', 'Séance entière')] };
    return { text: ['Ton corps est encore fatigué (' + rd.pct + ' %' + (rd.tired.length ? ', surtout ' + rd.tired.slice(0, 2).join(' et ') : '') + ').', restOk ? 'Tu peux te reposer aujourd’hui sans perdre ta flamme. Sinon, une course facile de 20 minutes fait du bien sans fatiguer le haut du corps.' : 'Ta flamme est en danger : une course facile ou 30 pompes du jour la gardent sans te fatiguer.'], btns: [btn('gps', 'Course facile', '', true), btn('cooldown', 'Étirements')] };
  }
  if (id === 'short') {
    const m = minutes(plan(type === 'test' ? nextType() : type, 'court'), false);
    return { text: ['En 15 minutes, fais du dense :', '1. Un Tabata en pompes (4 minutes), 2 minutes de pause, un Tabata en squats sautés, 2 minutes de pause, un dernier en dips sur le banc. Douze minutes qui piquent.', '2. Si tu peux tenir ' + m + ' minutes, la version courte de « ' + (TYPES[type] ? name : TYPES[nextType()].label) + ' » compte en plus pour ta semaine.'], btns: [btn('chrono2', 'Lancer le Tabata', '', true), startBtn(type === 'test' ? nextType() : type, 'court', 'Version courte')] };
  }
  if (id === 'tired') {
    const week = ws.filter((w) => now - w.start < 7 * DAY).length;
    const hard = ws.slice(0, 3).reduce((n, w) => n + w.exercises.filter((e) => e.feel === 'd').length, 0);
    const t = [];
    if (week >= 6) t.push('Tu as fait ' + week + ' séances en 7 jours : ta fatigue est normale. Un jour de repos te fera progresser plus qu’une séance de plus.');
    else if (hard >= 3) t.push('Tu as noté « très dur » ' + hard + ' fois sur tes dernières séances : c’est le signe qu’il faut alléger un peu.');
    else t.push('Tes séances récentes n’étaient pas trop lourdes : la fatigue vient peut-être du sommeil ou de la journée.');
    t.push(restOk ? 'Repos aujourd’hui : ta flamme tient' + (st.shields ? ', et tu as ' + plural(st.shields, 'bouclier', 'boucliers') + ' en réserve.' : '.') : 'Si tu veux garder ta flamme : 30 pompes du jour en plusieurs fois, et c’est tout.');
    t.push('Ce soir : un vrai repas, de l’eau, et au lit avant 23 h. Demain tu repars plus fort.');
    return { text: t, btns: [btn('cooldown', 'Étirements 3 min', '', true), btn('quick', 'Pompes du jour')] };
  }
  if (id === 'stuck') {
    const s = exoTrends().filter((x) => x.stuck);
    if (!s.length) {
      const g = exoTrends().filter((x) => x.n >= 3).sort((a, b) => b.gain - a.gain).slice(0, 2);
      return { text: ['Bonne nouvelle : tu ne stagnes sur aucun exercice en ce moment.'].concat(g.length ? ['Ça avance surtout sur ' + g.map((x) => exoName(x.name) + ' (+' + Math.round(x.gain * 100) + ' %)').join(' et ') + '.'] : []).concat(['Continue d’ajouter une répétition à chaque séance, c’est tout le secret.']) };
    }
    const t = ['Tu stagnes sur ' + s.slice(0, 3).map((x) => exoName(x.name)).join(', ') + '.'];
    for (const x of s.slice(0, 2)) t.push(exoName(x.name) + ' (meilleur récent : ' + showSet(x.name, x.last.best) + ') : ' + stuckTip(x).join(' '));
    t.push('Une stagnation de 2 ou 3 semaines, c’est normal. Le re-test de fin de cycle remet souvent tout en marche.');
    return { text: t };
  }
  if (id === 'rank') {
    const ri = rankInfo();
    if (!ri.next) return { text: ['Tu es au rang le plus haut. Il ne reste qu’à garder ton niveau.'] };
    const q = ri.q.slice().sort((x, y) => x.score - y.score);
    const t = ['Ton rang est la moyenne de tes 5 qualités. Tu es à ' + Math.round(ri.ratio * 100) + ' % du rang ' + ri.next.letter + '.'];
    t.push('Tes deux qualités les plus basses : ' + q.slice(0, 2).map((x) => x.name.toLowerCase() + ' (' + x.letter + ')').join(' et ') + '. Monter une lettre là-dessus vaut autant que deux ailleurs.');
    const todo = ri.tests.filter((x) => !x.done).slice(0, 3);
    if (todo.length) t.push('Les défis du rang ' + ri.next.letter + ' qui te restent : ' + todo.map((x) => x.label).join(' ; ') + '.');
    if (q[0].id === 'vitesse') t.push('Pour la vitesse : une course chronométrée de 5 km avec le GPS, même une seule fois, la fait monter.');
    return { text: t, btns: [btn('rank', 'Voir mon rang', '', true)] };
  }
  if (id === 'run') {
    const R = runs();
    if (!R.length) return { text: ['Aucune course enregistrée pour l’instant.', 'Commence par 3 km tranquilles avec le GPS : je pourrai ensuite te donner une allure à viser.'], btns: [btn('gps', 'Course GPS', '', true)] };
    const withT = R.filter((r) => r.t && r.d);
    const bestP = withT.length ? Math.min(...withT.map((r) => r.t / r.d)) : 0;
    const longest = Math.max(...R.map((r) => r.d));
    const t = ['Ta plus longue course : ' + fr(longest) + ' km.' + (bestP ? ' Ta meilleure allure : ' + clockP(bestP) + ' par km.' : '')];
    t.push('Pour courir plus vite, fais 2 courses différentes par semaine :');
    t.push('1. Une course facile, où tu peux parler (' + (bestP ? clockP(bestP + 60) : 'allure tranquille') + ' par km), un peu plus longue chaque semaine.');
    t.push('2. Des intervalles : 6 fois 1 minute vite et 1 minute en marchant. Le chrono « Intervalles » le fait pour toi.');
    if (bestP) t.push('Avec le lièvre du GPS réglé sur ' + clockP(bestP - 5) + ', tu peux battre ton record.');
    return { text: t, btns: [btn('gps', 'Course GPS', '', true), btn('chrono2', 'Intervalles')] };
  }
  if (id === 'week') {
    const mon = t0 - ((new Date().getDay() + 6) % 7) * DAY;
    const tw = ws.filter((w) => w.start >= mon), lw = ws.filter((w) => w.start >= mon - 7 * DAY && w.start < mon);
    const sets = (L) => L.reduce((n, w) => n + w.exercises.reduce((k, e) => k + e.sets.length, 0), 0);
    const prs = tw.reduce((n, w) => n + (w.prs || 0), 0);
    const km = tw.reduce((n, w) => n + w.exercises.filter((e) => e.name === 'Running').reduce((k, e) => k + e.sets.reduce((j, s) => j + (s.d || 0), 0), 0), 0);
    const t = [!tw.length ? 'Cette semaine : rien pour l’instant, objectif ' + plural(weekGoal(), 'séance', 'séances') + '.' : 'Cette semaine : ' + plural(tw.length, 'séance', 'séances') + ' sur ' + weekGoal() + ', ' + plural(sets(tw), 'série', 'séries') + (prs ? ', ' + plural(prs, 'record', 'records') : '') + (km ? ', ' + fr(km, 1) + ' km' : '') + '.'];
    const d = sets(tw) - sets(lw);
    t.push(lw.length ? 'La semaine dernière : ' + plural(sets(lw), 'série', 'séries') + '. ' + (d > 0 ? 'Tu en fais plus, bien.' : d < 0 ? 'Tu en fais moins pour l’instant.' : 'Pareil.') : 'Pas de séance la semaine dernière : tu as repris, c’est le plus dur.');
    t.push(st.n ? 'Ta flamme : ' + plural(st.n, 'jour', 'jours') + (st.shields ? ', ' + plural(st.shields, 'bouclier', 'boucliers') + ' en réserve.' : '.') : 'Ta flamme est éteinte : une séance aujourd’hui la rallume.');
    return { text: t };
  }
  if (id === 'pain') {
    if (!arg) return { text: ['Où as-tu mal ?'] };
    const avoid = { epaules: 'legs', poignets: 'legs', coudes: 'legs', genoux: 'dips', dos: 'push' }[arg];
    const lab = { epaules: 'aux épaules', poignets: 'aux poignets', coudes: 'aux coudes', genoux: 'aux genoux', dos: 'au dos' }[arg];
    const t = ['Mal ' + lab + ' : si la douleur est vive, gonflée, ou dure plus d’une semaine, va voir un médecin ou un kiné. Je ne remplace pas un avis médical.'];
    t.push('Une petite gêne : ne force pas dessus pendant quelques jours. Fais plutôt « ' + TYPES[avoid].label + ' », qui la sollicite peu.');
    if (arg === 'poignets') t.push('Pour les pompes, mets les mains sur tes haltères (poignets droits) au lieu de les poser à plat.');
    if (arg === 'epaules') t.push('Pour les pompes et les dips, garde les coudes près du corps et ne descends pas plus bas que ce qui ne fait pas mal.');
    if (arg === 'genoux') t.push('Évite les sauts et les pistols quelque temps ; marche plutôt que de courir.');
    if (arg === 'dos') t.push('Gainage serré à chaque exercice, pas de russian twist ni de rowing lourd pour l’instant.');
    return { text: t, btns: [startBtn(avoid, 'court', TYPES[avoid].label + ' courte', true)] };
  }
  if (id === 'food') {
    const bw = (state.body && state.body.length) ? state.body.slice().sort((a, b) => b.d - a.d)[0].kg : null;
    const p = bw ? Math.round(bw * 1.6) : null;
    return { text: [(p ? 'Avec ' + fr(bw, 1) + ' kg, vise environ ' + p + ' g de protéines par jour.' : 'Vise environ 1,6 g de protéines par kilo de ton poids, chaque jour (note ton poids dans Progrès pour que je le calcule).'), 'Où en trouver : œufs (6 g chacun), poulet ou thon (25 g pour 100 g), fromage blanc (8 g pour 100 g), lentilles, lait.', 'Après la séance : un vrai repas dans les 2 heures, avec des protéines et des féculents (riz, pâtes, pain).', 'Et de l’eau : un grand verre avant, pendant et après.'] };
  }
  return { text: ['Je n’ai pas compris.'] };
}
const clockP = (s) => { s = Math.round(s); return Math.floor(s / 60) + "'" + String(s % 60).padStart(2, '0'); };

// ---------- La fenêtre du coach ----------
let chat = [];
function bubble(m) {
  if (m.me) return '<div class="cb me">' + esc(m.text) + '</div>';
  return '<div class="cb">' + m.text.map((p) => '<p>' + esc(p) + '</p>').join('') + (m.btns ? '<div class="row wrap" style="gap:8px;margin-top:8px">' + [].concat(m.btns).join('') + '</div>' : '') + '</div>';
}
function draw(typing) {
  const L = insights();
  let h = '<div class="row" style="gap:12px;align-items:center"><span class="coachav big">' + ICON.bolt + '</span><div class="col" style="gap:2px"><span class="label violet">D’après tes ' + plural(real().length, 'séance', 'séances') + '</span><h1 class="h1">Coach</h1></div></div>';
  h += '<div class="col" style="gap:10px">' + L.slice(0, 5).map((i) => '<div class="tip ' + i.tone + (i.act ? ' tap' : '') + '"' + (i.act ? ' role="button" tabindex="0" data-act="coach-ask" data-q="' + i.act + '"' : '') + '><i></i><div class="col grow" style="gap:2px"><span style="font-weight:700">' + esc(i.title) + '</span><span class="small" style="color:var(--soft)">' + esc(i.text) + '</span></div>' + (i.act ? ICON.chev : '') + '</div>').join('') + '</div>';
  h += '<span class="label">Demande au coach</span><div class="chat" id="coachchat">' + chat.map(bubble).join('') + (typing ? '<div class="cb typing"><i></i><i></i><i></i></div>' : '') + '</div>';
  h += '<div class="row wrap" style="gap:8px">' + Q.map(([k, l]) => '<button type="button" class="pill sm glass" data-act="coach-ask" data-q="' + k + '">' + l + '</button>').join('') + '</div>';
  h += '<span class="small dim">Le coach lit seulement tes données, dans ton téléphone, sans internet. Ce n’est pas un avis médical.</span>';
  sheet(h, 1, 'full');
  const c = $('coachchat'); if (c && chat.length) { const last = c.lastElementChild; if (last) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

function ask(id, arg, label) {
  if (id === 'quick' || id === 'prog') { ACTIONS[id](); return; }
  const q = Q.find((x) => x[0] === id);
  chat.push({ me: true, text: label || (q ? q[1] : '') });
  let a = answer(id, arg);
  if (id === 'pain' && !arg) a = { text: ['Où as-tu mal ?'], btns: [['epaules', 'Épaules'], ['poignets', 'Poignets'], ['coudes', 'Coudes'], ['genoux', 'Genoux'], ['dos', 'Dos']].map(([k, l]) => btn('coach-ask', l, ' data-q="pain" data-arg="' + k + '" data-l="' + l + '"')).join('') };
  draw(true);
  setTimeout(() => { if (!$('coachchat')) return; chat.push(a); draw(false); }, 550);
}

Object.assign(ACTIONS, {
  coach: () => { chat = []; draw(false); },
  'coach-ask': (el) => ask(el.dataset.q, el.dataset.arg, el.dataset.l),
  'coach-go': (el) => { ACTIONS['prog-start'](el); },
});
