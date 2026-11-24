// Le dojo : les figures de calisthénie, chacune en étapes, de la plus simple à la figure finale.
// Une étape est réussie dès que ton historique contient une série assez longue (ou assez de répétitions).
// Le chrono de tenue enregistre l'essai dans une séance « Dojo » du jour (quick : pas de +50 XP, ne compte pas dans la semaine).
import { state, save, exoName } from './store.js';
import { EXOS } from './data.js';
import { figure } from './anim.js';
import { beep, wakeAudio } from './sound.js';
import { $, esc, plural, ui, ACTIONS, ICON, sheet, closeSheet, toast, burst } from './ui.js';

const DAY = 864e5;
const rerender = () => import('./app.js').then((a) => a.render());

// t = secondes à tenir, r = répétitions d'affilée. need = matériel.
export const FIGURES = [
  { id: 'hand', name: 'Équilibre sur les mains', short: 'Équilibre', steps: [{ exo: 'Wall Walk', r: 3 }, { exo: 'Handstand Hold', t: 20 }, { exo: 'Handstand Hold', t: 45 }, { exo: 'Handstand Hold', t: 75 }], tip: 'Contre le mur, ventre face au mur, mains à une main du mur. Pousse le sol, regarde entre tes mains.' },
  { id: 'crow', name: 'Corbeau', short: 'Corbeau', steps: [{ exo: 'Crow Pose', t: 5 }, { exo: 'Crow Pose', t: 15 }, { exo: 'Crow Pose', t: 30 }], tip: 'Genoux posés sur l’arrière des bras, regarde devant toi, pas tes mains. Un coussin devant ta tête la première fois.' },
  { id: 'lsit', name: 'L-sit', short: 'L-sit', steps: [{ exo: 'Pike Compression Hold', t: 20 }, { exo: 'Tuck L-Sit', t: 10 }, { exo: 'Tuck L-Sit', t: 25 }, { exo: 'L-Sit Hold', t: 10 }, { exo: 'L-Sit Hold', t: 20 }], tip: 'Sur la station de dips ou deux haltères. Épaules basses, bras verrouillés, puis tends les jambes petit à petit.' },
  { id: 'hspu', name: 'Pompes en équilibre', short: 'Pompes en équilibre', steps: [{ exo: 'Elevated Pike Push Up', r: 10 }, { exo: 'Wall Handstand Push Up Negative', r: 5 }, { exo: 'Wall Handstand Push Up', r: 3 }, { exo: 'Wall Handstand Push Up', r: 8 }], tip: 'Les pike push-ups pieds sur le banc d’abord : la tête descend devant les mains, pas entre.' },
  { id: 'onearm', name: 'Pompe à une main', short: 'Une main', steps: [{ exo: 'Archer Push Up', r: 6 }, { exo: 'Archer Push Up', r: 12 }, { exo: 'One Arm Push Up', r: 1 }, { exo: 'One Arm Push Up', r: 5 }], tip: 'Pieds très écartés, la main sous l’épaule, le bassin ne tourne pas.' },
  { id: 'pistol', name: 'Pistol squat', short: 'Pistol', steps: [{ exo: 'Assisted Pistol Squats', r: 10 }, { exo: 'Pistol Squat', r: 3 }, { exo: 'Pistol Squat', r: 8 }], tip: 'Tiens-toi à la station de dips au début. Le talon reste collé au sol.' },
  { id: 'planche', name: 'Planche', short: 'Planche', steps: [{ exo: 'Planche Lean', t: 20 }, { exo: 'Planche Lean', t: 45 }, { exo: 'Planche Hold (Tuck)', t: 5 }, { exo: 'Planche Hold (Tuck)', t: 15 }, { exo: 'Full Planche', t: 3 }], tip: 'La plus dure de toutes. Bras tendus, épaules loin devant les mains, dos rond. Des mois de travail : c’est normal.' },
  { id: 'dragon', name: 'Dragon flag', short: 'Dragon flag', steps: [{ exo: 'Hollow Hold', t: 45 }, { exo: 'Hollow Hold', t: 75 }, { exo: 'Dragon Flag', r: 3 }, { exo: 'Dragon Flag', r: 8 }], tip: 'Allongé sur le banc, agrippe-le derrière ta tête. Le corps reste droit des épaules aux pieds.' },
  { id: 'flag', name: 'Drapeau humain', short: 'Drapeau', need: 'un poteau solide', steps: [{ exo: 'Side Plank', t: 60 }, { exo: 'Human Flag', t: 3 }, { exo: 'Human Flag', t: 10 }], tip: 'Il faut un poteau ou des espaliers. La main du bas pousse, celle du haut tire.' },
];

