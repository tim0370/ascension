// Ta semaine : le plan des 7 jours (refait tout seul si tu rates un jour) et le bilan du lundi
// (la semaine passée en chiffres, en équivalents parlants, et ce qui t'attend).
import { state, save, sorted, exoName, weekGoal, setText, fr } from './store.js';
import { esc, plural, ACTIONS, ICON, sheet, closeBtn, checkDark } from './ui.js';
import { rotation, title, plan, minutes, weakQuality, testDue } from './programme.js';
import { forme, charge, loadOf, monday0, predictions, predLine, checkin, CI } from './forme.js';
import { tally, equiv, tonnes, allRecords } from './bilan.js';
import { rankInfo } from './stats.js';
import { streak } from './quetes.js';

const DAY = 864e5;
const NOMS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const addDays = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
const counts = (w) => !w.boss && !w.quick;
const isRun = (w) => w.exercises.length && w.exercises.every((e) => e.name === 'Running');
const sp = (n) => Math.round(n).toLocaleString('fr-FR');

// ---------- Le plan de la semaine ----------
export function weekPlan() {
  const now = Date.now();
  const mon = monday0(now);
  const ti = (new Date().getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const a = addDays(mon, i), b = addDays(mon, i + 1);
    const ws = state.workouts.filter((w) => w.start >= a && w.start < b && counts(w)).sort((x, y) => x.start - y.start);
    days.push({ i, a, name: NOMS[i], letter: LETTRES[i], done: ws, today: i === ti, past: i < ti, kind: ws.length ? 'done' : i < ti ? 'repos' : null });
  }
  const doneN = days.reduce((n, d) => n + d.done.length, 0);
  const goal = weekGoal();
  let left = Math.max(0, goal - doneN);
  const future = days.filter((d) => d.i > ti || (d.i === ti && !d.done.length));
  const runDone = days.some((d) => d.done.some(isRun));
  const vit = rankInfo().q.slice().sort((a, b) => a.score - b.score)[0].id === 'vitesse';
  const sun = future.find((d) => d.i === 6);
  if (sun && !runDone) { sun.kind = 'course'; sun.label = vit ? 'Course rapide' : 'Course'; sun.sub = vit ? 'Ta vitesse est ta qualité la plus basse : vise ton allure record' : 'Endurance et vitesse'; if (left) left -= 1; }
  let cand = future.filter((d) => !d.kind);
  if (cand.length > left && cand[0] && cand[0].today && forme().score < 45) cand = cand.slice(1); // forme basse : repos aujourd'hui si on a de la marge
  const pick = [];
  if (left >= cand.length) pick.push(...cand);
  else for (let j = 0; j < left; j++) pick.push(cand[Math.floor((j * cand.length) / left)]);
  const types = rotation(pick.length);
  pick.forEach((d, j) => { d.kind = 'seance'; d.type = types[j]; d.label = title(types[j]); d.sub = 'environ ' + minutes(plan(types[j], ''), types[j] === 'test') + ' min'; });
  for (const d of days) if (!d.kind) d.kind = 'repos';
  return { days, doneN, goal, left: Math.max(0, goal - doneN) };
}

export function weekCard() {
  const P = weekPlan();
  const today = P.days.find((d) => d.today);
  const line = today.done.length ? 'Aujourd’hui : fait' + (P.left ? ', encore ' + plural(P.left, 'séance', 'séances') + ' cette semaine' : '') : today.kind === 'seance' ? 'Aujourd’hui : ' + today.label : today.kind === 'course' ? 'Aujourd’hui : ' + today.label.toLowerCase() : 'Aujourd’hui : repos prévu';
  return '<section class="glass card col tap tint t-blue" role="button" tabindex="0" data-act="plan" style="gap:14px"><div class="row between" style="gap:10px"><span class="h2">Ta semaine</span>'
    + '<span class="row small mut" style="gap:4px;white-space:nowrap">' + (P.doneN >= P.goal ? 'Objectif atteint' : Math.min(P.doneN, P.goal) + ' sur ' + P.goal) + ICON.chev + '</span></div>'
    + '<div class="week">' + P.days.map((d) => '<div class="day' + (d.done.length ? ' done' : ' k-' + d.kind) + (d.today ? ' today' : '') + '"><span class="dot">' + (d.done.length ? checkDark : d.kind === 'course' ? '<i class="kd run"></i>' : d.kind === 'seance' ? '<i class="kd"></i>' : '') + '</span><span class="small">' + d.letter + '</span></div>').join('') + '</div>'
    + '<span class="small mut">' + esc(line) + '</span></section>';
}

