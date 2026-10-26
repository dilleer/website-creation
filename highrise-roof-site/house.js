// Procedural contemporary two-story home with a cross-gabled roof, built from real roof parts:
// slopes, ridge caps, fascia, drip edge, seamless gutters, downspouts, chimney with flashing,
// skylight, plumbing vents. Units are metres; the ground sits at y = 0.
import * as THREE from "three";
import * as T from "./textures.js";

export function buildHouse(maps) {
  const house = new THREE.Group();
  const roofSurfaces = [];          // meshes whose material changes with the finish picker
  const hot = {};                   // world-space anchor points for hotspots
  const occluders = [];

  const M = {
    stucco: new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.92, ...pick(maps.stucco) }),
    clad: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, ...pick(maps.cladding) }),
    trim: new THREE.MeshStandardMaterial({ color: 0x1d2128, roughness: 0.5, metalness: 0.3 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2f37, roughness: 0.32, metalness: 0.85 }),
    flashing: new THREE.MeshStandardMaterial({ color: 0x5c636c, roughness: 0.3, metalness: 0.9 }),
    ridge: new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.9 }),
    glass: interiorGlass(1),
    glassDark: new THREE.MeshStandardMaterial({ color: 0x0b1018, roughness: 0.04, metalness: 0.6 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.45, metalness: 0.4 }),
    brick: new THREE.MeshStandardMaterial({ color: 0x3a3532, roughness: 0.95 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, ...pick(maps.concrete) }),
    gutter: new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.35, metalness: 0.8 })
  };
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3d41, roughness: 0.95, metalness: 0, ...pick(maps.shingles) });
  roofMat.normalScale = new THREE.Vector2(1.2, 1.2);
  roofMat.userData.worldSize = maps.shingles.worldSize;

  const add = (geo, mat, x, y, z, parent = house, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
    parent.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z, ws) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ws) T.worldUV(g, ws);
    const m = add(g, mat, x, y, z);
    occluders.push(m);
    return m;
  };

  // ---------- Volumes ----------
  // A: main two-story block, ridge along x
  box(12, 6.4, 8, M.stucco, 0, 3.2, 0, 3);
  // B: front cross-gable wing in charred timber, ridge along z
  box(5.6, 6.4, 6.2, M.clad, 3.1, 3.2, 4.6, 2.2);
  // C: single-story garage on the left, ridge along z
  box(5.2, 3.4, 7, M.stucco, -8.6, 1.7, 1.2, 3);
  // plinth / foundation reveal
  box(18.2, 0.25, 9.2, M.concrete, -2.3, 0.12, 1.4, 2);

  // ---------- Roofs ----------
  const R = { roofMat, roofSurfaces, add, M, house, occluders };
  // A: depth 8, rise 3.2, length 12, base 6.4
  const a = gable(R, { cx: 0, cz: 0, base: 6.4, span: 8, rise: 3.2, length: 12, axis: "x", over: 0.55 });
  // B: span 5.6, rise 2.6, runs from main roof (z≈0.75) to front (z = 7.7)
  const b = gable(R, { cx: 3.1, cz: 4.25, base: 6.4, span: 5.6, rise: 2.6, length: 6.9, axis: "z", over: 0.5, gableBack: false });
  // C: garage
  const c = gable(R, { cx: -8.6, cz: 1.2, base: 3.4, span: 5.2, rise: 1.7, length: 7, axis: "z", over: 0.45 });

  hot.ridge = a.ridgeMid.clone().add(new THREE.Vector3(-3, 0.12, 0));
  hot.shingles = a.slopeFront.clone().add(new THREE.Vector3(-3.6, 0, 0));
  hot.valley = new THREE.Vector3(0.3, 7.95, 2.2);
  hot.gutter = a.eaveFront.clone().add(new THREE.Vector3(-4.2, 0, 0));
  hot.dripEdge = c.eaveFront.clone().add(new THREE.Vector3(0, 0.12, 2.2));

  // ---------- Chimney with step flashing and cap ----------
  const chX = -3.6, chZ = -1.6;
  const ch = box(1.1, 4.6, 1.1, M.brick, chX, 8.0, chZ);
  box(1.35, 0.14, 1.35, M.flashing, chX, 10.35, chZ);           // cap
  box(0.22, 0.4, 0.22, M.metal, chX, 10.6, chZ);                 // flue
  // counter-flashing band where it meets the roof (roof height at z=-1.6 is ~8.96)
  const flashY = 6.4 + 3.2 * (1 - Math.abs(chZ) / 4) + 0.1;
  box(1.3, 0.35, 1.3, M.flashing, chX, flashY, chZ);
  hot.chimney = new THREE.Vector3(chX + 0.65, flashY + 0.2, chZ + 0.6);

  // ---------- Skylight on the front slope of A ----------
  const sky = new THREE.Group();
  const slopeA = Math.atan2(3.2, 4);
  const skyBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 1.6), M.frame);
  const skyGlass = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 1.4), M.glassDark);
  skyGlass.position.y = 0.08;
  const skyFlash = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.9), M.flashing);
  skyFlash.position.y = -0.05;
  sky.add(skyBox, skyGlass, skyFlash);
  sky.rotation.x = slopeA;
  const skyZ = 1.7, skyY = 6.4 + 3.2 * (1 - skyZ / 4) + 0.12;
  sky.position.set(-1.6, skyY, skyZ);
  sky.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  house.add(sky);
  hot.skylight = new THREE.Vector3(-1.6, skyY + 0.15, skyZ);

  // ---------- Plumbing vent pipes on the back slope ----------
  [[1.5, -2.4], [3.2, -2.1]].forEach(([x, z]) => {
    const y = 6.4 + 3.2 * (1 - Math.abs(z) / 4);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12), M.metal, x, y + 0.2, z);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), M.flashing, x, y + 0.02, z);
  });

  // ---------- Downspouts ----------
  const spout = (x, z, top) => {
    add(new THREE.BoxGeometry(0.1, top, 0.1), M.metal, x, top / 2, z);
    add(new THREE.BoxGeometry(0.1, 0.1, 0.35), M.metal, x, 0.08, z + 0.15);
  };
  spout(-6.2, 4.15, 6.35); spout(6.2, 4.15, 6.35); spout(5.95, 7.85, 6.35); spout(-11.15, 4.75, 3.35);
  hot.downspout = new THREE.Vector3(6.2, 2.4, 4.2);

  // ---------- Windows ----------
  const win = (x, y, z, w, h, face = "z", lit = true, mullions = 1) => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.12), M.frame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit ? interiorGlass(Math.round(x * 7 + y * 3)) : M.glassDark);
    glass.position.z = 0.065;
    g.add(frame, glass);
    for (let i = 1; i <= mullions; i++) {
      const mx = -w / 2 + (w / (mullions + 1)) * i;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.1), M.frame);
      bar.position.set(mx, 0, 0.07); g.add(bar);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.06, 0.25), M.flashing);
    sill.position.set(0, -h / 2 - 0.1, 0.1); g.add(sill);
    g.position.set(x, y, z);
    if (face === "x") g.rotation.y = Math.PI / 2;
    if (face === "-x") g.rotation.y = -Math.PI / 2;
    g.traverse((o) => { o.castShadow = false; o.receiveShadow = true; });
    house.add(g);
  };
  // wing B gable end: full-height glass
  win(3.1, 1.6, 7.72, 3.6, 2.6, "z", true, 3);
  win(3.1, 4.6, 7.72, 3.6, 2.2, "z", true, 3);
  // main block front (left of wing)
  win(-1.6, 1.5, 4.02, 2.4, 2.2, "z", true, 1);
  win(-1.6, 4.7, 4.02, 2.4, 1.6, "z", true, 1);
  win(-4.6, 4.7, 4.02, 1.4, 1.6, "z", false, 0);
  // front door with canopy
  box(1.1, 2.3, 0.1, M.frame, -4.6, 1.2, 4.04);
  add(new THREE.PlaneGeometry(0.9, 2.1), M.glass, -4.6, 1.2, 4.1, house, false).material = M.glass;
  box(2.2, 0.12, 1.2, M.metal, -4.6, 2.65, 4.6);
  // sides
  win(6.02, 4.6, -1.5, 2.2, 1.6, "x", true, 1);
  win(6.02, 1.6, -1.5, 2.2, 2.0, "x", false, 1);
  // garage door
  const gd = box(3.6, 2.4, 0.1, M.clad, -8.6, 1.2, 4.72, 2.2);
  gd.castShadow = false;

  // ---------- Warm interior light spill ----------
  const lights = [];
  [[3.1, 2.2, 6.4, 10], [3.1, 4.8, 6.4, 7], [-1.6, 2, 2.8, 6]].forEach(([x, y, z, i]) => {
    const l = new THREE.PointLight(0xffb36b, i, 9, 2);
    l.position.set(x, y, z); house.add(l); lights.push(l);
  });

  return { house, roofMat, roofSurfaces, hot, occluders, materials: M };
}

