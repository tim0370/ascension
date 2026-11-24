// Onglet Repas : prise de masse propre (+250 à 500 g par semaine), sans compléments, avec les plats de la famille.
// Objectifs du jour calculés d'après ton poids, ta taille, ton âge et ton sport, puis ajustés tout seuls
// selon la courbe de ta balance. Saisie en 2 touches, menus de la semaine, listes de courses pour la semaine et le mois.
import { PLATS, ING, RAYONS, AUTRES, SLOTS } from './plats.js';
import { state, save, fr } from './store.js';
import { bodyLog, addWeight } from './stats.js';
import { $, esc, plural, toNum, ui, ACTIONS, ICON, sheet, closeSheet, closeBtn, toast, chartSvg, copyText } from './ui.js';

const DAY = 864e5, WEEK = 7 * DAY;
const rerender = () => import('./app.js').then((a) => a.render());
const day0 = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const monday0 = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const dkey = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const byId = (id) => PLATS.find((p) => p.id === id) || Object.values(AUTRES).flat().find((p) => p.id === id) || null;
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const r50 = (n) => Math.round(n / 50) * 50;

export function nset() {
  state.settings.nutri = state.settings.nutri || {};
  const n = state.settings.nutri;
  if (!n.h) n.h = 185;
  if (!n.goal) n.goal = 72;
  if (!n.fam) n.fam = 4;
  if (!n.no) n.no = [];
  if (!n.sw) n.sw = {};
  if (!n.ck) n.ck = {};
  return n;
}
export const weightNow = () => { const L = bodyLog(); return L.length ? L[0].kg : 65; };

// ---------- Objectifs du jour ----------
// Dépense de base (formule de Mifflin-St Jeor) x 1,6 (lycéen actif, 4 séances et une course par semaine),
// + 300 kcal pour prendre du muscle sans trop de gras, + l'ajustement automatique. Protéines : 1,8 g par kg.
export function targets() {
  const n = nset();
  const W = weightNow(), H = n.h, A = state.settings.age || 17;
  const bmr = 10 * W + 6.25 * H - 5 * A + 5;
  const base = r50(bmr * 1.6);
  return { kcal: r50(base + 300 + (n.adj || 0)), p: Math.round((1.8 * W) / 5) * 5, base, W, adj: n.adj || 0 };
}

// ---------- Les menus de la semaine ----------
const pool = (t) => PLATS.filter((p) => p.t === t && !nset().no.includes(p.id) && !(p.hiver && [4, 5, 6, 7, 8, 9].includes(new Date().getMonth())));
const LEFTOVER = ['d-bolo', 'd-hachis', 'd-chili', 'd-curry', 'd-gratin', 'd-poulet', 'd-cantonais'];
export function weekMenu(mon) {
  const wi = Math.round(mon / WEEK);
  const D = pool('d').filter((p) => !p.fav);
  const fav = pool('d').find((p) => p.fav);
  const burger = D.find((p) => p.id === 'd-burger');
  const rest = D.filter((p) => p !== burger);
  const dinners = [];
  let k = (wi * 5) % Math.max(1, rest.length);
  for (let i = 0; i < 7; i++) {
    if (i === 6 && fav && wi % 2 === 0) { dinners.push(fav.id); continue; } // bavette un dimanche sur deux (après la course)
    if (i === 6 && burger) { dinners.push(burger.id); continue; }
    if (i === 4 && pool('d').some((p) => p.id === 'd-pizza')) { dinners.push('d-pizza'); continue; } // pizza le vendredi
    let p = rest[k % rest.length];
    let guard = 0;
    while ((dinners.includes(p.id) || p.id === 'd-pizza') && guard++ < rest.length) { k++; p = rest[k % rest.length]; }
    dinners.push(p.id); k++;
  }
  const sw = nset().sw[dkey(mon)] || {};
  for (const i of Object.keys(sw)) if (byId(sw[i])) dinners[+i] = sw[i];
  const B = pool('b'), L = pool('l').filter((p) => p.id !== 'l-restes'), G = pool('g');
  return dinners.map((d, i) => {
    const prev = i ? dinners[i - 1] : null;
    return {
      i, at: mon + i * DAY,
      b: (B[(i + wi * 2) % B.length] || {}).id,
      l: prev && LEFTOVER.includes(prev) && i % 2 === 1 ? 'l-restes' : (L[(i * 2 + wi) % L.length] || {}).id,
      g: (G[(i + wi) % G.length] || {}).id,
      d,
    };
  });
}
export const todayMenu = () => weekMenu(monday0(Date.now()))[(new Date().getDay() + 6) % 7];

