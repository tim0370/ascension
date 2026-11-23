// Pompes du jour : des séries notées en deux touches, n'importe quand dans la journée, hors séance.
// Elles vont dans une « séance » spéciale du jour (quick: true) : elles comptent pour les quêtes, les hauts faits
// (100 pompes dans la journée), la carte du corps et les records, mais pas pour l'objectif de la semaine.
import { state, save, sorted, isRecord } from './store.js';
import { EXOS } from './data.js';
import { $, esc, plural, ACTIONS, ICON, sheet, toast, burst, xpFly } from './ui.js';

const DAY = 864e5;
const day0 = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const isPush = (n) => EXOS[n] && EXOS[n].g === 'pompes';
export const QUICK_MIN = 30; // pompes du jour qui suffisent pour garder la flamme

export function quickToday() {
  const t0 = day0(Date.now());
  return state.workouts.find((w) => w.quick && w.start >= t0 && w.start < t0 + DAY);
}

// Toutes les pompes du jour, séances comprises
export function pushToday() {
  const t0 = day0(Date.now());
  let n = 0;
  for (const w of state.workouts) {
    if (w.start < t0) continue;
    for (const e of w.exercises) if (isPush(e.name)) for (const s of e.sets) if (s.done !== false) n += s.r || 0;
  }
  return n;
}

const targetOf = (n) => (n < 100 ? 100 : n < 200 ? 200 : Math.ceil((n + 1) / 100) * 100);

function add(n, el) {
  if (!(n > 0) || n > 300) return;
  const before = pushToday();
  let w = quickToday();
  const set = { r: n, done: true, at: Date.now() };
  if (isRecord('Push Up', set, undefined, w && w.id) && !(w && w.exercises[0].sets.some((x) => (x.r || 0) >= n))) set.pr = true;
  if (!w) {
    w = { id: 'q' + Date.now(), title: 'Pompes du jour', quick: true, start: Date.now(), end: Date.now(), exercises: [{ name: 'Push Up', sets: [] }] };
    state.workouts.push(w);
  }
  w.exercises[0].sets.push(set);
  w.end = Date.now();
  w.prs = w.exercises[0].sets.some((x) => x.pr) ? 1 : 0;
  save();
  const after = pushToday();
  if (el) xpFly(el, set.pr ? '+35 XP' : '+10 XP');
  if (set.pr) { burst(); toast('Record : ' + n + ' pompes d’affilée', true); }
  else if (before < 100 && after >= 100) { burst(); toast('100 pompes aujourd’hui', true); }
  else toast('+' + n + ' pompes · ' + after + ' aujourd’hui');
  refresh();
}

function refresh() {
  const c = $('quickcard');
  if (c) c.outerHTML = quickCard();
  if ($('quicksheet')) sheetQuick();
}

export function quickCard() {
  const n = pushToday(), goal = targetOf(n);
  const pct = Math.min(100, Math.round((n / goal) * 100));
  return '<section class="glass card col tint t-orange" id="quickcard" style="gap:12px"><div class="row between tap" role="button" tabindex="0" data-act="quick"><div class="col" style="gap:2px"><span class="label violet">Pompes du jour</span>'
    + '<span class="h2"><span class="num">' + n + '</span><span class="mut" style="font-weight:500"> / ' + goal + '</span></span></div>'
    + '<div class="qring" style="--p:' + pct + '"><span>' + pct + '%</span></div></div>'
    + '<div class="row" style="gap:8px">' + [5, 10, 15, 20].map((k) => '<button type="button" class="pill sm glass grow" data-act="quick-add" data-n="' + k + '">+' + k + '</button>').join('')
    + '<button type="button" class="pill sm glass" data-act="quick" aria-label="Autre nombre">' + ICON.plus + '</button></div></section>';
}

function sheetQuick() {
  const w = quickToday();
  const sets = w ? w.exercises[0].sets : [];
  const n = pushToday(), goal = targetOf(n);
  let h = '<div id="quicksheet" class="col" style="gap:4px"><span class="label violet">Hors séance</span><h1 class="h1">Pompes du jour</h1>'
    + '<span class="small mut">Note une série dès que tu la fais, où que tu sois. Le bon plan pour viser 100 dans la journée : 10 séries de 10.</span></div>'
    + '<section class="glass card col center" style="gap:8px;padding:22px 16px"><span class="num" style="font-size:64px;line-height:1">' + n + '</span><span class="small mut">pompes aujourd’hui, séances comprises · but ' + goal + '</span>'
    + '<div class="bar" style="width:100%"><div style="width:' + Math.min(100, Math.round((n / goal) * 100)) + '%"></div></div></section>'
    + '<div class="row"><label class="field grow" style="height:56px"><input id="quick-n" inputmode="numeric" placeholder="Combien ?" aria-label="Nombre de pompes"><span class="unit">pompes</span></label>'
    + '<button type="button" class="pill gold-btn" data-act="quick-custom" style="height:56px">Ajouter</button></div>'
    + '<div class="row" style="gap:8px">' + [5, 10, 15, 20, 25].map((k) => '<button type="button" class="pill sm glass grow" data-act="quick-add" data-n="' + k + '">+' + k + '</button>').join('') + '</div>';
  if (sets.length) {
    h += '<span class="label">Tes séries hors séance</span><section class="glass card" style="padding:4px 16px">'
      + sets.slice().reverse().map((s) => '<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line)"><span style="font-weight:600">' + s.r + ' pompes' + (s.pr ? ' <span class="gold-text small">· record</span>' : '') + '</span><span class="small mut">' + new Date(s.at || w.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '</span></div>').join('')
      + '</section><button type="button" class="pill glass wide" data-act="quick-undo" style="color:var(--mut)">Annuler la dernière série</button>';
  }
  h += '<span class="small mut">Ces séries comptent pour les quêtes, les hauts faits (100 puis 200 pompes dans la journée), tes records et la carte du corps. Elles gardent ta flamme à partir de ' + QUICK_MIN + ' pompes, mais ne comptent pas comme une séance de la semaine.</span>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>');
}

Object.assign(ACTIONS, {
  quick: () => sheetQuick(),
  'quick-add': (el) => add(Number(el.dataset.n), el),
  'quick-custom': (el) => { const n = Math.round(Number(String($('quick-n').value).replace(',', '.'))); if (!(n > 0)) { toast('Indique un nombre de pompes'); return; } add(n, el); },
  'quick-undo': () => {
    const w = quickToday(); if (!w) return;
    const s = w.exercises[0].sets.pop();
    if (!w.exercises[0].sets.length) state.workouts = state.workouts.filter((x) => x !== w);
    else { w.prs = w.exercises[0].sets.some((x) => x.pr) ? 1 : 0; }
    save(); toast('Série de ' + s.r + ' pompes retirée'); refresh();
  },
});
