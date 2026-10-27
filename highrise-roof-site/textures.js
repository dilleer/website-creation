// Procedural PBR-ish texture sets drawn on canvas: albedo (greyscale, tinted by material.color),
// a height field turned into a normal map, and a roughness map.
import * as THREE from "three";

const SIZE = 1024;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvas(size = SIZE) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d", { willReadFrequently: true })];
}

// Fine granular speckle, the thing that makes asphalt shingles and stucco read as real.
function grain(g, rand, amount, size = SIZE, alpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${rand() * alpha})`;
    g.fillRect(rand() * size, rand() * size, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
}

function heightToNormal(heightCanvas, strength = 2) {
  const w = heightCanvas.width, h = heightCanvas.height;
  const src = heightCanvas.getContext("2d").getImageData(0, 0, w, h).data;
  const [c, g] = canvas(w);
  const out = g.createImageData(w, h);
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x - 1, y) - H(x + 1, y)) * strength;
      const dy = (H(x, y - 1) - H(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

function tex(c, color = true, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

function set(albedo, height, rough, strength, worldSize) {
  return {
    map: tex(albedo),
    normalMap: tex(heightToNormal(height, strength), false),
    roughnessMap: rough ? tex(rough, false) : null,
    worldSize
  };
}

// Laminated architectural shingles: staggered tabs of random widths, shadow line under each course.
export function shingles(seed = 7) {
  const rand = rng(seed);
  const [a, ga] = canvas(), [h, gh] = canvas(), [r, gr] = canvas();
  const courses = 14, ch = SIZE / courses;
  ga.fillStyle = "#8a8a8a"; ga.fillRect(0, 0, SIZE, SIZE);
  gh.fillStyle = "#808080"; gh.fillRect(0, 0, SIZE, SIZE);
  gr.fillStyle = "#e6e6e6"; gr.fillRect(0, 0, SIZE, SIZE);
  for (let row = 0; row < courses; row++) {
    const y = row * ch;
    let x = -rand() * 120;
    while (x < SIZE) {
      const w = 60 + rand() * 110;
      const v = 110 + rand() * 70;               // per-tab tone variation (blend of granule colours)
      ga.fillStyle = `rgb(${v},${v},${v})`;
      ga.fillRect(x, y, w - 2, ch);
      // tab gets a gentle slope (thicker at the butt edge = bottom)
      const grad = gh.createLinearGradient(0, y, 0, y + ch);
      grad.addColorStop(0, "#5a5a5a"); grad.addColorStop(1, "#b4b4b4");
      gh.fillStyle = grad; gh.fillRect(x, y, w - 2, ch);
      // laminated "dragon tooth" darker layer on some tabs
      if (rand() > 0.55) {
        ga.fillStyle = `rgba(0,0,0,${0.12 + rand() * 0.12})`;
        ga.fillRect(x, y + ch * 0.55, w - 2, ch * 0.45);
      }
      // keyway gap
      ga.fillStyle = "#1c1c1c"; ga.fillRect(x + w - 2, y + ch * 0.35, 2, ch * 0.65);
      gh.fillStyle = "#202020"; gh.fillRect(x + w - 2, y + ch * 0.35, 2, ch * 0.65);
      x += w;
    }
    // butt-edge shadow line
    ga.fillStyle = "rgba(0,0,0,.55)"; ga.fillRect(0, y + ch - 3, SIZE, 3);
    gh.fillStyle = "#101010"; gh.fillRect(0, y + ch - 2, SIZE, 2);
  }
  grain(ga, rand, 140000, SIZE, 0.16);
  grain(gh, rand, 60000, SIZE, 0.08);
  return set(a, h, r, 3.2, 1.9);
}

// Standing seam metal: raised seams, flat pans with faint oil-canning.
export function standingSeam(seed = 3) {
  const rand = rng(seed);
  const [a, ga] = canvas(), [h, gh] = canvas();
  ga.fillStyle = "#b4b4b4"; ga.fillRect(0, 0, SIZE, SIZE);
  gh.fillStyle = "#606060"; gh.fillRect(0, 0, SIZE, SIZE);
  const pans = 4, pw = SIZE / pans;
  for (let i = 0; i < pans; i++) {
    const x = i * pw;
    const grad = gh.createLinearGradient(x, 0, x + pw, 0);
    grad.addColorStop(0, "#5a5a5a"); grad.addColorStop(0.5, "#666"); grad.addColorStop(1, "#5a5a5a");
    gh.fillStyle = grad; gh.fillRect(x, 0, pw, SIZE);
    // seam
    const sg = gh.createLinearGradient(x - 10, 0, x + 10, 0);
    sg.addColorStop(0, "#606060"); sg.addColorStop(0.5, "#ffffff"); sg.addColorStop(1, "#606060");
    gh.fillStyle = sg; gh.fillRect(x - 10, 0, 20, SIZE);
    ga.fillStyle = "rgba(255,255,255,.18)"; ga.fillRect(x - 3, 0, 3, SIZE);
    ga.fillStyle = "rgba(0,0,0,.25)"; ga.fillRect(x + 1, 0, 4, SIZE);
    // shallow stiffening ribs in the pan
    for (const f of [0.33, 0.66]) {
      gh.fillStyle = "rgba(255,255,255,.12)"; gh.fillRect(x + pw * f - 2, 0, 4, SIZE);
    }
  }
  grain(ga, rand, 20000, SIZE, 0.04);
  return set(a, h, null, 4, 1.6);
}

// Natural slate: staggered rectangular tiles, each with its own tone and a split-stone surface.
export function slate(seed = 11) {
  const rand = rng(seed);
  const [a, ga] = canvas(), [h, gh] = canvas(), [r, gr] = canvas();
  ga.fillStyle = "#222"; ga.fillRect(0, 0, SIZE, SIZE);
  gh.fillStyle = "#202020"; gh.fillRect(0, 0, SIZE, SIZE);
  gr.fillStyle = "#c8c8c8"; gr.fillRect(0, 0, SIZE, SIZE);
  const rows = 9, rh = SIZE / rows;
  for (let row = 0; row < rows; row++) {
    const y = row * rh;
    let x = row % 2 ? -64 : 0;
    while (x < SIZE) {
      const w = 110 + rand() * 40;
      const v = 95 + rand() * 60;
      ga.fillStyle = `rgb(${v},${v},${v + 4})`;
      ga.fillRect(x + 3, y, w - 6, rh - 2);
      const grad = gh.createLinearGradient(0, y, 0, y + rh);
      grad.addColorStop(0, "#606060"); grad.addColorStop(1, "#b0b0b0");
      gh.fillStyle = grad; gh.fillRect(x + 3, y, w - 6, rh - 2);
      const rv = 120 + rand() * 80;
      gr.fillStyle = `rgb(${rv},${rv},${rv})`; gr.fillRect(x + 3, y, w - 6, rh - 2);
      // cleft texture streaks
      for (let k = 0; k < 6; k++) {
        ga.fillStyle = `rgba(255,255,255,${rand() * 0.06})`;
        ga.fillRect(x + 3 + rand() * w, y, 1 + rand() * 3, rh);
      }
      x += w;
    }
  }
  grain(ga, rand, 50000, SIZE, 0.08);
  return set(a, h, r, 3, 2.4);
}

// White TPO membrane with heat-welded seams.
export function membrane(seed = 5) {
  const rand = rng(seed);
  const [a, ga] = canvas(), [h, gh] = canvas();
  ga.fillStyle = "#e8e8e8"; ga.fillRect(0, 0, SIZE, SIZE);
  gh.fillStyle = "#808080"; gh.fillRect(0, 0, SIZE, SIZE);
  for (const y of [0, SIZE / 2]) {
    ga.fillStyle = "rgba(0,0,0,.08)"; ga.fillRect(0, y, SIZE, 10);
    gh.fillStyle = "#a0a0a0"; gh.fillRect(0, y, SIZE, 12);
  }
  grain(ga, rand, 30000, SIZE, 0.05);
  return set(a, h, null, 1.5, 3);
}

// Smooth troweled stucco for walls.
export function stucco(seed = 9) {
  const rand = rng(seed);
  const [a, ga] = canvas(512), [h, gh] = canvas(512);
  ga.fillStyle = "#d8d6d0"; ga.fillRect(0, 0, 512, 512);
  gh.fillStyle = "#808080"; gh.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = rand() * 512, y = rand() * 512, rr = 4 + rand() * 26;
    const v = rand() > 0.5 ? 255 : 0;
    gh.fillStyle = `rgba(${v},${v},${v},${0.03 + rand() * 0.05})`;
    gh.beginPath(); gh.ellipse(x, y, rr, rr * 0.5, rand() * 3, 0, 7); gh.fill();
    ga.fillStyle = `rgba(${v},${v},${v},${0.015})`;
    ga.beginPath(); ga.ellipse(x, y, rr, rr * 0.5, rand() * 3, 0, 7); ga.fill();
  }
  grain(gh, rand, 40000, 512, 0.1);
  return set(a, h, null, 1.2, 3);
}

// Charred vertical timber cladding.
export function cladding(seed = 13) {
  const rand = rng(seed);
  const [a, ga] = canvas(512), [h, gh] = canvas(512);
  ga.fillStyle = "#2a2826"; ga.fillRect(0, 0, 512, 512);
  gh.fillStyle = "#909090"; gh.fillRect(0, 0, 512, 512);
  const boards = 8, bw = 512 / boards;
  for (let i = 0; i < boards; i++) {
    const x = i * bw, v = 30 + rand() * 18;
    ga.fillStyle = `rgb(${v},${v - 2},${v - 4})`; ga.fillRect(x + 1, 0, bw - 2, 512);
    gh.fillStyle = "#151515"; gh.fillRect(x, 0, 3, 512);
    for (let k = 0; k < 40; k++) {
      const gx = x + rand() * bw;
      ga.fillStyle = `rgba(255,255,255,${rand() * 0.035})`; ga.fillRect(gx, 0, 1, 512);
      gh.fillStyle = `rgba(0,0,0,${rand() * 0.15})`; gh.fillRect(gx, 0, 1, 512);
    }
  }
  return set(a, h, null, 2, 2.2);
}

export function wood(seed = 17, base = "#a7845a", lines = "#7d5f3c") {
  const rand = rng(seed);
  const [a, ga] = canvas(512), [h, gh] = canvas(512);
  ga.fillStyle = base; ga.fillRect(0, 0, 512, 512);
  gh.fillStyle = "#808080"; gh.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const y = rand() * 512;
    ga.strokeStyle = lines; ga.globalAlpha = 0.25 + rand() * 0.3; ga.lineWidth = 1 + rand() * 2;
    ga.beginPath(); ga.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) ga.lineTo(x, y + Math.sin(x * 0.02 + i) * 4);
    ga.stroke();
  }
  ga.globalAlpha = 1;
  // OSB-like flakes
  for (let i = 0; i < 500; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ga.fillStyle = `rgba(${v},${v},${v},${rand() * 0.07})`;
    ga.fillRect(rand() * 512, rand() * 512, 8 + rand() * 30, 3 + rand() * 8);
  }
  return set(a, h, null, 1, 1.2);
}

export function grass(seed = 21) {
  const rand = rng(seed);
  const [a, ga] = canvas(512), [h, gh] = canvas(512);
  ga.fillStyle = "#26301f"; ga.fillRect(0, 0, 512, 512);
  gh.fillStyle = "#808080"; gh.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) {
    const x = rand() * 512, y = rand() * 512, g = 40 + rand() * 50;
    ga.fillStyle = `rgba(${g * 0.7},${g},${g * 0.55},.6)`;
    ga.fillRect(x, y, 1, 2 + rand() * 4);
    gh.fillStyle = `rgba(255,255,255,${rand() * 0.2})`; gh.fillRect(x, y, 1, 3);
  }
  return set(a, h, null, 1, 3);
}

export function concrete(seed = 23) {
  const rand = rng(seed);
  const [a, ga] = canvas(512), [h, gh] = canvas(512);
  ga.fillStyle = "#7a7a78"; ga.fillRect(0, 0, 512, 512);
  gh.fillStyle = "#808080"; gh.fillRect(0, 0, 512, 512);
  grain(ga, rand, 50000, 512, 0.12);
  ga.fillStyle = "rgba(0,0,0,.35)"; ga.fillRect(0, 0, 512, 3); ga.fillRect(0, 0, 3, 512);
  gh.fillStyle = "#303030"; gh.fillRect(0, 0, 512, 3); gh.fillRect(0, 0, 3, 512);
  return set(a, h, null, 1, 2);
}

// Scale a geometry's UVs so a texture set covers `worldSize` metres per tile on every face.
export function worldUV(geometry, worldSize) {
  geometry.computeBoundingBox();
  const pos = geometry.attributes.position, nor = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; }
    else if (nx >= nz) { u = z; v = y; }
    else { u = x; v = y; }
    uv.setXY(i, u / worldSize, v / worldSize);
  }
  uv.needsUpdate = true;
  return geometry;
}
