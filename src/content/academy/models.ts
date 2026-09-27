/**
 * Academy looks: the Unlived of an Academy that experimented on itself — glass acolytes (pale
 * robes, glass-scale mantles, a lens over the face), lens wardens (tall custodians with a great
 * lens on a pole), the ritual choir's leader (bell-hood, tuning-fork staff), echo constructs
 * (bronze-and-glass mannequins with a mirror for a face), homunculi (small wax bodies with a jar
 * on the back), the suspended golem (iron and glass, broken chains), Aberrant Experiment No. 9, and
 * Keeper Ilsabet Orrow (three phases). Plus their weapons.
 */
import * as THREE from 'three';
import { registerEnemyLook, registerWeaponModel, CharBuilder, type WeaponModelExt } from '../../actors/models';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet, quilted } from '../../actors/models/anatomy';
import {
  M, robeSkirt, mantle, hood, bellSleeves, belt, cuirass, gorget, pauldrons, armPlates, legPlates, bascinet, drapeChain, beads, trunkZ, tabard, bandolier, bracers,
} from '../../actors/models/gear';
import { trunkSkin } from '../../actors/models/builder';
import { loft, xf, box, cyl, merge, torus, ellipsoid, sweep, type G } from '../../actors/models/parts';
import { getMaterial } from '../../render/materials';
import type { MaterialId } from '../../render/materialIds';
import { Rng } from '../../core/rng';
import { glowMat } from './levelCommon';

const PALE = 'skin_pale|t=b8b4ac';
const ROBE = 'cloth_linen|t=9aa2aa';
const ROBE_D = 'cloth_black|t=7a8290';
const INK = 'cloth_blue|t=4a5470';
const GLASS = 'glass';
const LENS = 'glass|e=ffe6b0|ei=1.4';
const BRONZE = M.bronze;

// ---------------------------------------------------------------------------------- helpers

/** A lens disc on the face (head space) with a bronze rim. */
function faceLens(b: CharBuilder, x: number, y: number, z: number, r: number, glow = LENS) {
  b.add('head', xf(torus(r, r * 0.14, 5, 18), { p: [x, y, z] }), BRONZE);
  b.add('head', xf(cyl(r * 0.95, r * 0.95, -0.003, 0.003, 16), { p: [x, y, z], r: [Math.PI / 2, 0, 0] }), glow);
}

/** Glass scales over the shoulders (chest space). */
function glassScales(b: CharBuilder, sex: 'm' | 'f', rows = 3) {
  const parts: G[] = [];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.55 + (i / 8) * Math.PI * 1.1;
      const y = 0.22 - r * 0.07;
      const rad = 0.17 + r * 0.02;
      parts.push(xf(box(0.06, 0.05, 0.006), { p: [Math.sin(a) * rad, y, Math.cos(a) * rad * 0.9 - 0.02], r: [0.5, a, 0] }));
    }
  }
  b.add('chest', merge(parts), GLASS, { p: [0, 0.02, 0] });
  void sex;
}

// ---------------------------------------------------------------------------------- looks

function glassAcolyte(b: CharBuilder, seed: number) {
  const v = new Rng(seed * 97 + 3);
  const sex = v.chance(0.5) ? 'f' : 'm';
  b.cracks = 0.55;
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: 'none', style: 'none', unlived: true, shade: 0.35 });
  addTrunk(b, sex, ROBE_D, { y0: -0.16, y1: 0.56, inflate: 0.01, crack: 1 });
  addShoulders(b, sex, ROBE, 0.016);
  addTrunk(b, sex, ROBE, { y0: -0.02, y1: 0.54, inflate: 0.02, crack: 0.6 });
  robeSkirt(b, sex, { mat: ROBE, y0: 0.06, hem: -0.92, r1: [0.27, 0.23], open: 0.5, tatter: 0.22, trim: BRONZE, cols: 20, rows: 10 });
  belt(b, sex, { y: 0.1, over: 0.035, pouches: 1, mat: M.leatherDark });
  glassScales(b, sex, 3);
  mantle(b, sex, { mat: ROBE_D, len: 0.18, tatter: 0.3, open: 0.4 });
  addArms(b, sex, ROBE, { inflate: 0.012, foreY1: -0.12, crack: 0.6 });
  bellSleeves(b, sex, { mat: ROBE, trim: null, flare: 0.09, len: 0.26 });
  addHands(b, 'bare', PALE);
  addLegs(b, sex, ROBE_D, { inflate: 0.01 });
  addFeet(b, sex, 'boot', M.leatherDark);
  hood(b, { mat: ROBE, trim: BRONZE, depth: 1.3, tip: 0.12, open: 0.95 });
  faceLens(b, 0, 0.07, 0.12, 0.045);
}

