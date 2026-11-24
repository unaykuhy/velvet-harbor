import * as T from 'three';
import {createRenderer,makeMaterials} from './render.js';
import {createCity} from './world.js';
import {createVehicles} from './vehicles.js';
import {createMara} from './character.js';
import {createInput} from './input.js';
import {createHUD} from './hud.js';
import {createMinimap} from './minimap.js';
import {readSave,writeSave,applySave} from './save.js';
import {createAudio} from './audio.js';
import {createTraffic} from './traffic.js';
import {createPedestrians} from './peds.js';
import {createPolice} from './police.js';
import {createRain,createLanterns} from './weather.js';
import {createPostFX} from './postfx.js';
import {createHelicopter} from './helicopter.js';
import {createMissions} from './missions.js';
import {createCombat} from './combat.js';

const graphics=createRenderer(),materials=makeMaterials();
const postfx=createPostFX(graphics.renderer,graphics.scene,graphics.camera);
const world=createCity(graphics.scene,materials),vehicles=createVehicles(graphics.scene),mara=createMara(graphics.scene);
const rain=createRain(graphics.scene),lanterns=createLanterns(graphics.scene);
const reflectiveMaterials=new Set();graphics.scene.traverse(object=>{if(object.material?.isMeshStandardMaterial)reflectiveMaterials.add(object.material);});
const hud=createHUD(),minimap=createMinimap(world),audio=createAudio();
const traffic=createTraffic(graphics.scene,vehicles);
const police=createPolice(graphics.scene,world,vehicles,text=>hud.toast(text));
police.onWantedChange(detail=>window.dispatchEvent(new CustomEvent('velvet:wanted-change',{detail})));
const helicopter=createHelicopter(graphics.scene);
const combat=createCombat(mara,graphics.scene,world,hud,police,audio);
const missions=createMissions(graphics.scene,world,hud,minimap,mara,police,combat,snapInterpolation);
window.addEventListener('velvet:wanted-change',e=>{
  helicopter.setActive(e.detail.helicopterRequired,night);
  const prev=e.detail.previous,wanted=e.detail.wanted;
  if(wanted>prev)hud.dispatch(`WANTED LEVEL ${wanted} — ${wanted===5?'SKY PATROL INBOUND':'ALL UNITS ENGAGE'}`);
  else if(wanted<prev)hud.dispatch(wanted===0?'SEARCH TERMINATED — SUBJECT LOST':`WANTED REDUCED TO ${wanted} STAR${wanted===1?'':'S'}`);
});
const pedestrians=createPedestrians(graphics.scene,world,traffic,()=>police.offence('pedestrian',activeCar.root.position));
const state={money:2450,health:100,armor:50,minutes:18*60+30,cameraView:'chase'};
mara.state=state;
const el=id=>document.getElementById(id);
let mode='start',activeCar=null,shake=0,elapsed=0,lastSave=0,lastTime=performance.now(),frames=0;
let cameraReady=false,night=0;
const lastShadowPosition=new T.Vector3(999,999,999);let lastShadowMinute=-1;
const input=createInput(el('view'),pause);
const cameraTarget=new T.Vector3(),desiredCamera=new T.Vector3(),cameraSpringPosition=new T.Vector3(),cameraSpringVelocity=new T.Vector3();
let cameraSpringYaw=0,cameraSpringYawVelocity=0,cameraSpringChase=false,lastMode=mode,testManual=false;
let bodyCar=null,bodyLastSpeed=0,bodyAcceleration=0;
// Two switchable camera views: the spring chase camera and a first-person view
// (Mara's eyes on foot, the driver's seat in a car). The choice persists in the save.
let viewBlend=0;
const firstPersonPosition=new T.Vector3(),firstPersonTarget=new T.Vector3();
function toggleView(){
  state.cameraView=state.cameraView==='first'?'chase':'first';
  el('view-toggle').textContent=state.cameraView==='first'?'VIEW · FIRST-PERSON':'VIEW · CHASE';
  hud.toast(state.cameraView==='first'?'First-person view.':'Chase camera view.');
}
function refreshViewVisibility(){
  const first=state.cameraView==='first';
  if(activeCar?.shell)activeCar.shell.visible=!first;
  for(const car of vehicles.cars)if(car!==activeCar&&car.shell)car.shell.visible=true;
  // Cockpit geometry only exists for the driver's eyes: hidden in chase view and on
  // every other car — the other parked bays, every police unit (vehicles.external)
  // and every traffic car (traffic.js pushes into vehicles.cars, hidden explicitly
  // too for safety) — so nothing odd clings to them. Their shells stay visible.
  if(activeCar?.interior)activeCar.interior.visible=first;
  for(const car of vehicles.cars)if(car!==activeCar&&car.interior)car.interior.visible=false;
  for(const car of police.cars)if(car.interior)car.interior.visible=false;
  for(const car of traffic.cars)if(car!==activeCar&&car.interior)car.interior.visible=false;
  // Bikes carry a seated rider only while being driven; parked bikes stay empty and
  // first-person view hides the rider together with the outer shell.
  for(const car of vehicles.cars)if(car.rider){const showRider=car===activeCar?!first:!!car.ai;car.rider.visible=showRider;}
  const hiddenHead=first&&!activeCar;
  for(const part of mara.headParts)part.visible=!hiddenHead;
}
// First-person eye pose: Mara's eyes with a subtle walk bob, or the driver's seat
// looking over the dashboard and steering wheel through the windshield.
function firstPersonPose(){
  const heading=activeCar?activeCar.heading:0;
  if(activeCar){
    const eye=activeCar.driverEye,p=activeCar.root.position;
    firstPersonPosition.set(p.x+eye.x*Math.cos(heading)+eye.z*Math.sin(heading),p.y+eye.y,p.z-eye.x*Math.sin(heading)+eye.z*Math.cos(heading));
  }else{
    const bob=Math.sin(mara.stride*2)*.028*Math.min(1,mara.velocity.length()/3.4);
    firstPersonPosition.set(mara.root.position.x,mara.root.position.y+1.68+bob,mara.root.position.z);
  }
  const yaw=input.yaw,reach=12;
  firstPersonTarget.set(firstPersonPosition.x-Math.sin(yaw)*reach,firstPersonPosition.y-Math.sin(input.pitch)*reach,firstPersonPosition.z-Math.cos(yaw)*reach);
}
// Fixed-step simulation core: the world advances in exact 1/60 s ticks and the
// renderer interpolates every moving body between the last two ticks, so motion
// stays smooth and deterministic regardless of frame rate.
const FIXED_STEP=1/60,MAX_FRAME_DELTA=.05,MAX_STEPS_PER_FRAME=4;
let accumulator=0;
const simEntities=new Set();
function collectSimEntities(){simEntities.clear();simEntities.add(mara);for(const car of vehicles.cars)simEntities.add(car);for(const car of police.cars)simEntities.add(car);for(const person of pedestrians.people)simEntities.add(person);if(activeCar)simEntities.add(activeCar);}
function trackEntity(entity){
  if(!entity._prevPos){entity._prevPos=entity.root.position.clone();entity._curPos=entity.root.position.clone();entity._prevYaw=entity.root.rotation.y;entity._curYaw=entity.root.rotation.y;}
}
function simStepBegin(entity){trackEntity(entity);entity.root.position.copy(entity._curPos);entity.root.rotation.y=entity._curYaw;}
function simStepEnd(entity){trackEntity(entity);entity._prevPos.copy(entity._curPos);entity._curPos.copy(entity.root.position);entity._prevYaw=entity._curYaw;entity._curYaw=entity.root.rotation.y;}
function applyInterpolation(entity,alpha){
  trackEntity(entity);
  entity.root.position.lerpVectors(entity._prevPos,entity._curPos,alpha);
  entity.root.rotation.y=entity._prevYaw+Math.atan2(Math.sin(entity._curYaw-entity._prevYaw),Math.cos(entity._curYaw-entity._prevYaw))*alpha;
}
// Re-anchor the interpolation buffers after a teleport (menu start, car doors, test hooks).
function snapInterpolation(){collectSimEntities();for(const entity of simEntities){trackEntity(entity);entity._prevPos.copy(entity.root.position);entity._curPos.copy(entity.root.position);entity._prevYaw=entity.root.rotation.y;entity._curYaw=entity.root.rotation.y;}}
function stepSimulation(){
  collectSimEntities();
  for(const entity of simEntities)simStepBegin(entity);
  state.minutes=(state.minutes+FIXED_STEP*2)%1440;
  if(input.consume('KeyE')){interact();snapInterpolation();}
  if(activeCar){
    const previous=activeCar.root.position.clone();
    // Substeps keep high-speed movement from tunneling through narrow props.
    const count=Math.ceil(FIXED_STEP/.012);for(let i=0;i<count;i++)vehicles.drive(activeCar,FIXED_STEP/count,input,world,(force,other)=>{shake=Math.min(3,force/8);audio.impact(force);if(force>5)hud.toast('Hard impact · vehicle damaged');if(other)police.offence('collision',activeCar.root.position);});
    if(traffic.checkRedCrossing(activeCar,previous))police.offence('red light',activeCar.root.position,true);
  }else{const walkingSteps=Math.ceil(FIXED_STEP/.02);for(let i=0;i<walkingSteps;i++)mara.update(FIXED_STEP/walkingSteps,input,input.yaw,world);}
  const focus=activeCar?activeCar.root.position:mara.root.position,playerHeading=activeCar?.heading??mara.root.rotation.y;
  traffic.update(FIXED_STEP,activeCar,focus,pedestrians.people);
  police.update(FIXED_STEP,focus,activeCar,FIXED_STEP,playerHeading);
  pedestrians.update(FIXED_STEP,activeCar,focus,[...vehicles.cars,...police.cars]);
  missions.update(FIXED_STEP,focus,input);
  for(const entity of simEntities)simStepEnd(entity);
}
const initialCars=vehicles.cars.map(car=>({position:car.root.position.clone(),heading:car.heading}));
el('loading').remove();
el('continue').disabled=!readSave();

