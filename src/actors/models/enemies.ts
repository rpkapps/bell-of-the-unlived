/**
 * Enemy looks: the Unlived (soldiers of futures Aldren erased) and Ser Corvane.
 *
 * Unlived read as MORE decayed than royal service gear: rusted obsolete armour, torn surcoats with
 * an OLD army insignia (castle and sword), and golden light bleeding from cracks in plates and
 * skin (material 'unlived_crack') plus glowing eyes in the helm shadow — while silhouettes stay
 * crisp: helm shapes and shoulders differ per type so each reads at gameplay distance.
 * `seed` varies helm, colours, missing plates and tear patterns deterministically.
 */
import * as THREE from 'three';
import type { Rig } from '../Rig';
import type { EnemyLook } from './contract';
import { CharBuilder, trunkSkin, type BuiltModel } from './builder';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet, quilted } from './anatomy';
import {
  M, cuirass, gorget, fauld, tassets, mailSkirt, tabard, belt, bandolier, robeSkirt, pauldrons, armPlates, legPlates, bracers,
  greatHelm, kettleHelm, sallet, bevor, bascinet, nasalHelm, hood, mantle, cloak, bellGeom, trunkZ, drapeChain,
} from './gear';
import { buildLook } from './character';
import { loft, sweep, xf, cyl, torus, merge, type G, type V3, lerp } from './parts';
import { Rng } from '../../core/rng';

const PALE = 'skin_pale|t=b8b0a8';
const OLDSTEEL = M.steelOld;
const SURCOATS = ['cloth_red|t=9a8078', 'cloth_blue|t=8a96a8', 'cloth_brown|t=9a8a70', 'cloth_linen|t=7a7468'];
const GAMB = 'cloth_linen|t=6a645a';

/** Unlived foot soldier base: gambeson, mail, rusted plates, torn surcoat with the old insignia. */
function soldier(b: CharBuilder, v: Rng, o: { heavy?: boolean; surcoat?: string; pauldron?: boolean } = {}) {
  const sex = 'm';
  addNeck(b, sex, PALE);
  addTrunk(b, sex, GAMB, { y0: -0.16, y1: 0.56, inflate: 0.014, radial: quilted(24, 16, 0.035), crack: 1 });
  addShoulders(b, sex, GAMB, 0.014);
  mailSkirt(b, sex, { y0: 0.12, y1: -0.3, crack: 1 });
  cuirass(b, sex, { mat: OLDSTEEL, trim: null, inflate: 0.03, dents: 6, crack: 1.6, keel: 0.05 });
  gorget(b, sex, { mat: OLDSTEEL, trim: null });
  if (o.heavy) {
    fauld(b, sex, { mat: OLDSTEEL, trim: null, lames: 3, crack: 1 });
    tassets(b, { mat: OLDSTEEL, trim: null, len: 0.22, y: -0.1 });
  }
  tabard(b, sex, { mat: o.surcoat ?? v.pick(SURCOATS), hem: -0.5 - v.range(0, 0.08), over: 0.045, w: [0.1, 0.14, 0.17], heraldry: 'army', split: true, tatter: 0.26, back: v.chance(0.7) });
  belt(b, sex, { y: 0.1, over: 0.05, pouches: v.int(0, 2) });
  if (o.pauldron !== false) {
    pauldrons(b, { mat: OLDSTEEL, trim: null, size: o.heavy ? 1.1 : 0.95, lames: o.heavy ? 3 : 2, crack: 1.2, rivets: false });
  }
  addArms(b, sex, M.mail, { inflate: 0.01, crack: 1 });
  armPlates(b, sex, { mat: OLDSTEEL, trim: null, rerebrace: !!o.heavy, crack: 1 });
  addHands(b, v.chance(0.5) ? 'glove' : 'gauntlet', v.chance(0.5) ? M.leatherDark : OLDSTEEL, M.leather);
  addLegs(b, sex, 'cloth_brown|t=6a6258', { inflate: 0.012, crack: 1 });
  legPlates(b, sex, { mat: OLDSTEEL, trim: null, cuisse: !!o.heavy, crack: 1 });
  addFeet(b, sex, o.heavy ? 'sabaton' : 'boot', M.leatherDark, OLDSTEEL);
}

/** Pale, cracked face under an open helm (glowing eyes). */
function unlivedFace(b: CharBuilder, v: Rng) {
  addHead(b, { sex: 'm', skin: PALE, hair: 'dark', style: 'none', beard: v.chance(0.5) ? 'stubble' : 'none', unlived: true, old: v.chance(0.4) });
}

