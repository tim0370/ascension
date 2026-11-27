// Bouton rond en bas au milieu (v59, centré en v60) : un toucher ouvre la séance ;
// garder le doigt dessus ouvre un éventail en demi-cercle, on glisse sur un choix et on lâche pour y aller.
import { ICON, buzz } from './ui.js';

const R = 135;        // distance entre le bouton et chaque choix
const HOLD = 200;     // temps d'appui avant l'éventail (ms)
const DEAD = 58;      // tout près du bouton : aucun choix (lâcher = annuler)
// Un simple toucher garde son effet (ouvrir la séance), avec une petite onde.

// items() : [{ kind: 'tab' | 'act', v, ic, t }], go(item) : y aller, tap() : simple toucher.
export function initFan({ items, go, tap }) {
  const fab = document.getElementById('fab');
  const fan = document.getElementById('fan');
  if (!fab || !fan) return;
  let timer = 0, open = false, sel = -1, list = [], c = { x: 0, y: 0 }, start = null, pid = null;

  // De 150° (à gauche) à 30° (à droite), en passant par le haut (90°).
  const angle = (i) => (list.length < 2 ? 90 : 150 - (120 * i) / (list.length - 1));

  function show() {
    open = true; sel = -1;
    list = items();
    const r = fab.getBoundingClientRect();
    c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    fan.innerHTML = '<div class="fanbg"></div><span class="fanhelp">Glisse sur un choix, puis lâche</span>' + list.map((it, i) => {
      const a = (angle(i) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
      const x = c.x + R * cos, y = c.y - R * sin;
      // L'étiquette est sous son rond, à l'intérieur de l'arc (place libre).
      const lx = x, ly = y + 34, kx = 50, ky = 0;
      return '<span class="fanit b' + (i % 5) + '" data-i="' + i + '" style="left:' + x + 'px;top:' + y + 'px;--dx:' + (c.x - x) + 'px;--dy:' + (c.y - y) + 'px;--bob:' + (i * 0.37).toFixed(2) + 's;transition-delay:' + i * 38 + 'ms">' + (ICON[it.ic] || '') + '</span>'
        + '<span class="fanlab" data-i="' + i + '" style="left:' + lx + 'px;top:' + ly + 'px;transform:translate(-' + kx + '%,-' + ky + '%)">' + it.t + '</span>';
    }).join('');
    // Les étiquettes du bord ne sortent pas de l'écran.
    fan.querySelectorAll('.fanlab').forEach((el) => {
      const b = el.getBoundingClientRect(), W = innerWidth;
      const dx = b.left < 8 ? 8 - b.left : b.right > W - 8 ? W - 8 - b.right : 0;
      if (dx) el.style.marginLeft = dx + 'px';
    });
    document.body.classList.add('fan-open');
    requestAnimationFrame(() => fan.classList.add('on'));
    buzz(8);
  }
  // v65 (bulles façon « Navigation tabs V20 ») : à la fermeture, la bulle choisie file vers le bouton,
  // les autres se rangent dedans, et une onde part du bouton.
  function hide(chosen) {
    open = false; sel = -1;
    if (chosen >= 0) {
      const b = fan.querySelector('.fanit[data-i="' + chosen + '"]');
      if (b) b.classList.add('go');
      ripple();
    }
    fan.classList.remove('on');
    document.body.classList.remove('fan-open');
    setTimeout(() => { if (!open) fan.innerHTML = ''; }, 320);
  }
  function ripple() {
    const r = fab.getBoundingClientRect(), w = document.createElement('span');
    w.className = 'fabripple';
    w.style.left = r.left + r.width / 2 + 'px'; w.style.top = r.top + r.height / 2 + 'px';
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 700);
  }
  function pick(x, y) {
    const dx = x - c.x, dy = c.y - y, d = Math.hypot(dx, dy);
    let i = -1;
    if (d > DEAD) {
      let a = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = à droite, 90 = en haut, 180 = à gauche
      if (a < -90) a += 360;
      if (a > -25 && a < 205) {
        let best = 1e9;
        list.forEach((_, k) => { const g = Math.abs(angle(k) - a); if (g < best) { best = g; i = k; } });
      }
    }
    if (i !== sel) {
      sel = i;
      fan.querySelectorAll('[data-i]').forEach((el) => el.classList.toggle('hl', +el.dataset.i === i));
      fan.classList.toggle('picking', i >= 0);
      if (i >= 0) buzz(6);
    }
  }

  fab.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    pid = e.pointerId; start = { x: e.clientX, y: e.clientY };
    try { fab.setPointerCapture(pid); } catch (err) { /* rien */ }
    fab.classList.add('press');
    clearTimeout(timer);
    timer = setTimeout(show, HOLD);
  });
  fab.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid || !start) return;
    // Le doigt part tout de suite vers les choix : pas besoin d'attendre.
    if (!open && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 14) { clearTimeout(timer); show(); }
    if (open) pick(e.clientX, e.clientY);
  });
  const end = (e, cancel) => {
    if (e.pointerId !== pid) return;
    pid = null; start = null;
    clearTimeout(timer);
    fab.classList.remove('press');
    if (!open) { if (!cancel) { ripple(); tap(); } return; }
    const it = list[sel], k = sel;
    hide(it && !cancel ? k : -1);
    if (it && !cancel) setTimeout(() => go(it), 160);
  };
  fab.addEventListener('pointerup', (e) => end(e, false));
  fab.addEventListener('pointercancel', (e) => end(e, true));
  // Au clavier (Entrée, Espace) : comme un toucher.
  fab.addEventListener('click', (e) => { if (e.detail === 0) tap(); });
  fab.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => { if (open && e.key === 'Escape') hide(); });
}
