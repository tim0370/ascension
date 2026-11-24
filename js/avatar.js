// Ton héros : un personnage vu de face qui change avec tes vraies séances.
// Chaque muscle grossit avec le travail des dernières semaines (un travail ancien compte de moins en moins),
// l'aura prend la couleur de ton rang, et les tenues se débloquent avec ce que tu accomplis ailleurs dans l'app.
import { state, save, sorted, exoName, levelInfo, totalXp } from './store.js';
import { EXOS } from './data.js';
import { musclesOf, ZONES } from './corps.js';
import { rankInfo } from './stats.js';
import { esc, plural, ui, ACTIONS, ICON, sheet, toast } from './ui.js';

const DAY = 864e5;
const HALF = 45; // demi-vie du travail, en jours : un muscle délaissé dégonfle doucement
const K = 110;   // séries « fraîches » pour atteindre environ 63 % du développement d'un muscle
const rerender = () => import('./app.js').then((a) => a.render());

// Les parties du héros et les muscles de la carte du corps qui les font grossir.
export const PARTS = {
  pecs: { name: 'Pectoraux', z: ['pecs'] },
  epaules: { name: 'Épaules', z: ['epaules'] },
  bras: { name: 'Bras', z: ['triceps', 'biceps'] },
  avantbras: { name: 'Avant-bras', z: ['avantbras'] },
  abdos: { name: 'Abdominaux', z: ['abdos', 'obliques'] },
  dos: { name: 'Dos et trapèzes', z: ['dos', 'trapezes', 'lombaires'] },
  jambes: { name: 'Cuisses et fessiers', z: ['quadri', 'ischios', 'fessiers'] },
  mollets: { name: 'Mollets', z: ['mollets'] },
};

// Développement de chaque partie, de 0 à 1, tel qu'il était au moment `at`.
export function development(at = Date.now()) {
  const raw = {};
  for (const w of state.workouts) {
    if (w.start > at) continue;
    const age = (at - w.start) / DAY;
    const f = Math.pow(0.5, age / HALF);
    if (f < 0.02) continue;
    for (const e of w.exercises) {
      const m = musclesOf(e.name);
      let n = 0;
      for (const s of e.sets) if (s.done !== false) n += e.name === 'Running' ? Math.min(3, (s.d || 0) * 0.5) : 1 + Math.min(1, (s.w || 0) / 20);
      if (!n) continue;
      for (const [z, k] of Object.entries(m)) raw[z] = (raw[z] || 0) + n * k * f;
    }
  }
  const out = {};
  for (const [id, p] of Object.entries(PARTS)) {
    const v = p.z.reduce((s, z) => s + (raw[z] || 0), 0) / p.z.length;
    out[id] = Math.min(1, 1 - Math.exp(-v / K));
  }
  return out;
}

// ---------- Aura et tenues ----------
const AURA = { E: ['#8E88A8', '#5B5670'], D: ['#4CC59A', '#1C6E52'], C: ['#55A8FF', '#1E4F9A'], B: ['#A68DFF', '#5236B8'], A: ['#FF6B7E', '#8A1F33'], S: ['#FFB54D', '#A3581A'], Z: ['#FFE7A3', '#C77DFF'] };

function bossWins() { return state.workouts.filter((w) => w.boss && w.boss.win).length; }
function longestRun() { let m = 0; for (const w of state.workouts) for (const e of w.exercises) if (e.name === 'Running') for (const s of e.sets) m = Math.max(m, s.d || 0); return m; }

// Chaque tenue se gagne ailleurs dans l'app : niveau, course, dojo, boss, campagne.
export const OUTFITS = [
  { id: 'debardeur', name: 'Débardeur', how: 'Dès le départ', ok: () => true },
  { id: 'torse', name: 'Torse nu', how: 'Atteindre le niveau 10', ok: () => levelInfo(totalXp()).level >= 10 },
  { id: 'course', name: 'Tenue de course', how: 'Courir 10 km d’un coup', ok: () => longestRun() >= 10 },
  { id: 'kimono', name: 'Kimono', how: 'Ceinture verte au dojo', ok: () => belt().i >= 3 },
  { id: 'boss', name: 'Tenue de chasseur', how: 'Battre 3 boss', ok: () => bossWins() >= 3 },
  { id: 'or', name: 'Armure d’or', how: 'Finir la campagne', ok: () => campDone() },
];
// La ceinture et la campagne viennent de dojo.js et campagne.js, branchés au chargement (pas d'import en boucle).
let belt = () => ({ i: 0, c: '#F4F2FB' });
let campDone = () => false;
export function plug(o) { if (o.belt) belt = o.belt; if (o.campDone) campDone = o.campDone; }

