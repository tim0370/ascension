// Mode campagne : 6 chapitres de 5 étapes, la dernière est un boss. Chaque étape est une vraie performance,
// vérifiée dans l'historique (une série, une course, une journée de pompes). +50 XP par étape, +250 par épreuve finale.
// Un chapitre s'ouvre quand le boss du précédent est battu ; le boss s'ouvre quand les 4 étapes du chapitre sont faites.
// state.camp = { idÉtape: date de réussite } : sert à l'XP (store.js) et à la fête une seule fois.
import { state, save, exoName, fr, dur } from './store.js';
import { EXOS } from './data.js';
import { figure } from './anim.js';
import { esc, plural, ACTIONS, ICON, sheet, toast, burst } from './ui.js';

export const STEP_XP = 50, BOSS_XP = 250;
const rerender = () => import('./app.js').then((a) => a.render());
const DIPS = ['Triceps Dip', 'Chest Dip'];

// r = répétitions d'affilée (w = lest minimum), t = secondes, run = km (pace = secondes par km au plus), day = pompes dans la journée.
export const CHAPTERS = [
  { id: 'c1', name: 'Les bases', sub: 'Pompes, dips et course : des répétitions propres.', col: '#4CC59A', steps: [
    { exo: 'Push Up', r: 20 }, { exo: DIPS, r: 10 }, { exo: 'Squat (Bodyweight)', r: 30, lb: 'squats' }, { run: 3 },
    { boss: '100 pompes dans la journée', day: 100, desc: '100 pompes dans la même journée, en autant de séries que tu veux.' }] },
  { id: 'c2', name: 'Force avec lest', sub: 'Le gilet et les haltères entrent en jeu.', col: '#55A8FF', steps: [
    { exo: 'Push Up', r: 30 }, { exo: DIPS, r: 15 }, { exo: 'Plank', t: 90 }, { run: 5 },
    { boss: '10 dips avec 10 kg', exo: DIPS, r: 10, w: 10, desc: '10 dips d’affilée avec 10 kg de lest.' }] },
  { id: 'c3', name: 'Vitesse et explosivité', sub: 'Aller vite et pousser fort.', col: '#A68DFF', steps: [
    { exo: 'Clap Push Up', r: 10 }, { exo: 'Push Up', r: 40 }, { run: 5, pace: 336 }, { exo: 'Wall Sit', t: 120 },
    { boss: '8 dips avec 20 kg', exo: DIPS, r: 8, w: 20, desc: '8 dips d’affilée avec 20 kg de lest.' }] },
  { id: 'c4', name: 'Unilatéral et équilibre', sub: 'Un bras, une jambe, la tête en bas.', col: '#FFB54D', steps: [
    { exo: 'Archer Push Up', r: 10 }, { exo: 'Handstand Hold', t: 30 }, { run: 10 }, { exo: 'Assisted Pistol Squats', r: 10, lb: 'pistol squats assistés' },
    { boss: '200 pompes dans la journée', day: 200, desc: '200 pompes dans la même journée.' }] },
  { id: 'c5', name: 'Endurance totale', sub: 'Beaucoup de volume, partout.', col: '#FF6B7E', steps: [
    { exo: 'Clap Push Up', r: 20 }, { exo: 'Push Up', r: 50 }, { run: 10, pace: 330 }, { exo: 'Wall Handstand Push Up', r: 5, lb: 'pompes en équilibre contre le mur' },
    { boss: '6 dips avec 25 kg', exo: DIPS, r: 6, w: 25, desc: '6 dips d’affilée avec 25 kg de lest (gilet et haltère).' }] },
  { id: 'c6', name: 'Niveau expert', sub: 'Ce que presque personne ne fait.', col: '#FFE7A3', steps: [
    { exo: 'One Arm Push Up', r: 3 }, { exo: 'Pistol Squat', r: 5, lb: 'pistol squats' }, { exo: 'Handstand Hold', t: 60 }, { run: 21 },
    { boss: '300 pompes dans la journée', day: 300, desc: '300 pompes dans la même journée.' }] },
];

