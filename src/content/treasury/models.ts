/**
 * The Undervaults — procedural models.
 *
 * Enemies (silhouettes chosen to read at gameplay distance):
 *  - starving militia: gaunt, stooped, rags and sack-hoods, improvised clubs and forks;
 *  - debt collectors: tall black coats to the ankle, wide hats, coin-chains, a gilt LEFT hand
 *    (the grab hand: its open palm is the tell);
 *  - clockwork sentries: bronze clock-case torsos with a dial, bell-shaped heads with one lit lens,
 *    rod limbs; coin-sentinels are small gilded versions;
 *  - vault guardians: hollow gilt plate, huge pauldrons, light burning in the joints and visor;
 *  - coin-mimics: an iron-bound chest on thin iron legs with chain arms; the lid is driven by the
 *    head bone's pitch (so clips "open the mouth"); tells: coins askew in the seam, the lid breathes;
 *  - ledger wardens: Unlived mint wardens with arbalests;
 *  - ward-coffers: gilded coffers with a lit keyhole and a ward ring.
 * Bosses: the Mimic Sovereign (a crowned hoard-chest on legs) and Treasurer Aurel Mask (tall, gaunt,
 * gilded ledger-armour over a black robe; phase 2 mask cracked, phase 3 unmasked).
 * NPCs: Ione Tallow (counting clerk), a starving mother and child, a Greyford muster soldier.
 */
import * as THREE from 'three';
import { registerEnemyLook, registerNpcLook, registerWeaponModel, CharBuilder, type WeaponModelExt } from '../../actors/models';
import type { Rig } from '../../actors/Rig';
import type { CharacterModel } from '../../actors/models/contract';
import { trunkSkin } from '../../actors/models/builder';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet, quilted } from '../../actors/models/anatomy';
import {
  M, cuirass, gorget, fauld, tassets, tabard, belt, bandolier, robeSkirt, mantle, pauldrons, armPlates, legPlates, bracers, greatHelm, hood,
  wideHat, trunkZ, drapeChain, bellSleeves, bellGeom, mailSkirt,
} from '../../actors/models/gear';
import { buildLook } from '../../actors/models/character';
import { loft, sweep, xf, cyl, box, torus, ellipsoid, merge, extrude, norm, triCount, type G, type V3 } from '../../actors/models/parts';
import { weaponMaterial } from '../../actors/models/charMaterials';
import { Rng } from '../../core/rng';

const PALE = 'skin_pale|t=b8b0a8';
const RAG = 'cloth_linen|t=6e665a';
const RAG2 = 'cloth_brown|t=7a6a58';
const COAT = 'cloth_black|t=4a4448';
const GILT = 'gold_trim';
const GILT_STEEL = 'steel_armor|t=c8a870';

// ================================================================== starving militia

function militia(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 31);
  const v = new Rng(seed * 104729 + 11);
  b.cracks = 0.55;
  const sex = 'm';
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: v.pick(['dark', 'grey', 'fair'] as const), style: v.pick(['shaggy', 'cropped', 'balding'] as const), beard: v.chance(0.6) ? 'stubble' : 'short', unlived: true, old: v.chance(0.5) });
  addTrunk(b, sex, RAG, { y0: -0.16, y1: 0.56, inflate: 0.0, radial: quilted(18, 10, 0.02), crack: 1 });
  addShoulders(b, sex, RAG, 0.002);
  robeSkirt(b, sex, { mat: RAG2, y0: 0.08, hem: -0.44 - v.range(0, 0.1), r1: [0.19, 0.15], open: 0.4, tatter: 0.4, cols: 14, rows: 6, seed: seed + 3 });
  // a patched jerkin, rope belt, a bread sack slung across the back
  addTrunk(b, sex, 'leather|t=8a7a68', { y0: 0.06, y1: 0.46, inflate: 0.014, crack: 1 });
  belt(b, sex, { y: 0.08, over: 0.03, mat: M.rope, pouches: 1, strapEnd: false });
  bandolier(b, sex, { over: 0.035, mat: M.rope, width: 0.012, fromLeft: v.chance(0.5) });
  b.add('chest', xf(ellipsoid(0.13, 0.16, 0.07, { segs: 10, rows: 6 }), { p: [0.05, -0.02, -0.16] }), 'cloth_linen|t=8a8272', { skin: () => [['chest', 1]] });
  if (v.chance(0.55)) hood(b, { mat: 'cloth_brown|t=8a7a60', depth: 1.05, tip: 0.02, open: 0.95, tatter: true });
  addArms(b, sex, RAG, { inflate: 0.0, foreY1: -0.16, crack: 1 });
  addArms(b, sex, PALE, { upper: false });
  addHands(b, 'wrapped', PALE, 'cloth_linen|t=8a8070');
  addLegs(b, sex, 'cloth_brown|t=6a5a4a', { inflate: 0.002, crack: 1 });
  addFeet(b, sex, 'wrap', 'cloth_linen|t=7a7266');
  // a tin cup at the belt
  b.add('hips', xf(cyl(0.035, 0.03, -0.04, 0.04, 8), { p: [0.15, -0.02, trunkZ(sex, b.shoulder, 0.15, 0, 1, 0.05)] }), M.iron, { skin: trunkSkin });
  return b.build();
}

// ================================================================== debt collectors

