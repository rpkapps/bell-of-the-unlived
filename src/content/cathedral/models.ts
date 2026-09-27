/**
 * Cathedral looks and weapons (procedural, registered through the model factory's extension points).
 *
 * Silhouettes first: pilgrims are small and hunched under deep hoods with walking staves; flagellants
 * are bare-backed under tall pointed penitent hoods; healer-priests are tall, pale and mitred with a
 * face veil; mourner giants are huge black-veiled shapes with an unclaimed coffin-lid on their backs;
 * bearers wear padded yokes; the cantor is a small red-and-white singer. The Procession carries a
 * gilded reliquary on its back; Saint Vessaline wears pale gilt vestments written over with the names
 * of the absorbed, a crown of little bells, and a face-veil that changes with each borrowed style.
 */
import * as THREE from 'three';
import type { Rig } from '../../actors/Rig';
import { CharBuilder, trunkSkin, type BuiltModel } from '../../actors/models/builder';
import { registerEnemyLook, registerNpcLook, registerWeaponModel, type WeaponModelExt } from '../../actors/models';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet, quilted, type Sex } from '../../actors/models/anatomy';
import { M, tabard, belt, robeSkirt, bellSleeves, mantle, hood, veil, bellGeom, beads, trunkZ, bandolier, shackle, drapeChain, cloak } from '../../actors/models/gear';
import { buildLook } from '../../actors/models/character';
import { loft, sweep, xf, cyl, torus, merge, ellipsoid, box, extrude, norm, type G, type V3, TAU, lerp } from '../../actors/models/parts';
import { weaponMaterial } from '../../actors/models/charMaterials';
import { Rng } from '../../core/rng';

// ------------------------------------------------------------------------------------ palette

const PALE = 'cloth_linen|t=ddd4c2';
const ASH = 'cloth_linen|t=8a8580';
const WOOL = ['cloth_brown|t=9a8a74', 'cloth_brown|t=7a7064', 'cloth_linen|t=8c8478', 'cloth_brown|t=a89c88', 'cloth_black|t=8a8680'];
const SACK = 'cloth_brown|t=b8a888';
const INK = 'cloth_black|t=3a3028';
const SKIN_PALE = 'skin_pale|t=c8bcb0';
const BLOOD = 'cloth_red|t=7a2a22';
const GILT = M.gold;
const SNOWY = 'cloth_linen|t=f0ece4';

/** Short squiggles of "written" names over a surface function f(u,v) → hips-space point. */
function names(b: CharBuilder, f: (u: number, v: number) => V3, rng: Rng, n: number, mat: string, v0 = 0.08, v1 = 0.75, over = 1.012, crossMat?: string) {
  const parts: G[] = [];
  const cross: G[] = [];
  for (let i = 0; i < n; i++) {
    const u = rng.range(0.04, 0.96), v = rng.range(v0, v1), w = rng.range(0.03, 0.06);
    const pts: V3[] = [];
    for (let k = 0; k <= 6; k++) {
      const p = f(u + (k / 6 - 0.5) * w, v + Math.sin(k * 2.3 + i) * 0.006);
      pts.push([p[0] * over, p[1], p[2] * over]);
    }
    parts.push(sweep(pts, { r: 0.0022, sides: 3, segs: 8 }));
    if (crossMat && rng.chance(0.35)) {
      const a = f(u - w * 0.55, v), c = f(u + w * 0.55, v - 0.004);
      cross.push(sweep([[a[0] * over * 1.003, a[1], a[2] * over * 1.003], [c[0] * over * 1.003, c[1], c[2] * over * 1.003]], { r: 0.0025, sides: 3, segs: 2 }));
    }
  }
  if (parts.length) b.add('hips', merge(parts), mat, { skin: trunkSkin });
  if (cross.length && crossMat) b.add('hips', merge(cross), crossMat, { skin: trunkSkin });
}

/** A name-cloth sewn on the back (the procession's pilgrims carry their names on their backs). */
function backCloth(b: CharBuilder, sex: Sex, mat = 'parchment|t=d8ccb0') {
  const y = 0.34, z = trunkZ(sex, b.shoulder, 0, y, -1, 0.03);
  b.add('hips', xf(box(0.2, 0.16, 0.006), { p: [0, y, z - 0.004] }), mat, { skin: trunkSkin });
  const lines: G[] = [];
  for (let i = 0; i < 3; i++) lines.push(xf(box(0.13 - i * 0.02, 0.008, 0.004), { p: [0, y + 0.04 - i * 0.035, z - 0.009] }));
  b.add('hips', merge(lines), M.shadow, { skin: trunkSkin });
}

/** Little pilgrim bells on a rope belt. */
function beltBells(b: CharBuilder, sex: Sex, n: number, y = 0.08) {
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.07;
    const z = trunkZ(sex, b.shoulder, x, y, 1, 0.05);
    b.add('hips', xf(bellGeom(0.035), { p: [x, y - 0.02, z] }), 'bronze_bell', { skin: trunkSkin });
  }
}

// ------------------------------------------------------------------------------------ enemies

