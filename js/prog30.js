// Programmes de 30 jours : un but précis, une petite séance par jour (10 à 15 minutes), en plus du programme de la semaine.
// Jour 1 = test au maximum, re-tests aux jours 10 et 20 (les séries s'ajustent), test final au jour 30.
// Un jour de repos tous les 4 jours. Un jour raté ne casse rien : le programme t'attend.
// state.p30 = { id, start, maxes: { jour: valeur }, done: { jour: date } } ; state.p30end = [{ id, start, end, v0, v1 }].
// Les séances sont enregistrées comme séances rapides (quick : pas de +50 XP, ne comptent pas dans la semaine) avec p30 : { id, day }.
import { state, save, exoName } from './store.js';
import { esc, plural, ACTIONS, ICON, sheet, closeSheet, toast, burst } from './ui.js';
import { figure } from './anim.js';

export const P30_XP = 400;
const DAY = 864e5;
const rerender = () => import('./app.js').then((a) => a.render());
const d0 = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

// t = tenue en secondes, sinon répétitions. gain = progrès visé en 30 jours (+50 % = 1,5).
export const P30 = [
  { id: 'pompes', name: 'Pompes : +50 %', exo: 'Push Up', gain: 1.5, rest: 60, sets: 5,
    why: 'Le classique pour gonfler ton maximum de pompes d’affilée. Beaucoup de séries pas trop dures, jamais jusqu’à l’échec, sauf les jours de test.', who: 'Pour monter ton endurance et ta lettre d’endurance.' },
  { id: 'dips', name: 'Dips : +50 %', exo: 'Triceps Dip', gain: 1.5, rest: 90, sets: 5,
    why: 'Même principe, aux dips sans lest : plus de répétitions propres, puis tu pourras charger plus lourd dans le programme.', who: 'Pour la force et l’endurance du haut du corps.' },
  { id: 'equilibre', name: 'Équilibre : 60 secondes', exo: 'Handstand Hold', t: true, gain: 2, cap: 60, rest: 75, sets: 5,
    why: 'Tous les jours un peu de temps à l’envers contre le mur. Les épaules se renforcent et l’équilibre devient naturel.', who: 'Pour la maîtrise du corps, et la porte d’entrée des figures.' },
  { id: 'gainage', name: 'Gainage : +80 %', exo: 'Hollow Hold', t: true, gain: 1.8, rest: 45, sets: 4,
    why: 'Le hollow body, la base de toutes les figures : un tronc solide rend tes pompes, tes dips et ta course meilleurs.', who: 'Pour un ventre solide et le dragon flag plus tard.' },
  { id: 'pistol', name: 'Premier pistol squat', exo: 'Assisted Pistol Squats', gain: 1.6, rest: 75, sets: 4, final: 'Pistol Squat',
    why: 'Des pistols assistés (une main sur la station de dips) de plus en plus nombreux, puis au jour 30 un essai sans aide.', who: 'Pour des jambes fortes, une jambe après l’autre.' },
];
const TESTS = [1, 10, 20, 30];
export const isTest = (d) => TESTS.includes(d);
export const isRest = (d) => !isTest(d) && d % 4 === 0;

