// Boss de la semaine : un défi unique, qui change chaque lundi, à battre pour gagner 300 XP.
// Ses points de vie = le chiffre à dépasser, calé sur ton meilleur niveau (et plus dur à chaque victoire).
import { state, save, exoName, countPrs } from './store.js';
import { figure } from './anim.js';
import { beep, wakeAudio } from './sound.js';
import { $, esc, plural, ui, ACTIONS, ICON, sheet, closeSheet, toast, burst } from './ui.js';
import { render } from './app.js';

const DAY = 864e5;
export const BOSS_XP = 300;

// secs = combat chronométré (le plus de répétitions possible dans le temps), sinon une seule série au maximum.
export const BOSSES = [
  { id: 'mur', name: 'Le Mur', desc: 'Le plus de pompes possible en 1 minute.', exo: 'Push Up', secs: 60 },
  { id: 'titan', name: 'Le Titan', desc: 'Le plus de dips d’affilée avec 10 kg de lest.', exo: 'Triceps Dip', w: 10 },
  { id: 'colosse', name: 'Le Colosse', desc: 'Le plus de pistols en 2 minutes, en comptant les deux jambes.', exo: 'Pistol Squat', alt: 'Assisted Pistol Squats', secs: 120 },
  { id: 'eclair', name: 'L’Éclair', desc: 'Le plus de pompes explosives d’affilée. Les mains décollent à chaque fois.', exo: 'Explosive Push Up' },
  { id: 'ombre', name: 'L’Ombre', desc: 'Le plus de burpees en 3 minutes.', exo: 'Burpee', secs: 180 },
  { id: 'roc', name: 'Le Roc', desc: 'Le plus de dips sans lest en 1 minute.', exo: 'Triceps Dip', secs: 60 },
];

const monday = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };

// Meilleure série avant une date (pour que les PV ne bougent pas après ta victoire).
let upTo = Infinity;
function bestSet(test) {
  let m = 0;
  for (const w of state.workouts) if (w.start < upTo) for (const e of w.exercises) for (const x of e.sets) if (test(e.name, x)) m = Math.max(m, x.r || 0);
  return m;
}

// L'exercice du boss : la version assistée si tu ne fais pas encore la vraie.
function exoOf(b) {
  if (b.alt && !bestSet((n) => n === b.exo)) return b.alt;
  return b.exo;
}

// Points de vie : ta meilleure tentative contre ce boss + 1, ou une estimation d'après tes séries.
function hpOf(b, before) {
  const tries = state.workouts.filter((w) => w.boss && w.boss.id === b.id && w.start < before);
  const wins = tries.filter((w) => w.boss.win).length;
  const top = Math.max(0, ...tries.map((w) => w.boss.score));
  if (top) return { hp: top + 1, level: wins + 1 };
  const e = exoOf(b);
  upTo = before;
  let est;
  if (b.id === 'mur') est = Math.round(Math.max(15, bestSet((n, x) => n === 'Push Up' && !x.w)) * 1.15);
  else if (b.id === 'titan') est = Math.max(6, bestSet((n, x) => n === 'Triceps Dip' && (x.w || 0) >= 10) + 1);
  else if (b.id === 'colosse') est = Math.max(8, bestSet((n) => n === e) * 3);
  else if (b.id === 'eclair') est = Math.max(8, bestSet((n) => n === e) + 1);
  else if (b.id === 'ombre') est = 35;
  else est = Math.round(Math.max(12, bestSet((n, x) => n === 'Triceps Dip' && !x.w)) * 1.1);
  upTo = Infinity;
  return { hp: est, level: 1 };
}

// Le boss de cette semaine, ses PV, et si tu l'as déjà battu.
export function weekBoss() {
  const m = monday(Date.now());
  const b = BOSSES[Math.floor(m / (7 * DAY)) % BOSSES.length];
  const tries = state.workouts.filter((w) => w.boss && w.boss.id === b.id && w.start >= m);
  const won = tries.find((w) => w.boss.win);
  const { hp, level } = hpOf(b, won ? won.start : Date.now() + 1);
  const best = Math.max(0, ...tries.map((w) => w.boss.score));
  return Object.assign({}, b, { exo: exoOf(b), hp, level, tries: tries.length, best, won: !!won, ends: m + 7 * DAY });
}