function pilgrim(b: CharBuilder, seed: number) {
  const v = new Rng(seed * 7717 + 3);
  const sex: Sex = v.chance(0.4) ? 'f' : 'm';
  const wool = v.pick(WOOL);
  b.cracks = 0.35;
  addNeck(b, sex, SKIN_PALE);
  addHead(b, { sex, skin: SKIN_PALE, hair: v.pick(['dark', 'grey', 'fair'] as const), style: 'none', beard: sex === 'm' && v.chance(0.5) ? 'stubble' : 'none', unlived: true, old: v.chance(0.6), shade: 0.4 });
  addTrunk(b, sex, wool, { y0: -0.16, y1: 0.56, inflate: 0.018, radial: quilted(20, 12, 0.02), crack: 0.6 });
  addShoulders(b, sex, wool, 0.02);
  robeSkirt(b, sex, { mat: wool, y0: 0.12, hem: -0.92, r1: [0.26, 0.22], tatter: 0.14, cols: 20, rows: 10 });
  mantle(b, sex, { mat: v.chance(0.5) ? ASH : wool, len: 0.34, tatter: 0.22 });
  belt(b, sex, { y: 0.08, over: 0.045, mat: M.rope, pouches: 0, buckle: 'bronze_bell', strapEnd: false });
  beltBells(b, sex, v.int(1, 3));
  backCloth(b, sex, ASH);
  addArms(b, sex, wool, { inflate: 0.018, foreY1: -0.16, crack: 0.5 });
  addArms(b, sex, SKIN_PALE, { upper: false });
  addHands(b, 'wrapped', SKIN_PALE, ASH);
  addLegs(b, sex, wool, { inflate: 0.01 });
  addFeet(b, sex, 'wrap', ASH);
  hood(b, { mat: ASH, trim: null, depth: 1.3, tip: 0.1, open: 0.85 });
}

function flagellant(b: CharBuilder, seed: number) {
  const v = new Rng(seed * 331 + 17);
  const sex: Sex = 'm';
  b.cracks = 0.5;
  addNeck(b, sex, SKIN_PALE);
  addTrunk(b, sex, SKIN_PALE, { y0: -0.16, y1: 0.56, inflate: 0.004, crack: 1.2 });
  addShoulders(b, sex, SKIN_PALE);
  // lash welts across the back and shoulders
  const welts: G[] = [];
  for (let i = 0; i < 14; i++) {
    const y = v.range(0.12, 0.52), x0 = v.range(-0.16, 0), x1 = x0 + v.range(0.1, 0.2);
    const pts: V3[] = [];
    for (let k = 0; k <= 5; k++) { const x = lerp(x0, x1, k / 5); const yy = y - (x - x0) * 0.6; pts.push([x, yy, trunkZ(sex, b.shoulder, x, yy, -1, 0.004)]); }
    welts.push(sweep(pts, { r: 0.0045, sides: 3, segs: 6 }));
  }
  b.add('hips', merge(welts), BLOOD, { skin: trunkSkin });
  robeSkirt(b, sex, { mat: SACK, y0: 0.12, hem: -0.5, r1: [0.24, 0.2], tatter: 0.3, cols: 16, rows: 6 });
  belt(b, sex, { y: 0.1, over: 0.03, mat: M.rope, pouches: 0, buckle: M.iron, strapEnd: false });
  drapeChain(b, 'hips', [[0.16, 0.08, 0.1], [0.1, -0.12, 0.16], [-0.04, -0.2, 0.17], [-0.16, 0.06, 0.11]], M.iron, 0.03, trunkSkin);
  addArms(b, sex, SKIN_PALE, { crack: 1 });
  shackle(b, 'forearmL', -0.2, 0.042); shackle(b, 'forearmR', -0.2, 0.042);
  addHands(b, 'wrapped', SKIN_PALE, 'cloth_linen|t=8a6a60');
  addLegs(b, sex, SACK, { inflate: 0.008 });
  addFeet(b, sex, 'bare', SKIN_PALE);
  addHead(b, { sex, skin: SKIN_PALE, hair: 'none', style: 'none', unlived: true, shade: 0.7 });
  // the capirote: a tall pointed penitent hood with a face cloth and eye-holes
  const hoodMat = v.chance(0.5) ? SACK : 'cloth_black|t=7a7068';
  b.add('head', loft([
    { y: 0.62, rx: 0.004, cz: -0.02 }, { y: 0.42, rx: 0.045, rz: 0.05, cz: -0.012 }, { y: 0.25, rx: 0.1, rz: 0.115 }, { y: 0.16, rx: 0.118, rz: 0.135, cz: 0.01 },
  ], { segs: 16, capTop: true }), hoodMat, { skin: () => [['head', 1]] });
  b.add('head', loft([
    { y: 0.17, rx: 0.12, rz: 0.138, cz: 0.012 }, { y: 0.04, rx: 0.124, rz: 0.142, cz: 0.014 }, { y: -0.08, rx: 0.16, rz: 0.17, cz: 0.02 }, { y: -0.16, rx: 0.2, rz: 0.19, cz: 0.02 },
  ], { segs: 18, radial: (th, t) => 1 + 0.03 * Math.sin(th * 6 + t * 3) }), hoodMat, { skin: (p) => { const c = Math.min(1, Math.max(0, -p.y / 0.12)); return [['head', 1 - c], ['chest', c]]; } });
  for (const s of [1, -1]) b.add('head', xf(ellipsoid(0.022, 0.012, 0.006, { segs: 8, rows: 4 }), { p: [s * 0.042, 0.105, 0.152] }), M.shadow, { skin: () => [['head', 1]] });
  b.add('head', xf(box(0.08, 0.1, 0.004), { p: [0, -0.04, 0.155], r: [0.12, 0, 0] }), BLOOD, { skin: () => [['head', 1]] });
}

