/**
 * Player (and humanoid NPC/enemy) looks assembled per armour slot.
 *
 * Every ArmorLook implements the four slots independently (head, body, arms, legs) so any mix of
 * equipped pieces composes: each slot builds its own base layer (skin / under-clothes) plus the
 * armour, so nothing is left bare and nothing hidden is generated twice.
 *
 * Priority looks (Household Knight 'retainer', Court Mage 'court', under-clothes 'none') follow
 * concept-art/selected/characters-classes.png closely: silhouettes first (helm, pauldrons,
 * cloak, hood, robe), then layering (plate over mail over gambeson), then trims and wear.
 */
import type { ArmorLook, CharacterLook } from './contract';
import type { CharBuilder } from './builder';
import {
  type Sex, addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet, quilted, type HeadOpts,
} from './anatomy';
import {
  M, cuirass, gorget, fauld, tassets, mailSkirt, tabard, belt, bandolier, robeSkirt, bellSleeves, mantle, pauldrons,
  armPlates, legPlates, bracers, greatHelm, kettleHelm, sallet, bevor, bascinet, nasalHelm, hood, wideHat, veil,
  drapeChain, shackle, bellGeom, beads, cloak, trunkZ, type CloakStyle,
} from './gear';
import { ellipsoid, loft, sweep, xf, rivet, scatter, torus, merge, type V3, lerp, TAU } from './parts';
import * as THREE from 'three';
import { trunkSkin } from './builder';

/** CharacterLook plus the optional body type (requested as a contract addition). */
export interface CharacterLookExt extends CharacterLook {
  sex?: Sex;
}

export interface LookCtx {
  sex: Sex;
  hair: HeadOpts['hair'];
  /** Unlived crack density applied by the enemy builder (0 for the player). */
  unlived: boolean;
  /** Head slot hides the face (closed helm). */
  faceHidden: boolean;
  /** Seed-driven variation for enemies. */
  variant: number;
}

type SlotFn = (b: CharBuilder, c: LookCtx) => void;
interface LookDef {
  head: SlotFn; body: SlotFn; arms: SlotFn; legs: SlotFn;
  /** Head slot covers the face entirely. */
  closedHelm?: boolean;
  cloak?: { style: CloakStyle; mat?: string; pad?: number; heraldry?: boolean; fur?: boolean };
}

// materials used by several looks
const BLACKENED = 'steel_armor|t=5a5a60';
const OLDSTEEL = M.steelOld;
const GAMBESON = 'cloth_linen|t=7a7266';
const ROYAL = 'cloth_blue|t=8088a8';
const PALE = 'cloth_linen|t=e0d8c8';
const WOOL = 'cloth_brown|t=a08870';
const SOOT = 'cloth_black|t=6a6460';
const GREYBLUE = 'cloth_blue|t=a8b4c4';
const ARMYRED = 'cloth_red|t=b09088';

const face = (b: CharBuilder, c: LookCtx, o: Partial<HeadOpts> = {}) =>
  addHead(b, { sex: c.sex, hair: c.hair ?? 'dark', style: c.sex === 'f' ? 'long' : 'short', unlived: c.unlived, ...o });

// ------------------------------------------------------------------------------------ looks

const NONE: LookDef = {
  head: (b, c) => face(b, c, { beard: c.sex === 'm' ? 'stubble' : 'none' }),
  body: (b, c) => {
    addTrunk(b, c.sex, 'cloth_linen|t=a09888', { y0: 0.42, y1: 0.575, inflate: 0.004 });
    addTrunk(b, c.sex, GAMBESON, { y0: -0.16, y1: 0.535, inflate: 0.016, radial: quilted(30, 20, 0.04), crack: 1 });
    addShoulders(b, c.sex, GAMBESON, 0.012);
    robeSkirt(b, c.sex, { mat: GAMBESON, y0: 0.02, hem: -0.28, r1: [0.2, 0.15], tatter: 0.05, cols: 18, rows: 5 });
    belt(b, c.sex, { y: 0.06, over: 0.024, pouches: 1 });
  },
  arms: (b, c) => {
    addArms(b, c.sex, GAMBESON, { inflate: 0.012, radial: quilted(12, 10, 0.05), foreY1: -0.2, crack: 1 });
    addArms(b, c.sex, 'skin', { upper: false, inflate: 0 });
    addHands(b, 'wrapped', 'skin', 'cloth_linen|t=a09880');
  },
  legs: (b, c) => {
    addLegs(b, c.sex, 'cloth_brown|t=8a7a6a', { inflate: 0.012, shinY1: -0.3, crack: 1 });
    addFeet(b, c.sex, 'boot');
  },
};

