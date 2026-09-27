/**
 * Garden Court looks (registered with the model factory) and weapons.
 *
 * Household enemies are the retinues of successions that never happened: royal service gear, still
 * fine, split by the Unlived gold. Silhouettes are distinct at gameplay distance:
 *  - Elite Retainer: blackened plate, royal tabard, visored bascinet with a tall red crest, cloak.
 *  - Court Duellist: slim, long coat, wide feathered hat, half-cape on one shoulder, rapier.
 *  - Gardener: broad, apron and straw hat, giant hedge shears.
 *  - Masked Courtier: long gilt robes, bell sleeves, a golden mask and a tall hat.
 *  - Succession Ghost: a translucent crowned heir (spectral gold).
 * Bosses: Dame Celwyn Ardent (three phase looks), the Twin Heirs (Casimir, Heir by Law; Corisande,
 * Heir by Blood; each with an enraged look). NPCs: the page Wynn Harrow, the Greyford muster soldier.
 */
import * as THREE from 'three';
import type { Rig } from '../../actors/Rig';
import { registerEnemyLook, registerNpcLook, registerWeaponModel, CharBuilder, type WeaponModelExt } from '../../actors/models';
import { buildEnemy } from '../../actors/models/enemies';
import { LOOKS, type LookCtx } from '../../actors/models/character';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet, quilted } from '../../actors/models/anatomy';
import {
  M, cuirass, gorget, tabard, belt, bandolier, robeSkirt, mantle, pauldrons, armPlates, legPlates, bracers, bascinet, crest, wideHat,
  bellSleeves, cloak, trunkZ, bellGeom, hood,
} from '../../actors/models/gear';
import { trunkSkin } from '../../actors/models/builder';
import { weaponMaterial } from '../../actors/models/charMaterials';
import { loft, ellipsoid, sweep, cyl, torus, merge, xf, type G } from '../../actors/models/parts';
import { Rng } from '../../core/rng';

const PALE = 'skin_pale|t=b8b0a8';
const BLACK_PLATE = 'steel_armor|t=6a6a72';
const ROYAL_RED = 'cloth_red|t=8a5a58';
const ROYAL_BLUE = 'cloth_blue|t=8a96b0';

const ctx = (sex: 'm' | 'f', unlived: boolean, variant: number, hair: LookCtx['hair'] = 'dark'): LookCtx => ({ sex, hair, unlived, faceHidden: false, variant });

/** Circlet / crown on the head (points: 0 = circlet). */
function crown(b: CharBuilder, points: number, mat: string = M.gold) {
  const parts: G[] = [loft([{ y: 0.2, rx: 0.088, rz: 0.1, cz: 0.006 }, { y: 0.17, rx: 0.086, rz: 0.098, cz: 0.006 }], { segs: 20 })];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const g = loft([{ y: i % 2 ? 0.045 : 0.07, rx: 0.002, rz: 0.001 }, { y: 0, rx: 0.016, rz: 0.004 }], { segs: 4, capBottom: true });
    g.rotateY(a);
    g.translate(Math.sin(a) * 0.089, 0.198, Math.cos(a) * 0.101 + 0.006);
    parts.push(g);
  }
  b.add('head', merge(parts), mat);
}

/** Golden seams across the chest (bell-light / enraged). */
function seams(b: CharBuilder, sex: 'm' | 'f', n = 3) {
  const pts = [[0.06, 0.45], [-0.08, 0.34], [0.03, 0.22], [-0.05, 0.12]].slice(0, n);
  for (const [x, y] of pts) {
    const z = trunkZ(sex, b.shoulder, x, y, 1, 0.075);
    b.add('hips', sweep([[x - 0.05, y + 0.03, z], [x, y, z + 0.004], [x + 0.04, y - 0.05, z - 0.004]], { r: 0.005, sides: 4, segs: 6 }), M.crack, { skin: trunkSkin });
  }
}

// ================================================================================ enemies

function retainer(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 101);
  b.cracks = 0.55;
  const c = { ...ctx('m', true, seed), faceHidden: true };
  addNeck(b, 'm', M.black);
  LOOKS.retainer.body(b, c);
  LOOKS.retainer.arms(b, c);
  LOOKS.retainer.legs(b, c);
  bascinet(b, { mat: BLACK_PLATE, trim: M.gold, visor: true, eyes: true, dents: 1 });
  crest(b, 'cloth_red|t=b06060', 0.27);
  bandolier(b, 'm', { over: 0.09, mat: 'cloth_linen|t=d8d0c0', width: 0.03 });
  cloak(b, 'mantle', { mat: 'cloth_red|t=6a4848', pad: 0.05, heraldry: true });
  return b.build();
}

