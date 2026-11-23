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
const FRONT = { h: [50, AY - 24], t: -90, a1: [80, 88], a2: [100, 92], l1: { to: [54, AY], s: 'fwd', f: 0 }, l2: { to: [46, AY], s: 'back', f: 180 } };
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
const dipTop = (o) => fromSh([54.5, 9.6], -84, Object.assign({ a1: { to: DIP_H, s: 'back' }, l1: [104, 150], l2: [98, 146] }, o));
const dipLow = (o) => fromSh([58, 19.5], -68, Object.assign({ a1: { to: DIP_H, s: 'back' }, l1: [110, 158], l2: [104, 152] }, o));
const ROW_H = [57, 28];
const rowLow = (F) => plank(F, ROW_H, 18.8, { low: true, s: 'down' });
const rowTop = (F) => plank(F, ROW_H, 7.5, { low: true, s: 'down' });
const hinge = (o) => st(Object.assign({ h: [43, 35], t: -22, hd: -12, l1: { to: [53, AY], s: 'fwd' }, l2: { to: [49.5, AY], s: 'fwd' }, a1: [90, 90], a2: [92, 90] }, o));
const LIE = (o) => Object.assign({ h: [50, G - 3], t: 180, a1: [0, 0], l1: [0, 0], l2: [0, 0] }, o);
const SEAT = (o) => Object.assign({ h: [46, G - 15.5], t: -90, l1: [0, 90, 0], l2: [-4, 88, 0] }, o);
const benchLie = (o) => Object.assign({ h: [32, G - 15.5], t: 0, hd: -10, l1: [172, 96], l2: [168, 92] }, o);
const squatLow = (o) => st(Object.assign({ h: [41, 45], t: -52, hd: -70, a1: [-2, -2], a2: [2, 2] }, o));
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
  'Spiderman Push Up': { f: [pu(18.8), pu(9.6, { p: { l1: [-6, 150] } }), pu(18.8), pu(9.6, { p: { l2: [-6, 150] } })], m: ['chest', 'abs'], d: 4 },
  'Hindu Push Up': { f: [pike([34, 31], [58, G - 0.6], [18, G - 2.4], 18.8), plank([18, G - 2.4], [58, G - 0.6], 10), line([18, G - 2.4], [58, 46], [58, G - 0.6], { p: { t: -42, hd: -60 } })], m: ['chest', 'shoulder'], d: 3.4 },
  'Deficit Push Up': { f: [plank(PU_F, [50, G - 4], 18.8), plank(PU_F, [50, G - 4], 7.8)], m: ['chest', 'ua'], eq: [['db', 50, G - 2.3]] },
  // Dips
  'Triceps Dip': { f: [dipTop(), dipLow()], m: ['ua', 'chest'], eq: [BARS], sc: 0.94 },
  'Dips Hold': { f: HOLD(dipTop(), 0.4), m: ['ua', 'shoulder'], eq: [BARS], sc: 0.94, d: 3.5 },
  'Negative Dip': { f: [dipTop(), dipLow()], m: ['ua', 'chest'], eq: [BARS], sc: 0.94, d: 5, kt: [0, 0.8, 1] },
  'Chest Dip': { f: [dipTop({ t: -76, l1: [70, 120], l2: [66, 116] }), dipLow({ t: -50, l1: [74, 124], l2: [70, 120] })], m: ['chest'], eq: [BARS], sc: 0.94 },
  'Explosive Dip': { f: [dipLow(), fromSh([54, 6], -84, { a1: { to: [56, 25], s: 'back' }, l1: [100, 146], l2: [96, 142] })], m: ['ua', 'chest'], eq: [BARS], sc: 0.94, d: 1.5 },
  'Band Assisted Dip': { f: [dipTop(), dipLow()], m: ['ua', 'chest'], eq: [BARS, ['band', [51, 28], 'k1']], sc: 0.94 },
  'Bench Dip': { f: [fromSh([40, 26.5], -96, { a1: { to: [37, G - 13.6], s: 'back' }, l1: { to: [64, AY], s: 'fwd' } }), fromSh([41, 35.5], -98, { a1: { to: [37, G - 13.6], s: 'back' }, l1: { to: [64, AY], s: 'fwd' } })], m: ['ua'], eq: [bench(14, 38)] },
  'Bench Dip (Feet Elevated)': { f: [fromSh([40, 26.5], -96, { a1: { to: [37, G - 13.6], s: 'back' }, l1: { to: [70, G - 14.4], s: 'fwd' } }), fromSh([41, 35.5], -98, { a1: { to: [37, G - 13.6], s: 'back' }, l1: { to: [70, G - 14.4], s: 'fwd' } })], m: ['ua'], eq: [bench(14, 38), bench(64, 86)] },
  // Pectoraux
  'Bench Press (Dumbbell)': { f: [benchLie({ a1: [100, -84], a2: [96, -88] }), benchLie({ a1: [-90, -90], a2: [-88, -88] })], m: ['chest', 'ua'], eq: [bench(20, 56)], db: 3 },
  'Dumbbell Fly': { f: [benchLie({ a1: [112, 70], a2: [108, 74] }), benchLie({ a1: [-92, -86], a2: [-88, -90] })], m: ['chest'], eq: [bench(20, 56)], db: 3, d: 3 },
  // Épaules
  'Pike Pushup': { f: [pike([36, 31], [58, G - 0.6], [20, G - 2.4], 18.8), pike([38, 34], [58, G - 0.6], [20, G - 2.4], 9.6)], m: ['shoulder', 'ua'] },
  'Elevated Pike Push Up': { f: [pike([34, 25], [58, G - 0.6], [18, G - 15], 18.8), pike([36, 28], [58, G - 0.6], [18, G - 15], 9.6)], m: ['shoulder', 'ua'], eq: [bench(4, 26)] },
  'Handstand Hold': { f: HOLD({ h: [46, 21.5], t: 90, a1: { to: [47, G - 0.6] }, l1: [-94, -94], l2: [-96, -96] }, 0.3), m: ['shoulder', 'abs'], eq: [['wall', 40]], sc: 0.84, d: 3.5 },
  'Wall Handstand Push Up': { f: [{ h: [46, 21.5], t: 90, a1: { to: [47, G - 0.6] }, l1: [-94, -94], l2: [-96, -96] }, { h: [46, 30], t: 90, a1: { to: [47, G - 0.6], s: 'back' }, l1: [-94, -94], l2: [-96, -96] }], m: ['shoulder', 'ua'], eq: [['wall', 40]], sc: 0.84 },
  'Wall Handstand Push Up Negative': { f: [{ h: [46, 21.5], t: 90, a1: { to: [47, G - 0.6] }, l1: [-94, -94], l2: [-96, -96] }, { h: [46, 30], t: 90, a1: { to: [47, G - 0.6], s: 'back' }, l1: [-94, -94], l2: [-96, -96] }], m: ['shoulder', 'ua'], eq: [['wall', 40]], sc: 0.84, d: 5, kt: [0, 0.82, 1] },
  'Wall Walk': { f: [plank([14, G - 2.4], [52, G - 0.6], 18.8), { h: [24, 26], t: 72, a1: { to: [31, G - 0.6] }, l1: [-128, -128, -40], l2: [-132, -132, -40] }, { h: [16, 22], t: 88, a1: { to: [17, G - 0.6] }, l1: [-97, -97], l2: [-99, -99] }], m: ['shoulder', 'abs'], eq: [['wall', 9]], sc: 0.84, d: 5 },
  'Planche Lean': { f: [line(PU_F, [55, 39], [48, G - 0.6]), line(PU_F, [59.5, 40], [48, G - 0.6])], m: ['shoulder', 'abs'], d: 3 },
  'Seated Overhead Press (Dumbbell)': { f: [SEAT({ a1: [62, -94], a2: [58, -90] }), SEAT({ a1: [-86, -86], a2: [-90, -90] })], m: ['shoulder', 'ua'], eq: [bench(30, 58)], db: 3 },
  'Arnold Press (Dumbbell)': { f: [SEAT({ a1: [78, -100], a2: [74, -96] }), SEAT({ a1: [-86, -86], a2: [-90, -90] })], m: ['shoulder'], eq: [bench(30, 58)], db: 3, d: 3 },
  'Lateral Raise (Dumbbell)': { f: [fr({ a1: [78, 86], a2: [102, 94] }), fr({ a1: [-4, -2], a2: [184, 182] })], m: ['shoulder'], db: 3 },
  'Front Raise (Dumbbell)': { f: [st({ a1: [86, 86], a2: [92, 92] }), st({ a1: [-4, -4], a2: [92, 92] })], m: ['shoulder'], db: 3 },
  // Dos
  'Bent Over Row (Band)': { f: [hinge(), hinge({ a1: { to: 'hip', off: [10, 2], s: 'up' }, a2: { to: 'hip', off: [9, 3], s: 'up' } })], m: ['back', 'ua'], eq: [['band', 'f1', 'h1']] },
  'Bent Over Row (Dumbbell)': { f: [hinge(), hinge({ a1: { to: 'hip', off: [10, 2], s: 'up' }, a2: { to: 'hip', off: [9, 3], s: 'up' } })], m: ['back', 'ua'], db: 3 },
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
  'Bulgarian Split Squat (Dumbbell)': { f: [st({ h: [53, 35], l1: { to: [63, AY], s: 'fwd' }, l2: { to: [31, G - 14.4], s: 'fwd', f: 175 } }), st({ h: [49, 45], t: -86, l1: { to: [63, AY], s: 'fwd' }, l2: { to: [31, G - 14.4], s: 'fwd', f: 175 } })], m: ['th', 'glute'], eq: [bench(12, 34)], db: 3 },
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
  // Cardio
  'Burpee': { f: [st({ h: [50, AY - 26], a1: [-96, -96], a2: [-92, -92], l1: { to: [52, AY - 3], s: 'fwd', f: 60 }, l2: { to: [49, AY - 3], s: 'fwd', f: 60 } }), squatLow({ h: [42, 46], t: -20, a1: { to: [58, G - 0.6] }, l1: { to: [48, AY], s: 'fwd' }, l2: { to: [46, AY], s: 'fwd' } }), plank([22, G - 2.4], [58, G - 0.6], 18.8), squatLow({ h: [42, 46], t: -20, a1: { to: [58, G - 0.6] }, l1: { to: [48, AY], s: 'fwd' }, l2: { to: [46, AY], s: 'fwd' } })], m: ['th', 'chest'], d: 2.8, sc: 0.86 },
  'Jumping Jack': { f: [fr({ a1: [82, 88], a2: [98, 92], l1: { to: [52, AY], s: 'fwd', f: 0 }, l2: { to: [48, AY], s: 'back', f: 180 } }), fr({ h: [50, AY - 23.4], a1: [-60, -76], a2: [-120, -104], l1: { to: [61, AY], s: 'fwd', f: 0 }, l2: { to: [39, AY], s: 'back', f: 180 } })], m: ['calf', 'shoulder'], d: 1, sc: 0.88 },
  'High Knees': { f: [st({ a1: [60, -40], a2: [120, 90], l1: [-14, 84], l2: { to: [49, AY], s: 'fwd' } }), st({ a1: [120, 90], a2: [60, -40], l2: [-14, 84], l1: { to: [51, AY], s: 'fwd' } })], m: ['th', 'abs'], d: 0.8 },
  'Tuck Jump': { f: [squatLow({ a1: [130, 130], a2: [126, 126] }), st({ h: [50, 24], t: -84, a1: [0, 60], a2: [4, 64], l1: [-36, 94], l2: [-32, 96] })], m: ['th', 'abs'], d: 1.4, sc: 0.86 },
  'Running': { f: [st({ t: -80, a1: [60, -30], a2: [124, 150], l1: [-30, 70], l2: { to: [38, AY - 2], s: 'fwd', f: 40 } }), st({ t: -80, a1: [124, 150], a2: [60, -30], l2: [-30, 70], l1: { to: [38, AY - 2], s: 'fwd', f: 40 } })], m: ['th', 'calf'], d: 0.9 },
};

