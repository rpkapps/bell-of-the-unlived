/**
 * Processions: slow reliquary processions that walk fixed routes through the streets, up the Pilgrim
 * Stair and down the nave. They do not stop for anyone: touching one knocks the Returned down (the
 * region resolves the hit). Each is a group of simple robed figures (one vertex-coloured mesh per
 * figure) — a lantern-bearer, four bearers under a litter with a gilt reliquary, and two mourners
 * who are the same woman walking twice.
 *
 * Also the falling snow (a camera-following point field, hidden indoors).
 */
import * as THREE from 'three';
import { getMaterial } from '../../render/materials';
import { Rng } from '../../core/rng';
import type { AreaCtx } from './levelCommon';

export interface Procession {
  id: string;
  group: THREE.Group;
  /** Route (ping-pong), world points on the ground. */
  path: THREE.Vector3[];
  speed: number;
  /** Current position/heading (world). */
  pos: THREE.Vector3;
  heading: number;
  /** Footprint in the procession's local frame (+Z forward). */
  zFront: number; zBack: number; halfWidth: number;
  running: boolean;
  /** Advance along the route (simulation time). */
  step(dt: number): void;
  /** Visual bob/sway (render time). */
  animate(time: number): void;
  /** Is a world point inside the footprint (padded)? */
  hits(p: THREE.Vector3, pad: number): boolean;
  /** World position of the twice-walking mourner (for the inspect prompt). */
  twicePos(): THREE.Vector3;
}

let VC_MAT: THREE.MeshStandardMaterial | null = null;
const vcMat = () => (VC_MAT ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.05 }));

function colorize(g: THREE.BufferGeometry, hex: number) {
  const n = g.attributes.position.count;
  const c = new THREE.Color(hex).convertSRGBToLinear();
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
function merge(parts: THREE.BufferGeometry[]) {
  const list = parts.map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') x.deleteAttribute(k); return x; });
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.color) col.set(g.attributes.color.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

/** A robed, hooded figure (height ~1.85), feet at the origin, facing +Z. */
function figure(robe: number, hood: number, opts: { arms?: 'forward' | 'up' | 'down'; hunched?: number; hoodPoint?: boolean; scale?: number } = {}) {
  const s = opts.scale ?? 1, hu = opts.hunched ?? 0;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(colorize(new THREE.CylinderGeometry(0.19 * s, 0.4 * s, 1.3 * s, 10).translate(0, 0.65 * s, 0), robe));
  parts.push(colorize(new THREE.CylinderGeometry(0.2 * s, 0.21 * s, 0.34 * s, 10).translate(0, 1.44 * s, 0.02 + hu), robe));
  parts.push(colorize(new THREE.SphereGeometry(0.23 * s, 10, 8).scale(1, 1.05, 1.15).translate(0, 1.66 * s, 0.03 + hu * 1.4), hood));
  parts.push(colorize(new THREE.ConeGeometry(0.2 * s, opts.hoodPoint ? 0.5 * s : 0.26 * s, 8).rotateX(-0.5).translate(0, 1.8 * s, -0.12 * s + hu), hood));
  parts.push(colorize(new THREE.CircleGeometry(0.13 * s, 8).translate(0, 1.64 * s, 0.26 * s + hu * 1.4), 0x0a0908));
  parts.push(colorize(new THREE.CylinderGeometry(0.22 * s, 0.26 * s, 0.4 * s, 10).translate(0, 1.2 * s, 0), hood));
  if (opts.arms === 'up') for (const sx of [-1, 1]) parts.push(colorize(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.62 * s, 6).translate(0, 0.31 * s, 0).rotateX(-0.2).rotateZ(sx * 0.2).translate(sx * 0.26 * s, 1.36 * s, 0.05), robe));
  else for (const sx of [-1, 1]) parts.push(colorize(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.55 * s, 6).translate(0, -0.27 * s, 0).rotateX(opts.arms === 'forward' ? -1.1 : -0.3).translate(sx * 0.24 * s, 1.5 * s, 0.05 + hu), robe));
  return merge(parts);
}