export function outfit() {
  const o = OUTFITS.find((x) => x.id === state.settings.outfit);
  return o && o.ok() ? o : OUTFITS[0];
}

// ---------- Dessin ----------
const f1 = (n) => Math.round(n * 10) / 10;
function limb(x1, y1, x2, y2, w, col) { return '<path d="M' + f1(x1) + ' ' + f1(y1) + 'L' + f1(x2) + ' ' + f1(y2) + '" stroke="' + col + '" stroke-width="' + f1(w) + '" stroke-linecap="round" fill="none"/>'; }

// Le héros, vu de face, centré en x = 100. d = développement des parties, o = tenue, letter = lettre du rang.
export function heroSvg(d, o, letter, opts = {}) {
  const SK = '#F2C7A5', SK2 = '#D9A584', SH = 'rgba(122, 70, 45, 0.55)', HAIR = '#C8521E';
  const ep = d.epaules, pc = d.pecs, br = d.bras, ab = d.abdos, ds = d.dos, jb = d.jambes, ml = d.mollets, fa = d.avantbras;
  const S = 25 + 11 * ep + 5 * ds;          // demi-largeur des épaules
  const Wt = 16.5 + 2.5 * ds + 1.5 * jb;     // demi-largeur de la taille
  const shY = 76, waistY = 138;
  const armW = 11 + 7 * br, foreW = 9 + 4 * fa, thighW = 19 + 9 * jb, calfW = 11.5 + 6 * ml;
  const trap = 3 + 9 * ds;
  const [a1, a2] = AURA[letter] || AURA.E;
  const id = 'hv' + (opts.id || '');
  const lvl = opts.level || 1;
  let s = '<defs><radialGradient id="' + id + 'a" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="' + a1 + '" stop-opacity="0.55"/><stop offset="0.55" stop-color="' + a2 + '" stop-opacity="0.22"/><stop offset="1" stop-color="' + a2 + '" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4E6BC"/><stop offset="0.55" stop-color="#CDAA62"/><stop offset="1" stop-color="#8F6D33"/></linearGradient></defs>';
  // Aura qui respire, et des étincelles qui montent (plus nombreuses avec le niveau).
  s += '<ellipse cx="100" cy="140" rx="92" ry="118" fill="url(#' + id + 'a)"><animate attributeName="opacity" values="0.75;1;0.75" dur="3.2s" repeatCount="indefinite"/></ellipse>';
  const n = Math.min(14, 3 + Math.floor(lvl / 3));
  for (let i = 0; i < n; i++) {
    const x = 30 + ((i * 53) % 140), dur = 3 + ((i * 7) % 5) * 0.6, beg = ((i * 13) % 30) / 10;
    s += '<circle cx="' + x + '" cy="240" r="' + (1 + (i % 3) * 0.6) + '" fill="' + a1 + '" opacity="0"><animate attributeName="cy" values="240;60" dur="' + dur + 's" begin="' + beg + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.9;0" dur="' + dur + 's" begin="' + beg + 's" repeatCount="indefinite"/></circle>';
  }
  s += '<ellipse cx="100" cy="250" rx="46" ry="5" fill="#000" opacity="0.4"/>';
  // Le corps respire doucement.
  s += '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.4;0 0" dur="3.2s" repeatCount="indefinite"/>';
  const kimono = o.id === 'kimono', armor = o.id === 'or';
  const pantsCol = kimono ? '#ECE8F4' : o.id === 'boss' ? '#1B152E' : o.id === 'course' ? '#2C2347' : armor ? '#3A2A12' : '#2C2347';
  const shoeCol = o.id === 'course' ? '#FF7A45' : kimono ? SK : '#F4F2FB';
  // Jambes : cuisses, mollets, pieds.
  for (const sg of [-1, 1]) {
    const hx = 100 + sg * 12, kx = 100 + sg * 15, fx = 100 + sg * 16;
    s += limb(hx, 150, kx, 196, thighW, SK) + limb(kx, 196, fx, 238, calfW * 0.82, SK);
    s += '<ellipse cx="' + f1(kx + sg * 0.5) + '" cy="210" rx="' + f1(calfW * 0.52) + '" ry="12" fill="' + SK + '"/>';
    if (ml > 0.25) s += '<path d="M' + f1(kx + sg * calfW * 0.35) + ' 203q' + f1(sg * 2) + ' 8 0 16" stroke="' + SH + '" stroke-width="1.1" fill="none" opacity="' + f1(ml * 0.8) + '"/>';
    if (jb > 0.25) s += '<path d="M' + f1(hx + sg * 2) + ' 168q' + f1(-sg * 5) + ' 12 ' + f1(-sg * 3) + ' 24" stroke="' + SH + '" stroke-width="1.2" fill="none" opacity="' + f1(jb * 0.7) + '"/>';
    s += '<ellipse cx="' + f1(fx + sg * 2) + '" cy="243" rx="9" ry="4.5" fill="' + shoeCol + '"/>';
    if (kimono) s += limb(hx, 148, kx, 200, thighW + 3, pantsCol) + limb(kx, 200, fx, 232, calfW + 1, pantsCol);
  }
  // Short (ou pantalon).
  if (!kimono) s += '<path d="M' + f1(100 - Wt - 3) + ' 134L' + f1(100 + Wt + 3) + ' 134L' + f1(100 + 12 + thighW / 2 + 1) + ' 178L101 176L100 160L99 176L' + f1(100 - 12 - thighW / 2 - 1) + ' 178Z" fill="' + pantsCol + '"/>';
  if (o.id === 'course') s += '<path d="M' + f1(100 - 12 - thighW / 2 - 1) + ' 176L99 174M101 174L' + f1(100 + 12 + thighW / 2 + 1) + ' 176" stroke="#FF7A45" stroke-width="2"/>';
  // Bras (derrière le buste pour l'épaule, devant pour le reste).
  const armCol = SK;
  const arms = (front) => {
    let a = '';
    for (const sg of [-1, 1]) {
      const sx = 100 + sg * (S - 2), ex = 100 + sg * (S + 4 + 3 * br), hx = 100 + sg * (S + 6 + 2 * br);
      if (!front) { a += limb(sx, shY + 4, ex, 112, armW, armCol) + limb(ex, 112, hx, 140, foreW, armCol) + '<circle cx="' + f1(hx) + '" cy="144" r="' + f1(4.6 + fa) + '" fill="' + armCol + '"/>'; continue; }
      // Biceps et triceps : un renflement qui grossit avec le travail.
      a += '<ellipse cx="' + f1(100 + sg * (S + 2 + 2.4 * br)) + '" cy="96" rx="' + f1(armW * 0.55) + '" ry="' + f1(10 + 3 * br) + '" fill="' + armCol + '"/>';
      if (br > 0.2) a += '<path d="M' + f1(100 + sg * (S + 2 + 2.4 * br) - sg * armW * 0.2) + ' 90q' + f1(sg * 3) + ' 6 0 14" stroke="' + SH + '" stroke-width="1.1" fill="none" opacity="' + f1(br * 0.8) + '"/>';
      if (fa > 0.3) a += '<path d="M' + f1(ex) + ' 118l' + f1(sg * 1.5) + ' 12" stroke="' + SH + '" stroke-width="1" opacity="' + f1(fa * 0.7) + '"/>';
    }
    return a;
  };
  s += arms(false);
  // Cou et trapèzes.
  s += '<path d="M93 52L107 52L' + f1(108 + trap * 0.3) + ' ' + shY + 'L' + f1(92 - trap * 0.3) + ' ' + shY + 'Z" fill="' + SK2 + '"/>';
  s += '<path d="M' + f1(100 - 8) + ' 62Q' + f1(100 - 14 - trap) + ' ' + f1(66 + 4 - trap * 0.4) + ' ' + f1(100 - S) + ' ' + (shY + 2) + 'L' + f1(100 + S) + ' ' + (shY + 2) + 'Q' + f1(100 + 14 + trap) + ' ' + f1(66 + 4 - trap * 0.4) + ' ' + f1(100 + 8) + ' 62Z" fill="' + SK + '"/>';
  // Buste.
  const torso = 'M' + f1(100 - S) + ' ' + (shY) + 'Q' + f1(100 - S - 3) + ' 100 ' + f1(100 - Wt) + ' ' + waistY + 'L' + f1(100 + Wt) + ' ' + waistY + 'Q' + f1(100 + S + 3) + ' 100 ' + f1(100 + S) + ' ' + shY + 'Q100 ' + (shY - 6) + ' ' + f1(100 - S) + ' ' + shY + 'Z';
  s += '<path d="' + torso + '" fill="' + SK + '"/>';
  // Deltoïdes.
  for (const sg of [-1, 1]) s += '<ellipse cx="' + f1(100 + sg * (S - 1)) + '" cy="' + (shY + 5) + '" rx="' + f1(7 + 4.5 * ep) + '" ry="' + f1(8 + 4 * ep) + '" fill="' + SK + '"/>';
  // Pectoraux, abdos, obliques : les traits se creusent avec le travail.
  for (const sg of [-1, 1]) {
    const cx = 100 + sg * (6 + 4 * pc + 2 * ep);
    s += '<path d="M' + f1(100 + sg * 1) + ' ' + (shY + 8) + 'Q' + f1(cx + sg * (8 + 5 * pc)) + ' ' + f1(shY + 4) + ' ' + f1(100 + sg * (S - 4)) + ' ' + (shY + 12) + 'Q' + f1(cx + sg * (6 + 4 * pc)) + ' ' + f1(shY + 24 + 4 * pc) + ' ' + f1(100 + sg * 1) + ' ' + f1(shY + 22 + 3 * pc) + 'Z" fill="' + SK2 + '" opacity="' + f1(0.25 + 0.45 * pc) + '"/>';
  }
  for (let r = 0; r < 3; r++) for (const sg of [-1, 1]) {
    s += '<rect x="' + f1(sg < 0 ? 100 - 9.5 : 100 + 1.5) + '" y="' + (106 + r * 10) + '" width="8" height="8" rx="3" fill="' + SK2 + '" opacity="' + f1(0.12 + 0.55 * ab) + '"/>';
  }
  for (const sg of [-1, 1]) s += '<path d="M' + f1(100 + sg * (Wt + 4)) + ' 110q' + f1(-sg * 3) + ' 14 ' + f1(-sg * 2) + ' 26" stroke="' + SH + '" stroke-width="1.2" fill="none" opacity="' + f1(0.15 + 0.5 * ab) + '"/>';
  // Tenue du haut.
  if (o.id === 'debardeur' || o.id === 'boss') {
    const c = o.id === 'boss' ? '#C2283F' : '#8B6CF6', c2 = o.id === 'boss' ? '#7E1527' : '#5236B8';
    s += '<path d="M' + f1(100 - S + 9) + ' ' + (shY - 3) + 'Q' + f1(100 - S + 4) + ' 98 ' + f1(100 - Wt - 3) + ' ' + (waistY + 1) + 'L' + f1(100 + Wt + 3) + ' ' + (waistY + 1) + 'Q' + f1(100 + S - 4) + ' 98 ' + f1(100 + S - 9) + ' ' + (shY - 3) + 'L' + f1(100 + 7) + ' ' + (shY - 3) + 'Q100 ' + (shY + 12) + ' ' + f1(100 - 7) + ' ' + (shY - 3) + 'Z" fill="' + c + '"/>';
    s += '<path d="M' + f1(100 - Wt - 3) + ' ' + (waistY - 3) + 'L' + f1(100 + Wt + 3) + ' ' + (waistY - 3) + '" stroke="' + c2 + '" stroke-width="3"/>';
    if (o.id === 'boss') s += '<path d="M92 104L108 104L100 118Z" fill="#1B152E" opacity="0.6"/>';
  }
  if (o.id === 'course') {
    s += '<path d="' + torso + '" fill="#2E8CFF"/>';
    for (const sg of [-1, 1]) s += '<ellipse cx="' + f1(100 + sg * (S - 1)) + '" cy="' + (shY + 6) + '" rx="' + f1(8 + 4.5 * ep) + '" ry="' + f1(9 + 4 * ep) + '" fill="#2E8CFF"/>';
    s += '<path d="M92 ' + (shY - 2) + 'Q100 ' + (shY + 8) + ' 108 ' + (shY - 2) + '" stroke="#1B5FBF" stroke-width="3" fill="none"/><rect x="88" y="100" width="24" height="16" rx="2" fill="#F4F2FB"/><text x="100" y="112" text-anchor="middle" font-size="10" font-weight="700" fill="#1B152E" font-family="Space Grotesk, sans-serif">' + Math.max(1, Math.round(longestRun())) + '</text>';
  }
  if (kimono) {
    s += '<path d="' + torso + '" fill="#ECE8F4"/>';
    for (const sg of [-1, 1]) s += limb(100 + sg * (S - 2), shY + 4, 100 + sg * (S + 4 + 3 * br), 112, armW + 4, '#ECE8F4');
    s += '<path d="M' + f1(100 - S + 6) + ' ' + shY + 'L100 116L' + f1(100 + S - 6) + ' ' + shY + '" stroke="#C9C2DA" stroke-width="2" fill="none"/>';
    s += '<path d="M' + f1(100 - Wt - 3) + ' 126L' + f1(100 + Wt + 3) + ' 126" stroke="' + belt().c + '" stroke-width="7"/><path d="M98 128l-6 16M102 128l5 16" stroke="' + belt().c + '" stroke-width="3.4" stroke-linecap="round"/>';
  }
  if (armor) {
    s += '<path d="' + torso + '" fill="url(#' + id + 'g)"/>';
    s += '<path d="M100 ' + (shY + 4) + 'V' + (waistY - 4) + 'M' + f1(100 - S + 8) + ' 100H' + f1(100 + S - 8) + '" stroke="#8F6D33" stroke-width="1.4" opacity="0.7"/>';
    for (const sg of [-1, 1]) s += '<ellipse cx="' + f1(100 + sg * (S + 1)) + '" cy="' + (shY + 3) + '" rx="' + f1(11 + 4 * ep) + '" ry="' + f1(8 + 2 * ep) + '" fill="url(#' + id + 'g)" stroke="#8F6D33" stroke-width="1"/>';
  }
  s += arms(true);
  // Tête : cheveux roux, sans visage (comme les silhouettes des exercices).
  s += '<ellipse cx="100" cy="38" rx="14.5" ry="17" fill="' + SK + '"/>';
  s += '<path d="M85.5 36Q84 18 100 17Q117 17 115 35Q111 26 104 27Q96 23 92 29Q88 28 85.5 36Z" fill="' + HAIR + '"/>';
  s += '<path d="M86 40q-2 0 -2 4t3 4M114 40q2 0 2 4t-3 4" fill="' + SK2 + '"/>';
  if (kimono || o.id === 'boss') s += '<path d="M85.5 31Q100 27 114.5 31" stroke="' + (kimono ? '#E0566A' : '#1B152E') + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>';
  s += '</g>';
  return '<svg class="hero" viewBox="0 0 200 260" role="img" aria-label="Ton héros">' + s + '</svg>';
}