function pick(set) {
  return { map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap || null };
}

// Gable roof built in a canonical frame (ridge along +x, slopes down toward ±z), then rotated
// into place. Creates both slopes, ridge cap, fascia, drip edge, gutters and gable end walls.
function gable(R, o) {
  const { roofMat, roofSurfaces, add, M } = R;
  const g = new THREE.Group();
  const run = o.span / 2, ang = Math.atan2(o.rise, run);
  const reach = run + o.over;                       // horizontal distance ridge → eave edge
  const drop = Math.tan(ang) * reach;
  const slopeLen = Math.hypot(reach, drop);
  const L = o.length + (o.gableBack === false ? o.over : o.over * 2);
  const lOff = o.gableBack === false ? o.over / 2 : 0;
  const t = 0.1;

  [1, -1].forEach((s) => {
    const geo = T.worldUV(new THREE.BoxGeometry(L, t, slopeLen), roofMat.userData.worldSize || 1.9);
    const m = new THREE.Mesh(geo, roofMat);
    m.rotation.x = s * ang;
    m.position.set(lOff, o.rise - drop / 2 + t, (s * reach) / 2);
    m.castShadow = m.receiveShadow = true;
    m.userData.slope = { s, ang };
    g.add(m); roofSurfaces.push(m); R.occluders.push(m);

    // fascia + drip edge + gutter along the eave
    const ey = o.rise - drop, ez = s * reach;
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(L, 0.26, 0.05), M.trim);
    fascia.position.set(lOff, ey - 0.08, ez + s * 0.03); g.add(fascia);
    const drip = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, 0.09), M.flashing);
    drip.position.set(lOff, ey + 0.08, ez + s * 0.04); g.add(drip);
    // K-style seamless gutter: back, bottom and ogee-ish front face
    const gm = M.gutter;
    const gBack = new THREE.Mesh(new THREE.BoxGeometry(L, 0.16, 0.02), gm);
    gBack.position.set(lOff, ey - 0.18, ez + s * 0.07);
    const gBottom = new THREE.Mesh(new THREE.BoxGeometry(L, 0.02, 0.15), gm);
    gBottom.position.set(lOff, ey - 0.26, ez + s * 0.145);
    const gFront = new THREE.Mesh(new THREE.BoxGeometry(L, 0.15, 0.025), gm);
    gFront.position.set(lOff, ey - 0.19, ez + s * 0.225);
    const gLip = new THREE.Mesh(new THREE.BoxGeometry(L, 0.025, 0.04), gm);
    gLip.position.set(lOff, ey - 0.11, ez + s * 0.215);
    [gBack, gBottom, gFront, gLip].forEach((p) => { p.castShadow = true; p.receiveShadow = true; g.add(p); });
  });

  // ridge cap: a slightly rounded, raised strip of cap shingles
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, L, 10, 1, false, 0, Math.PI), roofMat);
  ridge.rotation.z = Math.PI / 2; ridge.rotation.y = 0;
  ridge.scale.set(0.5, 1, 1);
  ridge.position.set(lOff, o.rise + t + 0.02, 0);
  ridge.castShadow = true; g.add(ridge); roofSurfaces.push(ridge);

  // gable end walls (triangles) at each end of the ridge
  const tri = new THREE.Shape();
  tri.moveTo(-run, 0); tri.lineTo(0, o.rise); tri.lineTo(run, 0); tri.closePath();
  const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false });
  const ends = o.gableBack === false ? [1] : [1, -1];
  ends.forEach((e) => {
    const w = new THREE.Mesh(triGeo, o.axis === "z" && e === 1 ? M.clad : M.stucco);
    w.rotation.y = Math.PI / 2;
    w.position.set(e * (o.length / 2) - (e > 0 ? 0.2 : 0) + (e > 0 ? 0 : 0), 0, 0);
    if (e < 0) w.position.x = -o.length / 2;
    w.castShadow = w.receiveShadow = true; g.add(w); R.occluders.push(w);
    // rake trim along the gable edge
    [1, -1].forEach((s) => {
      const rake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, slopeLen), M.trim);
      rake.rotation.x = s * ang;
      rake.position.set(e * (L / 2) + lOff, o.rise - drop / 2 + t - 0.05, (s * reach) / 2);
      g.add(rake);
    });
  });

  g.position.set(o.cx, o.base, o.cz);
  if (o.axis === "z") g.rotation.y = -Math.PI / 2;
  R.house.add(g);
  g.updateMatrixWorld(true);

  const w = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  return {
    group: g,
    ridgeMid: w(0, o.rise + 0.2, 0),
    slopeFront: w(0, o.rise - drop / 2 + 0.15, reach / 2),
    eaveFront: w(0, o.rise - drop - 0.12, reach + 0.14),
    eaveRight: w(0, o.rise - drop + 0.05, -(reach + 0.06))
  };
}