/** The litter: poles, platform, and a gilt reliquary with a bell inside. */
function litter() {
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) parts.push(colorize(new THREE.BoxGeometry(0.1, 0.1, 3.6).translate(sx * 0.62, 1.55, 0), 0x3a2a1e));
  parts.push(colorize(new THREE.BoxGeometry(1.2, 0.12, 1.9).translate(0, 1.6, 0), 0x4a3424));
  parts.push(colorize(new THREE.BoxGeometry(0.9, 0.7, 1.2).translate(0, 2.02, 0), 0xb08a40));
  parts.push(colorize(new THREE.ConeGeometry(0.72, 0.7, 4).rotateY(Math.PI / 4).scale(1, 1, 1.35).translate(0, 2.72, 0), 0x9a7a38));
  for (const [x, z] of [[-0.42, -0.58], [0.42, -0.58], [-0.42, 0.58], [0.42, 0.58]]) parts.push(colorize(new THREE.ConeGeometry(0.06, 0.5, 5).translate(x, 2.62, z), 0xc8a050));
  parts.push(colorize(new THREE.CylinderGeometry(0.5, 0.56, 0.08, 12).translate(0, 1.7, 0), 0xe8e0d0));
  // a heavy pall hanging from the litter's sides
  for (const sx of [-1, 1]) parts.push(colorize(new THREE.BoxGeometry(0.03, 0.55, 1.9).translate(sx * 0.6, 1.3, 0), 0xd8d0c0));
  return merge(parts);
}

function lanternPole(h = 2.6) {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(colorize(new THREE.CylinderGeometry(0.025, 0.03, h, 5).translate(0, h / 2, 0), 0x2a2018));
  parts.push(colorize(new THREE.BoxGeometry(0.22, 0.3, 0.22).translate(0, h + 0.1, 0), 0x2a2a2a));
  return merge(parts);
}


export function buildProcession(ctx: AreaCtx, id: string, path: THREE.Vector3[], speed: number, seed: number): Procession {
  const rng = new Rng(seed);
  const group = new THREE.Group();
  group.name = 'procession:' + id;
  ctx.dynamicRoot.add(group);
  const glowParts: THREE.BufferGeometry[] = [];
  const bodyParts: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, x: number, z: number, yaw = 0) => { bodyParts.push(geo.clone().rotateY(yaw).translate(x, 0, z)); };
  const ROBES = [0x6e665c, 0x5a544e, 0x7a6e60, 0x4e4a46];
  // the lantern-bearer (a cantor in white) at the front
  add(figure(0xd8d2c4, 0xe8e2d6, { arms: 'forward' }), 0, 2.7);
  bodyParts.push(lanternPole().rotateX(0.15).translate(-0.25, 0.9, 3.0));
  glowParts.push(new THREE.SphereGeometry(0.09, 8, 6).translate(-0.25, 3.62, 3.42));
  // four bearers under the litter
  for (const [x, z] of [[-0.62, 1.05], [0.62, 1.05], [-0.62, -1.05], [0.62, -1.05]] as const) add(figure(rng.pick(ROBES), 0x8a8276, { arms: 'up', hunched: 0.04 }), x, z);
  add(litter(), 0, 0);
  glowParts.push(new THREE.BoxGeometry(0.5, 0.36, 0.02).translate(0, 2.0, 0.61));
  for (let i = 0; i < 5; i++) glowParts.push(new THREE.SphereGeometry(0.035, 5, 4).translate(-0.35 + i * 0.17, 1.72, 0.7 - (i % 2) * 1.3));
  // the same woman, twice: identical figures, identical lanterns, four paces apart
  const twice = figure(0x3e3a38, 0x6a625a, { arms: 'forward', hunched: 0.08 });
  for (const z of [-2.6, -4.6]) {
    add(twice, 0.1, z);
    bodyParts.push(lanternPole(1.2).translate(0.35, 0.8, z + 0.35));
    glowParts.push(new THREE.SphereGeometry(0.07, 8, 6).translate(0.35, 2.12, z + 0.35));
  }
  const body = new THREE.Mesh(merge(bodyParts), vcMat());
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  // glows (one mesh, riding with the group; the figures bob a little under them — fine at distance)
  const glowGeo = merge(glowParts.map((g) => colorize(g, 0xffffff)));
  const glow = new THREE.Mesh(glowGeo, getMaterial('bell_light'));
  group.add(glow);

  // ---- route following (ping-pong with a pause and a slow turn at each end)
  const segLen: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) { const l = path[i].distanceTo(path[i + 1]); segLen.push(l); total += l; }
  let s = 0, dir = 1, pause = 0, turnFrom = 0;
  const pos = path[0].clone();
  const at = (d: number, out: THREE.Vector3) => {
    let acc = 0;
    for (let i = 0; i < segLen.length; i++) {
      if (d <= acc + segLen[i] || i === segLen.length - 1) { const t = Math.min(1, Math.max(0, (d - acc) / segLen[i])); return out.lerpVectors(path[i], path[i + 1], t); }
      acc += segLen[i];
    }
    return out.copy(path[path.length - 1]);
  };
  const ahead = new THREE.Vector3();
  const proc: Procession = {
    id, group, path, speed, pos, heading: 0,
    zFront: 3.2, zBack: -5.1, halfWidth: 1.05,
    running: true,
    step(dt: number) {
      if (!proc.running) return;
      if (pause > 0) {
        pause -= dt;
        // turn in place during the second half of the pause
        const k = Math.min(1, Math.max(0, 1 - pause / 2.5));
        proc.heading = turnFrom + Math.PI * k;
        return;
      }
      s += dir * speed * dt;
      if (s >= total || s <= 0) { s = Math.min(total, Math.max(0, s)); dir = -dir as 1 | -1; pause = 4.5; turnFrom = proc.heading; }
      at(s, pos);
      at(Math.min(total, Math.max(0, s + dir * 0.5)), ahead);
      if (ahead.distanceToSquared(pos) > 1e-6 && pause <= 0) proc.heading = Math.atan2(ahead.x - pos.x, ahead.z - pos.z);
    },
    animate(time: number) {
      group.position.copy(pos);
      group.rotation.y = proc.heading;
      const walking = proc.running && pause <= 0;
      const w = walking ? 1 : 0.15;
      body.position.y = Math.abs(Math.sin(time * 2.4)) * 0.045 * w;
      body.rotation.z = Math.sin(time * 1.2) * 0.012 * w;
      glow.position.y = body.position.y;
    },
    hits(p: THREE.Vector3, pad: number) {
      const dx = p.x - pos.x, dz = p.z - pos.z;
      if (p.y < pos.y - 1.2 || p.y > pos.y + 2.6) return false;
      const c = Math.cos(proc.heading), sn = Math.sin(proc.heading);
      const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      return Math.abs(lx) < proc.halfWidth + pad && lz < proc.zFront + pad && lz > proc.zBack - pad;
    },
    twicePos() { return new THREE.Vector3(0.1, 0, -3.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), proc.heading).add(pos); },
  };
  at(0, pos);
  at(0.5, ahead);
  proc.heading = Math.atan2(ahead.x - pos.x, ahead.z - pos.z);
  proc.animate(0);
  return proc;
}

