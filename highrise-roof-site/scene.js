// Three.js scenes: hero house (roof lifts as you scroll) and the roof layer explorer.
import * as THREE from "three";

const HR = window.HR;
const LIME = 0xcef79e;
const canWebGL = (() => {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
})();
if (!canWebGL) {
  document.documentElement.classList.add("no-webgl");
} else {
  initHero();
  initExplorer();
}

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  return r;
}

// Run a render loop only while the canvas is on screen and motion is allowed.
function loop(canvas, frame) {
  let visible = false, raf = 0, last = performance.now();
  const tick = (now) => {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    frame(dt, !HR.paused);
    if (visible) raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
  return start;
}

function stripeTexture(base, line, n, vertical = true) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.fillStyle = line;
  for (let i = 0; i < n; i++) {
    const p = (i / n) * 256;
    vertical ? g.fillRect(p, 0, 2, 256) : g.fillRect(0, p, 256, 2);
  }
  // grain
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1, Math.random() * 18);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------------- Hero ---------------- */
function initHero() {
  const canvas = document.getElementById("hero-canvas");
  const hero = canvas.parentElement;
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x222f30, 14, 34);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0x9fb6b4, 0x101616, 0.9));
  const moon = new THREE.DirectionalLight(0xdbe7ff, 1.6);
  moon.position.set(-6, 10, 8); scene.add(moon);
  const rim = new THREE.DirectionalLight(LIME, 0.35);
  rim.position.set(8, 4, -6); scene.add(rim);

  const house = new THREE.Group(); scene.add(house);
  const W = 6, H = 3.2, D = 4.6, PITCH = 2.3, OVER = 0.35;

  // Ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x172122, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // Walls: charred vertical cladding
  const clad = stripeTexture("#1e2425", "#0f1314", 22);
  clad.repeat.set(2, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: clad, roughness: 0.9, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallMat);
  body.position.y = H / 2; house.add(body);

  // Gable ends (triangles) as extruded shape
  const tri = new THREE.Shape();
  tri.moveTo(-W / 2, 0); tri.lineTo(0, PITCH); tri.lineTo(W / 2, 0); tri.lineTo(-W / 2, 0);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: D, bevelEnabled: false }), wallMat);
  gable.position.set(0, H, -D / 2); house.add(gable);

  // Warm glass wall on the front gable end
  const glow = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, emissive: 0xffa75e, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.3 });
  const glassGroup = new THREE.Group(); house.add(glassGroup);
  const paneW = 0.86, cols = 5;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 2; r++) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(paneW, 1.3), glow);
      pane.position.set((c - (cols - 1) / 2) * (paneW + 0.08), 0.85 + r * 1.42, D / 2 + 0.011);
      glassGroup.add(pane);
    }
  }
  const pane3 = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), glow);
  pane3.position.set(0, H + 0.62, D / 2 + 0.011); glassGroup.add(pane3);
  const inside = new THREE.PointLight(0xffa75e, 8, 9, 2);
  inside.position.set(0, 1.8, D / 2 + 1.2); house.add(inside);

  // Roof: two metal slopes with standing seams, in a group that lifts on scroll
  const roof = new THREE.Group(); house.add(roof);
  const ang = Math.atan2(PITCH, W / 2);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c3436, metalness: 0.75, roughness: 0.38 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x4a5558, metalness: 0.8, roughness: 0.3 });
  const eaveY = H - OVER * Math.tan(ang);
  [-1, 1].forEach((side) => {
    const slope = new THREE.Group();
    const ex = side * (W / 2 + OVER), len = Math.hypot(ex, H + PITCH - eaveY);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, D + OVER * 2), roofMat);
    slope.add(panel);
    for (let z = -D / 2 - OVER + 0.2; z <= D / 2 + OVER - 0.1; z += 0.34) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.03), seamMat);
      seam.position.set(0, 0.07, z); slope.add(seam);
    }
    slope.rotation.z = -side * ang;
    slope.position.set(ex / 2, (H + PITCH + eaveY) / 2 + 0.06, 0);
    roof.add(slope);
  });

  // Lime signal line along the ridge and rakes (drawn in on load)
  const pts = [
    new THREE.Vector3(-W / 2 - OVER, eaveY + 0.22, D / 2 + OVER),
    new THREE.Vector3(0, H + PITCH + 0.22, D / 2 + OVER),
    new THREE.Vector3(W / 2 + OVER, eaveY + 0.22, D / 2 + OVER)
  ];
  const ridgePts = [new THREE.Vector3(0, H + PITCH + 0.22, D / 2 + OVER), new THREE.Vector3(0, H + PITCH + 0.22, -D / 2 - OVER)];
  const lineMat = new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0.9 });
  const rake = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
  const ridge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ridgePts), lineMat);
  roof.add(rake, ridge);
  rake.geometry.setDrawRange(0, 0); ridge.geometry.setDrawRange(0, 0);

  // Side wing with flat roof
  const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 3.6), wallMat);
  wing.position.set(-W / 2 - 1.7, 1.2, -0.6); house.add(wing);
  const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 3.8), new THREE.MeshStandardMaterial({ color: 0xd7dcd9, roughness: 0.6 }));
  wingRoof.position.set(-W / 2 - 1.7, 2.46, -0.6); house.add(wingRoof);
  const wingWin = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.35), glow);
  wingWin.position.set(-W / 2 - 1.7, 1.5, -0.6 + 1.801); house.add(wingWin);

  // Pines
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1a2a24, roughness: 1 });
  [[-9, -6, 1.2], [-6.5, -8, 1.5], [7.5, -5, 1.3], [10, -9, 1.7], [4, -10, 1.4], [-12, -3, 1.1], [12, -2, 1]].forEach(([x, z, s]) => {
    const t = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3 - i * 0.3, 2.2, 7), pineMat);
      cone.position.y = 1.6 + i * 1.1; t.add(cone);
    }
    t.scale.setScalar(s * 1.6); t.position.set(x, 0, z); scene.add(t);
  });

  house.rotation.y = -0.55;
  let pointerX = 0, pointerY = 0, t = 0, draw = 0, lift = 0, dist = 23;
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    pointerX = (e.clientX - r.left) / r.width - 0.5; pointerY = (e.clientY - r.top) / r.height - 0.5;
  });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.1;
    // On wide screens push the house right so the headline has the left side to itself
    camera.setViewOffset(w, h, wide ? -w * 0.22 : 0, wide ? -h * 0.04 : h * 0.16, w, h);
    dist = wide ? 23 : 30;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  const start = loop(canvas, (dt, moving) => {
    if (moving) t += dt;
    const angle = -0.55 + Math.sin(t * 0.12) * 0.35;
    house.rotation.y += (angle + pointerX * 0.25 - house.rotation.y) * 0.05;
    camera.position.set(0, 5.6 - pointerY * 1.2, dist);
    camera.lookAt(0, 2.6, 0);
    // Scroll lifts the roof: a little nod to the name
    const rect = hero.getBoundingClientRect();
    const target = Math.min(Math.max(-rect.top / rect.height, 0), 1) * 1.6;
    lift += (target - lift) * (HR.paused ? 1 : 0.08);
    roof.position.y = lift;
    inside.intensity = 8 + lift * 10;
    draw = HR.paused ? 1 : Math.min(draw + dt * 0.5, 1);
    rake.geometry.setDrawRange(0, draw >= 0.5 ? 3 : draw > 0.05 ? 2 : 0);
    ridge.geometry.setDrawRange(0, draw >= 0.9 ? 2 : 0);
    renderer.render(scene, camera);
  });
  document.addEventListener("hr:motion", start);
  window.addEventListener("scroll", start, { passive: true });
}

