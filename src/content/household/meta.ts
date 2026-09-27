/**
 * household — always-loaded metadata (owned by the household region build): items, techniques,
 * journal leads, text (areas, Stillbell names, boss names, inspectables, hints, warnings), the
 * Hospice guest (Wynn Harrow, the page) with his shop, his look and his Hospice lines, and the
 * Final Memory rewards. No geometry is built here; the page's look builder only runs at the Hospice.
 */
import type { ItemDef } from '../../game/types';
import { registerItems, SHOP_STOCK, ARMOR_LOOKS } from '../items';
import { registerLeads } from '../journal';
import { registerText } from '../text';
import { registerDialogue } from '../dialogue';
import { registerHospiceGuest } from '../../game/regions/hub';
import { registerNpcLook, registerWeaponModel, CharBuilder } from '../../actors/models';
import { buildWeapon } from '../../actors/models/weapons';
import { addTrunk, addArms, addLegs, addShoulders, addNeck, addHead, addHands, addFeet } from '../../actors/models/anatomy';
import { M, tabard, belt } from '../../actors/models/gear';
import { loft } from '../../actors/models/parts';

// ============================================================================ items

const I = (d: Omit<ItemDef, 'icon'> & { icon?: string }): ItemDef => ({ ...d, icon: d.icon ?? d.id });
const SLOT_SHARE = { head: 0.2, body: 0.44, arms: 0.14, legs: 0.22 } as const;
const guardSet: [keyof typeof SLOT_SHARE, string, string, string, string][] = [
  ['head', 'household_guard_helm', 'Household Guard Helm', 'A visored bascinet with a red crest, blackened and parcel-gilt. Heavy; a narrow view.', 'Issued to the guard of the state rooms, who were forbidden to look at the heir they guarded. The visor made it easy.'],
  ['body', 'household_guard_plate', 'Household Guard Plate', 'Blackened plate under the royal tabard, with a white baldric. Strong, and hard to stagger.', 'The baldric marks a guard who has stood at a coronation. This one has three knots in it.'],
  ['arms', 'household_guard_gauntlets', 'Household Guard Gauntlets', 'Blackened gauntlets with gilt cuffs.', 'The gilt is on the inside of the cuff, where only the wearer sees it. Loyalty, the Household said, is a private ornament.'],
  ['legs', 'household_guard_greaves', 'Household Guard Greaves', 'Blackened greaves and sabatons, quiet on marble.', 'State-room guards were taught to cross a floor so softly that the portraits would not notice.'],
];
const GUARD_TOTALS = { weight: 30, poise: 36, physical: 42, magic: 18, fire: 22 };

