// Ta carrière (les compteurs depuis le début) et le bilan du mois, à faire défiler en plein écran.
import { EXOS } from './data.js';
import { state, save, sorted, xpOf, exoName, setText, dur, fr } from './store.js';
import { bodyLog } from './stats.js';
import { figure } from './anim.js';
import { $, esc, plural, ui, ACTIONS, ICON, sheet, closeSheet, toast, burst } from './ui.js';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const sp = (n) => Math.round(n).toLocaleString('fr-FR'); // 12 345
const famille = (name) => (EXOS[name] && EXOS[name].g) || '';

// Part du poids du corps soulevée à chaque répétition (estimation, pour parler en tonnes).
function share(name) {
  const n = name.toLowerCase();
  if (/knee|incline/.test(n) && /push/.test(n)) return 0.5;
  if (/decline/.test(n)) return 0.72;
  if (/push ?up|pike/.test(n)) return 0.65;
  if (/bench dip/.test(n)) return 0.6;
  if (/dip/.test(n)) return 0.95;
  if (/pistol/.test(n)) return 0.8;
  if (/squat|lunge|split|step/.test(n)) return 0.62;
  if (/pull|chin|row/.test(n)) return 0.9;
  if (/burpee|jump/.test(n)) return 0.6;
  return 0.3;
}
const bw = () => { const l = bodyLog(); return l.length ? l[0].kg : 70; };

// Équivalences pour rendre les tonnes parlantes
const EQUIV = [[7300000, 'tour Eiffel', 'tours Eiffel'], [150000, 'baleine bleue', 'baleines bleues'], [12000, 'bus', 'bus'], [6000, 'éléphant', 'éléphants'], [1200, 'voiture', 'voitures'], [100, 'frigo', 'frigos']];
export function equiv(kg) {
  for (const [w, one, many] of EQUIV) if (kg >= w) { const n = kg / w; return (n >= 10 ? sp(n) : fr(n, 1)) + ' ' + (n < 2 ? one : many); }
  return sp(kg) + ' kg';
}
const tonnes = (kg) => (kg >= 1000 ? fr(kg / 1000, 1) + ' t' : sp(kg) + ' kg');

// Tous les records de l'historique, recalculés dans l'ordre : une série qui fait mieux que tout ce qui précède
// (plus de répétitions ou de secondes avec un lest égal ou plus lourd). Un record par exercice et par séance.
let recCache = null;
function allRecords() {
  if (recCache && recCache.n === state.workouts.length) return recCache.list;
  const seen = {}, list = [];
  const amt = (x) => x.r || x.t || 0;
  for (const w of sorted().slice().reverse()) {
    for (const e of w.exercises) {
      if (e.name === 'Running') continue;
      const prev = seen[e.name] || [];
      let best = null;
      for (const x of e.sets) {
        if (x.done === false || !amt(x)) continue;
        if (prev.length && !prev.some((o) => (o.w || 0) >= (x.w || 0) && amt(o) >= amt(x)) && (!best || amt(x) * (70 + (x.w || 0)) > amt(best) * (70 + (best.w || 0)))) best = x;
      }
      if (best) list.push({ name: e.name, set: best, at: w.start });
      seen[e.name] = prev.concat(e.sets.filter((x) => x.done !== false && amt(x)));
    }
  }
  recCache = { n: state.workouts.length, list };
  return list;
}

