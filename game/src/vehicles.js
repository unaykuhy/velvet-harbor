import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import { standard,surfaceMaterial } from './render.js';
import { bridgeHeight } from './world.js';

export const vehicleModels = [
  {name:'Vortex Stiletto',length:4.7,width:1.95,height:1.05,color:'#e2a16d',power:15,top:47,roof:.65,kind:'coupe'},
  {name:'Halden Rhino',length:5.2,width:2.12,height:1.6,color:'#638d86',power:10,top:34,roof:1.1,kind:'utility'},
  {name:'Calyx Zephyr',length:4.1,width:1.8,height:1.15,color:'#e2d6b4',power:12,top:39,roof:.7,kind:'hatch'},
  {name:'Orison Meridian',length:5.45,width:2,height:1.25,color:'#435b7c',power:11,top:43,roof:.8,kind:'saloon'},
  {name:'Serein Drift',length:4.5,width:1.9,height:.95,color:'#bf6f6d',power:16,top:49,roof:.4,kind:'roadster'},
  {name:'Marlowe Viceroy',length:5.3,width:2.04,height:1.15,color:'#d8bd7f',power:11,top:41,roof:1,kind:'vintage'},
  {name:'Kestrel Dart',length:2.2,width:.8,height:1.1,color:'#6aa0c8',power:17,top:52,roof:0,kind:'sportbike'},
  {name:'Briar Heritage',length:2.3,width:.85,height:1.12,color:'#a87e70',power:12,top:38,roof:0,kind:'classic-bike'},
];

function isMotorcycle(model){return model.kind==='sportbike'||model.kind==='classic-bike';}

function extrudedProfile(points,width,material) {
  const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.075,bevelThickness:.075,curveSegments:6});
  geometry.rotateY(Math.PI/2);geometry.translate(-width/2,0,0);
  return new T.Mesh(geometry,material);
}

