// Briques communes à tous les écrans : petits outils, icônes, fenêtres, messages, graphiques.
import { routines, setText, dur } from './store.js';

export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
export const clean = (s) => String(s).replace(/\s+/g, ' ').trim();
export const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
export const toNum = (v) => parseFloat(String(v).replace(',', '.')) || 0;

// Numéro de version affiché dans les réglages. À augmenter avec VERSION dans sw.js et NEWS dans data.js.
export const VERSION = 9;

// État de l'interface (pas enregistré). hFilter = filtre de l'historique. edit = brouillon en cours ; pick = à quoi sert le choix d'exercice.
export const ui = { tab: 'home', historyLimit: 40, pickerQuery: '', enter: true, edit: null, pick: null, hQuery: '' };

// Chaque fichier ajoute ici ses actions : ACTIONS['nom'] = (élément touché) => { ... }
// Un bouton les déclenche avec l'attribut data-act="nom".
export const ACTIONS = {};

// ---------- Icônes ----------
export const svg = (body, extra) => '<svg aria-hidden="true" ' + (extra || '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
export const ICON = {
  gear: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', 'width="20" height="20"'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>', 'width="18" height="18"'),
  chev: svg('<path d="M9 6l6 6-6 6"/>', 'class="chev"'),
  up: svg('<path d="M6 14l6-6 6 6"/>'),
  down: svg('<path d="M6 10l6 6 6-6"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: svg('<path d="M15 6l-6 6 6 6"/>', 'width="18" height="18"'),
  more: svg('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 'width="22" height="22"'),
  minus: svg('<path d="M5 12h14"/>', 'width="22" height="22"'),
  check: svg('<path d="M6 12.5l4 4 8-9"/>'),
  lock: svg('<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/>'),
  dot: svg('<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>'),
  bell: svg('<path d="M3 12h18M6 8v8M18 8v8M9 6v12M15 6v12"/>'),
  run: svg('<circle cx="15" cy="5" r="2"/><path d="M5 21l3-5 4 1.500 1-5.500-4-1-2.500 3M13 12l3 2 3-1M12 17.500l2 3.500"/>'),
  cam: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>'),
  save: svg('<path d="M12 4v10M8 10l4 4 4-4M5 19h14"/>'),
};
export const checkDark = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#17120A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const GOLD_DEF = '<defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4E6BC"/><stop offset="0.55" stop-color="#CDAA62"/><stop offset="1" stop-color="#8F6D33"/></linearGradient></defs>';

// Badge de rang (hexagone). small = version miniature pour les listes.
export function rankSvg(letter, small) {
  return '<svg class="rank" role="img" aria-label="Rang ' + letter + '" viewBox="0 0 72 80"' + (small ? ' style="width:34px;height:38px"' : '') + '>' + GOLD_DEF
    + '<polygon points="36,3 68,21 68,59 36,77 4,59 4,21" fill="rgba(10,9,15,0.55)" stroke="url(#gold)" stroke-width="' + (small ? 4 : 2) + '"/>'
    + (small ? '' : '<polygon points="36,11 61,25 61,55 36,69 11,55 11,25" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>')
    + '<text x="36" y="' + (small ? 53 : 50) + '" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="' + (small ? 38 : 30) + '" font-weight="700" fill="url(#gold)">' + letter + '</text></svg>';
}

// Emblème de l'accueil : le badge de rang entouré d'un anneau qui montre l'avancée vers le niveau suivant.
export function emblem(letter, ratio) {
  const C = 2 * Math.PI * 76;
  return '<svg class="emblem" role="img" aria-label="Rang ' + letter + ', ' + Math.round(ratio * 100) + ' pour cent du niveau" viewBox="0 0 168 168">'
    + '<defs><linearGradient id="gold2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4E6BC"/><stop offset="0.55" stop-color="#CDAA62"/><stop offset="1" stop-color="#8F6D33"/></linearGradient>'
    + '<linearGradient id="vio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B9A8F5"/><stop offset="1" stop-color="#6F55D8"/></linearGradient></defs>'
    + '<circle cx="84" cy="84" r="76" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="5"/>'
    + '<circle class="arc" cx="84" cy="84" r="76" fill="none" stroke="url(#vio)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - ratio)).toFixed(1) + '" transform="rotate(-90 84 84)"/>'
    + '<polygon points="84,26 134,55 134,113 84,142 34,113 34,55" fill="rgba(10,9,15,0.6)" stroke="url(#gold2)" stroke-width="2.5"/>'
    + '<polygon points="84,38 124,61 124,107 84,130 44,107 44,61" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>'
    + '<text x="84" y="104" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="56" font-weight="700" fill="url(#gold2)">' + letter + '</text></svg>';
}

// Anneau de progression avec un texte au centre (tuiles de l'accueil).
export function ring(ratio, label, gold) {
  const C = 2 * Math.PI * 30;
  return '<div class="ring"><svg aria-hidden="true" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="6"/>'
    + '<circle cx="36" cy="36" r="30" fill="none" stroke="' + (gold ? '#D8BD82' : '#8468E8') + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - Math.max(0, Math.min(1, ratio)))).toFixed(1) + '" transform="rotate(-90 36 36)"/></svg>'
    + '<span class="num">' + label + '</span></div>';
}

