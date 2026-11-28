// Écran « Exercices » (menu) : tout le catalogue avec l'animation de chaque exercice.
// Recherche (noms affichés, noms anglais, autres noms), familles en pastilles, tes exercices en premier.
// Toucher un exercice ouvre sa fiche (sheetExo). Les animations hors de l'écran sont mises en pause.
import { EXOS, GROUPES, AKA } from './data.js';
import { figure } from './anim.js';
import { state, exoName, measureOf, routines } from './store.js';
import { esc, plural, ui, ACTIONS } from './ui.js';
import { isBeginner, STEPS, curStep } from './programme.js';

// Recherche sans accents ni majuscules : « developpe » trouve « Développé ».
const flat = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const catalog = () => Object.keys(EXOS).filter((n) => !EXOS[n].old);

// Les exercices de tes séances : étapes actuelles de Full Body A et B, plus tes routines.
function mine() {
  const s = new Set();
  if (!isBeginner() && !state.settings.noProg) for (const k of Object.keys(STEPS)) s.add(curStep(k).n);
  for (const r of routines()) for (const e of r.exercises) s.add(e.name);
  s.add('Running');
  return [...s].filter((n) => EXOS[n]);
}
// Nombre de séances où chaque exercice apparaît.
function counts() {
  const c = {};
  for (const w of state.workouts) for (const n of new Set(w.exercises.map((e) => e.name))) c[n] = (c[n] || 0) + 1;
  return c;
}

function card(n, cnt) {
  const g = GROUPES[EXOS[n].g] || '';
  const k = cnt[n] || 0;
  return '<button type="button" class="pcard" data-act="exo" data-name="' + esc(n) + '">' + figure(n) + '<span class="pname">' + esc(exoName(n)) + '</span>'
    + '<span class="small mut">' + (k ? plural(k, 'séance', 'séances') : esc(g) + (measureOf(n) === 'time' ? ' · durée' : '')) + '</span></button>';
}
const sec = (t, list, cnt) => '<span class="label" style="padding:14px 0 2px">' + esc(t) + ' <span class="mut">· ' + list.length + '</span></span><div class="pgrid">' + list.map((n) => card(n, cnt)).join('') + '</div>';

function listHtml() {
  const q = flat(ui.exQ || ''), fam = ui.exFam || '';
  const cnt = counts();
  const match = (n) => (!q || flat(exoName(n)).includes(q) || flat(n).includes(q) || (AKA[n] || []).some((a) => flat(a).includes(q))) && (!fam || fam === 'mine' || EXOS[n].g === fam);
  const byName = (a, b) => exoName(a).localeCompare(exoName(b), 'fr');
  const my = mine().filter(match).sort(byName);
  if (fam === 'mine') return my.length ? sec('Dans tes séances', my, cnt) : '<span class="mut" style="padding:20px 0">Aucun exercice ne correspond.</span>';
  let h = '';
  if (!fam && !q && my.length) h += sec('Dans tes séances', my, cnt);
  for (const g of Object.keys(GROUPES)) {
    if (fam && g !== fam) continue;
    const list = catalog().filter((n) => EXOS[n].g === g && match(n)).sort(byName);
    if (list.length) h += sec(GROUPES[g], list, cnt);
  }
  return h || '<span class="mut" style="padding:20px 0">Aucun exercice ne correspond.</span>';
}
function chips() {
  const fam = ui.exFam || '';
  return '<div class="fams" id="exos-fams">' + [['', 'Tout'], ['mine', 'Mes séances']].concat(Object.entries(GROUPES)).map(([k, v]) => '<button type="button" class="pill sm ' + (fam === k ? 'gold-btn' : 'glass') + '" data-act="exos-fam" data-k="' + k + '">' + esc(v) + '</button>').join('') + '</div>';
}

export function viewExos() {
  const n = catalog().length;
  setTimeout(watchFigs, 0);
  return '<div class="col" style="gap:2px"><span class="small mut">' + plural(n, 'exercice', 'exercices') + ', avec leur animation</span><h1 class="h1">Exercices</h1></div>'
    + '<input class="textin" id="exos-q" type="search" placeholder="Chercher un exercice" aria-label="Chercher un exercice" autocomplete="off" value="' + esc(ui.exQ || '') + '">'
    + chips()
    + '<div class="col" id="exos-list" style="gap:6px">' + listHtml() + '</div>';
}

// Seules les animations visibles tournent : 200 animations à la fois feraient ramer le téléphone.
let io = null;
function watchFigs() {
  const box = document.getElementById('exos-list');
  if (!box || !('IntersectionObserver' in window)) return;
  if (io) io.disconnect();
  io = new IntersectionObserver((es) => {
    for (const e of es) { const s = e.target; try { if (e.isIntersecting) s.unpauseAnimations(); else s.pauseAnimations(); } catch (err) { /* rien */ } }
  }, { rootMargin: '150px 0px' });
  box.querySelectorAll('svg.fig').forEach((s) => { try { s.pauseAnimations(); } catch (err) { /* rien */ } io.observe(s); });
}
function refresh() {
  const l = document.getElementById('exos-list'), f = document.getElementById('exos-fams');
  if (!l) return;
  l.innerHTML = listHtml();
  if (f) { const x = f.scrollLeft; f.outerHTML = chips(); const g = document.getElementById('exos-fams'); if (g) g.scrollLeft = x; }
  watchFigs();
}

document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'exos-q') return;
  ui.exQ = ev.target.value;
  refresh();
});
Object.assign(ACTIONS, {
  'exos-fam': (el) => { ui.exFam = el.dataset.k; refresh(); const l = document.getElementById('exos-q'); if (l) window.scrollTo({ top: Math.max(0, l.getBoundingClientRect().top + window.scrollY - 70), behavior: 'smooth' }); },
});