// Exercices sans dessin à eux (anciens ou créés par l'utilisateur) : silhouette debout qui respire.
const IDLE = { f: HOLD(st(), 0.4), m: [], d: 3.5 };

// ---------- Dessin ----------
const f2 = (n) => Math.round(n * 10) / 10;
const pt2 = (p) => f2(p[0]) + ' ' + f2(p[1]);
const seg = (a, b, u0, u1) => 'M' + pt2([a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0]) + 'L' + pt2([a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1]);
const MUSCLE = {
  chest: (J) => seg(J.hip, J.sh, 0.6, 0.96),
  abs: (J) => seg(J.hip, J.sh, 0.08, 0.58),
  back: (J) => seg(J.hip, J.sh, 0.12, 0.92),
  glute: (J) => seg(J.sh, J.hip, 0.8, 1) + seg(J.hip, J.k1, 0, 0.35),
  shoulder: (J) => seg(J.sh, J.e1, 0, 0.42),
  ua: (J) => seg(J.sh, J.e1, 0.18, 0.9),
  fa: (J) => seg(J.e1, J.h1, 0.1, 0.8),
  th: (J) => seg(J.hip, J.k1, 0.12, 0.9),
  calf: (J) => seg(J.k1, J.f1, 0.25, 0.85),
};

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
function lerpLimb(A, B, u, JA, JB, k) {
  if (Array.isArray(A) && Array.isArray(B)) {
    const fa = A[2] === undefined ? (B[2] === undefined ? undefined : A[1] - 90) : A[2];
    const fb = B[2] === undefined ? (A[2] === undefined ? undefined : B[1] - 90) : B[2];
    return [lerpA(A[0], B[0], u), lerpA(A[1], B[1], u), fa === undefined ? undefined : lerpA(fa, fb, u)];
  }
  if (!Array.isArray(A) && !Array.isArray(B) && A.s === B.s) {
    const f = A.f === undefined || B.f === undefined ? (A.f === undefined && B.f === undefined ? undefined : null) : lerpA(A.f, B.f, u);
    if (f !== null) {
      if (Array.isArray(A.to) && Array.isArray(B.to)) return { to: lerpP(A.to, B.to, u), s: A.s, f };
      if (typeof A.to === 'string' && A.to === B.to) return { to: A.to, off: lerpP(A.off || [0, 0], B.off || [0, 0], u), s: A.s, f };
    }
  }
  const a = asAngles(JA, k), b = asAngles(JB, k);
  return [lerpA(a[0], b[0], u), lerpA(a[1], b[1], u), a[2] === undefined ? undefined : lerpA(a[2], b[2], u)];
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
// Toute la boucle en petites images : { J: articulations, k: instant de 0 à 1 }
function timeline(spec) {
  const F = framesOf(spec), n = F.length;
  let kt = spec.kt && spec.kt.length === n + 1 ? spec.kt : null;
  if (!kt) kt = spec.hold && n === 3 ? [0, 0.4, 0.6, 1] : F.map((_, i) => i / n).concat([1]);
  const KJ = F.map(joints);
  const out = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const same = JSON.stringify(F[i]) === JSON.stringify(F[j]);
    for (let s = 0; s < (same ? 1 : STEPS); s++) {
      const u = s / STEPS, e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      out.push({ J: s ? joints(lerpPose(F[i], F[j], e, KJ[i], KJ[j])) : KJ[i], k: f2((kt[i] + (kt[i + 1] - kt[i]) * u) * 1000) / 1000 });
    }
  }
  out.push({ J: KJ[0], k: 1 });
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
  if (e[0] === 'wall') return '<path ' + c + ' stroke-width="1.8" d="M' + e[1] + ' 0V' + G + '"/>';
  if (e[0] === 'post') return '<path ' + c + ' stroke-width="2" d="M' + e[1] + ' 20V' + G + '"/>';
  if (e[0] === 'box') return '<rect x="' + e[1] + '" y="' + (G - e[3]) + '" width="' + (e[2] - e[1]) + '" height="' + e[3] + '" rx="0.8" fill="none" stroke="var(--fig-eq)" stroke-width="1.6"/>';
  if (e[0] === 'db') return '<circle cx="' + e[1] + '" cy="' + e[2] + '" r="2.2" fill="var(--fig-db)" stroke="var(--fig-eq2)" stroke-width="1.4"/>';
  return '';
}

