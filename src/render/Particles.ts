/**
 * GPU-friendly particles: CPU-simulated (typed arrays, swap-remove), drawn as instanced camera-
 * facing quads with one draw call per blend mode (additive light / alpha-blended matter), plus
 * two instanced-mesh pools for solid debris (bronze bell shards, stone rubble).
 *
 * Shapes (fragment-side, no textures but the shared noise): soft glow, velocity-stretched spark
 * streak, noisy smoke puff, flame lick (colour by age), twinkling mote, droplet. Fogged with the
 * scene's height fog; faded near the camera. Pool: 4000 billboards + 384 debris meshes.
 */
import * as THREE from 'three';
import type { EmitOpts, IParticles, ParticleKind } from './contract';
import { getNoiseTexture } from './textures';
import { getMaterial } from './materials';
import './fog';

const enum Shape { Glow = 0, Streak = 1, Smoke = 2, Flame = 3, Mote = 4, Drop = 5 }

const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aPosSize;
attribute vec4 aColor;
attribute vec4 aVelShape;
attribute vec4 aMisc; // rot, lifeFrac, seed, stretch
varying vec2 vUv;
varying vec4 vColor;
varying float vShape;
varying float vLife;
varying float vSeed;
varying float vNear;
varying float vPx;
uniform float uViewH;
void main() {
  vec4 mv = viewMatrix * vec4( aPosSize.xyz, 1.0 );
  float size = aPosSize.w;
  // Keep billboards at least ~2 px wide: sub-pixel sprites alias (twinkle on and off between
  // pixels as they drift). Grow them and spread the same energy over the larger quad instead.
  float pxW = 2.0 * max( -mv.z, 1e-3 ) / ( projectionMatrix[ 1 ][ 1 ] * uViewH );
  float minS = 2.0 * pxW;
  vPx = 1.0;
  if ( size < minS ) { vPx = ( size * size ) / ( minS * minS ); size = minS; }
  vec2 corner = position.xy;
  vec2 offs;
  if ( aVelShape.w == 1.0 || aVelShape.w == 5.0 ) {
    vec3 vv = ( viewMatrix * vec4( aVelShape.xyz, 0.0 ) ).xyz;
    float sl = length( vv.xy );
    vec2 a = sl > 1e-4 ? vv.xy / sl : vec2( 0.0, 1.0 );
    vec2 b = vec2( -a.y, a.x );
    float stretch = 1.0 + sl * aMisc.w;
    offs = a * corner.y * size * stretch + b * corner.x * size;
  } else {
    float c = cos( aMisc.x ), s = sin( aMisc.x );
    offs = mat2( c, s, -s, c ) * corner * size;
  }
  mv.xy += offs;
  gl_Position = projectionMatrix * mv;
  vUv = corner + 0.5;
  vColor = aColor;
  vShape = aVelShape.w;
  vLife = aMisc.y;
  vSeed = aMisc.z;
  vNear = smoothstep( 0.25, 1.4, -mv.z );
  vFogDepth = -mv.z;
  vFogWorldPos = aPosSize.xyz;
}
`;

const FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uNoise;
uniform float uTime;
uniform float uAdditive;
varying vec2 vUv;
varying vec4 vColor;
varying float vShape;
varying float vLife;
varying float vSeed;
varying float vNear;
varying float vPx;
void main() {
  vec2 p = vUv - 0.5;
  float r = length( p ) * 2.0;
  float a = 0.0;
  vec3 col = vColor.rgb;
  int shape = int( vShape + 0.5 );
  if ( shape == 0 ) {            // soft glow
    a = exp( -r * r * 4.0 ) * ( 1.0 - smoothstep( 0.8, 1.0, r ) );
  } else if ( shape == 1 ) {     // spark streak (hot core)
    float d = length( vec2( p.x * 2.2, p.y ) ) * 2.0;
    a = exp( -d * d * 3.5 );
    col *= 1.0 + 1.5 * exp( -d * d * 18.0 );
  } else if ( shape == 2 ) {     // smoke puff
    float n = texture2D( uNoise, vUv * 0.35 + vec2( vSeed, vSeed * 1.7 ) + vec2( 0.0, -uTime * 0.03 ) ).g;
    float n2 = texture2D( uNoise, vUv * 0.8 + vec2( vSeed * 2.3, 0.0 ) ).b;
    a = smoothstep( 1.0, 0.35, r + ( n - 0.5 ) * 0.8 + ( n2 - 0.5 ) * 0.3 );
    col *= 0.85 + 0.3 * n;
  } else if ( shape == 3 ) {     // flame lick
    float n = texture2D( uNoise, vec2( vUv.x * 0.6 + vSeed, vUv.y * 0.45 - uTime * 0.7 ) ).g;
    float n2 = texture2D( uNoise, vec2( vUv.x * 1.3 - vSeed, vUv.y * 1.1 - uTime * 1.3 ) ).b;
    vec2 q = p + vec2( ( n2 - 0.5 ) * 0.35, 0.0 );
    float rr = length( vec2( q.x * 1.5, q.y * 0.85 + 0.12 ) ) * 2.0;
    float heat = clamp( 1.05 - rr - ( 1.0 - n ) * 0.55 - vLife * 0.55, 0.0, 1.0 );
    a = smoothstep( 0.0, 0.3, heat );
    col = mix( vec3( 0.9, 0.18, 0.03 ), vec3( 1.0, 0.62, 0.18 ), smoothstep( 0.2, 0.6, heat ) );
    col = mix( col, vec3( 1.0, 0.92, 0.7 ), smoothstep( 0.65, 1.0, heat ) ) * vColor.rgb;
  } else if ( shape == 4 ) {     // twinkling mote
    float tw = 0.78 + 0.22 * sin( uTime * 6.0 + vSeed * 40.0 );
    a = ( exp( -r * r * 9.0 ) + 0.25 * exp( -r * r * 2.0 ) ) * tw * ( 1.0 - smoothstep( 0.85, 1.0, r ) );
  } else {                       // droplet
    float d = length( vec2( p.x * 2.0, p.y ) ) * 2.0;
    a = smoothstep( 1.0, 0.6, d );
  }
  a *= vColor.a * vNear * vPx;
  if ( a < 0.003 ) discard;
  float ff = 0.0;
  #if defined( USE_FOG ) && !defined( FOG_EXP2 )
    ff = fogFar < 1000.0 ? smoothstep( fogNear, fogFar, vFogDepth ) : heightFogFactor( vFogWorldPos, fogNear, fogFar );
  #endif
  if ( uAdditive > 0.5 ) {
    gl_FragColor = vec4( col * a * ( 1.0 - ff ), 1.0 );
  } else {
    #ifdef USE_FOG
      col = mix( col, fogColor, ff );
    #endif
    gl_FragColor = vec4( col, a );
  }
}
`;

