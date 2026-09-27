/**
 * The Undervaults — dynamic pieces: fog veils, the weigh-gate portcullis, levers and winches, the
 * rotating round vault door, the counterweight scale bridge, the debtors' cage, the hoard grate,
 * chests, and the Treasury Great Bell's anchor (a gilded lock-yoke that shatters and falls down
 * the tower shaft). Every piece's `set(t)` is idempotent and instant for t ∈ [0, 1].
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece } from '../../world/levelTypes';
import { getMaterial } from '../../render/materials';
import { bellGeo } from '../../world/kit';
import { type AreaCtx, anchor } from './levelPlan';

type Piece = DynamicPiece & { anchor: Anchor };
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const mesh = (g: THREE.BufferGeometry, mat: THREE.Material, cast = true) => { const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
const M = (id: Parameters<typeof getMaterial>[0]) => getMaterial(id);

/** Local (x, z) rotated by yaw, added to a world origin. */
function place(o: THREE.Vector3, yaw: number, lx: number, ly: number, lz: number) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  return new THREE.Vector3(o.x + lx * c + lz * s, o.y + ly, o.z - lx * s + lz * c);
}

/** Boss veil: three layered planes + a blocking collider. The front (anchor side) is local +Z. */
export function fogGate(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, W = 5, H = 5.6): Piece & { enterTo: Anchor } {
  const root = new THREE.Group();
  root.name = id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const layers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), M('fog_veil'));
    m.position.set(0, H / 2, (i - 1) * 0.28);
    m.renderOrder = 7;
    root.add(m);
    layers.push(m);
  }
  const c = ctx.shared.collision?.addDynamicBox(id, [W, H, 0.7], 'stone');
  c?.setMatrix(new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y + H / 2, z));
  const o = new THREE.Vector3(x, y, z);
  const front = place(o, yaw, 0, 0, 1.9), inside = place(o, yaw, 0, 0, -2.3);
  const piece = {
    object: root,
    collider: c,
    anchor: { pos: front, yaw: yaw + Math.PI },
    enterTo: { pos: inside, yaw: yaw + Math.PI },
    set(t: number) {
      const e = clamp01(t);
      layers.forEach((m, i) => {
        const k = Math.max(0.001, 1 - e * (1 + i * 0.15));
        m.scale.set(1 + e * 0.15, k, 1);
        m.position.y = (H / 2) * k;
      });
      root.visible = e < 0.999;
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/**
 * Portcullis / grate that rises into the wall above. Local frame: centred on the opening at floor
 * level, the grate lies in the local XY plane. set(1) = raised (passable).
 */
export function portcullis(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, w: number, h: number, standAt: number, mat: 'iron' | 'gold_trim' = 'iron'): Piece {
  const root = new THREE.Group();
  root.name = id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const grate = new THREE.Group();
  root.add(grate);
  const bars: THREE.BufferGeometry[] = [];
  const nV = Math.max(3, Math.round(w / 0.3));
  for (let i = 0; i <= nV; i++) {
    const bx = -w / 2 + 0.08 + (i * (w - 0.16)) / nV;
    const g = new THREE.BoxGeometry(0.07, h, 0.07);
    g.translate(bx, h / 2, 0);
    bars.push(g);
    // spiked feet
    const sp = new THREE.ConeGeometry(0.05, 0.16, 4);
    sp.rotateX(Math.PI);
    sp.translate(bx, -0.06, 0);
    bars.push(sp);
  }
  for (let j = 1; j <= Math.round(h / 0.7); j++) {
    const g = new THREE.BoxGeometry(w, 0.06, 0.09);
    g.translate(0, (j * h) / (Math.round(h / 0.7) + 1), 0);
    bars.push(g);
  }
  const merged = mergeGeos(bars);
  grate.add(mesh(merged, M(mat === 'gold_trim' ? 'bronze' : 'iron')));
  // keyhole plate at the middle rail (the treasury mark)
  const plate = mesh(new THREE.BoxGeometry(0.42, 0.52, 0.05), M('gold_trim'), false);
  plate.position.set(0, h * 0.48, 0.07);
  grate.add(plate);
  const hole = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10).rotateX(Math.PI / 2), M('iron'), false);
  hole.position.set(0, h * 0.52, 0.09);
  grate.add(hole);
  const c = ctx.shared.collision?.addDynamicBox(id, [w, h, 0.5], 'metal');
  const o = new THREE.Vector3(x, y, z);
  const m4 = new THREE.Matrix4();
  const piece: Piece = {
    object: root,
    collider: c,
    anchor: { pos: place(o, yaw, 0, 0, standAt), yaw: yaw + (standAt > 0 ? Math.PI : 0) },
    set(t: number) {
      const e = clamp01(t);
      grate.position.y = e * (h - 0.25);
      if (c) { c.setMatrix(m4.makeRotationY(yaw).setPosition(place(o, yaw, 0, h / 2 + e * (h - 0.25), 0))); c.enabled = e < 0.6; }
    },
  };
  piece.set(0);
  return piece;
}