export const active = () => (state.p30 && P30.find((p) => p.id === state.p30.id)) || null;
// Le dernier maximum connu avant le jour d.
function maxBefore(d) {
  const m = state.p30.maxes || {};
  let v = 0; for (const k of Object.keys(m).map(Number).sort((a, b) => a - b)) if (k < d) v = m[k];
  return v;
}
// Ce qu'il faut faire le jour d : les séries (ou un test).
export function dayPlan(p, d) {
  if (isTest(d)) return { test: true, sets: [p.t ? { t: 0 } : { r: 0 }], text: d === 1 ? 'Test de départ : une seule série, au maximum.' : d === 30 ? 'Test final : une seule série, à fond.' : 'Re-test : une seule série au maximum, les séries suivantes s’ajustent dessus.' };
  if (isRest(d)) return { rest: true, sets: [], text: 'Repos. Le progrès se fait pendant la récupération.' };
  const M = Math.max(p.t ? 10 : 3, maxBefore(d));
  // Trois types de jour qui tournent : léger, moyen, dur. Et une petite hausse à l'intérieur de chaque bloc de 10 jours.
  const kind = d % 3, step = 1 + ((d % 10) / 10) * 0.12;
  // Répétitions : 35 à 60 % du max par série (2 à 2,6 fois ton max dans la journée), jamais jusqu'à l'échec.
  // Tenues : un peu plus haut, une tenue courte fatigue moins.
  const base = p.t
    ? (kind === 1 ? [0.45, 0.5, 0.5, 0.45, 0.55] : kind === 2 ? [0.55, 0.6, 0.6, 0.55, 0.65] : [0.6, 0.7, 0.7, 0.6, 0.75])
    : (kind === 1 ? [0.35, 0.4, 0.4, 0.35, 0.45] : kind === 2 ? [0.4, 0.45, 0.45, 0.4, 0.5] : [0.45, 0.55, 0.55, 0.45, 0.6]);
  const sets = base.slice(0, p.sets).map((k) => { const v = Math.max(p.t ? 5 : 1, Math.round(M * k * step / (p.t ? 5 : 1)) * (p.t ? 5 : 1)); return p.t ? { t: v } : { r: v }; });
  const total = sets.reduce((s, x) => s + (x.t || x.r), 0);
  const lo = Math.round(Math.min(...base.slice(0, p.sets)) * step * 100), hi = Math.round(Math.max(...base.slice(0, p.sets)) * step * 100);
  const word = kind === 1 ? 'Jour léger' : kind === 2 ? 'Jour moyen' : 'Jour dur';
  return { sets, kind, max: M, lo, hi, text: word + ' : ' + sets.length + ' séries, ' + (p.t ? total + ' s au total' : total + ' répétitions au total') + ', ' + p.rest + ' s de repos.',
    why: 'Calculé sur ton dernier test (' + unit(p, M) + ') : chaque série fait ' + lo + ' à ' + hi + ' % de ce maximum. '
      + (p.t ? 'Plusieurs tenues courtes et propres apprennent mieux à ton corps qu’une seule à fond.' : 'Tu fais beaucoup de répétitions dans la journée sans jamais aller à l’échec : ton corps s’habitue au volume, et c’est ce qui fait monter ton maximum.')
      + ' Les jours léger, moyen et dur tournent pour que tu récupères, et les tests des jours 10 et 20 recalent les chiffres sur tes progrès. '
      + 'Si la dernière série est vraiment impossible, fais ce que tu peux : ça ne casse rien.' };
}

// Où en est le programme : jour en cours, fait aujourd'hui ?
export function status() {
  const p = active();
  if (!p) return null;
  const done = state.p30.done || {};
  const today = d0(Date.now());
  let last = null, day = 1;
  for (; day <= 30; day++) {
    if (done[day]) { last = done[day]; continue; }
    // Un jour de repos se valide tout seul le lendemain de la dernière séance.
    if (isRest(day) && last && today > d0(last)) { last = d0(last) + DAY; continue; }
    break;
  }
  const doneToday = Object.values(done).some((t) => d0(t) === today);
  return { p, day, doneToday, finished: day > 30, v0: (state.p30.maxes || {})[1] || 0, best: Math.max(0, ...Object.values(state.p30.maxes || {})) };
}
const unit = (p, v) => (p.t ? v + ' s' : plural(v, 'répétition', 'répétitions'));
export const goalOf = (p, v0) => { const g = Math.round(v0 * p.gain); return p.cap ? Math.max(g, p.cap) : g; };

// ---------- Affichage ----------
function setsTxt(p, plan) { return plan.sets.map((x) => (p.t ? x.t + ' s' : x.r)).join(' · '); }

