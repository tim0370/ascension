// Défis en plus : le défi du mois (un gros total à atteindre en un mois), les paliers (médailles sobres
// gagnées une fois pour toujours sur tes grands records) et les duels par code (lancer un défi à quelqu'un
// qui a l'app sur son téléphone, sans compte ni internet : le code se partage par message).
import { state, save, sorted, exoName, fr, dur } from './store.js';
import { EXOS } from './data.js';
import { $, esc, plural, ACTIONS, ICON, sheet, closeSheet, toast, burst } from './ui.js';

const DAY = 864e5;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const sp = (n) => Math.round(n).toLocaleString('fr-FR');
const g = (n) => (EXOS[n] && EXOS[n].g) || '';
const ok = (s) => s.done !== false;
const deb = () => state.settings.level === 'debutant';

// ---------- Défi du mois ----------
const CH = [
  { id: 'pompes', goal: 1000, unit: 'pompes', of: (n, s) => (g(n) === 'pompes' ? s.r || 0 : 0), tip: 'Environ 35 par jour : les pompes du jour comptent.' },
  { id: 'dips', goal: 600, unit: 'dips', of: (n, s) => (g(n) === 'dips' ? s.r || 0 : 0), tip: 'Environ 20 par jour, ou 3 séances de dips par semaine.' },
  { id: 'jambes', goal: 1000, unit: 'répétitions de jambes', of: (n, s) => (g(n) === 'jambes' ? s.r || 0 : 0), tip: 'Squats, fentes, pistols : tout ce qui travaille les jambes compte.' },
  { id: 'km', goal: 40, unit: 'km de course', of: (n, s) => (n === 'Running' ? s.d || 0 : 0), tip: '10 km par semaine : ta course du dimanche, un peu plus longue.' },
  { id: 'gainage', goal: 1800, unit: 'secondes de gainage', of: (n, s) => (g(n) === 'gainage' ? s.t || 0 : 0), time: true, tip: 'Une minute par jour suffit presque : planches, hollow, gainage latéral.' },
  { id: 'burpees', goal: 400, unit: 'burpees', of: (n, s) => (n === 'Burpee' ? s.r || 0 : 0), tip: 'Environ 15 par jour, en fin de séance ou au réveil.' },
];
const mKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

export function monthCh() {
  const d = new Date(), c = CH[(d.getFullYear() * 12 + d.getMonth()) % CH.length];
  const goal = deb() ? Math.round(c.goal * 0.4) : c.goal;
  const m0 = new Date(d.getFullYear(), d.getMonth(), 1).getTime(), end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  let n = 0;
  for (const w of state.workouts) if (w.start >= m0) for (const e of w.exercises) for (const s of e.sets) if (ok(s)) n += c.of(e.name, s);
  const daysLeft = Math.max(1, Math.ceil((end - Date.now()) / DAY));
  const name = c.time ? Math.round(goal / 60) + ' minutes de gainage' : c.id === 'km' ? goal + ' km de course' : sp(goal) + ' ' + c.unit;
  return Object.assign({}, c, { key: mKey(d), month: MOIS[d.getMonth()], goal, n, daysLeft, name, done: !!(state.mch || {})[mKey(d)], perDay: Math.max(0, Math.ceil((goal - n) / daysLeft)) });
}
const show = (c, v) => (c.time ? dur(Math.round(v)) : c.id === 'km' ? fr(v, 1) + ' km' : sp(v));

export function monthChCard() {
  const c = monthCh(), pct = Math.min(100, Math.round((c.n / c.goal) * 100));
  return '<section class="glass card col tap tint t-gold" role="button" tabindex="0" data-act="mch" style="gap:10px"><div class="row between"><div class="col" style="gap:2px"><span class="label violet">Défi de ' + c.month + '</span><span class="h2">' + esc(c.name) + '</span></div>'
    + (c.done ? '<span class="pill sm reward-btn" style="pointer-events:none">Réussi</span>' : '<span class="num" style="font-size:22px">' + pct + ' %</span>') + '</div>'
    + '<div class="bar"><div style="width:' + pct + '%"></div></div>'
    + '<span class="small mut">' + (c.done ? 'Réussi : +200 XP. Le défi change le 1er du mois.' : show(c, c.n) + ' sur ' + show(c, c.goal) + ' · environ ' + show(c, c.perDay) + ' par jour pendant ' + plural(c.daysLeft, 'jour', 'jours')) + '</span></section>';
}

