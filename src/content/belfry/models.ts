/**
 * Belfry looks and weapons (registered through the model factory's extension points).
 *
 *  Aldren (three reigns, one rig; phase 3 is additionally scaled up by the boss controller):
 *   - aldren_young:    the Young Conqueror — bare-headed fair young king in bronze-trimmed plate,
 *                      royal tabard and heavy heraldic cloak, a thin gold circlet.
 *   - aldren_sorcerer: the Sorcerer-King — long bell-embroidered robes, a crown hung with small
 *                      bells and a halo of bells on a frame behind the head.
 *   - aldren_ancient:  the Ancient King — gaunt, grey, armour split by gold light and grown into a
 *                      bell-frame (posts rise from the pauldrons, a great bell hangs behind him).
 *  Enemies: bellWarden (bell-helmed heavy), keeperEcho (spectral soldier of one of the five
 *  institutions, chosen by seed), bellRinger (veiled hooded acolyte), bellkeeperBoss.
 *  NPC: councillor (spectral member of the council of the coronation that never happened).
 *  Weapons: aldren_lance (lance-sword), aldren_maul (bell maul), warden_bellhammer.
 */
import * as THREE from 'three';
import { registerEnemyLook, registerNpcLook, registerWeaponModel, CharBuilder } from '../../actors/models';
import type { WeaponModelExt } from '../../actors/models';
import type { Rig } from '../../actors/Rig';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet } from '../../actors/models/anatomy';
import {
  M, cuirass, gorget, fauld, tassets, tabard, belt, robeSkirt, bellSleeves, mantle, pauldrons, armPlates, legPlates,
  bellGeom, drapeChain, cloak, trunkZ, beads, hood, veil, mailSkirt,
} from '../../actors/models/gear';
import { buildLook, LOOKS, type LookCtx } from '../../actors/models/character';
import { loft, sweep, xf, cyl, torus, merge, box, triCount, norm, type G, TAU } from '../../actors/models/parts';
import { trunkSkin } from '../../actors/models/builder';
import { weaponMaterial } from '../../actors/models/charMaterials';

const ROYAL = 'cloth_red|t=7a2a34';
const ROYAL_DARK = 'cloth_red|t=4a1a22';
const PLATE = 'steel_armor|t=8a8680';
const GILT = M.gold;

// ------------------------------------------------------------------ shared bits

/** Thin circlet (head space) with small points; `bells` hangs tiny bells from it. */
function crown(b: CharBuilder, o: { y?: number; r?: number; points?: number; tall?: number; bells?: boolean; mat?: string } = {}) {
  const y = o.y ?? 0.17, r = o.r ?? 0.092, n = o.points ?? 8, tall = o.tall ?? 0.05;
  const parts: G[] = [loft([{ y: y + 0.025, rx: r, rz: r * 1.13, cz: 0.006 }, { y, rx: r * 1.01, rz: r * 1.14, cz: 0.006 }], { segs: 24 })];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const h = i % 2 ? tall * 0.55 : tall;
    const g = loft([{ y: h, rx: 0.002, rz: 0.001 }, { y: 0, rx: 0.016, rz: 0.004 }], { segs: 4, capBottom: true });
    g.rotateY(a);
    g.translate(Math.sin(a) * r * 1.01, y + 0.022, Math.cos(a) * r * 1.14 + 0.006);
    parts.push(g);
  }
  b.add('head', merge(parts), o.mat ?? GILT);
  if (o.bells) {
    const bl: G[] = [];
    for (let i = 0; i < 7; i++) {
      const a = ((i + 0.5) / 7) * TAU;
      bl.push(xf(bellGeom(0.028), { p: [Math.sin(a) * r * 1.05, y - 0.002, Math.cos(a) * r * 1.18 + 0.006] }));
    }
    b.add('head', merge(bl), 'bronze_bell');
  }
}