function pause(force=false) {
  if(mode==='play'){
    mode='pause';input.enabled=false;el('menu').classList.remove('hidden');hud.show(false);
    el('menu-label').textContent='SALTGILT / PAUSED';
    el('intro').textContent='Take a breath. The harbor can wait.';
    el('new').classList.add('hidden');el('continue').classList.add('hidden');el('save').classList.remove('hidden');el('resume').classList.remove('hidden');
  } else if(mode==='pause'&&!force)resume();
}
function resume(){mode='play';input.enabled=true;el('menu').classList.add('hidden');hud.show(true);audio.start();}
function begin(load) {
  police.reset();traffic.reset();pedestrians.reset();
  if(load){
    const saved=readSave();if(!saved){hud.toast('No saved game is available.');return;}
    activeCar=applySave(saved,state,mara,vehicles);
  }else{
    state.money=2450;state.health=100;state.armor=50;state.minutes=1110;
    mara.root.position.set(8,0,150);mara.reset();activeCar=null;
    vehicles.cars.forEach((car,i)=>{car.root.position.copy(initialCars[i].position);car.heading=initialCars[i].heading;car.root.rotation.set(0,car.heading,0);car.speed=0;car.damage=0;car.owned=false;});
  }
  mara.root.visible=!activeCar;input.yaw=activeCar?.heading||0;input.pitch=.16;cameraReady=false;
  el('view-toggle').textContent=state.cameraView==='first'?'VIEW · FIRST-PERSON':'VIEW · CHASE';
  resume();hud.toast(load?'Welcome back to Saltgilt.':'Mara Vale · Pearlwake Boulevard. Your afternoon starts here.');
}
function saveGame(){const ok=writeSave(state,mara,vehicles,activeCar);hud.toast(ok?'Game saved on this browser.':'Storage unavailable. Your game could not be saved.');return ok;}
el('new').onclick=()=>begin(false);el('continue').onclick=()=>begin(true);el('resume').onclick=resume;
el('view-toggle').onclick=toggleView;
el('save').onclick=()=>{const ok=saveGame();el('intro').textContent=ok?'Game saved on this browser.':'Storage unavailable. Please keep this page open.';};
el('controls').onclick=()=>el('controls-panel').classList.toggle('hidden');
addEventListener('pagehide',()=>{if(mode!=='start')writeSave(state,mara,vehicles,activeCar);});
addEventListener('resize',()=>postfx.setSize(innerWidth,innerHeight));