function sheetMch() {
  const c = monthCh();
  const done = Object.keys(state.mch || {}).sort().reverse();
  let h = '<div class="col" style="gap:4px"><span class="label violet">Encore ' + plural(c.daysLeft, 'jour', 'jours') + '</span><h1 class="h1">' + esc(c.name) + '</h1><span class="small mut">Un gros total à atteindre avant la fin de ' + c.month + '. Tout compte : séances, pompes du jour, ombre, figures. +200 XP s’il est réussi.' + (deb() ? ' Le total est adapté au programme débutant.' : '') + '</span></div>';
  h += '<section class="glass card col center" style="gap:6px;padding:20px 16px"><span class="num" style="font-size:56px;line-height:1">' + show(c, c.n) + '</span><span class="small mut">sur ' + show(c, c.goal) + '</span><div class="bar" style="width:100%"><div style="width:' + Math.min(100, Math.round((c.n / c.goal) * 100)) + '%"></div></div></section>';
  h += '<section class="glass card col" style="gap:6px"><span style="font-weight:600">' + (c.done ? 'Défi réussi' : 'Pour y arriver') + '</span><span class="small mut">' + (c.done ? 'Bravo. Le prochain défi arrive le 1er du mois.' : 'Il te reste ' + show(c, c.goal - c.n) + ', soit environ ' + show(c, c.perDay) + ' par jour. ' + c.tip) + '</span></section>';
  if (done.length) h += '<span class="label">Défis réussis</span><section class="glass card" style="padding:2px 16px">' + done.map((k) => { const [y, m] = k.split('-').map(Number); return '<div class="feat done"><span class="medal">' + ICON.medal + '</span><span class="grow" style="font-weight:600">' + MOIS[m - 1] + ' ' + y + '</span></div>'; }).join('') + '</section>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>');
}

// ---------- Paliers : médailles sobres sur les grands records ----------
const PAL = [
  { name: 'Push Up', unit: 'pompes d’affilée', steps: [10, 20, 30, 40, 50, 60, 75, 100] },
  { name: 'Triceps Dip', unit: 'dips d’affilée', steps: [10, 15, 20, 25, 30, 40, 50] },
  { name: 'Pistol Squat', unit: 'pistols d’affilée', steps: [1, 3, 5, 10, 15, 20] },
  { name: 'Squat (Bodyweight)', unit: 'squats d’affilée', steps: [25, 50, 75, 100] },
  { name: 'Plank', unit: 'de gainage', steps: [60, 120, 180, 300], time: true },
  { name: 'Running', unit: 'courus d’une traite', steps: [5, 10, 15, 21.1], km: true },
];
export function paliers() {
  const W = sorted().slice().reverse();
  return PAL.map((p) => {
    const got = {};
    for (const w of W) for (const e of w.exercises) {
      if (e.name !== p.name) continue;
      for (const s of e.sets) {
        if (!ok(s)) continue;
        const v = p.km ? s.d || 0 : p.time ? (s.w ? 0 : s.t || 0) : (s.w ? 0 : s.r || 0);
        for (const st of p.steps) if (v >= st && !got[st]) got[st] = w.start;
      }
    }
    return Object.assign({}, p, { got });
  });
}
const palLab = (p, v) => (p.km ? fr(v, 1).replace(',0', '') + ' km' : p.time ? dur(v) : String(v));
function coin(p, v, at) {
  return '<div class="coin' + (at ? ' on' : '') + '" title="' + (at ? 'Gagné le ' + new Date(at).toLocaleDateString('fr-FR') : 'Pas encore') + '"><span>' + palLab(p, v) + '</span></div>';
}
export function paliersCard() {
  const P = paliers(), all = P.reduce((k, p) => k + p.steps.length, 0), got = P.reduce((k, p) => k + Object.keys(p.got).length, 0);
  let next = null;
  for (const p of P) { const st = p.steps.find((v) => !p.got[v]); if (st != null && (!next || p.steps.indexOf(st) < next.i)) next = { p, st, i: p.steps.indexOf(st) }; }
  return '<section class="glass card row tap tint t-gold" role="button" tabindex="0" data-act="paliers" style="gap:14px;align-items:center"><div class="coin on big"><span>' + got + '</span></div><div class="col grow" style="gap:2px"><span style="font-weight:700">Paliers : ' + got + ' sur ' + all + '</span><span class="small mut">' + (next ? 'Prochain : ' + palLab(next.p, next.st) + ' ' + esc(next.p.unit) + '.' : 'Tous gagnés.') + '</span></div>' + ICON.chev + '</section>';
}
function sheetPaliers() {
  const P = paliers();
  let h = '<div class="col" style="gap:4px"><span class="label violet">Pour toujours</span><h1 class="h1">Paliers</h1><span class="small mut">Une médaille la première fois que tu passes un cap, sans lest. Elle ne se perd jamais.</span></div>';
  for (const p of P) {
    const n = Object.keys(p.got).length;
    h += '<section class="glass card col" style="gap:10px"><div class="row between"><span style="font-weight:700">' + esc(exoName(p.name)) + '</span><span class="small mut">' + n + ' sur ' + p.steps.length + '</span></div><span class="small mut">' + esc(p.unit) + '</span><div class="coins">' + p.steps.map((v) => coin(p, v, p.got[v])).join('') + '</div>'
      + (n ? '<span class="small dim">Dernier : ' + palLab(p, p.steps.filter((v) => p.got[v]).pop()) + ', le ' + new Date(Math.max(...Object.values(p.got))).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '</span>' : '') + '</section>';
  }
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>', 1, 'full');
}

