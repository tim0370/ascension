// Coach : lit tout ton historique et te parle comme un entraîneur. Tout est calculé dans le téléphone,
// sans internet ni IA : forme du matin, charge, douleurs, stagnation, records prévus, ce qui te réussit,
// régularité, équilibre, course, rang. Les phrases changent d'un jour à l'autre.
import { state, sorted, exoName, runs, weekGoal, weekQuest, dur, fr, pace } from './store.js';
import { EXOS, FICHES } from './data.js';
import { esc, plural, ACTIONS, ICON, sheet, $ } from './ui.js';
import { TYPES, nextType, plan, testDue, minutes, weekIdx, weakQuality } from './programme.js';
import { forme, charge, lightAdvice, lightWeek, activePains, PAINS, predictions, predLine, reussites } from './forme.js';
import { weekPlan } from './semaine.js';
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

// Une phrase parmi plusieurs, qui change chaque jour (pour ne pas lire toujours la même chose).
const seed = () => Math.floor(Date.now() / DAY);
const pick = (arr, k) => arr[(seed() + (k || 0)) % arr.length];
const label = (t) => (TYPES[t] ? TYPES[t].label : 'le re-test');

// ---------- Les constats du coach (du plus important au moins important) ----------
export function insights() {
  const out = [];
  const ws = real();
  if (!ws.length) return [{ tone: 'info', title: 'On commence', text: 'Fais ta première séance du programme : je pourrai ensuite lire tes progrès et te conseiller.', act: 'prog' }];
  const now = Date.now(), t0 = day0(now);
  const st = streak();
  const type = testDue() ? 'test' : nextType();
  const f = forme(plan(type, ''));
  const doneToday = ws.some((w) => w.start >= t0);
  const since = Math.floor((t0 - day0(ws[0].start)) / DAY);
  const P = activePains();

  // Aujourd'hui
  if (P.length) out.push({ tone: 'warn', title: 'Douleur : ' + P.map((p) => PAINS[p.z].toLowerCase()).join(' et '), text: 'Tes séances évitent les exercices qui la sollicitent. Si ça dure plus d’une semaine, montre-la à un médecin ou un kiné.', act: 'pain' });
  if (doneToday) out.push({ tone: 'good', title: 'Séance faite', text: pick(['C’est fait pour aujourd’hui. Mange des protéines, bois, et dors au moins 8 heures : c’est là que le muscle se construit.', 'Bien joué. Le progrès se fait maintenant, pendant la récupération : un vrai repas et une bonne nuit.', 'Séance dans la boîte. Ce soir : protéines, eau, et au lit pas trop tard.']) });
  else if (!f.ci && new Date().getHours() < 14) out.push({ tone: 'info', title: 'Ton bilan du matin', text: 'Quatre touches pour savoir comment tu as dormi et récupéré. Sans lui, ton score de forme n’est qu’une estimation.', act: 'checkin' });
  if (!doneToday) {
    if (f.mode === 'leger') out.push({ tone: 'warn', title: 'Forme ' + f.score + ' %', text: (lightWeek() ? 'Semaine légère : ' : '') + 'J’ai allégé « ' + label(type) + ' » (une série de moins partout). ' + pick(['Mieux vaut une séance propre qu’une séance forcée.', 'Tu gardes le rythme sans creuser la fatigue.', 'Demain tu repartiras plus fort.']), act: 'forme' });
    else if (f.mode === 'record') { const pr = predictions().find((x) => plan(type, '').some((e) => e.name === x.name)) || predictions()[0]; out.push({ tone: 'good', title: 'Jour de record', text: 'Forme ' + f.score + ' %, tout est au vert.' + (pr ? ' Vise ' + exoName(pr.name) + ' : ' + pr.text + ' aujourd’hui.' : ' Donne tout sur les exercices principaux.'), act: 'today' }); }
    else if (since >= 3) out.push({ tone: 'warn', title: plural(since, 'jour', 'jours') + ' sans séance', text: pick(['Pas besoin d’une grosse séance pour repartir : la version courte suffit aujourd’hui.', 'Le plus dur, c’est de reprendre. 20 minutes, et la machine est relancée.']), act: 'today' });
    else out.push({ ready: true, tone: 'good', title: 'Forme ' + f.score + ' %', text: 'Bon jour pour « ' + label(type) + ' » en entier.', act: 'today' });
  }
  const adv = lightAdvice();
  if (adv) out.push({ tone: 'warn', title: 'Semaine plus légère conseillée', text: adv, act: 'light' });
  if (st.danger && !st.lost) out.push({ tone: 'warn', title: 'Flamme en danger', text: 'Encore ' + plural(st.need, 'séance', 'séances') + ' en ' + plural(st.left, 'jour', 'jours') + ' pour garder ta flamme de ' + plural(st.n, 'semaine', 'semaines') + '. Les séances courtes comptent.', act: 'today' });

  // Records prévus et progrès
  const tr = exoTrends();
  const pr = predictions().filter((x) => !tr.some((t) => t.stuck && t.name === x.name));
  if (pr.length && f.mode !== 'record') out.push({ tone: 'good', title: 'Prochain record', text: predLine(pr[0]) + ', si tu gardes ce rythme.', act: 'record' });
  const best = tr.filter((t) => t.n >= 3 && t.gain >= 0.1 && !t.stuck).sort((a, b) => b.gain - a.gain)[0];
  if (best) out.push({ tone: 'good', title: 'Ton plus gros progrès', text: exoName(best.name) + ' : de ' + showSet(best.name, best.first.best) + ' à ' + showSet(best.name, best.recent.find((x) => amount(x.best) === best.rBest).best) + ' en ' + plural(Math.max(1, Math.round((best.last.date - best.first.date) / (7 * DAY))), 'semaine', 'semaines') + ' (+' + Math.round(best.gain * 100) + ' %).' });
  const stuck = tr.filter((t) => t.stuck).sort((a, b) => b.n - a.n);
  if (stuck.length) out.push({ tone: 'warn', title: 'Tu stagnes sur ' + exoName(stuck[0].name), text: 'Pas mieux que ' + showSet(stuck[0].name, stuck[0].last.best) + ' sur tes 3 dernières séances. ' + stuckTip(stuck[0])[0], act: 'stuck' });

  // Ce qui te réussit
  const R = reussites();
  if (R.length && !/^Il me faut|^Pas de grosse/.test(R[0])) out.push({ tone: 'info', title: 'Ce qui te réussit', text: pick(R), act: 'success' });

  // Régularité de la semaine
  const wq = weekQuest();
  if (wq.done) out.push({ tone: 'good', title: 'Semaine réussie', text: wq.cur + ' sur ' + wq.goal + ' séances. Tout ce que tu fais en plus, c’est du bonus.' });

  // Équilibre
  const b = balance();
  const up = b.push + b.pull, low = b.legs;
  if (b.push > 30 && b.pull * 3 < b.push) out.push({ tone: 'warn', title: 'Dos en retard', text: 'Sur 4 semaines : ' + b.push + ' séries de poussée pour ' + b.pull + ' de tirage. Le rowing protège tes épaules : ne saute pas « Dips et dos ».' });
  if (up > 30 && low * 3 < up) out.push({ tone: 'warn', title: 'Jambes en retard', text: 'Sur 4 semaines : ' + up + ' séries pour le haut du corps, ' + low + ' pour les jambes. Ne saute pas « Jambes et abdos ».' });

  // Course
  const Rn = runs();
  if (Rn.length >= 2) {
    const a = Rn[0], prev = Rn.slice(1, 6).filter((r) => r.t && r.d);
    if (a.t && a.d && prev.length) {
      const avg = prev.reduce((k, r) => k + r.t / r.d, 0) / prev.length;
      const diff = Math.round(avg - a.t / a.d);
      if (Math.abs(diff) >= 5) out.push({ tone: diff > 0 ? 'good' : 'info', title: 'Course', text: 'Ta dernière course : ' + pace(a.d, a.t) + ', soit ' + Math.abs(diff) + ' s par km ' + (diff > 0 ? 'plus vite' : 'plus lent') + ' que ta moyenne.', act: 'run' });
    }
  } else if (!Rn.length) out.push({ tone: 'info', title: 'Vitesse', text: 'Sans course enregistrée, ta qualité « vitesse » reste au plus bas. Une course de 3 km avec le GPS suffit pour la noter.', act: 'run' });

  // Re-test et rang
  if (testDue()) out.push({ tone: 'info', title: 'Re-test du cycle', text: 'C’est la semaine du re-test : chaque exercice au maximum, 3 minutes de repos. C’est lui qui fait monter tes qualités et ton rang.' });
  else if (weekIdx() === 2) out.push({ tone: 'info', title: 'Re-test la semaine prochaine', text: 'Dernière semaine du cycle : pousse sur les séries principales.' });
  const ri = rankInfo();
  if (ri.next) { const q = weakQuality(); out.push({ tone: 'info', title: 'Vers le rang ' + ri.next.letter, text: 'Tu es à ' + Math.round(ri.ratio * 100) + ' % du chemin. Ton point faible : ' + q.name.toLowerCase() + ' (' + q.letter + '). Ta séance point faible de la semaine le cible.', act: 'weak' }); }
  return out;
}

