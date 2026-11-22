import * as T from 'three';

export function surfaceMaterial(options){
  return new T.MeshStandardMaterial(options);
}

export function seededRandom(seed = 73129) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

export function canvasTexture(kind, tint = '#dfcbb0') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(9871);
  ctx.fillStyle = tint; ctx.fillRect(0, 0, 256, 256);
  for (let n = 0; n < 10000; n++) {
    ctx.fillStyle = random() > .5 ? '#ffffff0c' : '#0718260c';
    ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
  }
  if (kind === 'facade' || kind === 'glass') {
    for (let y = 8; y < 256; y += 32) for (let x = 8; x < 256; x += 32) {
      ctx.fillStyle = kind === 'glass' ? '#7ab6c2' : '#213e4d';
      ctx.fillRect(x, y, 19, 23);
      const gradient = ctx.createLinearGradient(x, y, x + 19, y + 23);
      gradient.addColorStop(0, '#c9f5ef99'); gradient.addColorStop(.5, '#183d5544'); gradient.addColorStop(1, '#307d9211');
      ctx.fillStyle = gradient; ctx.fillRect(x + 1, y + 1, 17, 21);
      ctx.fillStyle = '#e3e4cd80'; ctx.fillRect(x, y + 23, 22, 2);
      if (random() > .7) {ctx.fillStyle = '#081c2566'; ctx.fillRect(x, y + 3, 19, 6);}
    }
  }
  if (kind === 'sidewalk') {
    ctx.strokeStyle = '#8c988b55';ctx.lineWidth = 2;
    for (let p = 0; p < 256; p += 64) {ctx.moveTo(p, 0);ctx.lineTo(p, 256);ctx.moveTo(0, p);ctx.lineTo(256, p);}ctx.stroke();
  }
  if (kind === 'asphalt') {
    for (let i = 0; i < 42; i++) {
      ctx.fillStyle = i % 3 ? '#101b3038' : '#59648824';
      ctx.beginPath();ctx.ellipse(random()*256,random()*256,5+random()*20,2+random()*8,random()*Math.PI,0,Math.PI*2);ctx.fill();
    }
  }
  if (kind === 'grass') for (let i = 0; i < 2500; i++) {ctx.fillStyle = '#a5b76e30';ctx.fillRect(random()*256,random()*256,1,5);}
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function standard(color, roughness = .7, metalness = 0) {
  return surfaceMaterial({ color, roughness, metalness });
}

export function makeMaterials() {
  const textured = (kind, color, roughness, repeat = 1) => {
    const map = canvasTexture(kind, color);map.repeat.set(repeat, repeat);
    return surfaceMaterial({ map, roughness });
  };
  return {
    // Wet asphalt: the puddle-mask canvas drives both albedo and roughness, so the low spots
    // stay smooth and mirror-ish while the rest of the tarmac stays matte.
    asphalt:(()=>{const map=canvasTexture('asphalt','#31414a');map.repeat.set(35,35);
      const roughnessMap=map.clone();
      return surfaceMaterial({map,roughnessMap,roughness:1.0,metalness:.05,envMapIntensity:.35});})(),
    sidewalk:textured('sidewalk','#c6c4b0',.85,20),
    grass:textured('grass','#637a4a',1,16), sand:textured('noise','#e2c99d',1,12),
    cream:textured('facade','#e6d9b8',.82),coral:textured('facade','#d58c79',.8),teal:textured('facade','#86b3aa',.7),
    glass:surfaceMaterial({map:canvasTexture('glass','#356c7c'),color:'#b2d1cb',roughness:.24,metalness:.42}),
    white:standard('#eee7cf'),trim:standard('#f6e2bc',.65),dark:standard('#163844',.45,.25),
    pink:standard('#d87d6d'),wood:standard('#8e664d'),roof:standard('#b96f55'),steel:standard('#56777b',.4,.6),
    leaf:standard('#397e55',.9),trunk:standard('#927257',.95),paint:standard('#ebe2bf'),yellow:standard('#e1bf6b'),
    windowLight:surfaceMaterial({color:'#426673',emissive:'#ffbd69',emissiveIntensity:0,roughness:.4}),
    lamp:surfaceMaterial({color:'#fff1ce',emissive:'#ffdb9b',emissiveIntensity:0}),
    neon:surfaceMaterial({color:'#faac9e',emissive:'#ff755f',emissiveIntensity:.5}),
    neonCyan:surfaceMaterial({color:'#9adfe8',emissive:'#37e6ff',emissiveIntensity:.6}),
    neonMagenta:surfaceMaterial({color:'#e79ad8',emissive:'#ff4fd8',emissiveIntensity:.6}),
  };
}