export function p30Card() {
  const s = status();
  if (!s) return '<section class="glass card col tap tint t-gold" role="button" tabindex="0" data-act="p30" style="gap:6px"><div class="row between"><span class="label" style="color:var(--gold)">Programmes de 30 jours</span>' + ICON.chev + '</div><span class="h2">Choisis un but pour ce mois</span><span class="small mut">Pompes +50 %, 60 s en équilibre, premier pistol… 10 à 15 minutes par jour, en plus de ta semaine.</span></section>';
  const { p, day } = s;
  if (s.finished) return '<section class="glass card col tap tint t-gold" role="button" tabindex="0" data-act="p30" style="gap:6px"><span class="label" style="color:var(--gold)">' + esc(p.name) + ' · terminé</span><span class="h2">Résultat : ' + unit(p, (state.p30.maxes || {})[30] || 0) + '</span><span class="small mut">Touche pour voir ton bilan et en commencer un autre.</span></section>';
  const plan = dayPlan(p, day);
  return '<section class="glass card col tint t-gold" style="gap:10px"><div class="row between tap" role="button" tabindex="0" data-act="p30"><span class="label" style="color:var(--gold)">30 jours · ' + esc(p.name.replace(/\s*:\s*/, ' ')) + ' · jour ' + day + '</span>' + ICON.chev + '</div>'
    + '<div class="bar gold"><div style="width:' + Math.round(((day - 1) / 30) * 100) + '%"></div></div>'
    + (s.doneToday ? '<span class="h2">Fait pour aujourd’hui</span><span class="small mut">Demain : ' + esc(isRest(day) ? 'repos' : dayPlan(p, day).test ? 'test' : 'jour ' + day) + '. ' + (s.v0 ? 'Départ ' + unit(p, s.v0) + ', but ' + unit(p, goalOf(p, s.v0)) + '.' : '') + '</span>'
      : plan.rest ? '<span class="h2">Jour de repos</span><span class="small mut">' + esc(plan.text) + ' La suite demain.</span>'
      : '<span class="h2">' + (plan.test ? (day === 1 ? 'Test de départ' : day === 30 ? 'Test final' : 'Re-test') : setsTxt(p, plan) + (p.t ? '' : ' ' + exoName(p.exo).toLowerCase())) + '</span><span class="small mut">' + esc(plan.text) + (plan.why ? ' Basé sur ton max de ' + unit(p, plan.max) + '.' : '') + '</span>' + (plan.why ? '<button type="button" class="linkbtn small" data-act="p30">Pourquoi ces chiffres ?</button>' : '') + '<button type="button" class="pill gold-btn wide" data-act="p30-go">' + (plan.test ? 'Faire le test' : 'Faire le jour ' + day) + '</button>')
    + '</section>';
}

function sheetPick() {
  let h = '<div class="col" style="gap:6px"><span class="label violet">Programmes de 30 jours</span><h1 class="h1">Un but, 30 jours</h1><span class="small" style="color:var(--soft)">10 à 15 minutes par jour, en plus de ta semaine habituelle. Jour 1 : un test. Les séries sont calculées sur ton maximum et s’ajustent aux jours 10 et 20. Jour 30 : le test final. Un jour de repos tous les 4 jours, et un jour raté ne casse rien.</span></div><div class="col" style="gap:10px">'
    + P30.map((p) => '<button type="button" class="glass card p30pick" data-act="p30-start" data-id="' + p.id + '">' + figure(p.exo, 'mini') + '<span class="col grow" style="gap:4px;text-align:left"><span style="font-weight:700">' + esc(p.name) + '</span><span class="small mut">' + esc(p.who) + '</span></span></button>').join('')
    + '</div><button type="button" class="pill sm glass wide" data-act="close">Fermer</button>';
  sheet(h, 1, 'full');
}