const RETAINER: LookDef = {
  closedHelm: true,
  head: (b, c) => {
    greatHelm(b, { mat: M.steel, trim: M.bronze, eyes: c.unlived, dents: 3 });
    bascinetAventail(b);
  },
  body: (b, c) => {
    addTrunk(b, c.sex, M.black, { y0: -0.16, y1: 0.56, inflate: 0.012, radial: quilted(26, 16, 0.03) });
    addShoulders(b, c.sex, M.black, 0.014);
    mailSkirt(b, c.sex, { y0: 0.12, y1: -0.3 });
    cuirass(b, c.sex, { mat: M.steel, trim: M.bronze, inflate: 0.03, dents: 4 });
    gorget(b, c.sex, { mat: M.steel, trim: M.bronze });
    fauld(b, c.sex, { mat: M.steel, trim: M.bronze, lames: 2, top: 0.16 });
    tabard(b, c.sex, { mat: ROYAL, hem: -0.56, over: 0.05, w: [0.11, 0.14, 0.16], heraldry: 'arms', split: true, trim: M.gold, tatter: 0.14 });
    belt(b, c.sex, { y: 0.1, over: 0.06, pouches: 2, height: 0.045 });
    pauldrons(b, { mat: M.steel, trim: M.bronze, size: 1.08, lames: 3 });
  },
  arms: (b, c) => {
    addArms(b, c.sex, M.black, { inflate: 0.01 });
    armPlates(b, c.sex, { mat: M.steel, trim: M.bronze });
    addHands(b, 'gauntlet', M.steel, M.steel);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, M.black, { inflate: 0.012 });
    legPlates(b, c.sex, { mat: M.steel, trim: M.bronze });
    addFeet(b, c.sex, 'sabaton', M.leatherDark, M.steel);
  },
  cloak: { style: 'long', mat: M.black, pad: 0.035 },
};

/** Mail aventail below a closed helm (neck → chest). */
function bascinetAventail(b: CharBuilder, mat: string = M.mail) {
  b.add('neck', loft([
    { y: 0.05, rx: 0.1, rz: 0.115 }, { y: -0.02, rx: 0.12, rz: 0.125 }, { y: -0.06, rx: 0.17, rz: 0.15, cz: -0.01 },
    { y: -0.09, rx: 0.2 * (0.45 + 0.55 * b.shoulder), rz: 0.16, cz: -0.015 },
  ], { segs: 20, radial: (th, v) => 1 + (v > 0.85 ? 0.03 * Math.abs(Math.sin(th * 16)) : 0) }), mat, {
    skin: (p) => { const k = Math.min(1, Math.max(0, (0.04 - p.y) / 0.12)); return [['neck', 1 - k], ['chest', k]]; },
  });
}

const COURT: LookDef = {
  head: (b, c) => {
    face(b, c, { beard: c.sex === 'm' ? 'short' : 'none', style: c.sex === 'f' ? 'long' : 'short', hair: c.hair ?? (c.sex === 'f' ? 'fair' : 'dark') });
    hood(b, { mat: 'cloth_blue|t=6a7088', trim: M.gold, emb: true, depth: c.sex === 'f' ? 1.1 : 1.28, tip: 0.07, open: c.sex === 'f' ? 1.0 : 0.85 });
  },
  body: (b, c) => {
    addTrunk(b, c.sex, M.black, { y0: -0.16, y1: 0.56, inflate: 0.012 });
    addShoulders(b, c.sex, 'cloth_blue|t=6a7088', 0.016);
    // inner robe (closed) and outer coat (open front) with gilt embroidery
    robeSkirt(b, c.sex, { mat: M.black, y0: 0.1, hem: -0.93, r1: [0.24, 0.2], tatter: 0.05, cols: 20, rows: 11 });
    addTrunk(b, c.sex, 'cloth_blue|t=6a7088', { y0: -0.02, y1: 0.54, inflate: 0.022 });
    robeSkirt(b, c.sex, { mat: 'cloth_blue|t=6a7088', y0: 0.05, hem: -0.88, r1: [0.29, 0.25], open: 0.8, tatter: 0.1, trim: M.gold, emb: true, cols: 22, rows: 11 });
    // front embroidery bands down the chest
    for (const s of [1, -1]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 8; i++) {
        const y = lerp(0.53, 0.02, i / 8);
        const x = s * lerp(0.03, 0.07, i / 8);
        pts.push([x, y, trunkZ(c.sex, b.shoulder, x, y, 1, 0.026)]);
      }
      b.add('hips', sweep(pts, { w: 0.014, h: 0.002, up: [1, 0, 0], sides: 4, segs: 12 }), M.emb, { skin: trunkSkin });
    }
    // sash + belt with pouch and hanging tome
    belt(b, c.sex, { y: 0.1, over: 0.035, mat: 'cloth_red|t=a07070', height: 0.06, pouches: 0, buckle: M.gold, strapEnd: false });
    b.add('hips', sweep([[0.05, 0.08, 0.14], [0.08, -0.02, 0.155], [0.075, -0.2, 0.16], [0.09, -0.3, 0.15]], { w: 0.03, h: 0.003, up: [0, 0, 1], sides: 4, segs: 8 }), 'cloth_red|t=a07070', { skin: (p) => (p.y > 0.0 ? [['hips', 1]] : [['hips', 0.5], ['thighL', 0.5]]) });
    b.add('hips', xf(loft([{ y: 0.06, rx: 0.045, rz: 0.018, p: 5 }, { y: -0.06, rx: 0.045, rz: 0.018, p: 5 }], { segs: 12, capTop: true, capBottom: true }), { p: [-0.15, -0.02, 0.1], r: [0, -0.6, 0.1] }), M.leatherDark, { skin: trunkSkin });
    b.add('hips', xf(loft([{ y: 0.055, rx: 0.04, rz: 0.02, p: 6 }, { y: -0.055, rx: 0.04, rz: 0.02, p: 6 }], { segs: 12, capTop: true, capBottom: true }), { p: [-0.152, -0.02, 0.102], r: [0, -0.6, 0.1] }), 'parchment', { skin: trunkSkin });
    mantle(b, c.sex, { mat: 'cloth_blue|t=6a7088', len: 0.24, trim: M.gold, emb: true, open: 0.35 });
  },
  arms: (b, c) => {
    addArms(b, c.sex, 'cloth_blue|t=6a7088', { inflate: 0.014, foreY1: -0.12 });
    addArms(b, c.sex, M.black, { upper: false, inflate: 0.004 });
    bellSleeves(b, c.sex, { mat: 'cloth_blue|t=6a7088', trim: M.gold, emb: true, flare: 0.1, len: 0.28 });
    addHands(b, 'glove', M.leatherDark, M.leatherDark);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, M.black, { inflate: 0.01 });
    addFeet(b, c.sex, 'tallboot', M.leatherDark);
  },
  cloak: { style: 'mantle', mat: 'cloth_blue|t=5a6078', pad: 0.03 },
};