function buildBike(model) {
  const sport=model.kind==='sportbike';
  const root=new T.Group(),shell=new T.Group(),interior=new T.Group();root.add(shell,interior);
  const paint=standard(model.color,.24,.58),chrome=standard('#d2d9d8',.2,.88),rubber=standard('#131c22',.94);
  const black=standard('#17242b',.62,.25),leather=standard(sport?'#202a31':'#643d2c',.82,.05),glass=surfaceMaterial({color:'#789eb5',transparent:true,opacity:.48,roughness:.1,metalness:.22,depthWrite:false});
  const l=model.length/2,wheelRadius=sport?.34:.36,frontZ=-l*.68,rearZ=l*.68;
  const wheels=[],frontWheels=[];
  function mesh(geometry,material,parent=root){const m=new T.Mesh(geometry,material);parent.add(m);return m;}
  function box(x,y,z,a,b,c,material,parent=root){const m=mesh(new T.BoxGeometry(a,b,c),material,parent);m.position.set(x,y,z);return m;}
  function rod(a,b,r,material,parent=root){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start);
    const m=mesh(new T.CylinderGeometry(r,r,direction.length(),10),material,parent);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());return m;
  }
  // A triangulated cradle, finned engine and sculpted tank give both bikes a complete mechanical silhouette.
  for(const x of [-.13,.13]){
    rod([x,.4,rearZ],[x,.76,.18],.038,chrome);rod([x,.76,.18],[x,.48,frontZ+.2],.038,chrome);rod([x,.48,frontZ+.2],[x,.4,rearZ],.032,black);
  }
  box(0,.57,.03,.42,.38,.5,black);
  for(let i=0;i<7;i++)box(0,.45+i*.043,-.04,.49,.022,.43,chrome);
  const tank=mesh(new T.SphereGeometry(1,24,14),paint);tank.position.set(0,sport?.91:.96,-.19);tank.scale.set(sport?.28:.32,sport?.22:.23,sport?.43:.37);
  const tankStripe=box(0,sport?1.105:1.17,-.2,.055,.018,.48,chrome);tankStripe.rotation.x=-.08;
  const saddle=mesh(new T.SphereGeometry(1,20,12),leather);saddle.position.set(0,sport?.88:.93,.39);saddle.scale.set(sport?.23:.29,.085,sport?.48:.45);
  if(!sport){const rearSeat=mesh(new T.SphereGeometry(1,18,10),leather);rearSeat.position.set(0,.96,.72);rearSeat.scale.set(.27,.075,.22);}
  if(sport){
    root.add(extrudedProfile([[-l,.63],[-l+.04,.94],[-l+.22,1.13],[-.48,1.13],[-.25,.86],[-.37,.58]],.57,paint));
    root.add(extrudedProfile([[-.91,1.08],[-.72,1.35],[-.49,1.3],[-.45,1.08]],.43,glass));
    const tail=mesh(new T.SphereGeometry(1,16,10),paint);tail.position.set(0,.82,.86);tail.scale.set(.19,.12,.35);
    for(const x of [-.29,.29])rod([x,.7,.45],[x,.62,.94],.035,chrome);
  }else{
    // Chrome valanced mudguards, broad saddle and upright metal trim define the Heritage.
    const rearFender=mesh(new T.TorusGeometry(wheelRadius+.055,.055,8,28,Math.PI),chrome);rearFender.rotation.y=Math.PI/2;rearFender.position.set(0,wheelRadius+.02,rearZ);
    box(0,.83,.74,.48,.055,.42,paint);
    for(const x of [-.31,.31])rod([x,.59,.28],[x,.59,.8],.025,chrome);
    rod([-.18,.55,.5],[-.31,.48,-.32],.055,chrome);rod([-.31,.48,-.32],[-.31,.5,.91],.065,chrome);
  }
  for(const z of [frontZ,rearZ]){
    const pivot=new T.Group();pivot.position.set(0,wheelRadius+.02,z);shell.add(pivot);
    const spin=new T.Group();pivot.add(spin);
    const tire=mesh(new T.CylinderGeometry(wheelRadius,wheelRadius,sport?.13:.16,28),rubber,spin);tire.rotation.z=Math.PI/2;
    const rim=mesh(new T.CylinderGeometry(wheelRadius*.61,wheelRadius*.61,sport?.137:.166,24),black,spin);rim.rotation.z=Math.PI/2;
    const hub=mesh(new T.CylinderGeometry(.065,.065,.21,16),chrome,spin);hub.rotation.z=Math.PI/2;
    for(let i=0;i<10;i++){const a=i*Math.PI/5;rod([0,0,0],[0,Math.cos(a)*wheelRadius*.57,Math.sin(a)*wheelRadius*.57],.012,chrome,spin);}
    const disc=mesh(new T.CylinderGeometry(wheelRadius*.38,wheelRadius*.38,.178,20),chrome,spin);disc.rotation.z=Math.PI/2;
    wheels.push(spin);if(z===frontZ)frontWheels.push(pivot);
  }
  const front=frontWheels[0],forkTop=sport?.72:.78;
  for(const x of [-.115,.115]){
    rod([x,0,0],[x,forkTop,.17],.032,chrome,front);rod([x,.08,.01],[x,forkTop-.08,.15],.048,black,front);
  }
  rod([-.34,forkTop,.17],[.34,forkTop,.17],.026,chrome,front);
  for(const x of [-.36,.36])rod([Math.sign(x)*.25,forkTop,.17],[x,forkTop,.17],.042,black,front);
  const frontFender=mesh(new T.TorusGeometry(wheelRadius+.05,.045,8,28,Math.PI),sport?paint:chrome,front);frontFender.rotation.y=Math.PI/2;
  const headlight=surfaceMaterial({color:'#fff1cf',emissive:'#ffe6ad',emissiveIntensity:1.35});
  const lamp=mesh(new T.SphereGeometry(1,18,12),headlight,front);lamp.position.set(0,forkTop-.1,-.12);lamp.scale.set(sport?.14:.17,sport?.11:.17,.07);
  if(!sport)for(const x of [-.34,.34]){
    rod([x,forkTop,.17],[x*1.08,forkTop+.25,.18],.014,chrome,front);
    const mirror=mesh(new T.SphereGeometry(1,14,10),chrome,front);mirror.position.set(x*1.08,forkTop+.26,.18);mirror.scale.set(.09,.065,.025);
  }
  const tail=surfaceMaterial({color:'#ef6558',emissive:'#ff392c',emissiveIntensity:.8});box(0,.75,l-.02,.2,.09,.055,tail);
  // The rider is part of the vehicle, shown only for AI or the active chase view.
  const rider=new T.Group();shell.add(rider);rider.visible=false;
  const jacket=standard(sport?'#e8dcc8':'#d4c4a8',.76),denim=standard(sport?'#3a5a7a':'#8b7d6b',.9),boots=standard(sport?'#2a3a4a':'#6b5b4a',.82),helmet=standard(sport?'#d5dce2':'#e8dcc8',.3,.38);
  function riderMesh(geometry,material){return mesh(geometry,material,rider);}
  function riderRod(a,b,r,material){return rod(a,b,r,material,rider);}
  const lean=sport?-.60:-.08,hipZ=sport?.35:.39,shoulderZ=sport?.02:.31;
  const torso=riderMesh(new T.CapsuleGeometry(.18,.4,5,12),jacket);torso.position.set(0,sport?1.23:1.3,sport?.22:.35);torso.rotation.x=lean;
  const headPosition=[0,sport?1.57:1.69,sport?-.08:.27];
  const head=riderMesh(new T.SphereGeometry(.165,20,14),helmet);head.position.set(...headPosition);
  const visor=riderMesh(new T.SphereGeometry(1,16,10),black);visor.position.set(headPosition[0],headPosition[1]+.015,headPosition[2]-.135);visor.scale.set(.135,.072,.04);
  for(const side of [-1,1]){
    const shoulder=[side*.17,sport?1.39:1.47,shoulderZ],elbow=[side*.29,sport?1.2:1.25,-.2],hand=[side*.34,wheelRadius+.02+forkTop,frontZ+.17];
    riderRod(shoulder,elbow,.065,jacket);riderRod(elbow,hand,.052,jacket);
    const glove=riderMesh(new T.SphereGeometry(.06,12,8),boots);glove.position.set(...hand);
    const hip=[side*.13,.94,hipZ],knee=[side*.25,.66,sport?.02:.12],foot=[side*.23,.48,.35];
    riderRod(hip,knee,.083,denim);riderRod(knee,foot,.065,denim);
    const boot=riderMesh(new T.SphereGeometry(1,12,8),boots);boot.position.set(...foot);boot.scale.set(.075,.065,.14);
  }
  // Static painted/chrome parts are batched without merging the steering or wheel pivots.
  const staticParts=new Map();root.updateMatrixWorld(true);
  for(const child of [...root.children])if(child.isMesh){
    if(!staticParts.has(child.material))staticParts.set(child.material,[]);
    const geometry=child.geometry.clone().applyMatrix4(child.matrix);staticParts.get(child.material).push(geometry.index?geometry.toNonIndexed():geometry);root.remove(child);
  }
  for(const [material,geometries] of staticParts){shell.add(new T.Mesh(mergeGeometries(geometries),material));geometries.forEach(g=>g.dispose());}
  // In first person the shell is hidden, while these compact bars and instruments remain.
  const steeringWheel=new T.Group();steeringWheel.position.set(0,wheelRadius+.02+forkTop,frontZ+.17);interior.add(steeringWheel);
  rod([-.34,0,0],[.34,0,0],.027,chrome,steeringWheel);
  for(const x of [-.34,.34])rod([x*.7,0,0],[x,0,0],.043,black,steeringWheel);
  const gauge=mesh(new T.CylinderGeometry(.105,.105,.045,20),black,steeringWheel);gauge.rotation.x=Math.PI/2;gauge.position.set(0,.09,.035);
  const gaugeRing=mesh(new T.TorusGeometry(.105,.012,8,20),chrome,steeringWheel);gaugeRing.position.set(0,.09,.06);
  const gaugeFace=surfaceMaterial({color:'#352718',emissive:'#d89a52',emissiveIntensity:.35});
  const dial=mesh(new T.CircleGeometry(.088,20),gaugeFace,steeringWheel);dial.position.set(0,.09,.061);
  rod([0,.09,.066],[.045,.135,.066],.008,chrome,steeringWheel);
  interior.visible=false;
  const beam=new T.SpotLight('#ffe8b3',0,35,.6,.65,1.5);beam.position.set(0,1,frontZ);beam.target.position.set(0,0,-20);
  const smoke=new T.Group();root.add(smoke);const smokeMaterial=new T.MeshBasicMaterial({color:'#596264',transparent:true,opacity:.25,depthWrite:false});
  for(let i=0;i<7;i++){const puff=new T.Mesh(new T.IcosahedronGeometry(.3,1),smokeMaterial);puff.visible=false;smoke.add(puff);}
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {root,shell,interior,rider,steeringWheel,driverEye:new T.Vector3(0,sport?1.46:1.53,.18),wheels,frontWheels,beam,smoke,paint,model,speed:0,steer:0,heading:0,damage:0,owned:false};
}

