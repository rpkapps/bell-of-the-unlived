/**
 * CharBuilder — assembles a character from procedural parts.
 *
 * Parts are authored in a bone's LOCAL frame, in reference units (the 1.80 m rig of rigDefs.ts).
 * On `build()` the builder:
 *  - scales each part into the rig's proportions (height → all axes of offsets; bulk → girth),
 *  - skins it: rigidly to its bone by default, or with a blend function (robes, sleeves, torso)
 *    so cloth and the trunk deform smoothly across joints,
 *  - merges EVERYTHING that shares a material into ONE SkinnedMesh bound to the rig's bone
 *    Object3Ds (one draw call per material instead of one per bone × material),
 *  - creates the verlet cloth sims, and returns the CharacterModel.
 *
 * Skinning set-up: each mesh is a child of rig.root in 'attached' bind mode with an identity bind
 * matrix; bone inverses are pure translations by each bone's REST position in root space (rest
 * rotations are identity by contract). Vertex positions are written in that rest root space, so a
 * vertex ends up at `boneWorld × boneLocalPosition` — exactly what parenting to the bone would do.
 * The rig may already be posed when a model is built: only `rig.rest` is read.
 */
import * as THREE from 'three';
import type { Rig } from '../Rig';
import { BONES, BONE_PARENT, type BoneName } from '../rigDefs';
import type { CharacterModel } from './contract';
import { Rng } from '../../core/rng';
import { norm, xf, type G, type V3, type Xf, type Ring, type LoftOpts, loft, cracks, triCount } from './parts';
import { MatLib, makeFxUniforms, type FxUniforms } from './charMaterials';
import { Cloth, type ClothSpec, type ClothContext } from './cloth';

/** Returns bone weights for a vertex given its position in the authoring bone's reference frame. */
export type SkinFn = (p: THREE.Vector3) => [BoneName, number][];

export interface PartOpts extends Xf { skin?: SkinFn; }

interface Part { g: G; bone: BoneName; skin?: SkinFn; }

export type ModelKind = 'player' | 'enemy' | 'boss' | 'npc';

/** Extra info on built models (not in the contract): used by the preview and debug overlays. */
export interface ModelInfo { triangles: number; meshes: number; cloths: number; }

export type BuiltModel = CharacterModel & { info: ModelInfo };

const BONE_INDEX = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;

export class CharBuilder {
  readonly s: number;
  readonly bulk: number;
  readonly shoulder: number;
  readonly restRoot = {} as Record<BoneName, THREE.Vector3>;
  readonly rng: Rng;
  /** Density of Unlived gold cracks (0 = living). Gear helpers read it. */
  cracks = 0;
  /** Spectral look (translucent with bright rim). */
  ghost: { color: THREE.Color; min: number } | null = null;
  private readonly parts = new Map<string, Part[]>();
  private readonly cloths: ClothSpec[] = [];

  constructor(readonly rig: Rig, readonly kind: ModelKind, seed = 1) {
    const pr = rig.proportions;
    this.s = pr.height; this.bulk = pr.bulk; this.shoulder = pr.shoulder;
    this.rng = new Rng(seed);
    for (const b of BONES) {
      const p = BONE_PARENT[b];
      this.restRoot[b] = rig.rest[b].clone();
      if (p !== 'root') this.restRoot[b].add(this.restRoot[p]);
    }
  }

  /** Girth scale per bone: bulk applies fully to trunk/limbs, damped for head, hands, feet. */
  boneScale(b: BoneName, out = new THREE.Vector3()): THREE.Vector3 {
    const s = this.s, k = this.bulk;
    let gx = k, gz = k;
    if (b === 'head' || b === 'neck') { gx = gz = 1 + (k - 1) * 0.3; }
    else if (b === 'handL' || b === 'handR') { gx = gz = 1 + (k - 1) * 0.45; }
    else if (b === 'footL' || b === 'footR') { gx = 1 + (k - 1) * 0.5; gz = 1 + (k - 1) * 0.25; }
    else if (b === 'chest' || b === 'shoulderL' || b === 'shoulderR') { gx = k * (0.45 + 0.55 * this.shoulder); }
    return out.set(s * gx, s, s * gz);
  }

