// Carte du corps : chaque muscle coloré selon sa récupération (prêt ou encore fatigué) ou selon le travail de la semaine.
// Tout est calculé depuis l'historique : les muscles de chaque exercice viennent de sa fiche (FICHES), sinon de sa famille.
import { EXOS, FICHES } from './data.js';
import { state, exoName, sorted } from './store.js';
import { esc, plural, ACTIONS, sheet, closeBtn } from './ui.js';

const H = 3600e3;

// Les muscles affichés. big : gros muscle, plus long à récupérer.
export const ZONES = {
  pecs: { name: 'Pectoraux', big: true },
  epaules: { name: 'Épaules' },
  triceps: { name: 'Triceps' },
  biceps: { name: 'Biceps' },
  avantbras: { name: 'Avant-bras' },
  abdos: { name: 'Abdominaux' },
  obliques: { name: 'Obliques' },
  trapezes: { name: 'Trapèzes' },
  dos: { name: 'Dos', big: true },
  lombaires: { name: 'Bas du dos' },
  fessiers: { name: 'Fessiers', big: true },
  quadri: { name: 'Cuisses', big: true },
  ischios: { name: 'Arrière des cuisses', big: true },
  mollets: { name: 'Mollets' },
};

// Des mots de la fiche aux muscles de la carte (l'ordre compte : le plus précis d'abord).
const WORDS = [
  [/arrière des cuisses|ischio/, ['ischios']],
  [/fléchisseurs de hanche/, ['abdos', 'quadri']],
  [/arrière des épaules/, ['epaules', 'trapezes']],
  [/pector/, ['pecs']],
  [/épaule|deltoïde/, ['epaules']],
  [/triceps/, ['triceps']],
  [/biceps/, ['biceps']],
  [/avant-bras|poignet/, ['avantbras']],
  [/oblique/, ['obliques']],
  [/abdo|gainage|cœur|tronc/, ['abdos']],
  [/trapèze|haut du dos/, ['trapezes', 'dos']],
  [/bas du dos|lombaire/, ['lombaires']],
  [/grand dorsal|^dos|dos \(/, ['dos']],
  [/fessier|hanche/, ['fessiers']],
  [/cuisse|jambe|adducteur|quadri/, ['quadri']],
  [/mollet/, ['mollets']],
  [/tout le corps/, ['pecs', 'epaules', 'triceps', 'abdos', 'dos', 'quadri', 'fessiers']],
];
const BY_GROUP = {
  pompes: ['pecs', 'triceps', 'epaules'], dips: ['triceps', 'pecs', 'epaules'], pecs: ['pecs', 'triceps'], epaules: ['epaules', 'triceps'],
  dos: ['dos', 'biceps', 'trapezes'], bras: ['biceps', 'avantbras'], jambes: ['quadri', 'fessiers', 'ischios'], gainage: ['abdos', 'obliques'], cardio: ['quadri', 'mollets', 'ischios'],
};

const cache = {};
// { zone: poids } pour un exercice : 1 pour le muscle principal, 0,5 pour les autres.
export function musclesOf(name) {
  if (cache[name]) return cache[name];
  const out = {};
  const f = FICHES[name];
  if (f && f.muscles) {
    f.muscles.toLowerCase().split(',').map((x) => x.trim()).forEach((part, i) => {
      for (const [re, zs] of WORDS) if (re.test(part)) { zs.forEach((z, j) => { out[z] = Math.max(out[z] || 0, i === 0 && j === 0 ? 1 : 0.5); }); break; }
    });
  }
  if (!Object.keys(out).length) {
    const g = EXOS[name] && EXOS[name].g;
    (BY_GROUP[g] || []).forEach((z, i) => { out[z] = i === 0 ? 1 : 0.5; });
  }
  if (name === 'Running') Object.assign(out, { quadri: 1, mollets: 1, ischios: 0.6, fessiers: 0.6 });
  cache[name] = out;
  return out;
}

const setsOf = (e) => (e.name === 'Running' ? e.sets.filter((s) => s.done !== false).reduce((n, s) => n + (s.d || 0) * 1.5, 0) : e.sets.filter((s) => s.done !== false).length);

// Fatigue, séries de la semaine, moyenne sur 4 semaines, dernier entraînement et exercices de chaque muscle.
export function bodyStats(now = Date.now()) {
  const z = {};
  for (const k of Object.keys(ZONES)) z[k] = { fat: 0, week: 0, month: 0, last: 0, exos: {} };
  for (const w of sorted()) {
    const age = now - w.start;
    if (age > 28 * 24 * H) break;
    for (const e of w.exercises) {
      const n = setsOf(e);
      if (!n) continue;
      const m = musclesOf(e.name);
      for (const k of Object.keys(m)) {
        const load = n * m[k];
        const R = (ZONES[k].big ? 72 : 56) * H;
        const d = z[k];
        d.fat += load * Math.max(0, 1 - age / R);
        if (age < 7 * 24 * H) { d.week += load; d.exos[e.name] = (d.exos[e.name] || 0) + n; }
        d.month += load;
        if (!d.last) d.last = w.start;
      }
    }
  }
  for (const k of Object.keys(z)) {
    const d = z[k];
    d.rec = Math.round(100 * (1 - Math.min(1, d.fat / 9))); // 9 grosses séries juste faites = 0 %
    d.avg = d.month / 4;
    // Heures avant d'être prêt à 90 % : on avance le temps jusqu'à passer le cap.
    d.readyIn = 0;
    if (d.rec < 90) {
      for (let h = 2; h <= 96; h += 2) {
        let f = 0;
        for (const w of sorted()) {
          const age = now + h * H - w.start;
          if (age > 4 * 24 * H) break;
          for (const e of w.exercises) { const m = musclesOf(e.name)[k]; if (m) f += setsOf(e) * m * Math.max(0, 1 - age / ((ZONES[k].big ? 72 : 56) * H)); }
        }
        if (1 - f / 9 >= 0.9) { d.readyIn = h; break; }
      }
    }
  }
  return z;
}

// ---------- Le dessin : un corps gris en relief, de face et de dos ; les muscles prennent la couleur de leur état ----------
// Chaque forme est donnée pour la moitié gauche de l'image ; on la recopie en miroir pour l'autre moitié.
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => (Math.round((100 - +x) * 10) / 10) + ',' + y);
// Contour du corps (moitié gauche), mains et pieds compris.
const SIL = 'M50.6,25 L45,25 Q45.4,29.5 43.5,31 Q36,32 30,33.4 Q23.6,35 23.2,43 Q22.8,50 24.2,55 Q23.2,63 23.8,70.5 Q21.8,80 23.2,90 Q23.6,96 24.2,99 Q23,106 25.4,110.5 Q28,111.5 30,108.5 Q30.6,101 31.2,98 Q35,86 35.2,74 Q36.6,63 36.3,54 L36.8,58 Q35.8,72 36.8,84 Q33.8,92 34.2,101 Q33.6,120 37.8,139.5 Q36.8,144 38.3,148.5 Q36.3,162 39.8,178 Q37.8,183 37.2,187.5 L46.2,187.5 Q46.7,181 46.2,177 Q48.2,162 47.7,148.5 Q48.7,144 48,139.5 Q49.2,121 49.6,105 L50.6,105 Z';
// Les muscles, découpés finement (moitié gauche, recopiée en miroir). Plusieurs formes par muscle.
const FRONT = {
  trapezes: ['M45.4,27 Q41,30.6 34.6,32.6 L41,34.4 L46,31 Z'],
  epaules: ['M33.8,33.4 Q26.6,34.4 24.8,41.6 Q24.4,47 25.8,51.6 Q29.4,47.2 33.6,45 Q36.2,40.6 38.6,36 Z'],
  pecs: ['M49.3,35.6 L40,35.2 Q36.6,38 35.4,42.4 L49.3,44.4 Z', 'M49.3,45.4 L35.2,43.4 Q35.4,49.6 39.8,53.6 Q45,55.8 49.3,53.6 Z'],
  biceps: ['M26,52.8 Q30,48.6 34.2,47 Q36,55.8 34.6,65.6 Q32.4,69.6 29.2,69.6 Q25.4,65.6 25.2,58.2 Z'],
  avantbras: ['M24.8,71.8 Q28.8,70.4 34,70.6 Q34.6,76 32.8,82 Q28.4,80.2 24.6,80.2 Z', 'M24.6,81.2 Q28.4,81.2 32.5,83 Q31.6,90 29.4,97 L25.6,97 Q23.6,89 24.6,81.2 Z'],
  obliques: ['M37.6,55 Q40.8,56 43.6,57.4 L43.8,69.6 Q40,70 37,67.4 Q36.6,61 37.6,55 Z', 'M37,68.8 Q40.2,71.2 43.8,71 L44,85.4 Q40.2,87.4 37.6,83.6 Q36.6,76 37,68.8 Z'],
  abdos: ['M44.8,57.6 L49.3,57.6 L49.3,64.4 L44.8,64.8 Z', 'M44.8,65.8 L49.3,65.4 L49.3,72.4 L44.9,72.6 Z', 'M44.9,73.6 L49.3,73.4 L49.3,80.4 L45,80.6 Z', 'M45,81.6 L49.3,81.4 L49.3,89.6 Q46.4,88 45.2,85.6 Z'],
  quadri: ['M36.6,96 Q39.8,99.4 41.4,106 Q41.2,122 40.4,137.4 Q37.4,135.6 36.6,128 Q34.4,112 36.6,96 Z', 'M42.4,104.4 Q46,108.4 46.4,118 Q46,128 43.4,137.6 Q41.8,130 41.9,117 Z', 'M47.2,123.6 Q49.2,130 48.1,138.4 Q45.8,140 44.3,138.6 Q46,131 47.2,123.6 Z', 'M44.4,99.8 Q47.8,101.8 49.3,104.8 Q49,113.6 47.4,120.6 Q45.2,112 44.4,99.8 Z'],
  mollets: ['M38.8,148 Q41.4,145.4 43.3,147 Q43.4,160 42.2,174 L40.6,174 Q37.4,160 38.8,148 Z', 'M44.4,147 Q46.6,146 47,149 Q47.2,162 45.4,174 L43.6,174 Q44.6,160 44.4,147 Z'],
};
const BACK = {
  dos: ['M37.4,41.4 L44.4,44 L49.3,58.6 L49.3,73.4 Q44,75.6 40,71.4 Q35.6,61.6 35,50.2 Q35,45 37.4,41.4 Z', 'M34.8,36.4 Q38.4,35.4 43.2,39 L43.6,42.8 L37.2,40.4 Q35.2,39.2 34.8,36.4 Z'],
  trapezes: ['M50,26.4 L44.4,26.4 L42.4,30.6 Q36.2,32.6 33.2,34.8 L44,41.6 L50,57 Z'],
  epaules: ['M33.8,33.4 Q26.6,34.4 24.8,41.6 Q24.4,47 25.8,51.6 Q29.4,47.2 33.6,45 Q35.6,41 36.2,37.4 Z'],
  triceps: ['M26,52.8 Q30,48.6 34.2,47 Q34.8,55.6 32.8,61.6 Q29.4,61.2 26,59.8 Z', 'M25.4,61 Q29.2,62.4 32.5,63 Q32,68 29.2,69.6 Q25.6,67 25.4,61 Z'],
  avantbras: ['M24.8,71.8 Q28.8,70.4 34,70.6 Q34.6,76 32.8,82 Q28.4,80.2 24.6,80.2 Z', 'M24.6,81.2 Q28.4,81.2 32.5,83 Q31.6,90 29.4,97 L25.6,97 Q23.6,89 24.6,81.2 Z'],
  lombaires: ['M44.6,75.8 L49.3,75.2 L49.3,89 L43.2,89.4 Z'],
  fessiers: ['M36,90.6 Q43,87.6 49.3,90.6 L49.3,106.6 Q43,111.6 37.6,106.6 Q34.6,98.4 36,90.6 Z'],
  ischios: ['M37.6,110.4 Q41,113 43,112.4 Q43,126 42,138.6 Q38.4,136 37.2,126 Q36.4,118 37.6,110.4 Z', 'M44,112.4 Q47,112 49,110.6 Q49,126 47.6,138.6 Q45,140 43.4,139 Q44.4,126 44,112.4 Z'],
  mollets: ['M38.6,146.4 Q41,142.4 43.2,144.4 L43,163 Q39.4,160 38.4,152 Z', 'M44,144.4 Q46.6,142.4 47.2,146.4 Q48,155 45.6,164 L44,163.6 Z', 'M40.8,164 L45.4,164.6 Q45,170 44.4,174 L41.6,174 Q40.8,169 40.8,164 Z'],
};
// Couleur d'un muscle. Semaine : gris = pas entraîné, violet clair = intermédiaire, violet vif = objectif atteint (10 séries ou plus).
const GOAL = 10;
function colorOf(mode, d) {
  if (mode === 'vol') return !d.week ? '' : d.week >= GOAL ? '#7C5CF5' : '#BCAEFF';
  if (!d.last) return '';
  return d.rec >= 90 ? '#3FD69B' : d.rec >= 55 ? '#FFB03B' : '#FF5468';
}