// ---------- Ce que tu as mangé ----------
const log = (k) => { state.food = state.food || {}; return state.food[k] || null; };
export function dayTotals(k) {
  const L = log(k) || {};
  let kcal = 0, p = 0, n = 0;
  for (const [s] of SLOTS) if (L[s]) { const x = byId(L[s].id); if (x) { kcal += x.kcal * (L[s].m || 1); p += x.p * (L[s].m || 1); n++; } }
  for (const id of L.s || []) { const x = byId(id); if (x) { kcal += x.kcal; p += x.p; } }
  return { kcal: Math.round(kcal), p: Math.round(p), n, extras: (L.s || []).length };
}
function setLog(k, slot, id, m) {
  state.food = state.food || {};
  const L = state.food[k] = state.food[k] || {};
  if (id) L[slot] = { id, m: m || 1 }; else delete L[slot];
  const keys = Object.keys(state.food).sort();
  while (keys.length > 120) delete state.food[keys.shift()];
  save();
}
// Moyenne des derniers jours notés (au moins 3 repas notés), pour le coach.
export function foodTrend(days = 4) {
  const T = targets(), out = [];
  for (let i = 1; i <= days; i++) { const k = dkey(Date.now() - i * DAY); const t = dayTotals(k); if (t.n >= 3) out.push(t); }
  if (!out.length) return null;
  const kcal = out.reduce((s, t) => s + t.kcal, 0) / out.length, p = out.reduce((s, t) => s + t.p, 0) / out.length;
  return { n: out.length, kcal: Math.round(kcal), p: Math.round(p), dk: Math.round(kcal - T.kcal), dp: Math.round(p - T.p), T };
}
export function yesterday() { const t = dayTotals(dkey(Date.now() - DAY)); return t.n >= 3 ? Object.assign(t, { T: targets() }) : null; }

// ---------- La balance ----------
// Pente de tes pesées sur 5 semaines (kg par semaine), si au moins 3 pesées sur 10 jours ou plus.
export function weightTrend() {
  const L = bodyLog().filter((x) => Date.now() - x.d < 35 * DAY);
  if (L.length < 3 || L[0].d - L[L.length - 1].d < 10 * DAY) return null;
  const xs = L.map((x) => x.d / WEEK), ys = L.map((x) => x.kg), n = L.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return den ? { rate: num / den, n } : null;
}
// Toutes les 2 semaines au plus : si la balance ne bouge pas assez (ou trop vite), l'objectif de calories s'ajuste.
function autoAdjust() {
  const n = nset(), t = weightTrend();
  if (!t || Date.now() - (n.adjAt || 0) < 14 * DAY) return;
  let d = 0;
  if (t.rate < 0.15) d = 150; else if (t.rate > 0.6) d = -150;
  if (!d) return;
  const before = n.adj || 0;
  n.adj = Math.max(-300, Math.min(600, before + d));
  if (n.adj === before) return;
  n.adjAt = Date.now();
  n.adjMsg = (d > 0 ? 'Tu prends ' + fr(Math.max(0, t.rate), 2) + ' kg par semaine, c’est trop lent : objectif monté de 150 kcal.' : 'Tu prends ' + fr(t.rate, 2) + ' kg par semaine, c’est trop vite (du gras) : objectif baissé de 150 kcal.') + ' Le ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + '.';
  save();
  setTimeout(() => toast(d > 0 ? 'Objectif de calories monté de 150 kcal' : 'Objectif de calories baissé de 150 kcal'), 800);
}
const weighDue = () => { const L = bodyLog(); return !L.length || Date.now() - L[0].d > 6 * DAY; };

// ---------- L'écran ----------
function bars(t, T) {
  const one = (v, max, unit, name, col) => '<div class="col grow" style="gap:6px;min-width:0"><div class="row between" style="gap:6px"><span class="label">' + name + '</span><span class="small mut" style="white-space:nowrap">' + v + ' / ' + max + unit + '</span></div>'
    + '<div class="bar"><div style="width:' + Math.min(100, Math.round((v / max) * 100)) + '%' + (col ? ';background:' + col : '') + '"></div></div></div>';
  return '<div class="col" style="gap:12px">' + one(t.kcal, T.kcal, ' kcal', 'Calories') + one(t.p, T.p, ' g', 'Protéines', 'linear-gradient(90deg,#2FBF7F,#7BE3B5)') + '</div>';
}
const SLOT_TIME = { b: 'Prêt en 5 min', l: 'Prêt en 10 min', g: 'Dans ton sac', d: 'En famille' };
function slotRow(k, slot, label, planned) {
  const L = log(k) || {};
  const got = L[slot] && byId(L[slot].id);
  const x = got || byId(planned);
  const m = L[slot] ? L[slot].m : 1;
  return '<button type="button" class="item" data-act="eat" data-s="' + slot + '" data-k="' + k + '"><span class="qico ' + (got ? 'done' : 'todo') + '">' + (got ? ICON.check : ICON.plus) + '</span>'
    + '<div class="col grow" style="gap:2px;min-width:0"><span class="label' + (got ? '' : ' violet') + '">' + label + (got ? '' : ' · ' + SLOT_TIME[slot]) + '</span><span style="font-weight:600">' + esc(x ? x.name : 'À choisir') + '</span>'
    + '<span class="small mut">' + (x ? Math.round(x.kcal * m) + ' kcal · ' + Math.round(x.p * m) + ' g de protéines' + (got && m !== 1 ? (m > 1 ? ' · grosse part' : ' · petite part') : got ? '' : ' · prévu') : '') + '</span></div>' + ICON.chev + '</button>';
}