// ---------- Écran ----------
// Les avant-bras ne comptent pas : au poids du corps, ils se travaillent peu directement.
function weakest(d) { return Object.entries(d).filter(([k]) => k !== 'avantbras').sort((a, b) => a[1] - b[1])[0]; }
const pct = (x) => Math.round(x * 100);

export function heroView() {
  const past = ui.heroPast;
  const at = past ? Date.now() - 90 * DAY : Date.now();
  const d = development(at), now = past ? development() : d;
  const info = rankInfo(), lv = levelInfo(totalXp()), o = outfit();
  const [wk] = weakest(now);
  let h = '<section class="glass card col herocard" style="gap:6px">'
    + '<div class="row between" style="gap:10px"><div class="col" style="gap:2px;min-width:0"><span class="label violet">Niveau ' + lv.level + ' · Rang ' + info.rank.letter + '</span><span class="h2">' + esc(info.rank.name) + '</span></div>' + (o.id !== 'debardeur' ? '<span class="tag">' + esc(o.name) + '</span>' : '') + '</div>'
    + '<div class="herobox">' + heroSvg(d, o, past ? '' : info.rank.letter, { level: past ? 1 : lv.level, id: past ? 'p' : 'n' }) + '</div>'
    + '<div class="seg2" role="tablist" style="align-self:center"><button type="button" class="' + (past ? '' : 'on') + '" data-act="hero-past" data-v="0">Aujourd’hui</button><button type="button" class="' + (past ? 'on' : '') + '" data-act="hero-past" data-v="1">Il y a 3 mois</button></div>'
    + '<span class="small mut center" style="text-align:center">' + (past ? 'Toi il y a 3 mois, d’après tes séances de l’époque.' : 'Ton héros grossit là où tu travailles, et dégonfle doucement là où tu ne fais plus rien. L’aura prend la couleur de ton rang.') + '</span></section>';
  h += '<div class="sec"><span class="h2">Muscles</span><span class="small mut">Développement</span></div><section class="glass card list" style="padding:4px 16px">'
    + Object.entries(PARTS).map(([id, p]) => {
      const v = now[id], was = development(Date.now() - 90 * DAY)[id], diff = pct(v) - pct(was);
      return '<button type="button" class="item" data-act="hero-part" data-id="' + id + '"><div class="col grow" style="gap:6px"><div class="row between"><span style="font-weight:600">' + esc(p.name) + (id === wk ? ' <span class="tag" style="background:rgba(255,90,110,0.16);color:#FF8A9A">À la traîne</span>' : '') + '</span><span class="small mut">' + pct(v) + ' %' + (diff ? ' · ' + (diff > 0 ? '+' : '') + diff + ' en 3 mois' : '') + '</span></div><div class="bar thin"><div style="width:' + pct(v) + '%"></div></div></div>' + ICON.chev + '</button>';
    }).join('') + '</section>';
  h += '<div class="sec"><span class="h2">Tenues</span><span class="small mut">' + OUTFITS.filter((x) => x.ok()).length + ' sur ' + OUTFITS.length + '</span></div><div class="outfits">'
    + OUTFITS.map((x) => { const ok = x.ok(); return '<button type="button" class="glass outfit' + (x.id === o.id ? ' on' : '') + (ok ? '' : ' locked') + '" data-act="hero-outfit" data-id="' + x.id + '"><span style="font-weight:600">' + esc(x.name) + '</span><span class="small mut">' + (ok ? (x.id === o.id ? 'Portée' : 'Débloquée') : esc(x.how)) + '</span></button>'; }).join('') + '</div>';
  return h;
}

