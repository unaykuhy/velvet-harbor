import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom, standard,surfaceMaterial } from './render.js';

export const avenues = [-240,-160,-80,0,80,160,240];
export function districtAt(x,z) {
  if (z > 110) return 'Pearlwake Boulevard';
  if (x > 100) return 'Lanternfish Marina';
  if (x < -100) return 'Sunwick Hills';
  return 'Prism Heights';
}

export function createCity(scene, mat) {
  const random = seededRandom();
  const batches = new Map();const colliders = [];const mapBuildings = [];const lampPositions = [];const repeatedBoxes=new Map();
  const transform = new T.Object3D();
  function bake(geometry,material,x,y,z,rx=0,ry=0,rz=0) {
    transform.position.set(x,y,z);transform.rotation.set(rx,ry,rz);transform.scale.set(1,1,1);transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    const key = `${material.uuid}:${Math.floor(x/180)}:${Math.floor(z/180)}`;
    if(!batches.has(key)) batches.set(key,{material,geometries:[]});
    batches.get(key).geometries.push(geometry.index ? geometry.toNonIndexed() : geometry);
  }
  const box=(x,y,z,w,h,d,m,ry=0)=>{
    if(m===mat.windowLight||m===mat.lamp){
      transform.position.set(x,y,z);transform.rotation.set(0,ry,0);transform.scale.set(w,h,d);transform.updateMatrix();
      if(!repeatedBoxes.has(m))repeatedBoxes.set(m,[]);repeatedBoxes.get(m).push(transform.matrix.clone());
    }else bake(new T.BoxGeometry(w,h,d),m,x,y,z,0,ry);
  };
  const cylinder=(x,y,z,r1,r2,h,m,sides=12)=>bake(new T.CylinderGeometry(r1,r2,h,sides),m,x,y,z);
  function solid(x,z,w,d,h,y=0) {colliders.push({x,z,w,d,y,h});}
  function ground(x,z,w,d,m,y=0) {box(x,y-.13,z,w,.25,d,m);}
  ground(-15,0,555,560,mat.grass,-.2);
  ground(0,276,560,65,mat.sand,-.12);
  ground(269,20,42,490,mat.sand,-.1);
  const waterMaterial = new T.ShaderMaterial({
    uniforms:{time:{value:0},night:{value:0}},
    vertexShader:'varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:'uniform float time;uniform float night;varying vec3 vWorld;void main(){float a=sin(vWorld.x*.8+time*.7+sin(vWorld.z*.2))*sin(vWorld.z*1.3+time);float b=pow(max(0.0,sin(vWorld.z*2.1+vWorld.x*.1+time)),22.0);vec3 c=mix(vec3(.055,.38,.43),vec3(.19,.60,.61),a*.3+.4);c+=b*.12;c=mix(c,vec3(.025,.095,.15),night*.8);gl_FragColor=vec4(c,1.0);}'
  });
  const water = new T.Mesh(new T.PlaneGeometry(2400,2400),waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(0,-.55,0);scene.add(water);
  // Seven connected avenues frame walkable blocks. The waterfront continues onto a raised causeway.
  for(const axis of avenues) {
    ground(axis,0,20,555,mat.asphalt,.015);ground(-1,axis,555,20,mat.asphalt,.02);
    for(const side of [-1,1]) {
      for(let segment=-280;segment<=280;segment+=80){
        const center=segment,length=52;
        ground(axis+side*12,center,4,length,mat.sidewalk,.12);ground(center,axis+side*12,length,4,mat.sidewalk,.12);
        box(axis+side*10.1,.13,center,.22,.22,length,mat.trim);box(center,.13,axis+side*10.1,length,.22,.22,mat.trim);
      }
    }
    for(let p=-272;p<276;p+=9) {
      if(avenues.every(a=>Math.abs(p-a)>15)) {
        box(axis,.045,p,.15,.025,4.4,mat.yellow);box(p,.05,axis,4.4,.025,.15,mat.yellow);
        for(const side of [-1,1]){box(axis+side*6.7,.05,p,.1,.025,3,mat.paint);box(p,.055,axis+side*6.7,3,.025,.1,mat.paint);}
      }
    }
    for(const cross of avenues) for(let stripe=-7;stripe<=7;stripe+=2) {
      box(axis+stripe,.065,cross+8.5,1.1,.025,2.1,mat.paint);
      box(axis+8.5,.065,cross+stripe,2.1,.025,1.1,mat.paint);
    }
  }
  function sign(text,x,y,z,width,color='#f3d8ad',rotation=0) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const c=canvas.getContext('2d');c.fillStyle='#153b43';c.fillRect(0,0,512,128);
    c.strokeStyle=color;c.lineWidth=3;c.strokeRect(8,8,496,112);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';
    c.font=`bold ${text.length>16?29:40}px Arial`;c.fillText(text,256,66);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const material=surfaceMaterial({map:texture,roughness:.65,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.25});
    const mesh=new T.Mesh(new T.PlaneGeometry(width,width/4),material);mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);
  }
  function building(x,z,w,d,h,palette,style) {
    solid(x,z,w,d,h);mapBuildings.push({x,z,w,d});
    box(x,h/2,z,w,h,d,palette);
    // Projecting floor lines, deep parapets, stepped crowns and shaded retail bases break up each facade.
    box(x,1.1,z,w+.5,2.2,d+.5,mat.trim);
    box(x,1.65,z+d/2+.29,w-.8,2.6,.18,mat.dark);
    for(let door=-w/2+1.5;door<w/2;door+=3.8) box(x+door,1.5,z+d/2+.45,.09,2.8,.1,mat.trim);
    box(x,3.4,z+d/2+1.1,w+1,.22,2.5,style===1?mat.pink:mat.teal);
    for(let floor=4;floor<h;floor+=style===0?4.2:3.3) {
      box(x,floor,z,w+.5,.13,d+.5,mat.trim);
      if(style===1) {
        for(const side of [-1,1]) {
          box(x,floor-.6,z+side*(d/2+.8),w-1,.12,1.7,mat.trim);
          box(x,floor-.12,z+side*(d/2+1.55),w-1,.65,.08,mat.steel);
          for(let rail=-w/2+1;rail<w/2;rail+=2) box(x+rail,floor-.2,z+side*(d/2+1.55),.07,.8,.07,mat.steel);
        }
      }
    }
    box(x,h+.2,z,w+.6,.4,d+.6,mat.trim);
    box(x,h+.7,z,w*.65,1,d*.65,mat.dark);
    for(let unit=0;unit<2;unit++) {
      box(x+(unit-.5)*w*.35,h+1.6,z,2.2,1.2,2.4,mat.steel);
      cylinder(x+(unit-.5)*w*.35,h+2.25,z,.7,.7,.15,mat.dark);
    }
    if(style===0) {
      box(x,h+3,z,w*.6,4,d*.6,mat.glass);box(x,h+5.2,z,w*.63,.3,d*.63,mat.trim);
      cylinder(x,h+8,z,.11,.14,6,mat.steel);
      for(const side of [-1,1])box(x+side*w*.35,h/2,z,.28,h,d+.3,mat.steel);
      if(x>0){
        cylinder(x+w*.32,h*.45,z+d*.32,w*.23,w*.23,h*.9,mat.glass,20);
        for(let floor=5;floor<h*.9;floor+=4.2)cylinder(x+w*.32,floor,z+d*.32,w*.24,w*.24,.14,mat.trim,20);
        cylinder(x+w*.32,h*.9+.2,z+d*.32,w*.25,w*.25,.4,mat.trim,20);
      }
      // Art Deco signature: stepped crown band, mid-tower spandrel band and corner fins in neon trim.
      // Bands are kept slim but wide enough to read against the towers; bloom carries the glow.
      const trimMaterial=[mat.neonCyan,mat.neonMagenta,mat.neon][Math.abs(Math.imul(x,37)+Math.imul(z,61))%3];
      box(x,h+1.4,z,w+1,.34,d+1,trimMaterial);
      box(x,h*.78,z,w+.75,.28,d+.75,trimMaterial);
      for(const side of [-1,1])box(x+side*(w/2+.2),h*.6,z,.16,h*.85,d+.6,mat.steel);
    }
    for(let level=5;level<h;level+=6.6) for(let col=-w/2+2;col<w/2-1;col+=4.4) {
      if(random()>.62) box(x+col,level,z+d/2+.025,1.2,1.8,.04,mat.windowLight);
    }
  }
  const shops=['SALT & SUN','VALE WORKWEAR','BAYLINE COFFEE','CORAL SOCIAL','SUNDIAL RECORDS','TIDE & TABLE'];
  for(let ix=0;ix<6;ix++) for(let iz=0;iz<6;iz++) {
    const cx=avenues[ix]+40,cz=avenues[iz]+40;
    if((ix===3&&iz===4)||(ix===0&&iz===2)) {
      ground(cx,cz,49,49,mat.grass,.16);
      ground(cx,cz,4,49,mat.sidewalk,.18);ground(cx,cz,49,4,mat.sidewalk,.18);
      cylinder(cx,.4,cz,6,6,.6,mat.trim,32);cylinder(cx,.77,cz,5.5,5.5,.15,mat.teal,32);
      cylinder(cx,1.4,cz,.5,.8,1.3,mat.trim);continue;
    }
    const downtown=ix>=2&&ix<=3&&iz<=3;
    const suburb=ix<2&&iz<4;
    const dock=ix>=4&&iz<3;
    if(dock) {
      building(cx,cz,40,25,8,mat.teal,2);sign('RUSTCRANE / FREIGHT',cx,5,cz+12.8,24);
      for(let c=0;c<5;c++)for(let row=0;row<2;row++) {
        const mx=cx-20+c*9,mz=cz-21+row*8;
        box(mx,1.7,mz,8,3.2,5.5,c%2?mat.pink:mat.steel);solid(mx,mz,8,5.5,3.2);
        for(let rib=-3.5;rib<4;rib+=.8)box(mx+rib,1.7,mz+2.8,.09,3,.08,mat.trim);
      }
      continue;
    }
    for(let bx=0;bx<2;bx++)for(let bz=0;bz<2;bz++) {
      const x=cx+(bx-.5)*27,z=cz+(bz-.5)*27;
      const w=suburb?17:18+random()*5,d=suburb?16:18+random()*4;
      const h=downtown?25+random()*56:suburb?5+random()*4:8+random()*10;
      const palette=downtown?mat.glass:iz>=4?(bx%2?mat.coral:mat.cream):suburb?mat.cream:mat.teal;
      building(x,z,w,d,h,palette,downtown?0:suburb?2:1);
      if(suburb) {
        bake(new T.CylinderGeometry(0,w*.78,4,4),mat.roof,x,h+2,z,0,Math.PI/4);
        box(x,1.3,z+d/2+2,w+2,.15,4,mat.trim);
        for(const s of [-1,1])cylinder(x+s*(w/2-.6),1.4,z+d/2+3,.13,.13,2.7,mat.trim);
      } else if(!downtown)sign(shops[(ix*2+iz+bx+bz)%shops.length],x,2.6,z+d/2+.58,w*.82);
    }
  }
  // A low curved seaside pavilion anchors the boulevard rather than another tower.
  cylinder(120,.8,267,12,12,1.5,mat.trim,40);
  cylinder(120,3.5,267,10,10,5,mat.glass,40);
  cylinder(120,6.3,267,13,12,.6,mat.pink,40);
  solid(120,267,22,22,6);sign('THE SALT HOUSE',120,4,277.1,14);
  for(let x=-240;x<230;x+=18) {
    box(x,.35,254,10,.5,2,mat.wood);
    for(const dx of [-3,3])box(x+dx,.7,254,.14,1.2,2,mat.steel);
    if(x%36===0){cylinder(x,1.6,285,.08,.09,3.3,mat.trim);bake(new T.ConeGeometry(2.7,.8,20),mat.pink,x,3.4,285);}
  }
  // Marina finger piers and sculpted hulls; they remain scenery in this phase.
  for(let z=-165;z<190;z+=55) {
    box(300,.15,z,100,.6,7,mat.wood);
    for(let x=266;x<348;x+=16) {
      cylinder(x,-.6,z, .3,.35,3,mat.trunk);
      const hull=new T.Shape();hull.moveTo(-2,-6);hull.quadraticCurveTo(-3,1,0,7);hull.quadraticCurveTo(3,1,2,-6);hull.closePath();
      const geometry=new T.ExtrudeGeometry(hull,{depth:1,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.3,bevelThickness:.3});
      bake(geometry,mat.white,x,.4,z+11,-Math.PI/2);box(x,1.1,z+10,2,1.3,3.5,mat.teal);
      cylinder(x,4,z+10,.055,.07,7,mat.steel);
    }
  }
  for(let z=-230;z<-110;z+=50) {
    for(const x of [265,305]) {box(x,13,z,1.4,26,1.4,mat.yellow);box(x,25,z,2,2,37,mat.yellow);}
    box(285,26,z,43,2,2,mat.yellow);box(285,12,z+15,.12,25,.12,mat.steel);
  }
  // A genuine graded bridge crosses the harbor, with matching collision height.
  // Milestone 3d upgrades the EXISTING bridge in place — no second deck, no new
  // alignment: Art Deco post finials and ribbon rails, cyan/magenta neon edge
  // trim, staggered warm pole lamps and stepped entrance portals. Roadway width,
  // grade and bridgeHeight collision are untouched.
  box(310,4.7,-80,50,.6,20,mat.asphalt);
  bake(new T.BoxGeometry(45.28,.6,20),mat.asphalt,262.5,2.2,-80,0,0,.11066);
  bake(new T.BoxGeometry(45.28,.6,20),mat.asphalt,357.5,2.2,-80,0,0,-.11066);
  // Deco fascia bands dress the flat span's outer deck edges without narrowing the road.
  for(const z of [-90.18,-69.82])box(310,4.42,z,49.6,.5,.24,mat.trim);
  let lampSide=0;
  for(let x=245;x<380;x+=8) {
    const y=bridgeHeight(x,-80);
    for(const z of [-90, -70]) {
      box(x,y+1,z,.1,2,.1,mat.steel);box(x,y+1.8,z,8,.1,.1,mat.trim);
      box(x,y+1.42,z,7.2,.07,.07,mat.steel);   // deco ribbon rail
      box(x,y+2.06,z,.5,.14,.5,mat.trim);      // stepped cap plate
      box(x,y+2.32,z,.24,.34,.24,mat.trim);    // finial
      box(x,y+2.58,z,.12,.2,.12,mat.neon);     // neon tip
    }
    box(x+4,y+1.94,-90.3,7.6,.12,.16,mat.neonCyan);    // north edge neon ribbon
    box(x+4,y+1.94,-69.7,7.6,.12,.16,mat.neonMagenta); // south edge neon ribbon
    // Staggered warm pole lamps stand on the railing line with arms reaching over
    // the kerb, so the drivable width stays exactly as it was.
    const lz=lampSide%2?-70.25:-89.75;lampSide++;
    const dir=lz<-80?1:-1;
    box(x+2,y+1.45,lz,.09,2.9,.09,mat.steel);
    box(x+2,y+2.86,lz+dir*.55,.09,.09,1.1,mat.steel);
    box(x+2,y+2.8,lz+dir*1.15,.8,.16,.55,mat.lamp);
    lampPositions.push(new T.Vector3(x+2,y+2.62,lz+dir*1.15));
  }
  // Art Deco entrance portals frame both ends: stepped pylons with steel fins and
  // neon ribs, joined by a slim stepped arch. They stand outside the deck edges,
  // so neither the roadway nor the skyline-and-lantern view from the deck is blocked.
  for(const ex of [238.5,381.5]) {
    for(const pz of [-91.9,-68.1]) {
      const inward=pz<-80?1:-1,rib=pz<-80?mat.neonCyan:mat.neonMagenta;
      box(ex,.5,pz,2.3,2.6,2.3,mat.trim);
      box(ex,3.6,pz,1.5,3.4,1.5,mat.trim);
      box(ex,6,pz,1.05,1.4,1.05,mat.trim);
      box(ex,7,pz,.62,.8,.62,mat.trim);
      box(ex,3.8,pz+inward*.82,1.7,3.8,.18,mat.steel);
      for(const off of [-.55,0,.55])box(ex+off,3.9,pz+inward*.95,.14,4,.1,rib);
      solid(ex,pz,2.3,2.3,7.5);
    }
    box(ex,7.1,-80,.85,.5,23.4,mat.trim);
    box(ex,7.55,-80,.66,.44,16.5,mat.trim);
    box(ex,7.95,-80,.5,.4,10.5,mat.trim);
    box(ex,8.28,-80,.36,.3,5.5,mat.trim);
  }
  // Instanced palms: curved trunks and tapered, bent leaf ribbons authored as geometry.
  const palms=[];
  for(let z=-265;z<=265;z+=27)for(const x of [-13,13,227,253]) {
    if(avenues.every(a=>Math.abs(z-a)>16))palms.push({x,z,h:8+random()*3});
  }
  for(let x=-258;x<=233;x+=23)palms.push({x,z:251,h:8+random()*3});
  for(let p=0;p<24;p++)palms.push({x:-221+random()*170,z:-225+random()*310,h:7+random()*3});
  const trunkGeometry=new T.CylinderGeometry(.17,.33,1,9,5);trunkGeometry.translate(.1,.5,0);
  const trunks=new T.InstancedMesh(trunkGeometry,mat.trunk,palms.length);
  const leafVertices=[],leafIndices=[];
  for(let j=0;j<=12;j++) {
    const t=j/12,w=Math.sin(t*Math.PI)*.65*(j%2?.55:1);
    leafVertices.push(t*5,Math.sin(t*Math.PI)*1.7-t*1.2,-w,t*5,Math.sin(t*Math.PI)*1.7-t*1.2,w);
    if(j<12){const k=j*2;leafIndices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const leafGeometry=new T.BufferGeometry();leafGeometry.setAttribute('position',new T.Float32BufferAttribute(leafVertices,3));leafGeometry.setIndex(leafIndices);leafGeometry.computeVertexNormals();
  const leafMaterial=mat.leaf.clone();leafMaterial.side=T.DoubleSide;
  const leaves=new T.InstancedMesh(leafGeometry,leafMaterial,palms.length*9);
  palms.forEach((p,index)=>{
    transform.position.set(p.x,0,p.z);transform.rotation.set(0,index, .035);transform.scale.set(1,p.h,1);transform.updateMatrix();trunks.setMatrixAt(index,transform.matrix);
    for(let l=0;l<9;l++){
      transform.position.set(p.x+.1,p.h,p.z);transform.rotation.set((l%2)*.13,l/9*Math.PI*2+index,-.1);transform.scale.setScalar(.8+(index%4)*.08);transform.updateMatrix();leaves.setMatrixAt(index*9+l,transform.matrix);
    }
    solid(p.x,p.z,.6,.6,p.h);
  });
  trunks.castShadow=true;leaves.castShadow=true;scene.add(trunks,leaves);
  // Lamps, benches, bollards and shop details share merged geometry to keep draw calls bounded.
  for(const x of [-12,12,148,252,-172])for(let z=-265;z<270;z+=38) {
    if(avenues.some(a=>Math.abs(z-a)<16))continue;
    cylinder(x,3.7,z,.07,.13,7.4,mat.steel);box(x+1.05,7.4,z,2.2,.12,.15,mat.steel);
    box(x+1.9,7.3,z,.7,.12,.5,mat.lamp);lampPositions.push(new T.Vector3(x+1.9,7,z));
  }
  for(let z=98;z<225;z+=24) {
    for(const x of [-14,14]){
      cylinder(x,.5,z,.65,.5,.9,mat.trim);
      bake(new T.SphereGeometry(.9,10,7),mat.leaf,x,1.25,z);
    }
  }
  sign('SALTGILT',-17,10,132,20,'#f3bc98',Math.PI/2);
  sign('PEARLWAKE BOULEVARD',15,6.5,180,13,'#f9d69e',-Math.PI/2);
  // Distant headlands make the sea read as a bay.
  for(let i=0;i<16;i++)bake(new T.ConeGeometry(70+random()*65,50+random()*95,9),standard('#73968b'),-650+i*110,8,-620-random()*100);
  for(const batch of batches.values()) {
    const geometry=mergeGeometries(batch.geometries,false);
    const mesh=new T.Mesh(geometry,batch.material);mesh.castShadow=batch.material!==mat.asphalt&&batch.material!==mat.grass&&batch.material!==mat.sidewalk&&batch.material!==mat.sand;mesh.receiveShadow=[mat.asphalt,mat.grass,mat.sidewalk,mat.sand,mat.trim].includes(batch.material);scene.add(mesh);
    for(const g of batch.geometries)g.dispose();
  }
  for(const [material,matrices] of repeatedBoxes){
    const instances=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,matrices.length);
    matrices.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));scene.add(instances);
  }
  const nightLights=[];
  for(let i=0;i<3;i++){const light=new T.PointLight('#ffd49b',0,21,2);scene.add(light);nightLights.push(light);}
  function update(time,night,focus) {
    waterMaterial.uniforms.time.value=time;waterMaterial.uniforms.night.value=night;
    palms.forEach((p,index)=>{for(let l=0;l<9;l++){
      transform.position.set(p.x+.1,p.h,p.z);transform.rotation.set((l%2)*.13+Math.sin(time*1.1+index*.7)*.035,l/9*Math.PI*2+index,-.1+Math.sin(time*.9+index+l*.4)*.045);transform.scale.setScalar(.8+(index%4)*.08);transform.updateMatrix();leaves.setMatrixAt(index*9+l,transform.matrix);
    }});leaves.instanceMatrix.needsUpdate=true;
    const nearby=lampPositions.filter(p=>p.distanceToSquared(focus)<4200).sort((a,b)=>a.distanceToSquared(focus)-b.distanceToSquared(focus));
    nightLights.forEach((light,i)=>{light.visible=night>.1;light.intensity=nearby[i]?night*21:0;if(nearby[i])light.position.copy(nearby[i]);});
  }
  function blocked(x,z,radius= .4,y=0) {
    if(x < -278 || z < -278 || z > 300 || (x>253&&Math.abs(z+80)>9) || x>378)return true;
    return colliders.some(c=>y<c.y+c.h&&Math.abs(x-c.x)<c.w/2+radius&&Math.abs(z-c.z)<c.d/2+radius);
  }
  return {blocked,update,mapBuildings,colliders,seed:73129,palms:palms.length};
}

export function bridgeHeight(x,z) {
  if(Math.abs(z+80)>10||x<240||x>380)return 0;
  return Math.max(0,Math.min(5,(x-240)/9,(380-x)/9));
}
