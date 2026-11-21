import * as T from 'three';
import {standard} from './render.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function buildCitizen(scene,index=0,officer=false){
  const root=new T.Group(),limbs=[];
  const skin=standard(['#b97b59','#e3b48c','#79503e'][index%3]),cloth=standard(officer?'#263e56':['#ad6258','#d9bc83','#518f87','#d3d9c5'][index%4]),pants=standard(officer?'#243647':'#40505b'),hair=standard('#3a302a'),shoe=standard('#263139');
  function shape(parent,x,y,z,rx,ry,rz,material){const mesh=new T.Mesh(new T.SphereGeometry(1,8,6),material);mesh.position.set(x,y,z);mesh.scale.set(rx,ry,rz);parent.add(mesh);return mesh;}
  const profile=[[.23,0],[.25,.15],[.2,.4],[.29,.59],[.16,.68]].map(([r,y])=>new T.Vector2(r,y));
  const torso=new T.Mesh(new T.LatheGeometry(profile,10),cloth);torso.position.y=.86;root.add(torso);
  shape(root,0,1.72,0,.17,.23,.16,skin);shape(root,0,1.86,.025,.18,.12,.17,hair);shape(root,0,1.7,-.155,.04,.06,.045,skin);
  for(const side of [-1,1]){
    const leg=new T.Group(),arm=new T.Group();leg.position.set(side*.13,.87,0);arm.position.set(side*.29,1.4,0);root.add(leg,arm);
    shape(leg,0,-.22,0,.11,.27,.12,pants);shape(leg,0,-.6,0,.08,.23,.09,pants);shape(leg,0,-.79,-.06,.105,.08,.18,shoe);
    shape(arm,0,-.13,0,.085,.19,.09,cloth);shape(arm,0,-.4,0,.065,.17,.065,skin);limbs.push({leg,arm,side});
  }
  if(officer){shape(root,0,1.94,-.015,.21,.07,.21,pants);shape(root,-.13,1.34,-.23,.045,.065,.025,standard('#e7c881',.3,.5));}
  for(const group of [root,...limbs.flatMap(l=>[l.leg,l.arm])]){
    const batches=new Map();group.updateMatrix();for(const mesh of [...group.children])if(mesh.isMesh){mesh.updateMatrix();const g=mesh.geometry.clone().applyMatrix4(mesh.matrix);if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(g.index?g.toNonIndexed():g);mesh.geometry.dispose();group.remove(mesh);}
    for(const [material,parts] of batches){group.add(new T.Mesh(mergeGeometries(parts),material));parts.forEach(g=>g.dispose());}
  }
  root.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(root);
  let phase=0;
  function animate(dt,speed){phase+=dt*speed*2.5;for(const l of limbs){const swing=Math.sin(phase+l.side*Math.PI/2)*Math.min(.8,speed*.24);l.leg.rotation.x=swing;l.arm.rotation.x=-swing*.85;}root.position.y=.14+Math.abs(Math.sin(phase))*.025;}
  return {root,animate};
}

export function createPedestrians(scene,world,traffic,onHit){
  const people=[];let crossings=0,hits=0;
  // Each walking loop crosses a real striped crossing, with a sidewalk waiting point.
  for(let i=0;i<16;i++){
    const person=buildCitizen(scene,i),x=[0,80,-80,160][i%4],z=[160,240,80,0][Math.floor(i/4)];
    person.route=[[x-12,z+8.5],[x+12,z+8.5],[x+12,z+29],[x+12,z+8.5],[x-12,z+8.5],[x-12,z+29]];
    person.index=i;person.target=i%2?1:0;person.root.position.set(x+(i%2?-12:12),.14,z+8.5);person.flee=0;person.cooldown=0;person.crossing=false;people.push(person);
  }
  function update(dt,active,focus,allCars){
    for(const p of people){
      p.cooldown=Math.max(0,p.cooldown-dt);const at=p.root.position;
      const carPosition=active?.root.position;
      const relativeX=carPosition?at.x-carPosition.x:999,relativeZ=carPosition?at.z-carPosition.z:999;
      const touching=active&&Math.abs(relativeX*Math.cos(active.heading)-relativeZ*Math.sin(active.heading))<active.model.width/2+.35&&Math.abs(relativeX*Math.sin(active.heading)+relativeZ*Math.cos(active.heading))<active.model.length/2+.25;
      if(touching&&Math.abs(active.speed)>3&&p.cooldown===0){
        p.flee=4;p.cooldown=7;p.away=new T.Vector3(at.x-active.root.position.x,0,at.z-active.root.position.z).normalize();if(p.away.lengthSq()<.1)p.away.set(1,0,0);hits++;onHit();
      }
      let speed=1.2+(p.index%3)*.13,dx,dz;p.crossing=false;
      if(p.flee>0){p.flee-=dt;dx=p.away.x;dz=p.away.z;speed=4.5;}
      else{
        const goal=p.route[p.target];dx=goal[0]-at.x;dz=goal[1]-at.z;const distance=Math.hypot(dx,dz);
        if(distance<.15){p.target=(p.target+1)%p.route.length;continue;}
        dx/=distance;dz/=distance;
        const crossing=Math.abs(goal[0]-at.x)>.3&&Math.abs(goal[1]-at.z)<.4;
        if(crossing){
          const center=(p.route[0][0]+p.route[1][0])/2,inside=Math.abs(at.x-center)<10;
          const safe=traffic.phase('NS')==='red'&&traffic.clock%28>=14&&traffic.clock%28<20;
          const incoming=allCars.some(c=>{const cp=c.root.position;return Math.abs(cp.x-at.x)<5&&Math.abs(cp.z-at.z)<9&&Math.abs(c.speed)>1;});
          if((!inside&&!safe)||incoming)speed=0;else{p.crossing=true;crossings++;speed=2;}
        }
      }
      const nx=at.x+dx*speed*dt,nz=at.z+dz*speed*dt;
      if(!world.blocked(nx,nz,.28,1))at.set(nx,at.y,nz);else if(p.flee>0){p.away.set(-p.away.z,0,p.away.x);}
      if(speed>0)p.root.rotation.y=Math.atan2(-dx,-dz);p.animate(dt,speed);p.root.visible=at.distanceToSquared(focus)<105*105;
    }
  }
  function reset(){crossings=0;hits=0;for(const p of people){p.target=p.index%2?1:0;const start=p.route[p.index%2?0:1];p.root.position.set(start[0],.14,start[1]);p.flee=0;p.cooldown=0;}}
  return {people,update,reset,inspect:()=>({count:people.length,crossings,hits,people:people.map(p=>({position:p.root.position.toArray(),crossing:p.crossing,flee:p.flee}))})};
}