function lensWarden(b: CharBuilder, seed: number) {
  const v = new Rng(seed * 31 + 7);
  const sex = 'm';
  b.cracks = 0.8;
  addNeck(b, sex, PALE);
  addTrunk(b, sex, ROBE_D, { y0: -0.16, y1: 0.56, inflate: 0.014, radial: quilted(24, 16, 0.03), crack: 1 });
  addShoulders(b, sex, ROBE_D, 0.014);
  robeSkirt(b, sex, { mat: INK, y0: 0.1, hem: -0.98, r1: [0.3, 0.26], open: 0.7, tatter: 0.18, trim: BRONZE, emb: true, cols: 22, rows: 11 });
  cuirass(b, sex, { mat: M.steelOld, trim: BRONZE, inflate: 0.03, dents: 4, crack: 1.3, keel: 0.05 });
  gorget(b, sex, { mat: M.steelOld, trim: BRONZE, high: true });
  tabard(b, sex, { mat: INK, hem: -0.62, over: 0.05, w: [0.1, 0.13, 0.15], split: true, trim: BRONZE, tatter: 0.2, back: v.chance(0.7) });
  belt(b, sex, { y: 0.1, over: 0.055, pouches: 2 });
  pauldrons(b, { mat: M.steelOld, trim: BRONZE, size: 1.15, lames: 3, crack: 1.2, rivets: true });
  addArms(b, sex, M.mail, { inflate: 0.01, crack: 1 });
  armPlates(b, sex, { mat: M.steelOld, trim: null, rerebrace: true, crack: 1 });
  addHands(b, 'gauntlet', M.steelOld, M.leatherDark);
  addLegs(b, sex, ROBE_D, { inflate: 0.012 });
  legPlates(b, sex, { mat: M.steelOld, trim: null, cuisse: false, crack: 1 });
  addFeet(b, sex, 'sabaton', M.leatherDark, M.steelOld);
  bascinet(b, { mat: M.steelOld, visor: false, eyes: false, dents: 3 });
  // the visor is one great lens
  faceLens(b, 0, 0.075, 0.125, 0.07);
  b.add('head', xf(torus(0.09, 0.012, 5, 20), { p: [0, 0.075, 0.115] }), BRONZE);
  mantle(b, sex, { mat: INK, len: 0.3, trim: BRONZE, tatter: 0.2 });
}

