import * as T from 'three';
import {standard,surfaceMaterial} from './render.js';
import {bridgeHeight} from './world.js';
import {carsOverlap} from './vehicles.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function createBus(scene, traffic, lightsApi) {
  const bus = buildBusModel();
  bus.root.name = 'Vesper Coach';
  bus.id = 'vesper-coach';
  bus.ai = true;
  bus.cruise = 14;
  bus.waiting = '';
  bus.target = 0;
  bus.dwellTimer = 0;
  bus.dwellDuration = 4.0;
  bus.boardingHalt = -1;
  bus.passengers = 0;
  bus.maxPassengers = 42;
  bus.doorSide = 'right';
  bus.route = [
    [240, 240], [160, 240], [80, 240], [0, 240], [-80, 240], [-160, 240], [-240, 240],
    [-240, 160], [-240, 80], [-240, 0], [-240, -80], [-240, -160], [-240, -240],
    [-160, -240], [-80, -240], [0, -240], [80, -240], [160, -240], [240, -240],
    [240, -160], [240, -80], [240, 0], [240, 80], [240, 160]
  ];
  bus.halts = [
    { x: 240, z: 240, name: 'Prism Heights Terminal' },
    { x: 0, z: 240, name: 'Pearlwake Boulevard' },
    { x: -240, z: 80, name: 'Lanternfish Marina' },
    { x: -240, z: -80, name: 'Sunwick Hills' },
    { x: 0, z: -240, name: 'Gilded Quay' },
    { x: 240, z: -80, name: 'Neon Reach' }
  ];
  bus.haltShelters = [];
  buildHaltShelters(scene, bus.halts, bus.haltShelters);
  bus.root.position.set(240, 0.02, 240);
  bus.target = 0;
  scene.add(bus.root);
  traffic.external.push(bus);
  return { bus, update: (dt, active, focus, pedestrians) => updateBus(bus, dt, active, focus, pedestrians, traffic, lightsApi) };
}

