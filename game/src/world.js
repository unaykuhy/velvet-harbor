import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom, standard,surfaceMaterial } from './render.js';
import { buildCitizen } from './peds.js';

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
    for(const cross of avenues) for(const sx of [-1,1]) for(const sz of [-1,1])
      ground(axis+sx*16,cross+sz*16,12,12,mat.sidewalk,.14);
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
    // Pave every non-plaza block with sidewalk so the 49x49 grass pads between the
    // perimeter sidewalk strips become continuous paved ground (user: "ganti dengan
    // trotoar juga agar tersambung"); buildings and block contents sit on top.
    ground(cx,cz,49,49,mat.sidewalk,.13);
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
  // ── MILESTONE 3 — SUNWICK HILLS HOUSING + MARIGOLD GARDENS + GAPURA ──
  // District Sunwick Hills: x < -100. Two housing blocks (ix=0,1 at iz=3) + Marigold Gardens (iz=2).
  // Roundabout centre at (-160, 40). 8 houses in circle radius 14, all facing centre.
  // Exit road: roundabout south through Marigold Gardens to avenue at z=-80.
  // Gapura at south edge of Marigold Gardens (z≈-76).
  const housingCenterX = -160;
  const housingCenterZ = 40;
  const roundaboutR = 11;
  const houseCircleR = 16;
  // Roundabout: circular drive + central island
  const ringGeo = new T.RingGeometry(roundaboutR, roundaboutR + 5.5, 32);
  ringGeo.rotateX(-Math.PI / 2);
  bake(ringGeo, mat.asphalt, housingCenterX, 0.02, housingCenterZ);
  // Central island with grass + pine
  cylinder(housingCenterX, 0.35, housingCenterZ, roundaboutR - 0.5, roundaboutR - 0.5, 0.6, mat.grass, 24);
  solid(housingCenterX, housingCenterZ, (roundaboutR - 0.5) * Math.SQRT2, (roundaboutR - 0.5) * Math.SQRT2, 0.6);
  cylinder(housingCenterX, 2.5, housingCenterZ, 0.55, 0.75, 5, mat.trunk);
  bake(new T.ConeGeometry(2.2, 4.5, 8), mat.leaf, housingCenterX, 5.5, housingCenterZ);
  solid(housingCenterX, housingCenterZ, 1.1, 1.1, 5);
  // 8 houses around the roundabout
  const housePositions = [];
  for (let i = 0; i < 8; i++) {
    // Rotate circle by π/8 so the south direction (180°) falls between houses
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    let hx = housingCenterX + Math.sin(angle) * houseCircleR;
    let hz = housingCenterZ + Math.cos(angle) * houseCircleR;
    // Shift houses flanking the south exit (i=3 @157.5°, i=4 @202.5°) radially outward 2 m
    if (i === 3 || i === 4) {
      hx += Math.sin(angle) * 2;
      hz += Math.cos(angle) * 2;
    }
    const ry = angle + Math.PI; // face centre
    housePositions.push({ x: hx, z: hz, ry, num: i + 1, noFence: i === 3 || i === 4 });
  }
  // Shared materials for houses
  const hedgeMat = standard('#2d5a27', 0.9);
  const gravelMat = standard('#6b6b6b', 0.95);
  const windowMat = standard('#356c7c', 0.3, 0.4);
  // House prototype: dark roof, cream walls, hedge fence, yard, driveway, trees
  function buildHouse(x, z, ry, num, noFence) {
    const w = 7.5, d = 9, h = 4.2;
    const halfW = w / 2, halfD = d / 2;
    const c = Math.cos(ry), s = Math.sin(ry);
    // Footprint collision (house solid)
    solid(x, z, w, d, h);
    // Walls
    box(x, h / 2, z, w, h, d, mat.cream, ry);
    // Dark roof (hipped pyramid)
    bake(new T.ConeGeometry(Math.hypot(halfW, halfD) * 1.05, 2.8, 4), mat.roof, x, h + 1.4, z, 0, ry + Math.PI / 4);
    // Front porch facing roundabout
    const px = x + c * (halfD + 1.2), pz = z + s * (halfD + 1.2);
    box(px, 0.6, pz, 3.2, 0.3, 1.8, mat.trim, ry);
    box(px + c * 0.9, 1.15, pz + s * 0.9, 0.12, 2.2, 0.12, mat.steel, ry);
    box(px - c * 0.9, 1.15, pz - s * 0.9, 0.12, 2.2, 0.12, mat.steel, ry);
    // Windows (two per side, skip back)
    for (const side of [-1, 1]) {
      if (side === 1) continue; // back wall no windows
      const wx = x + c * (halfD + 0.06) + s * side * 1.8;
      const wz = z + s * (halfD + 0.06) - c * side * 1.8;
      box(wx, 2.1, wz, 1.6, 1.4, 0.08, windowMat, ry);
      box(wx, 2.1, wz - s * 3.2, 1.6, 1.4, 0.08, windowMat, ry);
    }
    // Hedge fence around yard (rectangle 11x13, house centred) — visual only, no collision solid
    const fenceW = 11, fenceD = 13;
    for (let offset = -fenceW / 2; offset <= fenceW / 2; offset += 1.2) {
      const fx1 = x + c * (fenceD / 2) + s * offset;
      const fz1 = z + s * (fenceD / 2) - c * offset;
      cylinder(fx1, 0.55, fz1, 0.35, 0.3, 1.1, hedgeMat);
      const fx2 = x - c * (fenceD / 2) + s * offset;
      const fz2 = z - s * (fenceD / 2) - c * offset;
      cylinder(fx2, 0.55, fz2, 0.35, 0.3, 1.1, hedgeMat);
    }
    for (let offset = -fenceD / 2 + 1.2; offset < fenceD / 2; offset += 1.2) {
      const fx1 = x + c * offset + s * (fenceW / 2);
      const fz1 = z + s * offset - c * (fenceW / 2);
      cylinder(fx1, 0.55, fz1, 0.35, 0.3, 1.1, hedgeMat);
      const fx2 = x + c * offset - s * (fenceW / 2);
      const fz2 = z + s * offset + c * (fenceW / 2);
      cylinder(fx2, 0.55, fz2, 0.35, 0.3, 1.1, hedgeMat);
    }
    // Driveway from house to roundabout (gravel strip)
    const driveLen = houseCircleR - (noFence ? d / 2 : fenceD / 2) - 0.5;
    for (let t = 0; t < driveLen; t += 0.8) {
      const dx = x - c * ((noFence ? d / 2 : fenceD / 2) + 0.4 + t);
      const dz = z - s * ((noFence ? d / 2 : fenceD / 2) + 0.4 + t);
      box(dx, 0.06, dz, 2.2, 0.12, 0.8, gravelMat, ry);
    }
    // Yard trees (pine) at fence corners
    for (const [ox, oz] of [[-fenceW/2+0.7, -fenceD/2+0.7], [fenceW/2-0.7, -fenceD/2+0.7], [-fenceW/2+0.7, fenceD/2-0.7], [fenceW/2-0.7, fenceD/2-0.7]]) {
      const tx = x + c * oz + s * ox;
      const tz = z + s * oz - c * ox;
      cylinder(tx, 1.8, tz, 0.25, 0.35, 3.6, mat.trunk);
      bake(new T.ConeGeometry(1.3, 3.2, 7), mat.leaf, tx, 4.2, tz);
      if (!noFence) solid(tx, tz, 0.7, 0.7, 3.6);
    }
    // House number sign on porch
    const sx = px + c * 0.2, sz = pz + s * 0.2;
    sign(String(num), sx, 1.8, sz, 1.8, '#f3d8ad', ry);
  }
  housePositions.forEach(p => buildHouse(p.x, p.z, p.ry, p.num, p.noFence));
  // Exit road: from roundabout south edge to avenue at z=-80
  const roadStartZ = housingCenterZ - (roundaboutR + 5.5);
  const roadEndZ = -80;
  const roadW = 7;
  // Road surface
  ground(housingCenterX, (roadStartZ + roadEndZ) / 2, roadW, roadStartZ - roadEndZ, mat.asphalt, 0.02);
  // Sidewalks
  ground(housingCenterX - roadW/2 - 2, (roadStartZ + roadEndZ) / 2, 2, roadStartZ - roadEndZ, mat.sidewalk, 0.12);
  ground(housingCenterX + roadW/2 + 2, (roadStartZ + roadEndZ) / 2, 2, roadStartZ - roadEndZ, mat.sidewalk, 0.12);
  // Trim lines
  for (let zz = roadEndZ; zz < roadStartZ; zz += 9) {
    if (avenues.every(a => Math.abs(zz - a) > 15)) {
      box(housingCenterX, 0.045, zz, 0.15, 0.025, 4.4, mat.yellow);
      for (const side of [-1, 1]) box(housingCenterX + side * (roadW/2 + 0.3), 0.05, zz, 0.1, 0.025, 3, mat.paint);
    }
  }
  // Parked cars along inner edge of exit road (west side)
  const tyreMat = standard('#111111', 0.9, 0.1);
  for (let zz = roadEndZ + 12; zz < roadStartZ - 12; zz += 14) {
    const carX = housingCenterX - roadW/2 - 3.2;
    const carZ = zz + (random() - 0.5) * 1.5;
    const carBody = standard('#2a1f1a');
    box(carX, 0.7, carZ, 2.0, 1.1, 4.2, carBody);
    box(carX, 1.45, carZ, 1.5, 0.9, 2.4, standard('#1a1210'));
    cylinder(carX - 0.85, 0.35, carZ - 1.4, 0.32, 0.32, 0.28, tyreMat);
    cylinder(carX + 0.85, 0.35, carZ - 1.4, 0.32, 0.32, 0.28, tyreMat);
    cylinder(carX - 0.85, 0.35, carZ + 1.4, 0.32, 0.32, 0.28, tyreMat);
    cylinder(carX + 0.85, 0.35, carZ + 1.4, 0.32, 0.32, 0.28, tyreMat);
    solid(carX, carZ, 2.0, 4.2, 1.5);
  }
  // Marigold Gardens: flower beds, paths, lamps, benches, hedges around perimeter
  const gardenCenterX = housingCenterX;
  const gardenCenterZ = -40;
  const gardenW = 36, gardenD = 32;
  const flowerBlue = standard('#5fd6ff');
  const flowerMagenta = standard('#ff6ec7');
  // Garden ground: grass on WEST and EAST lawns only — the exit-road corridor (x -164..-156) stays asphalt
  ground(gardenCenterX - 11, gardenCenterZ, 14, gardenD, mat.grass, 0.05);
  ground(gardenCenterX + 11, gardenCenterZ, 14, gardenD, mat.grass, 0.05);
  // Central circular path around fountain (fountain on west lawn, clear of the road corridor)
  const fountainX = gardenCenterX - 13;
  const pathR = 6;
  const pathRing = new T.RingGeometry(pathR, pathR + 2.5, 24);
  pathRing.rotateX(-Math.PI / 2);
  bake(pathRing, mat.sidewalk, fountainX, 0.1, gardenCenterZ);
  // Fountain at centre
  cylinder(fountainX, 0.45, gardenCenterZ, 1.8, 1.8, 0.6, mat.trim, 24);
  cylinder(fountainX, 1.15, gardenCenterZ, 1.2, 1.2, 0.3, mat.trim, 24);
  cylinder(fountainX, 1.8, gardenCenterZ, 0.6, 0.6, 0.8, mat.trim, 24);
  cylinder(fountainX, 2.3, gardenCenterZ, 0.15, 0.2, 1.2, mat.steel);
  solid(fountainX, gardenCenterZ, 3.6, 3.6, 2.5);
  // Flower beds in four quadrants
  const flowerColors = [mat.pink, mat.yellow, flowerBlue, flowerMagenta];
  for (let q = 0; q < 4; q++) {
    const qx = gardenCenterX + (q % 2 === 0 ? -7.5 : 7.5);
    const qz = gardenCenterZ + (q < 2 ? -7 : 7);
    let fi = 0;
    for (let fx = -3; fx <= 3; fx += 1.5) {
      let fj = 0;
      for (let fz = -3; fz <= 3; fz += 1.5) {
        const colorIndex = (fi * 5 + fj) % 4;
        cylinder(qx + fx, 0.35, qz + fz, 0.22, 0.18, 0.4, flowerColors[colorIndex]);
        fj++;
      }
      fi++;
    }
  }
  // Garden lamps on path ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lx = fountainX + Math.sin(a) * (pathR + 1.25);
    const lz = gardenCenterZ + Math.cos(a) * (pathR + 1.25);
    cylinder(lx, 2.1, lz, 0.06, 0.11, 4.2, mat.steel);
    box(lx + 0.5, 4.2, lz, 1.4, 0.1, 0.12, mat.steel);
    box(lx + 0.9, 4.1, lz, 0.6, 0.12, 0.5, mat.lamp);
    lampPositions.push(new T.Vector3(lx + 0.9, 3.9, lz));
    solid(lx, lz, 0.25, 0.25, 4.2);
  }
  // Benches on path ring (facing fountain)
  for (let i = 0; i < 8; i += 2) {
    const a = (i / 8) * Math.PI * 2;
    const bx = fountainX + Math.sin(a) * (pathR + 2.8);
    const bz = gardenCenterZ + Math.cos(a) * (pathR + 2.8);
    bench(bx, bz, a + Math.PI);
  }
  // Hedge perimeter around garden — leave a gap where the exit road crosses (|x+160| < 4.5)
  for (let x = -gardenW/2; x <= gardenW/2; x += 1.1) {
    if (Math.abs(x) >= 4.5) {
      cylinder(gardenCenterX + x, 0.55, gardenCenterZ - gardenD/2, 0.35, 0.3, 1.1, hedgeMat);
      cylinder(gardenCenterX + x, 0.55, gardenCenterZ + gardenD/2, 0.35, 0.3, 1.1, hedgeMat);
    }
  }
  for (let z = -gardenD/2 + 1.1; z < gardenD/2; z += 1.1) {
    cylinder(gardenCenterX - gardenW/2, 0.55, gardenCenterZ + z, 0.35, 0.3, 1.1, hedgeMat);
    cylinder(gardenCenterX + gardenW/2, 0.55, gardenCenterZ + z, 0.35, 0.3, 1.1, hedgeMat);
  }
  // Garden perimeter colliders: 4 strips, open across the road corridor (x -164..-156)
  solid(gardenCenterX - 11, gardenCenterZ - gardenD/2, 14, 1.5, 1.1);
  solid(gardenCenterX + 11, gardenCenterZ - gardenD/2, 14, 1.5, 1.1);
  solid(gardenCenterX - 11, gardenCenterZ + gardenD/2, 14, 1.5, 1.1);
  solid(gardenCenterX + 11, gardenCenterZ + gardenD/2, 14, 1.5, 1.1);
  solid(gardenCenterX - gardenW/2, gardenCenterZ, 1.5, gardenD, 1.1);
  solid(gardenCenterX + gardenW/2, gardenCenterZ, 1.5, gardenD, 1.1);
  // GAPURA: Art Deco gate arch at south entrance of Marigold Gardens (z≈-76)
  const gapuraZ = -76;
  const gapuraX = housingCenterX;
  // Base plinths
  for (const side of [-1, 1]) {
    const px = gapuraX + side * 4.2;
    box(px, 0.7, gapuraZ, 2.4, 1.4, 2.4, mat.trim);
    box(px, 2.4, gapuraZ, 1.6, 2.8, 1.6, mat.trim);
    box(px, 4.2, gapuraZ, 1.0, 1.2, 1.0, mat.trim);
    // Steel fin
    box(px, 3.0, gapuraZ + side * 0.8, 0.18, 2.4, 0.12, mat.steel);
    box(px + side * 0.6, 3.0, gapuraZ, 0.12, 2.4, 0.18, mat.steel);
    // Neon ribs
    for (const off of [-0.5, 0, 0.5]) {
      box(px + off, 3.1, gapuraZ + side * 0.95, 0.12, 2.6, 0.08, side === -1 ? mat.neonCyan : mat.neonMagenta);
    }
    // Warm lamp on top
    box(px, 5.0, gapuraZ, 0.12, 1.6, 0.12, mat.steel);
    box(px, 5.9, gapuraZ, 0.8, 0.14, 0.5, mat.lamp);
    lampPositions.push(new T.Vector3(px, 5.7, gapuraZ));
    solid(px, gapuraZ, 1.6, 1.6, 6);
  }
  // Arch top connecting plinths
  box(gapuraX, 6.8, gapuraZ, 9.2, 0.5, 2.0, mat.trim);
  box(gapuraX, 7.2, gapuraZ, 8.4, 0.35, 1.4, mat.trim);
  box(gapuraX, 7.55, gapuraZ, 7.6, 0.28, 0.9, mat.trim);
  // "MARIGOLD GARDENS" sign on arch
  sign('MARIGOLD GARDENS', gapuraX, 6.9, gapuraZ + 1.1, 8.5, '#ffd44a', 0);
  // Gold trim accent
  box(gapuraX, 6.8, gapuraZ, 9.4, 0.08, 2.2, standard('#d8b34a'));
  box(gapuraX, 7.55, gapuraZ, 7.8, 0.06, 1.1, standard('#d8b34a'));
  // Neon edge glow on arch
  box(gapuraX, 6.8, gapuraZ + 1.05, 9.0, 0.06, 0.12, mat.neonCyan);
  box(gapuraX, 6.8, gapuraZ - 1.05, 9.0, 0.06, 0.12, mat.neonMagenta);
  // Road continues through gate to avenue (already covered by exit road ground)
  // NOTE: no span collider under the arch — the plinths at the road edges already block, cars pass under
  // Pine trees along exit road (west side, between roundabout and garden)
  for (let zz = roadStartZ - 8; zz > gardenCenterZ + gardenD/2 + 4; zz -= 10) {
    const tx = housingCenterX - roadW/2 - 5.5;
    cylinder(tx, 1.8, zz, 0.3, 0.4, 4.5, mat.trunk);
    bake(new T.ConeGeometry(1.6, 4, 8), mat.leaf, tx, 5.0, zz);
    solid(tx, zz, 0.8, 0.8, 4.5);
  }
  // Street lamps along exit road (east sidewalk)
  for (let zz = roadEndZ + 8; zz < roadStartZ - 8; zz += 16) {
    const lx = housingCenterX + roadW/2 + 3;
    cylinder(lx, 3.7, zz, 0.07, 0.13, 7.4, mat.steel);
    box(lx + 1.05, 7.4, zz, 2.2, 0.12, 0.15, mat.steel);
    box(lx + 1.9, 7.3, zz, 0.7, 0.12, 0.5, mat.lamp);
    lampPositions.push(new T.Vector3(lx + 1.9, 7, zz));
    solid(lx, zz, 0.25, 0.25, 7.4);
  }
  // ── MILESTONE 3e — BEACHFRONT LANDMARKS (Pearlwake sand, z 255..300) ──
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
  // Real bench geometry (user 2026-11-22 ~21:14 WITA: "bangku"): seat, backrest and
  // two steel legs with a proper collider. Sitting behaviour is milestone 4 — here it
  // is placement only, along Pearlwake Boulevard and on both plaza parks.
  function bench(x,z,ry=0) {
    const s=Math.sin(ry),c=Math.cos(ry);
    box(x,.52,z,2.1,.1,.55,mat.trim,ry);
    box(x-s*.24,.88,z-c*.24,2.1,.55,.1,mat.trim,ry);
    box(x+c*.8,.25,z-s*.8,.12,.5,.55,mat.steel,ry);box(x-c*.8,.25,z+s*.8,.12,.5,.55,mat.steel,ry);
    const along=Math.abs(Math.sin(ry))>.5;
    solid(x,z,along?.6:2.1,along?2.1:.6,.62);
  }
  for(let z=-244;z<=244;z+=48) if(avenues.every(a=>Math.abs(z-a)>16)) {
    bench(12.6,z,Math.PI/2);bench(-12.6,z,-Math.PI/2);
  }
  for(const [px,pz] of [[40,200],[-200,-40]]) {
    bench(px+9,pz,-Math.PI/2);bench(px-9,pz,Math.PI/2);bench(px,pz+9,Math.PI);bench(px,pz-9,0);
  }
  // Full corner audit dressing (user 2026-11-22 ~21:47-21:52 WITA): every intersection
  // corner gets a planter with flowers, a corner lamp or a bush cluster, so no corner
  // reads bare. Off the 4-wide walk strips (at axis±12) and inside the block edge.
  let cornerIndex=0;
  for(const ax of avenues)for(const az of avenues)for(const sx of [-1,1])for(const sz of [-1,1]) {
    const x=ax+sx*15.3,z=az+sz*15.3,kind=cornerIndex++%3;
    if(kind===0) {
      box(x,.32,z,1.5,.55,1.5,mat.trim);solid(x,z,1.5,1.5,.6);
      for(let f=-.45;f<=.45;f+=.3)for(let g=-.45;g<=.45;g+=.3)
        bake(new T.SphereGeometry(.22,7,5),(f===0&&g===0)?mat.pink:mat.yellow,x+f,.67,z+g);
    } else if(kind===1) {
      cylinder(x,.45,z,.09,.14,1.7,mat.steel);solid(x,z,.5,.5,1.7);
      box(x+sx*1.15,1.5,z,1.6,.12,.16,mat.steel);box(x+sx*1.95,1.44,z,.5,.12,.42,mat.lamp);
      lampPositions.push(new T.Vector3(x+sx*1.95,1.2,z));
    } else {
      cylinder(x,.32,z,.5,.7,.6,mat.trim);solid(x,z,1.1,1.1,.62);
      bake(new T.SphereGeometry(.65,9,7),mat.leaf,x,.95,z);
      bake(new T.SphereGeometry(.4,8,6),mat.leaf,x+.55,.75,z+.2);
    }
  }
  for(let z=98;z<225;z+=24) {
    for(const x of [-14,14]){
      cylinder(x,.5,z,.65,.5,.9,mat.trim);
      bake(new T.SphereGeometry(.9,10,7),mat.leaf,x,1.25,z);
    }
  }
  sign('SALTGILT',-17,10,132,20,'#f3bc98',Math.PI/2);
  sign('PEARLWAKE BOULEVARD',15,6.5,180,13,'#f9d69e',-Math.PI/2);
  // ── MILESTONE 3e — BEACHFRONT LANDMARKS (Pearlwake sand, z 255..300) ──
  // Giltwheel Fair (west sand): slow-turning Ferris wheel with neon gondolas,
  // fair stalls and colored fairground lights. Wheel is a live Group so its
  // rotation can be driven from update(); supports/stalls are baked + solid.
  const fair={x:-196,z:278};
  ground(fair.x,fair.z,76,48,mat.sidewalk,.02);
  sign('GILTWHEEL FAIR',fair.x,23.5,fair.z-15.5,17,'#ffd97a',0);
  for(const s of [-1,1]) {
    cylinder(fair.x+s*2.4,8.8,fair.z-2.4,.5,.72,17.6,mat.steel);
    cylinder(fair.x+s*2.4,8.8,fair.z+2.4,.5,.72,17.6,mat.steel);
    solid(fair.x+s*2.4,fair.z-2.4,1.4,1.4,17.6);solid(fair.x+s*2.4,fair.z+2.4,1.4,1.4,17.6);
  }
  cylinder(fair.x,17.6,fair.z,1.15,.95,2.6,mat.steel);
  solid(fair.x,fair.z,3,3,17.6);
  const wheel=new T.Group();wheel.position.set(fair.x,17.6,fair.z);
  const wheelRim=new T.Mesh(new T.TorusGeometry(14,.34,8,44),standard('#d8b34a'));
  wheelRim.castShadow=true;wheel.add(wheelRim);
  const wheelRimInner=new T.Mesh(new T.TorusGeometry(11.6,.2,8,44),standard('#b8923a'));
  wheel.add(wheelRimInner);
  for(let s=0;s<8;s++) {
    const a=s/8*Math.PI*2;
    const spoke=new T.Mesh(new T.CylinderGeometry(.13,.13,14,6),mat.steel);
    spoke.position.set(Math.sin(a)*7,Math.cos(a)*7,0);spoke.rotation.z=-a;
    spoke.castShadow=true;wheel.add(spoke);
  }
  const gondolas=[];
  for(let g=0;g<8;g++) {
    const a=g/8*Math.PI*2,arm=new T.Group();
    arm.position.set(Math.sin(a)*14,Math.cos(a)*14,0);
    const bar=new T.Mesh(new T.CylinderGeometry(.07,.07,1.5,6),mat.steel);bar.position.y=-.75;arm.add(bar);
    const cabin=new T.Mesh(new T.BoxGeometry(2,2.4,1.5),standard(g%2?'#37e6ff':'#ff4fd8'));
    cabin.position.y=-2.1;cabin.castShadow=true;arm.add(cabin);
    const trim=new T.Mesh(new T.BoxGeometry(2.2,.24,1.7),mat.lamp);trim.position.y=-1.1;arm.add(trim);
    wheel.add(arm);gondolas.push(arm);
  }
  scene.add(wheel);
  const stalls=[[-228,262],[-166,264],[-226,292]];
  for(const [sx,sz] of stalls) {
    box(sx,1.1,sz,4.6,2.2,2.6,mat.trim);
    box(sx,2.32,sz,5.3,.2,3.2,mat.pink);
    box(sx,2.44,sz,5.3,.1,3.2,mat.yellow);
    box(sx+1.4,2.05,sz,1.4,.7,2,mat.lamp);
    solid(sx,sz,4.6,2.6,2.4);
  }
  const fairLightColors=[mat.pink,mat.yellow,standard('#5fd6ff')];
  for(let i=0;i<10;i++) {
    const a=i/10*Math.PI*2,lx=fair.x+Math.cos(a)*22,lz=fair.z+Math.sin(a)*14;
    if(stalls.some(([sx,sz])=>Math.abs(sx-lx)<3.4&&Math.abs(sz-lz)<3.4))continue;
    cylinder(lx,1.7,lz,.06,.1,3.4,mat.steel);
    bake(new T.SphereGeometry(.18,7,5),fairLightColors[i%3],lx,3.5,lz);
    solid(lx,lz,.3,.3,3.4);
  }
  lampPositions.push(new T.Vector3(fair.x,5,fair.z-6));
  // Ironshore Fitness (center sand): small static open-air gym, blue-hour lamps.
  ground(20,274,32,24,mat.sidewalk,.02);
  sign('IRONSHORE FITNESS',20,4.4,285.4,15,'#8fd8ff',0);
  cylinder(12,1.55,268,.07,.1,3.1,mat.steel);cylinder(16,1.55,268,.07,.1,3.1,mat.steel);
  box(14,3.06,268,4.5,.12,.12,mat.steel);
  solid(12,268,.4,.4,3.1);solid(16,268,.4,.4,3.1);
  for(const dz of [-.9,.9]) {
    cylinder(20,1.05,270+dz,.07,.1,2.1,mat.steel);cylinder(24,1.05,270+dz,.07,.1,2.1,mat.steel);
    box(22,2.05,270+dz,4.5,.1,.1,mat.steel);
    solid(20,270+dz,.4,.4,2.1);solid(24,270+dz,.4,.4,2.1);
  }
  box(26.5,.72,278,2.5,.5,1.1,mat.trim);box(26.5,1.85,278,2.5,.18,.6,mat.trim);solid(26.5,278,2.5,1.1,2);
  cylinder(13,1.15,282,.08,.12,2.3,mat.steel);cylinder(15.5,1.15,282,.08,.12,2.3,mat.steel);
  box(14.25,2.24,282,3,.14,.14,mat.steel);solid(13,282,.5,.5,2.3);solid(15.5,282,.5,.5,2.3);
  bench(21,280,0);bench(11,277,Math.PI/2);
  for(const [lx,lz] of [[7,263],[33,263],[7,285],[33,285]]) {
    cylinder(lx,1.9,lz,.07,.12,3.8,mat.steel);
    box(lx+.75,3.8,lz,.7,.12,.5,mat.lamp);
    lampPositions.push(new T.Vector3(lx+.75,3.6,lz));
    solid(lx,lz,.35,.35,3.8);
  }
  // Beach umbrellas + loungers (east sand) with sunbathing citizens.
  const umbrellaColors=[standard('#ff5f6d'),standard('#ffd166'),standard('#4fc3f7'),standard('#9575cd')];
  const parasols=[[136,268,0],[148,282,.5],[166,270,.9],[184,286,.2],[204,272,.7],[224,284,.4],[241,268,1.1]];
  for(let i=0;i<parasols.length;i++) {
    const [px,pz,tilt]=parasols[i];
    cylinder(px,1.35,pz,.05,.08,2.7,mat.steel);
    const canopy=new T.Mesh(new T.ConeGeometry(2.7,1.1,10),umbrellaColors[i%4]);
    canopy.position.set(px,3.1,pz);canopy.rotation.z=tilt*.22;canopy.castShadow=true;scene.add(canopy);
    solid(px,pz,.35,.35,2.7);
    const lx=px+2.9,lz=pz+(i%2?1.3:-1.3);
    box(lx,.42,lz,2.2,.14,.78,mat.trim);
    bake(new T.BoxGeometry(1,.12,.76),mat.trim,lx-.9,.86,lz,0,0,-.62);
    box(lx-.85,.2,lz,.1,.42,.7,mat.steel);box(lx+.85,.2,lz,.1,.42,.7,mat.steel);
    solid(lx,lz,2.3,1.1,.8);
  }
  const sunbathers=[[148,282,.6,-.4],[184,286,.6,.9],[166,272.8,.18,2.2]];
  for(let i=0;i<sunbathers.length;i++) {
    const [px,py,pz,ry]=sunbathers[i];
    const person=buildCitizen(scene,i+3);
    person.root.position.set(px,py,pz);person.root.rotation.set(-Math.PI/2,0,ry);
  }
  // Distant headlands make the sea read as a bay.
  for(let i=0;i<16;i++)bake(new T.ConeGeometry(70+random()*65,50+random()*95,9),standard('#73968b'),-650+i*110,8,-620-random()*100);

  // ── MILESTONE 7 — EXTRAS ──
  // 1. MONORAIL (Prism Heights): elevated loop on slim pylons, 1 car with lit windows
  const monorail = { pylons: [], track: null, car: null, carGroup: new T.Group(), progress: 0, loopLength: 0 };
  const monoPath = [
    {x: -80, z: -80}, {x: 80, z: -80}, {x: 80, z: 80}, {x: -80, z: 80}, {x: -80, z: -80}
  ];
  // Build pylons every 16 units along the rectangular loop
  for (let i = 0; i < monoPath.length - 1; i++) {
    const p0 = monoPath[i], p1 = monoPath[i + 1];
    const dx = p1.x - p0.x, dz = p1.z - p0.z;
    const segLen = Math.hypot(dx, dz);
    const steps = Math.ceil(segLen / 16);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = p0.x + dx * t;
      const pz = p0.z + dz * t;
      // Slim pylon: tapered cylinder
      cylinder(px, 6, pz, 0.35, 0.55, 12, mat.steel, 8);
      solid(px, pz, 0.7, 0.7, 12);
      monorail.pylons.push({ x: px, z: pz });
    }
  }
  // Track beams (two parallel box beams)
  for (let i = 0; i < monoPath.length - 1; i++) {
    const p0 = monoPath[i], p1 = monoPath[i + 1];
    const dx = p1.x - p0.x, dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    monorail.loopLength += len;
    for (const side of [-1, 1]) {
      const bx = (p0.x + p1.x) / 2 + Math.sin(angle) * side * 1.8;
      const bz = (p0.z + p1.z) / 2 + Math.cos(angle) * side * 1.8;
      const beam = new T.Mesh(new T.BoxGeometry(0.6, 0.4, len), mat.steel);
      beam.position.set(bx, 12.2, bz);
      beam.rotation.y = angle;
      beam.castShadow = true;
      scene.add(beam);
    }
  }
  // Monorail car (Art Deco, lit windows)
  monorail.carGroup.position.set(monoPath[0].x, 12.8, monoPath[0].z);
  const carBody = new T.Mesh(new T.BoxGeometry(3.2, 2.6, 10), mat.steel);
  carBody.position.y = 0; carBody.castShadow = true; monorail.carGroup.add(carBody);
  // Nose cone
  const nose = new T.Mesh(new T.ConeGeometry(1.6, 2.6, 4), mat.steel);
  nose.position.set(0, 0, -6.3); nose.rotation.x = Math.PI / 2; nose.castShadow = true; monorail.carGroup.add(nose);
  const nose2 = new T.Mesh(new T.ConeGeometry(1.6, 2.6, 4), mat.steel);
  nose2.position.set(0, 0, 6.3); nose2.rotation.x = -Math.PI / 2; nose2.castShadow = true; monorail.carGroup.add(nose2);
  // Window strip (emissive)
  const windowGeo = new T.BoxGeometry(2.8, 1.4, 9.2);
  const windowMatMono = standard('#fff8e7', 0.1, 1.0); windowMatMono.emissive = new T.Color('#fff8e7'); windowMatMono.emissiveIntensity = 1.2;
  const windows = new T.Mesh(windowGeo, windowMatMono);
  windows.position.y = 0.2; windows.castShadow = true; monorail.carGroup.add(windows);
  // Roof trim
  const roofTrim = new T.Mesh(new T.BoxGeometry(3.4, 0.2, 10.4), mat.trim);
  roofTrim.position.set(0, 1.5, 0); monorail.carGroup.add(roofTrim);
  // Running lights
  for (const sz of [-5, 5]) {
    const light = new T.Mesh(new T.SphereGeometry(0.15, 8, 6), mat.lamp);
    light.position.set(1.7, 0.5, sz); monorail.carGroup.add(light);
    const light2 = light.clone(); light2.position.set(-1.7, 0.5, sz); monorail.carGroup.add(light2);
  }
  scene.add(monorail.carGroup);
  monorail.car = monorail.carGroup;

  // 2. LIGHTHOUSE (Halberd Point / Pearlwake Boulevard): stone tower + rotating beam
  const lighthouse = { tower: new T.Group(), beam: null, beamCone: null, angle: 0, light: null };
  const lhX = 180, lhZ = 180; // Pearlwake area (z > 110)
  lighthouse.tower.position.set(lhX, 0, lhZ);
  // Stone base
  cylinder(lhX, 3.5, lhZ, 5.5, 5.5, 7, mat.trim, 16); solid(lhX, lhZ, 11, 11, 7);
  // Tower shaft (tapered)
  cylinder(lhX, 18, lhZ, 3.2, 4.8, 22, mat.stone || mat.trim, 16); solid(lhX, lhZ, 6.4, 6.4, 22);
  // Gallery level
  cylinder(lhX, 29.5, lhZ, 3.8, 3.8, 1.2, mat.steel, 16);
  box(lhX, 30.1, lhZ, 8.5, 0.2, 8.5, mat.trim);
  // Lamp room (glass cylinder)
  const lampRoom = new T.Mesh(new T.CylinderGeometry(2.8, 2.8, 4.5, 16), standard('#1a3a4a', 0.2, 0.8));
  lampRoom.position.set(lhX, 33.5, lhZ); lampRoom.castShadow = true; scene.add(lampRoom);
  // Lantern roof (cone)
  const lanternRoof = new T.Mesh(new T.ConeGeometry(3.2, 2, 16), mat.steel);
  lanternRoof.position.set(lhX, 36.5, lhZ); lanternRoof.castShadow = true; scene.add(lanternRoof);
  // Rotating beam (visible cone + glow)
  const beamGeometry = new T.ConeGeometry(0.01, 120, 16, 1);
  beamGeometry.translate(0, 60, 0); // pivot at base
  beamGeometry.rotateX(-Math.PI / 2); // point along -Z initially
  const beamMaterial = new T.MeshBasicMaterial({
    color: 0xffffee, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false
  });
  lighthouse.beam = new T.Mesh(beamGeometry, beamMaterial);
  lighthouse.beam.position.set(lhX, 32, lhZ);
  lighthouse.beam.visible = false; scene.add(lighthouse.beam);
  // Glow sprite at lamp room
  const glowGeo = new T.SphereGeometry(1.2, 16, 12);
  const glowMat = new T.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: 0.6, depthWrite: false });
  lighthouse.glow = new T.Mesh(glowGeo, glowMat);
  lighthouse.glow.position.set(lhX, 32, lhZ); lighthouse.glow.visible = false; scene.add(lighthouse.glow);
  // Point light for the beam
  lighthouse.light = new T.SpotLight(0xffffee, 0, 140, Math.PI / 6, 0.5, 1);
  lighthouse.light.position.set(lhX, 32, lhZ);
  lighthouse.light.target.position.set(lhX, 0, lhZ - 100);
  scene.add(lighthouse.light); scene.add(lighthouse.light.target);
  // Window lights on tower
  for (let floor = 8; floor < 28; floor += 4) {
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 2;
      const wx = lhX + Math.sin(a) * 3.5;
      const wz = lhZ + Math.cos(a) * 3.5;
      const win = new T.Mesh(new T.BoxGeometry(1.2, 1.2, 0.1), mat.windowLight);
      win.position.set(wx, floor, wz); win.rotation.y = a; scene.add(win);
    }
  }
  scene.add(lighthouse.tower);

  // 3. TIDE SYSTEM (Rustcrane Docks): water plane in docks with rising/falling level
  const tide = { water: null, level: 0, phase: 0, baseY: -0.35 };
  const tideGeometry = new T.PlaneGeometry(180, 220);
  const tideMaterial = new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, night: { value: 0 }, tideLevel: { value: 0 } },
    vertexShader: 'varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: 'uniform float time;uniform float night;uniform float tideLevel;varying vec3 vWorld;void main(){float a=sin(vWorld.x*.6+time*.5+sin(vWorld.z*.15))*sin(vWorld.z*1.1+time);float b=pow(max(0.0,sin(vWorld.z*1.8+vWorld.x*.08+time)),20.0);vec3 c=mix(vec3(.04,.32,.38),vec3(.15,.55,.58),a*.3+.4);c+=b*.1;c=mix(c,vec3(.02,.08,.12),night*.85);float shore=smoothstep(-2.0,2.0,vWorld.y-tideLevel);c=mix(c,vec3(.06,.25,.35),shore);gl_FragColor=vec4(c,1.0);}'
  });
  tide.water = new T.Mesh(tideGeometry, tideMaterial);
  tide.water.rotation.x = -Math.PI / 2;
  tide.water.position.set(280, tide.baseY, -80); // Rustcrane Docks area (x~280, z~-80)
  tide.water.receiveShadow = true;
  scene.add(tide.water);
  // Low dock aprons that flood at high tide (visual markers)
  for (let x = 200; x <= 360; x += 20) {
    for (let z = -180; z <= 20; z += 20) {
      if (Math.random() < 0.3) {
        box(x, 0.1, z, 18, 0.3, 18, mat.wood);
        solid(x, z, 18, 18, 0.5);
      }
    }
  }

  // 4. FOOD CARTS (Saffron Pier Market / Lanternfish Marina): 3-4 carts with awnings, lamps, steam
  const foodCarts = [];
  const cartPositions = [
    { x: 140, z: 40 }, { x: 165, z: 40 }, { x: 190, z: 40 }, { x: 215, z: 40 }
  ];
  for (const pos of cartPositions) {
    const cart = new T.Group();
    cart.position.set(pos.x, 0, pos.z);
    // Cart base
    const cartBase = new T.Mesh(new T.BoxGeometry(3, 1.2, 2), mat.wood);
    cartBase.position.set(0, 0.6, 0); cart.add(cartBase);
    const cartTop = new T.Mesh(new T.BoxGeometry(2.8, 0.1, 1.8), mat.trim);
    cartTop.position.set(0, 1.3, 0); cart.add(cartTop);
    // Awning
    const awning1 = new T.Mesh(new T.BoxGeometry(3.4, 0.15, 2.6), standard('#8b2e2e'));
    awning1.position.set(0, 2.2, 0); cart.add(awning1);
    const awning2 = new T.Mesh(new T.BoxGeometry(3.4, 0.1, 2.6), standard('#a03a3a'));
    awning2.position.set(0, 2.35, 0); cart.add(awning2);
    // Support poles
    for (const sx of [-1.5, 1.5]) {
      const pole = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 2.2, 6), mat.steel);
      pole.position.set(sx, 1.2, 0); cart.add(pole);
    }
    // Warm lamps under awning
    for (const sz of [-0.7, 0.7]) {
      const lamp = new T.Mesh(new T.SphereGeometry(0.18, 8, 6), mat.lamp);
      lamp.position.set(0, 2.0, sz); cart.add(lamp);
    }
    // Steam puffs (small emissive spheres, animated in update)
    const steam = [];
    for (let i = 0; i < 3; i++) {
      const puff = new T.Mesh(new T.SphereGeometry(0.25, 6, 5), standard('#e8e8e8', 0.5, 0.3));
      puff.material.transparent = true; puff.material.opacity = 0.4;
      puff.position.set((i - 1) * 0.6, 2.5, 0);
      cart.add(puff); steam.push(puff);
    }
    // Sign
    sign('FOOD', pos.x, 2.8, pos.z + 1.5, 2.5, '#ffd44a', 0);
    scene.add(cart);
    solid(pos.x, pos.z, 3, 2, 2.5);
    foodCarts.push({ cart, steam, baseY: 2.5, phase: Math.random() * Math.PI * 2 });
  }

  // 5. TRAIN + RAILS (Rustcrane Docks, along harbor): ground rail line, train (loco + 2 cars), station, crossing
  const train = { loco: null, cars: [], group: new T.Group(), progress: 0, loopLength: 0, crossingFlash: 0 };
  // Rail path: long loop along harbor edge (z from -200 to 200, x ~ 280-320)
  const railPath = [
    { x: 300, z: -200 }, { x: 300, z: 200 }, { x: 260, z: 200 }, { x: 260, z: -200 }, { x: 300, z: -200 }
  ];
  // Build rails (two steel lines) + ties
  for (let i = 0; i < railPath.length - 1; i++) {
    const p0 = railPath[i], p1 = railPath[i + 1];
    const dx = p1.x - p0.x, dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    train.loopLength += len;
    for (const side of [-1, 1]) {
      const rx = (p0.x + p1.x) / 2 + Math.sin(angle) * side * 1.1;
      const rz = (p0.z + p1.z) / 2 + Math.cos(angle) * side * 1.1;
      const rail = new T.Mesh(new T.BoxGeometry(0.25, 0.2, len), mat.steel);
      rail.position.set(rx, 0.15, rz); rail.rotation.y = angle; scene.add(rail);
    }
    // Ties every 2 units
    const ties = Math.ceil(len / 2);
    for (let t = 0; t <= ties; t++) {
      const tt = t / ties;
      const tx = p0.x + dx * tt;
      const tz = p0.z + dz * tt;
      const tie = new T.Mesh(new T.BoxGeometry(2.8, 0.15, 0.3), mat.wood);
      tie.position.set(tx, 0.07, tz); tie.rotation.y = angle; scene.add(tie);
    }
  }
  // Station platform at z ~ 0
  const stationX = 250, stationZ = 0;
  box(stationX, 0.3, stationZ, 8, 0.4, 30, mat.trim); solid(stationX, stationZ, 8, 30, 0.5);
  box(stationX, 1.0, stationZ, 6, 0.2, 28, mat.wood);
  // Station roof
  for (const sx of [-2.5, 2.5]) {
    cylinder(stationX + sx, 2.5, stationZ, 0.15, 0.15, 5, mat.steel, 6);
    solid(stationX + sx, stationZ, 0.3, 0.3, 5);
  }
  box(stationX, 5.3, stationZ, 7, 0.3, 28.5, standard('#8b2e2e'));
  // Station lamps
  for (const sz of [-12, 12]) {
    cylinder(stationX + 3.5, 3.0, stationZ + sz, 0.08, 0.12, 6, mat.steel);
    box(stationX + 4.5, 6.0, stationZ + sz, 1.5, 0.12, 0.5, mat.lamp);
    lampPositions.push(new T.Vector3(stationX + 4.5, 5.8, stationZ + sz));
  }
  sign('RUSTCRANE STATION', stationX, 5.6, stationZ + 15.5, 6, '#ffd44a', 0);
  // Level crossing at z = -80 (crosses the avenue)
  const crossingZ = -80;
  const crossingX = 280;
  // Crossing arms (flashing lights)
  const crossingLights = [];
  for (const side of [-1, 1]) {
    const cx = crossingX + side * 4;
    const arm = new T.Group();
    arm.position.set(cx, 0, crossingZ);
    cylinder(cx, 2.5, crossingZ, 0.12, 0.12, 5, mat.steel); // pole
    solid(cx, crossingZ, 0.25, 0.25, 5);
    const boom = new T.Mesh(new T.BoxGeometry(5, 0.15, 0.3), standard('#e83e3e'));
    boom.position.set(side * 2.5, 4.8, 0); boom.rotation.y = side * Math.PI / 2;
    arm.add(boom);
    // Flashing lights on boom
    for (let li = 0; li < 3; li++) {
      const light = new T.Mesh(new T.SphereGeometry(0.18, 8, 6), mat.lamp);
      light.position.set(side * (1 + li * 1.3), 4.8, 0); arm.add(light);
      crossingLights.push({ light, side, offset: li });
    }
    scene.add(arm);
  }
  train.crossingLights = crossingLights;
  train.crossingZ = crossingZ;

  // Train: locomotive + 2 cars
  train.group.position.set(railPath[0].x, 0.6, railPath[0].z);
  // Locomotive
  const loco = new T.Group();
  const locoBody = new T.Mesh(new T.BoxGeometry(2.8, 3.2, 8), mat.steel);
  locoBody.position.y = 0; locoBody.castShadow = true; loco.add(locoBody);
  // Cab
  const cab = new T.Mesh(new T.BoxGeometry(2.2, 2.4, 3), mat.steel);
  cab.position.set(0, 1.8, -2.5); cab.castShadow = true; loco.add(cab);
  // Cab windows
  const cabWinMat = standard('#fff8e7', 0.1, 1.0); cabWinMat.emissive = new T.Color('#fff8e7'); cabWinMat.emissiveIntensity = 1.0;
  const cabWin1 = new T.Mesh(new T.BoxGeometry(1.8, 1.2, 0.1), cabWinMat);
  cabWin1.position.set(0, 2.2, -1.5); loco.add(cabWin1);
  const cabWin2 = new T.Mesh(new T.BoxGeometry(1.8, 1.2, 0.1), cabWinMat);
  cabWin2.position.set(0, 2.2, -3.5); loco.add(cabWin2);
  // Nose
  const noseLoco = new T.Mesh(new T.ConeGeometry(1.4, 2.8, 4), mat.steel);
  noseLoco.position.set(0, 0.6, 5); noseLoco.rotation.x = -Math.PI / 2; noseLoco.castShadow = true; loco.add(noseLoco);
  // Headlight
  const headlight = new T.Mesh(new T.SphereGeometry(0.25, 8, 6), mat.lamp);
  headlight.position.set(0, 1.2, 4.2); loco.add(headlight);
  // Loco running lights
  for (const sz of [-3.5, 3.5]) {
    const rl = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), mat.lamp);
    rl.position.set(1.5, 0.8, sz); loco.add(rl);
    const rl2 = rl.clone(); rl2.position.set(-1.5, 0.8, sz); loco.add(rl2);
  }
  loco.position.z = 0; train.group.add(loco); train.loco = loco;
  // Car 1
  const car1 = new T.Group();
  const car1Body = new T.Mesh(new T.BoxGeometry(2.6, 2.8, 12), standard('#2d1a1a'));
  car1Body.position.y = 0; car1Body.castShadow = true; car1.add(car1Body);
  // Windows
  const carWinMat = standard('#fff8e7', 0.1, 1.0); carWinMat.emissive = new T.Color('#fff8e7'); carWinMat.emissiveIntensity = 0.8;
  for (let w = -4.5; w <= 4.5; w += 3) {
    box(0, 0.5, w, 2.2, 1.6, 0.08, carWinMat, 0, car1);
  }
  car1.position.z = -14; train.group.add(car1); train.cars.push(car1);
  // Car 2
  const car2 = new T.Group();
  const car2Body = new T.Mesh(new T.BoxGeometry(2.6, 2.8, 12), standard('#1a2d1a'));
  car2Body.position.y = 0; car2Body.castShadow = true; car2.add(car2Body);
  for (let w = -4.5; w <= 4.5; w += 3) {
    box(0, 0.5, w, 2.2, 1.6, 0.08, carWinMat, 0, car2);
  }
  car2.position.z = -28; train.group.add(car2); train.cars.push(car2);
  scene.add(train.group);

  // Collision for train cars (added dynamically in update based on position)
  // Station collision already added via solid()

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
    wheel.rotation.z=time*.12;
    for(let g=0;g<gondolas.length;g++)gondolas[g].rotation.z=-wheel.rotation.z;
    palms.forEach((p,index)=>{for(let l=0;l<9;l++){
      transform.position.set(p.x+.1,p.h,p.z);transform.rotation.set((l%2)*.13+Math.sin(time*1.1+index*.7)*.035,l/9*Math.PI*2+index,-.1+Math.sin(time*.9+index+l*.4)*.045);transform.scale.setScalar(.8+(index%4)*.08);transform.updateMatrix();leaves.setMatrixAt(index*9+l,transform.matrix);
    }});leaves.instanceMatrix.needsUpdate=true;

    // ── MONORAIL: move car along rectangular loop
    const monoSpeed = 4.5; // units per second
    monorail.progress = (monorail.progress + monoSpeed * 0.016) % monorail.loopLength; // assuming ~60fps dt
    let remaining = monorail.progress;
    for (let i = 0; i < monoPath.length - 1; i++) {
      const p0 = monoPath[i], p1 = monoPath[i + 1];
      const dx = p1.x - p0.x, dz = p1.z - p0.z;
      const len = Math.hypot(dx, dz);
      if (remaining <= len) {
        const t = remaining / len;
        const cx = p0.x + dx * t;
        const cz = p0.z + dz * t;
        const angle = Math.atan2(dx, dz);
        monorail.carGroup.position.set(cx, 12.8, cz);
        monorail.carGroup.rotation.y = angle;
        break;
      }
      remaining -= len;
    }

    // ── LIGHTHOUSE: rotating beam at night
    if (night > 0.1) {
      lighthouse.angle += 0.0035; // ~1.5 rpm
      lighthouse.beam.rotation.y = lighthouse.angle;
      lighthouse.beam.visible = true;
      lighthouse.glow.visible = true;
      lighthouse.light.intensity = night * 85000;
      // Update spot light target to follow beam
      const beamDir = new T.Vector3(Math.sin(lighthouse.angle), 0, Math.cos(lighthouse.angle));
      lighthouse.light.target.position.set(lhX + beamDir.x * 100, 0, lhZ + beamDir.z * 100);
    } else {
      lighthouse.beam.visible = false;
      lighthouse.glow.visible = false;
      lighthouse.light.intensity = 0;
    }

    // ── TIDE: slow rise/fall cycle (period ~120 seconds)
    tide.phase += 0.000052; // 2*PI / 120000ms ~ 0.000052 per ms, but update gets time in seconds
    tide.level = Math.sin(time * 0.0052) * 0.85; // 0.85m amplitude, ~12min period
    tide.water.position.y = tide.baseY + tide.level;
    tideMaterial.uniforms.tideLevel.value = tide.level;
    tideMaterial.uniforms.time.value = time;
    tideMaterial.uniforms.night.value = night;

    // ── FOOD CARTS: steam puff animation
    for (const fc of foodCarts) {
      fc.phase += 0.02;
      for (let i = 0; i < fc.steam.length; i++) {
        const puff = fc.steam[i];
        const pPhase = fc.phase + i * 2.1;
        puff.position.y = fc.baseY + Math.sin(pPhase) * 0.8 + 0.5;
        puff.scale.setScalar(0.5 + Math.sin(pPhase * 0.7) * 0.3);
        puff.material.opacity = 0.2 + Math.sin(pPhase) * 0.15;
      }
    }

    // ── TRAIN: move along rail loop + level crossing flash
    const trainSpeed = 6.0; // units per second
    train.progress = (train.progress + trainSpeed * 0.016) % train.loopLength;
    remaining = train.progress;
    let trainAngle = 0;
    for (let i = 0; i < railPath.length - 1; i++) {
      const p0 = railPath[i], p1 = railPath[i + 1];
      const dx = p1.x - p0.x, dz = p1.z - p0.z;
      const len = Math.hypot(dx, dz);
      if (remaining <= len) {
        const t = remaining / len;
        const cx = p0.x + dx * t;
        const cz = p0.z + dz * t;
        trainAngle = Math.atan2(dx, dz);
        train.group.position.set(cx, 0.6, cz);
        train.group.rotation.y = trainAngle;
        break;
      }
      remaining -= len;
    }
    // Level crossing flash when train approaches (within 30 units of crossingZ)
    const trainZ = train.group.position.z;
    const distToCrossing = Math.abs(trainZ - train.crossingZ);
    if (distToCrossing < 30) {
      train.crossingFlash += 0.5;
      const flashOn = Math.sin(train.crossingFlash) > 0;
      for (const cl of train.crossingLights) {
        cl.light.visible = flashOn;
      }
    } else {
      train.crossingFlash = 0;
      for (const cl of train.crossingLights) {
        cl.light.visible = false;
      }
    }

    // Dynamic train car collision (approximate: loco + 2 cars as boxes along train group)
    // Clear previous dynamic train colliders (we'll re-add each frame - simpler: just check in blocked)
    // Note: blocked() uses colliders array, so we'd need to add/remove. For now, skip dynamic collision
    // as it requires main.js changes. Visual only per spec.

    const nearby=lampPositions.filter(p=>p.distanceToSquared(focus)<4200).sort((a,b)=>a.distanceToSquared(focus)-b.distanceToSquared(focus));
    nightLights.forEach((light,i)=>{light.visible=night>.1;light.intensity=nearby[i]?night*21:0;if(nearby[i])light.position.copy(nearby[i]);});
  }
  function blocked(x,z,radius= .4,y=0) {
    if(x < -278 || z < -278 || z > 300 || (x>253&&Math.abs(z+80)>9) || x>378)return true;
    return colliders.some(c=>y<c.y+c.h&&Math.abs(x-c.x)<c.w/2+radius&&Math.abs(z-c.z)<c.d/2+radius);
  }
  // Test hook for verification
  if (typeof window !== 'undefined') window.__vhWorld = { blocked, update, monorail, lighthouse, tide, train, foodCarts };
  return {blocked,update,mapBuildings,colliders,seed:73129,palms:palms.length,monorail,lighthouse,tide,train,foodCarts};
}

export function bridgeHeight(x,z) {
  if(Math.abs(z+80)>10||x<240||x>380)return 0;
  return Math.max(0,Math.min(5,(x-240)/9,(380-x)/9));
}
