// Son de l'app : bip de fin de repos, d'échauffement et de chrono.
// Sur iPhone, le son des pages web est capricieux :
// - il ne démarre qu'après un vrai toucher (un « clic », pas le simple appui) ;
// - le bouton silencieux coupe le son « Web Audio », mais pas un lecteur audio classique.
// On joue donc le bip avec un lecteur audio (<audio>) qu'on « débloque » au premier toucher,
// en le lançant une fois sans volume. Une fois débloqué, il peut sonner tout seul à la fin du repos.
// Si le lecteur refuse, on essaie Web Audio en secours.
// Réglage settings.soundSilent === false : bip discret (Web Audio, mélangé à la musique, coupé en silencieux).
import { state } from './store.js';

let player = null;      // lecteur audio du bip
let unlocked = false;   // lecteur débloqué par un toucher
let ctx = null;         // Web Audio, en secours
let lastErr = '';

const NOTES = [[0, 880], [0.22, 880], [0.44, 1320]];

// Fabrique le bip en fichier WAV (trois notes courtes), sans rien télécharger.
function wavUrl() {
  const rate = 22050, len = Math.round(rate * 0.7);
  const buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
  const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  txt(36, 'data'); v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const t = i / rate;
    let x = 0;
    for (const [d, f] of NOTES) {
      const u = t - d;
      if (u >= 0 && u < 0.18) {
        const env = Math.min(1, u / 0.01) * Math.min(1, (0.18 - u) / 0.04);
        x += Math.sin(2 * Math.PI * f * u) * env;
      }
    }
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x * 0.8)) * 32767, true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function discreet() { return state.settings.soundSilent === false; }

function setSession() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = discreet() ? 'ambient' : 'auto';
  } catch (e) { /* non disponible */ }
}

function getPlayer() {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    player.setAttribute('playsinline', '');
    player.src = wavUrl();
    player.load();
  }
  return player;
}

// Appelé pendant un toucher : débloque le lecteur et Web Audio.
export function wakeAudio() {
  setSession();
  try {
    const p = getPlayer();
    if (!unlocked) {
      p.muted = true;
      const r = p.play();
      // Si un vrai bip a été lancé entre-temps (muted remis à false), on ne l'arrête pas.
      const done = () => { if (p.muted) { p.pause(); p.currentTime = 0; p.muted = false; } };
      if (r && r.then) r.then(() => { unlocked = true; done(); }, (e) => { lastErr = e && e.name || 'refus'; p.muted = false; });
      else { unlocked = true; done(); }
    }
  } catch (e) { lastErr = e && e.name || 'erreur'; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && !ctx) {
      ctx = new AC();
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    }
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch (e) { /* pas de Web Audio */ }
}

function playWebAudio() {
  if (!ctx) return false;
  const go = () => {
    const t0 = ctx.currentTime + 0.03;
    for (const [d, f] of NOTES) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18);
      o.start(t0 + d); o.stop(t0 + d + 0.2);
    }
  };
  if (ctx.state !== 'running') ctx.resume().then(go, () => {}); else go();
  return true;
}

// Joue le bip. Renvoie une promesse qui dit comment il a été joué (pour le bouton de test).
export function beep(force) {
  if (!force && state.settings.sound === false) return Promise.resolve('coupé');
  try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) { /* pas de vibreur */ }
  if (discreet()) return Promise.resolve(playWebAudio() ? 'discret' : 'aucun');
  try {
    const p = getPlayer();
    p.muted = false; p.volume = 1;
    try { p.currentTime = 0; } catch (e) { /* pas encore prêt */ }
    const r = p.play();
    if (r && r.then) {
      return r.then(() => { unlocked = true; return 'lecteur'; }, (e) => {
        lastErr = e && e.name || 'refus';
        return playWebAudio() ? 'secours' : 'aucun';
      });
    }
    return Promise.resolve('lecteur');
  } catch (e) {
    lastErr = e && e.name || 'erreur';
    return Promise.resolve(playWebAudio() ? 'secours' : 'aucun');
  }
}

export function soundError() { return lastErr; }

// Débloque le son au premier vrai toucher (click et touchend comptent comme un geste sur iPhone).
export function initSound() {
  setSession();
  getPlayer();
  const wake = () => { if (!unlocked || (ctx && ctx.state !== 'running')) wakeAudio(); };
  window.addEventListener('touchend', wake, { passive: true, capture: true });
  window.addEventListener('click', wake, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });
}