export function viewRepas() {
  autoAdjust();
  const T = targets(), now = Date.now(), k = dkey(now), menu = todayMenu(), t = dayTotals(k), n = nset();
  let h = '<div class="col" style="gap:4px;padding-top:6px"><span class="label violet">' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + '</span><h1 class="h1">Repas</h1></div>';
  h += '<section class="glass card col tint t-teal" style="gap:14px">' + bars(t, T)
    + '<span class="small mut">Objectif : ' + T.kcal + ' kcal et ' + T.p + ' g de protéines par jour, pour prendre 250 à 500 g par semaine' + (T.adj ? ' (ajusté de ' + (T.adj > 0 ? '+' : '') + T.adj + ' kcal d’après ta balance)' : '') + '.</span></section>';
  h += '<section class="glass card" style="padding:4px 16px"><div class="list">' + SLOTS.map(([s, l]) => slotRow(k, s, l, menu[s])).join('') + '</div></section>';
  // Le point protéines du soir
  const hour = new Date().getHours();
  const miss = T.p - t.p;
  if ((hour >= 17 || (log(k) || {}).d) && t.n >= 2 && miss > 8) {
    const S = PLATS.filter((p) => p.t === 's');
    h += '<section class="glass card col tint t-teal" style="gap:10px"><span class="label" style="color:var(--vert)">Point protéines du soir</span><span style="font-weight:700">Il te manque ' + miss + ' g aujourd’hui</span>'
      + '<span class="small mut">Un de ceux-là avant de dormir, et tes muscles ont de quoi se reconstruire cette nuit :</span><div class="chips2">'
      + S.map((s) => '<button type="button" class="pill sm glass" data-act="eat-x" data-id="' + s.id + '">' + esc(s.name) + ' · +' + s.p + ' g</button>').join('') + '</div></section>';
  } else if (t.extras) h += '<span class="small mut" style="text-align:center">' + plural(t.extras, 'en-cas noté', 'en-cas notés') + ' aujourd’hui · <button type="button" class="linkbtn" data-act="eat-xclear">effacer</button></span>';
  const tip = nutriInsight();
  if (tip) h += '<section class="glass card row tint t-violet" style="gap:12px;align-items:flex-start"><span class="ico">' + ICON.bolt + '</span><span class="small" style="color:var(--soft)">' + esc(tip) + '</span></section>';
  // Menus
  const W = weekMenu(monday0(now)), ti = (new Date().getDay() + 6) % 7;
  h += '<div class="sechead"><span class="h2 row" style="gap:10px"><i class="secdot t-orange"></i>Dîners de la semaine</span><button type="button" class="pill sm glass" data-act="courses" data-w="w">Courses</button></div>'
    + '<section class="glass card" style="padding:4px 16px"><div class="list">' + W.map((d) => { const x = byId(d.d); return '<button type="button" class="item" data-act="menu-day" data-i="' + d.i + '"><span class="num ' + (d.i === ti ? 'violet' : 'dim') + '" style="width:30px;font-size:13px">' + JOURS[d.i].slice(0, 3) + '</span><div class="col grow" style="gap:2px;min-width:0"><span style="font-weight:600' + (d.i < ti ? ';opacity:.55' : '') + '">' + esc(x.name) + '</span><span class="small mut">' + x.min + ' min · ta part : ' + x.kcal + ' kcal, ' + x.p + ' g' + (x.fav ? ' · ton préféré' : '') + '</span></div>' + ICON.chev + '</button>'; }).join('') + '</div></section>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="courses" data-w="w">Courses de la semaine</button><button type="button" class="pill glass grow" data-act="courses" data-w="m">Stock du mois</button></div>';
  // Balance
  const tr = weightTrend(), L = bodyLog();
  const wNow = weightNow();
  h += '<div class="sechead"><span class="h2 row" style="gap:10px"><i class="secdot t-pink"></i>Ta prise de masse</span></div><section class="glass card col tint t-pink" style="gap:12px">'
    + '<div class="row between" style="gap:10px;align-items:flex-end"><div class="col" style="gap:2px"><span class="num" style="font-size:34px;line-height:1">' + (L.length ? fr(wNow, 1) : '–') + '<span class="mut" style="font-size:15px"> kg</span></span><span class="small mut">Objectif : ' + n.goal + ' kg</span></div>'
    + '<button type="button" class="pill sm ' + (weighDue() ? 'gold-btn' : 'glass') + '" data-act="weigh">' + (weighDue() ? 'Me peser' : 'Nouvelle pesée') + '</button></div>';
  if (L.length >= 2) h += chartSvg(L.slice(0, 16).reverse().map((x) => x.kg), ' kg');
  h += '<span class="small" style="color:var(--soft)">' + esc(trendText(tr, wNow, n.goal, L.length)) + '</span>'
    + (n.adjMsg ? '<span class="small mut">Dernier ajustement : ' + esc(n.adjMsg) + '</span>' : '')
    + '<span class="small dim">Pèse-toi une fois par semaine, le matin, après les toilettes et avant de manger : c’est la seule façon d’avoir des chiffres comparables.</span></section>';
  // Recettes et réglages
  h += '<div class="sechead"><span class="h2 row" style="gap:10px"><i class="secdot t-gold"></i>Recettes et règles</span></div>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="recettes">Toutes les recettes</button><button type="button" class="pill glass grow" data-act="regles">Les règles</button></div>'
    + '<button type="button" class="pill sm glass wide" data-act="nutri-set">Taille, poids visé, plats retirés</button>';
  return h;
}