// La phrase du jour sur l'accueil (la forme a déjà sa carte au-dessus)
export function coachCard() {
  const L = insights();
  const i = L.find((x) => !x.ready && x.act !== 'checkin' && x.act !== 'forme') || L[0];
  return '<section class="glass card coachcard tap tint t-cyan" role="button" tabindex="0" data-act="coach"><span class="coachav">' + ICON.bolt + '</span><div class="col grow" style="gap:3px;min-width:0"><span class="label violet">Coach · ' + esc(i.title) + '</span><span class="small" style="color:var(--soft)">' + esc(i.text) + '</span></div>' + ICON.chev + '</section>';
}

// ---------- Les réponses aux questions ----------
const Q = [
  ['today', 'Que faire aujourd’hui ?'],
  ['forme', 'Pourquoi ce score de forme ?'],
  ['short', 'J’ai seulement 15 minutes'],
  ['tired', 'Je suis fatigué'],
  ['sleep', 'J’ai mal dormi'],
  ['motiv', 'Pas motivé'],
  ['record', 'Mon prochain record'],
  ['stuck', 'Pourquoi je stagne ?'],
  ['weak', 'Mon point faible'],
  ['success', 'Ce qui me réussit'],
  ['rank', 'Comment monter de rang ?'],
  ['muscle', 'Prendre du muscle'],
  ['run', 'Courir plus vite'],
  ['week', 'Ma semaine'],
  ['light', 'Dois-je lever le pied ?'],
  ['pain', 'J’ai mal quelque part'],
  ['food', 'Quoi manger ?'],
];