/** One billboard pool (one blend mode). */
class BillboardPool {
  readonly cap: number;
  n = 0;
  readonly mesh: THREE.Mesh;
  // simulation state
  readonly pos: Float32Array; readonly vel: Float32Array; readonly col: Float32Array;
  readonly age: Float32Array; readonly life: Float32Array; readonly s0: Float32Array; readonly s1: Float32Array;
  readonly drag: Float32Array; readonly grav: Float32Array; readonly turb: Float32Array; readonly shape: Float32Array;
  readonly stretch: Float32Array; readonly rot: Float32Array; readonly spin: Float32Array; readonly seed: Float32Array;
  readonly delay: Float32Array; readonly home: Float32Array;
  readonly target: (THREE.Vector3 | null)[];
  // GPU attributes
  private readonly aPosSize: THREE.InstancedBufferAttribute;
  private readonly aColor: THREE.InstancedBufferAttribute;
  private readonly aVelShape: THREE.InstancedBufferAttribute;
  private readonly aMisc: THREE.InstancedBufferAttribute;
  private readonly geo: THREE.InstancedBufferGeometry;

  constructor(cap: number, additive: boolean, uniforms: Record<string, THREE.IUniform>) {
    this.cap = cap;
    const f = (k = 1) => new Float32Array(cap * k);
    this.pos = f(3); this.vel = f(3); this.col = f(4); this.age = f(); this.life = f(); this.s0 = f(); this.s1 = f();
    this.drag = f(); this.grav = f(); this.turb = f(); this.shape = f(); this.stretch = f(); this.rot = f(); this.spin = f();
    this.seed = f(); this.delay = f(); this.home = f(3);
    this.target = new Array(cap).fill(null);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const ia = (k: number) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPosSize = ia(4); this.aColor = ia(4); this.aVelShape = ia(4); this.aMisc = ia(4);
    geo.setAttribute('aPosSize', this.aPosSize); geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aVelShape', this.aVelShape); geo.setAttribute('aMisc', this.aMisc);
    geo.instanceCount = 0;
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      name: additive ? 'particles:add' : 'particles:alpha',
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uAdditive: { value: additive ? 1 : 0 }, uViewH: { value: 540 } }]),
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    mat.uniforms.uNoise = uniforms.uNoise;
    mat.uniforms.uTime = uniforms.uTime;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 11 : 10;
    const viewH = mat.uniforms.uViewH, size = new THREE.Vector2();
    this.mesh.onBeforeRender = (renderer) => {
      const rt = renderer.getRenderTarget();
      viewH.value = rt ? rt.height : renderer.getDrawingBufferSize(size).y;
    };
  }

  spawn(): number {
    if (this.n >= this.cap) return -1;
    const i = this.n++;
    this.target[i] = null;
    this.delay[i] = 0;
    return i;
  }

  private kill(i: number): void {
    const j = --this.n;
    if (i === j) return;
    const c3 = (a: Float32Array) => { a[i * 3] = a[j * 3]; a[i * 3 + 1] = a[j * 3 + 1]; a[i * 3 + 2] = a[j * 3 + 2]; };
    c3(this.pos); c3(this.vel); c3(this.home);
    for (let k = 0; k < 4; k++) this.col[i * 4 + k] = this.col[j * 4 + k];
    for (const a of [this.age, this.life, this.s0, this.s1, this.drag, this.grav, this.turb, this.shape, this.stretch, this.rot, this.spin, this.seed, this.delay]) a[i] = a[j];
    this.target[i] = this.target[j];
    this.target[j] = null;
  }

  update(dt: number, time: number): void {
    const P = this.pos, V = this.vel;
    for (let i = this.n - 1; i >= 0; i--) {
      if (this.delay[i] > 0) { this.delay[i] -= dt; continue; }
      const age = (this.age[i] += dt);
      if (age >= this.life[i]) { this.kill(i); continue; }
      const i3 = i * 3;
      const tgt = this.target[i];
      if (tgt) {
        // Hours stream: accelerate toward a (possibly moving) target, swirl on the way.
        const dx = tgt.x - P[i3], dy = tgt.y - P[i3 + 1], dz = tgt.z - P[i3 + 2];
        const d = Math.hypot(dx, dy, dz);
        if (d < 0.25) { this.kill(i); continue; }
        const pull = 6 + age * 14;
        V[i3] += (dx / d) * pull * dt; V[i3 + 1] += (dy / d) * pull * dt; V[i3 + 2] += (dz / d) * pull * dt;
        const sw = Math.sin(time * 3 + this.seed[i] * 20) * 2 * dt;
        V[i3] += -dz / d * sw; V[i3 + 2] += dx / d * sw;
        const damp = Math.exp(-2.2 * dt);
        V[i3] *= damp; V[i3 + 1] *= damp; V[i3 + 2] *= damp;
        // never live longer than needed: extend life while travelling
        this.life[i] = Math.max(this.life[i], age + 0.2);
        if (age > 6) { this.kill(i); continue; }
      } else {
        const dr = Math.exp(-this.drag[i] * dt);
        V[i3] *= dr; V[i3 + 1] *= dr; V[i3 + 2] *= dr;
        V[i3 + 1] -= this.grav[i] * dt;
        const tb = this.turb[i];
        if (tb > 0) {
          const s = this.seed[i] * 31.7;
          V[i3] += Math.sin(time * 1.7 + s) * tb * dt;
          V[i3 + 2] += Math.cos(time * 1.3 + s * 1.3) * tb * dt;
          V[i3 + 1] += Math.sin(time * 2.3 + s * 0.7) * tb * 0.5 * dt;
        }
      }
      P[i3] += V[i3] * dt; P[i3 + 1] += V[i3 + 1] * dt; P[i3 + 2] += V[i3 + 2] * dt;
      this.rot[i] += this.spin[i] * dt;
    }
  }

  private order: number[] = [];
  private depth: Float32Array = new Float32Array(0);

  /**
   * Write live particles to the GPU. With `eye`, back-to-front (alpha blending needs it: the pool
   * reorders on every death — swap-remove — so unsorted overlapping smoke would pop in front of
   * and behind itself from frame to frame).
   */
  upload(eye?: THREE.Vector3): void {
    const n = this.n;
    const ps = this.aPosSize.array as Float32Array, co = this.aColor.array as Float32Array;
    const vs = this.aVelShape.array as Float32Array, mi = this.aMisc.array as Float32Array;
    const order = this.order;
    order.length = 0;
    for (let i = 0; i < n; i++) if (!(this.delay[i] > 0)) order.push(i);
    if (eye && order.length > 1) {
      if (this.depth.length < this.cap) this.depth = new Float32Array(this.cap);
      const d = this.depth;
      const P = this.pos;
      for (const i of order) { const dx = P[i * 3] - eye.x, dy = P[i * 3 + 1] - eye.y, dz = P[i * 3 + 2] - eye.z; d[i] = dx * dx + dy * dy + dz * dz; }
      order.sort((a, b) => d[b] - d[a] || a - b);
    }
    let w = 0;
    for (const i of order) {
      const t = this.age[i] / this.life[i];
      const fadeIn = Math.min(1, this.age[i] / 0.06);
      const fadeOut = 1 - t * t;
      const w4 = w * 4, i3 = i * 3, i4 = i * 4;
      ps[w4] = this.pos[i3]; ps[w4 + 1] = this.pos[i3 + 1]; ps[w4 + 2] = this.pos[i3 + 2];
      ps[w4 + 3] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      co[w4] = this.col[i4]; co[w4 + 1] = this.col[i4 + 1]; co[w4 + 2] = this.col[i4 + 2];
      co[w4 + 3] = this.col[i4 + 3] * fadeIn * fadeOut;
      vs[w4] = this.vel[i3]; vs[w4 + 1] = this.vel[i3 + 1]; vs[w4 + 2] = this.vel[i3 + 2]; vs[w4 + 3] = this.shape[i];
      mi[w4] = this.rot[i]; mi[w4 + 1] = t; mi[w4 + 2] = this.seed[i]; mi[w4 + 3] = this.stretch[i];
      w++;
    }
    this.geo.instanceCount = w;
    for (const a of [this.aPosSize, this.aColor, this.aVelShape, this.aMisc]) {
      a.clearUpdateRanges();
      if (w > 0) { a.addUpdateRange(0, w * 4); a.needsUpdate = true; }
    }
  }
}

