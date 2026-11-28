// Images animées des exercices : une silhouette au trait, dessinée en SVG, faite maison.
// Chaque exercice = 2 à 4 positions clés ; le SVG passe de l'une à l'autre en boucle (animation SMIL, sans script).
// Repère : 100 × 64, le sol à y = 58, la silhouette regarde vers la droite.
// Angles en degrés : 0 = vers la droite, 90 = vers le bas, -90 = vers le haut, 180 = vers la gauche.
//
// Une position : { h: [x, y] hanche, t: angle du buste (de la hanche vers les épaules), hd: angle de la tête (sinon t),
//   a1 / a2 : bras proche / bras lointain, l1 / l2 : jambe proche / jambe lointaine }.
// Un membre : [angle du haut, angle du bas, angle du pied] ou { to: [x, y] (ou 'hip' / 'sh' + off), s: sens du pli, f: angle du pied }.
import { EXOS } from './data.js';

const G = 58, AY = G - 1.2;
const L = { tor: 17, neck: 2.4, head: 3.4, ua: 9.5, fa: 9.5, th: 12, sh: 12, foot: 3.6 };
const RAD = Math.PI / 180;
const P = (o, a, l) => [o[0] + Math.cos(a * RAD) * l, o[1] + Math.sin(a * RAD) * l];
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