function duellist(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 211);
  const v = new Rng(seed * 31 + 5);
  b.cracks = 0.5;
  const sex = 'm';
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: v.chance(0.5) ? 'dark' : 'fair', style: 'long', beard: 'short', unlived: true });
  wideHat(b, { mat: 'cloth_black|t=5a5050', band: M.gold, feather: 'cloth_red|t=c09090' });
  addTrunk(b, sex, 'cloth_black|t=6a6060', { y0: -0.16, y1: 0.56, inflate: 0.012, crack: 1 });
  addShoulders(b, sex, 'cloth_black|t=6a6060', 0.012);
  // a long slashed coat (doublet over a skirted coat), gilt buttons
  robeSkirt(b, sex, { mat: 'cloth_blue|t=6a7690', y0: 0.08, hem: -0.62, r1: [0.24, 0.2], open: 0.6, tatter: 0.1, trim: M.gold, cols: 18, rows: 8 });
  addTrunk(b, sex, 'cloth_blue|t=6a7690', { y0: 0.04, y1: 0.52, inflate: 0.026, radial: quilted(14, 8, 0.03), crack: 1 });
  for (let i = 0; i < 6; i++) { const y = 0.46 - i * 0.07; b.add('hips', xf(ellipsoid(0.008, 0.008, 0.005, { segs: 6, rows: 4 }), { p: [0, y, trunkZ(sex, b.shoulder, 0, y, 1, 0.03)] }), M.gold, { skin: trunkSkin }); }
  belt(b, sex, { y: 0.1, over: 0.04, pouches: 0, mat: M.leatherDark, buckle: M.gold });
  mantle(b, sex, { mat: 'cloth_red|t=7a4a48', len: 0.38, trim: M.gold, open: 1.9, tatter: 0.2 });
  addArms(b, sex, 'cloth_black|t=6a6060', { inflate: 0.014, crack: 1 });
  bracers(b, sex, { mat: M.leatherDark, studs: M.gold });
  addHands(b, 'glove', M.leatherDark, M.leather);
  addLegs(b, sex, 'cloth_black|t=4a4444', { inflate: 0.008, crack: 1 });
  addFeet(b, sex, 'tallboot', M.leatherDark);
  return b.build();
}

function gardener(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 307);
  const v = new Rng(seed * 17 + 3);
  b.cracks = 0.7;
  const sex = 'm';
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: 'grey', style: 'shaggy', beard: v.chance(0.6) ? 'full' : 'stubble', unlived: true, old: true });
  wideHat(b, { mat: 'grass_dead|t=d8c090', band: 'cloth_red|t=8a6a60', feather: 'grass_dead|t=c0a070' });
  addTrunk(b, sex, 'cloth_linen|t=8a8070', { y0: -0.16, y1: 0.56, inflate: 0.02, radial: quilted(20, 14, 0.04), crack: 1 });
  addShoulders(b, sex, 'cloth_linen|t=8a8070', 0.02);
  // leather apron to the shins, bib strapped over the shoulders; a pruning knife and twine at the belt
  tabard(b, sex, { mat: 'leather|t=9a8068', top: 0.42, hem: -0.72, over: 0.04, w: [0.13, 0.17, 0.2], back: false, tatter: 0.1 });
  belt(b, sex, { y: 0.1, over: 0.06, pouches: 2, mat: M.leatherDark });
  b.add('hips', xf(torus(0.04, 0.012, 5, 12), { p: [0.17, 0.02, trunkZ(sex, b.shoulder, 0.17, 0.02, 1, 0.06)], r: [Math.PI / 2, 0, 0.3] }), M.rope, { skin: trunkSkin });
  addArms(b, sex, 'cloth_linen|t=8a8070', { inflate: 0.018, crack: 1 });
  addHands(b, 'glove', 'leather|t=8a7058', M.leather);
  addLegs(b, sex, 'cloth_brown|t=6a5a48', { inflate: 0.018, crack: 1 });
  addFeet(b, sex, 'boot', 'mud');
  return b.build();
}