// Ceintures : d'après le nombre d'étapes réussies dans tout le dojo.
export const BELTS = [
  { name: 'Blanche', n: 0, c: '#F4F2FB' }, { name: 'Jaune', n: 3, c: '#F2C94C' }, { name: 'Orange', n: 6, c: '#F2994A' },
  { name: 'Verte', n: 10, c: '#4CC59A' }, { name: 'Bleue', n: 15, c: '#4F8BFF' }, { name: 'Marron', n: 21, c: '#8B5A3C' }, { name: 'Noire', n: 28, c: '#1B1726' },
];
const TOTAL = FIGURES.reduce((s, f) => s + f.steps.length, 0);

const bestOf = {};
function best(name) {
  if (bestOf[name] && bestOf[name].n === state.workouts.length) return bestOf[name];
  const b = { n: state.workouts.length, r: 0, t: 0 };
  for (const w of state.workouts) for (const e of w.exercises) if (e.name === name) for (const s of e.sets) if (s.done !== false) { b.r = Math.max(b.r, s.r || 0); b.t = Math.max(b.t, s.t || 0); }
  return (bestOf[name] = b);
}
const stepVal = (st) => (st.t ? best(st.exo).t : best(st.exo).r);
const stepGoal = (st) => st.t || st.r;
export const stepOk = (st) => stepVal(st) >= stepGoal(st);
const stepTxt = (st) => exoName(st.exo) + ' · ' + (st.t ? st.t + ' s' : plural(st.r, 'répétition', 'répétitions'));

export function figStatus(f) {
  const done = f.steps.filter(stepOk).length;
  const cur = f.steps.findIndex((s) => !stepOk(s));
  return { done, cur, all: cur < 0 };
}
export function belt() {
  const n = FIGURES.reduce((s, f) => s + figStatus(f).done, 0);
  let i = 0; BELTS.forEach((b, k) => { if (n >= b.n) i = k; });
  return Object.assign({}, BELTS[i], { i, n, next: BELTS[i + 1] || null });
}

// ---------- Écran ----------
function beltSvg(c, w) { return '<svg viewBox="0 0 60 24" width="' + (w || 60) + '" aria-hidden="true"><rect x="2" y="7" width="56" height="9" rx="2" fill="' + c + '" stroke="rgba(255,255,255,0.25)"/><path d="M27 15l-6 9M33 15l6 9" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/><rect x="25" y="5" width="10" height="13" rx="2" fill="' + c + '" stroke="rgba(0,0,0,0.25)"/></svg>'; }