// Les chiffres d'une liste de séances
function tally(ws) {
  const t = { n: 0, train: 0, boss: 0, runs: 0, min: 0, sets: 0, reps: 0, kg: 0, km: 0, prs: 0, xp: 0, pompes: 0, dips: 0, jambes: 0, days: new Set(), exo: {}, recs: [], best: null };
  const p = bw();
  for (const w of ws) {
    t.n++; t.xp += xpOf(w);
    if (w.boss) t.boss++;
    t.days.add(new Date(w.start).toDateString());
    if (w.end > w.start) t.min += Math.min(240, (w.end - w.start) / 60000);
    let isRun = true;
    for (const e of w.exercises) {
      if (e.name !== 'Running') isRun = false;
      for (const s of e.sets) {
        if (s.done === false) continue;
        if (e.name === 'Running') {
          t.km += s.d || 0;
          if (s.d >= 1 && s.t && (!t.best || s.t / s.d < t.best.pace)) t.best = { pace: s.t / s.d, d: s.d, t: s.t };
          continue;
        }
        t.sets++;
        t.exo[e.name] = (t.exo[e.name] || 0) + 1;
        const r = s.r || 0;
        t.reps += r;
        t.kg += r * (p * share(e.name) + (s.w || 0));
        const g = famille(e.name);
        if (g === 'pompes') t.pompes += r;
        else if (g === 'dips') t.dips += r;
        else if (g === 'jambes') t.jambes += r;
      }
    }
    if (isRun) t.runs++; else if (!w.boss) t.train++;
    t.prs += w.prs || 0;
  }
  const ids = new Set(ws.map((w) => w.start));
  t.recs = allRecords().filter((r) => ids.has(r.at));
  t.prs = t.recs.length;
  t.top = Object.entries(t.exo).sort((a, b) => b[1] - a[1])[0] || null;
  return t;
}

// ---------- Ta carrière ----------
export function careerTotals() { const t = tally(sorted()); return { pompes: t.pompes, dips: t.dips, km: t.km, n: t.n }; }
const CAPS = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];
const nextCap = (n) => CAPS.find((c) => c > n) || n * 2;

export function sheetCareer() {
  const ws = sorted();
  const t = tally(ws);
  const first = ws.length ? ws[ws.length - 1].start : Date.now();
  const big = (v, k, sub) => '<div class="career"><span class="num">' + v + '</span><span class="small mut">' + k + '</span>' + (sub ? '<span class="small" style="color:var(--violet-soft)">' + sub + '</span>' : '') + '</div>';
  const cap = (n, label) => { const c = nextCap(n); return '<div class="col" style="gap:6px"><div class="row between"><span class="small" style="font-weight:600">' + label + '</span><span class="small mut">' + sp(n) + ' / ' + sp(c) + '</span></div><div class="bar thin gold"><div style="width:' + Math.min(100, Math.round((n / c) * 100)) + '%"></div></div></div>'; };
  let h = '<div class="col" style="gap:4px"><span class="label violet">Depuis le ' + new Date(first).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '</span><h1 class="h1">Ta carrière</h1></div>';
  h += '<section class="glass card col center" style="gap:4px;padding:24px 16px"><span class="label" style="color:var(--gold)">Soulevé en tout</span><span class="num gold-text" style="font-size:52px;line-height:1.1">' + tonnes(t.kg) + '</span><span class="small mut">soit environ ' + equiv(t.kg) + '</span></section>';
  h += '<div class="careers">' + big(sp(t.pompes), 'pompes') + big(sp(t.dips), 'dips') + big(sp(t.reps), 'répétitions') + big(fr(t.km, 1), 'km courus') + big(sp(t.n), 'séances') + big(sp(t.min / 60), 'heures') + big(sp(t.days.size), 'jours actifs') + big(sp(t.prs), 'records') + '</div>';
  h += '<section class="glass card col" style="gap:14px"><span class="h2">Prochains caps</span>' + cap(t.pompes, 'Pompes à vie') + cap(t.dips, 'Dips à vie') + cap(Math.round(t.km), 'Kilomètres à vie') + '</section>';
  h += '<span class="small mut">Les tonnes sont une estimation : une pompe soulève environ 65 % de ton poids, un dips environ 95 %, plus le lest. Calculé avec ton poids noté (' + fr(bw(), 1) + ' kg).</span>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>', 1, 'full');
}

// ---------- Bilan du mois ----------
const monthKey = (y, m) => y + '-' + String(m + 1).padStart(2, '0');
function monthRange(y, m) { return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()]; }
function wsIn(y, m) { const [a, b] = monthRange(y, m); return sorted().filter((w) => w.start >= a && w.start < b); }

// Le mois proposé : le précédent pendant la première semaine, sinon le mois en cours.
export function defaultMonth() {
  const d = new Date();
  if (d.getDate() <= 7) { const p = new Date(d.getFullYear(), d.getMonth() - 1, 1); return [p.getFullYear(), p.getMonth()]; }
  return [d.getFullYear(), d.getMonth()];
}

