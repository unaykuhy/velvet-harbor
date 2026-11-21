import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import { standard } from './render.js';
import { bridgeHeight } from './world.js';

export const vehicleModels = [
  {name:'Vortex Stiletto',length:4.7,width:1.95,height:1.05,color:'#e2a16d',power:15,top:47,roof:.65,kind:'coupe'},
  {name:'Halden Rhino',length:5.2,width:2.12,height:1.6,color:'#638d86',power:10,top:34,roof:1.1,kind:'utility'},
  {name:'Calyx Zephyr',length:4.1,width:1.8,height:1.15,color:'#e2d6b4',power:12,top:39,roof:.7,kind:'hatch'},
  {name:'Orison Meridian',length:5.45,width:2,height:1.25,color:'#435b7c',power:11,top:43,roof:.8,kind:'saloon'},
  {name:'Serein Drift',length:4.5,width:1.9,height:.95,color:'#bf6f6d',power:16,top:49,roof:.4,kind:'roadster'},
];

function extrudedProfile(points,width,material) {
  const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.075,bevelThickness:.075,curveSegments:6});
  geometry.rotateY(Math.PI/2);geometry.translate(-width/2,0,0);
  return new T.Mesh(geometry,material);
}

export function buildCar(model) {
  const root=new T.Group();const paint=standard(model.color,.26,.5),glass=standard('#668b98',.12,.6),chrome=standard('#c1cacc',.23,.83);
  const rubber=standard('#17232a',.91),black=standard('#1b3037',.55),seat=standard('#b48c68',.9);
  const l=model.length/2,w=model.width,h=model.height;
  const body=extrudedProfile([[-l,.55],[-l+.15,h*.85],[-l+.7,h],[-.7,h+.07],[.3,h],[l-.4,h*.8],[l,.67],[l-.1,.42],[-l+.2,.42]],w,paint);
  const surface=body.geometry.attributes.position;
  for(let i=0;i<surface.count;i++){
    const z=surface.getZ(i),y=surface.getY(i);
    const taper=1-.09*Math.pow(Math.min(1,Math.abs(z)/l),3)-Math.max(0,y-.65)*.045;
    surface.setX(i,surface.getX(i)*taper);
  }
  body.geometry.computeVertexNormals();
  root.add(body);
  function part(x,y,z,a,b,c,material) {
    const mesh=new T.Mesh(new T.BoxGeometry(a,b,c),material);mesh.position.set(x,y,z);root.add(mesh);return mesh;
  }
  const roofHeight=h+model.roof;
  if(model.kind==='utility') {
    root.add(extrudedProfile([[-1.1,h],[-.8,roofHeight],[1.55,roofHeight],[1.8,h]],w*.85,glass));
    part(0,roofHeight+.04,.3,w*.91,.13,2.8,paint);
    part(0,h+.32,1.6,w*.88,.6,.14,paint);
    for(const x of [-w*.35,w*.35])part(x,roofHeight+.16,.25,.08,.08,2.9,chrome);
  } else if(model.kind==='roadster') {
    root.add(extrudedProfile([[-.9,h],[-.52,h+.53],[-.38,h+.53],[-.6,h]],w*.86,glass));
    for(const x of [-.42,.42]){part(x,h+.13,.1,.54,.3,.7,seat);part(x,h+.35,.44,.54,.6,.16,seat);}
  } else {
    const rear=model.kind==='hatch'?1.45:.95;
    root.add(extrudedProfile([[-1.25,h],[-.65,roofHeight],[rear-.5,roofHeight],[rear+.4,h]],w*.84,glass));
    part(0,roofHeight+.015,(rear-1.15)/2,w*.87,.12,rear+.12,paint);
    for(const x of [-w*.438,w*.438])part(x,h+model.roof/2,.18,.08,model.roof,.11,paint);
  }
  // Recessed grille, split light signatures, door seams and polished trim.
  part(0,.65,-l-.065,w*.65,.22,.08,black);
  for(let x=-w*.28;x<w*.32;x+=.12)part(x,.65,-l-.11,.025,.14,.02,chrome);
  part(0,.46,-l,w*.88,.09,.14,chrome);part(0,.46,l,w*.86,.09,.13,chrome);
  const headlight=new T.MeshStandardMaterial({color:'#fff4d2',emissive:'#fff1c0',emissiveIntensity:1.4});
  const tail=new T.MeshStandardMaterial({color:'#f56356',emissive:'#ff382e',emissiveIntensity:.8});
  for(const x of [-w*.35,w*.35]) {
    part(x,h*.78,-l-.07,w*.2,.13,.07,headlight);part(x,.79,l+.06,w*.25,.12,.07,tail);
    part(x*1.45,h+.12,-.6,.23,.13,.32,paint);
    part(Math.sign(x)*(w/2+.09),h*.8,.25,.03,.045,.22,chrome);
  }
  const wheels=[],frontWheels=[];
  for(const x of [-w*.51,w*.51])for(const z of [-l*.65,l*.65]) {
    const pivot=new T.Group();pivot.position.set(x,.43,z);root.add(pivot);
    const tire=new T.Mesh(new T.CylinderGeometry(.4,.4,.25,16),rubber);tire.rotation.z=Math.PI/2;pivot.add(tire);
    const spin=new T.Group();pivot.add(spin);
    const spokes=[];
    for(let spoke=0;spoke<5;spoke++){
      const g=new T.BoxGeometry(.28,.055,.48);g.rotateX(spoke*Math.PI/5);spokes.push(g);
    }
    spin.add(new T.Mesh(mergeGeometries(spokes),chrome));
    wheels.push(spin);if(z<0)frontWheels.push(pivot);
  }
  const beam=new T.SpotLight('#ffe8b3',0,35,.6,.65,1.5);beam.position.set(0,.8,-l);beam.target.position.set(0,0,-20);
  const smoke=new T.Group();root.add(smoke);const smokeMaterial=new T.MeshBasicMaterial({color:'#596264',transparent:true,opacity:.25,depthWrite:false});
  for(let i=0;i<7;i++){const puff=new T.Mesh(new T.IcosahedronGeometry(.3,1),smokeMaterial);puff.visible=false;smoke.add(puff);}
  const staticParts=new Map();
  root.updateMatrixWorld(true);
  for(const child of [...root.children])if(child.isMesh){
    if(!staticParts.has(child.material))staticParts.set(child.material,[]);
    const geometry=child.geometry.clone().applyMatrix4(child.matrix);
    staticParts.get(child.material).push(geometry.index?geometry.toNonIndexed():geometry);root.remove(child);
  }
  for(const [material,geometries] of staticParts){root.add(new T.Mesh(mergeGeometries(geometries),material));geometries.forEach(g=>g.dispose());}
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {root,wheels,frontWheels,beam,smoke,paint,model,speed:0,steer:0,heading:0,damage:0,owned:false};
}

