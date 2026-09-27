/**
 * NPC looks: Oswin (hospice healer), Hesper (smith), Sergeant Brannoc (Unlived), the training
 * dummy, the condemned bellkeeper of the intro, and King Aldren's spectral memory.
 */
import * as THREE from 'three';
import type { Rig } from '../Rig';
import type { NpcLook } from './contract';
import { CharBuilder, trunkSkin, skirtSkin, type BuiltModel } from './builder';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet, quilted, ringAtY, trunkRings, forearmSkin, upperArmSkin } from './anatomy';
import {
  M, tabard, belt, bandolier, robeSkirt, mantle, kettleHelm, cuirass, mailSkirt, pauldrons, armPlates, legPlates, gorget,
  drapeChain, shackle, bellGeom, beads, trunkZ, cloak, bellSleeves,
} from './gear';
import { buildLook, LOOKS } from './character';
import { loft, sweep, xf, cyl, box, torus, ellipsoid, merge, panel, extrude, type G, type V3, lerp, TAU } from './parts';

const WOOL = 'cloth_brown|t=a08870';

export function buildNpc(rig: Rig, look: NpcLook): BuiltModel {
  const b = new CharBuilder(rig, 'npc', look.length * 31 + 5);
  switch (look) {
    case 'oswin': oswin(b); break;
    case 'hesper': hesper(b); break;
    case 'brannoc': brannoc(b); break;
    case 'dummy': dummy(b); break;
    case 'bellkeeper': bellkeeper(b); break;
    case 'aldren_memory': aldren(b); break;
  }
  return b.build();
}

/** Oswin Marrow: older, gentle healer in layered hospice robes with satchel and rosary. */
function oswin(b: CharBuilder) {
  addNeck(b, 'm', 'skin');
  addHead(b, { sex: 'm', old: true, style: 'balding', hair: 'grey', beard: 'short' });
  const c = { sex: 'm' as const, hair: 'grey' as const, unlived: false, faceHidden: false, variant: 0 };
  LOOKS.hospice.body(b, c);
  LOOKS.hospice.arms(b, c);
  LOOKS.hospice.legs(b, c);
  // hood lowered: a soft cowl bunched around the neck and shoulders
  b.add('neck', loft([{ y: 0.04, rx: 0.085, rz: 0.09, cz: -0.01 }, { y: -0.03, rx: 0.13, rz: 0.13, cz: -0.02 }, { y: -0.08, rx: 0.18, rz: 0.15, cz: -0.03 }], { segs: 18, radial: (th, v) => 1 + 0.07 * Math.sin(th * 6 + v * 3) }), WOOL, {
    skin: (p) => { const k = Math.min(1, Math.max(0, (0.03 - p.y) / 0.1)); return [['neck', 1 - k], ['chest', k]]; },
  });
  beads(b, 'hips', [0.11, 0.06, trunkZ('m', b.shoulder, 0.11, 0.06, 1, 0.07)], 0.05, 0.13, 'timber_dark', 'bronze_bell', trunkSkin);
  // herb bundle tucked in the belt
  b.add('hips', xf(merge([
    cyl(0.012, 0.018, -0.06, 0.06, 6),
    xf(ellipsoid(0.03, 0.04, 0.02, { segs: 8, rows: 5 }), { p: [0, 0.08, 0] }),
  ]), { p: [0.16, 0.05, 0.07], r: [0.2, 0, -0.3] }), 'moss', { skin: trunkSkin });
}