function healer(b: CharBuilder, seed: number) {
  const v = new Rng(seed * 97 + 5);
  const sex: Sex = v.chance(0.35) ? 'f' : 'm';
  b.cracks = 0.3;
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'grey', style: sex === 'f' ? 'long' : 'short', unlived: true, old: true });
  addTrunk(b, sex, PALE, { y0: -0.16, y1: 0.56, inflate: 0.016 });
  addShoulders(b, sex, PALE, 0.02);
  robeSkirt(b, sex, { mat: PALE, y0: 0.12, hem: -1.02, r1: [0.3, 0.26], tatter: 0.05, trim: GILT, cols: 24, rows: 12 });
  tabard(b, sex, { mat: 'cloth_red|t=a07068', top: 0.54, hem: -0.95, over: 0.03, w: [0.06, 0.07, 0.08], tatter: 0.04, trim: GILT });
  mantle(b, sex, { mat: PALE, len: 0.36, trim: GILT, emb: true });
  belt(b, sex, { y: 0.1, over: 0.04, mat: GILT, buckle: GILT, pouches: 0, strapEnd: false });
  beads(b, 'hips', [0.1, 0.06, trunkZ(sex, b.shoulder, 0.1, 0.06, 1, 0.05)], 0.05, 0.14, GILT, GILT, trunkSkin);
  addArms(b, sex, PALE, { inflate: 0.012 });
  bellSleeves(b, sex, { mat: PALE, trim: GILT, flare: 0.12, len: 0.3, emb: true });
  addHands(b, 'glove', PALE, PALE);
  addLegs(b, sex, PALE);
  addFeet(b, sex, 'boot', PALE);
  // tall mitre and a face veil
  b.add('head', loft([{ y: 0.19, rx: 0.1, rz: 0.11 }, { y: 0.36, rx: 0.09, rz: 0.05 }, { y: 0.46, rx: 0.004, rz: 0.004 }], { segs: 14, capBottom: true }), PALE, { skin: () => [['head', 1]] });
  b.add('head', loft([{ y: 0.2, rx: 0.104, rz: 0.114 }, { y: 0.16, rx: 0.104, rz: 0.114 }], { segs: 16, inflate: 0.004 }), GILT, { skin: () => [['head', 1]] });
  b.add('head', xf(box(0.02, 0.26, 0.012), { p: [0, 0.31, 0.083], r: [-0.28, 0, 0] }), GILT, { skin: () => [['head', 1]] });
  veil(b, { mat: PALE, face: true, y: 0.15, r: 0.13 });
}

function mourner(b: CharBuilder, seed: number) {
  const v = new Rng(seed * 53 + 11);
  const sex: Sex = v.chance(0.5) ? 'f' : 'm';
  b.cracks = 0.4;
  const BLACK = 'cloth_black|t=5a5654';
  addNeck(b, sex, SKIN_PALE);
  addHead(b, { sex, skin: SKIN_PALE, hair: 'none', style: 'none', unlived: true, shade: 0.8 });
  addTrunk(b, sex, BLACK, { y0: -0.16, y1: 0.56, inflate: 0.03, radial: quilted(16, 10, 0.03), crack: 0.6 });
  addShoulders(b, sex, BLACK, 0.03);
  robeSkirt(b, sex, { mat: BLACK, y0: 0.12, hem: -0.98, r1: [0.32, 0.28], tatter: 0.2, cols: 22, rows: 10 });
  mantle(b, sex, { mat: BLACK, len: 0.42, tatter: 0.3, r1: 0.32 });
  belt(b, sex, { y: 0.1, over: 0.06, mat: 'planks', buckle: M.iron, pouches: 0, strapEnd: false });
  // the coffin-lid strapped across the back, with a name scratched out
  const cz = trunkZ(sex, b.shoulder, 0, 0.3, -1, 0.06) - 0.04;
  b.add('hips', xf(extrude([[-0.12, -0.42], [0.12, -0.42], [0.18, 0.22], [0.1, 0.46], [-0.1, 0.46], [-0.18, 0.22]], 0.04), { p: [0, 0.26, cz - 0.02] }), 'planks', { skin: trunkSkin });
  b.add('hips', xf(box(0.14, 0.03, 0.006), { p: [0, 0.4, cz - 0.045] }), M.shadow, { skin: trunkSkin });
  for (const y of [0.05, 0.42]) b.add('hips', xf(box(0.44, 0.03, 0.02), { p: [0, y, cz + 0.01] }), M.iron, { skin: trunkSkin });
  drapeChain(b, 'hips', [[0.16, 0.5, 0.05], [0.1, 0.36, 0.2], [-0.12, 0.2, 0.2], [-0.2, 0.06, 0.1]], M.iron, 0.04, trunkSkin);
  addArms(b, sex, BLACK, { inflate: 0.02, foreY1: -0.18, crack: 0.5 });
  addArms(b, sex, SKIN_PALE, { upper: false });
  addHands(b, 'bare', SKIN_PALE);
  addLegs(b, sex, BLACK, { inflate: 0.02 });
  addFeet(b, sex, 'wrap', BLACK);
  hood(b, { mat: BLACK, trim: null, depth: 1.35, tip: 0.04, open: 0.8 });
  veil(b, { mat: BLACK, face: true, y: 0.2, r: 0.14 });
}

