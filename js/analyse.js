// Analyse : ce mois-ci contre le mois dernier, tes meilleures séances, le calendrier des records,
// le volume par muscle sur 4 semaines et « il y a un an ». Tout est recalculé depuis l'historique.
import { state, sorted, exoName, fr, dateFr } from './store.js';
import { esc, plural, ACTIONS, ICON, sheet, closeBtn } from './ui.js';
import { tally, allRecords } from './bilan.js';
import { ZONES, musclesOf } from './corps.js';

const DAY = 864e5;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const real = () => sorted().filter((w) => !w.quick && !w.boss);
const monthStart = (y, m) => new Date(y, m, 1).getTime();

// Une séance vaut sa note si elle en a une, sinon ses répétitions (pour le classement).
const worth = (w) => (w.score || 0) * 1000 + w.exercises.reduce((n, e) => n + e.sets.reduce((k, s) => k + (s.r || 0) + (s.t || 0) / 5, 0), 0);

export function bestSessions(n = 3) {
  return real().filter((w) => w.exercises.some((e) => e.name !== 'Running')).sort((a, b) => worth(b) - worth(a)).slice(0, n);
}

export function yearAgo() {
  const t = Date.now() - 365 * DAY;
  return real().find((w) => Math.abs(w.start - t) < 3 * DAY) || null;
}

// Séries par muscle sur les 28 derniers jours (un muscle secondaire compte pour une demi-série).
export function muscleVolume() {
  const since = Date.now() - 28 * DAY, out = {};
  for (const w of real()) {
    if (w.start < since) break;
    for (const e of w.exercises) {
      if (e.name === 'Running') continue;
      const n = e.sets.filter((s) => s.done !== false).length, m = musclesOf(e.name);
      for (const z of Object.keys(m)) out[z] = (out[z] || 0) + n * m[z];
    }
  }
  return out;
}