function choirLeader(b: CharBuilder, seed: number) {
  const sex = 'm';
  b.cracks = 0.5;
  void seed;
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: 'grey', style: 'none', beard: 'full', old: true, unlived: true, shade: 0.3 });
  addTrunk(b, sex, 'cloth_red|t=6a4a50', { y0: -0.16, y1: 0.56, inflate: 0.014, crack: 1 });
  addShoulders(b, sex, 'cloth_red|t=6a4a50', 0.02);
  robeSkirt(b, sex, { mat: 'cloth_red|t=6a4a50', y0: 0.1, hem: -1.02, r1: [0.34, 0.3], tatter: 0.1, trim: M.gold, emb: true, cols: 24, rows: 12 });
  robeSkirt(b, sex, { mat: ROBE, y0: 0.05, hem: -0.6, r1: [0.33, 0.29], open: 1.4, tatter: 0.2, cols: 20, rows: 8 });
  mantle(b, sex, { mat: 'cloth_linen|t=b0a898', len: 0.34, r1: 0.3, trim: M.gold, emb: true, tatter: 0.1 });
  // a collar of small bells
  const bellParts: G[] = [];
  for (let i = 0; i < 9; i++) {
    const a = -1.2 + (i / 8) * 2.4;
    const y = 0.47 - Math.abs(Math.sin(a)) * 0.04;
    bellParts.push(xf(loft([{ y: 0.0, rx: 0.003 }, { y: -0.01, rx: 0.012 }, { y: -0.03, rx: 0.018 }], { segs: 8, capBottom: true }), { p: [Math.sin(a) * 0.14, y, trunkZ(sex, b.shoulder, Math.sin(a) * 0.14, y, 1, 0.05)] }));
  }
  b.add('hips', merge(bellParts), 'bronze_bell', { skin: trunkSkin });
  addArms(b, sex, 'cloth_red|t=6a4a50', { inflate: 0.016, foreY1: -0.12 });
  bellSleeves(b, sex, { mat: 'cloth_linen|t=b0a898', trim: M.gold, emb: true, flare: 0.12, len: 0.3 });
  addHands(b, 'bare', PALE);
  addLegs(b, sex, M.black, { inflate: 0.01 });
  addFeet(b, sex, 'sandal', M.leatherDark);
  // tall bell-shaped hood
  hood(b, { mat: 'cloth_linen|t=b0a898', trim: M.gold, emb: true, depth: 1.25, tip: 0.26, open: 0.85 });
  b.add('head', xf(loft([{ y: 0.52, rx: 0.004 }, { y: 0.44, rx: 0.03 }, { y: 0.33, rx: 0.07 }, { y: 0.26, rx: 0.1, rz: 0.11 }], { segs: 14 }), { p: [0, 0, -0.03] }), 'cloth_linen|t=b0a898');
  b.add('head', xf(torus(0.1, 0.01, 4, 16), { p: [0, 0.265, -0.03], r: [Math.PI / 2, 0, 0] }), M.gold);
}

function echoConstruct(b: CharBuilder, seed: number) {
  const sex = 'm';
  void seed;
  const BR = 'bronze|t=c0b090';
  const GL = 'glass|e=a8c8d0|ei=0.25';
  addNeck(b, sex, 'iron');
  addTrunk(b, sex, 'iron', { y0: -0.14, y1: 0.54, inflate: -0.02 });
  addTrunk(b, sex, GL, { y0: -0.12, y1: 0.55, inflate: 0.02 });
  cuirass(b, sex, { mat: BR, trim: M.gold, inflate: 0.035, dents: 0, keel: 0.07 });
  b.add('chest', xf(ellipsoid(0.05, 0.05, 0.03, { segs: 12, rows: 8 }), { p: [0, 0.08, 0.14] }), 'glass|e=ffd8a0|ei=1.8');
  addShoulders(b, sex, BR, 0.02);
  pauldrons(b, { mat: BR, trim: M.gold, size: 0.85, lames: 1, rivets: true });
  addArms(b, sex, GL, { inflate: 0.004 });
  armPlates(b, sex, { mat: BR, trim: null, rerebrace: false });
  addHands(b, 'gauntlet', BR, BR);
  addLegs(b, sex, GL, { inflate: 0.004 });
  legPlates(b, sex, { mat: BR, trim: null, cuisse: true });
  addFeet(b, sex, 'sabaton', BR, BR);
  // head: a smooth ovoid of bronze with a mirror for a face
  b.add('head', xf(ellipsoid(0.085, 0.12, 0.1, { segs: 18, rows: 12 }), { p: [0, 0.1, 0] }), BR);
  b.add('head', xf(cyl(0.062, 0.062, -0.004, 0.004, 20), { p: [0, 0.09, 0.093], r: [Math.PI / 2 - 0.1, 0, 0] }), 'steel_bright|r=0.05|m=1');
  b.add('head', xf(torus(0.064, 0.008, 5, 20), { p: [0, 0.09, 0.093], r: [-0.1, 0, 0] }), M.gold);
  b.add('chest', xf(merge([cyl(0.012, 0.012, -0.05, 0.05, 6), xf(box(0.3, 0.02, 0.02), { p: [0, 0, 0] })]), { p: [0, 0.3, -0.16] }), 'iron');
}