function bearer(b: CharBuilder, seed: number) {
  const v = new Rng(seed * 29 + 1);
  const sex: Sex = 'm';
  b.cracks = 0.45;
  const MAT = v.chance(0.5) ? 'cloth_brown|t=8a7e6c' : ASH;
  addNeck(b, sex, SKIN_PALE);
  addHead(b, { sex, skin: SKIN_PALE, hair: 'dark', style: 'cropped', beard: 'short', unlived: true, shade: 0.5 });
  addTrunk(b, sex, MAT, { y0: -0.16, y1: 0.56, inflate: 0.024, radial: quilted(22, 14, 0.03), crack: 0.8 });
  addShoulders(b, sex, MAT, 0.024);
  robeSkirt(b, sex, { mat: MAT, y0: 0.12, hem: -0.8, r1: [0.28, 0.24], tatter: 0.12, cols: 20, rows: 8 });
  tabard(b, sex, { mat: PALE, top: 0.52, hem: -0.6, over: 0.04, w: [0.1, 0.13, 0.15], tatter: 0.08, trim: GILT, back: true });
  belt(b, sex, { y: 0.1, over: 0.05, mat: M.leather, buckle: GILT, pouches: 0 });
  backCloth(b, sex, PALE);
  // the padded yoke where the litter's pole rests
  for (const s of [1, -1]) b.add('chest', xf(loft([{ y: 0.1, rx: 0.06, rz: 0.06 }, { y: -0.1, rx: 0.06, rz: 0.06 }], { segs: 10, capTop: true, capBottom: true }), { p: [s * 0.16, 0.25, 0], r: [Math.PI / 2, 0, 0] }), M.leather, { skin: () => [['chest', 1]] });
  addArms(b, sex, MAT, { inflate: 0.02, crack: 0.6 });
  addHands(b, 'glove', M.leather, M.leather);
  addLegs(b, sex, MAT, { inflate: 0.012 });
  addFeet(b, sex, 'boot', M.leather);
  hood(b, { mat: MAT, trim: null, depth: 1.2, tip: 0.05, open: 0.95 });
}

function cantor(b: CharBuilder) {
  const sex: Sex = 'm';
  b.cracks = 0.3;
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'fair', style: 'short', unlived: true });
  addTrunk(b, sex, 'cloth_red|t=b07068', { y0: -0.16, y1: 0.56, inflate: 0.012 });
  addShoulders(b, sex, SNOWY, 0.02);
  robeSkirt(b, sex, { mat: 'cloth_red|t=a06058', y0: 0.12, hem: -1.0, r1: [0.26, 0.22], tatter: 0.04, cols: 20, rows: 10 });
  // the surplice: white, knee-length, lace hem
  robeSkirt(b, sex, { mat: SNOWY, y0: 0.14, hem: -0.55, r1: [0.3, 0.26], tatter: 0.1, trim: GILT, cols: 22, rows: 6 });
  addTrunk(b, sex, SNOWY, { y0: -0.02, y1: 0.54, inflate: 0.022 });
  mantle(b, sex, { mat: 'cloth_red|t=a06058', len: 0.2, trim: GILT, emb: true });
  addArms(b, sex, SNOWY, { inflate: 0.014 });
  bellSleeves(b, sex, { mat: SNOWY, trim: GILT, flare: 0.13, len: 0.3 });
  addHands(b, 'bare', 'skin');
  addLegs(b, sex, 'cloth_red|t=a06058');
  addFeet(b, sex, 'sandal', M.leather);
  // skull cap
  b.add('head', loft([{ y: 0.25, rx: 0.02 }, { y: 0.23, rx: 0.07, rz: 0.08 }, { y: 0.19, rx: 0.098, rz: 0.11 }], { segs: 14, capTop: true, inflate: 0.006 }), 'cloth_red|t=903028', { skin: () => [['head', 1]] });
}

/** The Procession: a giant bearer carrying the gilded reliquary on a frame on its back. */
function procession(b: CharBuilder, open: boolean) {
  const sex: Sex = 'm';
  b.cracks = open ? 1.2 : 0.6;
  const MAT = 'cloth_brown|t=7a6e60';
  addNeck(b, sex, SKIN_PALE);
  addHead(b, { sex, skin: SKIN_PALE, hair: 'none', style: 'none', unlived: true, shade: 0.8 });
  addTrunk(b, sex, MAT, { y0: -0.16, y1: 0.56, inflate: 0.03, radial: quilted(20, 12, 0.035), crack: 1 });
  addShoulders(b, sex, MAT, 0.03);
  robeSkirt(b, sex, { mat: MAT, y0: 0.12, hem: -0.96, r1: [0.32, 0.28], tatter: 0.16, cols: 22, rows: 10 });
  tabard(b, sex, { mat: PALE, top: 0.54, hem: -0.85, over: 0.045, w: [0.12, 0.15, 0.18], tatter: 0.1, trim: GILT, back: false });
  mantle(b, sex, { mat: PALE, len: 0.36, trim: GILT, tatter: 0.2 });
  belt(b, sex, { y: 0.1, over: 0.06, mat: 'timber_dark', buckle: GILT, pouches: 0 });
  addArms(b, sex, MAT, { inflate: 0.024, crack: 0.8 });
  addHands(b, 'glove', 'timber_dark', 'timber_dark');
  addLegs(b, sex, MAT, { inflate: 0.02 });
  addFeet(b, sex, 'boot', MAT);
  hood(b, { mat: PALE, lining: M.shadow, trim: GILT, depth: 1.35, tip: 0.08, open: 0.8 });
  // ---- the reliquary frame on the back (chest space)
  const skin = () => [['chest', 1]] as [import('../../actors/rigDefs').BoneName, number][];
  const Z = -0.26;
  for (const s of [1, -1]) b.add('chest', xf(cyl(0.018, 0.018, -0.35, 0.72, 6), { p: [s * 0.16, 0, Z] }), 'timber_dark', { skin });
  b.add('chest', xf(box(0.46, 0.04, 0.3), { p: [0, 0.12, Z - 0.12] }), 'timber_dark', { skin });
  // the shrine: a gilt house with a steep roof, pinnacles, a bell visible through the doors
  const sz = Z - 0.16, sy = 0.14;
  b.add('chest', xf(box(0.36, 0.34, 0.26), { p: [0, sy + 0.17, sz] }), GILT, { skin });
  b.add('chest', xf(extrude([[-0.21, 0], [0.21, 0], [0, 0.24]], 0.3), { p: [0, sy + 0.34, sz - 0.15] }), GILT, { skin });
  for (const [x, zz] of [[-0.18, -0.13], [0.18, -0.13], [-0.18, 0.13], [0.18, 0.13]]) b.add('chest', xf(loft([{ y: 0.22, rx: 0.003 }, { y: 0, rx: 0.02 }], { segs: 6, capBottom: true }), { p: [x, sy + 0.34, sz + zz] }), GILT, { skin });
  b.add('chest', xf(bellGeom(0.16), { p: [0, sy + 0.3, sz - 0.05] }), 'bronze_bell', { skin });
  // candles on the frame
  for (const x of [-0.14, -0.05, 0.06, 0.15]) {
    b.add('chest', xf(cyl(0.012, 0.012, 0, 0.08 + Math.abs(x) * 0.3, 6), { p: [x, sy + 0.02, Z + 0.02] }), 'wax', { skin });
    b.add('chest', xf(ellipsoid(0.01, 0.022, 0.01, { segs: 6, rows: 4 }), { p: [x, sy + 0.12 + Math.abs(x) * 0.3, Z + 0.02] }), 'fire', { skin });
  }
  if (open) {
    // doors thrown open: the interior blazes with the names it carries
    b.add('chest', xf(box(0.3, 0.28, 0.01), { p: [0, sy + 0.17, sz - 0.135] }), 'bell_light', { skin });
    for (const s of [1, -1]) b.add('chest', xf(box(0.15, 0.3, 0.012), { p: [s * 0.27, sy + 0.17, sz - 0.2], r: [0, s * 1.2, 0] }), GILT, { skin });
    const n: G[] = [];
    const rng = new Rng(4);
    for (let i = 0; i < 16; i++) n.push(xf(box(rng.range(0.03, 0.08), 0.006, 0.004), { p: [rng.range(-0.14, 0.14), sy + rng.range(0.05, 0.3), sz + 0.135] }));
    b.add('chest', merge(n), 'unlived_crack', { skin });
  } else {
    for (const s of [1, -1]) b.add('chest', xf(box(0.16, 0.28, 0.012), { p: [s * 0.085, sy + 0.17, sz - 0.135] }), GILT, { skin });
  }
}