function sheetPlan() {
  const P = weekPlan();
  const st = streak();
  let h = '<div class="col" style="gap:4px"><span class="label violet">' + Math.min(P.doneN, P.goal) + ' sur ' + plural(P.goal, 'séance', 'séances') + ' · flamme de ' + plural(st.n, 'semaine', 'semaines') + '</span><h1 class="h1">Ta semaine</h1></div><div class="list">';
  for (const d of P.days) {
    const head = '<span style="font-weight:600' + (d.today ? ';color:var(--gold)' : '') + '">' + d.name + ' ' + new Date(d.a).getDate() + (d.today ? ' · aujourd’hui' : '') + '</span>';
    if (d.done.length) { for (const w of d.done) h += '<button type="button" class="item" data-act="detail" data-id="' + esc(w.id) + '"><span class="kdot done"></span><div class="col grow" style="gap:2px;min-width:0">' + head + '<span class="small mut">Fait · ' + esc(w.title) + '</span></div>' + ICON.chev + '</button>'; continue; }
    if (d.kind === 'seance') h += '<button type="button" class="item" data-act="prog" data-type="' + d.type + '"><span class="kdot seance"></span><div class="col grow" style="gap:2px;min-width:0">' + head + '<span class="small mut">' + esc(d.label) + ' · ' + esc(d.sub) + '</span></div>' + ICON.chev + '</button>';
    else if (d.kind === 'course') h += '<button type="button" class="item" data-act="gps"><span class="kdot course"></span><div class="col grow" style="gap:2px;min-width:0">' + head + '<span class="small mut">' + esc(d.label) + ' · ' + esc(d.sub) + '</span></div>' + ICON.chev + '</button>';
    else h += '<div class="item"><span class="kdot"></span><div class="col grow" style="gap:2px">' + head + '<span class="small mut">' + (d.past ? 'Repos' : 'Repos prévu') + '</span></div></div>';
  }
  h += '</div><span class="small mut">Le plan se refait tout seul : si tu rates un jour, les séances qui restent se répartissent sur les jours suivants, avec du repos entre elles. Si ta forme est basse le matin, le repos passe en premier. Le dimanche est gardé pour la course.</span>'
    + '<div class="row" style="gap:8px"><button type="button" class="pill sm glass grow" data-act="lundi">Semaine dernière</button><button type="button" class="pill sm glass grow" data-act="week">Historique</button></div>';
  sheet(h + closeBtn);
}

// ---------- Équivalents parlants ----------
export function funFacts(t) {
  const out = [];
  if (t.kg >= 100) out.push('Tu as soulevé ' + tonnes(t.kg) + ', soit environ ' + equiv(t.kg) + '.');
  if (t.pompes >= 20) {
    const m = t.pompes * 0.3;
    out.push('Tes ' + sp(t.pompes) + ' pompes ont fait monter ta poitrine de ' + sp(m) + ' m' + (m >= 330 ? ', soit ' + fr(m / 330, 1) + ' fois la tour Eiffel.' : m >= 50 ? ', soit ' + fr(m / 50, 1) + ' fois l’Arc de Triomphe.' : ', la hauteur d’un immeuble de ' + Math.max(1, Math.round(m / 3)) + ' étages.'));
  }
  if (t.km >= 1) out.push(fr(t.km, 1) + ' km courus' + (t.km >= 42.195 ? ', soit ' + fr(t.km / 42.195, 1) + ' marathon' + (t.km >= 84.39 ? 's' : '') + '.' : ', soit ' + sp(t.km / 0.4) + ' tours de piste.'));
  if (t.min >= 100) { const n = Math.round(t.min / 110); out.push(fr(t.min / 60, 1) + ' h d’effort, la durée de ' + (n > 1 ? n + ' films' : 'un film') + '.'); }
  if (t.dips >= 20) out.push('Tes ' + sp(t.dips) + ' dips : comme monter ' + sp(t.dips * 0.35 / 3) + ' étages à la force des bras.');
  return out;
}