function monthCompare() {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  const a0 = monthStart(y, m), b0 = monthStart(y, m - 1);
  const cur = tally(state.workouts.filter((w) => w.start >= a0));
  // Mois dernier, jusqu'au même jour du mois : la comparaison reste juste en cours de mois.
  const day = d.getDate();
  const prev = tally(state.workouts.filter((w) => w.start >= b0 && w.start < a0 && new Date(w.start).getDate() <= day));
  const row = (lab, x, p, unit) => { const diff = x - p; return '<div class="cmprow"><span class="small">' + lab + '</span><span class="num">' + fr(p, unit === 'km' ? 1 : 0) + '</span><span class="num">' + fr(x, unit === 'km' ? 1 : 0) + '</span><span class="small ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'mut') + '">' + (diff > 0 ? '+' : '') + fr(diff, unit === 'km' ? 1 : 0) + '</span></div>'; };
  return '<section class="glass card col" style="gap:8px"><span class="label violet">Ce mois-ci contre le mois dernier</span><span class="small mut">Du 1er au ' + day + ' de chaque mois, pour comparer ce qui est comparable.</span>'
    + '<div class="cmprow head"><span></span><span class="small mut">' + MOIS[(m + 11) % 12] + '</span><span class="small mut">' + MOIS[m] + '</span><span></span></div>'
    + row('Séances', cur.train || cur.n, prev.train || prev.n) + row('Séries', cur.sets, prev.sets) + row('Répétitions', cur.reps, prev.reps) + row('Kilomètres', cur.km, prev.km, 'km') + row('Records', cur.prs, prev.prs) + '</section>';
}

function recordCalendar() {
  // 12 semaines, du lundi au dimanche : violet = séance, or = séance avec un record.
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = now.getTime() - (((now.getDay() + 6) % 7) + 7 * 11) * DAY;
  const by = {};
  const recAt = new Set(allRecords().map((r) => r.at));
  for (const w of state.workouts) { if (w.start < start) continue; const k = Math.floor((new Date(w.start).setHours(0, 0, 0, 0) - start) / DAY); by[k] = Math.max(by[k] || 0, recAt.has(w.start) ? 2 : 1); }
  let cells = '';
  for (let wk = 0; wk < 12; wk++) for (let d = 0; d < 7; d++) { const k = wk * 7 + d, v = by[k] || 0, fut = start + k * DAY > Date.now(); cells += '<i class="rc' + (v === 2 ? ' pr' : v === 1 ? ' on' : '') + (fut ? ' fut' : '') + '" style="grid-column:' + (wk + 1) + ';grid-row:' + (d + 1) + '"></i>'; }
  const nPr = Object.values(by).filter((v) => v === 2).length;
  return '<section class="glass card col" style="gap:10px"><div class="row between"><span class="label violet">Calendrier des records</span><span class="small mut">12 semaines</span></div><div class="reccal">' + cells + '</div>'
    + '<div class="row small mut" style="gap:14px"><span class="row" style="gap:6px"><i class="rc on"></i>Séance</span><span class="row" style="gap:6px"><i class="rc pr"></i>Record</span><span class="grow" style="text-align:right">' + plural(nPr, 'jour de record', 'jours de record') + '</span></div></section>';
}

function volumeBars() {
  const v = muscleVolume(), keys = Object.keys(ZONES).filter((z) => v[z]).sort((a, b) => v[b] - v[a]);
  if (!keys.length) return '';
  const max = Math.max(...keys.map((z) => v[z]));
  const low = Object.keys(ZONES).filter((z) => ZONES[z].big && (v[z] || 0) < max * 0.25).map((z) => ZONES[z].name.toLowerCase());
  return '<section class="glass card col" style="gap:10px"><span class="label violet">Séries par muscle · 4 semaines</span>'
    + keys.map((z) => '<div class="hbar"><span class="small" style="font-weight:500">' + ZONES[z].name + '</span><div class="bar"><div style="width:' + Math.round((v[z] / max) * 100) + '%"></div></div><span class="small mut" style="text-align:right">' + Math.round(v[z]) + '</span></div>').join('')
    + '<span class="small mut">Un muscle secondaire compte pour une demi-série. Repère : 10 à 20 séries par semaine pour un gros muscle, soit 40 à 80 sur 4 semaines.' + (low.length ? ' Peu travaillé : ' + low.join(', ') + '.' : '') + '</span></section>';
}

const sessRow = (w, i) => '<button type="button" class="item" data-act="detail" data-id="' + esc(w.id) + '"><span class="num gold-text" style="width:20px">' + (i + 1) + '</span><div class="col grow" style="gap:2px;min-width:0"><span style="font-weight:600">' + esc(w.title) + (w.grade ? ' · note ' + w.grade : '') + '</span><span class="small mut">' + dateFr(w.start, true) + ' · ' + plural(w.exercises.reduce((n, e) => n + e.sets.length, 0), 'série', 'séries') + '</span></div>' + ICON.chev + '</button>';

function sheetAnalyse() {
  let h = '<div class="col"><span class="label">D’après tes ' + plural(real().length, 'séance', 'séances') + '</span><h1 class="h1">Analyse</h1></div>';
  h += monthCompare();
  const B = bestSessions(3);
  if (B.length) h += '<span class="label">Tes 3 meilleures séances</span><div class="list">' + B.map(sessRow).join('') + '</div>';
  h += recordCalendar() + volumeBars();
  const ya = yearAgo();
  h += ya ? '<span class="label">Il y a un an</span><div class="list">' + sessRow(ya, 0) + '</div>'
    : '<span class="small mut">« Il y a un an » apparaîtra ici quand ton historique aura un an : ta séance de ce jour-là, pour mesurer le chemin.</span>';
  sheet(h + closeBtn);
}

export function analyseCard() {
  const ya = yearAgo();
  return '<section class="glass card row tap" role="button" tabindex="0" data-act="analyse" style="gap:12px;align-items:center"><span class="ico">' + ICON.chart + '</span><div class="col grow" style="gap:2px"><span style="font-weight:700">Analyse</span><span class="small mut">' + (ya ? 'Il y a un an jour pour jour : ' + esc(ya.title) + '. ' : '') + 'Ce mois contre le mois dernier, meilleures séances, records, muscles.</span></div>' + ICON.chev + '</section>';
}

Object.assign(ACTIONS, { analyse: () => sheetAnalyse() });