function collector(rig: Rig, seed: number, head: boolean) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 51);
  b.cracks = head ? 0.6 : 0.35;
  const sex = 'm';
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: 'dark', style: 'short', beard: head ? 'short' : 'none', unlived: true, shade: 0.35, old: head });
  addTrunk(b, sex, COAT, { y0: -0.16, y1: 0.56, inflate: 0.022, crack: 1 });
  addShoulders(b, sex, COAT, 0.022);
  robeSkirt(b, sex, { mat: COAT, y0: 0.14, hem: -1.0, r1: [0.3, 0.27], open: 0.55, trim: GILT, tatter: 0.07, cols: 20, rows: 10, seed });
  mantle(b, sex, { mat: head ? 'cloth_red|t=6a3a38' : 'cloth_black|t=3a3638', len: head ? 0.34 : 0.24, trim: GILT, tatter: 0.05 });
  belt(b, sex, { y: 0.1, over: 0.04, mat: M.leatherDark, buckle: GILT, pouches: 3 });
  // a chain of coins across the breast
  const cz = (x: number, y: number) => trunkZ(sex, b.shoulder, x, y, 1, 0.05);
  const pts: V3[] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; const x = -0.14 + t * 0.28, y = 0.44 - Math.sin(t * Math.PI) * 0.12; pts.push([x, y, cz(x, y)]); }
  drapeChain(b, 'hips', pts, GILT, 0.026, trunkSkin);
  for (let i = 1; i < 8; i += 2) b.add('hips', xf(cyl(0.022, 0.022, -0.003, 0.003, 10), { p: [pts[i][0], pts[i][1] - 0.03, pts[i][2] + 0.006], r: [Math.PI / 2, 0, 0] }), GILT, { skin: trunkSkin });
  // ledger on a chain at the right hip
  b.add('hips', xf(box(0.16, 0.22, 0.05), { p: [-0.2, -0.16, cz(-0.18, -0.1) - 0.02], r: [0.1, 0.3, 0.1] }), M.leatherDark, { skin: (p) => [['hips', 0.6], ['thighR', 0.4 * Math.min(1, Math.max(0, -p.y * 3))]] });
  addArms(b, sex, COAT, { inflate: 0.02, crack: 1 });
  bracers(b, sex, { mat: M.leatherDark, studs: GILT });
  addHands(b, 'glove', M.leatherDark, M.leatherDark);
  // the grab hand: a gilt gauntlet plate over the left hand
  b.add('handL', xf(box(0.085, 0.1, 0.035), { p: [0.02, -0.06, 0.02] }), GILT);
  b.add('handL', xf(torus(0.02, 0.005, 4, 10), { p: [0.03, -0.12, 0.03], r: [0, Math.PI / 2, 0] }), GILT);
  addLegs(b, sex, 'cloth_black|t=4a4448', { inflate: 0.01 });
  addFeet(b, sex, 'tallboot', M.leatherDark);
  wideHat(b, { mat: 'cloth_black|t=3a3a3e', band: GILT });
  if (head) {
    // the head collector's keyring and a red sash
    bandolier(b, sex, { over: 0.055, mat: 'cloth_red|t=a05050', width: 0.03 });
    b.add('hips', xf(torus(0.05, 0.006, 5, 14), { p: [0.19, -0.1, cz(0.17, -0.08)], r: [1.2, 0, 0.2] }), M.iron, { skin: trunkSkin });
  }
  return b.build();
}

// ================================================================== clockwork

function clockwork(rig: Rig, seed: number, small: boolean) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 71);
  const metal = small ? GILT : 'bronze';
  const dark = M.iron;
  // pelvis drum and spine rod
  b.add('hips', xf(cyl(0.16, 0.18, -0.12, 0.08, 14), {}), dark);
  b.add('hips', xf(torus(0.17, 0.018, 5, 18), { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0] }), metal);
  b.add('spine', cyl(0.045, 0.045, -0.02, 0.22, 8), dark);
  // the clock-case torso
  b.add('chest', loft([{ y: -0.12, rx: 0.14, rz: 0.11 }, { y: -0.06, rx: 0.19, rz: 0.15 }, { y: 0.14, rx: 0.2, rz: 0.16 }, { y: 0.26, rx: 0.17, rz: 0.13 }, { y: 0.3, rx: 0.08, rz: 0.07 }], { segs: 18, capTop: true, capBottom: true, radial: (th) => 1 + 0.03 * Math.cos(th * 8) }), metal);
  // dial on the breast: face, ring, hands
  b.add('chest', xf(cyl(0.1, 0.1, 0, 0.012, 20), { p: [0, 0.09, 0.15], r: [Math.PI / 2, 0, 0] }), 'bone|t=d8d0b8');
  b.add('chest', xf(torus(0.1, 0.01, 5, 24), { p: [0, 0.09, 0.162], r: [0, 0, 0] }), dark);
  b.add('chest', xf(box(0.008, 0.07, 0.006), { p: [0.015, 0.12, 0.166], r: [0, 0, -0.5] }), dark);
  b.add('chest', xf(box(0.008, 0.05, 0.006), { p: [-0.012, 0.08, 0.166], r: [0, 0, 2.1] }), dark);
  // keyhole plate on the back and the wind-up key
  b.add('chest', xf(box(0.12, 0.16, 0.02), { p: [0, 0.1, -0.16] }), GILT);
  b.add('chest', xf(cyl(0.012, 0.012, -0.22, -0.16, 6), { p: [0, 0.1, 0], r: [Math.PI / 2, 0, 0] }), dark);
  b.add('chest', xf(torus(0.05, 0.012, 5, 12), { p: [0, 0.1, -0.27], r: [0, Math.PI / 2, 0] }), metal);
  // rivets
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.add('chest', xf(ellipsoid(0.012, 0.012, 0.012, { segs: 6, rows: 4 }), { p: [Math.sin(a) * 0.2, 0.2, Math.cos(a) * 0.16] }), dark); }
  // shoulders: bronze balls; arms: rods with ball joints
  b.addLR('upperArmL', 'upperArmR', () => xf(ellipsoid(0.07, 0.07, 0.07, { segs: 10, rows: 6 }), {}), metal);
  b.addLR('upperArmL', 'upperArmR', () => cyl(0.028, 0.03, -0.29, 0, 8), dark);
  b.addLR('forearmL', 'forearmR', () => xf(ellipsoid(0.045, 0.045, 0.045, { segs: 8, rows: 5 }), {}), metal);
  b.addLR('forearmL', 'forearmR', () => cyl(0.024, 0.028, -0.25, 0, 8), dark);
  addHands(b, 'gauntlet', dark, metal);
  // legs
  b.addLR('thighL', 'thighR', () => cyl(0.034, 0.04, -0.44, 0, 8), dark);
  b.addLR('thighL', 'thighR', () => xf(ellipsoid(0.07, 0.06, 0.07, { segs: 10, rows: 6 }), { p: [0, 0.02, 0] }), metal);
  b.addLR('shinL', 'shinR', () => xf(ellipsoid(0.055, 0.055, 0.055, { segs: 8, rows: 5 }), {}), metal);
  b.addLR('shinL', 'shinR', () => loft([{ y: 0, rx: 0.04 }, { y: -0.3, rx: 0.05, rz: 0.06 }, { y: -0.42, rx: 0.035 }], { segs: 10 }), metal);
  b.addLR('footL', 'footR', () => xf(box(0.08, 0.05, 0.2), { p: [0, -0.035, 0.05] }), dark);
  // neck and bell-head with a single lit lens
  b.add('neck', cyl(0.03, 0.03, 0, 0.1, 8), dark);
  b.add('head', xf(bellGeom(0.22), { p: [0, 0.2, 0] }), metal);
  b.add('head', xf(cyl(0.05, 0.05, 0, 0.02, 14), { p: [0, 0.1, 0.1], r: [Math.PI / 2, 0, 0] }), dark);
  b.add('head', xf(ellipsoid(0.028, 0.028, 0.01, { segs: 10, rows: 6 }), { p: [0, 0.1, 0.122] }), 'bell_light');
  b.add('head', xf(torus(0.02, 0.006, 4, 10), { p: [0, 0.23, 0] }), dark);
  return b.build();
}