/** Hesper Vail: strong smith, braided hair, soot, linen shirt with rolled sleeves, leather apron. */
function hesper(b: CharBuilder) {
  const sex = 'f';
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'auburn', style: 'braid', soot: true });
  // shirt (open collar) and a fitted leather bodice under the apron
  addTrunk(b, sex, 'cloth_linen|t=c0b8a8', { y0: -0.16, y1: 0.54, inflate: 0.008 });
  addTrunk(b, sex, M.leatherDark, { y0: 0.02, y1: 0.36, inflate: 0.016 });
  addShoulders(b, sex, 'cloth_linen|t=c0b8a8', 0.01);
  // lacing on the bodice front
  const lz = (y: number) => trunkZ(sex, b.shoulder, 0, y, 1, 0.018);
  const lace: V3[] = [];
  for (let i = 0; i <= 8; i++) { const y = lerp(0.34, 0.06, i / 8); lace.push([(i % 2 ? 1 : -1) * 0.018, y, lz(y) + 0.003]); }
  b.add('hips', sweep(lace, { r: 0.0025, sides: 4, segs: 20, poly: true }), M.leather, { skin: trunkSkin });
  // leather apron: neck strap, bib and long skirt to below the knees
  tabard(b, sex, { mat: 'leather|t=b09080', top: 0.44, hem: -0.62, over: 0.03, w: [0.1, 0.16, 0.19], back: false, tatter: 0.03 });
  const ay = 0.44, az = trunkZ(sex, b.shoulder, 0.08, ay, 1, 0.03);
  for (const s of [1, -1]) b.add('hips', sweep([[s * 0.08, ay, az], [s * 0.075, 0.52, 0.03], [s * 0.05, 0.575, -0.04]], { w: 0.01, h: 0.003, up: [0, 0, 1], sides: 4, segs: 6 }), M.leather, { skin: trunkSkin });
  belt(b, sex, { y: 0.08, over: 0.045, pouches: 1, mat: M.leatherDark });
  // hammer hanging at the hip and gloves tucked in the belt
  const hz = trunkZ(sex, b.shoulder, -0.16, 0.0, 1, 0.05) - 0.02;
  b.add('hips', xf(merge([
    cyl(0.012, 0.013, -0.2, 0.08, 6),
    xf(box(0.05, 0.05, 0.13), { p: [0, 0.1, 0.01] }),
  ]), { p: [-0.175, -0.05, hz], r: [0.1, 0, 0.15] }), 'iron', { skin: (p) => [['hips', 0.6], ['thighR', 0.4 * Math.max(0, -p.y)]] });
  b.add('hips', xf(loft([{ y: 0.05, rx: 0.035, rz: 0.012, p: 3 }, { y: -0.08, rx: 0.045, rz: 0.012, p: 3 }], { segs: 10, capBottom: true }), { p: [0.13, 0.0, trunkZ(sex, b.shoulder, 0.13, 0.0, 1, 0.05)], r: [0, 0.5, 0.15] }), M.leather, { skin: trunkSkin });
  // arms: sleeves rolled above the elbow, bare strong forearms dusted with soot
  addArms(b, sex, 'cloth_linen|t=c0b8a8', { inflate: 0.012, fore: false });
  addArms(b, sex, 'skin', { upper: false });
  for (const side of [1, -1] as const) {
    const U = side > 0 ? 'upperArmL' : 'upperArmR';
    b.loft(U, [{ y: -0.14, rx: 0.056, rz: 0.058 }, { y: -0.17, rx: 0.062, rz: 0.064 }, { y: -0.2, rx: 0.058, rz: 0.06 }], 'cloth_linen|t=c0b8a8', { segs: 12, radial: (th) => 1 + 0.06 * Math.sin(th * 5) }, { skin: upperArmSkin(side) });
    const F = side > 0 ? 'forearmL' : 'forearmR';
    // soot on the forearms (a darker skin sleeve over the lower half)
    b.loft(F, [{ y: -0.12, rx: 0.036, rz: 0.032 }, { y: -0.2, rx: 0.031, rz: 0.026 }, { y: -0.27, rx: 0.029, rz: 0.024 }], 'skin|t=8a7a70', { segs: 12, inflate: 0.001 }, { skin: forearmSkin(side) });
    // leather wrist guard
    b.loft(F, [{ y: -0.2, rx: 0.033, rz: 0.028 }, { y: -0.26, rx: 0.032, rz: 0.027 }], M.leatherDark, { segs: 12, inflate: 0.004 }, { skin: forearmSkin(side) });
  }
  addHands(b, 'bare', 'skin|t=9a8a80');
  addLegs(b, sex, 'cloth_brown|t=6a5a4a', { inflate: 0.012 });
  addFeet(b, sex, 'boot', M.leatherDark);
}