/** Wall lever (iron handle on a bronze boss). Anchor = where the player stands. set(1) = pulled. */
export function lever(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number): Piece {
  const root = new THREE.Group();
  root.name = id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const base = mesh(new THREE.BoxGeometry(0.5, 0.8, 0.22), M('iron'));
  base.position.set(0, 1.1, 0);
  root.add(base);
  const boss = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12).rotateX(Math.PI / 2), M('bronze'), false);
  boss.position.set(0, 1.1, 0.14);
  root.add(boss);
  const arm = new THREE.Group();
  arm.position.set(0, 1.1, 0.2);
  const handle = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), M('iron'));
  handle.position.y = 0.36;
  const knob = mesh(new THREE.SphereGeometry(0.07, 8, 6), M('gold_trim'), false);
  knob.position.y = 0.74;
  arm.add(handle, knob);
  root.add(arm);
  const piece: Piece = {
    object: root,
    anchor: { pos: place(new THREE.Vector3(x, y, z), yaw, 0, 0, 1.1), yaw: yaw + Math.PI },
    set(t: number) { arm.rotation.x = 0.7 - clamp01(t) * 1.9; },
  };
  piece.set(0);
  return piece;
}

/** A spoked winch wheel on a post (turns as t goes 0 → 1). */
export function winch(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number): Piece {
  const root = new THREE.Group();
  root.name = id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const post = mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), M('timber_dark'));
  post.position.y = 0.65;
  root.add(post);
  const wheel = new THREE.Group();
  wheel.position.set(0, 1.25, 0.28);
  const rim = mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 20), M('iron'));
  wheel.add(rim);
  for (let i = 0; i < 6; i++) {
    const s = mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), M('iron'), false);
    s.rotation.z = (i / 6) * Math.PI;
    wheel.add(s);
    const hnd = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 5).rotateX(Math.PI / 2), M('timber'), false);
    const a = (i / 6) * Math.PI * 2;
    hnd.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.1);
    wheel.add(hnd);
  }
  const hub = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10).rotateX(Math.PI / 2), M('bronze'), false);
  wheel.add(hub);
  root.add(wheel);
  // padlock hanging from the hub (hidden once turned)
  const lock = mesh(new THREE.BoxGeometry(0.16, 0.2, 0.08), M('gold_trim'), false);
  lock.position.set(0, 0.96, 0.4);
  root.add(lock);
  const piece: Piece = {
    object: root,
    anchor: { pos: place(new THREE.Vector3(x, y, z), yaw, 0, 0, 1.2), yaw: yaw + Math.PI },
    set(t: number) { const e = clamp01(t); wheel.rotation.z = -e * Math.PI * 4; lock.visible = e < 0.02; },
  };
  piece.set(0);
  return piece;
}

/**
 * The round vault door: a 4.6 m bronze-and-iron disc in a circular frame. set(t) rolls it sideways
 * (local -X) into a recess while it turns, like a coin rolling along its edge. Local +Z faces the
 * side the wheel is on.
 */