function homunculus(b: CharBuilder, seed: number) {
  const v = new Rng(seed * 13 + 5);
  const sex = 'm';
  const WAX = v.chance(0.5) ? 'wax|t=d8c8b0' : 'wax|t=c8b8a8';
  b.cracks = 0.5;
  addNeck(b, sex, WAX, -0.01);
  addTrunk(b, sex, WAX, { y0: -0.16, y1: 0.54, inflate: -0.012, crack: 1 });
  addShoulders(b, sex, WAX, -0.01);
  addArms(b, sex, WAX, { inflate: -0.012, crack: 1 });
  addHands(b, 'bare', WAX);
  addLegs(b, sex, WAX, { inflate: -0.012, crack: 1 });
  addFeet(b, sex, 'bare', WAX);
  // oversized, hairless head with a glowing seam for a mouth and pinprick eyes
  b.add('head', xf(ellipsoid(0.13, 0.15, 0.14, { segs: 16, rows: 10, radial: (th) => 1 + 0.04 * Math.sin(th * 3) }), { p: [0, 0.1, 0.01] }), WAX);
  for (const s of [1, -1]) b.add('head', xf(ellipsoid(0.014, 0.01, 0.006, { segs: 8, rows: 5 }), { p: [s * 0.045, 0.12, 0.138] }), 'unlived_crack');
  b.add('head', xf(box(0.08, 0.006, 0.006), { p: [0, 0.04, 0.132] }), 'unlived_crack');
  // the jar it was grown in, still strapped to its back
  b.add('chest', xf(cyl(0.11, 0.11, -0.16, 0.14, 12, false), { p: [0, 0.12, -0.2] }), GLASS);
  b.add('chest', xf(torus(0.11, 0.012, 4, 14), { p: [0, 0.26, -0.2], r: [Math.PI / 2, 0, 0] }), BRONZE);
  b.add('chest', xf(ellipsoid(0.06, 0.08, 0.06, { segs: 8, rows: 6 }), { p: [0, 0.08, -0.2] }), 'glass|e=c8e8c0|ei=0.9');
  bandolier(b, sex, { over: 0.02, mat: M.leatherDark, width: 0.02 });
}

function suspendedGolem(b: CharBuilder, seed: number) {
  const sex = 'm';
  void seed;
  b.cracks = 1.1;
  addNeck(b, sex, 'iron_rusted');
  addTrunk(b, sex, 'iron_rusted|t=8a8580', { y0: -0.16, y1: 0.56, inflate: 0.03, crack: 1 });
  addShoulders(b, sex, 'iron_rusted', 0.03);
  cuirass(b, sex, { mat: 'iron_rusted|t=7a756e', trim: BRONZE, inflate: 0.06, dents: 8, crack: 1.5, keel: 0.02 });
  // the chest is a furnace window of glass
  b.add('chest', xf(cyl(0.085, 0.085, -0.02, 0.02, 16), { p: [0, 0.1, trunkZ(sex, b.shoulder, 0, 0.4, 1, 0.075) - 0.02], r: [Math.PI / 2, 0, 0] }), 'glass|e=ffc880|ei=2.2');
  b.add('chest', xf(torus(0.09, 0.016, 5, 18), { p: [0, 0.1, trunkZ(sex, b.shoulder, 0, 0.4, 1, 0.08) - 0.02] }), BRONZE);
  pauldrons(b, { mat: 'iron_rusted', trim: BRONZE, size: 1.35, lames: 3, crack: 1.5, rivets: true });
  addArms(b, sex, 'iron_rusted|t=6a6560', { inflate: 0.03, crack: 1 });
  armPlates(b, sex, { mat: 'iron_rusted', trim: null, rerebrace: true, crack: 1 });
  addHands(b, 'gauntlet', 'iron_rusted', 'iron_rusted');
  addLegs(b, sex, 'iron_rusted|t=6a6560', { inflate: 0.03, crack: 1 });
  legPlates(b, sex, { mat: 'iron_rusted', trim: null, cuisse: true, crack: 1 });
  addFeet(b, sex, 'sabaton', 'iron_rusted', 'iron_rusted');
  // a blind helm-head with a single glass slit
  b.add('head', xf(loft([{ y: 0.2, rx: 0.06 }, { y: 0.18, rx: 0.11, rz: 0.12 }, { y: 0.02, rx: 0.12, rz: 0.13 }, { y: -0.04, rx: 0.1, rz: 0.11 }], { segs: 14, capTop: true }), { p: [0, 0.04, 0] }), 'iron_rusted');
  b.add('head', xf(box(0.14, 0.018, 0.02), { p: [0, 0.12, 0.13] }), 'glass|e=ffc880|ei=2.4');
  // the harness it hung from: a ring on the back and broken chains
  b.add('chest', xf(torus(0.16, 0.025, 5, 18), { p: [0, 0.3, -0.18], r: [0.3, 0, 0] }), 'iron');
  drapeChain(b, 'chest', [[0.14, 0.34, -0.14], [0.2, 0.1, -0.2], [0.22, -0.2, -0.22]], M.iron, 0.05);
  drapeChain(b, 'chest', [[-0.14, 0.34, -0.14], [-0.22, 0.05, -0.2], [-0.2, -0.3, -0.2]], M.iron, 0.05);
  drapeChain(b, 'forearmR', [[0, -0.1, 0.05], [0.02, -0.3, 0.06], [0.05, -0.5, 0.03]], M.iron, 0.045);
}