/** Sergeant Brannoc: Unlived veteran of Greyford — open kettle helm pushed back, sergeant's sash. */
function brannoc(b: CharBuilder) {
  b.cracks = 0.6;
  const sex = 'm';
  addNeck(b, sex, 'skin_pale|t=b8b0a8');
  addHead(b, { sex, skin: 'skin_pale|t=b8b0a8', hair: 'grey', style: 'cropped', beard: 'full', unlived: true, old: true });
  kettleHelm(b, { mat: M.steelOld, dents: 5, brim: 0.07, tilt: 0.35 });
  addTrunk(b, sex, 'cloth_linen|t=6a645a', { y0: -0.16, y1: 0.56, inflate: 0.014, radial: quilted(24, 16, 0.035), crack: 1 });
  addShoulders(b, sex, 'cloth_linen|t=6a645a', 0.014);
  mailSkirt(b, sex, { y0: 0.12, y1: -0.32, crack: 1 });
  cuirass(b, sex, { mat: M.steelOld, trim: M.bronze, inflate: 0.03, dents: 5, crack: 1.4, keel: 0.05 });
  gorget(b, sex, { mat: M.steelOld, trim: null });
  tabard(b, sex, { mat: 'cloth_blue|t=a8b4c4', hem: -0.5, over: 0.045, w: [0.1, 0.14, 0.17], heraldry: 'army', split: true, tatter: 0.22 });
  // sergeant's red sash across the chest and a whistle on a cord
  bandolier(b, sex, { over: 0.055, mat: 'cloth_red|t=b07a70', width: 0.035 });
  belt(b, sex, { y: 0.1, over: 0.05, pouches: 2 });
  pauldrons(b, { mat: M.steelOld, trim: M.bronze, size: 1.0, lames: 2, crack: 1 });
  addArms(b, sex, M.mail, { inflate: 0.01, crack: 1 });
  armPlates(b, sex, { mat: M.steelOld, trim: null, rerebrace: false, crack: 1 });
  addHands(b, 'glove', M.leatherDark, M.leather);
  addLegs(b, sex, 'cloth_brown|t=6a6258', { inflate: 0.012, crack: 1 });
  legPlates(b, sex, { mat: M.steelOld, trim: null, cuisse: false, crack: 1 });
  addFeet(b, sex, 'boot');
}