export function roundVaultDoor(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, r = 2.2, wheelZ = 0.55): Piece {
  const root = new THREE.Group();
  root.name = id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const disc = new THREE.Group();
  const face = mesh(new THREE.CylinderGeometry(r, r, 0.55, 40).rotateX(Math.PI / 2), M('iron'));
  disc.add(face);
  const rim = mesh(new THREE.TorusGeometry(r - 0.08, 0.1, 8, 40), M('bronze'));
  rim.position.z = 0.3;
  const rimB = rim.clone(); rimB.position.z = -0.3;
  disc.add(rim, rimB);
  // concentric coin-rings and radial bolts on both faces
  for (const s of [1, -1]) {
    const ring = mesh(new THREE.TorusGeometry(r * 0.62, 0.05, 6, 32), M('gold_trim'), false);
    ring.position.z = s * 0.29;
    disc.add(ring);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const b = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 6).rotateX(Math.PI / 2), M('bronze'), false);
      b.position.set(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, s * 0.3);
      disc.add(b);
      const spoke = mesh(new THREE.BoxGeometry(0.1, r * 0.5, 0.04), M('iron'), false);
      spoke.position.set(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, s * 0.29);
      spoke.rotation.z = a - Math.PI / 2;
      if (i % 3 === 0) disc.add(spoke);
    }
    // keyhole plate at the centre
    const plate = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20).rotateX(Math.PI / 2), M('gold_trim'), false);
    plate.position.z = s * 0.31;
    disc.add(plate);
  }
  disc.position.y = r;
  root.add(disc);
  // wheel on the +Z side (on the frame, not the disc)
  const wheel = new THREE.Group();
  wheel.position.set(r + 1.0, 1.2, wheelZ);
  const wr = mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 18), M('iron'));
  wheel.add(wr);
  for (let i = 0; i < 4; i++) { const s = mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), M('iron'), false); s.rotation.z = (i / 4) * Math.PI; wheel.add(s); }
  root.add(wheel);
  const c = ctx.shared.collision?.addDynamicBox(id, [r * 2, r * 2, 0.6], 'metal');
  const o = new THREE.Vector3(x, y, z);
  const m4 = new THREE.Matrix4();
  const travel = r * 2 + 0.2;
  const piece: Piece = {
    object: root,
    collider: c,
    anchor: { pos: place(o, yaw, r + 1.0, 0, wheelZ + 0.9), yaw: yaw + Math.PI },
    set(t: number) {
      const e = clamp01(t);
      disc.position.x = -e * travel;
      disc.rotation.z = (e * travel) / r;
      wheel.rotation.z = -e * Math.PI * 3;
      if (c) { c.setMatrix(m4.makeRotationY(yaw).setPosition(place(o, yaw, -e * travel, r, 0))); c.enabled = e < 0.7; }
    },
  };
  piece.set(0);
  return piece;
}

/**
 * Counterweight scale bridge across a chute running along world X from x0 to x1 at deck height y,
 * centred on z (width w). Raised: the deck hangs tilted up against the far (east) side; a bronze
 * counterweight hangs low. set(1): the counterweight rises, the deck swings down into place.
 */
