/**
 * Weapon swing ribbons. Each trail keeps the recent (base, tip) samples pushed by combat code and
 * rebuilds a triangle strip every frame, Catmull-Rom subdivided between samples so fast swings
 * stay round. Additive, subtle: brightest near the tip and at the newest edge, fading with age.
 *
 *   const trail = trails.create(0xffd8a0, 0.7);   // width = fraction of the blade from the tip
 *   trail.setActive(true);  per frame: trail.push(baseWorld, tipWorld); trail.update(dt);
 */
import * as THREE from 'three';
import type { ITrail, ITrails } from './contract';

const MAX_SAMPLES = 48;
const SUBDIV = 4;
const MAX_VERTS = MAX_SAMPLES * SUBDIV * 2 + 2;

const VERT = /* glsl */ `
attribute float aAge;
attribute float aSide;
varying float vAge;
varying float vSide;
void main() {
  vAge = aAge; vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;
const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAge;
varying float vSide;
void main() {
  float age = clamp( vAge, 0.0, 1.0 );
  float a = pow( 1.0 - age, 2.2 );
  a *= smoothstep( 0.0, 0.55, vSide ) * ( 1.0 - 0.35 * smoothstep( 0.9, 1.0, vSide ) );
  vec3 c = uColor * ( 0.6 + 0.8 * vSide * ( 1.0 - age ) );
  gl_FragColor = vec4( c * a * uOpacity, 1.0 );
}
`;

interface Sample { base: THREE.Vector3; tip: THREE.Vector3; t: number }

function catmull(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const t2 = t * t, t3 = t2 * t;
  out.set(0, 0, 0)
    .addScaledVector(p0, -0.5 * t3 + t2 - 0.5 * t)
    .addScaledVector(p1, 1.5 * t3 - 2.5 * t2 + 1)
    .addScaledVector(p2, -1.5 * t3 + 2 * t2 + 0.5 * t)
    .addScaledVector(p3, 0.5 * t3 - 0.5 * t2);
  return out;
}

class Trail implements ITrail {
  readonly mesh: THREE.Mesh;
  private readonly samples: Sample[] = [];
  private readonly geo = new THREE.BufferGeometry();
  private readonly posAttr: THREE.BufferAttribute;
  private readonly ageAttr: THREE.BufferAttribute;
  private readonly sideAttr: THREE.BufferAttribute;
  private readonly width: number;
  private active = false;
  private time = 0;
  /** Seconds a segment takes to fade out. */
  fade = 0.22;
  private readonly _a = new THREE.Vector3();
  private readonly _b = new THREE.Vector3();
  private readonly owner: Set<Trail>;

  constructor(color: THREE.ColorRepresentation, width: number, owner: Set<Trail>) {
    this.width = THREE.MathUtils.clamp(width, 0.05, 1);
    this.owner = owner;
    this.posAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.ageAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTS), 1).setUsage(THREE.DynamicDrawUsage);
    this.sideAttr = new THREE.BufferAttribute(new Float32Array(MAX_VERTS), 1).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('aAge', this.ageAttr);
    this.geo.setAttribute('aSide', this.sideAttr);
    const idx: number[] = [];
    for (let i = 0; i < MAX_VERTS / 2 - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo.setIndex(idx);
    this.geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      name: 'trail',
      uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(1.6) }, uOpacity: { value: 0.55 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 12;
  }

  push(base: THREE.Vector3, tip: THREE.Vector3): void {
    if (!this.active) return;
    const b = this._a.copy(tip).lerp(base, this.width);
    const last = this.samples[this.samples.length - 1];
    if (last && last.tip.distanceToSquared(tip) < 1e-6 && last.base.distanceToSquared(b) < 1e-6) { last.t = this.time; return; }
    this.samples.push({ base: b.clone(), tip: tip.clone(), t: this.time });
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
  }

  setActive(on: boolean): void { this.active = on; }

  update(dt: number): void {
    this.time += Math.max(0, dt);
    const s = this.samples;
    while (s.length && this.time - s[0].t > this.fade) s.shift();
    const n = s.length;
    if (n < 2) { this.geo.setDrawRange(0, 0); return; }
    const P = this.posAttr.array as Float32Array, A = this.ageAttr.array as Float32Array, S = this.sideAttr.array as Float32Array;
    let v = 0;
    const write = (base: THREE.Vector3, tip: THREE.Vector3, age: number) => {
      P[v * 3] = base.x; P[v * 3 + 1] = base.y; P[v * 3 + 2] = base.z; A[v] = age; S[v] = 0; v++;
      P[v * 3] = tip.x; P[v * 3 + 1] = tip.y; P[v * 3 + 2] = tip.z; A[v] = age; S[v] = 1; v++;
    };
    for (let i = 0; i < n - 1; i++) {
      const s0 = s[Math.max(0, i - 1)], s1 = s[i], s2 = s[i + 1], s3 = s[Math.min(n - 1, i + 2)];
      for (let k = 0; k < SUBDIV; k++) {
        const t = k / SUBDIV;
        const age = (this.time - (s1.t + (s2.t - s1.t) * t)) / this.fade;
        write(catmull(s0.base, s1.base, s2.base, s3.base, t, this._a), catmull(s0.tip, s1.tip, s2.tip, s3.tip, t, this._b), age);
      }
    }
    write(s[n - 1].base, s[n - 1].tip, (this.time - s[n - 1].t) / this.fade);
    this.posAttr.needsUpdate = true; this.ageAttr.needsUpdate = true; this.sideAttr.needsUpdate = true;
    this.posAttr.clearUpdateRanges(); this.posAttr.addUpdateRange(0, v * 3);
    this.ageAttr.clearUpdateRanges(); this.ageAttr.addUpdateRange(0, v);
    this.sideAttr.clearUpdateRanges(); this.sideAttr.addUpdateRange(0, v);
    this.geo.setDrawRange(0, (v / 2 - 1) * 6);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.owner.delete(this);
  }
}

export class Trails implements ITrails {
  readonly object = new THREE.Group();
  private readonly live = new Set<Trail>();

  constructor(scene?: THREE.Scene) {
    this.object.name = 'trails';
    if (scene) scene.add(this.object);
  }

  /** `width` = fraction of the blade (from the tip toward the base) the ribbon covers. */
  create(color: THREE.ColorRepresentation = 0xffe2b8, width = 0.75): ITrail {
    const t = new Trail(color, width, this.live);
    this.live.add(t);
    this.object.add(t.mesh);
    return t;
  }
}
