// Mes objectifs : des buts à long terme (40 pompes d'affilée, dips à 20 kg, 5 km en 25 min),
// avec la progression, la courbe et une date d'arrivée estimée d'après ton rythme des dernières semaines.
import { EXOS } from './data.js';
import { state, save, sorted, exoName, routines, kindOf } from './store.js';
import { $, esc, plural, ui, ACTIONS, ICON, sheet, closeSheet, toast, burst, chartSvg } from './ui.js';

const WEEK = 7 * 864e5;
export const GOAL_XP = 150;

const isTime = (name) => kindOf(name) === 'time';
const unitOf = (g) => (g.kind === 'run' ? '' : isTime(g.name) ? ' s' : ' rép.');

// Meilleure valeur pour un objectif, dans une liste de séances.
// reps / temps : meilleure série avec un lest au moins égal ; course : meilleur temps ramené à la distance visée.
function bestIn(g, ws) {
  let best = null;
  for (const w of ws) for (const e of w.exercises) {
    if (e.name !== g.name) continue;
    for (const s of e.sets) {
      if (s.done === false) continue;
      if (g.kind === 'run') {
        if (!s.d || !s.t || s.d < g.d * 0.95) continue;
        const t = (s.t / s.d) * g.d; // temps ramené à la distance de l'objectif
        if (best === null || t < best) best = t;
      } else {
        if ((s.w || 0) < (g.w || 0)) continue;
        const v = isTime(g.name) ? s.t || 0 : s.r || 0;
        if (best === null || v > best) best = v;
      }
    }
  }
  return best;
}

// Avancement de 0 à 1
function ratio(g, best) {
  if (best === null) return 0;
  if (g.kind === 'run') return Math.min(1, g.target / best);
  return Math.min(1, best / g.target);
}

// Meilleure valeur par semaine sur les 12 dernières semaines (pour la courbe et l'estimation).
function weekly(g) {
  const now = Date.now(), ws = sorted();
  const pts = [];
  for (let k = 11; k >= 0; k--) {
    const a = now - (k + 1) * WEEK, b = now - k * WEEK;
    const v = bestIn(g, ws.filter((w) => w.start >= a && w.start < b));
    if (v !== null) pts.push({ k: 11 - k, v });
  }
  return pts;
}

// Date estimée : droite qui passe au mieux par les points de la courbe (moindres carrés).
function eta(g, best) {
  const pts = weekly(g);
  if (pts.length < 3 || best === null) return null;
  const n = pts.length, mx = pts.reduce((s, p) => s + p.k, 0) / n, my = pts.reduce((s, p) => s + p.v, 0) / n;
  let num = 0, den = 0;
  for (const p of pts) { num += (p.k - mx) * (p.v - my); den += (p.k - mx) ** 2; }
  if (!den) return null;
  const slope = num / den; // par semaine
  const gap = g.kind === 'run' ? best - g.target : g.target - best;
  const speed = g.kind === 'run' ? -slope : slope;
  if (speed <= 0.05) return { stuck: true };
  const weeks = Math.ceil(gap / speed);
  if (weeks > 52) return { far: true };
  return { weeks, date: Date.now() + weeks * WEEK };
}

const mmss = (sec) => Math.floor(sec / 60) + ':' + String(Math.round(sec % 60)).padStart(2, '0');
export function goalLabel(g) {
  if (g.kind === 'run') { const m = Math.floor(g.target / 60), sec = Math.round(g.target % 60); return g.d + ' km en moins de ' + m + ' min' + (sec ? ' ' + String(sec).padStart(2, '0') : ''); }
  return exoName(g.name) + ' : ' + g.target + unitOf(g) + (isTime(g.name) ? '' : ' d’affilée') + (g.w ? ' avec ' + String(g.w).replace('.', ',') + ' kg' : '');
}
const valTxt = (g, v) => (v === null ? '–' : g.kind === 'run' ? mmss(v) : Math.round(v) + unitOf(g));

export function goalInfo(g) {
  const best = bestIn(g, sorted());
  return { g, best, r: ratio(g, best), eta: g.done ? null : eta(g, best) };
}

// Vérifie les objectifs atteints (appelé à l'accueil et après une séance). Renvoie ceux qui viennent d'être atteints.
export function checkGoals() {
  const fresh = [];
  for (const g of state.goals || []) {
    if (g.done) continue;
    const i = goalInfo(g);
    if (i.r >= 1) { g.done = Date.now(); fresh.push(g); }
  }
  if (fresh.length) save();
  return fresh;
}

