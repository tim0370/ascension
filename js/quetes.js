// Quêtes, série de semaines (la flamme), hauts faits, titres et couleurs d'emblème.
// Principe : rien qui se fait tout seul. Les quêtes du jour sont des défis calés sur TES records
// (assez durs pour demander un effort, jamais impossibles), avec des exercices qui servent vraiment.
import { EXOS } from './data.js';
import { state, save, isRecord } from './store.js';
import { seasonUnlocks } from './saison.js';

const DAY = 864e5;
const day0 = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayKey = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const round = (n, k) => Math.max(k, Math.round(n / k) * k);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// Familles comptées pour les défis.
const isPush = (n) => EXOS[n] && EXOS[n].g === 'pompes';
const isDips = (n) => EXOS[n] && EXOS[n].g === 'dips' && n !== 'Bench Dip';
const isPistol = (n) => /Pistol/.test(n);
const EXPLO = ['Explosive Push Up', 'Clap Push Up', 'Explosive Dip'];
const isRun = (w) => w.exercises.some((e) => e.name === 'Running');

// Les chiffres d'une journée (ou de toutes les journées, pour les hauts faits).
function dayStats(list) {
  const s = { push: 0, dips: 0, pistol: 0, explo: 0, sets: 0, km: 0, prog: 0, progFast: 0, ghostSets: 0, ghostPerfect: 0, boss: 0, run: 0, lift: 0, prs: 0 };
  for (const w of list) {
    s.prs += w.prs || 0;
    if (isRun(w)) s.run += 1;
    let lifted = false;
    for (const e of w.exercises) for (const x of e.sets) {
      if (e.name === 'Running') { s.km += x.d || 0; continue; }
      lifted = true;
      s.sets += 1;
      if (isPush(e.name)) s.push += x.r || 0;
      if (isDips(e.name)) s.dips += x.r || 0;
      if (isPistol(e.name)) s.pistol += x.r || 0;
      if (EXPLO.includes(e.name)) s.explo += x.r || 0;
    }
    if (lifted && !w.boss && !w.quick) s.lift += 1;
    if (w.prog && w.prog.type !== 'test') { s.prog += 1; if (w.end - w.start < 45 * 60000) s.progFast += 1; }
    if (w.ghost) { s.ghostSets += w.ghost.won; if (w.ghost.total >= 6 && w.ghost.won === w.ghost.total) s.ghostPerfect += 1; }
    if (w.boss && w.boss.win) s.boss += 1;
  }
  return s;
}

// Tes meilleures séries avant aujourd'hui, pour caler les défis.
function bests(before) {
  const b = { push: 0, dips: 0, pistol: 0, dayPush: 0 };
  const perDay = {};
  for (const w of state.workouts) {
    if (w.start >= before) continue;
    for (const e of w.exercises) for (const x of e.sets) {
      if (e.name === 'Push Up' && !x.w) b.push = Math.max(b.push, x.r || 0);
      if (isDips(e.name)) b.dips = Math.max(b.dips, x.r || 0);
      if (e.name === 'Pistol Squat') b.pistol = Math.max(b.pistol, x.r || 0);
      if (isPush(e.name)) { const k = dayKey(w.start); perDay[k] = (perDay[k] || 0) + (x.r || 0); }
    }
  }
  b.dayPush = Math.max(0, ...Object.values(perDay));
  return b;
}

// Un défi de record : une série du jour qui bat ton meilleur chiffre (avec un lest égal ou plus lourd).
function recordToday(test, t0) {
  for (const w of state.workouts) {
    if (w.start < t0) continue;
    for (const e of w.exercises) if (test(e.name)) for (const x of e.sets) if (isRecord(e.name, x, t0)) return 1;
  }
  return 0;
}