function buildBusModel() {
  const model = { length: 11.0, width: 2.5, height: 3.2, roof: 0.4, color: '#2a7a7a', power: 8, top: 32, kind: 'bus' };
  const root = new T.Group();
  const shell = new T.Group();
  const interior = new T.Group();
  root.add(shell, interior);

  const teal = standard('#2a7a7a', 0.26, 0.5);
  const cream = standard('#f5f0e1', 0.2, 0.45);
  const gold = surfaceMaterial({ color: '#c9904f', emissive: '#e8b85a', emissiveIntensity: 0.4, metalness: 0.7, roughness: 0.3 });
  const glass = surfaceMaterial({ color: '#668b98', transparent: true, opacity: 0.35, roughness: 0.08, metalness: 0.15, depthWrite: false });
  const rubber = standard('#17232a', 0.91);
  const chrome = standard('#c1cacc', 0.23, 0.83);
  const black = standard('#1b3037', 0.55);
  const darkTrim = standard('#0c141b', 0.85);

  const l = model.length / 2;
  const w = model.width;
  const h = model.height;

  const bodyProfile = [
    [-l, 0.6], [-l + 0.3, 1.0], [-l + 1.2, h], [-0.8, h + 0.1],
    [0.5, h], [l - 1.0, h], [l - 0.3, 1.2], [l, 0.7],
    [l - 0.2, 0.5], [-l + 0.3, 0.5]
  ];
  const body = extrudedProfile(bodyProfile, w, teal);
  const pos = body.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i), y = pos.getY(i);
    const taper = 1 - 0.06 * Math.pow(Math.min(1, Math.abs(z) / l), 2) - Math.max(0, y - 0.7) * 0.03;
    pos.setX(i, pos.getX(i) * taper);
  }
  body.geometry.computeVertexNormals();
  root.add(body);

  function part(x, y, z, a, b, c, material) {
    const mesh = new T.Mesh(new T.BoxGeometry(a, b, c), material);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  }

  const roofHeight = h + model.roof;
  root.add(extrudedProfile([
    [-1.5, h], [-1.0, roofHeight], [l - 1.5, roofHeight], [l - 0.5, h]
  ], w * 0.88, glass));

  part(0, roofHeight + 0.03, (l - 2.5) / 2, w * 0.9, 0.14, l - 2.5 + 0.3, cream);

  const stripeY = h * 0.55;
  part(0, stripeY, 0, w * 1.02, 0.35, model.length - 0.4, gold);
  part(0, h + 0.02, 0, w * 1.01, 0.08, model.length - 0.4, gold);

  for (let i = 0; i < 8; i++) {
    const z = -l + 1.0 + i * (model.length - 2.0) / 7;
    const windowGroup = new T.Group();
    windowGroup.position.set(0, h * 0.4, z);
    root.add(windowGroup);
    const winW = w * 0.38, winH = h * 0.55;
    new T.Mesh(new T.BoxGeometry(winW, winH, 0.04), glass).position.set(w * 0.52, 0, 0);
    new T.Mesh(new T.BoxGeometry(winW, winH, 0.04), glass).position.set(-w * 0.52, 0, 0);
  }

  const doorZ = -l + 2.5;
  const doorGroup = new T.Group();
  doorGroup.position.set(w * 0.52, h * 0.35, doorZ);
  root.add(doorGroup);
  doorGroup.userData.isDoor = true;
  new T.Mesh(new T.BoxGeometry(1.2, h * 0.7, 0.06), teal).position.set(0, 0, 0);
  new T.Mesh(new T.BoxGeometry(1.0, h * 0.5, 0.04), glass).position.set(0, 0, 0.02);

  part(0, 0.7, -l - 0.08, w * 0.65, 0.25, 0.1, black);
  for (let x = -w * 0.25; x < w * 0.3; x += 0.1) part(x, 0.7, -l - 0.12, 0.03, 0.18, 0.02, chrome);
  part(0, 0.5, -l, w * 0.85, 0.1, 0.15, chrome);

  const headlightMat = surfaceMaterial({ color: '#fff4d2', emissive: '#fff1c0', emissiveIntensity: 1.4 });
  const tailMat = surfaceMaterial({ color: '#f56356', emissive: '#ff382e', emissiveIntensity: 0.8 });
  for (const x of [-w * 0.4, w * 0.4]) {
    part(x, h * 0.65, -l - 0.08, w * 0.18, 0.12, 0.06, headlightMat);
    part(x, 0.8, l + 0.06, w * 0.22, 0.12, 0.06, tailMat);
  }

  const wheels = [], frontWheels = [];
  const wheelPositions = [
    [-w * 0.55, -l * 0.7], [w * 0.55, -l * 0.7],
    [-w * 0.55, l * 0.65], [w * 0.55, l * 0.65],
    [-w * 0.55, l * 0.15], [w * 0.55, l * 0.15]
  ];
  for (const [x, z] of wheelPositions) {
    const pivot = new T.Group();
    pivot.position.set(x, 0.5, z);
    root.add(pivot);
    const tire = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.32, 20), rubber);
    tire.rotation.z = Math.PI / 2;
    pivot.add(tire);
    const spin = new T.Group();
    pivot.add(spin);
    const spokes = [];
    for (let s = 0; s < 6; s++) {
      const g = new T.BoxGeometry(0.35, 0.06, 0.55);
      g.rotateX(s * Math.PI / 6);
      spokes.push(g);
    }
    spin.add(new T.Mesh(mergeGeometries(spokes), chrome));
    wheels.push(spin);
    if (z < 0) frontWheels.push(pivot);
  }

  const beam = new T.SpotLight('#ffe8b3', 0, 45, 0.6, 0.7, 1.5);
  beam.position.set(0, 1.2, -l);
  beam.target.position.set(0, 0, -25);
  root.add(beam, beam.target);

  const staticParts = new Map();
  root.updateMatrixWorld(true);
  for (const child of [...root.children]) if (child.isMesh) {
    if (!staticParts.has(child.material)) staticParts.set(child.material, []);
    const geom = child.geometry.clone().applyMatrix4(child.matrix);
    staticParts.get(child.material).push(geom.index ? geom.toNonIndexed() : geom);
    root.remove(child);
  }
  for (const [material, geoms] of staticParts) {
    shell.add(new T.Mesh(mergeGeometries(geoms), material));
    geoms.forEach(g => g.dispose());
  }

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return { root, shell, interior, wheels, frontWheels, beam, model, speed: 0, steer: 0, heading: 0, damage: 0, owned: false, rider: null };
}