function sheetPart(id) {
  const p = PARTS[id], d = development()[id];
  // Les exercices du catalogue qui travaillent le plus cette partie.
  const list = Object.keys(EXOS).filter((n) => !EXOS[n].old && EXOS[n].kind !== 'run' && EXOS[n].g !== 'etirements').map((n) => [n, p.z.reduce((s, z) => s + (musclesOf(n)[z] || 0), 0)]).filter((x) => x[1] >= 1).slice(0, 40);
  const done = new Set(); for (const w of state.workouts) for (const e of w.exercises) done.add(e.name);
  list.sort((a, b) => (done.has(b[0]) ? 1 : 0) - (done.has(a[0]) ? 1 : 0) || b[1] - a[1]);
  const since = Date.now() - 14 * DAY; let sets = 0;
  for (const w of state.workouts) if (w.start >= since) for (const e of w.exercises) { const k = p.z.reduce((s, z) => s + (musclesOf(e.name)[z] || 0), 0) / p.z.length; if (k) sets += e.sets.length * k; }
  let h = '<div class="col" style="gap:4px"><span class="label violet">Ton héros</span><h1 class="h1">' + esc(p.name) + '</h1><span class="small mut">' + pct(d) + ' % de développement · ' + plural(Math.round(sets), 'série', 'séries') + ' ces 14 derniers jours</span></div>'
    + '<section class="glass card col" style="gap:6px"><span class="small" style="color:var(--soft)">' + (d < 0.3 ? 'Presque rien ces dernières semaines : 2 ou 3 exercices de la liste par semaine suffisent pour voir ton héros changer.' : d < 0.65 ? 'Ça se construit. Garde ce rythme quelques semaines de plus.' : 'Bien développé. Il reste à l’entretenir : un muscle oublié dégonfle doucement.') + ' Un travail compte moitié moins au bout de 45 jours.</span></section>'
    + '<span class="label">Pour le faire grossir</span><div class="list">'
    + list.slice(0, 8).map(([n]) => '<button type="button" class="item" data-act="exo" data-name="' + esc(n) + '"><span class="grow" style="font-weight:600">' + esc(exoName(n)) + '</span>' + (done.has(n) ? '<span class="small mut">Déjà fait</span>' : '') + ICON.chev + '</button>').join('') + '</div>'
    + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>';
  sheet(h);
}

Object.assign(ACTIONS, {
  'hero-past': (el) => { ui.heroPast = el.dataset.v === '1'; rerender(); },
  'hero-part': (el) => sheetPart(el.dataset.id),
  'hero-outfit': (el) => {
    const o = OUTFITS.find((x) => x.id === el.dataset.id);
    if (!o.ok()) { toast('Pour la débloquer : ' + o.how.charAt(0).toLowerCase() + o.how.slice(1)); return; }
    state.settings.outfit = o.id; save(); rerender();
  },
});