function interact() {
  if(activeCar){
    if(Math.abs(activeCar.speed)>3){hud.toast('Slow down before stepping out.');return;}
    const car=activeCar,p=car.root.position;
    const offsets=[[-1,0],[1,0],[0,1],[0,-1]];
    for(const [side,end] of offsets){
      const x=p.x+Math.cos(car.heading)*side*(car.model.width/2+1.1)-Math.sin(car.heading)*end*(car.model.length/2+1);
      const z=p.z-Math.sin(car.heading)*side*(car.model.width/2+1.1)-Math.cos(car.heading)*end*(car.model.length/2+1);
      if(!world.blocked(x,z,.4,p.y+.2)&&!vehicles.cars.some(c=>c!==car&&Math.hypot(c.root.position.x-x,c.root.position.z-z)<2)){
        mara.root.position.set(x,p.y,z);mara.reset();mara.root.visible=true;activeCar=null;car.speed=0;input.consume('Space');hud.toast('Back on foot.');return;
      }
    }
    hud.toast('The doors are blocked. Find more room.');
  }else{
    const car=vehicles.nearest(mara.root.position);
    if(car){const stolen=!car.owned;activeCar=car;car.owned=true;car.ai=false;mara.root.visible=false;input.yaw=car.heading;hud.toast(`${car.model.name} · W accelerate, S brake, Space handbrake`);if(stolen)police.offence('theft',car.root.position,true);}
  }
}