function sheetP30() {
  const s = status();
  if (!s) { sheetPick(); return; }
  const { p } = s, m = state.p30.maxes || {};
  let h = '<div class="col" style="gap:6px"><span class="label" style="color:var(--gold)">Programme de 30 jours</span><h1 class="h1">' + esc(p.name) + '</h1><span class="small" style="color:var(--soft)">' + esc(p.why) + '</span></div>';
  if (s.finished) {
    const v1 = m[30] || 0, pct = s.v0 ? Math.round((v1 / s.v0 - 1) * 100) : 0;
    h += '<section class="glass card col center" style="gap:6px;padding:22px 16px"><span class="label">Avant · après</span><span class="num gold-text" style="font-size:44px;line-height:1.1">' + (p.t ? s.v0 + ' → ' + v1 + ' s' : s.v0 + ' → ' + v1) + '</span><span class="small mut">' + (pct >= 0 ? '+' : '') + pct + ' % en 30 jours · +' + P30_XP + ' XP</span></section>'
      + '<button type="button" class="pill gold-btn wide" data-act="p30-new">Choisir un nouveau programme</button>';
  } else {
    if (s.v0) h += '<section class="glass card row between" style="gap:10px"><div class="col"><span class="label">Départ</span><span class="h2">' + unit(p, s.v0) + '</span></div><div class="col" style="align-items:flex-end"><span class="label">But du jour 30</span><span class="h2 gold-text">' + unit(p, goalOf(p, s.v0)) + '</span></div></section>';
    // Les 30 jours en grille.
    h += '<div class="p30grid">' + Array.from({ length: 30 }, (_, i) => { const d = i + 1; const ok = d < s.day; return '<span class="p30d' + (ok ? ' ok' : '') + (d === s.day ? ' cur' : '') + (isRest(d) ? ' off' : '') + (isTest(d) ? ' test' : '') + '">' + (isTest(d) ? 'T' : d) + '</span>'; }).join('') + '</div>'
      + '<span class="small mut">T = test · les jours grisés sont des jours de repos.</span>';
    const plan = dayPlan(p, s.day);
    if (!plan.rest && !s.doneToday) h += '<section class="glass card col" style="gap:6px"><span class="label violet">Aujourd’hui · jour ' + s.day + '</span><span style="font-weight:600">' + esc(plan.test ? plan.text : setsTxt(p, plan)) + '</span>' + (plan.test ? '' : '<span class="small mut">' + esc(plan.text) + '</span>') + '</section>' + (plan.why ? '<section class="glass card col" style="gap:6px"><span class="label">Pourquoi ces chiffres</span><span class="small" style="color:var(--soft)">' + esc(plan.why) + '</span></section>' : '') + '<button type="button" class="pill gold-btn wide" data-act="p30-go">' + (plan.test ? 'Faire le test' : 'Commencer') + '</button>';
    h += '<button type="button" class="pill sm glass wide" data-act="p30-stop" style="color:var(--mut)">Arrêter ce programme</button>';
  }
  h += '<button type="button" class="pill sm glass wide" data-act="close">Fermer</button>';
  sheet(h, 1, 'full');
}

// Appelé par seance.js à la fin d'une séance du programme de 30 jours.
export function p30Done(w) {
  if (!w.p30 || !state.p30 || state.p30.id !== w.p30.id) return;
  const p = active(), d = w.p30.day;
  state.p30.done = state.p30.done || {};
  state.p30.done[d] = w.start;
  if (isTest(d)) {
    let v = 0; for (const e of w.exercises) for (const s of e.sets) v = Math.max(v, p.t ? s.t || 0 : s.r || 0);
    state.p30.maxes = state.p30.maxes || {};
    state.p30.maxes[d] = v;
    if (d === 30) {
      state.p30end = state.p30end || [];
      state.p30end.push({ id: p.id, start: state.p30.start, end: Date.now(), v0: state.p30.maxes[1] || 0, v1: v });
      setTimeout(() => { burst(); toast(p.name + ' terminé · +' + P30_XP + ' XP', true); }, 1200);
    }
  }
  save();
}

Object.assign(ACTIONS, {
  p30: () => sheetP30(),
  'p30-new': () => { state.p30 = null; save(); sheetPick(); },
  'p30-start': (el) => { state.p30 = { id: el.dataset.id, start: Date.now(), maxes: {}, done: {} }; save(); closeSheet(); rerender(); toast('Programme lancé : jour 1, le test', true); },
  'p30-stop': () => { if (!confirm('Arrêter ce programme ? Les séances faites restent dans ton historique.')) return; state.p30 = null; save(); closeSheet(); rerender(); },
  'p30-go': () => {
    const s = status();
    if (!s || s.finished) return;
    if (state.active) { toast('Une séance est déjà en cours'); return; }
    const plan = dayPlan(s.p, s.day);
    const name = s.day === 30 && s.p.final ? s.p.final : s.p.exo;
    import('./seance.js').then((m) => m.startPlan({
      title: s.p.name, label: s.p.name + ' · ' + (plan.test ? 'test' : 'jour ' + s.day),
      exercises: [{ name, sets: plan.sets.map((x) => Object.assign({ w: 0 }, x)) }],
      test: plan.test, fixed: !plan.test, p30: { id: s.p.id, day: s.day }, rest: s.p.rest,
    }));
  },
});