const OATH: LookDef = {
  head: (b, c) => {
    face(b, c, { style: 'shaggy', beard: c.sex === 'm' ? 'stubble' : 'none' });
    // high cowl scarf
    b.add('neck', loft([{ y: 0.09, rx: 0.07, rz: 0.075, cz: 0.01 }, { y: 0.02, rx: 0.08, rz: 0.085 }, { y: -0.05, rx: 0.12, rz: 0.11 }], { segs: 14, radial: (th, v) => 1 + 0.06 * Math.sin(th * 6 + v * 5) }), M.black, {
      skin: (p) => { const k = Math.min(1, Math.max(0, (0.02 - p.y) / 0.08)); return [['neck', 1 - k], ['chest', k]]; },
    });
  },
  body: (b, c) => {
    addTrunk(b, c.sex, M.mail, { y0: -0.16, y1: 0.56, inflate: 0.01 });
    addShoulders(b, c.sex, M.leatherDark, 0.016);
    addTrunk(b, c.sex, M.leatherDark, { y0: -0.04, y1: 0.54, inflate: 0.022, radial: (th, v) => 1 + 0.015 * Math.sin(v * 50) });
    robeSkirt(b, c.sex, { mat: M.leatherDark, y0: 0.05, hem: -0.72, r1: [0.24, 0.2], open: 0.7, tatter: 0.16, trim: M.iron, cols: 18, rows: 9 });
    mailSkirt(b, c.sex, { y0: 0.02, y1: -0.28 });
    bandolier(b, c.sex, { over: 0.04 });
    bandolier(b, c.sex, { over: 0.045, fromLeft: false, mat: M.leatherDark });
    belt(b, c.sex, { y: 0.08, over: 0.04, pouches: 2 });
    // single leather pauldron on the lead (left) shoulder
    b.add('upperArmL', loft([{ y: 0.07, rx: 0.075, rz: 0.08, cx: 0.01 }, { y: -0.09, rx: 0.084, rz: 0.086, cx: 0.012 }], { segs: 12, phi0: 0.2, phiLen: 2.7 }), M.leather);
  },
  arms: (b, c) => {
    addArms(b, c.sex, M.leatherDark, { inflate: 0.014 });
    bracers(b, c.sex, { mat: M.leather, studs: M.iron });
    addHands(b, 'glove', M.leatherDark, M.leather);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, M.black, { inflate: 0.01 });
    addFeet(b, c.sex, 'tallboot', M.leatherDark);
  },
  cloak: { style: 'shroud', mat: M.black, pad: 0.02 },
};

const FUNERAL: LookDef = {
  closedHelm: false,
  head: (b, c) => {
    if (c.sex === 'm') {
      greatHelm(b, { mat: 'steel_armor|t=8a8a8a', trim: M.gold, eyes: c.unlived, slitY: 0.08 });
      veil(b, { y: 0.2, r: 0.13 });
      bascinetAventail(b);
    } else {
      face(b, c, { style: 'long', hair: c.hair ?? 'fair' });
      hood(b, { mat: PALE, lining: 'cloth_black|t=303030', trim: M.gold, depth: 1.05, tip: 0.02, open: 1.05 });
    }
  },
  body: (b, c) => {
    addTrunk(b, c.sex, M.mail, { y0: -0.16, y1: 0.56, inflate: 0.012 });
    addShoulders(b, c.sex, PALE, 0.018);
    robeSkirt(b, c.sex, { mat: PALE, y0: 0.1, hem: -0.95, r1: [0.27, 0.23], tatter: 0.08, trim: M.gold, cols: 22, rows: 11 });
    addTrunk(b, c.sex, PALE, { y0: -0.02, y1: 0.54, inflate: 0.022 });
    // dark scapular with a bell emblem
    tabard(b, c.sex, { mat: M.black, top: 0.54, hem: -0.8, over: 0.03, w: [0.08, 0.1, 0.11], tatter: 0.1, trim: M.gold });
    b.add('hips', xf(bellGeom(0.07), { p: [0, 0.4, trunkZ(c.sex, b.shoulder, 0, 0.38, 1, 0.05)], r: [0.2, 0, 0] }), 'bronze_bell', { skin: trunkSkin });
    mantle(b, c.sex, { mat: PALE, len: 0.3, trim: M.gold });
    belt(b, c.sex, { y: 0.1, over: 0.04, pouches: 0, mat: M.leatherDark });
    beads(b, 'hips', [0.1, 0.06, trunkZ(c.sex, b.shoulder, 0.1, 0.06, 1, 0.05)], 0.05, 0.12, 'bone', 'bronze_bell', trunkSkin);
  },
  arms: (b, c) => {
    addArms(b, c.sex, M.mail, { inflate: 0.01 });
    bellSleeves(b, c.sex, { mat: PALE, trim: M.gold, flare: 0.1, len: 0.27 });
    addHands(b, 'glove', M.leatherDark, M.leatherDark);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, M.mail, { inflate: 0.01 });
    addFeet(b, c.sex, 'boot', M.leatherDark);
  },
  cloak: { style: 'mantle', mat: PALE, pad: 0.03 },
};