export function scaleBridge(ctx: AreaCtx, id: string, x0: number, x1: number, y: number, z: number, w: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = id;
  ctx.dynamicRoot.add(root);
  const L = x1 - x0;
  const hinge = new THREE.Group();
  hinge.position.set(x1, y, z);
  root.add(hinge);
  const deckG = new THREE.Group();
  deckG.position.x = -L / 2;
  const deck = mesh(new THREE.BoxGeometry(L + 0.3, 0.3, w), M('planks'));
  deck.position.y = -0.15;
  deckG.add(deck);
  for (const s of [-1, 1]) {
    const beam = mesh(new THREE.BoxGeometry(L + 0.3, 0.22, 0.22), M('iron'), false);
    beam.position.set(0, -0.2, s * (w / 2 - 0.1));
    deckG.add(beam);
    const rail = mesh(new THREE.BoxGeometry(L + 0.3, 0.06, 0.06), M('iron'), false);
    rail.position.set(0, 0.95, s * (w / 2 - 0.05));
    deckG.add(rail);
    for (let i = 0; i <= 4; i++) {
      const p = mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), M('iron'), false);
      p.position.set(-L / 2 + (i * L) / 4, 0.48, s * (w / 2 - 0.05));
      deckG.add(p);
    }
  }
  hinge.add(deckG);
  // chains from the far lintel to the deck tip, and the counterweight on the other end
  const chainMat = M('iron');
  const chains: THREE.Mesh[] = [];
  for (const s of [-1, 1]) { const ch = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 5), chainMat, false); root.add(ch); chains.push(ch); ch.userData.s = s; }
  const weight = new THREE.Group();
  const wb = mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.2, 10), M('bronze'));
  weight.add(wb);
  const wRing = mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), M('iron'), false);
  wRing.position.y = 0.72;
  weight.add(wRing);
  root.add(weight);
  const wChain = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 5), chainMat, false);
  root.add(wChain);
  const pulleyY = y + 4.6;
  const c = ctx.shared.collision?.addDynamicBox(id, [L + 0.6, 0.4, w], 'wood');
  const m4 = new THREE.Matrix4();
  const tip = new THREE.Vector3();
  const piece: DynamicPiece = {
    object: root,
    collider: c,
    set(t: number) {
      const e = clamp01(t);
      const ang = (1 - e) * 1.35; // raised: rotated up about the east hinge
      hinge.rotation.z = -ang;
      hinge.updateMatrixWorld(true);
      for (const ch of chains) {
        tip.set(-L, 0, ch.userData.s * (w / 2 - 0.1)).applyMatrix4(hinge.matrixWorld);
        const top = new THREE.Vector3(x1 + 0.3, pulleyY, z + ch.userData.s * (w / 2 - 0.1));
        const mid = tip.clone().add(top).multiplyScalar(0.5);
        ch.position.copy(mid);
        ch.scale.y = tip.distanceTo(top);
        ch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(tip).normalize());
      }
      const wy = y - 3.2 + e * 5.6;
      weight.position.set(x1 - 0.7, wy, z - w / 2 - 0.55);
      wChain.position.set(x1 - 0.7, (wy + 0.7 + pulleyY) / 2, z - w / 2 - 0.55);
      wChain.scale.y = Math.max(0.1, pulleyY - wy - 0.7);
      if (c) { c.setMatrix(m4.makeTranslation((x0 + x1) / 2, y - 0.2, z)); c.enabled = e > 0.92; }
    },
  };
  piece.set(0);
  return piece;
}

/**
 * The debtors' cage: an iron birdcage on a chain over the coin pit. set(t): 0 = hanging high over
 * the pit, 1 = lowered and swung onto the landing beside it (`land`), its door open.
 */