// Visuel du boss : la silhouette de l'exercice dans un blason sombre.
export function bossArt(b, cls) {
  return '<div class="bossart ' + (cls || '') + '"><svg class="bossring" viewBox="0 0 120 120" aria-hidden="true"><polygon points="60,4 110,32 110,88 60,116 10,88 10,32" /></svg>' + figure(b.exo, 'boss') + '</div>';
}

export function bossCard() {
  const b = weekBoss();
  const left = Math.max(1, Math.ceil((b.ends - Date.now()) / DAY));
  const life = b.won ? 0 : Math.max(0, 1 - b.best / b.hp);
  return '<section class="glass card boss hud tap' + (b.won ? ' won' : '') + '" role="button" tabindex="0" data-act="boss">'
    + bossArt(b, 'sm')
    + '<div class="col grow" style="gap:6px"><span class="label">' + (b.won ? 'Boss vaincu' : 'Boss de la semaine · ' + plural(left, 'jour', 'jours')) + '</span>'
    + '<span class="h2">' + esc(b.name) + (b.level > 1 ? ' <span class="small mut">niv. ' + b.level + '</span>' : '') + '</span>'
    + '<div class="hp"><div style="width:' + Math.round(life * 100) + '%"></div></div>'
    + '<span class="small mut">' + (b.won ? 'Reviens lundi pour le suivant' : b.hp + ' PV · ' + esc(exoName(b.exo)) + (b.secs ? ' en ' + (b.secs >= 120 ? b.secs / 60 + ' min' : b.secs + ' s') : ' d’affilée')) + '</span></div></section>';
}

// ---------- Le combat ----------
let fight = null; // { b, phase: 'ready' | 'count' | 'go' | 'score', t0, score, timer }

export function sheetBoss() {
  const b = weekBoss();
  fight = { b, phase: 'ready', score: Math.max(1, b.best || Math.round(b.hp * 0.8)) };
  drawBoss();
}

function drawBoss() {
  const f = fight, b = f.b;
  const life = b.won ? 0 : Math.max(0, 1 - b.best / b.hp);
  let h = '<div class="col center" style="gap:10px">' + bossArt(b, 'big')
    + '<span class="label" style="color:var(--rouge)">' + (b.won ? 'Vaincu cette semaine' : 'Boss de la semaine') + '</span>'
    + '<h1 class="h1" style="font-size:34px">' + esc(b.name) + '</h1>'
    + '<div class="hp big"><div id="boss-hp" style="width:' + Math.round(life * 100) + '%"></div></div>'
    + '<span class="small mut">' + b.hp + ' PV · niveau ' + b.level + (b.tries ? ' · ' + plural(b.tries, 'tentative', 'tentatives') + ', meilleure : ' + b.best : '') + '</span></div>';
  h += '<section class="glass card col" style="gap:8px"><span class="h2">' + esc(b.desc) + '</span><span class="small mut">Exercice : ' + esc(exoName(b.exo)) + (b.w ? ' avec ' + b.w + ' kg' : '') + '. Pour le battre, fais au moins ' + b.hp + ' répétitions. Victoire : +' + BOSS_XP + ' XP.</span></section>';
  if (f.phase === 'ready') {
    if (b.won) h += '<span class="small mut" style="text-align:center">Tu peux le refaire pour t’entraîner, mais la victoire de la semaine est déjà comptée.</span>';
    h += '<button type="button" class="pill gold-btn wide big" data-act="boss-go">' + (b.secs ? 'Lancer le combat (' + (b.secs >= 120 ? b.secs / 60 + ' min' : b.secs + ' s') + ')' : 'Lancer le combat') + '</button>';
  } else if (f.phase === 'count' || f.phase === 'go') {
    h += '<div class="col center" style="gap:4px"><span class="num" id="boss-clock" style="font-size:84px;line-height:1">' + clockText() + '</span><span class="small mut" id="boss-sub">' + (f.phase === 'count' ? 'Prépare-toi' : 'Go, à fond') + '</span></div>'
      + '<button type="button" class="pill glass wide big" data-act="boss-stop">' + (b.secs ? 'J’arrête avant la fin' : 'J’ai fini ma série') + '</button>';
  } else {
    h += '<div class="col center" style="gap:6px"><span class="label">Tes répétitions</span><div class="row" style="gap:10px;width:100%"><button type="button" class="stepbtn" data-act="boss-step" data-d="-1" aria-label="Moins">' + ICON.minus + '</button>'
      + '<div class="col grow center"><input class="bignum" id="boss-score" inputmode="numeric" value="' + f.score + '" aria-label="Répétitions"></div>'
      + '<button type="button" class="stepbtn" data-act="boss-step" data-d="1" aria-label="Plus">' + ICON.plus + '</button></div></div>'
      + '<button type="button" class="pill gold-btn wide big" data-act="boss-hit">Porter le coup</button>';
  }
  h += '<button type="button" class="pill sm glass wide" data-act="boss-close" style="color:var(--mut)">Fermer</button>';
  sheet(h);
}

