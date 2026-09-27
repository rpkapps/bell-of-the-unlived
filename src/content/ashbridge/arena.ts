/**
 * Commander's Yard (boss arena): a flat circular yard centred (4, 8, -166), radius 16, enclosed by a
 * blind-arcaded ring wall with four turrets. South entrance with the fog gate; Corvane's
 * bell-standard at the north edge (shatters on set(1)); the central floor (r < 8) cracks and falls
 * away on the battlefield reveal, exposing the impossible battlefield 68 m below.
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import type { Collider } from '../../world/Collision';
import { getMaterial } from '../../render/materials';
import {
  Kit, crenellation, towerRound, brazier, ringSector, cyl, standardBanner, extrudeXY, archPoints, mergeSimple, rubble,
} from '../../world/kit';
import { Rng } from '../../core/rng';
import { type AreaCtx, newKit, anchor, PLAN, YAW_N, YAW_S } from './common';
import { buildBattlefield, type Battlefield } from './battlefield';

export interface ArenaBuild {
  fogGate: DynamicPiece & { anchor: Anchor; enterTo: Anchor };
  arenaCenter: THREE.Vector3;
  arenaRadius: number;
  arenaEntry: Anchor;
  anchorBell: DynamicPiece;
  battlefieldReveal: DynamicPiece;
  battlefield: Battlefield;
  brannoc: Anchor;
  enemies: EnemySpawn[];
}

const HOLE_R = 8.05;
const RINGS: { r0: number; r1: number; n: number }[] = [{ r0: 0, r1: 2.6, n: 5 }, { r0: 2.6, r1: 5.3, n: 10 }, { r0: 5.3, r1: HOLE_R, n: 16 }];

export function buildArena(ctx: AreaCtx): ArenaBuild {
  const k = newKit(ctx, 'arena', 81);
  const C = PLAN.arena.c, R = PLAN.arena.r, Y = C.y;
  const rIn = R, rOut = R + 1.5, wallTop = Y + 6;
  const col = ctx.shared.collision;

  // ---------------------------------------------------------------- floor ring (static) r ∈ [8.05, 17.6]
  const ringShape = new THREE.Shape().absarc(0, 0, rOut + 0.1, 0, Math.PI * 2, false);
  ringShape.holes.push(new THREE.Path().absarc(0, 0, HOLE_R, 0, Math.PI * 2, true));
  const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: 1, bevelEnabled: false, curveSegments: 48 });
  ringGeo.rotateX(Math.PI / 2); // XY → XZ, extrusion goes down (-Y)
  k.add('flagstone', ringGeo.clone(), { x: C.x, y: Y, z: C.z }, { cast: false });
  k.colGeo(ringGeo, { x: C.x, y: Y, z: C.z }, 'stone');
  // inlays: a trim kerb around the (future) hole and a band near the wall
  k.add('stone_trim', ringSector(HOLE_R, HOLE_R + 0.5, 0, Math.PI * 2 - 0.001, 0.02, 48), { x: C.x, y: Y + 0.012, z: C.z }, { cast: false });
  k.add('stone_trim', ringSector(R - 1.1, R - 0.6, 0, Math.PI * 2 - 0.001, 0.02, 48), { x: C.x, y: Y + 0.012, z: C.z }, { cast: false });
  // terrace base below the yard (seen from outside)
  k.add('stone_dark', cyl(rOut + 0.4, rOut + 0.9, Y + 2, 32, true), { x: C.x, y: -2, z: C.z }, { receive: false });

  // ---------------------------------------------------------------- ring wall with the south entrance
  const segN = 28;
  const gapHalf = Math.asin(3.0 / (rIn + 0.75));
  const southPhi = Math.PI / 2; // φ measured from +X toward +Z (south)
  const span = Math.PI * 2 - gapHalf * 2;
  for (let i = 0; i < segN; i++) {
    const a0 = southPhi + gapHalf + (span * i) / segN, a1 = southPhi + gapHalf + (span * (i + 1)) / segN;
    const am = (a0 + a1) / 2;
    const chord = 2 * rOut * Math.sin((a1 - a0) / 2) + 0.25;
    const rm = (rIn + rOut) / 2 + 0.02;
    const x = C.x + Math.cos(am) * rm, z = C.z + Math.sin(am) * rm;
    const yaw = Math.atan2(-Math.cos(am), -Math.sin(am)); // local +Z toward the centre, local +X tangent
    k.push(x, Y, z, yaw);
    k.bmm('stone_wall', -chord / 2, 0, -0.75, chord / 2, 6, 0.75);
    k.solid(-chord / 2 - 0.05, 0, -0.75 + 0.02, chord / 2 + 0.05, 8, 0.75);
    // blind arch on the inner face + engaged column at the joint
    const aw = chord * 0.62;
    const outline: [number, number][] = [[-aw / 2, 0.4], [aw / 2, 0.4], [aw / 2, 3.2], ...archPoints(-aw / 2, aw / 2, 3.2, 'pointed', aw * 0.7).reverse(), [-aw / 2, 3.2]];
    k.add('stone_dark', extrudeXY(outline, 0.08), { z: 0.76 }, { cast: false });
    k.add('stone_trim', cyl(0.36, 0.4, 5.2, 8), { x: chord / 2 - 0.1, y: 0.3, z: 0.62 });
    k.box('stone_trim', chord / 2 - 0.1, 0.15, 0.62, 0.95, 0.3, 0.95, { cast: false });
    k.box('stone_trim', chord / 2 - 0.1, 5.6, 0.62, 0.95, 0.3, 0.95, { cast: false });
    k.bmm('stone_trim', -chord / 2, 5.7, -0.85, chord / 2, 6, 0.85, { cast: false });
    k.pop();
    // crenellation on the outer edge
    const ox0 = C.x + Math.cos(a0) * (rOut - 0.3), oz0 = C.z + Math.sin(a0) * (rOut - 0.3);
    const ox1 = C.x + Math.cos(a1) * (rOut - 0.3), oz1 = C.z + Math.sin(a1) * (rOut - 0.3);
    crenellation(k, 'stone_wall', ox0, oz0, ox1, oz1, wallTop, 0.6, { col: false, base: 0.5, merlonH: 0.8 });
  }
  // entrance jambs (the fog sits between them) and a lintel arch
  for (const sx of [-1, 1]) {
    const jx = C.x + sx * 3.0;
    k.bmm('stone_wall', jx - 0.5, Y, -150.9, jx + 0.5, Y + 7, -148.1, { col: true });
    k.bmm('stone_trim', jx - 0.6, Y + 5.6, -151.0, jx + 0.6, Y + 6, -148.0, { cast: false });
  }
  k.bmm('stone_wall', C.x - 2.6, Y + 5.6, -150.9, C.x + 2.6, Y + 7, -148.1, { col: true });
  // turrets
  for (const phi of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) towerRound(k, 'stone_wall', C.x + Math.cos(phi) * (rOut + 0.8), -2, C.z + Math.sin(phi) * (rOut + 0.8), 2.4, Y + 12, 6.5);
  // braziers east & west (two lights), banners on standards
  brazier(k, C.x + 14.6, Y, C.z, true, 1.1);
  brazier(k, C.x - 14.6, Y, C.z, true, 1.1);
  k.light(0xff9c50, 12, 18, C.x + 14.6, Y + 2, C.z, 0.9);
  k.light(0xff9c50, 12, 18, C.x - 14.6, Y + 2, C.z, 0.9);
  standardBanner(k, C.x - 5.2, Y, C.z - 13.4, 0.3, 6, 1.3, 3.0);
  standardBanner(k, C.x + 5.2, Y, C.z - 13.4, -0.3, 6, 1.3, 3.0);
  rubble(k, C.x + 11.5, Y, C.z + 9.5, 0.6, false);

  // ---------------------------------------------------------------- dynamic pieces
  const fogGate = buildFogGate(ctx, C.x, Y, -149.5);
  const anchorBell = buildBellStandard(ctx, k, C.x, Y, C.z - 14.2);
  const battlefield = buildBattlefield(ctx.shared, ctx.dynamicRoot, C, -60);
  const reveal = buildReveal(ctx, C, battlefield, col ? { col } : null);

  return {
    fogGate,
    arenaCenter: C.clone(),
    arenaRadius: R,
    arenaEntry: anchor(C.x, Y, -147.0, YAW_N),
    anchorBell,
    battlefieldReveal: reveal,
    battlefield,
    brannoc: anchor(C.x, Y, C.z + 9.1, YAW_S),
    enemies: [{ id: 'ash_boss_corvane', kind: 'commander', anchor: anchor(C.x, Y, C.z - 5.5, YAW_S), leash: R + 2, idleAnim: 'stand' }],
  };
}

/** The fog gate: three layered veils (shared 'fog_veil' material) + a blocking collider. */
function buildFogGate(ctx: AreaCtx, x: number, y: number, z: number): DynamicPiece & { anchor: Anchor; enterTo: Anchor } {
  const root = new THREE.Group();
  root.name = 'fogGate';
  ctx.dynamicRoot.add(root);
  const mat = getMaterial('fog_veil');
  const W = 5.4, H = 5.8;
  const layers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), mat);
    m.position.set(x, y + H / 2, z + (i - 1) * 0.28);
    m.renderOrder = 7;
    root.add(m);
    layers.push(m);
  }
  const c = ctx.shared.collision?.addDynamicBox('ashbridge:fogGate', [W, H, 0.7], 'stone');
  c?.setMatrix(new THREE.Matrix4().makeTranslation(x, y + H / 2, z));
  const piece = {
    object: root,
    collider: c,
    anchor: anchor(x, y, z + 1.9, YAW_N),
    enterTo: anchor(x, y, z - 2.2, YAW_N),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      layers.forEach((m, i) => {
        const k = Math.max(0.001, 1 - e * (1 + i * 0.15));
        m.scale.set(1 + e * 0.15, k, 1);
        m.position.y = y + (H / 2) * k;
      });
      root.visible = e < 0.999;
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/** Corvane's bell-standard: oak frame, crossbeam, great bronze bell. set(1) = shattered. */
function buildBellStandard(ctx: AreaCtx, k: Kit, x: number, y: number, z: number): DynamicPiece {
  // plinth (static, collider)
  k.bmm('stone_trim', x - 2.4, y, z - 1.1, x + 2.4, y + 0.6, z + 1.1, { col: true });
  k.bmm('stone_wall', x - 2.2, y + 0.6, z - 0.9, x + 2.2, y + 0.75, z + 0.9);
  const root = new THREE.Group();
  root.name = 'anchorBell';
  ctx.dynamicRoot.add(root);
  const wood = getMaterial('timber_dark'), iron = getMaterial('iron'), bronze = getMaterial('bronze_bell'), glowMat = getMaterial('unlived_crack');
  const posts: THREE.Group[] = [];
  const beams: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const post = new THREE.Group();
    post.position.set(x + s * 1.7, y + 0.75, z);
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 7.2, 0.42).translate(0, 3.6, 0), wood);
    pm.castShadow = true;
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46).translate(0, 1.2, 0), iron);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46).translate(0, 6.4, 0), iron);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2).translate(0, 1.3, 0), wood);
    strut.position.set(s * 0.9, 0, 0); strut.rotation.z = s * 0.45;
    post.add(pm, band1, band2, strut);
    root.add(post);
    posts.push(post);
    // half crossbeam pivoting at the post top (breaks in the middle when shattered)
    const hb = new THREE.Group();
    hb.position.set(x + s * 1.7, y + 0.75 + 7.0, z);
    const bm = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 0.45).translate(-s * 0.95, 0, 0), wood);
    bm.castShadow = true;
    hb.add(bm);
    root.add(hb);
    beams.push(hb);
  }
  // the bell as 6 wedge fragments around its axis (pivot = hanging point)
  const hang = new THREE.Vector3(x, y + 0.75 + 6.8, z);
  const bellH = 1.9;
  const frags: { g: THREE.Group; phi: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const phi0 = (i / 6) * Math.PI * 2;
    const r = bellH * 0.62;
    const prof = [[r * 0.94, -bellH], [r * 1.0, -bellH * 0.97], [r * 0.93, -bellH * 0.9], [r * 0.78, -bellH * 0.72], [r * 0.64, -bellH * 0.5], [r * 0.58, -bellH * 0.3], [r * 0.55, -bellH * 0.16], [r * 0.46, -bellH * 0.07], [r * 0.25, -bellH * 0.02], [0.001, 0]]
      .map(([a, b]) => new THREE.Vector2(a, b));
    const geo = new THREE.LatheGeometry(prof, 5, phi0, Math.PI / 3);
    const g = new THREE.Group();
    g.position.copy(hang);
    const mesh = new THREE.Mesh(geo, bronze);
    mesh.castShadow = true;
    g.add(mesh);
    // glowing crack along the fragment's leading seam
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, bellH * 0.9, 0.04), glowMat);
    const sp = phi0;
    seam.position.set(Math.sin(sp) * r * 0.82, -bellH * 0.52, Math.cos(sp) * r * 0.82);
    seam.rotation.z = 0.1;
    seam.name = 'crack';
    g.add(seam);
    root.add(g);
    frags.push({ g, phi: phi0 + Math.PI / 6 });
  }
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), iron);
  yoke.position.copy(hang).add(new THREE.Vector3(0, 0.15, 0));
  root.add(yoke);
  const q = new THREE.Quaternion(), axis = new THREE.Vector3();
  const ground = y + 0.8;
  const piece: DynamicPiece = {
    object: root,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      const u = Math.min(1, Math.max(0, (e - 0.25) / 0.75));
      for (const f of frags) {
        const crack = f.g.getObjectByName('crack');
        if (crack) crack.visible = e > 0.001;
        const fall = Math.min(1, (u * 1.7) ** 2);
        const dx = Math.sin(f.phi), dz = Math.cos(f.phi);
        f.g.position.set(hang.x + dx * u * 2.4, hang.y - (hang.y - ground - 0.3) * fall, hang.z + dz * u * 2.4);
        axis.set(dz, 0, -dx);
        q.setFromAxisAngle(axis, u * 1.9);
        f.g.quaternion.copy(q);
        // a tiny tremor before it breaks
        if (e > 0 && e < 0.25) f.g.position.x += Math.sin(e * 180 + f.phi * 3) * 0.02;
      }
      yoke.visible = u < 0.05;
      beams.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * -u * 0.95; });
      posts.forEach((p, i) => { p.rotation.z = (i ? -1 : 1) * u * 0.07; });
    },
  };
  piece.set(0);
  return piece;
}