export function debtorsCage(ctx: AreaCtx, id: string, hang: THREE.Vector3, land: THREE.Vector3, floorY: number): DynamicPiece & { inside: () => THREE.Vector3 } {
  const root = new THREE.Group();
  root.name = id;
  ctx.dynamicRoot.add(root);
  const cage = new THREE.Group();
  root.add(cage);
  const R = 0.95, H = 2.3;
  const iron = M('iron');
  const bars: THREE.BufferGeometry[] = [];
  const nB = 16;
  for (let i = 0; i < nB; i++) {
    const a = (i / nB) * Math.PI * 2;
    if (i >= 0 && i <= 2) continue; // the door gap (front, +Z)
    const g = new THREE.CylinderGeometry(0.025, 0.025, H, 4);
    g.translate(Math.sin(a) * R, H / 2, Math.cos(a) * R);
    bars.push(g);
  }
  for (const yy of [0.02, H * 0.5, H]) { const g = new THREE.TorusGeometry(R, 0.04, 5, 24); g.rotateX(Math.PI / 2); g.translate(0, yy, 0); bars.push(g); }
  const dome = new THREE.SphereGeometry(R, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.45, 1);
  dome.translate(0, H, 0);
  cage.add(mesh(mergeGeos(bars), iron));
  cage.add(mesh(dome, M('iron_rusted')));
  const floorDisc = mesh(new THREE.CylinderGeometry(R, R, 0.1, 20), M('planks'));
  floorDisc.position.y = 0.0;
  cage.add(floorDisc);
  const ringTop = mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 12), iron, false);
  ringTop.position.y = H + 0.5;
  cage.add(ringTop);
  // the door (hinged at its left edge)
  const doorHinge = new THREE.Group();
  const a0 = (-0.5 / nB) * Math.PI * 2;
  doorHinge.position.set(Math.sin(a0) * R, 0, Math.cos(a0) * R);
  const door = new THREE.Group();
  for (let i = 1; i <= 3; i++) {
    const b = mesh(new THREE.CylinderGeometry(0.025, 0.025, H, 4), iron, false);
    b.position.set(i * 0.26, H / 2, 0.05);
    door.add(b);
  }
  const dr = mesh(new THREE.BoxGeometry(0.85, 0.06, 0.05), iron, false); dr.position.set(0.45, H * 0.5, 0.05); door.add(dr);
  const lk = mesh(new THREE.BoxGeometry(0.14, 0.18, 0.08), M('gold_trim'), false); lk.position.set(0.8, H * 0.45, 0.1); door.add(lk);
  doorHinge.add(door);
  cage.add(doorHinge);
  // hanging chain from the vault
  const chain = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5), iron, false);
  root.add(chain);
  const topY = hang.y;
  const lowY = floorY + 0.06;
  const hangY = floorY + 2.8;
  const c = ctx.shared.collision?.addDynamicGeometry(id, cageCollider(R, H), 'metal');
  const m4 = new THREE.Matrix4();
  const piece = {
    object: root,
    collider: c,
    inside: () => cage.position.clone().add(new THREE.Vector3(0, 0.1, 0)),
    set(t: number) {
      const e = clamp01(t);
      // 0 → 0.6: lower toward the pit rim height; 0.6 → 1: swing over onto the landing and settle
      const a = Math.min(1, e / 0.6), b = Math.max(0, (e - 0.6) / 0.4);
      const x = THREE.MathUtils.lerp(hang.x, land.x, b), z = THREE.MathUtils.lerp(hang.z, land.z, b);
      const yy = THREE.MathUtils.lerp(hangY, lowY + 0.3, a) - 0.3 * b;
      cage.position.set(x, yy, z);
      cage.rotation.y = -0.6 + e * 0.6;
      cage.rotation.z = Math.sin(b * Math.PI) * 0.12;
      door.rotation.y = -Math.max(0, (e - 0.9) / 0.1) * 1.7;
      const top = new THREE.Vector3(x, topY, z);
      chain.position.set(x, (yy + H + 0.5 + topY) / 2, z);
      chain.scale.y = Math.max(0.1, topY - (yy + H + 0.5));
      void top;
      if (c) { c.setMatrix(m4.compose(cage.position, cage.quaternion, new THREE.Vector3(1, 1, 1))); c.enabled = e > 0.98; }
    },
  };
  piece.set(0);
  return piece;
}

/** Ring of thin boxes around the cage (open at the door) used as its collider once landed. */
function cageCollider(R: number, H: number) {
  const parts: THREE.BufferGeometry[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    if (a < 0.9 || a > Math.PI * 2 - 0.2) continue; // leave the door side open
    const g = new THREE.BoxGeometry(0.62, H, 0.12);
    g.rotateY(a);
    g.translate(Math.sin(a) * R, H / 2, Math.cos(a) * R);
    parts.push(g);
  }
  return mergeGeos(parts);
}