const HUNTSMAN: LookDef = {
  head: (b, c) => {
    face(b, c, { beard: c.sex === 'm' ? 'short' : 'none', hair: c.hair ?? (c.sex === 'f' ? 'fair' : 'dark') });
    wideHat(b, { mat: M.leatherDark, band: 'cloth_red|t=a08080' });
    // scarf
    b.add('neck', loft([{ y: 0.07, rx: 0.068, rz: 0.075, cz: 0.01 }, { y: 0.0, rx: 0.078, rz: 0.085 }, { y: -0.05, rx: 0.11, rz: 0.11 }], { segs: 14, radial: (th, v) => 1 + 0.06 * Math.sin(th * 5 + v * 4) }), M.brown, {
      skin: (p) => { const k = Math.min(1, Math.max(0, (0.02 - p.y) / 0.08)); return [['neck', 1 - k], ['chest', k]]; },
    });
  },
  body: (b, c) => {
    addTrunk(b, c.sex, 'cloth_linen|t=a09880', { y0: -0.16, y1: 0.56, inflate: 0.008 });
    addShoulders(b, c.sex, M.leather, 0.016);
    addTrunk(b, c.sex, M.leather, { y0: -0.06, y1: 0.54, inflate: 0.02, radial: quilted(10, 12, 0.02) });
    robeSkirt(b, c.sex, { mat: M.leather, y0: 0.04, hem: -0.34, r1: [0.21, 0.17], open: 0.5, tatter: 0.12, cols: 16, rows: 5 });
    belt(b, c.sex, { y: 0.07, over: 0.035, pouches: 3 });
    bandolier(b, c.sex, { over: 0.035, width: 0.018 });
  },
  arms: (b, c) => {
    addArms(b, c.sex, 'cloth_linen|t=a09880', { inflate: 0.012 });
    bracers(b, c.sex, { mat: M.leatherDark, studs: M.bronze });
    addHands(b, 'glove', M.leather, M.leatherDark);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, 'cloth_brown|t=7a6a58', { inflate: 0.01 });
    addFeet(b, c.sex, 'tallboot', M.leatherDark);
  },
  cloak: { style: 'cape', mat: 'cloth_brown|t=8a7a66', pad: 0.02 },
};

const CONDEMNED: LookDef = {
  head: (b, c) => face(b, c, { style: 'shaggy', beard: c.sex === 'm' ? 'short' : 'none', skin: 'skin|t=c8b8a8' }),
  body: (b, c) => {
    addTrunk(b, c.sex, 'skin|t=c8b8a8', { y0: -0.16, y1: 0.575, crack: 1, radial: c.sex === 'm' ? (th, v) => 1 + 0.02 * Math.sin(v * 38) * Math.max(0, Math.cos(th)) : undefined });
    addShoulders(b, c.sex, 'skin|t=c8b8a8');
    // torn open vest
    for (const s of [1, -1] as const) {
      b.add('hips', panelSide(b, c.sex, s), 'cloth_brown|t=7a6a5a', { skin: trunkSkin });
    }
    robeSkirt(b, c.sex, { mat: 'cloth_brown|t=6a5a4a', y0: 0.08, hem: -0.58, r1: [0.23, 0.19], tatter: 0.3, cols: 18, rows: 7 });
    belt(b, c.sex, { y: 0.08, over: 0.028, mat: M.rope, pouches: 0, buckle: M.iron, strapEnd: false });
    // chains across the torso
    const z = (x: number, y: number, d = 1 as 1 | -1) => trunkZ(c.sex, b.shoulder, x, y, d, 0.02);
    drapeChain(b, 'hips', [[0.14, 0.5, z(0.14, 0.5)], [0.03, 0.34, z(0.03, 0.34)], [-0.12, 0.16, z(-0.12, 0.16)], [-0.15, 0.08, z(-0.15, 0.08)]], M.iron, 0.034, trunkSkin);
    drapeChain(b, 'hips', [[-0.15, 0.47, z(-0.15, 0.47)], [-0.02, 0.32, z(-0.02, 0.32)], [0.12, 0.2, z(0.12, 0.2)]], M.iron, 0.03, trunkSkin);
    b.add('neck', torus(0.07, 0.01, 6, 18), M.iron, { p: [0, -0.02, 0.0], r: [0.15, 0, 0], skin: (p) => [['neck', 0.5], ['chest', 0.5 + p.y * 0]] });
  },
  arms: (b, c) => {
    addArms(b, c.sex, 'skin|t=c8b8a8', { crack: 1 });
    addHands(b, 'wrapped', 'skin|t=c8b8a8', 'cloth_linen|t=7a7060');
    for (const s of [1, -1] as const) {
      shackle(b, s > 0 ? 'forearmL' : 'forearmR', -0.2, 0.042);
      drapeChain(b, s > 0 ? 'forearmL' : 'forearmR', [[s * 0.03, -0.2, 0.04], [s * 0.05, -0.28, 0.02], [s * 0.035, -0.36, -0.01]], M.iron, 0.03);
    }
  },
  legs: (b, c) => {
    addLegs(b, c.sex, 'cloth_brown|t=6a5a4a', { inflate: 0.012, radial: (th, v) => 1 + 0.05 * Math.sin(th * 4 + v * 9) });
    addFeet(b, c.sex, 'wrap');
    for (const s of [1, -1] as const) shackle(b, s > 0 ? 'shinL' : 'shinR', -0.36, 0.05);
  },
  cloak: { style: 'rag', mat: 'cloth_brown|t=8a8070' },
};

