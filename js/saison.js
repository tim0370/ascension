// La saison : chaque mois, 30 paliers à monter avec l'XP gagnée dans le mois (séances, quêtes, hauts faits, objectifs).
// Médaille de bronze au palier 10, d'argent au 20, d'or au 30 : une par mois, gardée dans la vitrine.
// Quelques titres et une couleur d'emblème se débloquent pour toujours la première fois.
// Tout se recalcule depuis l'historique : rien de nouveau n'est enregistré, sauf ce qui a déjà été fêté.
import { state, save, xpOf } from './store.js';
import { esc, plural, ICON, sheet, toast, burst } from './ui.js';

export const TIER_XP = 200;
export const TIERS = 30;
export const REWARDS = {
  5: { title: 'Saisonnier', label: 'Titre « Saisonnier »' },
  10: { medal: 'bronze', label: 'Médaille de bronze du mois' },
  15: { skin: 'aurore', label: 'Couleur d’emblème Aurore' },
  20: { medal: 'argent', label: 'Médaille d’argent du mois' },
  25: { title: 'Infatigable', label: 'Titre « Infatigable »' },
  30: { medal: 'or', title: 'Légende de saison', label: 'Médaille d’or du mois et titre « Légende de saison »' },
};
const MEDAL = { bronze: ['#F2C9A0', '#B87333', '#6E3F17'], argent: ['#F4F6FA', '#B8BEC9', '#6E7480'], or: ['#F4E6BC', '#CDAA62', '#8F6D33'] };
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const keyOf = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const nameOf = (k) => { const [y, m] = k.split('-').map(Number); return MOIS[m - 1] + ' ' + y; };
const de = (k, short) => { const n = short ? nameOf(k).split(' ')[0] : nameOf(k); return (/^[ao]/.test(n) ? 'd’' : 'de ') + n; };