function clockText() {
  const f = fight;
  if (f.phase === 'count') return String(Math.max(1, Math.ceil((f.t0 - Date.now()) / 1000)));
  if (!f.b.secs) { const s = Math.floor((Date.now() - f.t0) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  const left = Math.max(0, Math.ceil((f.t0 + f.b.secs * 1000 - Date.now()) / 1000));
  return Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
}

function loop() {
  const f = fight;
  if (!f || (f.phase !== 'count' && f.phase !== 'go')) return;
  if (f.phase === 'count' && Date.now() >= f.t0) { f.phase = 'go'; f.t0 = Date.now(); beep(true); const sub = $('boss-sub'); if (sub) sub.textContent = 'Go, à fond'; }
  if (f.phase === 'go' && f.b.secs && Date.now() >= f.t0 + f.b.secs * 1000) { beep(true); f.phase = 'score'; drawBoss(); return; }
  const c = $('boss-clock');
  if (!c) { fight.phase = 'ready'; return; } // fenêtre fermée
  c.textContent = clockText();
  f.timer = setTimeout(loop, 200);
}

function hit() {
  const f = fight, b = f.b;
  const inp = $('boss-score');
  const score = Math.max(0, parseInt(inp && inp.value, 10) || 0);
  if (!score) { toast('Indique tes répétitions'); return; }
  const win = score >= b.hp;
  const now = Date.now();
  const w = { id: 'b' + now, title: 'Boss · ' + b.name, start: f.start || now - 60000, end: now,
    exercises: [{ name: b.exo, sets: [Object.assign({ done: true, r: score }, b.w ? { w: b.w } : {})] }],
    boss: { id: b.id, hp: b.hp, score, win: win && !b.won } };
  state.workouts.push(w);
  w.prs = countPrs(w);
  save();
  // L'animation : la barre de vie descend, puis le verdict.
  const bar = $('boss-hp');
  if (bar) bar.style.width = Math.round(Math.max(0, 1 - score / b.hp) * 100) + '%';
  setTimeout(() => {
    closeSheet();
    render();
    if (win && !b.won) { burst(); beep(true); toast(b.name + ' est vaincu · +' + BOSS_XP + ' XP', true); }
    else if (win) toast('Encore battu, bravo');
    else toast(b.name + ' tient encore : il lui reste ' + (b.hp - score) + ' PV');
  }, 900);
}

Object.assign(ACTIONS, {
  boss: () => sheetBoss(),
  'boss-go': () => { wakeAudio(); fight.phase = 'count'; fight.start = Date.now(); fight.t0 = Date.now() + 3000; drawBoss(); loop(); },
  'boss-stop': () => { clearTimeout(fight.timer); fight.phase = 'score'; drawBoss(); },
  'boss-step': (el) => { const i = $('boss-score'); if (i) i.value = Math.max(0, (parseInt(i.value, 10) || 0) + Number(el.dataset.d)); },
  'boss-hit': () => hit(),
  'boss-close': () => { if (fight) clearTimeout(fight.timer); fight = null; closeSheet(); },
});