function panelSide(b: CharBuilder, sex: Sex, s: 1 | -1) {
  // one half of a torn vest: from the shoulder seam around the side to the back
  const f = (u: number, v: number): V3 => {
    const y = lerp(0.54, 0.02, v);
    const a = s * lerp(0.55 + v * 0.2, Math.PI, u);
    const x = Math.sin(a);
    const rr = trunkRingR(sex, b.shoulder, y);
    const c = Math.cos(a);
    return [x * (rr[0] + 0.016), y, rr[2] + c * (rr[1] + 0.016) * (c > 0 ? rr[3] : rr[4])];
  };
  return panelTattered(b, f, 10, 9, 0.15);
}
import { ringAtY, trunkRings } from './anatomy';
import { panel } from './parts';
function trunkRingR(sex: Sex, sh: number, y: number): [number, number, number, number, number] {
  const r = ringAtY(trunkRings(sex, sh), y);
  return [r.rx, r.rz ?? r.rx, r.cz ?? 0, r.front ?? 1, r.back ?? 1];
}
function panelTattered(b: CharBuilder, f: (u: number, v: number) => V3, cols: number, rows: number, t: number) {
  return panel(f, cols, rows, { rng: b.rng, tatter: t });
}

const COMMANDER: LookDef = {
  closedHelm: true,
  head: (b, c) => {
    greatHelm(b, { mat: BLACKENED, trim: M.bronze, eyes: c.unlived, crest: true, dents: 2 });
    bascinetAventail(b, 'iron|t=707070');
  },
  body: (b, c) => {
    addTrunk(b, c.sex, M.black, { y0: -0.16, y1: 0.56, inflate: 0.012 });
    addShoulders(b, c.sex, M.black, 0.016);
    mailSkirt(b, c.sex, { y0: 0.12, y1: -0.34, mat: 'iron|t=707070' });
    cuirass(b, c.sex, { mat: BLACKENED, trim: M.bronze, inflate: 0.034, keel: 0.09, crack: 1.2 });
    // bell sigil on the chest
    b.add('hips', xf(bellGeom(0.08), { p: [0, 0.44, trunkZ(c.sex, b.shoulder, 0, 0.4, 1, 0.07)], r: [0.28, 0, 0], s: [1, 1, 0.45] }), M.bronze, { skin: trunkSkin });
    gorget(b, c.sex, { mat: BLACKENED, trim: M.bronze, high: true });
    fauld(b, c.sex, { mat: BLACKENED, trim: M.bronze, lames: 3, top: 0.17 });
    tassets(b, { mat: BLACKENED, trim: M.bronze, len: 0.24, y: -0.12 });
    tabard(b, c.sex, { mat: 'cloth_red|t=8a6060', top: 0.06, hem: -0.62, over: 0.08, w: [0.12, 0.13, 0.15], tatter: 0.12, trim: M.gold, split: true, back: true });
    belt(b, c.sex, { y: 0.1, over: 0.07, pouches: 0, height: 0.05, buckle: M.gold });
    pauldrons(b, { mat: BLACKENED, trim: M.bronze, size: 1.22, lames: 4, style: 'bell' });
  },
  arms: (b, c) => {
    addArms(b, c.sex, M.black, { inflate: 0.012 });
    armPlates(b, c.sex, { mat: BLACKENED, trim: M.bronze });
    addHands(b, 'gauntlet', BLACKENED, M.bronze);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, M.black, { inflate: 0.012 });
    legPlates(b, c.sex, { mat: BLACKENED, trim: M.bronze });
    addFeet(b, c.sex, 'sabaton', M.leatherDark, BLACKENED);
  },
  cloak: { style: 'heavy', mat: 'cloth_red|t=6a4848', pad: 0.05, heraldry: true, fur: true },
};