// ---------- Quêtes du jour ----------
// Trois par jour : une de volume, une de record, une de séance. Une quête rare un jour sur quatre environ.
function pool(b, t0) {
  const nPush = clamp(round(Math.max(b.push * 3, 60), 10), 60, 300);
  const nDips = clamp(round(Math.max(b.dips * 3, 30), 5), 30, 150);
  const nPistol = clamp(Math.max(b.pistol, 2) * 4, 10, 60);
  return {
    volume: [
      { id: 'v-pompes', label: nPush + ' pompes dans la journée', hint: 'Toutes les pompes comptent, séance ou pas.', xp: 60, key: 'push', goal: nPush, unit: 'pompes' },
      { id: 'v-dips', label: nDips + ' dips dans la journée', hint: 'Lestés ou non, toutes les séries comptent.', xp: 60, key: 'dips', goal: nDips, unit: 'dips' },
      { id: 'v-pistol', label: nPistol + ' pistols dans la journée', hint: 'Assistés compris, en comptant les deux jambes.', xp: 50, key: 'pistol', goal: nPistol, unit: 'pistols' },
    ],
    record: [
      { id: 'r-pompes', label: 'Plus de ' + b.push + ' pompes d’affilée', hint: 'Ton record : ' + b.push + '. Une seule série, sans pause.', xp: 90, custom: () => recordToday((n) => n === 'Push Up', t0), goal: 1, unit: 'record' },
      { id: 'r-dips', label: 'Bats un record aux dips', hint: 'Plus de répétitions qu’avant avec le même lest, ou plus lourd.', xp: 80, custom: () => recordToday(isDips, t0), goal: 1, unit: 'record' },
      { id: 'r-deux', label: 'Bats 2 records aujourd’hui', hint: 'Sur n’importe quels exercices.', xp: 80, key: 'prs', goal: 2, unit: 'records' },
    ],
    seance: [
      { id: 's-fantome', label: 'Bats ton fantôme sur 8 séries', hint: 'Dans une séance du programme : fais mieux que la dernière fois, série par série.', xp: 70, key: 'ghostSets', goal: 8, unit: 'séries' },
      { id: 's-explo', label: '30 répétitions explosives', hint: 'Pompes explosives, claquées ou dips explosifs.', xp: 60, key: 'explo', goal: 30, unit: 'rép.' },
      { id: 's-rapide', label: 'Séance du programme en moins de 45 min', hint: 'Repos tenus, pas de téléphone entre les séries.', xp: 60, key: 'progFast', goal: 1, unit: 'séance' },
    ],
    rare: [
      { id: 'x-centurion', label: (nPush * 2) + ' pompes aujourd’hui', hint: 'Quête rare : découpe en petites séries toute la journée.', xp: 250, key: 'push', goal: nPush * 2, unit: 'pompes' },
      { id: 'x-double', label: 'Séance et course le même jour', hint: 'Quête rare : le doublé.', xp: 200, custom: (s) => (s.lift && s.run ? 1 : 0), goal: 1, unit: 'doublé' },
      { id: 'x-parfait', label: 'Bats ton fantôme sur toutes les séries', hint: 'Quête rare : une séance du programme sans perdre une seule série.', xp: 250, key: 'ghostPerfect', goal: 1, unit: 'séance' },
      { id: 'x-boss', label: 'Bats le boss de la semaine aujourd’hui', hint: 'Quête rare : le boss est dans l’onglet Progrès.', xp: 200, key: 'boss', goal: 1, unit: 'boss' },
    ],
  };
}

function seedOf(t0) { const n = Math.floor(t0 / DAY); return (n * 2654435761) % 4294967296; }

