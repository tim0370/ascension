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
const FRONT = {
  trapezes: 'M45.2,28.5 Q41,31.6 34,33.2 L41.5,35.2 L46.3,32 Z',
  epaules: 'M33.6,33.6 Q26.4,34.6 24.6,42 Q24,48 25.8,52.6 Q30,47.6 34.2,45.4 Q37.2,40.6 39.4,36.2 Z',
  pecs: 'M49.6,36 L40.2,35.6 Q35.4,39.4 35,46.4 Q36.4,53.2 42.2,55.2 Q47,56.2 49.6,54.4 Z',
  biceps: 'M26.2,53.2 Q30.2,48.4 34.4,46.8 Q36.2,56 34.8,66 Q32.4,70.2 29.2,70.2 Q25.2,66 25.2,58.4 Z',
  avantbras: 'M24.8,72.4 Q29,70.8 34.2,71 Q35,78.6 32,90 L29.4,97.6 L25.6,97.6 Q22.6,86 24.8,72.4 Z',
  obliques: 'M37.8,58.4 Q41,56.6 44.2,57.4 L44.2,86.2 Q40,88.4 37.6,84.4 Q35.8,70 37.8,58.4 Z',
  quadri: 'M36.6,96.4 Q42,93.6 48.8,103 Q49.2,122 47.2,138 Q43,142 39.6,139 Q34.2,118 36.6,96.4 Z',
  mollets: 'M39.6,148.6 Q43,145.2 46.6,148.6 Q47.2,162 45.6,176 L41.6,176 Q37.6,162 39.6,148.6 Z',
};
const FRONT_MID = { abdos: 'M45.2,57.4 L54.8,57.4 L55.4,86 Q50,92.4 44.6,86 Z' };
const BACK = {
  dos: 'M37.6,40.6 L45,43.8 L49.6,60 L49.6,74.6 Q44,76.6 40,72.4 Q35.6,62 35,50.4 Q35,44.4 37.6,40.6 Z',
  epaules: 'M33.6,33.6 Q26.4,34.6 24.6,42 Q24,48 25.8,52.6 Q30,47.6 34.2,45.4 Q37.2,40.6 39.4,36.2 Z',
  triceps: 'M26.2,53.2 Q30.2,48.4 34.4,46.8 Q36.2,56 34.8,66 Q32.4,70.2 29.2,70.2 Q25.2,66 25.2,58.4 Z',
  avantbras: 'M24.8,72.4 Q29,70.8 34.2,71 Q35,78.6 32,90 L29.4,97.6 L25.6,97.6 Q22.6,86 24.8,72.4 Z',
  fessiers: 'M36,90.4 Q43,87.4 49.6,90.4 L49.6,107 Q43,112 37.6,107 Q34.6,98.4 36,90.4 Z',
  ischios: 'M37.6,110.4 Q43,114 49,110.6 Q49,126 47.6,139 Q43,142 39.6,139 Q35,124 37.6,110.4 Z',
  mollets: 'M38.6,146.4 Q42,141.4 47,146.4 Q48.6,157 45.6,170.4 L41,170.4 Q36,158 38.6,146.4 Z',
};
const BACK_MID = {
  trapezes: 'M44.4,27.4 L55.6,27.4 L57.6,31.2 Q63.8,33 67,35.2 L56,42 L50,58.4 L44,42 L33,35.2 Q36.2,33 42.4,31.2 Z',
  lombaires: 'M44,76.4 L56,76.4 L57,90 L43,90 Z',
};

function colorOf(mode, d) {
  if (mode === 'vol') {
    if (!d.week) return 'transparent';
    const t = Math.min(1, d.week / 16); // environ 16 séries par semaine = plein
    return 'rgba(124,92,245,' + (0.35 + t * 0.6).toFixed(2) + ')';
  }
  if (!d.last) return 'transparent';
  if (d.rec >= 90) return 'rgba(63,214,155,0.7)';
  if (d.rec >= 55) return 'rgba(255,176,59,0.85)';
  return 'rgba(255,84,104,0.9)';
}

function figureSvg(side, mode, z) {
  const [sides, mids] = side === 'front' ? [FRONT, FRONT_MID] : [BACK, BACK_MID];
  const both = (d) => '<path d="' + d + '"/><path d="' + mirror(d) + '"/>';
  // 1. Le corps gris, 2. chaque muscle en relief (gris), 3. la couleur de son état, 4. les traits qui séparent les muscles.
  const grey = Object.values(sides).map(both).join('') + Object.values(mids).map((d) => '<path d="' + d + '"/>').join('');
  let col = '';
  for (const [k, d] of Object.entries(sides)) col += '<g class="mz" data-act="muscle" data-z="' + k + '" fill="' + colorOf(mode, z[k]) + '">' + both(d) + '</g>';
  for (const [k, d] of Object.entries(mids)) col += '<g class="mz" data-act="muscle" data-z="' + k + '" fill="' + colorOf(mode, z[k]) + '"><path d="' + d + '"/></g>';
  const lines = side === 'front'
    ? '<path d="M50,57.6 L50,88 M45,66 L55,66 M45,75.4 L55,75.4 M50,36 L50,54" />'
    : '<path d="M50,44 L50,88 M44,90.6 L56,90.6" />';
  return '<svg class="bodysvg" viewBox="16 0 68 192">'
    + '<g class="bsil" fill="url(#fgFar)">' + both(SIL) + '<ellipse cx="50" cy="14.6" rx="7.6" ry="10"/></g>'
    + '<ellipse cx="50" cy="14.6" rx="7.4" ry="9.8" fill="url(#fgHead)"/>'
    + '<g fill="url(#fgBody)" stroke="rgba(18,18,26,0.55)" stroke-width="0.55" stroke-linejoin="round">' + grey + '</g>'
    + col
    + '<g fill="url(#fgShade)" pointer-events="none">' + grey + '</g>'
    + '<g fill="none" stroke="rgba(18,18,26,0.5)" stroke-width="0.6" stroke-linecap="round" pointer-events="none">' + lines + '</g></svg>';
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
  else txt = low.length ? 'Moins travaillé que d’habitude cette semaine : ' + low.slice(0, 3).join(', ') + '.' : 'Séries de la semaine par muscle. Plus c’est violet, plus tu as travaillé. Gris = pas travaillé.';
  const legend = mode === 'rec'
    ? '<span class="lg"><i style="background:rgba(63,214,155,0.8)"></i>Prêt</span><span class="lg"><i style="background:rgba(255,176,59,0.9)"></i>En cours</span><span class="lg"><i style="background:rgba(255,84,104,0.9)"></i>Fatigué</span>'
    : '<span class="lg"><i style="background:rgba(124,92,245,0.4)"></i>Un peu</span><span class="lg"><i style="background:rgba(124,92,245,1)"></i>Beaucoup</span>';
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