export function dojoView() {
  const b = belt();
  let h = '<section class="glass card row tint t-gold" style="gap:14px;align-items:center">' + beltSvg(b.c, 64)
    + '<div class="col grow" style="gap:4px"><span class="label violet">Ta ceinture</span><span class="h2">Ceinture ' + b.name.toLowerCase() + '</span>'
    + '<div class="bar gold"><div style="width:' + Math.round((b.next ? (b.n - BELTS[b.i].n) / (b.next.n - BELTS[b.i].n) : 1) * 100) + '%"></div></div>'
    + '<span class="small mut">' + b.n + (b.n > 1 ? ' étapes' : ' étape') + ' sur ' + TOTAL + (b.next ? ' · ceinture ' + b.next.name.toLowerCase() + ' à ' + b.next.n : ' · tu as tout réussi') + '</span></div></section>';
  h += '<div class="figgrid">' + FIGURES.map((f) => {
    const s = figStatus(f), st = f.steps[s.all ? f.steps.length - 1 : s.cur];
    return '<button type="button" class="glass figtile' + (s.all ? ' done' : '') + '" data-act="dojo-fig" data-id="' + f.id + '">' + figure(st.exo, 'mini')
      + '<span style="font-weight:600">' + esc(f.short) + '</span><span class="dots">' + f.steps.map((x, i) => '<i class="' + (stepOk(x) ? 'done' : i === s.cur ? 'current' : '') + '"></i>').join('') + '</span>'
      + '<span class="small mut">' + (s.all ? 'Maîtrisée' : 'Étape ' + (s.cur + 1) + ' sur ' + f.steps.length) + '</span></button>';
  }).join('') + '</div>';
  h += '<span class="small dim">Chaque essai noté ici s’ajoute à ta séance « Dojo » du jour, dans l’historique. Une figure réussie en séance compte aussi.</span>';
  return h;
}

function sheetFig(id) {
  const f = FIGURES.find((x) => x.id === id), s = figStatus(f);
  const st = f.steps[s.all ? f.steps.length - 1 : s.cur];
  let h = '<div class="col" style="gap:4px"><span class="label violet">Dojo' + (f.need ? ' · il faut ' + esc(f.need) : '') + '</span><h1 class="h1">' + esc(f.name) + '</h1></div>'
    + '<div class="figbox">' + figure(st.exo) + '</div>'
    + '<span class="small" style="color:var(--soft)">' + esc(f.tip) + '</span><div class="list">'
    + f.steps.map((x, i) => {
      const ok = stepOk(x), v = stepVal(x), cur = i === s.cur;
      return '<button type="button" class="item" data-act="exo" data-name="' + esc(x.exo) + '"' + (!ok && !cur ? ' style="opacity:0.55"' : '') + '><span class="stepn' + (ok ? ' ok' : '') + '">' + (ok ? '✓' : i + 1) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(stepTxt(x)) + '</span><span class="small mut">' + (ok ? 'Réussie' : v ? 'Ton record : ' + v + (x.t ? ' s' : '') : 'Pas encore essayé') + '</span></div>' + ICON.chev + '</button>';
    }).join('') + '</div>';
  if (!s.all) {
    h += st.t ? '<button type="button" class="pill gold-btn wide big" data-act="dojo-hold" data-id="' + f.id + '">Tenir ' + esc(exoName(st.exo)).toLowerCase() + '</button>'
      : '<div class="row" style="gap:8px"><label class="field grow" style="height:56px"><input id="dojo-r" inputmode="numeric" placeholder="Combien ?" aria-label="Répétitions"><span class="unit">rép.</span></label><button type="button" class="pill gold-btn" style="height:56px" data-act="dojo-reps" data-id="' + f.id + '">Noter</button></div>';
  }
  h += '<button type="button" class="pill sm glass wide" data-act="close">Fermer</button>';
  sheet(h, 1, 'full');
}

