// A cut section of a pitched roof, built layer by layer so it can separate into an exploded view.
import * as THREE from "three";
import * as T from "./textures.js";

export const LAYERS = [
  { id: "cap", name: "Ridge vent and cap", detail: "A vented ridge lets hot, damp attic air escape along the peak. Cap shingles are bent over it and nailed through, so the vent stays dry." },
  { id: "shingles", name: "Architectural shingles", detail: "Laminated asphalt shingles, nailed in overlapping courses so every fastener is covered by the course above. This is the layer that takes the weather." },
  { id: "starter", name: "Starter strip", detail: "A row of adhesive-backed shingles at the eave. It seals the first course down so wind can't lift it from below." },
  { id: "drip", name: "Drip edge", detail: "Bent metal along the eaves and rakes. It throws water into the gutter instead of letting it wick back into the fascia and deck." },
  { id: "underlayment", name: "Synthetic underlayment", detail: "A tear-resistant, water-shedding sheet over the entire deck. It is the second line of defence if a shingle is ever damaged." },
  { id: "ice", name: "Ice and water shield", detail: "Self-adhering membrane at the eaves, valleys and around penetrations, where ice dams and wind-driven rain are most likely. It seals around every nail." },
  { id: "deck", name: "Roof deck", detail: "Plywood or OSB sheathing nailed to the rafters. We check every sheet and replace soft or rotted sections before anything goes on top." },
  { id: "rafters", name: "Rafters and ventilation", detail: "The structure carries the load to the walls. Soffit intake vents at the eave feed cool air up under the deck to the ridge vent." }
];

