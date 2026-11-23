import * as T from 'three';

export function createHelicopter(scene) {
  const root = new T.Group();
  scene.add(root);

  const bodyMaterial = new T.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.4, metalness: 0.7 });
  const glassMaterial = new T.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.6 });
  const accentMaterial = new T.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.9, emissive: 0xffd700, emissiveIntensity: 0.3 });
  const darkMaterial = new T.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.5, metalness: 0.5 });
  const rotorMaterial = new T.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });

  const body = new T.Group();
  const hull = new T.Mesh(new T.BoxGeometry(1.6, 0.8, 3.2), bodyMaterial);
  hull.position.y = 0.4;
  body.add(hull);

  const cockpit = new T.Mesh(new T.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), glassMaterial);
  cockpit.position.y = 1.2;
  cockpit.scale.set(1.2, 0.7, 1.4);
  body.add(cockpit);

  const tailBoom = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 6), bodyMaterial);
  tailBoom.position.set(0, 0.4, -3.5);
  body.add(tailBoom);

  const tailFin = new T.Mesh(new T.BoxGeometry(0.1, 1.2, 1.5), bodyMaterial);
  tailFin.position.set(0, 1.3, -6.2);
  body.add(tailFin);

  const tailRotor = new T.Mesh(new T.BoxGeometry(2.5, 0.05, 0.15), rotorMaterial);
  tailRotor.position.set(0, 1.3, -6.8);
  body.add(tailRotor);

  const skidL = new T.Mesh(new T.BoxGeometry(0.16, 0.16, 3.5), darkMaterial);
  skidL.position.set(-1.1, -0.9, 0.5);
  body.add(skidL);

  const skidR = new T.Mesh(new T.BoxGeometry(0.16, 0.16, 3.5), darkMaterial);
  skidR.position.set(1.1, -0.9, 0.5);
  body.add(skidR);

  const mainRotor = new T.Group();
  const rotorBlade1 = new T.Mesh(new T.BoxGeometry(6.5, 0.06, 0.35), rotorMaterial);
  rotorBlade1.position.x = 3.25;
  const rotorBlade2 = new T.Mesh(new T.BoxGeometry(6.5, 0.06, 0.35), rotorMaterial);
  rotorBlade2.position.x = -3.25;
  const rotorHub = new T.Mesh(new T.BoxGeometry(0.7, 0.2, 0.7), rotorMaterial);
  mainRotor.add(rotorBlade1, rotorBlade2, rotorHub);
  mainRotor.position.y = 2.4;
  body.add(mainRotor);

  const goldAccent1 = new T.Mesh(new T.BoxGeometry(4, 0.08, 0.1), accentMaterial);
  goldAccent1.position.set(0, 1.0, 1.6);
  body.add(goldAccent1);

  const goldAccent2 = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 2.5), accentMaterial);
  goldAccent2.position.set(1.9, 1.0, 0.2);
  body.add(goldAccent2);

  const goldAccent3 = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 2.5), accentMaterial);
  goldAccent3.position.set(-1.9, 1.0, 0.2);
  body.add(goldAccent3);

  root.add(body);

  let active = false;
  let angle = 0;
  let rotorSpeed = 0;
  let targetRotorSpeed = 0;
  let searchlightActive = false;

  // Mock searchlight object for compatibility with inspect()
  const searchlight = { intensity: 0, target: { position: new T.Vector3() } };
  const lightCone = { visible: false, position: new T.Vector3() };
  const groundPool = { visible: false, position: new T.Vector3() };

  function setActive(value, night) {
    active = value;
    targetRotorSpeed = value ? 1 : 0;
    if (value) {
      root.visible = true;
      searchlightActive = night;
      searchlight.intensity = night ? 12000 : 0;
    } else {
      searchlight.intensity = 0;
    }
  }

  function update(dt, focus, night, playerHeading) {
    if (!active) {
      rotorSpeed = T.MathUtils.damp(rotorSpeed, 0, 3, dt);
      mainRotor.rotation.y += rotorSpeed * 30 * dt;
      if (rotorSpeed < 0.01) {
        root.visible = false;
      }
      return;
    }

    root.visible = true;

    rotorSpeed = T.MathUtils.damp(rotorSpeed, targetRotorSpeed, 2, dt);
    mainRotor.rotation.y += rotorSpeed * 45 * dt;
    tailRotor.rotation.z += rotorSpeed * 60 * dt;

    angle += dt * 0.15;
    const radius = 18;
    const offsetX = Math.sin(angle) * radius;
    const offsetZ = Math.cos(angle) * radius;
    const targetX = focus.x + offsetX;
    const targetZ = focus.z + offsetZ;
    const targetY = focus.y + 40;

    root.position.lerp(new T.Vector3(targetX, targetY, targetZ), Math.min(1, dt * 1.5));

    const lookTarget = new T.Vector3(focus.x, focus.y + 1.5, focus.z);
    body.lookAt(lookTarget);

    if (night !== searchlightActive) {
      searchlightActive = night;
      searchlight.intensity = night ? 12000 : 0;
    }
  }

  function dispose() {
    scene.remove(root);
    root.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  return { root, body, mainRotor, tailRotor, searchlight, lightCone, groundPool, setActive, update, dispose, get active() { return active; } };
}