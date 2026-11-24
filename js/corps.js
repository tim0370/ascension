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

// ---------- Le dessin : un corps de face et de dos, muscles séparés par de fins espaces ----------
// Chaque forme est donnée pour le côté gauche de l'image ; on la recopie en miroir pour l'autre côté.
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => (100 - +x) + ',' + y);
const FRONT = {
  epaules: 'M29,35 Q34,31 40,34 L38,45 Q33,49 28,50 Q25,42 29,35 Z',
  pecs: 'M49,36 L42,35 Q39,38 39,46 Q41,53 49,53 Z',
  biceps: 'M27,52 Q32,50 36,52 Q36,62 33,71 L28,71 Q25,62 27,52 Z',
  avantbras: 'M27.5,73.5 L33,73.5 Q33,86 30.5,97 L26.5,97 Q24.5,85 27.5,73.5 Z',
  obliques: 'M38.5,56 L43,56 L43.5,86 L40,87 Q37,72 38.5,56 Z',
  quadri: 'M38.5,100 Q43,98 49,101 L48,138 Q43,141 39,138 Q35,119 38.5,100 Z',
  mollets: 'M39,146 Q42,143 46,146 Q47,160 45,177 L41,177 Q37,161 39,146 Z',
};
const FRONT_MID = {
  abdos: 'M44.5,55.5 L55.5,55.5 L55,85 Q50,91 45,85 Z',
};
const BACK = {
  epaules: 'M29,35 Q34,31 40,34 L39,43 Q33,48 28,50 Q25,42 29,35 Z',
  triceps: 'M27,52 Q32,50 36,52 Q36,62 33,71 L28,71 Q25,62 27,52 Z',
  avantbras: 'M27.5,73.5 L33,73.5 Q33,86 30.5,97 L26.5,97 Q24.5,85 27.5,73.5 Z',
  dos: 'M40.5,45 L49,47 L49,72 Q43,74 41,70 Q37,58 40.5,45 Z',
  fessiers: 'M39,91 Q44,89 49,91 L49,106 Q43,111 39,106 Q37,98 39,91 Z',
  ischios: 'M39,109 Q44,113 48.5,110 L48,138 Q43,141 39,138 Q36,123 39,109 Z',
  mollets: 'M38.5,145 Q42,141 46.5,145 Q48,156 45,170 L41,170 Q36,157 38.5,145 Z',
};
const BACK_MID = {
  trapezes: 'M43,29 L57,29 L61.5,35 L50,44 L38.5,35 Z',
  lombaires: 'M43,75 L57,75 L57.5,88 L42.5,88 Z',
};
// La silhouette de fond (tête, cou, mains, bassin, genoux, pieds)
const BASE = '<ellipse cx="50" cy="15" rx="8.5" ry="10.5"/><path d="M45.5,24 L54.5,24 L55,31 L45,31 Z"/>'
  + '<ellipse cx="28.5" cy="101.5" rx="3.3" ry="4.2"/><ellipse cx="71.5" cy="101.5" rx="3.3" ry="4.2"/>'
  + '<path d="M40,89 L60,89 L62,99 L50,102 L38,99 Z"/><ellipse cx="43.5" cy="142" rx="4" ry="3"/><ellipse cx="56.5" cy="142" rx="4" ry="3"/>'
  + '<path d="M40,180 L46,180 L47,186 L38,186 Z"/><path d="M60,180 L54,180 L53,186 L62,186 Z"/>';

function colorOf(mode, d) {
  if (mode === 'vol') {
    if (!d.week) return 'rgba(255,255,255,0.07)';
    const t = Math.min(1, d.week / 16); // environ 16 séries par semaine = plein
    return 'rgba(139,108,246,' + (0.22 + t * 0.78).toFixed(2) + ')';
  }
  if (d.rec >= 90) return d.last ? 'rgba(58,214,140,0.55)' : 'rgba(255,255,255,0.07)';
  if (d.rec >= 55) return 'rgba(255,176,59,0.75)';
  return 'rgba(255,84,104,0.85)';
}

function figureSvg(side, mode, z) {
  const shapes = side === 'front' ? [FRONT, FRONT_MID] : [BACK, BACK_MID];
  let p = '';
  for (const k of Object.keys(shapes[0])) {
    const c = colorOf(mode, z[k]);
    p += '<g class="mz" data-act="muscle" data-z="' + k + '" fill="' + c + '"><path d="' + shapes[0][k] + '"/><path d="' + mirror(shapes[0][k]) + '"/></g>';
  }
  for (const k of Object.keys(shapes[1])) {
    p += '<g class="mz" data-act="muscle" data-z="' + k + '" fill="' + colorOf(mode, z[k]) + '"><path d="' + shapes[1][k] + '"/></g>';
  }
  // Lignes des abdos, pour le relief
  const lines = side === 'front' ? '<path d="M50,56 L50,88 M45,65 L55,65 M45,74.5 L55,74.5" stroke="rgba(10,8,20,0.55)" stroke-width="0.8" fill="none"/>' : '<path d="M50,47 L50,73" stroke="rgba(10,8,20,0.55)" stroke-width="0.8" fill="none"/>';
  return '<svg class="bodysvg" viewBox="18 0 64 190" aria-hidden="false"><g fill="rgba(255,255,255,0.06)">' + BASE + '</g>' + p + lines + '</svg>';
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
  let txt;
  const list = (a) => a.slice(0, 3).join(', ') + (a.length > 3 ? '…' : '');
  if (mode === 'rec') txt = tired.length || mid.length ? (tired.length ? 'Fatigués : ' + list(tired) + '. ' : '') + (mid.length ? 'Presque prêts : ' + list(mid) + '. ' : '') + 'Le reste est prêt.' : ready.length ? 'Tout ce que tu as travaillé est récupéré : tu peux y aller fort.' : 'Pas d’entraînement récent.';
  else txt = low.length ? 'Moins travaillé que d’habitude cette semaine : ' + low.slice(0, 3).join(', ') + '.' : 'Séries de la semaine par muscle. Plus c’est violet, plus tu as travaillé.';
  const legend = mode === 'rec'
    ? '<span class="lg"><i style="background:rgba(58,214,140,0.8)"></i>Prêt</span><span class="lg"><i style="background:rgba(255,176,59,0.9)"></i>En cours</span><span class="lg"><i style="background:rgba(255,84,104,0.9)"></i>Fatigué</span>'
    : '<span class="lg"><i style="background:rgba(139,108,246,0.3)"></i>Un peu</span><span class="lg"><i style="background:rgba(139,108,246,1)"></i>Beaucoup</span>';
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
