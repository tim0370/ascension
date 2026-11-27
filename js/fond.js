// Fond de l'accueil (v61) : une image d'ambiance derrière, les cartes deviennent du verre dépoli par-dessus.
// Tous les fonds sont dessinés ici (rien à télécharger, marche hors ligne). « Ta photo » est gardée dans le
// téléphone (localStorage, clé à part pour ne pas alourdir les données), réduite à 900 px de large.
import { state, save } from './store.js';
import { ACTIONS, toast } from './ui.js';

const PHOTO_KEY = 'ascension.bg';
const svgWrap = (inner, defs) => '<svg viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>' + (defs || '') + '</defs>' + inner + '</svg>';

// Petites étoiles toujours au même endroit (graine fixe).
function stars(n, maxY) {
  let s = 7, out = '';
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) out += '<circle cx="' + (rnd() * 400).toFixed(1) + '" cy="' + (rnd() * maxY).toFixed(1) + '" r="' + (0.4 + rnd() * 1.1).toFixed(2) + '" fill="#fff" opacity="' + (0.25 + rnd() * 0.6).toFixed(2) + '"/>';
  return out;
}

export const FONDS = [
  ['', 'Aucun', 'Le fond uni habituel'],
  ['sommet', 'Sommet', 'Montagnes au crépuscule, pour l’ascension'],
  ['aurore', 'Aurore', 'Lumières violettes et bleues, sans image'],
  ['nuit', 'Nuit', 'Ciel étoilé au-dessus des collines'],
  ['neon', 'Salle néon', 'Une salle sombre sous un néon violet'],
  ['photo', 'Ta photo', 'Ton coin d’entraînement, ou ce que tu veux'],
];

function art(k) {
  if (k === 'sommet') return svgWrap(
    '<rect width="400" height="860" fill="url(#sky)"/>' + stars(40, 240) + '<g transform="translate(0,-170)"><circle cx="262" cy="560" r="120" fill="url(#sun)"/><circle cx="262" cy="560" r="34" fill="#FFD9A0" opacity="0.9"/>'
    + '<path d="M0 610 L38 575 L80 596 L132 528 L176 580 L226 520 L286 586 L338 548 L400 572 V1100 H0Z" fill="#43286E" opacity="0.92"/>'
    + '<path d="M0 660 L58 606 L108 646 L168 588 L226 652 L288 604 L340 646 L400 616 V1100 H0Z" fill="#28184C"/>'
    + '<rect y="600" width="400" height="120" fill="url(#mist)"/>'
    + '<path d="M0 728 L66 668 L128 712 L198 656 L268 720 L330 680 L400 706 V1100 H0Z" fill="#130D27"/></g>',
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0819"/><stop offset="0.2" stop-color="#221447"/><stop offset="0.4" stop-color="#5A2F7E"/><stop offset="0.52" stop-color="#C46A6A"/><stop offset="0.6" stop-color="#F0A060"/></linearGradient>'
    + '<radialGradient id="sun"><stop offset="0" stop-color="#FFC98A" stop-opacity="0.75"/><stop offset="1" stop-color="#FF8A5C" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B98ACF" stop-opacity="0"/><stop offset="0.6" stop-color="#B98ACF" stop-opacity="0.18"/><stop offset="1" stop-color="#B98ACF" stop-opacity="0"/></linearGradient>');
  if (k === 'nuit') return svgWrap(
    '<rect width="400" height="860" fill="url(#ns)"/>' + stars(160, 540) + '<ellipse cx="200" cy="560" rx="340" ry="160" fill="url(#glow)"/>'
    + '<path d="M0 580 C80 540 140 570 210 548 C280 526 330 556 400 540 V860 H0Z" fill="#160F2C"/>'
    + '<path d="M0 660 C90 632 170 656 250 636 C320 620 360 642 400 634 V860 H0Z" fill="#0B0818"/>',
    '<linearGradient id="ns" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05050C"/><stop offset="0.45" stop-color="#121033"/><stop offset="0.68" stop-color="#2E2266"/></linearGradient>'
    + '<radialGradient id="glow"><stop offset="0" stop-color="#7C5CF5" stop-opacity="0.55"/><stop offset="1" stop-color="#7C5CF5" stop-opacity="0"/></radialGradient>');
  if (k === 'neon') return svgWrap(
    '<rect width="400" height="860" fill="url(#room)"/><ellipse cx="200" cy="330" rx="280" ry="220" fill="url(#halo)"/>'
    + '<rect x="60" y="318" width="280" height="12" rx="6" fill="#8F75FF" filter="url(#bl)"/><rect x="60" y="318" width="280" height="12" rx="6" fill="#E4DBFF"/>'
    + '<path d="M0 600 L400 600 L400 860 L0 860Z" fill="url(#floor)"/><ellipse cx="200" cy="640" rx="170" ry="26" fill="#8F75FF" opacity="0.22" filter="url(#bl)"/>'
    + '<path d="M60 600 L20 860 M140 600 L120 860 M260 600 L280 860 M340 600 L380 860" stroke="#ffffff" stroke-opacity="0.05" stroke-width="2"/>',
    '<linearGradient id="room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0C0A16"/><stop offset="0.7" stop-color="#100D1E"/></linearGradient>'
    + '<radialGradient id="halo"><stop offset="0" stop-color="#7C5CF5" stop-opacity="0.45"/><stop offset="1" stop-color="#7C5CF5" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1533"/><stop offset="1" stop-color="#07060C"/></linearGradient>'
    + '<filter id="bl" x="-50%" y="-300%" width="200%" height="700%"><feGaussianBlur stdDeviation="12"/></filter>');
  return '';
}

function photo() { try { return localStorage.getItem(PHOTO_KEY) || ''; } catch (e) { return ''; } }
export const bgOn = () => !!state.settings.bg && !state.settings.light && (state.settings.bg !== 'photo' || !!photo());

let drawn = '';
// Appelé à chaque affichage : le fond n'existe que sur l'accueil.
export function applyBg(tab) {
  const el = document.getElementById('bg');
  if (!el) return;
  const k = tab === 'home' && bgOn() ? state.settings.bg : '';
  document.body.dataset.bg = k;
  if (k === drawn) return;
  drawn = k;
  if (!k) { el.innerHTML = ''; el.removeAttribute('style'); return; }
  if (k === 'photo') { el.innerHTML = ''; el.style.backgroundImage = 'url("' + photo() + '")'; return; }
  el.removeAttribute('style');
  el.innerHTML = k === 'aurore' ? '<div class="aurore"><i></i><i></i><i></i></div>' : art(k);
}

// Aperçu miniature pour le choix dans les réglages.
export function bgThumb(k) {
  if (!k) return '<span class="bgthumb plain"></span>';
  if (k === 'photo') { const p = photo(); return '<span class="bgthumb"' + (p ? ' style="background-image:url(&quot;' + p + '&quot;)"' : '') + '>' + (p ? '' : '<b>+</b>') + '</span>'; }
  if (k === 'aurore') return '<span class="bgthumb"><span class="aurore"><i></i><i></i><i></i></span></span>';
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
    const finish = () => { state.settings.bg = k; save(); drawn = '-'; if (ACTIONS['bg-refresh']) ACTIONS['bg-refresh'](); toast(k ? 'Fond de l’accueil : ' + FONDS.find((x) => x[0] === k)[1] : 'Fond uni'); };
    if (k === 'photo' && (!photo() || el.dataset.new)) { pickPhoto(finish); return; }
    finish();
  },
});
