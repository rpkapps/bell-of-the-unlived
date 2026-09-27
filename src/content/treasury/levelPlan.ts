/**
 * The Undervaults (Royal Treasury) — shared build context and the region's key coordinates.
 *
 * World axes: X east, Y up, Z south (north is -Z). Metres. yaw = atan2(dx, dz), 0 faces +Z.
 *
 *            z=-151 ┌ Hoard (Mimic Sovereign) ┐                  ┌──── Vault Tower 28×28 ────┐
 *                   └──── gate z=-128 ────────┘                  │ Vault of Futures (arena)   │
 *   Strongrooms  SR1 | corridor | SR2 ══ Scale Gallery (chute) ══╗│ Great Bell in the belfry   │
 *            z=-106 ─────── Counting Deep ─────────┐   stair up ║└──── fog z=-111 ──────────┘
 *                   (y -7.8, Stillbell)            │            ╚═ Antechamber (Stillbell) ═ Archive
 *            z=-81  └── stair up to the Hall ──────┘═ stair ═ Sluice Hall (y -3.2) ═ vault door ┘
 *            z=-80  ════ Hall of Weights (y 0) + banquet balcony (y 5) ════ culvert under it
 *            z=-60  ─── Twofold Market: west quay (prosperous) | canal | east quay (famine) ───
 *            z=-30        seam bridge + weir: dry canal (north) / flooded canal (south)
 *            z=+12        entry quay, Stillbell of the Twofold Market
 */
import * as THREE from 'three';
import type { Anchor } from '../../world/levelTypes';
import { Kit, type KitShared } from '../../world/kit';

export interface AreaCtx {
  shared: KitShared;
  root: THREE.Group;
  dynamicRoot: THREE.Group;
  kits: Kit[];
}

export function newKit(ctx: AreaCtx, name: string, seed: number, originY = 0): Kit {
  const k = new Kit(name, ctx.shared, seed);
  k.originY = originY;
  ctx.kits.push(k);
  return k;
}

export const anchor = (x: number, y: number, z: number, yaw: number): Anchor => ({ pos: new THREE.Vector3(x, y, z), yaw });
export const yawTo = (x0: number, z0: number, x1: number, z1: number) => Math.atan2(x1 - x0, z1 - z0);
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const YAW_N = Math.PI;
export const YAW_S = 0;
export const YAW_E = Math.PI / 2;
export const YAW_W = -Math.PI / 2;

/** Floor levels. */
export const Y = {
  market: 0,
  balcony: 5,
  canal: -3.2,
  water: -2.35,
  deep: -7.8,
} as const;

/** Key rectangles and points (x0 < x1, z0 < z1). */
export const P = {
  canal: { x0: -4, x1: 4, z0: -60, z1: 14 },
  weirZ: -30,
  westQuay: { x0: -20, x1: -4 },
  eastQuay: { x0: 4, x1: 20 },
  marketZ: { z0: -60, z1: 14 },
  southBridge: { z0: -8, z1: -4 },
  seamBridge: { z0: -32.5, z1: -28 },
  /** Ghat stair from the east quay down into the dry canal (runs west). */
  ghat: { xTop: 11, xBot: 4, z0: -57.4, z1: -50.6 },
  /** Water steps from the west quay down into the flooded canal (runs east). */
  waterSteps: { xTop: -10, xBot: -4, z0: 1.5, z1: 6.5 },
  hall: { x0: -30, x1: 20, z0: -80, z1: -60, eaves: 11 },
  hallIn: { x0: -29.4, x1: -7, z0: -79.4, z1: -60.6 },
  weighGate: { x0: -16, x1: -12, z: -60 },
  hallStair: { x0: -29, x1: -26, zTop: -69.5, zBot: -82 },
  balcony: { x0: -20, x1: 16, z0: -60, z1: -56.6, y: 5 },
  balconyStair: { x: -18.7, w: 2.2, zBot: -46.6, zTop: -56.65 },
  culvert: { x0: -4, x1: 4, z0: -80, z1: -60, ceil: -0.45 },
  sluice: { x0: -12, x1: 12, z0: -96, z1: -80, ceil: 3.4 },
  sluiceStair: { z0: -92, z1: -88, xTop: -12.0, xBot: -21.0 },
  vaultDoor: { x: 8, w: 4, z0: -99, z1: -96 },
  ante: { x0: 2, x1: 18, z0: -110, z1: -99, ceil: 2.6 },
  archive: { x0: 18, x1: 30, z0: -109, z1: -98 },
  tower: { x0: -4, x1: 24, z0: -138, z1: -110, t: 2, top: 54 },
  arena: { c: new THREE.Vector3(10, -3.2, -124), r: 12 },
  deep: { x0: -46, x1: -21, z0: -106, z1: -81, ceil: -1.2 },
  pit: { x0: -36, x1: -32, z0: -96, z1: -92 },
  corridor: { x0: -36, x1: -30, z0: -128, z1: -106 },
  sr1: { x0: -46, x1: -36.8, z0: -122, z1: -110 },
  sr2: { x0: -29.2, x1: -20, z0: -122, z1: -110 },
  hoard: { c: new THREE.Vector3(-33, -7.8, -141), r: 10 },
  gallery: { z0: -117, z1: -113, x0: -19.2, x1: -5 },
  chute: { x0: -16, x1: -11 },
  galleryStair: { x0: -9, x1: -5, zBot: -113, zTop: -105 },
  landing: { x0: -9, x1: 2, z0: -105, z1: -101 },
};

/** Where the Great Bell hangs (crown / hanging point) inside the tower belfry. */
export const BELL = { x: 10, y: 48, z: -124, h: 9 };