registerItems([
  I({
    id: 'ardent_longsword', name: 'Ardent Longsword', kind: 'weapon', weight: 5.5,
    description: 'Dame Celwyn\'s longsword: long in the grip, quick in the point. It rewards varied, patient play; its technique parries with the blade itself.',
    lore: 'The master-at-arms of the Household taught with this sword for twenty years. Every student remembers its first lesson: the third cut is always the one you will regret.',
    weapon: { class: 'straightSword', damage: { physical: 138, magic: 0, fire: 0 }, scaling: { strength: 'C', dexterity: 'C' }, requirements: { strength: 14, dexterity: 14 }, criticalMult: 3.1, postureMult: 1.15, technique: 'vow_parry', maxUpgrade: 10 },
  }),
  I({
    id: 'ardent_heater', name: 'Ardent Heater', kind: 'shield', weight: 5,
    description: 'A heater shield faced with the royal arms. Guards all physical damage; its technique is Riposte Stance.',
    lore: 'Dame Celwyn carried it only on coronation days, and never once raised it. She said a shield is a promise, and a promise is best not tested in public.',
    shield: { physicalGuard: 100, magicGuard: 60, stability: 72, technique: 'riposte_stance' },
  }),
  ...guardSet.map(([slot, id, name, description, lore]) => I({
    id, name, kind: 'armor', armorSet: 'retainer', description, lore,
    weight: Math.round(GUARD_TOTALS.weight * SLOT_SHARE[slot] * 10) / 10,
    armor: { slot, physical: Math.round(GUARD_TOTALS.physical * SLOT_SHARE[slot]), magic: Math.round(GUARD_TOTALS.magic * SLOT_SHARE[slot]), fire: Math.round(GUARD_TOTALS.fire * SLOT_SHARE[slot]), poise: Math.round(GUARD_TOTALS.poise * SLOT_SHARE[slot]) },
  })),
  I({
    id: 'hh_signet', name: 'Signet of Two Claims', kind: 'key',
    description: 'A seal ring cut with two crowns back to back. Opens the sealed door of the throne room onto the Bell Stair.',
    lore: 'The Twin Heirs each wore half of it. The door to the Great Bell would open only for a single claim, so it never opened at all.',
  }),
  I({
    id: 'hh_cellar_key', name: 'Buttery Key', kind: 'key', price: 900,
    description: 'Opens the locked buttery off the palace kitchens.',
    lore: 'Wynn Harrow kept it on a string inside his collar, as pages did. "The steward trusted me with the wine," he says, "and with nothing else."',
  }),
  I({
    id: 'hh_greyford_colour', name: 'Greyford Colour', kind: 'key',
    description: 'A company colour of the Greyford muster, torn from its staff. A soldier of the muster in the Servants\' Yard is looking for it.',
    lore: 'Blue-grey silk, river-stained. It was buried with an heir of the Elder Claim, folded under his hands as though it were his own.',
  }),
  I({
    id: 'memory_celwyn', name: 'Final Memory of Dame Celwyn', kind: 'memory',
    description: 'At a Stillbell, exchange it for one of several rewards: her longsword, her shield, or a great sum of Hours.',
    lore: 'The last thing she saw was the student she taught to guard the crown, guarding something else. She did not think him wrong. She thought him late.',
    memory: { boss: 'celwyn' },
  }),
]);
Object.assign(ARMOR_LOOKS, Object.fromEntries(guardSet.map(([, id]) => [id, 'retainer'])));
registerWeaponModel('ardent_heater', () => buildWeapon('household_shield'));

SHOP_STOCK.wynn = [
  { itemId: 'hh_cellar_key', stock: 1 },
  { itemId: 'throwing_knife', stock: 30 },
  { itemId: 'ember_resin', stock: 6 },
  { itemId: 'bellbronze_scrap', stock: 3 },
  { itemId: 'tempered_scrap', stock: null },
];

// ============================================================================ journal

