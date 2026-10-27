// One WebGL stage for scenes 01–04. Scroll drives the camera along a path of poses; inside each
// scene the visitor can orbit, zoom, pick hotspots, explode the roof and swap finishes.
import * as THREE from "three";
import * as T from "./textures.js";
import { buildHouse } from "./house.js";
import { buildAssembly } from "./assembly.js";

const HR = window.HR;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}
if (!hasWebGL()) document.documentElement.classList.add("no-webgl");
else start();

function start() {
  const canvas = document.getElementById("stage");
  const stage = canvas.parentElement;
  const small = window.matchMedia("(max-width: 760px)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf1f0ea, 0.0085);   // fades distant ground into the cream page
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 900);

  // ---------- soft daylight sky that melts into the cream page ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      top: { value: new THREE.Color(0xc4ccc9) }, mid: { value: new THREE.Color(0xe3e5df) },
      horizon: { value: new THREE.Color(0xf6f6f4) }, glow: { value: new THREE.Color(0x14100a) }
    },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; varying vec3 vP;
      void main(){
        float h = vP.y;
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.22, 0.85, h));
        float sunSide = smoothstep(-0.2, 1.0, dot(normalize(vP.xz + 1e-4), normalize(vec2(0.55, -1.0))));
        c += glow * pow(max(0.0, 1.0 - abs(h) * 5.0), 2.5) * sunSide * 0.55;
        if (h < 0.0) c = horizon;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  scene.add(sky);


  // environment for reflections: render the sky plus a soft warm horizon card
  {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(sky.clone());
    const card = new THREE.Mesh(new THREE.PlaneGeometry(260, 40), new THREE.MeshBasicMaterial({ color: 0xfff1d8 }));
    card.position.set(120, 10, -260); card.lookAt(0, 10, 0); envScene.add(card);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  }

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xf4f2ea, 0x6d6a58, 1.15));
  const moon = new THREE.DirectionalLight(0xfff4e2, 2.6);   // the sun
  moon.position.set(-16, 26, 20); moon.target.position.set(-1, 3, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(moon.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.025;
  scene.add(moon, moon.target);
  const fill = new THREE.DirectionalLight(0xeef0ea, 0.45); fill.position.set(10, 30, 30); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe2bf, 0.4);
  rim.position.set(24, 7, -26); scene.add(rim);

  // ---------- textures ----------
  const maps = {
    shingles: T.shingles(), seam: T.standingSeam(), slate: T.slate(),
    stucco: T.stucco(), cladding: T.cladding(), concrete: T.concrete(), grass: T.grass()
  };
  const ani = renderer.capabilities.getMaxAnisotropy();
  Object.values(maps).forEach((s) => [s.map, s.normalMap, s.roughnessMap].forEach((t) => t && (t.anisotropy = Math.min(8, ani))));

  // ---------- house ----------
  const H = buildHouse(maps);
  scene.add(H.house);
  H.roofMat.envMapIntensity = 0.6;

  // ---------- grounds ----------
  const tiled = (set, rep) => {
    const m = set.map.clone(), n = set.normalMap.clone();
    [m, n].forEach((t) => { t.repeat.set(rep[0], rep[1]); t.needsUpdate = true; });
    return { map: m, normalMap: n };
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ color: 0xdfe4cf, roughness: 1, ...tiled(maps.grass, [107, 107]) }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const paveMat = (w, d) => new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.9, ...tiled(maps.concrete, [w / 2, d / 2]) });
  const drive = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 16), paveMat(4.4, 16));
  drive.rotation.x = -Math.PI / 2; drive.position.set(-8.6, 0.015, 12.6); drive.receiveShadow = true; scene.add(drive);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 12), paveMat(1.5, 12));
  path.rotation.x = -Math.PI / 2; path.position.set(-4.6, 0.02, 10.6); path.receiveShadow = true; scene.add(path);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(320, 9), new THREE.MeshStandardMaterial({ color: 0x4a4a44, roughness: 0.85, metalness: 0 }));
  street.rotation.x = -Math.PI / 2; street.position.set(0, 0.01, 25); street.receiveShadow = true; scene.add(street);

  // path bollards + the single electric-blue accent along the walk
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x1b1f25, metalness: 0.7, roughness: 0.4 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xe8e6dc, roughness: 0.3 });
  [6.5, 10, 13.5].forEach((z) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.65, 16), bollardMat);
    b.position.set(-5.65, 0.33, z); b.castShadow = true; scene.add(b);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16), lensMat);
    l.position.set(-5.65, 0.6, z); scene.add(l);
  });
      // warm grazing uplights on the facade
  [[-1.6, 4.2], [3.1, 7.9]].forEach(([x, z]) => {
    const s = new THREE.SpotLight(0xffd9b0, 6, 11, 0.45, 0.7, 2);
    s.position.set(x, 0.2, z + 0.9); s.target.position.set(x, 6, z - 0.2);
    scene.add(s, s.target);
  });

  // trees, hedges, neighbours: enough context to read as a real street at dusk
  const leaf = [0x55663f, 0x627349, 0x4b5a38].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 1 });
  const crownGeo = new THREE.IcosahedronGeometry(1, 3);
  {
    const p = crownGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.9 + Math.random() * 0.2; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    crownGeo.computeVertexNormals();
  }
  function tree(x, z, s, conifer) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3, 8), bark);
    trunk.position.y = 1.5; trunk.castShadow = true; g.add(trunk);
    const n = conifer ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(conifer ? new THREE.ConeGeometry(1.6 - i * 0.26, 1.8, 9) : crownGeo, leaf[i % 3]);
      if (conifer) c.position.set(0, 2.2 + i * 0.9, 0);
      else { c.position.set((Math.random() - 0.5) * 2.2, 3.4 + Math.random() * 1.8, (Math.random() - 0.5) * 2.2); c.scale.setScalar(1 + Math.random() * 0.9); }
      c.castShadow = true; c.receiveShadow = true; g.add(c);
    }
    g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = Math.random() * 6;
    scene.add(g);
  }
  [[-15, -9, 1.5, 1], [-9, -12, 1.8, 0], [-1, -14, 1.6, 1], [8, -12, 1.9, 0], [14, -9, 1.4, 1],
   [-18, 4, 1.2, 0], [-22, -14, 2, 1], [18, -24, 2.1, 1], [5, -22, 2.2, 0], [12, 14, 1.1, 0]].forEach((t) => tree(...t));
  const hedgeMat = leaf[1];
  [[-1.6, 4.6, 3.4], [-6.6, 4.6, 0.8], [7.4, 4.0, 2.4]].forEach(([x, z, w]) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, 0.8), hedgeMat);
    h.position.set(x, 0.4, z + 0.5); h.castShadow = h.receiveShadow = true; scene.add(h);
  });
  const nbMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.95 });
  const nbWin = new THREE.MeshStandardMaterial({ color: 0x3a3c3a, roughness: 0.2, metalness: 0.4 });
  [[-34, -6, 9], [-30, -30, 11], [32, -28, 10], [46, -10, 9], [-12, -42, 12], [16, -44, 10], [-44, 10, 9], [46, 16, 8]].forEach(([x, z, w], i) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 6, 8), nbMat); b.position.y = 3; g.add(b);
    const tri = new THREE.Shape(); tri.moveTo(-4.4, 0); tri.lineTo(0, 3); tri.lineTo(4.4, 0); tri.closePath();
    const r = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: w + 0.6, bevelEnabled: false }), nbMat);
    r.rotation.y = Math.PI / 2; r.position.set(-(w + 0.6) / 2, 6, 0); g.add(r);
    for (let k = 0; k < 2; k++) {
      if ((i + k) % 3 === 0) continue;
      const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), nbWin);
      wn.position.set(-w / 4 + k * (w / 2), 3.6, 4.01); g.add(wn);
    }
    g.position.set(x, 0, z); g.lookAt(0, 0, 0);
    scene.add(g);
  });

  // ---------- exploded assembly on its display plinth ----------
  const A = buildAssembly(maps);
  const AP = V(27, 2.3, -3);
  A.root.position.copy(AP);
  A.root.rotation.y = -0.55;
  scene.add(A.root);
  // soft studio backdrop behind the section so dark layers read against it
  {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"); const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.6, "#f6f6f4"); gr.addColorStop(1, "rgba(246,246,244,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }));
    const dir = V(8.2, 4.2, 11.5).normalize();
    bd.position.copy(AP).addScaledVector(dir, -9); bd.position.y += 1; bd.lookAt(AP.clone().addScaledVector(dir, 20));
    scene.add(bd);
  }
  const aKey = new THREE.SpotLight(0xfff6ea, 160, 26, 0.6, 0.6, 2);
  aKey.position.set(AP.x + 4, AP.y + 9, AP.z + 7);
  const aFill = new THREE.PointLight(0xdfe6f2, 14, 14, 2); aFill.position.set(AP.x + 6, AP.y + 1.5, AP.z + 4); scene.add(aFill); aKey.target = A.root; scene.add(aKey);
  const aRim = new THREE.PointLight(0xfff347, 18, 12, 2); aRim.position.set(AP.x - 4, AP.y + 2, AP.z - 3); scene.add(aRim);



  // ---------- camera path ----------
  const P = {
    e0: { p: V(-1.5, 2.4, 40), t: V(0.4, 5.0, 0) },
    e1: { p: V(5.5, 12.8, 25.5), t: V(1, 7.2, 1) },
    x: { p: V(21, 16.5, 24.5), t: V(-1.2, 5.6, 0.6) },
    l: { p: V(AP.x + 8.2, AP.y + 5.2, AP.z + 11.5), t: V(AP.x, AP.y + 0.9, AP.z) },
    f: { p: V(-19.5, 15, 25.5), t: V(0.6, 6, 0.8) }
  };
  const sections = ["top", "explore", "layers", "finish"].map((id) => document.getElementById(id));
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const lerpPose = (a, b, k) => ({ p: a.p.clone().lerp(b.p, k), t: a.t.clone().lerp(b.t, k) });

  function scrollState() {
    const y = window.scrollY, vh = window.innerHeight;
    let i = 0;
    sections.forEach((s, k) => { if (s.offsetTop <= y + vh * 0.5) i = k; });
    const s = sections[i];
    const p = clamp01((y - s.offsetTop + (i === 0 ? 0 : vh * 0.5)) / Math.max(1, s.offsetHeight - (i === 0 ? vh : vh * 0.5)));
    return { i, p };
  }

  const view = { az: 0, el: 0, zoom: 0, assemblyYaw: 0 };
  let fit = 1; // >1 steps the camera back when the space beside the panels is narrow
  const cam = { p: P.e0.p.clone(), t: P.e0.t.clone() };
  const pointer = new THREE.Vector2();
  let explode = 0, state = { i: 0, p: 0 }, idle = 0;

  function desired() {
    const { i, p } = state;
    let pose, k;
    if (i === 0) pose = lerpPose(P.e0, P.e1, ease(p));
    else if (i === 1) pose = lerpPose(P.e1, P.x, ease(p / 0.35));
    else if (i === 2) pose = lerpPose(P.x, P.l, ease(p / 0.3));
    else pose = lerpPose(P.l, P.f, ease(p / 0.3));
    // hotspot focus
    if (i === 1 && HR.hotspot && H.hot[HR.hotspot]) {
      const f = H.hot[HR.hotspot];
      const shift = f.clone().sub(pose.t).multiplyScalar(0.5);
      pose.t.add(shift); pose.p.add(shift);
      pose.p.lerp(pose.t, 0.18);
      // turn the orbit once toward the side the part faces, so every pick shows its part
      if (view.faceFor !== HR.hotspot && H.hotFace[HR.hotspot]) {
        const [nx, nz] = H.hotFace[HR.hotspot];
        const o = pose.p.clone().sub(pose.t);
        let a = Math.atan2(nx, nz) - Math.atan2(o.x, o.z);
        a = Math.atan2(Math.sin(a), Math.cos(a));
        view.azTarget = view.az + Math.atan2(Math.sin(a - view.az), Math.cos(a - view.az));
        view.faceFor = HR.hotspot;
      }
    }
    if (!HR.hotspot) view.faceFor = null;
    if (view.azTarget != null) {
      const k = HR.paused ? 1 : 0.07;
      view.az += (view.azTarget - view.az) * k;
      if (Math.abs(view.azTarget - view.az) < 0.002) view.azTarget = null;
    }
    // user orbit / zoom (explore + finish), drift toward rest elsewhere
    const userScene = i === 1 || i === 3;
    if (!userScene) { view.az *= 0.9; view.el *= 0.9; view.zoom *= 0.9; }
    const off = pose.p.clone().sub(pose.t);
    const az = view.az + (HR.paused ? 0 : Math.sin(idle * 0.12) * 0.035);
    off.applyAxisAngle(V(0, 1, 0), az);
    const right = V(off.z, 0, -off.x).normalize();
    off.applyAxisAngle(right, view.el);
    off.multiplyScalar(Math.pow(0.86, view.zoom));
    if (camera.aspect < 0.9) off.multiplyScalar(1.5); // portrait screens see less width: step back
    if (state.i > 0) off.multiplyScalar(fit);
    if (off.y + pose.t.y < 1.2) off.y = 1.2 - pose.t.y;
    pose.p = pose.t.clone().add(off);
    if (finePointer && !HR.paused) { pose.p.x += pointer.x * 0.5; pose.p.y += pointer.y * 0.3; }
    k = i === 2 ? ease((p - 0.28) / 0.5) : i === 3 ? 1 - ease(p / 0.25) : 0;
    return { pose, explodeTarget: Math.max(k, HR.layer && i === 2 ? 0.75 : 0) };
  }

  // ---------- interaction ----------
  const pointers = new Map();
  let pinch = 0;
  canvas.addEventListener("pointerdown", (e) => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
  canvas.addEventListener("pointermove", (e) => {
    if (finePointer) { pointer.set(e.clientX / innerWidth - 0.5, -(e.clientY / innerHeight - 0.5)); }
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d] = [...pointers.values()];
      const d1 = Math.hypot(c.x - d.x, c.y - d.y);
      if (state.i === 1 || state.i === 3) view.zoom = THREE.MathUtils.clamp(view.zoom + (d1 - d0) * 0.01, -2, 5);
      pinch = 1;
      return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (state.i === 1 || state.i === 3) {
      view.azTarget = null;
      view.az -= dx * 0.006;
      if (e.pointerType === "mouse") view.el = THREE.MathUtils.clamp(view.el + dy * 0.004, -0.35, 0.5);
    } else if (state.i === 2) view.assemblyYaw += dx * 0.008;
    kick();
  });
  const up = (e) => { pointers.delete(e.pointerId); if (!pointers.size) pinch = 0; };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up); canvas.addEventListener("pointerleave", up);
  document.addEventListener("hr:orbit", (e) => { if (state.i === 2) view.assemblyYaw += e.detail.d * 0.5; else { view.azTarget = null; view.az += e.detail.d * 0.4; } kick(); });
  document.addEventListener("hr:zoom", (e) => { view.zoom = THREE.MathUtils.clamp(view.zoom + e.detail.d, -2, 5); kick(); });
  document.addEventListener("hr:reset", () => { view.az = view.el = view.zoom = 0; view.azTarget = null; kick(); });
  document.addEventListener("hr:layer", () => { A.isolate(HR.layer); kick(); });
  document.addEventListener("hr:motion", kick);
  document.addEventListener("hr:hotspot", () => { syncHotspots(); kick(); });

  // ---------- hotspots ----------
  const hsLayer = document.getElementById("hotspots");
  const hsEls = HR.hotspots.map((h) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "hotspot"; b.tabIndex = -1; b.dataset.id = h.id;
    b.innerHTML = '<span class="ring"></span><span class="lead"></span><span class="tag"></span>';
    b.querySelector(".tag").textContent = h.name;
    b.addEventListener("click", () => HR.selectHotspot(HR.hotspot === h.id ? null : h.id));
    hsLayer.appendChild(b);
    return { el: b, id: h.id, hidden: false };
  });
  function syncHotspots() { hsEls.forEach((h) => { h.el.classList.toggle("is-active", h.id === HR.hotspot); h.w = 0; }); }
  const ray = new THREE.Raycaster();
  let frame = 0;
  function placeHotspots() {
    const on = state.i === 1 && state.p > 0.22 && state.p < 0.98;
    hsLayer.classList.toggle("is-on", on);
    if (!on) return;
    const w = innerWidth, h = innerHeight;
    hsEls.forEach((hs) => {
      const wp = H.hot[hs.id];
      const v = wp.clone().project(camera);
      const sx = ((v.x + 1) / 2) * w;
      // near the right edge the label goes on the left of the pin so it isn't cut off
      if (!hs.w) hs.w = hs.el.offsetWidth;
      const fitsRight = sx + hs.w <= w - 8, fitsLeft = sx - hs.w + 24 >= 8;
      const flip = !fitsRight && fitsLeft;
      if (flip !== hs.flip) { hs.flip = flip; hs.el.classList.toggle("is-flipped", flip); }
      // no room either side (narrow phones): show the pin only, the panel already names the part
      hs.el.classList.toggle("is-cramped", !fitsRight && !fitsLeft);
      hs.el.style.transform = `translate(${flip ? sx - hs.w + 24 : sx}px, ${((1 - v.y) / 2) * h}px)`;
      if (frame % 8 === 0) {
        const dir = wp.clone().sub(camera.position); const dist = dir.length();
        ray.set(camera.position, dir.normalize()); ray.far = dist - 0.3;
        hs.hidden = ray.intersectObjects(H.occluders, false).length > 0 || v.z > 1;
        hs.el.classList.toggle("is-hidden", hs.hidden);
      }
    });
  }

  // ---------- finish picker with a ridge-to-eave wipe ----------
  const typeSet = { shingles: maps.shingles, seam: maps.seam, slate: maps.slate };
  function applyFinish(mat, f) {
    const s = typeSet[f.type];
    mat.map = s.map; mat.normalMap = s.normalMap; mat.roughnessMap = s.roughnessMap || null;
    [s.map, s.normalMap, s.roughnessMap].forEach((t) => t && t.repeat.setScalar(1.9 / s.worldSize));
    mat.color.set(f.color).multiplyScalar(f.metal > 0.5 ? 1.15 : 1.7); // lifted so dark finishes still read
    mat.roughness = f.rough; mat.metalness = f.metal;
    mat.normalScale.setScalar(f.type === "seam" ? 0.9 : 1.2);
    mat.envMapIntensity = f.metal > 0.5 ? 1.0 : 0.6;
    mat.needsUpdate = true;
  }
  const nextMat = H.roofMat.clone();
  const twins = H.roofSurfaces.map((m) => { const t = new THREE.Mesh(m.geometry, nextMat); t.visible = false; t.receiveShadow = true; m.add(t); return t; });
  const planeOld = new THREE.Plane(V(0, -1, 0), 0), planeNew = new THREE.Plane(V(0, 1, 0), 0);
  let wipe = null;
  document.addEventListener("hr:finish", () => {
    const f = HR.finishes[HR.finish];
    if (HR.paused) { applyFinish(H.roofMat, f); kick(); return; }
    applyFinish(nextMat, f);
    H.roofMat.clippingPlanes = [planeOld]; nextMat.clippingPlanes = [planeNew];
    twins.forEach((t) => (t.visible = true));
    wipe = { t: 0, f };
    kick();
  });
  function stepWipe(dt) {
    if (!wipe) return;
    wipe.t = Math.min(1, wipe.t + dt / 1.3);
    const h = THREE.MathUtils.lerp(11.4, 2.6, ease(wipe.t));
    planeOld.constant = h; planeNew.constant = -h;
    if (wipe.t >= 1) {
      applyFinish(H.roofMat, wipe.f);
      H.roofMat.clippingPlanes = null; nextMat.clippingPlanes = null; H.roofMat.needsUpdate = true;
      twins.forEach((t) => (t.visible = false));
      wipe = null;
    }
  }

  applyFinish(H.roofMat, HR.finishes[HR.finish]);

  // ---------- resize ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.05 && w > 860;
    // centre the 3D in the space right of the side panels, and step back when that space is narrow
    const panel = document.querySelector(".scene-explore .panel");
    const right = wide && panel ? Math.min(panel.getBoundingClientRect().right, w * 0.5) : 0;
    fit = wide ? Math.max(1, (w * 0.58) / (w - right)) : 1;
    camera.setViewOffset(w, h, wide ? -Math.max(w * 0.17, right / 2) : 0, wide ? 0 : h * 0.2, w, h);
    camera.fov = wide ? 34 : 44;
    camera.updateProjectionMatrix();
    kick();
  }
  window.addEventListener("resize", resize);

  // ---------- loop (only while a 3D scene is on screen) ----------
  let visible = true, raf = 0, last = performance.now(), settle = 0;
  const toggle = document.getElementById("motion-toggle");
  const io = new IntersectionObserver(() => {
    const finish = sections[3].getBoundingClientRect();
    visible = finish.bottom > 0;
    stage.classList.toggle("is-off", !visible);
    toggle.classList.toggle("is-away", !visible);
    if (visible) kick();
  }, { threshold: [0, 0.01, 0.5, 1] });
  sections.forEach((s) => io.observe(s));
  io.observe(document.getElementById("services"));
  window.addEventListener("scroll", kick, { passive: true });

  function kick() { settle = 24; if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!HR.paused) idle += dt;
    state = scrollState();
    const d = desired();
    const k = HR.paused ? 1 : 1 - Math.exp(-dt * 5);
    cam.p.lerp(d.pose.p, k); cam.t.lerp(d.pose.t, k);
    camera.position.copy(cam.p); camera.lookAt(cam.t);
    explode += (d.explodeTarget - explode) * (HR.paused ? 1 : 1 - Math.exp(-dt * 6));
    A.explode(explode);
    A.root.rotation.y = -0.55 + view.assemblyYaw + (HR.paused ? 0 : Math.sin(idle * 0.2) * 0.12);
    stepWipe(dt);
    placeHotspots();
    frame++;
    renderer.render(scene, camera);
    const moving = cam.p.distanceToSquared(d.pose.p) > 1e-5 || view.azTarget != null || wipe || Math.abs(d.explodeTarget - explode) > 1e-3;
    settle = moving || !HR.paused ? 24 : settle - 1;
    if (visible && settle > 0) raf = requestAnimationFrame(tick);
  }

  resize();
  window.__hrReady = true;
}