/** Quiver on the back with fletched arrows. */
function quiver(b: CharBuilder) {
  const parts: G[] = [];
  parts.push(loft([{ y: 0.3, rx: 0.045, rz: 0.035 }, { y: -0.2, rx: 0.04, rz: 0.03 }], { segs: 10, capBottom: true }));
  const fl: G[] = [];
  for (let i = 0; i < 7; i++) {
    const x = (i % 3 - 1) * 0.018 + (i > 3 ? 0.009 : 0), z = (Math.floor(i / 3) - 1) * 0.014;
    parts.push(cyl(0.004, 0.004, 0.25, 0.4, 5).translate(x, 0, z));
    fl.push(loft([{ y: 0.45, rx: 0.009, rz: 0.002 }, { y: 0.37, rx: 0.011, rz: 0.002 }], { segs: 4 }).translate(x, 0, z));
  }
  b.add('chest', merge(parts), M.leather, { p: [0.08, 0.02, -0.17], r: [0.25, 0, -0.45] });
  b.add('chest', merge(fl), 'cloth_linen|t=b0a898', { p: [0.08, 0.02, -0.17], r: [0.25, 0, -0.45] });
}

/** Ser Corvane's bell-standard carried on his back: pole, crossbar and a hanging bronze bell. */
function bellStandard(b: CharBuilder) {
  const skin = () => [['chest', 1]] as [import('../rigDefs').BoneName, number][];
  b.add('chest', cyl(0.016, 0.016, -0.15, 1.05, 8), 'timber_dark', { p: [-0.1, 0, -0.2], r: [0.08, 0, 0.12], skin });
  b.add('chest', xf(cyl(0.012, 0.012, -0.18, 0.18, 6), { r: [0, 0, Math.PI / 2] }), M.bronze, { p: [-0.02, 0.95, -0.12], r: [0.08, 0, 0.12], skin });
  b.add('chest', xf(bellGeom(0.2), { p: [0, -0.02, 0] }), 'bronze_bell', { p: [-0.02, 0.93, -0.12], r: [0.08, 0, 0.12], skin });
  b.add('chest', xf(loft([{ y: 0.05, rx: 0.002 }, { y: 0.0, rx: 0.03 }], { segs: 8, capBottom: true }), {}), M.bronze, { p: [-0.1 + 0.13, 1.08, -0.2 + 0.09], r: [0.08, 0, 0.12], skin });
  // strap bracket on the back plate
  b.add('chest', torus(0.03, 0.006, 5, 12), M.iron, { p: [-0.09, 0.05, -0.19], r: [0.08, 0, 0.12], skin });
}