// XP gagnée par mois
function xpByMonth() {
  const by = {};
  const add = (k, n) => { by[k] = (by[k] || 0) + n; };
  for (const w of state.workouts) add(keyOf(w.start), xpOf(w));
  for (const [k, day] of Object.entries(state.quests || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    add(k.slice(0, 7), Object.values(day).reduce((a, b) => a + b, 0));
  }
  for (const t of Object.values(state.feats || {})) if (typeof t === 'number') add(keyOf(t), 100);
  for (const g of state.goals || []) if (g.done && typeof g.done === 'number') add(keyOf(g.done), 150);
  return by;
}

const tierOf = (xp) => Math.min(TIERS, Math.floor(xp / TIER_XP));

export function season() {
  const by = xpByMonth();
  const key = keyOf(Date.now());
  const xp = by[key] || 0;
  const tier = tierOf(xp);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const daysLeft = Math.max(1, Math.ceil((end - Date.now()) / 864e5));
  const medals = Object.keys(by).sort().reverse().map((k) => ({ key: k, tier: tierOf(by[k]) })).filter((m) => m.tier >= 10)
    .map((m) => Object.assign(m, { medal: m.tier >= 30 ? 'or' : m.tier >= 20 ? 'argent' : 'bronze' }));
  const bestTier = Math.max(0, ...Object.values(by).map(tierOf));
  return { key, name: nameOf(key), xp, tier, into: tier >= TIERS ? TIER_XP : xp - tier * TIER_XP, daysLeft, medals, bestTier };
}

// Récompenses gagnées pour toujours (titres et couleurs), lues par quetes.js
export function seasonUnlocks() {
  const best = season().bestTier;
  const titles = [], skins = [];
  for (const [t, r] of Object.entries(REWARDS)) if (best >= Number(t)) { if (r.title) titles.push(r.title); if (r.skin) skins.push(r.skin); }
  return { titles, skins };
}

export function medalSvg(kind, size) {
  const [a, b, c] = MEDAL[kind];
  const id = 'md' + kind;
  return '<svg aria-hidden="true" viewBox="0 0 40 48" width="' + (size || 40) + '" height="' + Math.round((size || 40) * 1.2) + '"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="0.55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs>'
    + '<path d="M12 2h7l-4 14h-7zM28 2h-7l4 14h7z" fill="#5B3FC4"/><path d="M19 2h2l-1 6z" fill="#8468E8"/>'
    + '<circle cx="20" cy="30" r="15" fill="url(#' + id + ')" stroke="' + c + '" stroke-width="1.5"/><circle cx="20" cy="30" r="10.5" fill="none" stroke="' + a + '" stroke-opacity="0.7" stroke-width="1"/>'
    + '<path d="M20 23.5l2 4.1 4.5.6-3.3 3.1.8 4.5-4-2.2-4 2.2.8-4.5-3.3-3.1 4.5-.6z" fill="' + a + '"/></svg>';
}

// Carte de l'accueil
export function seasonCard() {
  const s = season();
  const next = Object.keys(REWARDS).map(Number).find((t) => t > s.tier);
  return '<section class="glass card col tap seasoncard tint t-gold" role="button" tabindex="0" data-act="season" style="gap:10px"><div class="row between"><div class="col" style="gap:2px"><span class="label violet">Saison ' + esc(de(s.key, true)) + '</span>'
    + '<span class="h2">Palier <span class="num">' + s.tier + '</span><span class="mut" style="font-weight:500"> / ' + TIERS + '</span></span></div>'
    + '<div class="row" style="gap:4px">' + ['bronze', 'argent', 'or'].map((m, i) => '<span class="smedal' + (s.tier >= (i + 1) * 10 ? ' on' : '') + '">' + medalSvg(m, 26) + '</span>').join('') + '</div></div>'
    + '<div class="bar"><div style="width:' + Math.round((s.into / TIER_XP) * 100) + '%"></div></div>'
    + '<span class="small mut">' + (s.tier >= TIERS ? 'Saison terminée au maximum. Bravo.' : (TIER_XP - s.into) + ' XP pour le palier ' + (s.tier + 1) + (next ? (next === s.tier + 1 ? ' : ' : ' · palier ' + next + ' : ') + esc(REWARDS[next].label.charAt(0).toLowerCase() + REWARDS[next].label.slice(1)) : '')) + ' · fin dans ' + plural(s.daysLeft, 'jour', 'jours') + '</span></section>';
}

export function sheetSeason() {
  const s = season();
  let h = '<div class="col" style="gap:4px"><span class="label violet">Encore ' + plural(s.daysLeft, 'jour', 'jours') + '</span><h1 class="h1">Saison ' + esc(de(s.key, true)) + '</h1>'
    + '<span class="small mut">Chaque mois, une nouvelle saison. Toute l’XP du mois te fait monter : séances, quêtes, hauts faits, objectifs. ' + TIER_XP + ' XP par palier.</span></div>';
  h += '<section class="glass card col center" style="gap:6px;padding:20px 16px"><span class="num" style="font-size:64px;line-height:1">' + s.tier + '</span><span class="small mut">palier sur ' + TIERS + ' · ' + s.xp + ' XP ce mois-ci</span>'
    + '<div class="bar" style="width:100%"><div style="width:' + Math.round((s.into / TIER_XP) * 100) + '%"></div></div></section>';
  // La piste des 30 paliers
  h += '<div class="track" id="strack">';
  for (let t = 1; t <= TIERS; t++) {
    const r = REWARDS[t];
    const cls = (t <= s.tier ? ' got' : '') + (t === s.tier + 1 ? ' cur' : '') + (r ? ' rw' : '');
    h += '<div class="tnode' + cls + '"><span class="tnum">' + t + '</span>' + (r ? '<span class="trw">' + (r.medal ? medalSvg(r.medal, 22) : r.skin ? ICON.star : ICON.medal) + '</span>' : '') + '</div>';
  }
  h += '</div>';
  h += '<span class="label">Récompenses</span><section class="glass card" style="padding:2px 16px">' + Object.entries(REWARDS).map(([t, r]) => {
    const got = s.tier >= Number(t);
    const once = !r.medal || r.title;
    const ever = s.bestTier >= Number(t);
    return '<div class="feat' + (got ? ' done' : '') + '"><span class="medal">' + (r.medal ? medalSvg(r.medal, 24) : got || ever ? ICON.medal : ICON.lock) + '</span><div class="col grow" style="gap:2px"><span style="font-weight:600">Palier ' + t + '</span><span class="small mut">' + esc(r.label) + (once && ever && !got && !r.medal ? ' · déjà gagné' : '') + '</span></div></div>';
  }).join('') + '</section>';
  h += '<span class="label">Vitrine</span>';
  h += s.medals.length ? '<section class="glass card vitrine">' + s.medals.map((m) => '<div class="col center" style="gap:4px">' + medalSvg(m.medal, 44) + '<span class="small" style="font-weight:600;text-align:center">' + esc(nameOf(m.key)) + '</span><span class="small dim">palier ' + m.tier + '</span></div>').join('') + '</section>'
    : '<span class="small mut">Ta première médaille arrive au palier 10. Elle restera ici, avec celles des mois suivants.</span>';
  sheet(h + '<button type="button" class="pill gold-btn wide" data-act="close">Fermer</button>', 1, 'full');
  setTimeout(() => { const c = document.querySelector('#strack .cur') || document.querySelector('#strack .got:last-of-type'); if (c) c.scrollIntoView({ inline: 'center', block: 'nearest' }); }, 50);
}

// À l'accueil : fête un nouveau palier ou une récompense.
export function celebrateSeason() {
  const s = season();
  const seen = String(state.settings.seasonSeen || '');
  const [k, tStr] = seen.split(':');
  const before = k === s.key ? Number(tStr) || 0 : 0;
  if (s.tier === before && k === s.key) return;
  state.settings.seasonSeen = s.key + ':' + s.tier; save();
  if (!seen || s.tier <= before) return; // premier calcul : pas de fête
  let reward = null;
  for (let t = before + 1; t <= s.tier; t++) if (REWARDS[t]) reward = REWARDS[t];
  setTimeout(() => {
    if (reward) { burst(); toast('Saison, palier ' + s.tier + '. Gagné : ' + reward.label.charAt(0).toLowerCase() + reward.label.slice(1), true); }
    else toast('Saison : palier ' + s.tier + ' atteint');
  }, 1800);
}

// L'action « season » est ajoutée dans app.js (ce fichier est lu par quetes.js, avant ui.js).