export function monthBanner() {
  const d = new Date();
  if (d.getDate() > 7) return '';
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const key = monthKey(p.getFullYear(), p.getMonth());
  if (state.settings.bilanVu === key || wsIn(p.getFullYear(), p.getMonth()).length < 2) return '';
  return '<section class="glass card row tap bilanban" role="button" tabindex="0" data-act="bilan" data-y="' + p.getFullYear() + '" data-m="' + p.getMonth() + '">'
    + '<span class="qico rare">' + ICON.star + '</span><div class="col grow" style="gap:2px"><span class="label" style="color:var(--gold)">Nouveau</span><span class="h2">Ton bilan de ' + MOIS[p.getMonth()] + '</span><span class="small mut">Tes chiffres du mois, en plein écran</span></div>' + ICON.chev + '</section>';
}

let story = null;

function slides(y, m) {
  const ws = wsIn(y, m);
  const t = tally(ws);
  const pm = new Date(y, m - 1, 1);
  const prev = tally(wsIn(pm.getFullYear(), pm.getMonth()));
  const nDays = new Date(y, m + 1, 0).getDate();
  const name = MOIS[m];
  const delta = (a, b, unit) => { if (!b) return ''; const d = Math.round(((a - b) / b) * 100); return d === 0 ? 'Pareil qu’en ' + MOIS[pm.getMonth()] : (d > 0 ? '+' : '') + d + ' % par rapport à ' + MOIS[pm.getMonth()] + (unit || ''); };
  const S = [];
  S.push({ c: 'v', h: '<span class="st-k">Ascension</span><span class="st-big">' + name.charAt(0).toUpperCase() + name.slice(1) + '</span><span class="st-sub">' + (t.n ? 'Ton mois en chiffres. Touche l’écran pour avancer.' : 'Pas encore de séance ce mois-ci.') + '</span>' });
  if (!t.n) return S;
  // Calendrier du mois
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  let cal = '<div class="st-cal">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => '<b>' + x + '</b>').join('') + '<i class="sp"></i>'.repeat(first);
  for (let d = 1; d <= nDays; d++) cal += '<i class="' + (t.days.has(new Date(y, m, d).toDateString()) ? 'on' : '') + '"></i>';
  cal += '</div>';
  S.push({ c: 'v2', h: '<span class="st-k">Tu t’es entraîné</span><span class="st-big" data-count="' + t.days.size + '">' + t.days.size + '</span><span class="st-unit">jour' + (t.days.size > 1 ? 's' : '') + ' sur ' + nDays + '</span>' + cal
    + '<span class="st-sub">' + plural(t.train, 'séance', 'séances') + (t.runs ? ', ' + plural(t.runs, 'course', 'courses') : '') + (t.boss ? ', ' + plural(t.boss, 'combat de boss', 'combats de boss') : '') + ' · ' + dur(t.min * 60) + ' en tout.</span>'
    + (prev.n ? '<span class="st-tag">' + esc(delta(t.days.size, prev.days.size, ' en jours actifs')) + '</span>' : '') });
  if (t.reps) {
    S.push({ c: 'or', h: '<span class="st-k">Tu as soulevé</span><span class="st-big" data-count="' + Math.round(t.kg / 100) / 10 + '" data-dec="1">' + fr(t.kg / 1000, 1) + '</span><span class="st-unit">tonnes</span>'
      + '<span class="st-sub">Soit environ ' + esc(equiv(t.kg)) + ', en ' + sp(t.reps) + ' répétitions et ' + sp(t.sets) + ' séries.</span>'
      + (prev.kg ? '<span class="st-tag">' + esc(delta(t.kg, prev.kg)) + '</span>' : '') });
  }
  if (t.pompes || t.dips) {
    S.push({ c: 'v', h: '<span class="st-k">Pompes du mois</span><span class="st-big" data-count="' + t.pompes + '">' + sp(t.pompes) + '</span>'
      + (t.dips ? '<span class="st-k" style="margin-top:22px">Dips</span><span class="st-mid" data-count="' + t.dips + '">' + sp(t.dips) + '</span>' : '')
      + (t.jambes ? '<span class="st-k" style="margin-top:22px">Jambes</span><span class="st-mid">' + sp(t.jambes) + '</span>' : '')
      + '<span class="st-sub">' + (t.pompes >= 1000 ? 'Plus de mille pompes en un mois. Respect.' : 'Une par une, ça finit par faire beaucoup.') + '</span>' });
  }
  if (t.top) {
    S.push({ c: 'v2', h: '<span class="st-k">Ton exercice du mois</span><div class="st-fig">' + figure(t.top[0]) + '</div><span class="st-mid">' + esc(exoName(t.top[0])) + '</span><span class="st-sub">' + plural(t.top[1], 'série', 'séries') + ' ce mois-ci : c’est lui qui t’a le plus vu.</span>' });
  }
  if (t.recs.length) {
    const uniq = [];
    for (const r of t.recs.slice().reverse()) if (!uniq.some((u) => u.name === r.name)) uniq.push(r);
    S.push({ c: 'or', h: '<span class="st-k">Records battus</span><span class="st-big" data-count="' + t.recs.length + '">' + t.recs.length + '</span>'
      + '<div class="st-list">' + uniq.slice(0, 4).map((r) => '<div><span>' + esc(exoName(r.name)) + '</span><b>' + esc(setText(r.set)) + '</b></div>').join('') + '</div>' });
  }
  if (t.km) {
    const pace = t.best ? Math.floor(t.best.pace / 60) + '’' + String(Math.round(t.best.pace % 60)).padStart(2, '0') : '';
    S.push({ c: 'vert', h: '<span class="st-k">Course</span><span class="st-big" data-count="' + Math.round(t.km * 10) / 10 + '" data-dec="1">' + fr(t.km, 1) + '</span><span class="st-unit">kilomètres</span>'
      + '<span class="st-sub">' + plural(t.runs, 'sortie', 'sorties') + (pace ? '. Meilleure allure : ' + pace + ' par km sur ' + fr(t.best.d, 1) + ' km.' : '.') + '</span>' });
  }
  S.push({ c: 'v', h: '<span class="st-k">Expérience gagnée</span><span class="st-big gold-text" data-count="' + t.xp + '">+' + sp(t.xp) + '</span><span class="st-unit">XP</span>'
    + '<div class="st-grid"><div><b>' + t.days.size + '</b><span>jours actifs</span></div><div><b>' + tonnes(t.kg) + '</b><span>soulevées</span></div><div><b>' + sp(t.reps) + '</b><span>répétitions</span></div><div><b>' + t.recs.length + '</b><span>records</span></div></div>'
    + '<button type="button" class="pill reward-btn wide" data-act="bilan-share" style="margin-top:18px">Partager en image</button>', last: true });
  story = { y, m, t, prev };
  return S;
}