const GREYFORD: LookDef = {
  head: (b, c) => {
    if (!c.faceHidden) face(b, c, { style: 'cropped', beard: 'stubble' });
    sallet(b, { mat: OLDSTEEL, eyes: c.unlived, dents: 3 });
    bevor(b, { mat: OLDSTEEL });
  },
  body: (b, c) => {
    addTrunk(b, c.sex, M.mail, { y0: -0.16, y1: 0.56, inflate: 0.01 });
    addShoulders(b, c.sex, M.mail, 0.014);
    mailSkirt(b, c.sex, { y0: 0.1, y1: -0.28, crack: 1 });
    // brigandine: cloth-covered plates studded with rivets
    const rings = addTrunk(b, c.sex, 'cloth_blue|t=7a8290', { y0: 0.02, y1: 0.52, inflate: 0.03, crack: 1.3 });
    const frames: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 9; j++) {
      const y = lerp(0.48, 0.06, i / 5);
      const a = lerp(-1.2, 1.2, j / 8) + (i % 2 ? 0.1 : 0);
      const r = ringAtY(rings, y);
      const rz = (r.rz ?? r.rx) * (r.front ?? 1);
      frames.push({ p: new THREE.Vector3(Math.sin(a) * (r.rx + 0.001), y, (r.cz ?? 0) + Math.cos(a) * (rz + 0.001)), n: new THREE.Vector3(Math.sin(a) / r.rx, 0, Math.cos(a) / rz).normalize() });
    }
    b.add('hips', scatter(() => rivet(0.0055), frames), M.bronze, { skin: trunkSkin });
    tabard(b, c.sex, { mat: GREYBLUE, hem: -0.5, over: 0.045, w: [0.1, 0.14, 0.17], heraldry: 'army', split: true, tatter: 0.22 });
    belt(b, c.sex, { y: 0.1, over: 0.055, pouches: 1 });
    pauldrons(b, { mat: OLDSTEEL, trim: null, size: 0.92, lames: 2, crack: 1 });
  },
  arms: (b, c) => {
    addArms(b, c.sex, M.mail, { inflate: 0.01 });
    armPlates(b, c.sex, { mat: OLDSTEEL, trim: null, rerebrace: false, crack: 1 });
    addHands(b, 'glove', M.leatherDark, M.leather);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, 'cloth_brown|t=6a6258', { inflate: 0.01, crack: 1 });
    legPlates(b, c.sex, { mat: OLDSTEEL, trim: null, cuisse: false, crack: 1 });
    addFeet(b, c.sex, 'boot', M.leatherDark);
  },
};

const WARDEN: LookDef = {
  head: (b, c) => {
    face(b, c, { style: 'cropped', beard: c.sex === 'm' ? 'short' : 'none' });
    bascinet(b, { mat: M.steel, trim: M.bronze });
  },
  body: (b, c) => {
    addTrunk(b, c.sex, 'cloth_red|t=806060', { y0: -0.16, y1: 0.56, inflate: 0.016, radial: quilted(26, 16, 0.04) });
    addShoulders(b, c.sex, 'cloth_red|t=806060', 0.02);
    robeSkirt(b, c.sex, { mat: 'cloth_red|t=806060', y0: 0.04, hem: -0.5, r1: [0.23, 0.19], open: 0.45, tatter: 0.06, cols: 18, rows: 7 });
    const rings = addTrunk(b, c.sex, M.leather, { y0: 0.06, y1: 0.5, inflate: 0.03 });
    const frames: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 10; j++) {
      const y = lerp(0.46, 0.1, i / 4);
      const a = lerp(-2.6, 2.6, j / 9);
      const r = ringAtY(rings, y);
      const rz = (r.rz ?? r.rx) * (Math.cos(a) > 0 ? (r.front ?? 1) : (r.back ?? 1));
      frames.push({ p: new THREE.Vector3(Math.sin(a) * (r.rx + 0.001), y, (r.cz ?? 0) + Math.cos(a) * (rz + 0.001)), n: new THREE.Vector3(Math.sin(a) / r.rx, 0, Math.cos(a) / rz).normalize() });
    }
    b.add('hips', scatter(() => rivet(0.007), frames), M.bronze, { skin: trunkSkin });
    belt(b, c.sex, { y: 0.08, over: 0.05, pouches: 1 });
    // key ring on the hip
    const kz = trunkZ(c.sex, b.shoulder, -0.15, 0.0, 1, 0.06) - 0.03;
    b.add('hips', xf(torus(0.03, 0.004, 5, 14), { p: [-0.16, 0.0, kz], r: [Math.PI / 2, 0, 0.4] }), M.iron, { skin: trunkSkin });
    for (let i = 0; i < 3; i++) {
      b.add('hips', xf(merge([
        xf(new THREE.CylinderGeometry(0.003, 0.003, 0.07, 5), { p: [0, -0.035, 0] }),
        xf(torus(0.008, 0.002, 4, 8), { r: [Math.PI / 2, 0, 0] }),
        xf(new THREE.BoxGeometry(0.004, 0.012, 0.01), { p: [0, -0.065, 0.006] }),
      ]), { p: [-0.16 + (i - 1) * 0.012, -0.03, kz + 0.005], r: [0, 0, (i - 1) * 0.3] }), M.iron, { skin: trunkSkin });
    }
    pauldrons(b, { mat: M.leather, trim: M.bronze, size: 0.9, lames: 2, style: 'leather' });
  },
  arms: (b, c) => {
    addArms(b, c.sex, 'cloth_red|t=806060', { inflate: 0.016, radial: quilted(10, 10, 0.05) });
    bracers(b, c.sex, { mat: M.leather, studs: M.bronze });
    addHands(b, 'glove', M.leatherDark, M.leather);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, 'cloth_brown|t=6a5a4a', { inflate: 0.01 });
    addFeet(b, c.sex, 'boot', M.leatherDark);
  },
};