const btn = (act, lab, extra, gold) => '<button type="button" class="pill sm ' + (gold ? 'gold-btn' : 'glass') + '" data-act="' + act + '"' + (extra || '') + '>' + lab + '</button>';
const startBtn = (type, mode, lab, gold) => btn('coach-go', lab, ' data-type="' + type + '" data-mode="' + (mode || '') + '"', gold);
const PAIN_ON = { epaules: 'tes épaules', poignets: 'tes poignets', coudes: 'tes coudes', genoux: 'tes genoux', dos: 'ton bas du dos', chevilles: 'tes chevilles' };

function answer(id, arg) {
  const ws = real(), now = Date.now(), t0 = day0(now);
  const st = streak();
  const type = testDue() ? 'test' : nextType();
  const rot = type === 'test' || type === 'faible' ? 'push' : type;
  const name = label(type);
  const f = forme(plan(type, ''));
  const doneToday = ws.some((w) => w.start >= t0);
  const restOk = st.weekDone || st.n === 0 || !st.danger;

  if (id === 'today') {
    if (doneToday) return { text: ['Tu t’es déjà entraîné aujourd’hui. Le plus utile maintenant : 3 minutes d’étirements, puis récupérer.', 'Si tu as encore de l’énergie, des pompes du jour ou une course facile, rien de plus.'], btns: [btn('cooldown', 'Retour au calme', '', true), btn('quick', 'Pompes du jour')] };
    const pl = weekPlan().days.find((d) => d.today);
    const pre = (f.est ? 'Forme estimée à ' : 'Forme ') + f.score + ' % (' + f.word.toLowerCase() + ').';
    if (pl && pl.kind === 'repos' && f.score < 60) return { text: [pre, 'Ton plan de la semaine prévoit du repos aujourd’hui, et c’est le bon choix. ' + (restOk ? 'Ta flamme ne risque rien.' : 'Attention, ta flamme est juste : une séance courte demain.'), 'Si tu as envie de bouger : 3 minutes d’étirements ou une marche.'], btns: [btn('cooldown', 'Étirements', '', true), btn('plan', 'Ma semaine')] };
    if (f.mode === 'record') return { text: [pre + ' Tout est au vert.', 'Fais « ' + name + ' » en entier et attaque un record sur le premier exercice principal, quand tu es le plus frais.'].concat(predictions().slice(0, 1).map((p) => 'D’après ta courbe : ' + predLine(p) + '.')), btns: [startBtn(type, '', 'Commencer', true), btn('coach-ask', 'Mes records prévus', ' data-q="record"')] };
    if (f.mode === 'leger') return { text: [pre + (f.muscles.tired.length ? ' Encore fatigués : ' + f.muscles.tired.slice(0, 2).join(' et ') + '.' : ''), 'Fais « ' + name + ' » en version allégée : une série de moins partout. Tu gardes le rythme sans creuser la fatigue.', restOk ? 'Ou repose-toi : ta flamme tient.' : 'Ta flamme est juste : la version allégée la garde.'], btns: [startBtn(type, 'leger', 'Version allégée', true), btn('gps', 'Course facile')] };
    return { text: [pre, 'Fais « ' + name + ' » en entier, environ ' + minutes(plan(type, ''), type === 'test') + ' minutes.', 'Vise une répétition de plus que la dernière fois sur les exercices principaux.'], btns: [startBtn(type, '', 'Commencer', true), startBtn(type, 'court', 'Version courte')] };
  }
  if (id === 'forme') {
    const t = [(f.est ? 'Score estimé : ' : 'Ton score : ') + f.score + ' sur 100, ' + f.word.toLowerCase() + '.'];
    const S = f.parts.slice().sort((a, b) => a.pts / a.max - b.pts / b.max);
    const lo = S[0], hi = S[S.length - 1];
    t.push('Ce qui te freine le plus : ' + lo.name.toLowerCase() + ', ' + lo.pts + ' points sur ' + lo.max + ' (' + lo.txt.charAt(0).toLowerCase() + lo.txt.slice(1).replace(/\.$/, '') + ').');
    t.push('Ce qui va le mieux : ' + hi.name.toLowerCase() + ', ' + hi.pts + ' points sur ' + hi.max + '.');
    if (f.est) t.push('Fais ton bilan du matin : sommeil, courbatures, énergie et stress comptent pour la moitié du score.');
    t.push(f.advice);
    return { text: t, btns: [btn('forme', 'Voir le détail', '', true)].concat(f.est ? [btn('checkin', 'Bilan du matin')] : []) };
  }
  if (id === 'short') {
    const m = minutes(plan(rot, 'court'), false);
    return { text: ['En 15 minutes, fais du dense :', '1. Un Tabata en pompes (4 minutes), 2 minutes de pause, un Tabata en squats sautés, 2 minutes de pause, un dernier en dips sur le banc. Douze minutes qui piquent.', '2. Si tu peux tenir ' + m + ' minutes, la version courte de « ' + label(rot) + ' » compte en plus pour ta semaine et ta flamme.'], btns: [btn('chrono2', 'Lancer le Tabata', '', true), startBtn(rot, 'court', 'Version courte')] };
  }
  if (id === 'tired' || id === 'sleep') {
    const week = ws.filter((w) => now - w.start < 7 * DAY).length;
    const hard = ws.slice(0, 3).reduce((n, w) => n + w.exercises.filter((e) => e.feel === 'd').length, 0);
    const c = charge();
    const t = [];
    if (id === 'sleep') t.push(pick(['Une mauvaise nuit fait baisser la force de quelques pour cent, pas plus : tu peux t’entraîner, mais pas chercher un record.', 'Après une nuit courte, ton corps récupère moins bien. Garde la séance, enlève l’intensité.']));
    if (c.ratio && c.ratio > 1.3) t.push('Ta charge des 7 derniers jours est ' + Math.round((c.ratio - 1) * 100) + ' % au-dessus de ta moyenne : ta fatigue est logique.');
    else if (week >= 6) t.push('Tu as fait ' + week + ' séances en 7 jours : ta fatigue est normale. Un jour de repos te fera progresser plus qu’une séance de plus.');
    else if (hard >= 3) t.push('Tu as noté « très dur » ' + hard + ' fois sur tes dernières séances : c’est le signe qu’il faut alléger un peu.');
    else if (id === 'tired') t.push('Tes séances récentes n’étaient pas trop lourdes : la fatigue vient sûrement du sommeil ou de la journée.');
    t.push(restOk ? 'Repos aujourd’hui : ta flamme tient' + (st.shields ? ', et tu as ' + plural(st.shields, 'bouclier', 'boucliers') + ' en réserve.' : '.') : 'Ta flamme est juste cette semaine : une séance allégée suffit à la garder.');
    t.push(id === 'sleep' ? 'Ce soir : écran coupé 30 minutes avant, chambre fraîche, même heure de coucher que d’habitude. Une sieste de 20 minutes avant 16 h aide aussi.' : 'Ce soir : un vrai repas, de l’eau, et au lit avant 23 h. Demain tu repars plus fort.');
    return { text: t, btns: [startBtn(type === 'test' ? rot : type, 'leger', 'Séance allégée', true), btn('cooldown', 'Étirements')] };
  }
  if (id === 'motiv') {
    const pr = predictions()[0];
    const t = [pick(['La motivation vient en faisant, pas avant. Promets-toi juste l’échauffement : si après 5 minutes tu veux arrêter, tu arrêtes.', 'Personne n’est motivé tous les jours. Les plus forts ont juste une règle : on ne rate jamais deux fois de suite.', 'Pas besoin d’envie pour 15 minutes. Lance la version courte, mets ta musique, et vois où ça te mène.'])];
    if (st.n) t.push('Ta flamme : ' + plural(st.n, 'semaine', 'semaines') + '. ' + (st.weekDone ? 'Cette semaine est déjà validée, tout ce que tu fais est du bonus.' : 'Encore ' + plural(st.need, 'séance', 'séances') + ' pour la garder.'));
    if (pr) t.push('Et un record t’attend : ' + predLine(pr) + '.');
    return { text: t, btns: [startBtn(type === 'test' ? rot : type, 'court', 'Version courte', true), btn('chrono2', 'Tabata')] };
  }
  if (id === 'record') {
    const pr = predictions();
    if (!pr.length) return { text: ['Je n’ai pas encore assez de points pour prévoir un record : il me faut un exercice fait au moins 4 fois ces dernières semaines, avec le même lest, qui progresse.', 'Continue le programme : la courbe apparaît vite.'] };
    return { text: ['D’après la courbe de tes dernières séances :'].concat(pr.slice(0, 4).map((p) => predLine(p) + '.'), ['Ce sont des prévisions : une bonne nuit et une forme au vert les font arriver plus tôt.']), btns: [btn('forme', 'Ma forme', '', true)] };
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
  if (id === 'weak') {
    const q = weakQuality();
    const all = rankInfo().q.slice().sort((a, b) => a.score - b.score);
    const t = ['Tes qualités, de la plus basse à la plus haute : ' + all.map((x) => x.name.toLowerCase() + ' ' + x.letter).join(', ') + '.'];
    t.push('Ta séance point faible vise ' + q.name.toLowerCase() + ' : elle arrive une fois par semaine, après 2 séances du programme.');
    if (all[0].id === 'vitesse') t.push('La vitesse, elle, se travaille en courant : le dimanche, cours 3 à 5 km en tenant une allure un peu plus rapide que d’habitude.');
    t.push('Monter une lettre sur ta qualité la plus basse fait grimper ton rang plus vite que deux lettres ailleurs.');
    return { text: t, btns: [btn('prog', 'Voir la séance', ' data-type="faible"', true)] };
  }
  if (id === 'success') return { text: reussites(), btns: [btn('forme', 'Ma forme', '', true)] };
  if (id === 'rank') {
    const ri = rankInfo();
    if (!ri.next) return { text: ['Tu es au rang le plus haut. Il ne reste qu’à garder ton niveau.'] };
    const q = ri.q.slice().sort((x, y) => x.score - y.score);
    const t = ['Ton rang est la moyenne de tes 5 qualités. Tu es à ' + Math.round(ri.ratio * 100) + ' % du rang ' + ri.next.letter + '.'];
    t.push('Tes deux qualités les plus basses : ' + q.slice(0, 2).map((x) => x.name.toLowerCase() + ' (' + x.letter + ')').join(' et ') + '. Monter une lettre là-dessus vaut autant que deux ailleurs.');
    const todo = ri.tests.filter((x) => !x.done).slice(0, 3);
    if (todo.length) t.push('Les défis du rang ' + ri.next.letter + ' qui te restent : ' + todo.map((x) => x.label).join(' ; ') + '.');
    return { text: t, btns: [btn('rank', 'Voir mon rang', '', true)] };
  }
  if (id === 'muscle') {
    const bw = (state.body && state.body.length) ? state.body.slice().sort((a, b) => b.d - a.d)[0].kg : null;
    return { text: ['Pour prendre du muscle au poids du corps, trois règles :', '1. Entre 8 et 15 répétitions par série, en t’arrêtant 1 ou 2 répétitions avant l’échec. Au-delà de 15, mets le gilet lesté ou passe à l’exercice plus dur : le programme le fait déjà.', '2. Entre 10 et 20 séries par muscle et par semaine. La carte du corps (onglet Progrès, mode Semaine) te montre où tu en es.', '3. Manger assez : ' + (bw ? 'environ ' + Math.round(bw * 1.6) + ' g de protéines par jour pour ' + fr(bw, 1) + ' kg' : '1,6 g de protéines par kilo') + ', et un peu plus de calories que tu n’en dépenses.', 'Compte 2 à 3 mois pour voir la différence dans le miroir : les photos de suivi te le prouveront.'], btns: [btn('photos', 'Photos de suivi', '', true)] };
  }
  if (id === 'run') {
    const R = runs();
    if (!R.length) return { text: ['Aucune course enregistrée pour l’instant.', 'Commence par 3 km tranquilles avec le GPS : je pourrai ensuite te donner une allure à viser.'], btns: [btn('gps', 'Course GPS', '', true)] };
    const withT = R.filter((r) => r.t && r.d);
    const bestP = withT.length ? Math.min(...withT.map((r) => r.t / r.d)) : 0;
    const longest = Math.max(...R.map((r) => r.d));
    const t = ['Ta plus longue course : ' + fr(longest) + ' km.' + (bestP ? ' Ta meilleure allure : ' + clockP(bestP) + ' par km.' : '')];
    t.push('Pour courir plus vite, alterne 2 courses :');
    t.push('1. Une course facile, où tu peux parler (' + (bestP ? clockP(bestP + 60) : 'allure tranquille') + ' par km), un peu plus longue chaque semaine.');
    t.push('2. Des intervalles : 6 fois 1 minute vite et 1 minute en marchant. Le chrono « Intervalles » le fait pour toi.');
    if (bestP) t.push('Avec le lièvre du GPS réglé sur ' + clockP(bestP - 5) + ', tu peux battre ton record.');
    return { text: t, btns: [btn('gps', 'Course GPS', '', true), btn('chrono2', 'Intervalles')] };
  }
  if (id === 'week') {
    const P = weekPlan();
    const nextD = P.days.filter((d) => !d.past && !d.done.length && (d.kind === 'seance' || d.kind === 'course'));
    const t = [P.doneN + ' sur ' + plural(P.goal, 'séance', 'séances') + ' cette semaine' + (P.doneN >= P.goal ? ' : objectif atteint.' : '.')];
    if (nextD.length) t.push('Ton plan : ' + nextD.map((d) => d.name.toLowerCase() + ', ' + d.label.charAt(0).toLowerCase() + d.label.slice(1)).join(' ; ') + '.');
    const c = charge();
    if (c.ratio !== null) t.push('Ta charge sur 7 jours : ' + c.acute + ' points, pour ' + c.chronic + ' en moyenne.');
    t.push(st.n ? 'Ta flamme : ' + plural(st.n, 'semaine', 'semaines') + (st.shields ? ', ' + plural(st.shields, 'bouclier', 'boucliers') + ' en réserve.' : '.') : 'Ta flamme est éteinte : finis ton objectif cette semaine pour l’allumer.');
    return { text: t, btns: [btn('plan', 'Ma semaine', '', true), btn('lundi', 'Semaine dernière')] };
  }
  if (id === 'light') {
    const adv = lightAdvice();
    const c = charge();
    if (lightWeek()) return { text: ['Tu es déjà en semaine légère : une série de moins partout jusqu’à dimanche.', 'Lundi, tout revient à la normale, et tu devrais te sentir plus fort.'] };
    if (adv) return { text: [adv, 'Une semaine légère, ce n’est pas une semaine perdue : c’est là que le corps rattrape le travail des semaines dures.'], btns: [btn('light-on', 'Passer en semaine légère', '', true)] };
    return { text: ['Non, tout va bien.' + (c.ratio !== null ? ' Ta charge des 7 derniers jours (' + c.acute + ' points) est proche de ta moyenne (' + c.chronic + ').' : ''), 'Je te préviendrai si elle grimpe trop vite ou si tes bilans du matin baissent plusieurs jours de suite. Et la 4e semaine de chaque cycle (le re-test) sert déjà à souffler.'] };
  }
  if (id === 'pain') {
    if (!arg) return { text: ['Où as-tu mal ?'] };
    state.pains = (state.pains || []).filter((p) => p.z !== arg);
    state.pains.push({ z: arg, d: Date.now(), since: Date.now(), n: 1 });
    save();
    const t = ['C’est noté. Pendant 7 jours, ton programme retire ou remplace les exercices qui sollicitent ' + PAIN_ON[arg] + '. Je te redemanderai si ça va mieux.'];
    if (arg === 'poignets') t.push('Quand ça ira mieux, pour les pompes : mains sur tes haltères (poignets droits) plutôt qu’à plat.');
    if (arg === 'epaules') t.push('Quand tu reprendras pompes et dips : coudes près du corps, et ne descends pas plus bas que ce qui ne fait pas mal.');
    if (arg === 'genoux') t.push('Évite les sauts et les pistols quelque temps ; marche plutôt que de courir.');
    if (arg === 'dos') t.push('Gainage serré à chaque exercice, pas de russian twist ni de rowing lourd pour l’instant.');
    if (arg === 'chevilles') t.push('Pas de course ni de sauts : marche ou vélo si tu veux bouger.');
    t.push('Douleur vive, gonflement, ou qui dure plus d’une semaine : médecin ou kiné. Je ne remplace pas un avis médical.');
    import('./app.js').then((a) => a.render());
    return { text: t, btns: [btn('prog', 'Voir ma séance adaptée', '', true)] };
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
  if (['quick', 'prog', 'checkin'].includes(id)) { ACTIONS[id]({ dataset: {} }); return; }
  const q = Q.find((x) => x[0] === id);
  chat.push({ me: true, text: label || (q ? q[1] : '') });
  let a = answer(id, arg);
  if (id === 'pain' && !arg) a = { text: ['Où as-tu mal ? Pendant 7 jours, je retirerai de tes séances les exercices qui sollicitent cette zone.'], btns: Object.keys(PAINS).map((k) => btn('coach-ask', PAINS[k], ' data-q="pain" data-arg="' + k + '" data-l="' + PAINS[k] + '"')).join('') };
  draw(true);
  setTimeout(() => { if (!$('coachchat')) return; chat.push(a); draw(false); }, 550);
}

Object.assign(ACTIONS, {
  coach: () => { chat = []; draw(false); },
  'coach-ask': (el) => ask(el.dataset.q, el.dataset.arg, el.dataset.l),
  'coach-go': (el) => { ACTIONS['prog-start'](el); },
});