/**
 * Battlefield reveal. t: 0 intact · 0–0.15 gold cracks spread, floor trembles · 0.12+ floor
 * collider off, ring barrier on · 0.12–1 chunks fall (centre first) onto the plain far below.
 */
function buildReveal(ctx: AreaCtx, C: THREE.Vector3, bf: Battlefield, c: { col: import('../../world/Collision').CollisionWorld } | null): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'battlefieldReveal';
  ctx.dynamicRoot.add(root);
  const rng = new Rng(6060);
  const Y = C.y;
  // chunk instances per ring
  interface Chunk { im: THREE.InstancedMesh; idx: number; theta: number; off: THREE.Vector3; delay: number; axis: THREE.Vector3; spin: number; drift: THREE.Vector3 }
  const chunks: Chunk[] = [];
  const mat = getMaterial('flagstone');
  for (const [ri, ring] of RINGS.entries()) {
    const a = (Math.PI * 2) / ring.n;
    const geo = ringSector(ring.r0 + 0.03, ring.r1 - 0.03, 0.012, a - 0.012, 0.9, ri === 0 ? 3 : 4);
    const im = new THREE.InstancedMesh(geo, mat, ring.n);
    im.castShadow = true; im.receiveShadow = true;
    im.name = `revealChunks${ri}`;
    root.add(im);
    for (let j = 0; j < ring.n; j++) {
      const theta = j * a + (ri % 2) * a * 0.5;
      const rm = (ring.r0 + ring.r1) / 2, am = theta + a / 2;
      chunks.push({
        im, idx: j, theta,
        off: new THREE.Vector3(Math.cos(am) * rm, 0, -Math.sin(am) * rm),
        delay: 0.12 + ri * 0.1 + rng.range(0, 0.12),
        axis: new THREE.Vector3(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize(),
        spin: rng.range(1.5, 4.5),
        drift: new THREE.Vector3(rng.range(-3, 3), 0, rng.range(-3, 3)),
      });
    }
  }
  // gold crack lines across the disc (visible while it breaks)
  const crackParts: THREE.BufferGeometry[] = [];
  for (const ring of RINGS) {
    const a = (Math.PI * 2) / ring.n;
    for (let j = 0; j < ring.n; j++) {
      const th = j * a;
      const len = ring.r1 - ring.r0, rm = (ring.r0 + ring.r1) / 2;
      crackParts.push(new THREE.BoxGeometry(len, 0.03, 0.06).rotateY(th).translate(Math.cos(th) * rm, 0, -Math.sin(th) * rm));
    }
    for (let j = 0; j < 24; j++) {
      const th = (j / 24) * Math.PI * 2, arc = (Math.PI * 2 * ring.r1) / 24;
      crackParts.push(new THREE.BoxGeometry(0.06, 0.03, arc + 0.05).rotateY(th).translate(Math.cos(th) * ring.r1, 0, -Math.sin(th) * ring.r1));
    }
  }
  const cracks = new THREE.Mesh(mergeSimple(crackParts), getMaterial('unlived_crack'));
  cracks.position.set(C.x, Y + 0.012, C.z);
  root.add(cracks);
  // the shaft's rock walls (inside-facing), visible once open
  const shaftGeo = insideOut(new THREE.CylinderGeometry(HOLE_R, HOLE_R + 1.2, 7, 28, 3, true));
  const pos = shaftGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const n = Math.sin(pos.getY(i) * 1.7 + Math.atan2(pos.getX(i), pos.getZ(i)) * 5) * 0.25;
    pos.setXYZ(i, pos.getX(i) * (1 + n * 0.04), pos.getY(i), pos.getZ(i) * (1 + n * 0.04));
  }
  shaftGeo.computeVertexNormals();
  const shaft = new THREE.Mesh(shaftGeo, getMaterial('rock_cliff'));
  shaft.position.set(C.x, Y - 3.55, C.z);
  root.add(shaft);
  // colliders: the solid centre floor (on until it breaks) and a ring barrier around the hole
  let floorCol: Collider | undefined, barrier: Collider | undefined;
  if (c) {
    const fg = new THREE.CylinderGeometry(HOLE_R + 0.05, HOLE_R + 0.05, 1, 32);
    floorCol = c.col.addDynamicGeometry('ashbridge:arenaCentre', fg, 'stone');
    floorCol.setMatrix(new THREE.Matrix4().makeTranslation(C.x, Y - 0.5, C.z));
    const bg = new THREE.CylinderGeometry(HOLE_R + 0.45, HOLE_R + 0.45, 3.2, 32, 1, true);
    barrier = c.col.addDynamicGeometry('ashbridge:arenaHoleBarrier', bg, 'stone');
    barrier.setMatrix(new THREE.Matrix4().makeTranslation(C.x, Y + 1.6, C.z));
  }
  const m = new THREE.Matrix4(), T = new THREE.Matrix4(), Rt = new THREE.Matrix4(), Ry = new THREE.Matrix4(), Tb = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const drop = Y - (-60) + 1.5;
  const piece: DynamicPiece = {
    object: root,
    collider: floorCol,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      bf.group.visible = e > 0.08;
      shaft.visible = e > 0.08;
      cracks.visible = e > 0.001 && e < 0.6;
      cracks.scale.setScalar(Math.min(1, 0.2 + e * 7));
      for (const ch of chunks) {
        const u = Math.min(1, Math.max(0, (e - ch.delay) / 0.45));
        const f = u * u;
        const tremor = e > 0 && u === 0 ? Math.sin(e * 240 + ch.theta * 7) * 0.025 : 0;
        T.makeTranslation(C.x + ch.off.x + ch.drift.x * u, Y - drop * f + tremor, C.z + ch.off.z + ch.drift.z * u);
        q.setFromAxisAngle(ch.axis, ch.spin * u);
        Rt.makeRotationFromQuaternion(q);
        Tb.makeTranslation(-ch.off.x, 0, -ch.off.z);
        Ry.makeRotationY(ch.theta);
        m.copy(T).multiply(Rt).multiply(Tb).multiply(Ry);
        ch.im.setMatrixAt(ch.idx, m);
      }
      for (const im of new Set(chunks.map((c2) => c2.im))) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
      if (floorCol) floorCol.enabled = e < 0.12;
      if (barrier) barrier.enabled = e > 0;
    },
  };
  piece.set(0);
  return piece;
}

/** Reverse triangle winding and normals so a closed-looking surface is seen from inside. */
function insideOut(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  const p = n.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 3) {
    for (const att of Object.values(n.attributes) as THREE.BufferAttribute[]) {
      for (let c = 0; c < att.itemSize; c++) {
        const a = att.getComponent(i + 1, c), b = att.getComponent(i + 2, c);
        att.setComponent(i + 1, c, b); att.setComponent(i + 2, c, a);
      }
    }
  }
  n.computeVertexNormals();
  return n;
}

export const ARENA_ZONE = new THREE.Box3(new THREE.Vector3(-13, 6, -183), new THREE.Vector3(21, 22, -150));