  /** Add a part authored in `bone`'s local reference frame. */
  add(bone: BoneName, g: G, mat: string, o?: PartOpts): this {
    norm(g);
    if (o) xf(g, o);
    let list = this.parts.get(mat);
    if (!list) this.parts.set(mat, (list = []));
    list.push({ g, bone, skin: o?.skin });
    return this;
  }

  /** Add a part to both sides: `make(side)` builds the LEFT version when side = +1, right when -1. */
  addLR(boneL: BoneName, boneR: BoneName, make: (side: 1 | -1) => G, mat: string, o?: (side: 1 | -1) => PartOpts) {
    this.add(boneL, make(1), mat, o?.(1));
    this.add(boneR, make(-1), mat, o?.(-1));
  }

  /** Loft helper that also sprinkles Unlived cracks on the surface when `cracks` > 0. */
  loft(bone: BoneName, rings: Ring[], mat: string, lo: LoftOpts = {}, o?: PartOpts & { crack?: number }) {
    this.add(bone, loft(rings, lo), mat, o);
    this.crackOn(bone, rings, lo, o);
  }

  /** Only the Unlived crack ribbons for a loft surface (no-op on living characters). */
  crackOn(bone: BoneName, rings: Ring[], lo: LoftOpts = {}, o?: PartOpts & { crack?: number }) {
    const density = (o?.crack ?? 1) * this.cracks;
    if (density <= 0) return;
    const count = Math.floor(density * 3 + this.rng.next() * density * 2);
    if (count <= 0) return;
    const a0 = lo.phi0 ?? 0, a1 = a0 + (lo.phiLen ?? Math.PI * 2);
    const g = cracks(rings, lo, this.rng, count, { a0, a1, width: 0.005 * (1 + density * 0.3) });
    const t: PartOpts | undefined = o ? { p: o.p, r: o.r, s: o.s, skin: o.skin } : undefined;
    this.add(bone, g, 'unlived_crack', t);
  }

  addCloth(spec: ClothSpec) { this.cloths.push(spec); }