/** Saint Vessaline: pale gilt vestments written over with names; crown of little bells. */
function vessaline(b: CharBuilder, p2: boolean) {
  const sex: Sex = 'f';
  const rng = new Rng(p2 ? 902 : 901);
  b.cracks = p2 ? 0.9 : 0.12;
  const VEST = 'cloth_linen|t=efe6d2';
  const UNDER = 'cloth_linen|t=c8bca4';
  addNeck(b, sex, 'skin|t=f4e6dc');
  addHead(b, { sex, skin: 'skin|t=f4e6dc', hair: 'fair', style: 'long', unlived: p2 });
  addTrunk(b, sex, UNDER, { y0: -0.16, y1: 0.54, inflate: 0.01 });
  addShoulders(b, sex, VEST, 0.016);
  const f = robeSkirt(b, sex, { mat: VEST, y0: 0.14, hem: -1.06, r1: [0.34, 0.3], tatter: p2 ? 0.2 : 0.03, trim: GILT, emb: true, cols: 26, rows: 14 });
  addTrunk(b, sex, VEST, { y0: -0.02, y1: 0.52, inflate: 0.02 });
  // the stole: two long gilt bands down the front
  tabard(b, sex, { mat: 'gold_trim|t=d8b070', top: 0.5, hem: -1.0, over: 0.03, w: [0.05, 0.05, 0.055], tatter: 0.02, trim: null, split: true, back: false });
  mantle(b, sex, { mat: VEST, len: 0.34, trim: GILT, emb: true, open: 0.7 });
  belt(b, sex, { y: 0.1, over: 0.03, mat: GILT, pouches: 0, strapEnd: false, height: 0.03 });
  // names stitched and written over, all down the vestments
  names(b, f, rng, p2 ? 70 : 56, p2 ? 'unlived_crack' : INK, 0.08, 0.85, 1.014, GILT);
  addArms(b, sex, VEST, { inflate: 0.01 });
  bellSleeves(b, sex, { mat: VEST, trim: GILT, flare: 0.16, len: 0.34, emb: true });
  addHands(b, 'bare', 'skin|t=f4e6dc');
  addLegs(b, sex, UNDER);
  addFeet(b, sex, 'sandal', GILT);
  // crown of little bells: a thin gilt band, short rays, a bell hanging from each
  const hs = () => [['head', 1]] as [import('../../actors/rigDefs').BoneName, number][];
  b.add('head', xf(torus(0.112, 0.006, 5, 28), { p: [0, 0.2, 0.004], r: [Math.PI / 2 - 0.12, 0, 0] }), GILT, { skin: hs });
  const bells: G[] = [], rays: G[] = [];
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI * 0.85 + (i / 10) * Math.PI * 1.7;
    const x = Math.sin(a) * 0.118, z = Math.cos(a) * 0.118 + 0.004, y = 0.2 + Math.cos(a) * 0.01;
    rays.push(sweep([[x, y, z], [x * 1.25, y + 0.07, z * 1.25]], { r: 0.003, sides: 4, segs: 2 }));
    bells.push(xf(bellGeom(0.03), { p: [x * 1.26, y + 0.066, z * 1.26] }));
  }
  b.add('head', merge(rays), GILT, { skin: hs });
  b.add('head', merge(bells), p2 ? 'bronze_bell|e=402000' : 'bronze_bell', { skin: hs });
  if (p2) {
    // the vestments unravel: loose gilt threads trailing from sleeves and hem
    const threads: G[] = [];
    for (let i = 0; i < 18; i++) {
      const u = rng.next(), pt = f(u, 0.96);
      threads.push(sweep([[pt[0], pt[1], pt[2]], [pt[0] * 1.08, pt[1] - rng.range(0.08, 0.2), pt[2] * 1.08]], { r: 0.002, sides: 3, segs: 3 }));
    }
    b.add('hips', merge(threads), 'unlived_crack', { skin: trunkSkin });
  }
  cloak(b, 'mantle', { mat: VEST, pad: 0.03, seed: 7 });
}

