// Retour au calme : 6 étirements guidés, 3 minutes, avec la silhouette, un minuteur et la voix.
import { figure } from './anim.js';
import { $, esc, ACTIONS, ICON, sheet, closeSheet, toast, burst } from './ui.js';
import { beep } from './sound.js';

export const STRETCHES = [
  { fig: 'stretch-chest', name: 'Ouverture de poitrine', secs: 30, tip: 'Mains jointes dans le dos, bras tendus. Ouvre la poitrine et regarde légèrement vers le haut.' },
  { fig: 'stretch-triceps', name: 'Triceps et épaules', secs: 30, side: true, tip: 'Main derrière la tête, l’autre main tire doucement le coude. Change de côté à la moitié.' },
  { fig: 'stretch-quad', name: 'Avant des cuisses', secs: 30, side: true, tip: 'Debout, attrape ta cheville derrière toi, genoux serrés. Change de jambe à la moitié.' },
  { fig: 'stretch-ham', name: 'Arrière des cuisses', secs: 30, tip: 'Assis jambes tendues, penche-toi vers tes pieds, dos long. Ne force pas.' },
  { fig: 'stretch-dog', name: 'Chien tête en bas', secs: 30, tip: 'Fesses en l’air, pousse le sol, talons vers le sol. Pédale doucement.' },
  { fig: 'stretch-child', name: 'Posture de l’enfant', secs: 30, tip: 'Fesses sur les talons, front au sol, bras loin devant. Respire lentement.' },
];

let cd = null;
function say(t) { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 1; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { /* pas de voix */ } }

export function startCooldown() {
  stop();
  cd = { i: 0, end: Date.now() + STRETCHES[0].secs * 1000, half: false, paused: 0 };
  say(STRETCHES[0].name + '. ' + STRETCHES[0].tip);
  cd.timer = setInterval(tick, 250);
  draw();
}

function stop() { if (cd) { clearInterval(cd.timer); cd = null; } }

function tick() {
  if (!cd || cd.paused) return;
  if (!$('cd-time')) { stop(); return; } // fenêtre fermée
  const s = STRETCHES[cd.i];
  const left = (cd.end - Date.now()) / 1000;
  if (s.side && !cd.half && left <= s.secs / 2) { cd.half = true; say('Change de côté.'); }
  if (left <= 0) { next(); return; }
  $('cd-time').textContent = Math.ceil(left);
  $('cd-bar').style.width = Math.max(0, Math.min(100, (1 - left / s.secs) * 100)) + '%';
}

function next() {
  beep(true);
  if (cd.i >= STRETCHES.length - 1) {
    stop();
    say('Terminé. Bonne récupération.');
    burst();
    sheet('<div class="col center" style="gap:10px;padding-top:50px"><span class="label violet">Retour au calme</span><h1 class="h1">Bien récupéré</h1><span class="mut" style="text-align:center">Trois minutes qui aident tes muscles à repartir plus vite demain.</span></div><button type="button" class="pill gold-btn wide big" data-act="close">Fermer</button>', 1, 'full');
    return;
  }
  cd.i += 1; cd.half = false;
  const s = STRETCHES[cd.i];
  cd.end = Date.now() + s.secs * 1000;
  say(s.name + '. ' + s.tip);
  draw();
}

function draw() {
  const s = STRETCHES[cd.i];
  const h = '<div class="col" style="gap:2px"><span class="label violet">Retour au calme · ' + (cd.i + 1) + ' sur ' + STRETCHES.length + '</span><h1 class="h1">' + esc(s.name) + '</h1></div>'
    + '<div class="seg">' + STRETCHES.map((x, k) => '<i class="' + (k <= cd.i ? 'on' : '') + '"></i>').join('') + '</div>'
    + '<div class="cdfig">' + figure(s.fig) + '</div>'
    + '<div class="col center" style="gap:8px"><span class="num" id="cd-time" style="font-size:72px;line-height:1">' + Math.ceil((cd.end - Date.now()) / 1000) + '</span>'
    + '<div class="bar" style="width:100%"><div id="cd-bar" style="width:0%;transition:width 0.25s linear"></div></div></div>'
    + '<span class="mut" style="text-align:center">' + esc(s.tip) + '</span>'
    + '<div class="row"><button type="button" class="pill glass grow" data-act="cd-pause" id="cd-pause">' + (cd.paused ? 'Reprendre' : 'Pause') + '</button><button type="button" class="pill gold-btn grow" data-act="cd-next">' + (cd.i < STRETCHES.length - 1 ? 'Suivant' : 'Terminer') + '</button></div>';
  sheet(h, 1, 'full');
}

Object.assign(ACTIONS, {
  cooldown: () => startCooldown(),
  'cd-next': () => { if (cd) next(); },
  'cd-pause': () => {
    if (!cd) return;
    if (cd.paused) { cd.end += Date.now() - cd.paused; cd.paused = 0; } else cd.paused = Date.now();
    const b = $('cd-pause'); if (b) b.textContent = cd.paused ? 'Reprendre' : 'Pause';
  },
});
