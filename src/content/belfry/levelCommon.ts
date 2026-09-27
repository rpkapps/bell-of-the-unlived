/**
 * The Belfry of Return — shared build context, the plan (key coordinates) and small builders used
 * by every part of the level (fog gates with any facing, slabs with stairwells, parapets).
 *
 * World axes: X east, Y up, Z south (north is −Z). yaw = atan2(dx, dz); 0 faces +Z (south).
 *
 * THE PLAN (a vertical ascent through a tower built from rejected futures):
 *
 *   Foot terrace (y −3, z 58..72, Stillbell `belfry.foot`) ── causeway (rising to y 0) ──▶ south terrace (y 0)
 *        the Great Door (south wall) is barred from within ──▶ opened from F1 (shortcut 1)
 *        west ledge (y 0) ──▶ postern (west wall) ──▶ F1
 *   F1  y  0  Hall of the Victory That Was     stair: east lane, northward  ──▶ F2
 *   F2  y  7  The Drowned Lecture Theatre      stair: west lane, southward  ──▶ F3
 *   F3  y 14  The Nameless Nave                stair: east lane, northward  ──▶ F4
 *        └─ loose name-plate (west wall) ──▶ covered stair down the west face ──▶ the Branding Cell (secret boss)
 *   F4  y 21  The Empty Vault                  stair: west lane, southward  ──▶ F5
 *   F5  y 28  The Coronation That Never Happened   stair: south lane, eastward ──▶ Crown stairhouse (y 35)
 *        └─ balcony door (east wall) ──▶ Buttress Gallery down the east face ──▶ gate to the east ledge (shortcut 2)
 *   Crown y 35: stairhouse (Stillbell `belfry.crown`) ──fog──▶ the Bell Crown arena (centre (0,35,−5), r 13)
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece } from '../../world/levelTypes';
import { Kit, type KitShared, floor, wall } from '../../world/kit';
import type { MaterialId } from '../../render/materialIds';
import { getMaterial } from '../../render/materials';

export interface BCtx {
  shared: KitShared;
  root: THREE.Group;
  dynamicRoot: THREE.Group;
  kits: Kit[];
  anchors: Record<string, Anchor>;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  triggers: Record<string, THREE.Box3>;
}

export function newKit(ctx: BCtx, name: string, seed: number, originY = 0): Kit {
  const k = new Kit(name, ctx.shared, seed);
  k.originY = originY;
  ctx.kits.push(k);
  return k;
}

export const anchor = (x: number, y: number, z: number, yaw: number): Anchor => ({ pos: new THREE.Vector3(x, y, z), yaw });
export const yawTo = (x0: number, z0: number, x1: number, z1: number) => Math.atan2(x1 - x0, z1 - z0);
export const YAW_N = Math.PI, YAW_S = 0, YAW_E = Math.PI / 2, YAW_W = -Math.PI / 2;
export const box3 = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));

/** Key coordinates. */
export const PLAN = {
  /** Tower: outer half-size, wall thickness, interior half-size. */
  H: 15, T: 1.2, I: 13.8,
  floors: [0, 7, 14, 21, 28] as const,
  roof: 35,
  slab: 0.6,
  /** Interior stair lanes (walking width 3 m). */
  laneE: [10.6, 13.6] as [number, number],
  laneW: [-13.6, -10.6] as [number, number],
  laneS: [10.6, 13.6] as [number, number], // z range of the F5 → Crown stair
  /** Stair ends: low z (north end) and high z (south end) of the east/west flights. */
  stairN: -3.2, stairS: 8.5,
  /** F5 → Crown stair x range. */
  crownStairX: [-7, 4.7] as [number, number],
  greatDoor: { w: 4.4, h: 4.1 },
  postern: { z: 8, w: 2.2, h: 2.6 },
  ossuary: { z: 8, w: 1.8, h: 2.5 },
  balcony: { z: 10, w: 2.0, h: 2.6 },
  foot: { y: -3, z0: 56, z1: 72, x0: -11, x1: 11 },
  causeway: { x0: -3.5, x1: 3.5, zTower: 26, zFoot: 57 },
  terrace: { z0: 15, z1: 26 },
  ledgeW: { x0: -21.5, x1: -15, z0: -2, z1: 26 },
  ledgeE: { x0: 15, x1: 21.5, z0: 9.5, z1: 26 },
  gallery: { lane1: [15.2, 17.4] as [number, number], lane2: [17.6, 19.8] as [number, number], zN: -11, zS: 8.5, zBottom: 7.5, outer: 20.2 },
  covered: { x0: -18.4, x1: -15.2, zTop: 7, zBottom: -4, y0: 7, y1: 14 },
  cell: { c: new THREE.Vector3(-31, 7, -7), r: 8, gateX: -22.2 },
  crown: { c: new THREE.Vector3(0, 35, -5), r: 13, disc: 14.3 },
  stairhouse: { x0: -8.2, x1: 10.6, z0: 9.2, z1: 15, top: 39.6 },
  crownFog: { x: 7.6, z: 9.2 },
  killY: -40,
};