/** A bell frame on the back (chest space): two posts, crossbeam and a hanging bell. */
function bellFrame(b: CharBuilder, o: { h: number; w: number; bell: number; mat?: string; z?: number; glow?: boolean }) {
  const skin = () => [['chest', 1]] as [import('../../actors/rigDefs').BoneName, number][];
  const z = o.z ?? -0.2;
  const mat = o.mat ?? 'timber_dark';
  const posts: G[] = [];
  for (const s of [1, -1]) {
    posts.push(xf(cyl(0.022, 0.028, 0, o.h, 6), { p: [s * o.w, 0.1, z], r: [0.06, 0, -s * 0.08] }));
  }
  posts.push(xf(box(o.w * 2 + 0.12, 0.05, 0.06), { p: [0, 0.1 + o.h, z - 0.02] }));
  b.add('chest', merge(posts), mat, { skin });
  b.add('chest', xf(bellGeom(o.bell), { p: [0, 0.08 + o.h, z - 0.02] }), 'bronze_bell', { skin });
  if (o.glow) b.add('chest', xf(sweep([[0, o.h + 0.05, z + 0.02], [0.02, o.h - o.bell * 0.4, z + 0.03], [-0.01, o.h - o.bell * 0.8, z + 0.04]], { r: 0.004, sides: 4, segs: 6 }), {}), M.crack, { skin });
  // iron straps binding the posts to the back plate
  for (const s of [1, -1]) b.add('chest', xf(torus(0.03, 0.006, 5, 12), { p: [s * o.w, 0.12, z + 0.02], r: [Math.PI / 2, 0, 0] }), M.iron, { skin });
}

const ctx = (unlived = false, variant = 0): LookCtx => ({ sex: 'm', hair: 'dark', unlived, faceHidden: false, variant });

// ------------------------------------------------------------------ Aldren

/** Phase 1: the Young Conqueror. */
function aldrenYoung(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'boss', seed * 31 + 7);
  const c = ctx();
  addNeck(b, 'm', 'skin');
  addHead(b, { sex: 'm', hair: 'fair', style: 'long', beard: 'none' });
  crown(b, { y: 0.165, points: 6, tall: 0.03 });
  LOOKS.commander.body(b, c);
  LOOKS.commander.arms(b, c);
  LOOKS.commander.legs(b, c);
  tabard(b, 'm', { mat: ROYAL, hem: -0.56, over: 0.06, w: [0.12, 0.15, 0.19], heraldry: 'arms', split: true, tatter: 0.02, back: true, trim: GILT });
  belt(b, 'm', { y: 0.1, over: 0.07, mat: M.leatherDark, buckle: GILT, pouches: 0 });
  cloak(b, 'heavy', { mat: ROYAL_DARK, pad: 0.06, heraldry: true, fur: true });
  return b.build();
}

/** Phase 2: the Sorcerer-King in bell-crowned robes. */
function aldrenSorcerer(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'boss', seed * 37 + 11);
  b.cracks = 0.25;
  const sex = 'm';
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'dark', style: 'long', beard: 'short' });
  crown(b, { y: 0.17, points: 10, tall: 0.07, bells: true });
  addTrunk(b, sex, 'cloth_black', { y0: -0.16, y1: 0.56, inflate: 0.02 });
  addShoulders(b, sex, 'cloth_black', 0.02);
  cuirass(b, sex, { mat: 'gold_trim|t=8a7650', trim: null, y0: 0.18, y1: 0.52, inflate: 0.035, keel: 0.03 });
  robeSkirt(b, sex, { mat: ROYAL, y0: 0.12, hem: -1.0, r1: [0.34, 0.3], tatter: 0.03, trim: GILT, emb: true, cols: 24, rows: 12 });
  mantle(b, sex, { mat: 'cloth_linen|t=d8ccb0', len: 0.38, r1: 0.32, trim: GILT, emb: true, tatter: 0.02 });
  belt(b, sex, { y: 0.1, over: 0.045, pouches: 0, mat: GILT, buckle: GILT, strapEnd: false });
  addArms(b, sex, ROYAL, { inflate: 0.018, foreY1: -0.12 });
  bellSleeves(b, sex, { mat: ROYAL, trim: GILT, emb: true, flare: 0.14, len: 0.32 });
  addHands(b, 'gauntlet', GILT, M.leatherDark);
  addLegs(b, sex, 'cloth_black', { inflate: 0.01 });
  addFeet(b, sex, 'sabaton', M.leatherDark, GILT);
  // a halo of bells on a thin gilt ring behind the head
  const skin = () => [['chest', 1]] as [import('../../actors/rigDefs').BoneName, number][];
  b.add('chest', xf(torus(0.24, 0.008, 5, 36), { p: [0, 0.52, -0.18] }), GILT, { skin });
  const bells: G[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    bells.push(xf(bellGeom(0.05), { p: [Math.cos(a) * 0.24, 0.52 + Math.sin(a) * 0.24, -0.18] }));
  }
  b.add('chest', merge(bells), 'bronze_bell', { skin });
  b.add('chest', xf(cyl(0.01, 0.012, 0.0, 0.3, 6), { p: [0, 0.22, -0.18] }), GILT, { skin });
  beads(b, 'hips', [0.1, 0.06, trunkZ(sex, b.shoulder, 0.1, 0.06, 1, 0.08)], 0.06, 0.16, GILT, 'bronze_bell', trunkSkin);
  return b.build();
}

