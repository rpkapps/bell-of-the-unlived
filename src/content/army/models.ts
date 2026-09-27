/**
 * Siegeholm looks and weapons (registered with the model factory while the region is loaded).
 *
 * Silhouettes first: the pike-wall bearer (wide kettle hat, pavise, 3 m pike), the crossbowman
 * (visored sallet, quilted coat, arbalest), the sapper (leather cap, apron, bandolier of fire
 * pots), the siege knight (crested great helm, massive pauldrons, greatsword), the twice-slain
 * (bare-headed, noose, torn surcoat, heavy golden cracks), the bombard crew (arming cap, soot,
 * leather apron) and the living magazine guard (whole, clean surcoat, no cracks).
 * Oderic the Ram-Knight: a huge knight in a ram-horned great helm with a battering ram-maul.
 * Marshal Ysolde Varr: a tall woman in dented field plate, braided hair, a scar across the cheek,
 * the red-and-gold victory sash over her breastplate; in the Defeat her pauldron is torn away,
 * the sash is burned short and the light of the unlived future bleeds through the dents.
 */
import * as THREE from 'three';
import { registerEnemyLook, registerNpcLook, registerWeaponModel, CharBuilder, models } from '../../actors/models';
import type { Rig } from '../../actors/Rig';
import { trunkSkin } from '../../actors/models/builder';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet, quilted, type HeadOpts } from '../../actors/models/anatomy';
import {
  M, cuirass, gorget, fauld, tassets, mailSkirt, tabard, belt, bandolier, robeSkirt, pauldrons, armPlates, legPlates, bracers,
  kettleHelm, sallet, bevor, greatHelm, hood, mantle, cloak, trunkZ, drapeChain,
} from '../../actors/models/gear';
import { buildWeapon } from '../../actors/models/weapons';
import type { WeaponModelExt } from '../../actors/models/weapons';
import { weaponMaterial } from '../../actors/models/charMaterials';
import { sweep, xf, cyl, torus, loft, type V3 } from '../../actors/models/parts';
import { Rng } from '../../core/rng';

const PALE = 'skin_pale|t=b8b0a8';
const OLD = M.steelOld;
const GAMB = 'cloth_linen|t=6a645a';
const ARMY_RED = 'cloth_red|t=9a7068';
const ARMY_RED_LIVE = 'cloth_red|t=b88a80';

/** An army foot soldier's body (neck to boots); `live` = a living defender (no cracks, clean kit). */
function soldierBody(b: CharBuilder, v: Rng, o: { live?: boolean; heavy?: boolean; surcoat?: string; tatter?: number; plateMat?: string; pauldron?: boolean } = {}) {
  const sex = 'm';
  const plate = o.plateMat ?? (o.live ? 'steel_armor|t=8a8a90' : OLD);
  addNeck(b, sex, o.live ? 'skin' : PALE);
  addTrunk(b, sex, GAMB, { y0: -0.16, y1: 0.56, inflate: 0.014, radial: quilted(24, 16, 0.035), crack: 1 });
  addShoulders(b, sex, GAMB, 0.014);
  mailSkirt(b, sex, { y0: 0.12, y1: -0.3, crack: 1 });
  cuirass(b, sex, { mat: plate, trim: o.live ? M.bronze : null, inflate: 0.03, dents: o.live ? 2 : 6, crack: 1.4, keel: 0.05 });
  gorget(b, sex, { mat: plate, trim: null });
  if (o.heavy) { fauld(b, sex, { mat: plate, trim: null, lames: 3, crack: 1 }); tassets(b, { mat: plate, trim: null, len: 0.22, y: -0.1 }); }
  tabard(b, sex, { mat: o.surcoat ?? (o.live ? ARMY_RED_LIVE : ARMY_RED), hem: -0.52 - v.range(0, 0.06), over: 0.045, w: [0.1, 0.14, 0.17], heraldry: 'army', split: true, tatter: o.tatter ?? (o.live ? 0.04 : 0.24), back: true });
  belt(b, sex, { y: 0.1, over: 0.05, pouches: v.int(0, 2) });
  if (o.pauldron !== false) pauldrons(b, { mat: plate, trim: null, size: o.heavy ? 1.1 : 0.95, lames: o.heavy ? 3 : 2, crack: 1.2, rivets: false });
  addArms(b, sex, M.mail, { inflate: 0.01, crack: 1 });
  armPlates(b, sex, { mat: plate, trim: null, rerebrace: !!o.heavy, crack: 1 });
  addHands(b, 'gauntlet', plate, M.leather);
  addLegs(b, sex, 'cloth_brown|t=6a6258', { inflate: 0.012, crack: 1 });
  legPlates(b, sex, { mat: plate, trim: null, cuisse: !!o.heavy, crack: 1 });
  addFeet(b, sex, o.heavy ? 'sabaton' : 'boot', M.leatherDark, plate);
}