export function buildCar(model) {
  if(isMotorcycle(model))return buildBike(model);
  const root=new T.Group();const paint=standard(model.color,.26,.5),glass=standard('#668b98',.12,.6),chrome=standard('#c1cacc',.23,.83);
  const rubber=standard('#17232a',.91),black=standard('#1b3037',.55),seat=standard('#b48c68',.9);
  const shell=new T.Group(),interior=new T.Group();root.add(shell,interior);
  const l=model.length/2,w=model.width,h=model.height,vintage=model.kind==='vintage';
  const body=extrudedProfile(vintage?[[-l,.55],[-l+.08,.82],[-l+.35,h],[-.82,h+.04],[-.55,h],[1.75,h],[l-.12,.88],[l,.58],[l-.1,.42],[-l+.2,.42]]:[[-l,.55],[-l+.15,h*.85],[-l+.7,h],[-.7,h+.07],[.3,h],[l-.4,h*.8],[l,.67],[l-.1,.42],[-l+.2,.42]],w,paint);
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
  if(vintage){
    // A tall, formal cabin sits behind the long bonnet; rounded wing fenders and
    // polished running boards give the Viceroy its pre-war luxury silhouette.
    root.add(extrudedProfile([[-1.18,h],[-.72,roofHeight-.08],[-.42,roofHeight],[1.03,roofHeight],[1.58,h]],w*.82,glass));
    part(0,roofHeight+.025,.3,w*.88,.13,2.05,paint);
    for(const x of [-w*.43,w*.43]){
      part(x,h+model.roof*.48,-.69,.09,model.roof*.9,.12,chrome);
      part(x,h+model.roof*.48,1.08,.09,model.roof*.9,.12,chrome);
      part(x,h+.1,.22,.035,.055,2.55,chrome);
      part(Math.sign(x)*(w*.52),.4,.2,.2,.09,2.45,chrome);
    }
    for(const x of [-w*.46,w*.46])for(const z of [-l*.65,l*.65]){
      const fender=new T.Mesh(new T.SphereGeometry(1,20,12),paint);fender.position.set(x,.58,z);fender.scale.set(.34,.3,.82);root.add(fender);
      const trim=new T.Mesh(new T.TorusGeometry(.43,.025,8,24,Math.PI),chrome);trim.rotation.y=Math.PI/2;trim.position.set(x,.47,z);root.add(trim);
    }
  } else if(model.kind==='bus') {
    const teal=paint,cream=standard('#f5f0e1',.2,.45),gold=surfaceMaterial({color:'#c9904f',emissive:'#e8b85a',emissiveIntensity:.4,metalness:.7,roughness:.3});
    root.add(extrudedProfile([[-1.5,h],[-1.0,roofHeight],[l-1.5,roofHeight],[l-0.5,h]],w*.88,glass));
    part(0,roofHeight+.03,(l-2.5)/2,w*.9,.14,l-2.5+.3,cream);
    const stripeY=h*.55;
    part(0,stripeY,0,w*1.02,.35,model.length-.4,gold);
    part(0,h+.02,0,w*1.01,.08,model.length-.4,gold);
    for(let i=0;i<8;i++){
      const z=-l+1.0+i*(model.length-2.0)/7;
      const winW=w*.38,winH=h*.55;
      part(w*.52,h*.4,z,winW,winH,.04,glass);
      part(-w*.52,h*.4,z,winW,winH,.04,glass);
    }
    const doorZ=-l+2.5;
    part(w*.52,h*.35,doorZ,1.2,h*.7,.06,teal);
    part(w*.52,h*.35,doorZ,1.0,h*.5,.04,glass);
  } else if(model.kind==='utility') {
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
  part(0,vintage?.8:.65,-l-.065,w*(vintage?.52:.65),vintage?.5:.22,.08,black);
  for(let x=-w*.28;x<w*.32;x+=vintage?.09:.12)part(x,vintage?.8:.65,-l-.11,.025,vintage?.42:.14,.02,chrome);
  part(0,.46,-l,w*.88,.09,.14,chrome);part(0,.46,l,w*.86,.09,.13,chrome);
  if(vintage){part(0,1.07,-l-.09,w*.58,.045,.05,chrome);part(0,.55,-l-.09,w*.58,.045,.05,chrome);}
   const headlight=surfaceMaterial({color:'#fff4d2',emissive:'#fff1c0',emissiveIntensity:1.4});
  const tail=surfaceMaterial({color:'#f56356',emissive:'#ff382e',emissiveIntensity:.8});
  for(const x of [-w*.35,w*.35]) {
    if(vintage){const lamp=new T.Mesh(new T.SphereGeometry(1,18,12),headlight);lamp.position.set(x,.94,-l-.08);lamp.scale.set(.16,.16,.08);root.add(lamp);}
    else part(x,h*.78,-l-.07,w*.2,.13,.07,headlight);
    part(x,.79,l+.06,w*.25,.12,.07,tail);
    if(!vintage)part(x*1.45,h+.12,-.6,.23,.13,.32,paint);
    part(Math.sign(x)*(w/2+.09),h*.8,.25,.03,.045,.22,chrome);
  }
  const wheels=[],frontWheels=[];
  if(model.kind==='bus'){
    const positions=[[-w*.55,-l*.7],[w*.55,-l*.7],[-w*.55,-l*.05],[w*.55,-l*.05],[-w*.55,l*.65],[w*.55,l*.65]];
    for(const [x,z] of positions){
      const pivot=new T.Group();pivot.position.set(x,.5,z);root.add(pivot);
      const tire=new T.Mesh(new T.CylinderGeometry(.5,.5,.32,20),rubber);tire.rotation.z=Math.PI/2;pivot.add(tire);
      const spin=new T.Group();pivot.add(spin);
      const spokes=[];
      for(let spoke=0;spoke<6;spoke++){
        const g=new T.BoxGeometry(.35,.06,.55);g.rotateX(spoke*Math.PI/6);spokes.push(g);
      }
      spin.add(new T.Mesh(mergeGeometries(spokes),chrome));
      wheels.push(spin);if(z<0)frontWheels.push(pivot);
    }
  }else{
    for(const x of [-w*.51,w*.51])for(const z of [-l*.65,l*.65]){
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
  for(const [material,geometries] of staticParts){shell.add(new T.Mesh(mergeGeometries(geometries),material));geometries.forEach(g=>g.dispose());}
  // Driver cockpit: a full-cabin dashboard under a framed windshield (cowl, A-pillars,
  // header), a hooded gauge cluster with needles behind the wheel and a small dark
  // rearview mirror, seen from the first-person driving view. Emissive levels stay low
  // so nothing blooms into glare inside the cabin. The interior is hidden by default
  // and only shown from the first-person driver view, so nothing odd sticks to the
  // car in chase view; the shell stays separate so it can be hidden from inside.
  const driverX=-w*.28,eyeY=model.kind==='roadster'?h+.52:h+model.roof*.5;
  const dashMaterial=standard('#15222b',.6,.1),cowlMaterial=standard('#0c141b',.85),bezelMaterial=standard('#0a1016',.5,.35);
  const trimMaterial=surfaceMaterial({color:'#6e5527',emissive:'#c9904f',emissiveIntensity:.32,metalness:.55,roughness:.4});
  const gaugeMaterial=surfaceMaterial({color:'#241c12',emissive:'#f2b16a',emissiveIntensity:.5});
  const needleMaterial=standard('#ffe4bd',.45,.2),mirrorMaterial=standard('#111d26',.12,.85);
  const windshieldMaterial=surfaceMaterial({color:'#9fc0cc',transparent:true,opacity:.07,roughness:.06,metalness:.1,depthWrite:false});
  function interiorPart(x,y,z,a,b,c,material,tilt=0){
    const mesh=new T.Mesh(new T.BoxGeometry(a,b,c),material);mesh.position.set(x,y,z);if(tilt)mesh.rotation.x=tilt;interior.add(mesh);return mesh;
  }
  // Dashboard spanning the cabin below the windshield with a matte cowl top, and the
  // hood slab beyond it (the shell is hidden from this view, so the cockpit supplies
  // its own hood line instead of exposing bare tarmac under the dash).
  interiorPart(0,eyeY-.5,-.72,w*.96,.42,.5,dashMaterial);
  interiorPart(0,eyeY-.28,-.78,w*.96,.05,.36,cowlMaterial);
  interiorPart(0,eyeY-.52,-1.65,w*1.08,.16,1.5,paint,.045);
  // Thin dim Art Deco trim lines along the dash face: readable at blue hour, never blinding.
  interiorPart(0,eyeY-.38,-.465,w*.92,.02,.03,trimMaterial);
  interiorPart(0,eyeY-.6,-.465,w*.92,.012,.025,trimMaterial);
  // Instrument cluster hooded behind the wheel: dim amber dials with pale needles.
  interiorPart(driverX,eyeY-.26,-.68,.44,.18,.26,bezelMaterial);
  interiorPart(driverX,eyeY-.28,-.56,.36,.12,.02,gaugeMaterial,.15);
  interiorPart(driverX-.06,eyeY-.26,-.545,.016,.065,.01,needleMaterial,.15);
  interiorPart(driverX+.06,eyeY-.27,-.545,.016,.045,.01,needleMaterial,.15);
  // Passenger side: dark panel with one small dim indicator (no glare source there).
  interiorPart(w*.28,eyeY-.3,-.44,.2,.11,.03,bezelMaterial);
  interiorPart(w*.28,eyeY-.3,-.422,.14,.03,.012,gaugeMaterial);
  // Windshield frame: cowl base, body-coloured A-pillars and a header, so the cabin
  // reads as a car interior instead of a floating camera.
  interiorPart(0,eyeY-.27,-1.02,w*.98,.1,.14,cowlMaterial);
  interiorPart(-w*.47,eyeY+.04,-1,w*.05,.62,.13,paint);
  interiorPart(w*.47,eyeY+.04,-1,w*.05,.62,.13,paint);
  interiorPart(0,eyeY+.33,-.97,w*.94,.1,.16,paint);
  // Small dark rearview mirror hung under the header: dark surface with a trim back,
  // not a rendered mirror.
  interiorPart(0,eyeY+.245,-.9,.3,.1,.05,bezelMaterial);
  interiorPart(0,eyeY+.245,-.866,.26,.078,.012,mirrorMaterial);
  // Barely-there glass tint so the windshield plane reads without fogging the view.
  interiorPart(0,eyeY+.03,-.98,w*.9,.58,.012,windshieldMaterial,.08);
  const wheelGeometries=[new T.TorusGeometry(.17,.024,10,20)];
  for(const angle of [-1.05,0,1.05]){const spoke=new T.BoxGeometry(.31,.045,.03);spoke.rotateZ(angle);wheelGeometries.push(spoke);}
  const hub=new T.CylinderGeometry(.05,.05,.06,10);hub.rotateX(Math.PI/2);wheelGeometries.push(hub);
  const wheelSpin=new T.Group();
  wheelSpin.add(new T.Mesh(mergeGeometries(wheelGeometries),chrome));
  const column=new T.Group();column.position.set(driverX,eyeY-.3,-.42);column.rotation.x=-1.05;column.add(wheelSpin);interior.add(column);
  interior.updateMatrixWorld(true);
  const interiorParts=new Map();
  for(const child of [...interior.children])if(child.isMesh){
    if(!interiorParts.has(child.material))interiorParts.set(child.material,[]);
    const geometry=child.geometry.clone().applyMatrix4(child.matrix);
    interiorParts.get(child.material).push(geometry.index?geometry.toNonIndexed():geometry);interior.remove(child);
  }
  for(const [material,geometries] of interiorParts){interior.add(new T.Mesh(mergeGeometries(geometries),material));geometries.forEach(g=>g.dispose());}
  interior.visible=false;
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {root,shell,interior,steeringWheel:wheelSpin,driverEye:new T.Vector3(driverX,eyeY,.12),wheels,frontWheels,beam,smoke,paint,model,speed:0,steer:0,heading:0,damage:0,owned:false};
}

export function createVehicles(scene) {
  const cars=[];
  const external=[];
  const positions=[[5,149,0],[-6,116,0],[86,181,Math.PI],[153,92,0],[-74,195,Math.PI/2],[6,-35,0],[-86,-109,Math.PI],[166,-186,0],[-153,-50,Math.PI],[231,138,0],[-230,74,Math.PI],[-35,233,Math.PI/2],[111,7,Math.PI/2],[75,-234,Math.PI/2],[6,59,0],[5,174,0],[-6,139,0],[153,116,Math.PI]];
  positions.forEach(([x,z,heading],index)=>{
    const car=buildCar(vehicleModels[index%8]);car.id=`bay-${index}`;car.root.position.set(x,.02,z);car.heading=heading;car.root.rotation.y=heading;scene.add(car.root);cars.push(car);
  });
  function nearest(position) {return cars.filter(car=>Math.abs(car.speed)<1&&car.root.position.distanceTo(position)<4.6).sort((a,b)=>a.root.position.distanceToSquared(position)-b.root.position.distanceToSquared(position))[0];}
  function drive(car,dt,input,world,onImpact) {
    const previousHeading=car.heading;
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
    const other=[...cars,...external].find(c=>c!==car&&carsOverlap(car,next,c,c.root.position,.15));
    if(collides||other){
      car.heading=previousHeading;
      const force=Math.abs(car.speed);
      let pushed=false;
      // A cruiser yields like a soft obstacle instead of reflecting the player's throttle forever.
      if(other?.police&&!collides&&force>.001){
        const travel=next.clone().sub(old),distance=travel.length();
        const lateral=new T.Vector3(Math.cos(car.heading),0,-Math.sin(car.heading));
        const side=Math.sign(other.root.position.clone().sub(old).dot(lateral))||1;
        const push=other.root.position.clone().addScaledVector(lateral,side*Math.max(.08,distance*1.35));
        push.y=bridgeHeight(push.x,push.z)+.02;
        const occupied=[...cars,...external].some(c=>c!==car&&c!==other&&carsOverlap(other,push,c,c.root.position,.05));
        if(!occupied&&!world.blocked(push.x,push.z,1.1,push.y+.1)){
          other.root.position.copy(push);other.speed=car.speed*.4;car.root.position.copy(next);car.speed*=Math.exp(-dt*1.8);pushed=true;
        }
      }
      if(!pushed){
        if(other?.police&&!collides)car.speed=0;
        else{
          if(force>5)car.damage=Math.min(100,car.damage+force*.45);
          if(force>5||(other&&force>1))onImpact(force,other);
          car.speed*=-.23;
        }
      }
    }else car.root.position.copy(next);
    car.root.position.y=bridgeHeight(car.root.position.x,car.root.position.z)+.02;
    const motorcycle=isMotorcycle(car.model),rollLimit=motorcycle?.48:.025,rollScale=motorcycle?.019:.003;
    car.root.rotation.set(0,car.heading,T.MathUtils.clamp(-car.steer*car.speed*rollScale,-rollLimit,rollLimit));
    car.wheels.forEach(w=>w.rotation.x-=car.speed*dt/.4);
    car.frontWheels.forEach(w=>w.rotation.y=car.steer);
    if(motorcycle)car.steeringWheel.rotation.y=car.steer;else car.steeringWheel.rotation.z=-car.steer*3.2;
    car.paint.color.set(car.model.color).multiplyScalar(1-car.damage*.003);
  }
  const headlight=new T.SpotLight('#ffe8b3',0,38,.65,.7,1.5);scene.add(headlight,headlight.target);
  // lightLevel lets the first-person driver view rein in the headlight pools: the camera
  // sits inside the light cone there, so the un-dimmed pools saturate the wet road into
  // a blown-white wedge at the bottom of the screen. Chase view keeps the full level.
  function update(time,night,focus,active,lightLevel=1) {
    headlight.visible=!!active&&night>.1;headlight.intensity=active?night*25*lightLevel:0;
    if(active){headlight.position.copy(active.root.position).add(new T.Vector3(0,1,0));headlight.target.position.copy(active.root.position).add(new T.Vector3(-Math.sin(active.heading)*18,0,-Math.cos(active.heading)*18));}
    for(const car of cars){
      car.root.visible=car===active||car.root.position.distanceToSquared(focus)<100*100;
      car.beam.intensity=night*15*lightLevel;
      car.smoke.children.forEach((p,i)=>{
        const dust=car===active&&Math.abs(car.speed)>8&&Math.abs(car.steer)>.25;
        p.visible=car.damage>40||dust;
        const phase=(time*.45+i/7)%1;
        p.position.set(Math.sin(i*7+time)*phase*.55,dust?.2+phase*.6:car.model.height+phase*2.5,dust?car.model.length*.4+phase*2:-car.model.length*.3);
        p.scale.setScalar(.35+phase*2.2);
      });
    }
  }
  return {cars,external,nearest,drive,update};
}

// Separating axes for two oriented car footprints; every moving system shares this test.
export function carsOverlap(a,pa,b,pb,padding=0) {
  if(Math.abs(pa.y-pb.y)>2)return false;
  const dx=pb.x-pa.x,dz=pb.z-pa.z;
  if(dx*dx+dz*dz>64)return false;
  const axes=car=>[[Math.cos(car.heading),-Math.sin(car.heading)],[-Math.sin(car.heading),-Math.cos(car.heading)]];
  const aa=axes(a),bb=axes(b);
  for(const [x,z] of [...aa,...bb]){
    const ar=Math.abs(x*aa[0][0]+z*aa[0][1])*a.model.width/2+Math.abs(x*aa[1][0]+z*aa[1][1])*a.model.length/2;
    const br=Math.abs(x*bb[0][0]+z*bb[0][1])*b.model.width/2+Math.abs(x*bb[1][0]+z*bb[1][1])*b.model.length/2;
    if(Math.abs(dx*x+dz*z)>ar+br+padding)return false;
  }
  return true;
}

export function animateAICar(car,dt) {
  const turn=Math.atan2(Math.sin(car.heading-car.root.rotation.y),Math.cos(car.heading-car.root.rotation.y));
  car.root.rotation.y=car.heading;
  if(isMotorcycle(car.model)){
    const target=T.MathUtils.clamp(-turn*Math.abs(car.speed)*.12,-.42,.42);
    car.root.rotation.z=T.MathUtils.damp(car.root.rotation.z,target,7.5,dt);
  }
  for(const wheel of car.wheels)wheel.rotation.x-=car.speed*dt/.4;
  for(const wheel of car.frontWheels)wheel.rotation.y=car.steer||0;
  if(isMotorcycle(car.model))car.steeringWheel.rotation.y=car.steer||0;else car.steeringWheel.rotation.z=-(car.steer||0)*3.2;
}