/** Phase 3: the Ancient King, armour grown into the bell-frame. */
function aldrenAncient(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'boss', seed * 41 + 13);
  b.cracks = 1.3;
  const sex = 'm';
  addNeck(b, sex, 'skin_pale|t=b8b0a0');
  addHead(b, { sex, skin: 'skin_pale|t=b8b0a0', hair: 'grey', style: 'long', beard: 'full', old: true, unlived: true });
  crown(b, { y: 0.17, points: 12, tall: 0.1, mat: 'gold_trim|t=8a7a58' });
  const c = ctx(true, seed);
  LOOKS.commander.body(b, c);
  LOOKS.commander.arms(b, c);
  LOOKS.commander.legs(b, c);
  pauldrons(b, { mat: 'gold_trim|t=6a5c44', trim: M.bronze, size: 1.35, lames: 4, style: 'bell', crack: 1.5 });
  tabard(b, sex, { mat: ROYAL_DARK, hem: -0.7, over: 0.08, w: [0.13, 0.16, 0.21], heraldry: 'armsWorn', split: true, tatter: 0.4, back: true });
  cloak(b, 'rag', { mat: 'cloth_red|t=3a2226', pad: 0.08 });
  bellFrame(b, { h: 0.95, w: 0.2, bell: 0.34, mat: 'gold_trim|t=5a4c38', z: -0.24, glow: true });
  // gold-lit seams across the breastplate
  for (const [x, y] of [[0.06, 0.45], [-0.08, 0.34], [0.03, 0.22], [-0.02, 0.5]] as const) {
    const z = trunkZ('m', b.shoulder, x, y, 1, 0.085);
    b.add('hips', sweep([[x - 0.05, y + 0.03, z], [x, y, z + 0.004], [x + 0.04, y - 0.05, z - 0.004]], { r: 0.005, sides: 4, segs: 6 }), M.crack, { skin: trunkSkin });
  }
  return b.build();
}

// ------------------------------------------------------------------ enemies

/** Bell-Warden: towering bell-helmed heavy in gilded old plate. */
function bellWarden(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 29);
  b.cracks = 1.1;
  const sex = 'm';
  addNeck(b, sex, M.black);
  addTrunk(b, sex, 'cloth_linen|t=6a645a', { y0: -0.16, y1: 0.56, inflate: 0.016, crack: 1 });
  addShoulders(b, sex, 'cloth_linen|t=6a645a', 0.016);
  mailSkirt(b, sex, { y0: 0.12, y1: -0.4, crack: 1 });
  cuirass(b, sex, { mat: 'gold_trim|t=5e5040', trim: M.bronze, inflate: 0.04, dents: 6, crack: 1.6, keel: 0.05 });
  gorget(b, sex, { mat: M.steelOld, trim: M.bronze, high: true });
  fauld(b, sex, { mat: M.steelOld, trim: M.bronze, lames: 4, crack: 1 });
  tassets(b, { mat: M.steelOld, trim: M.bronze, len: 0.3, y: -0.1 });
  pauldrons(b, { mat: 'gold_trim|t=5e5040', trim: M.bronze, size: 1.3, lames: 3, style: 'bell', crack: 1.3 });
  addArms(b, sex, M.mail, { inflate: 0.012, crack: 1 });
  armPlates(b, sex, { mat: M.steelOld, trim: M.bronze, rerebrace: true, crack: 1 });
  addHands(b, 'gauntlet', M.steelOld, M.leather);
  addLegs(b, sex, 'cloth_brown|t=5a5248', { inflate: 0.014, crack: 1 });
  legPlates(b, sex, { mat: M.steelOld, trim: M.bronze, cuisse: true, crack: 1 });
  addFeet(b, sex, 'sabaton', M.leatherDark, M.steelOld);
  tabard(b, sex, { mat: 'cloth_linen|t=8a7a5a', hem: -0.62, over: 0.07, w: [0.1, 0.13, 0.16], heraldry: null, tatter: 0.35, back: true, split: true });
  // the bell helm: a bronze bell over the head, a glowing slit where the eyes are
  const k = 0.36;
  b.add('head', xf(bellGeom(k), { p: [0, 0.3, 0.01] }), 'bronze_bell|t=7a6a50');
  b.add('head', box(0.13, 0.012, 0.02, [0, 0.07, 0.18]), M.crack);
  b.add('head', xf(torus(0.2, 0.012, 5, 28), { p: [0, -0.05, 0.01], r: [Math.PI / 2, 0, 0] }), M.bronze);
  b.add('head', xf(torus(0.03, 0.007, 5, 12), { p: [0, 0.31, 0.01] }), M.iron);
  return b.build();
}