function courtier(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 401);
  b.cracks = 0.45;
  const sex = seed % 2 ? 'f' : 'm';
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: 'fair', style: 'long', unlived: true });
  // the golden mask: a smooth, smiling face over the face
  b.add('head', xf(ellipsoid(0.085, 0.11, 0.05, { segs: 14, rows: 8, phi0: -Math.PI / 2, phiLen: Math.PI }), { p: [0, 0.09, 0.065] }), 'gold_trim');
  for (const s of [1, -1]) b.add('head', xf(ellipsoid(0.017, 0.008, 0.01, { segs: 8, rows: 4 }), { p: [s * 0.033, 0.11, 0.113] }), M.shadow);
  // tall hat with a veil at the back
  b.add('head', loft([{ y: 0.42, rx: 0.07, rz: 0.075 }, { y: 0.3, rx: 0.08, rz: 0.085 }, { y: 0.17, rx: 0.095, rz: 0.108, cz: 0.004 }], { segs: 16, capTop: true }), 'cloth_black|t=4a3c40');
  b.add('head', loft([{ y: 0.19, rx: 0.1, rz: 0.113, cz: 0.004 }, { y: 0.16, rx: 0.1, rz: 0.113, cz: 0.004 }], { segs: 16 }), M.gold);
  addTrunk(b, sex, 'cloth_red|t=7a5a70', { y0: -0.16, y1: 0.56, inflate: 0.02, crack: 1 });
  addShoulders(b, sex, 'cloth_red|t=7a5a70', 0.02);
  robeSkirt(b, sex, { mat: 'cloth_red|t=7a5a70', y0: 0.1, hem: -0.98, r1: [0.3, 0.26], tatter: 0.06, trim: M.gold, emb: true, cols: 22, rows: 11 });
  mantle(b, sex, { mat: 'cloth_linen|t=d8d0c0', len: 0.24, trim: M.gold, emb: true, tatter: 0.02 });
  belt(b, sex, { y: 0.1, over: 0.035, pouches: 0, mat: M.gold, buckle: M.gold, strapEnd: false });
  addArms(b, sex, 'cloth_red|t=7a5a70', { inflate: 0.016, foreY1: -0.12 });
  bellSleeves(b, sex, { mat: 'cloth_red|t=7a5a70', trim: M.gold, emb: true, flare: 0.1, len: 0.28 });
  addHands(b, 'relaxed', PALE);
  addLegs(b, sex, 'cloth_black', { inflate: 0.01 });
  addFeet(b, sex, 'boot', M.leatherDark);
  return b.build();
}

function ghost(rig: Rig, seed: number) {
  const b = new CharBuilder(rig, 'enemy', seed * 7919 + 503);
  b.ghost = { color: new THREE.Color(1.0, 0.84, 0.55), min: 0.12 };
  const sex = seed % 3 === 0 ? 'f' : 'm';
  addNeck(b, sex, 'skin_pale');
  addHead(b, { sex, skin: 'skin_pale', hair: 'fair', style: sex === 'f' ? 'braid' : 'short', beard: 'none' });
  crown(b, 8);
  addTrunk(b, sex, 'cloth_linen|t=e8e0d0', { y0: -0.16, y1: 0.56, inflate: 0.02 });
  addShoulders(b, sex, 'cloth_linen|t=e8e0d0', 0.02);
  cuirass(b, sex, { mat: 'gold_trim', trim: M.gold, inflate: 0.035, keel: 0.05 });
  robeSkirt(b, sex, { mat: 'cloth_linen|t=e8e0d0', y0: 0.1, hem: -0.95, r1: [0.3, 0.27], tatter: 0.2, trim: M.gold, cols: 22, rows: 11 });
  mantle(b, sex, { mat: 'cloth_red|t=c09090', len: 0.34, r1: 0.3, trim: M.gold, emb: true, tatter: 0.15 });
  addArms(b, sex, 'cloth_linen|t=e8e0d0', { inflate: 0.016 });
  addHands(b, 'gauntlet', 'gold_trim', M.gold);
  addLegs(b, sex, 'cloth_linen', { inflate: 0.01 });
  addFeet(b, sex, 'boot', M.leatherDark);
  return b.build();
}

// ================================================================================ bosses

