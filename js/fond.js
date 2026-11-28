// Fond de l'accueil (v61, fonds sportifs en v62) : une image d'ambiance derrière, les cartes deviennent du verre dépoli par-dessus.
// Tous les fonds sont dessinés ici (rien à télécharger, marche hors ligne). « Ta photo » est gardée dans le
// téléphone (localStorage, clé à part pour ne pas alourdir les données), réduite à 900 px de large.
import { state, save } from './store.js';
import { ACTIONS, toast } from './ui.js';
import { figure } from './anim.js';

// Les fonds « vivants » (v63) lisent tes chiffres : app.js donne la fonction qui les calcule.
let info = () => ({});
export function setBgInfo(fn) { info = fn; }

const PHOTO_KEY = 'ascension.bg';
// Petits points toujours au même endroit (graine fixe).
function rng(seed) { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
function stars(n, maxY, seed, color) {
  const rnd = rng(seed || 7); let out = '';
  for (let i = 0; i < n; i++) out += '<circle cx="' + (rnd() * 400).toFixed(1) + '" cy="' + (rnd() * maxY).toFixed(1) + '" r="' + (0.4 + rnd() * 1.1).toFixed(2) + '" fill="' + (color || '#fff') + '" opacity="' + (0.2 + rnd() * 0.6).toFixed(2) + '"/>';
  return out;
}
const hexPts = (cx, cy, R) => [-90, -30, 30, 90, 150, 210].map((a) => (cx + R * Math.cos((a * Math.PI) / 180)).toFixed(1) + ',' + (cy + R * Math.sin((a * Math.PI) / 180)).toFixed(1)).join(' ');
const f1 = (x) => x.toFixed(1);

export const FONDS = [
  ['', 'Aucun', 'Le fond uni habituel'],
  ['sport', 'Photos de sport', 'Une vraie photo en haut de chaque page, qui se fond dans le noir'],
  ['stade', 'Stade', 'La piste d’athlétisme sous les projecteurs'],
  ['salle', 'Salle', 'Ta station de dips sous un projecteur'],
  ['route', 'Course', 'La route au lever du soleil, comme le dimanche'],
  ['embleme', 'Emblème', 'Le logo d’Ascension en or'],
  ['flamme', 'Ta flamme', 'Le feu grandit avec tes semaines réussies'],
  ['rang', 'Ton rang', 'Ta lettre en grand, sa couleur change quand tu montes'],
  ['ombre', 'Ton ombre', 'Toi et ton reflet, le défi de la semaine à battre'],
  ['saison', 'Ta saison', 'La montagne du mois : chaque palier allume le chemin'],
  ['aura', 'Aura', 'Des couleurs douces qui changent selon la page et ta forme du jour'],
  ['photo', 'Ta photo', 'Ton coin d’entraînement, ou ce que tu veux'],
];

// Les id des dégradés sont préfixés par le nom du fond : plusieurs aperçus sont affichés en même temps.
const svgWrap = (k, inner, defs) => ('<svg viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>' + (defs || '') + '</defs>' + inner + '</svg>').replace(/id="/g, 'id="' + k + '-').replace(/url\(#/g, 'url(#' + k + '-');

function stade() {
  const vx = 200, vy = 400, y0 = 440;
  const X = (xb, y) => vx + ((xb - vx) * (y - vy)) / (860 - vy);
  const lanes = []; for (let i = 0; i <= 8; i++) lanes.push(-200 + i * 100);
  let lines = lanes.map((xb) => '<line x1="' + f1(xb) + '" y1="860" x2="' + f1(X(xb, y0)) + '" y2="' + y0 + '"/>').join('');
  let nums = ''; for (let i = 0; i < 8; i++) { const xc = -150 + i * 100; nums += '<text x="' + f1(X(xc, 812)) + '" y="812" font-size="' + 30 + '">' + (i + 1) + '</text>'; }
  const rnd = rng(11); let crowd = '';
  const cols = ['#FFFFFF', '#8B6CF6', '#E2C27A', '#6FD3E8', '#FF7A85'];
  for (let i = 0; i < 260; i++) { const y = 318 + rnd() * 100, x = rnd() * 400; crowd += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (0.7 + rnd() * 0.9).toFixed(2) + '" fill="' + cols[Math.floor(rnd() * cols.length)] + '" opacity="' + (0.12 + rnd() * 0.35).toFixed(2) + '"/>'; }
  const tower = (x, y, flip) => '<g>' + '<circle cx="' + x + '" cy="' + (y + 18) + '" r="170" fill="url(#glow)"/>'
    + '<path d="M' + (x - 30) + ' ' + (y + 36) + ' L' + (x + 30) + ' ' + (y + 36) + ' L' + (flip ? 380 : 300) + ' 680 L' + (flip ? 100 : 20) + ' 700Z" fill="url(#beam)" filter="url(#soft)"/>'
    + '<line x1="' + x + '" y1="' + (y + 40) + '" x2="' + x + '" y2="430" stroke="#1A1C2C" stroke-width="5"/>'
    + '<rect x="' + (x - 38) + '" y="' + y + '" width="76" height="38" rx="4" fill="#1D2033"/>'
    + [0, 1, 2, 3].map((c) => [0, 1].map((r) => '<rect x="' + (x - 33 + c * 17.5) + '" y="' + (y + 5 + r * 15) + '" width="13" height="11" rx="2" fill="#FFF8E6"/>').join('')).join('') + '</g>';
  return svgWrap('stade',
    '<rect width="400" height="860" fill="url(#sky)"/>' + stars(40, 220, 3)
    + '<rect y="420" width="400" height="440" fill="url(#grass)"/>'
    + '<path d="M0 330 Q200 296 400 330 L400 432 L0 432Z" fill="#0A0B16"/>' + crowd
    + '<path d="M0 336 Q200 302 400 336" stroke="#ffffff" stroke-opacity="0.08" fill="none"/>'
    + '<path d="M' + f1(X(-200, 860)) + ' 860 L' + f1(X(600, 860)) + ' 860 L' + f1(X(600, y0)) + ' ' + y0 + ' L' + f1(X(-200, y0)) + ' ' + y0 + 'Z" fill="url(#track)"/>'
    + '<g stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="2.4">' + lines + '</g>'
    + '<line x1="' + f1(X(-200, 690)) + '" y1="690" x2="' + f1(X(600, 690)) + '" y2="690" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="6"/>'
    + '<g fill="#FFFFFF" fill-opacity="0.55" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" text-anchor="middle">' + nums + '</g>'
    + '<ellipse cx="200" cy="600" rx="150" ry="40" fill="#FFF6DC" opacity="0.1" filter="url(#soft)"/>'
    + tower(58, 250, true) + tower(338, 112, false),
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04050C"/><stop offset="0.25" stop-color="#0B1026"/><stop offset="0.45" stop-color="#1A2148"/></linearGradient>'
    + '<linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E2A1E"/><stop offset="1" stop-color="#071510"/></linearGradient>'
    + '<linearGradient id="track" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4C1C18"/><stop offset="0.5" stop-color="#9A3626"/><stop offset="1" stop-color="#6E2419"/></linearGradient>'
    + '<radialGradient id="glow"><stop offset="0" stop-color="#FFF6DC" stop-opacity="0.55"/><stop offset="0.35" stop-color="#C9D4FF" stop-opacity="0.18"/><stop offset="1" stop-color="#C9D4FF" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DC" stop-opacity="0.2"/><stop offset="1" stop-color="#FFF6DC" stop-opacity="0.02"/></linearGradient>'
    + '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>');
}

function salle() {
  const rnd = rng(5); let dust = '';
  for (let i = 0; i < 70; i++) { const y = rnd() * 640, w = 30 + (y / 640) * 150, x = 250 - (y / 640) * 50 + (rnd() * 2 - 1) * w; dust += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (0.5 + rnd() * 1.2).toFixed(2) + '" fill="#E8E2FF" opacity="' + (0.15 + rnd() * 0.45).toFixed(2) + '"/>'; }
  const side = (x, dir) => '<g>'
    + '<rect x="' + (x - 6) + '" y="430" width="13" height="262" fill="url(#metal)"/>'
    + '<rect x="' + (dir < 0 ? x - 92 : x - 10) + '" y="418" width="102" height="16" rx="8" fill="url(#metal)"/>'
    + '<rect x="' + (dir < 0 ? x - 92 : x - 10) + '" y="418" width="102" height="3.5" rx="1.8" fill="#E2DAFF" opacity="0.7"/>'
    + '<rect x="' + (x - 6) + '" y="434" width="3" height="258" fill="#D9D0FF" opacity="0.25"/>'
    + '<rect x="' + (x - 52) + '" y="686" width="104" height="11" rx="4" fill="#1C1A28"/></g>';
  const bell = (x, y) => '<g><ellipse cx="' + (x + 22) + '" cy="' + (y + 42) + '" rx="40" ry="6" fill="#000" opacity="0.5"/><rect x="' + x + '" y="' + (y + 16) + '" width="44" height="9" rx="3" fill="#2B2838"/>'
    + '<rect x="' + (x - 10) + '" y="' + y + '" width="17" height="40" rx="5" fill="#232031"/><rect x="' + (x + 37) + '" y="' + y + '" width="17" height="40" rx="5" fill="#232031"/>'
    + '<rect x="' + (x - 10) + '" y="' + y + '" width="17" height="3" rx="1.5" fill="#CFC4FF" opacity="0.55"/><rect x="' + (x + 37) + '" y="' + y + '" width="17" height="3" rx="1.5" fill="#CFC4FF" opacity="0.55"/></g>';
  return svgWrap('salle',
    '<rect width="400" height="860" fill="url(#wall)"/>'
    + '<g stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1.5">' + [50, 120, 190, 260, 330].map((x) => '<line x1="' + x + '" y1="0" x2="' + x + '" y2="640"/>').join('') + '</g>'
    + '<rect y="640" width="400" height="220" fill="url(#floor)"/>'
    + '<path d="M214 -20 L286 -20 L392 700 L8 700Z" fill="url(#cone)" filter="url(#soft)"/>'
    + '<ellipse cx="200" cy="694" rx="210" ry="42" fill="url(#spot)"/>' + dust
    + '<ellipse cx="250" cy="36" rx="60" ry="34" fill="url(#src)"/><rect x="228" y="-6" width="44" height="20" rx="5" fill="#2A2738"/><rect x="234" y="10" width="32" height="5" rx="2.5" fill="#FFFFFF"/>'
    + '<ellipse cx="200" cy="696" rx="120" ry="10" fill="#000" opacity="0.55"/>'
    + side(140, -1) + side(260, 1) + bell(312, 664) + bell(46, 668),
    '<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08070D"/><stop offset="0.7" stop-color="#110F1B"/></linearGradient>'
    + '<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1726"/><stop offset="1" stop-color="#060509"/></linearGradient>'
    + '<linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6CCFF" stop-opacity="0.34"/><stop offset="0.6" stop-color="#9F88FF" stop-opacity="0.12"/><stop offset="1" stop-color="#9F88FF" stop-opacity="0.04"/></linearGradient>'
    + '<radialGradient id="spot"><stop offset="0" stop-color="#E4DCFF" stop-opacity="0.4"/><stop offset="1" stop-color="#E4DCFF" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="src"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.7"/><stop offset="1" stop-color="#B8A8FF" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2A2738"/><stop offset="0.5" stop-color="#4A4560"/><stop offset="1" stop-color="#1E1C29"/></linearGradient>'
    + '<filter id="soft" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="6"/></filter>');
}

function route() {
  const vx = 200, vy = 520;
  const X = (xb, y) => vx + ((xb - vx) * (y - vy)) / (860 - vy);
  let dash = ''; let y = 532;
  while (y < 860) { const h = 4 + (y - vy) * 0.12; dash += '<path d="M' + f1(X(197, y)) + ' ' + f1(y) + ' L' + f1(X(203, y)) + ' ' + f1(y) + ' L' + f1(X(203, y + h)) + ' ' + f1(y + h) + ' L' + f1(X(197, y + h)) + ' ' + f1(y + h) + 'Z"/>'; y += h * 2.1; }
  const posts = [0.15, 0.32, 0.55, 0.85].map((t) => { const yy = vy + t * 340, sc = t * 1.1 + 0.08; return '<line x1="' + f1(X(-90, yy)) + '" y1="' + f1(yy) + '" x2="' + f1(X(-90, yy)) + '" y2="' + f1(yy - 70 * sc) + '" stroke="#0C0814" stroke-width="' + f1(2.5 * sc + 0.6) + '"/><line x1="' + f1(X(490, yy)) + '" y1="' + f1(yy) + '" x2="' + f1(X(490, yy)) + '" y2="' + f1(yy - 70 * sc) + '" stroke="#0C0814" stroke-width="' + f1(2.5 * sc + 0.6) + '"/>'; }).join('');
  return svgWrap('route',
    '<rect width="400" height="860" fill="url(#sky)"/>' + stars(30, 160, 9)
    + '<circle cx="200" cy="462" r="240" fill="url(#halo)"/><circle cx="200" cy="458" r="42" fill="#FFE2B0"/>'
    + '<path d="M0 492 L46 462 L92 480 L140 446 L182 472 L226 440 L270 470 L320 448 L366 474 L400 458 V530 H0Z" fill="#5B3474" opacity="0.85"/>'
    + '<path d="M0 512 L60 484 L118 506 L170 488 L230 508 L292 482 L350 504 L400 492 V540 H0Z" fill="#33204D"/>'
    + '<rect y="520" width="400" height="340" fill="url(#ground)"/>'
    + '<path d="M' + f1(X(30, 860)) + ' 860 L' + f1(X(370, 860)) + ' 860 L' + f1(X(370, vy + 2)) + ' ' + (vy + 2) + ' L' + f1(X(30, vy + 2)) + ' ' + (vy + 2) + 'Z" fill="url(#road)"/>'
    + '<path d="M200 522 L' + f1(X(150, 860)) + ' 860 L' + f1(X(250, 860)) + ' 860Z" fill="url(#shine)"/>'
    + '<g fill="#FFE7C2" fill-opacity="0.75">' + dash + '</g>'
    + '<g stroke="#FFD9A8" stroke-opacity="0.35" stroke-width="2"><line x1="' + f1(X(40, 860)) + '" y1="860" x2="' + f1(X(40, vy + 2)) + '" y2="' + (vy + 2) + '"/><line x1="' + f1(X(360, 860)) + '" y1="860" x2="' + f1(X(360, vy + 2)) + '" y2="' + (vy + 2) + '"/></g>'
    + posts,
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E0A24"/><stop offset="0.28" stop-color="#2E1C58"/><stop offset="0.45" stop-color="#7A3A7E"/><stop offset="0.54" stop-color="#E0756E"/><stop offset="0.6" stop-color="#FFB46A"/></linearGradient>'
    + '<radialGradient id="halo"><stop offset="0" stop-color="#FFC88A" stop-opacity="0.8"/><stop offset="0.4" stop-color="#FF8F6B" stop-opacity="0.25"/><stop offset="1" stop-color="#FF8F6B" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E1230"/><stop offset="1" stop-color="#08060E"/></linearGradient>'
    + '<linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2A48"/><stop offset="1" stop-color="#15101D"/></linearGradient>'
    + '<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC88A" stop-opacity="0.45"/><stop offset="1" stop-color="#FFC88A" stop-opacity="0"/></linearGradient>');
}

function embleme() {
  const cx = 200, cy = 380;
  const rings = [260, 330, 410, 500, 600, 710].map((R, i) => '<polygon points="' + hexPts(cx, cy, R) + '" fill="none" stroke="#8B6CF6" stroke-opacity="' + (0.32 - i * 0.045).toFixed(3) + '" stroke-width="' + (1.6 - i * 0.15).toFixed(2) + '"/>').join('');
  let rays = ''; for (let i = 0; i < 6; i++) { const a = ((-90 + i * 60) * Math.PI) / 180; rays += '<line x1="' + f1(cx + 215 * Math.cos(a)) + '" y1="' + f1(cy + 215 * Math.sin(a)) + '" x2="' + f1(cx + 700 * Math.cos(a)) + '" y2="' + f1(cy + 700 * Math.sin(a)) + '"/>'; }
  return svgWrap('embleme',
    '<rect width="400" height="860" fill="url(#bg)"/>' + stars(70, 860, 21, '#E2C27A')
    + '<circle cx="' + cx + '" cy="' + cy + '" r="330" fill="url(#glow)"/>'
    + '<g stroke="#E2C27A" stroke-opacity="0.12" stroke-width="1.2">' + rays + '</g>' + rings
    + '<polygon points="' + hexPts(cx, cy, 206) + '" fill="url(#inner)"/>'
    + '<polygon points="' + hexPts(cx, cy, 206) + '" fill="none" stroke="#E2C27A" stroke-width="16" stroke-opacity="0.35" stroke-linejoin="round" filter="url(#blur)"/>'
    + '<polygon points="' + hexPts(cx, cy, 206) + '" fill="none" stroke="url(#gold)" stroke-width="10" stroke-linejoin="round"/>'
    + '<polygon points="' + hexPts(cx, cy, 184) + '" fill="none" stroke="#E2C27A" stroke-opacity="0.25" stroke-width="1.5"/>',
    '<radialGradient id="bg" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="#1D1446"/><stop offset="0.6" stop-color="#0D0A1E"/><stop offset="1" stop-color="#060509"/></radialGradient>'
    + '<radialGradient id="glow"><stop offset="0" stop-color="#7C5CF5" stop-opacity="0.55"/><stop offset="0.5" stop-color="#7C5CF5" stop-opacity="0.12"/><stop offset="1" stop-color="#7C5CF5" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="inner"><stop offset="0" stop-color="#3A2A7A" stop-opacity="0.65"/><stop offset="1" stop-color="#1A1240" stop-opacity="0.2"/></radialGradient>'
    + '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1C8"/><stop offset="0.45" stop-color="#E2C27A"/><stop offset="1" stop-color="#9C7A3A"/></linearGradient>'
    + '<filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>');
}


// ---------- Fonds vivants (v63) : ils changent avec tes chiffres ----------
const COND = 'font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700"';
function flamePath(cx, base, w, h, k) {
  // k décale la pointe : deux formes un peu différentes, la flamme passe de l'une à l'autre.
  const t = (x) => f1(x);
  return 'M' + cx + ' ' + base
    + ' C' + t(cx - w * 1.15) + ' ' + t(base - h * 0.02) + ' ' + t(cx - w * 1.05) + ' ' + t(base - h * 0.42) + ' ' + t(cx - w * (0.42 + k * 0.08)) + ' ' + t(base - h * 0.68)
    + ' C' + t(cx - w * 0.12) + ' ' + t(base - h * 0.8) + ' ' + t(cx - w * (0.28 - k * 0.2)) + ' ' + t(base - h * 0.9) + ' ' + t(cx + w * (0.04 - k * 0.12)) + ' ' + t(base - h)
    + ' C' + t(cx + w * 0.2) + ' ' + t(base - h * 0.8) + ' ' + t(cx + w * (0.66 + k * 0.1)) + ' ' + t(base - h * 0.68) + ' ' + t(cx + w * 0.86) + ' ' + t(base - h * 0.42)
    + ' C' + t(cx + w * 1.08) + ' ' + t(base - h * 0.16) + ' ' + t(cx + w * 0.86) + ' ' + t(base) + ' ' + cx + ' ' + base + 'Z';
}
function flameLayer(cx, base, w, h, fill, dur, extra) {
  const a = flamePath(cx, base, w, h, 0), b = flamePath(cx, base, w * 0.96, h * 1.05, 1);
  return '<path d="' + a + '" fill="' + fill + '"' + (extra || '') + '><animate attributeName="d" values="' + a + ';' + b + ';' + a + '" dur="' + dur + 's" repeatCount="indefinite"/></path>';
}
function flamme() {
  const st = info().st || { n: 0 };
  const n = st.n || 0;
  const H = Math.min(560, 230 + Math.min(n, 30) * 11), base = 800, cx = 200;
  const rnd = rng(17); let embers = '';
  for (let i = 0; i < 34; i++) {
    const x = cx + (rnd() * 2 - 1) * 150, y0 = base - rnd() * 140, d = (3 + rnd() * 4).toFixed(1), r = (0.8 + rnd() * 1.6).toFixed(1), dl = (rnd() * 6).toFixed(1);
    embers += '<circle cx="' + f1(x) + '" cy="' + f1(y0) + '" r="' + r + '" fill="' + (rnd() > 0.5 ? '#FFC36B' : '#FF7A3D') + '">'
      + '<animate attributeName="cy" values="' + f1(y0) + ';' + f1(y0 - H - 120) + '" dur="' + d + 's" begin="-' + dl + 's" repeatCount="indefinite"/>'
      + '<animate attributeName="opacity" values="0;1;0" dur="' + d + 's" begin="-' + dl + 's" repeatCount="indefinite"/></circle>';
  }
  return svgWrap('flamme',
    '<rect width="400" height="860" fill="url(#bg)"/>'
    + '<ellipse cx="200" cy="' + (base - H * 0.3) + '" rx="260" ry="' + f1(H * 0.75) + '" fill="url(#halo)"/>'
    + '<text x="200" y="' + f1(base - H - 40) + '" text-anchor="middle" ' + COND + ' font-size="230" fill="none" stroke="#FF9A4D" stroke-opacity="0.28" stroke-width="2">' + n + '</text>'
    + flameLayer(cx, base, 150, H, 'url(#outer)', 2.2, ' filter="url(#soft)" opacity="0.9"')
    + flameLayer(cx, base, 150, H, 'url(#outer)', 2.2, ' opacity="0.85"')
    + flameLayer(cx, base, 98, H * 0.74, 'url(#mid)', 1.7)
    + flameLayer(cx, base, 52, H * 0.46, 'url(#core)', 1.3)
    + embers
    + '<ellipse cx="200" cy="' + (base + 6) + '" rx="190" ry="26" fill="#FF8A3D" opacity="0.22" filter="url(#soft)"/>',
    '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07050A"/><stop offset="0.6" stop-color="#140809"/><stop offset="1" stop-color="#2A0E08"/></linearGradient>'
    + '<radialGradient id="halo"><stop offset="0" stop-color="#FF6A2B" stop-opacity="0.42"/><stop offset="0.55" stop-color="#C2321C" stop-opacity="0.12"/><stop offset="1" stop-color="#C2321C" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="outer" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF5A1F"/><stop offset="0.6" stop-color="#E0341C"/><stop offset="1" stop-color="#8E1A2A" stop-opacity="0.2"/></linearGradient>'
    + '<linearGradient id="mid" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFB03B"/><stop offset="1" stop-color="#FF6A1F" stop-opacity="0.5"/></linearGradient>'
    + '<linearGradient id="core" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFF6D8"/><stop offset="1" stop-color="#FFD36B" stop-opacity="0.6"/></linearGradient>'
    + '<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>');
}

// Couleur de chaque rang, de E à Z.
const RANK_COL = [['#9AA0B4', '#4A4E60'], ['#D9935A', '#7A4422'], ['#9B7CFF', '#4B2FB8'], ['#4FC3F7', '#155C8A'], ['#FF5C77', '#8A1930'], ['#F1D08A', '#8C6A2C'], ['#FFFFFF', '#7C5CF5']];
function rang() {
  const rk = info().rk || { idx: 0, ratio: 0, rank: { letter: 'E', name: '' } };
  const [c1, c2] = RANK_COL[Math.min(rk.idx || 0, RANK_COL.length - 1)];
  const cx = 200, cy = 430, R = 190;
  const per = 6 * R, pct = Math.max(0, Math.min(1, rk.ratio || 0));
  const rings = [250, 320, 400, 490, 590].map((r, i) => '<polygon points="' + hexPts(cx, cy, r) + '" fill="none" stroke="' + c1 + '" stroke-opacity="' + (0.22 - i * 0.04).toFixed(2) + '" stroke-width="1.2"/>').join('');
  return svgWrap('rang',
    '<rect width="400" height="860" fill="url(#bg)"/>' + stars(50, 860, 31, c1)
    + '<circle cx="' + cx + '" cy="' + cy + '" r="320" fill="url(#glow)"/>' + rings
    + '<polygon points="' + hexPts(cx, cy, R) + '" fill="url(#inner)" stroke="' + c1 + '" stroke-opacity="0.18" stroke-width="10"/>'
    + '<polygon points="' + hexPts(cx, cy, R) + '" fill="none" stroke="' + c1 + '" stroke-width="7" stroke-linejoin="round" stroke-dasharray="' + f1(per * pct) + ' ' + per + '" filter="url(#glowf)"/>'
    + '<polygon points="' + hexPts(cx, cy, R) + '" fill="none" stroke="' + c1 + '" stroke-width="5" stroke-linejoin="round" stroke-dasharray="' + f1(per * pct) + ' ' + per + '"/>'
    + '<text x="' + cx + '" y="' + (cy + 118) + '" text-anchor="middle" ' + COND + ' font-size="340" fill="url(#letter)" fill-opacity="0.55" stroke="' + c1 + '" stroke-opacity="0.6" stroke-width="2">' + esc0(rk.rank.letter) + '</text>',
    '<radialGradient id="bg" cx="0.5" cy="0.48" r="0.8"><stop offset="0" stop-color="' + c2 + '" stop-opacity="0.55"/><stop offset="0.55" stop-color="#0B0914"/><stop offset="1" stop-color="#050408"/></radialGradient>'
    + '<radialGradient id="glow"><stop offset="0" stop-color="' + c1 + '" stop-opacity="0.32"/><stop offset="1" stop-color="' + c1 + '" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="inner"><stop offset="0" stop-color="' + c2 + '" stop-opacity="0.5"/><stop offset="1" stop-color="' + c2 + '" stop-opacity="0.12"/></radialGradient>'
    + '<linearGradient id="letter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="' + c1 + '"/></linearGradient>'
    + '<filter id="glowf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>');
}
const esc0 = (t) => String(t || '').replace(/[<>&"]/g, '');

function ombre() {
  const bo = info().bo || {};
  const target = bo.hp || 0;
  const scene = svgWrap('ombre',
    '<rect width="400" height="860" fill="url(#bg)"/>'
    + '<ellipse cx="200" cy="470" rx="330" ry="120" fill="url(#horizon)"/>'
    + '<rect y="470" width="400" height="390" fill="url(#floor)"/>'
    + '<line x1="0" y1="470" x2="400" y2="470" stroke="#FF5A6E" stroke-opacity="0.45" stroke-width="1.5"/>'
    + (target ? '<text x="200" y="250" text-anchor="middle" ' + COND + ' font-size="200" fill="none" stroke="#FF5A6E" stroke-opacity="0.22" stroke-width="2">' + target + '</text>' : ''),
    '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060509"/><stop offset="0.55" stop-color="#150A14"/></linearGradient>'
    + '<radialGradient id="horizon"><stop offset="0" stop-color="#FF3B57" stop-opacity="0.35"/><stop offset="1" stop-color="#FF3B57" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A0B14"/><stop offset="1" stop-color="#050306"/></linearGradient>');
  if (!bo.exo) return scene;
  const fig = figure(bo.exo, 'bgf');
  return scene + '<div class="bgfig me">' + fig + '</div><div class="bgfig shadow">' + fig + '</div>';
}

function saison() {
  const se = info().se || { tier: 0, name: '' };
  const tier = Math.max(0, Math.min(30, se.tier || 0));
  // Le chemin monte en lacets du bas vers le sommet : 30 paliers.
  const pts = [];
  for (let i = 0; i < 30; i++) { const t = i / 29, y = 790 - t * 620, amp = 120 * (1 - t * 0.75); pts.push([200 + Math.sin(i * 0.9) * amp, y]); }
  const d = 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L');
  const lit = tier > 0 ? 'M' + pts.slice(0, tier).map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L') : '';
  const MED = { 10: '#D9935A', 20: '#D8DCE6', 30: '#F1D08A' };
  const dots = pts.map((p, i) => {
    const n = i + 1, on = n <= tier, cur = n === tier + 1, m = MED[n];
    if (m) return '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="11" fill="' + (on ? m : '#1A1626') + '" stroke="' + m + '" stroke-width="2.5"' + (on ? '' : ' stroke-opacity="0.5"') + '/>';
    return '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (cur ? 7 : 4.5) + '" fill="' + (on ? '#F1D08A' : cur ? '#9B7CFF' : '#2A2540') + '"' + (cur ? '><animate attributeName="r" values="6;9;6" dur="1.8s" repeatCount="indefinite"/></circle>' : '/>');
  }).join('');
  const top = pts[29];
  return svgWrap('saison',
    '<rect width="400" height="860" fill="url(#sky)"/>' + stars(60, 420, 41)
    + '<path d="M-40 860 L60 470 L120 520 L200 ' + f1(top[1] - 40) + ' L290 430 L340 400 L440 860Z" fill="url(#mount)"/>'
    + '<path d="M200 ' + f1(top[1] - 40) + ' L176 ' + f1(top[1] + 20) + ' L192 ' + f1(top[1] + 8) + ' L204 ' + f1(top[1] + 26) + ' L222 ' + f1(top[1] + 4) + 'Z" fill="#E8E4F6" opacity="0.55"/>'
    + '<path d="M-60 860 L40 640 L110 700 L170 620 L260 720 L330 610 L460 860Z" fill="#0C0A16" opacity="0.9"/>'
    + '<g opacity="0.62">' + '<path d="' + d + '" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>'
    + (lit ? '<path d="' + lit + '" fill="none" stroke="#F1D08A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowf)"/><path d="' + lit + '" fill="none" stroke="#F1D08A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' : '')
    + dots
    + '<line x1="' + f1(top[0]) + '" y1="' + f1(top[1] - 14) + '" x2="' + f1(top[0]) + '" y2="' + f1(top[1] - 52) + '" stroke="#F1D08A" stroke-width="2"/>'
    + '<path d="M' + f1(top[0]) + ' ' + f1(top[1] - 52) + ' l26 8 l-26 8Z" fill="#F1D08A"/>'
    + '</g>',
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05040B"/><stop offset="0.5" stop-color="#151036"/><stop offset="1" stop-color="#2A1D52"/></linearGradient>'
    + '<linearGradient id="mount" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2E6E"/><stop offset="1" stop-color="#110D22"/></linearGradient>'
    + '<filter id="glowf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>');
}


// Aura (v65, idée tirée des vidéos settigation / Ultrahuman) : de grandes taches de couleur très douces qui dérivent
// lentement. La couleur dépend de la page : l'accueil suit ta forme du jour, Progrès la couleur de ton rang,
// Séance l'orange de l'effort, Défis l'or, Mon profil le bleu. Au changement de page, les couleurs glissent de l'une à l'autre.
const FORME_COL = { ok: ['#3FD69B', '#2F7BFF', '#7C5CF5'], mid: ['#FFB03B', '#FF6A5A', '#7C5CF5'], low: ['#FF5A6E', '#9B3BFF', '#4B2FB8'] };
export function auraCols(tab) {
  const i = info();
  if (tab === 'workout') return ['#FF7A3D', '#E0341C', '#7C5CF5'];
  if (tab === 'progress') { const [c1, c2] = RANK_COL[Math.min((i.rk && i.rk.idx) || 0, RANK_COL.length - 1)]; return [c1, '#7C5CF5', c2]; }
  if (tab === 'defis') return ['#F1D08A', '#FF7A85', '#7C5CF5'];
  if (tab === 'history' || tab === 'moi') return ['#4FC3F7', '#7C5CF5', '#3FD69B'];
  return (i.fo && FORME_COL[i.fo.tone]) || ['#7C5CF5', '#FF8A5B', '#4FC3F7'];
}
const AURA = '<div class="aura"><i class="a1"></i><i class="a2"></i><i class="a3"></i><i class="a4"></i></div>';
function setAura(el, tab) { auraCols(tab).forEach((c, n) => el.style.setProperty('--a' + (n + 1), c)); }

const ARTS = { stade, salle, route, embleme, flamme, rang, ombre, saison };
// Clé de redessin : un fond vivant se redessine quand ses chiffres changent.
function sig(k) {
  const i = ['flamme', 'rang', 'ombre', 'saison'].includes(k) ? info() : {};
  if (k === 'flamme') return k + (i.st ? i.st.n : '');
  if (k === 'rang') return k + (i.rk ? i.rk.idx + ':' + Math.round((i.rk.ratio || 0) * 100) : '');
  if (k === 'ombre') return k + (i.bo ? i.bo.id + ':' + i.bo.hp : '');
  if (k === 'saison') return k + (i.se ? i.se.key + ':' + i.se.tier : '');
  return k;
}
function art(k) { return ARTS[k] ? ARTS[k]() : ''; }

function photo() { try { return localStorage.getItem(PHOTO_KEY) || ''; } catch (e) { return ''; } }
// Un ancien fond retiré (v61 : sommet, aurore, nuit, neon) compte comme « aucun ».
export const bgOn = () => !!state.settings.bg && !state.settings.light && FONDS.some((f) => f[0] === state.settings.bg) && (state.settings.bg !== 'photo' || !!photo());

let drawn = '';
// v67 : « Photos de sport » (idée RanKings) : une vraie photo en haut de la page, qui défile avec elle
// et se fond dans le fond sombre. Une photo par onglet, rangée dans l'app (img/fonds/, marche hors ligne).
const HERO = { home: 'home', workout: 'workout', progress: 'progress', defis: 'defis', history: 'history', moi: 'history', exos: 'workout' };
let heroNow = '';
function heroTop(tab) {
  const h = document.getElementById('hero');
  if (!h) return;
  const f = tab ? HERO[tab] || 'home' : '';
  document.body.classList.toggle('has-hero', !!f);
  if (f === heroNow) return;
  heroNow = f;
  if (!f) { h.innerHTML = ''; return; }
  h.innerHTML = '<div class="heroimg" style="background-image:url(&quot;img/fonds/' + f + '.jpg&quot;)"></div>';
}
// Appelé à chaque affichage.
export function applyBg(tab) {
  const el = document.getElementById('bg');
  if (!el) return;
  // v63 : le fond est derrière tous les écrans, sauf pendant une séance (l'écran de séance reste uni).
  // v67 : tout le monde passe une fois aux photos de sport (sauf qui a choisi sa propre photo).
  if (!state.settings.g67) { state.settings.g67 = true; if (state.settings.bg !== 'photo') state.settings.bg = 'sport'; save(); }
  // v72 : l'accueil a un fond sombre uni, pour que le coach (petit bonhomme) ressorte.
  const k = bgOn() && tab !== 'home' && !(tab === 'workout' && state.active) ? state.settings.bg : '';
  heroTop(k === 'sport' ? tab : '');
  if (k === 'sport') { document.body.dataset.bg = ''; if (drawn) { drawn = ''; el.innerHTML = ''; el.removeAttribute('style'); } return; }
  document.body.dataset.bg = k;
  if (k === 'aura') {
    if (drawn !== 'aura') { drawn = 'aura'; el.removeAttribute('style'); el.innerHTML = AURA; }
    setAura(el, tab);
    return;
  }
  const key = k && sig(k);
  if (key === drawn) return;
  drawn = key;
  if (!k) { drawn = ''; el.innerHTML = ''; el.removeAttribute('style'); return; }
  if (k === 'photo') { el.innerHTML = ''; el.style.backgroundImage = 'url("' + photo() + '")'; return; }
  el.removeAttribute('style');
  el.innerHTML = art(k);
}

// Aperçu miniature pour le choix dans les réglages.
export function bgThumb(k) {
  if (!k) return '<span class="bgthumb plain"></span>';
  if (k === 'sport') return '<span class="bgthumb heroth" style="background-image:url(&quot;img/fonds/home.jpg&quot;)"></span>';
  if (k === 'aura') return '<span class="bgthumb" style="' + auraCols('home').map((c, n) => '--a' + (n + 1) + ':' + c).join(';') + '">' + AURA + '</span>';
  if (k === 'photo') { const p = photo(); return '<span class="bgthumb"' + (p ? ' style="background-image:url(&quot;' + p + '&quot;)"' : '') + '>' + (p ? '' : '<b>+</b>') + '</span>'; }
  return '<span class="bgthumb">' + art(k) + '</span>';
}

function pickPhoto(done) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const W = Math.min(900, img.width), H = Math.round((img.height * W) / img.width);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      try { localStorage.setItem(PHOTO_KEY, c.toDataURL('image/jpeg', 0.72)); } catch (e) { toast('Photo trop lourde pour être gardée'); return; }
      URL.revokeObjectURL(img.src);
      drawn = '-';
      done();
    };
    img.src = URL.createObjectURL(f);
  };
  inp.click();
}

Object.assign(ACTIONS, {
  'set-bg': (el) => {
    const k = el.dataset.k;
    const finish = () => { state.settings.bg = k; save(); drawn = '-'; if (ACTIONS['bg-refresh']) ACTIONS['bg-refresh'](); toast(k ? 'Fond d’écran : ' + FONDS.find((x) => x[0] === k)[1] : 'Fond uni'); };
    if (k === 'photo' && (!photo() || el.dataset.new)) { pickPhoto(finish); return; }
    finish();
  },
});