// ================================================================== vault guardian (animated armour)

function guardian(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 91);
  const sex = 'm';
  // hollow: black cloth under the plate, light in the gaps
  addTrunk(b, sex, 'cloth_black|t=202022', { y0: -0.16, y1: 0.56, inflate: 0.02 });
  addShoulders(b, sex, 'cloth_black|t=202022', 0.02);
  mailSkirt(b, sex, { y0: 0.12, y1: -0.34, mat: 'iron|t=8a8070|r=0.6' });
  cuirass(b, sex, { mat: GILT_STEEL, trim: GILT, inflate: 0.05, keel: 0.07, rivets: true, dents: 2 });
  gorget(b, sex, { mat: GILT_STEEL, trim: GILT, high: true });
  fauld(b, sex, { mat: GILT_STEEL, trim: GILT, lames: 4 });
  tassets(b, { mat: GILT_STEEL, trim: GILT, len: 0.3, y: -0.12, lames: 4 });
  pauldrons(b, { mat: GILT_STEEL, trim: GILT, size: 1.35, lames: 4, style: 'tall' });
  addArms(b, sex, 'cloth_black|t=202022', { inflate: 0.02 });
  armPlates(b, sex, { mat: GILT_STEEL, trim: GILT, rerebrace: true, couter: true, vambrace: true, wing: true });
  addHands(b, 'gauntlet', GILT_STEEL, GILT);
  addLegs(b, sex, 'cloth_black|t=202022', { inflate: 0.02 });
  legPlates(b, sex, { mat: GILT_STEEL, trim: GILT, cuisse: true, poleyn: true, greave: true });
  addFeet(b, sex, 'sabaton', GILT_STEEL, GILT_STEEL);
  greatHelm(b, { mat: GILT_STEEL, trim: GILT, eyes: true, crest: false });
  // light burning in the joints and the throat
  for (const [bone, p, r] of [['neck', [0, 0.03, 0.05], 0.05], ['forearmL', [0, 0.01, 0], 0.035], ['forearmR', [0, 0.01, 0], 0.035], ['shinL', [0, 0.02, 0.02], 0.04], ['shinR', [0, 0.02, 0.02], 0.04]] as const) {
    b.add(bone, xf(ellipsoid(r, r, r, { segs: 8, rows: 5 }), { p: p as V3 }), 'bell_light');
  }
  // the treasury keyhole plate on the breast
  const z = trunkZ(sex, b.shoulder, 0, 0.3, 1, 0.075);
  b.add('hips', xf(box(0.14, 0.18, 0.012), { p: [0, 0.3, z] }), GILT, { skin: trunkSkin });
  b.add('hips', xf(cyl(0.022, 0.022, 0, 0.006, 10), { p: [0, 0.32, z + 0.008], r: [Math.PI / 2, 0, 0] }), 'bell_light', { skin: trunkSkin });
  b.add('hips', xf(box(0.018, 0.06, 0.006), { p: [0, 0.28, z + 0.008] }), 'bell_light', { skin: trunkSkin });
  return b.build();
}

// ================================================================== coin-mimic

interface MimicOpts { w: number; h: number; d: number; crown?: boolean; seed: number }

/**
 * Chest body rigid on the hips (hips-local: y ∈ [-0.38, h-0.38], centred), thin iron legs, coin-chain
 * arms. The lid is a separate object on the hips bone, hinged at the back top edge; its opening
 * follows the head bone's pitch (negative X = open), so clips drive the mouth.
 */