// ---------- Vérification dans l'historique ----------
let cache = null;
function stats() {
  if (cache && cache.n === state.workouts.length && cache.at > Date.now() - 5000) return cache;
  const best = {}, bestW = [], day = {}, runs = [];
  const isPush = (n) => EXOS[n] && EXOS[n].g === 'pompes';
  for (const w of state.workouts) {
    const d = new Date(w.start); const k = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    for (const e of w.exercises) for (const s of e.sets) {
      if (s.done === false) continue;
      if (e.name === 'Running') { if (s.d) runs.push(s); continue; }
      const b = best[e.name] || (best[e.name] = { r: 0, t: 0 });
      b.r = Math.max(b.r, s.r || 0); b.t = Math.max(b.t, s.t || 0);
      if (s.w) bestW.push([e.name, s.w, s.r || 0]);
      if (isPush(e.name)) day[k] = (day[k] || 0) + (s.r || 0);
    }
  }
  return (cache = { n: state.workouts.length, at: Date.now(), best, bestW, dayMax: Math.max(0, ...Object.values(day)), runs });
}
// Où en est une étape : v = ton meilleur, goal = le but, ratio de 0 à 1.
export function stepInfo(st) {
  const S = stats();
  if (st.day) return { v: S.dayMax, goal: st.day, ratio: Math.min(1, S.dayMax / st.day), unit: 'pompes' };
  if (st.run) {
    let v = 0, txt = '';
    for (const r of S.runs) {
      let x = Math.min(1, r.d / st.run);
      if (x >= 1 && st.pace) x = r.t > 0 ? Math.min(1, st.pace / (r.t / r.d)) : 0;
      else if (st.pace) x *= 0.9;
      if (x > v) { v = x; txt = fr(r.d) + ' km' + (r.t ? ' en ' + dur(r.t) : ''); }
    }
    return { v: txt, goal: st.run, ratio: v, run: true };
  }
  const names = [].concat(st.exo);
  let v = 0;
  if (st.w) { for (const [n, w, r] of S.bestW) if (names.includes(n) && w >= st.w) v = Math.max(v, r); }
  else for (const n of names) { const b = S.best[n]; if (b) v = Math.max(v, st.t ? b.t : b.r); }
  const goal = st.t || st.r;
  return { v, goal, ratio: Math.min(1, v / goal), unit: st.t ? 's' : 'rép.' };
}
const met = (st) => stepInfo(st).ratio >= 1;
export function stepLabel(st) {
  if (st.day) return st.day + ' pompes dans la journée';
  if (st.run) return st.pace ? fr(st.run, 0) + ' km en moins de ' + dur(Math.round(st.pace * st.run)) : 'Courir ' + fr(st.run, 0) + ' km d’un coup';
  const n = exoName([].concat(st.exo)[0]);
  return st.t ? n + ' : ' + (st.t >= 60 && st.t % 60 === 0 ? (st.t / 60) + ' min' : st.t + ' s') : st.r + ' ' + (st.lb || n.toLowerCase()) + ' d’affilée' + (st.w ? ' avec ' + st.w + ' kg' : '');
}
const sid = (c, i) => c.id + '-' + (i === 4 ? 'b' : i + 1);

// État de toute la campagne : étapes réussies (dans l'ordre des règles), chapitre en cours.
export function campaign() {
  const out = []; let open = true;
  for (const c of CHAPTERS) {
    const st = c.steps.map((s, i) => ({ s, i, id: sid(c, i), ok: false }));
    if (open) {
      for (const x of st.slice(0, 4)) x.ok = met(x.s);
      const four = st.slice(0, 4).every((x) => x.ok);
      st[4].ok = four && met(st[4].s);
      st[4].open = four;
    }
    out.push({ c, open, st, done: st[4].ok });
    if (!st[4].ok) open = false;
  }
  const cur = out.find((x) => x.open && !x.done) || null;
  return { chapters: out, cur, done: out.every((x) => x.done), n: out.reduce((s, x) => s + x.st.filter((y) => y.ok).length, 0) };
}