/** Dame Celwyn Ardent: master-at-arms of the Household. Phase 1 cloaked; 2 cloak shed; 3 bell-lit seams. */
function celwyn(rig: Rig, phase: 1 | 2 | 3) {
  const b = new CharBuilder(rig, 'boss', 7717 + phase);
  b.cracks = phase === 3 ? 0.9 : 0;
  const sex = 'f';
  const c = ctx(sex, false, 1, 'grey');
  addNeck(b, sex, 'skin');
  LOOKS.retainer.body(b, c);
  LOOKS.retainer.arms(b, c);
  LOOKS.retainer.legs(b, c);
  // silver-streaked hair bound back in a braid; the face of someone who has been right too often
  addHead(b, { sex, hair: 'grey', style: 'braid', skin: 'skin' });
  // master-at-arms' baldric and a gilt chain of office
  bandolier(b, sex, { over: 0.1, mat: 'cloth_linen|t=e0d8c8', width: 0.034, fromLeft: true });
  const cz = trunkZ(sex, b.shoulder, 0, 0.44, 1, 0.1);
  b.add('hips', xf(torus(0.11, 0.008, 5, 18, Math.PI), { p: [0, 0.5, cz - 0.02], r: [0.2, 0, Math.PI] }), M.gold, { skin: trunkSkin });
  b.add('hips', xf(bellGeom(0.05), { p: [0, 0.38, cz + 0.01], r: [0.3, 0, 0] }), M.gold, { skin: trunkSkin });
  if (phase === 1) cloak(b, 'heavy', { mat: 'cloth_red|t=6a4848', pad: 0.05, heraldry: true, fur: false });
  if (phase === 3) seams(b, sex, 4);
  return b.build();
}

/** Casimir, Heir by Law: tall, crowned, royal mantle over plate; the Sword of State. */
function heirLaw(rig: Rig, enraged: boolean) {
  const b = new CharBuilder(rig, 'boss', 8101 + (enraged ? 1 : 0));
  b.cracks = enraged ? 1.4 : 0.6;
  const sex = 'm';
  const c = ctx(sex, true, 2, 'dark');
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: 'dark', style: 'long', beard: 'full', unlived: true });
  crown(b, 10);
  LOOKS.retainer.body(b, c);
  robeSkirt(b, sex, { mat: ROYAL_RED, y0: 0.08, hem: -0.95, r1: [0.3, 0.27], open: 0.7, tatter: enraged ? 0.25 : 0.05, trim: M.gold, emb: true, cols: 22, rows: 11 });
  mantle(b, sex, { mat: 'cloth_linen|t=f0e8d8', len: 0.36, r1: 0.32, trim: M.gold, emb: true, tatter: 0.03 });
  LOOKS.retainer.arms(b, c);
  LOOKS.retainer.legs(b, c);
  if (!enraged) cloak(b, 'heavy', { mat: 'cloth_red|t=7a4848', pad: 0.06, heraldry: true, fur: true });
  if (enraged) seams(b, sex, 4);
  return b.build();
}

/** Corisande, Heir by Blood: slim, a blue court coat over light gilt plate, circlet, estoc. */
function heirBlood(rig: Rig, enraged: boolean) {
  const b = new CharBuilder(rig, 'boss', 8201 + (enraged ? 1 : 0));
  b.cracks = enraged ? 1.4 : 0.6;
  const sex = 'f';
  addNeck(b, sex, PALE);
  addHead(b, { sex, skin: PALE, hair: 'auburn', style: 'braid', unlived: true });
  crown(b, 0);
  addTrunk(b, sex, 'cloth_blue|t=5a6690', { y0: -0.16, y1: 0.56, inflate: 0.014, crack: 1 });
  addShoulders(b, sex, 'cloth_blue|t=5a6690', 0.014);
  cuirass(b, sex, { mat: 'steel_bright|t=b0a890', trim: M.gold, inflate: 0.03, keel: 0.04, crack: 1.2 });
  gorget(b, sex, { mat: 'steel_bright|t=b0a890', trim: M.gold });
  robeSkirt(b, sex, { mat: ROYAL_BLUE, y0: 0.08, hem: -0.78, r1: [0.27, 0.22], open: 0.9, tatter: enraged ? 0.25 : 0.06, trim: M.gold, emb: true, cols: 20, rows: 9 });
  belt(b, sex, { y: 0.1, over: 0.05, pouches: 0, mat: M.leatherDark, buckle: M.gold });
  pauldrons(b, { mat: 'steel_bright|t=b0a890', trim: M.gold, size: 0.9, lames: 3 });
  addArms(b, sex, 'cloth_blue|t=5a6690', { inflate: 0.012, crack: 1 });
  armPlates(b, sex, { mat: 'steel_bright|t=b0a890', trim: M.gold });
  addHands(b, 'gauntlet', 'steel_bright|t=b0a890', M.gold);
  addLegs(b, sex, 'cloth_blue|t=3a4460', { inflate: 0.01, crack: 1 });
  legPlates(b, sex, { mat: 'steel_bright|t=b0a890', trim: M.gold, cuisse: false });
  addFeet(b, sex, 'tallboot', M.leatherDark);
  if (!enraged) mantle(b, sex, { mat: ROYAL_BLUE, len: 0.42, trim: M.gold, open: 1.9, tatter: 0.05 });
  if (enraged) seams(b, sex, 4);
  return b.build();
}

