// Chrono d'entraînement : Tabata, EMOM (une série au début de chaque minute), AMRAP (le plus de tours possible),
// ou intervalles sur mesure. Bip et voix aux changements, écran gardé allumé.
import { state, save } from './store.js';
import { $, esc, buzz, plural, ui, ACTIONS, ICON, sheet, closeSheet, toast, burst } from './ui.js';
import { beep } from './sound.js';

const MODES = {
  tabata: { name: 'Tabata', desc: '20 s à fond, 10 s de repos, 8 fois. Moins de 4 minutes, mais elles piquent.', work: 20, rest: 10, rounds: 8 },
  emom: { name: 'EMOM', desc: 'Au début de chaque minute, tu fais ta série. Le temps qui reste, c’est ton repos.', work: 60, rest: 0, rounds: 10 },
  amrap: { name: 'AMRAP', desc: 'Le plus de tours possible avant la fin du temps. Touche l’écran à chaque tour fini.', total: 10 * 60 },
  inter: { name: 'Intervalles', desc: 'Travail, repos, tours : à toi de régler.', work: 40, rest: 20, rounds: 6 },
};

let cfg = null; // réglages en cours
let run = null; // chrono qui tourne
let lock = null;

function say(t) { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 1.1; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { /* pas de voix */ } }
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

function initCfg(mode) {
  const saved = (state.settings.chrono || {})[mode] || {};
  cfg = Object.assign({ mode }, MODES[mode], saved);
}

export function sheetChrono(mode) {
  if (run) { draw(); return; }
  initCfg(mode || (cfg && cfg.mode) || 'tabata');
  const m = cfg.mode;
  const step = (k, label, val, unit, d) => '<div class="row between" style="padding:8px 0"><span style="font-weight:600">' + label + '</span><div class="row" style="gap:10px">'
    + '<button type="button" class="stepbtn sm" data-act="ch-step" data-k="' + k + '" data-d="-' + d + '" aria-label="Moins">' + ICON.minus + '</button>'
    + '<span class="num" style="min-width:64px;text-align:center;font-size:22px">' + val + unit + '</span>'
    + '<button type="button" class="stepbtn sm" data-act="ch-step" data-k="' + k + '" data-d="' + d + '" aria-label="Plus">' + ICON.plus + '</button></div></div>';
  let h = '<div class="col"><span class="label violet">Outil</span><h1 class="h1">Chrono</h1></div>'
    + '<div class="seg2" style="align-self:stretch;display:flex">' + Object.keys(MODES).map((k) => '<button type="button" class="grow ' + (k === m ? 'on' : '') + '" data-act="ch-mode" data-m="' + k + '">' + MODES[k].name + '</button>').join('') + '</div>'
    + '<span class="small mut">' + esc(MODES[m].desc) + '</span><section class="glass card" style="padding:6px 16px">';
  if (m === 'amrap') h += step('total', 'Durée', Math.round(cfg.total / 60), ' min', 1);
  else if (m === 'emom') h += step('rounds', 'Minutes', cfg.rounds, '', 1);
  else h += step('work', 'Travail', cfg.work, ' s', 5) + step('rest', 'Repos', cfg.rest, ' s', 5) + step('rounds', 'Tours', cfg.rounds, '', 1);
  const total = m === 'amrap' ? cfg.total : cfg.rounds * (cfg.work + cfg.rest) - (m === 'emom' ? 0 : cfg.rest);
  h += '</section><span class="small mut" style="text-align:center">Durée totale : ' + mmss(total) + ' · 10 s pour te mettre en place</span>'
    + '<button type="button" class="pill gold-btn wide big" data-act="ch-go">Lancer</button>'
    + '<span class="small mut">Idées : Tabata pompes, EMOM 10 minutes de 8 dips, AMRAP 12 minutes de 5 pompes, 10 squats, 5 dips.</span>';
  sheet(h + '<button type="button" class="pill glass wide" data-act="close">Fermer</button>', 1, 'full');
}