function figureSvg(side, mode, z) {
  const M = side === 'front' ? FRONT : BACK;
  const both = (d) => '<path d="' + d + '"/><path d="' + mirror(d) + '"/>';
  let col = '';
  for (const [k, list] of Object.entries(M)) {
    const c = colorOf(mode, z[k]);
    col += '<g class="mz' + (c ? ' on' : '') + '" data-act="muscle" data-z="' + k + '"' + (c ? ' style="--mc:' + c + '"' : '') + '>' + list.map(both).join('') + '</g>';
  }
  const lines = side === 'front' ? '<path d="M50,35.6 L50,54" />' : '<path d="M50,58 L50,89" />';
  return '<svg class="bodysvg" viewBox="16 0 68 192">'
    + '<g class="bsil">' + both(SIL) + '<ellipse cx="50" cy="14.6" rx="7.6" ry="10"/></g>'
    + col
    + '<g fill="url(#fgShade)" pointer-events="none" opacity="0.6">' + Object.values(M).flat().map(both).join('') + '</g>'
    + '<g fill="none" stroke="#0B0B10" stroke-width="0.7" stroke-linecap="round" pointer-events="none">' + lines + '</g></svg>';
}

export function bodyMap(mode) {
  const z = bodyStats();
  return '<div class="bodymap">' + '<div class="col center" style="gap:4px">' + figureSvg('front', mode, z) + '<span class="small dim">Face</span></div>'
    + '<div class="col center" style="gap:4px">' + figureSvg('back', mode, z) + '<span class="small dim">Dos</span></div></div>';
}