// ---------- Duels par code ----------
// Code = lettres de l'exercice + nombre à battre + prénom, par exemple PO35-LEA. Rien ne passe par internet.
const DUEL = { PO: ['Push Up', 'pompes d’affilée'], DI: ['Triceps Dip', 'dips d’affilée'], SQ: ['Squat (Bodyweight)', 'squats d’affilée'], BU: ['Burpee', 'burpees d’affilée'], PL: ['Plank', 'secondes de gainage', true], PI: ['Pistol Squat', 'pistols d’affilée'] };
const bestOf = (name, time, after) => { let m = 0; for (const w of state.workouts) if (w.start > (after || 0)) for (const e of w.exercises) if (e.name === name) for (const s of e.sets) if (ok(s) && !s.w) m = Math.max(m, time ? s.t || 0 : s.r || 0); return m; };
const prenom = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10);

export function parseCode(txt) {
  const m = String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[\s.]/g, '').match(/^([A-Z]{2})(\d{1,4})-?([A-Z]{0,10})$/);
  if (!m || !DUEL[m[1]]) return null;
  return { k: m[1], target: Number(m[2]), from: m[3] || '' };
}
function duelState(d) {
  const [name, , time] = DUEL[d.k];
  const best = bestOf(name, time, d.at);
  return { best, won: best > d.target };
}
export function checkDuels() {
  let changed = false;
  for (const d of state.duels || []) if (!d.won && duelState(d).won) { d.won = Date.now(); changed = true; burst(); toast('Duel gagné contre ' + (d.from ? d.from.charAt(0) + d.from.slice(1).toLowerCase() : 'ton adversaire') + ' · +100 XP', true); }
  if (changed) save();
}
export function checkMonth() {
  const c = monthCh();
  if (!c.done && c.n >= c.goal) { state.mch = state.mch || {}; state.mch[c.key] = Date.now(); save(); burst(); toast('Défi du mois réussi · +200 XP', true); }
}
const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');
export function duelCard() {
  const open = (state.duels || []).filter((d) => !d.won);
  return '<section class="glass card col tap tint t-red" role="button" tabindex="0" data-act="duels" style="gap:6px"><div class="row between"><span style="font-weight:700">Duels</span>' + ICON.chev + '</div><span class="small mut">'
    + (open.length ? open.map((d) => 'Battre ' + d.target + ' ' + DUEL[d.k][1] + (d.from ? ' de ' + esc(cap(d.from)) : '')).join(' · ') : 'Lance un défi à un ami ou à ta sœur avec un code, ou entre le code qu’on t’a envoyé. +100 XP par duel gagné.') + '</span></section>';
}
function sheetDuels() {
  const L = (state.duels || []).slice().reverse();
  let h = '<div class="col" style="gap:4px"><span class="label violet">Sans compte ni internet</span><h1 class="h1">Duels</h1><span class="small mut">Choisis un exercice : l’app fabrique un code avec ton record. Envoie-le par message ; l’autre l’entre dans son app et doit faire mieux.</span></div>';
  h += '<span class="label">Lancer un défi</span><label class="field"><input id="duel-name" class="grow" placeholder="Ton prénom (facultatif)" value="' + esc(state.settings.duelName || '') + '" maxlength="12" aria-label="Ton prénom"></label><div class="list">'
    + Object.entries(DUEL).map(([k, [name, unit, time]]) => { const b = bestOf(name, time); return '<button type="button" class="item" data-act="duel-make" data-k="' + k + '"' + (b ? '' : ' disabled') + '><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(name)) + '</span><span class="small mut">' + (b ? 'Ton record : ' + b + ' ' + unit : 'Pas encore de record sans lest') + '</span></div>' + ICON.chev + '</button>'; }).join('') + '</div>';
  h += '<span class="label">J’ai reçu un code</span><div class="row"><label class="field grow"><input id="duel-code" placeholder="Par exemple PO35-LEA" autocapitalize="characters" aria-label="Code du duel"></label><button type="button" class="pill gold-btn" data-act="duel-add">Accepter</button></div>';
  if (L.length) h += '<span class="label">Tes duels</span><section class="glass card" style="padding:2px 16px">' + L.map((d) => { const st = duelState(d); return '<div class="feat' + (d.won ? ' done' : '') + '"><span class="medal">' + (d.won ? ICON.medal : ICON.swords) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + d.target + ' ' + DUEL[d.k][1] + (d.from ? ' · ' + esc(cap(d.from)) : '') + '</span><span class="small mut">' + (d.won ? 'Gagné le ' + new Date(d.won).toLocaleDateString('fr-FR') : 'Ton mieux depuis : ' + (st.best || 0) + ' · il faut ' + (d.target + 1)) + '</span></div>' + (d.won ? '' : '<button type="button" class="small mut" data-act="duel-del" data-at="' + d.at + '">Retirer</button>') + '</div>'; }).join('') + '</section>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>', 1, 'full');
}

// ---------- Image de la saison (à partager) ----------
export async function shareImage(title, big, cells, file) {
  const W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0E0E12'; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(880, 160, 0, 880, 160, 760); glow.addColorStop(0, 'rgba(124,92,245,0.45)'); glow.addColorStop(1, 'rgba(124,92,245,0)');
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  const gold = x.createLinearGradient(0, 320, 0, 520); gold.addColorStop(0, '#F3DFA8'); gold.addColorStop(1, '#B8913F');
  const t = (s, X, Y, font, color) => { x.font = font; x.fillStyle = color; x.textAlign = 'left'; x.fillText(s, X, Y); };
  t('ASCENSION', 80, 130, '600 34px "Barlow Condensed", sans-serif', '#B9A8FF');
  t(title, 80, 250, '700 76px "Barlow Condensed", sans-serif', '#F4F2F8');
  t(big, 80, 430, '700 140px "Barlow Condensed", sans-serif', gold);
  cells.forEach((cl, i) => {
    const X = 80 + (i % 2) * 470, Y = 620 + Math.floor(i / 2) * 210;
    x.fillStyle = 'rgba(255,255,255,0.06)'; x.beginPath(); if (x.roundRect) x.roundRect(X, Y - 110, 440, 180, 32); else x.rect(X, Y - 110, 440, 180); x.fill();
    t(cl[0], X + 36, Y, '700 72px "Barlow Condensed", sans-serif', '#F4F2F8');
    t(cl[1], X + 36, Y + 46, '500 32px Barlow, sans-serif', '#A29DB0');
  });
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const f = new File([blob], file, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Image enregistrée');
}

Object.assign(ACTIONS, {
  mch: () => sheetMch(),
  paliers: () => sheetPaliers(),
  duels: () => sheetDuels(),
  'duel-make': async (el) => {
    const k = el.dataset.k, [name, unit, time] = DUEL[k], b = bestOf(name, time);
    const nm = prenom($('duel-name') && $('duel-name').value);
    state.settings.duelName = ($('duel-name') && $('duel-name').value.trim()) || ''; save();
    const code = k + b + (nm ? '-' + nm : '');
    const text = 'Défi Ascension : bats mes ' + b + ' ' + unit + '. Dans l’app : Défis, Duels, « J’ai reçu un code », puis entre ' + code;
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Code ' + code + ' copié'); } catch (e) { toast('Ton code : ' + code); }
  },
  'duel-add': () => {
    const d = parseCode($('duel-code') && $('duel-code').value);
    if (!d) { toast('Code non reconnu. Il ressemble à PO35-LEA'); return; }
    state.duels = state.duels || [];
    if (state.duels.some((x) => !x.won && x.k === d.k && x.target === d.target && x.from === d.from)) { toast('Ce duel est déjà dans ta liste'); return; }
    d.at = Date.now(); state.duels.push(d); save();
    toast('Duel accepté : fais plus de ' + d.target + ' ' + DUEL[d.k][1]);
    sheetDuels();
  },
  'duel-del': (el) => { state.duels = (state.duels || []).filter((d) => String(d.at) !== el.dataset.at); save(); sheetDuels(); },
});
