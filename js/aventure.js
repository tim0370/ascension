// Onglet Aventure : ton héros, la campagne et le dojo des figures, au même endroit.
import { ui, ACTIONS } from './ui.js';
import { heroView } from './avatar.js';
import { campView } from './campagne.js';
import { dojoView } from './dojo.js';

const PARTS = [['heros', 'Héros'], ['camp', 'Campagne'], ['dojo', 'Dojo']];

export function viewAventure() {
  const p = PARTS.some((x) => x[0] === ui.adv) ? ui.adv : 'heros';
  const body = p === 'camp' ? campView() : p === 'dojo' ? dojoView() : heroView();
  return '<div class="col" style="gap:4px"><span class="label violet">Aventure</span><h1 class="h1">' + (p === 'camp' ? 'Campagne' : p === 'dojo' ? 'Dojo' : 'Ton héros') + '</h1></div>'
    + '<div class="advtabs" role="tablist">' + PARTS.map(([k, l]) => '<button type="button" role="tab" class="' + (k === p ? 'on' : '') + '" data-act="adv" data-p="' + k + '">' + l + '</button>').join('') + '</div>'
    + body;
}
export function openAdv(p) {
  ui.adv = p; ui.tab = 'aventure';
  import('./app.js').then((a) => { a.render(); window.scrollTo(0, 0); });
}
Object.assign(ACTIONS, { adv: (el) => openAdv(el.dataset.p), 'adv-heros': () => openAdv('heros'), 'adv-dojo': () => openAdv('dojo') });
