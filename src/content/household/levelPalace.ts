/**
 * The palace interiors:
 *  - West wing (y0): the KITCHEN (bolted door to the Servants' Yard — shortcut, opened from inside;
 *    locked buttery), the narrow candle-lit SERVANTS' PASSAGE with the linen room (the page and the
 *    masked courtier), the postern lobby (the remembered postern), the pantry and the garden door
 *    from the maze; the servants' stair up to YU.
 *  - Front range (YU): the GALLERY OF UNREIGNED HEIRS (portraits of heirs who never reigned; a
 *    niche behind the veiled portrait) and a jib door onto the Great Hall's west balcony.
 *  - GREAT HALL (YH): three feasts laid for three coronations; west balcony (YU) with the
 *    PORTCULLIS WINCH (shortcut to the terrace); the grand stair up to the antechamber.
 *  - ANTECHAMBER OF SUCCESSIONS (YU, Stillbell), the THRONE ROOM (three thrones) and the SIGNET
 *    DOOR onto the Bell Stair (up to the Terrace of the Great Bell, YT).
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece, EnemySpawn } from '../../world/levelTypes';
import type { MaterialId } from '../../render/materialIds';
import {
  Kit, wall, floor, stairs, barrel, crate, crateStack, sack, table, bench, chair, shelves, candles, candelabrum, sconceTorch,
  weaponRack, armourStand, wallShield, papers, ledger, stillbellShrine, type StillbellShrine, bellPost, cyl, gableRoof, strawBed,
} from '../../world/kit';
import { getMaterial } from '../../render/materials';
import {
  type AreaCtx, newKit, anchor, PLAN, Y0, YH, YU, YT, YAW_N, YAW_S, YAW_E, YAW_W, box3, balustrade, gothicWindow, portrait, throne,
  hangingBanner, pinnacle,
} from './levelCommon';
import { GARDEN_DOOR_Z } from './levelGarden';

export interface PalaceBuild {
  shrine: StillbellShrine;
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  anchors: Record<string, Anchor>;
  triggers: Record<string, THREE.Box3>;
  enemies: EnemySpawn[];
  tollPost: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] };
}

type Door = [number, number, number?, number?, ('flat' | 'round' | 'pointed')?]; // centre, width, sill, height, kind
/** Wall running along z at x (from z0 to z1), with doors listed by centre z. */
function wz(k: Kit, mat: MaterialId, x: number, z0: number, z1: number, y0: number, h: number, t: number, doors: Door[] = [], col = true) {
  const a = Math.min(z0, z1), b = Math.max(z0, z1), mid = (a + b) / 2;
  wall(k, mat, x, a, x, b, y0, h, t, { col, openings: doors.map(([c, w, sill = 0, hh = 2.6, kind = 'flat']) => ({ u: c - mid, w, sill, h: hh, kind, rise: kind === 'pointed' ? w * 0.6 : undefined })) });
}
/** Wall running along x at z (from x0 to x1), with doors listed by centre x. */
function wx(k: Kit, mat: MaterialId, z: number, x0: number, x1: number, y0: number, h: number, t: number, doors: Door[] = [], col = true) {
  const a = Math.min(x0, x1), b = Math.max(x0, x1), mid = (a + b) / 2;
  wall(k, mat, a, z, b, z, y0, h, t, { col, openings: doors.map(([c, w, sill = 0, hh = 2.6, kind = 'flat']) => ({ u: c - mid, w, sill, h: hh, kind, rise: kind === 'pointed' ? w * 0.6 : undefined })) });
}

