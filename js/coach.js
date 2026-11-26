// Coach : lit tout ton historique et te parle comme un entraîneur. Tout est calculé dans le téléphone,
// sans internet ni IA : forme du matin, charge, douleurs, stagnation, records prévus, ce qui te réussit,
// régularité, équilibre, course, rang. Les phrases changent d'un jour à l'autre.
import { state, save, sorted, exoName, runs, weekGoal, weekQuest, dur, fr, pace, lastSets, exoHistory, measureOf } from './store.js';
import { EXOS, FICHES } from './data.js';
import { esc, plural, ui, ACTIONS, ICON, sheet, $ } from './ui.js';
import { TYPES, nextType, plan, testDue, minutes, weekIdx, weakQuality, isBeginner, STEPS, stepReady, stepStall, curStep, nextStep } from './programme.js';
import { forme, charge, lightAdvice, lightWeek, activePains, PAINS, predictions, predLine, reussites, baseOf } from './forme.js';
import { tally } from './bilan.js';
import { understand, closest, resetCtx, clean } from './cerveau.js';
import { weekPlan } from './semaine.js';
import { bodyStats, ZONES, musclesOf } from './corps.js';
import { rankInfo, balance, bodyLog } from './stats.js';
import { streak } from './quetes.js';
import { status as p30status, dayPlan as p30plan, goalOf } from './prog30.js';

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
  // Date du dernier changement d'étape de chaque exercice du programme A/B (plus lourd ou plus lent).
  const at = state.settings.stepAt || {}, since = {};
  for (const k of Object.keys(STEPS)) { const n = curStep(k).n; if (at[k]) since[n] = Math.max(since[n] || 0, at[k]); }
  for (const name of Object.keys(by)) {
    const all = by[name]; // du plus récent au plus ancien
    if (now - all[0].date > 21 * DAY) continue; // plus fait depuis 3 semaines : abandonné
    // On ne compare que ce qui se compare : même lest et même étape que la dernière séance.
    // Sinon, passer de 15 kg × 12 à 20 kg × 6 passerait pour une baisse alors que c'est un progrès.
    const w0 = all[0].best.w || 0;
    let L = all;
    const cut = all.findIndex((x) => (x.best.w || 0) !== w0 || x.date < (since[name] || 0));
    if (cut > 0) L = all.slice(0, cut);
    const recent = L.slice(0, 3), before = L.slice(3);
    const rBest = Math.max(...recent.map((x) => amount(x.best)));
    const bBest = before.length ? Math.max(...before.map((x) => amount(x.best))) : 0;
    const first = all[all.length - 1];
    const gain = amount(first.best) ? (Math.max(...all.slice(0, 3).map((x) => amount(x.best))) - amount(first.best)) / amount(first.best) : 0;
    const stuck = L.length >= 5 && rBest <= bBest;
    const slow = !stuck && L.length >= 3 && now - L[0].date < 10 * DAY && amount(L[0].best) <= amount(L[2].best) && amount(L[1].best) <= amount(L[2].best);
    out.push({ name, n: L.length, last: L[0], recent, rBest, bBest, stuck, slow, ref: L[2], gain, first, hard: recent.filter((x) => x.feel === 'd').length });
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
  else if (!f.ci && new Date().getHours() < 14) out.push({ tone: 'info', title: 'Ton bilan du matin', text: 'Une minute et demie : tes heures de sommeil, ton pouls au repos et ta réaction disent comment tu as récupéré. Sans lui, ton score de forme n’est qu’une estimation.', act: 'checkin' });
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
  // Programme A/B : les exercices à étapes ont leur propre suivi (« Bloqué sur… », plus bas), avec la bonne méthode.
  const ownStep = (n) => !isBeginner() && Object.keys(STEPS).some((k) => STEPS[k].steps.some((x) => x.n === n));
  const stuck = tr.filter((t) => t.stuck && !ownStep(t.name)).sort((a, b) => b.n - a.n);
  if (stuck.length) out.push({ tone: 'warn', title: 'Tu stagnes sur ' + exoName(stuck[0].name), text: 'Pas mieux que ' + showSet(stuck[0].name, stuck[0].last.best) + ' sur tes 3 dernières séances. ' + stuckTip(stuck[0])[0], act: 'stuck' });

  const slow = tr.filter((t) => t.slow && !ownStep(t.name)).sort((a, b) => b.n - a.n)[0];
  if (slow) out.push({ tone: 'info', title: 'Ça ralentit sur ' + exoName(slow.name), text: '2 séances sans faire mieux que ' + showSet(slow.name, slow.ref.best).replace(/\.$/, '') + '. Si la prochaine est pareille, tu vas stagner. Change un détail dès maintenant : ' + stuckTip(slow)[0].charAt(0).toLowerCase() + stuckTip(slow)[0].slice(1), act: 'stuck' });

  // Bilan du dimanche (et lundi matin) : la semaine en 3 phrases.
  const dow = new Date().getDay();
  if ((dow === 0 && new Date().getHours() >= 16) || (dow === 1 && new Date().getHours() < 12)) { const wr = weekRecap(dow === 1); if (wr) out.unshift({ tone: 'info', title: 'Bilan de ta semaine', text: wr, act: 'week' }); }
  // Surcharge : trop de séries sur un même muscle en 7 jours.
  const vol = {}; for (const w of ws) { if (now - w.start > 7 * DAY) break; for (const e of w.exercises) { if (e.name === 'Running') continue; const m = musclesOf(e.name), n = e.sets.filter((x) => x.done !== false).length; for (const z of Object.keys(m)) vol[z] = (vol[z] || 0) + n * m[z]; } }
  const over = Object.keys(vol).filter((z) => ZONES[z] && vol[z] > (ZONES[z].big ? 26 : 20)).sort((a, b) => vol[b] - vol[a])[0];
  if (over) out.push({ tone: 'warn', title: 'Beaucoup pour tes ' + ZONES[over].name.toLowerCase(), text: Math.round(vol[over]) + ' séries en 7 jours, au-delà de ce qui fait progresser (environ 20). Laisse-les récupérer 2 jours : la séance du jour en tient compte.', act: 'light' });
  // Les notes que tu laisses sur un exercice : une douleur notée est prise au sérieux.
  const noted = ws.filter((w) => now - w.start < 14 * DAY).flatMap((w) => w.exercises.filter((e) => e.note && /mal|douleur|sensible|g[eê]ne|tire|craque|bless/i.test(e.note)).map((e) => ({ name: e.name, note: e.note })))[0];
  if (noted && !P.length) out.push({ tone: 'warn', title: 'Ta note sur ' + exoName(noted.name), text: 'Tu avais écrit « ' + noted.note + ' ». Vas-y doucement sur cet exercice, et si ça fait mal, signale la douleur : je l’enlèverai de tes séances pendant 7 jours.', act: 'pain' });
  // Toujours en dernier : l'exercice fait fatigué progresse moins.
  const lastPos = {}; ws.slice(0, 8).forEach((w) => { const L = w.exercises.filter((e) => e.name !== 'Running'); if (L.length > 2) { const n = L[L.length - 1].name; lastPos[n] = (lastPos[n] || 0) + 1; } });
  const always = Object.keys(lastPos).find((n) => lastPos[n] >= 4 && !/Hollow|Plank|Rock|Wall Sit|Burpee|Russian/i.test(n));
  if (always) out.push({ tone: 'info', title: exoName(always) + ' toujours en dernier', text: lastPos[always] + ' fois sur tes 8 dernières séances, tu le fais fatigué. Mets-le en premier une fois (bouton ⋯, « Monter dans la séance ») : tu verras ce que tu vaux vraiment dessus.' });
  // Régularité rare : on le dit.
  if (st.n >= 4 && st.n % 4 === 0 && !st.lost) out.push({ tone: 'good', title: plural(st.n, 'semaine', 'semaines') + ' sans en rater une', text: pick(['C’est ça qui fait la différence sur un an, bien plus que n’importe quelle séance.', 'Très peu de gens tiennent ce rythme. Continue exactement comme ça.', 'La régularité bat le talent : tu en as la preuve.']) });
  // L'heure compte : tôt ou tard, on adapte.
  const hr = new Date().getHours();
  if (!doneToday && hr >= 20) out.push({ tone: 'info', title: 'Séance tard', text: 'Après 20 h : échauffement complet, et pas de sauts au maximum en fin de séance, pour t’endormir plus facilement.' });
  else if (!doneToday && hr < 9) out.push({ tone: 'info', title: 'Séance tôt', text: 'Le matin, le corps est raide : 2 minutes d’échauffement en plus, et tes premières séries un peu en dessous de l’objectif.' });

  // Astuce de la semaine : manger un peu plus sans rien compter ni noter (il est mince, petit budget, pas de compléments).
  if (!isBeginner()) {
    const wk = Math.floor((day0(now) - 4 * DAY) / (7 * DAY));
    const FOOD = [
      'Un bol de flocons d’avoine avec du lait le matin (ou le soir) : pas cher, environ 20 g de protéines et 500 calories en plus, sans te forcer.',
      'Une cuillère de beurre de cacahuète sur ton pain ou dans tes flocons : 100 calories en deux secondes. C’est la façon la plus simple de grossir un peu.',
      'Une portion de pâtes ou de riz en plus au repas où tu as le plus faim. Rien à compter : juste un peu plus dans l’assiette.',
      'Un grand verre de lait à côté de chaque repas : des protéines et des calories, pour presque rien.',
      'Un vrai repas dans les 2 heures après ta séance, avec de la viande, des œufs cachés dans un plat, ou du fromage. C’est là que le muscle se reconstruit.',
      'Une collation avant de dormir : yaourt, fromage blanc ou lait. Tes muscles ont de quoi travailler pendant la nuit.',
      'Dors 8 heures. Le muscle se construit pendant le sommeil : c’est le complément le plus efficace, et il est gratuit.',
      'Une banane et un verre de lait avant la séance si tu as faim : tu auras plus d’énergie sur les dernières séries.',
    ];
    out.push({ tone: 'info', title: 'Astuce de la semaine', text: FOOD[((wk % FOOD.length) + FOOD.length) % FOOD.length] + ' Pour avoir le physique sec et en V, il faut que tes muscles grossissent : sans manger un peu plus, ils ne peuvent pas.' });
  }

  // Ce qui te réussit
  const R = reussites();
  if (R.length && !/^Il me faut|^Pas de grosse/.test(R[0])) out.push({ tone: 'info', title: 'Ce qui te réussit', text: pick(R), act: 'success' });

  // Régularité de la semaine
  const wq = weekQuest();
  if (wq.done) out.push({ tone: 'good', title: 'Semaine réussie', text: wq.cur + ' sur ' + wq.goal + ' séances. Tout ce que tu fais en plus, c’est du bonus.' });

  // Équilibre
  const b = balance();
  const up = b.push + b.pull, low = b.legs;
  if (b.push > 30 && b.pull * 3 < b.push) out.push({ tone: 'warn', title: 'Dos en retard', text: 'Sur 4 semaines : ' + b.push + ' séries de poussée pour ' + b.pull + ' de tirage. Le rowing protège tes épaules : garde bien les deux rowings de tes séances A et B.' });
  if (up > 30 && low * 3 < up) out.push({ tone: 'warn', title: 'Jambes en retard', text: 'Sur 4 semaines : ' + up + ' séries pour le haut du corps, ' + low + ' pour les jambes. Ne saute pas le pistol ni les fentes.' });

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

  // Programme A/B : étapes prêtes et blocages (le plus utile pour avancer)
  if (!isBeginner()) {
    const R = Object.keys(STEPS).filter(stepReady), B = Object.keys(STEPS).filter(stepStall);
    if (R.length) { const k = R[0], nx = nextStep(k); out.push({ tone: 'good', title: 'Prêt à monter : ' + STEPS[k].label.toLowerCase(), text: 'Toutes tes séries ont touché le haut de la fourchette. Étape suivante : ' + exoName(nx.n) + (nx.w ? ' avec ' + nx.w + ' kg' : '') + (nx.how ? ' (' + nx.how.replace(/\.$/, '').toLowerCase() + ')' : '') + '. Tu valides dans la fenêtre du programme, ou sur l’exercice pendant la séance.' + (R.length > 1 ? ' ' + plural(R.length - 1, 'autre exercice est prêt', 'autres exercices sont prêts') + ' aussi.' : ''), act: 'prog' }); }
    if (B.length) { const k = B[0]; out.push({ tone: 'warn', title: 'Bloqué sur ' + STEPS[k].label.toLowerCase(), text: '3 séances sans dépasser ton chiffre, sous les ' + curStep(k).hi + ' visés. Change une seule chose : descente en 3 secondes, ou une série de plus (4 au maximum). Pas tout le programme.', act: 'prog' }); }
  }
  // Re-test et rang
  if (testDue()) out.push({ tone: 'info', title: 'Re-test du cycle', text: 'C’est la semaine du re-test : chaque exercice au maximum, 3 minutes de repos. C’est lui qui fait monter tes qualités et ton rang.' });
  else if (isBeginner() && weekIdx() === 2) out.push({ tone: 'info', title: 'Re-test la semaine prochaine', text: 'Dernière semaine du cycle : pousse sur les séries principales.' });
  const ri = rankInfo();
  if (ri.next) { const q = weakQuality(); out.push({ tone: 'info', title: 'Vers le rang ' + ri.next.letter, text: 'Tu es à ' + Math.round(ri.ratio * 100) + ' % du chemin. Ton point faible : ' + q.name.toLowerCase() + ' (' + q.letter + ').' + (isBeginner() ? ' Ta séance point faible de la semaine le cible.' : ''), act: 'weak' }); }
  return out;
}