// ---------- Le chrono qui tourne ----------
function start() {
  state.settings.chrono = Object.assign({}, state.settings.chrono, { [cfg.mode]: cfg.mode === 'amrap' ? { total: cfg.total } : { work: cfg.work, rest: cfg.rest, rounds: cfg.rounds } });
  save();
  const segs = [];
  if (cfg.mode === 'amrap') segs.push({ kind: 'work', len: cfg.total, round: 1 });
  else for (let r = 1; r <= cfg.rounds; r++) { segs.push({ kind: 'work', len: cfg.work, round: r }); if (cfg.rest && r < cfg.rounds) segs.push({ kind: 'rest', len: cfg.rest, round: r }); }
  run = { segs, i: -1, t0: Date.now() + 10000, segStart: Date.now() + 10000, paused: 0, pauseAt: 0, laps: 0, said: null };
  say('En place. Ça commence dans 10 secondes.');
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {}); } catch (e) { /* rien */ }
  run.timer = setInterval(tick, 200);
  draw();
}

const now = () => (run.pauseAt || Date.now()) - run.paused;

function tick() {
  if (!run) return;
  const t = now();
  if (run.i < 0) {
    const left = Math.ceil((run.t0 - t) / 1000);
    if (left <= 3 && left >= 1 && run.said !== 'p' + left) { run.said = 'p' + left; say(String(left)); }
    if (t >= run.t0) { run.i = 0; run.segStart = run.t0; enter(); }
    update(); return;
  }
  const seg = run.segs[run.i];
  const left = (run.segStart + seg.len * 1000 - t) / 1000;
  const l = Math.ceil(left);
  if (l <= 3 && l >= 1 && run.said !== run.i + ':' + l && seg.len >= 8) { run.said = run.i + ':' + l; if (cfg.mode !== 'emom' || seg.len - left > 5) say(String(l)); }
  if (cfg.mode === 'amrap' && l === 60 && run.said !== 'min') { run.said = 'min'; say('Plus qu’une minute.'); }
  if (left <= 0) {
    run.segStart += seg.len * 1000;
    run.i += 1;
    if (run.i >= run.segs.length) { finish(); return; }
    enter();
  }
  update();
}

function enter() {
  const seg = run.segs[run.i];
  beep(true);
  if (cfg.mode === 'amrap') say('C’est parti. ' + Math.round(cfg.total / 60) + ' minutes.');
  else if (cfg.mode === 'emom') say('Minute ' + seg.round + '. Go.');
  else say(seg.kind === 'work' ? (seg.round === 1 ? 'Go' : 'Tour ' + seg.round + '. Go') : 'Repos');
  draw();
}

function finish() {
  clearInterval(run.timer);
  const laps = run.laps;
  run = null;
  try { if (lock) lock.release(); } catch (e) { /* rien */ }
  beep(true);
  say(cfg.mode === 'amrap' ? 'Terminé. ' + plural(laps, 'tour', 'tours') + '.' : 'Terminé. Bravo.');
  burst();
  sheet('<div class="col center" style="gap:10px;padding-top:40px"><span class="label violet">' + esc(MODES[cfg.mode].name) + '</span><h1 class="h1">Terminé</h1>'
    + (cfg.mode === 'amrap' ? '<span class="num gold-text" style="font-size:80px;line-height:1">' + laps + '</span><span class="mut">' + (laps > 1 ? 'tours' : 'tour') + '</span>' : '<span class="mut">Bien joué. Note tes séries dans une séance si tu veux qu’elles comptent.</span>')
    + '</div><button type="button" class="pill gold-btn wide big" data-act="ch-again">Recommencer</button><button type="button" class="pill glass wide" data-act="close">Fermer</button>', 1, 'full');
}

