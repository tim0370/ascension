// Le coach de l'accueil : un petit bonhomme (tête violette, bandeau de sport) toujours en haut de l'accueil.
// On peut lui poser une question (écrite ou toute prête) : la discussion s'affiche sous lui, dans l'accueil,
// et les cartes de l'accueil reviennent avec « Fermer ». Les réponses viennent du coach (coach.js), sans IA ni internet.
// États du bonhomme (classe sur .masc) : repos (il flotte, cligne, regarde autour), think (il réfléchit),
// talk (il écrit sa réponse), happy (séance faite, ou on le touche).
import { answerFor, answerText, qLabel, suggest } from './coach.js';
import { resetCtx } from './cerveau.js';
import { state } from './store.js';
import { esc, ACTIONS, ICON } from './ui.js';

const DAY = 864e5;
const day0 = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function mascotSvg() {
  return '<svg class="mascsvg" viewBox="0 0 140 132" aria-hidden="true">'
    + '<defs><radialGradient id="mHead" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#B7A4FF"/><stop offset=".45" stop-color="#7E5FF2"/><stop offset="1" stop-color="#4A2FB6"/></radialGradient>'
    + '<linearGradient id="mBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCD3FF"/></linearGradient>'
    + '<clipPath id="mClip"><circle cx="70" cy="64" r="46"/></clipPath></defs>'
    + '<ellipse class="mshadow" cx="70" cy="124" rx="30" ry="4.5"/>'
    + '<g class="mbody">'
    // bouts du bandeau, noués sur le côté (ils flottent)
    + '<g class="mtails"><path d="M110 40 C122 38 128 46 133 54 C124 52 118 50 111 48 Z" fill="url(#mBand)"/><path d="M110 44 C120 50 122 60 124 70 C116 62 112 56 108 50 Z" fill="#CFC4FF"/></g>'
    + '<circle cx="70" cy="64" r="46" fill="url(#mHead)"/>'
    + '<ellipse cx="54" cy="40" rx="16" ry="9" fill="#fff" opacity=".16" transform="rotate(-24 54 40)"/>'
    + '<g clip-path="url(#mClip)"><path d="M20 36 Q70 24 120 36 L120 49 Q70 37 20 49 Z" fill="url(#mBand)"/><path d="M20 41.6 Q70 29.8 120 41.6 L120 43.6 Q70 31.8 20 43.6 Z" fill="#7E5FF2" opacity=".55"/></g>'
    + '<g class="meyes"><rect class="meye" x="51" y="58" width="10" height="20" rx="5"/><rect class="meye" x="79" y="58" width="10" height="20" rx="5"/>'
    + '<path class="mhappy" d="M50 70 Q56 61 62 70 M78 70 Q84 61 90 70"/></g>'
    + '</g>'
    + '<g class="mdots"><circle cx="118" cy="16" r="3.2"/><circle cx="128" cy="9" r="2.4"/><circle cx="135" cy="3.5" r="1.7"/></g>'
    + '</svg>';
}

// ---------- La discussion de l'accueil ----------
let chat = [];          // { me, text } ou { text: [..], btns }
let last = 0;           // dernière activité (la discussion s'efface après 15 minutes sans rien)
let busy = false;
const chatting = () => chat.length > 0;

function context() {
  const t0 = day0(Date.now());
  if (state.active) return { line: 'Ta séance est en cours. On la reprend ?', happy: false };
  const done = state.workouts.some((w) => w.start >= t0 && !w.quick && !w.boss);
  if (done) return { line: 'Séance faite aujourd’hui. Bien joué.', happy: true };
  if (!state.workouts.length) return { line: 'Je suis ton coach. Demande-moi par quoi commencer.', happy: false };
  return { line: 'Qu’est-ce qu’on fait aujourd’hui ?', happy: false };
}
const hello = () => { const h = new Date().getHours(); return h < 5 || h >= 18 ? 'Bonsoir' : 'Salut'; };

function bubbleHtml(m) {
  if (m.me) return '<div class="cb me">' + esc(m.text) + '</div>';
  const b = m.btns ? [].concat(m.btns).join('') : '';
  return '<div class="cb mcb">' + m.text.map((p) => '<p>' + esc(p) + '</p>').join('') + (b ? '<div class="row wrap cbbtns">' + b + '</div>' : '') + '</div>';
}

// Le bloc du haut de l'accueil. rest = le HTML des cartes, caché pendant la discussion.
export function homeCoach(rest) {
  if (chatting() && Date.now() - last > 15 * 60e3) { chat = []; resetCtx(); }
  const c = context(), on = chatting();
  let sg = [];
  try { sg = suggest(); } catch (e) { sg = ['today', 'short', 'muscle']; }
  return '<section class="mhero' + (on ? ' on' : '') + '" id="mhero">'
    + '<button type="button" class="masc' + (c.happy ? ' happy' : '') + '" id="masc" data-act="masc-poke" aria-label="Le coach : touche-moi pour me poser une question">' + mascotSvg() + '</button>'
    + '<div class="mgreet"><span class="mhi">' + hello() + '</span><span class="msub">' + esc(c.line) + '</span></div>'
    + '<div class="chat hchat" id="hchat" aria-live="polite">' + chat.map(bubbleHtml).join('') + '</div>'
    + '<form class="askrow mask" id="hform"><input class="textin" id="hq" placeholder="Pose-moi une question…" aria-label="Pose une question au coach" autocomplete="off" enterkeyhint="send">'
    + '<button type="submit" class="pill gold-btn" aria-label="Envoyer">' + ICON.up + '</button></form>'
    + '<div class="mchips">' + sg.map((k) => '<button type="button" class="pill sm sugq" data-act="hask" data-q="' + k + '">' + esc(qLabel(k)) + '</button>').join('') + '</div>'
    + '<button type="button" class="pill glass mclose" data-act="hclose">Fermer la discussion</button>'
    + '</section><div id="homerest"' + (on ? ' hidden' : '') + '>' + rest + '</div>';
}