const ECHO_SETS = ['gatewarden', 'court', 'funeral', 'warden', 'retainer'] as const;
/** Keeper's echo: a spectral soldier of one of the five institutions (seed picks which). */
function keeperEcho(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 104729 + 31);
  b.cracks = 0.5;
  b.ghost = { color: new THREE.Color(0.55, 0.66, 0.9), min: 0.16 };
  const set = ECHO_SETS[Math.abs(seed) % ECHO_SETS.length];
  buildLook(b, { head: set, body: set, arms: set, legs: set, cloak: set === 'court' || set === 'retainer' }, { unlived: true, variant: seed });
  return b.build();
}

/** Bell-ringer: tall veiled acolyte in vestments with bell sleeves and a sash of bells. */
function bellRinger(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 613 + 17);
  b.cracks = 0.7;
  const sex = 'm';
  addNeck(b, sex, 'skin_pale');
  addHead(b, { sex, skin: 'skin_pale', hair: 'none', style: 'none', beard: 'none', unlived: true, shade: 0.8 });
  hood(b, { mat: 'cloth_black|t=3a3440', trim: GILT, depth: 1.5, tip: 0.12, open: 0.7 });
  veil(b, { mat: 'cloth_linen|t=b0a898', face: true, y: 0.12, r: 0.12 });
  addTrunk(b, sex, 'cloth_black|t=3a3440', { y0: -0.16, y1: 0.56, inflate: 0.018 });
  addShoulders(b, sex, 'cloth_black|t=3a3440', 0.018);
  robeSkirt(b, sex, { mat: 'cloth_black|t=3a3440', y0: 0.1, hem: -1.02, r1: [0.3, 0.26], tatter: 0.3, trim: GILT, cols: 20, rows: 11 });
  mantle(b, sex, { mat: 'cloth_linen|t=8a8070', len: 0.3, tatter: 0.2, trim: null });
  addArms(b, sex, 'cloth_black|t=3a3440', { inflate: 0.016, foreY1: -0.12 });
  bellSleeves(b, sex, { mat: 'cloth_black|t=3a3440', trim: GILT, flare: 0.16, len: 0.34 });
  addHands(b, 'bare', 'skin_pale');
  addLegs(b, sex, 'cloth_black', { inflate: 0.01 });
  addFeet(b, sex, 'wrap');
  belt(b, sex, { y: 0.1, over: 0.05, mat: 'rope', pouches: 0, buckle: M.bronze });
  // sash of small bells across the chest
  const bells: G[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6, x = 0.16 - t * 0.3, y = 0.46 - t * 0.36;
    bells.push(xf(bellGeom(0.035), { p: [x, y, trunkZ(sex, b.shoulder, x, y, 1, 0.06) + 0.01] }));
  }
  b.add('hips', merge(bells), 'bronze_bell', { skin: trunkSkin });
  return b.build();
}