const cache = {};
// Un personnage habillé : peau, t-shirt violet, short sombre, baskets claires, cheveux.
// Le côté lointain est plus sombre, une ombre suit le corps au sol, les muscles travaillés sont en orange.
const W = { tor: 7, neck: 3.2, th: 5.4, sh: 4.2, foot: 2.8, ua: 3.8, fa: 3.1 };
const MW = { chest: 5.2, abs: 4.4, back: 5, glute: 4.6, shoulder: 3.6, ua: 3, fa: 2.4, th: 4.2, calf: 3.1 };
export function figure(name, cls) {
  const key = name + '|' + (cls || '');
  if (cache[key]) return cache[key];
  const spec = FIG[name] || IDLE;
  const tl = timeline(spec), dur = spec.d || 2.4;
  const cap = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const pth = (fn, attrs) => { const v = tl.map((x) => fn(x.J)); return '<path ' + attrs + ' d="' + v[0] + '">' + animate('d', v, tl, dur) + '</path>'; };
  const dot = (fn, attrs) => { const v = tl.map((x) => fn(x.J)); return '<circle ' + attrs + ' cx="' + f2(v[0][0]) + '" cy="' + f2(v[0][1]) + '">' + animate('cx', v.map((p) => f2(p[0])), tl, dur) + animate('cy', v.map((p) => f2(p[1])), tl, dur) + '</circle>'; };
  const part = (a, b, w, col, u0, u1) => pth((J) => seg(J[a], J[b], u0 || 0, u1 === undefined ? 1 : u1), cap + ' stroke="var(' + col + ')" stroke-width="' + w + '"');
  const leg = (k, f, t, far) => {
    const x = far ? '2' : '';
    return part('hip', k, W.th, '--fig-skin' + x) + part(k, f, W.sh, '--fig-skin' + x) + part(f, t, W.foot, '--fig-shoe' + x, -0.15, 1)
      + part('hip', k, W.th + 0.5, '--fig-shorts' + x, 0, 0.58);
  };
  const arm = (e, h, far) => {
    const x = far ? '2' : '';
    return part('sh', e, W.ua, '--fig-skin' + x) + part(e, h, W.fa, '--fig-skin' + x) + part('sh', e, W.ua + 0.5, '--fig-shirt' + x, 0, 0.4)
      + dot((J) => J[h], 'r="' + (far ? 1.6 : 1.8) + '" fill="var(--fig-skin' + x + ')"');
  };
  const muscle = (m) => (MUSCLE[m] ? pth(MUSCLE[m], cap + ' stroke="var(--fig-gold)" stroke-width="' + MW[m] + '" opacity="0.85"') : '');
  let s = '<line x1="2" y1="' + (G + 0.6) + '" x2="98" y2="' + (G + 0.6) + '" stroke="var(--fig-floor)" stroke-width="1.2"/>';
  const sc = spec.sc || 1;
  s += '<g' + (sc !== 1 ? ' transform="translate(50 ' + G + ') scale(' + sc + ') translate(-50 -' + G + ')"' : '') + '>';
  const shx = tl.map((x) => f2((x.J.hip[0] + x.J.sh[0]) / 2));
  const op = tl.map((x) => f2(Math.max(0.12, 0.5 - (G - Math.max(x.J.hip[1], x.J.sh[1])) / 70)));
  s += '<ellipse cx="' + shx[0] + '" cy="' + (G + 0.4) + '" rx="15" ry="1.8" fill="var(--fig-shadow)" opacity="' + op[0] + '">' + animate('cx', shx, tl, dur) + animate('opacity', op, tl, dur) + '</ellipse>';
  for (const e of spec.eq || []) s += staticEq(e);
  s += leg('k2', 'f2', 't2', true) + arm('e2', 'h2', true);
  s += part('sh', 'neck', W.neck, '--fig-skin');
  s += part('hip', 'sh', W.tor, '--fig-shirt');
  s += pth((J) => seg(J.hip, J.sh, 0.55, 0.92), cap + ' stroke="var(--fig-shirt)" stroke-width="8.6"');
  s += part('hip', 'sh', W.tor + 0.6, '--fig-shorts', 0, 0.16);
  // Tête : les cheveux sont un cercle décalé vers l'arrière du crâne, la peau passe devant.
  const dirOf = (J) => { const d = dist(J.neck, J.head) || 1; return [(J.head[0] - J.neck[0]) / d, (J.head[1] - J.neck[1]) / d]; };
  s += dot((J) => { const [dx, dy] = dirOf(J); return [J.head[0] + dx * 0.7 + dy * 0.8, J.head[1] + dy * 0.7 - dx * 0.8]; }, 'r="' + (L.head + 0.3) + '" fill="var(--fig-hair)"');
  s += dot((J) => { const [dx, dy] = dirOf(J); return [J.head[0] - dy * 0.35, J.head[1] + dx * 0.35]; }, 'r="' + (L.head + 0.1) + '" fill="var(--fig-skin)"');
  s += leg('k1', 'f1', 't1', false);
  for (const m of spec.m || []) if (!['shoulder', 'ua', 'fa'].includes(m)) s += muscle(m);
  s += arm('e1', 'h1', false);
  for (const m of spec.m || []) if (['shoulder', 'ua', 'fa'].includes(m)) s += muscle(m);
  for (const e of spec.eq || []) {
    if (e[0] !== 'band') continue;
    const end = (k) => (J) => (typeof k === 'string' ? J[k] : k);
    s += pth((J) => 'M' + pt2(end(e[1])(J)) + 'L' + pt2(end(e[2])(J)), 'fill="none" stroke="var(--fig-band)" stroke-width="1.5" stroke-linecap="round"');
  }
  const dbAt = (k) => dot((J) => J[k], 'r="2.6" fill="var(--fig-db)" stroke="var(--fig-eq2)" stroke-width="1.2"');
  if (spec.db & 2) s += dbAt('h2');
  if (spec.db & 1) s += dbAt('h1');
  s += '</g>';
  const label = (EXOS[name] && EXOS[name].fr) || name;
  return (cache[key] = '<svg class="fig' + (cls ? ' ' + cls : '') + '" viewBox="0 0 100 64" role="img" aria-label="Animation : ' + label.replace(/"/g, '') + '">' + s + '</svg>');
}
export const hasFigure = (name) => !!FIG[name];
export const FIG_NAMES = Object.keys(FIG);
