// Personnages en 3D (essai v69) : un mannequin gris fait de formes lisses, éclairé, qui rejoue les positions d'anim.js.
// Three.js (licence MIT) est rangé dans js/lib et chargé seulement quand un exercice en 3D s'affiche : tout marche hors ligne.
// Une seule zone de dessin WebGL sert à tout : on dessine chaque image puis on la recopie dans le <canvas> de la page.
// Cadre de 96 px ou plus = personnage qui bouge ; vignette (classe still ou plus petite) = une image fixe.
import { figData } from './anim.js';

let T = null, R = null, scene, cam, man, eqGroup, shadow, ground;
let loading = null, failed = false;
const LIVE = new Set();
const SH_W = 3.5, HIP_W = 1.75;

function load() {
  if (loading) return loading;
  loading = import('./lib/three.module.min.js').then((m) => { T = m; build(); }).catch((e) => { failed = true; console.warn('3D indisponible', e); });
  return loading;
}

// ---------- Formes ----------
let MAT;
function lathe(pts) { return new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), 28); }
const GEO = {};
function geos() {
  GEO.ua = lathe([[0, -1.9], [1.2, -1.45], [1.95, -0.4], [2.05, 1], [1.85, 3], [1.78, 5.5], [1.5, 8], [1.3, 9.5], [0.9, 10.4], [0, 10.8]]);
  GEO.fa = lathe([[0, -1.2], [1.1, -0.8], [1.45, 0.5], [1.7, 2.5], [1.45, 5.5], [1.05, 9], [0.7, 9.8], [0, 10]]);
  GEO.th = lathe([[0, -2.6], [1.8, -2.1], [2.9, -0.6], [3.15, 1.5], [3, 4.5], [2.6, 8], [2, 11], [1.6, 12.4], [0, 13]]);
  GEO.sh = lathe([[0, -1.4], [1.4, -0.9], [1.85, 0.8], [2.15, 3.2], [1.85, 6], [1.3, 9.5], [1, 11.6], [0, 12.4]]);
  GEO.foot = lathe([[0, -0.9], [0.9, -0.45], [1, 1], [0.95, 2.6], [0.6, 3.6], [0, 3.9]]);
  GEO.ball = new T.SphereGeometry(1, 28, 20);
}
function ball(sx, sy, sz, mat) { const m = new T.Mesh(GEO.ball, mat || MAT.body); m.scale.set(sx, sy, sz); return m; }

// Le mannequin : buste (groupe orienté de la hanche vers les épaules), membres posés à chaque image.
function makeMan() {
  const g = new T.Group();
  const torso = new T.Group();
  const add = (m, x, y, z, tag) => { m.position.set(x, y, z); if (tag) m.userData.mus = tag; torso.add(m); return m; };
  add(ball(2.9, 3, 3.4), -0.2, 1.6, 0);
  add(ball(2.5, 5, 2.95), 0.1, 7, 0);
  add(ball(3.3, 5.6, 3.9), 0.2, 12.2, 0);
  add(ball(1.3, 2.3, 2.05), 2.45, 13, 1.95, 'chest'); add(ball(1.3, 2.3, 2.05), 2.45, 13, -1.95, 'chest');
  add(ball(1.05, 4.4, 2), 1.85, 6.6, 0, 'abs');
  add(ball(1.4, 4.4, 1.6), -1.6, 11, 2.6, 'back'); add(ball(1.4, 4.4, 1.6), -1.6, 11, -2.6, 'back');
  add(ball(1.6, 1.6, 3), -0.6, 16.2, 0, 'back');
  add(ball(1.9, 2.1, 1.8), -1.9, 1, 1.5, 'glute'); add(ball(1.9, 2.1, 1.8), -1.9, 1, -1.5, 'glute');
  g.add(torso);
  const part = (geo, tag) => { const m = new T.Mesh(geo, MAT.body); m.userData.mus = tag; g.add(m); return m; };
  const P = { torso, neck: part(GEO.ua, 'neck'), head: ball(2.3, 2.85, 2.2), parts: [] };
  g.add(P.head);
  for (const s of [1, 2]) {
    P['ua' + s] = part(GEO.ua, 'ua'); P['fa' + s] = part(GEO.fa, 'fa'); P['th' + s] = part(GEO.th, 'th'); P['sh' + s] = part(GEO.sh, 'calf'); P['ft' + s] = part(GEO.foot);
    P['dl' + s] = ball(2.15, 2.15, 2.15); P['dl' + s].userData.mus = 'shoulder'; g.add(P['dl' + s]);
    P['el' + s] = ball(1.3, 1.3, 1.3); P['kn' + s] = ball(1.75, 1.75, 1.75); P['an' + s] = ball(1.05, 1.05, 1.05); P['hd' + s] = ball(0.8, 1.45, 1.05);
    for (const k of ['el', 'kn', 'an', 'hd']) g.add(P[k + s]);
  }
  P.neck.scale.set(0.82, 0.32, 0.82);
  g.userData.P = P;
  return g;
}