/** Interior floor slab (top at y) over the tower interior, leaving a rectangular hole. */
export function slabWithHole(k: Kit, mat: MaterialId, y: number, hole: [number, number, number, number] | null, thick = PLAN.slab) {
  const I = PLAN.I;
  if (!hole) { floor(k, mat, -I, -I, I, I, y, thick); return; }
  const [hx0, hz0, hx1, hz1] = hole;
  if (hz0 > -I) floor(k, mat, -I, -I, I, hz0, y, thick);
  if (hz1 < I) floor(k, mat, -I, hz1, I, I, y, thick);
  if (hx0 > -I) floor(k, mat, -I, hz0, hx0, hz1, y, thick);
  if (hx1 < I) floor(k, mat, hx1, hz0, I, hz1, y, thick);
}

/** Stone balustrade (visual + collider 1.2 m) along a line at floor level y. */
export function balustrade(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, mat: MaterialId = 'stone_trim') {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.round(len / 0.45));
  const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
  k.push((x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-dz, dx));
  k.box(mat, 0, 0.93, 0, len + 0.1, 0.14, 0.34, { cast: false });
  k.box(mat, 0, 0.06, 0, len + 0.1, 0.12, 0.34, { cast: false });
  for (let i = 0; i <= n; i++) k.box(mat, -len / 2 + (i * len) / n, 0.5, 0, 0.13, 0.76, 0.13, { cast: false });
  k.solid(-len / 2, 0, -0.2, len / 2, 1.3, 0.2);
  k.pop();
}

/** Solid parapet wall (visual 1.1 m, collider 1.6 m). */
export function parapetWall(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, t = 0.45, mat: MaterialId = 'stone_wall') {
  wall(k, mat, x0, z0, x1, z1, y, 1.1, t, { colH: 1.6 });
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(-(z1 - z0), x1 - x0);
  k.push((x0 + x1) / 2, y, (z0 + z1) / 2, ang);
  k.box('stone_trim', 0, 1.15, 0, len + 0.05, 0.1, t + 0.12, { cast: false });
  k.pop();
}

/**
 * A fog veil across an opening. The veil plane faces along `yaw` (the direction the player walks
 * through it). `anchor` stands outside facing in; `enterTo` is just inside.
 */
export function fogGate(ctx: BCtx, id: string, x: number, y: number, z: number, yaw: number, w = 4.2, h = 4.6): DynamicPiece & { anchor: Anchor; enterTo: Anchor } {
  const root = new THREE.Group();
  root.name = 'fogGate:' + id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const mat = getMaterial('fog_veil');
  const layers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 1), mat);
    m.position.set(0, h / 2, (i - 1) * 0.26);
    m.renderOrder = 7;
    root.add(m);
    layers.push(m);
  }
  const c = ctx.shared.collision?.addDynamicBox('belfry:fog:' + id, [w, h, 0.7], 'stone');
  c?.setMatrix(new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y + h / 2, z));
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const piece = {
    object: root,
    collider: c,
    anchor: anchor(x - fx * 1.9, y, z - fz * 1.9, yaw),
    enterTo: anchor(x + fx * 2.1, y, z + fz * 2.1, yaw),
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      layers.forEach((m, i) => {
        const kk = Math.max(0.001, 1 - e * (1 + i * 0.15));
        m.scale.set(1 + e * 0.15, kk, 1);
        m.position.y = (h / 2) * kk;
      });
      root.visible = e < 0.999;
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/** Simple additive glow material (bell light, telegraph bands, streams). */
export function glowMaterial(color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
}