function mimic(rig: Rig, seed: number, o: MimicOpts): CharacterModel {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 17);
  const { w, h, d } = o;
  const y0 = -0.38, y1 = y0 + h;
  const wood = 'timber|t=8a6a50', iron = M.iron;
  // body: planks, bands, corner straps, keyhole plate
  b.add('hips', xf(box(w, h, d), { p: [0, (y0 + y1) / 2, 0] }), wood);
  for (const x of [-w * 0.36, 0, w * 0.36]) b.add('hips', xf(box(0.05, h + 0.01, d + 0.02), { p: [x, (y0 + y1) / 2, 0] }), iron);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add('hips', xf(box(0.07, h + 0.02, 0.07), { p: [sx * (w / 2 - 0.02), (y0 + y1) / 2, sz * (d / 2 - 0.02)] }), iron);
  b.add('hips', xf(box(0.12, 0.16, 0.02), { p: [0, y1 - 0.1, d / 2 + 0.012] }), GILT);
  // dark gullet under the lid, teeth along the rim, a tongue on the neck bone
  b.add('hips', xf(box(w - 0.08, 0.02, d - 0.08), { p: [0, y1 - 0.02, 0] }), 'cloth_black|c=1a0806|r=1');
  const teeth: G[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -w / 2 + 0.08 + (i * (w - 0.16)) / 8;
    teeth.push(xf(loft([{ y: 0.05, rx: 0.002 }, { y: 0, rx: 0.016 }], { segs: 5, capBottom: true }), { p: [x, y1 - 0.02, d / 2 - 0.05] }));
    teeth.push(xf(loft([{ y: 0.04, rx: 0.002 }, { y: 0, rx: 0.014 }], { segs: 5, capBottom: true }), { p: [x + 0.03, y1 - 0.02, -d / 2 + 0.06] }));
  }
  b.add('hips', merge(teeth), 'bone|t=d8d0b0');
  // uneven coins spilling at the front seam (the tell)
  const rng = new Rng(seed + 5);
  for (let i = 0; i < 7; i++) {
    const x = rng.range(-w * 0.4, w * 0.4);
    b.add('hips', xf(cyl(0.028, 0.028, 0, 0.006, 10), { p: [x, y1 - 0.01 + rng.range(-0.02, 0.02), d / 2 + 0.005], r: [Math.PI / 2 + rng.range(-0.5, 0.5), 0, rng.range(-0.6, 0.6)] }), GILT);
  }
  // legs: thin iron with claw feet
  b.addLR('thighL', 'thighR', () => cyl(0.022, 0.03, -0.44, 0, 6), iron);
  b.addLR('shinL', 'shinR', () => cyl(0.018, 0.022, -0.43, 0, 6), iron);
  b.addLR('shinL', 'shinR', () => xf(ellipsoid(0.035, 0.035, 0.035, { segs: 6, rows: 4 }), {}), GILT);
  b.addLR('footL', 'footR', (s) => merge([-1, 0, 1].map((k) => xf(loft([{ y: 0.14, rx: 0.003 }, { y: 0, rx: 0.018 }], { segs: 5, capBottom: true }), { p: [k * 0.03 * s, -0.03, 0.02], r: [1.4, 0, k * 0.3] }))), iron);
  // arms: chains of coins ending in claws
  b.addLR('upperArmL', 'upperArmR', () => merge([0, 1, 2, 3, 4, 5].map((i) => xf(torus(0.03, 0.008, 4, 10), { p: [0, -0.02 - i * 0.05, 0], r: [0, i % 2 ? Math.PI / 2 : 0, 0] }))), iron);
  b.addLR('forearmL', 'forearmR', () => merge([0, 1, 2, 3, 4].map((i) => xf(cyl(0.028, 0.028, -0.004, 0.004, 10), { p: [0, -0.02 - i * 0.05, 0], r: [Math.PI / 2, 0, i * 0.7] }))), GILT);
  b.addLR('forearmL', 'forearmR', () => cyl(0.012, 0.012, -0.26, 0, 5), iron);
  b.addLR('handL', 'handR', () => merge([-1, 0, 1].map((k) => xf(loft([{ y: 0.12, rx: 0.003 }, { y: 0, rx: 0.016 }], { segs: 5, capBottom: true }), { p: [k * 0.025, -0.03, 0.02], r: [Math.PI, 0, k * 0.25] }))), iron);
  const model = b.build();
  // ---- the lid (separate object on the hips bone)
  const s = rig.proportions.height, k = rig.proportions.bulk;
  const pivot = new THREE.Group();
  pivot.name = 'mimicLid';
  pivot.position.set(0, y1 * s, (-d / 2) * s * k);
  const lidG: THREE.BufferGeometry[] = [];
  const lid = new THREE.CylinderGeometry(d / 2, d / 2, w, 14, 1, false, 0, Math.PI);
  lid.rotateZ(Math.PI / 2);
  lid.scale(1, 0.55, 1);
  lid.translate(0, 0, d / 2);
  lidG.push(lid);
  const mk = (g: THREE.BufferGeometry, mat: string) => { const m = new THREE.Mesh(g, weaponMaterial(mat)); m.castShadow = true; m.scale.set(s * k, s, s * k); pivot.add(m); return m; };
  const lidMesh = mk(lidG[0], wood);
  const bands: THREE.BufferGeometry[] = [];
  for (const x of [-w * 0.36, 0, w * 0.36]) { const g = new THREE.CylinderGeometry(d / 2 + 0.012, d / 2 + 0.012, 0.05, 14, 1, true, 0, Math.PI); g.rotateZ(Math.PI / 2); g.scale(1, 0.55, 1); g.translate(x, 0, d / 2); bands.push(g); }
  mk(mergeBuf(bands), iron);
  const lipTeeth: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) { const g = new THREE.ConeGeometry(0.016, 0.05, 5); g.rotateX(Math.PI); g.translate(-w / 2 + 0.1 + (i * (w - 0.2)) / 7, -0.01, d - 0.05); lipTeeth.push(g); }
  mk(mergeBuf(lipTeeth), 'bone|t=d8d0b0');
  if (o.crown) {
    const cr: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(w * 0.24, w * 0.25, 0.14, 20, 1, true).translate(0, d * 0.28 + 0.07, d / 2)];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cr.push(new THREE.ConeGeometry(0.04, 0.22, 4).translate(Math.sin(a) * w * 0.245, d * 0.28 + 0.24, d / 2 + Math.cos(a) * w * 0.245)); }
    mk(mergeBuf(cr), GILT);
    mk(new THREE.OctahedronGeometry(0.06).translate(0, d * 0.28 + 0.1, d / 2 + w * 0.25), 'bell_light');
  }
  rig.bones.hips.add(pivot);
  const head = rig.bones.head;
  const up = model.updateSecondary.bind(model);
  const dis = model.setDissolve.bind(model);
  const disp = model.dispose.bind(model);
  model.updateSecondary = (dt: number) => {
    up(dt);
    const open = Math.max(0, -head.rotation.x);
    pivot.rotation.x = -Math.min(1.9, 0.03 + open * 1.1);
  };
  model.setDissolve = (t: number) => { dis(t); pivot.visible = t < 0.45; };
  model.dispose = () => { pivot.removeFromParent(); disp(); };
  model.meshes.push(lidMesh);
  return model;
}