registerLeads({
  household_postern: {
    title: 'The Postern Page',
    region: 'The Garden Court',
    entries: {
      mem_postern: {
        category: 'remembered',
        text: 'The night the palace fell, a page opened the garden postern for the enemy\'s riders. They hanged him from the orangery beam in the morning. I remember his shoes: too big for him.',
      },
      obs_coerced: {
        category: 'observed',
        text: 'The page is Wynn Harrow. A masked courtier keeps him on his knees in the linen room, hands tied, and talks to him about his mother as if she were a debt.',
        contradicts: 'mem_postern',
        contradictionNote: 'He did not open it willingly. He was being made to.',
      },
      obs_wax: {
        category: 'observed',
        text: 'On the linen table: a wax impression of the postern key under a courtier\'s seal, and a list of the guard changes at the garden door.',
      },
      conf_freed: {
        category: 'confirmed',
        text: 'Wynn Harrow is free. The postern is barred from inside, and he has gone to the Hospice of the Quiet Hour with a string of keys and a great deal to say.',
        sets: 'resolved',
      },
      conf_taken: {
        category: 'confirmed',
        text: 'The linen room is empty. The postern stands open onto the lane, the wax key is gone, and the page\'s cap lies on the threshold.',
        loss: true,
        sets: 'lost',
      },
    },
  },
  household_celwyn: {
    title: 'The Master-at-Arms',
    region: 'The Garden Court',
    entries: {
      mem_training: {
        category: 'remembered',
        text: 'Dame Celwyn Ardent taught me the sword in the Household\'s yard. In the future I remember, she held the Bell Terrace for the King to the last and would not say why.',
      },
      obs_reads: {
        category: 'observed',
        text: 'She still reads me. Two cuts in one breath and she is waiting for the third; the same blow twice and she has it. A different blow into her guard catches her out.',
      },
      obs_answer_crown: { category: 'observed', text: 'I told her I came to silence the bell for the crown\'s sake. She said the crown had already chosen, and that loyalty is loyalty to its choices, even the terrible ones.' },
      obs_answer_people: { category: 'observed', text: 'I told her I was protecting the people, not the crown. She said I had learned half of what she taught me, and the easier half.' },
      obs_answer_silence: { category: 'observed', text: 'I did not answer her. She said silence was the one habit of mine she had never managed to break.' },
      conf_celwyn: {
        category: 'confirmed',
        text: 'Dame Celwyn has fallen on the Bell Terrace. The Household\'s Great Bell hangs silent, its anchor broken; the gold has gone out of the cracks.',
        sets: 'resolved',
      },
    },
  },
  household_successions: {
    title: 'Three Coronations',
    region: 'The Garden Court',
    entries: {
      mem_coronation: {
        category: 'remembered',
        text: 'I stood guard at one coronation in this palace: one heir, one crown, one morning of bells. I remember the heir\'s name. I will not write it here.',
      },
      obs_thrones: {
        category: 'observed',
        text: 'The throne room is laid for three coronations at once: three thrones, three carpets, three sets of banners. The orders of service are dated to the same morning.',
        contradicts: 'mem_coronation',
        contradictionNote: 'Three heirs were crowned on the morning I remember as one.',
      },
      obs_portraits: { category: 'observed', text: 'A gallery of portraits of heirs who never reigned. One canvas has been veiled in mourning black, and the hook behind it holds something that is not a painting.' },
      obs_graves: { category: 'observed', text: 'The hedge maze was planted over the graves of the Elder Claim. The headstones give reigns that no chronicle records.' },
      obs_heirs: { category: 'observed', text: 'Casimir and Corisande, the Twin Heirs, fought each other as fiercely as they fought me. Each wore half of a signet that only opens a door to one.' },
    },
  },
  household_muster: {
    title: 'The Muster at the Palace',
    region: 'The Garden Court',
    entries: {
      obs_soldier: { category: 'observed', text: 'A Greyford soldier waits in the Servants\' Yard, looking for his company\'s colour. He says it was buried with a prince who was never a soldier.' },
      conf_muster: { category: 'confirmed', text: 'I returned the Greyford colour. Corporal Aske will stand with the muster when it is called.', sets: 'resolved' },
    },
  },
});

// ============================================================================ text

