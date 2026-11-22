import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Blue-hour grade: gentle contrast around the linear mid pivot, cool navy
// shadows, warm highlights, and a soft vignette. Runs before OutputPass, so
// all math happens in linear HDR; tone mapping stays with the renderer's
// ACESFilmic curve inside OutputPass.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: 1.09 },
    shadowTint: { value: new T.Vector3(-0.014, -0.004, 0.034) },
    highlightTint: { value: new T.Vector3(0.022, 0.011, -0.007) },
    vignette: { value: 0.55 },
  },
  vertexShader: `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse;
uniform float contrast;
uniform vec3 shadowTint;
uniform vec3 highlightTint;
uniform float vignette;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  c = clamp((c - 0.18) * contrast + 0.18, 0.0, 64.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += (1.0 - smoothstep(0.0, 0.22, l)) * shadowTint;
  c += smoothstep(0.30, 1.15, l) * highlightTint;
  vec2 d = vUv - 0.5;
  float v = clamp(1.0 - dot(d, d) * vignette * 2.2, 0.0, 1.0);
  c *= mix(0.72, 1.0, v);
  gl_FragColor = vec4(c, 1.0);
}`,
};

// A shared static environment built with PMREMGenerator from a coded
// gradient scene (no external HDR file): sky gradient above, dark water
// below, plus faint emissive city-glow blocks on the night variant so wet
// asphalt, car paint and glass pick up living colored reflections.
export function buildEnvironment(renderer) {
  const pmrem = new T.PMREMGenerator(renderer);
  const envScene = new T.Scene();
  const skyGeometry = new T.SphereGeometry(60, 32, 16);
  function gradientSky(zenith, horizon, ember, water, emberStrength) {
    return new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        zenith: { value: new T.Color(zenith) },
        horizon: { value: new T.Color(horizon) },
        ember: { value: new T.Color(ember) },
        water: { value: new T.Color(water) },
        emberStrength: { value: emberStrength },
      },
      vertexShader: `varying vec3 vPosition;
void main(){ vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 ember;
uniform vec3 water;
uniform float emberStrength;
varying vec3 vPosition;
void main(){
  vec3 dir = normalize(vPosition);
  float h = clamp(dir.y, -1.0, 1.0);
  vec3 c = h >= 0.0
    ? mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.55))
    : mix(horizon, water, pow(clamp(-h, 0.0, 1.0), 0.7));
  float band = exp(-abs(h - 0.015) * 9.0) * emberStrength;
  c = mix(c, ember, band);
  gl_FragColor = vec4(c, 1.0);
}`,
    });
  }
  const nightSky = new T.Mesh(skyGeometry, gradientSky('#0e1738', '#232a52', '#c76a4e', '#0a1424', 0.5));
  const daySky = new T.Mesh(skyGeometry, gradientSky('#599eb9', '#e7dec2', '#f4d5ad', '#465b60', 0.25));
  const glowMaterial = color => new T.MeshBasicMaterial({ color, fog: false });
  const glowStrip = (scene, y, spread, dim) => {
    const palette = ['#37e6ff', '#ff4fd8', '#ffab5e', '#5ad2e6', '#e05fd0'];
    for (let i = 0; i < 26; i++) {
      const angle = i / 26 * Math.PI * 2;
      const block = new T.Mesh(new T.BoxGeometry(4 + (i % 3), 2.5 + (i % 4) * 1.4, 1.5), glowMaterial(palette[i % palette.length]));
      block.position.set(Math.cos(angle) * 52, y + (i % 5) * 1.1, Math.sin(angle) * 52);
      block.scale.setScalar(spread);
      block.material.color.multiplyScalar(dim);
      scene.add(block);
    }
  };
  envScene.add(nightSky); glowStrip(envScene, 1.2, 1, 0.9);
  const nightTarget = pmrem.fromScene(envScene, 0.06);
  envScene.clear(); envScene.add(daySky);
  const dayTarget = pmrem.fromScene(envScene, 0.06);
  envScene.clear();
  pmrem.dispose();
  return { night: nightTarget.texture, day: dayTarget.texture };
}

export function createPostFX(renderer, scene, camera) {
  const context = renderer.getContext();
  const gl2 = typeof WebGL2RenderingContext !== 'undefined' && context instanceof WebGL2RenderingContext;
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  const software = debug && /swiftshader|llvmpipe/i.test(context.getParameter(debug.UNMASKED_RENDERER_WEBGL));
  const msaaSamples = gl2 ? 4 : 0;
  const size = renderer.getSize(new T.Vector2());
  const ratio = renderer.getPixelRatio();
  const target = new T.WebGLRenderTarget(Math.max(1, size.width * ratio), Math.max(1, size.height * ratio), { type: T.HalfFloatType, samples: msaaSamples });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  // Bloom only lifts real light sources: neon trim, amber lamps, lit windows,
  // sky lanterns, police light bars, headlights. Threshold sits just under the
  // emissive HDR range so the night sky and pale facades stay clean.
  const bloom = new UnrealBloomPass(new T.Vector2(size.width * ratio * (software ? 0.5 : 1), size.height * ratio * (software ? 0.5 : 1)), 0.65, 0.45, 0.85);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  function setSize(width, height) {
    composer.setSize(width, height);
  }
  // The composer's many render calls would reset renderer.info after the scene
  // is drawn, so stats are reset once per frame and accumulate across passes
  // (scene + ~10 post-processing quads).
  renderer.info.autoReset = false;
  function render(deltaTime) {
    renderer.info.reset();
    composer.render(deltaTime);
  }
  return {
    render, setSize,
    info: () => ({ msaaSamples, passes: composer.passes.length, bloomThreshold: bloom.threshold, bloomStrength: bloom.strength, software }),
  };
}