// Bilan de la semaine (en cours ou passée) en trois phrases : régularité, meilleur progrès, une chose à améliorer.
export function weekRecap(last) {
  const m0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - (last ? 7 : 0)); return d.getTime(); })();
  const W = real().filter((w) => w.start >= m0 && w.start < m0 + 7 * DAY);
  if (!W.length) return '';
  const goal = weekGoal(), n = W.length;
  const t = [(n >= goal ? 'Semaine validée : ' : 'Semaine à ' + n + ' sur ' + goal + ' : ') + plural(n, 'séance', 'séances') + ', ' + plural(W.reduce((k, w) => k + w.exercises.reduce((j, e) => j + e.sets.length, 0), 0), 'série', 'séries') + '.'];
  const tr = exoTrends().filter((x) => x.last.date >= m0 && x.n >= 2).map((x) => { const p = x.recent[1]; return { x, g: p ? (amount(x.last.best) - amount(p.best)) / Math.max(1, amount(p.best)) : 0 }; }).sort((a, b) => b.g - a.g);
  if (tr.length && tr[0].g > 0) t.push('Ton meilleur progrès : ' + exoName(tr[0].x.name) + ' (' + showSet(tr[0].x.name, tr[0].x.last.best).replace(/\.$/, '') + ').');
  const b = balance();
  const stuck = exoTrends().find((x) => x.stuck || x.slow);
  if (stuck) t.push('À améliorer : ' + exoName(stuck.name) + ' ne bouge plus. ' + stuckTip(stuck)[0]);
  else if (b.push > 20 && b.pull * 3 < b.push) t.push('À améliorer : le dos. Ne saute pas les rowings.');
  else if (n < goal) t.push('À améliorer : la régularité. Place tes séances sur des jours fixes (fenêtre « Ta semaine »).');
  else t.push('À améliorer : rien d’urgent. Vise un record la semaine prochaine.');
  return t.join(' ');
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
  const rot = type === 'test' || type === 'faible' ? (isBeginner() ? 'd-haut' : 'A') : type;
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
      const sl = exoTrends().filter((x) => x.slow);
      if (sl.length) return { text: ['Tu ne stagnes pas encore, mais ça ralentit sur ' + sl.slice(0, 2).map((x) => exoName(x.name)).join(' et ') + ' : 2 séances sans faire mieux.'].concat(sl.slice(0, 2).map((x) => exoName(x.name) + ' (à battre : ' + showSet(x.name, x.ref.best) + ') : ' + stuckTip(x).join(' '))).concat(['Agir maintenant évite 3 semaines de stagnation.']) };
      return { text: ['Bonne nouvelle : tu ne stagnes sur aucun exercice en ce moment.'].concat(g.length ? ['Ça avance surtout sur ' + g.map((x) => exoName(x.name) + ' (+' + Math.round(x.gain * 100) + ' %)').join(' et ') + '.'] : []).concat(['Continue d’ajouter une répétition à chaque séance, c’est tout le secret.']) };
    }
    const t = ['Tu stagnes sur ' + s.slice(0, 3).map((x) => exoName(x.name)).join(', ') + '.'];
    for (const x of s.slice(0, 2)) t.push(exoName(x.name) + ' (meilleur récent : ' + showSet(x.name, x.last.best) + ') : ' + stuckTip(x).join(' '));
    t.push(isBeginner() ? 'Une stagnation de 2 ou 3 semaines, c’est normal. Le re-test de fin de cycle remet souvent tout en marche.' : 'Une stagnation de 2 ou 3 semaines, c’est normal. Change une seule chose (tempo, une série de plus, 4 au maximum), pas tout le programme.');
    return { text: t };
  }
  if (id === 'weak') {
    const q = weakQuality();
    const all = rankInfo().q.slice().sort((a, b) => a.score - b.score);
    const t = ['Tes qualités, de la plus basse à la plus haute : ' + all.map((x) => x.name.toLowerCase() + ' ' + x.letter).join(', ') + '.'];
    if (isBeginner()) t.push('Ta séance point faible vise ' + q.name.toLowerCase() + ' : elle arrive une fois par semaine, après 2 séances du programme.');
    else t.push('Ton programme A/B fait tout travailler à chaque séance : ' + q.name.toLowerCase() + ' monte avec tes étapes. Le re-test (fenêtre du programme, « Changer de séance ») met tes lettres à jour quand tu veux.');
    if (all[0].id === 'vitesse') t.push('La vitesse, elle, se travaille en courant : le dimanche, cours 3 à 5 km en tenant une allure un peu plus rapide que d’habitude.');
    t.push('Monter une lettre sur ta qualité la plus basse fait grimper ton rang plus vite que deux lettres ailleurs.');
    return { text: t, btns: [btn('prog', 'Voir la séance', isBeginner() ? ' data-type="faible"' : '', true)] };
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
    return { text: ['Pour prendre du muscle au poids du corps, trois règles :', '1. Entre 8 et 15 répétitions par série, en t’arrêtant 1 ou 2 répétitions avant l’échec. Au-delà de 15, mets le gilet lesté ou passe à l’exercice plus dur : le programme le fait déjà.', '2. Entre 10 et 20 séries par muscle et par semaine. La carte du corps (onglet Progrès, mode Semaine) te montre où tu en es.', '3. Manger assez : ' + (bw ? 'environ ' + Math.round(bw * 1.8) + ' g de protéines par jour pour ' + fr(bw, 1) + ' kg' : '1,8 g de protéines par kilo') + ', et un peu plus de calories que tu n’en dépenses.', 'Compte 2 à 3 mois pour voir la différence dans le miroir : les photos de suivi te le prouveront.'], btns: [btn('photos', 'Photos de suivi', '', true)] };
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
    return { text: ['Non, tout va bien.' + (c.ratio !== null ? ' Ta charge des 7 derniers jours (' + c.acute + ' points) est proche de ta moyenne (' + c.chronic + ').' : ''), 'Je te préviendrai si elle grimpe trop vite ou si tes bilans du matin baissent plusieurs jours de suite.' + (isBeginner() ? ' Et la 4e semaine de chaque cycle (le re-test) sert déjà à souffler.' : '')] };
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
    const L = bodyLog(), kg = L.length ? L[0].kg : 65, p = Math.round(kg * 1.8);
    const t = ['Pour prendre du muscle : environ ' + p + ' g de protéines par jour (1,8 g par kilo), et un peu plus que ta faim à chaque repas.'];
    if (hit(arg, 'faim')) t.push('Faim entre deux repas : banane et lait chocolaté, ou deux pains au lait avec des cacahuètes.');
    t.push('Le plus simple : de la viande, du lait, du fromage blanc ou des œufs à chaque repas, un goûter dans ton sac, et un grand verre de lait avant de dormir.');
    t.push(bodyLog().some((x) => Date.now() - x.d < 60 * DAY) ? 'Pèse-toi une fois par semaine : si la balance ne bouge pas en 2 semaines, mange un peu plus.' : 'Pas de balance ? Une photo par mois, même endroit et même lumière : si rien ne bouge en 2 mois, mange un peu plus.');
    return { text: t, btns: [btn('body', 'Ma balance', '', true)] };
  }
  if (id === 'weight') {
    const L = bodyLog();
    if (!L.length) return { text: ['Tu ne t’es pas encore pesé dans l’app.', 'Pèse-toi une fois par semaine, le matin, avant de manger.'], btns: [btn('body', 'Me peser', '', true)] };
    const t = ['Dernière pesée : ' + fr(L[0].kg, 1) + ' kg, il y a ' + plural(Math.max(0, Math.round((Date.now() - L[0].d) / DAY)), 'jour', 'jours') + '.'];
    const old = L.find((x) => L[0].d - x.d >= 14 * DAY);
    if (old) { const rate = (L[0].kg - old.kg) / ((L[0].d - old.d) / (7 * DAY)); t.push('Ton rythme : ' + (rate >= 0 ? '+' : '') + fr(rate, 2) + ' kg par semaine. ' + (rate < 0.15 ? 'Trop lent pour prendre du muscle : mange plus, surtout au goûter et le soir.' : rate > 0.6 ? 'Un peu trop vite : une partie est du gras.' : 'Pile dans le bon couloir (0,25 à 0,5 kg) : c’est du muscle.')); }
    else t.push('Encore quelques pesées sur 2 semaines, et je calcule ton rythme.');
    return { text: t, btns: [btn('body', 'Nouvelle pesée', '', true)] };
  }
  if (id === 'tomorrow') {
    const P = weekPlan(), ti = (new Date().getDay() + 6) % 7;
    if (ti === 6) return { text: ['Demain, c’est lundi : une nouvelle semaine commence. Ton plan se refait tout seul, la première séance sera « ' + label(nextType()) + ' ».', 'Ce soir : prépare ton sac et couche-toi tôt.'] };
    const d = P.days[ti + 1];
    const t = ['Demain (' + d.name.toLowerCase() + ') : ' + (d.kind === 'seance' ? d.label + ', ' + d.sub + '.' : d.kind === 'course' ? d.label.toLowerCase() + '.' : 'repos prévu.')];
    t.push(forme().score < 60 ? 'Ta forme est moyenne : vise 8 h 30 de sommeil cette nuit pour arriver frais.' : 'Une bonne nuit, et tu pourras pousser.');
    return { text: t, btns: [btn('plan', 'Ma semaine', '', true)] };
  }
  if (id === 'time') {
    const mn = arg || 15;
    const r2 = type === 'test' ? rot : type;
    if (mn < 20) return { text: ['En ' + mn + ' minutes, le plus efficace : un Tabata en pompes (4 min), 1 minute de pause, un Tabata en squats sautés, 1 minute de pause, un Tabata en dips sur le banc.', 'Ou les pompes du jour : 30 pompes au moins, en autant de séries qu’il faut, et ta journée compte.'], btns: [btn('chrono2', 'Tabata', '', true), btn('quick', 'Pompes du jour')] };
    const mode = mn < 35 ? 'court' : mn < 60 ? '' : 'gros';
    const L = plan(r2, mode);
    return { text: ['Avec ' + mn + ' minutes : « ' + label(r2) + ' » en version ' + (mode === 'court' ? 'courte' : mode === 'gros' ? 'grosse séance' : 'normale') + ', environ ' + minutes(L, false) + ' minutes, ' + plural(L.length, 'exercice', 'exercices') + '.', mode === 'court' ? 'Deux séries par exercice, les plus importants en premier : tu gardes l’essentiel.' : mode === 'gros' ? 'Une série de plus sur les deux premiers exercices et deux exercices en bonus.' : 'La séance complète, échauffement compris.'], btns: [startBtn(r2, mode || 'normal', 'Commencer', true)] };
  }
  if (id === 'rest') {
    return { text: ['Le muscle se construit pendant le repos, pas pendant la séance. Un muscle travaillé dur a besoin de 48 heures.', (isBeginner() ? 'C’est pour ça que ton programme alterne le haut, le bas et le corps entier : tu peux t’entraîner deux jours de suite sans retravailler les mêmes muscles.' : 'Tes séances A et B font travailler tout le corps : laisse au moins un jour entre deux séances, sauf la course du dimanche qui ne gêne pas.'), 'Deux fois par jour : inutile à ton niveau. Mieux vaut une vraie séance et bien manger.', 'Un jour de repos actif : marche, vélo, étirements, ou le retour au calme guidé.'], btns: [btn('cooldown', 'Étirements', '', true), btn('coach-tab', 'Ma récupération', ' data-tab="progress"')] };
  }
  if (id === 'doms') {
    const z = bodyStats();
    const sore = Object.keys(z).filter((k) => z[k].rec < 70).map((k) => ZONES[k].name.toLowerCase());
    return { text: ['Les courbatures arrivent 24 à 48 heures après un effort nouveau ou plus dur. Ce ne sont pas des déchirures : elles partent seules en 2 à 4 jours.', sore.length ? 'D’après tes séances, encore en récupération : ' + sore.slice(0, 4).join(', ') + '.' : 'D’après tes séances, tes muscles sont récupérés.', 'Ce qui aide vraiment : bouger doucement (marche, étirements légers), dormir, manger des protéines. Tu peux t’entraîner, en évitant de reprendre les mêmes muscles à fond.'], btns: [btn('coach-tab', 'Carte du corps', ' data-tab="progress"', true), btn('cooldown', 'Étirements')] };
  }
  if (id === 'pulse') {
    const L = Object.entries(state.checkins || {}).filter(([, v]) => v.hr).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    const R = Object.entries(state.checkins || {}).filter(([, v]) => v.rt).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    if (!L.length && !R.length) return { text: ['Ton pouls au repos et ton temps de réaction se mesurent dans le bilan du matin : 60 secondes le doigt sur la caméra, puis 20 secondes de réaction.', 'Après 7 matins, je connais ta base. Un pouls plus haut que d’habitude ou une réaction plus lente annoncent la fatigue avant que tu la sentes.'], btns: [btn('checkin', 'Bilan du matin', '', true)] };
    const t = [];
    if (L.length) { const b = baseOf('hr', '9999'); t.push('Pouls au repos : ' + L[0][1].hr + ' bpm ce dernier matin' + (b.v ? ', pour une base de ' + Math.round(b.v) + '.' : ' (base connue après 7 mesures, encore ' + (7 - b.n) + ').')); if (b.v && L[0][1].hr - b.v >= 4) t.push((L[0][1].hr - Math.round(b.v)) + ' battements au-dessus de ta base, c’est souvent un manque de sommeil, un début de rhume ou une grosse fatigue : séance allégée.'); }
    if (R.length) { const b = baseOf('rt', '9999'); t.push('Réaction : ' + R[0][1].rt + ' ms' + (b.v ? ', pour une base de ' + Math.round(b.v) + ' ms.' : '.')); }
    t.push('Un pouls au repos qui baisse sur des mois, c’est le signe que ton cœur devient plus endurant : la course du dimanche y est pour beaucoup.');
    return { text: t, btns: [btn('forme', 'Ma forme', '', true)] };
  }
  if (id === 'stats') {
    const m0 = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const p0 = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();
    const cur = tally(state.workouts.filter((w) => w.start >= m0)), prev = tally(state.workouts.filter((w) => w.start >= p0 && w.start < m0));
    const all = tally(state.workouts);
    const t = ['Depuis le début : ' + plural(all.n, 'séance', 'séances') + ', ' + all.sets + ' séries, ' + all.pompes + ' pompes, ' + all.dips + ' dips, ' + fr(all.km, 1) + ' km courus.'];
    t.push('Ce mois-ci : ' + plural(cur.n, 'séance', 'séances') + ', ' + cur.pompes + ' pompes, ' + plural(cur.prs, 'record', 'records') + '. Le mois dernier : ' + plural(prev.n, 'séance', 'séances') + ', ' + prev.pompes + ' pompes.');
    if (prev.n) t.push(cur.n >= prev.n ? 'Tu es déjà au niveau du mois dernier.' : 'Encore ' + plural(prev.n - cur.n, 'séance', 'séances') + ' pour égaler le mois dernier.');
    return { text: t, btns: [btn('career', 'Ma carrière', '', true), btn('parcours', 'Mon parcours')] };
  }
  if (id === 'warmup') return { text: ['L’échauffement se lance tout seul au début de chaque séance : 4 à 5 minutes, articulations puis montée en rythme.', 'Il réduit le risque de blessure et te rend plus fort dès la première série. Ne le saute que si tu es pressé, et fais alors une série légère de chaque exercice.'], btns: [btn('prog', 'Ma séance', '', true)] };
  if (id === 'stretch') return { text: ['Après la séance : le retour au calme guidé, 6 étirements de 30 secondes. Il ne fait pas grossir les muscles, mais il garde ta souplesse et détend.', 'Pour gagner en souplesse pour de vrai : 10 minutes, 3 fois par semaine, en tenant chaque étirement 30 à 60 secondes.'], btns: [btn('cooldown', 'Retour au calme', '', true)] };
  if (id === 'pullup') return { text: ['Sans barre de traction, ton dos travaille avec :', '1. Le rowing haltère (séances A et B) : lourd, dos plat, coude qui frotte les côtes.', '2. Le rowing élastique, juste après.', '3. Le rowing inversé sous les barres de dips, pieds au sol puis sur le banc : c’est la meilleure préparation aux tractions.', 'Le jour où tu as une barre, je l’ajouterai : 8 rowings inversés pieds surélevés propres, c’est en général assez pour ta première traction.'], btns: [btn('exo', 'Rowing inversé', ' data-name="Inverted Row"', true)] };
  if (id === 'stress') {
    const t = ['Le stress fatigue autant qu’une séance : ton corps récupère moins bien. Les périodes de bac blanc ou de contrôles comptent.', 'Ce qui marche : garder les séances (le sport fait baisser le stress), mais en version allégée ou courte, et dormir plus plutôt que réviser tard.', 'Après une séance, 5 minutes de respiration lente (4 secondes pour inspirer, 6 pour expirer) calment pour de vrai.'];
    return { text: t, btns: [startBtn(type === 'test' ? rot : type, 'court', 'Séance courte', true), btn('cooldown', 'Retour au calme')] };
  }
  if (id === 'method') return { text: ['Les repères de ton programme :'].concat(isBeginner() ? ['Muscle : 8 à 15 répétitions, 1 min 30 de repos, arrête-toi 1 ou 2 répétitions avant l’échec.', 'Endurance : 15 répétitions et plus, repos court.', 'La règle qui fait progresser : chaque séance, une répétition de plus que la dernière fois. Quand tu atteins le cap, l’app passe à la version plus dure.'] : ['Chaque exercice a une fourchette, par exemple 8 à 12 répétitions. Tu pars du bas et tu ajoutes une répétition quand tu peux, sur chaque série.', 'Quand toutes tes séries touchent le haut de la fourchette, l’étape suivante est prête : plus de lest, ou une version plus dure. Je te le propose, c’est toi qui valides.', 'Le repos est réglé pour chaque exercice : 2 min 30 sur les dips lestés et les pistols, 1 à 2 minutes ailleurs.', 'Arrête chaque série 1 ou 2 répétitions avant de ne plus pouvoir, sauf la dernière série de pompes au max.']), btns: [btn('prog', 'Ma séance', '', true)] };
  if (id === 'skill') {
    const ri = rankInfo().q.find((x) => x.id === 'maitrise');
    return { text: [(isBeginner() ? 'Les figures (équilibre sur les mains, L-sit, corbeau) se travaillent en début de séance, quand tu es frais : c’est le bloc « Habileté » de chaque séance.' : 'Les figures (équilibre sur les mains, L-sit, corbeau) ne sont pas dans tes séances A et B. Pour en apprendre une : la partie Figures de l’onglet Défis, ou le programme de 30 jours « Équilibre », 10 minutes avant ta séance, quand tu es frais.'), 'Elles progressent avec la fréquence, pas avec la fatigue : plusieurs fois par semaine, en courtes séries propres.', 'Ta maîtrise du corps est à ' + (ri ? ri.letter : 'E') + '. Un handstand de 30 secondes contre le mur, c’est la lettre B.'], btns: [btn('exo', 'Équilibre sur les mains', ' data-name="Handstand Hold"', true)] };
  }
  if (id === 'hello') {
    const h = new Date().getHours();
    return { text: [(h < 12 ? 'Salut. ' : h < 18 ? 'Salut. ' : 'Bonsoir. ') + 'Forme ' + forme().score + ' % aujourd’hui.' + (doneToday ? ' Ta séance est faite.' : ' Au programme : « ' + name + ' ».'), 'Pose-moi n’importe quelle question : séance, fatigue, figures, records, course, un exercice précis…'] };
  }
  if (id === 'thanks') return { text: [pick(['Avec plaisir. Continue comme ça.', 'De rien. On se retrouve après ta séance.', 'Quand tu veux.'])] };
  if (id === 'who') return { text: ['Je suis le coach d’Ascension. Je ne suis pas une IA en ligne : je lis tes séances, ton bilan du matin et ta balance, directement dans ton téléphone, et je calcule mes réponses.', 'Rien ne part sur internet. Plus tu notes, plus mes réponses sont précises.'] };
  if (id === 'exo') return exoAnswer(arg);
  return { text: ['Je n’ai pas compris.'] };
}
// ---------- Aides pour les réponses ----------
const hit = (words, w) => Array.isArray(words) && words.some((x) => x.startsWith(w));
const dkeyNow = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const monday0Now = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const dateTxt = (ms) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

