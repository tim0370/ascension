// Mon parcours : la frise de tes grands moments, recalculée depuis l'historique.
// Première séance, 10e, 50e, 100e séance, niveaux, paliers de pompes et de dips, courses, hauts faits, objectifs, médailles.
import { state, xpOf, levelInfo, exoName, fr } from './store.js';
import { EXOS } from './data.js';
import { esc, plural, ACTIONS, ICON, sheet } from './ui.js';
import { FEATS } from './quetes.js';
import { season, medalSvg } from './saison.js';
import { goalLabel } from './objectifs.js';

const isPush = (n) => EXOS[n] && EXOS[n].g === 'pompes';
const isDips = (n) => EXOS[n] && EXOS[n].g === 'dips' && n !== 'Bench Dip';

export function milestones() {
  const ev = [];
  const ws = state.workouts.slice().sort((a, b) => a.start - b.start);
  let n = 0, xp = 0, lvl = levelInfo(0).level, push = 0, dips = 0, km = 0, total = 0;
  const PUSH = [10, 20, 30, 40, 50, 60, 75, 100], DIPS = [5, 10, 15, 20, 25, 30], KM = [3, 5, 10, 15, 21.1];
  const TOTAL = [1000, 5000, 10000, 25000, 50000, 100000];
  for (const w of ws) {
    if (!w.quick && !w.boss) {
      n += 1;
      if (n === 1) ev.push({ t: w.start - 1, kind: 'start', title: 'Première séance', text: w.title ? w.title.charAt(0).toUpperCase() + w.title.slice(1).toLowerCase() + '. Le début de tout.' : 'Le début de tout.' });
      else if ([10, 25, 50, 100, 200, 300, 500].includes(n)) ev.push({ t: w.start, kind: 'count', title: n + 'e séance', text: 'La régularité paie.' });
    }
    for (const e of w.exercises) for (const s of e.sets) {
      if (e.name === 'Running') {
        const d = s.d || 0;
        const k = KM.filter((x) => d >= x && km < x).pop();
        if (k) ev.push({ t: w.start, kind: 'run', title: (k === 21.1 ? 'Semi-marathon' : fr(k, 1) + ' km') + ' courus d’une traite', text: fr(d) + ' km' + (s.t ? ' en ' + Math.round(s.t / 60) + ' min' : '') });
        km = Math.max(km, d);
        continue;
      }
      if (e.name === 'Push Up' || (isPush(e.name) && !s.w && e.name !== 'Knee Push Up' && e.name !== 'Incline Push Up')) {
        const r = s.r || 0;
        const k = PUSH.filter((x) => r >= x && push < x).pop();
        if (k) ev.push({ t: w.start, kind: 'rec', title: k + ' pompes d’affilée', text: r + ' × ' + exoName(e.name).toLowerCase() });
        push = Math.max(push, r);
      }
      if (isDips(e.name)) {
        const r = s.r || 0;
        const k = DIPS.filter((x) => r >= x && dips < x).pop();
        if (k) ev.push({ t: w.start, kind: 'rec', title: k + ' dips d’affilée', text: r + ' rép.' + (s.w ? ' avec ' + fr(s.w, 1) + ' kg' : '') });
        dips = Math.max(dips, r);
      }
      if (isPush(e.name)) {
        const before = total; total += s.r || 0;
        const k = TOTAL.filter((x) => total >= x && before < x).pop();
        if (k) ev.push({ t: w.start, kind: 'count', title: k.toLocaleString('fr-FR') + ' pompes au total', text: 'Depuis ta première séance.' });
      }
    }
    xp += xpOf(w);
    const L = levelInfo(xp).level;
    if (L > lvl && (L % 5 === 0 || L <= 3)) ev.push({ t: w.start, kind: 'level', title: 'Niveau ' + L, text: xp.toLocaleString('fr-FR') + ' XP gagnés en séance' });
    lvl = L;
  }
  for (const f of FEATS) { const t = (state.feats || {})[f.id]; if (typeof t === 'number') ev.push({ t, kind: 'feat', title: 'Haut fait : ' + f.label, text: f.desc }); }
  for (const g of state.goals || []) if (typeof g.done === 'number') ev.push({ t: g.done, kind: 'goal', title: 'Objectif atteint', text: goalLabel(g) });
  for (const m of season().medals) {
    const [y, mo] = m.key.split('-').map(Number);
    const t = Math.min(Date.now(), new Date(y, mo, 0, 20).getTime());
    ev.push({ t, kind: 'medal', medal: m.medal, title: 'Médaille ' + (m.medal === 'or' ? 'd’or' : m.medal === 'argent' ? 'd’argent' : 'de bronze'), text: 'Saison de ' + new Date(y, mo - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + ', palier ' + m.tier });
  }
  return ev.sort((a, b) => b.t - a.t);
}

const ICO = { start: 'flame', count: 'stack', run: 'run', rec: 'bolt', level: 'star', feat: 'medal', goal: 'target' };

function sheetParcours() {
  const ev = milestones();
  let h = '<div class="col" style="gap:4px"><span class="label violet">' + plural(ev.length, 'grand moment', 'grands moments') + '</span><h1 class="h1">Mon parcours</h1><span class="small mut">Tout ce que tu as accompli depuis le début, du plus récent au plus ancien.</span></div>';
  if (!ev.length) h += '<span class="mut">Ta première séance sera ton premier grand moment.</span>';
  let month = '';
  h += '<div class="tl">';
  for (const e of ev) {
    const m = new Date(e.t).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (m !== month) { month = m; h += '<span class="tlm">' + esc(m) + '</span>'; }
    const ic = e.kind === 'medal' ? medalSvg(e.medal, 22) : (ICON[ICO[e.kind]] || ICON.star);
    h += '<div class="tli k-' + e.kind + '"><span class="tld">' + ic + '</span><div class="col grow" style="gap:2px"><span style="font-weight:700">' + esc(e.title) + '</span><span class="small mut">' + esc(e.text) + '</span></div><span class="small dim" style="white-space:nowrap">' + new Date(e.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + '</span></div>';
  }
  h += '</div>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>', 1, 'full');
}

Object.assign(ACTIONS, { parcours: () => sheetParcours() });