export function buildPalace(ctx: AreaCtx): PalaceBuild {
  const anchors: Record<string, Anchor> = {};
  const pieces: Record<string, DynamicPiece & { anchor?: Anchor }> = {};
  const triggers: Record<string, THREE.Box3> = {};
  const enemies: EnemySpawn[] = [];

  // ============================================================================ west wing
  const w = newKit(ctx, 'wing', 91);
  const WG = PLAN.wing, KI = PLAN.kitchen, CO = PLAN.corridor, LI = PLAN.linen, PA = PLAN.pantry, PO = PLAN.postern;
  const WH = YU + 6; // wing wall height
  floor(w, 'flagstone', WG.x0, WG.z0, WG.x1, WG.z1, Y0, 0.5);
  // outer walls
  wz(w, 'stone_wall', WG.x1, WG.z0, WG.z1, Y0, WH, 1.0, [[56, 2.0, 0, 2.7, 'round'], [GARDEN_DOOR_Z, 2.0, 0, 2.7, 'round'], [-21.5, 2.0, YU, 2.7, 'flat']]);
  wz(w, 'stone_wall', WG.x0, WG.z0, WG.z1, Y0, WH, 1.2, [[7, 1.3, 0, 2.3, 'round']]);
  wx(w, 'stone_wall', WG.z1, WG.x0, WG.x1, Y0, WH, 1.0);
  wx(w, 'stone_wall', WG.z0, WG.x0, WG.x1, Y0, WH, 1.0);
  // roof over the wing
  gableRoof(w, (WG.x0 + WG.x1) / 2, WH, (WG.z0 + WG.z1) / 2, 0, WG.x1 - WG.x0 + 0.6, WG.z1 - WG.z0, { pitch: 40 * Math.PI / 180, gableMat: 'stone_wall', overhang: 0.6 });
  for (let z = WG.z0 + 8; z < WG.z1 - 4; z += 14) { w.bmm('stone_wall', WG.x0 + 2.5, WH, z - 0.6, WG.x0 + 3.7, WH + 6.5, z + 0.6); w.bmm('stone_trim', WG.x0 + 2.4, WH + 6.5, z - 0.7, WG.x0 + 3.8, WH + 6.8, z + 0.7); }
  // exterior dressing on the garden side of the wing (maze & yard see it)
  for (let z = -10; z < 58; z += 8) if (Math.abs(z - 56) > 3 && Math.abs(z - GARDEN_DOOR_Z) > 3) gothicWindow(w, WG.x1 + 0.52, YU + 1.4, z, YAW_E, 1.4, 3.2, (z / 8) % 3 === 0, false);
  w.bmm('stone_trim', WG.x1 + 0.4, YU - 0.2, WG.z0, WG.x1 + 0.7, YU + 0.05, WG.z1, { cast: false });

  // ---------------------------------------------------------------- kitchen
  wx(w, 'stone_wall', KI.z0, WG.x0, WG.x1, Y0, 5.2, 0.6, [[(CO.x0 + CO.x1) / 2, CO.x1 - CO.x0, 0, 2.8, 'round'], [-50, 1.4, 0, 2.3, 'flat']]);
  w.bmm('timber_dark', WG.x0 + 0.6, 5.2, KI.z0 + 0.3, WG.x1 - 0.5, 5.5, WG.z1 - 0.5, { cast: false });
  for (let z = KI.z0 + 2; z < KI.z1; z += 3) w.box('timber_dark', (KI.x0 + KI.x1) / 2, 5.0, z, KI.x1 - KI.x0, 0.3, 0.3, { cast: false });
  // great hearth on the west wall
  const hx = KI.x0 + 0.6, hz = 52;
  w.bmm('stone_dark', KI.x0 - 0.5, Y0, hz - 2.4, hx + 0.4, 3.4, hz - 1.8, { col: true });
  w.bmm('stone_dark', KI.x0 - 0.5, Y0, hz + 1.8, hx + 0.4, 3.4, hz + 2.4, { col: true });
  w.bmm('stone_trim', KI.x0 - 0.5, 3.1, hz - 2.6, hx + 0.9, 3.6, hz + 2.6);
  w.bmm('stone_dark', KI.x0 - 0.5, 3.6, hz - 2.0, hx + 0.2, 5.2, hz + 2.0);
  w.add('ember_glow', cyl(0.9, 1.0, 0.15, 10), { x: KI.x0 + 0.6, y: Y0 + 0.2, z: hz }, { cast: false });
  w.box('iron', KI.x0 + 0.9, 1.6, hz, 0.06, 0.06, 3.2, { cast: false });
  w.add('iron', new THREE.SphereGeometry(0.45, 10, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), { x: KI.x0 + 0.95, y: 1.1, z: hz }, { cast: false });
  w.solid(KI.x0 - 0.5, 0, hz - 1.8, hx + 0.6, 0.6, hz + 1.8);
  w.light(0xff9448, 5.2, 11, KI.x0 + 1.8, 1.4, hz, 0.8);
  w.shared.instances.add('flame', () => new THREE.ConeGeometry(0.1, 0.4, 5).translate(0, 0.2, 0), 'fire', new THREE.Matrix4().makeScale(4, 3, 4).setPosition(KI.x0 + 0.7, 0.3, hz));
  table(w, -46, Y0, 50.5, 0, 5.5, 1.3, 0.9);
  table(w, -46, Y0, 55.6, 0, 5.5, 1.3, 0.9);
  for (const [x, z] of [[-47.5, 50.5], [-45, 55.6], [-44, 50.6]]) { w.add('bronze', cyl(0.25, 0.2, 0.3, 10), { x, y: 0.9, z }, { cast: false }); }
  for (let i = 0; i < 6; i++) w.add('iron', cyl(0.22, 0.18, 0.3, 8), { x: -49 + i * 1.2, y: 3.6, z: 58.8 }, { cast: false });
  w.box('timber_dark', -46, 3.9, 58.8, 8, 0.1, 0.1, { cast: false });
  shelves(w, -40, Y0, 47.2, YAW_W, 2.4, 2.4, false);
  crateStack(w, -41, Y0, 58.3, 0.3);
  barrel(w, -52, Y0, 58.6, 0, true); barrel(w, -51, Y0, 58.9, 0.5, true); sack(w, -50, Y0, 58.8, 0.8);
  // the bolted kitchen door (opened from inside → the Servants' Yard)
  pieces.kitchenDoor = door(ctx, 'kitchenDoor', WG.x1, Y0, 56, 'z', 2.0, 2.7, 'planks', anchor(WG.x1 - 1.6, Y0, 56, YAW_E), true);
  anchors.kitchenDoorYard = anchor(WG.x1 + 1.3, Y0, 56, YAW_W);
  // the locked buttery (cellar key from the page, once he is safe at the Hospice)
  wx(w, 'stone_wall', 36, WG.x0, CO.x0, Y0, 3.6, 0.5);
  w.bmm('plaster', WG.x0, 3.6, 36, CO.x0, 3.8, KI.z0, { cast: false });
  pieces.butteryDoor = door(ctx, 'butteryDoor', -50, Y0, KI.z0, 'x', 1.4, 2.3, 'planks', anchor(-50, Y0, KI.z0 + 1.4, YAW_N), false);
  for (let i = 0; i < 5; i++) barrel(w, -52.2, Y0, 37.4 + i * 1.2, 0, true);
  for (let i = 0; i < 3; i++) barrel(w, -49 + i * 1.0, Y0 + 0.2, 36.8, Math.PI / 2, true, true);
  armourStand(w, -48.2, Y0, 41.4, YAW_W, 'steel_armor', 'cloth_red');
  anchors.butteryLoot = anchor(-49.2, Y0 + 0.2, 40.2, YAW_W);
  candles(w, -48.2, Y0 + 0.9, 38, 3, 0.1);

  // ---------------------------------------------------------------- the servants' passage (narrow, low, candle-lit)
  const CH = 3.4;
  wz(w, 'plaster', CO.x0 - 0.25, CO.z0, CO.z1, Y0, CH, 0.5, [[25, 1.4, 0, 2.3, 'round'], [7, 1.4, 0, 2.3, 'round']]);
  wz(w, 'plaster', CO.x1 + 0.25, CO.z0, CO.z1, Y0, CH, 0.5, [[12, 1.3, 0, 2.3, 'flat'], [GARDEN_DOOR_Z, 2.0, 0, 2.5, 'round']]);
  w.bmm('timber_dark', CO.x0 - 0.5, CH, CO.z0 + 2, CO.x1 + 0.5, CH + 0.25, CO.z1, { cast: false });
  for (let z = CO.z0 + 3; z < CO.z1; z += 2.2) w.box('timber_dark', (CO.x0 + CO.x1) / 2, CH - 0.12, z, CO.x1 - CO.x0 + 0.4, 0.22, 0.2, { cast: false });
  w.bmm('timber_dark', CO.x0, Y0, CO.z0, CO.x0 + 0.05, 0.9, CO.z1, { cast: false });
  w.bmm('timber_dark', CO.x1 - 0.05, Y0, CO.z0, CO.x1, 0.9, CO.z1, { cast: false });
  // candle shelves along the passage (instanced flames) and two lights
  for (let z = CO.z0 + 4; z < CO.z1 - 2; z += 6.5) {
    const side = Math.round(z) % 2 ? CO.x0 + 0.12 : CO.x1 - 0.12;
    w.box('timber_dark', side, 1.7, z, 0.25, 0.06, 0.6, { cast: false });
    candles(w, side, 1.73, z, 3, 0.12);
  }
  w.light(0xffb070, 2.6, 9, (CO.x0 + CO.x1) / 2, 2.2, 34, 0.6);
  w.light(0xffb070, 2.6, 9, (CO.x0 + CO.x1) / 2, 2.2, 14, 0.6);
  w.light(0xffb070, 2.2, 8, (CO.x0 + CO.x1) / 2, 2.2, -2, 0.6);
  // the garden passage (maze → passage)
  wx(w, 'plaster', GARDEN_DOOR_Z - 1.15, CO.x1 + 0.5, WG.x1 - 0.5, Y0, CH, 0.3);
  wx(w, 'plaster', GARDEN_DOOR_Z + 1.15, CO.x1 + 0.5, WG.x1 - 0.5, Y0, CH, 0.3);
  w.bmm('timber_dark', CO.x1, CH, GARDEN_DOOR_Z - 1.3, WG.x1 - 0.5, CH + 0.2, GARDEN_DOOR_Z + 1.3, { cast: false });
  // linen room (the page and the masked courtier)
  wx(w, 'plaster', LI.z0, WG.x0 + 0.6, CO.x0, Y0, CH, 0.5);
  wx(w, 'plaster', LI.z1, WG.x0 + 0.6, CO.x0, Y0, CH, 0.5);
  w.bmm('plaster', WG.x0, CH, LI.z0, CO.x0, CH + 0.2, LI.z1, { cast: false });
  for (let i = 0; i < 3; i++) {
    const zc = 19.9 + i * 2.35;
    shelves(w, -53.05, Y0, zc, YAW_E, 2.2, 2.6, false);
    for (let lv = 0; lv < 5; lv++) for (let k = 0; k < 3; k++) if ((i + lv + k) % 4) w.box((lv + k) % 5 ? 'cloth_linen' : 'cloth_red', -53.02, 0.07 + lv * 0.5 + 0.09, zc - 0.7 + k * 0.7, 0.34, 0.16 + ((lv * 3 + k) % 3) * 0.04, 0.55, { cast: false });
  }
  table(w, -49.3, Y0, 29.6, YAW_E, 1.8, 0.9, 0.85);
  w.box('wax', -49.4, 0.9, 29.3, 0.18, 0.05, 0.12, { cast: false });
  w.box('iron', -49.2, 0.91, 29.9, 0.24, 0.02, 0.05, { cast: false });
  papers(w, -49.1, 0.87, 30.1, 3);
  strawBed(w, -50.5, Y0, 19.5, YAW_E);
  anchors.page = anchor(-51.4, Y0, 22.6, YAW_N + 0.5);
  anchors.coercer = anchor(-50.2, Y0, 25.8, YAW_S - 0.4);
  anchors.waxTable = anchor(-48.2, Y0, 29.6, YAW_W);
  triggers.linenApproach = box3(CO.x0 - 1, Y0, 21, CO.x1, Y0 + 3, 29);
  w.light(0xffc27a, 2.2, 7, -50, 2.4, 25, 0.5);
  candles(w, -49.2, 0.87, 28.8, 2, 0.06);
  // postern lobby (the postern from the memory) and the lane outside
  wx(w, 'plaster', PO.z0, WG.x0 + 0.6, CO.x0, Y0, CH, 0.5);
  wx(w, 'plaster', PO.z1, WG.x0 + 0.6, CO.x0, Y0, CH, 0.5);
  w.bmm('plaster', WG.x0, CH, PO.z0, CO.x0, CH + 0.2, PO.z1, { cast: false });
  pieces.posternDoor = door(ctx, 'posternDoor', WG.x0, Y0, 7, 'z', 1.3, 2.3, 'planks', anchor(WG.x0 + 1.6, Y0, 7, YAW_W), false);
  pieces.posternBar = bar(ctx, WG.x0 + 0.72, Y0, 7);
  anchors.postern = anchor(WG.x0 + 1.6, Y0, 7, YAW_W);
  triggers.posternMemory = box3(CO.x0 - 0.2, Y0, 5, CO.x1, Y0 + 3, 9);
  // the lane beyond the postern: a dead end with fog (the page's cap lies here if he was taken)
  floor(w, 'cobble', WG.x0 - 4, 4, WG.x0, 10, Y0, 0.5);
  wz(w, 'stone_dark', WG.x0 - 4.3, 3.7, 10.3, Y0, 6, 0.6);
  wx(w, 'stone_dark', 4, WG.x0 - 4.3, WG.x0, Y0, 6, 0.6);
  wx(w, 'stone_dark', 10, WG.x0 - 4.3, WG.x0, Y0, 6, 0.6);
  anchors.pageCap = anchor(WG.x0 - 1.8, Y0 + 0.02, 7.3, 0);
  w.light(0xffc27a, 1.6, 6, -49, 2.3, 7, 0.5);
  // pantry (throwing knives and scrap)
  wx(w, 'plaster', PA.z0, CO.x1, WG.x1 - 0.5, Y0, CH, 0.5);
  wx(w, 'plaster', PA.z1, CO.x1, WG.x1 - 0.5, Y0, CH, 0.5);
  w.bmm('plaster', CO.x1, CH, PA.z0, WG.x1, CH + 0.2, PA.z1, { cast: false });
  shelves(w, -39.3, Y0, 12, YAW_W, 3.6, 2.4, false);
  for (let i = 0; i < 4; i++) sack(w, -42.8 + (i % 2) * 0.6, Y0, 9 + i * 0.7, i);
  barrel(w, -42.6, Y0, 14.8, 0, true);
  anchors.pantryLoot = anchor(-40.2, Y0 + 0.95, 10.4, YAW_E);
  // servants' stair up to YU (a steep stairwell) and the landing
  const SS = PLAN.sStair;
  stairs(w, 'planks', [SS.x, Y0, SS.zLo], [SS.x, YU, SS.zHi], SS.w, { baseY: Y0 });
  wz(w, 'plaster', CO.x0 - 0.25, SS.zHi - 4, CO.z0, Y0, YU + 3.4, 0.5);
  wz(w, 'plaster', CO.x1 + 0.25, SS.zHi, CO.z0, Y0, YU + 3.4, 0.5);
  w.bmm('timber_dark', CO.x0 - 0.5, YU + 3.4, SS.zHi - 4, CO.x1 + 0.5, YU + 3.6, CO.z0, { cast: false });
  const L = PLAN.landing;
  floor(w, 'planks', L.x0, L.z0, L.x1, L.z1, YU, 0.5, 'wood');
  wx(w, 'plaster', L.z0, L.x0 - 0.3, WG.x1, YU, 3.4, 0.5);
  wx(w, 'plaster', L.z1, CO.x1 + 0.3, WG.x1, YU, 3.4, 0.4);
  w.bmm('plaster', L.x0, YU + 3.4, L.z0, L.x1, YU + 3.6, L.z1, { cast: false });
  candles(w, -39.6, YU + 1.4, -23.4, 3, 0.1);
  w.box('timber_dark', -39.6, YU + 1.38, -23.4, 0.4, 0.05, 0.5, { cast: false });
  w.light(0xffc27a, 2.2, 8, -43, YU + 2.2, -22, 0.6);
  enemies.push({ id: 'hh_corridor_retainer', kind: 'hhRetainer', anchor: anchor((CO.x0 + CO.x1) / 2, Y0, 16, YAW_S), patrol: [new THREE.Vector3(-45.5, Y0, 4), new THREE.Vector3(-45.5, Y0, 36)], leash: 20 });
  enemies.push({ id: 'hh_coercer', kind: 'hhCourtier', anchor: anchors.coercer, leash: 7 });
  enemies.push({ id: 'hh_kitchen_duellist', kind: 'hhDuellist', anchor: anchor(-43, Y0, 53, YAW_N), leash: 12 });

  // ============================================================================ gallery of unreigned heirs (YU)
  const h = newKit(ctx, 'hall', 93);
  const GA = PLAN.gallery, FZi = PLAN.facadeZ - PLAN.facadeT / 2; // inner face of the facade
  h.bmm('stone_dark', GA.x0, Y0, GA.z0, GA.x1, YU - 0.02, FZi, { col: true });
  floor(h, 'flagstone', GA.x0, GA.z0, GA.x1, FZi, YU, 0.2);
  wx(h, 'stone_wall', GA.z0, GA.x0, GA.x1, YU, 6.2, 0.8);
  h.bmm('plaster', GA.x0, YU + 5.9, GA.z0, GA.x1, YU + 6.2, FZi, { cast: false });
  for (let x = GA.x0 + 2; x < GA.x1; x += 3) h.box('timber_dark', x, YU + 5.7, (GA.z0 + FZi) / 2, 0.3, 0.4, FZi - GA.z0, { cast: false });
  h.bmm('timber_dark', GA.x0, YU, GA.z0 + 0.4, GA.x1, YU + 1.4, GA.z0 + 0.5, { cast: false });
  h.bmm('gold_trim', GA.x0, YU + 1.4, GA.z0 + 0.4, GA.x1, YU + 1.48, GA.z0 + 0.55, { cast: false });
  // six portraits (north wall); the fourth is veiled (a niche behind it)
  const px = [-35, -31, -27, -23, -19, -15.8];
  px.forEach((x, i) => portrait(h, x, YU + 3.1, GA.z0 + 0.4, YAW_S, 2.0, 2.7, i, i === 3));
  // interior window reveals on the facade side
  for (const x of [-30, -22]) gothicWindow(h, x, YU + 1.2, FZi - 0.02, YAW_N, 2.4, 3.8, false, true);
  candelabrum(h, -33, YU, -22);
  candelabrum(h, -20, YU, -22);
  h.light(0xffc890, 3.0, 12, -26, YU + 2.4, -24, 0.4);
  anchors.portraits = anchor(-27, YU, -27.4, YAW_N);
  anchors.galleryNiche = anchor(-23, YU + 1.0, GA.z0 + 0.8, YAW_N);
  // the jib door onto the hall balcony (a servants' door cut into the panelling)
  enemies.push({ id: 'hh_gallery_ghost', kind: 'hhGhost', anchor: anchor(-33, YU, -26.5, YAW_E), patrol: [new THREE.Vector3(-33, YU, -26.5), new THREE.Vector3(-18, YU, -20)], leash: 16 });
  enemies.push({ id: 'hh_gallery_duellist', kind: 'hhDuellist', anchor: anchor(-17.2, YU, -26.4, YAW_W), leash: 14 });

  // ============================================================================ great hall (YH) and west balcony (YU)
  const HA = PLAN.hall, BA = PLAN.balcony;
  const HT = YU + 8; // wall top
  h.bmm('stone_dark', HA.x0 - 2, Y0, HA.z0, HA.x1 + 2, YH - 0.02, HA.z1, { col: true });
  floor(h, 'flagstone', HA.x0, HA.z0, HA.x1, HA.z1, YH, 0.2);
  wz(h, 'stone_wall', HA.x0 - 1, HA.z0 - 14, HA.z1, Y0, HT, 2.0, [[-23, 1.6, YU, 2.6, 'round']]);
  wz(h, 'stone_wall', HA.x1 + 1, HA.z0 - 14, HA.z1, Y0, HT, 2.0, [[-55, 2.2, YU, 3.0, 'round']]);
  // wainscot and gilt band
  for (const [x, s] of [[HA.x0 + 0.02, 1], [HA.x1 - 0.02, -1]] as [number, number][]) {
    h.bmm('timber_dark', x - (s < 0 ? 0.08 : 0), YH, HA.z0, x + (s > 0 ? 0.08 : 0), YH + 2.2, HA.z1, { cast: false });
    h.bmm('gold_trim', x - (s < 0 ? 0.1 : 0), YH + 2.2, HA.z0, x + (s > 0 ? 0.1 : 0), YH + 2.3, HA.z1, { cast: false });
  }
  // roof trusses and the roof
  for (let z = HA.z1 - 3; z > HA.z0; z -= 4.2) {
    h.box('timber_dark', 0, HT - 0.4, z, HA.x1 - HA.x0 + 3, 0.4, 0.4, { cast: false });
    h.box('timber_dark', 0, HT + 2.4, z, 0.3, 4.8, 0.3, { cast: false });
  }
  gableRoof(h, 0, HT, (HA.z0 + HA.z1) / 2, 0, HA.x1 - HA.x0 + 4, HA.z1 - HA.z0, { pitch: 38 * Math.PI / 180, gableMat: 'stone_wall', overhang: 0.5 });
  // west balcony with the portcullis winch
  floor(h, 'planks', BA.x0, BA.z0, BA.x1, BA.z1, YU, 0.45, 'wood');
  for (let z = BA.z1 - 1; z > BA.z0; z -= 3.5) h.box('stone_trim', BA.x1 - 0.5, YU - 0.9, z, 1.0, 1.2, 0.5, { cast: false });
  balustrade(h, BA.x1 - 0.2, BA.z1 + 0.5, BA.x1 - 0.2, BA.z0 + 0.1, YU);
  pieces.winch = winch(ctx, -10.3, YU, -17.2);
  pieces.winch.anchor = anchor(-10.3, YU, -18.9, YAW_S);
  // three feasts for three coronations
  const cloths: MaterialId[] = ['cloth_red', 'cloth_black', 'cloth_blue'];
  [-7, 0, 7].forEach((x, i) => {
    table(h, x, YH, -22.5, Math.PI / 2, 11, 1.4, 0.85);
    h.box(cloths[i], x, YH + 0.88, -22.5, 1.55, 0.02, 11.2, { cast: false });
    for (let j = 0; j < 5; j++) {
      const z = -18 - j * 2.2;
      for (const s of [-1, 1]) chair(h, x + s * 1.2, YH, z, s < 0 ? YAW_E : YAW_W);
      h.add(i === 1 ? 'gold_trim' : 'bronze', cyl(0.14, 0.1, 0.06, 10), { x: x + 0.35, y: YH + 0.9, z }, { cast: false });
      h.add(i === 1 ? 'gold_trim' : 'bronze', cyl(0.14, 0.1, 0.06, 10), { x: x - 0.35, y: YH + 0.9, z: z + 0.6 }, { cast: false });
    }
    candelabrum(h, x, YH + 0.88, -20);
    candelabrum(h, x, YH + 0.88, -25);
  });
  anchors.hallResin = anchor(7.3, YH + 0.95, -27.4, 0);
  // banners of three successions
  hangingBanner(h, HA.x0 + 0.1, YU + 6, -26, YAW_E, 1.4, 5, 'cloth_red');
  hangingBanner(h, HA.x0 + 0.1, YU + 6, -34, YAW_E, 1.4, 5, 'heraldry_banner');
  hangingBanner(h, HA.x1 - 0.1, YU + 6, -22, YAW_W, 1.4, 5, 'cloth_blue');
  hangingBanner(h, HA.x1 - 0.1, YU + 6, -30, YAW_W, 1.4, 5, 'heraldry_banner');
  hangingBanner(h, HA.x1 - 0.1, YU + 6, -38, YAW_W, 1.4, 5, 'cloth_black');
  // east hearth
  h.bmm('stone_trim', HA.x1 - 1.2, YH, -37.5, HA.x1, YH + 3.2, -32.5, { col: true });
  h.bmm('stone_dark', HA.x1 - 1.0, YH + 3.2, -37, HA.x1, HT, -33);
  h.add('ember_glow', cyl(0.8, 0.9, 0.12, 10), { x: HA.x1 - 0.6, y: YH + 0.05, z: -35 }, { cast: false });
  h.light(0xff9a50, 4.4, 12, HA.x1 - 2, YH + 1.6, -35, 0.7);
  h.light(0xffc890, 3.4, 14, 0, YH + 3.2, -22, 0.4);
  for (const x of [HA.x0 + 0.1]) for (const z of [-19, -41]) wallShield(h, x, YH + 3, z, YAW_E, 1.1);
  // interior window reveals on the facade (hall level)
  for (const x of [-8, 8]) gothicWindow(h, x, YH + 1.4, FZi - 0.02, YAW_N, 1.8, 3.6, false);
  // grand stair (hall → antechamber) and the mass under the antechamber
  const GS = PLAN.gStair;
  stairs(h, 'stone_trim', [0, YH, GS.zLo], [0, YU, GS.zHi], GS.x1 - GS.x0, { baseY: YH });
  for (const s of [-1, 1]) {
    // stair side walls rising with the flight
    const run = GS.zLo - GS.zHi, rise = YU - YH;
    h.box('stone_wall', s * (GS.x1 + 0.3), YH + rise / 2 - 0.2, (GS.zLo + GS.zHi) / 2, 0.6, rise + 0.4, Math.hypot(run, rise) * 0.98, { rx: Math.atan2(rise, run) });
    h.solid(s * (GS.x1 + 0.3) - 0.3, YH, GS.zHi, s * (GS.x1 + 0.3) + 0.3, YU + 1.0, GS.zLo);
  }
  h.bmm('stone_wall', HA.x0, YH, HA.z0 - 0.3, GS.x0 - 0.6, YU, HA.z0 + 0.3, { col: true });
  h.bmm('stone_wall', GS.x1 + 0.6, YH, HA.z0 - 0.3, HA.x1, YU, HA.z0 + 0.3, { col: true });
  enemies.push({ id: 'hh_hall_retainer1', kind: 'hhRetainer', anchor: anchor(-3.6, YH, -21, YAW_S), leash: 18 });
  enemies.push({ id: 'hh_hall_retainer2', kind: 'hhRetainer', anchor: anchor(3.6, YH, -28.5, YAW_S), leash: 18 });
  enemies.push({ id: 'hh_hall_duellist', kind: 'hhDuellist', anchor: anchor(-9.5, YU, -33, YAW_S), leash: 14 });

  // ============================================================================ antechamber of successions (YU)
  const AN = PLAN.ante;
  h.bmm('stone_dark', AN.x0 - 2, Y0, AN.z0, AN.x1 + 2, YU - 0.02, AN.z1, { col: true });
  floor(h, 'flagstone', AN.x0, AN.z0, AN.x1, AN.z1, YU, 0.2);
  h.bmm('cloth_red', -1.6, YU + 0.005, AN.z0, 1.6, YU + 0.02, AN.z1, { cast: false });
  // arcade between hall and antechamber (open arches over the stair and the balcony)
  wx(h, 'stone_wall', AN.z1, HA.x0 - 2, HA.x1 + 2, YU, 8, 0.8, [[0, 7.6, 0, 5.2, 'pointed'], [BA.x0 + 2.1, 3.8, 0, 4.2, 'pointed']]);
  wx(h, 'stone_wall', AN.z0, AN.x0 - 2, AN.x1 + 2, YU, 8, 0.8, [[0, 3.6, 0, 4.4, 'pointed']]);
  h.bmm('plaster', AN.x0 - 1, YU + 7.2, AN.z0, AN.x1 + 1, YU + 7.5, AN.z1, { cast: false });
  for (let x = AN.x0 + 3; x < AN.x1; x += 6) h.box('gold_trim', x, YU + 7.1, (AN.z0 + AN.z1) / 2, 0.2, 0.2, AN.z1 - AN.z0, { cast: false });
  // three coronation robes on stands and the coronation rolls on a lectern
  armourStand(h, -10.4, YU, -47.5, YAW_E, 'gold_trim', 'cloth_red');
  armourStand(h, -10.4, YU, -51, YAW_E, 'steel_armor', 'cloth_black');
  armourStand(h, -10.4, YU, -54.5, YAW_E, 'gold_trim', 'cloth_blue');
  h.box('timber_dark', -6.5, YU + 0.55, -56.4, 0.6, 1.1, 0.5);
  h.box('parchment', -6.5, YU + 1.13, -56.3, 0.62, 0.02, 0.48, { rx: -0.25, cast: false });
  h.solid(-6.8, YU, -56.7, -6.2, YU + 1.2, -56.1);
  anchors.coronationRolls = anchor(-6.5, YU, -55.2, YAW_N);
  for (const x of [-4.8, 4.8]) portrait(h, x, YU + 3.4, AN.z0 + 0.45, YAW_S, 2.2, 3.0, x < 0 ? 0 : 2);
  const shrine = stillbellShrine(h, 8.5, YU, -56.8, YAW_S);
  candelabrum(h, 10.8, YU, -45.6);
  h.light(0xffc890, 2.4, 10, 2, YU + 3, -50, 0.4);
  bellPost(h, -7.2, YU, -49, YAW_E);
  const tollPost = {
    id: 'hh_ante', pos: new THREE.Vector3(0, YU, -51), radius: 7,
    options: [
      { id: 'throne', toward: new THREE.Vector3(0, YU, -70) },
      { id: 'loggia', toward: new THREE.Vector3(30, YU, -55.5) },
      { id: 'hall', toward: new THREE.Vector3(0, YH, -25) },
      { id: 'balcony', toward: new THREE.Vector3(-10, YU, -30) },
    ],
  };

  // ============================================================================ throne room (YU)
  const t = newKit(ctx, 'throne', 97);
  const TR = PLAN.throne, TT = YU + 12;
  t.bmm('stone_dark', TR.x0 - 1, Y0, TR.z0 - 1, TR.x1 + 1, YU - 0.02, TR.z1, { col: true });
  floor(t, 'flagstone', TR.x0, TR.z0, TR.x1, TR.z1, YU, 0.2);
  wz(t, 'stone_wall', TR.x0 - 0.5, TR.z0 - 1, TR.z1, YU, TT - YU, 1.0);
  wz(t, 'stone_wall', TR.x1 + 0.5, TR.z0 - 1, TR.z1, YU, TT - YU, 1.0, [[PLAN.bStair.zc, 3.0, 0, 3.8, 'pointed']]);
  wx(t, 'stone_wall', TR.z0 - 0.5, TR.x0 - 1, TR.x1 + 1, YU, TT - YU, 1.0);
  gableRoof(t, 0, TT, (TR.z0 + TR.z1) / 2, 0, TR.x1 - TR.x0 + 2, TR.z1 - TR.z0 + 1, { pitch: 42 * Math.PI / 180, gableMat: 'stone_wall', overhang: 0.5 });
  for (let z = TR.z1 - 3; z > TR.z0; z -= 4.5) t.box('timber_dark', 0, TT - 0.5, z, TR.x1 - TR.x0 + 1, 0.5, 0.5, { cast: false });
  // tall windows (east & west walls) and wall pinnacles outside
  for (const z of [-63, -69, -82]) for (const s of [-1, 1]) gothicWindow(t, s * (TR.x1 + (s > 0 ? 0 : 0)) + (s > 0 ? -0.02 : 0.02), YU + 2.2, z, s > 0 ? YAW_W : YAW_E, 2.0, 5.6, false, true);
  for (const z of [-58, -72, -86]) for (const s of [-1, 1]) pinnacle(t, s * (TR.x1 + 0.6), TT, z, 4, 0.8, false);
  // dais with three thrones for three coronations; three carpets that cannot all be walked at once
  t.bmm('stone_trim', TR.x0 + 1, YU, TR.z0, TR.x1 - 1, YU + 0.9, -78);
  t.solid(TR.x0 + 1, YU, TR.z0, TR.x1 - 1, YU + 0.9, -78);
  stairs(t, 'stone_trim', [0, YU, -75.5], [0, YU + 0.9, -78], 12, { baseY: YU });
  throne(t, -5.5, YU + 0.9, -83.6, 0.12, 'cloth_red', 3.3);
  throne(t, 0, YU + 0.9, -84.2, 0, 'cloth_black', 3.8);
  throne(t, 5.5, YU + 0.9, -83.6, -0.12, 'cloth_blue', 3.3);
  const carpet = (x0: number, x1: number, mat: MaterialId, lift: number, rot: number) => t.box(mat, (x0 + x1) / 2, YU + lift, -66.5, 2.2, 0.02, 17, { ry: rot, cast: false });
  carpet(-3.5, -2.5, 'cloth_red', 0.006, 0.12);
  carpet(-0.5, 0.5, 'cloth_black', 0.012, 0);
  carpet(2.5, 3.5, 'cloth_blue', 0.018, -0.12);
  for (const [x, mat] of [[-5.5, 'cloth_red'], [0, 'heraldry_banner'], [5.5, 'cloth_blue']] as [number, MaterialId][]) hangingBanner(t, x, TT - 1.2, TR.z0 + 0.1, YAW_S, 2.2, 6, mat);
  for (const x of [-12.5, 12.5]) for (const z of [-62, -70]) candelabrum(t, x, YU, z);
  t.light(0xffc890, 3.0, 14, 0, YU + 3.4, -80, 0.4);
  t.light(0xffc890, 2.4, 12, 0, YU + 3, -64, 0.4);
  anchors.thrones = anchor(0, YU, -74.4, YAW_N);
  anchors.throneScrap = anchor(0, YU + 0.95, -85.9, 0);
  // the signet door onto the Bell Stair
  pieces.signetDoor = door(ctx, 'signetDoor', TR.x1 + 0.5, YU, PLAN.bStair.zc, 'z', 3.0, 4.2, 'timber_dark', anchor(TR.x1 - 1.5, YU, PLAN.bStair.zc, YAW_E), false, true);
  enemies.push({ id: 'hh_throne_ghost1', kind: 'hhGhost', anchor: anchor(-5.5, YU + 0.9, -81.4, YAW_S), patrol: [new THREE.Vector3(-5.5, YU + 0.9, -81.4), new THREE.Vector3(-6, YU, -66)], leash: 20 });
  enemies.push({ id: 'hh_throne_ghost2', kind: 'hhGhost', anchor: anchor(5.5, YU + 0.9, -81.4, YAW_S), patrol: [new THREE.Vector3(5.5, YU + 0.9, -81.4), new THREE.Vector3(6, YU, -66)], leash: 20 });
  enemies.push({ id: 'hh_throne_retainer', kind: 'hhRetainer', anchor: anchor(0, YU, -70.5, YAW_S), leash: 16 });

  // ============================================================================ the Bell Stair (YU → YT)
  const BS = PLAN.bStair, bz0 = BS.zc - BS.w / 2, bz1 = BS.zc + BS.w / 2;
  stairs(t, 'stone_trim', [BS.x0 + 0.5, YU, BS.zc], [BS.x1, YT, BS.zc], BS.w, { baseY: Y0 });
  t.bmm('stone_wall', TR.x1 + 1, Y0, bz0 - 0.6, BS.x1, YU - 0.02, bz1 + 0.6, { col: true });
  floor(t, 'flagstone', BS.x1, bz0 - 1, BS.x1 + 3.2, bz1 + 1, YT, 0.4);
  t.bmm('stone_wall', BS.x1, Y0, bz0 - 1, BS.x1 + 3.2, YT - 0.4, bz1 + 1, { col: true });
  for (const zz of [bz0 - 0.35, bz1 + 0.35]) {
    const run = BS.x1 - BS.x0, rise = YT - YU;
    t.box('stone_wall', (BS.x0 + BS.x1) / 2 + 0.25, YU + rise / 2 + 0.3, zz, Math.hypot(run, rise), 1.2, 0.5, { rz: Math.atan2(rise, run) });
    t.solid(BS.x0, YU, zz - 0.25, BS.x1 + 0.2, YT + 1.25, zz + 0.25);
  }
  anchors.bellStairFoot = anchor(BS.x0 + 1.2, YU, BS.zc, YAW_E);

  return { shrine, pieces, anchors, triggers, enemies, tollPost };
}