// Lit window glass: a warm room seen through reflective glass. The emissive map paints a ceiling
// falloff, a lamp pool and a few dark furniture/curtain silhouettes so windows read as rooms,
// not flat panels.
const glassCache = new Map();
function interiorGlass(seed) {
  seed = Math.abs(seed) % 5;
  if (glassCache.has(seed)) return glassCache.get(seed);
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, "#3a2414"); bg.addColorStop(0.45, "#8a5a32"); bg.addColorStop(1, "#4a2e1a");
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  const lx = 40 + rnd() * 176, ly = 60 + rnd() * 60;
  const lamp = g.createRadialGradient(lx, ly, 4, lx, ly, 150);
  lamp.addColorStop(0, "rgba(255,214,160,1)"); lamp.addColorStop(0.35, "rgba(240,160,90,.55)"); lamp.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = lamp; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(20,12,8,.75)";
  for (let i = 0; i < 3; i++) { const w = 20 + rnd() * 60, h = 30 + rnd() * 80; g.fillRect(rnd() * (256 - w), 256 - h, w, h); }
  g.fillStyle = "rgba(30,18,10,.55)"; g.fillRect(0, 0, 18 + rnd() * 20, 256); g.fillRect(256 - 14 - rnd() * 24, 0, 40, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.05, metalness: 0.35, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.85, envMapIntensity: 1.2 });
  glassCache.set(seed, m);
  return m;
}