function draw() {
  if (!run) return;
  const seg = run.i >= 0 ? run.segs[run.i] : null;
  const kind = !seg ? 'prep' : seg.kind;
  const total = cfg.mode === 'amrap' ? 1 : cfg.rounds;
  const h = '<div class="chrono ch-' + kind + '"><div class="row between"><span class="label">' + esc(MODES[cfg.mode].name) + '</span><span class="small" id="ch-round"></span></div>'
    + '<div class="chring" id="ch-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="tr"/><circle cx="60" cy="60" r="54" class="pg" id="ch-pg" pathLength="100"/></svg>'
    + '<div class="chin"><span class="chphase" id="ch-phase"></span><span class="num chtime" id="ch-time">0:00</span>' + (cfg.mode === 'amrap' ? '<span class="small mut" id="ch-laps"></span>' : '') + '</div></div>'
    + (cfg.mode === 'amrap' && seg ? '<button type="button" class="pill gold-btn wide big" data-act="ch-lap" style="height:84px;font-size:22px">Tour fini</button>' : '')
    + '<div class="row"><button type="button" class="pill glass grow big" data-act="ch-pause" id="ch-pause">' + (run.pauseAt ? 'Reprendre' : 'Pause') + '</button><button type="button" class="pill glass grow big" data-act="ch-stop">Arrêter</button></div></div>';
  sheet(h, 1, 'full');
  update();
}

function update() {
  if (!run || !$('ch-time')) return;
  const t = now();
  const seg = run.i >= 0 ? run.segs[run.i] : null;
  let left, len;
  if (!seg) { left = (run.t0 - t) / 1000; len = 10; }
  else { left = (run.segStart + seg.len * 1000 - t) / 1000; len = seg.len; }
  $('ch-time').textContent = mmss(left);
  $('ch-pg').style.strokeDashoffset = String(100 - Math.max(0, Math.min(100, (left / len) * 100)));
  $('ch-phase').textContent = !seg ? 'En place' : run.pauseAt ? 'Pause' : cfg.mode === 'amrap' ? 'Vas-y' : cfg.mode === 'emom' ? 'Minute ' + seg.round : seg.kind === 'work' ? 'Travail' : 'Repos';
  $('ch-round').textContent = seg && cfg.mode !== 'amrap' ? 'Tour ' + seg.round + ' sur ' + cfg.rounds : '';
  if ($('ch-laps')) $('ch-laps').textContent = plural(run.laps, 'tour', 'tours');
}

Object.assign(ACTIONS, {
  chrono2: () => sheetChrono(),
  'ch-mode': (el) => { initCfg(el.dataset.m); sheetChrono(el.dataset.m); },
  'ch-step': (el) => {
    const k = el.dataset.k, d = Number(el.dataset.d);
    if (k === 'total') cfg.total = Math.max(60, Math.min(60 * 60, cfg.total + d * 60));
    else if (k === 'rounds') cfg.rounds = Math.max(1, Math.min(60, cfg.rounds + d));
    else cfg[k] = Math.max(k === 'rest' ? 0 : 5, Math.min(600, cfg[k] + d));
    state.settings.chrono = Object.assign({}, state.settings.chrono, { [cfg.mode]: cfg.mode === 'amrap' ? { total: cfg.total } : { work: cfg.work, rest: cfg.rest, rounds: cfg.rounds } });
    sheetChrono(cfg.mode);
  },
  'ch-go': () => start(),
  'ch-again': () => start(),
  'ch-lap': () => { if (!run || run.pauseAt) return; run.laps += 1; buzz(30); say(String(run.laps)); update(); },
  'ch-pause': () => {
    if (!run) return;
    if (run.pauseAt) { run.paused += Date.now() - run.pauseAt; run.pauseAt = 0; } else run.pauseAt = Date.now();
    const b = $('ch-pause'); if (b) b.textContent = run.pauseAt ? 'Reprendre' : 'Pause';
    update();
  },
  'ch-stop': () => { if (!run) return; clearInterval(run.timer); run = null; try { if (lock) lock.release(); } catch (e) { /* rien */ } closeSheet(); toast('Chrono arrêté'); },
});