// ------------------------------------------------------------------------------------ Vessaline's veils & spectral hand

/** Veil ids in the order of Vessaline's styles. */
export const VEIL_IDS = ['own', 'pilgrim', 'flagellant', 'mourner', 'measure', 'hymn'] as const;
export type VeilId = (typeof VEIL_IDS)[number];
const VEIL_MATS: Record<VeilId, string> = {
  own: 'gold_trim|t=f0dca0|e=3a2a08',
  pilgrim: 'cloth_brown|t=a89478',
  flagellant: 'cloth_linen|t=c89088',
  mourner: 'cloth_black|t=4a4644',
  measure: 'steel_armor|t=8a8a90',
  hymn: 'cloth_blue|t=b4c2d4',
};

function veilGeometry(id: VeilId): G {
  const band = loft([{ y: 0.14, rx: 0.106, rz: 0.126, cz: 0.012 }, { y: 0.075, rx: 0.106, rz: 0.13, cz: 0.014 }], { segs: 20, phi0: -1.9, phiLen: 3.8 });
  const parts: G[] = [band];
  // the face-cloth: over the eyes and nose, the mouth left free
  const lower = id === 'mourner' ? -0.02 : id === 'measure' ? 0.06 : 0.035;
  parts.push(loft([{ y: 0.078, rx: 0.106, rz: 0.13, cz: 0.014 }, { y: lower, rx: 0.1, rz: 0.13, cz: 0.02 }], { segs: 14, phi0: -1.0, phiLen: 2.0 }));
  // two tails down the back
  for (const s of [1, -1]) parts.push(xf(box(0.03, 0.2, 0.004), { p: [s * 0.03, 0.02, -0.13], r: [0.2, 0, s * 0.06] }));
  if (id === 'measure') parts.push(xf(bellGeom(0.03), { p: [0, 0.13, 0.15] }));
  return merge(parts);
}

/** Separate veil meshes on the head bone (toggled per style) and the spectral hand on handL. */
function addVessalineExtras(rig: Rig) {
  const s = rig.proportions.height;
  for (const bone of [rig.bones.head, rig.bones.handL]) for (const c of [...bone.children]) if (c.name.startsWith('vess:')) bone.remove(c);
  for (const id of VEIL_IDS) {
    const g = veilGeometry(id);
    g.scale(s, s, s);
    const m = new THREE.Mesh(g, weaponMaterial(VEIL_MATS[id]));
    m.name = 'vess:veil:' + id;
    m.castShadow = false;
    m.visible = id === 'own';
    rig.bones.head.add(m);
  }
  // spectral giant hand (the mourner's grasp), pale gold and translucent
  const hand: G[] = [xf(box(0.34, 0.1, 0.4), { p: [0, 0, 0.12] })];
  for (let i = 0; i < 4; i++) hand.push(xf(cyl(0.035, 0.03, 0, 0.34, 6), { p: [-0.13 + i * 0.087, 0, 0.3], r: [Math.PI / 2 - 0.35, 0, 0] }));
  hand.push(xf(cyl(0.04, 0.035, 0, 0.26, 6), { p: [0.2, 0, 0.05], r: [Math.PI / 2, 0, -0.8] }));
  const hg = merge(hand);
  hg.scale(s, s, s);
  const hm = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false }));
  hm.name = 'vess:hand';
  hm.position.set(0, -0.06 * s, 0.02);
  hm.visible = false;
  rig.bones.handL.add(hm);
}

// ------------------------------------------------------------------------------------ NPCs

function wenna(b: CharBuilder) {
  const sex: Sex = 'f';
  const DRESS = 'cloth_blue|t=a8b0bc', SHAWL = 'cloth_brown|t=b0a088';
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'auburn', style: 'braid' });
  addTrunk(b, sex, DRESS, { y0: -0.16, y1: 0.54, inflate: 0.012 });
  addShoulders(b, sex, DRESS, 0.012);
  robeSkirt(b, sex, { mat: DRESS, y0: 0.12, hem: -0.9, r1: [0.25, 0.22], tatter: 0.08, cols: 20, rows: 9 });
  tabard(b, sex, { mat: 'cloth_linen|t=c8c0b0', top: 0.36, hem: -0.6, over: 0.03, w: [0.1, 0.14, 0.16], back: false, tatter: 0.06 });
  mantle(b, sex, { mat: SHAWL, len: 0.32, tatter: 0.1 });
  belt(b, sex, { y: 0.1, over: 0.04, mat: M.rope, pouches: 1, strapEnd: false });
  beltBells(b, sex, 1);
  bandolier(b, sex, { over: 0.05, mat: M.leather, fromLeft: true });
  addArms(b, sex, DRESS, { inflate: 0.01, foreY1: -0.18 });
  addArms(b, sex, 'skin', { upper: false });
  addHands(b, 'wrapped', 'skin', 'cloth_linen|t=a09880');
  addLegs(b, sex, 'cloth_brown|t=6a5a4a');
  addFeet(b, sex, 'wrap', M.leather);
}

function soames(rig: Rig): BuiltModel {
  const b = new CharBuilder(rig, 'npc', 4411);
  b.cracks = 0.3;
  b.ghost = { color: new THREE.Color(0.32, 0.42, 0.58), min: 0.18 };
  buildLook(b, { head: 'greyford', body: 'greyford', arms: 'greyford', legs: 'greyford', cloak: false }, { unlived: true, variant: 3 });
  return b.build();
}

