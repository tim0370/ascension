// Découpe d'une phrase en morceaux (tokenizer Unigram du modèle), sans bibliothèque.
// vocab.bin : nombre de morceaux (uint32), leurs scores (float32), puis les morceaux séparés par \n.
export function loadVocab(buf) {
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true);
  const scores = new Float32Array(buf.slice(4, 4 + n * 4));
  const pieces = new TextDecoder().decode(new Uint8Array(buf, 4 + n * 4)).split('\n');
  const map = new Map();
  let maxLen = 0, min = 0;
  for (let i = 0; i < n; i++) {
    if (i > 3) { map.set(pieces[i], i); if (pieces[i].length > maxLen) maxLen = pieces[i].length; }
    if (scores[i] < min) min = scores[i];
  }
  return { map, scores, maxLen, unkScore: min - 10 };
}
export function normalize(s) {
  return String(s).normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000E-\u001F\u007F-\u009F​-‍﻿]/g, '')
    .replace(/[\s  - 　]+/g, ' ').trim();
}
function word(V, w, out) {
  const N = w.length, best = new Float64Array(N + 1).fill(-Infinity), from = new Int32Array(N + 1), id = new Int32Array(N + 1);
  best[0] = 0;
  for (let i = 0; i < N; i++) {
    if (best[i] === -Infinity) continue;
    let any = false;
    for (let L = 1; L <= V.maxLen && i + L <= N; L++) {
      const k = V.map.get(w.slice(i, i + L));
      if (k === undefined) continue;
      any = any || L === 1 || false;
      const sc = best[i] + V.scores[k];
      if (sc > best[i + L]) { best[i + L] = sc; from[i + L] = i; id[i + L] = k; }
    }
    // caractère inconnu : un seul caractère (ou une paire de substitution) en <unk>
    const cl = w.codePointAt(i) > 0xffff ? 2 : 1;
    const sc = best[i] + V.unkScore;
    if (sc > best[i + cl]) { best[i + cl] = sc; from[i + cl] = i; id[i + cl] = 3; }
  }
  const r = [];
  for (let j = N; j > 0; j = from[j]) r.push(id[j]);
  r.reverse();
  for (const k of r) { if (k === 3 && out[out.length - 1] === 3) continue; out.push(k); }
}
export function encode(V, text, max = 128) {
  const out = [0];
  for (const w of normalize(text).split(' ')) if (w) word(V, '▁' + w, out);
  if (out.length > max - 1) out.length = max - 1;
  out.push(2);
  return out;
}
