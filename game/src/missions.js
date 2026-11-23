import * as T from 'three';
import {districtAt} from './world.js';

export function createMissions(scene, world, hud, minimap, mara, police, combat) {
  const missions = [
    {
      id: 1,
      name: 'Mara Vale',
      giver: 'Mara Vale',
      marker: new T.Vector3(-120, 0, -80),
      radius: 6,
      objectives: [
        {text: 'Meet Teo at the bridge', type: 'reach', target: new T.Vector3(-120, 0, -80), radius: 4},
        {text: 'Drive to the marina', type: 'drive', target: new T.Vector3(40, 0, 180), radius: 6},
        {text: 'Collect the package', type: 'collect', target: new T.Vector3(45, 0, 185), radius: 3}
      ],
      dialogue: [
        {speaker: 'Mara', line: 'Teo said the shipment comes in at dusk.'},
        {speaker: 'Teo', line: 'Right on time. Grab it and get to the plaza.'}
      ],
      checkpoints: [new T.Vector3(-120, 0, -80), new T.Vector3(40, 0, 180)],
      reward: 500
    },
    {
      id: 2,
      name: 'Teo Halden',
      giver: 'Teo Halden',
      marker: new T.Vector3(40, 0, 180),
      radius: 6,
      objectives: [
        {text: 'Meet Iris at the market', type: 'reach', target: new T.Vector3(160, 0, -40), radius: 4},
        {text: 'Escort Iris to the airfield', type: 'escort', target: new T.Vector3(-200, 0, 200), radius: 8}
      ],
      dialogue: [
        {speaker: 'Teo', line: 'Iris has the intel. Meet her at the market.'},
        {speaker: 'Iris', line: 'They are watching the main roads. We take the back way.'}
      ],
      checkpoints: [new T.Vector3(40, 0, 180), new T.Vector3(160, 0, -40)],
      reward: 750
    },
    {
      id: 3,
      name: 'Iris Okafor',
      giver: 'Iris Okafor',
      marker: new T.Vector3(160, 0, -40),
      radius: 6,
      objectives: [
        {text: 'Reach the airfield', type: 'reach', target: new T.Vector3(-200, 0, 200), radius: 6},
        {text: 'Eliminate the gang ambush', type: 'combat', target: new T.Vector3(-200, 0, 200), radius: 15, enemies: 4},
        {text: 'Secure the crate', type: 'collect', target: new T.Vector3(-205, 0, 195), radius: 3}
      ],
      dialogue: [
        {speaker: 'Iris', line: 'Vince crew is waiting. Watch your six.'},
        {speaker: 'Vince', line: 'You should have stayed out of this, Mara.'}
      ],
      checkpoints: [new T.Vector3(160, 0, -40), new T.Vector3(-200, 0, 200)],
      reward: 1000
    },
    {
      id: 4,
      name: 'Vince Torrado',
      giver: 'Vince Torrado',
      marker: new T.Vector3(-200, 0, 200),
      radius: 6,
      objectives: [
        {text: 'Meet Lou at the plaza', type: 'reach', target: new T.Vector3(0, 0, 0), radius: 4},
        {text: 'Defend the position', type: 'combat', target: new T.Vector3(0, 0, 0), radius: 20, enemies: 5},
        {text: 'Escape to the bridge', type: 'escape', target: new T.Vector3(-120, 0, -80), radius: 6}
      ],
      dialogue: [
        {speaker: 'Vince', line: 'Lou has the exit plan. Get to the plaza.'},
        {speaker: 'Lou', line: 'Heavy heat incoming. Hold the line!'}
      ],
      checkpoints: [new T.Vector3(-200, 0, 200), new T.Vector3(0, 0, 0)],
      reward: 1500
    },
    {
      id: 5,
      name: 'Lou Brandt',
      giver: 'Lou Brandt',
      marker: new T.Vector3(0, 0, 0),
      radius: 6,
      objectives: [
        {text: 'Final stand at the bridge', type: 'reach', target: new T.Vector3(-120, 0, -80), radius: 4},
        {text: 'Eliminate all hostiles', type: 'combat', target: new T.Vector3(-120, 0, -80), radius: 25, enemies: 6},
        {text: 'Secure the waterfront', type: 'escape', target: new T.Vector3(-120, 0, -80), radius: 4}
      ],
      dialogue: [
        {speaker: 'Lou', line: 'This ends today. The waterfront is ours.'},
        {speaker: 'Mara', line: 'Let us finish this.'}
      ],
      checkpoints: [new T.Vector3(0, 0, 0), new T.Vector3(-120, 0, -80)],
      reward: 2500
    }
  ];

  let currentMission = 0;
  let currentObjective = 0;
  let missionActive = false;
  let dialogueQueue = [];
  let dialogueIndex = 0;
  let showingDialogue = false;
  let endingScreen = false;
  let markers = [];
  let objectiveMarkers = [];
  let escortTarget = null;
  let combatEnemies = [];

  function createMarker(position, color = 0xffd700, size = 1.5) {
    const geometry = new T.ConeGeometry(size, size * 2, 8);
    const material = new T.MeshBasicMaterial({color, transparent: true, opacity: 0.9});
    const mesh = new T.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = size;
    mesh.rotation.x = Math.PI;
    scene.add(mesh);
    return mesh;
  }

  function createObjectiveMarker(position, color = 0x00ff88, size = 1) {
    const geometry = new T.RingGeometry(size * 0.5, size, 16);
    const material = new T.MeshBasicMaterial({color, transparent: true, opacity: 0.7, side: T.DoubleSide});
    const mesh = new T.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = 0.1;
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
    return mesh;
  }

  function clearMarkers() {
    markers.forEach(m => scene.remove(m));
    markers = [];
    objectiveMarkers.forEach(m => scene.remove(m));
    objectiveMarkers = [];
  }

  function showMissionMarker(mission) {
    clearMarkers();
    const marker = createMarker(mission.marker);
    markers.push(marker);
    minimap.addMissionMarker(mission.marker, mission.id);
  }

  function showObjectiveMarker(objective) {
    objectiveMarkers.forEach(m => scene.remove(m));
    objectiveMarkers = [];
    const marker = createObjectiveMarker(objective.target);
    objectiveMarkers.push(marker);
    minimap.addObjectiveMarker(objective.target);
  }

  function clearObjectiveMarkers() {
    objectiveMarkers.forEach(m => scene.remove(m));
    objectiveMarkers = [];
    minimap.clearObjectiveMarker();
  }

  function queueDialogue(lines) {
    dialogueQueue = lines.map((d, i) => ({...d, index: i}));
    dialogueIndex = 0;
    showingDialogue = true;
    showNextDialogue();
  }

  function showNextDialogue() {
    if (dialogueIndex < dialogueQueue.length) {
      const line = dialogueQueue[dialogueIndex];
      hud.showDialogue(`${line.speaker}: ${line.line}`);
      dialogueIndex++;
      setTimeout(showNextDialogue, 4000);
    } else {
      showingDialogue = false;
      hud.hideDialogue();
    }
  }

  function startMission(index) {
    if (index >= missions.length) return;
    currentMission = index;
    currentObjective = 0;
    missionActive = true;
    const mission = missions[currentMission];
    showMissionMarker(mission);
    updateObjective();
    queueDialogue(mission.dialogue);
  }

  function updateObjective() {
    const mission = missions[currentMission];
    if (currentObjective >= mission.objectives.length) {
      completeMission();
      return;
    }
    const obj = mission.objectives[currentObjective];
    hud.setObjective(obj.text);
    showObjectiveMarker(obj);
    if (obj.type === 'combat') {
      spawnCombatEnemies(obj.target, obj.enemies || 3);
    } else if (obj.type === 'escort') {
      escortTarget = createEscortTarget(obj.target);
    }
  }

  function createEscortTarget(target) {
    const geometry = new T.CylinderGeometry(0.5, 0.5, 1.8, 8);
    const material = new T.MeshBasicMaterial({color: 0x00ff88, transparent: true, opacity: 0.6});
    const mesh = new T.Mesh(geometry, material);
    mesh.position.copy(target);
    mesh.position.y = 0.9;
    scene.add(mesh);
    return mesh;
  }

  function spawnCombatEnemies(center, count) {
    combatEnemies.forEach(e => scene.remove(e.mesh));
    combatEnemies = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 8 + Math.random() * 4;
      const pos = new T.Vector3(
        center.x + Math.cos(angle) * radius,
        0,
        center.z + Math.sin(angle) * radius
      );
      const geometry = new T.CapsuleGeometry(0.4, 1.2, 4, 8);
      const material = new T.MeshStandardMaterial({color: 0xcc3333, roughness: 0.7});
      const mesh = new T.Mesh(geometry, material);
      mesh.position.copy(pos);
      mesh.position.y = 1;
      scene.add(mesh);
      combatEnemies.push({
        mesh,
        health: 100,
        position: pos.clone(),
        target: mara.root.position.clone(),
        state: 'chase'
      });
    }
  }

  function completeMission() {
    const mission = missions[currentMission];
    hud.toast(`Mission Complete: ${mission.name} · +$${mission.reward}`);
    mara.state.money += mission.reward;
    clearObjectiveMarkers();
    if (escortTarget) {
      scene.remove(escortTarget);
      escortTarget = null;
    }
    combatEnemies.forEach(e => scene.remove(e.mesh));
    combatEnemies = [];
    currentMission++;
    currentObjective = 0;
    if (currentMission >= missions.length) {
      missionActive = false;
      endingScreen = true;
      hud.showEndingScreen();
      minimap.clearMissionMarker();
    } else {
      startMission(currentMission);
    }
  }

  function advanceObjective() {
    const mission = missions[currentMission];
    const obj = mission?.objectives[currentObjective];
    if (mission?.id === 1 && obj?.type === 'collect') {
      combat.pickupPistol();
    }
    currentObjective++;
    updateObjective();
  }

  function checkObjectives(playerPos) {
    if (!missionActive || currentMission >= missions.length) return;
    const mission = missions[currentMission];
    const obj = mission.objectives[currentObjective];
    if (!obj) return;

    const dist = playerPos.distanceTo(obj.target);

    if (obj.type === 'reach' || obj.type === 'drive' || obj.type === 'escape') {
      if (dist < obj.radius) {
        advanceObjective();
      }
    } else if (obj.type === 'collect') {
      if (dist < obj.radius) {
        advanceObjective();
      }
    } else if (obj.type === 'combat') {
      const alive = combatEnemies.filter(e => e.health > 0).length;
      if (alive === 0) {
        advanceObjective();
      }
    } else if (obj.type === 'escort' && escortTarget) {
      if (dist < obj.radius) {
        world.remove(escortTarget);
        escortTarget = null;
        advanceObjective();
      }
    }
  }

  function updateCombatEnemies(dt, playerPos) {
    combatEnemies.forEach(enemy => {
      if (enemy.health <= 0) return;
      const toPlayer = new T.Vector3().subVectors(playerPos, enemy.position);
      const dist = toPlayer.length();
      if (dist < 15) {
        enemy.state = 'attack';
        toPlayer.normalize();
        enemy.position.addScaledVector(toPlayer, 3 * dt);
        enemy.mesh.position.copy(enemy.position);
        enemy.mesh.position.y = 1;
        enemy.mesh.lookAt(playerPos.x, 1, playerPos.z);
        if (dist < 2.5) {
          enemy.attackCooldown = (enemy.attackCooldown ?? 0) - dt;
          if (enemy.attackCooldown <= 0) {
            handleDamage(10);
            enemy.attackCooldown = 1.5;
          }
        }
      } else {
        enemy.state = 'chase';
      }
    });
  }

  function getLastCheckpoint() {
    const mission = missions[currentMission];
    if (mission && mission.checkpoints.length > 0) {
      return mission.checkpoints[Math.min(currentObjective, mission.checkpoints.length - 1)];
    }
    return missions[0]?.checkpoints[0] || new T.Vector3(0, 0, 0);
  }

  function respawnAtHospital() {
    const hospital = new T.Vector3(80, 0, -120);
    mara.root.position.copy(hospital);
    mara.root.position.y = 1;
    mara.state.health = 100;
    mara.state.armor = 0;
    const checkpoint = getLastCheckpoint();
    if (missionActive && currentMission < missions.length) {
      mara.root.position.copy(checkpoint);
      mara.root.position.y = 1;
    }
    snapInterpolation();
  }

  function onPlayerDeath() {
    if (!missionActive) return;
    hud.fadeToBlack(() => {
      respawnAtHospital();
      hud.fadeFromBlack();
    });
  }

  function update(dt, playerPos, input) {
    if (endingScreen) return;
    if (!missionActive && currentMission < missions.length) {
      const mission = missions[currentMission];
      const dist = playerPos.distanceTo(mission.marker);
      if (dist < mission.radius) {
        startMission(currentMission);
      }
    }
    if (missionActive) {
      checkObjectives(playerPos);
      updateCombatEnemies(dt, playerPos);
    }
  }

  function handleDamage(amount) {
    if (!missionActive) return;
    mara.state.health = Math.max(0, mara.state.health - amount);
    if (mara.state.health <= 0) {
      onPlayerDeath();
    }
  }

  function handleInput(input) {
    if (showingDialogue && input.consume('KeyF')) {
      showNextDialogue();
    }
  }

  return {
    update,
    handleInput,
    handleDamage,
    getCurrentMission: () => missions[currentMission],
    getCurrentObjective: () => missions[currentMission]?.objectives[currentObjective],
    isMissionActive: () => missionActive,
    isEnding: () => endingScreen,
    getCombatEnemies: () => combatEnemies
  };
}