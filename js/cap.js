// Grand objectif : un but de 12 semaines, choisi d'après ta qualité la plus basse, avec ta prise de masse en parallèle.
// Le programme s'y adapte (l'exercice de l'objectif revient plus souvent, voir plan() dans programme.js)
// et la date d'arrivée est estimée d'après ta courbe. +150 XP à l'arrivée, comme tout objectif.
import { state, save, sorted, exoName } from './store.js';
import { bodyLog } from './stats.js';
import { weakQuality, isBeginner } from './programme.js';
import { goalInfo, goalLabel } from './objectifs.js';
import { esc, plural, ACTIONS, ICON, sheet, closeSheet, toast, chartSvg } from './ui.js';
import { fr } from './store.js';

const DAY = 864e5, WEEK = 7 * DAY;
const rerender = () => import('./app.js').then((a) => a.render());
const r5 = (n) => Math.ceil(n / 5) * 5;
function best(name, w) {
  let m = 0;
  for (const x of state.workouts) for (const e of x.exercises) if (e.name === name) for (const s of e.sets) if (s.done !== false && (s.w || 0) >= (w || 0)) m = Math.max(m, s.r || s.t || 0);
  return m;
}
function maxW(name) { let m = 0; for (const x of state.workouts) for (const e of x.exercises) if (e.name === name) for (const s of e.sets) m = Math.max(m, s.w || 0); return m; }

// Un objectif par qualité, calé sur ton niveau actuel (dur mais faisable en 12 semaines).
export function capFor(q) {
  if (q === 'explo') { const b = best('Clap Push Up'); return { q, kind: 'reps', name: 'Clap Push Up', target: Math.max(10, b + 6), why: 'Ta qualité la plus basse est l’explosivité : les pompes claquées la font monter le plus vite, et elles rendent plus fort sur tout le reste.' }; }
  if (q === 'force') { const w = Math.min(20, Math.max(10, maxW('Triceps Dip') + 5)); return { q, kind: 'reps', name: 'Triceps Dip', target: 8, w, why: 'Ta qualité la plus basse est la force : des dips lourds, c’est le meilleur indicateur de force du haut du corps au poids du corps.' }; }
  if (q === 'endu') { const b = best('Push Up'); return { q, kind: 'reps', name: 'Push Up', target: Math.max(40, r5(b + 15)), why: 'Ta qualité la plus basse est l’endurance : le maximum de pompes d’affilée est le test le plus parlant.' }; }
  const b = best('Handstand Hold');
  return { q: 'maitrise', kind: 'reps', name: 'Handstand Hold', target: Math.max(30, r5(b + 15)), why: 'Ta qualité la plus basse est la maîtrise du corps : l’équilibre sur les mains contre le mur est la porte d’entrée de toutes les figures.' };
}
export const bigGoal = () => (state.goals || []).find((g) => g.big && !g.big.off && (!g.done || Date.now() - g.done < 3 * DAY)) || null;

export function startCap(q) {
  const c = capFor(q || weakQuality().id);
  const L = bodyLog();
  const w0 = L.length ? L[0].kg : null;
  state.goals = (state.goals || []).map((g) => (g.big && !g.done ? Object.assign(g, { big: Object.assign({}, g.big, { off: true }) }) : g));
  const g = { id: 'big' + Date.now().toString(36), kind: c.kind, name: c.name, target: c.target, w: c.w || 0, created: Date.now(),
    big: { q: c.q, start: Date.now(), end: Date.now() + 12 * WEEK, w0, wT: w0 ? Math.round((w0 + 4) * 2) / 2 : null, why: c.why } };
  state.goals.push(g);
  save();
  return g;
}
// Premier lancement de la v46 : il a demandé que je choisisse pour lui.
export function ensureCap() {
  if (state.settings.capAuto || state.workouts.length < 5) return;
  state.settings.capAuto = 1;
  if (!bigGoal()) startCap();
  save();
}