// Point commun à deux cercles (pour placer un corps entre deux appuis). low = prendre le point le plus bas.
function meet(c1, r1, c2, r2, low) {
  const d = dist(c1, c2) || 1e-3;
  const dd = Math.min(Math.max(d, Math.abs(r1 - r2) + 1e-3), r1 + r2 - 1e-3);
  const a = (r1 * r1 - r2 * r2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ux = (c2[0] - c1[0]) / d, uy = (c2[1] - c1[1]) / d, mx = c1[0] + ux * a, my = c1[1] + uy * a;
  const p1 = [mx - uy * h, my + ux * h], p2 = [mx + uy * h, my - ux * h];
  return (p1[1] > p2[1]) === !!low ? p1 : p2;
}

// Membre à deux segments : angles donnés, ou bout du membre posé sur un point (le coude ou le genou se plie tout seul).
function limb(root, spec, l1, l2, J) {
  if (Array.isArray(spec)) { const j = P(root, spec[0], l1); return { j, e: P(j, spec[1], l2), f: spec[2] }; }
  const T = typeof spec.to === 'string' ? add(J[spec.to], spec.off || [0, 0]) : spec.to;
  const d0 = dist(root, T) || 1e-3;
  const d = Math.min(Math.max(d0, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.001);
  const base = ang(root, T);
  const k = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) / RAD;
  // s : 1 ou -1 (sens du pli), ou 'up' / 'down' / 'back' / 'fwd' (le coude ou le genou va vers le haut, le bas, l'arrière ou l'avant).
  let j;
  if (typeof spec.s === 'string') {
    const a = P(root, base + k, l1), b = P(root, base - k, l1);
    const pick = { up: (x, y) => x[1] < y[1], down: (x, y) => x[1] > y[1], back: (x, y) => x[0] < y[0], fwd: (x, y) => x[0] > y[0] }[spec.s];
    j = pick(a, b) ? a : b;
  } else j = P(root, base + (spec.s || 1) * k, l1);
  return { j, e: P(j, ang(j, T), l2), f: spec.f };
}

function joints(p) {
  const hip = p.h, sh = P(hip, p.t, L.tor), hd = p.hd === undefined ? p.t : p.hd;
  const J = { hip, sh, neck: P(sh, hd, L.neck), head: P(sh, hd, L.neck + L.head) };
  const a1 = limb(sh, p.a1, L.ua, L.fa, J), a2 = limb(sh, p.a2 || p.a1, L.ua, L.fa, J);
  const l1 = limb(hip, p.l1, L.th, L.sh, J), l2 = limb(hip, p.l2 || p.l1, L.th, L.sh, J);
  const toe = (l) => P(l.e, l.f === undefined ? ang(l.j, l.e) - 90 : l.f, L.foot);
  return Object.assign(J, { e1: a1.j, h1: a1.e, e2: a2.j, h2: a2.e, k1: l1.j, f1: l1.e, t1: toe(l1), k2: l2.j, f2: l2.e, t2: toe(l2) });
}

// ---------- Positions de base ----------
const STAND = { h: [50, AY - 24], t: -90, a1: [93, 90], a2: [87, 90], l1: { to: [52, AY], s: 'fwd' }, l2: { to: [48.5, AY], s: 'fwd' } };
const st = (o) => Object.assign({}, STAND, o);
// Face (vue de devant) : les pieds partent chacun de son côté.
const FRONT = { v: 'face', h: [50, AY - 24], t: -90, a1: [80, 88], a2: [100, 92], l1: { to: [54, AY], s: 'fwd', f: 0 }, l2: { to: [46, AY], s: 'back', f: 180 } };
const fr = (o) => Object.assign({}, FRONT, o);

// Planche : pieds (ou genoux) en F, mains en H, r = distance épaule-main (19 = bras tendu).
function plank(F, H, r, o = {}) {
  const Lb = o.knees ? L.th + L.tor : L.th + L.sh + L.tor;
  const S = meet(F, Lb, H, r, o.low);
  const t = ang(F, S), hip = P(F, t, Lb - L.tor);
  return Object.assign({ h: hip, t, a1: { to: H, s: o.s || 'up' }, l1: o.knees ? [t + 180, 186] : { to: F, s: 'fwd' } }, o.p || {});
}
// Corps aligné des pieds F vers un point visé V (longueur juste), mains en H.
function line(F, V, H, o = {}) {
  const t = ang(F, V), hip = P(F, t, L.th + L.sh);
  return Object.assign({ h: hip, t, a1: { to: H, s: o.s || 'up' }, l1: { to: F, s: 'fwd' } }, o.p || {});
}
// Pike : hanches en l'air, épaules placées à r des mains.
function pike(hip, H, F, r, o = {}) {
  const S = meet(hip, L.tor, H, r, o.low);
  return Object.assign({ h: hip, t: ang(hip, S), a1: { to: H, s: o.s || 'back' }, l1: { to: F, s: 'up' } }, o.p || {});
}
// À partir des épaules : la hanche est calculée.
const fromSh = (S, t, o) => Object.assign({ h: P(S, t + 180, L.tor), t }, o);

// Matériel dessiné derrière la silhouette.
const BARS = ['bars', 50, 62, 28];        // station de dips : poignée de x 50 à 62, à y 28
const bench = (x1, x2, top) => ['bench', x1, x2, top === undefined ? G - 13 : top];

// ---------- Les exercices ----------
// f = positions, d = durée d'un cycle (s), m = muscles en or, eq = matériel, db = haltère dans la main (1, 2 ou les deux), sc = échelle, kt = temps de chaque position.
const PU_F = [14, G - 2.4], PU_H = [50, G - 0.6];
const pu = (r, o) => plank(PU_F, PU_H, r, o);
const DIP_H = [56, 28];
const dipTop = (o) => fromSh([54.5, 9.6], -84, Object.assign({ a1: { to: DIP_H, s: 'back' }, l1: [100, 196], l2: [96, 192] }, o));
const dipLow = (o) => fromSh([58, 19.5], -68, Object.assign({ a1: { to: DIP_H, s: 'back' }, l1: [112, 204], l2: [108, 200] }, o));
const ROW_H = [57, 28];
const rowLow = (F) => plank(F, ROW_H, 18.8, { low: true, s: 'down', p: { l1: { to: F, s: 'fwd', f: -60 } } });
const rowTop = (F) => plank(F, ROW_H, 7.5, { low: true, s: 'down', p: { l1: { to: F, s: 'fwd', f: -60 } } });
const hinge = (o) => st(Object.assign({ h: [43, 35], t: -22, hd: -12, l1: { to: [53, AY], s: 'fwd' }, l2: { to: [49.5, AY], s: 'fwd' }, a1: [90, 90], a2: [92, 90] }, o));
const LIE = (o) => Object.assign({ h: [50, G - 3], t: 180, a1: [0, 0], l1: [0, 0], l2: [0, 0] }, o);
const SEAT = (o) => Object.assign({ h: [46, G - 15.5], t: -90, l1: [0, 90, 0], l2: [-4, 88, 0] }, o);
const benchLie = (o) => Object.assign({ h: [32, G - 15.5], t: 0, hd: -10, l1: [172, 96], l2: [168, 92] }, o);
const squatLow = (o) => st(Object.assign({ h: [41, 45], t: -52, hd: -70, a1: [-2, -2], a2: [2, 2] }, o));
// À quatre pattes : genoux et mains au sol.
const QUAD = (o) => Object.assign({ h: [36, 45.4], t: -22, hd: -10, a1: [90, 90], a2: [90, 90], l1: [90, 180, 180], l2: [88, 178, 178] }, o);
const HANG = (o) => fromSh([50, 21.5], -90, Object.assign({ hd: -90, a1: { to: [50, 3], s: 'fwd' }, l1: [98, 140, 110], l2: [94, 136, 106] }, o));
const INC = (o) => benchLie(Object.assign({ h: [30, G - 15.5], t: -30, hd: -40 }, o));
const HOLD = (p, dy) => [p, Object.assign({}, p, { h: [p.h[0], p.h[1] + (dy || 0.6)], t: p.t + 0.8 })];

const FIG = {
  // Étirements du retour au calme (retour.js) : deux positions proches, au rythme d'une respiration lente.
  'stretch-chest': { f: [st({ t: -92, hd: -94, a1: [116, 116], a2: [120, 120] }), st({ t: -97, hd: -104, a1: [126, 124], a2: [130, 128] })], m: ['chest', 'shoulder'], d: 5 },
  'stretch-triceps': { f: [st({ a1: [-98, 96], a2: [-70, -150] }), st({ a1: [-104, 100], a2: [-74, -154] })], m: ['ua'], d: 5 },
  'stretch-quad': { f: [st({ a1: { to: [42.6, 34.2], s: 'back' }, l1: [106, -116, 200], l2: { to: [50.5, AY], s: 'fwd' } }), st({ t: -87, a1: { to: [41.4, 33.2], s: 'back' }, l1: [110, -118, 200], l2: { to: [50.5, AY], s: 'fwd' } })], m: ['th'], d: 5 },
  'stretch-ham': { f: [{ h: [34, G - 3.2], t: -38, hd: -30, a1: [4, 6], l1: [0, 0, -90], l2: [2, 2, -90] }, { h: [34, G - 3.2], t: -24, hd: -14, a1: [8, 4], l1: [0, 0, -90], l2: [2, 2, -90] }], m: ['th', 'back'], d: 5 },
  'stretch-dog': { f: [pike([36, 31], [60, G - 0.6], [20, G - 2.4], 18.8), pike([35, 29], [60, G - 0.6], [20, G - 2.4], 18.8)], m: ['calf', 'shoulder'], d: 5 },
  'stretch-child': { f: [{ h: [35, G - 8], t: 14, hd: 20, a1: [4, 2], l1: [32, 180, 180], l2: [30, 180, 180] }, { h: [34, G - 7.4], t: 18, hd: 24, a1: [6, 2], l1: [34, 180, 180], l2: [32, 180, 180] }], m: ['back'], d: 5 },
  // Pompes
  'Push Up': { f: [pu(18.8), pu(9.4)], m: ['chest', 'ua'] },
  'Knee Push Up': { f: [plank([30, G - 1.6], PU_H, 18.8, { knees: true }), plank([30, G - 1.6], PU_H, 11, { knees: true })], m: ['chest', 'ua'] },
  'Incline Push Up': { f: [plank([12, G - 2.4], [60, G - 13.6], 18.8), plank([12, G - 2.4], [60, G - 13.6], 9.4)], m: ['chest', 'ua'], eq: [bench(54, 80)] },
  'Decline Push Up': { f: [plank([14, G - 15], [54, G - 0.6], 18.8), plank([14, G - 15], [54, G - 0.6], 9.4)], m: ['chest', 'shoulder'], eq: [bench(2, 24)] },
  'Wide Push Up': { f: [pu(18.8, { p: { a2: { to: [56, G - 0.6], s: 'up' } } }), pu(10, { p: { a2: { to: [56, G - 0.6], s: 'up' } } })], m: ['chest'] },
  'Diamond Push Up': { f: [pu(18.8), pu(9.4)], m: ['ua'] },
  'Slow Push Up': { f: [pu(18.8), pu(9.4)], m: ['chest', 'ua'], d: 6, kt: [0, 0.45, 0.55, 1], hold: true },
  'Archer Push Up': { f: [pu(18.8, { p: { a2: { to: [62, G - 0.6], s: 'up' } } }), pu(9.4, { p: { a2: { to: [66, G - 0.6], s: 'up' } } })], m: ['chest', 'ua'] },
  'One Arm Push Up': { f: [plank([16, G - 2.4], PU_H, 18.8, { p: { a2: { to: 'hip', off: [4, -3], s: 'up' } } }), plank([16, G - 2.4], PU_H, 10.5, { p: { a2: { to: 'hip', off: [4, -3], s: 'up' } } })], m: ['chest', 'ua', 'abs'], d: 3 },
  'Explosive Push Up': { f: [pu(9.4), plank(PU_F, [51, G - 5], 18.8)], m: ['chest', 'ua'], d: 1.5 },
  'Clap Push Up': { f: [pu(9.4), plank(PU_F, [51, G - 6], 18.8, { p: { a1: [112, 30], a2: [108, 34] } })], m: ['chest', 'ua'], d: 1.5 },
  'Pseudo Planche Push Up': { f: [line(PU_F, [56, 38], [44, G - 0.6]), line(PU_F, [58, 48.5], [44, G - 0.6])], m: ['shoulder', 'chest', 'abs'] },
  'Spiderman Push Up': { f: [pu(18.8), pu(9.6, { p: { l1: { to: [31, G - 2.4], s: 'fwd' }, l2: { to: PU_F, s: 'fwd' } } }), pu(18.8), pu(9.6, { p: { l2: { to: [31, G - 2.4], s: 'fwd' } } })], m: ['chest', 'abs'], d: 4 },
  'Hindu Push Up': { f: [pike([34, 31], [58, G - 0.6], [18, G - 2.4], 18.8), plank([18, G - 2.4], [58, G - 0.6], 10), line([18, G - 2.4], [58, 46], [58, G - 0.6], { p: { t: -42, hd: -60 } })], m: ['chest', 'shoulder'], d: 3.4 },
  'Deficit Push Up': { f: [plank(PU_F, [50, G - 4], 18.8), plank(PU_F, [50, G - 4], 7.8)], m: ['chest', 'ua'], eq: [['db', 50, G - 2.3]] },
  // Dips
  'Triceps Dip': { f: [dipTop(), dipLow()], m: ['ua', 'chest'], eq: [BARS], sc: 0.94 },
  'Dips Hold': { f: HOLD(dipTop(), 0.4), m: ['ua', 'shoulder'], eq: [BARS], sc: 0.94, d: 3.5 },
  'Negative Dip': { f: [dipTop(), dipLow()], m: ['ua', 'chest'], eq: [BARS], sc: 0.94, d: 5, kt: [0, 0.8, 1] },
  'Chest Dip': { f: [dipTop({ t: -76, l1: [112, 200], l2: [108, 196] }), dipLow({ t: -50, l1: [125, 210], l2: [121, 206] })], m: ['chest'], eq: [BARS], sc: 0.94 },
  'Explosive Dip': { f: [dipLow(), fromSh([54, 6], -84, { a1: { to: [56, 25], s: 'back' }, l1: [100, 146], l2: [96, 142] })], m: ['ua', 'chest'], eq: [BARS], sc: 0.94, d: 1.5 },
  'Band Assisted Dip': { f: [dipTop(), dipLow()], m: ['ua', 'chest'], eq: [BARS, ['band', [51, 28], 'k1']], sc: 0.94 },
  'Bench Dip': { f: [fromSh([40, 26.5], -96, { a1: { to: [37, G - 13.6], s: 'back' }, l1: { to: [64, AY], s: 'fwd' } }), fromSh([41, 35.5], -98, { a1: { to: [37, G - 13.6], s: 'back' }, l1: { to: [64, AY], s: 'fwd' } })], m: ['ua'], eq: [bench(14, 38)] },
  'Bench Dip (Feet Elevated)': { f: [fromSh([40, 26.5], -96, { a1: { to: [37, G - 13.6], s: 'back' }, l1: { to: [70, G - 14.4], s: 'fwd' } }), fromSh([41, 35.5], -98, { a1: { to: [37, G - 13.6], s: 'back' }, l1: { to: [70, G - 14.4], s: 'fwd' } })], m: ['ua'], eq: [bench(14, 38), bench(64, 86)] },
  // Pectoraux
  'Bench Press (Dumbbell)': { f: [benchLie({ a1: [100, -84], a2: [96, -88] }), benchLie({ a1: [-90, -90], a2: [-88, -88] })], m: ['chest', 'ua'], eq: [bench(20, 56)], db: 3 },
  'Dumbbell Fly': { f: [benchLie({ a1: [125, 52], a2: [120, 56] }), benchLie({ a1: [-92, -86], a2: [-88, -90] })], m: ['chest'], eq: [bench(20, 56)], db: 3, d: 3 },
  // Épaules
  'Pike Pushup': { f: [pike([36, 31], [58, G - 0.6], [20, G - 2.4], 18.8), pike([38, 31], [58, G - 0.6], [20, G - 2.4], 13)], m: ['shoulder', 'ua'] },
  'Elevated Pike Push Up': { f: [pike([46, 26], [60, G - 0.6], [30, G - 15], 18.8), pike([47, 25], [60, G - 0.6], [30, G - 15], 13)], m: ['shoulder', 'ua'], eq: [bench(14, 34)] },
  'Handstand Hold': { f: HOLD({ h: [46, 21.5], t: 90, a1: { to: [47, G - 0.6] }, l1: [-94, -94], l2: [-96, -96] }, 0.3), m: ['shoulder', 'abs'], eq: [['wall', 40]], sc: 0.84, d: 3.5 },
  'Wall Handstand Push Up': { f: [{ h: [46, 21.5], t: 90, a1: { to: [47, G - 0.6] }, l1: [-94, -94], l2: [-96, -96] }, { h: [46, 30], t: 90, a1: { to: [47, G - 0.6], s: 'back' }, l1: [-94, -94], l2: [-96, -96] }], m: ['shoulder', 'ua'], eq: [['wall', 40]], sc: 0.84 },
  'Wall Handstand Push Up Negative': { f: [{ h: [46, 21.5], t: 90, a1: { to: [47, G - 0.6] }, l1: [-94, -94], l2: [-96, -96] }, { h: [46, 30], t: 90, a1: { to: [47, G - 0.6], s: 'back' }, l1: [-94, -94], l2: [-96, -96] }], m: ['shoulder', 'ua'], eq: [['wall', 40]], sc: 0.84, d: 5, kt: [0, 0.82, 1] },
  'Wall Walk': { f: [plank([14, G - 2.4], [52, G - 0.6], 18.8), { h: [24, 26], t: 72, a1: { to: [31, G - 0.6], s: 'up' }, l1: [-128, -128, -40], l2: [-132, -132, -40] }, { h: [16, 22], t: 88, a1: { to: [17, G - 0.6], s: 'up' }, l1: [-97, -97], l2: [-99, -99] }], m: ['shoulder', 'abs'], eq: [['wall', 9]], sc: 0.84, d: 5 },
  'Planche Lean': { f: [line(PU_F, [55, 39], [48, G - 0.6]), line(PU_F, [59.5, 40], [48, G - 0.6])], m: ['shoulder', 'abs'], d: 3 },
  'Seated Overhead Press (Dumbbell)': { f: [SEAT({ a1: [62, -94], a2: [58, -90] }), SEAT({ a1: [-86, -86], a2: [-90, -90] })], m: ['shoulder', 'ua'], eq: [bench(30, 58)], db: 3 },
  'Arnold Press (Dumbbell)': { f: [SEAT({ a1: [78, -100], a2: [74, -96] }), SEAT({ a1: [-86, -86], a2: [-90, -90] })], m: ['shoulder'], eq: [bench(30, 58)], db: 3, d: 3 },
  'Overhead Press (Dumbbell)': { f: [st({ a1: [62, -94], a2: [58, -90] }), st({ a1: [-86, -86], a2: [-90, -90] })], m: ['shoulder', 'ua'], db: 3 },
  'Lateral Raise (Dumbbell)': { f: [fr({ a1: [78, 86], a2: [102, 94] }), fr({ a1: [-4, -2], a2: [184, 182] })], m: ['shoulder'], db: 3 },
  'Front Raise (Dumbbell)': { f: [st({ a1: [86, 86], a2: [92, 92] }), st({ a1: [-4, -4], a2: [92, 92] })], m: ['shoulder'], db: 3 },
  // Dos
  'Bent Over Row (Band)': { f: [hinge({ h: [42.5, 36] }), hinge({ h: [42.5, 36],  a1: { to: 'hip', off: [10, 2], s: 'up' }, a2: { to: 'hip', off: [9, 3], s: 'up' } })], m: ['back', 'ua'], eq: [['band', 'f1', 'h1']] },
  'Bent Over Row (Dumbbell)': { f: [hinge({ h: [42.5, 36] }), hinge({ h: [42.5, 36],  a1: { to: 'hip', off: [10, 2], s: 'up' }, a2: { to: 'hip', off: [9, 3], s: 'up' } })], m: ['back', 'ua'], db: 3 },
  'Dumbbell Row': { f: [{ h: [42, 33], t: -4, hd: 10, a1: [90, 90], a2: { to: [70, G - 13.6] }, l1: { to: [44, AY], s: 'fwd' }, l2: [56, 180, 90] }, { h: [42, 33], t: -4, hd: 10, a1: { to: 'hip', off: [9, 1], s: 'up' }, a2: { to: [70, G - 13.6] }, l1: { to: [44, AY], s: 'fwd' }, l2: [56, 180, 90] }], m: ['back', 'ua'], eq: [bench(36, 76)], db: 1 },
  'Inverted Row': { f: [rowLow([22, AY]), rowTop([22, AY])], m: ['back', 'ua'], eq: [BARS] },
  'Inverted Row (Feet Elevated)': { f: [rowLow([20, G - 15]), rowTop([20, G - 15])], m: ['back', 'ua'], eq: [BARS, bench(6, 26)] },
  'Archer Row': { f: [rowLow([22, AY]), rowTop([22, AY])], m: ['back', 'ua'], eq: [BARS], d: 3 },
  'One Arm Inverted Row': { f: [rowLow([22, AY]), rowTop([22, AY])].map((p) => Object.assign(p, { a2: { to: 'hip', off: [5, -2], s: 'up' } })), m: ['back', 'ua', 'abs'], eq: [BARS], d: 3 },
  'Band Pull Apart': { f: [fr({ a1: [-6, 160], a2: [186, 20] }), fr({ a1: [-2, -2], a2: [182, 182] })], m: ['back', 'shoulder'], eq: [['band', 'h1', 'h2']] },
  'Face Pull (Band)': { f: [st({ a1: [-6, -6], a2: [-2, -2] }), st({ a1: [-40, 200], a2: [-36, 196] })], m: ['shoulder', 'back'], eq: [['band', [96, 22], 'h1']] },
  'Reverse Fly (Dumbbell)': { f: [hinge({ a1: [88, 88], a2: [92, 92] }), hinge({ a1: [190, 186], a2: [186, 180] })], m: ['back', 'shoulder'], db: 3 },
  'Dumbbell Pullover': { f: [benchLie({ a1: [12, 20], a2: [8, 16] }), benchLie({ a1: [-80, -80], a2: [-84, -84] })], m: ['back', 'chest'], eq: [bench(20, 56)], db: 1, d: 3 },
  'Superman': { f: [LIE({ t: 182, a1: [182, 182], l1: [-1, -1], l2: [1, 1] }), LIE({ t: 196, hd: 200, a1: [204, 204], l1: [-14, -14], l2: [-11, -11] })], m: ['back', 'glute'], d: 3 },
  // Tractions (barre fixée en haut, à y = 3) : genoux pliés pour ne pas toucher le sol.
  'Pull Up': { f: [fromSh([50, 21.5], -90, { hd: -90, a1: { to: [50, 3], s: 'fwd' }, l1: [98, 140, 110], l2: [94, 136, 106] }), fromSh([50, 9.5], -90, { hd: -84, a1: { to: [50, 3], s: 'fwd' }, l1: [98, 140, 110], l2: [94, 136, 106] })], m: ['back', 'ua'], eq: [['bar', 50, 3]] },
  // Bras
  'Bicep Curl (Dumbbell)': { f: [st({ a1: [94, 90], a2: [90, 86] }), st({ a1: [96, -72], a2: [92, -76] })], m: ['ua'], db: 3 },
  'Hammer Curl (Dumbbell)': { f: [st({ a1: [94, 90], a2: [90, 86] }), st({ a1: [96, -72], a2: [92, -76] })], m: ['ua', 'fa'], db: 3 },
  'Bicep Curl (Band)': { f: [st({ a1: [94, 90], a2: [90, 86] }), st({ a1: [96, -72], a2: [92, -76] })], m: ['ua'], eq: [['band', 'f1', 'h1']] },
  'Triceps Extension (Dumbbell)': { f: [st({ a1: [-102, 100], a2: [-98, 104] }), st({ a1: [-98, -96], a2: [-96, -94] })], m: ['ua'], db: 1, sc: 0.88 },
  'Skullcrusher (Dumbbell)': { f: [benchLie({ a1: [-74, 26], a2: [-78, 22] }), benchLie({ a1: [-80, -80], a2: [-84, -84] })], m: ['ua'], eq: [bench(20, 56)], db: 3 },
  'Triceps Kickback (Dumbbell)': { f: [hinge({ a1: [168, 90], a2: [90, 90] }), hinge({ a1: [168, 162], a2: [90, 90] })], m: ['ua'], db: 1 },
  'Farmers Walk': { f: [st({ h: [50, AY - 23.6], l1: { to: [57, AY], s: 'fwd' }, l2: { to: [44, AY - 2], s: 'fwd', f: 30 }, a1: [91, 90], a2: [89, 90] }), st({ h: [50, AY - 23.6], l1: { to: [44, AY - 2], s: 'fwd', f: 30 }, l2: { to: [57, AY], s: 'fwd' }, a1: [91, 90], a2: [89, 90] })], m: ['fa', 'back'], db: 3, d: 1.6 },
  // Jambes
  'Squat (Bodyweight)': { f: [st({ a1: [60, 60], a2: [64, 64] }), squatLow()], m: ['th', 'glute'] },
  'Goblet Squat': { f: [st({ a1: [72, -78], a2: [76, -80] }), squatLow({ a1: [64, -72], a2: [68, -74] })], m: ['th', 'glute'], db: 1 },
  'Jump Squat': { f: [squatLow({ a1: [130, 130], a2: [126, 126] }), st({ h: [50, AY - 30], a1: [-100, -100], a2: [-96, -96], l1: { to: [52, AY - 7], s: 'fwd', f: 60 }, l2: { to: [49, AY - 7], s: 'fwd', f: 60 } })], m: ['th', 'glute', 'calf'], d: 1.4, sc: 0.86 },
  'Lunge': { f: [st(), st({ h: [53, 44], t: -88, l1: { to: [65, AY], s: 'fwd' }, l2: { to: [36, AY - 1.2], s: 'fwd', f: 50 } })], m: ['th', 'glute'] },
  'Reverse Lunge': { f: [st(), st({ h: [46, 44], t: -88, l1: { to: [55, AY], s: 'fwd' }, l2: { to: [28, AY - 1.2], s: 'fwd', f: 50 } })], m: ['th', 'glute'] },
  'Jumping Lunge': { f: [st({ h: [50, 44], t: -88, l1: { to: [61, AY], s: 'fwd' }, l2: { to: [34, AY - 1.2], s: 'fwd', f: 50 } }), st({ h: [50, 30], a1: [70, 60], a2: [110, 100], l1: { to: [54, AY - 6], s: 'fwd', f: 50 }, l2: { to: [44, AY - 6], s: 'fwd', f: 50 } }), st({ h: [50, 44], t: -88, l2: { to: [61, AY], s: 'fwd' }, l1: { to: [34, AY - 1.2], s: 'fwd', f: 50 } }), st({ h: [50, 30], a1: [110, 100], a2: [70, 60], l2: { to: [54, AY - 6], s: 'fwd', f: 50 }, l1: { to: [44, AY - 6], s: 'fwd', f: 50 } })], m: ['th', 'glute'], d: 2.4 },
  'Bulgarian Split Squat (Dumbbell)': { f: [st({ h: [53, 35], l1: { to: [63, AY], s: 'fwd' }, l2: { to: [37, G - 14.4], s: 'fwd', f: 175 } }), st({ h: [49, 45], t: -86, l1: { to: [63, AY], s: 'fwd' }, l2: { to: [37, G - 14.4], s: 'fwd', f: 175 } })], m: ['th', 'glute'], eq: [bench(16, 39)], db: 3 },
  'Assisted Pistol Squats': { f: [st({ l1: { to: [50, AY], s: 'fwd' }, l2: [80, 96], a1: { to: [70, 29], s: 'down' }, a2: [0, 0] }), st({ h: [42, 46.5], t: -58, hd: -72, l1: { to: [50, AY], s: 'fwd' }, l2: [-4, -4], a1: { to: [70, 29], s: 'down' }, a2: [0, 0] })], m: ['th', 'glute'], eq: [['post', 72]] },
  'Pistol Squat': { f: [st({ l1: { to: [50, AY], s: 'fwd' }, l2: [80, 96], a1: [0, 0], a2: [4, 4] }), st({ h: [42, 46.5], t: -58, hd: -72, l1: { to: [50, AY], s: 'fwd' }, l2: [-4, -4], a1: [-4, -4], a2: [0, 0] })], m: ['th', 'glute'], d: 3 },
  'Cossack Squat': { f: [fr({ h: [50, 36], l1: { to: [66, AY], s: 'fwd', f: 0 }, l2: { to: [34, AY], s: 'back', f: 180 }, a1: [60, 120], a2: [120, 60] }), fr({ h: [60, 46], t: -84, l1: { to: [67, AY], s: 'fwd', f: 0 }, l2: { to: [36, AY], s: 'back', f: -90 }, a1: [40, 140], a2: [140, 40] })], m: ['th', 'glute'], d: 3 },
  'Step Up': { f: [st({ h: [47, 34], l1: { to: [62, G - 11.4], s: 'fwd' }, l2: { to: [46, AY], s: 'fwd' } }), st({ h: [61, 21.6], l1: { to: [62, G - 11.4], s: 'fwd' }, l2: [-12, 80] })], m: ['th', 'glute'], eq: [bench(56, 80, G - 10)], sc: 0.86, d: 2.8 },
  'Glute Bridge': { f: [LIE({ h: [44, G - 3.2], t: 180, a1: [0, 0], l1: { to: [60, AY], s: 'up' }, l2: { to: [58, AY], s: 'up' } }), { h: [44, 46.5], t: 151, a1: [8, 4], l1: { to: [60, AY], s: 'up' }, l2: { to: [58, AY], s: 'up' } }], m: ['glute'] },
  'Single Leg Glute Bridge': { f: [LIE({ h: [44, G - 3.2], t: 180, a1: [0, 0], l1: { to: [60, AY], s: 'up' }, l2: [-34, -34] }), { h: [44, 46.5], t: 151, a1: [8, 4], l1: { to: [60, AY], s: 'up' }, l2: [-22, -22] }], m: ['glute'] },
  'Hip Thrust': { f: [{ h: [38, 54.5], t: -122, hd: -60, a1: [180, 150], l1: { to: [62, AY], s: 'up' }, l2: { to: [60, AY], s: 'up' } }, { h: [45, 42.6], t: -178, hd: -120, a1: [180, 150], l1: { to: [62, AY], s: 'up' }, l2: { to: [60, AY], s: 'up' } }], m: ['glute', 'th'], eq: [bench(8, 30)] },
  'Romanian Deadlift (Dumbbell)': { f: [st({ a1: [92, 90], a2: [90, 88] }), st({ h: [42, 34.5], t: -14, hd: 0, l1: { to: [52, AY], s: 'fwd' }, l2: { to: [48.5, AY], s: 'fwd' }, a1: [90, 90], a2: [92, 90] })], m: ['glute', 'th', 'back'], db: 3, d: 3 },
  'Wall Sit': { f: HOLD({ h: [35, 44.8], t: -90, hd: -90, a1: [62, 2], a2: [58, 4], l1: { to: [47.5, AY], s: 'fwd' }, l2: { to: [46, AY], s: 'fwd' } }, 0.3), m: ['th'], eq: [['wall', 31]], d: 3.5 },
  'Standing Calf Raise (Dumbbell)': { f: [st({ h: [50, G - 28.2], l1: { to: [52, G - 4.2], s: 'fwd', f: 0 }, l2: { to: [49, G - 4.2], s: 'fwd', f: 0 } }), st({ h: [51, G - 31.6], l1: { to: [53.4, G - 7], s: 'fwd', f: 40 }, l2: { to: [50.4, G - 7], s: 'fwd', f: 40 } })], m: ['calf'], eq: [['box', 46, 64, 3]], db: 3, d: 2 },
  'Single Leg Standing Calf Raise': { f: [st({ h: [50, G - 28.2], l1: { to: [52, G - 4.2], s: 'fwd', f: 0 }, l2: [100, 150] }), st({ h: [51, G - 31.6], l1: { to: [53.4, G - 7], s: 'fwd', f: 40 }, l2: [100, 150] })], m: ['calf'], eq: [['box', 46, 64, 3]], d: 2 },
  'Broad Jump': { f: [squatLow({ h: [30, 45], a1: [140, 140], a2: [136, 136], l1: { to: [40, AY], s: 'fwd' }, l2: { to: [37, AY], s: 'fwd' } }), st({ h: [52, 26], t: -60, a1: [-30, -30], a2: [-26, -26], l1: [130, 100, 40], l2: [126, 96, 40] }), squatLow({ h: [66, 45], a1: [10, 10], a2: [14, 14], l1: { to: [76, AY], s: 'fwd' }, l2: { to: [73, AY], s: 'fwd' } })], m: ['th', 'glute', 'calf'], d: 2.2, sc: 0.88, kt: [0, 0.35, 0.7, 1] },
  // Gainage
  'Plank': { f: HOLD(plank(PU_F, [56, G - 1.2], 9.6, { p: { a1: [92, -2] } }), 0.4), m: ['abs'], d: 3.5 },
  'Side Plank': { f: HOLD(plank(PU_F, [56, G - 1.2], 9.6, { p: { a1: [92, -2], a2: [-90, -90] } }), 0.6), m: ['abs'], d: 3.5 },
  'Hollow Hold': { f: HOLD(LIE({ h: [48, G - 3.4], t: 194, a1: [194, 194], l1: [-14, -14], l2: [-12, -12] }), 0.3), m: ['abs'], d: 3.5 },
  'Hollow Rock': { f: [LIE({ h: [48, G - 3.4], t: 188, a1: [188, 188], l1: [-22, -22], l2: [-20, -20] }), LIE({ h: [48, G - 3.4], t: 204, a1: [204, 204], l1: [-6, -6], l2: [-4, -4] })], m: ['abs'], d: 1.6 },
  'Dragon Flag': { f: [{ h: P([22, G - 15.5], -62, L.tor), t: 118, hd: 180, a1: { to: [13, G - 13.6] }, l1: [-62, -62], l2: [-60, -60] }, { h: P([22, G - 15.5], -14, L.tor), t: 166, hd: 180, a1: { to: [13, G - 13.6] }, l1: [-14, -14], l2: [-12, -12] }], m: ['abs'], eq: [bench(10, 46)], d: 3.4 },
  'Russian Twist (Bodyweight)': { f: [{ h: [44, G - 3.6], t: -128, hd: -110, a1: [20, -40], a2: [24, -36], l1: [-34, 24], l2: [-30, 28] }, { h: [44, G - 3.6], t: -124, hd: -100, a1: [58, -8], a2: [62, -4], l1: [-34, 24], l2: [-30, 28] }], m: ['abs'], db: 1, d: 1.6 },
  'Hanging Leg Raise': { f: [dipTop({ l1: [92, 92], l2: [90, 90] }), dipTop({ t: -96, l1: [-6, -6], l2: [-4, -4] })], m: ['abs'], eq: [BARS], sc: 0.94, d: 2.6 },
  'Knee Raise (Dip Station)': { f: [dipTop({ l1: [92, 92], l2: [90, 90] }), dipTop({ t: -94, l1: [-26, 78], l2: [-22, 80] })], m: ['abs'], eq: [BARS], sc: 0.94 },
  'Crunch': { f: [LIE({ h: [44, G - 3.2], a1: [-4, -4], l1: { to: [60, AY], s: 'up' }, l2: { to: [58, AY], s: 'up' } }), LIE({ h: [44, G - 3.2], t: 208, a1: [-22, -22], l1: { to: [60, AY], s: 'up' }, l2: { to: [58, AY], s: 'up' } })], m: ['abs'], d: 2 },
  'Lying Leg Raise': { f: [LIE({ h: [50, G - 3.2], a1: [2, 2], l1: [-6, -6], l2: [-4, -4] }), LIE({ h: [50, G - 3.2], a1: [2, 2], l1: [-88, -88], l2: [-86, -86] })], m: ['abs'], d: 2.6 },
  'Dead Bug': { f: [LIE({ h: [50, G - 3.2], a1: [190, 190], a2: [-90, -90], l1: [-90, 0], l2: [-10, -10] }), LIE({ h: [50, G - 3.2], a1: [-90, -90], a2: [190, 190], l1: [-10, -10], l2: [-90, 0] })], m: ['abs'], d: 3 },
  'V Up': { f: [LIE({ h: [50, G - 3.4], a1: [182, 182], l1: [-2, -2], l2: [0, 0] }), LIE({ h: [50, G - 3.6], t: -128, a1: [-56, -56], l1: [-52, -52], l2: [-50, -50] })], m: ['abs'], d: 2 },
  'Mountain Climber': { f: [pu(18.8, { p: { l1: [28, 156], l2: { to: PU_F, s: 'fwd' } } }), pu(18.8, { p: { l2: [28, 156], l1: { to: PU_F, s: 'fwd' } } })], m: ['abs', 'th'], d: 0.9 },
  'Shoulder Taps': { f: [pu(18.8, { p: { a2: [120, -40] } }), pu(18.8), pu(18.8, { p: { a1: [120, -40], a2: { to: PU_H, s: 'up' } } }), pu(18.8)], m: ['abs', 'shoulder'], d: 2.4 },
  // Cou : sur le banc, la tête dépasse du bout
  'Lying Neck Curls': { f: [{ h: [64, G - 15.6], t: 180, hd: 160, a1: [12, -20], l1: [12, 92], l2: [8, 90] }, { h: [64, G - 15.6], t: 180, hd: 228, a1: [12, -20], l1: [12, 92], l2: [8, 90] }], m: ['neck'], eq: [bench(44, 80)], d: 3.2 },
  'Lying Neck Extension': { f: [{ h: [36, G - 15.6], t: 0, hd: 38, a1: [110, 40], l1: [180, 180, 270], l2: [178, 178, 270] }, { h: [36, G - 15.6], t: 0, hd: -32, a1: [110, 40], l1: [180, 180, 270], l2: [178, 178, 270] }], m: ['neck'], eq: [bench(6, 52)], d: 3.2 },
  'Lying Neck Side Raise': { f: [LIE({ h: [60, G - 3.4], hd: 178, a1: [8, 4], a2: [176, 180], l1: [0, 0], l2: [2, 2] }), LIE({ h: [60, G - 3.4], hd: 218, a1: [8, 4], a2: [176, 180], l1: [0, 0], l2: [2, 2] })], m: ['neck'], d: 3.2 },
  // Cardio
  'Burpee': { f: [st({ h: [50, AY - 26], a1: [-96, -96], a2: [-92, -92], l1: { to: [52, AY - 3], s: 'fwd', f: 60 }, l2: { to: [49, AY - 3], s: 'fwd', f: 60 } }), squatLow({ h: [42, 46], t: -20, a1: { to: [58, G - 0.6], s: 'back' }, a2: { to: [56, G - 0.6], s: 'back' }, l1: { to: [48, AY], s: 'fwd' }, l2: { to: [46, AY], s: 'fwd' } }), plank([22, G - 2.4], [58, G - 0.6], 18.8), squatLow({ h: [42, 46], t: -20, a1: { to: [58, G - 0.6], s: 'back' }, a2: { to: [56, G - 0.6], s: 'back' }, l1: { to: [48, AY], s: 'fwd' }, l2: { to: [46, AY], s: 'fwd' } })], m: ['th', 'chest'], d: 2.8, sc: 0.86 },
  'Jumping Jack': { f: [fr({ a1: [82, 88], a2: [98, 92], l1: { to: [52, AY], s: 'fwd', f: 0 }, l2: { to: [48, AY], s: 'back', f: 180 } }), fr({ h: [50, AY - 23.4], a1: [-60, -76], a2: [-120, -104], l1: { to: [61, AY], s: 'fwd', f: 0 }, l2: { to: [39, AY], s: 'back', f: 180 } })], m: ['calf', 'shoulder'], d: 1, sc: 0.88 },
  'High Knees': { f: [st({ a1: [60, -40], a2: [120, 90], l1: [-14, 84], l2: { to: [49, AY], s: 'fwd' } }), st({ a1: [120, 90], a2: [60, -40], l2: [-14, 84], l1: { to: [51, AY], s: 'fwd' } })], m: ['th', 'abs'], d: 0.8 },
  'Tuck Jump': { f: [squatLow({ a1: [130, 130], a2: [126, 126] }), st({ h: [50, 24], t: -84, a1: [0, 60], a2: [4, 64], l1: [-36, 94], l2: [-32, 96] })], m: ['th', 'abs'], d: 1.4, sc: 0.86 },
  // Course : 4 positions (appui, envol, appui de l'autre jambe, envol), bras opposés aux jambes.
  'Running': { f: [
    st({ h: [50, AY - 23.4], t: -80, a1: [125, 40], a2: [55, -35], l1: [68, 96, 0], l2: [116, 150, 118] }),
    st({ h: [50, AY - 25.2], t: -80, a1: [88, 0], a2: [100, 30], l1: [108, 196, 220], l2: [28, 104, 8] }),
    st({ h: [50, AY - 23.4], t: -80, a1: [55, -35], a2: [125, 40], l1: [116, 150, 118], l2: [68, 96, 0] }),
    st({ h: [50, AY - 25.2], t: -80, a1: [100, 30], a2: [88, 0], l1: [28, 104, 8], l2: [108, 196, 220] }),
  ], m: ['th', 'calf'], d: 0.8 },
};

// Exercices ajoutés en v43 : chacun part de la silhouette d'un exercice proche (même posture), avec ses propres réglages
// (bb = barre, cable = poulie, positions f quand le mouvement est différent).
const MORE = {
  'Push Up (Weighted)': ['Push Up', {  }],
  'Ring Push Up': ['Push Up', {  }],
  'Typewriter Push Up': ['Archer Push Up', {  }],
  'Pike Push Up (Weighted)': ['Pike Pushup', {  }],
  'Knuckle Push Up': ['Push Up', {  }],
  'Plyometric Push Up (Feet Elevated)': ['Decline Push Up', {  }],
  'Tiger Bend Push Up': ['Push Up', {  }],
  'Ring Dip': ['Triceps Dip', {  }],
  'Straight Bar Dip': ['Triceps Dip', {  }],
  'Korean Dip': ['Bench Dip', {  }],
  'Bench Press (Barbell)': ['Bench Press (Dumbbell)', { bb: 1 }],
  'Incline Bench Press (Dumbbell)': ['Bench Press (Dumbbell)', { f: [INC({ a1: [100, -84], a2: [96, -88] }), INC({ a1: [-96, -96], a2: [-92, -92] })], eq: [bench(12, 40)] }],
  'Incline Bench Press (Barbell)': ['Bench Press (Dumbbell)', { bb: 1, f: [INC({ a1: [100, -84], a2: [96, -88] }), INC({ a1: [-96, -96], a2: [-92, -92] })], eq: [bench(12, 40)] }],
  'Decline Bench Press (Barbell)': ['Bench Press (Dumbbell)', { bb: 1 }],
  'Floor Press (Dumbbell)': ['Bench Press (Dumbbell)', { f: [benchLie({ h: [32, G - 3], hd: -4, a1: [176, -88], a2: [172, -92], l1: { to: [14, AY], s: 'up' }, l2: { to: [16, AY], s: 'up' } }), benchLie({ h: [32, G - 3], hd: -4, a1: [-90, -90], a2: [-88, -88], l1: { to: [14, AY], s: 'up' }, l2: { to: [16, AY], s: 'up' } })], eq: [] }],
  'Incline Dumbbell Fly': ['Dumbbell Fly', { f: [INC({ a1: [125, 52], a2: [120, 56] }), INC({ a1: [-98, -92], a2: [-94, -96] })], eq: [bench(12, 40)] }],
  'Chest Fly (Band)': ['Band Pull Apart', {  }],
  'Cable Fly Crossovers': ['Band Pull Apart', {  }],
  'Chest Press (Machine)': ['Seated Overhead Press (Dumbbell)', { f: [SEAT({ a1: [140, -20], a2: [136, -24] }), SEAT({ a1: [-4, -4], a2: [0, 0] })] }],
  'Butterfly (Pec Deck)': ['Seated Overhead Press (Dumbbell)', { f: [SEAT({ a1: [170, -100], a2: [166, -104] }), SEAT({ a1: [-6, -80], a2: [-2, -84] })] }],
  'Overhead Press (Barbell)': ['Overhead Press (Dumbbell)', { bb: 1 }],
  'Seated Overhead Press (Barbell)': ['Seated Overhead Press (Dumbbell)', { bb: 1 }],
  'Upright Row (Dumbbell)': ['Front Raise (Dumbbell)', { f: [st({ a1: [86, 86], a2: [92, 92] }), st({ a1: [-170, 20], a2: [-166, 24] })] }],
  'Lateral Raise (Band)': ['Lateral Raise (Dumbbell)', { db: 0, eq: [['band', 'f1', 'h1'], ['band', 'f2', 'h2']] }],
  'Lateral Raise (Cable)': ['Lateral Raise (Dumbbell)', { db: 0, eq: [['cable', [70, 60], 'h1']] }],
  'Shrug (Dumbbell)': ['Farmers Walk', { f: [st({ a1: [91, 90], a2: [89, 90] }), st({ h: [50, AY - 24.6], a1: [91, 90], a2: [89, 90] })], db: 3 }],
  'Handstand Push Up (Freestanding)': ['Wall Handstand Push Up', { eq: [] }],
  'Crow Pose': ['Pseudo Planche Push Up', { f: HOLD({ h: [40, 34], t: 25, hd: 32, a1: { to: [53, G - 0.6], s: 'back' }, a2: { to: [51, G - 0.6], s: 'back' }, l1: [40, 175, 120], l2: [36, 171, 116] }, 0.4), d: 3.5, m: ['shoulder', 'ua', 'abs'] }],
  'Chin Up': ['Pull Up', {  }],
  'Negative Pull Up': ['Pull Up', {  }],
  'Band Assisted Pull Up': ['Pull Up', { eq: [['bar', 50, 3], ['band', [50, 3], 'f1']] }],
  'Scapula Pull Up': ['Pull Up', { f: [fromSh([50, 21.5], -90, { hd: -90, a1: { to: [50, 3], s: 'fwd' }, l1: [92, 92, 180], l2: [88, 88, 176] }), fromSh([50, 19], -90, { hd: -86, a1: { to: [50, 3], s: 'fwd' }, l1: [92, 92, 180], l2: [88, 88, 176] })], d: 2, m: ['back'] }],
  'Dead Hang': ['Pull Up', { f: HOLD(fromSh([50, 21.5], -90, { hd: -90, a1: { to: [50, 3], s: 'fwd' }, l1: [92, 92, 180], l2: [88, 88, 176] }), 0.4), d: 3.5, m: ['fa', 'back'] }],
  'Muscle Up': ['Pull Up', {  }],
  'Front Lever': ['Pull Up', { f: HOLD({ h: [33, 22], t: 0, hd: 0, a1: { to: [50, 3] }, l1: [180, 180], l2: [178, 178] }, 0.3), d: 3.5 }],
  'Tuck Front Lever': ['Pull Up', { f: HOLD({ h: [33, 22], t: 0, hd: 0, a1: { to: [50, 3] }, l1: [-20, 100], l2: [-16, 104] }, 0.3), d: 3.5 }],
  'Back Lever': ['Pull Up', { f: HOLD({ h: [67, 22], t: 180, hd: 180, a1: { to: [50, 3] }, l1: [0, 0], l2: [2, 2] }, 0.3), d: 3.5 }],
  'Bent Over Row (Barbell)': ['Bent Over Row (Dumbbell)', { bb: 1, db: 0 }],
  'Lat Pulldown (Cable)': ['Seated Overhead Press (Dumbbell)', { db: 0, f: [SEAT({ a1: [-80, -84], a2: [-84, -88] }), SEAT({ a1: [120, -86], a2: [116, -90] })], eq: [bench(30, 58), ['cable', [50, 2], 'h1']] }],
  'Seated Cable Row': ['Seated Overhead Press (Dumbbell)', { db: 0, f: [SEAT({ a1: [-2, -2], a2: [2, 2] }), SEAT({ a1: [130, -10], a2: [126, -14] })], eq: [bench(30, 58), ['cable', [96, 44], 'h1']] }],
  'T Bar Row': ['Bent Over Row (Dumbbell)', { bb: 1, db: 0 }],
  'Renegade Row (Dumbbell)': ['Push Up', { db: 1, f: [pu(18.8), pu(18.8, { p: { a1: { to: 'hip', off: [8, -2], s: 'up' } } })] }],
  'Good Morning': ['Romanian Deadlift (Dumbbell)', { db: 0 }],
  'Back Extension': ['Superman', {  }],
  'Deadlift (Barbell)': ['Romanian Deadlift (Dumbbell)', { bb: 1, db: 0 }],
  'Pull Over (Band)': ['Face Pull (Band)', { eq: [['band', [92, 4], 'h1']], f: [st({ a1: [-40, -40], a2: [-36, -36] }), st({ a1: [80, 80], a2: [84, 84] })] }],
  'Bicep Curl (Barbell)': ['Bicep Curl (Dumbbell)', { bb: 1, db: 0 }],
  'Concentration Curl': ['Bicep Curl (Dumbbell)', { eq: [bench(30, 58)], db: 1, f: [SEAT({ t: -60, a1: [70, 90] }), SEAT({ t: -60, a1: [70, -60] })] }],
  'Preacher Curl (Dumbbell)': ['Bicep Curl (Dumbbell)', { eq: [bench(30, 58)], db: 1, f: [SEAT({ t: -78, hd: -70, a1: [45, 50] }), SEAT({ t: -78, hd: -70, a1: [45, -95] })] }],
  'Incline Curl (Dumbbell)': ['Bicep Curl (Dumbbell)', { eq: [bench(30, 58)], f: [SEAT({ t: -118, hd: -100, a1: [94, 90], a2: [90, 86] }), SEAT({ t: -118, hd: -100, a1: [96, -60], a2: [92, -64] })] }],
  'Reverse Curl (Dumbbell)': ['Bicep Curl (Dumbbell)', {  }],
  'Zottman Curl': ['Bicep Curl (Dumbbell)', {  }],
  'Wrist Curl (Dumbbell)': ['Bicep Curl (Dumbbell)', { eq: [bench(30, 58)], f: [SEAT({ t: -70, a1: [60, 30] }), SEAT({ t: -70, a1: [60, -10] })] }],
  'Triceps Pushdown (Cable)': ['Bicep Curl (Dumbbell)', { db: 0, f: [st({ a1: [94, -60], a2: [90, -64] }), st({ a1: [94, 90], a2: [90, 86] })], eq: [['cable', [70, 2], 'h1']] }],
  'Triceps Pushdown (Band)': ['Bicep Curl (Dumbbell)', { db: 0, f: [st({ a1: [94, -60], a2: [90, -64] }), st({ a1: [94, 90], a2: [90, 86] })], eq: [['band', [66, 2], 'h1']] }],
  'Close Grip Bench Press': ['Bench Press (Dumbbell)', { bb: 1 }],
  'Bench Dip (Weighted)': ['Bench Dip', {  }],
  'Squat (Barbell)': ['Squat (Bodyweight)', { bb: 1, f: [st({ a1: [140, -50], a2: [136, -54] }), squatLow({ a1: [150, -40], a2: [146, -44] })] }],
  'Front Squat (Barbell)': ['Goblet Squat', { bb: 1, db: 0, f: [st({ a1: [40, -140], a2: [44, -136] }), squatLow({ a1: [20, -150], a2: [24, -146] })] }],
  'Squat (Dumbbell)': ['Squat (Bodyweight)', { db: 3, f: [st({ a1: [91, 90], a2: [89, 90] }), squatLow({ a1: [88, 88], a2: [92, 92] })] }],
  'Sumo Squat (Dumbbell)': ['Goblet Squat', {  }],
  'Box Jump': ['Step Up', {  }],
  'Leg Press': ['Squat (Bodyweight)', { eq: [bench(30, 58)], f: [SEAT({ t: -130, a1: [60, 20], l1: [-70, 10, -80], l2: [-74, 6, -84] }), SEAT({ t: -130, a1: [60, 20], l1: [-38, -38, -128], l2: [-42, -42, -132] })], m: ['th', 'glute'] }],
  'Leg Extension (Machine)': ['Seated Overhead Press (Dumbbell)', { db: 0, eq: [bench(30, 58)], f: [SEAT({ a1: [80, 20], a2: [84, 24] }), SEAT({ a1: [80, 20], a2: [84, 24], l1: [0, 0, -90], l2: [-4, -4, -90] })] }],
  'Lying Leg Curl (Machine)': ['Superman', { f: [LIE({ t: 182, a1: [182, 182], l1: [-1, -1], l2: [1, 1] }), LIE({ t: 182, a1: [182, 182], l1: [-1, -120], l2: [1, -116] })] }],
  'Nordic Hamstring Curl': ['Knee Push Up', { f: [{ h: [40, 45.4], t: -90, hd: -90, a1: [90, 90], l1: [90, 180, 180], l2: [88, 178, 178] }, { h: [40, 45.4], t: -25, hd: -25, a1: [60, 60], l1: [90, 180, 180], l2: [88, 178, 178] }] }],
  'Lateral Lunge': ['Cossack Squat', {  }],
  'Curtsy Lunge': ['Reverse Lunge', {  }],
  'Walking Lunge (Dumbbell)': ['Lunge', { db: 3 }],
  'Hip Thrust (Barbell)': ['Hip Thrust', {  }],
  'Hip Thrust (Single Leg)': ['Hip Thrust', {  }],
  'Donkey Kick': ['Knee Push Up', { f: [QUAD(), QUAD({ l1: [200, 100, 10] })], m: ['glute'] }],
  'Fire Hydrant': ['Knee Push Up', { f: [QUAD(), QUAD({ l1: [150, 190, 190] })], m: ['glute'] }],
  'Clamshell': ['Glute Bridge', { f: [LIE({ h: [44, G - 3.2], t: 180, a1: [0, 0], l1: [-35, 60, 0], l2: [-35, 60, 0] }), LIE({ h: [44, G - 3.2], t: 180, a1: [0, 0], l1: [-35, 60, 0], l2: [-82, 8, -60] })], m: ['glute'], eq: [] }],
  'Hip Abduction (Band)': ['Jumping Jack', { f: [fr({ a1: [80, 88], a2: [100, 92] }), fr({ t: -86, a1: [80, 88], a2: [100, 92], l2: [122, 122, 212] })], eq: [['band', 'f1', 'f2']], m: ['glute'], d: 2.2 }],
  'Seated Calf Raise': ['Seated Overhead Press (Dumbbell)', { db: 0, eq: [bench(30, 58)], f: [SEAT({ a1: [60, 10], a2: [64, 14] }), SEAT({ h: [46, G - 17], a1: [60, 10], a2: [64, 14] })] }],
  'Jump Rope': ['High Knees', { f: [st({ h: [50, AY - 25], a1: [80, 20], a2: [100, 160], l1: { to: [52, AY - 2], s: 'fwd', f: 40 }, l2: { to: [49, AY - 2], s: 'fwd', f: 40 } }), st({ a1: [80, 20], a2: [100, 160] })], d: 0.7 }],
  'Sprint': ['Running', { d: 0.55 }],
  'Skater Jump': ['Jumping Lunge', { f: [st({ h: [50, 40], t: -62, hd: -40, a1: [60, 40], a2: [120, 110], l1: { to: [54, AY], s: 'fwd' }, l2: [130, 170] }), st({ h: [50, 26], t: -84, a1: [110, 100], a2: [70, 60], l1: [96, 100, 30], l2: [84, 96, 30] })], d: 1.6 }],
  'Bear Crawl': ['Mountain Climber', { d: 1.4 }],
  'Battle Rope': ['High Knees', { f: [squatLow({ h: [46, 40], t: -70, a1: [10, 10], a2: [40, 40] }), squatLow({ h: [46, 40], t: -70, a1: [40, 40], a2: [10, 10] })], d: 0.6 }],
  'Rowing Machine': ['Seated Overhead Press (Dumbbell)', { db: 0, eq: [], f: [SEAT({ h: [40, G - 6], t: -60, a1: [-10, -10], l1: [-70, 60, 0], l2: [-74, 56, 0] }), SEAT({ h: [56, G - 6], t: -110, a1: [120, -20], l1: [0, 0, -90], l2: [-4, -4, -90] })] }],
  'Cycling': ['Seated Overhead Press (Dumbbell)', { db: 0, eq: [bench(38, 54)], f: [SEAT({ a1: [40, 20], l1: [-20, 80, 0], l2: [20, 120, 0] }), SEAT({ a1: [40, 20], l1: [20, 120, 0], l2: [-20, 80, 0] })], d: 0.8 }],
  'Walking': ['Farmers Walk', { db: 0 }],
  'Swimming': ['Superman', { f: [LIE({ t: 182, a1: [182, 182], a2: [0, 0], l1: [-4, -4], l2: [4, 4] }), LIE({ t: 182, a1: [0, 0], a2: [182, 182], l1: [4, 4], l2: [-4, -4] })], d: 1.6 }],
  'L-Sit Hold': ['Knee Raise (Dip Station)', { f: HOLD(dipTop({ t: -90, l1: [0, 0], l2: [2, 2] }), 0.3), d: 3.5 }],
  'Tuck L-Sit': ['Knee Raise (Dip Station)', { f: HOLD(dipTop({ t: -90, l1: [-26, 78], l2: [-22, 80] }), 0.3), d: 3.5 }],
  'V-Sit': ['Knee Raise (Dip Station)', { f: HOLD(dipTop({ t: -96, l1: [-40, -40], l2: [-38, -38] }), 0.3), d: 3.5 }],
  'Pike Compression Hold': ['V Up', { f: HOLD({ h: [46, G - 3.6], t: -96, hd: -70, a1: { to: [50, G - 0.6], s: 'back' }, l1: [-6, -6, -80], l2: [-4, -4, -78] }, 0.5), d: 3.5, m: ['abs', 'th'] }],
  'Planche Hold (Tuck)': ['Pseudo Planche Push Up', { f: HOLD(fromSh([55, 39], 4, { hd: 8, a1: { to: [50, G - 0.6], s: 'back' }, l1: [20, 160, 120], l2: [16, 156, 116] }), 0.3), d: 3.5, m: ['shoulder', 'abs'] }],
  'Full Planche': ['Pseudo Planche Push Up', { f: HOLD(fromSh([56, 39], 0, { hd: 6, a1: { to: [50, G - 0.6], s: 'back' }, l1: [180, 180, 90], l2: [178, 178, 88] }), 0.3), d: 3.5, m: ['shoulder', 'abs', 'back'] }],
  'Human Flag': ['Side Plank', {  }],
  'Ab Wheel': ['Knee Push Up', { f: [QUAD({ a1: { to: [54, 55.5] }, a2: { to: [54, 55.5] } }), QUAD({ h: [42, 48.3], t: 5, hd: 5, a1: { to: [74, 55.5] }, a2: { to: [74, 55.5] }, l1: [131, 180, 180], l2: [129, 178, 178] })], d: 3 }],
  'Bicycle Crunch': ['Dead Bug', {  }],
  'Sit Up': ['Crunch', {  }],
  'Reverse Crunch': ['Lying Leg Raise', {  }],
  'Flutter Kicks': ['Hollow Hold', {  }],
  'Toes To Bar': ['Hanging Leg Raise', { f: [HANG({}), HANG({ t: -110, l1: [-62, -62], l2: [-58, -58] })], eq: [['bar', 50, 3]] }],
  'Hanging Knee Raise': ['Knee Raise (Dip Station)', { f: [HANG({}), HANG({ l1: [-16, 88], l2: [-12, 90] })], eq: [['bar', 50, 3]] }],
  'Windshield Wipers': ['Lying Leg Raise', {  }],
  'Plank (Weighted)': ['Plank', {  }],
  'Bird Dog': ['Knee Push Up', { f: [QUAD(), QUAD({ a1: [-12, -12], l1: [176, 176, 86] })], m: ['back', 'abs'], d: 3 }],
  'Side Plank Hip Dip': ['Side Plank', {  }],
  'Cable Crunch': ['Crunch', { f: [{ h: [44, AY - 12], t: -88, hd: -80, a1: [-60, 160], l1: [90, 180, 180], l2: [88, 178, 178] }, { h: [44, AY - 12], t: -22, hd: 10, a1: [10, -100], l1: [90, 180, 180], l2: [88, 178, 178] }], eq: [['cable', [60, 2], 'h1']] }],
  'Neck Bridge': ['Glute Bridge', {  }],
  'Neck Harness Extension': ['Lying Neck Extension', {  }],
  'Neck Isometric (Band)': ['Face Pull (Band)', { f: HOLD(st({ hd: -96, a1: [93, 90], a2: [87, 90] }), 0.3), eq: [['band', 'head', [94, 6]]], m: ['neck'], d: 3.5 }],
  'Boxing (Heavy Bag)': ['Running', { f: [st({ a1: [60, -100], a2: [70, -110], l1: { to: [56, AY], s: 'fwd' }, l2: { to: [42, AY], s: 'fwd' } }), st({ t: -84, a1: [0, 0], a2: [70, -110], l1: { to: [56, AY], s: 'fwd' }, l2: { to: [42, AY], s: 'fwd' } }), st({ a1: [60, -100], a2: [70, -110], l1: { to: [56, AY], s: 'fwd' }, l2: { to: [42, AY], s: 'fwd' } }), st({ t: -96, a1: [60, -100], a2: [-4, -4], l1: { to: [56, AY], s: 'fwd' }, l2: { to: [42, AY], s: 'fwd' } })], m: ['shoulder', 'ua', 'abs'], eq: [['bag', 74]], d: 1.2 }],
  'Shadow Boxing': ['Boxing (Heavy Bag)', { eq: [] }],
  'Hamstring Stretch (Active)': ['stretch-ham', {  }],
  'Seated Forward Fold': ['stretch-ham', {  }],
  'Standing Quad Stretch': ['stretch-quad', {  }],
  'Calf Stretch': ['stretch-dog', {  }],
  'Chest Stretch': ['stretch-chest', {  }],
  'Cross Body Shoulder Stretch': ['stretch-chest', { f: [st({ a1: [-6, 180], a2: [40, -150] }), st({ a1: [-10, 184], a2: [36, -154] })], m: ['shoulder'], d: 5 }],
  'Triceps Stretch': ['stretch-triceps', {  }],
  'Pigeon Stretch': ['stretch-child', { f: HOLD({ h: [46, G - 5], t: -70, hd: -60, a1: { to: [60, G - 0.6], s: 'back' }, l1: [24, 168, 170], l2: [176, 178, 270] }, 0.5), m: ['glute'], d: 5 }],
  'Hip Flexor Stretch': ['Lunge', { f: HOLD(st({ h: [52, 46], t: -88, l1: { to: [64, AY], s: 'fwd' }, l2: { to: [34, AY], s: 'fwd', f: 180 } }), 0.6), m: ['th'], d: 5 }],
  'Butterfly Stretch': ['stretch-ham', { f: HOLD({ h: [44, G - 3.6], t: -80, hd: -70, a1: [70, 80], l1: [-20, 120, 0], l2: [-24, 116, 0] }, 0.5), m: ['th', 'glute'], d: 5 }],
  'Cat Cow': ['Bird Dog', { f: [QUAD({ t: -16, hd: -40 }), QUAD({ t: -28, hd: 20 })], m: ['back'], d: 5 }],
  'Cobra Stretch': ['Superman', { f: HOLD({ h: [56, G - 3], t: 212, hd: 222, a1: { to: [40, G - 0.6], s: 'back' }, l1: [-1, -1], l2: [1, 1] }, 0.4), m: ['abs'], d: 5 }],
  'Child Pose': ['stretch-child', {  }],
  'Downward Dog': ['stretch-dog', {  }],
  'Lying Spinal Twist': ['Lying Neck Side Raise', { f: HOLD(LIE({ h: [56, G - 3.4], a1: [8, 4], a2: [176, 180], l1: [-60, 30], l2: [2, 2] }), 0.3), m: ['back', 'glute'], d: 5 }],
  'Neck Stretch': ['stretch-triceps', { f: [st({ hd: -70, a1: [92, 90], a2: [-80, 160] }), st({ hd: -60, a1: [92, 90], a2: [-84, 164] })], m: ['neck'], d: 5 }],
  'Wrist Stretch': ['stretch-chest', { f: [st({ a1: [-4, -4], a2: [30, -10] }), st({ a1: [-2, -2], a2: [28, -8] })], m: ['fa'], d: 5 }],
  'Lat Stretch': ['stretch-triceps', { f: [fr({ t: -80, hd: -76, a1: [-100, -110], a2: [100, 92] }), fr({ t: -74, hd: -70, a1: [-106, -116], a2: [104, 96] })], m: ['back'], d: 5 }],
  '90 90 Hip Stretch': ['stretch-ham', { f: HOLD({ h: [48, G - 3.6], t: -84, hd: -80, a1: { to: [58, G - 0.6], s: 'back' }, l1: [4, 96, 0], l2: [172, 84, 180] }, 0.5), m: ['glute'], d: 5 }],
  'Worlds Greatest Stretch': ['Lunge', { f: [st({ h: [52, 44], t: -40, l1: { to: [66, AY], s: 'fwd' }, l2: { to: [30, AY], s: 'fwd', f: 180 }, a1: { to: [58, G - 0.6] } }), st({ h: [52, 44], t: -40, l1: { to: [66, AY], s: 'fwd' }, l2: { to: [30, AY], s: 'fwd', f: 180 }, a1: [-90, -90] })], m: ['th', 'back'], d: 5 }],
  'Side Lunge Stretch': ['Cossack Squat', {  }],
};
for (const [k, [base, o]] of Object.entries(MORE)) FIG[k] = Object.assign({}, FIG[base], o);

// Exercices sans dessin à eux (anciens ou créés par l'utilisateur) : silhouette debout qui respire.
const IDLE = { f: HOLD(st(), 0.4), m: [], d: 3.5 };

// ---------- Dessin ----------
const f2 = (n) => Math.round(n * 10) / 10;
const pt2 = (p) => f2(p[0]) + ' ' + f2(p[1]);
const seg = (a, b, u0, u1) => 'M' + pt2([a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0]) + 'L' + pt2([a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1]);

// ---------- Mouvement ----------
// Entre deux positions clés, on ne fait pas glisser les points en ligne droite (les membres rétréciraient) :
// on fait tourner les articulations. Une main ou un pied posé sur un point y reste.
const lerp = (a, b, u) => a + (b - a) * u;
const lerpA = (a, b, u) => a + ((((b - a) % 360) + 540) % 360 - 180) * u;
const lerpP = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const LIMBS = { a1: ['sh', 'e1', 'h1', null], a2: ['sh', 'e2', 'h2', null], l1: ['hip', 'k1', 'f1', 't1'], l2: ['hip', 'k2', 'f2', 't2'] };
const limbOf = (p, k) => p[k] || p[k[0] + '1'];
function asAngles(J, k) {
  const [r, m, e, t] = LIMBS[k];
  return [ang(J[r], J[m]), ang(J[m], J[e]), t ? ang(J[e], J[t]) : undefined];
}
// Le coude et le genou se plient par rapport au segment du dessus : on interpole ce pli, pas l'angle absolu,
// sinon un avant-bras peut faire un tour complet (bras de la course qui tournaient).
const norm180 = (x) => ((((x % 360) + 540) % 360) - 180);
function lerpAbs(a, b, u) {
  const fa = a[2] === undefined ? a[1] - 90 : a[2], fb = b[2] === undefined ? b[1] - 90 : b[2];
  const r0 = lerpA(a[0], b[0], u);
  const ra = norm180(a[1] - a[0]), rb = norm180(b[1] - b[0]);
  const r1 = r0 + lerp(ra, rb, u);
  const foot = a[2] === undefined && b[2] === undefined ? undefined : r1 + lerp(norm180(fa - a[1]), norm180(fb - b[1]), u);
  return [r0, r1, foot];
}
function lerpLimb(A, B, u, JA, JB, k) {
  if (Array.isArray(A) && Array.isArray(B)) return lerpAbs(A, B, u);
  if (!Array.isArray(A) && !Array.isArray(B) && A.s === B.s) {
    const f = A.f === undefined || B.f === undefined ? (A.f === undefined && B.f === undefined ? undefined : null) : lerpA(A.f, B.f, u);
    if (f !== null) {
      if (Array.isArray(A.to) && Array.isArray(B.to)) return { to: lerpP(A.to, B.to, u), s: A.s, f };
      if (typeof A.to === 'string' && A.to === B.to) return { to: A.to, off: lerpP(A.off || [0, 0], B.off || [0, 0], u), s: A.s, f };
    }
  }
  // Cas mixte (un membre posé d'un côté, libre de l'autre) : le bout du membre suit un arc qui monte,
  // comme un pied qu'on avance, puis le coude ou le genou se plie tout seul dans le bon sens.
  const [, mK, eK, tK] = LIMBS[k];
  const EA = JA[eK], EB = JB[eK], d = dist(EA, EB);
  const lift = Math.sin(Math.PI * u) * Math.min(7, 0.4 * d);
  const to = [lerp(EA[0], EB[0], u), lerp(EA[1], EB[1], u) - lift];
  const rel = (J) => norm180(ang(J[mK], J[eK]) - ang(J[LIMBS[k][0]], J[mK]));
  const rA = rel(JA), rB = rel(JB);
  // Un membre presque tendu peut plier d'un côté comme de l'autre : il prend le sens de l'autre position.
  let sA = rA > 0 ? -1 : 1, sB = rB > 0 ? -1 : 1;
  if (Math.abs(rA) < 15) sA = sB; else if (Math.abs(rB) < 15) sB = sA;
  if (sA !== sB) return lerpAbs(asAngles(JA, k), asAngles(JB, k), u);
  const f = tK ? lerpA(ang(JA[eK], JA[tK]), ang(JB[eK], JB[tK]), u) : undefined;
  if (k[0] === 'a') {
    // Un bras : la main tourne autour de l'épaule (sans passer à travers le corps), en passant par devant
    // quand les deux chemins se valent (bras levés puis mains au sol, comme au burpee).
    const rk = LIMBS[k][0], aA = ang(JA[rk], EA), aB = ang(JB[rk], EB);
    let dA = norm180(aB - aA);
    if (Math.abs(dA) > 140) {
      const front = lerpA(ang(JA.hip, JA.sh), ang(JB.hip, JB.sh), 0.5) + 90, alt = dA - Math.sign(dA) * 360;
      if (Math.abs(norm180(aA + alt / 2 - front)) < Math.abs(norm180(aA + dA / 2 - front))) dA = alt;
    }
    const a = aA + dA * u, r = lerp(dist(JA[rk], EA), dist(JB[rk], EB), u);
    return { to: rk, off: [Math.cos(a * RAD) * r, Math.sin(a * RAD) * r], s: sA, f };
  }
  return { to, s: sA, f };
}
function lerpPose(p, q, u, JA, JB) {
  const hd = (x) => (x.hd === undefined ? x.t : x.hd);
  const o = { h: lerpP(p.h, q.h, u), t: lerpA(p.t, q.t, u), hd: lerpA(hd(p), hd(q), u) };
  for (const k of ['a1', 'a2', 'l1', 'l2']) o[k] = lerpLimb(limbOf(p, k), limbOf(q, k), u, JA, JB, k);
  return o;
}
// Positions clés de la boucle. hold = on tient la position du bas.
function framesOf(spec) {
  if (spec.hold && spec.f.length === 2) return [spec.f[0], spec.f[1], spec.f[1]];
  return spec.f;
}
const STEPS = 8;
// ---------- Garde-fous ----------
// Un coude ou un genou ne se plie jamais à l'envers, un membre ne s'allonge ni ne rétrécit, rien ne passe sous le sol.
// sg = sens normal du pli quand la silhouette regarde vers la droite (genou vers l'avant, coude vers l'arrière).
const LIMB3 = { a1: ['sh', 'e1', 'h1', -1, L.ua, L.fa], a2: ['sh', 'e2', 'h2', -1, L.ua, L.fa], l1: ['hip', 'k1', 'f1', 1, L.th, L.sh], l2: ['hip', 'k2', 'f2', 1, L.th, L.sh] };
const bendOf = (J, r, m, e) => norm180(ang(J[m], J[e]) - ang(J[r], J[m]));
function mirrorPt(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-6;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, x = a[0] + t * dx, y = a[1] + t * dy;
  return [2 * x - p[0], 2 * y - p[1]];
}
// Sens de chaque membre, décidé une fois pour tout l'exercice d'après ses positions clés :
// vue de profil = les jambes suivent le sens du corps ;
// vue de face (positions faites avec fr()) = chaque membre garde le sens qu'il a le plus souvent.
function sidesOf(KJ, F) {
  const front = F.some((p) => p.v === 'face');
  const vote = {};
  for (const [k, [r, m, e, sg]] of Object.entries(LIMB3)) {
    vote[k] = 0;
    for (const J of KJ) { const b = bendOf(J, r, m, e); if (Math.abs(b) > 8 && Math.abs(b) < 150) vote[k] += Math.sign(b) * sg * Math.min(Math.abs(b), 60); }
  }
  const out = { front };
  if (front) { for (const k in LIMB3) out[k] = vote[k] > 0 ? LIMB3[k][3] : vote[k] < 0 ? -LIMB3[k][3] : 0; return out; }
  // Les genoux nettement pliés décident du sens du corps (retourné quand il est couché sur le dos, tête à droite).
  // Les bras de profil ne sont pas corrigés : un coude écarté vu de côté peut sembler plié dans l'autre sens.
  const legs = vote.l1 + vote.l2, c = legs < -100 ? -1 : 1;
  out.mir = c < 0;
  out.l1 = out.l2 = c; out.a1 = out.a2 = 0;
  return out;
}
function fixJ(J, S) {
  J = Object.assign({}, J);
  const low = G - 0.3;
  for (const [k, [r, m, e, , l1, l2]] of Object.entries(LIMB3)) {
    const want = S[k];
    const okSide = (M, E) => !want || Math.sign(norm180(ang(M, E) - ang(J[r], M))) !== -want;
    // Main ou pied sous le sol : on le pose sur le sol en repliant le membre, sans changer sa longueur.
    if (J[e][1] > low) {
      const T = [J[e][0], low], old = J[e];
      const A = meet(J[r], l1, T, l2, false), B = meet(J[r], l1, T, l2, true);
      const M = okSide(A, T) ? A : B, E = P(M, ang(M, T), l2);
      J[m] = M; J[e] = E;
      const t = k[0] === 'l' ? 't' + k[1] : null;
      if (t) J[t] = [J[t][0] + E[0] - old[0], J[t][1] + E[1] - old[1]];
    }
    // Pli à l'envers : le coude ou le genou passe de l'autre côté de la ligne épaule-main (ou hanche-pied).
    const b = bendOf(J, r, m, e);
    if (want && Math.sign(b) === -want && Math.abs(b) > 10 && Math.abs(b) < 140) J[m] = mirrorPt(J[m], J[r], J[e]);
  }
  for (const [f, t, k] of [['f1', 't1', 'k1'], ['f2', 't2', 'k2']]) {
    // Silhouette retournée : les pointes de pied regardent de l'autre côté.
    if (S.mir && norm180(ang(J[f], J[t]) - ang(J[k], J[f])) < -30) J[t] = mirrorPt(J[t], J[k], J[f]);
    if (J[t][1] > low) { const dy = low - J[f][1], dx = Math.sqrt(Math.max(0, L.foot * L.foot - dy * dy)); J[t] = [J[f][0] + (J[t][0] >= J[f][0] ? dx : -dx), low]; }
  }
  return J;
}
// Toute la boucle en petites images : { J: articulations, k: instant de 0 à 1 }
function timeline(spec) {
  const F = framesOf(spec), n = F.length;
  let kt = spec.kt && spec.kt.length === n + 1 ? spec.kt : null;
  if (!kt) kt = spec.hold && n === 3 ? [0, 0.4, 0.6, 1] : F.map((_, i) => i / n).concat([1]);
  const RJ = F.map(joints), S = sidesOf(RJ, F), KJ = RJ.map((J) => fixJ(J, S));
  const out = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const same = JSON.stringify(F[i]) === JSON.stringify(F[j]);
    for (let s = 0; s < (same ? 1 : STEPS); s++) {
      const u = s / STEPS, e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      out.push({ J: s ? fixJ(joints(lerpPose(F[i], F[j], e, KJ[i], KJ[j])), S) : KJ[i], k: f2((kt[i] + (kt[i + 1] - kt[i]) * u) * 1000) / 1000 });
    }
  }
  out.push({ J: KJ[0], k: 1 });
  out.mir = !!S.mir; out.S = S;
  return out;
}
function animate(attr, vals, tl, dur) {
  if (vals.every((v) => v === vals[0])) return '';
  return '<animate attributeName="' + attr + '" dur="' + dur + 's" repeatCount="indefinite" calcMode="linear" keyTimes="' + tl.map((x) => x.k).join(';') + '" values="' + vals.join(';') + '"/>';
}
function staticEq(e) {
  const c = 'stroke="var(--fig-eq)" fill="none" stroke-linecap="round"';
  if (e[0] === 'bars') return '<path ' + c + ' stroke-width="2.2" d="M' + e[1] + ' ' + e[3] + 'H' + e[2] + 'M' + (e[1] + 1.5) + ' ' + e[3] + 'V' + G + 'M' + (e[2] - 1.5) + ' ' + e[3] + 'V' + G + '"/>';
  if (e[0] === 'bench') return '<path ' + c + ' stroke-width="2" d="M' + e[1] + ' ' + f2(e[3]) + 'H' + e[2] + 'M' + (e[1] + 3) + ' ' + f2(e[3]) + 'V' + G + 'M' + (e[2] - 3) + ' ' + f2(e[3]) + 'V' + G + '"/><rect x="' + e[1] + '" y="' + f2(e[3] - 1.5) + '" width="' + (e[2] - e[1]) + '" height="3" rx="1.5" fill="var(--fig-eq2)"/>';
  if (e[0] === 'bar') return '<path ' + c + ' stroke-width="2.2" d="M' + (e[1] - 13) + ' ' + e[2] + 'H' + (e[1] + 13) + 'M' + (e[1] - 13) + ' ' + e[2] + 'V0M' + (e[1] + 13) + ' ' + e[2] + 'V0"/>';
  if (e[0] === 'bag') return '<path ' + c + ' stroke-width="1" d="M' + e[1] + ' 0V8"/><rect x="' + (e[1] - 5) + '" y="8" width="10" height="28" rx="4.5" fill="var(--fig-eq2)" stroke="var(--fig-eq)" stroke-width="1.2"/>';
  if (e[0] === 'wall') return '<path ' + c + ' stroke-width="1.8" d="M' + e[1] + ' 0V' + G + '"/>';
  if (e[0] === 'post') return '<path ' + c + ' stroke-width="2" d="M' + e[1] + ' 20V' + G + '"/>';
  if (e[0] === 'box') return '<rect x="' + e[1] + '" y="' + (G - e[3]) + '" width="' + (e[2] - e[1]) + '" height="' + e[3] + '" rx="0.8" fill="none" stroke="var(--fig-eq)" stroke-width="1.6"/>';
  if (e[0] === 'db') return '<circle cx="' + e[1] + '" cy="' + e[2] + '" r="2.2" fill="var(--fig-db)" stroke="var(--fig-eq2)" stroke-width="1.4"/>';
  return '';
}