function experiment9(b: CharBuilder, seed: number) {
  const sex = 'm';
  void seed;
  const WAX = 'wax|t=c8b4a0';
  b.cracks = 1.3;
  addNeck(b, sex, WAX, 0.02);
  addTrunk(b, sex, WAX, { y0: -0.16, y1: 0.56, inflate: 0.035, radial: (th, t) => 1 + 0.08 * Math.sin(th * 3 + t * 6) + 0.05 * Math.sin(th * 7), crack: 1.2 });
  addShoulders(b, sex, WAX, 0.04);
  addArms(b, sex, WAX, { inflate: 0.02, crack: 1 });
  armPlates(b, sex, { mat: 'iron_rusted', trim: null, rerebrace: true, crack: 1 });
  addHands(b, 'bare', WAX);
  addLegs(b, sex, WAX, { inflate: 0.03, crack: 1 });
  addFeet(b, sex, 'bare', WAX);
  robeSkirt(b, sex, { mat: 'cloth_linen|t=8a8478', y0: 0.08, hem: -0.45, r1: [0.3, 0.26], tatter: 0.4, cols: 18, rows: 6 });
  bracers(b, sex, { mat: 'iron_rusted', studs: M.iron });
  // lopsided head sunk into the shoulders, one great eye-lens
  b.add('head', xf(ellipsoid(0.12, 0.13, 0.13, { segs: 16, rows: 10, radial: (th) => 1 + 0.12 * Math.sin(th * 2 + 1) }), { p: [0.02, 0.07, 0.02] }), WAX);
  faceLens(b, -0.03, 0.09, 0.13, 0.05, 'glass|e=c8f0d8|ei=2');
  // jars fused into its back, glowing
  for (const [x, y, z, r, h] of [[0.12, 0.22, -0.2, 0.09, 0.26], [-0.1, 0.28, -0.21, 0.08, 0.22], [0.0, 0.05, -0.24, 0.1, 0.24], [0.18, 0.0, -0.16, 0.06, 0.16]] as const) {
    b.add('chest', xf(cyl(r, r, 0, h, 12), { p: [x, y - h / 2, z], r: [0.4, 0, 0.2] }), GLASS);
    b.add('chest', xf(ellipsoid(r * 0.6, h * 0.35, r * 0.6, { segs: 8, rows: 6 }), { p: [x, y, z], r: [0.4, 0, 0.2] }), 'glass|e=b8f0c8|ei=1.6');
    b.add('chest', xf(torus(r, 0.012, 4, 12), { p: [x, y + h / 2, z], r: [Math.PI / 2 + 0.4, 0, 0.2] }), BRONZE);
  }
  drapeChain(b, 'chest', [[-0.16, 0.3, -0.1], [-0.25, 0.0, -0.1], [-0.2, -0.35, -0.12]], M.iron, 0.05);
}