const $ = (id) => document.getElementById(id);
function mood(k) {
  const m = $('masc');
  if (!m) return;
  m.classList.remove('think', 'talk', 'poke');
  if (k) { void m.offsetWidth; m.classList.add(k); }
}
function setOn(on) {
  const h = $('mhero'), r = $('homerest');
  if (h) h.classList.toggle('on', on);
  if (r) r.hidden = on;
}
function scrollEnd() {
  const f = $('hform');
  if (!f) return;
  const b = f.getBoundingClientRect(), vh = window.innerHeight;
  if (b.bottom > vh - 110) window.scrollBy({ top: b.bottom - vh + 120, behavior: 'smooth' });
}

// Le coach écrit sa réponse lettre par lettre (un toucher sur la bulle l'écrit d'un coup).
function write(a) {
  const box = $('hchat');
  if (!box) { busy = false; return; }
  const el = document.createElement('div');
  el.className = 'cb mcb';
  const ps = a.text.map(() => { const p = document.createElement('p'); el.appendChild(p); return p; });
  box.appendChild(el);
  mood('talk');
  const full = a.text.join('\n');
  let i = 0, tick = 0;
  const show = (n) => { let k = n; a.text.forEach((t, j) => { ps[j].textContent = t.slice(0, Math.max(0, k)); k -= t.length + 1; }); };
  const end = () => {
    clearInterval(timer);
    show(full.length);
    const b = a.btns ? [].concat(a.btns).join('') : '';
    if (b) el.insertAdjacentHTML('beforeend', '<div class="row wrap cbbtns appear">' + b + '</div>');
    el.onclick = null;
    mood('');
    busy = false;
    scrollEnd();
  };
  const timer = setInterval(() => {
    i += 3;
    show(i);
    if (++tick % 8 === 0) scrollEnd();
    if (i >= full.length) end();
  }, 18);
  el.onclick = end;
}

function respond(meText, compute) {
  if (busy) return;
  busy = true;
  last = Date.now();
  chat.push({ me: true, text: meText });
  setOn(true);
  const box = $('hchat');
  if (box) { box.insertAdjacentHTML('beforeend', bubbleHtml(chat[chat.length - 1]) + '<div class="cb typing mtyping"><i></i><i></i><i></i></div>'); }
  mood('think');
  scrollEnd();
  let a;
  try { a = compute(); } catch (e) { console.error(e); a = { text: ['Je n’ai pas réussi à calculer ça. Pose ta question autrement ?'] }; }
  chat.push(a);
  const wait = 650 + Math.min(650, a.text.join(' ').length * 1.5);
  setTimeout(() => {
    const t = document.querySelector('#hchat .mtyping');
    if (t) t.remove();
    write(a);
  }, wait);
}

export function homeAsk(id, arg, label) {
  if (['quick', 'prog', 'checkin'].includes(id)) { ACTIONS[id]({ dataset: {} }); return; }
  respond(label || qLabel(id), () => answerFor(id, arg));
}
function homeText(text) { respond(text, () => answerText(text)); }

document.addEventListener('submit', (ev) => {
  if (ev.target.id !== 'hform') return;
  ev.preventDefault();
  const q = $('hq'), v = q ? q.value.trim() : '';
  if (!v || busy) return;
  q.value = '';
  q.blur();
  homeText(v);
});

// Les boutons des réponses du coach (« coach-ask ») parlent à la discussion ouverte : la fenêtre du coach, ou l'accueil.
const origAsk = ACTIONS['coach-ask'], origGo = ACTIONS['coach-go'];
Object.assign(ACTIONS, {
  hask: (el) => homeAsk(el.dataset.q, el.dataset.arg, el.dataset.l),
  'coach-ask': (el) => (!$('coachchat') && $('hchat') ? homeAsk(el.dataset.q, el.dataset.arg, el.dataset.l) : origAsk(el)),
  'coach-go': (el) => { if (!$('coachchat')) { chat = []; resetCtx(); } origGo(el); },
  hclose: () => { chat = []; resetCtx(); busy = false; const b = $('hchat'); if (b) b.innerHTML = ''; setOn(false); mood(''); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  'masc-poke': () => { mood('poke'); setTimeout(() => { const m = $('masc'); if (m) m.classList.remove('poke'); }, 900); const q = $('hq'); if (q && !busy) q.focus({ preventScroll: true }); },
});