// ---------- Chrono de tenue ----------
let hold = null;
function holdScreen() {
  const f = FIGURES.find((x) => x.id === hold.id), st = f.steps[figStatus(f).cur];
  const h = '<div class="col center" style="gap:10px;padding-top:10px"><span class="label violet">' + esc(exoName(st.exo)) + ' · objectif ' + st.t + ' s</span>'
    + '<div class="figbox">' + figure(st.exo) + '</div>'
    + '<span class="num" id="dj-t" style="font-size:84px;line-height:1">' + (hold.go ? '0' : '3') + '</span><span class="small mut" id="dj-s">' + (hold.go ? 'Tiens !' : 'Mets-toi en place…') + '</span>'
    + '<div class="bar gold" style="width:100%"><div id="dj-b" style="width:0%"></div></div></div>'
    + '<button type="button" class="pill gold-btn wide big" data-act="dojo-stop">J’ai lâché</button><button type="button" class="pill sm glass wide" data-act="dojo-cancel">Annuler</button>';
  sheet(h, 2, 'full');
}
function holdTick() {
  if (!hold) return;
  const el = $('dj-t'); if (!el) { hold = null; return; }
  const now = performance.now();
  if (!hold.go) {
    const left = Math.ceil((hold.t0 - now) / 1000);
    el.textContent = Math.max(1, left);
    if (left !== hold.last) { hold.last = left;  }
    if (now >= hold.t0) { hold.go = true; hold.start = now; beep(true); $('dj-s').textContent = 'Tiens !'; }
  } else {
    const sec = Math.floor((now - hold.start) / 1000);
    el.textContent = sec;
    $('dj-b').style.width = Math.min(100, (sec / hold.goal) * 100) + '%';
    if (sec >= hold.goal && !hold.reached) { hold.reached = true; beep(true); $('dj-s').textContent = 'Objectif atteint, tiens encore si tu peux'; el.style.color = 'var(--gold)'; }
  }
  hold.raf = requestAnimationFrame(holdTick);
}

// Enregistre un essai dans la séance « Dojo » du jour.
function record(name, set) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  let w = state.workouts.find((x) => x.dojo && x.start >= t0.getTime() && x.start < t0.getTime() + DAY);
  if (!w) { w = { id: 'dj' + Date.now(), title: 'Dojo', quick: true, dojo: true, start: Date.now(), end: Date.now(), exercises: [] }; state.workouts.push(w); }
  let e = w.exercises.find((x) => x.name === name);
  if (!e) { e = { name, sets: [] }; w.exercises.push(e); }
  e.sets.push(Object.assign({ done: true }, set));
  for (const k of Object.keys(bestOf)) delete bestOf[k];
  w.end = Date.now();
  save();
}
function after(f, before) {
  const s = figStatus(f), bb = belt();
  if (s.done > before.done) {
    burst();
    toast(s.all ? f.name + ' maîtrisée' : 'Étape réussie : ' + stepTxt(f.steps[before.cur]), true);
    if (bb.i > before.belt) setTimeout(() => toast('Nouvelle ceinture : ' + bb.name.toLowerCase(), true), 1600);
  } else toast('Essai noté');
  sheetFig(f.id); rerender();
}

Object.assign(ACTIONS, {
  'dojo-fig': (el) => sheetFig(el.dataset.id),
  'dojo-hold': (el) => {
    wakeAudio();
    const f = FIGURES.find((x) => x.id === el.dataset.id), st = f.steps[figStatus(f).cur];
    hold = { id: f.id, goal: st.t, go: false, t0: performance.now() + 3000, last: 4 };
    holdScreen(); hold.raf = requestAnimationFrame(holdTick);
  },
  'dojo-stop': () => {
    if (!hold) return;
    cancelAnimationFrame(hold.raf);
    const f = FIGURES.find((x) => x.id === hold.id), st = f.steps[figStatus(f).cur];
    const sec = hold.go ? Math.floor((performance.now() - hold.start) / 1000) : 0;
    hold = null;
    if (sec < 1) { toast('Trop court pour être noté'); sheetFig(f.id); return; }
    const before = Object.assign(figStatus(f), { belt: belt().i });
    record(st.exo, { t: sec });
    after(f, before);
  },
  'dojo-cancel': () => { if (hold) cancelAnimationFrame(hold.raf); const id = hold && hold.id; hold = null; if (id) sheetFig(id); else closeSheet(); },
  'dojo-reps': (el) => {
    const n = parseInt(($('dojo-r') || {}).value, 10);
    if (!(n > 0 && n < 500)) { toast('Indique un nombre de répétitions'); return; }
    const f = FIGURES.find((x) => x.id === el.dataset.id), st = f.steps[figStatus(f).cur];
    const before = Object.assign(figStatus(f), { belt: belt().i });
    record(st.exo, { r: n });
    after(f, before);
  },
});