function drawStory() {
  const s = story;
  const cur = s.slides[s.i];
  const h = '<div class="story st-' + cur.c + (s.first ? ' first' : '') + '"><div class="st-bars">' + s.slides.map((_, k) => '<i class="' + (k < s.i ? 'done' : k === s.i ? 'now' : '') + '"></i>').join('') + '</div>'
    + '<button type="button" class="st-x" data-act="bilan-close" aria-label="Fermer">' + ICON.x + '</button>'
    + '<div class="st-zone st-prev" data-act="bilan-prev"></div><div class="st-zone st-next" data-act="bilan-next"></div>'
    + '<div class="st-body" id="st-body">' + cur.h + '</div></div>';
  const box = $('sheet');
  box.innerHTML = h;
  document.body.classList.add('locked');
  // Les grands nombres montent depuis zéro
  box.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count), dec = Number(el.dataset.dec || 0), pre = el.textContent.startsWith('+') ? '+' : '';
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 900), v = end * (1 - Math.pow(1 - k, 3)); el.textContent = pre + (dec ? fr(v, dec) : sp(v)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  if (cur.last) burst();
}

export function openBilan(y, m) {
  story = null;
  const S = slides(y, m);
  story = Object.assign(story || { y, m }, { slides: S, i: 0, first: true });
  drawStory();
  story.first = false;
  if (new Date(y, m + 1, 1) <= new Date()) { state.settings.bilanVu = monthKey(y, m); save(); }
}