// Note les étapes nouvellement réussies (une fête par étape, une fois). Appelé à chaque affichage de l'accueil.
export function checkCamp() {
  const C = campaign();
  state.camp = state.camp || {};
  const fresh = [];
  for (const ch of C.chapters) for (const x of ch.st) if (x.ok && !state.camp[x.id]) { state.camp[x.id] = Date.now(); fresh.push(x); }
  if (!fresh.length) return;
  save();
  const xp = fresh.reduce((s, x) => s + (x.i === 4 ? BOSS_XP : STEP_XP), 0);
  // Premier calcul : l'historique valide d'un coup tout ce qui était déjà fait.
  if (!state.settings.campSeen) { state.settings.campSeen = 1; save(); setTimeout(() => toast('Campagne : ' + plural(fresh.length, 'étape déjà réussie', 'étapes déjà réussies') + ' grâce à ton historique · +' + xp + ' XP', true), 900); return; }
  burst();
  const boss = fresh.find((x) => x.i === 4);
  setTimeout(() => toast(boss ? 'Épreuve finale réussie · +' + xp + ' XP' : 'Campagne : ' + stepLabel(fresh[0].s) + ' · +' + xp + ' XP', true), 600);
}

// ---------- Affichage ----------
export function campCard() {
  const C = campaign();
  if (!C.cur) return '';
  const ch = C.cur, next = ch.st.find((x) => !x.ok && (x.i < 4 || x.open)), inf = next ? stepInfo(next.s) : null;
  const idx = CHAPTERS.indexOf(ch.c) + 1;
  return '<section class="glass card col tap tint t-violet" role="button" tabindex="0" data-act="camp-open" style="gap:10px"><div class="row between"><span class="label violet">Campagne · chapitre ' + idx + ' · ' + esc(ch.c.name) + '</span>' + ICON.chev + '</div>'
    + (next ? '<span class="h2">' + (next.i === 4 ? 'Épreuve finale : ' + esc(next.s.boss) : esc(stepLabel(next.s))) + '</span><div class="bar"><div style="width:' + Math.round(inf.ratio * 100) + '%"></div></div>' : '')
    + '<span class="dots" style="gap:6px">' + ch.st.map((x) => '<i class="' + (x.ok ? 'done' : x === next ? 'current' : '') + '"></i>').join('') + '</span></section>';
}

function chapHtml(ch, k) {
  let h = '';
    const lock = !ch.open;
    h += '<section class="glass card col chap' + (lock ? ' lock' : '') + (ch.done ? ' won' : '') + '" style="--cc:' + ch.c.col + '">'
      + '<div class="row between" style="gap:10px"><div class="col" style="gap:2px"><span class="label" style="color:var(--cc)">Chapitre ' + (k + 1) + (ch.done ? ' · terminé' : lock ? ' · fermé' : '') + '</span><span class="h2">' + esc(ch.c.name) + '</span><span class="small mut">' + esc(lock ? 'Bats le épreuve finale du chapitre ' + k + ' pour l’ouvrir.' : ch.c.sub) + '</span></div></div>'
      + '<div class="path">' + ch.st.map((x, i) => {
        const cur = !lock && !x.ok && (i < 4 || x.open) && ch.st.slice(0, i).filter((y) => !y.ok).length === 0;
        const off = lock || (i === 4 && !x.open);
        const inf = off || x.ok ? null : stepInfo(x.s);
        const cls = 'node' + (i === 4 ? ' boss' : '') + (x.ok ? ' ok' : '') + (cur ? ' cur' : '') + (off ? ' off' : '');
        return '<button type="button" class="prow' + (off ? ' off' : '') + '" data-act="camp-step" data-id="' + x.id + '"><span class="' + cls + '">' + (x.ok ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4L18 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : i === 4 ? ICON.bolt : '<b>' + (i + 1) + '</b>') + '</span>'
          + '<span class="col grow" style="gap:3px;min-width:0"><span style="font-weight:600">' + (i === 4 ? 'Épreuve finale : ' + esc(x.s.boss) : esc(stepLabel(x.s))) + '</span><span class="small mut">' + (x.ok ? 'Réussi · +' + (i === 4 ? BOSS_XP : STEP_XP) + ' XP' : i === 4 && !off ? esc(x.s.desc) : i === 4 ? 'S’ouvre après les 4 étapes' : inf ? (inf.run ? (inf.v ? 'Ton meilleur : ' + esc(inf.v) : 'Pas encore fait') : 'Ton meilleur : ' + inf.v + ' sur ' + inf.goal) : '') + '</span></span>' + ICON.chev + '</button>';
      }).join('') + '</div></section>';
  return h;
}

