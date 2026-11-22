// Son de l'app : bip de fin de repos, d'échauffement et de chrono.
// Sur iPhone, trois pièges :
// 1. le son ne peut démarrer qu'après un toucher de l'écran : on le « débloque » au tout premier toucher ;
// 2. le bouton silencieux coupe le son des pages web, sauf si on dit que c'est un son de lecture
//    (navigator.audioSession.type = 'playback', iOS 17 et plus) ;
// 3. quand l'app passe en arrière-plan, le son se met en pause : on le relance à chaque toucher et avant chaque bip.
import { state } from './store.js';

let ctx = null;

// Type de son demandé à l'iPhone. 'playback' passe outre le bouton silencieux (mais peut couper la musique) ;
// 'auto' laisse l'iPhone décider (le bouton silencieux coupe alors le bip).
function setSession() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = state.settings.soundSilent === false ? 'auto' : 'playback';
  } catch (e) { /* non disponible */ }
}

export function wakeAudio() {
  try {
    setSession();
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // Un son vide joué pendant le toucher : c'est ce qui débloque vraiment le son sur iPhone.
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    }
    if (ctx.state !== 'running') ctx.resume();
  } catch (e) { /* pas de son disponible */ }
}

function play() {
  // Trois notes courtes, la dernière plus aiguë : on l'entend même avec de la musique.
  const notes = [[0, 880], [0.22, 880], [0.44, 1320]];
  const t0 = ctx.currentTime + 0.03;
  for (const [d, f] of notes) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18);
    o.start(t0 + d); o.stop(t0 + d + 0.2);
  }
}

export function beep(force) {
  if (!force && state.settings.sound === false) return;
  try {
    if (!ctx) wakeAudio();
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume().then(play, () => {});
    else play();
  } catch (e) { /* pas de son disponible */ }
  try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) { /* pas de vibreur */ }
}

// Le son se débloque au premier toucher, et se relance à chaque toucher s'il s'était mis en pause.
export function initSound() {
  setSession();
  const wake = () => { if (!ctx || ctx.state !== 'running') wakeAudio(); };
  window.addEventListener('pointerdown', wake, { passive: true, capture: true });
  window.addEventListener('touchend', wake, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });
}