let mode = 'rec';
export function bodyCard() {
  const z = bodyStats();
  const tired = Object.keys(z).filter((k) => z[k].rec < 55).map((k) => ZONES[k].name.toLowerCase());
  const mid = Object.keys(z).filter((k) => z[k].rec >= 55 && z[k].rec < 90).map((k) => ZONES[k].name.toLowerCase());
  const ready = Object.keys(z).filter((k) => z[k].last && z[k].rec >= 90);
  const low = Object.keys(z).filter((k) => z[k].avg >= 2 && z[k].week < z[k].avg * 0.5).map((k) => ZONES[k].name.toLowerCase());
  const list = (a) => a.slice(0, 3).join(', ') + (a.length > 3 ? ' et ' + (a.length - 3) + ' autre' + (a.length > 4 ? 's' : '') : '');
  let txt;
  if (mode === 'rec') txt = tired.length || mid.length ? (tired.length ? 'Fatigués : ' + list(tired) + '. ' : '') + (mid.length ? 'Presque prêts : ' + list(mid) + '. ' : '') + 'Le reste est prêt.' : ready.length ? 'Tout ce que tu as travaillé est récupéré : tu peux y aller fort.' : 'Pas d’entraînement récent.';
  else txt = low.length ? 'Moins travaillé que d’habitude cette semaine : ' + low.slice(0, 3).join(', ') + '.' : 'Objectif atteint = ' + GOAL + ' séries ou plus cette semaine sur ce muscle.';
  const legend = mode === 'rec'
    ? '<span class="lg"><i style="background:#3FD69B"></i>Prêt</span><span class="lg"><i style="background:#FFB03B"></i>En cours</span><span class="lg"><i style="background:#FF5468"></i>Fatigué</span><span class="lg"><i style="background:#5C5C66"></i>Pas travaillé</span>'
    : '<span class="lg"><i style="background:#5C5C66"></i>Pas entraîné</span><span class="lg"><i style="background:#BCAEFF"></i>Intermédiaire</span><span class="lg"><i style="background:#7C5CF5"></i>Objectif atteint</span>';
  return '<section class="glass card col tint t-teal" style="gap:12px" id="bodycard"><div class="row between" style="flex-wrap:wrap;gap:10px"><span class="h2">Tes muscles</span>'
    + '<div class="seg2"><button type="button" class="' + (mode === 'rec' ? 'on' : '') + '" data-act="body-mode" data-m="rec">Récupération</button><button type="button" class="' + (mode === 'vol' ? 'on' : '') + '" data-act="body-mode" data-m="vol">Semaine</button></div></div>'
    + bodyMap(mode) + '<div class="row center" style="gap:14px;flex-wrap:wrap">' + legend + '</div>'
    + '<span class="small mut">' + esc(txt) + ' Touche un muscle pour le détail.</span></section>';
}