// Image du bilan, pour la partager
async function shareBilan() {
  const { y, m, t } = story;
  const W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2A1B6B'); bg.addColorStop(1, '#0D0A18');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(860, 200, 0, 860, 200, 700); glow.addColorStop(0, 'rgba(139,108,246,0.6)'); glow.addColorStop(1, 'rgba(139,108,246,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const gold = g.createLinearGradient(0, 300, 0, 520); gold.addColorStop(0, '#F4E6BC'); gold.addColorStop(1, '#B8913F');
  const text = (s, x, yy, font, color, align) => { g.font = font; g.fillStyle = color; g.textAlign = align || 'left'; g.fillText(s, x, yy); };
  text('ASCENSION', 80, 130, '600 34px "Space Grotesk", sans-serif', '#C2B3FF');
  text('Bilan de ' + MOIS[m] + ' ' + y, 80, 250, '700 76px "Space Grotesk", sans-serif', '#F4F2F8');
  text('+' + sp(t.xp) + ' XP', 80, 420, '700 130px "Space Grotesk", sans-serif', gold);
  const cells = [[String(t.days.size), 'jours actifs'], [tonnes(t.kg), 'soulevées'], [sp(t.pompes), 'pompes'], [sp(t.dips), 'dips'], [fr(t.km, 1) + ' km', 'courus'], [String(t.recs.length), 'records']];
  cells.forEach((cl, i) => {
    const x = 80 + (i % 2) * 470, yy = 600 + Math.floor(i / 2) * 210;
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.roundRect(x, yy - 110, 440, 180, 32); g.fill();
    text(cl[0], x + 36, yy, '700 72px "Space Grotesk", sans-serif', '#F4F2F8');
    text(cl[1], x + 36, yy + 46, '500 32px Inter, sans-serif', '#A29DB0');
  });
  text('Soit environ ' + equiv(t.kg), 80, 1250, '500 34px Inter, sans-serif', '#C2B3FF');
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const file = new File([blob], 'ascension-bilan-' + monthKey(y, m) + '.png', { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Image enregistrée');
}

// Liste des mois, pour revoir un ancien bilan
export function sheetBilans() {
  const ws = sorted();
  const months = [];
  for (const w of ws) { const d = new Date(w.start), k = monthKey(d.getFullYear(), d.getMonth()); if (!months.some((x) => x.k === k)) months.push({ k, y: d.getFullYear(), m: d.getMonth() }); }
  let h = '<div class="col"><span class="label violet">Tes mois</span><h1 class="h1">Bilans</h1></div><div class="list">'
    + months.slice(0, 18).map((x) => { const t = tally(wsIn(x.y, x.m)); return '<button type="button" class="item" data-act="bilan" data-y="' + x.y + '" data-m="' + x.m + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + MOIS[x.m].charAt(0).toUpperCase() + MOIS[x.m].slice(1) + ' ' + x.y + '</span><span class="small mut">' + plural(t.days.size, 'jour actif', 'jours actifs') + ' · ' + tonnes(t.kg) + '</span></div><span class="small gold-text" style="font-weight:600">+' + sp(t.xp) + ' XP</span>' + ICON.chev + '</button>'; }).join('')
    + '</div>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>');
}

Object.assign(ACTIONS, {
  career: () => sheetCareer(),
  bilans: () => sheetBilans(),
  bilan: (el) => { const [y, m] = el.dataset.y ? [Number(el.dataset.y), Number(el.dataset.m)] : defaultMonth(); openBilan(y, m); },
  'bilan-next': () => { if (!story) return; if (story.i < story.slides.length - 1) { story.i++; drawStory(); } },
  'bilan-prev': () => { if (!story) return; if (story.i > 0) { story.i--; drawStory(); } },
  'bilan-close': () => { story = null; closeSheet(); if (ui.tab === 'home') import('./app.js').then((a) => a.render()); },
  'bilan-share': () => shareBilan(),
});