registerText({
  stillbells: { 'household.gate': 'Servants\' Gate', 'household.orangery': 'The Orangery', 'household.throne': 'Antechamber of Successions' },
  areas: {
    hhYard: 'The Servants\' Yard', hhParterre: 'The Parterre', hhMaze: 'The Mourning Maze', hhTerrace: 'The Palace Terrace',
    hhKitchen: 'Palace Kitchens', hhPassages: 'The Servants\' Passages', hhGallery: 'Gallery of Unreigned Heirs', hhHall: 'Hall of Three Feasts',
    hhAnte: 'Antechamber of Successions', hhThrone: 'Throne Room of Three Coronations', hhOrangery: 'The Orangery', hhHeirs: 'Court of Two Claims',
    hhLoggia: 'The East Loggia', hhBellStair: 'The Bell Stair', hhBellTerrace: 'Terrace of the Great Bell',
  },
  bosses: {
    celwyn: { name: 'Dame Celwyn Ardent', title: 'Master-at-Arms of the Household' },
    heirs: { name: 'The Twin Heirs', title: 'Casimir, Heir by Law · Corisande, Heir by Blood' },
    heirs_blood: { name: 'Corisande, Heir by Blood', title: 'The Younger Claim' },
  },
  hints: {
    hh_parryStance: 'Household retainers read repeated light attacks. When the blade comes up crosswise, stop, change your rhythm, or break the stance with a heavy attack, a technique or a spell.',
    hh_celwynReads: 'Dame Celwyn reads your habits. Her crosswise stance waits for the attack she expects; give her a different one and she is caught out.',
    hh_grab: 'An open hand over a foe means a grab: it cannot be blocked or parried. Roll through it or step away.',
    hh_ghost: 'Succession ghosts move between two places. Motes gather where one will reappear.',
  },
  inspect: {
    hh_postern: { title: 'The Garden Postern', lines: ['A low oak door onto the lane behind the kitchens.', 'The hinges have been oiled very recently. The bar that should lie across it is leaning in the corner.'] },
    hh_wax: { title: 'On the Linen Table', lines: ['A cake of wax with the impression of a key pressed into it, wrapped in a note under a courtier\'s seal.', '"The garden door, the second watch. His mother\'s debt is forgiven when the door is open."'] },
    hh_page_cap: { title: 'A Page\'s Cap', lines: ['A red livery cap, trodden into the lane.', 'The lining is stitched with a name: W. Harrow.'] },
    hh_portraits: { title: 'Gallery of Unreigned Heirs', lines: ['Heirs in coronation robes, each painted as if already crowned. None of their names appear in any list of kings.', 'The fourth canvas is veiled in black crape. Something hangs on the hook behind it.'] },
    hh_rolls: { title: 'Coronation Rolls', lines: ['Three orders of service for a coronation, each in a different clerk\'s hand.', 'All three are dated to the same morning. Each names a different heir. Each is signed by the same Lord Chamberlain.'] },
    hh_thrones: { title: 'Three Thrones', lines: ['Three thrones stand on one dais, each dressed for its own coronation: red for the Elder Claim, blue for the Younger, black and gilt for a third that has no name.', 'Three carpets run from the door. You cannot walk all three.'] },
    hh_statues: { title: 'The Avenue of Heirs', lines: ['Statues of heirs line the avenue, each with a plaque naming a reign.', 'The reigns overlap. Several begin in the same year. None of them end.'] },
    hh_graves: { title: 'Graves of the Elder Claim', lines: ['Headstones under the hedges, their inscriptions giving reigns that no chronicle records.', 'The hedges were planted in rows over them, and clipped every autumn since.'] },
    hh_orangery_beam: { title: 'The Orangery Beam', lines: ['An iron beam across the glass roof, hung with lamps.', 'In the morning you remember, a rope hung from it instead.'] },
    hh_kitchen_bolted: { title: 'Kitchen Door', lines: ['A heavy door into the palace kitchens. It is bolted from the other side.'] },
    hh_buttery_locked: { title: 'The Buttery', lines: ['A stout door with a newer lock. The steward\'s wine, and whatever else the steward thought worth locking up.', 'The palace pages carried the keys.'] },
    hh_signet_locked: { title: 'The Sealed Door', lines: ['Two seals are pressed into the lock plate, each with half a crown.', 'The door wants both halves of a single ring.'] },
    hh_bell: { title: 'The Household Great Bell', lines: ['The Great Bell of the Household hangs in its frame, cracked through with gold.', 'Four chains of light run from its rim down to a gilt reliquary on the terrace.'] },
  },
  warnings: {
    hh_heirs_page: {
      title: 'The Twin Heirs Wait',
      body: 'Beyond this veil the Twin Heirs contest the succession. While you fight, the masked courtier in the servants\' passages will finish his business with the page. Cross now?',
      yes: 'Cross', no: 'Not yet',
    },
    hh_celwyn_page: {
      title: 'Dame Celwyn Waits',
      body: 'Beyond this veil, Dame Celwyn Ardent waits by the Great Bell. The page in the servants\' passages has not been freed; this is the last chance to go back for him. Cross now?',
      yes: 'Cross', no: 'Not yet',
    },
  },
  memoryRewards: {
    memory_celwyn: [
      { id: 'ardent_longsword', name: 'Ardent Longsword', icon: 'ardent_longsword', kind: 'weapon', description: 'Her longsword. Carries Vow Parry (parry with the blade). Requires 14 Strength and 14 Dexterity.' },
      { id: 'ardent_heater', name: 'Ardent Heater', icon: 'ardent_heater', kind: 'item', description: 'Her coronation shield: full physical guard, high stability, and the Riposte Stance technique.' },
      { id: 'hours:16000', name: '16,000 Hours', icon: 'hours', kind: 'hours', description: 'Let the lesson go, and keep the time it held.' },
    ],
  },
});

