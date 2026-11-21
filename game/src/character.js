import * as T from 'three';
import {standard} from './render.js';
import {bridgeHeight} from './world.js';

export function createMara(scene) {
  const root=new T.Group(),skin=standard('#bf8a68',.9),shirt=standard('#eee0bf',.93),pants=standard('#305568',.9),hair=standard('#352a26',.95),shoe=standard('#eee3cb',.8);
  function ellipsoid(parent,x,y,z,sx,sy,sz,material) {
    const mesh=new T.Mesh(new T.SphereGeometry(1,12,10),material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
  }
  const torsoProfile=[new T.Vector2(.21,0),new T.Vector2(.25,.15),new T.Vector2(.22,.35),new T.Vector2(.28,.58),new T.Vector2(.3,.64),new T.Vector2(.14,.7)];
  const torso=new T.Mesh(new T.LatheGeometry(torsoProfile,14),shirt);torso.position.y=.84;root.add(torso);
  ellipsoid(root,0,.88,0,.25,.22,.19,pants);
  ellipsoid(root,0,1.59,0,.11,.15,.11,skin);
  ellipsoid(root,0,1.77,-.015,.17,.23,.16,skin);
  ellipsoid(root,0,1.87,.025,.18,.16,.17,hair);
  ellipsoid(root,0,1.69,.15,.15,.2,.12,hair);
  ellipsoid(root,0,1.75,-.16,.045,.065,.045,skin);
  const limbs=[];
  for(const side of [-1,1]) {
    const leg=new T.Group();leg.position.set(side*.13,.87,0);root.add(leg);
    ellipsoid(leg,0,-.24,0,.115,.28,.13,pants);
    const shin=new T.Group();shin.position.y=-.45;leg.add(shin);
    ellipsoid(shin,0,-.17,0,.083,.22,.09,pants);ellipsoid(shin,0,-.36,-.055,.1,.085,.18,shoe);
    const arm=new T.Group();arm.position.set(side*.29,1.42,0);root.add(arm);
    ellipsoid(arm,side*.025,-.13,0,.08,.18,.09,shirt);ellipsoid(arm,side*.03,-.35,0,.06,.16,.065,skin);ellipsoid(arm,side*.03,-.51,0,.065,.09,.055,skin);
    limbs.push({leg,shin,arm,side});
  }
  const strap=new T.Mesh(new T.BoxGeometry(.075,.74,.035),standard('#6f5842'));strap.rotation.z=-.4;strap.position.set(.02,1.23,-.21);root.add(strap);
  ellipsoid(root,-.24,.98,.08,.13,.19,.12,standard('#8b694b'));
  root.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(root);
  root.position.set(8,0,150);
  const velocity=new T.Vector3();let vertical=0,grounded=true,phase=0;
  function update(dt,input,yaw,world) {
    const forward=Number(input.down('KeyW'))-Number(input.down('KeyS'));
    const side=Number(input.down('KeyD'))-Number(input.down('KeyA'));
    const speed=input.down('ShiftLeft')||input.down('ShiftRight')?7:3.4;
    const direction=new T.Vector3(side,0,-forward).normalize().applyAxisAngle(new T.Vector3(0,1,0),yaw);
    velocity.lerp(direction.multiplyScalar(speed),1-Math.exp(-dt*(forward||side?7:10)));
    if(input.consume('Space')&&grounded){vertical=6.5;grounded=false;}
    const p=root.position;
    const nx=p.x+velocity.x*dt,nz=p.z+velocity.z*dt;
    if(!world.blocked(nx,p.z,.35,p.y+.2))p.x=nx;else velocity.x=0;
    if(!world.blocked(p.x,nz,.35,p.y+.2))p.z=nz;else velocity.z=0;
    vertical-=18*dt;p.y+=vertical*dt;
    const ground=bridgeHeight(p.x,p.z);
    if(p.y<=ground){p.y=ground;vertical=0;grounded=true;}
    const moving=velocity.length();
    if(moving>.15){
      const angle=Math.atan2(-velocity.x,-velocity.z);root.rotation.y+=Math.atan2(Math.sin(angle-root.rotation.y),Math.cos(angle-root.rotation.y))*(1-Math.exp(-dt*12));
    }
    phase+=moving*dt*2.4;
    for(const limb of limbs){const wave=Math.sin(phase+limb.side*Math.PI/2)*Math.min(.85,moving*.13);limb.leg.rotation.x=wave;limb.shin.rotation.x=Math.max(0,-wave)*.7;limb.arm.rotation.x=-wave*.8;}
    torso.position.y=.84+(grounded?Math.abs(Math.sin(phase))*.025:0);
  }
  function reset(){velocity.set(0,0,0);vertical=0;grounded=true;}
  return {root,velocity,update,reset,get grounded(){return grounded;}};
}