function updateCamera(dt,focus) {
  const speed=activeCar?Math.abs(activeCar.speed):0;
  if(activeCar&&!document.pointerLockElement) {
    input.yaw+=Math.atan2(Math.sin(activeCar.heading-input.yaw),Math.cos(activeCar.heading-input.yaw))*(1-Math.exp(-dt*1.8));
  }
  const distance=activeCar?7.8+speed*.055:5.6;
  const height=activeCar?3.1:2.5;
  cameraTarget.copy(focus).add(new T.Vector3(0,activeCar?1.05:1.25,0));
  desiredCamera.set(focus.x+Math.sin(input.yaw)*distance,focus.y+height+Math.sin(input.pitch)*distance,focus.z+Math.cos(input.yaw)*distance);
  // Lift over nearby vehicles so a pursuing light bar cannot fill the camera.
  if(activeCar){
    const dx=desiredCamera.x-focus.x,dz=desiredCamera.z-focus.z;
    for(const other of [...vehicles.cars,...police.cars]){
      if(other===activeCar)continue;
      const p=other.root.position,t=((p.x-focus.x)*dx+(p.z-focus.z)*dz)/(dx*dx+dz*dz);
      if(t>.15&&t<1.25&&Math.hypot(p.x-focus.x-dx*t,p.z-focus.z-dz*t)<other.model.width*1.1)desiredCamera.y=Math.max(desiredCamera.y,focus.y+6.2);
    }
  }
  // Pull the camera in along its ray if an architectural surface would hide the protagonist.
  const direction=desiredCamera.clone().sub(cameraTarget);
  for(let t=.15;t<=1;t+=.08){const sample=cameraTarget.clone().addScaledVector(direction,t);if(world.blocked(sample.x,sample.z,.2,sample.y)){desiredCamera.copy(cameraTarget).addScaledVector(direction,Math.max(.12,t-.1));break;}}
  const offsetX=desiredCamera.x-focus.x,offsetZ=desiredCamera.z-focus.z,radius=Math.hypot(offsetX,offsetZ);
  const chase=radius>.75,desiredYaw=Math.atan2(offsetX,offsetZ),step=Math.min(dt,MAX_FRAME_DELTA),stiffness=81,damping=18;
  if(chase&&cameraReady&&cameraSpringChase){
    const yawError=Math.atan2(Math.sin(desiredYaw-cameraSpringYaw),Math.cos(desiredYaw-cameraSpringYaw));
    cameraSpringYawVelocity+=(yawError*stiffness-damping*cameraSpringYawVelocity)*step;cameraSpringYaw+=cameraSpringYawVelocity*step;
    desiredCamera.x=focus.x+Math.sin(cameraSpringYaw)*radius;desiredCamera.z=focus.z+Math.cos(cameraSpringYaw)*radius;
  }
  if(!cameraReady||chase!==cameraSpringChase){
    cameraSpringChase=chase;cameraSpringYaw=desiredYaw;cameraSpringYawVelocity=0;
    cameraSpringPosition.copy(desiredCamera);cameraSpringVelocity.set(0,0,0);graphics.camera.position.copy(desiredCamera);cameraReady=true;
  }else if(chase){
    cameraSpringVelocity.x+=((desiredCamera.x-cameraSpringPosition.x)*stiffness-damping*cameraSpringVelocity.x)*step;
    cameraSpringVelocity.y+=((desiredCamera.y-cameraSpringPosition.y)*stiffness-damping*cameraSpringVelocity.y)*step;
    cameraSpringVelocity.z+=((desiredCamera.z-cameraSpringPosition.z)*stiffness-damping*cameraSpringVelocity.z)*step;
    cameraSpringPosition.addScaledVector(cameraSpringVelocity,step);graphics.camera.position.copy(cameraSpringPosition);
  }else{cameraSpringPosition.copy(desiredCamera);cameraSpringVelocity.set(0,0,0);graphics.camera.position.copy(desiredCamera);}
  shake*=Math.exp(-dt*7);
  graphics.camera.position.x+=Math.sin(elapsed*83)*shake*.08;graphics.camera.position.y+=Math.sin(elapsed*63)*shake*.05;
  // Blend toward the first-person pose when the first-person view is active; the spring
  // keeps following the chase pose underneath so toggling back is equally smooth.
  viewBlend=T.MathUtils.damp(viewBlend,state.cameraView==='first'?1:0,5,dt);
  if(viewBlend>.995)viewBlend=1;else if(viewBlend<.005)viewBlend=0;
  if(viewBlend>0){
    firstPersonPose();
    const blend=viewBlend*viewBlend*(3-2*viewBlend);
    graphics.camera.position.lerp(firstPersonPosition,blend);
    cameraTarget.lerp(firstPersonTarget,blend);
  }
  graphics.camera.lookAt(cameraTarget);
  const speedTarget=state.cameraView==='first'&&viewBlend>.5?64+speed*.18:59+speed*.34;
  graphics.camera.fov=T.MathUtils.damp(graphics.camera.fov,speedTarget,3,dt);graphics.camera.updateProjectionMatrix();
}