// ============================================================================ the page at the Hospice (guest)

const WYNN = 'Wynn Harrow';
const RETURNED = 'The Returned';
registerDialogue({
  wynn_hospice_first: [
    { speaker: WYNN, text: 'You came. I thought people like you only arrived in ballads, and then too late.' },
    { speaker: WYNN, text: 'The old healer gave me a blanket and a job. I think the blanket was the job.' },
    { speaker: RETURNED, text: 'What did the courtier want with the postern?' },
    { speaker: WYNN, text: 'A door open at the second watch. He never said for whom. He said my mother\'s debt would be forgiven. I don\'t think she has a debt.' },
    { speaker: WYNN, text: 'I kept the pages\' keys. The buttery, the linen press, the old stair. If you want any of them, they\'re yours for what they cost the steward.' },
  ],
  wynn_hospice_idle: [
    { speaker: WYNN, text: 'Pages learn every door in a palace. Nobody teaches us which ones to leave shut.', duration: 4.5 },
    { speaker: WYNN, text: 'Dame Celwyn used to watch us drill from the gallery. She always knew who was going to drop his guard.', duration: 4.5 },
    { speaker: WYNN, text: 'The buttery key is on the string. The steward kept the good wine behind the bad.', duration: 4 },
    { speaker: WYNN, text: 'I dream about the orangery. I don\'t know why. I never liked oranges.', duration: 4 },
  ],
});

/** Wynn Harrow's look (also used in the region): a small page in livery with a soft red cap. */
function pageLook(rig: import('../../actors/Rig').Rig) {
  const b = new CharBuilder(rig, 'npc', 9011);
  const sex = 'm';
  addNeck(b, sex, 'skin');
  addHead(b, { sex, hair: 'fair', style: 'shaggy', beard: 'none' });
  b.add('head', loft([{ y: 0.24, rx: 0.07, rz: 0.08, cz: -0.02 }, { y: 0.2, rx: 0.1, rz: 0.115, cz: -0.01 }, { y: 0.16, rx: 0.1, rz: 0.113, cz: 0.004 }], { segs: 16, capTop: true }), 'cloth_red|t=a07070');
  addTrunk(b, sex, 'cloth_linen|t=c8c0b0', { y0: -0.16, y1: 0.56, inflate: 0.01 });
  addShoulders(b, sex, 'cloth_linen|t=c8c0b0', 0.01);
  tabard(b, sex, { mat: 'cloth_red|t=9a6a68', top: 0.5, hem: -0.36, over: 0.03, w: [0.1, 0.12, 0.13], heraldry: 'arms', tatter: 0.02, trim: M.gold });
  belt(b, sex, { y: 0.1, over: 0.035, pouches: 1 });
  addArms(b, sex, 'cloth_linen|t=c8c0b0', { inflate: 0.01 });
  addHands(b, 'bare', 'skin');
  addLegs(b, sex, 'cloth_blue|t=4a5470', { inflate: 0.006 });
  addFeet(b, sex, 'boot', M.leather);
  return b.build();
}
registerNpcLook('wynn', (rig) => pageLook(rig));

registerHospiceGuest({
  id: 'wynn', name: WYNN, look: 'wynn', idle: 'standPray',
  present: (ws) => ws.npcs.wynn === 'rescued',
  greet: 'wynn_hospice_first', idlePool: 'wynn_hospice_idle', shop: 'wynn',
});