/** The Condemned Bellkeeper (boss): soot vestments, iron collar, chains, a bell at the throat. */
function bellkeeperBoss(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'boss', seed * 97 + 5);
  b.cracks = 0.55;
  buildLook(b, { head: 'bellkeeper', body: 'bellkeeper', arms: 'bellkeeper', legs: 'bellkeeper', cloak: false }, { unlived: true });
  drapeChain(b, 'forearmL', [[0.0, -0.235, 0.04], [-0.05, -0.33, 0.12], [-0.2, -0.36, 0.14], [-0.38, -0.235, 0.04]], M.iron, 0.03, (p) => {
    const t = Math.min(1, Math.max(0, -p.x / 0.38));
    return [['forearmL', 1 - t], ['forearmR', t]];
  });
  b.add('neck', xf(bellGeom(0.14), { p: [0, -0.06, 0.14] }), 'bronze_bell', { skin: () => [['chest', 1]] });
  drapeChain(b, 'neck', [[-0.05, -0.02, 0.07], [0, -0.06, 0.14], [0.05, -0.02, 0.07]], M.iron, 0.02, () => [['chest', 1]]);
  // small bells chained along the back like a penitent's yoke
  bellFrame(b, { h: 0.5, w: 0.16, bell: 0.16, mat: M.iron, z: -0.2 });
  cloak(b, 'shroud', { mat: 'cloth_black|t=5a5450', pad: 0.03 });
  return b.build();
}

/** A councillor of the coronation that never happened: spectral robes, chain of office. */
function councillor(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'npc', seed * 17 + 3);
  b.ghost = { color: new THREE.Color(0.9, 0.86, 0.72), min: 0.12 };
  const sex = seed % 3 === 1 ? 'f' : 'm';
  addNeck(b, sex, 'skin_pale');
  addHead(b, { sex, skin: 'skin_pale', hair: seed % 2 ? 'grey' : 'dark', style: sex === 'f' ? 'braid' : 'short', beard: sex === 'm' && seed % 2 ? 'short' : 'none', old: seed % 2 === 1 });
  addTrunk(b, sex, 'cloth_blue|t=6a7088', { y0: -0.16, y1: 0.56, inflate: 0.02 });
  addShoulders(b, sex, 'cloth_blue|t=6a7088', 0.02);
  robeSkirt(b, sex, { mat: 'cloth_blue|t=6a7088', y0: 0.1, hem: -0.98, r1: [0.29, 0.26], tatter: 0.02, trim: GILT, cols: 20, rows: 10 });
  mantle(b, sex, { mat: 'cloth_linen|t=d8d0c0', len: 0.3, trim: GILT, tatter: 0.0 });
  addArms(b, sex, 'cloth_blue|t=6a7088', { inflate: 0.014, foreY1: -0.12 });
  bellSleeves(b, sex, { mat: 'cloth_blue|t=6a7088', trim: GILT, flare: 0.1, len: 0.26 });
  addHands(b, 'relaxed', 'skin_pale');
  addLegs(b, sex, 'cloth_black', { inflate: 0.01 });
  addFeet(b, sex, 'boot', M.leatherDark);
  beads(b, 'hips', [0, 0.4, trunkZ(sex, b.shoulder, 0, 0.4, 1, 0.07)], 0.14, 0.12, GILT, GILT, trunkSkin);
  return b.build();
}

// ------------------------------------------------------------------ weapons

class WB {
  private parts = new Map<string, G[]>();
  add(key: string, g: G, t?: Parameters<typeof xf>[1]) {
    norm(g);
    if (t) xf(g, t);
    let l = this.parts.get(key);
    if (!l) this.parts.set(key, (l = []));
    l.push(g);
    return this;
  }
  finish(name: string, m: Omit<WeaponModelExt, 'object'>): WeaponModelExt {
    const group = new THREE.Group();
    group.name = `weapon:${name}`;
    let tris = 0;
    for (const [key, list] of this.parts) {
      const g = merge(list);
      g.computeBoundingSphere();
      tris += triCount(g);
      const mesh = new THREE.Mesh(g, weaponMaterial(key));
      mesh.name = key;
      mesh.castShadow = key !== M.crack;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return { object: group, ...m, triangles: tris };
  }
}

/** Diamond-section blade along +Y. */
function lanceBlade(y0: number, y1: number, w0: number, w1: number, t0: number, tip: number): G {
  const rings = [] as { y: number; rx: number; rz: number; p: number }[];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = y0 + (y1 - y0) * t;
    rings.push({ y, rx: t0 * (1 - t * 0.5), rz: w0 + (w1 - w0) * t, p: 1.2 });
  }
  rings.push({ y: y1 + tip, rx: 0.0015, rz: 0.002, p: 1.2 });
  return loft(rings, { segs: 8, capBottom: true });
}