// ============================================================================ dynamic pieces

/**
 * A door leaf (or two) in a wall opening centred at (cx, cz). axis 'z': the wall runs along z;
 * 'x': the wall runs along x. set(1) = open. `bolt` draws an iron bolt (the kitchen door).
 */
function door(ctx: AreaCtx, id: string, cx: number, y: number, cz: number, axis: 'x' | 'z', w: number, h: number, mat: MaterialId, a: Anchor, bolt: boolean, double = false): DynamicPiece & { anchor: Anchor } {
  const root = new THREE.Group();
  root.name = id;
  ctx.dynamicRoot.add(root);
  // local frame: wall along local X, door centred at the origin, faces ±Z
  const frame = new THREE.Group();
  frame.position.set(cx, y, cz);
  frame.rotation.y = axis === 'z' ? Math.PI / 2 : 0;
  root.add(frame);
  const wood = getMaterial(mat), iron = getMaterial('iron'), gilt = getMaterial('gold_trim');
  const n = double ? 2 : 1, lw = w / n;
  const leaves: THREE.Group[] = [];
  for (let i = 0; i < n; i++) {
    const sgn = i === 0 ? 1 : -1;
    const hinge = new THREE.Group();
    hinge.position.set(-sgn * w / 2, 0, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(lw, h, 0.12).translate(sgn * lw / 2, h / 2, 0), wood);
    leaf.castShadow = true;
    hinge.add(leaf);
    for (const yy of [0.45, h - 0.45]) hinge.add(new THREE.Mesh(new THREE.BoxGeometry(lw * 0.9, 0.08, 0.16).translate(sgn * lw * 0.45, yy, 0), iron));
    if (double) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 5, 12), gilt);
      ring.position.set(sgn * (lw - 0.25), h * 0.45, 0.1);
      hinge.add(ring);
    }
    frame.add(hinge);
    leaves.push(hinge);
  }
  let boltMesh: THREE.Mesh | null = null;
  if (bolt) {
    boltMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.1, 0.1), iron);
    boltMesh.position.set(0, 1.2, -0.14);
    frame.add(boltMesh);
  }
  const col = ctx.shared.collision?.addDynamicBox('household:' + id, axis === 'z' ? [0.3, h, w] : [w, h, 0.3], 'wood');
  col?.setMatrix(new THREE.Matrix4().makeTranslation(cx, y + h / 2, cz));
  const piece = {
    object: root, collider: col, anchor: a,
    set(tt: number) {
      const e = Math.min(1, Math.max(0, tt));
      leaves.forEach((hg, i) => { hg.rotation.y = (i === 0 ? 1 : -1) * e * 1.7; });
      if (boltMesh) boltMesh.position.x = e * 0.45 * w;
      if (col) col.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

/** The oak bar dropped across the postern (set(1) = barred: the page is safe). */
function bar(ctx: AreaCtx, x: number, y: number, z: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'posternBar';
  ctx.dynamicRoot.add(root);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 2.2), getMaterial('timber_dark'));
  beam.position.set(x, y + 1.25, z);
  beam.castShadow = true;
  const brackets = [-0.8, 0.8].map((d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.1), getMaterial('iron')); m.position.set(x, y + 1.25, z + d); return m; });
  root.add(beam, ...brackets);
  const piece = { object: root, set(t: number) { const e = Math.min(1, Math.max(0, t)); beam.visible = e > 0.5; beam.position.y = y + 1.25 + (1 - e) * 0.4; } };
  piece.set(0);
  return piece;
}

