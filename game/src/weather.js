import * as T from 'three';
import { seededRandom } from './render.js';

// Light rain: instanced streaks recycled in a ring around the camera, no per-drop physics.
export function createRain(scene) {
  const COUNT = 640;
  const geometry = new T.BoxGeometry(.02,.9,.02);geometry.translate(0,-.45,0);
  const material = new T.MeshBasicMaterial({color:'#a9c9e6',transparent:true,opacity:.38,depthWrite:false});
  const rain = new T.InstancedMesh(geometry,material,COUNT);rain.frustumCulled = false;rain.renderOrder = 2;
  const random = seededRandom(4711);
  const drops = Array.from({length:COUNT},()=>({x:(random()*2-1)*24,z:(random()*2-1)*24,y:random()*17,speed:15+random()*8}));
  const matrix = new T.Matrix4(),position = new T.Vector3(),scale = new T.Vector3(1,1,1);
  const tilt = new T.Quaternion().setFromEuler(new T.Euler(.1,0,.06));
  function update(dt,camera) {
    const c = camera.position;
    for(let i=0;i<COUNT;i++) {
      const d = drops[i];d.y -= d.speed*dt;
      if(d.y < -2) {d.y = 15+random()*3;d.x = (random()*2-1)*24;d.z = (random()*2-1)*24;}
      position.set(c.x+d.x,d.y,c.z+d.z);matrix.compose(position,tilt,scale);rain.setMatrixAt(i,matrix);
    }
    rain.instanceMatrix.needsUpdate = true;
  }
  scene.add(rain);
  return {update,count:COUNT};
}

// Sky lanterns over the bay: one warm instanced mesh drifting on slow sine paths.
export function createLanterns(scene) {
  const COUNT = 20;
  const geometry = new T.SphereGeometry(1,10,8);geometry.scale(1,1.35,1);
  const material = new T.MeshStandardMaterial({color:'#5a3418',emissive:'#ffb066',emissiveIntensity:3.6,roughness:.6});
  const lanterns = new T.InstancedMesh(geometry,material,COUNT);lanterns.frustumCulled = false;
  const random = seededRandom(991);
  const data = Array.from({length:COUNT},()=>({x:-40+random()*220,z:300+random()*60,y:8+random()*14,phase:random()*Math.PI*2,drift:random()*Math.PI*2}));
  const matrix = new T.Matrix4(),position = new T.Vector3(),scale = new T.Vector3(1,1,1),upright = new T.Quaternion();
  function update(time) {
    for(let i=0;i<COUNT;i++) {
      const l = data[i];
      position.set(l.x+Math.sin(time*.11+l.drift)*3.5,l.y+Math.sin(time*.4+l.phase)*.9+Math.sin(time*.07+l.phase)*1.6,l.z+Math.cos(time*.09+l.drift)*3);
      matrix.compose(position,upright,scale);lanterns.setMatrixAt(i,matrix);
    }
    lanterns.instanceMatrix.needsUpdate = true;
  }
  scene.add(lanterns);
  return {update,count:COUNT};
}
