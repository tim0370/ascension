// Le « cerveau » du coach : comprendre une question écrite librement, sans IA ni internet.
// 1. Le texte est nettoyé (accents, abréviations type « pk », « cmb », « jsuis », fautes de frappe courantes).
// 2. Chaque intention a des mots-clés pondérés ; on garde la mieux notée (tolérance d'une faute par mot long).
// 3. On repère aussi un exercice (« dips », « pompes déclinées »), une zone du corps, un nombre de minutes.
// 4. Une question qui ne dit que « et les dips ? » reprend le sujet de la question d'avant.
import { EXOS, AKA } from './data.js';
import { state } from './store.js';

const SMS = {
  pk: 'pourquoi', pq: 'pourquoi', pkoi: 'pourquoi', cmb: 'combien', cb: 'combien', koi: 'quoi', kwa: 'quoi', auj: 'aujourd hui', ajd: 'aujourd hui', aujd: 'aujourd hui', ojd: 'aujourd hui',
  jsuis: 'je suis', chui: 'je suis', jsui: 'je suis', chuis: 'je suis', mtn: 'maintenant', tjr: 'toujours', tjrs: 'toujours', bcp: 'beaucoup', pr: 'pour', dmn: 'demain', sem: 'semaine',
  stp: 's il te plait', svp: 's il vous plait', jai: 'j ai', jsp: 'je sais pas', jpeux: 'je peux', jveux: 'je veux', jvais: 'je vais', jfais: 'je fais', jdois: 'je dois', qd: 'quand', qnd: 'quand',
  mn: 'min', mins: 'min', minute: 'min', minutes: 'min', h: 'heure', km: 'km', rep: 'repetition', reps: 'repetition', exo: 'exercice', exos: 'exercice', muscu: 'musculation', bouf: 'manger', bouffe: 'manger', graille: 'manger', grailler: 'manger',
  seance: 'seance', seances: 'seance', sceance: 'seance', scéance: 'seance', seanse: 'seance', entrainement: 'seance', entrainer: 'seance', entrainé: 'seance', training: 'seance', sport: 'seance',
  fatiguer: 'fatigue', crevé: 'fatigue', creve: 'fatigue', claqué: 'fatigue', claque: 'fatigue', epuise: 'fatigue', naze: 'fatigue', mort: 'fatigue', ko: 'fatigue', hs: 'fatigue',
  flemme: 'motivation', flem: 'motivation', motive: 'motivation', motivé: 'motivation', envie: 'motivation',
  pompe: 'pompes', pompes: 'pompes', pushup: 'pompes', push: 'pompes', dip: 'dips', traction: 'tractions', tractions: 'tractions', pullup: 'tractions', squats: 'squat', abdo: 'abdos', abs: 'abdos',
  merci: 'merci', mercii: 'merci', slt: 'salut', cc: 'salut', coucou: 'salut', yo: 'salut', bjr: 'bonjour', wesh: 'salut',
};
export function clean(text) {
  const t = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  return t.split(' ').filter(Boolean).flatMap((w) => (SMS[w] || w).split(' '));
}
// Distance d'édition bornée à 1 (une lettre en trop, en moins ou changée).
function near(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
}
// Un mot-clé est un début de mot (« fatig » vaut fatigue, fatigué…). Les mots longs tolèrent une faute.
function hit(words, kw) {
  const parts = kw.split(' ');
  if (parts.length > 1) { const s = ' ' + words.join(' ') + ' '; return s.includes(' ' + kw); }
  for (const w of words) {
    if (w.startsWith(kw)) return true;
    if (kw.length >= 5 && w.length >= kw.length - 1 && near(w.slice(0, kw.length), kw)) return true;
  }
  return false;
}