function mergeBuf(list: THREE.BufferGeometry[]) {
  const n = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let c = 0; for (const g of n) c += g.attributes.position.count;
  const pos = new Float32Array(c * 3), nor = new Float32Array(c * 3), uv = new Float32Array(c * 2);
  let o = 0;
  for (const g of n) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array as Float32Array, o * 3); nor.set(g.attributes.normal.array as Float32Array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

// ================================================================== ward-coffer

function coffer(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 31 + 3);
  // the coffer sits on the ground: hips-local y ∈ [-0.98, -0.3] (rig at rest, hips at 0.98)
  const y0 = -0.96, y1 = -0.32, w = 1.0, d = 0.7;
  b.add('hips', xf(box(w, y1 - y0, d), { p: [0, (y0 + y1) / 2, 0] }), 'timber_dark|t=806050');
  for (const x of [-0.38, 0, 0.38]) b.add('hips', xf(box(0.06, y1 - y0 + 0.02, d + 0.03), { p: [x, (y0 + y1) / 2, 0] }), GILT);
  b.add('hips', xf(loft([{ y: 0.0, rx: w / 2, rz: d / 2, p: 4 }, { y: 0.16, rx: w / 2 - 0.05, rz: d / 2 - 0.1, p: 4 }, { y: 0.2, rx: w / 2 - 0.12, rz: d / 2 - 0.18, p: 4 }], { segs: 16, capTop: true }), { p: [0, y1, 0] }), GILT);
  // lit keyhole on every face and the ward ring floating above
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const r = Math.abs(Math.sin(a)) > 0.5 ? w / 2 : d / 2;
    const p: V3 = [Math.sin(a) * (r + 0.012), (y0 + y1) / 2 + 0.05, Math.cos(a) * (r + 0.012)];
    b.add('hips', xf(box(0.2, 0.24, 0.01), { p, r: [0, a, 0] }), 'bronze');
    b.add('hips', xf(cyl(0.035, 0.035, 0, 0.012, 10), { p: [p[0] + Math.sin(a) * 0.006, p[1] + 0.03, p[2] + Math.cos(a) * 0.006], r: [Math.PI / 2, 0, a] }), 'bell_light');
    b.add('hips', xf(box(0.026, 0.08, 0.012), { p: [p[0] + Math.sin(a) * 0.006, p[1] - 0.03, p[2] + Math.cos(a) * 0.006], r: [0, a, 0] }), 'bell_light');
  }
  b.add('hips', xf(torus(0.42, 0.018, 6, 36), { p: [0, 0.05, 0], r: [Math.PI / 2, 0, 0] }), 'bell_light');
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.add('hips', xf(box(0.05, 0.05, 0.05), { p: [Math.cos(a) * 0.42, 0.05, Math.sin(a) * 0.42], r: [0.6, a, 0.6] }), GILT); }
  void seed;
  return b.build();
}

// ================================================================== Treasurer Aurel Mask

function aurel(rig: Rig, phase: 1 | 2 | 3) {
  const b = new CharBuilder(rig, 'boss', 4401 + phase);
  b.cracks = phase === 1 ? 0 : phase === 2 ? 0.7 : 1.5;
  const sex = 'm';
  addNeck(b, sex, 'skin_pale|t=c8c0b8');
  addHead(b, { sex, skin: 'skin_pale|t=c8c0b8', hair: 'grey', style: 'long', beard: 'none', old: true, unlived: phase > 1 });
  // ---- the mask (a gilt oval with a keyhole mouth and slit eyes); cracked in phase 2, gone in 3
  if (phase < 3) {
    const mask: Parameters<typeof loft>[0] = [{ y: 0.2, rx: 0.07, rz: 0.03 }, { y: 0.14, rx: 0.088, rz: 0.04 }, { y: 0.06, rx: 0.086, rz: 0.04 }, { y: -0.02, rx: 0.07, rz: 0.035 }, { y: -0.06, rx: 0.04, rz: 0.025 }];
    b.add('head', xf(loft(mask, { segs: 20, phi0: phase === 2 ? -1.2 : -1.35, phiLen: phase === 2 ? 2.0 : 2.7, capTop: false }), { p: [0, 0, 0.068] }), GILT);
    for (const s of [1, -1]) b.add('head', xf(box(0.034, 0.008, 0.01), { p: [s * 0.036, 0.1, 0.112], r: [0, s * 0.25, 0] }), 'cloth_black|c=0a0806|r=1');
    b.add('head', xf(extrude([[-0.014, -0.01], [0.014, -0.01], [0.006, 0.02], [-0.006, 0.02]], 0.01, 0), { p: [0, 0.01, 0.107] }), 'cloth_black|c=0a0806|r=1');
    b.add('head', xf(cyl(0.011, 0.011, 0, 0.01, 10), { p: [0, 0.036, 0.107], r: [Math.PI / 2, 0, 0] }), 'cloth_black|c=0a0806|r=1');
    b.add('head', xf(torus(0.09, 0.004, 4, 24, Math.PI * 1.2), { p: [0, 0.07, 0.07], r: [0, 0, -Math.PI * 0.1] }), 'bronze');
    if (phase === 2) {
      b.add('head', sweep([[0.05, 0.19, 0.1], [0.02, 0.12, 0.113], [0.035, 0.05, 0.112], [0.0, -0.02, 0.1]], { r: 0.004, sides: 4, segs: 8 }), M.crack);
      b.add('head', xf(ellipsoid(0.012, 0.012, 0.004, { segs: 6, rows: 4 }), { p: [-0.04, 0.1, 0.1] }), 'bell_light');
    }
  }
  // tall collar of gilt plates
  gorget(b, sex, { mat: GILT, trim: 'bronze', high: true });
  // ---- body: black robe, gilded ledger-armour of page-plates, a mantle
  addTrunk(b, sex, 'cloth_black|t=2e2a30', { y0: -0.16, y1: 0.56, inflate: 0.012, crack: 1 });
  addShoulders(b, sex, 'cloth_black|t=2e2a30', 0.012);
  robeSkirt(b, sex, { mat: 'cloth_black|t=2e2a30', y0: 0.12, hem: -1.0, r1: [0.3, 0.28], trim: GILT, emb: true, tatter: phase === 3 ? 0.25 : 0.05, cols: 22, rows: 11, open: 0.3 });
  cuirass(b, sex, { mat: GILT_STEEL, trim: GILT, inflate: 0.03, keel: 0.03, rivets: true, crack: phase > 1 ? 1.5 : 0 });
  // ledger lames: gilt-edged "pages" layered down the front of the robe
  for (let i = 0; i < 5; i++) {
    const y = -0.05 - i * 0.12;
    const zf = trunkZ(sex, b.shoulder, 0, Math.max(y, -0.1), 1, 0.06) + 0.02 + i * 0.012;
    b.add('hips', xf(box(0.26 - i * 0.02, 0.14, 0.012), { p: [0, y, zf], r: [-0.08 - i * 0.02, 0, 0] }), i % 2 ? 'parchment|t=d8c8a0' : GILT, { skin: (p) => (p.y > -0.05 ? [['hips', 1]] : [['hips', 0.6], ['thighL', 0.2], ['thighR', 0.2]]) });
  }
  pauldrons(b, { mat: GILT_STEEL, trim: GILT, size: 1.15, lames: 3, style: 'bell' });
  mantle(b, sex, { mat: 'cloth_black|t=3a3440', len: 0.4, trim: GILT, emb: true, tatter: phase === 3 ? 0.2 : 0.03 });
  belt(b, sex, { y: 0.1, over: 0.05, mat: GILT, buckle: GILT, pouches: 0, strapEnd: false });
  // the chained ledger at the left hip
  const lz = trunkZ(sex, b.shoulder, 0.2, -0.05, 1, 0.05);
  b.add('hips', xf(box(0.2, 0.26, 0.06), { p: [0.24, -0.22, lz - 0.04], r: [0.1, -0.4, 0.15] }), M.leatherDark, { skin: (p) => [['hips', 0.55], ['thighL', 0.45 * Math.min(1, Math.max(0, -p.y * 3))]] });
  b.add('hips', xf(box(0.21, 0.02, 0.065), { p: [0.24, -0.1, lz - 0.04], r: [0.1, -0.4, 0.15] }), GILT, { skin: trunkSkin });
  drapeChain(b, 'hips', [[0.12, 0.1, lz + 0.02], [0.2, 0.0, lz], [0.24, -0.09, lz - 0.03]], GILT, 0.024, trunkSkin);
  // phase 3: the mask hangs from the belt
  if (phase === 3) {
    b.add('hips', xf(ellipsoid(0.07, 0.09, 0.025, { segs: 14, rows: 8 }), { p: [-0.18, -0.08, trunkZ(sex, b.shoulder, -0.18, 0, 1, 0.06) + 0.02], r: [0.2, 0.3, 0.3] }), GILT, { skin: trunkSkin });
  }
  addArms(b, sex, 'cloth_black|t=2e2a30', { inflate: 0.014, crack: 1 });
  bellSleeves(b, sex, { mat: 'cloth_black|t=2e2a30', trim: GILT, emb: true, flare: 0.07, len: 0.2 });
  armPlates(b, sex, { mat: GILT_STEEL, trim: GILT, rerebrace: false, couter: true, vambrace: true });
  addHands(b, 'glove', 'leather_dark|t=5a5058', GILT);
  addLegs(b, sex, 'cloth_black', { inflate: 0.01 });
  addFeet(b, sex, 'tallboot', M.leatherDark, GILT);
  return b.build();
}

