/**
 * NPC looks for the Academy that must also exist outside the region (the Hospice): Ansel Wick,
 * the expelled scholar, and Corporal Fenn of the Greyford muster. Registered at meta load.
 */
import { registerNpcLook, CharBuilder } from '../../actors/models';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet } from '../../actors/models/anatomy';
import { M, robeSkirt, belt, bandolier, mantle, trunkZ } from '../../actors/models/gear';
import { buildLook } from '../../actors/models/character';
import { trunkSkin } from '../../actors/models/builder';
import { xf, box, cyl, merge, torus } from '../../actors/models/parts';

/** Ansel Wick: young, thin scholar in a stripped student gown (the collar torn off), ink to the elbows. */
function anselWick(b: CharBuilder) {
  const sex = 'm';
  const GOWN = 'cloth_black|t=8a8c98';
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'dark', style: 'shaggy', beard: 'stubble' });
  addTrunk(b, sex, 'cloth_linen|t=b8b0a0', { y0: -0.16, y1: 0.55, inflate: 0.008 });
  addShoulders(b, sex, GOWN, 0.014);
  addTrunk(b, sex, GOWN, { y0: -0.04, y1: 0.52, inflate: 0.02 });
  robeSkirt(b, sex, { mat: GOWN, y0: 0.06, hem: -0.78, r1: [0.26, 0.22], open: 0.9, tatter: 0.16, cols: 20, rows: 10 });
  belt(b, sex, { y: 0.1, over: 0.035, pouches: 2, mat: M.leatherDark });
  bandolier(b, sex, { over: 0.05, mat: M.leather, width: 0.022 });
  // satchel of papers at the hip
  b.add('hips', xf(merge([box(0.2, 0.16, 0.06), xf(box(0.19, 0.03, 0.065), { p: [0, 0.07, 0.003] })]), { p: [-0.2, -0.06, 0.02], r: [0, -1.2, 0.05] }), M.leather, { skin: (p) => [['hips', 0.7], ['thighR', 0.3 * Math.max(0, -p.y * 4)]] });
  b.add('hips', xf(box(0.16, 0.012, 0.05), { p: [-0.2, 0.03, 0.02], r: [0.1, -1.2, 0.05] }), 'parchment', { skin: trunkSkin });
  // a lens on a cord round the neck
  b.add('chest', xf(torus(0.022, 0.004, 4, 12), { p: [0.02, 0.1, trunkZ(sex, b.shoulder, 0.02, 0.36, 1, 0.03) - 0.02] }), M.bronze);
  b.add('chest', xf(cyl(0.02, 0.02, -0.002, 0.002, 10), { p: [0.02, 0.1, trunkZ(sex, b.shoulder, 0.02, 0.36, 1, 0.03) - 0.02], r: [Math.PI / 2, 0, 0] }), 'glass');
  addArms(b, sex, GOWN, { inflate: 0.012, foreY1: -0.1 });
  addArms(b, sex, 'cloth_linen|t=b8b0a0', { upper: false, inflate: 0.004 });
  addHands(b, 'bare', 'skin|t=8a8a98');
  addLegs(b, sex, 'cloth_brown|t=5a5048', { inflate: 0.01 });
  addFeet(b, sex, 'boot', M.leatherDark);
}

/** Corporal Fenn: Unlived Greyford soldier, helm in his lap, the muster's faded blue-grey. */
function corporalFenn(b: CharBuilder) {
  b.cracks = 0.4;
  b.ghost = null;
  buildLook(b, { head: 'none', body: 'greyford', arms: 'greyford', legs: 'greyford', cloak: false, hair: 'fair' }, { unlived: true, variant: 3 });
  mantle(b, 'm', { mat: 'cloth_blue|t=7a8898', len: 0.2, tatter: 0.3 });
}

registerNpcLook('anselWick', (rig) => { const b = new CharBuilder(rig, 'npc', 4111); anselWick(b); return b.build(); });
registerNpcLook('corporalFenn', (rig) => { const b = new CharBuilder(rig, 'npc', 4127); corporalFenn(b); return b.build(); });
