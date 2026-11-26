// Bouton rond en bas à droite (v59) : un toucher ouvre le menu complet ;
// garder le doigt dessus ouvre un éventail de 5 choix, on glisse sur un choix et on lâche pour y aller.
import { ICON, buzz } from './ui.js';

const R = 148;        // distance entre le bouton et chaque choix
const HOLD = 200;     // temps d'appui avant l'éventail (ms)
const DEAD = 58;      // tout près du bouton : aucun choix (lâcher = annuler)

// items() : [{ kind: 'tab' | 'act', v, ic, t }], go(item) : y aller, menu() : menu complet.
export function initFan({ items, go, menu }) {
  const fab = document.getElementById('fab');
  const fan = document.getElementById('fan');
  if (!fab || !fan) return;
  let timer = 0, open = false, sel = -1, list = [], c = { x: 0, y: 0 }, start = null, pid = null;

  const angle = (i) => (list.length < 2 ? 90 : 90 + (90 * i) / (list.length - 1));

  function show() {
    open = true; sel = -1;
    list = items();
    const r = fab.getBoundingClientRect();
    c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    fan.innerHTML = '<div class="fanbg"></div><span class="fanhelp">Glisse sur un choix, puis lâche</span>' + list.map((it, i) => {
      const a = (angle(i) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
      const x = c.x + R * cos, y = c.y - R * sin;
      const lx = c.x + (R + 38) * cos, ly = c.y - (R + 38) * sin;
      // L'étiquette part vers l'extérieur de l'éventail (à gauche pour le choix de gauche, au-dessus pour celui du haut).
      const kx = 50 + 50 * -cos, ky = 50 + 50 * sin;
      return '<span class="fanit" data-i="' + i + '" style="left:' + x + 'px;top:' + y + 'px;--dx:' + (c.x - x) + 'px;--dy:' + (c.y - y) + 'px;transition-delay:' + i * 22 + 'ms">' + (ICON[it.ic] || '') + '</span>'
        + '<span class="fanlab" data-i="' + i + '" style="left:' + lx + 'px;top:' + ly + 'px;transform:translate(-' + kx + '%,-' + ky + '%)">' + it.t + '</span>';
    }).join('');
    document.body.classList.add('fan-open');
    requestAnimationFrame(() => fan.classList.add('on'));
    buzz(8);
  }
  function hide() {
    open = false; sel = -1;
    fan.classList.remove('on');
    document.body.classList.remove('fan-open');
    setTimeout(() => { if (!open) fan.innerHTML = ''; }, 200);
  }
  function pick(x, y) {
    const dx = x - c.x, dy = c.y - y, d = Math.hypot(dx, dy);
    let i = -1;
    if (d > DEAD) {
      let a = (Math.atan2(dy, dx) * 180) / Math.PI; // 90 = en haut, 180 = à gauche
      if (a < 0) a += 360;
      if (a > 60 && a < 215) {
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
    if (!open) { if (!cancel) menu(); return; }
    const it = list[sel];
    hide();
    if (it && !cancel) go(it);
  };
  fab.addEventListener('pointerup', (e) => end(e, false));
  fab.addEventListener('pointercancel', (e) => end(e, true));
  // Au clavier (Entrée, Espace) : le menu complet.
  fab.addEventListener('click', (e) => { if (e.detail === 0) menu(); });
  fab.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => { if (open && e.key === 'Escape') hide(); });
}