// ------------------------------------------------------------------------------------ weapons

class WB {
  private parts = new Map<string, G[]>();
  add(key: string, g: G, t?: Parameters<typeof xf>[1]) { norm(g); if (t) xf(g, t); let l = this.parts.get(key); if (!l) this.parts.set(key, (l = [])); l.push(g); return this; }
  build(name: string, m: Omit<WeaponModelExt, 'object'>): WeaponModelExt {
    const group = new THREE.Group();
    group.name = 'weapon:' + name;
    for (const [key, list] of this.parts) {
      const mesh = new THREE.Mesh(merge(list), weaponMaterial(key));
      mesh.name = key;
      mesh.castShadow = !key.startsWith('bell_light') && !key.startsWith('fire');
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return { object: group, ...m };
  }
}
const shaft = (y0: number, y1: number, r0: number, r1 = r0, segs = 8) => cyl(r0, r1, y0, y1, segs);
const collar = (y: number, r: number, hgt = 0.02) => loft([{ y: y + hgt / 2, rx: r }, { y: y - hgt / 2, rx: r }], { segs: 10, capTop: true, capBottom: true });

function pilgrimStaff(): WeaponModelExt {
  const w = new WB();
  w.add('timber', shaft(-0.72, 0.92, 0.016, 0.019, 7));
  w.add('timber_dark', xf(ellipsoid(0.028, 0.034, 0.028, { segs: 8, rows: 5 }), { p: [0, 0.95, 0] }));
  w.add('rope', collar(0.62, 0.022, 0.05));
  w.add('bronze_bell', xf(bellGeom(0.05), { p: [0.03, 0.6, 0.02] }));
  w.add('cloth_linen|t=c0b8a0', xf(box(0.004, 0.22, 0.03), { p: [-0.02, 0.5, 0.02], r: [0, 0, 0.1] }));
  return w.build('cath_pilgrim_staff', { hit: { from: 0.4, to: 0.98, radius: 0.06 }, trail: { from: 0.45, to: 0.95 }, offhandGrip: -0.28 });
}

function scourge(): WeaponModelExt {
  const w = new WB();
  w.add('timber_dark', shaft(-0.1, 0.12, 0.016, 0.02, 7));
  w.add('rope', collar(0.0, 0.02, 0.16));
  w.add('iron', collar(0.13, 0.024, 0.02));
  const cords: G[] = [], knots: G[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const ex = Math.sin(a) * 0.05, ez = Math.cos(a) * 0.05;
    cords.push(sweep([[0, 0.13, 0], [ex * 0.5, 0.4, ez * 0.5], [ex, 0.74, ez]], { r: 0.005, sides: 4, segs: 8 }));
    for (const t of [0.35, 0.55, 0.74]) knots.push(xf(ellipsoid(0.012, 0.014, 0.012, { segs: 6, rows: 4 }), { p: [ex * (t / 0.74), t, ez * (t / 0.74)] }));
  }
  w.add('leather_dark', merge(cords));
  w.add('iron', merge(knots));
  return w.build('cath_scourge', { hit: { from: 0.15, to: 0.78, radius: 0.1 }, trail: { from: 0.3, to: 0.76 } });
}

function mournerMaul(): WeaponModelExt {
  const w = new WB();
  w.add('timber_dark', shaft(-0.4, 1.12, 0.034, 0.04, 8));
  w.add('leather_dark', shaft(-0.3, 0.05, 0.04, 0.04, 8));
  w.add('iron', collar(1.1, 0.05, 0.06));
  w.add('iron', collar(-0.4, 0.045, 0.04));
  // a funeral bell for a head, mouth forward along +Y
  const bell = [{ y: 1.1, rx: 0.07 }, { y: 1.16, rx: 0.12 }, { y: 1.28, rx: 0.16 }, { y: 1.42, rx: 0.2 }, { y: 1.52, rx: 0.25 }, { y: 1.56, rx: 0.26 }];
  w.add('bronze_bell', loft(bell, { segs: 18, capBottom: true }));
  w.add('bronze', loft([{ y: 1.555, rx: 0.268 }, { y: 1.52, rx: 0.262 }], { segs: 18, inflate: 0.004 }));
  w.add('unlived_crack', xf(box(0.01, 0.3, 0.01), { p: [0.19, 1.38, 0.08], r: [0, 0, 0.25] }));
  return w.build('cath_mourner_maul', { hit: { from: 0.95, to: 1.58, radius: 0.24 }, trail: { from: 1.0, to: 1.56 }, offhandGrip: -0.35 });
}

function bearerPole(long: boolean): WeaponModelExt {
  const w = new WB();
  const top = long ? 2.0 : 1.6, bot = long ? -1.1 : -1.0, r = long ? 0.032 : 0.024;
  w.add('timber_dark', shaft(bot, top, r, r * 0.9, 8));
  for (const y of [0.2, top - 0.1]) w.add('iron', collar(y, r + 0.008, 0.04));
  w.add(GILT, xf(box(long ? 0.6 : 0.36, 0.04, 0.04), { p: [0, top - 0.25, 0] }));
  w.add(GILT, xf(loft([{ y: 0.18, rx: 0.004 }, { y: 0, rx: 0.03 }], { segs: 8, capBottom: true }), { p: [0, top, 0] }));
  if (long) {
    // the censer-bell hanging from the cross-arm, and ribbons
    for (const s of [1, -1]) {
      w.add('iron', sweep([[s * 0.26, top - 0.25, 0], [s * 0.26, top - 0.5, 0]], { r: 0.006, sides: 4, segs: 3 }));
      w.add('bronze_bell', xf(bellGeom(0.14), { p: [s * 0.26, top - 0.48, 0] }));
    }
    w.add('cloth_red|t=a04038', xf(box(0.004, 0.5, 0.06), { p: [0.05, top - 0.55, 0.03] }));
  } else {
    w.add('iron', sweep([[0, top - 0.25, 0], [0.14, top - 0.35, 0]], { r: 0.006, sides: 4, segs: 3 }));
    w.add('bell_light', xf(ellipsoid(0.03, 0.045, 0.03, { segs: 8, rows: 5 }), { p: [0.14, top - 0.42, 0] }));
  }
  return w.build(long ? 'cath_procession_pole' : 'cath_bearer_pole', { hit: long ? { from: 1.0, to: 2.2, radius: 0.14 } : { from: 0.6, to: 1.65, radius: 0.08 }, trail: long ? { from: 1.1, to: 2.1 } : { from: 0.7, to: 1.6 }, offhandGrip: -0.45 });
}

function cantorStaff(): WeaponModelExt {
  const w = new WB();
  w.add('timber_dark', shaft(-0.5, 0.9, 0.014, 0.016, 7));
  w.add(GILT, collar(0.9, 0.022, 0.03));
  w.add(GILT, xf(box(0.16, 0.02, 0.02), { p: [0, 1.02, 0] }));
  w.add(GILT, shaft(0.9, 1.12, 0.008));
  w.add('bronze_bell', xf(bellGeom(0.07), { p: [0, 1.0, 0] }));
  return w.build('cath_cantor_staff', { hit: { from: 0.5, to: 1.1, radius: 0.07 }, trail: { from: 0.55, to: 1.05 } });
}

function crozier(): WeaponModelExt {
  const w = new WB();
  w.add('gold_trim|t=d8c090', shaft(-0.72, 1.18, 0.015, 0.018, 8));
  w.add('leather_dark', shaft(-0.12, 0.12, 0.019, 0.019, 8));
  for (const y of [-0.14, 0.14, 0.62, 1.16]) w.add(GILT, collar(y, 0.024, 0.026));
  // the crook: a spiral volute curling forward, with a bell of names hanging inside it
  const pts: V3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, a = t * Math.PI * 1.45;
    const rr = 0.16 * (1 - t * 0.55);
    pts.push([0, 1.18 + Math.sin(a) * rr, 0.16 - Math.cos(a) * rr]);
  }
  w.add(GILT, sweep(pts, { r: 0.016, sides: 8, segs: 36 }));
  w.add('bronze_bell', xf(bellGeom(0.12), { p: [0, 1.3, 0.17] }));
  w.add('unlived_crack', xf(box(0.004, 0.08, 0.004), { p: [0.035, 1.24, 0.19], r: [0, 0, 0.3] }));
  w.add('bell_light', xf(ellipsoid(0.014, 0.014, 0.014, { segs: 6, rows: 4 }), { p: [0, 1.2, 0.17] }));
  return w.build('crozier_of_names', { hit: { from: 0.85, to: 1.48, radius: 0.12 }, castPoint: new THREE.Vector3(0, 1.28, 0.17), trail: { from: 0.9, to: 1.45 }, offhandGrip: -0.4 });
}

