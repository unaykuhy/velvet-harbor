import * as T from 'three';
import {standard} from './render.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const SKIN_TONES = ['#f4c2a1', '#e8a87c', '#d49466', '#c08054', '#a66b44', '#8b573a', '#734630', '#5e3a27'];
const SHIRT_COLORS = [
  '#e84d4d', '#4da3e8', '#50c878', '#e8a84d', '#c850e8', '#e8784d', '#4de8c8', '#e84da3',
  '#a8e84d', '#4d78e8', '#e8c84d', '#784de8', '#4de878', '#e84d78', '#c8e84d', '#78e84d'
];
const HAIR_COLORS = ['#1a1512', '#2d2018', '#3d2a1c', '#4a3522', '#5c4033', '#6b4a3a', '#8b6b4a', '#a0825e'];
const PANTS_DATA = [
  {color: '#2d3e50', type: 'jeans'},
  {color: '#1a1a2e', type: 'jeans'},
  {color: '#5d5a4a', type: 'khaki'},
  {color: '#3d3d3d', type: 'black'},
  {color: '#4a5a4a', type: 'olive'},
  {color: '#2c3e4a', type: 'navy'},
  {color: '#6b4a3a', type: 'brown'},
  {color: '#40505b', type: 'slate'},
  {color: '#3a4a5a', type: 'shorts'},
  {color: '#5a3a4a', type: 'shorts'},
  {color: '#4a4a5a', type: 'skirt'},
  {color: '#5a4a3a', type: 'skirt'},
  {color: '#3a5a5a', type: 'dress'},
  {color: '#5a3a3a', type: 'dress'},
  {color: '#3a3a5a', type: 'dress'},
  {color: '#4a5a3a', type: 'dress'}
];
const MOTIFS = ['plain', 'stripes', 'dots', 'checks'];
const HAIRSTYLES = ['short', 'long', 'bun', 'ponytail', 'curly'];

// Deterministic permutation of 16 shirt colors for 16 pedestrians (no duplicates)
const SHIRT_COLOR_PERM = (() => {
  const indices = Array.from({length: 16}, (_, i) => i);
  let seed = 0xC0FFEE;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
})();

// Male-only pants indices (jeans, khaki, black, olive, navy, brown, slate, shorts)
const MALE_PANTS_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick(arr, seed, offset = 0) {
  return arr[Math.floor(seededRandom(seed + offset) * arr.length)];
}

function pickIndex(arr, seed, offset = 0) {
  return Math.floor(seededRandom(seed + offset) * arr.length);
}

function createShirtTexture(colorHex, motif, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const color = new T.Color(colorHex);
  const r = Math.floor(color.r * 255);
  const g = Math.floor(color.g * 255);
  const b = Math.floor(color.b * 255);
  const darker = `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)})`;
  const lighter = `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)})`;

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 64, 64);

  const rand = (s) => seededRandom(seed + s);

  switch (motif) {
    case 'stripes': {
      ctx.fillStyle = darker;
      const stripeCount = 4 + Math.floor(rand(1) * 4);
      for (let i = 0; i < stripeCount; i++) {
        const y = Math.floor(rand(10 + i) * 64);
        const h = 2 + Math.floor(rand(20 + i) * 4);
        ctx.fillRect(0, y, 64, h);
      }
      break;
    }
    case 'dots': {
      ctx.fillStyle = darker;
      const dotCount = 12 + Math.floor(rand(1) * 12);
      for (let i = 0; i < dotCount; i++) {
        const x = Math.floor(rand(30 + i * 2) * 64);
        const y = Math.floor(rand(40 + i * 2) * 64);
        const rad = 2 + Math.floor(rand(50 + i) * 4);
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'checks': {
      ctx.fillStyle = darker;
      const size = 8 + Math.floor(rand(1) * 8);
      for (let x = 0; x < 64; x += size * 2) {
        for (let y = 0; y < 64; y += size * 2) {
          if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
            ctx.fillRect(x, y, size, size);
          }
        }
      }
      break;
    }
  }

  const texture = new T.CanvasTexture(canvas);
  texture.wrapS = T.RepeatWrapping;
  texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.needsUpdate = true;
  return texture;
}

