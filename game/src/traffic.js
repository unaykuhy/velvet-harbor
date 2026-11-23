import * as T from 'three';
import {avenues,bridgeHeight} from './world.js';
import {buildCar,vehicleModels,carsOverlap,animateAICar} from './vehicles.js';
import {standard,surfaceMaterial} from './render.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createBus} from './bus.js';

export function createTraffic(scene,vehicles) {
  let clock=0,redStops=0,redViolations=0;
  const cars=[],lights=[],lampMaterials={};
  const poleMaterial=standard('#38545b',.45,.6),housing=standard('#172b31');
  for(const axis of ['NS','EW'])for(const color of ['red','yellow','green']){
    lampMaterials[axis+color]=surfaceMaterial({color:{red:'#ff493d',yellow:'#ffc568',green:'#58efb3'}[color],emissive:{red:'#ff2418',yellow:'#ffa62a',green:'#22ff96'}[color],emissiveIntensity:0});
  }
  function phase(axis){const t=clock%28;if(axis==='NS')return t<10?'green':t<12?'yellow':'red';return t>=14&&t<24?'green':t>=24&&t<26?'yellow':'red';}
  function part(group,geometry,material,x,y,z){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);group.add(m);return m;}
  const signalParts=new Map();
  for(const x of [-160,-80,0,80,160,240])for(const z of [-160,0,80,160,240]){
    lights.push({x,z});
    for(let side=0;side<4;side++){
      const g=new T.Group(),axis=side%2?'EW':'NS';
      g.position.set(x,0,z);g.rotation.y=side*Math.PI/2;
      part(g,new T.CylinderGeometry(.09,.15,6.2,8),poleMaterial,10.8,3.1,10.8);
      part(g,new T.BoxGeometry(8,.13,.14),poleMaterial,6.8,6.15,10.8);
      part(g,new T.BoxGeometry(.65,1.95,.48),housing,3.3,5.45,10.8);
      ['red','yellow','green'].forEach((c,i)=>{const lamp=part(g,new T.SphereGeometry(.21,10,8),lampMaterials[axis+c],3.3,6.02-i*.55,11.07);lamp.scale.z=.5;});
      g.updateMatrixWorld(true);g.traverse(o=>{if(!o.isMesh)return;if(!signalParts.has(o.material))signalParts.set(o.material,[]);const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);signalParts.get(o.material).push(geometry.toNonIndexed());o.geometry.dispose();});
    }
  }
  for(const [material,parts] of signalParts){const mesh=new T.Mesh(mergeGeometries(parts),material);scene.add(mesh);for(const part of parts)part.dispose();}
  // Rectangular routes run clockwise on the inside right-hand lane of each avenue.
  // The last route crosses the harbor bridge so AI traffic shares the span with the player.
  const routes=[[0,80,80,240],[0,80,80,160],[0,80,160,240],[-160,-80,80,160],[80,160,80,160],[160,240,160,240],[-80,0,80,160],[0,80,-160,0],[-240,-160,-160,0],[80,160,-160,0],[160,240,0,80],[-160,-80,160,240],[240,380,-80,-80]];
  routes.forEach(([left,right,top,bottom],i)=>{
    const car=buildCar({...vehicleModels[(i+2)%8],color:['#f0c287','#6b9b99','#bf7770','#e4dfc5'][i%4]});
    car.id=`traffic-${i}`;car.ai=true;if(car.rider)car.rider.visible=true;car.route=[[left+3,bottom-3],[left+3,top+3],[right-3,top+3],[right-3,bottom-3]];
    car.startEdge=i%4;car.startFraction=.2+(i%3)*.22;car.cruise=9+i%4;car.waiting='';car.target=0;
    scene.add(car.root);cars.push(car);vehicles.cars.push(car);
  });
  const {bus,update:busUpdate}=createBus(scene,vehicles,{lights,phase});
  function reset(){clock=0;redStops=0;redViolations=0;for(const c of cars){const edge=c.startEdge,a=c.route[edge],b=c.route[(edge+1)%4];c.root.position.set(a[0]+(b[0]-a[0])*c.startFraction,.02,a[1]+(b[1]-a[1])*c.startFraction);c.target=(edge+1)%4;c.heading=Math.atan2(-(b[0]-a[0]),-(b[1]-a[1]));c.speed=0;c.ai=true;c.waiting='';c.root.rotation.y=c.heading;if(c.rider)c.rider.visible=true;c.owned=false;}}bus.root.position.set(240,0.02,240);bus.target=0;bus.speed=0;bus.dwellTimer=0;bus.boardingHalt=-1;
  function stopDistance(car){
    const p=car.root.position,fx=-Math.sin(car.heading),fz=-Math.cos(car.heading),axis=Math.abs(fz)>.7?'NS':'EW';
    let distance=Infinity;
    for(const light of lights){const dx=light.x-p.x,dz=light.z-p.z,ahead=dx*fx+dz*fz,lateral=Math.abs(dx*fz-dz*fx);
      if(lateral<7&&ahead>10&&ahead<45&&phase(axis)!=='green')distance=Math.min(distance,ahead-13.5-car.model.length/2);
    }return distance;
  }
  function update(dt,active,focus,pedestrians=[]){
    clock+=dt;
    for(const [key,material] of Object.entries(lampMaterials)){const enabled=phase(key.slice(0,2))===key.slice(2);material.emissiveIntensity=enabled?3:.02;material.color.set(enabled?{red:'#ff493d',yellow:'#ffc568',green:'#58efb3'}[key.slice(2)]:'#263a39');}
    for(const car of cars){
      if(car===active||!car.ai)continue;
      const p=car.root.position,target=car.route[car.target],dx=target[0]-p.x,dz=target[1]-p.z,remaining=Math.hypot(dx,dz);
      if(remaining<.08){car.target=(car.target+1)%4;continue;}
      const angle=Math.atan2(-dx,-dz),oldHeading=car.heading;car.heading=angle;
      // A corner is reserved until its rotated footprint is free.
      if(vehicles.cars.concat(vehicles.external).some(o=>o!==car&&carsOverlap(car,p,o,o.root.position,.25))){car.heading=oldHeading;car.speed=0;car.waiting='vehicle';continue;}
      const fx=dx/remaining,fz=dz/remaining;let gap=stopDistance(car),reason=gap<Infinity?'red light':'';
      for(const other of [...vehicles.cars,...vehicles.external]){
        if(other===car)continue;const op=other.root.position,ox=op.x-p.x,oz=op.z-p.z,ahead=ox*fx+oz*fz,lateral=Math.abs(ox*fz-oz*fx);
        if(ahead>0&&lateral<(car.model.width+other.model.width)/2+.55){const g=ahead-(car.model.length+other.model.length)/2-1.1;if(g<gap){gap=g;reason='vehicle';}}
      }
      const people=[...pedestrians,...(!active?[{root:{position:focus}}]:[])];
      for(const person of people){const ox=person.root.position.x-p.x,oz=person.root.position.z-p.z,ahead=ox*fx+oz*fz;if(ahead>0&&Math.abs(ox*fz-oz*fx)<1.7&&ahead-4<gap){gap=ahead-4;reason='crosswalk';}}
      const desired=Math.min(car.cruise,Math.sqrt(Math.max(0,gap)*8));
      car.speed=Math.max(0,Math.min(desired,car.speed+dt*3));car.waiting=desired<.5?reason:'';
      if(car.waiting==='red light')redStops++;
      const next=p.clone();next.x+=fx*Math.min(remaining,car.speed*dt);next.z+=fz*Math.min(remaining,car.speed*dt);
      if(!vehicles.cars.concat(vehicles.external).some(o=>o!==car&&carsOverlap(car,next,o,o.root.position,.3)))p.copy(next);else{car.speed=0;car.waiting='vehicle';}
      animateAICar(car,dt);
      // AI cars follow the bridge grade so they ride the deck instead of clipping through it.
      car.root.position.y=bridgeHeight(car.root.position.x,car.root.position.z)+.02;
    }
    busUpdate(dt,active,focus,pedestrians);
  }
  function checkRedCrossing(car,previous){
    const p=car.root.position,fx=-Math.sin(car.heading),fz=-Math.cos(car.heading),axis=Math.abs(fz)>.7?'NS':'EW';
    for(const l of lights){const before=(l.x-previous.x)*fx+(l.z-previous.z)*fz,after=(l.x-p.x)*fx+(l.z-p.z)*fz;
      if(before>11&&after<=11&&Math.abs((l.x-p.x)*fz-(l.z-p.z)*fx)<9&&phase(axis)==='red'&&car.speed>3){redViolations++;return true;}
    }return false;
  }
  reset();
  return {cars,lights,update,reset,phase,checkRedCrossing,get clock(){return clock;},inspect:()=>({clock,NS:phase('NS'),EW:phase('EW'),redStops,redViolations,intersections:lights.length,cars:cars.map(c=>({id:c.id,position:c.root.position.toArray(),speed:c.speed,heading:c.heading,waiting:c.waiting,ai:c.ai})),bus:()=>({id:bus.id,position:bus.root.position.toArray(),speed:bus.speed,heading:bus.heading,waiting:bus.waiting,passengers:bus.passengers,target:bus.target,dwellTimer:bus.dwellTimer})})};
}