/** Keeper Ilsabet Orrow. phase 1: robed keeper with staff; 2: robe torn, glass blade; 3: preserved (cracks, lens eye burning). */
function orrow(b: CharBuilder, phase: 1 | 2 | 3) {
  const sex = 'f';
  b.cracks = phase === 1 ? 0 : phase === 2 ? 0.35 : 0.9;
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'dark', style: 'long', unlived: phase === 3 });
  // severe bun and two glass pins
  b.add('head', xf(ellipsoid(0.055, 0.05, 0.05, { segs: 12, rows: 8 }), { p: [0, 0.2, -0.085] }), 'hair_dark');
  for (const s of [1, -1]) b.add('head', xf(cyl(0.005, 0.003, -0.09, 0.09, 6), { p: [s * 0.03, 0.21, -0.085], r: [0.3, 0, s * 1.2] }), LENS);
  // the monocle over the right eye, on a fine chain to the collar
  faceLens(b, -0.028, 0.058, 0.103, 0.019, phase === 3 ? 'glass|e=ffd080|ei=3' : 'glass|e=fff0d0|ei=0.35');
  const COAT = phase === 1 ? INK : 'cloth_blue|t=3e4660';
  addTrunk(b, sex, 'cloth_black|t=5a5a66', { y0: -0.16, y1: 0.56, inflate: 0.006 });
  addShoulders(b, sex, COAT, 0.012);
  addTrunk(b, sex, COAT, { y0: -0.02, y1: 0.53, inflate: 0.016 });
  // layered robes: an inner black gown, an ink-blue academic coat open at the front, gilt edging
  robeSkirt(b, sex, { mat: 'cloth_black|t=5a5a66', y0: 0.1, hem: -0.98, r1: [0.24, 0.2], tatter: phase === 1 ? 0.03 : 0.2, cols: 20, rows: 11 });
  robeSkirt(b, sex, { mat: COAT, y0: 0.05, hem: phase === 1 ? -0.95 : -0.7, r1: [0.29, 0.25], open: 0.9, tatter: phase === 1 ? 0.06 : 0.35, trim: M.gold, emb: phase === 1, cols: 22, rows: 11 });
  // high academic collar and a short cape of scholar's grey (phase 1 only)
  if (phase === 1) mantle(b, sex, { mat: 'cloth_linen|t=8a8c94', len: 0.22, trim: M.gold, emb: true, open: 0.5 });
  b.add('neck', loft([{ y: 0.1, rx: 0.07, rz: 0.075, cz: -0.005 }, { y: 0.02, rx: 0.075, rz: 0.08 }, { y: -0.04, rx: 0.1, rz: 0.1 }], { segs: 16, phi0: 0.5, phiLen: Math.PI * 2 - 1.0 }), COAT, {
    skin: (p) => { const c = Math.min(1, Math.max(0, (0.03 - p.y) / 0.1)); return [['neck', 1 - c], ['chest', c]]; },
  });
  belt(b, sex, { y: 0.12, over: 0.03, mat: 'leather_dark', height: 0.05, pouches: 1, buckle: BRONZE });
  // glass ornaments: a lens brooch, a string of glass beads, glass drops on the belt
  const bz = trunkZ(sex, b.shoulder, 0.06, 0.42, 1, 0.03);
  b.add('hips', xf(cyl(0.022, 0.022, -0.004, 0.004, 14), { p: [0.06, 0.42, bz], r: [Math.PI / 2, 0, 0] }), LENS, { skin: trunkSkin });
  b.add('hips', xf(torus(0.024, 0.005, 4, 14), { p: [0.06, 0.42, bz] }), M.gold, { skin: trunkSkin });
  beads(b, 'hips', [0, 0.36, trunkZ(sex, b.shoulder, 0, 0.36, 1, 0.035)], 0.08, 0.12, GLASS, 'glass|e=ffe8c0|ei=0.8', trunkSkin);
  for (let i = 0; i < 4; i++) b.add('hips', xf(ellipsoid(0.01, 0.022, 0.01, { segs: 6, rows: 5 }), { p: [-0.14 + i * 0.03, 0.03, trunkZ(sex, b.shoulder, -0.14 + i * 0.03, 0.03, 1, 0.05)] }), GLASS, { skin: trunkSkin });
  addArms(b, sex, COAT, { inflate: 0.012, foreY1: -0.14 });
  addArms(b, sex, 'cloth_black|t=5a5a66', { upper: false, inflate: 0.004 });
  if (phase === 1) bellSleeves(b, sex, { mat: COAT, trim: M.gold, emb: true, flare: 0.085, len: 0.22 });
  // ink-stained hands (fingertips darkened)
  addHands(b, 'bare', 'skin|t=a8a0a8');
  addLegs(b, sex, 'cloth_black|t=5a5a66', { inflate: 0.008 });
  addFeet(b, sex, 'tallboot', M.leatherDark);
  if (phase === 3) {
    // shards of the lens floor held in the air around her shoulders
    const shards: G[] = [];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; shards.push(xf(box(0.02, 0.1, 0.004), { p: [Math.cos(a) * 0.3, 0.4 + Math.sin(i * 2.3) * 0.08, Math.sin(a) * 0.26], r: [0.3, a, 0.2] })); }
    b.add('chest', merge(shards), 'glass|e=ffe0b0|ei=1.2');
  }
}