/** Portcullis winch: a spoked wheel on a frame (set(1) = turned; the game raises the portcullis). */
function winch(ctx: AreaCtx, x: number, y: number, z: number): DynamicPiece & { anchor?: Anchor } {
  const root = new THREE.Group();
  root.name = 'winch';
  ctx.dynamicRoot.add(root);
  const wood = getMaterial('timber_dark'), iron = getMaterial('iron');
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 0.2), wood); p.position.set(x + s * 0.7, y + 0.8, z); root.add(p); }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8).rotateZ(Math.PI / 2), iron);
  axle.position.set(x, y + 1.3, z);
  root.add(axle);
  const wheel = new THREE.Group();
  wheel.position.set(x, y + 1.3, z);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 20).rotateY(Math.PI / 2), wood);
  wheel.add(rim);
  for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.05), wood); sp.rotation.x = (i / 8) * Math.PI; wheel.add(sp); }
  root.add(wheel);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 5), iron);
  chain.position.set(x + 0.4, y + 2.6, z + 0.3);
  root.add(chain);
  for (const m of root.children) m.castShadow = true;
  ctx.shared.collision?.addBox([x, y + 0.8, z], [1.6, 1.6, 0.4], undefined, 'wood');
  const piece = { object: root, set(t: number) { const e = Math.min(1, Math.max(0, t)); wheel.rotation.x = e * Math.PI * 4; } };
  piece.set(0);
  return piece;
}
