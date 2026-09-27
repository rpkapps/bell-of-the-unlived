/**
 * Cheap ambient effects: GPU-billboarded smoke/haze puffs (one draw call per field), flame
 * flicker for the instanced flames, and helpers for fading shared-material objects.
 */
import * as THREE from 'three';

export interface PuffColumn {
  /** Base position (world). */
  pos: THREE.Vector3;
  /** Rise height over one puff lifetime. */
  height: number;
  /** Start/end puff size (world units). */
  size0: number;
  size1: number;
  /** Number of puffs in the column. */
  count: number;
  /** Lifetime (s). */
  life: number;
  /** Horizontal drift over the lifetime (wind). */
  drift?: THREE.Vector3;
  /** Horizontal jitter of the base. */
  spread?: number;
}

export interface PuffFieldOpts {
  color: THREE.ColorRepresentation;
  opacity: number;
  additive?: boolean;
  /** Tint toward this colour near the base (embers under smoke). */
  baseColor?: THREE.ColorRepresentation;
}

const VERT = /* glsl */ `
  attribute vec3 iBase;
  attribute vec4 iParams;   // phase, life, height, seed
  attribute vec4 iSize;     // size0, size1, driftX, driftZ
  uniform float uTime;
  varying vec2 vUv;
  varying float vT;
  varying float vSeed;
  #include <common>
  #include <fog_pars_vertex>
  void main() {
    float t = fract(uTime / iParams.y + iParams.x);
    vT = t; vUv = uv; vSeed = iParams.w;
    vec3 c = iBase + vec3(iSize.z * t, iParams.z * t, iSize.w * t);
    c.x += sin(t * 6.2831 + iParams.w * 13.0) * 0.4 * t * iSize.y * 0.3;
    float s = mix(iSize.x, iSize.y, sqrt(t));
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    float rot = iParams.w * 6.2831 + t * 0.8;
    vec2 q = position.xy;
    q = vec2(q.x * cos(rot) - q.y * sin(rot), q.x * sin(rot) + q.y * cos(rot));
    mv.xy += q * s;
    vec4 mvPosition = mv;
    gl_Position = projectionMatrix * mv;
    #include <fog_vertex>
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uBase;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vT;
  varying float vSeed;
  #include <common>
  #include <fog_pars_fragment>
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float n = n2(vUv * 4.0 + vSeed * 17.0) * 0.6 + n2(vUv * 9.0 - vSeed * 5.0) * 0.4;
    float a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.6);
    float life = smoothstep(0.0, 0.12, vT) * (1.0 - smoothstep(0.55, 1.0, vT));
    vec3 col = mix(uBase, uColor, smoothstep(0.0, 0.35, vT));
    gl_FragColor = vec4(col, a * life * uOpacity);
    if (gl_FragColor.a < 0.004) discard;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** A set of rising puff columns rendered as one instanced draw call. */
export class PuffField {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  constructor(columns: PuffColumn[], o: PuffFieldOpts, seed = 1) {
    let n = 0;
    for (const c of columns) n += c.count;
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    const base = new Float32Array(n * 3), params = new Float32Array(n * 4), size = new Float32Array(n * 4);
    let i = 0, s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const bounds = new THREE.Box3();
    for (const c of columns) {
      for (let k = 0; k < c.count; k++, i++) {
        const sp = c.spread ?? 0.5;
        base[i * 3] = c.pos.x + (rnd() - 0.5) * sp;
        base[i * 3 + 1] = c.pos.y;
        base[i * 3 + 2] = c.pos.z + (rnd() - 0.5) * sp;
        params[i * 4] = k / c.count + rnd() * 0.05;
        params[i * 4 + 1] = c.life * (0.85 + rnd() * 0.3);
        params[i * 4 + 2] = c.height;
        params[i * 4 + 3] = rnd();
        size[i * 4] = c.size0; size[i * 4 + 1] = c.size1;
        size[i * 4 + 2] = c.drift?.x ?? 0; size[i * 4 + 3] = c.drift?.z ?? 0;
      }
      bounds.expandByPoint(c.pos.clone().addScalar(-c.size1 * 2));
      bounds.expandByPoint(c.pos.clone().add(new THREE.Vector3(c.drift?.x ?? 0, c.height, c.drift?.z ?? 0)).addScalar(c.size1 * 2));
    }
    g.setAttribute('iBase', new THREE.InstancedBufferAttribute(base, 3));
    g.setAttribute('iParams', new THREE.InstancedBufferAttribute(params, 4));
    g.setAttribute('iSize', new THREE.InstancedBufferAttribute(size, 4));
    g.instanceCount = n;
    g.boundingBox = bounds;
    g.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uColor: { value: new THREE.Color(o.color) }, uBase: { value: new THREE.Color(o.baseColor ?? o.color) }, uOpacity: { value: o.opacity },
      }]),
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: true,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = true;
    this.mesh.renderOrder = 5;
    this.mesh.name = 'puffs';
  }
  update(time: number) { this.mat.uniforms.uTime.value = time; }
  set opacity(v: number) { this.mat.uniforms.uOpacity.value = v; }
}

/** Animate the shared instanced flames: per-instance scale flicker around the base matrix. */
export function flickerFlames(mesh: THREE.InstancedMesh): (time: number) => void {
  const base: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); base.push(m.clone()); }
  const s = new THREE.Matrix4();
  let last = -1;
  return (time: number) => {
    // 30 Hz is plenty for flame shimmer
    if (Math.abs(time - last) < 1 / 30) return;
    last = time;
    for (let i = 0; i < base.length; i++) {
      const ph = i * 1.37;
      const k = 1 + Math.sin(time * 9 + ph) * 0.12 + Math.sin(time * 17.3 + ph * 2.3) * 0.08;
      const kx = 1 + Math.sin(time * 11 + ph * 0.7) * 0.07;
      s.makeScale(kx, k, kx);
      m.copy(base[i]).multiply(s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
}