// Intentions : [id, [[mot-clé, poids]…]]. Les ids sont les réponses du coach (coach.js).
const INTENTS = [
  ['today', [['aujourd hui', 2], ['faire quoi', 3], ['je fais quoi', 3], ['quoi faire', 3], ['quelle seance', 3], ['programme du jour', 3], ['seance du jour', 3], ['que faire', 3], ['on fait quoi', 3], ['qu est ce qu on fait', 3], ['ma seance', 2], ['entrainement du jour', 3], ['entrainement d aujourd', 3], ['maintenant', 1], ['ce soir', 1]]],
  ['tomorrow', [['demain', 4], ['apres demain', 2]]],
  ['week', [['semaine', 3], ['planning', 3], ['cette semaine', 2], ['combien de seance', 2], ['objectif de la semaine', 3]]],
  ['time', [['min', 3], ['heure', 2], ['temps', 2], ['rapide', 2], ['pas le temps', 4], ['vite', 1]]],
  ['tired', [['fatigue', 4], ['epuis', 3], ['pas la force', 3], ['plus de force', 3], ['vide', 1], ['lourd', 1]]],
  ['sleep', [['dormi', 4], ['sommeil', 4], ['dormir', 3], ['nuit', 2], ['couch', 2], ['insomni', 4], ['reveil', 2]]],
  ['motiv', [['motivation', 4], ['pas envie', 4], ['demotiv', 4], ['abandonn', 3], ['ca sert a rien', 3], ['lach', 2], ['saoul', 2], ['soule', 2]]],
  ['record', [['record', 4], ['battre', 2], ['meilleur', 2], ['max', 1], ['prochain', 1]]],
  ['stuck', [['stagn', 5], ['bloque', 4], ['progresse pas', 5], ['avance pas', 4], ['plateau', 4], ['pas de progres', 5], ['bouge pas', 3]]],
  ['progress', [['progresser', 3], ['ameliorer', 3], ['augmenter', 2], ['plus fort', 3], ['devenir fort', 3], ['comment faire plus', 3], ['monter', 1]]],
  ['weak', [['point faible', 6], ['faiblesse', 5], ['plus faible', 4], ['retard', 2]]],
  ['success', [['reussit', 4], ['reussi', 2], ['meilleur moment', 4], ['quelle heure', 3], ['matin ou soir', 5]]],
  ['rank', [['rang', 5], ['lettre', 3], ['niveau', 2], ['qualite', 3], ['monter de', 2]]],
  ['muscle', [['muscle', 3], ['masse', 4], ['grossir', 4], ['prendre du poids', 5], ['gonfl', 3], ['pec', 1], ['bras', 1], ['hypertroph', 5], ['sec', 1]]],
  ['run', [['courir', 4], ['course', 4], ['running', 4], ['footing', 4], ['jogging', 4], ['allure', 3], ['vma', 4], ['5 km', 3], ['10 km', 3], ['souffle', 3], ['cardio', 2]]],
  ['light', [['lever le pied', 5], ['trop', 1], ['surentrain', 5], ['repos', 2], ['pause', 2], ['semaine legere', 5], ['decharge', 4]]],
  ['rest', [['jour de repos', 5], ['jour off', 4], ['repos actif', 4], ['quoi faire quand', 2], ['tous les jours', 3], ['2 fois par jour', 4], ['deux fois par jour', 4], ['chaque jour', 2]]],
  ['pain', [['mal', 3], ['douleur', 5], ['bless', 5], ['tendin', 5], ['craqu', 2], ['tire', 1], ['entorse', 5], ['elanc', 4]]],
  ['doms', [['courbature', 6], ['raide', 3], ['courbaturé', 6]]],
  ['food', [['manger', 4], ['repas', 4], ['nourriture', 4], ['proteine', 4], ['calorie', 4], ['regime', 3], ['diner', 3], ['dejeuner', 3], ['petit dej', 4], ['gouter', 3], ['faim', 4], ['cantine', 3], ['recette', 3], ['course', 0], ['liste de course', 6], ['nutrition', 5], ['oeuf', 2], ['lait', 2], ['viande', 2]]],
  ['weight', [['poids', 4], ['peser', 4], ['balance', 4], ['kilo', 3], ['kg', 2], ['grossi', 2], ['maigr', 3]]],
  ['forme', [['forme', 4], ['score', 3], ['bilan du matin', 5], ['pourcentage', 2], ['pret a', 3]]],
  ['pulse', [['pouls', 6], ['cardiaque', 5], ['bpm', 5], ['battement', 5], ['coeur', 3], ['reaction', 4]]],
  ['stats', [['combien', 2], ['total', 3], ['statistique', 5], ['stat', 3], ['bilan', 2], ['ce mois', 3], ['mois dernier', 3], ['depuis le debut', 4], ['en tout', 3]]],
  ['warmup', [['echauff', 6], ['avant la seance', 3], ['preparer', 2]]],
  ['stretch', [['etir', 6], ['souple', 5], ['mobilite', 5], ['retour au calme', 6], ['apres la seance', 2]]],
  ['pullup', [['tractions', 6], ['barre de traction', 6], ['dos large', 4], ['tirage', 3]]],
  ['stress', [['stress', 5], ['bac', 4], ['exam', 5], ['controle', 3], ['partiel', 4], ['revision', 4], ['angoiss', 5], ['anxi', 4]]],
  ['method', [['combien de repetition', 5], ['combien de serie', 5], ['temps de repos', 5], ['repos entre', 5], ['surcharge', 5], ['lest', 2], ['gilet', 3], ['echec', 3], ['tempo', 3], ['lentement', 2]]],
  ['skill', [['handstand', 5], ['equilibre', 4], ['poirier', 5], ['l sit', 5], ['planche', 4], ['muscle up', 5], ['figure', 4], ['calisthen', 4], ['corbeau', 5], ['front lever', 5]]],
  ['quests', [['quete', 6], ['defi du jour', 6], ['defis du jour', 6], ['mission', 4], ['defis', 3]]],
  ['boss', [['ombre', 6], ['boss', 6], ['defi de la semaine', 6]]],
  ['hello', [['salut', 4], ['bonjour', 4], ['bonsoir', 4], ['hello', 4], ['ca va', 3]]],
  ['thanks', [['merci', 6], ['top', 1], ['parfait', 2], ['nickel', 2], ['genial', 2]]],
  ['who', [['qui es tu', 6], ['t es qui', 6], ['comment tu marche', 5], ['es tu une ia', 6], ['intelligence', 4], ['chatgpt', 6], ['ia', 5], ['robot', 5]]],
];