export function createVehicles(scene) {
  const cars=[];
  const positions=[[5,149,0],[-6,116,0],[86,181,Math.PI],[153,92,0],[-74,195,Math.PI/2],[6,-35,0],[-86,-108,Math.PI],[166,-186,0],[-153,-50,Math.PI],[231,138,0],[-230,74,Math.PI],[-35,233,Math.PI/2],[111,7,Math.PI/2],[75,-234,Math.PI/2],[6,59,0]];
  positions.forEach(([x,z,heading],index)=>{
    const car=buildCar(vehicleModels[index%5]);car.id=`bay-${index}`;car.root.position.set(x,.02,z);car.heading=heading;car.root.rotation.y=heading;scene.add(car.root);cars.push(car);
  });
  function nearest(position) {return cars.filter(car=>Math.abs(car.speed)<1&&car.root.position.distanceTo(position)<4.6).sort((a,b)=>a.root.position.distanceToSquared(position)-b.root.position.distanceToSquared(position))[0];}
  function drive(car,dt,input,world,onImpact) {
    const throttle=Number(input.down('KeyW'))-Number(input.down('KeyS'));
    const handbrake=input.down('Space');
    const braking=throttle!==0&&Math.sign(throttle)!==Math.sign(car.speed)&&Math.abs(car.speed)>1;
    car.speed+=throttle*(braking?25:car.model.power)*dt;
    car.speed*=Math.exp(-dt*(handbrake?2.8:throttle?.12:.65));
    car.speed=T.MathUtils.clamp(car.speed,-11,car.model.top*(1-car.damage*.004));
    const target=(Number(input.down('KeyA'))-Number(input.down('KeyD')))*.48;
    car.steer=T.MathUtils.damp(car.steer,target,5,dt);
    car.heading+=car.steer*car.speed/(handbrake?5:8)*dt/(1+Math.abs(car.speed)*.018);
    const old=car.root.position.clone();
    const next=old.clone().add(new T.Vector3(-Math.sin(car.heading),0,-Math.cos(car.heading)).multiplyScalar(car.speed*dt));
    const direction=new T.Vector3(-Math.sin(car.heading),0,-Math.cos(car.heading));
    const collides=[-.37,.37].some(side=>[-.36,.36].some(end=>{
      const x=next.x+direction.x*car.model.length*end+Math.cos(car.heading)*car.model.width*side;
      const z=next.z+direction.z*car.model.length*end-Math.sin(car.heading)*car.model.width*side;
      return world.blocked(x,z,.2,bridgeHeight(next.x,next.z));
    }));
    const other=cars.some(c=>c!==car&&Math.hypot(c.root.position.x-next.x,c.root.position.z-next.z)<(c.model.length+car.model.length)*.36);
    if(collides||other){
      const force=Math.abs(car.speed);if(force>5){car.damage=Math.min(100,car.damage+force*1.2);onImpact(force);}
      car.speed*=-.23;
    }else car.root.position.copy(next);
    car.root.position.y=bridgeHeight(car.root.position.x,car.root.position.z)+.02;
    car.root.rotation.set(0,car.heading,Math.max(-.025,Math.min(.025,-car.steer*car.speed*.003)));
    car.wheels.forEach(w=>w.rotation.x-=car.speed*dt/.4);
    car.frontWheels.forEach(w=>w.rotation.y=car.steer);
    car.paint.color.set(car.model.color).multiplyScalar(1-car.damage*.003);
  }
  const headlight=new T.SpotLight('#ffe8b3',0,38,.65,.7,1.5);scene.add(headlight,headlight.target);
  function update(time,night,focus,active) {
    headlight.visible=!!active&&night>.1;headlight.intensity=active?night*25:0;
    if(active){headlight.position.copy(active.root.position).add(new T.Vector3(0,1,0));headlight.target.position.copy(active.root.position).add(new T.Vector3(-Math.sin(active.heading)*18,0,-Math.cos(active.heading)*18));}
    for(const car of cars){
      car.root.visible=car===active||car.root.position.distanceToSquared(focus)<100*100;
      car.beam.intensity=night*15;
      car.smoke.children.forEach((p,i)=>{
        p.visible=car.damage>40;
        const phase=(time*.45+i/7)%1;
        p.position.set(Math.sin(i*7+time)*phase*.55,car.model.height+phase*2.5,-car.model.length*.3);
        p.scale.setScalar(.35+phase*2.2);
      });
    }
  }
  return {cars,nearest,drive,update};
}