// ================================================================== NPCs

function ione(rig: Rig) {
  const b = new CharBuilder(rig, 'npc', 811);
  const sex = 'f';
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'auburn', style: 'braid', soot: false });
  addTrunk(b, sex, 'cloth_linen|t=c8c0b0', { y0: -0.16, y1: 0.55, inflate: 0.008 });
  addTrunk(b, sex, 'cloth_blue|t=5a6070', { y0: 0.02, y1: 0.4, inflate: 0.018 });
  addShoulders(b, sex, 'cloth_linen|t=c8c0b0', 0.008);
  robeSkirt(b, sex, { mat: 'cloth_brown|t=7a6450', y0: 0.08, hem: -0.86, r1: [0.26, 0.22], tatter: 0.06, cols: 18, rows: 9 });
  tabard(b, sex, { mat: 'leather|t=a08a70', top: 0.36, hem: -0.5, over: 0.03, w: [0.09, 0.14, 0.16], back: false, tatter: 0.02 });
  belt(b, sex, { y: 0.07, over: 0.045, mat: M.leatherDark, pouches: 2 });
  // an ink pot and a ring of counting-house keys
  b.add('hips', xf(cyl(0.025, 0.022, -0.03, 0.03, 8), { p: [0.16, 0.02, trunkZ(sex, b.shoulder, 0.16, 0.02, 1, 0.06)] }), 'glass', { skin: trunkSkin });
  b.add('hips', xf(torus(0.04, 0.005, 4, 12), { p: [-0.17, -0.02, trunkZ(sex, b.shoulder, -0.17, 0, 1, 0.06)], r: [1.3, 0, 0] }), M.iron, { skin: trunkSkin });
  addArms(b, sex, 'cloth_linen|t=c8c0b0', { inflate: 0.012 });
  // sleeve guards (clerk's)
  for (const s of [1, -1] as const) b.loft(s > 0 ? 'forearmL' : 'forearmR', [{ y: -0.04, rx: 0.042, rz: 0.038 }, { y: -0.2, rx: 0.036, rz: 0.032 }], 'cloth_black|t=4a4448', { segs: 10, inflate: 0.008 });
  addHands(b, 'relaxed', 'skin|t=c0b0a8');
  addLegs(b, sex, 'cloth_brown|t=6a5a4a', { inflate: 0.01 });
  addFeet(b, sex, 'boot', M.leatherDark);
  // quill behind the ear
  b.add('head', xf(cyl(0.002, 0.004, 0, 0.16, 4), { p: [-0.09, 0.12, -0.02], r: [0.3, 0, 0.5] }), 'cloth_linen|t=e8e0d0');
  return b.build();
}

function mother(rig: Rig) {
  const b = new CharBuilder(rig, 'npc', 823);
  const sex = 'f';
  addNeck(b, sex, 'skin|t=c0b0a0');
  addHead(b, { sex, hair: 'dark', style: 'long', old: true, shade: 0.2 });
  addTrunk(b, sex, 'cloth_brown|t=8a7a66', { y0: -0.16, y1: 0.55, inflate: 0.006 });
  addShoulders(b, sex, 'cloth_brown|t=8a7a66', 0.006);
  robeSkirt(b, sex, { mat: 'cloth_brown|t=6a5a4a', y0: 0.1, hem: -0.92, r1: [0.24, 0.2], tatter: 0.25, cols: 18, rows: 9 });
  hood(b, { mat: 'cloth_linen|t=8a8276', depth: 1.1, tip: 0.02, open: 1.0, tatter: true });
  mantle(b, sex, { mat: 'cloth_linen|t=8a8276', len: 0.36, tatter: 0.3 });
  addArms(b, sex, 'cloth_brown|t=8a7a66', { inflate: 0.008 });
  addHands(b, 'relaxed', 'skin|t=c0b0a0');
  addLegs(b, sex, 'skin|t=c0b0a0');
  addFeet(b, sex, 'wrap', 'cloth_linen|t=7a7266');
  return b.build();
}