export function buildEnemy(rig: Rig, look: EnemyLook, seed: number): BuiltModel {
  const kind = look === 'commander' || look === 'commander2' ? 'boss' : 'enemy';
  const b = new CharBuilder(rig, kind, seed * 7919 + 13);
  const v = new Rng(seed * 104729 + 7);
  switch (look) {
    case 'infantry': {
      b.cracks = 0.9;
      soldier(b, v, { pauldron: v.chance(0.75) });
      unlivedFace(b, v);
      if (v.chance(0.6)) kettleHelm(b, { mat: OLDSTEEL, dents: 4, brim: v.range(0.06, 0.085) });
      else { sallet(b, { mat: OLDSTEEL, eyes: true, dents: 3, visor: false }); bevor(b, { mat: OLDSTEEL }); }
      b.add('head', loft([{ y: 0.09, rx: 0.1, rz: 0.114, cz: 0.004 }, { y: -0.02, rx: 0.1, rz: 0.114, cz: 0.004 }, { y: -0.08, rx: 0.09, rz: 0.11 }], { segs: 16, phi0: 0.8, phiLen: Math.PI * 2 - 1.6 }), M.mail);
      break;
    }
    case 'sentry': {
      b.cracks = 0.8;
      const sex = 'm';
      addNeck(b, sex, PALE);
      addTrunk(b, sex, GAMB, { y0: -0.16, y1: 0.56, inflate: 0.018, radial: quilted(28, 18, 0.045), crack: 1 });
      addShoulders(b, sex, GAMB, 0.018);
      robeSkirt(b, sex, { mat: GAMB, y0: 0.06, hem: -0.56, r1: [0.22, 0.18], open: 0.35, tatter: 0.14, cols: 18, rows: 8 });
      tabard(b, sex, { mat: v.pick(SURCOATS), hem: -0.48, over: 0.03, w: [0.1, 0.13, 0.15], heraldry: 'army', tatter: 0.3, back: false });
      belt(b, sex, { y: 0.1, over: 0.04, pouches: 1 });
      bandolier(b, sex, { over: 0.04, mat: M.leatherDark });
      b.addLR('upperArmL', 'upperArmR', () => loft([{ y: 0.07, rx: 0.08, rz: 0.08, cx: 0 }, { y: -0.05, rx: 0.085, rz: 0.085 }], { segs: 14, phi0: 0.3, phiLen: Math.PI * 2 - 0.6 }), OLDSTEEL);
      addArms(b, sex, GAMB, { inflate: 0.016, radial: quilted(10, 10, 0.05), crack: 1 });
      bracers(b, sex, { mat: M.leatherDark, studs: M.iron });
      addHands(b, 'glove', M.leatherDark, M.leather);
      addLegs(b, sex, 'cloth_brown|t=6a6258', { inflate: 0.012, crack: 1 });
      legPlates(b, sex, { mat: OLDSTEEL, trim: null, cuisse: false, crack: 1 });
      addFeet(b, sex, 'boot');
      unlivedFace(b, v);
      nasalHelm(b, { mat: OLDSTEEL, dents: 3 });
      break;
    }
    case 'shieldBearer': {
      b.cracks = 1.0;
      soldier(b, v, { heavy: true, surcoat: 'cloth_red|t=8a7070' });
      bascinet(b, { mat: OLDSTEEL, visor: true, eyes: true, dents: 4 });
      // heavier: raised gorget / bevor
      bevor(b, { mat: OLDSTEEL });
      break;
    }
    case 'archer': {
      b.cracks = 0.7;
      const sex = 'm';
      addNeck(b, sex, PALE);
      addTrunk(b, sex, GAMB, { y0: -0.16, y1: 0.56, inflate: 0.01, crack: 1 });
      addShoulders(b, sex, M.leather, 0.016);
      addTrunk(b, sex, M.leather, { y0: -0.06, y1: 0.53, inflate: 0.022, radial: quilted(8, 10, 0.02), crack: 1 });
      robeSkirt(b, sex, { mat: M.leather, y0: 0.04, hem: -0.36, r1: [0.21, 0.17], open: 0.45, tatter: 0.18, cols: 16, rows: 5 });
      tabard(b, sex, { mat: v.pick(SURCOATS), top: 0.5, hem: -0.3, over: 0.035, w: [0.09, 0.12, 0.13], heraldry: 'army', tatter: 0.3, back: false });
      belt(b, sex, { y: 0.07, over: 0.035, pouches: 2 });
      bandolier(b, sex, { over: 0.04, width: 0.018 });
      quiver(b);
      mantle(b, sex, { mat: 'cloth_brown|t=6a5a4a', len: 0.3, tatter: 0.25 });
      addArms(b, sex, GAMB, { inflate: 0.012, crack: 1 });
      bracers(b, sex, { mat: M.leatherDark, studs: null });
      addHands(b, 'glove', M.leather, M.leatherDark);
      addLegs(b, sex, 'cloth_brown|t=6a6258', { inflate: 0.01, crack: 1 });
      addFeet(b, sex, 'tallboot');
      unlivedFace(b, v);
      hood(b, { mat: 'cloth_brown|t=6a5a4a', trim: null, depth: 1.25, tip: 0.05, open: 0.85 });
      break;
    }
    case 'commander':
    case 'commander2': {
      const p2 = look === 'commander2';
      b.cracks = p2 ? 1.6 : 0.35;
      buildLook(b, { head: 'commander', body: 'commander', arms: 'commander', legs: 'commander', cloak: !p2 }, { unlived: true, cloak: !p2 });
      bellStandard(b);
      if (p2) {
        // armour split open: glowing seams along the plates
        for (const [x, y] of [[0.06, 0.45], [-0.08, 0.34], [0.03, 0.22]] as const) {
          const z = trunkZ('m', b.shoulder, x, y, 1, 0.075);
          b.add('hips', sweep([[x - 0.05, y + 0.03, z], [x, y, z + 0.004], [x + 0.04, y - 0.05, z - 0.004]], { r: 0.004, sides: 4, segs: 6 }), M.crack, { skin: trunkSkin });
        }
      }
      break;
    }
    case 'greyfordSoldier': {
      b.cracks = 0.3;
      b.ghost = { color: new THREE.Color(0.32, 0.42, 0.58), min: 0.14 };
      buildLook(b, { head: 'greyford', body: 'greyford', arms: 'greyford', legs: 'greyford', cloak: false }, { unlived: true, variant: seed });
      break;
    }
  }
  return b.build();
}

export { lerp, drapeChain, cloak, greatHelm };
export type { V3 };
