/**
 * The Ram-Knight's Passage (mid-boss arena): the barbican's great gate passage, y = 6,
 * x ∈ [−5.5, 5.5], z ∈ [−126, −90], under a barrel vault with murder holes. Two pairs of massive
 * piers split it into a central charge lane and two narrow side aisles with alcoves — the Ram-Knight
 * Oderic charges down the lane; a knight who meets a pier or the gate instead of his quarry is
 * staggered. The north gate leaves open when he falls, onto the Upper Ward.
 */
import * as THREE from 'three';
import { floor, barrelVault, sconceTorch, slit, rubble, cyl } from '../../world/kit';
import { type AreaCtx, type AreaOut, emptyOut, newKit, anchor, PLAN, YAW_N, YAW_S, YAW_E, YAW_W, box3, armyBanner } from './levelCommon';
import { twinGate, type Piece } from './levelPieces';
import { fireBasket, fallenSoldier } from './levelProps';

export const PASSAGE_ZONE = box3(-9, 5, -126, 9, 18, -88.4);
/** Piers inside the passage (x, z, half-size) — also used by the Ram-Knight's wall-stagger test in the tests. */
export const PASSAGE_PIERS: [number, number, number][] = [[-3.4, -101, 0.85], [3.4, -101, 0.85], [-3.4, -114, 0.85], [3.4, -114, 0.85]];

export interface PassageBuild extends AreaOut { gate: Piece; center: THREE.Vector3; radius: number }

