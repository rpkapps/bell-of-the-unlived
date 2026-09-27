/**
 * Ashbridge — shared build context and the region's key coordinates (the "plan").
 * Every area module reads positions from here so seams between areas stay consistent.
 *
 * World axes: X east, Y up, Z south (north is -Z). Metres. yaw = atan2(dx, dz), 0 faces +Z.
 */
import * as THREE from 'three';
import type { Anchor } from '../../world/levelTypes';
import { Kit, type KitShared } from '../../world/kit';

export interface AreaCtx {
  shared: KitShared;
  /** Parent for all static area groups. */
  root: THREE.Group;
  /** Parent for dynamic pieces (kept separate so the game can find them easily). */
  dynamicRoot: THREE.Group;
  /** Kits created so far (finished by the level builder). */
  kits: Kit[];
}

export function newKit(ctx: AreaCtx, name: string, seed: number): Kit {
  const k = new Kit(name, ctx.shared, seed);
  ctx.kits.push(k);
  return k;
}

export const anchor = (x: number, y: number, z: number, yaw: number): Anchor => ({ pos: new THREE.Vector3(x, y, z), yaw });
/** Yaw that faces from (x0,z0) toward (x1,z1). */
export const yawTo = (x0: number, z0: number, x1: number, z1: number) => Math.atan2(x1 - x0, z1 - z0);

export const YAW_N = Math.PI;       // facing north (-Z)
export const YAW_S = 0;             // facing south (+Z)
export const YAW_E = Math.PI / 2;   // facing east (+X)
export const YAW_W = -Math.PI / 2;  // facing west (-X)

/** Key coordinates. */
export const PLAN = {
  tower: { x: -34, z: -110, half: 5.5, wallT: 1.3, top: 14, door: 3 },
  ravine: { x0: -26, x1: -15, z0: -140, z1: -48, floor: -12 },
  ledge: { x0: -28.5, x1: -25.9, z0: -116, z1: -104, y: 3 },
  rim: { x0: -30.05, x1: -25.85, zTop: -104.6, zBottom: -46 },
  street: { z0: -37, z1: -29, x0: -31, x1: 0 },
  square: { x0: 0, x1: 20, z0: -35, z1: -24 },
  crossroads: new THREE.Vector3(-12, 0, -32),
  mint: { x0: 3, x1: 17, zFront: -35, zHallN: -47.5, zCountN: -60 },
  hatch: { x0: 12.1, x1: 13.9, z0: -54.9, z1: -52.0, stairBottomZ: -57.75 },
  escape: { x0: 7.6, x1: 10.2, zTop: -56.2, zBottom: -59.9, yBottom: -2.4 },
  under: { x0: 11, x1: 15, zS: -57.75, zN: -95, y: -5, crown: -1 },
  upStair: { zc: -93.5, w: 2.4, xLow: 11, xHigh: -1.8, landX0: -5 },
  court: { x0: -13.5, x1: 22, z0: -130, z1: -96, y: 3 },
  walk: 9,
  westGate: { z0: -112, z1: -108, xOuter: -17, xInner: -12 },
  hospice: { x0: 25, x1: 41, z0: -125, z1: -99 },
  yard: { x0: 41, x1: 55, z0: -124, z1: -100 },
  approach: { x0: 0, x1: 8 },
  arena: { c: new THREE.Vector3(4, 8, -166), r: 16 },
};