// ================================================================================ NPCs

/** The Greyford muster soldier (an NPC wearing the Unlived Greyford look). */
function greyfordMuster(rig: Rig) { return buildEnemy(rig, 'greyfordSoldier', 5); }

// ================================================================================ weapons

class WB {
  private parts = new Map<string, G[]>();
  add(key: string, g: G) { let l = this.parts.get(key); if (!l) this.parts.set(key, (l = [])); l.push(g); return this; }
  build(name: string): { object: THREE.Group; tris: number } {
    const group = new THREE.Group();
    group.name = 'weapon:' + name;
    let tris = 0;
    for (const [key, list] of this.parts) {
      const g = merge(list);
      g.computeBoundingSphere();
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      const m = new THREE.Mesh(g, weaponMaterial(key));
      m.castShadow = true;
      group.add(m);
    }
    return { object: group, tris };
  }
}

/** Lenticular blade loft along +Y. */
function blade(y0: number, y1: number, w0: number, w1: number, t: number, tip: number, curve = 0): G {
  const rings = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const u = i / n, y = y0 + (y1 - tip - y0) * u;
    rings.push({ y, rx: t * (1 - 0.3 * u), rz: w0 + (w1 - w0) * u, cz: -curve * u * u, p: 1.4 });
  }
  rings.push({ y: y1, rx: 0.001, rz: 0.002, cz: -curve, p: 1.4 });
  return loft(rings.reverse(), { segs: 8, capBottom: true });
}
const guard = (y: number, half: number, w: number, h: number) => xf(new THREE.BoxGeometry(w, h, half * 2), { p: [0, y, 0] });
const grip = (y0: number, y1: number, r: number) => cyl(r, r * 1.05, y0, y1, 8);

function sword(name: string, o: { len: number; w: number; guard: number; gripL: number; mat?: string; gilt?: boolean; bellPommel?: boolean; curve?: number; ring?: boolean }): WeaponModelExt {
  const wb = new WB();
  wb.add(o.mat ?? 'steel_bright', blade(0.1, o.len, o.w, o.w * 0.7, 0.0055, o.len * 0.12, o.curve ?? 0));
  wb.add(o.gilt ? 'gold_trim' : 'iron', guard(0.085, o.guard, 0.02, 0.022));
  if (o.gilt) wb.add('gold_trim', xf(ellipsoid(0.018, 0.018, 0.018, { segs: 8, rows: 5 }), { p: [0, 0.085, o.guard] })).add('gold_trim', xf(ellipsoid(0.018, 0.018, 0.018, { segs: 8, rows: 5 }), { p: [0, 0.085, -o.guard] }));
  if (o.ring) wb.add('gold_trim', xf(torus(0.028, 0.004, 5, 14), { p: [0.03, 0.09, 0], r: [0, 0, Math.PI / 2] })).add('gold_trim', sweep([[0, 0.085, 0.05], [0, 0.03, 0.07], [0, -0.05, 0.05], [0, -o.gripL, 0.01]], { r: 0.004, sides: 6, segs: 10 }));
  wb.add('leather_dark', grip(-o.gripL, 0.075, 0.015));
  if (o.bellPommel) wb.add(o.gilt ? 'gold_trim' : 'bronze', xf(bellGeom(0.06), { p: [0, -o.gripL - 0.005, 0], r: [Math.PI, 0, 0] }));
  else wb.add(o.gilt ? 'gold_trim' : 'bronze', xf(ellipsoid(0.025, 0.022, 0.025, { segs: 10, rows: 6 }), { p: [0, -o.gripL - 0.012, 0] }));
  const { object, tris } = wb.build(name);
  return { object, hit: { from: 0.12, to: o.len, radius: 0.04 }, trail: { from: 0.25, to: o.len }, offhandGrip: o.gripL > 0.14 ? -o.gripL * 0.6 : undefined, triangles: tris };
}