const face = (b: CharBuilder, v: Rng, live = false, o: Partial<HeadOpts> = {}) =>
  addHead(b, { sex: 'm', skin: live ? 'skin' : PALE, hair: 'dark', style: 'short', beard: v.chance(0.5) ? 'stubble' : 'short', unlived: !live, old: v.chance(0.3), ...o });

function build(look: string, rig: Rig, seed: number) {
  const boss = look.startsWith('oderic') || look.startsWith('varr');
  const b = new CharBuilder(rig, boss ? 'boss' : 'enemy', seed * 7919 + look.length * 131);
  const v = new Rng(seed * 104729 + look.length * 17);
  switch (look) {
    case 'pikeman': {
      b.cracks = 0.8;
      soldierBody(b, v, { heavy: true });
      face(b, v);
      kettleHelm(b, { mat: OLD, dents: 4, brim: 0.11 });
      bevor(b, { mat: OLD });
      break;
    }
    case 'crossbowman': {
      b.cracks = 0.7;
      const sex = 'm';
      addNeck(b, sex, PALE);
      addTrunk(b, sex, 'cloth_red|t=7a5a50', { y0: -0.16, y1: 0.56, inflate: 0.022, radial: quilted(28, 18, 0.045), crack: 1 });
      addShoulders(b, sex, 'cloth_red|t=7a5a50', 0.02);
      robeSkirt(b, sex, { mat: 'cloth_red|t=7a5a50', y0: 0.06, hem: -0.46, r1: [0.22, 0.18], open: 0.4, tatter: 0.16, cols: 18, rows: 7 });
      tabard(b, sex, { mat: ARMY_RED, top: 0.52, hem: -0.36, over: 0.04, w: [0.1, 0.13, 0.14], heraldry: 'army', tatter: 0.3, back: false });
      belt(b, sex, { y: 0.1, over: 0.05, pouches: 2 });
      bandolier(b, sex, { over: 0.05, mat: M.leatherDark });
      // bolt case on the hip
      b.add('hips', xf(loft([{ y: 0.12, rx: 0.05, rz: 0.035 }, { y: -0.14, rx: 0.045, rz: 0.03 }], { segs: 10, capBottom: true }), { p: [0.2, -0.05, 0.02], r: [0, 0, 0.12] }), M.leather, { skin: trunkSkin });
      addArms(b, sex, 'cloth_red|t=7a5a50', { inflate: 0.018, radial: quilted(10, 10, 0.05), crack: 1 });
      bracers(b, sex, { mat: M.leatherDark, studs: M.iron });
      addHands(b, 'glove', M.leatherDark, M.leather);
      addLegs(b, sex, 'cloth_brown|t=6a6258', { inflate: 0.012, crack: 1 });
      legPlates(b, sex, { mat: OLD, trim: null, cuisse: false, crack: 1 });
      addFeet(b, sex, 'tallboot');
      face(b, v);
      sallet(b, { mat: OLD, eyes: true, dents: 3, visor: true });
      mantle(b, sex, { mat: 'cloth_brown|t=5a4a3e', len: 0.28, tatter: 0.25 });
      break;
    }
    case 'sapper': {
      b.cracks = 0.9;
      const sex = 'm';
      addNeck(b, sex, PALE);
      addTrunk(b, sex, 'cloth_brown|t=6a5a4a', { y0: -0.16, y1: 0.56, inflate: 0.012, crack: 1 });
      addShoulders(b, sex, 'cloth_brown|t=6a5a4a', 0.012);
      tabard(b, sex, { mat: 'leather_dark|t=8a7a6a', top: 0.46, hem: -0.6, over: 0.03, w: [0.11, 0.15, 0.17], back: false, tatter: 0.12 });
      belt(b, sex, { y: 0.08, over: 0.04, pouches: 3 });
      bandolier(b, sex, { over: 0.05, mat: M.leather });
      // fire pots on the bandolier (clay, sealed with pitch)
      for (let i = 0; i < 4; i++) {
        const t = i / 3, x = 0.14 - t * 0.28, y = 0.46 - t * 0.36;
        b.add('hips', xf(loft([{ y: 0.05, rx: 0.02 }, { y: 0.03, rx: 0.045 }, { y: -0.03, rx: 0.042 }, { y: -0.05, rx: 0.02 }], { segs: 8, capTop: true, capBottom: true }), { p: [x, y, trunkZ(sex, b.shoulder, x, y, 1, 0.08)] }), 'dirt|t=a07050', { skin: trunkSkin });
      }
      addArms(b, sex, 'cloth_brown|t=6a5a4a', { inflate: 0.012, foreY1: -0.16, crack: 1 });
      addArms(b, sex, PALE, { upper: false, inflate: 0 });
      addHands(b, 'wrapped', PALE, 'cloth_linen|t=7a7060');
      addLegs(b, sex, 'cloth_brown|t=5a5048', { inflate: 0.01, crack: 1 });
      addFeet(b, sex, 'wrap');
      face(b, v, false, { soot: true, beard: 'full' });
      hood(b, { mat: M.leather, trim: null, depth: 0.95, tip: 0.01, open: 1.2 });
      break;
    }
    case 'siegeKnight': {
      b.cracks = 1.0;
      soldierBody(b, v, { heavy: true, plateMat: 'iron_rusted|t=5a5856', surcoat: 'cloth_black|t=5a4a48', tatter: 0.3 });
      pauldrons(b, { mat: 'iron_rusted|t=5a5856', trim: M.bronze, size: 1.35, lames: 4, style: 'tall', crack: 1.3 });
      greatHelm(b, { mat: 'iron_rusted|t=5a5856', trim: M.bronze, crest: true, eyes: true, dents: 5 });
      cloak(b, 'heavy', { mat: 'cloth_red|t=6a3a34', pad: 0.06, seed: seed + 3 });
      break;
    }
    case 'twiceSlain': {
      b.cracks = 1.7;
      soldierBody(b, v, { tatter: 0.55, pauldron: v.chance(0.5) });
      face(b, v, false, { style: v.chance(0.5) ? 'shaggy' : 'short', beard: 'stubble' });
      // the noose they were hanged with in one history, still around the neck
      b.add('neck', torus(0.075, 0.012, 6, 16), M.rope, { p: [0, 0.0, 0.0], r: [0.2, 0, 0], skin: () => [['neck', 0.6], ['chest', 0.4]] });
      b.add('chest', sweep([[0.0, 0.28, 0.08], [0.04, 0.12, 0.13], [0.02, -0.08, 0.14]], { r: 0.011, sides: 5, segs: 8 }), M.rope);
      break;
    }
    case 'cannonCrew': {
      b.cracks = 0.8;
      const sex = 'm';
      addNeck(b, sex, PALE);
      addTrunk(b, sex, GAMB, { y0: -0.16, y1: 0.56, inflate: 0.02, radial: quilted(26, 16, 0.04), crack: 1 });
      addShoulders(b, sex, GAMB, 0.02);
      tabard(b, sex, { mat: 'leather_dark|t=7a6a5a', top: 0.44, hem: -0.62, over: 0.035, w: [0.11, 0.15, 0.17], back: false, tatter: 0.1 });
      belt(b, sex, { y: 0.1, over: 0.045, pouches: 2 });
      addArms(b, sex, GAMB, { inflate: 0.016, radial: quilted(10, 10, 0.05), crack: 1 });
      bracers(b, sex, { mat: M.leather, studs: null });
      addHands(b, 'glove', M.leatherDark, M.leather);
      addLegs(b, sex, 'cloth_brown|t=6a6258', { inflate: 0.014, crack: 1 });
      addFeet(b, sex, 'boot');
      face(b, v, false, { soot: true });
      hood(b, { mat: GAMB, trim: null, depth: 0.9, tip: 0.0, open: 1.3 });
      break;
    }
    case 'armyLiving': {
      b.cracks = 0;
      soldierBody(b, v, { live: true });
      face(b, v, true, { unlived: false });
      kettleHelm(b, { mat: 'steel_armor|t=8a8a90', dents: 1, brim: 0.09, eyes: false });
      break;
    }
    case 'oderic':
    case 'oderic2': {
      const p2 = look === 'oderic2';
      b.cracks = p2 ? 1.5 : 0.7;
      const plate = 'iron_rusted|t=6a605a';
      soldierBody(b, v, { heavy: true, plateMat: plate, surcoat: 'cloth_black|t=4a3a34', tatter: p2 ? 0.5 : 0.25, pauldron: false });
      pauldrons(b, { mat: plate, trim: M.bronze, size: 1.5, lames: 4, style: 'bell', crack: 1.4 });
      greatHelm(b, { mat: plate, trim: M.bronze, crest: false, eyes: true, dents: 6 });
      // ram horns curling from the helm's temples (one snapped off in the second phase)
      for (const s of [1, -1] as const) {
        if (p2 && s < 0) {
          b.add('head', sweep([[s * 0.1, 0.19, 0.0], [s * 0.18, 0.24, -0.04]], { r: 0.032, sides: 7, segs: 4, caps: true }), 'bone|t=a09070');
          continue;
        }
        const pts: V3[] = [];
        for (let i = 0; i <= 10; i++) {
          const a = (i / 10) * Math.PI * 1.6;
          const r = 0.09 - i * 0.004;
          pts.push([s * (0.1 + 0.06 * (1 - Math.cos(a)) + i * 0.004), 0.19 + Math.sin(a) * r, -0.02 - (1 - Math.cos(a)) * r * 0.9 + i * 0.012]);
        }
        b.add('head', sweep(pts, { r: (t: number) => 0.034 * (1 - t * 0.65), sides: 7, segs: 22, caps: true }), 'bone|t=a09070');
      }
      cloak(b, 'heavy', { mat: 'hair_fair|t=6a5a4c|r=1', pad: 0.08, seed: seed + 9, fur: true });
      break;
    }
    case 'varr':
    case 'varr2': {
      const p2 = look === 'varr2';
      b.cracks = p2 ? 0.9 : 0;
      const sex = 'f';
      const steel = 'steel_armor|t=8a8c92';
      addNeck(b, sex, 'skin');
      addTrunk(b, sex, 'cloth_red|t=7a4a44', { y0: -0.16, y1: 0.56, inflate: 0.012 });
      addShoulders(b, sex, 'cloth_red|t=7a4a44', 0.016);
      mailSkirt(b, sex, { y0: 0.12, y1: -0.36 });
      cuirass(b, sex, { mat: steel, trim: M.bronze, inflate: 0.032, keel: 0.07, dents: p2 ? 9 : 6, crack: p2 ? 1.6 : 0 });
      gorget(b, sex, { mat: steel, trim: M.bronze, high: true });
      fauld(b, sex, { mat: steel, trim: M.bronze, lames: 3 });
      tassets(b, { mat: steel, trim: M.bronze, len: 0.24, y: -0.1 });
      robeSkirt(b, sex, { mat: 'cloth_red|t=8a4a44', y0: 0.02, hem: -0.78, r1: [0.24, 0.22], open: 0.55, tatter: p2 ? 0.35 : 0.08, cols: 18, rows: 9 });
      belt(b, sex, { y: 0.1, over: 0.07, pouches: 1, height: 0.05, buckle: M.gold });
      // the victory sash: shoulder to hip over the breastplate, gold-edged (burned short in the Defeat)
      const z = (x: number, y: number) => trunkZ(sex, b.shoulder, x, y, 1, 0.07);
      const sash: V3[] = p2 ? [[0.15, 0.5, z(0.15, 0.5)], [0.05, 0.36, z(0.05, 0.36)], [-0.04, 0.24, z(-0.04, 0.24)]]
        : [[0.15, 0.5, z(0.15, 0.5)], [0.05, 0.36, z(0.05, 0.36)], [-0.06, 0.22, z(-0.06, 0.22)], [-0.15, 0.08, z(-0.15, 0.08)], [-0.2, -0.12, z(-0.2, -0.12) + 0.02]];
      b.add('hips', sweep(sash, { w: 0.006, h: 0.04, up: [0, 0, 1], sides: 4, p: 6, segs: 14 }), p2 ? 'cloth_red|t=5a3030' : 'cloth_red|t=d09088', { skin: trunkSkin });
      for (const off of [0.036, -0.036]) b.add('hips', sweep(sash.map(([x, y, zz]) => [x + off * 0.6, y + off * 0.8, zz + 0.004] as V3), { r: 0.004, sides: 4, segs: 14 }), p2 ? 'timber_burnt' : M.gold, { skin: trunkSkin });
      if (!p2) b.add('hips', xf(torus(0.028, 0.008, 6, 14), { p: [-0.2, -0.12, z(-0.2, -0.12) + 0.03] }), M.gold, { skin: trunkSkin });
      // pauldrons: both in the Victory; the left one torn away in the Defeat
      pauldrons(b, { mat: steel, trim: M.bronze, size: 1.1, lames: 3, style: 'tall' });
      if (p2) b.add('shoulderL', xf(torus(0.07, 0.01, 5, 12), { p: [0.05, 0.02, 0] }), M.leatherDark);
      addArms(b, sex, 'cloth_red|t=7a4a44', { inflate: 0.012 });
      armPlates(b, sex, { mat: steel, trim: M.bronze, rerebrace: true, crack: p2 ? 1.2 : 0 });
      addHands(b, 'gauntlet', steel, M.leatherDark);
      addLegs(b, sex, 'cloth_red|t=5a3a34', { inflate: 0.012 });
      legPlates(b, sex, { mat: steel, trim: M.bronze, cuisse: true });
      addFeet(b, sex, 'sabaton', M.leatherDark, steel);
      // head: braided fair hair, a scar across the left cheek, bare-headed
      addHead(b, { sex, hair: 'fair', style: 'braid', unlived: p2, skin: 'skin|t=d8b8a0' });
      b.add('head', sweep([[0.028, 0.075, 0.082], [0.045, 0.05, 0.078], [0.056, 0.022, 0.07]], { r: 0.0028, sides: 4, segs: 6 }), 'skin|t=9a6a5a');
      // a marshal's circlet of bronze
      b.add('head', xf(torus(0.098, 0.0055, 5, 28), { p: [0, 0.155, 0.004], r: [Math.PI / 2 - 0.12, 0, 0] }), M.bronze);
      cloak(b, p2 ? 'rag' : 'long', { mat: p2 ? 'cloth_red|t=5a2a26' : 'cloth_red|t=a04a40', pad: 0.06, seed: seed + 11, heraldry: !p2 });
      if (p2) drapeChain(b, 'hips', [[-0.16, 0.12, z(-0.16, 0.12)], [-0.12, -0.05, z(-0.12, -0.05)]], M.gold, 0.02, trunkSkin);
      break;
    }
  }
  return b.build();
}