// ---------- Exercices cités ----------
const COMMON = {
  pompes: 'Push Up', dips: 'Triceps Dip', squat: 'Squat (Bodyweight)', pistol: 'Pistol Squat', abdos: 'Hollow Rock', gainage: 'Plank', planche: 'Plank', burpee: 'Burpee', burpees: 'Burpee',
  fentes: 'Reverse Lunge', fente: 'Reverse Lunge', handstand: 'Handstand Hold', poirier: 'Handstand Hold', courir: 'Running', course: 'Running', footing: 'Running', running: 'Running', curl: 'Hammer Curl (Dumbbell)',
  rowing: 'Bent Over Row (Dumbbell)', developpe: 'Seated Overhead Press (Dumbbell)', militaire: 'Seated Overhead Press (Dumbbell)', mollets: 'Standing Calf Raise (Dumbbell)', corbeau: 'Crow Pose',
};
const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'en', 'a', 'au', 'aux', 'sur', 'avec', 'et', 'un', 'une', 'haltere', 'halteres', 'poids', 'corps', 'je', 'mes', 'mon', 'ma', 'pour', 'aux', 'comment', 'quoi', 'plus', 'faire', 'fait', 'est', 'mieux']);
let IDX = null;
function index() {
  if (IDX) return IDX;
  IDX = [];
  const done = {};
  for (const w of state.workouts) for (const e of w.exercises) done[e.name] = (done[e.name] || 0) + 1;
  for (const k of Object.keys(EXOS)) {
    const names = [EXOS[k].fr, k].concat(AKA[k] || []);
    for (const n of names) {
      const toks = clean(n).filter((t) => !STOP.has(t) && t.length > 1);
      if (toks.length) IDX.push({ k, toks, n: done[k] || 0 });
    }
  }
  return IDX;
}
export function findExo(words) {
  const ws = words.filter((w) => !STOP.has(w));
  let best = null;
  for (const it of index()) {
    let m = 0;
    for (const t of it.toks) if (ws.some((w) => w === t || (t.length >= 5 && (w.startsWith(t.slice(0, -1)) || near(w, t))))) m++;
    if (!m) continue;
    // Il faut que tous les mots du nom soient là, sauf pour un nom de 3 mots ou plus (2 suffisent).
    if (m < Math.min(it.toks.length, 2) && !(it.toks.length === 1 && m === 1)) continue;
    const score = m * 10 - (it.toks.length - m) * 6 + Math.min(5, it.n / 4);
    if (!best || score > best.score) best = { k: it.k, score };
  }
  if (best && best.score >= 8) return best.k;
  for (const w of ws) if (COMMON[w]) return COMMON[w];
  return null;
}
const ZONES = { epaul: 'epaules', poignet: 'poignets', coude: 'coudes', genou: 'genoux', dos: 'dos', lombaire: 'dos', rein: 'dos', chevill: 'chevilles' };