export function dailyQuests() {
  const t0 = day0(Date.now());
  const today = state.workouts.filter((w) => w.start >= t0);
  const s = dayStats(today);
  const P = pool(bests(t0), t0);
  const seed = seedOf(t0);
  const pick = (list, k) => list[Math.floor(seed / 2 ** k) % list.length];
  const list = [pick(P.volume, 1), pick(P.record, 5), pick(P.seance, 9)];
  if (Math.floor(seed / 2 ** 13) % 4 === 0) list.push(Object.assign({ rare: true }, pick(P.rare, 17)));
  const key = dayKey(t0);
  state.quests = state.quests || {};
  const log = state.quests[key] || {};
  let changed = false;
  const out = list.map((q) => {
    const cur = q.custom ? q.custom(s) : s[q.key] || 0;
    const done = !!log[q.id] || cur >= q.goal;
    if (done && !log[q.id]) { log[q.id] = q.xp; changed = true; }
    return { id: q.id, label: q.label, hint: q.hint, xp: q.xp, rare: !!q.rare, done, cur: done ? q.goal : Math.floor(cur), goal: q.goal, unit: q.unit };
  });
  if (changed) { state.quests[key] = log; save(); }
  return out;
}

// ---------- La flamme : semaines d'affilée où l'objectif de la semaine est atteint ----------
// Une semaine compte quand tu fais ton objectif de séances (réglable). La semaine en cours ne casse rien tant qu'elle n'est pas finie.
// Toutes les 4 semaines de flamme, un bouclier (2 au plus) : il sauve tout seul une semaine ratée.
export const SHIELD_MAX = 2;
export const SHIELD_EVERY = 4;
const monday0 = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const addDays = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
function weekCounts() {
  const c = {};
  for (const w of state.workouts) if (!w.boss && !w.quick) { const k = monday0(w.start); c[k] = (c[k] || 0) + 1; }
  return c;
}
function simulate(goal) {
  const c = weekCounts();
  const keys = Object.keys(c).map(Number).sort((a, b) => a - b);
  const cur = monday0(Date.now());
  let n = 0, sh = 0, best = 0, saved = 0;
  if (keys.length) {
    for (let m = keys[0]; m < cur; m = addDays(m, 7)) {
      if ((c[m] || 0) >= goal) { n += 1; if (n % SHIELD_EVERY === 0) sh = Math.min(SHIELD_MAX, sh + 1); }
      else if (n > 0 && sh > 0) { sh -= 1; saved += 1; }
      else { n = 0; saved = 0; }
      best = Math.max(best, n);
    }
  }
  return { n, sh, best, saved, cur: c[cur] || 0 };
}
export function streak() {
  const goal = state.settings.weekGoal || 4;
  const r = simulate(goal);
  const t0 = day0(Date.now());
  const todayDone = state.workouts.some((w) => w.start >= t0 && !w.boss);
  const weekDone = r.cur >= goal;
  const left = 7 - ((new Date().getDay() + 6) % 7) - (todayDone ? 1 : 0); // jours encore possibles cette semaine
  const need = Math.max(0, goal - r.cur);
  let n = r.n + (weekDone ? 1 : 0);
  let sh = r.sh;
  if (weekDone && n % SHIELD_EVERY === 0 && r.n % SHIELD_EVERY !== 0) sh = Math.min(SHIELD_MAX, sh + 1);
  const lost = !weekDone && need > left; // impossible de finir la semaine
  const using = lost && n > 0 && sh > 0 ? 1 : 0;
  const danger = !weekDone && n > 0 && need > 0 && need >= left - 1;
  return { n, weekDone, todayDone, danger, lost, need, left, cur: r.cur, goal, best: Math.max(n, r.best), shields: sh, using, saved: r.saved, next: SHIELD_EVERY - (n % SHIELD_EVERY) };
}
function bestStreak() { return simulate(state.settings.weekGoal || 4).best; }