export function createRenderer() {
  const canvas=document.querySelector('#view');
  const renderContext=canvas.getContext('webgl2',{antialias:true,powerPreference:'high-performance'})||canvas.getContext('webgl',{antialias:true});
  const renderer = new T.WebGLRenderer({canvas,context:renderContext,antialias:true,powerPreference:'high-performance'});
  const context=renderer.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info');
  const software=debug&&/swiftshader|llvmpipe/i.test(context.getParameter(debug.UNMASKED_RENDERER_WEBGL));
  renderer.setPixelRatio(software?.65:Math.min(devicePixelRatio, 1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;renderer.toneMapping = T.ACESFilmicToneMapping;renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;renderer.shadowMap.type = T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const scene = new T.Scene();scene.fog = new T.FogExp2('#add3cc',.0028);
  const reflectionFaces=Array.from({length:6},(_,side)=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const c=canvas.getContext('2d'),gradient=c.createLinearGradient(0,0,0,64);
    gradient.addColorStop(0,side===3?'#b49b78':'#8cbdcc');gradient.addColorStop(.53,'#e7dec2');gradient.addColorStop(.57,'#b3b59f');gradient.addColorStop(1,'#465b60');
    c.fillStyle=gradient;c.fillRect(0,0,64,64);
    if(side!==2&&side!==3){for(let i=0;i<10;i++){c.fillStyle=i%2?'#5c7e8399':'#a1aca099';c.fillRect(i*7,28-(i%3)*3,5,9+(i%3)*3);}}
    return canvas;
  });
  const environment=new T.CubeTexture(reflectionFaces);environment.colorSpace=T.SRGBColorSpace;environment.needsUpdate=true;scene.environment=environment;
  const camera = new T.PerspectiveCamera(59,innerWidth/innerHeight,.15,1500);
  const hemisphere = new T.HemisphereLight('#d5f5ff','#b99770',2.1);scene.add(hemisphere);
  const sun = new T.DirectionalLight('#ffe0ac',3.4);sun.castShadow = true;
  sun.shadow.mapSize.set(software?512:2048,software?512:2048);sun.shadow.camera.left = -55;sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 80;sun.shadow.camera.bottom = -80;sun.shadow.camera.near = 1;sun.shadow.camera.far = 350;
  sun.shadow.bias = -.00035;sun.shadow.normalBias = .08;sun.shadow.radius = 3;scene.add(sun,sun.target);
  const sky = new T.Mesh(new T.SphereGeometry(1200,32,16),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color('#5dacc5')},horizon:{value:new T.Color('#f4d5ad')}},
    vertexShader:'varying vec3 vPosition; void main(){vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;varying vec3 vPosition;void main(){float h=pow(clamp(normalize(vPosition).y,0.0,1.0),0.55);gl_FragColor=vec4(mix(horizon,zenith,h),1.0);\n#include <colorspace_fragment>\n}'
  }));scene.add(sky);
  const sunDisk = new T.Mesh(new T.SphereGeometry(13,20,12),new T.MeshBasicMaterial({color:'#ffe3ac'}));scene.add(sunDisk);
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  function updateDay(minutes, focus, materials) {
    const angle = (minutes / 1440 - .25) * Math.PI * 2;
    const altitude = Math.sin(angle);const daylight = T.MathUtils.smoothstep(altitude,-.12,.3);
    const dusk = 1-Math.min(1,Math.abs(altitude)*3);
    // Signature blue hour: navy/violet night, soft bluish ambient, a warm ember near the horizon.
    const horizon = new T.Color('#232a52').lerp(new T.Color('#b9d8ce'),daylight).lerp(new T.Color('#c76a4e'),dusk*.45);
    sky.material.uniforms.horizon.value.copy(horizon);
    sky.material.uniforms.zenith.value.set('#0e1738').lerp(new T.Color('#599eb9'),daylight);
    sky.position.copy(focus);scene.fog.color.copy(horizon);scene.fog.density = .0026 + (1-daylight)*.0007;
    sun.position.set(focus.x+Math.cos(angle)*160,altitude*190+20,focus.z+85);sun.target.position.copy(focus);
    sun.intensity = Math.max(0,altitude+.2)*3.1;sun.color.set('#fff0c6').lerp(new T.Color('#ffab77'),dusk);
    hemisphere.intensity = .95+daylight*1.25;
    hemisphere.color.set('#8fa3e8').lerp(new T.Color('#d5f5ff'),daylight);
    hemisphere.groundColor.set('#3b3f66').lerp(new T.Color('#b99770'),daylight);
    sunDisk.position.set(focus.x+Math.cos(angle)*850,altitude*850,focus.z+350);sunDisk.visible=altitude>-.05;
    materials.windowLight.emissiveIntensity = (1-daylight)*2.2;materials.lamp.emissiveIntensity=(1-daylight)*3;
    materials.neon.emissiveIntensity=.5+(1-daylight)*2;
    materials.neonCyan.emissiveIntensity=.6+(1-daylight)*2.4;materials.neonMagenta.emissiveIntensity=.6+(1-daylight)*2.4;
    return 1-daylight;
  }
  return {renderer,scene,camera,updateDay};
}
