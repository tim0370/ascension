// Petite IA du coach (sans internet) : un modèle de langue transforme une phrase en 384 nombres qui résument
// son sens. Deux phrases qui veulent dire la même chose donnent des nombres proches, même avec d'autres mots.
// Le coach compare la question aux phrases d'exemple (exemples.txt) et prend le sujet le plus proche.
// Ce fichier ne dépend que de onnxruntime (ort) : il sert dans le téléphone et sur le PC (fabriquer.mjs).
import { encode } from './tok.js';

// Les abréviations les plus courantes, remises en clair (le modèle les connaît mal).
const SMS = { jsuis: 'je suis', jsui: 'je suis', chui: 'je suis', chuis: 'je suis', jai: "j'ai", cmb: 'combien', cb: 'combien', koi: 'quoi', kwa: 'quoi', ajd: "aujourd'hui", auj: "aujourd'hui", aujd: "aujourd'hui", ojd: "aujourd'hui", dmn: 'demain', pk: 'pourquoi', pq: 'pourquoi', pkoi: 'pourquoi', stp: "s'il te plaît", svp: "s'il vous plaît", sem: 'semaine', jfais: 'je fais', jpeux: 'je peux', jveux: 'je veux', jvais: 'je vais', jdois: 'je dois', jsp: 'je sais pas', mtn: 'maintenant', tjr: 'toujours', tjrs: 'toujours', bcp: 'beaucoup', wsh: 'wesh', slt: 'salut', bjr: 'bonjour', c: "c'est", g: "j'ai", t: "t'es", qd: 'quand', pr: 'pour', ds: 'dans', ac: 'avec', avc: 'avec', tt: 'tout', mm: 'même', vrmt: 'vraiment', rep: 'répétitions', reps: 'répétitions', exo: 'exercice', exos: 'exercices', min: 'minutes', mins: 'minutes', mn: 'minutes', frero: 'frère', cest: "c'est", jen: "j'en", jme: 'je me', jte: 'je te', jle: 'je le', jla: 'je la', ya: 'il y a', kel: 'quel', kelle: 'quelle', koman: 'comment', cmt: 'comment', pcq: 'parce que', pck: 'parce que', tkt: "t'inquiète", chais: 'je sais', jsais: 'je sais', jmange: 'je mange', jcours: 'je cours', jdors: 'je dors', jarrive: "j'arrive", jaime: "j'aime", tes: "t'es", lentrainement: "l'entrainement", lepaule: "l'épaule", mdr: '', ptdr: '', lol: '' };
export function prep(s) {
  return String(s || '').toLowerCase().replace(/[’`]/g, "'").replace(/[^\p{L}\p{N}'%?!.,\- ]+/gu, ' ')
    .split(/\s+/).filter(Boolean).map((w) => (w in SMS ? SMS[w] : w)).filter(Boolean).join(' ');
}

export async function makeEncoder(ort, V, model) {
  const sess = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  const names = sess.inputNames;
  return async function embed(text) {
    const ids = encode(V, text);
    const n = ids.length;
    const big = (a) => new ort.Tensor('int64', BigInt64Array.from(a, (x) => BigInt(x)), [1, n]);
    const feeds = {};
    if (names.includes('input_ids')) feeds.input_ids = big(ids);
    if (names.includes('attention_mask')) feeds.attention_mask = big(ids.map(() => 1));
    if (names.includes('token_type_ids')) feeds.token_type_ids = big(ids.map(() => 0));
    const res = await sess.run(feeds);
    const t = res[sess.outputNames[0]];
    const H = t.dims[2], d = t.data, v = new Float32Array(H);
    for (let i = 0; i < n; i++) for (let j = 0; j < H; j++) v[j] += d[i * H + j];
    let s = 0;
    for (let j = 0; j < H; j++) { v[j] /= n; s += v[j] * v[j]; }
    s = Math.sqrt(s) || 1;
    for (let j = 0; j < H; j++) v[j] /= s;
    return v;
  };
}

// sujets.bin (fabriqué sur le PC par ascension-ia/fabriquer.mjs à partir d'exemples.txt) : un petit classifieur
// appris sur les phrases d'exemple. Format : C, D, longueur des noms, noms (JSON), puis b (C) et W (C x D) en float32.
export function loadBank(buf) {
  const dv = new DataView(buf);
  const C = dv.getUint32(0, true), D = dv.getUint32(4, true), L = dv.getUint32(8, true);
  const ids = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 12, L)));
  let o = 12 + L; o += (4 - (o % 4)) % 4;
  const b = new Float32Array(buf.slice(o, o + C * 4)); o += C * 4;
  const W = new Float32Array(buf.slice(o, o + C * D * 4));
  return { ids, C, D, b, W };
}
export const SURE = 0.5;
// Probabilité de chaque sujet. bonus = { sujet: points } donnés par les mots-clés de cerveau.js : ils aident quand
// l'IA hésite (k = poids d'un point). Sûr à partir de SURE.
// L'IA seule d'abord : si elle est assez sûre (0,6), les mots-clés ne comptent pas (ils se trompent plus souvent qu'elle).
export function classify(bank, q, bonus = {}, k = 0.8) {
  const r = raw(bank, q, {}, 0);
  return r.p >= 0.6 || !k ? r : raw(bank, q, bonus, k);
}
function raw(bank, q, bonus, k) {
  const { C, D, W, b, ids } = bank, z = new Float64Array(C);
  let m = -1e9;
  for (let c = 0; c < C; c++) {
    let s = b[c] + Math.min(bonus[ids[c]] || 0, 8) * k;
    for (let j = 0; j < D; j++) s += W[c * D + j] * q[j];
    z[c] = s; if (s > m) m = s;
  }
  let S = 0;
  for (let c = 0; c < C; c++) { z[c] = Math.exp(z[c] - m); S += z[c]; }
  const top = ids.map((id, c) => [id, z[c] / S]).sort((x, y) => y[1] - x[1]).slice(0, 3);
  return { id: top[0][1] >= SURE ? top[0][0] : null, p: top[0][1], top };
}