function build() {
  R = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setClearColor(0x000000, 0);
  scene = new T.Scene();
  cam = new T.PerspectiveCamera(28, 100 / 64, 1, 2000);
  MAT = {
    body: new T.MeshStandardMaterial({ color: 0xC3C6CE, roughness: 0.52, metalness: 0.04 }),
    mus: new T.MeshStandardMaterial({ color: 0x8C6EFF, roughness: 0.42, metalness: 0.04, emissive: 0x3A1FA8, emissiveIntensity: 0.35 }),
    metal: new T.MeshStandardMaterial({ color: 0x5A5766, roughness: 0.35, metalness: 0.6 }),
    pad: new T.MeshStandardMaterial({ color: 0x3B3650, roughness: 0.8 }),
  };
  geos();
  scene.add(new T.HemisphereLight(0xffffff, 0x3a3848, 1.05));
  const key = new T.DirectionalLight(0xffffff, 1.7); key.position.set(-30, 70, 55); scene.add(key);
  const rim = new T.DirectionalLight(0xB4A6FF, 0.9); rim.position.set(25, 30, -70); scene.add(rim);
  // Sol : un halo sombre qui s'efface sur les bords, et une ombre douce sous le corps.
  const tex = (a0, a1) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, a0); g.addColorStop(1, a1); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  };
  ground = new T.Mesh(new T.PlaneGeometry(130, 70), new T.MeshBasicMaterial({ map: tex('rgba(124,92,245,0.16)', 'rgba(124,92,245,0)'), transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  shadow = new T.Mesh(new T.PlaneGeometry(34, 12), new T.MeshBasicMaterial({ map: tex('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; scene.add(shadow);
  man = makeMan(); scene.add(man);
  eqGroup = new T.Group(); scene.add(eqGroup);
}

// ---------- Matériel ----------
const EQ = {};
function eqOf(name, d) {
  if (EQ[name]) return EQ[name];
  const g = new T.Group(), G = d.G;
  const bar = (x1, y1, z1, x2, y2, z2, r, mat) => {
    const a = new T.Vector3(x1, y1, z1), b = new T.Vector3(x2, y2, z2), len = a.distanceTo(b);
    const m = new T.Mesh(new T.CylinderGeometry(r, r, len, 16), mat || MAT.metal);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(m);
  };
  for (const e of d.eq) {
    if (e[0] === 'bars') {
      const y = G - e[3];
      for (const z of [SH_W + 0.4, -SH_W - 0.4]) { bar(e[1], y, z, e[2], y, z, 0.6); bar(e[1] + 1.5, y, z, e[1] + 1.5, 0, z, 0.55); bar(e[2] - 1.5, y, z, e[2] - 1.5, 0, z, 0.55); }
    } else if (e[0] === 'bench') {
      const y = G - e[3];
      const top = new T.Mesh(new T.BoxGeometry(e[2] - e[1], 2.4, 9), MAT.pad); top.position.set((e[1] + e[2]) / 2, y - 1.2, 0); g.add(top);
      for (const x of [e[1] + 3, e[2] - 3]) bar(x, y - 2, 0, x, 0, 0, 0.7);
    } else if (e[0] === 'bar') {
      bar(e[1] - 13, G - e[2], 0, e[1] + 13, G - e[2], 0, 0.55);
    } else if (e[0] === 'wall') {
      const w = new T.Mesh(new T.BoxGeometry(1.2, 60, 30), MAT.pad); w.position.set(e[1], 30, 0); g.add(w);
    }
  }
  return (EQ[name] = g);
}

// ---------- Une position ----------
const V = (p, z, G) => new T.Vector3(p[0], G - p[1], z);
const UP = () => new T.Vector3(0, 1, 0);
function seg(m, a, b) { m.position.copy(a); m.quaternion.setFromUnitVectors(UP(), b.clone().sub(a).normalize()); }
function poseAt(d, ph) {
  const tl = d.tl;
  let i = 0;
  while (i < tl.length - 2 && tl[i + 1].k <= ph) i++;
  const a = tl[i], b = tl[i + 1], u = b.k > a.k ? Math.min(1, Math.max(0, (ph - a.k) / (b.k - a.k))) : 0;
  const J = {};
  for (const k of Object.keys(a.J)) J[k] = [a.J[k][0] + (b.J[k][0] - a.J[k][0]) * u, a.J[k][1] + (b.J[k][1] - a.J[k][1]) * u];
  return J;
}
function setPose(d, J) {
  const P = man.userData.P, G = d.G;
  const hip = V(J.hip, 0, G), sh = V(J.sh, 0, G);
  const dir = sh.clone().sub(hip);
  P.torso.position.copy(hip);
  P.torso.rotation.set(0, 0, Math.atan2(dir.y, dir.x) - Math.PI / 2);
  P.torso.scale.set(d.mir ? -1 : 1, dir.length() / 17, 1);
  const neck = V(J.neck, 0, G), head = V(J.head, 0, G);
  seg(P.neck, sh.clone().add(neck.clone().sub(sh).multiplyScalar(-0.6)), neck);
  P.head.position.copy(head); P.head.quaternion.setFromUnitVectors(UP(), head.clone().sub(neck).normalize());
  for (const s of [1, 2]) {
    const z = s === 1 ? 1 : -1;
    const S = V(J.sh, z * SH_W, G), E = V(J['e' + s], z * SH_W, G), H = V(J['h' + s], z * SH_W, G);
    const Hp = V(J.hip, z * HIP_W, G), K = V(J['k' + s], z * HIP_W, G), F = V(J['f' + s], z * HIP_W, G), Tt = V(J['t' + s], z * HIP_W, G);
    seg(P['ua' + s], S, E); seg(P['fa' + s], E, H); seg(P['th' + s], Hp, K); seg(P['sh' + s], K, F); seg(P['ft' + s], F, Tt);
    P['ft' + s].scale.set(0.7, 1, 1.2);
    P['dl' + s].position.copy(S); P['el' + s].position.copy(E); P['kn' + s].position.copy(K); P['an' + s].position.copy(F);
    const hd = H.clone().sub(E).normalize();
    P['hd' + s].position.copy(H).add(hd.clone().multiplyScalar(0.7)); P['hd' + s].quaternion.setFromUnitVectors(UP(), hd);
  }
  const mx = (J.hip[0] + J.sh[0]) / 2, low = Math.max(J.hip[1], J.sh[1]);
  shadow.position.x = mx; shadow.material.opacity = Math.max(0.25, 1 - (G - low) / 40);
}
// Cadre : la caméra regarde le mouvement en entier, un peu de face et d'en haut.
function frameCam(d, aspect) {
  const G = d.G, box = new T.Box3();
  for (const f of d.tl) for (const p of Object.values(f.J)) { box.expandByPoint(V(p, SH_W + 2, G)); box.expandByPoint(V(p, -SH_W - 2, G)); }
  box.expandByPoint(new T.Vector3(box.min.x, 0, 0));
  const eqb = new T.Box3().setFromObject(eqOf(d.name, d)); if (!eqb.isEmpty()) box.union(eqb);
  const c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
  c.y += sz.y * 0.04;
  const fov = (cam.fov * Math.PI) / 180, need = Math.max(sz.y / 2 + 3, (sz.x / 2 + 3) / aspect);
  const dist = (need * 1.22) / Math.tan(fov / 2) + sz.z / 2;
  const D = new T.Vector3(0.34, 0.26, 1).normalize();
  cam.aspect = aspect; cam.position.copy(c).add(D.multiplyScalar(dist)); cam.lookAt(c); cam.updateProjectionMatrix();
  ground.position.set(c.x, 0, 0);
}
const DATA = {};
function dataOf(name) {
  if (!DATA[name]) { DATA[name] = figData(name); DATA[name].name = name; }
  return DATA[name];
}
function prepare(name) {
  const d = dataOf(name);
  eqGroup.clear(); eqGroup.add(eqOf(name, d));
  const on = new Set(d.m);
  man.traverse((o) => { if (o.isMesh) o.material = o.userData.mus && on.has(o.userData.mus) ? MAT.mus : MAT.body; });
  return d;
}
function draw(cv, name, ph) {
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const size = R.getSize(new T.Vector2());
  if (size.x !== W || size.y !== H) R.setSize(W, H, false);
  const d = prepare(name);
  if (cv._a !== w / h) { cv._a = w / h; }
  frameCam(d, w / h);
  setPose(d, poseAt(d, ph));
  R.render(scene, cam);
  const x = cv.getContext('2d'); x.clearRect(0, 0, W, H); x.drawImage(R.domElement, 0, 0);
  return true;
}

// ---------- Dans la page ----------
let raf = 0;
function loop(now) {
  raf = 0;
  for (const cv of [...LIVE]) {
    if (!cv.isConnected) { LIVE.delete(cv); continue; }
    const r = cv.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || !r.width) continue;
    const d = dataOf(cv.dataset.f3);
    draw(cv, cv.dataset.f3, ((now / 1000) % d.dur) / d.dur);
  }
  if (LIVE.size) raf = requestAnimationFrame(loop);
}
function upgrade(svg) {
  const cv = document.createElement('canvas');
  cv.setAttribute('class', svg.getAttribute('class') + ' f3d');
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', svg.getAttribute('aria-label') || '');
  cv.dataset.f3 = svg.dataset.f3;
  svg.replaceWith(cv);
  requestAnimationFrame(() => {
    if (!cv.isConnected) return;
    if (cv.clientWidth >= 96 && !cv.classList.contains('still')) { LIVE.add(cv); if (!raf) raf = requestAnimationFrame(loop); }
    else if (!draw(cv, cv.dataset.f3, 0)) setTimeout(() => cv.isConnected && draw(cv, cv.dataset.f3, 0), 400);
  });
}
function scan(root) {
  if (failed || !root.querySelectorAll) return;
  const list = root.matches && root.matches('svg[data-f3]') ? [root] : [...root.querySelectorAll('svg[data-f3]')];
  if (!list.length) return;
  load().then(() => { if (!failed) list.forEach((s) => s.isConnected && upgrade(s)); });
}
export function init3d() {
  scan(document.body);
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n); }).observe(document.body, { childList: true, subtree: true });
}