  /** Assemble meshes and return the model. */
  build(): BuiltModel {
    const rig = this.rig;
    const height = 1.9 * this.s;
    const U: FxUniforms = makeFxUniforms(height);
    if (this.ghost) { U.uBotuGhostColor.value.copy(this.ghost.color); U.uBotuGhostMin.value = this.ghost.min; }
    const lib = new MatLib(U, !!this.ghost);
    const bonesArr = BONES.map((b) => rig.bones[b]);
    const inverses = BONES.map((b) => new THREE.Matrix4().makeTranslation(-this.restRoot[b].x, -this.restRoot[b].y, -this.restRoot[b].z));
    const skeleton = new THREE.Skeleton(bonesArr as unknown as THREE.Bone[], inverses);
    const meshes: THREE.Mesh[] = [];
    const bs = new THREE.Vector3();
    const v = new THREE.Vector3();
    let tris = 0;
    const sphere = new THREE.Sphere(new THREE.Vector3(0, height * 0.5, 0), height * 0.85 * Math.max(1, this.bulk));
    for (const [key, list] of this.parts) {
      let nv = 0, ni = 0;
      for (const p of list) { nv += p.g.attributes.position.count; ni += p.g.index!.count; }
      if (ni === 0) continue;
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
      const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let ov = 0, oi = 0;
      // texture density per material family (UVs are authored metric: 1 unit = 1 m)
      const base = key.split('|')[0];
      const dens = base.startsWith('cloth_') ? 2.5 : base.startsWith('hair_') ? 2 : base === 'rope' ? 3 : base.startsWith('leather') ? 1.6 : 1;
      for (const p of list) {
        const pa = p.g.attributes.position, na = p.g.attributes.normal, ua = p.g.attributes.uv;
        this.boneScale(p.bone, bs);
        const rr = this.restRoot[p.bone];
        for (let i = 0; i < pa.count; i++) {
          v.set(pa.getX(i), pa.getY(i), pa.getZ(i));
          const k = ov + i;
          // skin weights from the reference-space position
          if (p.skin) {
            const w = p.skin(v);
            let tot = 0;
            const n = Math.min(4, w.length);
            for (let j = 0; j < n; j++) tot += w[j][1];
            for (let j = 0; j < n; j++) { si[k * 4 + j] = BONE_INDEX[w[j][0]]; sw[k * 4 + j] = tot > 0 ? w[j][1] / tot : 0; }
            if (tot <= 0) { si[k * 4] = BONE_INDEX[p.bone]; sw[k * 4] = 1; }
          } else { si[k * 4] = BONE_INDEX[p.bone]; sw[k * 4] = 1; }
          pos[k * 3] = v.x * bs.x + rr.x; pos[k * 3 + 1] = v.y * bs.y + rr.y; pos[k * 3 + 2] = v.z * bs.z + rr.z;
          // normals: inverse-transpose of the diagonal scale
          let nx = na.getX(i) / bs.x, ny = na.getY(i) / bs.y, nz = na.getZ(i) / bs.z;
          const l = Math.hypot(nx, ny, nz) || 1;
          nx /= l; ny /= l; nz /= l;
          nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
          uv[k * 2] = ua.getX(i) * dens; uv[k * 2 + 1] = ua.getY(i) * dens;
        }
        const ix = p.g.index!;
        for (let i = 0; i < ix.count; i++) idx[oi + i] = ix.getX(i) + ov;
        ov += pa.count; oi += ix.count;
        p.g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.boundingSphere = sphere.clone();
      tris += ni / 3;
      const mesh = new THREE.SkinnedMesh(geo, lib.get(key));
      mesh.name = `char:${key}`;
      mesh.bind(skeleton, new THREE.Matrix4());
      mesh.boundingSphere = sphere.clone();
      mesh.boundingBox = new THREE.Box3().setFromCenterAndSize(sphere.center, new THREE.Vector3(1, 1, 1).multiplyScalar(sphere.radius * 2));
      const emissiveOnly = key.startsWith('unlived_crack') || key.startsWith('bell_light') || key.startsWith('ember_glow');
      mesh.castShadow = !this.ghost && !emissiveOnly;
      mesh.receiveShadow = !this.ghost;
      rig.root.add(mesh);
      meshes.push(mesh);
    }
    this.parts.clear();

    // cloth
    const ctx: ClothContext = {
      rig,
      restRoot: this.restRoot,
      radiusScale: this.s * this.bulk,
      scaleLocal: (bone, p, out) => { this.boneScale(bone, bs); return out.set(p[0] * bs.x, p[1] * bs.y, p[2] * bs.z); },
    };
    const cloths = this.cloths.map((spec) => {
      const c = new Cloth(spec, ctx, lib.get(spec.mat), spec.decal ? lib.get(spec.decal.mat) : undefined);
      if (this.ghost) { c.mesh.castShadow = false; c.mesh.receiveShadow = false; }
      meshes.push(c.mesh);
      if (c.decalMesh) meshes.push(c.decalMesh);
      tris += triCount(c.mesh.geometry) * (c.decalMesh ? 2 : 1);
      return c;
    });

    let time = 0;
    let dissolve = 0;
    const shadowCasters = meshes.filter((m) => m.castShadow);
    const statusColors: Record<string, [number, number, number, number]> = {
      // r, g, b, pulse speed
      none: [0, 0, 0, 0],
      ward: [1.0, 0.82, 0.45, 5],
      iframes: [0.55, 0.36, 0.16, 0],
      burn: [1.0, 0.38, 0.08, 11],
      buff: [0.95, 0.62, 0.28, 3],
    };
    return {
      meshes,
      info: { triangles: Math.round(tris), meshes: meshes.length, cloths: cloths.length },
      updateSecondary(dt: number) {
        time += dt;
        U.uBotuTime.value = time;
        if (cloths.length) {
          rig.root.updateWorldMatrix(true, true);
          for (const c of cloths) c.update(dt);
        }
      },
      resetSecondary() {
        rig.root.updateWorldMatrix(true, true);
        for (const c of cloths) c.reset();
      },
      setDissolve(t: number) {
        dissolve = Math.min(1, Math.max(0, t));
        U.uBotuDissolve.value = dissolve;
        for (const m of shadowCasters) m.castShadow = dissolve < 0.02;
      },
      setFlash(t: number) { U.uBotuFlash.value = Math.min(1, Math.max(0, t)); },
      setStatusGlow(kind, t) {
        const c = statusColors[kind] ?? statusColors.none;
        const k = Math.min(1, Math.max(0, t));
        U.uBotuRim.value.setRGB(c[0] * k, c[1] * k, c[2] * k);
        U.uBotuPulse.value = c[3];
      },
      dispose() {
        for (const c of cloths) c.dispose();
        for (const m of meshes) { m.removeFromParent(); m.geometry.dispose(); }
        lib.dispose();
        skeleton.dispose();
      },
    };
  }
}

// ------------------------------------------------------------------------------------ skin fns

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Smooth trunk weights for geometry authored in HIPS space spanning pelvis → chest → neck:
 * hips below the waist, spine through the belly, chest above; neck/head at the very top.
 */
export const trunkSkin: SkinFn = (p) => {
  const y = p.y;
  const wSpine = sm(0.02, 0.14, y) * (1 - sm(0.24, 0.36, y));
  const wChest = sm(0.24, 0.36, y) * (1 - sm(0.56, 0.62, y));
  const wNeck = sm(0.56, 0.62, y);
  const wHips = 1 - sm(0.02, 0.14, y);
  return [['hips', wHips], ['spine', wSpine], ['chest', wChest], ['neck', wNeck]];
};

/**
 * Skirt / robe / tabard weights for geometry authored in HIPS space hanging below the waist:
 * the upper part follows the pelvis, lower down it follows the thighs (by side; the middle
 * averages both legs), and below the knees partly the shins so long robes swing with the stride.
 */
export function skirtSkin(opts: { spread?: number; shin?: number } = {}): SkinFn {
  const spread = opts.spread ?? 0.09;
  const shinK = opts.shin ?? 0.35;
  return (p) => {
    const down = sm(-0.02, -0.3, p.y);          // 0 at waist → 1 at mid-thigh
    const knee = sm(-0.46, -0.62, p.y) * shinK;  // below the knees
    const l = sm(-spread, spread, p.x);          // 0 = right leg, 1 = left leg
    const legs = down * 0.85;
    const w: [BoneName, number][] = [['hips', 1 - legs]];
    w.push(['thighL', legs * l * (1 - knee)], ['thighR', legs * (1 - l) * (1 - knee)]);
    if (knee > 0) {
      const sh = legs * knee;
      // shins share one slot each would exceed 4 influences; fold into the dominant side
      if (l >= 0.5) w.push(['shinL', sh]); else w.push(['shinR', sh]);
    }
    return w;
  };
}

/** Blend across a joint: authoring bone above, `child` below `y0 → y1` (bone-local, y1 < y0). */
export function jointSkin(bone: BoneName, child: BoneName, y0: number, y1: number, maxChild = 0.5): SkinFn {
  return (p) => {
    const t = sm(y0, y1, p.y) * maxChild;
    return [[bone, 1 - t], [child, t]];
  };
}

/** Blend from a parent (at the top of the part) into the authoring bone: for shoulders / hips seams. */
export function parentSkin(bone: BoneName, parent: BoneName, y0: number, y1: number, maxParent = 0.5): SkinFn {
  return (p) => {
    const w = sm(y1, y0, p.y) * maxParent; // y0 top (parent-weighted) → y1 lower (own bone)
    return [[bone, 1 - w], [parent, w]];
  };
}

export type { V3 };