const HOSPICE: LookDef = {
  head: (b, c) => {
    face(b, c, { beard: c.sex === 'm' ? 'short' : 'none', hair: c.hair ?? 'dark' });
    hood(b, { mat: WOOL, lining: 'cloth_linen|t=8a8070', trim: null, depth: 1.0, tip: 0.02, open: 1.1 });
  },
  body: (b, c) => {
    addTrunk(b, c.sex, WOOL, { y0: -0.16, y1: 0.56, inflate: 0.016 });
    addShoulders(b, c.sex, WOOL, 0.02);
    robeSkirt(b, c.sex, { mat: WOOL, y0: 0.1, hem: -0.92, r1: [0.25, 0.21], tatter: 0.06, cols: 20, rows: 10 });
    // linen apron
    tabard(b, c.sex, { mat: 'cloth_linen|t=c8c0b0', top: 0.4, hem: -0.66, over: 0.03, w: [0.11, 0.15, 0.17], back: false, tatter: 0.06 });
    belt(b, c.sex, { y: 0.1, over: 0.05, mat: M.rope, pouches: 0, buckle: M.iron, strapEnd: false });
    bandolier(b, c.sex, { over: 0.04, fromLeft: true });
    b.add('hips', xf(roundBag(), { p: [-0.2, -0.08, 0.02], r: [0, -1.4, 0] }), M.leather, { skin: (p) => [['hips', 0.7], ['thighR', 0.3 + p.y * 0]] });
  },
  arms: (b, c) => {
    addArms(b, c.sex, WOOL, { inflate: 0.016, foreY1: -0.14 });
    addArms(b, c.sex, 'cloth_linen|t=b0a898', { upper: false, inflate: 0.006 });
    addHands(b, 'bare', 'skin', 'skin');
  },
  legs: (b, c) => {
    addLegs(b, c.sex, 'cloth_brown|t=6a5a4a', { inflate: 0.008 });
    addFeet(b, c.sex, 'boot', M.leather);
  },
};

function roundBag() {
  return merge([
    loft([{ y: 0.07, rx: 0.08, rz: 0.03, p: 3 }, { y: 0.0, rx: 0.09, rz: 0.045, p: 3 }, { y: -0.08, rx: 0.085, rz: 0.04, p: 3 }, { y: -0.1, rx: 0.06, rz: 0.03, p: 3 }], { segs: 14, capTop: true, capBottom: true }),
    xf(loft([{ y: 0.075, rx: 0.084, rz: 0.034, p: 3 }, { y: 0.02, rx: 0.086, rz: 0.05, p: 3 }], { segs: 14 }), { p: [0, 0, 0.005] }),
    xf(rivet(0.008), { p: [0, 0.03, 0.052], r: [Math.PI / 2, 0, 0] }),
  ]);
}

const BELLKEEPER: LookDef = {
  head: (b, c) => {
    face(b, c, { old: true, style: 'balding', hair: 'grey', beard: 'full', skin: 'skin|t=b0a090', soot: true });
    hood(b, { mat: SOOT, trim: null, depth: 1.05, tip: 0.08, open: 1.0 });
  },
  body: (b, c) => {
    addTrunk(b, c.sex, SOOT, { y0: -0.16, y1: 0.56, inflate: 0.016 });
    addShoulders(b, c.sex, SOOT, 0.02);
    robeSkirt(b, c.sex, { mat: SOOT, y0: 0.1, hem: -0.96, r1: [0.25, 0.22], tatter: 0.14, cols: 20, rows: 10 });
    // cassock buttons down the front
    const fr = [];
    for (let i = 0; i < 9; i++) {
      const y = lerp(0.52, 0.02, i / 8);
      fr.push({ p: new THREE.Vector3(0, y, trunkZ(c.sex, b.shoulder, 0, y, 1, 0.016)), n: new THREE.Vector3(0, 0, 1) });
    }
    b.add('hips', scatter(() => rivet(0.007), fr), M.bronze, { skin: trunkSkin });
    // iron collar and bronze bell-chains across the chest
    b.add('neck', torus(0.068, 0.012, 6, 18), M.iron, { p: [0, -0.01, 0.0], r: [0.12, 0, 0], skin: () => [['neck', 0.5], ['chest', 0.5]] });
    const z = (x: number, y: number) => trunkZ(c.sex, b.shoulder, x, y, 1, 0.03);
    drapeChain(b, 'hips', [[-0.13, 0.5, z(-0.13, 0.5)], [-0.05, 0.36, z(-0.05, 0.36)], [0.06, 0.34, z(0.06, 0.34)], [0.14, 0.48, z(0.14, 0.48)]], M.bronze, 0.026, trunkSkin);
    drapeChain(b, 'hips', [[-0.15, 0.3, z(-0.15, 0.3)], [0, 0.18, z(0, 0.18)], [0.15, 0.3, z(0.15, 0.3)]], M.bronze, 0.026, trunkSkin);
    for (const [x, y] of [[-0.05, 0.34], [0.06, 0.33], [0, 0.16]] as const) b.add('hips', xf(bellGeom(0.045), { p: [x, y, z(x, y) + 0.01] }), 'bronze_bell', { skin: trunkSkin });
    belt(b, c.sex, { y: 0.1, over: 0.04, mat: M.rope, pouches: 0, buckle: M.iron, strapEnd: false });
  },
  arms: (b, c) => {
    addArms(b, c.sex, SOOT, { inflate: 0.016 });
    bellSleeves(b, c.sex, { mat: SOOT, trim: null, flare: 0.09, len: 0.24 });
    addHands(b, 'bare', 'skin|t=8a7a70', 'skin|t=8a7a70');
    for (const s of [1, -1] as const) shackle(b, s > 0 ? 'forearmL' : 'forearmR', -0.235, 0.036);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, SOOT, { inflate: 0.01 });
    addFeet(b, c.sex, 'wrap');
  },
};

