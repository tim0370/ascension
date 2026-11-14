// Onglet Progression : examens de rang, arbres de progression, équilibre du corps, poids et photos.
import { RANKS, TREES, CATS } from './data.js';
import { state, save, fr, dateFr, routines, exoHistory, exoName, setText } from './store.js';
import { rankInfo, testStatus, allTrees, treeStatus, balance, bodyLog, addWeight, delWeight } from './stats.js';
import { addPhoto, listPhotos, deletePhoto, setPhotoDate, photoFiles } from './photos.js';
import { $, esc, plural, toNum, ui, ACTIONS, ICON, rankSvg, toast, sheet, closeSheet, closeBtn, burst, chartSvg } from './ui.js';
import { render } from './app.js';

let photos = null; // chargées une fois, puis gardées en mémoire

// ---------- Rang ----------
// Petit résumé de l'examen en cours, affiché sur l'accueil et en haut de l'onglet.
export function rankTeaser(info) {
  if (!info.next) return '<section class="glass card hud row tap" role="button" tabindex="0" data-act="rank">' + rankSvg(info.rank.letter, true) + '<div class="col grow"><span class="label">Rang maximum</span><span class="h2">Tu es au sommet</span></div>' + ICON.chev + '</section>';
  return '<section class="glass card hud col tap" role="button" tabindex="0" data-act="rank" style="gap:12px"><div class="row">' + rankSvg(info.next.letter, true)
    + '<div class="col grow" style="gap:2px"><span class="label violet">Examen du rang ' + info.next.letter + '</span><span class="h2">' + info.passed + ' épreuve' + (info.passed > 1 ? 's' : '') + ' sur ' + info.tests.length + '</span></div>' + ICON.chev + '</div>'
    + '<div class="seg">' + info.tests.map((t) => '<i class="' + (t.done ? 'on' : '') + '"></i>').join('') + '</div>'
    + (() => { const todo = info.tests.find((t) => !t.done); return todo ? '<span class="small mut">Prochaine épreuve : ' + esc(todo.label.charAt(0).toLowerCase() + todo.label.slice(1)) + '</span>' : ''; })()
    + '</section>';
}

// Fête un changement de rang la première fois qu'on le constate.
export function checkRankUp(info) {
  if (state.rankSeen === undefined) { state.rankSeen = info.idx; save(); return; }
  if (info.idx > state.rankSeen) {
    state.rankSeen = info.idx; save();
    sheet('<div class="col center" style="gap:14px;padding:10px 0">' + rankSvg(info.rank.letter) + '<span class="label violet">Nouveau rang</span><h1 class="h1" style="font-size:32px">Rang ' + info.rank.letter + ' · ' + esc(info.rank.name) + '</h1>'
      + '<span class="mut">Tu as réussi toutes les épreuves. ' + (info.next ? 'Le rang ' + info.next.letter + ' t’attend.' : 'Il n’y a plus rien au-dessus.') + '</span></div>' + closeBtn);
    burst();
  } else if (info.idx < state.rankSeen) { state.rankSeen = info.idx; save(); }
}

function sheetRank() {
  const info = rankInfo();
  let h = '<div class="row" style="gap:14px">' + rankSvg(info.rank.letter) + '<div class="col grow"><span class="gold-text" style="font-size:11px;font-weight:600;letter-spacing:2px">TON RANG</span><span class="h1">Rang ' + info.rank.letter + ' · ' + esc(info.rank.name) + '</span>'
    + '<span class="small mut">Un rang se gagne en réussissant toutes les épreuves du suivant.</span></div></div>';
  if (info.next) {
    h += '<span class="label violet">Examen du rang ' + info.next.letter + ' · ' + info.passed + ' sur ' + info.tests.length + '</span>';
    for (const t of info.tests) {
      h += '<button type="button" class="exo" style="text-align:left;width:100%"' + (t.exo ? ' data-act="exo" data-name="' + esc(t.exo) + '"' : ' data-act="run"') + '>'
        + '<div class="row between"><span style="font-weight:600">' + esc(t.label) + '</span>' + (t.done ? '<span class="tag gold">Réussie</span>' : '<span class="small mut">' + Math.round(t.ratio * 100) + ' %</span>') + '</div>'
        + '<div class="bar' + (t.done ? ' gold' : '') + '"><div style="width:' + Math.round(t.ratio * 100) + '%"></div></div><span class="small mut">' + esc(t.best) + '</span></button>';
    }
    h += '<span class="small mut">Les épreuves se valident toutes seules dès qu’une de tes séances atteint l’objectif.</span>';
  }
  h += '<span class="label">Tous les rangs</span><div class="list">' + RANKS.map((r, i) => {
    const st = i <= info.idx ? (i === info.idx ? 'Ton rang' : 'Réussi') : (i === info.idx + 1 ? 'En cours' : 'Verrouillé');
    return '<div class="item"' + (i > info.idx + 1 ? ' style="opacity:0.5"' : '') + '>' + rankSvg(r.letter, true) + '<div class="col grow" style="gap:2px"><span style="font-weight:600">' + esc(r.name) + '</span><span class="small mut">'
      + (r.tests.length ? esc(r.tests.map((t) => t.label.charAt(0).toLowerCase() + t.label.slice(1)).join(', ')) : 'Rang de départ') + '</span></div><span class="small ' + (i === info.idx ? 'gold-text' : 'mut') + '" style="font-weight:600;white-space:nowrap">' + st + '</span></div>';
  }).join('') + '</div>' + closeBtn;
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
  h += rankTeaser(info);

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