function createHairGeometry(style, isFemale, seed) {
  const rand = (s) => seededRandom(seed + s);
  const group = new T.Group();

  if (style === 'short') {
    const geo = new T.SphereGeometry(0.18, 8, 6);
    const mesh = new T.Mesh(geo);
    mesh.position.set(0, 1.86, 0.025);
    mesh.scale.set(1, 0.5, 1);
    group.add(mesh);
    if (isFemale && rand(100) > 0.5) {
      const bangs = new T.Mesh(new T.SphereGeometry(0.16, 6, 5));
      bangs.position.set(0, 1.82, 0.12);
      bangs.scale.set(1.1, 0.3, 0.5);
      group.add(bangs);
    }
  } else if (style === 'long') {
    const back = new T.Mesh(new T.SphereGeometry(0.2, 8, 6));
    back.position.set(0, 1.75, -0.08);
    back.scale.set(1.1, 0.9, 0.7);
    group.add(back);
    const sides = new T.Mesh(new T.SphereGeometry(0.17, 8, 6));
    sides.position.set(0, 1.86, 0.05);
    sides.scale.set(1.2, 0.6, 0.6);
    group.add(sides);
  } else if (style === 'bun') {
    const base = new T.Mesh(new T.SphereGeometry(0.16, 8, 6));
    base.position.set(0, 1.86, 0.02);
    base.scale.set(1, 0.5, 1);
    group.add(base);
    const bun = new T.Mesh(new T.SphereGeometry(0.12, 8, 6));
    bun.position.set(0, 1.98, -0.02);
    bun.scale.set(0.8, 0.8, 0.8);
    group.add(bun);
  } else if (style === 'ponytail') {
    const base = new T.Mesh(new T.SphereGeometry(0.16, 8, 6));
    base.position.set(0, 1.86, 0.02);
    base.scale.set(1, 0.5, 1);
    group.add(base);
    const tail = new T.Mesh(new T.CapsuleGeometry(0.08, 0.3, 4, 8));
    tail.position.set(0, 1.7, -0.1);
    tail.rotation.x = -0.2;
    group.add(tail);
  } else if (style === 'curly') {
    const count = 8 + Math.floor(rand(1) * 6);
    for (let i = 0; i < count; i++) {
      const curl = new T.Mesh(new T.SphereGeometry(0.06 + rand(10 + i) * 0.04, 6, 5));
      curl.position.set(
        (rand(20 + i) - 0.5) * 0.3,
        1.8 + rand(30 + i) * 0.15,
        (rand(40 + i) - 0.5) * 0.2
      );
      group.add(curl);
    }
  }
  return group;
}

function createBodyParts(root, skinMat, clothMat, pantsMat, hairMat, shoeMat, isFemale, heightScale, shoulderScale, seed) {
  const rand = (s) => seededRandom(seed + s);
  const profile = [[0.23, 0], [0.25, 0.15], [0.2, 0.4], [0.29, 0.59], [0.16, 0.68]]
    .map(([r, y]) => new T.Vector2(r * shoulderScale, y * heightScale));

  const torsoGeo = new T.LatheGeometry(profile, 10);
  const torso = new T.Mesh(torsoGeo, clothMat);
  torso.position.y = 0.86 * heightScale;
  root.add(torso);

  function shape(parent, x, y, z, rx, ry, rz, material) {
    const mesh = new T.Mesh(new T.SphereGeometry(1, 8, 6), material);
    mesh.position.set(x * shoulderScale, y * heightScale, z);
    mesh.scale.set(rx * shoulderScale, ry * heightScale, rz);
    parent.add(mesh);
    return mesh;
  }

  shape(root, 0, 1.72, 0, 0.17, 0.23, 0.16, skinMat);
  shape(root, 0, 1.7, -0.155, 0.04, 0.06, 0.045, skinMat);

  const hairGroup = createHairGeometry(pick(HAIRSTYLES, seed, 10), isFemale, seed);
  hairGroup.traverse(m => { if (m.isMesh) m.material = hairMat; });
  root.add(hairGroup);

  const limbs = [];

  for (const side of [-1, 1]) {
    const leg = new T.Group(), arm = new T.Group();
    leg.position.set(side * 0.13 * shoulderScale, 0.87 * heightScale, 0);
    arm.position.set(side * 0.29 * shoulderScale, 1.4 * heightScale, 0);
    root.add(leg, arm);

    // Gender-aware pants selection
    let pantsType;
    if (isFemale) {
      pantsType = PANTS_DATA[pickIndex(PANTS_DATA, seed, 20 + (side + 1) * 5)].type;
    } else {
      const maleIdx = MALE_PANTS_INDICES[pickIndex(MALE_PANTS_INDICES, seed, 20 + (side + 1) * 5)];
      pantsType = PANTS_DATA[maleIdx].type;
    }
    const isSkirtOrDress = pantsType === 'skirt' || pantsType === 'dress';
    const isShorts = pantsType === 'shorts';

    if (isSkirtOrDress) {
      const skirtGeo = new T.ConeGeometry(0.22 * shoulderScale, 0.55 * heightScale, 8, 1, true);
      const skirt = new T.Mesh(skirtGeo, pantsMat);
      skirt.position.set(0, 0.55 * heightScale, 0);
      leg.add(skirt);
      shape(leg, 0, -0.25 * heightScale, 0, 0.11, 0.27, 0.12, skinMat);
      shape(leg, 0, -0.6 * heightScale, 0, 0.08, 0.23, 0.09, skinMat);
    } else if (isShorts) {
      shape(leg, 0, -0.15 * heightScale, 0, 0.12, 0.18, 0.13, pantsMat);
      shape(leg, 0, -0.4 * heightScale, 0, 0.09, 0.22, 0.1, skinMat);
    } else {
      shape(leg, 0, -0.22 * heightScale, 0, 0.11, 0.27, 0.12, pantsMat);
      shape(leg, 0, -0.6 * heightScale, 0, 0.08, 0.23, 0.09, pantsMat);
    }
    shape(leg, 0, -0.79 * heightScale, -0.06, 0.105, 0.08, 0.18, shoeMat);

    shape(arm, 0, -0.13 * heightScale, 0, 0.085, 0.19, 0.09, clothMat);
    shape(arm, 0, -0.4 * heightScale, 0, 0.065, 0.17, 0.065, skinMat);

    limbs.push({leg, arm, side});
  }

  return limbs;
}