/* ---------------- Explorer ---------------- */
function initExplorer() {
  const canvas = document.getElementById("explorer-canvas");
  const frame = document.getElementById("explorer-frame");
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 100);
  camera.position.set(0, 4.2, 9.5); camera.lookAt(0, 0.9, 0);

  scene.add(new THREE.HemisphereLight(0xe8f0ee, 0x1b2627, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 8, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(LIME, 0.5); fill.position.set(-6, 2, -4); scene.add(fill);

  const pivot = new THREE.Group(); scene.add(pivot);
  let stack = new THREE.Group(); pivot.add(stack);
  let layers = [];
  const SW = 4.2, SD = 3, SCALE = 1.7, GAP = 0.55;
  let rotY = -0.6, rotX = 0.18, targetY = rotY, explode = HR.explode, interacting = false;

  const deckTex = stripeTexture("#9c7a54", "#7a5c3d", 9, false);

  function buildLayer(l) {
    const g = new THREE.Group();
    const h = l.h * SCALE;
    const col = new THREE.Color(l.color);
    const mats = [];
    const mat = (c, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, transparent: true, ...extra }); mats.push(m); return m; };
    let baseH = h;
    if (l.kind === "shingles" || l.kind === "tiles" || l.kind === "plants" || l.kind === "ribs") baseH = h * 0.3;
    const base = new THREE.Mesh(new THREE.BoxGeometry(SW, baseH, SD), mat(col, l.kind === "deck" ? { map: deckTex, color: 0xffffff } : l.kind === "membrane" ? { roughness: 0.4 } : {}));
    base.position.y = baseH / 2; g.add(base);

    if (l.kind === "shingles" || l.kind === "tiles") {
      const rows = l.kind === "tiles" ? 7 : 8, per = l.kind === "tiles" ? 9 : 6;
      const tw = SW / per, td = SD / rows;
      const tm = mat(col, { roughness: l.kind === "tiles" ? 0.55 : 0.95 });
      const tm2 = mat(col.clone().offsetHSL(0, 0, -0.04), { roughness: 0.9 });
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < per + 1; i++) {
          const x = -SW / 2 + (i + (r % 2 ? 0 : 0.5)) * tw;
          if (x - tw / 2 < -SW / 2 - 0.01 || x + tw / 2 > SW / 2 + 0.01) continue;
          const tile = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.96, h * 0.5, td * 1.25), (i + r) % 3 ? tm : tm2);
          tile.position.set(x, baseH + h * 0.25 + r * 0.004, -SD / 2 + (r + 0.5) * td);
          tile.rotation.x = -0.06; g.add(tile);
        }
      }
    } else if (l.kind === "ribs") {
      const rm = mat(col, { metalness: 0.8, roughness: 0.3 });
      base.material.metalness = 0.8; base.material.roughness = 0.3;
      for (let x = -SW / 2 + 0.3; x < SW / 2; x += 0.45) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.9, SD), rm);
        rib.position.set(x, baseH + h * 0.45 - 0.02, 0); g.add(rib);
      }
    } else if (l.kind === "plants") {
      const greens = [0x6f9a4a, 0x86ad55, 0x5a8540, 0x9bbd63].map((c) => mat(c, { roughness: 0.9 }));
      const geo = new THREE.IcosahedronGeometry(0.11, 0);
      for (let i = 0; i < 160; i++) {
        const m = new THREE.Mesh(geo, greens[i % greens.length]);
        m.position.set((Math.random() - 0.5) * (SW - 0.2), baseH + 0.05 + Math.random() * h * 0.5, (Math.random() - 0.5) * (SD - 0.2));
        m.scale.setScalar(0.6 + Math.random() * 0.9); g.add(m);
      }
    }
    // Hairline edges
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(SW, baseH, SD)),
      new THREE.LineBasicMaterial({ color: 0x0e1415, transparent: true, opacity: 0.35 }));
    edges.position.y = baseH / 2; g.add(edges);
    return { group: g, h, mats, edges };
  }

  function build() {
    pivot.remove(stack);
    stack.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    stack = new THREE.Group(); pivot.add(stack);
    const sys = HR.systems[HR.system];
    // bottom first
    layers = sys.layers.slice().reverse().map(buildLayer);
    layers.forEach((L) => stack.add(L.group));
    const pitched = HR.system === "shingle" || HR.system === "metal" || HR.system === "slate";
    stack.rotation.x = pitched ? 0.32 : 0;
    place(true);
    highlight();
  }
  function place() {
    let y = 0;
    layers.forEach((L, i) => { L.group.position.y = y; y += L.h + GAP * explode * (i < layers.length - 1 ? 1 : 0); });
    stack.position.y = -y / 2 + 0.9;
  }
  function highlight() {
    const n = layers.length;
    const active = HR.layer >= 0 ? HR.layer : (HR.hover >= 0 ? HR.hover : -1);
    layers.forEach((L, i) => {
      const listIndex = n - 1 - i;
      const on = active === listIndex;
      L.mats.forEach((m) => {
        m.opacity = active === -1 || on ? 1 : 0.22;
        m.depthWrite = m.opacity === 1;
        m.emissive.setHex(on ? LIME : 0x000000);
        m.emissiveIntensity = on ? 0.28 : 0;
      });
      L.edges.material.color.setHex(on ? LIME : 0x0e1415);
      L.edges.material.opacity = on ? 1 : 0.35;
    });
    start();
  }

  function resize() {
    const w = frame.clientWidth, h = frame.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1.1 ? 12 : 9.5;
    camera.updateProjectionMatrix();
    start();
  }

  // Drag to rotate (horizontal drag only, so vertical swipes still scroll the page)
  let dragX = null;
  frame.addEventListener("pointerdown", (e) => { dragX = e.clientX; interacting = true; frame.setPointerCapture(e.pointerId); });
  frame.addEventListener("pointermove", (e) => {
    if (dragX === null) return;
    targetY += (e.clientX - dragX) * 0.01; dragX = e.clientX; start();
  });
  const end = () => { dragX = null; setTimeout(() => (interacting = false), 1500); };
  frame.addEventListener("pointerup", end); frame.addEventListener("pointercancel", end);
  frame.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -0.25, ArrowRight: 0.25 }[e.key];
    if (step) { targetY += step; interacting = true; end(); e.preventDefault(); start(); }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") { rotX = Math.min(Math.max(rotX + (e.key === "ArrowUp" ? -0.1 : 0.1), -0.2), 0.6); e.preventDefault(); start(); }
  });

  document.addEventListener("hr:system", build);
  document.addEventListener("hr:layer", highlight);
  document.addEventListener("hr:explode", () => start());
  document.addEventListener("hr:rotate", () => { targetY += HR.rotate; interacting = true; end(); start(); });
  document.addEventListener("hr:motion", () => start());

  let settled = 0;
  const start = loop(canvas, (dt, moving) => {
    if (moving && !interacting && HR.layer === -1) targetY += dt * 0.18;
    const k = HR.paused ? 1 : 0.12;
    rotY += (targetY - rotY) * k;
    explode += (HR.explode - explode) * (HR.paused ? 1 : 0.15);
    pivot.rotation.set(rotX, rotY, 0);
    place();
    renderer.render(scene, camera);
  });
  new ResizeObserver(resize).observe(frame);
  build(); resize();
}