/** Straw training dummy on a post (post on hips, sack body on spine/chest, sack head, crossbar arms). */
function dummy(b: CharBuilder) {
  const straw = 'grass_dead|t=d8c090';
  const sack = 'cloth_linen|t=a89878';
  // post from the ground through the body and a crossed foot
  b.add('hips', cyl(0.05, 0.045, -0.98, 0.72, 8), 'timber', { skin: (p) => (p.y > 0.1 ? [['chest', 1]] : [['hips', 1]]) });
  b.add('hips', xf(box(0.7, 0.07, 0.1), { p: [0, -0.945, 0] }), 'timber_dark');
  b.add('hips', xf(box(0.1, 0.07, 0.7), { p: [0, -0.945, 0] }), 'timber_dark');
  for (const s of [1, -1]) b.add('hips', xf(box(0.06, 0.3, 0.06), { p: [s * 0.12, -0.84, 0], r: [0, 0, s * 0.7] }), 'timber_dark');
  // stuffed sack body bound with rope
  const body = [
    { y: 0.56, rx: 0.07, rz: 0.06 }, { y: 0.5, rx: 0.17, rz: 0.12 }, { y: 0.35, rx: 0.19, rz: 0.14 }, { y: 0.15, rx: 0.17, rz: 0.13 }, { y: 0.0, rx: 0.16, rz: 0.13 }, { y: -0.12, rx: 0.13, rz: 0.11 }, { y: -0.16, rx: 0.05, rz: 0.05 },
  ];
  b.loft('hips', body, sack, { segs: 18, radial: (th, v) => 1 + 0.05 * Math.sin(th * 5 + v * 9) + 0.03 * Math.sin(v * 40) }, { skin: trunkSkin });
  for (const y of [0.42, 0.22, 0.02]) {
    const r = ringAtY(body, y);
    b.loft('hips', [{ y: y + 0.012, rx: r.rx + 0.006, rz: (r.rz ?? r.rx) + 0.006 }, { y: y - 0.012, rx: r.rx + 0.006, rz: (r.rz ?? r.rx) + 0.006 }], M.rope, { segs: 16 }, { skin: trunkSkin });
  }
  // straw tufts poking out at the seams and bottom
  const tufts: G[] = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU * 3.3;
    const y = [0.5, -0.13, 0.42, 0.02][i % 4];
    const r = ringAtY(body, y);
    const d = new THREE.Vector3(Math.sin(a), (i % 4 === 1 ? -1.2 : 0.2) + Math.sin(i) * 0.3, Math.cos(a)).normalize();
    const g = loft([{ y: 0.07, rx: 0.001 }, { y: 0, rx: 0.006 }], { segs: 3, capBottom: true });
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
    g.translate(Math.sin(a) * r.rx * 0.95, y, Math.cos(a) * (r.rz ?? r.rx) * 0.95);
    tufts.push(g);
  }
  b.add('hips', merge(tufts), straw, { skin: trunkSkin });
  // crossbar arms with straw bundles
  b.add('chest', xf(cyl(0.035, 0.035, -0.46, 0.46, 8), { r: [0, 0, Math.PI / 2] }), 'timber', { p: [0, 0.14, 0] });
  for (const s of [1, -1]) {
    b.loft('chest', [{ y: 0.05, rx: 0.06, rz: 0.055 }, { y: -0.14, rx: 0.07, rz: 0.06 }, { y: -0.26, rx: 0.045, rz: 0.04 }], sack, { segs: 10, radial: (th, v) => 1 + 0.08 * Math.sin(th * 4 + v * 7) }, { p: [s * 0.36, 0.14, 0] });
    b.add('chest', xf(torus(0.063, 0.008, 4, 12), { p: [s * 0.36, 0.1, 0] }), M.rope);
  }
  // sack head with a painted target cross and a rope tie
  b.add('head', xf(ellipsoid(0.1, 0.12, 0.095, { segs: 14, rows: 8, radial: (th, v) => 1 + 0.04 * Math.sin(th * 3 + v * 6) }), { p: [0, 0.06, 0] }), sack);
  b.add('head', xf(torus(0.055, 0.008, 4, 12), { p: [0, -0.05, 0] }), M.rope);
  b.add('head', xf(box(0.09, 0.012, 0.004), { p: [0, 0.07, 0.094], r: [0, 0, 0.8] }), 'cloth_red|t=a07070');
  b.add('head', xf(box(0.09, 0.012, 0.004), { p: [0, 0.07, 0.094], r: [0, 0, -0.8] }), 'cloth_red|t=a07070');
  b.add('head', xf(loft([{ y: 0.03, rx: 0.001 }, { y: 0, rx: 0.02 }], { segs: 6, capBottom: true }), { p: [0, 0.17, 0] }), straw);
  // old breastplate nailed on as a target
  b.add('hips', xf(loft([{ y: 0.46, rx: 0.14, rz: 0.1 }, { y: 0.2, rx: 0.15, rz: 0.11 }], { segs: 14, phi0: -1.2, phiLen: 2.4 }), { p: [0, 0, 0.04] }), M.steelOld, { skin: trunkSkin });
}