// Tout ce que je sais sur un exercice : record, dernière fois, objectif, tendance, prévision, place dans le programme, technique.
function exoAnswer(name) {
  if (!name) return { text: ['De quel exercice parles-tu ? Écris son nom, par exemple « dips » ou « pompes déclinées ».'] };
  if (name === 'Running') return answer('run');
  const nm = exoName(name);
  const H = exoHistory(name);
  const time = measureOf(name) === 'time';
  const t = [];
  if (!H.list.length) t.push(nm + ' : jamais fait dans l’app pour l’instant.');
  else {
    t.push(nm + ' : ' + plural(H.list.length, 'séance', 'séances') + '. Record : ' + showSet(name, H.most.set) + ' (' + dateTxt(H.most.date) + ')' + (H.heavy && H.heavy.set !== H.most.set ? ', le plus lourd : ' + showSet(name, H.heavy.set) : '') + '.');
    const L = H.list[0];
    const done = L.sets.filter((s) => s.done !== false && (s.r || s.t));
    if (done.length) {
      const b = done[0];
      t.push('Dernière fois (' + dateTxt(L.date) + ') : ' + done.map((s) => (time ? (s.t || 0) + ' s' : s.r)).join(', ') + (b.w ? ' avec ' + fr(b.w, 1) + ' kg' : '') + '. Prochain objectif : ' + (time ? (b.t || 0) + 5 + ' s' : (b.r || 0) + 1 + ' répétitions') + ' sur la première série.');
    }
  }
  const tr = exoTrends().find((x) => x.name === name);
  if (tr && tr.stuck) t.push('Tu stagnes dessus depuis 3 séances. ' + stuckTip(tr).join(' '));
  else if (tr && tr.n >= 3 && tr.gain >= 0.05) t.push('Progrès : +' + Math.round(tr.gain * 100) + ' % en ' + plural(Math.max(1, Math.round((tr.last.date - tr.first.date) / (7 * DAY))), 'semaine', 'semaines') + '.');
  const pr = tr && tr.stuck ? null : predictions(name)[0];
  if (pr) t.push('Prochain record prévu : ' + pr.text + ' ' + whenTxt2(pr) + '.');
  // Place dans le programme
  if (!isBeginner()) for (const k of Object.keys(STEPS)) {
    const S = STEPS[k], j = S.steps.findIndex((x) => x.n === name);
    if (j < 0) continue;
    const cur = curStep(k), nx = nextStep(k);
    t.push('Dans ton programme : « ' + S.label + ' », étape ' + (S.steps.indexOf(cur) + 1) + ' sur ' + S.steps.length + ' (' + exoName(cur.n) + (cur.w ? ' avec ' + cur.w + ' kg' : '') + ', ' + cur.lo + ' à ' + cur.hi + ').' + (nx && !S.max ? ' Quand toutes tes séries touchent ' + cur.hi + ', tu passes à ' + exoName(nx.n) + (nx.w ? ' avec ' + nx.w + ' kg' : '') + '.' : ''));
    break;
  }
  if (isBeginner()) for (const k of ['push', 'legs', 'dips', 'full']) {
    const T = TYPES[k];
    const s = T.slots.find((x) => x.ladder.includes(name));
    if (!s) continue;
    const i = s.ladder.indexOf(name);
    t.push('Dans ton programme : « ' + T.label + ' »' + (s.bloc ? ', bloc ' + s.bloc.toLowerCase() : '') + '.' + (s.up && s.up[i] && s.ladder[i + 1] ? ' À ' + s.up[i] + (time ? ' s' : ' répétitions') + ', tu passes à ' + exoName(s.ladder[i + 1]) + '.' : ''));
    break;
  }
  const F = FICHES[name];
  if (F && F.erreurs && F.erreurs.length) t.push('À surveiller : ' + F.erreurs.slice(0, 2).map((e) => e.charAt(0).toLowerCase() + e.slice(1).replace(/\.$/, '')).join(' ; ') + '.');
  if (F && (F.facile || F.dur)) t.push((F.dur ? 'Plus dur : ' + exoName(F.dur) + '.' : '') + (F.facile ? ' Plus facile : ' + exoName(F.facile) + '.' : ''));
  return { text: t, btns: [btn('exo', 'Fiche complète', ' data-name="' + esc(name) + '"', true)] };
}
// Fin de séance : chaque exercice comparé à la séance la plus proche d'il y a un mois (entre 3 et 6 semaines).
export function monthAgo(w) { return monthTxt(w).replace(/\.\./g, '.'); }
function monthTxt(w) {
  const old = real().filter((o) => o.id !== w.id && o.start <= w.start - 21 * DAY && o.start >= w.start - 45 * DAY);
  if (!old.length) return '';
  const best = (e) => { const L = e.sets.filter((x) => x.r || x.t); return L.length ? L.reduce((m, x) => (amount(x) > amount(m) ? x : m), L[0]) : null; };
  const cmp = [];
  for (const e of w.exercises) {
    if (e.name === 'Running') continue;
    const nb = best(e); if (!nb) continue;
    const src = old.filter((o) => o.exercises.some((x) => x.name === e.name)).sort((a, b) => Math.abs(w.start - a.start - 30 * DAY) - Math.abs(w.start - b.start - 30 * DAY))[0];
    if (!src) continue;
    const ob = best(src.exercises.find((x) => x.name === e.name)); if (!ob || isTime(e.name, nb) !== isTime(e.name, ob)) continue;
    cmp.push({ name: e.name, ob, nb, at: src.start, g: (amount(nb) - amount(ob)) / Math.max(1, amount(ob)) });
  }
  if (!cmp.length) return '';
  const up = cmp.filter((c) => c.g > 0).sort((a, b) => b.g - a.g);
  if (up.length) return 'Depuis le ' + dateTxt(up[0].at) + ' : ' + up.slice(0, 2).map((c) => exoName(c.name) + ' ' + showSet(c.name, c.ob) + ' → ' + showSet(c.name, c.nb)).join(', ') + '.' + (up.length > 2 ? ' Et ' + plural(up.length - 2, 'autre exercice', 'autres exercices') + ' en hausse.' : '');
  const c0 = cmp[0];
  return 'Comparé à il y a un mois, ' + exoName(c0.name) + (c0.g === 0 ? ' n’a pas bougé (' + showSet(c0.name, c0.nb) + ')' : ' est un peu en dessous (' + showSet(c0.name, c0.ob) + ' le ' + dateTxt(c0.at) + ', ' + showSet(c0.name, c0.nb) + ' aujourd’hui)') + '. Une séance ne veut rien dire, mais si ça dure, demande au coach « Pourquoi je stagne ? ».';
}
const whenTxt2 = (p) => (p.soon ? 'dès ta prochaine séance' : 'vers le ' + dateTxt(p.at));