function updateBodyVisual(dt){
  if(bodyCar!==activeCar){
    if(bodyCar){bodyCar.root.rotation.x=0;bodyCar.root.rotation.z=0;}
    bodyCar=activeCar;bodyLastSpeed=activeCar?.speed||0;bodyAcceleration=0;
    if(bodyCar){bodyCar.root.rotation.x=0;bodyCar.root.rotation.z=0;}
  }
  if(!activeCar)return;
  if(activeCar.speed!==bodyLastSpeed){bodyAcceleration=(activeCar.speed-bodyLastSpeed)/FIXED_STEP;bodyLastSpeed=activeCar.speed;}
  const speedFactor=Math.min(1,Math.abs(activeCar.speed)/20);
  const motorcycle=activeCar.model.kind==='sportbike'||activeCar.model.kind==='classic-bike';
  const targetRoll=motorcycle?T.MathUtils.clamp(-activeCar.steer*activeCar.speed*.019,-.50,.50):T.MathUtils.clamp(-activeCar.steer*speedFactor*.055,-.055,.055);
  const targetPitch=T.MathUtils.clamp(-bodyAcceleration*.0025,motorcycle?-.018:-.035,motorcycle?.018:.035);
  activeCar.root.rotation.z=T.MathUtils.damp(activeCar.root.rotation.z,targetRoll,8,dt);
  activeCar.root.rotation.x=T.MathUtils.damp(activeCar.root.rotation.x,targetPitch,8,dt);
}