const cache = {};
// ---------- Dessin du mannequin ----------
// Un corps gris en relief (lumière venant d'en haut à gauche), sans visage ni vêtements ; les muscles travaillés en couleur.
// Les dégradés sont définis une fois dans index.html (#figdefs) ; une page peut changer les couleurs avec les classes fb, ff, fh, fm.
const nrm = (a, b) => { const d = dist(a, b) || 1e-3; return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d]; };
// Membre en forme de fuseau : rond au bout, plus épais du côté de rA.
function capsule(A, B, rA, rB) {
  const n = nrm(A, B);
  const a1 = [A[0] + n[0] * rA, A[1] + n[1] * rA], a2 = [A[0] - n[0] * rA, A[1] - n[1] * rA];
  const b1 = [B[0] + n[0] * rB, B[1] + n[1] * rB], b2 = [B[0] - n[0] * rB, B[1] - n[1] * rB];
  return 'M' + pt2(a1) + 'L' + pt2(b1) + 'A' + rB + ' ' + rB + ' 0 0 0 ' + pt2(b2) + 'L' + pt2(a2) + 'A' + rA + ' ' + rA + ' 0 0 0 ' + pt2(a1) + 'Z';
}
const along = (A, B, u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u];
// Point du buste : u de la hanche (0) aux épaules (1), o = décalage vers l'avant (+) ou le dos (-).
function torsoPt(J, u, o, fs) {
  const n = nrm(J.hip, J.sh), p = along(J.hip, J.sh, u);
  return [p[0] + n[0] * o * fs, p[1] + n[1] * o * fs];
}
// Contour lisse passant près de chaque point (courbes entre les milieux).
function smooth(pts) {
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = 'M' + pt2(m(pts[pts.length - 1], pts[0]));
  for (let i = 0; i < pts.length; i++) d += 'Q' + pt2(pts[i]) + ' ' + pt2(m(pts[i], pts[(i + 1) % pts.length]));
  return d + 'Z';
}
// Profil du buste vu de côté (avant +, dos -) et vu de face (symétrique).
const SIDE = [[0, -3.7], [0.1, -4], [0.32, -2.8], [0.62, -3.5], [0.9, -3.3], [1.05, -2], [1.05, 1.8], [0.86, 3.6], [0.7, 3.9], [0.48, 2.7], [0.18, 2.8], [-0.02, 2.7]];
const FACE = [[0, -4.4], [0.4, -3.6], [0.78, -4.9], [0.98, -5.6], [1.05, -3], [1.05, 3], [0.98, 5.6], [0.78, 4.9], [0.4, 3.6], [0, 4.4], [-0.08, 2], [-0.08, -2]];
const torsoPath = (J, fs, face) => smooth((face ? FACE : SIDE).map(([u, o]) => torsoPt(J, u, o, fs)));
// Muscles mis en couleur, dessinés par-dessus le corps.
const MUS = {
  chest: (J, fs) => capsule(torsoPt(J, 0.62, 1.7, fs), torsoPt(J, 0.9, 1.4, fs), 1.9, 1.7),
  abs: (J, fs) => capsule(torsoPt(J, 0.1, 1.2, fs), torsoPt(J, 0.52, 1.1, fs), 1.4, 1.5),
  back: (J, fs) => capsule(torsoPt(J, 0.3, -1.3, fs), torsoPt(J, 0.86, -1.5, fs), 1.5, 1.9),
  glute: (J, fs) => capsule(torsoPt(J, 0.02, -1.7, fs), torsoPt(J, 0.14, -1.9, fs), 2, 1.8),
  shoulder: (J) => capsule(J.sh, along(J.sh, J.e1, 0.32), 2.3, 1.7),
  ua: (J) => capsule(along(J.sh, J.e1, 0.22), along(J.sh, J.e1, 0.84), 1.6, 1.25),
  fa: (J) => capsule(along(J.e1, J.h1, 0.12), along(J.e1, J.h1, 0.66), 1.35, 1),
  th: (J) => capsule(along(J.hip, J.k1, 0.14), along(J.hip, J.k1, 0.86), 2.5, 1.7),
  calf: (J) => capsule(along(J.k1, J.f1, 0.16), along(J.k1, J.f1, 0.62), 1.75, 1.3),
  neck: (J) => capsule(J.sh, J.neck, 1.4, 1.2),
};
const R = { ua: [2.45, 1.7], fa: [1.85, 1.2], hand: 1.45, th: [3.6, 2.25], sh: [2.35, 1.3], foot: [1.3, 0.8], neck: 1.7, head: 2.75 };
// Cadre de l'image : resserré sur le mouvement et le matériel, pour que le personnage soit grand.
function frameOf(spec, tl) {
  const sc = spec.sc || 1, X = (x) => 50 + (x - 50) * sc, Y = (y) => G + (y - G) * sc;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9;
  const take = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); };
  for (const f of tl) for (const [k, p] of Object.entries(f.J)) { const r = k === 'head' ? R.head + 1 : 3; take(X(p[0] - r), Y(p[1] - r)); take(X(p[0] + r), Y(p[1] + r)); }
  for (const e of spec.eq || []) {
    if (e[0] === 'bars' || e[0] === 'bench' || e[0] === 'box') { take(e[1] - 1, G - (e[0] === 'box' ? e[3] : 0)); take(e[2] + 1, e[0] === 'box' ? G - e[3] : e[3]); }
    else if (e[0] === 'bar') { take(e[1] - 14, e[2] - 1); take(e[1] + 14, e[2]); }
    else if (e[0] === 'wall' || e[0] === 'post') take(e[1], G - 30);
    else if (e[0] === 'bag') { take(e[1] - 6, 6); take(e[1] + 6, 30); }
    else if (e[0] === 'cable') take(e[1][0], e[1][1] - 3);
    else if (e[0] === 'db') take(e[1], e[2] - 3);
  }
  const y1 = G + 3;
  let w = Math.max(x1 - x0 + 6, (y1 - y0 + 3) / 0.64, 50), h = w * 0.64;
  const cx = (x0 + x1) / 2;
  return [f2(cx - w / 2), f2(y1 - h), f2(w), f2(h)];
}
export function figure(name, cls) {
  const key = name + '|' + (cls || '');
  if (cache[key]) return cache[key];
  const spec = FIG[name] || IDLE;
  const tl = timeline(spec), dur = spec.d || 2.4;
  const fs = tl.mir ? -1 : 1, face = !!(tl.S && tl.S.front);
  const pth = (fn, attrs) => { const v = tl.map((x) => fn(x.J)); return '<path ' + attrs + ' d="' + v[0] + '">' + animate('d', v, tl, dur) + '</path>'; };
  const dot = (fn, attrs) => { const v = tl.map((x) => fn(x.J)); return '<circle ' + attrs + ' cx="' + f2(v[0][0]) + '" cy="' + f2(v[0][1]) + '">' + animate('cx', v.map((p) => f2(p[0])), tl, dur) + animate('cy', v.map((p) => f2(p[1])), tl, dur) + '</circle>'; };
  const body = (far) => 'class="' + (far ? 'ff' : 'fb') + '" fill="url(#' + (far ? 'fgFar' : 'fgBody') + ')"';
  const cap = (a, b, r, far) => pth((J) => capsule(J[a], J[b], r[0], r[1]), body(far));
  const leg = (k, f, t, far) => cap(k, f, R.sh, far) + cap(f, t, R.foot, far) + cap('hip', k, R.th, far);
  const arm = (e, h, far) => cap('sh', e, R.ua, far) + cap(e, h, R.fa, far) + dot((J) => J[h], 'r="' + R.hand + '" ' + body(far));
  const mus = (m) => (MUS[m] ? pth((J) => MUS[m](J, fs), 'class="fm" fill="url(#fgMus)"') : '');
  const vb = frameOf(spec, tl);
  let s = '<line x1="' + vb[0] + '" y1="' + (G + 0.6) + '" x2="' + f2(vb[0] + vb[2]) + '" y2="' + (G + 0.6) + '" stroke="var(--fig-floor)" stroke-width="0.8"/>';
  const sc = spec.sc || 1;
  s += '<g' + (sc !== 1 ? ' transform="translate(50 ' + G + ') scale(' + sc + ') translate(-50 -' + G + ')"' : '') + '>';
  const shx = tl.map((x) => f2((x.J.hip[0] + x.J.sh[0]) / 2));
  const op = tl.map((x) => f2(Math.max(0.12, 0.55 - (G - Math.max(x.J.hip[1], x.J.sh[1])) / 70)));
  s += '<ellipse cx="' + shx[0] + '" cy="' + (G + 0.5) + '" rx="14" ry="1.6" fill="var(--fig-shadow)" opacity="' + op[0] + '">' + animate('cx', shx, tl, dur) + animate('opacity', op, tl, dur) + '</ellipse>';
  for (const e of spec.eq || []) s += staticEq(e);
  s += leg('k2', 'f2', 't2', true) + arm('e2', 'h2', true);
  s += pth((J) => capsule(J.sh, J.neck, R.neck, R.neck - 0.15), body());
  s += pth((J) => torsoPath(J, fs, face), body());
  // Tête en forme d'œuf, dans l'axe du cou.
  s += pth((J) => { const d = dist(J.neck, J.head) || 1, u = [(J.head[0] - J.neck[0]) / d, (J.head[1] - J.neck[1]) / d]; return capsule([J.head[0] - u[0] * 1.1, J.head[1] - u[1] * 1.1], [J.head[0] + u[0] * 0.7, J.head[1] + u[1] * 0.7], R.head - 0.5, R.head); }, 'class="fh" fill="url(#fgHead)"');
  s += leg('k1', 'f1', 't1', false);
  for (const m of spec.m || []) if (!['shoulder', 'ua', 'fa'].includes(m)) s += mus(m);
  s += arm('e1', 'h1', false);
  for (const m of spec.m || []) if (['shoulder', 'ua', 'fa'].includes(m)) s += mus(m);
  for (const e of spec.eq || []) {
    if (e[0] === 'cable') {
      s += '<circle cx="' + e[1][0] + '" cy="' + e[1][1] + '" r="2" fill="none" stroke="var(--fig-eq)" stroke-width="1.2"/>';
      s += pth((J) => 'M' + pt2(e[1]) + 'L' + pt2(J[e[2]]), 'fill="none" stroke="var(--fig-eq)" stroke-width="0.9" stroke-linecap="round"');
      continue;
    }
    if (e[0] !== 'band') continue;
    const end = (k) => (J) => (typeof k === 'string' ? J[k] : k);
    s += pth((J) => 'M' + pt2(end(e[1])(J)) + 'L' + pt2(end(e[2])(J)), 'fill="none" stroke="var(--fig-band)" stroke-width="1.3" stroke-linecap="round"');
  }
  const dbAt = (k) => dot((J) => J[k], 'r="2.5" fill="var(--fig-db)" stroke="var(--fig-eq2)" stroke-width="1.1"');
  if (spec.db & 2) s += dbAt('h2');
  if (spec.db & 1) s += dbAt('h1');
  // Barre vue de profil : le disque au bout de la barre, dans la main.
  if (spec.bb) s += dot((J) => J.h1, 'r="4.4" fill="var(--fig-db)" stroke="var(--fig-eq2)" stroke-width="1.3"') + dot((J) => J.h1, 'r="1" fill="var(--fig-eq2)"');
  s += '</g>';
  const label = (EXOS[name] && EXOS[name].fr) || name;
  // Vignette immobile (bandeau de la séance) : la position de départ, sans animation.
  if (cls && cls.split(' ').includes('still')) s = s.replace(/<animate [^>]*\/>/g, '');
  return (cache[key] = '<svg class="fig' + (cls ? ' ' + cls : '') + '"' + (F3D.has(name) ? ' data-f3="' + name.replace(/"/g, '') + '"' : '') + ' viewBox="' + vb.join(' ') + '" role="img" aria-label="Animation : ' + label.replace(/"/g, '') + '">' + s + '</svg>');
}
export const hasFigure = (name) => !!FIG[name];
// Exercices montrés en 3D (fig3d.js remplace leur dessin par le personnage 3D). Essai v69.
// Essai 3D de la v69 arrêté le 28/11/2026 : tous les exercices restent en bonhommes 2D.
export const F3D = new Set();
// Données d'une animation pour la 3D : images (articulations), durée, matériel, muscles, sens du corps.
export function figData(name) {
  const spec = FIG[name] || IDLE, tl = timeline(spec);
  return { tl, dur: spec.d || 2.4, eq: spec.eq || [], m: spec.m || [], mir: !!tl.mir, front: !!(tl.S && tl.S.front), sc: spec.sc || 1, G };
}
export const FIG_NAMES = Object.keys(FIG);
export const _check = { FIG, timeline, G };