// ---------- Messages et fenêtres ----------
export function toast(msg, gold) {
  $('toast').innerHTML = '<div class="toast glass' + (gold ? ' gold' : '') + '">' + esc(msg) + '</div>';
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { $('toast').innerHTML = ''; }, 2600);
}

// Fenêtre qui monte du bas. layer 2 = par-dessus une autre fenêtre. cls 'full' = plein écran.
// Si une fenêtre est déjà ouverte, on change son contenu sans rejouer l'animation.
export function sheet(html, layer, cls) {
  const box = $(layer === 2 ? 'sheet2' : 'sheet');
  const open = !!box.firstElementChild;
  // Une croix reste toujours visible en haut à droite ; on peut aussi tirer la fenêtre vers le bas (voir app.js).
  const x = '<button type="button" class="sheet-x" data-act="' + (layer === 2 ? 'close2' : 'close') + '" aria-label="Fermer">' + ICON.x + '</button>';
  box.innerHTML = '<div class="sheet' + (cls ? ' ' + cls : '') + (open ? ' noanim' : '') + '"><div>' + x + html + '</div></div>';
  document.body.classList.add('locked'); // la page derrière ne défile plus
}
export function closeSheet() { $('sheet').innerHTML = ''; $('sheet2').innerHTML = ''; ui.edit = null; document.body.classList.remove('locked'); }
export function closeSheet2() { $('sheet2').innerHTML = ''; if (!$('sheet').firstElementChild) document.body.classList.remove('locked'); }
export const closeBtn = '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>';

// Petite explosion de points dorés, pour un record, un niveau ou un rang gagné.
export function burst() {
  const box = document.createElement('div');
  box.className = 'burst';
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('i');
    p.style.setProperty('--a', (i * 20 + Math.random() * 14) + 'deg');
    p.style.setProperty('--d', (90 + Math.random() * 90) + 'px');
    p.style.animationDelay = (Math.random() * 0.12) + 's';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1400);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Séance copiée, colle-la dans Claude');
}

// ---------- Affichage ----------
// Nom affiché d'une séance : celui de la routine si elle existe encore, sinon le titre d'origine.
export function titleOf(w) { const r = routines().find((x) => norm(x.title) === norm(w.title)); return r ? r.label : clean(w.title); }

// "3 × 8 à 15 kg" quand toutes les séries sont pareilles, sinon la liste.
export function setsSummary(sets) {
  if (!sets.length) return 'Aucune série';
  const same = sets.every((s) => (s.r || 0) === (sets[0].r || 0) && (s.w || 0) === (sets[0].w || 0) && (s.t || 0) === (sets[0].t || 0) && !s.d);
  if (!same) return sets.map(setText).join(', ');
  const s = sets[0];
  if (s.t && !s.r) return sets.length + ' × ' + dur(s.t);
  return sets.length + ' × ' + (s.r || 0) + (s.w ? ' à ' + String(s.w).replace('.', ',') + ' kg' : '');
}

// Courbe d'évolution (valeurs de la plus ancienne à la plus récente).
export function chartSvg(values, unit) {
  const W = 320, H = 110, n = values.length;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const x = (i) => 8 + (i * (W - 16)) / (n - 1);
  const y = (v) => 12 + (H - 30) * (1 - (v - min) / span);
  const pts = values.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1));
  const show = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  return '<svg role="img" aria-label="Évolution sur ' + n + ' relevés" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">'
    + '<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(132,104,232,0.32)"/><stop offset="1" stop-color="rgba(132,104,232,0)"/></linearGradient></defs>'
    + '<polygon points="8,' + (H - 14) + ' ' + pts.join(' ') + ' ' + (W - 8) + ',' + (H - 14) + '" fill="url(#area)"/>'
    + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#8468E8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="' + x(n - 1).toFixed(1) + '" cy="' + y(values[n - 1]).toFixed(1) + '" r="5" fill="#D8BD82"/></svg>'
    + '<div class="row between small mut"><span>Plus bas : ' + show(min) + unit + '</span><span>Plus haut : ' + show(max) + unit + '</span></div>';
}