function animate(now) {
  requestAnimationFrame(animate);
  const realDelta=(now-lastTime)/1000,dt=Math.min(MAX_FRAME_DELTA,Math.max(.001,realDelta));lastTime=now;elapsed+=dt;frames++;
  if(mode!==lastMode){accumulator=0;if(mode==='play')snapInterpolation();lastMode=mode;}
  if(mode==='play'){
    if(input.consume('F5'))saveGame();
    if(input.consume('KeyV'))toggleView();
    refreshViewVisibility();
    if(!testManual){
      accumulator=Math.min(accumulator+dt,FIXED_STEP*MAX_STEPS_PER_FRAME);
      let steps=0;while(accumulator>=FIXED_STEP&&steps<MAX_STEPS_PER_FRAME){stepSimulation();accumulator-=FIXED_STEP;steps++;}
      collectSimEntities();const alpha=accumulator/FIXED_STEP;for(const entity of simEntities)applyInterpolation(entity,alpha);
    }
    const focus=activeCar?activeCar.root.position:mara.root.position;
    if(!testManual){updateCamera(dt,focus);night=graphics.updateDay(state.minutes,focus,materials);
    world.update(elapsed,night,focus);vehicles.update(elapsed,night,focus,activeCar,state.cameraView==='first'&&viewBlend>.5?.38:1);updateBodyVisual(dt);helicopter.update(dt,focus,night,activeCar?.heading??mara.root.rotation.y);
    combat.update(dt,missions.getCombatEnemies(),graphics.camera,input);}
    else night=graphics.updateDay(state.minutes,focus,materials);
    rain.update(dt,graphics.camera);lanterns.update(elapsed);
    hud.update(state,focus,activeCar,vehicles.nearest(focus),police.wanted,!police.seen);if(frames%3===0)minimap.draw(focus,input.yaw,vehicles.cars,activeCar,police.cars);
    if(elapsed-lastSave>20){writeSave(state,mara,vehicles,activeCar);lastSave=elapsed;}
  }else if(mode==='start'){
    const focus=new T.Vector3(0,0,155);night=graphics.updateDay(state.minutes,focus,materials);world.update(elapsed,night,focus);vehicles.update(elapsed,night,focus,null);
    rain.update(.016,graphics.camera);lanterns.update(elapsed);
    graphics.camera.position.set(304+Math.sin(elapsed*.025)*2,30,244);graphics.camera.lookAt(15,14,55);
  }
  audio.update(activeCar?.speed||0,!!activeCar,mode!=='play',police.siren);
  // Wet asphalt keeps a controlled environment sheen after dark so neon and light bars read on
  // the tarmac without washing the pavement out.
  reflectiveMaterials.forEach(material=>{material.envMapIntensity=material===materials.asphalt?.35+night*.8:.035+(1-night)*.65;});
  const shadowFocus=activeCar?activeCar.root.position:mara.root.position;
  if(shadowFocus.distanceToSquared(lastShadowPosition)>36||Math.abs(state.minutes-lastShadowMinute)>4){
    graphics.renderer.shadowMap.needsUpdate=true;lastShadowPosition.copy(shadowFocus);lastShadowMinute=state.minutes;
  }
  postfx.render();
}
requestAnimationFrame(animate);

// Read-only telemetry supports direct browser verification without alternate gameplay paths.
Object.defineProperty(window,'velvet',{value:{
  inspect:()=>({
    mode,position:(activeCar?activeCar.root.position:mara.root.position).toArray(),
    onFoot:mara.root.visible,car:activeCar?.id||null,speed:activeCar?.speed||0,damage:activeCar?.damage||0,steer:activeCar?.steer||0,
    heading:activeCar?.heading??mara.root.rotation.y,grounded:mara.grounded,minutes:state.minutes,money:state.money,health:state.health,armor:state.armor,
    ownedCars:vehicles.cars.filter(c=>c.owned).map(c=>c.id),models:vehicles.cars.map(c=>c.model.name),cameraView:state.cameraView,viewBlend,
    frames,night,audio:audio.available,cameraFov:graphics.camera.fov,drawCalls:graphics.renderer.info.render.calls,triangles:graphics.renderer.info.render.triangles,shaderPrograms:graphics.renderer.info.programs.length,seed:world.seed,
    wheelRotation:activeCar?.wheels[0].rotation.x||0,steeringWheelAngle:activeCar?.steeringWheel.rotation.z||0,smokePuffs:activeCar?.smoke.children.filter(p=>p.visible).length||0,
    windowGlow:materials.windowLight.emissiveIntensity,lampGlow:materials.lamp.emissiveIntensity,cameraPosition:graphics.camera.position.toArray(),cameraYaw:input.yaw,cameraSpringYaw,bodyRoll:activeCar?.root.rotation.z||0,bodyPitch:activeCar?.root.rotation.x||0,save:readSave(),
    rainCount:rain.count,lanternCount:lanterns.count,postfx:postfx.info(),
    wanted:police.wanted,trafficCarCount:traffic.cars.filter(c=>c.ai).length,pedestrianCount:pedestrians.people.length,policeCarCount:police.cars.length,
    bayInteriors:vehicles.cars.map(c=>c.interior?c.interior.visible:null),policeInteriors:police.cars.map(c=>c.interior?c.interior.visible:null),trafficInteriors:traffic.cars.map(c=>c.interior?c.interior.visible:null),
    trafficLights:traffic.inspect(),pedestrians:pedestrians.inspect(),police:police.inspect(),siren:audio.sirenState,
    helicopter:{active:helicopter.active,position:helicopter.root.position.toArray(),rotorSpeed:helicopter.mainRotor.rotation.y,searchlight:helicopter.searchlight.intensity>0}
  })
},writable:false});