// Le chapitre en cours seulement (onglet Défis).
export function campNow() {
  const C = campaign();
  if (C.done) return '<section class="glass card col tint t-gold"><span class="h2">Campagne terminée</span><span class="small mut">Les 6 chapitres sont battus. Respect.</span></section>';
  const k = C.chapters.indexOf(C.cur);
  return '<div class="camp">' + chapHtml(C.cur, k) + '</div><span class="small mut">' + C.n + (C.n > 1 ? ' étapes' : ' étape') + ' sur 30 · chaque étape est une vraie performance, vérifiée dans ton historique. +' + STEP_XP + ' XP par étape, +' + BOSS_XP + ' par épreuve finale.</span>';
}

export function campView() {
  const C = campaign();
  let h = '<section class="glass card col" style="gap:8px"><div class="row between"><span class="label violet">Campagne</span><span class="small mut">' + C.n + (C.n > 1 ? ' étapes' : ' étape') + ' sur 30</span></div>'
    + '<div class="bar"><div style="width:' + Math.round((C.n / 30) * 100) + '%"></div></div>'
    + '<span class="small mut">Chaque étape est une vraie performance, vérifiée dans ton historique : fais-la en séance, dans les figures ou en pompes du jour. +' + STEP_XP + ' XP par étape, +' + BOSS_XP + ' par épreuve finale.</span></section>';
  h += '<div class="camp">';
  C.chapters.forEach((ch, k) => { h += chapHtml(ch, k); });
  h += '</div>';
  return h;
}

function sheetStep(id) {
  const C = campaign();
  let ch, x;
  for (const c of C.chapters) for (const y of c.st) if (y.id === id) { ch = c; x = y; }
  if (!x) return;
  const inf = stepInfo(x.s), k = CHAPTERS.indexOf(ch.c) + 1, exo = x.s.run ? 'Running' : x.s.day ? 'Push Up' : [].concat(x.s.exo)[0];
  const boss = x.i === 4;
  let h = '<div class="col" style="gap:4px"><span class="label" style="color:' + ch.c.col + '">Chapitre ' + k + ' · ' + esc(ch.c.name) + (boss ? ' · épreuve finale' : ' · étape ' + (x.i + 1)) + '</span><h1 class="h1">' + esc(boss ? x.s.boss : stepLabel(x.s)) + '</h1>' + (boss ? '<span class="small" style="color:var(--soft)">' + esc(x.s.desc) + '</span>' : '') + '</div>'
    + '<div class="figbox">' + figure(exo) + '</div>'
    + '<section class="glass card col" style="gap:8px"><div class="row between"><span class="label">' + (x.ok ? 'Réussi' : 'Ton meilleur') + '</span><span class="small mut">' + (inf.run ? esc(inf.v || 'Aucune course') : inf.v + ' sur ' + inf.goal + ' ' + inf.unit) + '</span></div><div class="bar' + (x.ok ? ' gold' : '') + '"><div style="width:' + Math.round(inf.ratio * 100) + '%"></div></div>'
    + '<span class="small mut">' + (x.ok ? '+' + (boss ? BOSS_XP : STEP_XP) + ' XP gagnés.' : !ch.open ? 'Ce chapitre n’est pas encore ouvert.' : boss && !x.open ? 'L’épreuve finale s’ouvre quand les 4 étapes du chapitre sont réussies.' : x.s.day ? 'Note tes séries dans « Pompes du jour » sur l’accueil : elles s’additionnent sur la journée.' : 'Fais-le en séance ou ajoute l’exercice à une séance libre : l’étape se valide toute seule.') + '</span></section>'
    + (x.s.run ? '' : '<button type="button" class="pill sm glass wide" data-act="exo" data-name="' + esc(exo) + '">Voir la fiche de l’exercice</button>')
    + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>';
  sheet(h);
}

Object.assign(ACTIONS, {
  'camp-step': (el) => sheetStep(el.dataset.id),
  'camp-open': () => import('./ui.js').then((u) => { u.ui.tab = 'defis'; import('./app.js').then((a) => { a.render(); window.scrollTo(0, 0); }); }),
  'camp-all': () => sheet('<div class="col" style="gap:4px"><span class="label violet">Campagne</span><h1 class="h1">Les 6 chapitres</h1></div>' + campView() + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>', 1, 'full'),
});