function trendText(tr, w, goal, n) {
  if (n < 3 || !tr) return n ? 'Encore ' + plural(Math.max(1, 3 - n), 'pesée', 'pesées') + ' sur au moins 10 jours, et je te dis si tu prends au bon rythme. Les calories s’ajustent ensuite toutes seules.' : 'Pèse-toi pour commencer : c’est ta courbe qui règle tes calories.';
  const r = tr.rate;
  const left = goal - w;
  const when = left > 0 ? ' À ce rythme, ' + goal + ' kg ' + (r > 0.05 ? 'vers le ' + new Date(Date.now() + (left / Math.max(0.1, r)) * WEEK).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'n’arrive pas : il faut manger plus') + '.' : ' Objectif atteint : tu peux viser plus haut ou te stabiliser.';
  if (r < 0.15) return 'Tu prends ' + fr(Math.max(0, r), 2) + ' kg par semaine : trop lent. Ajoute un en-cas (lait, fromage blanc) ou une plus grosse part au dîner.' + when;
  if (r > 0.6) return 'Tu prends ' + fr(r, 2) + ' kg par semaine : un peu trop vite, une partie est du gras. Garde les mêmes plats, en parts un peu plus petites.' + when;
  return 'Tu prends ' + fr(r, 2) + ' kg par semaine : pile dans le bon couloir (0,25 à 0,5 kg). Du muscle, pas du gras.' + when;
}

// ---------- Conseil du jour (aussi utilisé par le coach) ----------
export function nutriInsight() {
  const f = foodTrend(4), T = targets();
  const tr = weightTrend();
  if (!f) {
    const any = Object.keys(state.food || {}).length;
    return any ? 'Note au moins 3 repas par jour pendant quelques jours : je pourrai te dire ce qui manque.' : 'Touche chaque repas quand tu l’as mangé : 2 touches, et je vérifie tes calories et tes protéines.';
  }
  if (f.dp < -20) return 'Ces ' + f.n + ' derniers jours, il te manque ' + -f.dp + ' g de protéines par jour en moyenne. Le plus simple : un grand verre de lait à chaque repas et un fromage blanc le soir.';
  if (f.dk < -400) return 'Tu manges environ ' + -f.dk + ' kcal de moins que ton objectif. Sans ces calories, ton corps ne peut pas construire de muscle : prends le goûter dans ton sac, et une plus grosse part au dîner.';
  if (tr && tr.rate > 0.6 && f.dk > 300) return 'Tu dépasses ton objectif et ta balance monte vite : garde les mêmes plats, en parts un peu plus petites.';
  if (f.dk > -150 && f.dp >= -5) return 'Calories et protéines au bon niveau ces ' + f.n + ' derniers jours. C’est exactement comme ça qu’on prend du muscle.';
  return 'Tu es proche de tes objectifs (' + f.kcal + ' kcal et ' + f.p + ' g de protéines par jour en moyenne). Continue.';
}

// ---------- Fenêtres ----------
let eatCtx = null;
function sheetEat(k, slot) {
  eatCtx = { k, slot };
  const label = SLOTS.find((x) => x[0] === slot)[1];
  const day = Math.round((day0(Date.now()) - new Date(k + 'T00:00:00').getTime()) / DAY);
  const menu = weekMenu(monday0(new Date(k + 'T12:00:00').getTime()))[(new Date(k + 'T12:00:00').getDay() + 6) % 7];
  const plan = byId(menu[slot]);
  const L = log(k) || {};
  let h = '<div class="col" style="gap:4px"><span class="label violet">' + label + (day === 0 ? ' · aujourd’hui' : day === 1 ? ' · hier' : '') + '</span><h1 class="h1">Qu’as-tu mangé ?</h1></div>';
  if (plan) {
    h += '<section class="glass card col tint t-teal" style="gap:10px"><span class="label">Prévu</span><span class="h2">' + esc(plan.name) + '</span><span class="small mut">' + plan.kcal + ' kcal · ' + plan.p + ' g de protéines (ta part)</span>'
      + '<div class="modes3"><button type="button" class="pill sm glass" data-act="eat-set" data-id="' + plan.id + '" data-m="0.7">Petite part</button><button type="button" class="pill sm gold-btn" data-act="eat-set" data-id="' + plan.id + '" data-m="1">Normale</button><button type="button" class="pill sm glass" data-act="eat-set" data-id="' + plan.id + '" data-m="1.3">Grosse part</button></div>'
      + (plan.steps ? '<button type="button" class="linkbtn" data-act="plat" data-id="' + plan.id + '">Voir la recette</button>' : '') + '</section>';
  }
  const others = PLATS.filter((p) => p.t === slot && (!plan || p.id !== plan.id)).concat(AUTRES[slot] || []);
  h += '<span class="label">Autre chose</span><section class="glass card" style="padding:4px 16px"><div class="list">' + others.map((p) => '<button type="button" class="item" data-act="eat-set" data-id="' + p.id + '" data-m="1"><div class="col grow" style="gap:2px;min-width:0"><span style="font-weight:600">' + esc(p.name) + '</span><span class="small mut">' + p.kcal + ' kcal · ' + p.p + ' g' + (p.hint ? ' · ' + esc(p.hint) : '') + '</span></div>' + ICON.plus + '</button>').join('') + '</div></section>';
  if (L[slot]) h += '<button type="button" class="pill sm glass wide" data-act="eat-set" data-id="" style="color:var(--mut)">Effacer ce repas</button>';
  sheet(h + closeBtn);
}