// ------------------------------------------------------------------------------------ snowfall

export interface Snowfall { points: THREE.Points; update(dt: number, camera: THREE.Camera): void }

/** Camera-following falling snow; `indoors(p)` hides it where there is a roof. */
export function buildSnowfall(parent: THREE.Object3D, count: number, indoors: (p: THREE.Vector3) => boolean): Snowfall {
  const R = 22, Hh = 16;
  const pos = new Float32Array(count * 3);
  const rng = new Rng(77);
  for (let i = 0; i < count; i++) { pos[i * 3] = rng.range(-R, R); pos[i * 3 + 1] = rng.range(-4, Hh); pos[i * 3 + 2] = rng.range(-R, R); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const N = 16, data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - (N - 1) / 2, y - (N - 1) / 2) / (N / 2);
    const a = Math.max(0, 1 - d) ** 1.5;
    data.set([255, 255, 255, Math.round(a * 255)], (y * N + x) * 4);
  }
  const flake = new THREE.DataTexture(data, N, N);
  flake.needsUpdate = true;
  const mat = new THREE.PointsMaterial({ color: 0xf2f4f8, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, fog: true, map: flake, alphaTest: 0.02 });
  const points = new THREE.Points(g, mat);
  points.name = 'snowfall';
  points.frustumCulled = false;
  parent.add(points);
  const origin = new THREE.Vector3();
  let t = 0;
  return {
    points,
    update(dt: number, camera: THREE.Camera) {
      t += dt;
      camera.getWorldPosition(origin);
      const inside = indoors(origin);
      points.visible = !inside;
      if (inside) return;
      const a = g.attributes.position as THREE.BufferAttribute;
      const arr = a.array as Float32Array;
      const wind = Math.sin(t * 0.3) * 0.4 + 0.3;
      for (let i = 0; i < count; i++) {
        let x = arr[i * 3] + (wind + Math.sin(t * 1.3 + i) * 0.25) * dt, y = arr[i * 3 + 1] - (0.9 + (i % 7) * 0.08) * dt, z = arr[i * 3 + 2] + Math.cos(t * 1.1 + i * 0.7) * 0.2 * dt;
        if (y < -4) y += Hh + 4;
        // wrap around the camera
        const wx = x + points.position.x - origin.x, wz = z + points.position.z - origin.z;
        if (wx > R) x -= 2 * R; else if (wx < -R) x += 2 * R;
        if (wz > R) z -= 2 * R; else if (wz < -R) z += 2 * R;
        arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
      }
      a.needsUpdate = true;
      points.position.set(0, origin.y - 6, 0);
    },
  };
}