/** Solid debris (instanced meshes) with gravity, spin, a ground bounce and shrink-out. */
class DebrisPool {
  readonly mesh: THREE.InstancedMesh;
  n = 0;
  private readonly cap: number;
  private readonly pos: Float32Array; private readonly vel: Float32Array; private readonly rot: Float32Array; private readonly spin: Float32Array;
  private readonly scale: Float32Array; private readonly age: Float32Array; private readonly life: Float32Array; private readonly floor: Float32Array;
  private readonly _m = new THREE.Matrix4(); private readonly _q = new THREE.Quaternion(); private readonly _e = new THREE.Euler();
  private readonly _p = new THREE.Vector3(); private readonly _s = new THREE.Vector3();

  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number) {
    this.cap = cap;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    const f = (k = 1) => new Float32Array(cap * k);
    this.pos = f(3); this.vel = f(3); this.rot = f(3); this.spin = f(3); this.scale = f(); this.age = f(); this.life = f(); this.floor = f();
  }

  spawn(p: THREE.Vector3, v: THREE.Vector3, scale: number, life: number, floor: number, rng: () => number): void {
    if (this.n >= this.cap) return;
    const i = this.n++, i3 = i * 3;
    this.pos[i3] = p.x; this.pos[i3 + 1] = p.y; this.pos[i3 + 2] = p.z;
    this.vel[i3] = v.x; this.vel[i3 + 1] = v.y; this.vel[i3 + 2] = v.z;
    for (let k = 0; k < 3; k++) { this.rot[i3 + k] = rng() * 6.28; this.spin[i3 + k] = (rng() - 0.5) * 18; }
    this.scale[i] = scale; this.age[i] = 0; this.life[i] = life; this.floor[i] = floor;
  }

  update(dt: number): void {
    for (let i = this.n - 1; i >= 0; i--) {
      const i3 = i * 3;
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        const j = --this.n, j3 = j * 3;
        for (let k = 0; k < 3; k++) { this.pos[i3 + k] = this.pos[j3 + k]; this.vel[i3 + k] = this.vel[j3 + k]; this.rot[i3 + k] = this.rot[j3 + k]; this.spin[i3 + k] = this.spin[j3 + k]; }
        this.scale[i] = this.scale[j]; this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.floor[i] = this.floor[j];
        continue;
      }
      this.vel[i3 + 1] -= 9.8 * dt;
      for (let k = 0; k < 3; k++) { this.pos[i3 + k] += this.vel[i3 + k] * dt; this.rot[i3 + k] += this.spin[i3 + k] * dt; }
      const fl = this.floor[i] + this.scale[i] * 0.4;
      if (this.pos[i3 + 1] < fl) {
        this.pos[i3 + 1] = fl;
        if (this.vel[i3 + 1] < 0) this.vel[i3 + 1] *= -0.3;
        this.vel[i3] *= 0.6; this.vel[i3 + 2] *= 0.6;
        for (let k = 0; k < 3; k++) this.spin[i3 + k] *= 0.6;
      }
    }
    for (let i = 0; i < this.n; i++) {
      const i3 = i * 3;
      const t = this.age[i] / this.life[i];
      const s = this.scale[i] * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1);
      this._q.setFromEuler(this._e.set(this.rot[i3], this.rot[i3 + 1], this.rot[i3 + 2]));
      this._m.compose(this._p.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]), this._q, this._s.set(s, s, s));
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.count = this.n;
    if (this.n > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

interface Emitter { kind: ParticleKind; pos: THREE.Vector3; rate: number; acc: number; alive: boolean }

/** Shard geometry: a thin, bent bronze fragment (with UVs for the bell material). */
function shardGeometry(): THREE.BufferGeometry {
  const g = new THREE.TetrahedronGeometry(0.5, 0);
  g.scale(1, 0.35, 0.7);
  g.computeVertexNormals();
  return g;
}

export class Particles implements IParticles {
  readonly object = new THREE.Group();
  private readonly add: BillboardPool;
  private readonly alpha: BillboardPool;
  private readonly shards: DebrisPool;
  private readonly rubble: DebrisPool;
  private readonly emitters: Emitter[] = [];
  private readonly uniforms = { uNoise: { value: getNoiseTexture() as THREE.Texture }, uTime: { value: 0 } };
  private intensity = 1;
  private time = 0;
  private seed = 1234567;
  /** Optional ground query for debris bounces; default: 1.6 m below the emit point. */
  groundAt: ((x: number, z: number, y: number) => number) | null = null;
  private readonly _v = new THREE.Vector3();
  private readonly _d = new THREE.Vector3();
  private readonly _c = new THREE.Color();

  constructor(scene?: THREE.Scene, capacity = 4000) {
    this.add = new BillboardPool(Math.round(capacity * 0.6), true, this.uniforms);
    this.alpha = new BillboardPool(Math.round(capacity * 0.4), false, this.uniforms);
    this.shards = new DebrisPool(shardGeometry(), getMaterial('bronze_bell'), 192);
    const rg = new THREE.DodecahedronGeometry(0.5, 0);
    this.rubble = new DebrisPool(rg, getMaterial('rubble'), 192);
    this.object.name = 'particles';
    this.object.add(this.alpha.mesh, this.add.mesh, this.shards.mesh, this.rubble.mesh);
    if (scene) scene.add(this.object);
  }

  private rnd(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  private range(a: number, b: number): number { return a + (b - a) * this.rnd(); }

  /** Random direction within `spread` radians of `dir` (uniform over the cone cap). */
  private cone(dir: THREE.Vector3, spread: number, out: THREE.Vector3): THREE.Vector3 {
    const u = this.rnd(), v = this.rnd();
    const cosT = 1 - u * (1 - Math.cos(Math.min(Math.PI, spread)));
    const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
    const phi = v * Math.PI * 2;
    // basis around dir
    const w = this._d.copy(dir).normalize();
    const a = Math.abs(w.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const uAx = a.cross(w).normalize();
    const vAx = new THREE.Vector3().crossVectors(w, uAx);
    return out.copy(w).multiplyScalar(cosT).addScaledVector(uAx, Math.cos(phi) * sinT).addScaledVector(vAx, Math.sin(phi) * sinT);
  }

  private put(pool: BillboardPool, p: THREE.Vector3, v: THREE.Vector3, o: {
    life: number; s0: number; s1: number; color: THREE.Color; alpha: number; shape: Shape;
    drag?: number; grav?: number; turb?: number; stretch?: number; spin?: number; delay?: number; target?: THREE.Vector3 | null;
  }): void {
    const i = pool.spawn();
    if (i < 0) return;
    const i3 = i * 3, i4 = i * 4;
    pool.pos[i3] = p.x; pool.pos[i3 + 1] = p.y; pool.pos[i3 + 2] = p.z;
    pool.vel[i3] = v.x; pool.vel[i3 + 1] = v.y; pool.vel[i3 + 2] = v.z;
    pool.col[i4] = o.color.r; pool.col[i4 + 1] = o.color.g; pool.col[i4 + 2] = o.color.b; pool.col[i4 + 3] = o.alpha;
    pool.age[i] = 0; pool.life[i] = o.life; pool.s0[i] = o.s0; pool.s1[i] = o.s1;
    pool.drag[i] = o.drag ?? 0; pool.grav[i] = o.grav ?? 0; pool.turb[i] = o.turb ?? 0; pool.shape[i] = o.shape;
    pool.stretch[i] = o.stretch ?? 0; pool.rot[i] = this.rnd() * 6.28; pool.spin[i] = o.spin ?? 0; pool.seed[i] = this.rnd();
    pool.delay[i] = o.delay ?? 0; pool.target[i] = o.target ?? null;
  }

  private n(count: number): number {
    if (count <= 0) return 0;
    return Math.max(1, Math.round(count * (0.15 + 0.85 * this.intensity)));
  }

  emit(kind: ParticleKind, pos: THREE.Vector3, opts: EmitOpts = {}): void {
    const sc = opts.scale ?? 1;
    const spd = opts.speed ?? 1;
    const dir = opts.dir ? this._v.copy(opts.dir) : this._v.set(0, 1, 0);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    const baseDir = dir.clone().normalize();
    const col = this._c;
    const v = new THREE.Vector3();
    const p = new THREE.Vector3();
    const tint = (def: THREE.ColorRepresentation, k: number) => col.set(opts.color ?? def).multiplyScalar(k);
    const count = (def: number) => this.n(opts.count ?? def);
    switch (kind) {
      case 'sparks':
      case 'blockSparks': {
        const block = kind === 'blockSparks';
        const c = count(block ? 16 : 22);
        for (let i = 0; i < c; i++) {
          this.cone(baseDir, opts.spread ?? (block ? 0.9 : 1.2), v).multiplyScalar(this.range(5, 12) * spd);
          tint(block ? 0xffe2b0 : 0xffb060, block ? 7 : 8);
          this.put(this.add, pos, v, { life: this.range(0.18, 0.45), s0: 0.035 * sc, s1: 0.015 * sc, color: col, alpha: 1, shape: Shape.Streak, drag: 2.2, grav: 7, stretch: 0.045 });
        }
        tint(block ? 0xfff0d0 : 0xffc080, block ? 5 : 4);
        this.put(this.add, pos, v.set(0, 0, 0), { life: 0.09, s0: 0.5 * sc, s1: 0.9 * sc, color: col, alpha: 1, shape: Shape.Glow });
        break;
      }
      case 'goldMotes': {
        const c = count(28);
        for (let i = 0; i < c; i++) {
          this.cone(baseDir, opts.spread ?? 1.6, v).multiplyScalar(this.range(0.4, 1.8) * spd);
          p.copy(pos).add(new THREE.Vector3(this.range(-0.25, 0.25), this.range(-0.4, 0.4), this.range(-0.25, 0.25)).multiplyScalar(sc));
          tint(0xffc862, this.range(2.5, 5));
          this.put(this.add, p, v, { life: this.range(1.2, 2.6), s0: this.range(0.05, 0.1) * sc, s1: 0.02 * sc, color: col, alpha: 1, shape: Shape.Mote, drag: 1.4, grav: -1.1, turb: 1.2 });
        }
        break;
      }
      case 'blood': {
        const c = count(12);
        for (let i = 0; i < c; i++) {
          this.cone(baseDir, opts.spread ?? 0.8, v).multiplyScalar(this.range(1.5, 4) * spd);
          tint(0x3a0605, 1);
          this.put(this.alpha, pos, v, { life: this.range(0.35, 0.6), s0: this.range(0.025, 0.05) * sc, s1: 0.02 * sc, color: col, alpha: 0.9, shape: Shape.Drop, drag: 0.8, grav: 9.8, stretch: 0.03 });
        }
        break;
      }
      case 'dust': {
        const c = count(9);
        for (let i = 0; i < c; i++) {
          const a = this.rnd() * Math.PI * 2;
          v.set(Math.cos(a), 0.25 + this.rnd() * 0.3, Math.sin(a)).multiplyScalar(this.range(0.5, 1.4) * spd);
          p.copy(pos).addScaledVector(v, 0.1);
          tint(0x7a7064, this.range(0.8, 1.1));
          this.put(this.alpha, p, v, { life: this.range(0.8, 1.5), s0: 0.25 * sc, s1: 0.9 * sc, color: col, alpha: 0.3, shape: Shape.Smoke, drag: 2.6, grav: -0.08, spin: this.range(-0.6, 0.6) });
        }
        break;
      }
      case 'embers': {
        const c = count(5);
        for (let i = 0; i < c; i++) {
          v.set(this.range(-0.3, 0.3), this.range(0.4, 1.2), this.range(-0.3, 0.3)).multiplyScalar(spd);
          p.copy(pos).add(new THREE.Vector3(this.range(-0.2, 0.2), 0, this.range(-0.2, 0.2)).multiplyScalar(sc));
          tint(0xff7a2a, this.range(3, 6));
          this.put(this.add, p, v, { life: this.range(1.4, 3), s0: this.range(0.02, 0.035) * sc, s1: 0.008, color: col, alpha: 1, shape: Shape.Mote, drag: 0.6, grav: -0.6, turb: 1.6 });
        }
        break;
      }
      case 'fireBurst': {
        const c = count(20);
        for (let i = 0; i < c; i++) {
          this.cone(baseDir, Math.PI, v).multiplyScalar(this.range(1.5, 5) * spd);
          tint(0xffffff, 3.2);
          this.put(this.add, pos, v, { life: this.range(0.35, 0.65), s0: 0.35 * sc, s1: 1.1 * sc, color: col, alpha: 1, shape: Shape.Flame, drag: 3.5, grav: -2.2, spin: this.range(-2, 2) });
        }
        for (let i = 0; i < this.n(12); i++) {
          this.cone(baseDir, Math.PI, v).multiplyScalar(this.range(0.8, 2.5) * spd);
          tint(0x1c1916, 1);
          this.put(this.alpha, pos, v, { life: this.range(1.2, 2.2), s0: 0.5 * sc, s1: 2.2 * sc, color: col, alpha: 0.5, shape: Shape.Smoke, drag: 2.2, grav: -0.9, delay: 0.08, spin: this.range(-0.5, 0.5) });
        }
        for (let i = 0; i < this.n(14); i++) {
          this.cone(baseDir, Math.PI, v).multiplyScalar(this.range(3, 7) * spd);
          tint(0xff8a3a, 5);
          this.put(this.add, pos, v, { life: this.range(0.5, 1.2), s0: 0.03 * sc, s1: 0.01, color: col, alpha: 1, shape: Shape.Streak, drag: 1.6, grav: 4, stretch: 0.03 });
        }
        tint(0xffb060, 6);
        this.put(this.add, pos, v.set(0, 0, 0), { life: 0.14, s0: 1.8 * sc, s1: 3.2 * sc, color: col, alpha: 1, shape: Shape.Glow });
        break;
      }
      case 'fireTrail': {
        for (let i = 0; i < count(3); i++) {
          v.set(this.range(-0.3, 0.3), this.range(0.1, 0.6), this.range(-0.3, 0.3));
          tint(0xffffff, 2.6);
          this.put(this.add, pos, v, { life: this.range(0.18, 0.35), s0: 0.22 * sc, s1: 0.06 * sc, color: col, alpha: 1, shape: Shape.Flame, drag: 2, grav: -1.5, spin: this.range(-3, 3) });
        }
        if (this.rnd() < 0.5) {
          tint(0x24201c, 1);
          this.put(this.alpha, pos, v.set(0, 0.4, 0), { life: 0.9, s0: 0.15 * sc, s1: 0.6 * sc, color: col, alpha: 0.3, shape: Shape.Smoke, drag: 1.5, grav: -0.3 });
        }
        break;
      }
      case 'shardTrail': {
        for (let i = 0; i < count(3); i++) {
          v.set(this.range(-0.2, 0.2), this.range(-0.2, 0.2), this.range(-0.2, 0.2));
          tint(0xffd9a0, this.range(2.5, 4.5));
          this.put(this.add, pos, v, { life: this.range(0.18, 0.32), s0: 0.05 * sc, s1: 0.01, color: col, alpha: 1, shape: Shape.Mote, drag: 3 });
        }
        break;
      }
      case 'healMotes': {
        const c = count(26);
        for (let i = 0; i < c; i++) {
          const a = this.rnd() * Math.PI * 2, r = this.range(0.25, 0.55) * sc;
          p.set(pos.x + Math.cos(a) * r, pos.y + this.range(-0.1, 1.2) * sc, pos.z + Math.sin(a) * r);
          v.set(-Math.sin(a) * 0.6, this.range(0.5, 1.2), Math.cos(a) * 0.6).multiplyScalar(spd);
          tint(0xffe0a0, this.range(2, 3.5));
          this.put(this.add, p, v, { life: this.range(0.9, 1.6), s0: 0.06 * sc, s1: 0.015, color: col, alpha: 1, shape: Shape.Mote, drag: 1.2, grav: -0.8, turb: 0.8, delay: this.rnd() * 0.3 });
        }
        break;
      }
      case 'bellMotes': {
        const c = count(6);
        for (let i = 0; i < c; i++) {
          p.copy(pos).add(new THREE.Vector3(this.range(-0.6, 0.6), this.range(-0.2, 0.8), this.range(-0.6, 0.6)).multiplyScalar(sc));
          v.set(this.range(-0.1, 0.1), this.range(0.1, 0.35), this.range(-0.1, 0.1)).multiplyScalar(spd);
          tint(0xffe2a8, this.range(1.8, 3));
          this.put(this.add, p, v, { life: this.range(2, 4), s0: this.range(0.03, 0.06) * sc, s1: 0.01, color: col, alpha: 1, shape: Shape.Mote, drag: 0.5, grav: -0.05, turb: 0.4 });
        }
        break;
      }
      case 'hoursStream': {
        const c = count(36);
        const target = opts.target ?? null;
        for (let i = 0; i < c; i++) {
          this.cone(new THREE.Vector3(0, 1, 0), 1.3, v).multiplyScalar(this.range(1.5, 3.5) * spd);
          p.copy(pos).add(new THREE.Vector3(this.range(-0.3, 0.3), this.range(0, 1.2), this.range(-0.3, 0.3)).multiplyScalar(sc));
          tint(0xffc45a, this.range(3, 5));
          this.put(this.add, p, v, { life: target ? 4 : this.range(1.5, 2.5), s0: this.range(0.05, 0.09) * sc, s1: 0.03 * sc, color: col, alpha: 1, shape: Shape.Mote, drag: target ? 0 : 1.2, grav: target ? 0 : -0.5, target, delay: i * 0.025 });
        }
        break;
      }
      case 'shatter': {
        const c = count(18);
        const floor = this.groundAt ? this.groundAt(pos.x, pos.z, pos.y) : pos.y - 1.6;
        for (let i = 0; i < c; i++) {
          this.cone(baseDir, 1.4, v).multiplyScalar(this.range(2.5, 6) * spd);
          p.copy(pos).addScaledVector(v, 0.03);
          this.shards.spawn(p, v, this.range(0.08, 0.22) * sc, this.range(2.5, 4), floor, () => this.rnd());
        }
        this.emit('goldMotes', pos, { count: 30, scale: sc });
        this.emit('sparks', pos, { count: 16, dir: baseDir, spread: 1.6, scale: sc });
        break;
      }
      case 'rubble': {
        const c = count(14);
        const floor = this.groundAt ? this.groundAt(pos.x, pos.z, pos.y) : pos.y - 1.6;
        for (let i = 0; i < c; i++) {
          this.cone(baseDir, 1.2, v).multiplyScalar(this.range(1.5, 4.5) * spd);
          p.copy(pos).add(new THREE.Vector3(this.range(-0.5, 0.5), this.range(-0.3, 0.3), this.range(-0.5, 0.5)).multiplyScalar(sc));
          this.rubble.spawn(p, v, this.range(0.1, 0.35) * sc, this.range(3, 5), floor, () => this.rnd());
        }
        for (let i = 0; i < this.n(14); i++) {
          const a = this.rnd() * Math.PI * 2;
          v.set(Math.cos(a) * this.range(0.5, 2), this.range(0.2, 1.2), Math.sin(a) * this.range(0.5, 2));
          tint(0x6e665c, 1);
          this.put(this.alpha, pos, v, { life: this.range(1.5, 3), s0: 0.6 * sc, s1: 2.4 * sc, color: col, alpha: 0.4, shape: Shape.Smoke, drag: 1.8, grav: -0.1, spin: this.range(-0.4, 0.4) });
        }
        break;
      }
      case 'fogMotes': {
        const c = count(5);
        for (let i = 0; i < c; i++) {
          p.copy(pos).add(new THREE.Vector3(this.range(-1.5, 1.5), this.range(0, 2), this.range(-1.5, 1.5)).multiplyScalar(sc));
          v.set(this.range(-0.15, 0.15), this.range(0.02, 0.15), this.range(-0.15, 0.15));
          tint(0xdfe6ff, this.range(0.8, 1.4));
          this.put(this.add, p, v, { life: this.range(3, 5), s0: this.range(0.05, 0.1) * sc, s1: 0.03, color: col, alpha: 0.6, shape: Shape.Mote, drag: 0.3, turb: 0.35 });
        }
        break;
      }
    }
  }

  attach(kind: ParticleKind, pos: THREE.Vector3, rate: number): { setPos(p: THREE.Vector3): void; setRate(r: number): void; stop(): void } {
    const e: Emitter = { kind, pos: pos.clone(), rate, acc: 0, alive: true };
    this.emitters.push(e);
    return {
      setPos: (p) => { e.pos.copy(p); },
      setRate: (r) => { e.rate = r; },
      stop: () => { e.alive = false; },
    };
  }

  update(dt: number, _camera: THREE.Camera): void {
    dt = Math.min(Math.max(dt, 0), 0.1);
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      if (!e.alive) { this.emitters.splice(i, 1); continue; }
      e.acc += e.rate * dt * (0.25 + 0.75 * this.intensity);
      let guard = 0;
      while (e.acc >= 1 && guard++ < 64) { e.acc -= 1; this.emit(e.kind, e.pos, { count: 1 }); }
    }
    this.add.update(dt, this.time); this.alpha.update(dt, this.time);
    this.add.upload(); this.alpha.upload(_camera?.position);
    this.shards.update(dt); this.rubble.update(dt);
  }

  setIntensity(k: number): void { this.intensity = Math.max(0, Math.min(1, k)); }

  /** Live counts (debug). */
  counts(): { additive: number; alpha: number; debris: number; emitters: number } {
    return { additive: this.add.n, alpha: this.alpha.n, debris: this.shards.n + this.rubble.n, emitters: this.emitters.length };
  }
}