export function buildAssembly(maps) {
  const root = new THREE.Group();
  const tilt = new THREE.Group();          // the whole section sits at a 6/12-ish pitch
  tilt.rotation.x = 0.46;
  root.add(tilt);

  const W = 4.2, D = 3.4;                  // width along the ridge, depth down the slope
  const parts = {};
  const mats = [];
  const mk = (opts) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.8, ...opts }); mats.push(m); return m; };
  const mesh = (geo, mat, ws) => {
    if (ws) T.worldUV(geo, ws);
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m;
  };
  const layer = (id) => { const g = new THREE.Group(); g.userData.id = id; tilt.add(g); parts[id] = g; return g; };

  // rafters + soffit vent
  const r = layer("rafters");
  const wood = T.wood(17, "#b08a5a", "#82623c");
  const rafterMat = mk({ map: wood.map, normalMap: wood.normalMap, color: 0xffffff });
  for (let i = 0; i < 6; i++) {
    const m = mesh(new THREE.BoxGeometry(0.06, 0.24, D + 0.3), rafterMat, 0.8);
    m.position.set(-W / 2 + 0.2 + i * ((W - 0.4) / 5), -0.12, 0.1); r.add(m);
  }
  const soffit = mesh(new THREE.BoxGeometry(W, 0.03, 0.4), mk({ color: 0x2a2f37, metalness: 0.6, roughness: 0.4 }));
  soffit.position.set(0, -0.24, D / 2 + 0.05); r.add(soffit);

  // deck
  const d = layer("deck");
  const osb = T.wood(31, "#b99566", "#8d6b42");
  const deck = mesh(new THREE.BoxGeometry(W, 0.04, D), mk({ map: osb.map, normalMap: osb.normalMap, color: 0xffffff, roughness: 0.9 }), 1.4);
  deck.position.y = 0.02; d.add(deck);

  // ice & water shield (eave band) – dark, slightly glossy
  const ice = layer("ice");
  const iw = mesh(new THREE.BoxGeometry(W, 0.012, 1.1), mk({ color: 0x2c3036, roughness: 0.4 }));
  iw.position.set(0, 0.006, D / 2 - 0.55); ice.add(iw);

  // underlayment – light grey printed sheet with overlap lines
  const u = layer("underlayment");
  const ul = mesh(new THREE.BoxGeometry(W, 0.008, D - 1.0), mk({ color: 0x8e9aa6, roughness: 0.7 }));
  ul.position.set(0, 0.004, -0.5); u.add(ul);
  for (let i = 0; i < 3; i++) {
    const line = mesh(new THREE.BoxGeometry(W, 0.01, 0.02), mk({ color: 0x2779d5, roughness: 0.6 }));
    line.position.set(0, 0.009, -D / 2 + 0.4 + i * 0.7); u.add(line);
  }

  // drip edge – bent metal L along the eave
  const de = layer("drip");
  const metal = mk({ color: 0x8a939c, metalness: 0.9, roughness: 0.3 });
  const de1 = mesh(new THREE.BoxGeometry(W + 0.04, 0.008, 0.12), metal); de1.position.set(0, 0, D / 2 - 0.05);
  const de2 = mesh(new THREE.BoxGeometry(W + 0.04, 0.09, 0.008), metal); de2.position.set(0, -0.04, D / 2 + 0.01);
  de.add(de1, de2);

  // starter strip
  const st = layer("starter");
  const starter = mesh(new THREE.BoxGeometry(W, 0.012, 0.3), mk({ color: 0x4a4d52, roughness: 0.95 }));
  starter.position.set(0, 0.006, D / 2 - 0.15); st.add(starter);

  // shingles – real overlapping courses with the procedural maps
  const sh = layer("shingles");
  const shMat = mk({ color: 0x716e6b, roughness: 0.95, map: maps.shingles.map.clone(), normalMap: maps.shingles.normalMap.clone() });
  shMat.map.repeat.set(1, 1); shMat.normalMap.repeat.set(1, 1);
  const courses = 16, exp = (D - 0.2) / courses;
  for (let i = 0; i < courses; i++) {
    const m = mesh(new THREE.BoxGeometry(W, 0.016, exp * 2.1), shMat, 1.9);
    m.position.set(0, 0.01 + i * 0.0015, D / 2 - 0.05 - exp - i * exp);
    m.rotation.x = 0.012;
    sh.add(m);
  }

  // ridge vent + cap shingles along the top edge
  const cp = layer("cap");
  const vent = mesh(new THREE.BoxGeometry(W, 0.05, 0.3), mk({ color: 0x1b1d21, roughness: 0.8 }));
  vent.position.set(0, 0.03, -D / 2 + 0.15);
  const capMat = mk({ color: 0x716e6b, roughness: 0.95, map: shMat.map, normalMap: shMat.normalMap });
  const cap = mesh(new THREE.CylinderGeometry(0.2, 0.2, W, 12, 1, false, 0, Math.PI), capMat);
  cap.rotation.z = Math.PI / 2; cap.scale.set(0.45, 1, 1); cap.position.set(0, 0.06, -D / 2 + 0.15);
  cp.add(vent, cap);

  // gutter hung on the eave, travels with the drip edge
  const gm = mk({ color: 0x23272e, metalness: 0.8, roughness: 0.35 });
  const gb = mesh(new THREE.BoxGeometry(W, 0.02, 0.16), gm); gb.position.set(0, -0.2, D / 2 + 0.1);
  const gf = mesh(new THREE.BoxGeometry(W, 0.16, 0.02), gm); gf.position.set(0, -0.12, D / 2 + 0.18);
  de.add(gb, gf);

  // order bottom → top; offsets are along the deck normal (local +y of the tilted group)
  const order = ["rafters", "deck", "ice", "underlayment", "drip", "starter", "shingles", "cap"];
  const base = { rafters: 0, deck: 0.04, ice: 0.05, underlayment: 0.06, drip: 0.065, starter: 0.07, shingles: 0.08, cap: 0.1 };

  function explode(k) {
    order.forEach((id, i) => { parts[id].position.y = base[id] + i * 0.36 * k; });
  }
  function isolate(id) {
    mats.forEach((m) => { m.transparent = !!id; m.needsUpdate = true; });
    order.forEach((key) => {
      const on = !id || key === id;
      parts[key].traverse((o) => {
        if (!o.material) return;
        o.material.opacity = on ? 1 : 0.12;
        o.material.depthWrite = on;
        o.material.emissive?.setHex(id && key === id ? 0x2779d5 : 0x000000);
        if (o.material.emissive) o.material.emissiveIntensity = id && key === id ? 0.18 : 0;
      });
    });
  }
  explode(0);

  // a dark plinth so it reads as a studio display piece
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.85, 0.3, 64), new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.6, metalness: 0.3 }));
  plinth.position.y = -2.1; plinth.receiveShadow = true;
  root.add(plinth);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.78, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: 0x2779d5 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.94;
  root.add(ring);

  return { root, explode, isolate, anchors: () => order.map((id) => ({ id, obj: parts[id] })) };
}