// ------------------------------------------------------------------------------------ registration

const look = (kind: 'enemy' | 'boss', fn: (b: CharBuilder, seed: number) => void) => (rig: Rig, seed: number) => {
  const b = new CharBuilder(rig, kind, seed * 7919 + 101);
  fn(b, seed);
  return b.build();
};

let npcDone = false;
/** NPC looks (Wenna, Private Soames) and the crozier — needed outside the region, so registered from meta.ts. */
export function registerCathedralNpcLooks() {
  if (npcDone) return;
  npcDone = true;
  registerNpcLook('wenna', (rig) => { const b = new CharBuilder(rig, 'npc', 5151); wenna(b); return b.build(); });
  registerNpcLook('cath_soames', (rig) => soames(rig));
  // the Saint's crozier can be carried out of the region (Final Memory reward)
  registerWeaponModel('crozier_of_names', crozier);
}

let done = false;
export function registerCathedralLooks() {
  if (done) return;
  done = true;
  registerCathedralNpcLooks();
  registerEnemyLook('cath_pilgrim', look('enemy', pilgrim));
  registerEnemyLook('cath_flagellant', look('enemy', flagellant));
  registerEnemyLook('cath_healer', look('enemy', healer));
  registerEnemyLook('cath_mourner', look('enemy', mourner));
  registerEnemyLook('cath_bearer', look('enemy', bearer));
  registerEnemyLook('cath_cantor', look('enemy', (b) => cantor(b)));
  registerEnemyLook('cath_procession', look('boss', (b) => procession(b, false)));
  registerEnemyLook('cath_procession2', look('boss', (b) => procession(b, true)));
  registerEnemyLook('vessaline', (rig, seed) => { const m = look('boss', (b) => vessaline(b, false))(rig, seed); addVessalineExtras(rig); return m; });
  registerEnemyLook('vessaline2', (rig, seed) => { const m = look('boss', (b) => vessaline(b, true))(rig, seed); addVessalineExtras(rig); return m; });
  registerWeaponModel('cath_pilgrim_staff', pilgrimStaff);
  registerWeaponModel('cath_scourge', scourge);
  registerWeaponModel('cath_mourner_maul', mournerMaul);
  registerWeaponModel('cath_bearer_pole', () => bearerPole(false));
  registerWeaponModel('cath_procession_pole', () => bearerPole(true));
  registerWeaponModel('cath_cantor_staff', cantorStaff);
}