// Ce que le coach dit quand il ne comprend pas : il propose ce qui s'en approche.
const LBL = Object.fromEntries([['tomorrow', 'Et demain ?'], ['time', 'J’ai peu de temps'], ['weight', 'Mon poids'], ['pulse', 'Mon pouls'], ['stats', 'Mes chiffres'], ['doms', 'Des courbatures'], ['rest', 'Le repos'], ['warmup', 'L’échauffement'], ['stretch', 'Les étirements'], ['pullup', 'Le dos sans barre'], ['stress', 'Je suis stressé'], ['method', 'Séries et repos'], ['skill', 'Les figures'], ['progress', 'Progresser'], ['exo', 'Un exercice']].concat(Q));

const clockP = (s) => { s = Math.round(s); return Math.floor(s / 60) + "'" + String(s % 60).padStart(2, '0'); };

// ---------- La fenêtre du coach ----------
let chat = [];
function bubble(m) {
  if (m.me) return '<div class="cb me">' + esc(m.text) + '</div>';
  return '<div class="cb">' + m.text.map((p) => '<p>' + esc(p) + '</p>').join('') + (m.btns ? '<div class="row wrap" style="gap:8px;margin-top:8px">' + [].concat(m.btns).join('') + '</div>' : '') + '</div>';
}
function briefing() {
  // Le point du jour, en une phrase par sujet : forme, séance avec objectifs chiffrés, repas, semaine.
  const ws = real();
  if (!ws.length) return '';
  const type = testDue() ? 'test' : nextType();
  const L = plan(type, '');
  const f = forme(L);
  const t0 = day0(Date.now());
  const doneToday = ws.some((w) => w.start >= t0);
  const p = [];
  p.push((f.est ? 'Forme estimée ' : 'Forme ') + f.score + ' %' + (f.ci && f.ci.h ? ', ' + Math.floor(f.ci.h) + ' h' + (f.ci.h % 1 ? ' ' + String(Math.round((f.ci.h % 1) * 60)).padStart(2, '0') : '') + ' de sommeil' : '') + (f.ci && f.ci.hr ? ', pouls ' + f.ci.hr : '') + '.');
  if (doneToday) p.push('Séance faite : place à la récupération.');
  else {
    const goals = L.filter((e) => e.main).slice(0, 2).map((e) => { const s = lastSets(e.name); const b = s && s.find((x) => x.r || x.t); return b ? exoName(e.name) + ' ' + (b.t && !b.r ? (b.t + 5) + ' s' : (b.r + 1) + ' répétitions') + (b.w ? ' à ' + fr(b.w, 1) + ' kg' : '') : null; }).filter(Boolean);
    p.push('Au programme : « ' + label(type) + ' »' + (f.mode === 'leger' ? ' allégée' : '') + (goals.length ? ', vise ' + goals.join(' et ') : '') + '.');
  }
  return p.join(' ');
}
function draw(typing) {
  const L = insights();
  const br = briefing();
  let h = '<div class="row" style="gap:12px;align-items:center"><span class="coachav big">' + ICON.bolt + '</span><div class="col" style="gap:2px"><span class="label violet">D’après tes ' + plural(real().length, 'séance', 'séances') + '</span><h1 class="h1">Coach</h1></div></div>';
  if (br) h += '<section class="glass card col tint t-violet" style="gap:6px"><span class="label violet">Ton point du jour</span><span class="small" style="color:var(--soft)">' + esc(br) + '</span></section>';
  h += '<div class="col" style="gap:10px">' + L.slice(0, 4).map((i) => '<div class="tip ' + i.tone + (i.act ? ' tap' : '') + '"' + (i.act ? ' role="button" tabindex="0" data-act="coach-ask" data-q="' + i.act + '"' : '') + '><i></i><div class="col grow" style="gap:2px"><span style="font-weight:700">' + esc(i.title) + '</span><span class="small" style="color:var(--soft)">' + esc(i.text) + '</span></div>' + (i.act ? ICON.chev : '') + '</div>').join('') + '</div>';
  h += '<span class="label">Demande au coach</span><div class="chat" id="coachchat">' + chat.map(bubble).join('') + (typing ? '<div class="cb typing"><i></i><i></i><i></i></div>' : '') + '</div>';
  h += '<form class="askrow" id="coachform"><input class="textin" id="coachq" placeholder="Écris ta question…" autocomplete="off" enterkeyhint="send" value="' + esc(draftQ) + '"><button type="submit" class="pill gold-btn" aria-label="Envoyer">' + ICON.up + '</button></form>';
  const sg = suggest();
  h += '<span class="label violet">Pour toi aujourd’hui</span><div class="row wrap" style="gap:8px">' + sg.map((k) => '<button type="button" class="pill sm sugq" data-act="coach-ask" data-q="' + k + '">' + LBL[k] + '</button>').join('') + '</div>';
  h += '<span class="label">Autres questions</span><div class="row wrap" style="gap:8px">' + Q.filter(([k]) => !sg.includes(k)).map(([k, l]) => '<button type="button" class="pill sm glass" data-act="coach-ask" data-q="' + k + '">' + l + '</button>').join('') + '</div>';
  h += '<span class="small dim">Le coach lit tes séances, ton bilan du matin et ta balance, dans ton téléphone, sans internet. Ce n’est pas un avis médical.</span>';
  sheet(h, 1, 'full');
  const c = $('coachchat'); if (c && chat.length) { const last = c.lastElementChild; if (last) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  const fm = $('coachform');
  if (fm) fm.onsubmit = (ev) => { ev.preventDefault(); const v = $('coachq').value.trim(); if (v) { draftQ = ''; askText(v); } };
  const qi = $('coachq'); if (qi) qi.oninput = () => { draftQ = qi.value; };
}
let draftQ = '';
// Les questions qui collent à ta situation du jour, en premier.
function suggest() {
  const ws = real();
  if (!ws.length) return ['today', 'short', 'muscle'];
  const t0 = day0(Date.now()), done = ws.some((w) => w.start >= t0), out = [];
  const type = testDue() ? 'test' : nextType(), f = forme(plan(type, ''));
  if (activePains().length) out.push('pain');
  if (done) out.push('tomorrow', 'doms', 'food');
  else {
    if (f.mode === 'leger') out.push('tired');
    out.push('today');
    if (f.ci && f.ci.h && f.ci.h < 7) out.push('sleep');
    if (Math.floor((t0 - day0(ws[0].start)) / DAY) >= 3) out.push('motiv');
    out.push('short');
  }
  const tr = exoTrends();
  if (tr.some((x) => x.stuck || x.slow)) out.push('stuck'); else if (predictions().length) out.push('record');
  if ([0, 1].includes(new Date().getDay())) out.push('week');
  return [...new Set(out)].filter((k) => LBL[k]).slice(0, 4);
}

function reply(a) {
  draw(true);
  setTimeout(() => { if (!$('coachchat')) return; chat.push(a); draw(false); }, 450 + Math.min(700, a.text.join(' ').length * 2));
}
function ask(id, arg, label) {
  if (['quick', 'prog', 'checkin'].includes(id)) { ACTIONS[id]({ dataset: {} }); return; }
  chat.push({ me: true, text: label || LBL[id] || '' });
  let a = answer(id, arg);
  if (id === 'pain' && !arg) a = { text: ['Où as-tu mal ? Pendant 7 jours, je retirerai de tes séances les exercices qui sollicitent cette zone.'], btns: Object.keys(PAINS).map((k) => btn('coach-ask', PAINS[k], ' data-q="pain" data-arg="' + k + '" data-l="' + PAINS[k] + '"')).join('') };
  reply(a);
}
// ---------- Questions de technique précises ----------
// Chaque fiche : l'exercice concerné (débuts de mots, ou vide = n'importe lequel) et les mots du problème.
// Elle passe avant le reste : « je mets un livre sous mon talon au pistol » doit parler du talon, pas des records.
const TECH = [
  { ex: ['pistol'], any: ['talon', 'cale', 'livre', 'surelev', 'disque', 'chaussure', 'stabilis'], text: [
    'Oui, c’est une bonne idée, et c’est très courant : un talon surélevé (livre fin, disque, cale de 2 à 3 cm) compense des chevilles raides.',
    'Le genou peut avancer plus loin, tu descends plus droit et tu ne pars plus en arrière. Ce n’est pas de la triche : les haltérophiles portent des chaussures à talon pour la même raison.',
    'Pour t’en passer un jour : avant chaque séance, 1 minute par jambe de mobilité de cheville (face au mur, pied à 10 cm, genou qui touche le mur, talon au sol), puis baisse la hauteur de la cale petit à petit.'] },
  { ex: ['pistol'], any: ['equilibre', 'tombe', 'arriere', 'bascul', 'stable', 'tenir', 'controle'], text: [
    'Au pistol, on tombe presque toujours en arrière : le poids n’est pas assez sur l’avant du pied.',
    '1. Bras tendus devant toi pendant toute la descente. 2. Tiens un haltère de 5 à 10 kg à bout de bras : ce contrepoids aide beaucoup. 3. Descends en 3 secondes, sans te laisser tomber en bas.',
    'Si tes chevilles sont raides, mets un livre fin sous ton talon : c’est souvent ça qui débloque.'] },
  { ex: ['pistol', 'squat', 'fente', 'bulgar', 'lunge'], any: ['genou'], text: [
    'Le genou doit rester dans l’axe du pied, au-dessus du 2e orteil. S’il rentre vers l’intérieur, pousse-le légèrement vers l’extérieur en descendant.',
    'Qu’il dépasse les orteils n’est pas un problème. Une douleur vive dans le genou, en revanche, si : arrête l’exercice et signale la douleur (je l’enlève 7 jours).'] },
  { ex: ['pistol', 'mollet'], any: ['crampe'], text: [
    'Les crampes au pistol viennent souvent du mollet trop raccourci en bas du mouvement.',
    'Talon sur un livre fin, chevilles bien échauffées, et bois assez dans la journée. Si une crampe arrive, étire le mollet 20 secondes et refais la série.'] },
  { ex: ['dips'], any: ['epaule', 'profond', 'jusqu ou', 'jusqu a quel'], text: [
    'Aux dips, descends jusqu’à ce que le coude soit plié à angle droit, pas plus bas : c’est là que l’avant de l’épaule souffre.',
    'Épaules basses (loin des oreilles), buste un peu penché en avant, coudes vers l’arrière. Si l’avant de l’épaule tire quand même, garde un lest plus léger quelques séances.'] },
  { ex: ['dips', 'pompe', 'gilet'], any: ['lest', 'gilet', 'ceinture'], text: [
    'Pour lester : le gilet de 10 kg d’abord, puis un haltère coincé entre les cuisses ou accroché à une ceinture pour aller plus haut.',
    'Ton programme dit quand monter : quand toutes tes séries touchent le haut de la fourchette, l’étape suivante est prête. Monte de 5 kg à la fois, jamais plus.'] },
  { ex: ['pompe', 'pike', 'push'], any: ['poignet'], text: [
    'Mal aux poignets aux pompes : pose les mains sur tes haltères (poignées droites), le poignet reste droit et ne se plie plus.',
    'Doigts bien écartés et appuie avec le bout des doigts, pas seulement la paume. Si ça fait mal même comme ça, signale la douleur : je retire les exercices qui chargent les poignets pendant 7 jours.'] },
  { ex: ['pompe', 'push'], any: ['coude', 'ecart', 'mains', 'largeur'], text: [
    'Mains un peu plus larges que les épaules, coudes à environ 45° du corps (en flèche, pas en T).',
    'Coudes collés = plus de triceps, coudes ouverts = plus de pectoraux mais les épaules souffrent. Le 45° est le bon compromis.'] },
  { ex: ['pompe', 'push', 'hollow', 'gainage', 'planche'], any: ['dos', 'creus', 'fesse', 'hanche', 'cambr'], text: [
    'Le corps doit rester droit comme une planche, des talons à la tête.',
    'Serre les fesses et rentre un peu le ventre avant chaque répétition. Si les hanches tombent à la fin d’une série, c’est la fin de la série : ne force pas les dernières.'] },
  { ex: ['rowing', 'row'], any: ['dos', 'rond', 'lombaire', 'bas du dos'], text: [
    'Au rowing, le dos reste plat : poitrine sortie, regard un peu devant toi, genoux légèrement pliés.',
    'Avec l’haltère, pose une main et un genou sur le banc : le bas du dos est protégé. Tire le coude vers la hanche, pas vers le haut.'] },
  { ex: [], any: ['respir', 'souffle', 'inspir', 'expir', 'bloque l air'], notRun: true, text: [
    'Inspire pendant la descente, souffle pendant l’effort (la montée).',
    'Sur une série lourde, tu peux bloquer l’air une seconde au moment le plus dur, mais ne retiens pas ta respiration sur toute la série.'] },
  { ex: [], any: ['tempo', 'lentement', 'vitesse de', 'descente'], text: [
    'Descends en 2 à 3 secondes, contrôlé, et remonte normalement, sans à-coup.',
    'La descente lente rend chaque répétition plus dure sans ajouter de lest : c’est l’étape de certains exercices de ton programme.'] },
];
function techAnswer(u) {
  const w = ' ' + u.words.join(' ') + ' ';
  const has = (s) => w.includes(' ' + s);
  for (const T of TECH) {
    if (T.notRun && (has('cour') || has('running'))) continue;
    const exOk = !T.ex.length || T.ex.some(has) || (u.exo && T.ex.some((e) => clean(exoName(u.exo) + ' ' + u.exo).some((x) => x.startsWith(e))));
    if (exOk && T.any.some(has)) return { text: T.text, btns: u.exo ? [btn('exo', 'Fiche de l’exercice', ' data-name="' + esc(u.exo) + '"', true)] : [] };
  }
  return null;
}
// Le défi de 30 jours : c'est lui qui calcule les séries, le coach l'explique.
function p30Answer() {
  const s = p30status();
  if (!s) return { text: ['Tu n’as pas de programme de 30 jours en cours.', 'Il en existe 5 (pompes +50 %, dips +50 %, équilibre, gainage, premier pistol) : 10 à 15 minutes par jour en plus de ta semaine.'], btns: [btn('p30', 'Voir les programmes', '', true)] };
  if (s.finished) return { text: ['Ton programme « ' + s.p.name + ' » est terminé.'], btns: [btn('p30', 'Voir mon bilan', '', true)] };
  const pl = p30plan(s.p, s.day);
  const t = ['Les chiffres viennent du programme de 30 jours, pas de moi : il les calcule sur ton dernier test.'];
  if (pl.test) t.push('Aujourd’hui (jour ' + s.day + ') : un test, une seule série au maximum. Les jours suivants se calculent dessus.');
  else if (pl.rest) t.push('Aujourd’hui (jour ' + s.day + ') : repos. C’est pendant ces jours que ton maximum monte.');
  else t.push('Jour ' + s.day + ' : ' + pl.text + ' ' + pl.why);
  t.push('Le but : ' + (s.v0 ? 'passer de ' + s.v0 + ' à ' + goalOf(s.p, s.v0) + (s.p.t ? ' secondes' : ' répétitions d’affilée') + ' au test du jour 30.' : 'monter ton maximum.'));
  return { text: t, btns: [btn('p30', 'Mon programme de 30 jours', '', true)] };
}
// Question écrite librement.
function askText(text) {
  chat.push({ me: true, text });
  const u = understand(text);
  let a;
  try {
    const tech = techAnswer(u);
    const w30 = ' ' + u.words.join(' ') + ' ';
    if (tech) a = tech;
    else if (/ 30 jour| defi | defis | 50 /.test(w30) && (state.p30 || / 30 jour/.test(w30))) a = p30Answer();
    else if (u.id === 'pain') a = u.zone ? answer('pain', u.zone) : { text: ['Où as-tu mal ? Je retirerai de tes séances, pendant 7 jours, les exercices qui sollicitent cette zone.'], btns: Object.keys(PAINS).map((k) => btn('coach-ask', PAINS[k], ' data-q="pain" data-arg="' + k + '" data-l="' + PAINS[k] + '"')).join('') };
    else if (u.id === 'exo' || ((u.id === 'stuck' || u.id === 'record') && u.exo)) a = exoAnswer(u.exo);
    else if (u.id === 'progress') a = answer('stuck');
    else if (u.id === 'time') a = answer('time', u.min);
    else if (u.id === 'food') a = answer('food', u.words);
    else if (u.id === 'forme' || u.id === 'tired' || u.id === 'sleep' || u.id) a = answer(u.id, u.words);
    else {
      const near = closest(u).filter((x) => LBL[x]);
      a = { text: [pick(['Je n’ai pas bien compris.', 'Je ne suis pas sûr de comprendre.', 'Hmm, je n’ai pas saisi.']) + (near.length ? ' Tu voulais parler de ça ?' : ' Essaie avec d’autres mots : « je suis fatigué », « mon record aux dips », « quoi manger ce soir », « j’ai 20 minutes »…')],
        btns: near.length ? near.map((x) => btn('coach-ask', LBL[x], ' data-q="' + x + '"')).join('') : Q.slice(0, 4).map(([k, l]) => btn('coach-ask', l, ' data-q="' + k + '"')).join('') };
    }
  } catch (e) { console.error(e); a = { text: ['Je n’ai pas réussi à calculer ça. Pose ta question autrement ?'] }; }
  if (a.text[0] === 'Je n’ai pas compris.') a = exoAnswer(u.exo || null);
  reply(a);
}

Object.assign(ACTIONS, {
  coach: () => { chat = []; resetCtx(); draw(false); },
  'coach-tab': (el) => { ui.tab = el.dataset.tab; ui.enter = true; import('./app.js').then((a) => { a.render(); }); document.getElementById('sheet').innerHTML = ''; document.body.classList.remove('locked'); },
  'coach-ask': (el) => ask(el.dataset.q, el.dataset.arg, el.dataset.l),
  'coach-go': (el) => { ACTIONS['prog-start'](el); },
});