function platHtml(x, fam) {
  const f = x.t === 'd' ? fam / 4 : 1;
  let h = '<div class="col" style="gap:4px"><span class="label violet">' + ({ b: 'Petit-déjeuner', l: 'Midi', g: 'Goûter', d: 'Dîner de famille', s: 'En-cas' })[x.t] + (x.min !== undefined ? ' · ' + x.min + ' min' : '') + '</span><h1 class="h1">' + esc(x.name) + '</h1>'
    + (x.look ? '<span class="small" style="color:var(--soft)">' + esc(x.look) + '</span>' : '') + '</div>'
    + '<div class="row" style="gap:10px"><section class="glass card col center grow" style="gap:2px;padding:12px"><span class="num" style="font-size:24px">' + x.kcal + '</span><span class="small mut">kcal (ta part)</span></section><section class="glass card col center grow" style="gap:2px;padding:12px"><span class="num" style="font-size:24px;color:var(--vert)">' + x.p + ' g</span><span class="small mut">protéines</span></section></div>';
  if (x.why) h += '<span class="small" style="color:var(--soft)">' + esc(x.why) + '</span>';
  if (x.ing && x.ing.length) {
    h += '<section class="glass card col" style="gap:8px"><span class="label">Ingrédients' + (x.t === 'd' ? ' pour ' + fam + ' personnes' : '') + '</span>' + x.ing.map(([key, q]) => { const I = ING[key]; return '<div class="row between" style="gap:10px"><span class="small">' + esc(I.n) + '</span><span class="small mut" style="white-space:nowrap">' + qtyTxt(I, q * f, true) + '</span></div>'; }).join('') + '</section>';
  }
  if (x.steps) h += '<section class="glass card col" style="gap:10px"><span class="label">Étapes</span>' + x.steps.map((s, i) => '<div class="row" style="gap:10px;align-items:flex-start"><span class="stepn">' + (i + 1) + '</span><span class="small" style="color:var(--soft)">' + esc(s) + '</span></div>').join('') + '</section>';
  if (x.hide) h += '<section class="glass card col tint t-teal" style="gap:6px"><span class="label" style="color:var(--vert)">Légumes cachés</span><span class="small" style="color:var(--soft)">' + esc(x.hide) + '</span></section>';
  if (x.family) h += '<span class="small mut">' + esc(x.family) + '</span>';
  return h;
}
function qtyTxt(I, q, recipe) {
  if (!q) return 'un peu';
  if (I.once) return recipe ? 'un peu' : '1 ' + I.pu;
  if (I.u === 'g') return q >= 1000 ? fr(q / 1000, 1) + ' kg' : Math.round(q) + ' g';
  if (I.u === 'ml') return q >= 1000 ? fr(q / 1000, 1) + ' L' : Math.round(q / 10) + ' cl';
  const n = Math.round(q * 2) / 2;
  return String(n).replace('.', ',') + ' ' + (I.u === 'pièce' ? '' : I.u + (n > 1 ? 's' : ''));
}

function sheetPlat(id, layer) {
  const x = byId(id);
  if (!x) return;
  const n = nset();
  let h = platHtml(x, n.fam);
  if (x.t !== 's') h += '<button type="button" class="pill sm glass wide" data-act="plat-no" data-id="' + x.id + '" style="color:var(--mut)">' + (n.no.includes(x.id) ? 'Remettre ce plat dans mes menus' : 'Je n’aime pas : ne plus me le proposer') + '</button>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="' + (layer === 2 ? 'close2' : 'close') + '">Fermer</button>', layer || 1, 'full');
}

function sheetDay(i) {
  const mon = monday0(Date.now());
  const d = weekMenu(mon)[i];
  const x = byId(d.d);
  let h = '<div class="col" style="gap:4px"><span class="label violet">' + JOURS[i] + '</span><h1 class="h1">' + esc(x.name) + '</h1></div>'
    + '<section class="glass card" style="padding:4px 16px"><div class="list">' + SLOTS.map(([s, l]) => { const p = byId(d[s]); return '<button type="button" class="item" data-act="plat2" data-id="' + p.id + '"><div class="col grow" style="gap:2px;min-width:0"><span class="label">' + l + '</span><span style="font-weight:600">' + esc(p.name) + '</span><span class="small mut">' + p.kcal + ' kcal · ' + p.p + ' g</span></div>' + ICON.chev + '</button>'; }).join('') + '</div></section>'
    + '<span class="small mut">' + (d.l === 'l-restes' ? 'Le midi : une part du dîner de la veille, mise de côté.' : 'Le midi : si tu manges à la cantine, note « Cantine » à la place.') + '</span>'
    + '<span class="label">Changer le dîner</span><div class="chips2">' + pool('d').filter((p) => p.id !== d.d).map((p) => '<button type="button" class="pill sm glass" data-act="menu-swap" data-i="' + i + '" data-id="' + p.id + '">' + esc(p.name) + '</button>').join('') + '</div>';
  sheet(h + closeBtn, 1, 'full');
}