registerWeaponModel('aldren_lance', () => {
  const wb = new WB();
  wb.add('steel_bright|t=c8c4bc', lanceBlade(0.22, 1.62, 0.045, 0.022, 0.012, 0.26));
  wb.add('gold_trim|a=emb|po', xf(box(0.004, 0.9, 0.02), { p: [0.0125, 0.8, 0] }));
  wb.add('gold_trim|a=emb|po', xf(box(0.004, 0.9, 0.02), { p: [-0.0125, 0.8, 0] }));
  // vamplate: a lance's conical hand-guard
  wb.add('bronze', loft([{ y: 0.22, rx: 0.03 }, { y: 0.16, rx: 0.07 }, { y: 0.1, rx: 0.13 }, { y: 0.085, rx: 0.13 }], { segs: 16, capBottom: true }));
  wb.add('gold_trim', xf(torus(0.13, 0.008, 5, 20), { p: [0, 0.09, 0], r: [Math.PI / 2, 0, 0] }));
  wb.add('leather_dark', loft([{ y: 0.08, rx: 0.02 }, { y: -0.32, rx: 0.021 }], { segs: 8, radial: (th, v) => 1 + 0.08 * Math.abs(Math.sin(v * 40 + th)) }));
  wb.add('bronze_bell', xf(bellGeom(0.07), { p: [0, -0.33, 0], r: [Math.PI, 0, 0] }));
  return wb.finish('aldren_lance', { hit: { from: 0.24, to: 1.85, radius: 0.05 }, trail: { from: 0.4, to: 1.85 }, offhandGrip: -0.22 });
});

registerWeaponModel('aldren_maul', () => {
  const wb = new WB();
  wb.add('gold_trim|t=5a4c38', cyl(0.028, 0.034, -0.55, 1.2, 8));
  for (const y of [-0.5, 0.0, 0.5, 1.0]) wb.add('iron', xf(torus(0.036, 0.008, 5, 10), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }));
  wb.add('leather_dark', cyl(0.036, 0.036, -0.45, -0.05, 8));
  // the head: a bell whose lip is the striking face (mouth toward +Z)
  wb.add('bronze_bell|t=8a7250', xf(bellGeom(0.52), { p: [0, 1.38, -0.18], r: [Math.PI / 2, 0, 0] }));
  wb.add('iron', xf(box(0.12, 0.16, 0.2), { p: [0, 1.38, -0.2] }));
  wb.add(M.crack, xf(box(0.01, 0.4, 0.01), { p: [0.12, 1.38, 0.1], r: [0.3, 0, 0.2] }));
  return wb.finish('aldren_maul', { hit: { from: 1.12, to: 1.66, radius: 0.3 }, trail: { from: 1.1, to: 1.7 }, offhandGrip: -0.4 });
});

registerWeaponModel('warden_bellhammer', () => {
  const wb = new WB();
  wb.add('timber_dark', cyl(0.024, 0.028, -0.4, 0.95, 8));
  for (const y of [-0.35, 0.45, 0.9]) wb.add('iron', xf(torus(0.03, 0.007, 5, 10), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }));
  wb.add('bronze_bell|t=7a6a50', xf(bellGeom(0.34), { p: [0, 1.08, -0.12], r: [Math.PI / 2, 0, 0] }));
  wb.add('iron', xf(box(0.08, 0.1, 0.14), { p: [0, 1.08, -0.13] }));
  return wb.finish('warden_bellhammer', { hit: { from: 0.9, to: 1.28, radius: 0.22 }, trail: { from: 0.9, to: 1.3 }, offhandGrip: -0.3 });
});

// ------------------------------------------------------------------ registration

registerEnemyLook('aldren_young', aldrenYoung);
registerEnemyLook('aldren_sorcerer', aldrenSorcerer);
registerEnemyLook('aldren_ancient', aldrenAncient);
registerEnemyLook('bellWarden', bellWarden);
registerEnemyLook('keeperEcho', keeperEcho);
registerEnemyLook('bellRinger', bellRinger);
registerEnemyLook('bellkeeperBoss', bellkeeperBoss);
registerNpcLook('councillor', councillor);