// ---------- Le bilan du lundi ----------
const lastMonday = () => monday0(Date.now()) - 7 * DAY;
function inWeek(m) { return sorted().filter((w) => w.start >= m && w.start < addDays(m, 7)); }
export function lundiBanner() {
  const m = lastMonday();
  const dow = (new Date().getDay() + 6) % 7;
  if (dow > 1 || state.settings.lundiSeen === m || !inWeek(m).length) return '';
  return '<section class="glass card row tap tint t-gold" role="button" tabindex="0" data-act="lundi"><span class="ico" style="color:var(--gold)">' + ICON.star + '</span><div class="col grow" style="gap:2px;min-width:0"><span class="h2">Ton bilan de la semaine</span><span class="small mut">Tes chiffres, tes records et ta semaine qui commence.</span></div>' + ICON.chev + '</section>';
}
function sheetLundi(mArg) {
  const m = mArg || lastMonday();
  if (!mArg) { state.settings.lundiSeen = m; save(); }
  const ws = inWeek(m), prevWs = inWeek(m - 7 * DAY);
  const t = tally(ws), p = tally(prevWs);
  const real = ws.filter(counts).length;
  const goal = weekGoal();
  const ok = real >= goal;
  const fin = addDays(m, 6);
  const fmt = (ms, mo) => new Date(ms).toLocaleDateString('fr-FR', mo ? { day: 'numeric', month: 'long' } : { day: 'numeric' });
  const delta = (a, b) => (!b ? '' : a > b ? ' <span style="color:var(--vert)">+' + Math.round(((a - b) / b) * 100) + ' %</span>' : a < b ? ' <span class="mut">' + Math.round(((a - b) / b) * 100) + ' %</span>' : '');
  let h = '<div class="col" style="gap:4px"><span class="label" style="color:var(--gold)">Du ' + fmt(m) + ' au ' + fmt(fin, true) + '</span><h1 class="h1">Bilan de ta semaine</h1></div>';
  h += '<section class="glass card col center" style="gap:6px;padding:22px 16px"><span class="num ' + (ok ? 'gold-text' : '') + '" style="font-size:48px;line-height:1">' + real + '<span class="mut" style="font-size:22px"> / ' + goal + '</span></span><span class="small" style="color:var(--soft)">' + (ok ? 'Objectif atteint. Ta flamme grandit.' : real ? 'Objectif manqué de ' + plural(goal - real, 'séance', 'séances') + '.' : 'Semaine sans séance.') + '</span></section>';
  h += '<div class="stats3 glass card"><div><span class="num" style="font-size:22px">' + t.sets + '</span><span class="small mut">séries' + delta(t.sets, p.sets) + '</span></div><div><span class="num" style="font-size:22px">' + tonnes(t.kg) + '</span><span class="small mut">soulevées</span></div><div><span class="num" style="font-size:22px">' + t.recs.length + '</span><span class="small mut">records</span></div></div>';
  const F = funFacts(t);
  if (F.length) h += '<section class="glass card col" style="gap:8px"><span class="label" style="color:var(--gold)">En vrai, ça fait</span>' + F.map((x) => '<span class="small" style="color:var(--soft)">' + esc(x) + '</span>').join('') + '</section>';
  if (t.recs.length) h += '<section class="glass card col" style="gap:8px"><span class="label" style="color:var(--gold)">Tes records</span>' + t.recs.slice(0, 6).map((r) => '<div class="row between" style="gap:10px"><span class="small" style="font-weight:600">' + esc(exoName(r.name)) + '</span><span class="small mut" style="white-space:nowrap">' + esc(setText(r.set)) + '</span></div>').join('') + '</section>';
  // Charge et forme
  const lw = ws.reduce((n, w) => n + loadOf(w), 0), lp = prevWs.reduce((n, w) => n + loadOf(w), 0);
  const cis = Array.from({ length: 7 }, (_, i) => checkin(addDays(m, i) + 12 * 3600e3)).filter(Boolean);
  h += '<section class="glass card col" style="gap:8px"><span class="label violet">Charge et forme</span><span class="small" style="color:var(--soft)">Charge : ' + Math.round(lw) + ' points' + (lp ? ' (' + (lw >= lp ? '+' : '') + Math.round(((lw - lp) / lp) * 100) + ' % par rapport à la semaine d’avant)' : '') + '.</span>'
    + (cis.length ? '<span class="small" style="color:var(--soft)">' + plural(cis.length, 'bilan du matin', 'bilans du matin') + ' : sommeil moyen « ' + CI[0].o[Math.round(cis.reduce((n, c) => n + c.s, 0) / cis.length) - 1] + ' », énergie « ' + CI[2].o[Math.round(cis.reduce((n, c) => n + c.e, 0) / cis.length) - 1].toLowerCase() + ' ».</span>' : '<span class="small mut">Aucun bilan du matin cette semaine : fais-le, ton score de forme sera plus juste.</span>') + '</section>';
  // Ce qui arrive
  if (!mArg) {
    const pr = predictions().slice(0, 3);
    const q = weakQuality();
    const P = weekPlan();
    h += '<section class="glass card col" style="gap:8px"><span class="label violet">Cette semaine</span>'
      + '<span class="small" style="color:var(--soft)">' + (testDue() ? 'Semaine de re-test : tes lettres vont se mettre à jour.' : 'Objectif : ' + plural(P.goal, 'séance', 'séances') + '. Ta séance point faible vise ' + q.name.toLowerCase() + ' (' + q.letter + ').') + '</span>'
      + (pr.length ? '<span class="small mut">Records prévus :</span>' + pr.map((x) => '<span class="small" style="color:var(--soft)">' + esc(predLine(x)) + '</span>').join('') : '') + '</section>';
  }
  h += '<div class="row" style="gap:8px"><button type="button" class="pill sm glass grow" data-act="lundi-at" data-m="' + (m - 7 * DAY) + '">Semaine d’avant</button>' + (m < lastMonday() ? '<button type="button" class="pill sm glass grow" data-act="lundi-at" data-m="' + (m + 7 * DAY) + '">Semaine d’après</button>' : '') + '</div>';
  sheet(h + closeBtn, 1, 'full');
  import('./app.js').then((a) => { if (!mArg) a.render(); });
}

Object.assign(ACTIONS, {
  plan: () => sheetPlan(),
  lundi: () => sheetLundi(0),
  'lundi-at': (el) => sheetLundi(+el.dataset.m),
});
