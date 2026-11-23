import * as T from 'three';

export function createCombat(mara, scene, world, hud, police, audio) {
  let pistolAmmo = 12;
  let hasPistol = false;
  let recoil = 0;
  let recoilTarget = 0;
  let muzzleFlash = null;
  let punchCooldown = 0;
  const PUNCH_RANGE = 2.5;
  const PUNCH_DAMAGE = 25;
  const PISTOL_DAMAGE = 35;
  const PISTOL_RANGE = 50;
  const MAX_AMMO = 36;

  function createMuzzleFlash() {
    const geometry = new T.ConeGeometry(0.15, 0.4, 6);
    const material = new T.MeshBasicMaterial({color: 0xffcc00, transparent: true, opacity: 0.9});
    const mesh = new T.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  muzzleFlash = createMuzzleFlash();

  function updateMuzzleFlash(dt, camera, playerPos, playerYaw) {
    if (muzzleFlash.visible) {
      muzzleFlash.material.opacity -= dt * 15;
      if (muzzleFlash.material.opacity <= 0) {
        muzzleFlash.visible = false;
        muzzleFlash.material.opacity = 0.9;
      }
    }
  }

  function punch(enemies) {
    if (punchCooldown > 0) return false;
    punchCooldown = 0.5;

    const forward = new T.Vector3(0, 0, -1).applyAxisAngle(new T.Vector3(0, 1, 0), mara.root.rotation.y);
    const origin = mara.root.position.clone();
    origin.y = 1.5;

    let hit = false;
    enemies.forEach(enemy => {
      if (enemy.health <= 0) return;
      const toEnemy = new T.Vector3().subVectors(enemy.mesh.position, origin);
      const dist = toEnemy.length();
      if (dist < PUNCH_RANGE) {
        const dir = toEnemy.clone().normalize();
        const dot = forward.dot(dir);
        if (dot > 0.5) {
          enemy.health -= PUNCH_DAMAGE;
          audio.impact(5);
          hud.toast(`Hit · Enemy HP ${Math.max(0, Math.round(enemy.health))}`);
          hit = true;
          if (enemy.health <= 0) {
            enemy.mesh.visible = false;
            hud.toast('Enemy down');
            police.offence('assault', mara.root.position);
          }
        }
      }
    });
    return hit;
  }

  function firePistol(enemies, camera) {
    if (!hasPistol || pistolAmmo <= 0) {
      if (!hasPistol) hud.toast('No weapon');
      else hud.toast('Out of ammo');
      return false;
    }

    pistolAmmo--;
    recoilTarget = 0.15;
    hud.updateAmmo(pistolAmmo);

    const origin = camera.getWorldPosition(new T.Vector3());
    const direction = new T.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    direction.y += (Math.random() - 0.5) * 0.05;

    muzzleFlash.visible = true;
    muzzleFlash.position.copy(origin).addScaledVector(direction, 0.5);
    muzzleFlash.quaternion.copy(camera.quaternion);
    muzzleFlash.rotateX(-Math.PI / 2);
    muzzleFlash.material.opacity = 0.9;

    audio.impact(12);

    let hit = false;
    enemies.forEach(enemy => {
      if (enemy.health <= 0) return;
      const toEnemy = new T.Vector3().subVectors(enemy.mesh.position, origin);
      const dist = toEnemy.length();
      if (dist < PISTOL_RANGE) {
        const dir = toEnemy.clone().normalize();
        const dot = direction.dot(dir);
        if (dot > 0.98) {
          enemy.health -= PISTOL_DAMAGE;
          hud.toast(`Hit · Enemy HP ${Math.max(0, Math.round(enemy.health))}`);
          hit = true;
          if (enemy.health <= 0) {
            enemy.mesh.visible = false;
            hud.toast('Enemy down');
            police.offence('assault', mara.root.position);
          }
        }
      }
    });

    if (!hit) {
      hud.toast('Miss');
    }
    return hit;
  }

  function pickupAmmo(amount) {
    pistolAmmo = Math.min(MAX_AMMO, pistolAmmo + amount);
    hasPistol = true;
    hud.updateAmmo(pistolAmmo);
    hud.toast(`Pistol ammo +${amount} (${pistolAmmo}/${MAX_AMMO})`);
  }

  function pickupPistol() {
    hasPistol = true;
    pistolAmmo = Math.max(pistolAmmo, 12);
    hud.updateAmmo(pistolAmmo);
    hud.toast('Pistol acquired');
  }

  function applyRecoil(dt, camera) {
    if (recoilTarget > 0) {
      recoil = T.MathUtils.damp(recoil, recoilTarget, 8, dt);
      camera.rotation.x -= recoil * 0.5;
      recoilTarget = T.MathUtils.damp(recoilTarget, 0, 10, dt);
      if (recoilTarget < 0.01) {
        recoilTarget = 0;
        recoil = 0;
      }
    }
  }

  function takeDamage(amount) {
    if (mara.state.armor > 0) {
      const armorDamage = Math.min(mara.state.armor, amount);
      mara.state.armor -= armorDamage;
      amount -= armorDamage;
    }
    mara.state.health = Math.max(0, mara.state.health - amount);
    hud.toast(`Damage taken · Health ${Math.round(mara.state.health)}`);
    if (mara.state.health <= 0) {
      return true;
    }
    return false;
  }

  function addArmor(amount) {
    mara.state.armor = Math.min(100, mara.state.armor + amount);
    hud.toast(`Armor +${amount} (${Math.round(mara.state.armor)})`);
  }

  function addHealth(amount) {
    mara.state.health = Math.min(100, mara.state.health + amount);
    hud.toast(`Health +${amount} (${Math.round(mara.state.health)})`);
  }

  function update(dt, enemies, camera, input) {
    updateMuzzleFlash(dt, camera, mara.root.position, mara.root.rotation.y);
    applyRecoil(dt, camera);

    if (punchCooldown > 0) {
      punchCooldown -= dt;
    }

    if (input.consume('KeyF')) {
      if (hasPistol) {
        firePistol(enemies, camera);
      } else {
        punch(enemies);
      }
    }

    if (input.consume('KeyR') && hasPistol && pistolAmmo < MAX_AMMO) {
      pickupAmmo(12);
    }
  }

  function getAmmo() {
    return pistolAmmo;
  }

  function hasWeapon() {
    return hasPistol;
  }

  return {
    update,
    punch,
    firePistol,
    pickupAmmo,
    pickupPistol,
    takeDamage,
    addArmor,
    addHealth,
    getAmmo,
    hasWeapon
  };
}