/** Iron-bound treasure chest with a lid (set(1) = open). Anchor stands in front (local +Z). */
export function chestPiece(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, gilded = false): Piece {
  const root = new THREE.Group();
  root.name = id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const wood = M(gilded ? 'timber_dark' : 'planks'), iron = M('iron'), gold = M('gold_trim');
  const body = mesh(new THREE.BoxGeometry(1.0, 0.55, 0.62), wood);
  body.position.y = 0.3;
  root.add(body);
  for (const bx of [-0.36, 0, 0.36]) { const b = mesh(new THREE.BoxGeometry(0.07, 0.57, 0.64), gilded ? gold : iron, false); b.position.set(bx, 0.3, 0); root.add(b); }
  const lidHinge = new THREE.Group();
  lidHinge.position.set(0, 0.575, -0.31);
  const lid = mesh(new THREE.CylinderGeometry(0.31, 0.31, 1.0, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), wood);
  lid.scale.set(1, 0.45, 1);
  lid.position.set(0, 0, 0.31);
  lidHinge.add(lid);
  for (const bx of [-0.36, 0.36]) { const b = mesh(new THREE.BoxGeometry(0.07, 0.16, 0.66), gilded ? gold : iron, false); b.position.set(bx, 0.06, 0.31); lidHinge.add(b); }
  const plate = mesh(new THREE.BoxGeometry(0.16, 0.2, 0.03), gold, false);
  plate.position.set(0, 0.46, 0.33);
  root.add(plate);
  root.add(lidHinge);
  // coins inside (visible when open)
  const coinsG = mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.1, 12).scale(1.1, 1, 0.65), gold, false);
  coinsG.position.set(0, 0.5, 0);
  root.add(coinsG);
  const piece: Piece = {
    object: root,
    anchor: { pos: place(new THREE.Vector3(x, y, z), yaw, 0, 0, 1.15), yaw: yaw + Math.PI },
    set(t: number) { lidHinge.rotation.x = -clamp01(t) * 1.75; coinsG.visible = t < 0.999 || gilded; },
  };
  piece.set(0);
  return piece;
}

/**
 * The Treasury Great Bell and its anchor: a gilded lock-yoke clamped over the crown, split by
 * golden cracks. set(t): the yoke shatters and its fragments fall down the shaft to the arena
 * floor (floorY); the bell drops a little in its chains and tilts, silent, its cracks gone dark.
 */