const GATEWARDEN: LookDef = {
  closedHelm: true,
  head: (b, c) => bascinet(b, { mat: M.steel, trim: M.bronze, visor: true, eyes: c.unlived }),
  body: (b, c) => {
    addTrunk(b, c.sex, M.black, { y0: -0.16, y1: 0.56, inflate: 0.012 });
    addShoulders(b, c.sex, M.black, 0.016);
    mailSkirt(b, c.sex, { y0: 0.12, y1: -0.34 });
    cuirass(b, c.sex, { mat: M.steel, trim: M.bronze, inflate: 0.036, keel: 0.1, dents: 3 });
    gorget(b, c.sex, { mat: M.steel, trim: M.bronze, high: true });
    fauld(b, c.sex, { mat: M.steel, trim: M.bronze, lames: 3 });
    tassets(b, { mat: M.steel, trim: M.bronze, len: 0.22, y: -0.1 });
    tabard(b, c.sex, { mat: ARMYRED, hem: -0.6, over: 0.06, w: [0.1, 0.13, 0.15], heraldry: 'army', split: true, tatter: 0.1, trim: M.gold });
    belt(b, c.sex, { y: 0.1, over: 0.07, pouches: 1, height: 0.05 });
    pauldrons(b, { mat: M.steel, trim: M.bronze, size: 1.2, lames: 4, style: 'tall' });
  },
  arms: (b, c) => {
    addArms(b, c.sex, M.black, { inflate: 0.012 });
    armPlates(b, c.sex, { mat: M.steel, trim: M.bronze });
    addHands(b, 'gauntlet', M.steel, M.steel);
  },
  legs: (b, c) => {
    addLegs(b, c.sex, M.black, { inflate: 0.012 });
    legPlates(b, c.sex, { mat: M.steel, trim: M.bronze });
    addFeet(b, c.sex, 'sabaton', M.leatherDark, M.steel);
  },
  cloak: { style: 'long', mat: ARMYRED, pad: 0.05 },
};

export const LOOKS: Record<ArmorLook, LookDef> = {
  none: NONE, retainer: RETAINER, court: COURT, oath: OATH, funeral: FUNERAL, huntsman: HUNTSMAN,
  condemned: CONDEMNED, commander: COMMANDER, greyford: GREYFORD, warden: WARDEN, hospice: HOSPICE,
  bellkeeper: BELLKEEPER, gatewarden: GATEWARDEN,
};

/** Build a full character look into a builder (used by the player and by humanoid enemies/NPCs). */
export function buildLook(b: CharBuilder, look: CharacterLookExt, o: { unlived?: boolean; variant?: number; cloak?: boolean } = {}) {
  const ctx: LookCtx = {
    sex: look.sex ?? 'm',
    hair: look.hair ?? 'dark',
    unlived: !!o.unlived,
    faceHidden: !!LOOKS[look.head].closedHelm,
    variant: o.variant ?? 0,
  };
  const head = LOOKS[look.head] ?? NONE;
  addNeck(b, ctx.sex, head.closedHelm ? M.black : 'skin');
  (LOOKS[look.body] ?? NONE).body(b, ctx);
  (LOOKS[look.arms] ?? NONE).arms(b, ctx);
  (LOOKS[look.legs] ?? NONE).legs(b, ctx);
  head.head(b, ctx);
  const wantCloak = o.cloak ?? look.cloak ?? false;
  const cdef = (LOOKS[look.body] ?? NONE).cloak;
  if (wantCloak) {
    const c = cdef ?? { style: 'long' as CloakStyle, mat: M.black, pad: 0.02 };
    cloak(b, c.style, { mat: c.mat, pad: c.pad, heraldry: c.heraldry, fur: c.fur });
  }
}

export { TAU, ellipsoid };