function etaTxt(i) {
  if (i.g.done) return 'Atteint le ' + new Date(i.g.done).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  if (i.best === null) return 'Pas encore de série qui compte';
  if (!i.eta) return 'Encore quelques semaines de données pour estimer la date';
  if (i.eta.stuck) return 'Pas de progrès ces dernières semaines : vise une répétition de plus à chaque séance';
  if (i.eta.far) return 'À ce rythme, plus d’un an : accroche-toi';
  return 'À ce rythme : vers le ' + new Date(i.eta.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ' (' + plural(i.eta.weeks, 'semaine', 'semaines') + ')';
}

export function goalRow(g, compact) {
  const i = goalInfo(g);
  return '<button type="button" class="goal' + (g.done ? ' done' : '') + '" data-act="goal" data-id="' + esc(g.id) + '"><span class="qico ' + (g.done ? 'done' : 'record') + '">' + (g.done ? ICON.check : ICON.target) + '</span>'
    + '<div class="col grow" style="gap:4px;text-align:left"><span style="font-weight:600">' + esc(goalLabel(g)) + '</span>'
    + '<div class="bar ' + (g.done ? 'gold' : '') + '"><div style="width:' + Math.round(i.r * 100) + '%"></div></div>'
    + '<span class="small mut">' + (compact && !g.done
      ? 'Record : ' + valTxt(g, i.best) + (i.eta && i.eta.date ? ' · vers le ' + new Date(i.eta.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '')
      : (g.done ? '' : 'Record : ' + valTxt(g, i.best) + ' · ') + esc(etaTxt(i))) + '</span></div>'
    + '<span class="small ' + (g.done ? 'gold-text' : 'mut') + '" style="font-weight:600">' + Math.round(i.r * 100) + ' %</span></button>';
}

export function goalsCard(top) {
  const gs = (state.goals || []).filter((g) => !g.big);
  let h = '<div class="sechead"><span class="h2 row" style="gap:10px"><i class="secdot t-pink"></i>Objectifs</span><button type="button" class="pill sm glass" data-act="goal-new">' + ICON.plus + 'Ajouter</button></div>' + (top || '');
  if (!gs.length) return h + '<section class="glass card col tap tint t-pink" role="button" tabindex="0" data-act="goal-new" style="gap:8px"><span class="h2">Fixe-toi un vrai but</span><span class="small mut">40 pompes d’affilée, des dips avec 20 kg, 5 km en moins de 25 minutes… L’app suit ta progression et te dit quand tu y seras, à ton rythme actuel. +' + GOAL_XP + ' XP à l’arrivée.</span></section>';
  const open = gs.filter((g) => !g.done), done = gs.filter((g) => g.done);
  return h + '<section class="glass card tint t-pink" style="padding:4px 16px">' + open.concat(done.slice(-3)).map((g) => goalRow(g)).join('') + '</section>';
}

// ---------- Choisir un objectif ----------
function suggestions() {
  const out = [];
  const ws = sorted();
  const best = (name, w) => bestIn({ name, w: w || 0, kind: 'reps' }, ws);
  const round5 = (n) => Math.ceil(n / 5) * 5;
  const pu = best('Push Up');
  out.push({ kind: 'reps', name: 'Push Up', target: pu ? Math.max(round5(pu + 5), 20) : 20 });
  if (pu && pu < 100) out.push({ kind: 'reps', name: 'Push Up', target: pu >= 40 ? 100 : 50 });
  const dip = best('Triceps Dip');
  if (dip) out.push({ kind: 'reps', name: 'Triceps Dip', target: round5(dip + 5) });
  // Dips lestés : le lest le plus lourd déjà utilisé + 5 kg, pour 8 répétitions
  let maxW = 0;
  for (const w of ws) for (const e of w.exercises) if (e.name === 'Triceps Dip') for (const s of e.sets) maxW = Math.max(maxW, s.w || 0);
  out.push({ kind: 'reps', name: 'Triceps Dip', target: 8, w: maxW ? maxW + 5 : 10 });
  if (EXOS['Pistol Squat']) out.push({ kind: 'reps', name: 'Pistol Squat', target: Math.max(5, round5((best('Pistol Squat') || 0) + 3)) });
  const run = bestIn({ kind: 'run', name: 'Running', d: 5 }, ws);
  out.push({ kind: 'run', name: 'Running', d: 5, target: run ? Math.floor((run - 60) / 30) * 30 : 30 * 60 });
  out.push({ kind: 'run', name: 'Running', d: 10, target: run ? Math.floor((run * 2.1) / 60) * 60 : 60 * 60 });
  const mine = state.goals || [];
  return out.filter((s) => !mine.some((g) => !g.done && g.kind === s.kind && g.name === s.name && (g.w || 0) === (s.w || 0) && g.target === s.target && (g.d || 0) === (s.d || 0)));
}

let draft = null;
function sheetNewGoal() {
  const sug = suggestions();
  ui.sug = sug;
  let h = '<div class="col"><span class="label violet">Nouvel objectif</span><h1 class="h1">Ton prochain but</h1><span class="small mut">Choisis une idée calée sur tes records, ou crée le tien.</span></div>'
    + '<div class="list">' + sug.map((s, k) => '<button type="button" class="item" data-act="goal-add" data-k="' + k + '"><span class="qico record">' + ICON.target + '</span><span class="grow" style="font-weight:600;text-align:left">' + esc(goalLabel(s)) + '</span>' + ICON.plus + '</button>').join('') + '</div>';
  // Objectif sur mesure
  const names = [];
  for (const r of routines()) for (const e of r.exercises) if (!names.includes(e.name) && e.name !== 'Running') names.push(e.name);
  for (const w of sorted().slice(0, 30)) for (const e of w.exercises) if (!names.includes(e.name) && e.name !== 'Running' && !(EXOS[e.name] && EXOS[e.name].old)) names.push(e.name);
  draft = draft || { name: names[0], target: 20, w: 0 };
  h += '<span class="label">Sur mesure</span><section class="glass card col" style="gap:12px">'
    + '<select class="textin" id="g-name" style="height:48px">' + names.map((n) => '<option value="' + esc(n) + '"' + (n === draft.name ? ' selected' : '') + '>' + esc(exoName(n)) + '</option>').join('') + '</select>'
    + '<div class="row"><label class="field grow" style="height:52px"><input id="g-target" inputmode="numeric" value="' + draft.target + '" aria-label="Objectif"><span class="unit">rép. ou s</span></label>'
    + '<label class="field grow" style="height:52px"><input id="g-w" inputmode="decimal" value="' + (draft.w || '') + '" placeholder="0" aria-label="Lest"><span class="unit">kg</span></label></div>'
    + '<button type="button" class="pill gold-btn wide" data-act="goal-custom">Ajouter cet objectif</button></section>';
  sheet(h + '<button type="button" class="pill glass wide" data-act="close">Fermer</button>');
}

function addGoal(g) {
  state.goals = state.goals || [];
  g.id = 'g' + Date.now().toString(36);
  g.created = Date.now();
  state.goals.push(g);
  save();
  const i = goalInfo(g);
  if (i.r >= 1) { g.done = Date.now(); save(); toast('Déjà atteint : choisis plus dur la prochaine fois', true); }
  else toast('Objectif ajouté', true);
  closeSheet();
  import('./app.js').then((a) => a.render());
}

function sheetGoal(id) {
  const g = (state.goals || []).find((x) => x.id === id);
  if (!g) return;
  const i = goalInfo(g);
  const pts = weekly(g);
  let h = '<div class="col" style="gap:4px"><span class="label ' + (g.done ? '" style="color:var(--gold)' : 'violet') + '">' + (g.done ? 'Objectif atteint' : 'Objectif') + '</span><h1 class="h1">' + esc(goalLabel(g)) + '</h1></div>'
    + '<section class="glass card col center" style="gap:6px;padding:22px 16px"><span class="num ' + (g.done ? 'gold-text' : '') + '" style="font-size:54px;line-height:1">' + Math.round(i.r * 100) + ' %</span>'
    + '<div class="bar ' + (g.done ? 'gold' : '') + '" style="width:100%"><div style="width:' + Math.round(i.r * 100) + '%"></div></div>'
    + '<span class="small mut">Record : ' + valTxt(g, i.best) + ' · But : ' + valTxt(g, g.target) + '</span></section>'
    + '<section class="glass card col" style="gap:6px"><span class="h2">' + (g.done ? 'Bravo' : 'Quand tu y seras') + '</span><span class="small mut">' + esc(etaTxt(i)) + '</span></section>';
  if (pts.length >= 2) h += '<div class="exo"><span class="label">Ta meilleure série, semaine par semaine</span>' + chartSvg(pts.map((p) => (g.kind === 'run' ? Math.round(p.v / 6) / 10 : p.v)), g.kind === 'run' ? ' min' : unitOf(g)) + '</div>';
  h += '<button type="button" class="pill glass wide" data-act="goal-del" data-id="' + esc(g.id) + '" style="color:var(--mut)">Retirer cet objectif</button>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>');
}

Object.assign(ACTIONS, {
  'goal-new': () => sheetNewGoal(),
  'goal-add': (el) => { const s = ui.sug && ui.sug[Number(el.dataset.k)]; if (s) addGoal(Object.assign({}, s)); },
  'goal-custom': () => {
    const name = $('g-name').value, target = Math.round(Number(String($('g-target').value).replace(',', '.'))), w = Number(String($('g-w').value || '0').replace(',', '.')) || 0;
    if (!name || !(target > 0)) { toast('Indique un nombre de répétitions ou de secondes'); return; }
    draft = null;
    addGoal({ kind: 'reps', name, target, w });
  },
  goal: (el) => sheetGoal(el.dataset.id),
  'goal-del': (el) => { if (!confirm('Retirer cet objectif ?')) return; state.goals = (state.goals || []).filter((g) => g.id !== el.dataset.id); save(); closeSheet(); import('./app.js').then((a) => a.render()); },
});

// Petite fête quand un objectif tombe
export function celebrateGoals(list) {
  if (!list.length) return;
  setTimeout(() => { burst(); toast('Objectif atteint : ' + goalLabel(list[0]) + ' · +' + GOAL_XP + ' XP', true); }, 700);
}