function shears(): WeaponModelExt {
  const wb = new WB();
  // two long straight blades crossed at the pivot, long ash handles below (the grip at the handle join)
  for (const s of [1, -1]) {
    wb.add('iron_rusted|t=b0a8a0', xf(blade(0.32, 1.05, 0.03, 0.02, 0.006, 0.08), { r: [s * 0.08, 0, 0], p: [0, 0, s * 0.012] }));
    wb.add('timber_dark', xf(cyl(0.017, 0.02, -0.1, 0.3, 7), { r: [-s * 0.08, 0, 0], p: [0, 0, s * 0.03] }));
  }
  wb.add('iron', xf(cyl(0.03, 0.03, -0.03, 0.03, 10), { p: [0, 0.31, 0], r: [0, 0, Math.PI / 2] }));
  wb.add('iron', xf(torus(0.03, 0.006, 5, 12), { p: [0, 0.2, 0] }));
  const { object, tris } = wb.build('hh_shears');
  return { object, hit: { from: 0.32, to: 1.05, radius: 0.06 }, trail: { from: 0.4, to: 1.05 }, offhandGrip: 0.2, triangles: tris };
}

// ================================================================================ registration

let registered = false;
export function registerHouseholdModels() {
  if (registered) return;
  registered = true;
  registerEnemyLook('hhRetainer', retainer);
  registerEnemyLook('hhDuellist', duellist);
  registerEnemyLook('hhGardener', gardener);
  registerEnemyLook('hhCourtier', courtier);
  registerEnemyLook('hhGhost', ghost);
  registerEnemyLook('celwyn', (r) => celwyn(r, 1));
  registerEnemyLook('celwyn2', (r) => celwyn(r, 2));
  registerEnemyLook('celwyn3', (r) => celwyn(r, 3));
  registerEnemyLook('heirLaw', (r) => heirLaw(r, false));
  registerEnemyLook('heirLaw2', (r) => heirLaw(r, true));
  registerEnemyLook('heirBlood', (r) => heirBlood(r, false));
  registerEnemyLook('heirBlood2', (r) => heirBlood(r, true));
  registerNpcLook('hhMuster', greyfordMuster);
  registerNpcLook('celwynNpc', (r) => celwyn(r, 1));
  registerWeaponModel('hh_longsword', () => sword('hh_longsword', { len: 1.02, w: 0.026, guard: 0.13, gripL: 0.12, mat: 'steel_armor|t=a0a0a8', gilt: true }));
  registerWeaponModel('hh_rapier', () => sword('hh_rapier', { len: 1.08, w: 0.011, guard: 0.1, gripL: 0.1, gilt: true, ring: true }));
  registerWeaponModel('hh_ceremonial', () => sword('hh_ceremonial', { len: 0.98, w: 0.03, guard: 0.15, gripL: 0.11, mat: 'gold_trim', gilt: true, bellPommel: true }));
  registerWeaponModel('hh_shears', shears);
  registerWeaponModel('ardent_longsword', () => sword('ardent_longsword', { len: 1.12, w: 0.028, guard: 0.15, gripL: 0.2, gilt: true, bellPommel: true }));
  registerWeaponModel('hh_sword_of_state', () => sword('hh_sword_of_state', { len: 1.45, w: 0.042, guard: 0.22, gripL: 0.28, mat: 'steel_bright|t=c0b8a0', gilt: true, bellPommel: true }));
  registerWeaponModel('hh_heir_estoc', () => sword('hh_heir_estoc', { len: 1.12, w: 0.012, guard: 0.11, gripL: 0.11, gilt: true, ring: true }));
}
registerHouseholdModels();
void hood;