/** The condemned bellkeeper: soot-black vestments, iron collar, bells on chains, shackled wrists. */
function bellkeeper(b: CharBuilder) {
  buildLook(b, { head: 'bellkeeper', body: 'bellkeeper', arms: 'bellkeeper', legs: 'bellkeeper', cloak: false }, {});
  // chain between the wrists and a heavy bell hanging from the collar
  drapeChain(b, 'forearmL', [[0.0, -0.235, 0.04], [-0.05, -0.33, 0.12], [-0.2, -0.36, 0.14], [-0.38, -0.235, 0.04]], M.iron, 0.03, (p) => {
    const t = Math.min(1, Math.max(0, -p.x / 0.38));
    return [['forearmL', 1 - t], ['forearmR', t]];
  });
  b.add('neck', xf(bellGeom(0.11), { p: [0, -0.06, 0.13] }), 'bronze_bell', { skin: () => [['chest', 1]] });
  drapeChain(b, 'neck', [[-0.05, -0.02, 0.07], [0, -0.06, 0.13], [0.05, -0.02, 0.07]], M.iron, 0.02, () => [['chest', 1]]);
  cloak(b, 'shroud', { mat: 'cloth_black|t=6a6460', pad: 0.03 });
}

/** King Aldren's memory: tall spectral king in a long royal robe, ermine mantle and crown. */
function aldren(b: CharBuilder) {
  b.ghost = { color: new THREE.Color(1.0, 0.82, 0.5), min: 0.1 };
  const sex = 'm';
  addNeck(b, sex, 'skin_pale');
  addHead(b, { sex, skin: 'skin_pale', hair: 'grey', style: 'long', beard: 'full', old: true });
  // crown
  const pts: G[] = [loft([{ y: 0.2, rx: 0.088, rz: 0.1, cz: 0.006 }, { y: 0.16, rx: 0.086, rz: 0.098, cz: 0.006 }], { segs: 20 })];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const h = i % 2 ? 0.05 : 0.085;
    const g = loft([{ y: h, rx: 0.002, rz: 0.001 }, { y: 0, rx: 0.018, rz: 0.004 }], { segs: 4, capBottom: true });
    g.rotateY(a);
    g.translate(Math.sin(a) * 0.089, 0.195, Math.cos(a) * 0.101 + 0.006);
    pts.push(g);
  }
  b.add('head', merge(pts), M.gold);
  addTrunk(b, sex, 'cloth_red|t=8a6a80', { y0: -0.16, y1: 0.56, inflate: 0.02 });
  addShoulders(b, sex, 'cloth_red|t=8a6a80', 0.02);
  robeSkirt(b, sex, { mat: 'cloth_red|t=8a6a80', y0: 0.1, hem: -0.98, r1: [0.3, 0.27], tatter: 0.04, trim: M.gold, emb: true, cols: 22, rows: 11 });
  mantle(b, sex, { mat: 'cloth_linen|t=e8e0d0', len: 0.34, r1: 0.3, trim: M.gold, emb: true, tatter: 0.02 });
  belt(b, sex, { y: 0.1, over: 0.04, pouches: 0, mat: M.gold, buckle: M.gold, strapEnd: false });
  addArms(b, sex, 'cloth_red|t=8a6a80', { inflate: 0.016, foreY1: -0.12 });
  bellSleeves(b, sex, { mat: 'cloth_red|t=8a6a80', trim: M.gold, emb: true, flare: 0.1, len: 0.28 });
  addHands(b, 'bare', 'skin_pale');
  addLegs(b, sex, 'cloth_black', { inflate: 0.01 });
  addFeet(b, sex, 'boot', M.leatherDark);
  cloak(b, 'heavy', { mat: 'cloth_red|t=7a5a70', pad: 0.03, heraldry: true, fur: true });
}

export { panel, extrude, skirtSkin, shackle, mailSkirt, legPlates, addTrunk };
