// Mensurations : tour de bras, de poitrine, de taille… au mètre ruban, une fois par mois.
// Gardées dans state.measures = [{ d, k, v }] (date, zone, centimètres).
import { state, save, fr, dateFr } from './store.js';
import { $, esc, plural, ACTIONS, ICON, sheet, toast, chartSvg } from './ui.js';

export const ZONES_M = [
  { k: 'bras', name: 'Bras', tip: 'Bras contracté, au plus gros du biceps.' },
  { k: 'poitrine', name: 'Poitrine', tip: 'Sous les aisselles, au niveau des tétons, poumons à moitié pleins.' },
  { k: 'epaules', name: 'Épaules', tip: 'Le tour complet, au plus large des épaules.' },
  { k: 'taille', name: 'Taille', tip: 'Au niveau du nombril, ventre relâché.' },
  { k: 'cuisse', name: 'Cuisse', tip: 'Debout, au plus gros de la cuisse.' },
  { k: 'mollet', name: 'Mollet', tip: 'Debout, au plus gros du mollet.' },
];

const list = (k) => (state.measures || []).filter((m) => m.k === k).sort((a, b) => b.d - a.d);

export function measuresCard() {
  const all = state.measures || [];
  const last = all.length ? Math.max(...all.map((m) => m.d)) : 0;
  const days = last ? Math.floor((Date.now() - last) / 864e5) : 0;
  const bras = list('bras');
  return '<section class="glass card row tap" role="button" tabindex="0" data-act="measures"><div class="col grow"><span class="label">Mensurations</span>'
    + '<span class="h2">' + (bras.length ? 'Bras ' + fr(bras[0].v, 1) + ' cm' : all.length ? plural(new Set(all.map((m) => m.k)).size, 'zone mesurée', 'zones mesurées') : 'Pas encore mesuré') + '</span>'
    + '<span class="small mut">' + (!last ? 'Un mètre ruban, 2 minutes, une fois par mois' : days > 30 ? 'Dernière mesure il y a ' + days + ' jours : à refaire' : 'Mesuré ' + dateFr(last) + (bras.length > 1 ? ' · bras ' + (bras[0].v - bras[bras.length - 1].v >= 0 ? '+' : '') + fr(bras[0].v - bras[bras.length - 1].v, 1) + ' cm' : '')) + '</span></div>' + ICON.chev + '</section>';
}

function sheetMeasures() {
  let h = '<div class="col" style="gap:4px"><span class="label">Au mètre ruban</span><h1 class="h1">Mensurations</h1><span class="small mut">Mesure-toi une fois par mois, le matin, toujours au même endroit. Remplis seulement ce que tu as mesuré.</span></div>';
  h += '<section class="glass card col" style="gap:2px;padding:6px 16px">';
  for (const z of ZONES_M) {
    const L = list(z.k);
    const d = L.length > 1 ? L[0].v - L[L.length - 1].v : 0;
    h += '<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line);gap:10px"><button type="button" class="col grow" data-act="measure" data-k="' + z.k + '" style="gap:2px;text-align:left;background:none;border:0;color:inherit;padding:0">'
      + '<span style="font-weight:700">' + z.name + (L.length ? ' <span class="mut" style="font-weight:500">· ' + fr(L[0].v, 1) + ' cm</span>' : '') + '</span>'
      + '<span class="small ' + (d > 0 && z.k !== 'taille' ? 'gold-text' : 'mut') + '">' + (L.length > 1 ? (d >= 0 ? '+' : '') + fr(d, 1) + ' cm depuis le ' + dateFr(L[L.length - 1].d) : esc(z.tip)) + '</span></button>'
      + '<label class="field" style="height:46px;width:104px;flex:none"><input id="m-' + z.k + '" inputmode="decimal" placeholder="' + (L.length ? fr(L[0].v, 1) : '0') + '" aria-label="' + z.name + ' en centimètres"><span class="unit">cm</span></label></div>';
  }
  h += '</section><button type="button" class="pill gold-btn wide" data-act="measure-save">Enregistrer les mesures</button>';
  h += '<span class="small mut">Touche une zone pour voir sa courbe. La taille qui baisse pendant que les bras montent : c’est exactement ce qu’on veut.</span>';
  sheet(h + '<button type="button" class="pill glass wide" data-act="close">Fermer</button>', 1, 'full');
}

function sheetMeasure(k) {
  const z = ZONES_M.find((x) => x.k === k);
  const L = list(k);
  let h = '<div class="col"><span class="label">Mensurations</span><h1 class="h1">' + z.name + '</h1><span class="small mut">' + esc(z.tip) + '</span></div>';
  if (L.length >= 2) h += '<div class="exo"><span class="label">Évolution</span>' + chartSvg(L.slice(0, 40).reverse().map((x) => x.v), ' cm') + '</div>';
  h += L.length ? '<div class="list">' + L.map((x) => '<div class="item"><div class="col grow" style="gap:2px"><span style="font-weight:600">' + fr(x.v, 1) + ' cm</span><span class="small mut">' + dateFr(x.d, true) + '</span></div><button type="button" class="iconbtn" data-act="measure-del" data-k="' + k + '" data-d="' + x.d + '" aria-label="Supprimer cette mesure">' + ICON.x + '</button></div>').join('') + '</div>'
    : '<span class="mut">Pas encore de mesure.</span>';
  sheet(h + '<button type="button" class="pill glass wide" data-act="measures">Retour</button>', 1, 'full');
}

Object.assign(ACTIONS, {
  measures: () => sheetMeasures(),
  measure: (el) => sheetMeasure(el.dataset.k),
  'measure-save': () => {
    const d = Date.now(), add = [];
    for (const z of ZONES_M) {
      const raw = String(($('m-' + z.k) || {}).value || '').replace(',', '.').trim();
      if (!raw) continue;
      const v = Number(raw);
      if (!(v >= 15 && v <= 200)) { toast(z.name + ' : indique des centimètres, entre 15 et 200'); return; }
      add.push({ d, k: z.k, v: Math.round(v * 10) / 10 });
    }
    if (!add.length) { toast('Remplis au moins une mesure'); return; }
    state.measures = (state.measures || []).concat(add);
    save();
    toast(plural(add.length, 'mesure enregistrée', 'mesures enregistrées'));
    sheetMeasures();
  },
  'measure-del': (el) => {
    if (!confirm('Supprimer cette mesure ?')) return;
    state.measures = (state.measures || []).filter((m) => !(m.k === el.dataset.k && String(m.d) === el.dataset.d));
    save(); sheetMeasure(el.dataset.k);
  },
});