// Deterministic controls for browser verification; nothing runs until a test calls them.
function testSnapshot(){
  const policeState=police.inspect(),text=document.querySelector('.stars').textContent;
  return {wanted:police.wanted,hudStars:Array.from(text).filter(star=>star==='★').length,hudText:text,hidden:policeState.hidden,seen:policeState.seen,clock:policeState.clock};
}
function refreshTestHUD(){const focus=activeCar?activeCar.root.position:mara.root.position;hud.update(state,focus,activeCar,vehicles.nearest(focus),police.wanted,!police.seen);}
Object.defineProperty(window,'__vhTest',{value:{
  setManual(value){testManual=!!value;accumulator=0;snapInterpolation();return testManual;},
step(count=1){
      if(!testManual)throw new Error('Enable manual test mode before stepping');
      if(!Number.isInteger(count)||count<0||count>600)throw new TypeError('Test steps must be an integer from 0 to 600');
      for(let i=0;i<count;i++){stepSimulation();updateBodyVisual(FIXED_STEP);const focus=activeCar?activeCar.root.position:mara.root.position;updateCamera(FIXED_STEP,focus);night=graphics.updateDay(state.minutes,focus,materials);helicopter.update(FIXED_STEP,focus,night,activeCar?.heading??mara.root.rotation.y);combat.update(FIXED_STEP,missions.getCombatEnemies(),graphics.camera,input);}
      collectSimEntities();for(const entity of simEntities)applyInterpolation(entity,1);refreshTestHUD();return window.velvet.inspect();
    },
    forceWanted(level){
      police.forceWanted(level);const focus=activeCar?activeCar.root.position:mara.root.position;police.update(0,focus,activeCar,0);helicopter.update(0,focus,night,activeCar?.heading??mara.root.rotation.y);refreshTestHUD();return testSnapshot();
    },
  advanceTime(seconds){
    if(!Number.isFinite(seconds)||seconds<0)throw new TypeError('Fake time must be a finite, non-negative number');
    let remaining=seconds;while(remaining>1e-10){const step=Math.min(1/60,remaining),focus=activeCar?activeCar.root.position:mara.root.position;police.update(0,focus,activeCar,step);remaining-=step;}
    refreshTestHUD();return testSnapshot();
  },
  setPosition(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Test position must be finite');
    const root=activeCar?activeCar.root:mara.root;root.position.set(x,root.position.y,z);snapInterpolation();cameraReady=false;police.update(0,root.position,activeCar,0);refreshTestHUD();return testSnapshot();
  },
  spawnPoliceAhead(forward=4,side=0){
    if(!Number.isFinite(forward)||!Number.isFinite(side))throw new TypeError('Test police offset must be finite');
    const focus=activeCar?activeCar.root.position:mara.root.position,heading=activeCar?.heading??mara.root.rotation.y;
    const car=police.spawnTestUnit(focus,heading,forward,side);refreshTestHUD();return {id:car.id,position:car.root.position.toArray()};
  },
  snapshot:testSnapshot
},writable:false});
// Screenshot-only hook: freezes a camera pose for skyline captures (no gameplay effect).
Object.defineProperty(window,'__vhCamera',{value:(pos,look)=>{graphics.camera.position.set(pos[0],pos[1],pos[2]);graphics.camera.lookAt(look[0],look[1],look[2]);},writable:false});