export function greatBell(ctx: AreaCtx, x: number, y: number, z: number, h: number, floorY: number, arenaR: number): { bell: THREE.Group; anchor: DynamicPiece } {
  const root = new THREE.Group();
  root.name = 'treasuryGreatBell';
  ctx.dynamicRoot.add(root);
  const bell = new THREE.Group();
  bell.position.set(x, y, z);
  root.add(bell);
  const body = mesh(bellGeo(h, 40), M('bronze_bell'));
  bell.add(body);
  // golden cracks running down the body (emissive), branching
  const cracks = new THREE.Group();
  const rng = mulberry(4242);
  const r = h * 0.62;
  const prof = (yy: number) => { // radius at depth yy ∈ [0, h]
    const k = yy / h;
    return r * (k < 0.16 ? 0.46 + k * 0.6 : k < 0.5 ? 0.55 + (k - 0.16) * 0.26 : k < 0.9 ? 0.64 + (k - 0.5) * 0.8 : 0.96);
  };
  for (let n = 0; n < 7; n++) {
    let a = rng() * Math.PI * 2, yy = h * (0.12 + rng() * 0.2);
    for (let i = 0; i < 9 && yy < h * 0.97; i++) {
      const a2 = a + (rng() - 0.5) * 0.35, y2 = yy + h * (0.06 + rng() * 0.07);
      const p1 = new THREE.Vector3(Math.sin(a) * prof(yy) * 1.01, -yy, Math.cos(a) * prof(yy) * 1.01);
      const p2 = new THREE.Vector3(Math.sin(a2) * prof(y2) * 1.01, -y2, Math.cos(a2) * prof(y2) * 1.01);
      const seg = mesh(new THREE.BoxGeometry(0.2, p1.distanceTo(p2) + 0.08, 0.08), M('unlived_crack'), false);
      seg.position.copy(p1).add(p2).multiplyScalar(0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
      cracks.add(seg);
      a = a2; yy = y2;
    }
  }
  bell.add(cracks);
  const crackMat = M('unlived_crack');
  // clapper
  const clap = mesh(new THREE.SphereGeometry(h * 0.08, 10, 8), M('iron'));
  clap.position.y = -h * 0.82;
  bell.add(clap);
  // the lock-yoke anchor: a heavy gilded clamp around the crown with a keyhole plate on each face
  const frags: { g: THREE.Group; dir: THREE.Vector3; spin: THREE.Vector3; land: THREE.Vector3 }[] = [];
  const yokeR = r * 0.52;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const g = new THREE.Group();
    const home = new THREE.Vector3(x + Math.sin(a) * yokeR, y + 0.5, z + Math.cos(a) * yokeR);
    g.position.copy(home);
    g.rotation.y = a;
    const block = mesh(new THREE.BoxGeometry(yokeR * 0.8, 1.3, 0.5), M('gold_trim'));
    g.add(block);
    const band = mesh(new THREE.BoxGeometry(yokeR * 0.82, 0.2, 0.56), M('iron'), false);
    band.position.y = 0.45;
    g.add(band);
    if (i % 2 === 0) {
      const plate = mesh(new THREE.BoxGeometry(0.7, 0.9, 0.08), M('bronze'), false);
      plate.position.set(0, -0.05, 0.3);
      g.add(plate);
      const key = mesh(new THREE.BoxGeometry(0.12, 0.4, 0.1), M('cloth_black'), false);
      key.position.set(0, -0.12, 0.34);
      g.add(key);
      const keyTop = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 10).rotateX(Math.PI / 2), M('cloth_black'), false);
      keyTop.position.set(0, 0.1, 0.34);
      g.add(keyTop);
    }
    const seam = mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), crackMat, false);
    seam.position.set(yokeR * 0.38, 0, 0.26);
    seam.name = 'seam';
    g.add(seam);
    root.add(g);
    const lr = arenaR * (0.45 + (i % 3) * 0.15);
    frags.push({ g, dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), spin: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), land: new THREE.Vector3(x + Math.sin(a + 0.3) * lr, floorY + 0.35, z + Math.cos(a + 0.3) * lr) });
    (g.userData as { home: THREE.Vector3 }).home = home;
  }
  // heavy chains from the belfry beams to the yoke
  for (const s of [-1, 1]) {
    const ch = mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6), M('iron'), false);
    ch.position.set(x + s * yokeR * 0.7, y + 2.3, z);
    root.add(ch);
  }
  const q = new THREE.Quaternion();
  const anchorPiece: DynamicPiece = {
    object: root,
    set(t: number) {
      const e = clamp01(t);
      const u = Math.max(0, (e - 0.15) / 0.85);
      for (const f of frags) {
        const home = (f.g.userData as { home: THREE.Vector3 }).home;
        const seam = f.g.getObjectByName('seam');
        if (seam) seam.scale.set(1 + e * 3, 1, 1 + e * 3);
        if (u <= 0) {
          f.g.position.copy(home);
          if (e > 0) f.g.position.x += Math.sin(e * 240 + home.z) * 0.04;
          f.g.quaternion.identity();
          f.g.rotateY(Math.atan2(f.dir.x, f.dir.z));
          continue;
        }
        // burst outward, then fall the shaft (quadratic) and land on the arena floor
        const burst = Math.min(1, u * 4);
        const fall = u * u;
        const p = home.clone().addScaledVector(f.dir, burst * 1.6);
        p.lerp(f.land, Math.min(1, fall * 1.02));
        p.y = THREE.MathUtils.lerp(home.y, f.land.y, fall);
        f.g.position.copy(p);
        q.setFromAxisAngle(f.spin, u * 7 * (1 - Math.max(0, u - 0.9) * 10));
        f.g.quaternion.copy(q);
      }
      bell.position.y = y - Math.min(1, u * 2) * 0.8;
      bell.rotation.z = Math.min(1, u * 1.5) * 0.14;
      bell.rotation.x = Math.min(1, u * 1.5) * -0.06;
      cracks.visible = e < 0.6;
    },
  };
  anchorPiece.set(0);
  return { bell, anchor: anchorPiece };
}

// ------------------------------------------------------------------ small utils

export function mergeGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const norm = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of norm) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of norm) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export { anchor };