function child(rig: Rig) {
  const b = new CharBuilder(rig, 'npc', 829);
  const sex = 'm';
  addNeck(b, sex, 'skin|t=c8b8a8');
  addHead(b, { sex, hair: 'fair', style: 'shaggy', shade: 0.1 });
  addTrunk(b, sex, 'cloth_linen|t=9a9282', { y0: -0.16, y1: 0.55, inflate: 0.008 });
  addShoulders(b, sex, 'cloth_linen|t=9a9282', 0.008);
  robeSkirt(b, sex, { mat: 'cloth_linen|t=9a9282', y0: 0.08, hem: -0.46, r1: [0.2, 0.17], tatter: 0.3, cols: 14, rows: 6 });
  addArms(b, sex, 'skin|t=c8b8a8');
  addHands(b, 'relaxed', 'skin|t=c8b8a8');
  addLegs(b, sex, 'skin|t=c8b8a8');
  addFeet(b, sex, 'bare');
  return b.build();
}

function musterSoldier(rig: Rig) {
  const b = new CharBuilder(rig, 'npc', 853);
  b.cracks = 0.3;
  b.ghost = { color: new THREE.Color(0.32, 0.42, 0.58), min: 0.14 };
  buildLook(b, { head: 'greyford', body: 'greyford', arms: 'greyford', legs: 'greyford', cloak: false }, { unlived: true, variant: 7 });
  return b.build();
}

// ================================================================== weapons

class WB {
  private parts = new Map<string, G[]>();
  add(key: string, g: G, t?: Parameters<typeof xf>[1]) { norm(g); if (t) xf(g, t); let l = this.parts.get(key); if (!l) this.parts.set(key, (l = [])); l.push(g); return this; }
  build(name: string, m: Omit<WeaponModelExt, 'object'>): WeaponModelExt {
    const group = new THREE.Group();
    group.name = 'weapon:' + name;
    let tris = 0;
    for (const [key, list] of this.parts) {
      const g = merge(list);
      g.computeBoundingSphere();
      tris += triCount(g);
      const mesh = new THREE.Mesh(g, weaponMaterial(key));
      mesh.castShadow = !key.startsWith('bell_light');
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return { object: group, ...m, triangles: tris };
  }
}
const rod = (y0: number, y1: number, r0: number, r1 = r0, segs = 8) => loft([{ y: y1, rx: r1 }, { y: (y0 + y1) / 2, rx: (r0 + r1) / 2 }, { y: y0, rx: r0 }], { segs, capTop: true, capBottom: true });
const band = (y: number, r: number, h = 0.02) => loft([{ y: y + h / 2, rx: r * 0.92 }, { y: y + h * 0.3, rx: r }, { y: y - h * 0.3, rx: r }, { y: y - h / 2, rx: r * 0.92 }], { segs: 10, capTop: true, capBottom: true });

registerWeaponModel('militia_club', () => {
  const wb = new WB();
  wb.add('timber_dark', loft([{ y: 0.72, rx: 0.045, rz: 0.04, p: 3 }, { y: 0.45, rx: 0.04, rz: 0.036, p: 3 }, { y: 0.0, rx: 0.022 }, { y: -0.14, rx: 0.02 }], { segs: 8, capTop: true, capBottom: true }));
  wb.add('rope', band(-0.06, 0.024, 0.12));
  const nails: G[] = [];
  for (let i = 0; i < 9; i++) { const a = i * 2.3, y = 0.45 + (i % 3) * 0.09; nails.push(xf(cyl(0.004, 0.004, 0, 0.06, 4), { p: [Math.sin(a) * 0.035, y, Math.cos(a) * 0.035], r: [Math.cos(a) * 1.5, 0, -Math.sin(a) * 1.5] })); }
  wb.add('iron', merge(nails));
  return wb.build('militia_club', { hit: { from: 0.3, to: 0.74, radius: 0.08 }, trail: { from: 0.4, to: 0.72 } });
});

registerWeaponModel('militia_fork', () => {
  const wb = new WB();
  wb.add('timber', rod(-0.7, 1.05, 0.016, 0.018));
  wb.add('iron', band(1.05, 0.022, 0.04));
  const tines: G[] = [];
  for (const x of [-0.05, 0, 0.05]) tines.push(sweep([[x * 0.3, 1.06, 0], [x, 1.14, 0], [x, 1.36, 0.01]], { r: 0.006, sides: 5, segs: 6 }));
  tines.push(xf(box(0.11, 0.015, 0.012), { p: [0, 1.1, 0] }));
  wb.add('iron_rusted', merge(tines));
  return wb.build('militia_fork', { hit: { from: 0.9, to: 1.36, radius: 0.06 }, trail: { from: 1.0, to: 1.36 }, offhandGrip: 0.4 });
});

registerWeaponModel('collector_hook', () => {
  const wb = new WB();
  wb.add('timber_dark', rod(-0.35, 1.05, 0.014, 0.016));
  for (const y of [-0.3, 0.2, 0.9]) wb.add(GILT, band(y, 0.02));
  wb.add(GILT, xf(ellipsoid(0.03, 0.03, 0.03, { segs: 10, rows: 6 }), { p: [0, -0.36, 0] }));
  // the gaff: a curved iron hook with a barb, facing +Z
  wb.add('iron', sweep([[0, 1.02, 0], [0, 1.18, 0.02], [0, 1.26, 0.1], [0, 1.2, 0.2], [0, 1.1, 0.19]], { r: 0.012, sides: 6, segs: 16 }));
  wb.add('iron', xf(loft([{ y: 0.05, rx: 0.002 }, { y: 0, rx: 0.012 }], { segs: 5, capBottom: true }), { p: [0, 1.1, 0.19], r: [Math.PI * 0.8, 0, 0] }));
  return wb.build('collector_hook', { hit: { from: 0.8, to: 1.26, radius: 0.1 }, trail: { from: 0.9, to: 1.24 }, offhandGrip: 0.3 });
});

registerWeaponModel('tally_glaive', () => {
  const wb = new WB();
  wb.add('iron', rod(-0.7, 1.2, 0.018, 0.02));
  for (const y of [-0.1, 0.4, 1.18]) wb.add('bronze', band(y, 0.026, 0.04));
  // a coin-disc blade: a bronze wheel with a sharpened steel rim segment on +Z
  wb.add('bronze', xf(cyl(0.16, 0.16, -0.012, 0.012, 24), { p: [0, 1.36, 0.04], r: [0, 0, Math.PI / 2] }));
  wb.add('steel_bright', xf(torus(0.165, 0.01, 4, 24, Math.PI * 0.9), { p: [0, 1.36, 0.04], r: [0, Math.PI / 2, -Math.PI * 0.45] }));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; wb.add('iron', xf(box(0.03, 0.03, 0.03), { p: [0, 1.36 + Math.cos(a) * 0.11, 0.04 + Math.sin(a) * 0.11] })); }
  wb.add('iron', xf(loft([{ y: 0.2, rx: 0.002 }, { y: 0, rx: 0.018, rz: 0.008 }], { segs: 6, capBottom: true }), { p: [0, 1.52, 0.04] }));
  return wb.build('tally_glaive', { hit: { from: 1.1, to: 1.62, radius: 0.16 }, trail: { from: 1.2, to: 1.6 }, offhandGrip: 0.55 });
});