// ---------- Hauts faits : défis durs, avec un titre ou une couleur à gagner ----------
export const SKINS = {
  or: { name: 'Or', a: '#F4E6BC', b: '#CDAA62', c: '#8F6D33' },
  argent: { name: 'Argent', a: '#F4F6FA', b: '#B8BEC9', c: '#6E7480' },
  violet: { name: 'Améthyste', a: '#DCD2FF', b: '#9A82F0', c: '#5B3FC4' },
  rubis: { name: 'Rubis', a: '#FFD0D4', b: '#E0566A', c: '#8A1F33' },
  emeraude: { name: 'Émeraude', a: '#CFF5E4', b: '#4CC59A', c: '#1C6E52' },
  obsidienne: { name: 'Obsidienne', a: '#E8E6F0', b: '#6D6880', c: '#25222F' },
  aurore: { name: 'Aurore', a: '#FFE3F1', b: '#C77DFF', c: '#4B2C9E' },
};

function allStats() {
  // Meilleure journée de pompes, meilleures séries, courses, boss, fantôme.
  const perDay = {};
  const m = { dayPush: 0, push: 0, dips: 0, dips20: 0, dips25: 0, pistol: 0, clap: 0, run10: 0, fast5: 0, boss: 0, ghostWins: 0, cycles: 0 };
  for (const w of state.workouts) {
    const k = dayKey(w.start);
    for (const e of w.exercises) for (const x of e.sets) {
      if (e.name === 'Running') {
        if ((x.d || 0) >= 10) m.run10 = 1;
        if ((x.d || 0) >= 5 && x.t && x.t * Math.pow(5 / x.d, 1.06) <= 25 * 60) m.fast5 = 1;
        continue;
      }
      if (isPush(e.name)) perDay[k] = (perDay[k] || 0) + (x.r || 0);
      if (e.name === 'Push Up' && !x.w) m.push = Math.max(m.push, x.r || 0);
      if (isDips(e.name)) { m.dips = Math.max(m.dips, x.w ? 0 : x.r || 0); if ((x.w || 0) >= 20) m.dips20 = Math.max(m.dips20, x.r || 0); if ((x.w || 0) >= 25) m.dips25 = Math.max(m.dips25, x.r || 0); }
      if (e.name === 'Pistol Squat') m.pistol = Math.max(m.pistol, x.r || 0);
      if (e.name === 'Clap Push Up') m.clap = Math.max(m.clap, x.r || 0);
    }
    if (w.boss && w.boss.win) m.boss += 1;
    if (w.ghost && w.ghost.total && w.ghost.won * 2 > w.ghost.total) m.ghostWins += 1;
    if (w.prog && w.prog.type === 'test') m.cycles += 1;
  }
  m.dayPush = Math.max(0, ...Object.values(perDay));
  m.rare = Object.values(state.quests || {}).reduce((n, d) => n + Object.keys(d).filter((id) => id.startsWith('x-')).length, 0);
  m.streak = Math.max(bestStreak(), streak().n);
  return m;
}

