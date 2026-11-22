// Compteur de pompes par la caméra, fait maison et hors ligne (rien n'est envoyé, aucune image gardée).
// Principe : le téléphone est posé à plat sous la poitrine, caméra de devant vers le haut.
// Quand tu descends, ta poitrine cache la lumière : l'image s'assombrit. Quand tu remontes, elle s'éclaircit.
// Une répétition = une descente puis une remontée nette.
import { state, save, exoName } from './store.js';
import { $, esc, ACTIONS, ICON, sheet, closeSheet, toast } from './ui.js';
import { render } from './app.js';

export const camOk = (name) => /push ?up/i.test(name) && !/handstand/i.test(name);

let cam = null;

function speak(text) {
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.rate = 1.15; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { /* pas de voix */ }
}

function curSet() {
  const a = state.active;
  const ex = a && a.exercises[a.idx];
  return ex ? { ex, s: ex.sets[a.setIdx || 0] } : null;
}

export function sheetCam() {
  const c = curSet();
  if (!c) return;
  const h = '<div class="col" style="gap:4px"><span class="label violet">Compteur caméra · essai</span><h1 class="h1">' + esc(exoName(c.ex.name)) + '</h1><span class="small mut">Téléphone à plat sous ta poitrine, écran vers le haut.</span></div>'
    + '<div class="camview"><video id="cam-v" playsinline muted autoplay></video><div class="camcount"><span class="num" id="cam-n">0</span><span class="small" id="cam-st">Préparation…</span></div>'
    + '<div class="camlevel"><i id="cam-lv"></i></div></div>'
    + '<div class="row" style="gap:10px"><button type="button" class="stepbtn sm" data-act="cam-fix" data-d="-1" aria-label="Une de moins">' + ICON.minus + '</button>'
    + '<span class="small mut grow" style="text-align:center">Corrige si le compteur se trompe</span>'
    + '<button type="button" class="stepbtn sm" data-act="cam-fix" data-d="1" aria-label="Une de plus">' + ICON.plus + '</button></div>'
    + '<button type="button" class="pill gold-btn wide big" data-act="cam-keep" id="cam-keep">Garder 0 répétition</button>'
    + '<button type="button" class="pill glass wide" data-act="cam-cancel">Annuler</button>'
    + '<div class="col" style="gap:6px"><span class="label">Comment le poser</span>'
    + '<span class="small mut">Pose le téléphone à plat par terre, sous ta poitrine, écran vers le haut. Tu as 5 secondes pour te mettre en place. À chaque descente, ta poitrine cache la lumière : c’est ce que l’app compte. Il faut une pièce éclairée. Aucune image n’est gardée ni envoyée.</span></div>';
  sheet(h, 1, 'full');
  start();
}

async function start() {
  stop();
  cam = { n: 0, state: 'up', vals: [], ema: null, last: 0, t0: Date.now() + 5000, said: 5, stream: null, raf: 0 };
  const me = cam;
  try {
    me.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false });
  } catch (e) {
    const st = $('cam-st'); if (st) st.textContent = 'Caméra refusée : autorise-la pour Ascension dans les réglages.';
    return;
  }
  if (cam !== me) { me.stream.getTracks().forEach((t) => t.stop()); return; }
  const v = $('cam-v');
  if (!v) { stop(); return; }
  v.srcObject = me.stream;
  try { await v.play(); } catch (e) { /* lecture automatique */ }
  me.cv = document.createElement('canvas'); me.cv.width = 32; me.cv.height = 24;
  me.ctx = me.cv.getContext('2d', { willReadFrequently: true });
  loop();
}

function loop() {
  const me = cam;
  if (!me) return;
  const v = $('cam-v');
  if (!v) { stop(); return; } // la fenêtre a été fermée
  me.raf = requestAnimationFrame(loop);
  const now = Date.now();
  if (now - (me.tick || 0) < 66) return; // environ 15 mesures par seconde
  me.tick = now;
  const st = $('cam-st');
  if (now < me.t0) {
    const left = Math.ceil((me.t0 - now) / 1000);
    if (left !== me.said) { me.said = left; if (left <= 3) speak(String(left)); }
    if (st) st.textContent = 'Mets-toi en place : ' + left;
    return;
  }
  if (!me.go) { me.go = true; speak('C’est parti'); }
  if (!v.videoWidth) return;
  me.ctx.drawImage(v, 0, 0, 32, 24);
  const d = me.ctx.getImageData(0, 0, 32, 24).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  const L = sum / (d.length / 4);
  me.ema = me.ema === null ? L : me.ema * 0.6 + L * 0.4;
  me.vals.push([now, me.ema]);
  while (me.vals.length && now - me.vals[0][0] > 4000) me.vals.shift();
  let lo = 255, hi = 0;
  for (const [, x] of me.vals) { if (x < lo) lo = x; if (x > hi) hi = x; }
  const range = hi - lo;
  const pos = range > 0 ? (me.ema - lo) / range : 1;
  const lv = $('cam-lv'); if (lv) lv.style.height = Math.round(Math.max(0.04, pos) * 100) + '%';
  if (range < 12) { if (st) st.textContent = me.n ? 'Continue' : 'Descends, l’app attend ta première pompe'; return; }
  if (me.state === 'up' && pos < 0.3) { me.state = 'down'; if (st) st.textContent = 'Remonte'; }
  else if (me.state === 'down' && pos > 0.7 && now - me.last > 450) {
    me.state = 'up'; me.last = now; me.n++;
    try { navigator.vibrate && navigator.vibrate(25); } catch (e) { /* pas de vibreur */ }
    speak(String(me.n));
    show();
    if (st) st.textContent = 'Descends';
  }
}

function show() {
  if (!cam) return;
  const n = $('cam-n'); if (n) { n.textContent = cam.n; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
  const k = $('cam-keep'); if (k) k.textContent = 'Garder ' + cam.n + ' répétition' + (cam.n > 1 ? 's' : '');
}

function stop() {
  if (!cam) return;
  cancelAnimationFrame(cam.raf);
  if (cam.stream) cam.stream.getTracks().forEach((t) => t.stop());
  cam = null;
}

Object.assign(ACTIONS, {
  cam: () => sheetCam(),
  'cam-fix': (el) => { if (!cam) return; cam.n = Math.max(0, cam.n + Number(el.dataset.d)); show(); },
  'cam-keep': () => {
    const c = curSet();
    const n = cam ? cam.n : 0;
    stop();
    if (c && c.s && n > 0) { c.s.r = n; save(); toast(n + ' répétitions comptées : valide la série'); }
    closeSheet(); render();
  },
  'cam-cancel': () => { stop(); closeSheet(); },
});