// ---------- Courses ----------
// Semaine = le frais des 7 jours. Mois = le stock de 4 semaines (paquets arrondis), les épices une seule fois.
export function shopping(kind) {
  const n = nset();
  const mon = monday0(Date.now());
  const weeks = kind === 'm' ? [0, 1, 2, 3] : [0];
  const need = {};
  for (const w of weeks) for (const d of weekMenu(mon + w * WEEK)) for (const [s] of SLOTS) {
    const x = byId(d[s]);
    if (!x || !x.ing) continue;
    const f = x.t === 'd' ? n.fam / 4 : 1;
    for (const [key, q] of x.ing) need[key] = (need[key] || 0) + (q || 0) * f + (q ? 0 : 0.001);
  }
  const items = [];
  for (const key of Object.keys(need)) {
    const I = ING[key];
    if (kind === 'w' ? !I.f : I.f) continue;
    const q = need[key];
    let txt;
    if (I.once) txt = '1 ' + I.pu + ' (s’il n’y en a plus)';
    else if (I.pk) { const k = Math.max(1, Math.ceil(q / I.pk - 0.08)); txt = k + ' × ' + I.pu; }
    else txt = qtyTxt(I, I.u === 'g' ? Math.ceil(q / 50) * 50 : Math.ceil(q), false);
    items.push({ key, n: I.n, r: I.r, txt });
  }
  items.sort((a, b) => RAYONS.indexOf(a.r) - RAYONS.indexOf(b.r) || a.n.localeCompare(b.n));
  return items;
}
const listKey = (kind) => kind + dkey(kind === 'm' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() : monday0(Date.now()));
function sheetCourses(kind) {
  const items = shopping(kind), n = nset(), lk = listKey(kind);
  const ck = new Set(n.ck[lk] || []);
  let h = '<div class="col" style="gap:4px"><span class="label violet">Liste de courses</span><h1 class="h1">' + (kind === 'm' ? 'Le stock du mois' : 'Le frais de la semaine') + '</h1>'
    + '<span class="small mut">' + (kind === 'm' ? 'Ce qui se garde (épicerie, surgelés, lait), pour 4 semaines de menus.' : 'Ce qui ne se garde pas, pour les menus de cette semaine') + ' · ' + n.fam + ' personnes au dîner.</span></div>'
    + '<div class="seg2" style="align-self:flex-start"><button type="button" class="' + (kind === 'w' ? 'on' : '') + '" data-act="courses" data-w="w">Semaine</button><button type="button" class="' + (kind === 'm' ? 'on' : '') + '" data-act="courses" data-w="m">Mois</button></div>';
  let cur = '';
  h += '<section class="glass card" style="padding:4px 16px">';
  for (const it of items) {
    if (it.r !== cur) { h += '<div class="label" style="padding:12px 0 4px">' + esc(it.r) + '</div>'; cur = it.r; }
    const on = ck.has(it.key);
    h += '<button type="button" class="shop' + (on ? ' on' : '') + '" data-act="shop-ck" data-w="' + kind + '" data-k="' + it.key + '"><span class="qico ' + (on ? 'done' : '') + '">' + (on ? ICON.check : '') + '</span><span class="grow" style="text-align:left">' + esc(it.n) + '</span><span class="small mut" style="text-align:right">' + esc(it.txt) + '</span></button>';
  }
  h += '</section><button type="button" class="pill gold-btn wide big" data-act="shop-send" data-w="' + kind + '">Envoyer la liste à ma mère</button>'
    + '<span class="small dim">Coche ce qui est déjà à la maison : ce sera retiré de la liste envoyée. Petit budget : les marques du magasin sont aussi bonnes, et les steaks hachés surgelés coûtent moins cher que frais.</span>';
  sheet(h + closeBtn, 1, 'full');
}
function shopText(kind) {
  const n = nset(), ck = new Set(n.ck[listKey(kind)] || []);
  const items = shopping(kind).filter((i) => !ck.has(i.key));
  let t = (kind === 'm' ? 'Courses du mois (stock)' : 'Courses de la semaine (frais)') + '\n';
  let cur = '';
  for (const i of items) { if (i.r !== cur) { t += '\n' + i.r + '\n'; cur = i.r; } t += '- ' + i.n + ' : ' + i.txt + '\n'; }
  if (kind === 'w') {
    t += '\nMenus du soir :\n' + weekMenu(monday0(Date.now())).map((d) => JOURS[d.i] + ' : ' + byId(d.d).name).join('\n');
  }
  return t + '\nMerci !';
}