for (const look of ['pikeman', 'crossbowman', 'sapper', 'siegeKnight', 'twiceSlain', 'cannonCrew', 'armyLiving', 'oderic', 'oderic2', 'varr', 'varr2']) {
  registerEnemyLook(look, (rig, seed) => build(look, rig, seed));
}
/** The Greyford soldier of the Unlived Muster standing at the victory monument. */
registerNpcLook('armyMuster', (rig) => models.buildEnemy(rig, 'greyfordSoldier', 4));

// ====================================================================== weapons

function scaledY(base: WeaponModelExt, k: number): WeaponModelExt {
  base.object.scale.set(1, k, 1);
  return {
    ...base,
    hit: base.hit ? { from: base.hit.from * k, to: base.hit.to * k, radius: base.hit.radius } : null,
    trail: base.trail ? { from: base.trail.from * k, to: base.trail.to * k } : undefined,
    offhandGrip: base.offhandGrip !== undefined ? base.offhandGrip * k : undefined,
  };
}
const mesh = (g: THREE.BufferGeometry, key: string) => { const m = new THREE.Mesh(g, weaponMaterial(key)); m.castShadow = true; return m; };

registerWeaponModel('army_pike', () => scaledY(buildWeapon('enemy_spear'), 1.45));
registerWeaponModel('army_pavise', () => {
  const w = buildWeapon('tower_shield');
  const face = mesh(new THREE.PlaneGeometry(0.46, 0.62), M.army);
  face.position.set(0, 0.06, 0.07);
  w.object.add(face);
  w.object.scale.set(1.15, 1.1, 1);
  return w;
});
registerWeaponModel('army_rammer', () => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.022, 2.0, 7).translate(0, 0.45, 0), 'timber_dark'));
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 10).translate(0, 1.5, 0), 'cloth_brown|t=4a4038'));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10).translate(0, 1.36, 0), 'iron'));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6).translate(0, -0.6, 0), 'iron'));
  return { object: g, hit: { from: 1.1, to: 1.62, radius: 0.1 }, trail: { from: 1.2, to: 1.6 }, offhandGrip: 0.5, triangles: 200 };
});
function ramMaul(scale: number): WeaponModelExt {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.9, 9).translate(0, 0.4, 0), 'timber_dark'));
  for (const y of [-0.3, 0.2, 0.75]) g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 9).translate(0, y, 0), 'iron'));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.5, 12).translate(0, 1.4, 0), 'iron'));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12).translate(0, 1.2, 0), 'bronze'));
  // the ram's face and horns (bronze)
  g.add(mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.65, 0), 'bronze'));
  for (const s of [1, -1]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 1.5; pts.push([s * (0.17 + (1 - Math.cos(a)) * 0.08), 1.45 + Math.sin(a) * 0.1, -(1 - Math.cos(a)) * 0.06 + i * 0.01]); }
    g.add(mesh(sweep(pts, { r: 0.035, sides: 6, segs: 16, caps: true }), 'bronze'));
  }
  g.add(mesh(cyl(0.015, 0.015, -0.6, -0.5, 6), 'iron'));
  g.scale.setScalar(scale);
  return { object: g, hit: { from: 1.0 * scale, to: 1.75 * scale, radius: 0.24 * scale }, trail: { from: 1.1 * scale, to: 1.7 * scale }, offhandGrip: 0.62 * scale, triangles: 900 };
}
registerWeaponModel('oderic_ram', () => ramMaul(1.0));
registerWeaponModel('ram_knight_maul', () => ramMaul(0.82));
registerWeaponModel('varr_halberd', () => {
  const w = buildWeapon('gatewarden_halberd');
  const pen = new THREE.PlaneGeometry(0.34, 0.16, 6, 2);
  const p = pen.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.17; p.setX(i, x); p.setZ(i, Math.sin(x * 20) * 0.02); p.setY(i, p.getY(i) * (1 - x * 1.6)); }
  pen.computeVertexNormals();
  pen.rotateY(Math.PI / 2);
  const m = mesh(pen, 'cloth_red|t=d09088|ds');
  m.position.set(0, 1.12, -0.02);
  w.object.add(m);
  w.object.add(mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 12).rotateX(Math.PI / 2).translate(0, 1.2, 0), M.gold));
  return w;
});