export function buildCitizen(scene, index = 0, officer = false) {
  const root = new T.Group();
  const seed = index * 137 + 42;
  let limbs = [];

  if (officer) {
    const skin = standard(['#b97b59', '#e3b48c', '#79503e'][index % 3]);
    const cloth = standard('#263e56');
    const pants = standard('#243647');
    const hair = standard('#3a302a');
    const shoe = standard('#263139');
    limbs = createBodyParts(root, skin, cloth, pants, hair, shoe, false, 1.0, 1.0, seed);
    shape(root, 0, 1.94, -0.015, 0.21, 0.07, 0.21, pants);
    shape(root, -0.13, 1.34, -0.23, 0.045, 0.065, 0.025, standard('#e7c881', 0.3, 0.5));
  } else {
    const skinColor = pick(SKIN_TONES, seed, 1);
    const shirtColor = SHIRT_COLORS[SHIRT_COLOR_PERM[index]];
    const shirtMotif = pick(MOTIFS, seed, 3);
    const hairColor = pick(HAIR_COLORS, seed, 5);
    const isFemale = seededRandom(seed + 6) > 0.5;
    const heightScale = 0.92 + seededRandom(seed + 7) * 0.16;
    const shoulderScale = isFemale ? 0.85 + seededRandom(seed + 8) * 0.1 : 0.95 + seededRandom(seed + 8) * 0.15;

    const skin = standard(skinColor);
    const shirtTexture = createShirtTexture(shirtColor, shirtMotif, seed);
    const cloth = new T.MeshStandardMaterial({map: shirtTexture, roughness: 0.8, metalness: 0.1});
    const pants = standard('#3d3d3d'); // base pants color, createBodyParts picks type
    const hair = standard(hairColor);
    const shoe = standard('#263139');

    limbs = createBodyParts(root, skin, cloth, pants, hair, shoe, isFemale, heightScale, shoulderScale, seed);
  }

  function shape(parent, x, y, z, rx, ry, rz, material) {
    const mesh = new T.Mesh(new T.SphereGeometry(1, 8, 6), material);
    mesh.position.set(x, y, z);
    mesh.scale.set(rx, ry, rz);
    parent.add(mesh);
    return mesh;
  }

  for (const group of [root, ...limbs.flatMap(l => [l.leg, l.arm])]) {
    const batches = new Map();
    group.updateMatrix();
    for (const mesh of [...group.children]) if (mesh.isMesh) {
      mesh.updateMatrix();
      const g = mesh.geometry.clone().applyMatrix4(mesh.matrix);
      if (!batches.has(mesh.material)) batches.set(mesh.material, []);
      batches.get(mesh.material).push(g.index ? g.toNonIndexed() : g);
      mesh.geometry.dispose();
      group.remove(mesh);
    }
    for (const [material, parts] of batches) {
      group.add(new T.Mesh(mergeGeometries(parts), material));
      parts.forEach(g => g.dispose());
    }
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(root);

  let phase = 0;
  function animate(dt, speed) {
    phase += dt * speed * 2.5;
    for (const l of limbs) {
      const swing = Math.sin(phase + l.side * Math.PI / 2) * Math.min(0.8, speed * 0.24);
      l.leg.rotation.x = swing;
      l.arm.rotation.x = -swing * 0.85;
    }
    root.position.y = 0.14 + Math.abs(Math.sin(phase)) * 0.025;
  }
  return {root, animate};
}

export function createPedestrians(scene, world, traffic, onHit) {
  const people = []; let crossings = 0, hits = 0;
  for (let i = 0; i < 16; i++) {
    const person = buildCitizen(scene, i), x = [0, 80, -80, 160][i % 4], z = [160, 240, 80, 0][Math.floor(i / 4)];
    person.route = [[x - 12, z + 8.5], [x + 12, z + 8.5], [x + 12, z + 29], [x + 12, z + 8.5], [x - 12, z + 8.5], [x - 12, z + 29]];
    person.index = i; person.target = i % 2 ? 1 : 0; person.root.position.set(x + (i % 2 ? -12 : 12), 0.14, z + 8.5); person.flee = 0; person.cooldown = 0; person.crossing = false; people.push(person);
  }
  function update(dt, active, focus, allCars) {
    for (const p of people) {
      p.cooldown = Math.max(0, p.cooldown - dt); const at = p.root.position;
      const carPosition = active?.root.position;
      const relativeX = carPosition ? at.x - carPosition.x : 999, relativeZ = carPosition ? at.z - carPosition.z : 999;
      const touching = active && Math.abs(relativeX * Math.cos(active.heading) - relativeZ * Math.sin(active.heading)) < active.model.width / 2 + 0.35 && Math.abs(relativeX * Math.sin(active.heading) + relativeZ * Math.cos(active.heading)) < active.model.length / 2 + 0.25;
      if (touching && Math.abs(active.speed) > 3 && p.cooldown === 0) {
        p.flee = 4; p.cooldown = 7; p.away = new T.Vector3(at.x - active.root.position.x, 0, at.z - active.root.position.z).normalize(); if (p.away.lengthSq() < 0.1) p.away.set(1, 0, 0); hits++; onHit();
      }
      let speed = 1.2 + (p.index % 3) * 0.13, dx, dz; p.crossing = false;
      if (p.flee > 0) { p.flee -= dt; dx = p.away.x; dz = p.away.z; speed = 4.5; }
      else {
        const goal = p.route[p.target]; dx = goal[0] - at.x; dz = goal[1] - at.z; const distance = Math.hypot(dx, dz);
        if (distance < 0.15) { p.target = (p.target + 1) % p.route.length; continue; }
        dx /= distance; dz /= distance;
        const crossing = Math.abs(goal[0] - at.x) > 0.3 && Math.abs(goal[1] - at.z) < 0.4;
        if (crossing) {
          const center = (p.route[0][0] + p.route[1][0]) / 2, inside = Math.abs(at.x - center) < 10;
          const safe = traffic.phase('NS') === 'red' && traffic.clock % 28 >= 14 && traffic.clock % 28 < 20;
          const incoming = allCars.some(c => { const cp = c.root.position; return Math.abs(cp.x - at.x) < 5 && Math.abs(cp.z - at.z) < 9 && Math.abs(c.speed) > 1; });
          if ((!inside && !safe) || incoming) speed = 0; else { p.crossing = true; crossings++; speed = 2; }
        }
      }
      const nx = at.x + dx * speed * dt, nz = at.z + dz * speed * dt;
      if (!world.blocked(nx, nz, 0.28, 1)) at.set(nx, at.y, nz); else if (p.flee > 0) { p.away.set(-p.away.z, 0, p.away.x); }
      if (speed > 0) p.root.rotation.y = Math.atan2(-dx, -dz); p.animate(dt, speed); p.root.visible = at.distanceToSquared(focus) < 105 * 105;
    }
  }
  function reset() { crossings = 0; hits = 0; for (const p of people) { p.target = p.index % 2 ? 1 : 0; const start = p.route[p.index % 2 ? 0 : 1]; p.root.position.set(start[0], 0.14, start[1]); p.flee = 0; p.cooldown = 0; } }
  return {people, update, reset, inspect: () => ({count: people.length, crossings, hits, people: people.map(p => ({position: p.root.position.toArray(), crossing: p.crossing, flee: p.flee}))})};
}