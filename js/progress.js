// Onglet Progression : examens de rang, arbres de progression, équilibre du corps, poids et photos.
import { RANKS, TREES, CATS, LETTRES, QUALITES, EXOS } from './data.js';
import { state, save, fr, dateFr, routines, exoHistory, exoName, setText } from './store.js';
import { rankInfo, testStatus, allTrees, treeStatus, balance, bodyLog, addWeight, delWeight, bodyInfo, letterOf } from './stats.js';
import { figure } from './anim.js';
import { addPhoto, listPhotos, deletePhoto, setPhotoDate, photoFiles } from './photos.js';
import { $, esc, plural, toNum, ui, ACTIONS, ICON, rankSvg, toast, sheet, closeSheet, closeBtn, burst, chartSvg } from './ui.js';
import { render } from './app.js';
import { bodyCard } from './corps.js';
import { goalsCard } from './objectifs.js';

let photos = null; // chargées une fois, puis gardées en mémoire

// ---------- Rang et 5 qualités ----------
const SHORT = { force: 'Force', explo: 'Explosivité', vitesse: 'Vitesse', endu: 'Endurance', maitrise: 'Maîtrise' };

// Graphique en étoile : une branche par qualité, un anneau par lettre (D, C, B, A, S, Z).
export function radarSvg(q, small) {
  const W = small ? 300 : 340, H = small ? 230 : 262, cx = W / 2, cy = small ? 118 : 136, R = small ? 92 : 80;
  const pt = (i, v) => { const a = (-90 + i * 72) * Math.PI / 180; return [cx + Math.cos(a) * R * v / 6, cy + Math.sin(a) * R * v / 6]; };
  const poly = (v) => q.map((_, i) => pt(i, typeof v === 'function' ? v(i) : v).map((n) => n.toFixed(1)).join(',')).join(' ');
  let s = '<svg class="radar" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tes 5 qualités : ' + q.map((x) => x.name + ' ' + x.letter).join(', ') + '">';
  for (let k = 1; k <= 6; k++) s += '<polygon points="' + poly(k) + '" fill="none" stroke="rgba(255,255,255,' + (k === 6 ? 0.16 : 0.07) + ')" stroke-width="1"/>';
  q.forEach((_, i) => { const p = pt(i, 6); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="rgba(255,255,255,0.07)"/>'; });
  s += '<g class="radar-poly" style="transform-origin:' + cx + 'px ' + cy + 'px"><polygon points="' + poly((i) => Math.max(0.35, q[i].score)) + '" fill="rgba(132,104,232,0.26)" stroke="#8468E8" stroke-width="2" stroke-linejoin="round"/>';
  q.forEach((x, i) => { const p = pt(i, Math.max(0.35, x.score)); s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2" fill="#D8BD82"/>'; });
  s += '</g>';
  if (!small) {
    // Sous chaque pointe : la lettre en or, le nom en dessous (centrés, pour ne jamais sortir du cadre).
    q.forEach((x, i) => {
      const p = pt(i, 7.3), dx = i === 1 ? 6 : i === 4 ? -6 : 0;
      const ly = i === 0 ? p[1] - 14 : i === 1 || i === 4 ? p[1] - 2 : p[1] + 6;
      s += '<text x="' + (p[0] + dx).toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700" fill="#D8BD82">' + x.letter + '</text>'
        + '<text x="' + (p[0] + dx).toFixed(1) + '" y="' + (ly + 15).toFixed(1) + '" text-anchor="middle" font-size="12.5" fill="#A29DB0">' + SHORT[x.id] + '</text>';
    });
  }
  return s + '</svg>';
}

// Carte de rang : le rang, l'avancée vers le suivant, l'étoile et les 5 lettres.
export function rankCard(info) {
  const nextL = info.next ? info.next.letter : null;
  let h = '<section class="glass card hud col" style="gap:14px"><div class="row tap" role="button" tabindex="0" data-act="rank" style="gap:14px">' + rankSvg(info.rank.letter)
    + '<div class="col grow" style="gap:4px"><span class="gold-text" style="font-size:11px;font-weight:600;letter-spacing:2px">CARTE DE RANG</span><span class="h2">Rang ' + info.rank.letter + ' · ' + esc(info.rank.name) + '</span>'
    + (nextL ? '<div class="bar"><div style="width:' + Math.round(info.ratio * 100) + '%"></div></div><span class="small mut">' + Math.round(info.ratio * 100) + ' % vers le rang ' + nextL + '</span>' : '<span class="small mut">Le plus haut rang</span>') + '</div>' + ICON.chev + '</div>'
    + '<div class="tap" role="button" tabindex="0" data-act="rank">' + radarSvg(info.q) + '</div><div class="list">';
  for (const x of info.q) {
    h += '<button type="button" class="item" data-act="quality" data-id="' + x.id + '"><span class="qletter">' + x.letter + '</span><div class="col grow" style="gap:5px"><div class="row between"><span style="font-weight:600">' + esc(x.name) + '</span>'
      + '<span class="small mut" style="white-space:nowrap">' + (x.score >= 6 ? 'Maximum' : Math.round(x.frac * 100) + ' % vers ' + LETTRES[Math.floor(x.score) + 1]) + '</span></div><div class="bar thin"><div style="width:' + Math.round(x.frac * 100) + '%"></div></div></div>' + ICON.chev + '</button>';
  }
  return h + '</div></section>';
}
// Ancien nom gardé : l'accueil et l'onglet l'appellent encore.
export const rankTeaser = rankCard;

// Fête un changement de rang la première fois qu'on le constate.
export function checkRankUp(info) {
  // Passage au rang calculé par les 5 qualités (version 11) : on part du rang actuel sans fête ni alerte.
  if (state.rankSeen === undefined || state.rankV !== 2) { state.rankSeen = info.idx; state.rankV = 2; save(); return; }
  if (info.idx > state.rankSeen) {
    state.rankSeen = info.idx; save();
    sheet('<div class="col center" style="gap:14px;padding:10px 0">' + rankSvg(info.rank.letter) + '<span class="label violet">Nouveau rang</span><h1 class="h1" style="font-size:32px">Rang ' + info.rank.letter + ' · ' + esc(info.rank.name) + '</h1>'
      + '<span class="mut">La moyenne de tes 5 qualités vient de passer un cap. ' + (info.next ? 'Le rang ' + info.next.letter + ' t’attend.' : 'Il n’y a plus rien au-dessus.') + '</span></div>' + radarSvg(info.q) + closeBtn);
    burst();
  } else if (info.idx < state.rankSeen) { state.rankSeen = info.idx; save(); }
}

function adjustNote() {
  const B = bodyInfo();
  return 'Calculé pour ' + (B.known ? fr(B.bw, 1) + ' kg' : '70 kg (pèse-toi pour l’ajuster)') + (B.age ? ' et ' + B.age + ' ans' : ', âge non renseigné') + '. Ton poids et ton âge se règlent dans les réglages.';
}

function sheetRank() {
  const info = rankInfo();
  let h = '<div class="row" style="gap:14px">' + rankSvg(info.rank.letter) + '<div class="col grow"><span class="gold-text" style="font-size:11px;font-weight:600;letter-spacing:2px">TON RANG</span><span class="h1">Rang ' + info.rank.letter + ' · ' + esc(info.rank.name) + '</span>'
    + '<span class="small mut">Ton rang est la moyenne de tes 5 qualités. Fais monter la plus faible pour monter vite.</span></div></div>';
  h += radarSvg(info.q);
  h += '<div class="list">' + info.q.map((x) => '<button type="button" class="item" data-act="quality" data-id="' + x.id + '"><span class="qletter">' + x.letter + '</span><span class="grow" style="font-weight:600">' + esc(x.name) + '</span><span class="small mut">' + (x.score >= 6 ? 'Max' : Math.round(x.frac * 100) + ' %') + '</span>' + ICON.chev + '</button>').join('') + '</div>';
  if (info.next) {
    const weak = info.q.slice().sort((a, b) => a.score - b.score)[0];
    const need = Math.max(0.1, Math.round((1 - info.ratio) * 5 * 10) / 10);
    h += '<div class="exo"><span class="label violet">Pour le rang ' + info.next.letter + '</span><span style="color:var(--soft)">Gagne encore ' + fr(need, 1) + ' lettre' + (need > 1 ? 's' : '') + ' en tout sur tes 5 qualités. La plus faible : ' + esc(weak.name.toLowerCase()) + ' (' + weak.letter + '), c’est elle qui monte le plus vite.</span></div>';
    h += '<span class="label">Défis du rang ' + info.next.letter + ' · ' + info.passed + ' sur ' + info.tests.length + '</span>';
    for (const t of info.tests) {
      h += '<button type="button" class="exo" style="text-align:left;width:100%"' + (t.exo ? ' data-act="exo" data-name="' + esc(t.exo) + '"' : ' data-act="run"') + '>'
        + '<div class="row between"><span style="font-weight:600">' + esc(t.label) + '</span>' + (t.done ? '<span class="tag gold">Réussi</span>' : '<span class="small mut">' + Math.round(t.ratio * 100) + ' %</span>') + '</div>'
        + '<div class="bar' + (t.done ? ' gold' : '') + '"><div style="width:' + Math.round(t.ratio * 100) + '%"></div></div><span class="small mut">' + esc(t.best) + '</span></button>';
    }
    h += '<span class="small mut">Ces défis sont des repères du niveau attendu : les réussir fait monter tes lettres.</span>';
  }
  h += '<span class="label">Tous les rangs</span><div class="list">' + RANKS.map((r, i) => {
    const st = i < info.idx ? 'Passé' : (i === info.idx ? 'Ton rang' : (i === info.idx + 1 ? 'Prochain' : ''));
    return '<div class="item"' + (i > info.idx + 1 ? ' style="opacity:0.5"' : '') + '>' + rankSvg(r.letter, true) + '<div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(r.name) + '</span><span class="small mut">'
      + (i ? 'Moyenne de tes lettres à ' + r.letter : 'Rang de départ') + '</span></div><span class="small ' + (i === info.idx ? 'gold-text' : 'mut') + '" style="font-weight:600;white-space:nowrap">' + st + '</span></div>';
  }).join('') + '</div><span class="small mut">' + esc(adjustNote()) + '</span>' + closeBtn;
  sheet(h);
}

function sheetQuality(id) {
  const info = rankInfo();
  const x = info.q.find((k) => k.id === id);
  if (!x) return;
  let h = '<div class="row" style="gap:16px"><span class="qletter big">' + x.letter + '</span><div class="col grow" style="gap:4px"><span class="label violet">Qualité</span><span class="h1">' + esc(x.name) + '</span>'
    + '<span class="small mut">' + (x.score >= 6 ? 'Lettre maximum' : Math.round(x.frac * 100) + ' % vers la lettre ' + LETTRES[Math.floor(x.score) + 1]) + '</span></div></div>'
    + '<div class="bar"><div style="width:' + Math.round(x.frac * 100) + '%"></div></div>'
    + '<span style="color:var(--soft)">' + esc(x.desc) + '</span>';
  h += '<span class="label">Ce qui compte</span><div class="list">' + x.sources.map((sc) => {
    const act = sc.name === 'Running' ? ' data-act="run"' : (sc.name ? ' data-act="exo" data-name="' + esc(sc.name) + '"' : '');
    return '<' + (act ? 'button type="button"' : 'div') + ' class="item"' + act + '><span class="qletter sm">' + letterOf(Math.min(6, sc.score)) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(sc.label) + '</span><span class="small mut">' + esc(sc.best) + '</span></div>' + (act ? ICON.chev : '') + '</' + (act ? 'button' : 'div') + '>';
  }).join('') + '</div>';
  h += '<span class="label">Pour la faire monter</span><div class="pgrid">' + x.tips.map((n) => '<button type="button" class="pcard" ' + (n === 'Running' ? 'data-act="run"' : 'data-act="exo" data-name="' + esc(n) + '"') + '>' + figure(n) + '<span class="pname">' + esc(exoName(n)) + '</span></button>').join('') + '</div>';
  h += '<span class="small mut">Ta lettre vient de ta meilleure performance, ajustée à ton poids et à ton âge. ' + esc(adjustNote()) + '</span>' + closeBtn;
  sheet(h);
}

// ---------- Arbres ----------
function sheetTree(id) {
  const tree = TREES.find((t) => t.id === id);
  if (!tree) return;
  const st = treeStatus(tree);
  const goalText = (n) => (n.run ? n.label.charAt(0).toLowerCase() + n.label.slice(1) : n.sets + ' × ' + (n.secs ? n.secs + ' s' : n.reps) + (n.lest ? ' avec ' + n.lest + ' kg' : ''));
  let h = '<div class="col"><span class="label">' + st.done + ' palier' + (st.done > 1 ? 's' : '') + ' sur ' + st.nodes.length + '</span><h1 class="h1">' + esc(st.name) + '</h1></div><div class="tree">';
  for (const n of st.nodes) {
    const icon = n.state === 'done' ? ICON.check : (n.state === 'current' ? ICON.dot : ICON.lock);
    h += '<button type="button" class="node ' + n.state + '"' + (n.run ? ' data-act="run"' : ' data-act="exo" data-name="' + esc(n.exo) + '"') + '><span class="mark" style="' + (n.state === 'current' ? 'color:var(--violet)' : '') + '">' + icon + '</span>';
    if (n.state === 'current') {
      h += '<div class="exo grow" style="border-color:rgba(132,104,232,0.6)"><div class="row between"><span style="font-weight:600">' + esc(n.label) + '</span><span class="tag">En cours</span></div>'
        + '<div class="bar"><div style="width:' + Math.round(n.ratio * 100) + '%"></div></div><span class="small mut">Objectif : ' + goalText(n) + (n.best ? ' · ton meilleur : ' + esc(n.best) : ' · pas encore essayé') + '</span></div>';
    } else {
      h += '<div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(n.label) + '</span><span class="small mut">' + (n.state === 'done' ? 'Validé' : 'Objectif : ' + goalText(n)) + '</span></div>';
    }
    h += '</button>';
  }
  h += '</div><span class="small mut">Touche un palier pour voir comment faire l’exercice. Un palier se valide tout seul quand une séance atteint l’objectif, et un palier plus dur valide ceux d’avant.</span>' + closeBtn;
  sheet(h);
}

// ---------- Écran ----------
export function viewProgress() {
  const info = rankInfo();
  let h = '<div class="col" style="gap:2px"><span class="small mut">Rang ' + info.rank.letter + ' · ' + esc(info.rank.name) + '</span><h1 class="h1">Progression</h1></div>';
  h += rankCard(info);
  h += '<div class="tiles">'
    + '<section class="glass tile tap" role="button" tabindex="0" data-act="career"><span class="label" style="color:var(--gold)">Ma carrière</span><span class="ico gold">' + ICON.medal + '</span><span class="small mut" style="margin-top:auto">Pompes à vie, tonnes soulevées, km</span></section>'
    + '<section class="glass tile tap" role="button" tabindex="0" data-act="bilan"><span class="label violet">Bilan du mois</span><span class="ico">' + ICON.star + '</span><span class="small mut" style="margin-top:auto">Ton mois en plein écran</span></section></div>';
  h += '<section class="glass card row tap" role="button" tabindex="0" data-act="parcours" style="gap:12px;align-items:center"><span class="ico">' + ICON.flame + '</span><div class="col grow" style="gap:2px"><span style="font-weight:700">Mon parcours</span><span class="small mut">La frise de tes grands moments depuis le début</span></div>' + ICON.chev + '</section>';
  h += goalsCard();
  h += bodyCard();

  h += '<div class="sec"><span class="h2">Arbres de progression</span></div>';
  for (const t of allTrees()) {
    h += '<section class="glass card col tap" role="button" tabindex="0" data-act="tree" data-id="' + t.id + '" style="gap:12px"><div class="row between"><span class="h2">' + esc(t.name) + '</span><span class="row small mut" style="gap:4px">' + t.done + ' sur ' + t.nodes.length + ICON.chev + '</span></div>'
      + '<div class="dots">' + t.nodes.map((n, i) => (i ? '<b class="' + (n.state === 'done' ? 'done' : '') + '"></b>' : '') + '<i class="' + n.state + '"></i>').join('') + '</div>'
      + '<span class="small mut">' + (t.current ? 'En cours : ' + esc(t.current.label.charAt(0).toLowerCase() + t.current.label.slice(1)) : 'Arbre terminé') + '</span></section>';
  }

  // Tableau des records : la meilleure série de chaque exercice de tes routines actuelles.
  const mine = [];
  for (const r of routines()) for (const e of r.exercises) if (!mine.includes(e.name)) mine.push(e.name);
  const rows = mine.map((n) => ({ n, h: exoHistory(n) })).filter((x) => x.h.most);
  if (rows.length) {
    h += '<div class="sec"><span class="h2">Mes records</span><span class="small mut">' + plural(rows.length, 'exercice', 'exercices') + '</span></div><section class="glass card list" style="padding:4px 16px">'
      + rows.map((x) => '<button type="button" class="item" data-act="exo" data-name="' + esc(x.n) + '"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(exoName(x.n)) + '</span><span class="small mut">' + dateFr(x.h.most.date, true) + '</span></div>'
        + '<div class="col" style="gap:2px;align-items:flex-end"><span class="gold-text" style="font-weight:600">' + esc(setText(x.h.most.set)) + '</span>' + (x.h.heavy && x.h.heavy.set !== x.h.most.set ? '<span class="small mut">' + esc(setText(x.h.heavy.set)) + '</span>' : '') + '</div></button>').join('') + '</section>';
  }

  const b = balance();
  const max = Math.max(1, ...Object.values(b));
  const totalSets = Object.values(b).reduce((x, y) => x + y, 0);
  h += '<div class="sec"><span class="h2">Équilibre du corps</span><span class="small mut">4 dernières semaines</span></div><section class="glass card col" style="gap:12px">'
    + Object.keys(CATS).map((k) => '<div class="hbar"><span class="small" style="font-weight:500">' + CATS[k] + '</span><div class="bar"><div style="width:' + Math.round((b[k] / max) * 100) + '%"></div></div><span class="small mut" style="text-align:right">' + b[k] + '</span></div>').join('');
  if (totalSets) {
    const low = Object.keys(CATS).reduce((a, k) => (b[k] < b[a] ? k : a));
    const high = Object.keys(CATS).reduce((a, k) => (b[k] > b[a] ? k : a));
    h += '<span class="small mut">' + (b[low] < b[high] * 0.5 ? 'Tu travailles nettement moins : ' + CATS[low].toLowerCase() + ' (' + plural(b[low], 'série', 'séries') + ' contre ' + b[high] + ' en ' + CATS[high].toLowerCase() + ').' : 'C’est équilibré, continue comme ça.') + '</span>';
  } else h += '<span class="small mut">Aucune séance sur les 4 dernières semaines.</span>';
  h += '</section>';

  const log = bodyLog();
  h += '<div class="sec"><span class="h2">Corps</span></div><section class="glass card row tap" role="button" tabindex="0" data-act="body"><div class="col grow"><span class="label">Poids</span>'
    + '<span class="h2">' + (log.length ? fr(log[0].kg, 1) + ' kg' : 'Pas encore noté') + '</span><span class="small mut">' + (log.length ? 'Noté ' + dateFr(log[0].d) + (log.length > 1 ? ' · ' + (log[0].kg - log[log.length - 1].kg >= 0 ? '+' : '') + fr(log[0].kg - log[log.length - 1].kg, 1) + ' kg depuis le début' : '') : 'Touche pour ajouter une pesée') + '</span></div>' + ICON.chev + '</section>';
  h += '<section class="glass card col tap" role="button" tabindex="0" data-act="photos" style="gap:10px"><div class="row between"><div class="col"><span class="label">Photos</span><span class="h2" id="photo-count">' + (photos ? plural(photos.length, 'photo', 'photos') : 'Photos de suivi') + '</span></div>' + ICON.chev + '</div>'
    + '<span class="small mut">' + photoHint() + '</span></section>';
  if (!photos) listPhotos().then((p) => { photos = p; const el = $('photo-count'); if (el) el.textContent = plural(p.length, 'photo', 'photos'); }).catch(() => { photos = []; });
  return h;
}

// Rappel photo : toutes les deux semaines.
export function photoDue() { return !!(photos && photos.length && Date.now() - photos[0].d > 14 * 864e5); }
function photoHint() {
  if (!photos || !photos.length) return 'Une photo toutes les deux semaines pour voir ton évolution. Elles restent dans ton téléphone.';
  const days = Math.floor((Date.now() - photos[0].d) / 864e5);
  return days > 14 ? 'Dernière photo il y a ' + days + ' jours : c’est le moment d’en refaire une.' : 'Dernière photo ' + (days ? 'il y a ' + plural(days, 'jour', 'jours') : 'aujourd’hui') + '. Prochaine dans ' + plural(Math.max(1, 14 - days), 'jour', 'jours') + '.';
}

// ---------- Poids ----------
function sheetBody() {
  const log = bodyLog();
  let h = '<div class="col"><span class="label">' + plural(log.length, 'pesée', 'pesées') + '</span><h1 class="h1">Poids</h1></div>'
    + '<div class="row"><label class="field grow" style="height:52px"><input id="body-kg" inputmode="decimal" placeholder="0" aria-label="Poids en kilos"><span class="unit">kg</span></label><button type="button" class="pill gold-btn" data-act="add-weight">Enregistrer</button></div>';
  if (log.length >= 2) h += '<div class="exo"><span class="label">Évolution</span>' + chartSvg(log.slice(0, 40).reverse().map((x) => x.kg), ' kg') + '</div>';
  if (log.length) h += '<div class="list">' + log.slice(0, 30).map((x) => '<div class="item"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + fr(x.kg, 1) + ' kg</span><span class="small mut">' + dateFr(x.d, true) + '</span></div><button type="button" class="iconbtn" data-act="del-weight" data-d="' + x.d + '" aria-label="Supprimer cette pesée">' + ICON.x + '</button></div>').join('') + '</div>';
  else h += '<span class="mut">Pèse-toi toujours au même moment, par exemple le matin, pour que la courbe ait du sens.</span>';
  sheet(h + closeBtn);
}

// ---------- Photos ----------
async function sheetPhotos() {
  try { photos = await listPhotos(); } catch (e) { photos = []; toast('Les photos ne sont pas disponibles sur ce navigateur'); }
  let h = '<div class="col"><span class="label">' + plural(photos.length, 'photo', 'photos') + '</span><h1 class="h1">Photos de suivi</h1><span class="small mut">' + photoHint() + '</span></div>'
    + '<button type="button" class="pill gold-btn wide" data-act="add-photo">Ajouter ou importer des photos</button>'
    + '<span class="small mut">Tu peux en choisir plusieurs d’un coup, par exemple tes anciennes photos de Hevy enregistrées dans ta galerie. Chaque photo garde sa date d’origine, que tu peux corriger en la touchant.</span>';
  if (photos.length) {
    h += '<div class="thumbs">' + photos.map((p) => '<button type="button" data-act="photo" data-id="' + p.id + '" aria-label="Photo du ' + dateFr(p.d, true) + '"><img src="' + p.url + '" alt=""><span>' + dateFr(p.d, true) + '</span></button>').join('') + '</div>'
      + '<button type="button" class="pill glass wide" data-act="export-photos">Exporter toutes mes photos</button>';
  }
  h += '<span class="small mut">Astuce : même endroit, même lumière, même pose. Les photos restent dans ton téléphone : exporte-les de temps en temps, elles ne sont pas dans la sauvegarde des séances.</span>';
  sheet(h + closeBtn);
}

function sheetPhoto(id) {
  const p = photos && photos.find((x) => x.id === id);
  if (!p) return;
  const iso = new Date(p.d - new Date(p.d).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  sheet('<div class="col"><span class="label">Photo</span><span class="h2">' + dateFr(p.d, true) + '</span></div>'
    + '<img src="' + p.url + '" alt="Photo de suivi du ' + dateFr(p.d, true) + '" style="width:100%;border-radius:20px;display:block">'
    + '<label class="col" style="gap:6px"><span class="label">Date de la photo</span><input class="textin" type="date" id="photo-date" data-id="' + p.id + '" value="' + iso + '" max="' + new Date().toISOString().slice(0, 10) + '"></label>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="del-photo" data-id="' + p.id + '" style="color:var(--mut)">Supprimer</button><button type="button" class="pill gold-btn grow" data-act="photos">Retour aux photos</button></div>', 1, 'full');
}

// Changement de date d'une photo (appelé par app.js quand la case change).
export async function onPhotoDate(input) {
  const t = Date.parse(input.value + 'T12:00:00');
  if (isNaN(t)) return;
  await setPhotoDate(input.dataset.id, t);
  photos = await listPhotos();
  render();
  toast('Date modifiée');
}

async function exportPhotos() {
  const files = await photoFiles();
  if (!files.length) return;
  try {
    if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  // Sans le partage du téléphone : téléchargement un par un.
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    await new Promise((r) => setTimeout(r, 250));
    URL.revokeObjectURL(a.href);
  }
  toast(plural(files.length, 'photo exportée', 'photos exportées'));
}

Object.assign(ACTIONS, {
  rank: () => sheetRank(),
  quality: (el) => sheetQuality(el.dataset.id),
  tree: (el) => sheetTree(el.dataset.id),
  body: () => sheetBody(),
  'add-weight': () => {
    const kg = toNum($('body-kg').value);
    if (kg < 20 || kg > 300) { toast('Indique ton poids en kilos'); return; }
    addWeight(Math.round(kg * 10) / 10); render(); sheetBody(); toast('Pesée enregistrée');
  },
  'del-weight': (el) => { delWeight(+el.dataset.d); render(); sheetBody(); },
  photos: () => { sheetPhotos(); },
  photo: (el) => sheetPhoto(el.dataset.id),
  'add-photo': () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      const files = [...(input.files || [])];
      if (!files.length) return;
      toast(files.length > 1 ? 'Import de ' + files.length + ' photos…' : 'Ajout de la photo…');
      let ok = 0;
      for (const f of files) { try { await addPhoto(f); ok += 1; } catch (e) { /* image illisible : on passe à la suivante */ } }
      photos = await listPhotos();
      render(); sheetPhotos();
      toast(ok ? plural(ok, 'photo ajoutée', 'photos ajoutées') + (ok < files.length ? ', ' + (files.length - ok) + ' illisible' + (files.length - ok > 1 ? 's' : '') : '') : 'Impossible d’ajouter ces photos');
    };
    input.click();
  },
  'export-photos': () => { exportPhotos(); },
  'del-photo': async (el) => {
    if (!confirm('Supprimer définitivement cette photo ?')) return;
    await deletePhoto(el.dataset.id); photos = await listPhotos(); closeSheet(); render(); sheetPhotos();
  },
});

// Charge les photos au démarrage pour que le rappel de l'accueil soit à jour.
export function loadPhotos() { return listPhotos().then((p) => { photos = p; }).catch(() => { photos = []; }); }
export { testStatus };