function weightPart(g) {
  const L = bodyLog();
  if (!g.big.w0 || !L.length) return null;
  const now = L[0].kg, d = g.big.wT - g.big.w0;
  return { now, r: Math.max(0, Math.min(1, (now - g.big.w0) / d)), target: g.big.wT };
}
export function capCard() {
  const g = bigGoal();
  if (!g) return '';
  const i = goalInfo(g), wp = weightPart(g);
  const left = Math.max(0, Math.ceil((g.big.end - Date.now()) / WEEK));
  const eta = i.eta && i.eta.date ? 'Arrivée estimée : ' + new Date(i.eta.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : i.best ? 'Date estimée après 3 semaines de données' : 'Première série à faire';
  return '<section class="glass card col tap tint t-gold capcard" role="button" tabindex="0" data-act="cap" style="gap:12px"><div class="row between" style="gap:10px"><span class="label" style="color:var(--gold)">Grand objectif · ' + (g.done ? 'atteint' : plural(left, 'semaine', 'semaines') + ' restantes') + '</span>' + ICON.chev + '</div>'
    + '<span class="h2">' + esc(goalLabel(g)) + '</span>'
    + '<div class="bar gold"><div style="width:' + Math.round(i.r * 100) + '%"></div></div>'
    + '<span class="small mut">Record : ' + (i.best === null ? '–' : Math.round(i.best)) + ' sur ' + g.target + ' · ' + esc(eta) + '</span>'
    + (wp ? '<div class="row between" style="gap:10px"><span class="small">Et sur la balance : ' + fr(wp.now, 1) + ' kg sur ' + fr(wp.target, 1) + '</span><span class="small mut">' + Math.round(wp.r * 100) + ' %</span></div>' : '') + '</section>';
}
const QN = { explo: 'Explosivité', force: 'Force', endu: 'Endurance', maitrise: 'Maîtrise du corps' };
function sheetCap() {
  const g = bigGoal();
  if (!g) { sheetPick(); return; }
  const i = goalInfo(g), wp = weightPart(g);
  const weeks = Math.round((Date.now() - g.big.start) / WEEK);
  let h = '<div class="col" style="gap:4px"><span class="label" style="color:var(--gold)">Grand objectif · semaine ' + Math.min(12, weeks + 1) + ' sur 12</span><h1 class="h1">' + esc(goalLabel(g)) + '</h1><span class="small" style="color:var(--soft)">' + esc(g.big.why || '') + '</span></div>'
    + '<section class="glass card col center" style="gap:6px;padding:20px 16px"><span class="num gold-text" style="font-size:50px;line-height:1">' + Math.round(i.r * 100) + ' %</span><div class="bar gold" style="width:100%"><div style="width:' + Math.round(i.r * 100) + '%"></div></div>'
    + '<span class="small mut">Record : ' + (i.best === null ? '–' : Math.round(i.best)) + ' · But : ' + g.target + (g.w ? ' avec ' + g.w + ' kg' : '') + '</span>'
    + '<span class="small" style="color:var(--soft)">' + (i.eta && i.eta.date ? 'À ce rythme : le ' + new Date(i.eta.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + (i.eta.date > g.big.end ? ', un peu après les 12 semaines : accroche-toi.' : ', dans les temps.') : i.eta && i.eta.stuck ? 'Pas de progrès ces dernières semaines : une répétition de plus à chaque séance.' : 'La date s’affiche après 3 semaines de séances.') + '</span></section>';
  if (wp) h += '<section class="glass card col" style="gap:8px"><span class="label">Prise de masse en parallèle</span><div class="row between"><span>' + fr(g.big.w0, 1) + ' kg → ' + fr(wp.target, 1) + ' kg</span><span class="small mut">' + fr(wp.now, 1) + ' kg aujourd’hui</span></div><div class="bar"><div style="width:' + Math.round(wp.r * 100) + '%"></div></div><span class="small mut">+4 kg en 12 semaines, c’est le rythme d’une prise de muscle propre. Pèse-toi une fois par semaine : si la balance ne bouge pas, mange un peu plus.</span></section>';
  h += '<section class="glass card col" style="gap:6px"><span class="label violet">Comment le programme s’adapte</span><span class="small" style="color:var(--soft)">' + esc(exoName(g.name)) + ' revient dans plus de séances (marqué « Objectif »), au début, quand tu es frais. ' + (isBeginner() ? 'Ta séance point faible le travaille aussi chaque semaine.' : 'Dans ton programme A/B, il avance avec tes étapes.') + '</span></section>'
    + '<button type="button" class="pill sm glass wide" data-act="cap-pick">Changer d’objectif</button>'
    + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>';
  sheet(h, 1, 'full');
}
function sheetPick() {
  const wq = weakQuality().id;
  let h = '<div class="col" style="gap:4px"><span class="label violet">Grand objectif</span><h1 class="h1">Ton but pour 12 semaines</h1><span class="small mut">Le programme s’adapte à celui que tu choisis.</span></div><div class="list">'
    + ['explo', 'force', 'endu', 'maitrise'].map((q) => { const c = capFor(q); return '<button type="button" class="item" data-act="cap-set" data-q="' + q + '"><div class="col grow" style="gap:2px"><span class="label' + (q === wq ? '" style="color:var(--gold)' : '') + '">' + QN[q] + (q === wq ? ' · ton point faible' : '') + '</span><span style="font-weight:600">' + esc(goalLabel(c)) + '</span></div>' + ICON.chev + '</button>'; }).join('')
    + '</div><button type="button" class="pill sm glass wide" data-act="close">Fermer</button>';
  sheet(h);
}
Object.assign(ACTIONS, {
  cap: () => sheetCap(),
  'cap-pick': () => sheetPick(),
  'cap-set': (el) => { startCap(el.dataset.q); closeSheet(); rerender(); toast('Grand objectif lancé : 12 semaines', true); },
});