// ---------- Comprendre ----------
// Les points des mots-clés seuls (sans toucher à la suite de conversation) : donnés à la petite IA.
export function scoresOf(text) {
  const words = clean(text), sc = [];
  for (const [id, kws] of INTENTS) { let s = 0; for (const [kw, w] of kws) if (w && hit(words, kw)) s += w; if (s) sc.push([id, s]); }
  return sc;
}
let ctx = { id: null, exo: null };
export function resetCtx() { ctx = { id: null, exo: null }; }
// ai = avis de la petite IA (ia.js) : { id ou null, p, top } ; sans lui, seuls les mots-clés décident.
export function understand(text, ai) {
  const words = clean(text);
  const out = { words, exo: findExo(words), zone: null, min: null, scores: [] };
  for (const w of words) for (const z of Object.keys(ZONES)) if (w.startsWith(z)) out.zone = ZONES[z];
  const mm = /(\d{1,3})\s*(min|minute|mn)/.exec(text.toLowerCase()) || /(\d{1,3})\s*min/.exec(words.join(' '));
  const hh = /(\d)\s*(h|heure)/.exec(text.toLowerCase());
  if (mm) out.min = +mm[1]; else if (hh) out.min = +hh[1] * 60; else if (/une heure|1h|une demi/.test(text.toLowerCase())) out.min = /demi/.test(text) ? 30 : 60;
  for (const [id, kws] of INTENTS) {
    let s = 0;
    for (const [kw, w] of kws) if (w && hit(words, kw)) s += w;
    if (s) out.scores.push([id, s]);
  }
  out.scores.sort((a, b) => b[1] - a[1]);
  let id = out.scores.length && out.scores[0][1] >= 3 ? out.scores[0][0] : null;
  out.kw = id;
  if (ai) {
    out.ai = ai;
    // L'IA est sûre : elle décide. Elle hésite : les mots-clés gardent leur choix s'il fait partie de ses 2 premiers.
    if (ai.id) id = ai.id;
    else if (id && !ai.top.slice(0, 2).some((x) => x[0] === id) && ai.p >= 0.3) id = null;
    if (id === 'off' || id === 'p30') { out.id = id; ctx = { id: null, exo: null }; return out; }
  }
  // Réglages fins
  if (id === 'time' && out.min === null && !hit(words, 'pas le temps') && !(ai && ai.id === 'time')) id = out.scores[1] && out.scores[1][1] >= 3 ? out.scores[1][0] : null;
  if (out.min !== null && (!id || ['time', 'today', 'tired'].includes(id))) id = 'time';
  if (id === 'pain' && !out.zone && out.exo && !hit(words, 'douleur') && !hit(words, 'bless')) id = 'exo'; // « mal aux dips » rare : on parle de l'exo
  if (id === 'tractions' || (id === 'pullup' && out.exo && out.exo !== 'Pull Up')) id = 'pullup';
  if (id === 'run' && hit(words, 'manger')) id = 'food';
  if ((id === 'progress' || id === 'record' || id === 'stuck' || id === 'method' || !id) && out.exo && out.exo !== 'Running') {
    if (!id) id = 'exo';
    else if (id === 'progress') id = 'exo';
  }
  if (!id && out.exo === 'Running') id = 'run';
  // Suite de conversation : « et les dips ? », « et demain ? »
  if (!id && out.exo && ctx.exo) id = 'exo';
  if (!id && words.length <= 4 && ctx.id && out.exo) id = ctx.id;
  if (id) ctx = { id, exo: out.exo || (['exo', 'stuck', 'record'].includes(id) ? ctx.exo : null) };
  out.id = id;
  if (id && ['exo', 'stuck', 'record'].includes(id) && !out.exo && ctx.exo) out.exo = ctx.exo;
  return out;
}
// Les intentions les plus proches, pour proposer « Tu voulais dire… ».
export const closest = (u) => (u.ai && u.ai.p >= 0.25 ? u.ai.top.filter((x) => x[1] >= 0.1).map((x) => x[0]) : u.scores.slice(0, 3).map((x) => x[0]));
