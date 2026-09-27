/**
 * GameRenderer — WebGL2 renderer, lighting rig, environment presets and the post chain.
 *
 *   Scene (HDR, depth) → [GTAO] → [UnrealBloom] → [camera motion blur] → Grade → Output (ACES, sRGB)
 *   → SMAA (high/ultra) | FXAA (low/medium)
 *
 * Lighting: one shadow-casting directional key (`sun`, cool moon/overcast) whose shadow frustum
 * follows the focus point with texel snapping (no shimmer), a camera-relative rim light for
 * silhouette readability, hemisphere + ambient fill, a PMREM environment captured from the sky
 * for reflections (every preset sets scene.environment + environmentIntensity), exponential
 * height fog matched to the sky, and a pooled budget of point lights (lights.ts).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import type { Settings, Quality } from '../game/settings';
import type { EnvironmentPreset, IRenderer } from './contract';
import { HeightFog } from './fog';
import { Sky } from './Sky';
import { ENVIRONMENTS, cloneEnv, envStateFrom, lerpEnv, type EnvState } from './environments';
import { ScenePass, MotionBlurPass, GradePass } from './post';
import { initLightPool, lightBudgetFor, updateLights } from './lights';
import { setMaterialQuality, setWetness, updateMaterials } from './materials';

type Graphics = Settings['graphics'];

const SHADOW: Record<Quality, { size: number; extent: number; type: THREE.ShadowMapType }> = {
  low: { size: 1024, extent: 22, type: THREE.PCFShadowMap },
  medium: { size: 1024, extent: 26, type: THREE.PCFSoftShadowMap },
  high: { size: 2048, extent: 32, type: THREE.PCFSoftShadowMap },
  ultra: { size: 4096, extent: 40, type: THREE.PCFSoftShadowMap },
};

export class GameRenderer implements IRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  /** Camera-relative rim/back light (no shadows). */
  readonly rim: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly ambient: THREE.AmbientLight;
  readonly sky: Sky;
  readonly fog: HeightFog;
  /** Live environment values (blended). */
  readonly env: EnvState;

  private settings: Graphics;
  private readonly canvas: HTMLCanvasElement;
  private readonly composer: EffectComposer;
  private readonly scenePass: ScenePass;
  private readonly gtao: GTAOPass;
  private readonly bloom: UnrealBloomPass;
  private readonly motion: MotionBlurPass;
  private readonly grade: GradePass;
  private readonly output: OutputPass;
  private readonly smaa: SMAAPass;
  private readonly fxaa: FXAAPass;
  private readonly pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget | null = null;

  private envFrom: EnvState;
  private envTo: EnvState;
  private envT = 1;
  private envDur = 0;
  private envPreset: EnvironmentPreset = 'ashbridgeDusk';
  private envCaptureTimer = 0;
  private envDirty = true;

  private readonly focus = new THREE.Vector3();
  private shadowExtent = 32;
  private time = 0;
  private gradeState = { lowHealth: 0, lowHealthTarget: 0, memory: 0, memoryTarget: 0, flash: 0, flashColor: new THREE.Color(1, 1, 1) };
  private storm = { next: 3, flash: 0 };
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, settings: Graphics) {
    this.canvas = canvas;
    this.settings = { ...settings };
    setMaterialQuality(settings.quality);
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: true });
    this.renderer = r;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.shadowMap.enabled = true;
    r.shadowMap.type = SHADOW[settings.quality].type;
    r.info.autoReset = true;

    this.camera = new THREE.PerspectiveCamera(settings.fov, 16 / 9, 0.1, 1500);
    this.camera.layers.enable(0);

    // --- lights
    this.sun = new THREE.DirectionalLight(0xb7c6de, 1.7);
    this.sun.name = 'sun';
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.00025;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.sun, this.sun.target);
    this.rim = new THREE.DirectionalLight(0xa8bbd4, 0.9);
    this.rim.name = 'rim';
    this.scene.add(this.rim, this.rim.target);
    this.hemi = new THREE.HemisphereLight(0x8898ad, 0x3b3530, 0.85);
    this.ambient = new THREE.AmbientLight(0x3c4452, 0.18);
    this.scene.add(this.hemi, this.ambient);
    initLightPool(this.scene, lightBudgetFor(settings.quality));

    // --- sky, fog, environment
    this.sky = new Sky();
    this.scene.add(this.sky.object);
    this.fog = new HeightFog(0x5b6977);
    this.scene.fog = this.fog;
    this.pmrem = new THREE.PMREMGenerator(r);
    this.env = envStateFrom(ENVIRONMENTS.ashbridgeDusk);
    this.envFrom = cloneEnv(this.env);
    this.envTo = cloneEnv(this.env);

    // --- post chain
    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false }));
    this.scenePass = new ScenePass(this.scene, this.camera);
    this.gtao = new GTAOPass(this.scene, this.camera, 1, 1, { depthTexture: this.scenePass.depthTexture } as never);
    this.gtao.blendIntensity = 0.85;
    this.gtao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12 });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.55, 1.0);
    this.motion = new MotionBlurPass(this.scenePass.depthTexture);
    this.grade = new GradePass();
    this.output = new OutputPass();
    this.smaa = new SMAAPass();
    this.fxaa = new FXAAPass();
    for (const p of [this.scenePass, this.gtao, this.bloom, this.motion, this.grade, this.output, this.smaa, this.fxaa]) this.composer.addPass(p);

    this.applySettings(settings);
    this.setEnvironment('ashbridgeDusk', 0);
    this.resize();
  }

  // ------------------------------------------------------------------------------ settings
  applySettings(s: Graphics): void {
    const prevQ = this.settings.quality;
    this.settings = { ...s };
    const q = s.quality;
    const r = this.renderer;
    const sh = SHADOW[q];
    if (r.shadowMap.type !== sh.type) { r.shadowMap.type = sh.type; this.scene.traverse((o) => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => (mm.needsUpdate = true)); }); }
    if (this.sun.shadow.mapSize.x !== sh.size) {
      this.sun.shadow.mapSize.set(sh.size, sh.size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.shadowExtent = sh.extent;
    const cam = this.sun.shadow.camera;
    cam.left = -sh.extent; cam.right = sh.extent; cam.top = sh.extent; cam.bottom = -sh.extent;
    cam.near = 1; cam.far = 400;
    cam.updateProjectionMatrix();
    if (prevQ !== q) { initLightPool(this.scene, lightBudgetFor(q)); setMaterialQuality(q); }
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    this.gtao.enabled = q === 'high' || q === 'ultra';
    this.gtao.updateGtaoMaterial({ samples: q === 'ultra' ? 16 : 10 });
    this.bloom.enabled = s.bloom;
    this.motion.enabled = s.motionBlur && s.motionBlurStrength > 0.01;
    (this.motion.uniforms as Record<string, THREE.IUniform>).uStrength.value = 0.25 + 0.75 * s.motionBlurStrength;
    this.smaa.enabled = q === 'high' || q === 'ultra';
    this.fxaa.enabled = !this.smaa.enabled;
    this.resize();
  }

  // ------------------------------------------------------------------------------ environment
  setEnvironment(p: EnvironmentPreset, blendSeconds = 2): void {
    this.envPreset = p;
    this.envFrom = cloneEnv(this.env);
    this.envTo = envStateFrom(ENVIRONMENTS[p]);
    this.envDur = Math.max(0, blendSeconds);
    this.envT = this.envDur > 0 ? 0 : 1;
    if (this.envDur === 0) lerpEnv(this.env, this.envFrom, this.envTo, 1);
    this.envDirty = true;
    this.envCaptureTimer = 0;
    this.pushEnv();
  }

  get environment(): EnvironmentPreset { return this.envPreset; }

  private pushEnv(): void {
    const e = this.env, s = this.sky.state;
    s.zenith.copy(e.zenith); s.horizon.copy(e.horizon); s.ground.copy(e.ground); s.glow.copy(e.glow);
    s.glowDir.set(-e.sunDir.x, 0, -e.sunDir.z);
    s.glowStrength = e.glowStrength; s.glowPower = e.glowPower;
    s.cloudColor.copy(e.cloudColor); s.cloudLit.copy(e.cloudLit); s.cloudCover = e.cloudCover; s.cloudOpacity = e.cloudOpacity; s.cloudSpeed = e.cloudSpeed;
    s.skyline = e.skyline; s.skylineColor.copy(e.skylineColor); s.skylineWindows = e.skylineWindows; s.haze.copy(e.fogColor);
    this.fog.color.copy(e.fogColor);
    this.fog.density = e.fogDensity; this.fog.heightFalloff = e.fogFalloff; this.fog.baseHeight = e.fogBase; this.fog.startDistance = e.fogStart;
    this.fog.encode();
    this.renderer.setClearColor(e.fogColor, 1);
    this.sun.color.copy(e.sunColor); this.sun.intensity = e.sunIntensity;
    this.rim.color.copy(e.rimColor); this.rim.intensity = e.rimIntensity;
    this.hemi.color.copy(e.hemiSky); this.hemi.groundColor.copy(e.hemiGround); this.hemi.intensity = e.hemiIntensity;
    this.ambient.color.copy(e.ambient); this.ambient.intensity = e.ambientIntensity;
    this.scene.environmentIntensity = e.envIntensity;
    const gu = this.grade.uniforms as Record<string, THREE.IUniform>;
    gu.uContrast.value = e.contrast; gu.uSaturation.value = e.saturation; gu.uVignette.value = e.vignette;
    (gu.uShadowTint.value as THREE.Color).copy(e.shadowTint);
    (gu.uHighlightTint.value as THREE.Color).copy(e.highlightTint);
    this.bloom.strength = e.bloomStrength * (0.4 + 0.6 * this.settings.effectsIntensity);
    this.bloom.radius = e.bloomRadius; this.bloom.threshold = e.bloomThreshold;
    setWetness(e.wetness);
  }

  /** Re-capture the reflection environment from the sky (PMREM). */
  private captureEnvironment(): void {
    const old = this.envRT;
    // captureScene holds origin-centred twins of the sky meshes (uniforms already current)
    const rt = this.pmrem.fromScene(this.sky.captureScene, 0.02, 0.1, 2000, { size: 128 });
    this.scene.environment = rt.texture;
    this.envRT = rt;
    old?.dispose();
    this.envDirty = false;
  }

  // ------------------------------------------------------------------------------ focus / shadows
  setFocus(pos: THREE.Vector3): void { this.focus.copy(pos); }
  /** Override the shadow frustum half-size (metres) — e.g. larger in open areas. */
  setShadowExtent(halfSize: number): void {
    this.shadowExtent = halfSize;
    const c = this.sun.shadow.camera;
    c.left = -halfSize; c.right = halfSize; c.top = halfSize; c.bottom = -halfSize;
    c.updateProjectionMatrix();
  }

  private readonly _x = new THREE.Vector3();
  private readonly _y = new THREE.Vector3();
  private readonly _z = new THREE.Vector3();
  private readonly _v = new THREE.Vector3();

  private updateShadowFrustum(): void {
    const dir = this.env.sunDir; // light travel direction
    const size = this.sun.shadow.mapSize.x;
    const texel = (2 * this.shadowExtent) / size;
    // camera basis used by three's shadow camera (lookAt with world-up)
    const z = this._z.copy(dir).negate();
    const x = this._x.crossVectors(THREE.Object3D.DEFAULT_UP, z).normalize();
    const y = this._y.crossVectors(z, x);
    const f = this.focus;
    const fx = Math.round(f.dot(x) / texel) * texel;
    const fy = Math.round(f.dot(y) / texel) * texel;
    const fz = f.dot(z);
    const snapped = this._v.copy(x).multiplyScalar(fx).addScaledVector(y, fy).addScaledVector(z, fz);
    this.sun.target.position.copy(snapped);
    this.sun.position.copy(snapped).addScaledVector(dir, -200);
    this.sun.target.updateMatrixWorld();
    this.sun.updateMatrixWorld();
  }

  private updateRim(): void {
    // Light arriving from beyond the focus toward the camera, a little from above: rims silhouettes.
    const fwd = this._v.subVectors(this.focus, this.camera.position);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    this.rim.target.position.copy(this.focus);
    this.rim.position.copy(this.focus).addScaledVector(fwd, 10).add(new THREE.Vector3(0, 5.5, 0));
    this.rim.target.updateMatrixWorld();
  }

  // ------------------------------------------------------------------------------ grade
  setGrade(g: { lowHealth?: number; memory?: number; flash?: number; flashColor?: THREE.ColorRepresentation }): void {
    const s = this.gradeState;
    if (g.lowHealth !== undefined) s.lowHealthTarget = THREE.MathUtils.clamp(g.lowHealth, 0, 1);
    if (g.memory !== undefined) s.memoryTarget = THREE.MathUtils.clamp(g.memory, 0, 1);
    if (g.flashColor !== undefined) s.flashColor.set(g.flashColor);
    if (g.flash !== undefined) s.flash = Math.max(s.flash, THREE.MathUtils.clamp(g.flash, 0, 1));
  }

  // ------------------------------------------------------------------------------ frame
  render(dt: number): void {
    dt = Math.min(Math.max(dt, 0), 0.1);
    this.time += dt;
    const t = this.time;

    // environment blend
    if (this.envT < 1) {
      this.envT = Math.min(1, this.envT + dt / Math.max(1e-3, this.envDur));
      const k = this.envT * this.envT * (3 - 2 * this.envT);
      lerpEnv(this.env, this.envFrom, this.envTo, k);
      this.pushEnv();
      this.envCaptureTimer -= dt;
      if (this.envCaptureTimer <= 0 || this.envT >= 1) { this.envDirty = true; this.envCaptureTimer = 0.4; }
    }
    // storm lightning (title)
    const st = this.storm;
    if (this.env.storm > 0.01) {
      st.next -= dt;
      if (st.next <= 0) { st.flash = 1; st.next = 2.5 + Math.random() * 7 / this.env.storm; }
    }
    st.flash = Math.max(0, st.flash - dt * 3.5);
    const flicker = st.flash > 0 ? st.flash * (0.6 + 0.4 * Math.sin(t * 60)) : 0;
    const flashCap = this.settings.reduceFlashes ? 0.25 : 1;
    this.sky.state.flash = flicker * 1.6 * flashCap * this.settings.effectsIntensity;

    this.camera.updateMatrixWorld();
    this.sky.update(this.camera, t);
    if (this.envDirty) this.captureEnvironment();
    updateMaterials(t);
    updateLights(t, this.camera.position);
    this.updateShadowFrustum();
    this.updateRim();

    // grade
    const gs = this.gradeState;
    gs.lowHealth += (gs.lowHealthTarget - gs.lowHealth) * (1 - Math.exp(-dt * 4));
    gs.memory += (gs.memoryTarget - gs.memory) * (1 - Math.exp(-dt * 2.5));
    gs.flash = Math.max(0, gs.flash - dt * 4);
    const gu = this.grade.uniforms as Record<string, THREE.IUniform>;
    const fx = this.settings.effectsIntensity;
    gu.uExposure.value = this.env.exposure * this.settings.brightness;
    gu.uLowHealth.value = gs.lowHealth;
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.6)), 6);
    gu.uPulse.value = this.settings.reduceFlashes ? 0.5 : beat;
    gu.uMemory.value = gs.memory;
    gu.uFlash.value = Math.min(gs.flash * fx, flashCap) * 0.6 + flicker * 0.08 * flashCap * fx;
    (gu.uFlashColor.value as THREE.Color).copy(gs.flashColor);
    gu.uGrain.value = this.settings.filmGrain ? 0.06 : 0;
    gu.uTime.value = t;

    if (this.motion.enabled) this.motion.updateCamera(this.camera);
    this.composer.render(dt);
    if (this.motion.enabled) this.motion.endFrame();
  }

  resize(): void {
    const w = Math.max(1, this.canvas.clientWidth || this.canvas.width || 1);
    const h = Math.max(1, this.canvas.clientHeight || this.canvas.height || 1);
    const pr = Math.min(window.devicePixelRatio || 1, 2) * THREE.MathUtils.clamp(this.settings.renderScale, 0.5, 1.5);
    this.width = w; this.height = h;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    (this.grade.uniforms as Record<string, THREE.IUniform>).uAspect.value = w / h;
  }

  stats(): { drawCalls: number; triangles: number } {
    return { drawCalls: this.scenePass.stats.drawCalls, triangles: this.scenePass.stats.triangles };
  }

  /** Forget motion history after a camera cut or teleport. */
  cameraCut(): void { this.motion.reset(); }

  dispose(): void {
    this.composer.dispose();
    this.pmrem.dispose();
    this.envRT?.dispose();
    this.renderer.dispose();
  }
}