registerWeaponModel('guardian_maul', () => {
  const wb = new WB();
  wb.add('timber_dark', rod(-0.4, 1.1, 0.024, 0.026));
  for (const y of [-0.35, 0.3, 1.0]) wb.add(GILT, band(y, 0.032, 0.05));
  const c = 1.2;
  wb.add('bronze', xf(box(0.22, 0.24, 0.42), { p: [0, c, 0] }));
  wb.add(GILT, xf(box(0.24, 0.05, 0.44), { p: [0, c + 0.1, 0] }));
  wb.add(GILT, xf(box(0.24, 0.05, 0.44), { p: [0, c - 0.1, 0] }));
  // keyhole faces at both ends
  for (const s of [1, -1]) {
    wb.add(GILT, xf(box(0.2, 0.2, 0.02), { p: [0, c, s * 0.22] }));
    wb.add('cloth_black|c=0a0806', xf(cyl(0.03, 0.03, 0, 0.01, 10), { p: [0, c + 0.03, s * 0.232], r: [Math.PI / 2, 0, 0] }));
  }
  return wb.build('guardian_maul', { hit: { from: c - 0.2, to: c + 0.16, radius: 0.24 }, trail: { from: c - 0.1, to: c + 0.1 }, offhandGrip: 0.45 });
});

const tallyRod = (id: string, scale: number, catalyst: boolean) => () => {
  const wb = new WB();
  wb.add('cloth_black|t=3a3440', rod(-0.62 * scale, 1.1 * scale, 0.016, 0.018));
  for (const y of [-0.62, -0.12, 0.12, 0.6, 1.05]) wb.add(GILT, band(y * scale, 0.022, 0.025));
  const c = 1.28 * scale;
  // head: a keyhole plate framed in gilt, a small bell beneath it
  wb.add(GILT, xf(extrude([[-0.12, -0.14], [0.12, -0.14], [0.14, 0.1], [0.08, 0.16], [-0.08, 0.16], [-0.14, 0.1]], 0.025, 0.004), { p: [0, c, 0] }));
  wb.add('bronze', xf(box(0.2, 0.22, 0.034), { p: [0, c, 0] }));
  for (const s of [1, -1]) {
    wb.add('cloth_black|c=0a0806', xf(cyl(0.03, 0.03, 0, 0.01, 12), { p: [0, c + 0.035, s * 0.018], r: [Math.PI / 2, 0, 0] }));
    wb.add('cloth_black|c=0a0806', xf(box(0.022, 0.07, 0.01), { p: [0, c - 0.02, s * 0.018] }));
  }
  wb.add('bronze_bell', xf(bellGeom(0.07), { p: [0, c - 0.16, 0] }));
  wb.add(GILT, xf(loft([{ y: 0.14, rx: 0.002 }, { y: 0, rx: 0.024 }], { segs: 6, capBottom: true }), { p: [0, c + 0.16, 0] }));
  if (catalyst) wb.add('bell_light', xf(ellipsoid(0.02, 0.02, 0.02, { segs: 8, rows: 6 }), { p: [0, c + 0.035, 0] }));
  return wb.build(id, { hit: { from: 0.35 * scale, to: c + 0.3, radius: 0.12 }, trail: { from: c - 0.2, to: c + 0.28 }, castPoint: new THREE.Vector3(0, c + 0.04, 0), offhandGrip: -0.4 * scale });
};
registerWeaponModel('aurel_rod', tallyRod('aurel_rod', 1.15, false));
registerWeaponModel('tally_staff', tallyRod('tally_staff', 1.0, true));

// ================================================================== registration

registerEnemyLook('tr_militia', (rig, seed) => militia(rig, seed));
registerEnemyLook('tr_collector', (rig, seed) => collector(rig, seed, false));
registerEnemyLook('tr_collectorHead', (rig, seed) => collector(rig, seed, true));
registerEnemyLook('tr_sentry', (rig, seed) => clockwork(rig, seed, false));
registerEnemyLook('tr_coinSentinel', (rig, seed) => clockwork(rig, seed, true));
registerEnemyLook('tr_guardian', (rig, seed) => guardian(rig, seed));
registerEnemyLook('tr_mimic', (rig, seed) => mimic(rig, seed, { w: 0.96, h: 0.86, d: 0.7, seed }));
registerEnemyLook('mimicSovereign', (rig, seed) => mimic(rig, seed, { w: 1.02, h: 0.92, d: 0.74, crown: true, seed }));
registerEnemyLook('tr_coffer', (rig, seed) => coffer(rig, seed));
registerEnemyLook('tr_warden', (rig, seed) => {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 97);
  b.cracks = 0.8;
  buildLook(b, { head: 'warden', body: 'warden', arms: 'warden', legs: 'warden', cloak: false }, { unlived: true, variant: seed });
  return b.build();
});
registerEnemyLook('aurelmask', (rig) => aurel(rig, 1));
registerEnemyLook('aurelmask2', (rig) => aurel(rig, 2));
registerEnemyLook('aurelmask3', (rig) => aurel(rig, 3));
registerNpcLook('tr_ione', (rig) => ione(rig));
registerNpcLook('tr_mother', (rig) => mother(rig));
registerNpcLook('tr_child', (rig) => child(rig));
registerNpcLook('tr_muster', (rig) => musterSoldier(rig));