function sheetMuscle(k) {
  const d = bodyStats()[k];
  const zn = ZONES[k];
  const ex = Object.entries(d.exos).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const ago = d.last ? Math.round((Date.now() - d.last) / H) : null;
  const agoTxt = ago === null ? 'pas ces 4 dernières semaines' : ago < 24 ? 'il y a ' + plural(Math.max(1, ago), 'heure', 'heures') : 'il y a ' + plural(Math.round(ago / 24), 'jour', 'jours');
  const status = !d.last ? 'Pas travaillé récemment' : d.rec >= 90 ? 'Prêt' : d.rec >= 55 ? 'En récupération' : 'Fatigué';
  const col = !d.last ? 'var(--mut)' : d.rec >= 90 ? 'var(--vert)' : d.rec >= 55 ? 'var(--flamme)' : 'var(--rouge)';
  let h = '<div class="col" style="gap:4px"><span class="label violet">Muscle</span><h1 class="h1">' + esc(zn.name) + '</h1><span class="small" style="color:' + col + ';font-weight:600">' + status + '</span></div>'
    + '<div class="stats3 glass card"><div><span class="num" style="font-size:24px">' + (d.last ? d.rec + ' %' : '–') + '</span><span class="small mut">récupéré</span></div>'
    + '<div><span class="num" style="font-size:24px">' + Math.round(d.week) + '</span><span class="small mut">séries (7 j)</span></div>'
    + '<div><span class="num" style="font-size:24px">' + Math.round(d.avg) + '</span><span class="small mut">moyenne / sem.</span></div></div>';
  h += '<section class="glass card col" style="gap:8px"><span class="small mut">Dernier entraînement : ' + agoTxt + '.' + (d.readyIn ? ' Prêt à fond dans environ ' + plural(d.readyIn, 'heure', 'heures') + '.' : '') + '</span>'
    + '<span class="small mut">' + (zn.big ? 'Gros muscle : compte environ 3 jours pour récupérer d’une grosse séance.' : 'Petit muscle : il récupère en 2 jours environ.') + ' Entre 10 et 20 séries par semaine, c’est la zone qui fait progresser.</span></section>';
  if (ex.length) h += '<span class="label">Cette semaine</span><div class="list">' + ex.map(([n, s]) => '<button type="button" class="item" data-act="exo" data-name="' + esc(n) + '"><span class="grow" style="font-weight:600">' + esc(exoName(n)) + '</span><span class="small mut">' + (n === 'Running' ? String(Math.round((s / 1.5) * 10) / 10).replace('.', ',') + ' km' : plural(Math.round(s), 'série', 'séries')) + '</span></button>').join('') + '</div>';
  sheet(h + closeBtn, 2);
}

Object.assign(ACTIONS, {
  muscle: (el) => sheetMuscle(el.closest('[data-z]').dataset.z),
  'body-mode': (el) => { mode = el.dataset.m; const c = document.getElementById('bodycard'); if (c) c.outerHTML = bodyCard(); },
});