export function buildPassage(ctx: AreaCtx): PassageBuild {
  const k = newKit(ctx, 'passage', 601);
  const out = emptyOut();
  const P = PLAN.passage, Y = P.y, z0 = P.z0, z1 = -90;
  const wTop = Y + 12;

  // ---------------------------------------------------------------- floor, side walls with alcoves, vault
  k.solid(P.x0, -1, z0, P.x1, Y, z1);
  floor(k, 'flagstone', P.x0, z0, P.x1, z1, Y + 0.01, 0.3, false);
  // worn central lane (the Ram-Knight's charges), scored by iron
  k.bmm('stone_dark', -2.2, Y + 0.012, z0 + 1, 2.2, Y + 0.02, z1, { cast: false });
  for (let i = 0; i < 14; i++) k.box('iron_rusted', (i % 2 ? 1 : -1) * 0.8 + ((i * 37) % 5) * 0.1 - 0.2, Y + 0.022, z1 - 2 - i * 2.4, 0.04, 0.005, 1.6, { ry: ((i % 3) - 1) * 0.06, cast: false });
  const alcoves = [-96, -107.5, -119];
  for (const s of [-1, 1]) {
    const inner = s * P.x1, outer = s * (P.x1 + 3.6);
    let cur = z1;
    for (const az of alcoves) {
      const a0 = az + 1.6, a1 = az - 1.6;
      k.bmm('stone_wall', inner, -1, a0, outer, wTop, cur, { col: true });
      // alcove: floor, back wall, lintel
      k.solid(inner, -1, a1, inner + s * 2.2, Y, a0);
      k.bmm('flagstone', inner, Y + 0.01, a1, inner + s * 2.2, Y + 0.02, a0, { cast: false });
      k.bmm('stone_dark', inner + s * 2.2, -1, a1, outer, wTop, a0, { col: true });
      k.bmm('stone_wall', inner, Y + 4.6, a1, inner + s * 2.2, wTop, a0, { col: true });
      k.bmm('stone_trim', inner - s * 0.05, Y + 4.4, a1 - 0.1, inner + s * 0.1, Y + 4.7, a0 + 0.1, { cast: false });
      cur = a1;
    }
    k.bmm('stone_wall', inner, -1, z0, outer, wTop, cur, { col: true });
    // engaged ribs between bays
    for (const rz of [-101, -114]) k.bmm('stone_trim', inner - s * 0.25, Y, rz - 0.5, inner, Y + 6, rz + 0.5, { cast: false });
  }
  barrelVault(k, 'stone_dark', 0, Y + 6, z1, Math.PI, P.x1, z1 - z0, 0.6, 12);
  k.bmm('stone_dark', P.x0 - 3.6, Y + 12.2, z0, P.x1 + 3.6, Y + 12.8, z1, { cast: false });
  for (let z = z1 - 3; z > z0 + 2; z -= 6.5) {
    // transverse ribs and murder holes (thin cold light falling through)
    k.add('stone_trim', new THREE.TorusGeometry(P.x1 - 0.1, 0.22, 5, 16, Math.PI), { x: 0, y: Y + 6, z }, { cast: false });
    k.add('bell_light', new THREE.CircleGeometry(0.28, 8).rotateX(Math.PI / 2), { x: 0, y: Y + 6 + P.x1 - 0.35, z: z - 3.2 }, { cast: false });
  }
  // the piers (the Ram-Knight's undoing)
  for (const [x, z, h] of PASSAGE_PIERS) {
    k.bmm('stone_wall', x - h, Y, z - h, x + h, Y + 6.2, z + h, { col: true });
    k.bmm('stone_trim', x - h - 0.12, Y, z - h - 0.12, x + h + 0.12, Y + 0.45, z + h + 0.12, { cast: false });
    k.bmm('stone_trim', x - h - 0.12, Y + 5.9, z - h - 0.12, x + h + 0.12, Y + 6.3, z + h + 0.12, { cast: false });
    // scars where something heavy struck them
    k.box('stone_dark', x, Y + 1.4, z + h + 0.02, 0.9, 1.2, 0.04, { cast: false });
    rubble(k, x + (x > 0 ? -0.2 : 0.2), Y, z + h + 0.9, 0.45, false);
  }
  // south mouth: the inner face of the gatehouse (arch frame), north: the gate (dynamic)
  const gate = twinGate(ctx, 'odericNorth', 0, Y, z0 + 0.5, 0, P.x1 - P.x0 - 1.8, 7.2);
  k.bmm('stone_wall', P.x0, Y + 7.2, z0, P.x1, wTop, z0 + 1.0, { col: true });
  k.bmm('stone_wall', P.x0, -1, z0, P.x0 + 0.9, wTop, z0 + 1.0, { col: true });
  k.bmm('stone_wall', P.x1 - 0.9, -1, z0, P.x1, wTop, z0 + 1.0, { col: true });
  k.bmm('iron', P.x0 + 0.9, Y + 7.0, z0 + 0.9, P.x1 - 0.9, Y + 7.3, z0 + 1.1, { cast: false });
  // dressing: braziers in two alcoves (two lights), a banner, the dead of earlier assaults
  fireBasket(k, -7.1, Y, -107.5, 1.0);
  fireBasket(k, 7.1, Y, -107.5, 1.0);
  k.light(0xff9c50, 11, 16, -6.8, Y + 2, -107.5, 0.9);
  k.light(0xff9c50, 11, 16, 6.8, Y + 2, -107.5, 0.9);
  for (const z of [-96, -119]) for (const s of [-1, 1]) sconceTorch(k, s * (P.x1 + 2.18), Y + 2.6, z, s > 0 ? YAW_W : YAW_E);
  armyBanner(ctx, k, 0, Y + 6.6, z0 + 1.05, YAW_S, 2.2, 4.0, true);
  fallenSoldier(k, -1.5, Y, -97, 0.4);
  fallenSoldier(k, 2.2, Y, -121, 2.6);
  fallenSoldier(k, 6.8, Y, -119.5, -1.2);
  for (const z of [-99, -110, -116]) slit(k, P.x0 + 0.01, Y + 4.8, z, YAW_E, 0.16, 0.8);
  k.add('iron', cyl(0.05, 0.05, 2.2, 5), { x: -6.6, y: Y + 1.1, z: -96.2, rz: 0.5 }, { cast: false });

  const center = new THREE.Vector3(0, Y, -108);
  out.anchors.odericSpawn = anchor(0, Y, -119.5, YAW_S);
  out.anchors.odericExit = anchor(0, Y, z0 - 2.5, YAW_N);
  void YAW_N; void YAW_W;
  return { ...out, gate, center, radius: 18.5 };
}
