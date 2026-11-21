import * as T from 'three';
import {buildCar,vehicleModels,carsOverlap,animateAICar} from './vehicles.js';
import {avenues,bridgeHeight} from './world.js';
import {standard,surfaceMaterial} from './render.js';
import {buildCitizen} from './peds.js';

export function createPolice(scene,world,vehicles,notify){
  const cars=[],officers=[],events=[],lastKnown=new T.Vector3(3,0,140);
  const listener=new T.Vector3(8,0,150);
  let wanted=0,hidden=0,clock=0,nextSpawn=0,blockTime=-100,serial=0,seen=false,dispatchUntil=0;
  const cooldowns=new Map();
  const model={...vehicleModels[1],name:'Halden Rhino Interceptor',color:'#203b50',top:42};
  const nearestAvenue=value=>avenues.reduce((a,b)=>Math.abs(b-value)<Math.abs(a-value)?b:a);
  function visible(from,to,range=80){
    if(from.distanceTo(to)>range)return false;
    const distance=from.distanceTo(to),steps=Math.ceil(distance/3);
    for(let i=1;i<steps;i++){const t=i/steps;if(world.blocked(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t,.12,1.7+from.y+(to.y-from.y)*t))return false;}
    return true;
  }
  function witnessed(position){return cars.some(c=>visible(c.root.position,position,85))||officers.some(o=>o.root.visible&&visible(o.root.position,position,55));}
  function offence(kind,position,needsWitness=false){
    if(needsWitness&&!witnessed(position))return false;
    if(clock<(cooldowns.get(kind)||0))return false;
    cooldowns.set(kind,clock+(kind==='collision'?3:5));wanted=Math.min(5,wanted+1);hidden=0;lastKnown.copy(position);dispatchUntil=clock+2;
    events.push({kind,wanted,time:clock});if(events.length>16)events.shift();
    notify(`${kind==='theft'?'Vehicle theft witnessed':kind==='red light'?'Red light witnessed':kind==='pedestrian'?'Pedestrian struck':'Collision reported'} · ${wanted} ${wanted===1?'star':'stars'}`);nextSpawn=Math.min(nextSpawn,clock);return true;
  }
  function makeUnit(x,z,heading,roadblock=false){
    const car=buildCar(model);car.id=`patrol-${serial++}`;car.police=true;car.roadblock=roadblock;car.heading=heading;car.root.rotation.y=heading;car.root.position.set(x,bridgeHeight(x,z)+.02,z);
    const white=standard('#eee9d4',.35,.15),dark=standard('#203b50',.4,.4);
    function box(w,h,d,x,y,z,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);car.root.add(m);}
    for(const side of [-1,1])box(.055,.58,2.15,side*1.15,1.18,.1,white);
    box(1.85,.09,2.45,0,2.79,.3,white);
    box(1.55,.055,.65,0,1.64,-1.65,white);
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#eee9d4';ctx.fillRect(0,0,256,64);ctx.fillStyle='#203b50';ctx.font='bold 35px Arial';ctx.textAlign='center';ctx.fillText('BAY POLICE',128,45);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const label=new T.MeshBasicMaterial({map:texture});
    for(const side of [-1,1]){const m=new T.Mesh(new T.PlaneGeometry(1.9,.46),label);m.position.set(side*1.185,1.18,.1);m.rotation.y=side*Math.PI/2;car.root.add(m);}
    box(1.55,.13,.4,0,2.88,0,dark);car.flash=[];
    for(const side of [-1,1]){const mat=surfaceMaterial({color:side<0?'#ff483d':'#4a9eff',emissive:side<0?'#ff1910':'#167bff',emissiveIntensity:3});box(.62,.18,.34,side*.4,3.02,0,mat);car.flash.push(mat);}
    car.path=[];car.repath=0;car.unseen=0;car.search=lastKnown.clone();scene.add(car.root);cars.push(car);vehicles.external.push(car);return car;
  }
  function free(x,z,heading){const probe={model,heading};return !world.blocked(x,z,1,0)&&![...vehicles.cars,...cars].some(c=>carsOverlap(probe,new T.Vector3(x,.02,z),c,c.root.position,1));}
  function spawnPursuit(focus,heading){
    for(const distance of [38,50,65,78])for(const side of [1,-1]){
      let x=focus.x+Math.sin(heading)*distance*side,z=focus.z+Math.cos(heading)*distance*side;
      if(Math.abs(Math.sin(heading))<.7)x=nearestAvenue(focus.x)+3;else z=nearestAvenue(focus.z)+3;
      if(Math.abs(x)>260||Math.abs(z)>260)continue;
      if(free(x,z,heading)){const c=makeUnit(x,z,heading);c.search.copy(lastKnown);return;}
    }
  }
  function roadblock(focus,heading){
    const vertical=Math.abs(Math.cos(heading))>.7,sign=vertical?-Math.sign(Math.cos(heading)):-Math.sign(Math.sin(heading));
    const axis=nearestAvenue(vertical?focus.x:focus.z),angle=vertical?Math.PI/2:0;
    for(const distance of [57,66,48,75]){
      const along=(vertical?focus.z:focus.x)+sign*distance;
      if(Math.abs(along)>255)continue;
      const locations=[-3.5,2.5].map(offset=>vertical?[axis+offset,along]:[along,axis+offset]);
      if(locations.some(([x,z])=>!free(x,z,angle)))continue;
      for(const [x,z] of locations)makeUnit(x,z,angle,true);
      blockTime=clock;notify('Roadblock reported ahead · use another avenue');return;
    }
  }
  // Navigate the avenue graph to the last observed position. Buildings never supply a target.
  function plan(car,target){
    const p=car.root.position,vertical=Math.abs(p.x-nearestAvenue(p.x))<Math.abs(p.z-nearestAvenue(p.z));
    if((Math.abs(p.x-target.x)<6||Math.abs(p.z-target.z)<6)&&visible(p,target,120)){car.path=[[target.x,target.z]];return;}
    const sx=nearestAvenue(p.x),sz=nearestAvenue(p.z),tx=nearestAvenue(target.x),tz=nearestAvenue(target.z),points=[];
    if(vertical)points.push([sx+3,p.z]);else points.push([p.x,sz+3]);points.push([sx+3,sz+3]);
    let x=sx,z=sz;
    while(x!==tx){x+=Math.sign(tx-x)*80;points.push([x+3,z+3]);}
    while(z!==tz){z+=Math.sign(tz-z)*80;points.push([x+3,z+3]);}
    if(Math.abs(target.x-tx)<10)points.push([tx+3,target.z]);else points.push([target.x,tz+3]);
    car.path=points.filter(([x,z])=>Math.hypot(p.x-x,p.z-z)>2);
  }
  function remove(car){scene.remove(car.root);cars.splice(cars.indexOf(car),1);vehicles.external.splice(vehicles.external.indexOf(car),1);const mats=new Set();car.root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)mats.add(o.material);});for(const m of mats){m.map?.dispose();m.dispose();}}
  function reset(){for(const c of [...cars])remove(c);for(const o of officers)scene.remove(o.root);officers.length=0;wanted=0;hidden=0;clock=0;seen=false;nextSpawn=0;dispatchUntil=0;blockTime=-100;cooldowns.clear();events.length=0;makeUnit(3,134,0);}
  function update(dt,focus,active,clockDelta=dt){
    listener.copy(focus);
    clock+=clockDelta;seen=wanted>0&&witnessed(focus);
    if(seen){lastKnown.copy(focus);hidden=0;}else if(wanted>0){hidden+=clockDelta;if(hidden>=20){wanted--;hidden=0;notify(wanted?'Search cooling · wanted level reduced':'Search ended · you lost the police');}}
    const pursuit=cars.filter(c=>!c.roadblock);
    if(wanted>0&&seen&&pursuit.length<Math.min(4,wanted+1)&&clock>=nextSpawn){spawnPursuit(focus,active?.heading||0);nextSpawn=clock+5;}
    if(wanted>0&&pursuit.length<2&&clock>=nextSpawn&&clock<dispatchUntil){spawnPursuit(lastKnown,active?.heading||0);nextSpawn=clock+5;}
    if(wanted>=3&&seen&&clock-blockTime>35&&cars.filter(c=>c.roadblock).length<4)roadblock(focus,active?.heading||0);
    if(wanted>=3&&officers.length<2){const anchor=cars.find(c=>c.roadblock)||cars[0];if(anchor){const o=buildCitizen(scene,officers.length,true);o.root.position.copy(anchor.root.position).add(new T.Vector3(4,0,0));officers.push(o);}}
    for(const c of [...cars]){
      const p=c.root.position,canSee=visible(p,focus,85);c.unseen=canSee?0:c.unseen+clockDelta;
      c.flash.forEach((m,i)=>m.emissiveIntensity=wanted>0&&Math.floor(clock*7)%2===i?5:.04);
      c.root.visible=p.distanceToSquared(focus)<150*150;
      if(c.unseen>8&&p.distanceTo(focus)>150){remove(c);continue;}
      if(c.roadblock){if(wanted===0&&c.unseen>5)remove(c);continue;}
      if(wanted===0){c.speed=0;continue;}
      if(canSee)c.search.copy(focus);
      c.repath-=dt;if(c.repath<=0){if(canSee||!c.path.length)plan(c,c.search);c.repath=2.5;}
      const goal=c.path[0];if(!goal){c.speed=0;continue;}
      const dx=goal[0]-p.x,dz=goal[1]-p.z,distance=Math.hypot(dx,dz);if(distance<2){c.path.shift();continue;}
      const oldHeading=c.heading;c.heading=Math.atan2(-dx,-dz);
      if([...vehicles.cars,...cars].some(o=>o!==c&&carsOverlap(c,p,o,o.root.position,.15))){c.heading=oldHeading;c.speed=0;continue;}
      const following=canSee&&p.distanceTo(focus)<10;
      const desired=following?Math.max(0,(p.distanceTo(focus)-5)*2):c.unseen>12?0:Math.min(42,16+wanted*5);c.speed=T.MathUtils.damp(c.speed,desired,2,dt);
      const next=p.clone().add(new T.Vector3(dx/distance,0,dz/distance).multiplyScalar(Math.min(distance,c.speed*dt)));
      const obstacle=[...vehicles.cars,...cars].some(o=>o!==c&&carsOverlap(c,next,o,o.root.position,.35));
      if(!obstacle&&!world.blocked(next.x,next.z,1.2,next.y+.1)){p.copy(next);p.y=bridgeHeight(p.x,p.z)+.02;}else{c.speed=0;c.repath=Math.min(c.repath,.5);}
      animateAICar(c,dt);
    }
    for(const o of officers){const p=o.root.position,dist=p.distanceTo(focus);let speed=0;if(wanted>0&&visible(p,focus,55)&&dist>4){const dir=focus.clone().sub(p).setY(0).normalize(),next=p.clone().addScaledVector(dir,dt*3.5);if(!world.blocked(next.x,next.z,.35,1)){p.copy(next);speed=3.5;o.root.rotation.y=Math.atan2(-dir.x,-dir.z);}}o.animate(dt,speed);o.root.visible=wanted>=3&&dist<100;}
    if(wanted===0&&cars.length===0&&focus.distanceTo(new T.Vector3(3,0,134))<130)makeUnit(3,134,0);
  }
  reset();
  return {cars,officers,update,reset,offence,witnessed,get wanted(){return wanted;},get seen(){return seen;},get siren(){return wanted>0?Math.max(0,...cars.map(c=>1-c.root.position.distanceTo(listener)/120)):0;},inspect:()=>({wanted,hidden,seen,lastKnown:lastKnown.toArray(),roadblocks:cars.filter(c=>c.roadblock).length,officers:officers.filter(o=>o.root.visible).length,events:[...events],cars:cars.map(c=>({id:c.id,position:c.root.position.toArray(),speed:c.speed,heading:c.heading,roadblock:c.roadblock,unseen:c.unseen,flash:c.flash.map(m=>m.emissiveIntensity)}))})};
}