function sheetRecettes() {
  const G = [['b', 'Petits-déjeuners (5 min)'], ['l', 'Midis rapides (10 min)'], ['g', 'Goûters à emporter'], ['d', 'Dîners de famille']];
  const no = nset().no;
  let h = '<div class="col" style="gap:4px"><span class="label violet">Recettes</span><h1 class="h1">Simples, pas chères, qui calent</h1><span class="small mut">Sans poisson, légumes cachés. Les calories et protéines sont celles de ta part.</span></div>';
  for (const [t, l] of G) h += '<span class="label">' + l + '</span><section class="glass card" style="padding:4px 16px"><div class="list">' + PLATS.filter((p) => p.t === t).map((p) => '<button type="button" class="item" data-act="plat2" data-id="' + p.id + '"><div class="col grow" style="gap:2px;min-width:0"><span style="font-weight:600' + (no.includes(p.id) ? ';opacity:.45;text-decoration:line-through' : '') + '">' + esc(p.name) + '</span><span class="small mut">' + p.min + ' min · ' + p.kcal + ' kcal · ' + p.p + ' g' + (p.hide ? ' · légumes cachés' : '') + '</span></div>' + ICON.chev + '</button>').join('') + '</div></section>';
  sheet(h + closeBtn, 1, 'full');
}

const REGLES = [
  ['Trois choses dans chaque repas', 'Un féculent (pain, pâtes, riz, pommes de terre, avoine), une protéine (viande, jambon, lait, fromage) et un peu de gras (beurre, fromage, cacahuète). C’est ce mélange qui tient au ventre pendant 4 heures de cours.'],
  ['Ne saute jamais le petit-déjeuner', 'C’est le repas le plus facile à rattraper : 650 kcal en 5 minutes. Sans lui, impossible d’atteindre ton objectif.'],
  ['Le goûter part dans le sac', 'Tu finis à 18 h : prépare-le le matin et mange-le à la pause de l’après-midi. Sinon tu arrives vide à la séance et au dîner.'],
  ['Le lait, ton complément gratuit', 'Un grand verre = 10 g de protéines et 140 kcal. Un à chaque repas, et tu n’as besoin d’aucune poudre.'],
  ['Pas faim ? Bois tes calories', 'Smoothie, lait chocolaté, bol de céréales : ça passe beaucoup plus facilement qu’une assiette.'],
  ['Les protéines du soir', 'Un fromage blanc ou un verre de lait avant de dormir : tes muscles se reconstruisent la nuit.'],
  ['La balance décide', 'Si ta courbe ne monte pas en 2 semaines, l’app monte tes calories toute seule. Si elle monte trop vite, elle les baisse.'],
  ['Les légumes, en cachette', 'Râpés, mixés dans la sauce, fondus dans la purée : tu profites de leurs vitamines sans les voir. Un fruit par jour (banane, compote) compte aussi.'],
];
function sheetRegles() {
  let h = '<div class="col" style="gap:4px"><span class="label violet">Les règles</span><h1 class="h1">Prendre du muscle, pas du gras</h1></div>'
    + REGLES.map(([a, b], i) => '<section class="glass card col" style="gap:4px"><span class="row" style="gap:10px"><span class="stepn">' + (i + 1) + '</span><span style="font-weight:700">' + a + '</span></span><span class="small" style="color:var(--soft)">' + b + '</span></section>').join('')
    + '<span class="small dim">Repères généraux pour un ado sportif en bonne santé, pas un avis médical. Calories et protéines sont des estimations.</span>';
  sheet(h + closeBtn, 1, 'full');
}

function sheetWeigh() {
  const h = '<div class="col" style="gap:4px"><span class="label violet">Pesée</span><h1 class="h1">Ton poids ce matin</h1><span class="small mut">Le matin, après les toilettes, avant de manger.</span></div>'
    + '<label class="field" style="height:64px"><input id="rp-kg" inputmode="decimal" value="' + fr(weightNow(), 1) + '" aria-label="Poids"><span class="unit">kg</span></label>'
    + '<button type="button" class="pill gold-btn wide big" data-act="weigh-ok">Enregistrer</button>';
  sheet(h, 2);
}