function extrudedProfile(points, width, material) {
  const shape = new T.Shape();
  points.forEach(([z, y], i) => i ? shape.lineTo(z, y) : shape.moveTo(z, y));
  shape.closePath();
  const geom = new T.ExtrudeGeometry(shape, { depth: width, steps: 1, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.075, bevelThickness: 0.075, curveSegments: 8 });
  geom.rotateY(Math.PI / 2);
  geom.translate(-width / 2, 0, 0);
  return new T.Mesh(geom, material);
}

function buildHaltShelters(scene, halts, shelterList) {
  const shelterRoofMat = standard('#1a3a3a', 0.5, 0.3);
  const postMat = standard('#2a5a5a', 0.6, 0.4);
  const signMat = surfaceMaterial({ color: '#c9904f', emissive: '#e8b85a', emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 });
  const signTextMat = standard('#f5f0e1', 0.9, 0.1);

  for (const halt of halts) {
    const group = new T.Group();
    group.position.set(halt.x, 0, halt.z);
    scene.add(group);

    const roof = new T.Mesh(new T.BoxGeometry(6, 0.15, 3.5), shelterRoofMat);
    roof.position.set(0, 3.2, -2.5);
    roof.castShadow = true;
    group.add(roof);

    for (const x of [-2.5, 2.5]) {
      const post = new T.Mesh(new T.CylinderGeometry(0.12, 0.15, 3.2, 8), postMat);
      post.position.set(x, 1.6, -2.5);
      post.castShadow = true;
      group.add(post);
      const brace = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 2.8), postMat);
      brace.position.set(x, 3.1, -3.9);
      brace.rotation.x = -Math.PI / 6;
      group.add(brace);
    }

    const sign = new T.Mesh(new T.BoxGeometry(4, 1.2, 0.1), signMat);
    sign.position.set(0, 4.2, -4.3);
    sign.castShadow = true;
    group.add(sign);

    const signBase = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 4.0, 8), postMat);
    signBase.position.set(0, 2.0, -4.3);
    group.add(signBase);

    shelterList.push({ group, halt, roof, sign });
  }
}

function updateBus(bus, dt, active, focus, pedestrians, traffic, lightsApi) {
  if (bus === active || !bus.ai) return;

  const p = bus.root.position;
  const target = bus.route[bus.target];
  const dx = target[0] - p.x;
  const dz = target[1] - p.z;
  const remaining = Math.hypot(dx, dz);

  if (remaining < 0.5) {
    bus.target = (bus.target + 1) % bus.route.length;
    checkHaltArrival(bus);
    return;
  }

  const angle = Math.atan2(-dx, -dz);
  const oldHeading = bus.heading;
  bus.heading = angle;

  if (vehiclesOverlap(bus, p, traffic, 0.3)) {
    bus.heading = oldHeading;
    bus.speed = 0;
    bus.waiting = 'vehicle';
    return;
  }

  const fx = dx / remaining;
  const fz = dz / remaining;
  let gap = Infinity;
  let reason = '';

  for (const other of [...traffic.cars, ...traffic.external]) {
    if (other === bus) continue;
    const op = other.root.position;
    const ox = op.x - p.x, oz = op.z - p.z;
    const ahead = ox * fx + oz * fz;
    const lateral = Math.abs(ox * fz - oz * fx);
    if (ahead > 0 && lateral < (bus.model.width + other.model.width) / 2 + 0.6) {
      const g = ahead - (bus.model.length + other.model.length) / 2 - 1.2;
      if (g < gap) { gap = g; reason = 'vehicle'; }
    }
  }

  for (const person of pedestrians) {
    const op = person.root.position;
    const ox = op.x - p.x, oz = op.z - p.z;
    const ahead = ox * fx + oz * fz;
    const lateral = Math.abs(ox * fz - oz * fx);
    if (ahead > 0 && lateral < 1.8 && ahead - 5 < gap) {
      gap = ahead - 5;
      reason = 'crosswalk';
    }
  }

  const trafficLightGap = checkTrafficLights(bus, p, fx, fz, lightsApi);
  if (trafficLightGap < gap) { gap = trafficLightGap; reason = 'red light'; }

  const desired = Math.min(bus.cruise, Math.sqrt(Math.max(0, gap) * 8));
  bus.speed = Math.max(0, Math.min(desired, bus.speed + dt * 2.5));
  bus.waiting = desired < 0.5 ? reason : '';

  if (bus.dwellTimer > 0) {
    bus.dwellTimer -= dt;
    bus.speed = 0;
    bus.waiting = 'halt';
    handleBoardingAlighting(bus, pedestrians, dt);
    if (bus.dwellTimer <= 0) {
      bus.boardingHalt = -1;
    }
    return;
  }

  const next = p.clone();
  next.x += fx * Math.min(remaining, bus.speed * dt);
  next.z += fz * Math.min(remaining, bus.speed * dt);

  if (!vehiclesOverlap(bus, next, traffic, 0.35)) {
    p.copy(next);
  } else {
    bus.speed = 0;
    bus.waiting = 'vehicle';
  }

  p.y = bridgeHeight(p.x, p.z) + 0.02;
  animateBus(bus, dt);
}