// reward : { title } ou { skin }. Chaque haut fait rapporte aussi 100 XP.
export const FEATS = [
  { id: 'centurion', group: 'Pompes', label: 'Centurion', desc: '100 pompes dans une journée', key: 'dayPush', goal: 100, reward: { title: 'Centurion' } },
  { id: 'pompes200', group: 'Pompes', label: 'Légion', desc: '200 pompes dans une journée', key: 'dayPush', goal: 200, reward: { skin: 'rubis' } },
  { id: 'pompes40', group: 'Pompes', label: 'Machine', desc: '40 pompes d’affilée', key: 'push', goal: 40, reward: { title: 'La Machine' } },
  { id: 'pompes60', group: 'Pompes', label: 'Inépuisable', desc: '60 pompes d’affilée', key: 'push', goal: 60, reward: { skin: 'argent' } },
  { id: 'clap10', group: 'Pompes', label: 'Détonation', desc: '10 pompes claquées d’affilée', key: 'clap', goal: 10, reward: { title: 'Explosif' } },
  { id: 'dips25', group: 'Dips', label: 'Barres parallèles', desc: '25 dips d’affilée sans lest', key: 'dips', goal: 25, reward: { title: 'Le Roc' } },
  { id: 'dips20kg', group: 'Dips', label: 'Lesté', desc: '8 dips avec 20 kg ou plus', key: 'dips20', goal: 8, reward: { title: 'Poids lourd' } },
  { id: 'dips25kg', group: 'Dips', label: 'Acier', desc: '6 dips avec 25 kg ou plus', key: 'dips25', goal: 6, reward: { skin: 'obsidienne' } },
  { id: 'pistol5', group: 'Jambes', label: 'Équilibre', desc: '5 pistols d’affilée par jambe', key: 'pistol', goal: 5, reward: { title: 'Équilibriste' } },
  { id: 'pistol12', group: 'Jambes', label: 'Jambes d’acier', desc: '12 pistols d’affilée par jambe', key: 'pistol', goal: 12, reward: { skin: 'emeraude' } },
  { id: 'run5', group: 'Course', label: 'Rapide', desc: '5 km en moins de 25 min', key: 'fast5', goal: 1, reward: { title: 'Le Rapide' } },
  { id: 'run10', group: 'Course', label: 'Fond', desc: 'Courir 10 km d’une traite', key: 'run10', goal: 1, reward: { title: 'Endurant' } },
  { id: 'streak7', group: 'Régularité', label: 'Lancé', desc: 'Une flamme de 4 semaines', key: 'streak', goal: 4, reward: { title: 'Inarrêtable' } },
  { id: 'streak30', group: 'Régularité', label: 'Brasier', desc: 'Une flamme de 12 semaines', key: 'streak', goal: 12, reward: { skin: 'violet' } },
  { id: 'cycle', group: 'Régularité', label: 'Discipline', desc: 'Finir un cycle complet du programme', key: 'cycles', goal: 1, reward: { title: 'Discipliné' } },
  { id: 'boss3', group: 'Combat', label: 'Chasseur', desc: 'Battre 3 boss', key: 'boss', goal: 3, reward: { title: 'Chasseur de boss' } },
  { id: 'boss10', group: 'Combat', label: 'Tueur de titans', desc: 'Battre 10 boss', key: 'boss', goal: 10, reward: { title: 'Tueur de titans' } },
  { id: 'ghost10', group: 'Combat', label: 'Plus fort qu’hier', desc: 'Gagner 10 duels contre ton fantôme', key: 'ghostWins', goal: 10, reward: { title: 'Plus fort qu’hier' } },
  { id: 'rare3', group: 'Combat', label: 'Chanceux', desc: 'Réussir 3 quêtes rares', key: 'rare', goal: 3, reward: { title: 'Le Chanceux' } },
];

// État de chaque haut fait. Ceux qui viennent d'être réussis sont notés (state.feats) pour la fête et l'XP.
export function feats() {
  const m = allStats();
  state.feats = state.feats || {};
  const fresh = [];
  const list = FEATS.map((f) => {
    const cur = m[f.key] || 0;
    const done = cur >= f.goal;
    if (done && !state.feats[f.id]) { state.feats[f.id] = Date.now(); fresh.push(f); }
    return Object.assign({}, f, { cur: Math.min(cur, f.goal), done, at: state.feats[f.id] || null });
  });
  if (fresh.length) save();
  return { list, fresh };
}
export function featXp() { return Object.keys(state.feats || {}).length * 100; }

export function titles() { return ['Aucun'].concat(FEATS.filter((f) => f.reward.title && (state.feats || {})[f.id]).map((f) => f.reward.title), seasonUnlocks().titles); }
export function skins() { return ['or'].concat(FEATS.filter((f) => f.reward.skin && (state.feats || {})[f.id]).map((f) => f.reward.skin), seasonUnlocks().skins); }
export function skin() { const s = state.settings.skin; return SKINS[s] && skins().includes(s) ? SKINS[s] : SKINS.or; }
export function myTitle() { const t = state.settings.title; return t && titles().includes(t) && t !== 'Aucun' ? t : ''; }