function sheetNutriSet() {
  const n = nset(), T = targets();
  let h = '<div class="col" style="gap:4px"><span class="label violet">Réglages des repas</span><h1 class="h1">Tes repères</h1></div>'
    + '<div class="row"><label class="col grow" style="gap:6px"><span class="label">Taille</span><span class="field"><input id="ns-h" inputmode="numeric" value="' + n.h + '"><span class="unit">cm</span></span></label>'
    + '<label class="col grow" style="gap:6px"><span class="label">Poids visé</span><span class="field"><input id="ns-g" inputmode="decimal" value="' + n.goal + '"><span class="unit">kg</span></span></label>'
    + '<label class="col grow" style="gap:6px"><span class="label">Au dîner</span><span class="field"><input id="ns-f" inputmode="numeric" value="' + n.fam + '"><span class="unit">pers.</span></span></label></div>'
    + '<button type="button" class="pill gold-btn wide" data-act="nutri-save">Enregistrer</button>'
    + '<section class="glass card col" style="gap:6px"><span class="label">Comment c’est calculé</span><span class="small" style="color:var(--soft)">Dépense d’une journée : environ ' + T.base + ' kcal (ton poids, ta taille, ' + (state.settings.age ? 'tes ' + state.settings.age + ' ans' : 'un âge de 17 ans, à régler dans les Réglages') + ', 4 séances et une course par semaine). Pour prendre du muscle : +300 kcal' + (T.adj ? ', puis ' + (T.adj > 0 ? '+' : '') + T.adj + ' kcal d’après ta balance' : '') + '. Protéines : 1,8 g par kilo de ton poids.</span></section>';
  if (n.no.length) h += '<span class="label">Plats retirés de tes menus</span><div class="chips2">' + n.no.map((id) => '<button type="button" class="pill sm glass" data-act="plat-no" data-id="' + id + '" data-from="set">' + esc(byId(id).name) + ' · remettre</button>').join('') + '</div>';
  if (n.adj) h += '<button type="button" class="pill sm glass wide" data-act="nutri-reset" style="color:var(--mut)">Annuler l’ajustement automatique (' + (n.adj > 0 ? '+' : '') + n.adj + ' kcal)</button>';
  sheet(h + closeBtn);
}

Object.assign(ACTIONS, {
  eat: (el) => sheetEat(el.dataset.k, el.dataset.s),
  'eat-set': (el) => {
    if (!eatCtx) return;
    setLog(eatCtx.k, eatCtx.slot, el.dataset.id, +el.dataset.m || 1);
    closeSheet(); rerender();
    if (el.dataset.id) { const x = byId(el.dataset.id); const t = dayTotals(eatCtx.k); toast(x.name.split(' (')[0] + ' noté · ' + t.p + ' g de protéines aujourd’hui'); }
  },
  'eat-x': (el) => {
    const k = dkey(Date.now());
    state.food = state.food || {};
    const L = state.food[k] = state.food[k] || {};
    L.s = (L.s || []).concat(el.dataset.id);
    save(); rerender();
    toast('+' + byId(el.dataset.id).p + ' g de protéines');
  },
  'eat-xclear': () => { const L = log(dkey(Date.now())); if (L) { L.s = []; save(); rerender(); } },
  'menu-day': (el) => sheetDay(+el.dataset.i),
  'menu-swap': (el) => {
    const n = nset(), wk = dkey(monday0(Date.now()));
    n.sw[wk] = n.sw[wk] || {};
    n.sw[wk][el.dataset.i] = el.dataset.id;
    for (const k of Object.keys(n.sw)) if (Date.now() - new Date(k + 'T00:00:00').getTime() > 21 * DAY) delete n.sw[k];
    save(); rerender(); sheetDay(+el.dataset.i); toast('Dîner changé');
  },
  plat: (el) => sheetPlat(el.dataset.id, 2),
  plat2: (el) => sheetPlat(el.dataset.id, 2),
  'plat-no': (el) => {
    const n = nset(), id = el.dataset.id;
    n.no = n.no.includes(id) ? n.no.filter((x) => x !== id) : n.no.concat(id);
    save(); rerender();
    if (el.dataset.from === 'set') sheetNutriSet(); else { closeSheet(); toast(n.no.includes(id) ? 'Retiré de tes menus' : 'Remis dans tes menus'); }
  },
  courses: (el) => sheetCourses(el.dataset.w || 'w'),
  'shop-ck': (el) => {
    const n = nset(), lk = listKey(el.dataset.w);
    const s = new Set(n.ck[lk] || []);
    if (s.has(el.dataset.k)) s.delete(el.dataset.k); else s.add(el.dataset.k);
    n.ck[lk] = [...s];
    for (const k of Object.keys(n.ck)) if (Date.now() - new Date(k.slice(1) + 'T00:00:00').getTime() > 40 * DAY) delete n.ck[k];
    save(); sheetCourses(el.dataset.w);
  },
  'shop-send': async (el) => {
    const text = shopText(el.dataset.w);
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    await copyText(text);
    toast('Liste copiée : colle-la dans un message');
  },
  recettes: () => sheetRecettes(),
  regles: () => sheetRegles(),
  weigh: () => sheetWeigh(),
  'weigh-ok': () => {
    const kg = toNum($('rp-kg').value);
    if (kg < 30 || kg > 200) { toast('Indique ton poids en kilos'); return; }
    addWeight(Math.round(kg * 10) / 10); closeSheet(); rerender(); toast('Pesée enregistrée');
  },
  'nutri-set': () => sheetNutriSet(),
  'nutri-save': () => {
    const n = nset();
    const h = Math.round(toNum($('ns-h').value)), g = toNum($('ns-g').value), f = Math.round(toNum($('ns-f').value));
    if (h < 120 || h > 230 || g < 35 || g > 150 || f < 1 || f > 12) { toast('Vérifie la taille, le poids et le nombre de personnes'); return; }
    n.h = h; n.goal = Math.round(g * 10) / 10; n.fam = f; save(); rerender(); sheetNutriSet(); toast('Enregistré');
  },
  'nutri-reset': () => { const n = nset(); n.adj = 0; n.adjMsg = ''; n.adjAt = Date.now(); save(); rerender(); sheetNutriSet(); },
});