function checkHaltArrival(bus) {
  const p = bus.root.position;
  for (let i = 0; i < bus.halts.length; i++) {
    const halt = bus.halts[i];
    const dist = Math.hypot(p.x - halt.x, p.z - halt.z);
    if (dist < 8 && bus.boardingHalt === -1) {
      bus.dwellTimer = bus.dwellDuration;
      bus.boardingHalt = i;
      break;
    }
  }
}

function handleBoardingAlighting(bus, pedestrians, dt) {
  const halt = bus.halts[bus.boardingHalt];
  const doorWorld = new T.Vector3();
  bus.root.getWorldPosition(doorWorld);
  doorWorld.x += Math.sin(bus.heading) * bus.model.width * 0.55;
  doorWorld.z += Math.cos(bus.heading) * bus.model.width * 0.55;

  const boardingRate = 3.0;
  const alightingRate = 2.0;

  if (bus.passengers < bus.maxPassengers) {
    for (const person of pedestrians) {
      if (person.root.position.distanceTo(doorWorld) < 6 && !person._boarding) {
        person._boarding = true;
        person.root.visible = false;
        bus.passengers++;
        if (bus.passengers >= bus.maxPassengers) break;
      }
    }
  }

  if (bus.passengers > 0 && Math.random() < dt * 0.15) {
    const alightCount = Math.min(Math.floor(bus.passengers * 0.15), 3);
    for (let i = 0; i < alightCount; i++) {
      bus.passengers--;
      spawnAlightingPedestrian(doorWorld, bus.heading, pedestrians);
    }
  }
}

function spawnAlightingPedestrian(doorPos, heading, pedestrians) {
  const angle = heading + (Math.random() - 0.5) * 0.5;
  const dist = 2.5 + Math.random() * 1.5;
  const x = doorPos.x + Math.sin(angle) * dist;
  const z = doorPos.z + Math.cos(angle) * dist;
  const person = { root: { position: new T.Vector3(x, 0, z), rotation: new T.Euler(0, angle + Math.PI, 0) }, _alighting: true };
  pedestrians.push(person);
}

function checkTrafficLights(bus, p, fx, fz, lightsApi) {
  let gap = Infinity;
  const axis = Math.abs(fz) > 0.7 ? 'NS' : 'EW';
  for (const light of lightsApi.lights) {
    const dx = light.x - p.x, dz = light.z - p.z;
    const ahead = dx * fx + dz * fz;
    const lateral = Math.abs(dx * fz - dz * fx);
    if (lateral < 8 && ahead > 12 && ahead < 50) {
      const phase = lightsApi.phase(axis);
      if (phase !== 'green') {
        gap = Math.min(gap, ahead - 15 - bus.model.length / 2);
      }
    }
  }
  return gap;
}

function vehiclesOverlap(bus, pos, vehicles, padding) {
  for (const other of [...vehicles.cars, ...vehicles.external]) {
    if (other === bus) continue;
    if (carsOverlap(bus, pos, other, other.root.position, padding)) return true;
  }
  return false;
}

function animateBus(bus, dt) {
  bus.root.rotation.y = bus.heading;
  for (const wheel of bus.wheels) wheel.rotation.x -= bus.speed * dt / 0.5;
  for (const wheel of bus.frontWheels) wheel.rotation.y = bus.steer || 0;
}