// ---------------------------------------------------------------------------------- registration

const scale = (look: (b: CharBuilder, seed: number) => void, kind: 'enemy' | 'boss' = 'enemy') => (rig: import('../../actors/Rig').Rig, seed: number) => {
  const b = new CharBuilder(rig, kind, seed * 7919 + 101);
  look(b, seed);
  return b.build();
};
registerEnemyLook('glassAcolyte', scale(glassAcolyte));
registerEnemyLook('lensWarden', scale(lensWarden));
registerEnemyLook('choirLeader', scale(choirLeader));
registerEnemyLook('echoConstruct', scale(echoConstruct));
registerEnemyLook('homunculus', scale(homunculus));
registerEnemyLook('suspendedGolem', scale(suspendedGolem));
registerEnemyLook('experiment9', scale(experiment9, 'boss'));
registerEnemyLook('orrow', scale((b) => orrow(b, 1), 'boss'));
registerEnemyLook('orrow2', scale((b) => orrow(b, 2), 'boss'));
registerEnemyLook('orrow3', scale((b) => orrow(b, 3), 'boss'));

// ---------------------------------------------------------------------------------- weapons

function weapon(name: string, parts: [MaterialId | THREE.Material, THREE.BufferGeometry][], o: Omit<WeaponModelExt, 'object'>): WeaponModelExt {
  const g = new THREE.Group();
  g.name = 'weapon:' + name;
  let tris = 0;
  for (const [mat, geo] of parts) {
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? getMaterial(mat) : mat);
    m.castShadow = true;
    tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    g.add(m);
  }
  return { object: g, triangles: tris, ...o };
}
const C = (r0: number, r1: number, y0: number, y1: number, seg = 8) => new THREE.CylinderGeometry(r1, r0, y1 - y0, seg).translate(0, (y0 + y1) / 2, 0);

registerWeaponModel('acolyte_wand', () => weapon('acolyte_wand', [
  ['bronze', C(0.012, 0.012, -0.12, 0.08, 8)],
  ['leather_dark', C(0.015, 0.015, -0.1, 0.06, 8)],
  [glowMat('wandGlass', 0xcfe0e8, 0xbfe8ff, 0.8, { rough: 0.05 }), new THREE.ConeGeometry(0.018, 0.42, 6).translate(0, 0.29, 0)],
  ['bronze', new THREE.TorusGeometry(0.02, 0.005, 4, 10).rotateX(Math.PI / 2).translate(0, 0.08, 0)],
], { hit: { from: 0.06, to: 0.48, radius: 0.04 }, castPoint: new THREE.Vector3(0, 0.46, 0), trail: { from: 0.1, to: 0.48 } }));

registerWeaponModel('warden_lens_pole', () => {
  const lens = glowMat('wardenLens', 0xd8e6ea, 0xffe2a8, 0.9, { rough: 0.05 });
  return weapon('warden_lens_pole', [
    ['timber_dark', C(0.022, 0.024, -0.95, 1.4, 8)],
    ['iron', C(0.03, 0.02, -1.0, -0.9, 8)],
    ['bronze', C(0.03, 0.03, 1.36, 1.42, 10)],
    ['bronze', new THREE.TorusGeometry(0.2, 0.025, 6, 24).translate(0, 1.62, 0)],
    [lens, new THREE.CylinderGeometry(0.19, 0.19, 0.03, 20).rotateX(Math.PI / 2).translate(0, 1.62, 0)],
    ['bronze', new THREE.BoxGeometry(0.03, 0.26, 0.03).translate(0.2, 1.52, 0)],
    ['bronze', new THREE.BoxGeometry(0.03, 0.26, 0.03).translate(-0.2, 1.52, 0)],
  ], { hit: { from: 0.4, to: 1.8, radius: 0.12 }, castPoint: new THREE.Vector3(0, 1.62, 0), trail: { from: 1.3, to: 1.82 }, offhandGrip: 0.45 });
});

registerWeaponModel('choir_fork', () => weapon('choir_fork', [
  ['timber_dark', C(0.018, 0.02, -0.7, 1.05, 8)],
  ['bronze', C(0.026, 0.03, 1.02, 1.12, 8)],
  ['bronze_bell', new THREE.BoxGeometry(0.03, 0.4, 0.03).translate(0.07, 1.34, 0)],
  ['bronze_bell', new THREE.BoxGeometry(0.03, 0.4, 0.03).translate(-0.07, 1.34, 0)],
  ['bronze_bell', new THREE.TorusGeometry(0.07, 0.016, 5, 12, Math.PI).rotateZ(Math.PI).translate(0, 1.15, 0)],
], { hit: { from: 0.9, to: 1.55, radius: 0.09 }, castPoint: new THREE.Vector3(0, 1.4, 0), trail: { from: 1.0, to: 1.55 } }));

registerWeaponModel('echo_blade', () => {
  const g = glowMat('echoGlass', 0xc8d8e0, 0x9fc8d8, 0.25, { rough: 0.04, metal: 0.2 });
  return weapon('echo_blade', [
    ['bronze', C(0.018, 0.02, -0.12, 0.1, 8)],
    ['bronze', new THREE.BoxGeometry(0.22, 0.03, 0.05).translate(0, 0.1, 0)],
    [g, new THREE.CylinderGeometry(0.004, 0.028, 0.95, 4).scale(1, 1, 0.3).translate(0, 0.6, 0)],
  ], { hit: { from: 0.12, to: 1.06, radius: 0.05 }, trail: { from: 0.2, to: 1.06 } });
});

registerWeaponModel('keepers_lens_staff', () => {
  const lens = glowMat('keeperLens', 0xd8e2e6, 0xfff0c8, 0.7, { rough: 0.04 });
  return weapon('keepers_lens_staff', [
    ['timber_dark', C(0.016, 0.019, -0.65, 1.1, 8)],
    ['leather_dark', C(0.02, 0.02, -0.11, 0.11, 8)],
    ['bronze', C(0.024, 0.024, 1.08, 1.14, 10)],
    ['bronze', new THREE.TorusGeometry(0.13, 0.014, 6, 24).translate(0, 1.3, 0)],
    ['bronze', new THREE.TorusGeometry(0.1, 0.008, 6, 24).rotateY(Math.PI / 2).translate(0, 1.3, 0)],
    [lens, new THREE.CylinderGeometry(0.12, 0.12, 0.022, 20).rotateX(Math.PI / 2).translate(0, 1.3, 0)],
    ['bronze', new THREE.ConeGeometry(0.02, 0.12, 6).translate(0, 1.49, 0)],
    ['gold_trim', C(0.02, 0.02, 0.5, 0.54, 8)],
  ], { hit: { from: 0.95, to: 1.45, radius: 0.1 }, castPoint: new THREE.Vector3(0, 1.3, 0), trail: { from: 1.0, to: 1.45 }, offhandGrip: -0.35 });
});

registerWeaponModel('orrow_glass_blade', () => {
  const g = glowMat('orrowBlade', 0xe0eaee, 0xffe8c0, 0.55, { rough: 0.03, metal: 0.1 });
  return weapon('orrow_glass_blade', [
    ['timber_dark', C(0.018, 0.02, -0.14, 0.1, 8)],
    ['bronze', new THREE.TorusGeometry(0.13, 0.012, 5, 16, Math.PI).rotateZ(Math.PI).translate(0, 0.14, 0)],
    [g, new THREE.CylinderGeometry(0.003, 0.034, 1.05, 4).scale(1, 1, 0.28).translate(0, 0.66, 0)],
  ], { hit: { from: 0.14, to: 1.18, radius: 0.05 }, trail: { from: 0.2, to: 1.18 } });
});

void sweep;
