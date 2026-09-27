/**
 * Item and Imprint Technique definitions for Ashbridge and the first act.
 * Icons are the item id (drawn procedurally by the UI; unknown ids fall back by kind).
 * Numbers follow docs/GDD.md §4–5. Where items are found: see ACQUISITION in ./text.ts.
 */
import type { ItemDef, TechniqueDef, ArmorSlot, WeaponClass } from '../game/types';
import type { ArmorLook } from '../actors/models/contract';

type Def = Omit<ItemDef, 'icon'> & { icon?: string };

// ------------------------------------------------------------------ techniques

const MELEE: WeaponClass[] = [
  'straightSword', 'curvedSword', 'greatsword', 'dagger', 'estoc', 'axe', 'mace', 'hammer', 'flail',
  'spear', 'halberd', 'censer', 'fist',
];

export const TECHNIQUES: Record<string, TechniqueDef> = {
  oathbound_lunge: {
    id: 'oathbound_lunge', name: 'Oathbound Lunge', icon: 'oathbound_lunge', focus: 18, stamina: 22,
    compatible: ['straightSword', 'curvedSword', 'estoc', 'spear'],
    source: 'Retainer Sword',
    description: 'Step in with a straight, driving thrust that deals heavy posture damage. Closes distance faster than a foe expects.',
  },
  bulwark_toll: {
    id: 'bulwark_toll', name: 'Bulwark Toll', icon: 'bulwark_toll', focus: 12, stamina: 20,
    compatible: ['shield'],
    source: 'Household Shield',
    description: 'Strike with the face of the shield. The blow rings like a bell, staggers the target and can break a raised guard.',
  },
  bellglass_ward: {
    id: 'bellglass_ward', name: 'Bellglass Ward', icon: 'bellglass_ward', focus: 22, stamina: 10,
    compatible: ['staff', 'bell', 'censer'],
    source: 'Court Staff',
    description: 'Raise a ward of ringing glass for 2.5 seconds. Damage taken is halved and poise is raised while it lasts.',
  },
  measured_cut: {
    id: 'measured_cut', name: 'Measured Cut', icon: 'measured_cut', focus: 20, stamina: 26,
    compatible: ['straightSword', 'curvedSword', 'greatsword'],
    source: 'Commander\'s Blade; Final Memory of Ser Corvane',
    description: 'Dash forward with two measured cuts, the second heavier than the first. The Commander\'s own opening.',
  },
  riposte_stance: {
    id: 'riposte_stance', name: 'Riposte Stance', icon: 'riposte_stance', focus: 10, stamina: 12,
    compatible: ['shield', 'dagger'],
    source: 'Mint Buckler',
    description: 'Hold to settle into a low guard. A blow that lands while you wait is turned aside and answered with a counter-thrust.',
  },
  bell_breaker: {
    id: 'bell_breaker', name: 'Bell Breaker', icon: 'bell_breaker', focus: 24, stamina: 32,
    compatible: ['greatsword', 'hammer', 'axe', 'mace'],
    source: 'Bellwarden Greatsword',
    description: 'Leap and bring the weapon down in a crushing overhead. Enormous posture damage; long recovery if it misses.',
  },
  rending_sweep: {
    id: 'rending_sweep', name: 'Rending Sweep', icon: 'rending_sweep', focus: 20, stamina: 30,
    compatible: ['halberd', 'spear', 'greatsword'],
    source: 'Gatewarden Halberd',
    description: 'Turn on the heel in one wide sweep that strikes everything around you. Made for crowds, not duels.',
  },
  greyford_flourish: {
    id: 'greyford_flourish', name: 'Greyford Flourish', icon: 'greyford_flourish', focus: 14, stamina: 20,
    compatible: ['curvedSword', 'dagger'],
    source: 'Greyford Sabre',
    description: 'Three quick slashes in a rising line. Light damage each, but hard to interrupt once begun.',
  },
  knell_strike: {
    id: 'knell_strike', name: 'Grave Knell', icon: 'knell_strike', focus: 18, stamina: 28,
    compatible: ['mace', 'hammer', 'bell'],
    source: 'Mourning Mace',
    description: 'Hold to gather force, then strike. The blow tolls on impact and deals heavy posture damage to the target and those beside it.',
  },
  chain_whirl: {
    id: 'chain_whirl', name: 'Unbroken Links', icon: 'chain_whirl', focus: 16, stamina: 30,
    compatible: ['flail'],
    source: 'Condemned Chain',
    description: 'Whirl the chain in a wide circle, striking everything around you. Poise holds while it turns.',
  },
  pinning_shot: {
    id: 'pinning_shot', name: 'Pinning Shot', icon: 'pinning_shot', focus: 12, stamina: 16,
    compatible: ['bow', 'crossbow'],
    source: 'Garrison Arbalest',
    description: 'Loose a barbed shot at the legs. A foe it strikes is rooted in place for a moment; bosses only stumble.',
  },
  impaling_charge: {
    id: 'impaling_charge', name: 'Impaling Charge', icon: 'impaling_charge', focus: 20, stamina: 28,
    compatible: ['spear', 'halberd'],
    source: 'Garrison Spear',
    description: 'Run forward with the point levelled. The longer the charge, the harder it lands.',
  },
  ember_edge: {
    id: 'ember_edge', name: 'Ember Edge', icon: 'ember_edge', focus: 8, stamina: 6,
    compatible: MELEE,
    source: 'Woodsman\'s Axe',
    description: 'Draw the weapon through a pinch of resin and set it smouldering. Adds fire damage for 20 seconds; cheap in focus.',
  },
  vow_parry: {
    id: 'vow_parry', name: 'Vow Parry', icon: 'vow_parry', focus: 10, stamina: 12,
    compatible: ['estoc', 'straightSword'],
    source: 'Later: Royal Household',
    description: 'Parry with the blade itself. The window is slightly longer than a dirk\'s; a success opens a riposte.',
  },
  vow_pursuit: {
    id: 'vow_pursuit', name: 'Vow\'s Pursuit', icon: 'vow_pursuit', focus: 16, stamina: 24,
    compatible: ['estoc', 'spear'],
    source: 'Oath Estoc',
    description: 'Advance with a rapid string of thrusts that keeps pressure on a retreating foe. The last thrust pierces a raised guard.',
  },
  stilled_breath: {
    id: 'stilled_breath', name: 'Stilled Breath', icon: 'stilled_breath', focus: 14, stamina: 18,
    compatible: ['bow', 'crossbow'],
    source: 'Huntsman\'s Shortbow',
    description: 'Hold still and draw to the ear. The next shot flies faster and farther and deals greater damage.',
  },
};

// ------------------------------------------------------------------ armour helper

/** Share of a set's totals carried by each slot. */
const SLOT_SHARE: Record<ArmorSlot, number> = { head: 0.2, body: 0.44, arms: 0.14, legs: 0.22 };
const SLOTS: ArmorSlot[] = ['head', 'body', 'arms', 'legs'];

interface SetTotals { weight: number; poise: number; physical: number; magic: number; fire: number }
/** [id, name, description, lore] in slot order head, body, arms, legs. */
type Piece = [string, string, string, string];

function armorSet(set: ArmorLook, t: SetTotals, pieces: [Piece, Piece, Piece, Piece]): Def[] {
  return pieces.map(([id, name, description, lore], i) => {
    const slot = SLOTS[i];
    const s = SLOT_SHARE[slot];
    return {
      id, name, kind: 'armor', armorSet: set, description, lore,
      weight: Math.round(t.weight * s * 10) / 10,
      armor: {
        slot,
        physical: Math.round(t.physical * s), magic: Math.round(t.magic * s), fire: Math.round(t.fire * s),
        poise: Math.round(t.poise * s),
      },
    };
  });
}

/** Imprint scroll for a technique: id `imprint_<techniqueId>`. */
function imprint(tech: string, description: string, lore: string, price?: number): Def {
  const t = TECHNIQUES[tech];
  return { id: `imprint_${tech}`, name: `Imprint: ${t.name}`, kind: 'imprint', imprint: { technique: tech }, description, lore, price };
}

// ------------------------------------------------------------------ items

const DEFS: Def[] = [
  // ---------------------------------------------------------------- weapons
  {
    id: 'retainer_sword', name: 'Retainer Sword', kind: 'weapon', weight: 4,
    description: 'A plain, well-balanced straight sword. Quick in the hand and dependable against most foes.',
    lore: 'Issued to sworn retainers of the Household. The crossguard bears the royal bell, worn smooth by twenty years of oaths.',
    weapon: {
      class: 'straightSword', damage: { physical: 110, magic: 0, fire: 0 },
      scaling: { strength: 'D', dexterity: 'D' }, requirements: { strength: 10, dexterity: 9 },
      criticalMult: 3.0, postureMult: 1.0, technique: 'oathbound_lunge', maxUpgrade: 10,
    },
  },
  {
    id: 'commander_blade', name: 'Commander\'s Blade', kind: 'weapon', weight: 6,
    description: 'A long, heavy blade with a deep fuller. Slower than a retainer\'s sword, but each cut reaches further and hits harder.',
    lore: 'Ser Corvane Aldmoor\'s sword, forged when the Bell appointed him. It was never drawn against the enemy it was made for.',
    weapon: {
      class: 'straightSword', damage: { physical: 132, magic: 0, fire: 0 },
      scaling: { strength: 'C', dexterity: 'D' }, requirements: { strength: 14, dexterity: 11 },
      criticalMult: 3.0, postureMult: 1.2, technique: 'measured_cut', maxUpgrade: 10,
    },
  },
  {
    id: 'bellwarden_greatsword', name: 'Bellwarden Greatsword', kind: 'weapon', weight: 11,
    description: 'A two-handed blade as tall as its bearer. Slow to swing and slower to recover, but it breaks posture like nothing else.',
    lore: 'Bellwardens stood guard over the anchor-bells of the border forts. This one fell on the gate stair, still facing inward.',
    weapon: {
      class: 'greatsword', damage: { physical: 168, magic: 0, fire: 0 },
      scaling: { strength: 'B', dexterity: 'E' }, requirements: { strength: 18, dexterity: 10 },
      criticalMult: 2.6, postureMult: 1.8, technique: 'bell_breaker', maxUpgrade: 10,
    },
  },
  {
    id: 'garrison_spear', name: 'Garrison Spear', kind: 'weapon', weight: 4.5,
    description: 'An ash-shafted spear with a leaf blade. Long thrusts keep foes at a distance, and it can strike from behind a raised guard.',
    lore: 'Ashbridge\'s garrison drilled with these every morning. Their stand of spears was full; their muster roll was not.',
    weapon: {
      class: 'spear', damage: { physical: 104, magic: 0, fire: 0 },
      scaling: { strength: 'D', dexterity: 'C' }, requirements: { strength: 11, dexterity: 11 },
      criticalMult: 2.8, postureMult: 0.9, technique: 'impaling_charge', maxUpgrade: 10,
    },
  },
  {
    id: 'gatewarden_halberd', name: 'Gatewarden Halberd', kind: 'weapon', weight: 8,
    description: 'A halberd with a broad axe-head and a hooked spike. Wide sweeps that punish crowds and careless flanking.',
    lore: 'The Royal Army\'s gatewardens were chosen for height and silence. They were told a gate is only as strong as its worst night.',
    weapon: {
      class: 'halberd', damage: { physical: 140, magic: 0, fire: 0 },
      scaling: { strength: 'C', dexterity: 'D' }, requirements: { strength: 15, dexterity: 12 },
      criticalMult: 2.7, postureMult: 1.3, technique: 'rending_sweep', maxUpgrade: 10,
    },
  },
  {
    id: 'greyford_sabre', name: 'Greyford Sabre', kind: 'weapon', weight: 3,
    description: 'A light curved sword with a knuckle-bow. Fast, flowing cuts; poor against armour.',
    lore: 'Standard issue to the Greyford muster, a company raised for a war that was later decided never to have happened.',
    weapon: {
      class: 'curvedSword', damage: { physical: 102, magic: 0, fire: 0 },
      scaling: { strength: 'E', dexterity: 'C' }, requirements: { strength: 9, dexterity: 12 },
      criticalMult: 2.9, postureMult: 0.8, technique: 'greyford_flourish', maxUpgrade: 10,
    },
  },
  {
    id: 'coinbreaker_hammer', name: 'Coinbreaker Hammer', kind: 'weapon', weight: 9,
    description: 'A mint die-hammer, iron-headed and long in the haft. Crushing blows that shatter guards and posture.',
    lore: 'Used to strike the king\'s face into silver, and to break coins found false. The mint broke more than it struck in the last years.',
    weapon: {
      class: 'hammer', damage: { physical: 150, magic: 0, fire: 0 },
      scaling: { strength: 'B' }, requirements: { strength: 16 },
      criticalMult: 2.6, postureMult: 1.7, technique: 'knell_strike', maxUpgrade: 10,
    },
  },
  {
    id: 'woodsman_axe', name: 'Woodsman\'s Axe', kind: 'weapon', weight: 5,
    description: 'A felling axe with a bearded blade. Heavier cuts than a sword, with a shorter reach.',
    lore: 'Pine-sap still clings to the haft. Lower Street\'s woodcutters kept the town warm until a fire from an unfought war reached it.',
    weapon: {
      class: 'axe', damage: { physical: 122, magic: 0, fire: 0 },
      scaling: { strength: 'C', dexterity: 'D' }, requirements: { strength: 12, dexterity: 8 },
      criticalMult: 2.8, postureMult: 1.1, technique: 'ember_edge', maxUpgrade: 10,
    },
  },
  {
    id: 'oath_estoc', name: 'Oath Estoc', kind: 'weapon', weight: 3.5,
    description: 'A long, narrow thrusting blade. Reaches past a shield\'s edge and rewards patient, precise strikes.',
    lore: 'Oathblades swear on the blade itself, not on the crown. The vow is etched along the steel, too fine to read at arm\'s length.',
    weapon: {
      class: 'estoc', damage: { physical: 98, magic: 0, fire: 0 },
      scaling: { strength: 'E', dexterity: 'C' }, requirements: { strength: 8, dexterity: 13 },
      criticalMult: 3.2, postureMult: 0.9, technique: 'vow_pursuit', maxUpgrade: 10,
    },
  },
  {
    id: 'mourning_mace', name: 'Mourning Mace', kind: 'weapon', weight: 5,
    description: 'A flanged mace, bell-shaped at the head. Slow, but it batters guards and posture alike.',
    lore: 'Carried by funeral priests to close the doors of crypts. Its tolling on stone was the last sound many of the buried heard.',
    weapon: {
      class: 'mace', damage: { physical: 118, magic: 0, fire: 0 },
      scaling: { strength: 'C', devotion: 'E' }, requirements: { strength: 11 },
      criticalMult: 2.8, postureMult: 1.4, technique: 'knell_strike', maxUpgrade: 10,
    },
  },
  {
    id: 'condemned_chain', name: 'Condemned Chain', kind: 'weapon', weight: 6,
    description: 'A length of prison chain ending in an iron ball. Wide, heavy swings that are hard to block and harder to read.',
    lore: 'Struck from the ankle of a retainer condemned for a crime no record names. He kept the chain, and the grudge.',
    weapon: {
      class: 'flail', damage: { physical: 124, magic: 0, fire: 0 },
      scaling: { strength: 'C' }, requirements: { strength: 14, dexterity: 8 },
      criticalMult: 2.5, postureMult: 1.2, technique: 'chain_whirl', maxUpgrade: 10,
    },
  },
  {
    id: 'parrying_dirk', name: 'Parrying Dirk', kind: 'weapon', weight: 1.5,
    description: 'A short off-hand blade with a broad, notched guard. Held in the left hand, it parries quickly and cleanly.',
    lore: 'Court duellists wore these at the hip beside their seals. In the Household it was said a dirk settles more quarrels than a sword.',
    weapon: {
      class: 'dagger', damage: { physical: 72, magic: 0, fire: 0 },
      scaling: { dexterity: 'C' }, requirements: { strength: 5, dexterity: 9 },
      criticalMult: 3.4, postureMult: 0.6, technique: 'riposte_stance', maxUpgrade: 10,
    },
  },
  {
    id: 'skinning_knife', name: 'Skinning Knife', kind: 'weapon', weight: 1,
    description: 'A curved hunting knife. Very fast, with a long chain of cuts and a vicious critical.',
    lore: 'The royal huntsmen dressed the king\'s game with these. The antler grip is stamped with the forest warden\'s mark.',
    weapon: {
      class: 'dagger', damage: { physical: 68, magic: 0, fire: 0 },
      scaling: { strength: 'E', dexterity: 'C' }, requirements: { dexterity: 8 },
      criticalMult: 3.3, postureMult: 0.5, technique: 'greyford_flourish', maxUpgrade: 10,
    },
  },

  // ---------------------------------------------------------------- catalysts
  {
    id: 'court_staff', name: 'Court Staff', kind: 'catalyst', weight: 3,
    description: 'A staff crowned with a bronze astrolabe. Casts sorceries, and strikes only feebly in melee.',
    lore: 'Court mages were sworn to record, not to rule. The rings of the astrolabe still turn to track stars that set centuries ago.',
    weapon: {
      class: 'staff', damage: { physical: 40, magic: 0, fire: 0 },
      scaling: { intellect: 'C' }, requirements: { strength: 6, intellect: 10 },
      criticalMult: 2.2, postureMult: 0.5, technique: 'bellglass_ward', casts: 'sorcery', maxUpgrade: 10,
    },
  },
  {
    id: 'mint_seal_staff', name: 'Mint Seal Staff', kind: 'catalyst', weight: 3.5,
    description: 'A staff topped with an old coin-die. Its sorceries strike harder than a court staff\'s, for those with the Intellect to drive it.',
    lore: 'The mint-master sealed each year\'s coinage with this die. The face on it is King Aldren\'s, younger than any portrait shows him.',
    weapon: {
      class: 'staff', damage: { physical: 36, magic: 0, fire: 0 },
      scaling: { intellect: 'B' }, requirements: { strength: 6, intellect: 14 },
      criticalMult: 2.2, postureMult: 0.5, technique: 'bellglass_ward', casts: 'sorcery', maxUpgrade: 10,
    },
  },
  {
    id: 'hand_bell', name: 'Hand Bell', kind: 'catalyst', weight: 1.5,
    description: 'A small bronze bell on a wooden grip. Rings bell rites; its tone carries healing and wards.',
    lore: 'Rung at every bedside and every graveside in the kingdom. Priests say a hand bell cannot tell the two apart.',
    weapon: {
      class: 'bell', damage: { physical: 30, magic: 0, fire: 0 },
      scaling: { devotion: 'C' }, requirements: { devotion: 10 },
      criticalMult: 2.2, postureMult: 0.4, technique: 'bellglass_ward', casts: 'rite', maxUpgrade: 10,
    },
  },
  {
    id: 'pilgrim_censer', name: 'Pilgrim Censer', kind: 'catalyst', weight: 4,
    description: 'A brass censer on a chain. Rings bell rites, and swings as a weapon trailing burning incense.',
    lore: 'Pilgrims bound for the Cathedral carried censers so that the road would smell of prayer. Few roads were long enough.',
    weapon: {
      class: 'censer', damage: { physical: 70, magic: 0, fire: 40 },
      scaling: { strength: 'E', devotion: 'C' }, requirements: { strength: 9, devotion: 12 },
      criticalMult: 2.4, postureMult: 0.9, technique: 'bellglass_ward', casts: 'rite', maxUpgrade: 10,
    },
  },

  // ---------------------------------------------------------------- ranged
  {
    id: 'huntsman_bow', name: 'Huntsman\'s Shortbow', kind: 'bow', weight: 2.5,
    description: 'A short recurve bow, quick to draw. Requires Bone Arrows as ammunition.',
    lore: 'The Royal Huntsman\'s charge was the king\'s table and the king\'s forests. Both were emptied long before the war.',
    weapon: {
      class: 'bow', damage: { physical: 70, magic: 0, fire: 0 },
      scaling: { dexterity: 'C' }, requirements: { strength: 7, dexterity: 12 },
      criticalMult: 1.0, postureMult: 0.4, technique: 'stilled_breath', maxUpgrade: 10,
    },
  },
  {
    id: 'garrison_arbalest', name: 'Garrison Arbalest', kind: 'bow', weight: 6,
    description: 'A heavy crossbow wound by crank. Slow to reload, but each bolt hits hard. Requires Iron Bolts.',
    lore: 'Mounted on the parapet to cover the drawbridge. The crank handle is polished; the trigger is not. It was rarely fired.',
    weapon: {
      class: 'crossbow', damage: { physical: 120, magic: 0, fire: 0 },
      scaling: { strength: 'D' }, requirements: { strength: 13, dexterity: 8 },
      criticalMult: 1.0, postureMult: 0.6, technique: 'pinning_shot', maxUpgrade: 10,
    },
  },

  // ---------------------------------------------------------------- shields
  {
    id: 'household_shield', name: 'Household Shield', kind: 'shield', weight: 5.5,
    description: 'A heater shield of oak and blackened steel. Blocks all physical damage and much magic.',
    lore: 'Painted with the arms of the royal Household: a bell beneath a crown. Many were buried with their bearers, face down.',
    shield: { physicalGuard: 100, magicGuard: 40, stability: 55, technique: 'bulwark_toll' },
  },
  {
    id: 'mint_buckler', name: 'Mint Buckler', kind: 'shield', weight: 1.5,
    description: 'A small iron buckler. It blocks poorly but parries quickly, and suits a counter-fighter.',
    lore: 'The mint\'s wardens carried bucklers stamped like coins. Thieves learned to fear the sound of one against a blade.',
    shield: { physicalGuard: 65, magicGuard: 25, stability: 30, technique: 'riposte_stance' },
  },
  {
    id: 'greyford_tower_shield', name: 'Greyford Tower Shield', kind: 'shield', weight: 12,
    description: 'A tall shield of layered planks and iron. Very heavy; holds against almost anything.',
    lore: 'The Greyford muster locked these edge to edge across the ford. The paint shows a river no map of the kingdom includes.',
    shield: { physicalGuard: 100, magicGuard: 55, stability: 75, technique: 'bulwark_toll' },
  },
  {
    id: 'pilgrim_roundshield', name: 'Pilgrim Roundshield', kind: 'shield', weight: 4,
    description: 'A round wooden shield painted with a bell of prayer. Unusually good against magic.',
    lore: 'Blessed on the Pilgrim Stair and carried home again. Pilgrims said it was the prayers, not the wood, that stopped the blows.',
    shield: { physicalGuard: 90, magicGuard: 70, stability: 45, technique: 'riposte_stance' },
  },

  // ---------------------------------------------------------------- armour (medium)
  ...armorSet('retainer', { weight: 23, poise: 20, physical: 38, magic: 14, fire: 20 }, [
    ['retainer_helm', 'Retainer Helm',
      'A closed helm of blackened steel with bronze trim. Sturdy protection for its weight.',
      'Retainers were given the helm on the day they swore. Most wore it for the rest of their lives.'],
    ['retainer_harness', 'Retainer Harness',
      'Plate harness worn over mail and the royal tabard. It holds well against blows.',
      'The tabard\'s bell is stitched in bronze thread. In the future he remembers, it was the last banner standing in the capital.'],
    ['retainer_gauntlets', 'Retainer Gauntlets',
      'Articulated steel gauntlets. Firm on the grip, stiff at the wrist.',
      'The Covenant of Return was sworn with the right hand bare and the gauntlet held in the left.'],
    ['retainer_greaves', 'Retainer Greaves',
      'Steel greaves and sabatons. They ring a little on stone.',
      'Household retainers were taught to stand still for hours. The greaves remember it better than the knees.'],
  ]),
  ...armorSet('funeral', { weight: 18, poise: 14, physical: 24, magic: 26, fire: 16 }, [
    ['funeral_veil', 'Funeral Veil',
      'A pale veil worn over a close mail coif. Good against rites and sorcery.',
      'Priests veil their faces so that the mourning see no one in particular. Grief needs a stranger to speak to.'],
    ['funeral_vestments', 'Funeral Vestments',
      'Pale vestments over dark mail. Balanced protection with some poise.',
      'Embroidered with the names of the dead a priest has buried. The oldest vestments are heavier than armour.'],
    ['funeral_gloves', 'Funeral Gloves',
      'Mail-backed gloves of undyed linen.',
      'All things return. The priests who washed the dead did not always wish them to.'],
    ['funeral_boots', 'Funeral Boots',
      'Plain boots worn under the vestment\'s hem.',
      'Funeral processions walk at the pace of the slowest mourner. So do the priests who lead them.'],
  ]),
  ...armorSet('greyford', { weight: 20, poise: 16, physical: 30, magic: 12, fire: 16 }, [
    ['greyford_sallet', 'Greyford Sallet',
      'An old-pattern sallet with a long tail. Good cover for the neck; poor view to the sides.',
      'No armoury in the kingdom forged this pattern. It was retired in a history that no longer exists.'],
    ['greyford_brigandine', 'Greyford Brigandine',
      'Riveted plates under a faded blue-grey surcoat. Solid, flexible protection.',
      'The muster\'s colours have faded to the grey of the river they held. The rivets are still bright.'],
    ['greyford_vambraces', 'Greyford Vambraces',
      'Splinted leather vambraces with steel elbow cops.',
      'Each soldier scratched a tally on the left vambrace. This one counts to forty and stops.'],
    ['greyford_chausses', 'Greyford Chausses',
      'Mail chausses over riding boots, caked with river silt.',
      'The silt never dries. Somewhere beneath Ashbridge, the ford is still being held.'],
  ]),
  ...armorSet('bellkeeper', { weight: 19, poise: 15, physical: 24, magic: 18, fire: 32 }, [
    ['bellkeeper_cowl', 'Bellkeeper Cowl',
      'A soot-black cowl over an iron collar. Resists fire well.',
      'Bellkeepers tended the Great Bells\' furnaces. The collar marked those the crown had condemned to the work.'],
    ['bellkeeper_cassock', 'Bellkeeper Cassock',
      'A heavy cassock hung with bronze bell-chains. Excellent against fire and heat.',
      'The chains ring as the wearer moves. A bellkeeper was never permitted to walk in silence.'],
    ['bellkeeper_chains', 'Bellkeeper Chains',
      'Chained bronze cuffs and scorched leather gloves.',
      'One condemned bellkeeper pressed a brand to a dying retainer\'s soul. These cuffs are the only record of the name.'],
    ['bellkeeper_boots', 'Bellkeeper Boots',
      'Iron-shod boots, blackened by years at the casting pits.',
      'Worn by those who climbed the bell-towers every hour, and were never allowed to leave them.'],
  ]),

  // ---------------------------------------------------------------- armour (light)
  ...armorSet('court', { weight: 10, poise: 4, physical: 14, magic: 30, fire: 13 }, [
    ['court_hood', 'Court Hood',
      'A deep hood of dark wool lined with silk. Offers little against steel, more against sorcery.',
      'Court mages wore their hoods up before the king, so that what they knew would not show on their faces.'],
    ['court_robes', 'Court Robes',
      'Heavy robes embroidered in gilt thread. Light enough to move freely; good against magic.',
      'The embroidery is a star chart of a sky no living astronomer has seen. The Academy never explained it.'],
    ['court_gloves', 'Court Gloves',
      'Fine leather gloves stained with ink at the fingertips.',
      'Every record the court kept was copied twice by hand. The ink never quite washes out.'],
    ['court_boots', 'Court Boots',
      'Tall boots of soft leather, quiet on marble.',
      'The palace floors were polished for processions. Mages learned to cross them without a sound.'],
  ]),
  ...armorSet('oath', { weight: 12, poise: 8, physical: 21, magic: 11, fire: 13 }, [
    ['oath_scarf', 'Oath Scarf',
      'A dark scarf wound about the neck and jaw. Little protection; no weight to speak of.',
      'An oathblade\'s vow is written on a strip of linen sewn inside it. Only the one who wears it knows the words.'],
    ['oath_coat', 'Oath Coat',
      'A long leather coat over light mail, bound with straps. Made for moving quickly.',
      'The straps hold nothing. They are tied once for each vow kept, and cut for each one broken.'],
    ['oath_bracers', 'Oath Bracers',
      'Leather bracers reinforced with steel splints.',
      'Worn scratched on purpose. An oathblade with clean bracers has never been tested.'],
    ['oath_boots', 'Oath Boots',
      'Thigh-high riding boots with a light steel knee.',
      'Oathblades rode ahead of the army to carry the king\'s word. Few were welcome where they arrived.'],
  ]),
  ...armorSet('huntsman', { weight: 11, poise: 5, physical: 17, magic: 11, fire: 12 }, [
    ['huntsman_hat', 'Huntsman\'s Hat',
      'A wide felt hat with a pheasant feather. Keeps rain from the bowstring.',
      'Each feather marks a royal hunt. This one comes from a forest since felled for a siege.'],
    ['huntsman_jerkin', 'Huntsman\'s Jerkin',
      'A leather jerkin under a short cape. Light, quiet and hard-wearing.',
      'The wild still obeys, the huntsmen say. They never say whom.'],
    ['huntsman_gloves', 'Huntsman\'s Gloves',
      'Supple gloves with a reinforced draw finger.',
      'A huntsman can tell a lord\'s bow from a poacher\'s by the wear on the glove. The court never asked how.'],
    ['huntsman_boots', 'Huntsman\'s Boots',
      'Soft-soled boots for stalking over leaf and stone.',
      'Oiled against the damp of forests that the crown owned and the huntsmen loved.'],
  ]),
  ...armorSet('condemned', { weight: 10, poise: 6, physical: 11, magic: 6, fire: 5 }, [
    ['condemned_hood', 'Sackcloth Hood',
      'A rough hood of sackcloth. It hides the face and protects almost nothing.',
      'Hooded so that the executioner would not have to see whom the crown had forgotten.'],
    ['condemned_rags', 'Condemned Rags',
      'What is left of a retainer\'s tabard, torn to strips. Barely armour at all.',
      'The bell on the breast has been cut away. The stitches that held it are still there.'],
    ['condemned_shackles', 'Broken Shackles',
      'Iron cuffs with the chain snapped. They take a blow better than you would think.',
      'Forgotten but unbroken. The lock was never opened; the chain simply gave first.'],
    ['condemned_wraps', 'Condemned Wraps',
      'Cloth wrappings bound over bare feet.',
      'The yard cells had no floors, only stone. The condemned learned to stand on it anyway.'],
  ]),
  ...armorSet('warden', { weight: 14, poise: 10, physical: 22, magic: 12, fire: 14 }, [
    ['warden_bascinet', 'Mint Warden Bascinet',
      'An open-faced bascinet with a bronze brow-band. Light, with a clear view.',
      'Wardens were forbidden visors. The mint-master wished to see every face that walked his vaults.'],
    ['warden_coat', 'Mint Warden Coat',
      'A padded coat under bronze-studded leather, with a ring of keys at the belt.',
      'The keys open vaults that were emptied years ago. The wardens kept walking their rounds regardless.'],
    ['warden_gloves', 'Mint Warden Gloves',
      'Studded leather gloves, worn thin at the palm.',
      'Every coin that left the mint passed through a warden\'s hand twice. None were permitted to keep the smell of it.'],
    ['warden_boots', 'Mint Warden Boots',
      'Felt-soled boots for night rounds on stone.',
      'A warden\'s pace was set by the vault bell: forty steps a toll, all night, every night.'],
  ]),
  ...armorSet('hospice', { weight: 10, poise: 4, physical: 12, magic: 22, fire: 10 }, [
    ['hospice_hood', 'Hospice Hood',
      'A linen hood, washed pale. Very light.',
      'Hospice healers covered their hair so the sick would not reach for it in fever.'],
    ['hospice_robes', 'Hospice Robes',
      'Layered linen and wool with a stained apron and satchel straps. The lightest robes a healer owns.',
      'Healers of the Quiet Hour say a calm body gathers focus as a still pool gathers light. They wear little, and wait.'],
    ['hospice_gloves', 'Hospice Wraps',
      'Clean linen wrapped over the hands and wrists.',
      'Rewrapped between every patient. Oswin Marrow kept count in his head, then stopped counting.'],
    ['hospice_boots', 'Hospice Shoes',
      'Soft, quiet shoes for walking a ward at night.',
      'The Hospice of the Quiet Hour was named for the hour before dawn, when the dying are most often lost.'],
  ]),

  // ---------------------------------------------------------------- armour (heavy)
  ...armorSet('commander', { weight: 34, poise: 42, physical: 46, magic: 16, fire: 24 }, [
    ['commander_helm', 'Crested Helm',
      'A heavy helm crowned with a bronze bell-crest. Excellent protection; poor visibility.',
      'Worn by Ser Corvane Aldmoor. The crest was added the day the Bell appointed him, and never taken off.'],
    ['commander_plate', 'Commander\'s Plate',
      'Thick plate with a bell-standard socket at the back. Among the heaviest armour a person can move in.',
      'The standard socket is empty now. What it held kept Corvane in Ashbridge long after he should have gone.'],
    ['commander_gauntlets', 'Commander\'s Gauntlets',
      'Heavy gauntlets with flared cuffs.',
      'He signed his orders wearing these. The seal-wax is still caught in the joints.'],
    ['commander_greaves', 'Commander\'s Greaves',
      'Full greaves of dark steel, scarred at the shins.',
      'Corvane never retreated a step in the yard. The flagstones there are worn where he stood.'],
  ]),
  ...armorSet('gatewarden', { weight: 32, poise: 38, physical: 45, magic: 14, fire: 22 }, [
    ['gatewarden_helm', 'Gatewarden Helm',
      'A visored bascinet with a narrow sight. Heavy, and very hard to stagger.',
      'Gatewardens lowered their visors at dusk and did not raise them until the gate opened at dawn.'],
    ['gatewarden_plate', 'Gatewarden Plate',
      'Tall-shouldered plate under a tabard bearing the army\'s castle and sword. Built to stand in a doorway and not move.',
      'Siegeholm\'s gates were held by these men in two histories at once. In one they won. In the other they were buried in it.'],
    ['gatewarden_gauntlets', 'Gatewarden Gauntlets',
      'Heavy gauntlets with a reinforced haft grip.',
      'A gatewarden\'s oath is sworn with both hands on the bar of the gate.'],
    ['gatewarden_greaves', 'Gatewarden Greaves',
      'Thick greaves and broad sabatons, set wide for footing.',
      'Measured to the width of a gate\'s arch. A gatewarden who stepped back was said to have opened it.'],
  ]),

  // ---------------------------------------------------------------- talismans
  {
    id: 'warden_talisman', name: 'Warden\'s Talisman', kind: 'talisman', weight: 0.5,
    description: 'Raises stamina regeneration by 15 %.',
    lore: 'A bronze token worn by the wardens of the mint, who walked the vaults all night. It is warm, as though still carried.',
    talisman: { effect: 'staminaRegen15' },
  },

  // ---------------------------------------------------------------- consumables
  {
    id: 'recall_flask', name: 'Recall Flask', kind: 'consumable',
    description: 'Restores 45 % of health over a moment. Charges refill when you rest at a Stillbell.',
    lore: 'The Covenant remembers its servants whole. The flask asks the body to remember too.',
    consumable: { effect: 'flaskHealth', value: 0.45 },
  },
  {
    id: 'recall_flask_focus', name: 'Recall Flask (Focus)', kind: 'consumable',
    description: 'Restores 50 % of focus. Charges are divided with the health flask at a Stillbell.',
    lore: 'The same bronze, a colder draught. Court mages drank it before long vigils in the archive.',
    consumable: { effect: 'flaskFocus', value: 0.5 },
  },
  {
    id: 'throwing_knife', name: 'Throwing Knife', kind: 'consumable', stack: 20, price: 60,
    description: 'A small balanced blade thrown toward the reticle, or at the locked target. Interrupts archers and casters.',
    lore: 'Household retainers carried a few in the boot. Not honourable, perhaps, but honour was the king\'s concern.',
    consumable: { effect: 'throwKnife', value: 38 },
  },
  {
    id: 'ember_resin', name: 'Ember Resin', kind: 'consumable', stack: 5, price: 300,
    description: 'Coats the right-hand weapon in smouldering resin, adding fire damage for 60 seconds.',
    lore: 'Pressed from the pines on the ravine\'s edge. Ashbridge burned once in a war it has not yet had; it burns easily.',
    consumable: { effect: 'fireBuff', value: 60 },
  },

  // ---------------------------------------------------------------- ammunition
  {
    id: 'bone_arrow', name: 'Bone Arrow', kind: 'ammo', stack: 60, price: 10, weight: 0,
    description: 'Arrows with bone heads, for bows such as the Huntsman\'s Shortbow.',
    lore: 'Cut from the antlers of the king\'s deer. The huntsmen wasted nothing the crown had killed.',
  },
  {
    id: 'iron_bolt', name: 'Iron Bolt', kind: 'ammo', stack: 40, price: 20, weight: 0,
    description: 'Short, square-headed bolts for crossbows such as the Garrison Arbalest.',
    lore: 'Stamped with the garrison\'s mark and counted every evening. The count was always one short.',
  },

  // ---------------------------------------------------------------- materials
  {
    id: 'tempered_scrap', name: 'Tempered Scrap', kind: 'material', stack: 99, price: 600,
    description: 'Hardened steel offcuts. A smith uses it to reinforce weapons from +1 to +5.',
    lore: 'Salvaged from broken blades in the gatehouse armoury. Ashbridge made more swords than it had hands to hold them.',
  },
  {
    id: 'bellbronze_scrap', name: 'Bellbronze Scrap', kind: 'material', stack: 99, price: 1800,
    description: 'Fragments of bell-metal. A smith uses it to reinforce weapons from +6 to +10.',
    lore: 'Bellbronze keeps its note even when broken. Smiths say a blade tempered with it rings true for good.',
  },
  {
    id: 'bellbronze_shard', name: 'Bellbronze Shard', kind: 'material', stack: 12,
    description: 'Adds one charge to the Recall Flask.',
    lore: 'A sliver of a Stillbell cast for the Covenant. The flask is made of the same metal, and grows to meet it.',
    consumable: { effect: 'flaskCharge', value: 1 },
  },

  // ---------------------------------------------------------------- keys
  {
    id: 'refuge_key', name: 'Refuge Key', kind: 'key',
    description: 'Opens the barred refuge in the lower passage beneath the mint.',
    lore: 'The refuge was dug to shelter the townsfolk in a siege. The Commander found another use for it.',
  },

  // ---------------------------------------------------------------- spellbooks
  {
    id: 'grimoire_cinder_bolt', name: 'Grimoire: Cinder Bolt', kind: 'spellbook',
    description: 'Teaches the sorcery Cinder Bolt. Anyone can learn it; casting it needs a sorcery catalyst and 10 Intellect.',
    lore: 'A mint clerk\'s notebook. Between columns of figures, someone practised a spell for lighting furnaces. Then for other things.',
    spellbook: { spell: 'cinder_bolt' },
  },
  {
    id: 'grimoire_shard_volley', name: 'Grimoire: Shard Volley', kind: 'spellbook',
    description: 'Teaches the sorcery Shard Volley. Casting it needs a sorcery catalyst and 13 Intellect.',
    lore: 'A student\'s copybook, hidden in a wall. The same shard is drawn three times on every page, each a little further apart.',
    spellbook: { spell: 'shard_volley' },
  },
  {
    id: 'grimoire_bellglass_lance', name: 'Grimoire: Bellglass Lance', kind: 'spellbook',
    description: 'Teaches the sorcery Bellglass Lance. Casting it needs a sorcery catalyst and 18 Intellect.',
    lore: 'Bound in glass leaves that ring when turned. Academy scholars were forbidden to read it aloud.',
    spellbook: { spell: 'bellglass_lance' },
  },
  {
    id: 'grimoire_falling_hour', name: 'Grimoire: Falling Hour', kind: 'spellbook',
    description: 'Teaches the sorcery Falling Hour. Casting it needs a sorcery catalyst and 16 Intellect.',
    lore: 'A treatise on the weight of time. The final chapter is a single diagram of a bell, and an arrow pointing down.',
    spellbook: { spell: 'falling_hour' },
  },
  {
    id: 'prayer_vigil_of_ash', name: 'Prayer: Vigil of Ash', kind: 'spellbook',
    description: 'Teaches the rite Vigil of Ash. Casting it needs a rite catalyst and 10 Devotion.',
    lore: 'A prisoner\'s prayer, written in charcoal on the back of a hospice ledger. The hand is steady.',
    spellbook: { spell: 'vigil_of_ash' },
  },
  {
    id: 'psalter_toll_of_warding', name: 'Psalter: Toll of Warding', kind: 'spellbook',
    description: 'Teaches the rite Toll of Warding. Casting it needs a rite catalyst and 14 Devotion.',
    lore: 'Sung by pilgrims when the road grew dark. The Cathedral later declared the tune improper, and kept it for itself.',
    spellbook: { spell: 'toll_of_warding' },
  },

  // ---------------------------------------------------------------- imprint scrolls
  imprint('oathbound_lunge', 'Imprints Oathbound Lunge onto a straight sword, curved sword, estoc or spear at a Stillbell.',
    'Every Household retainer learned the lunge before they learned the king\'s name.'),
  imprint('bulwark_toll', 'Imprints Bulwark Toll onto a shield at a Stillbell.',
    'A retainer\'s first duty is to stand in front of something. The second is to push.'),
  imprint('bellglass_ward', 'Imprints Bellglass Ward onto a staff, hand bell or censer at a Stillbell.',
    'Court mages were taught to protect the record first, and themselves second.'),
  imprint('measured_cut', 'Imprints Measured Cut onto a straight sword, curved sword or greatsword at a Stillbell.',
    'Two cuts, taken in a single breath. Corvane taught them to every recruit in Ashbridge, and killed a captain with them.'),
  imprint('riposte_stance', 'Imprints Riposte Stance onto a shield or dagger at a Stillbell.',
    'A warden\'s drill, chalked on the wall of the practice yard: wait, turn, answer.'),
  imprint('bell_breaker', 'Imprints Bell Breaker onto a greatsword, hammer, axe or mace at a Stillbell.',
    'Taught to those who broke the cracked bells for recasting. The bells were supposed to be silent first.'),
  imprint('rending_sweep', 'Imprints Rending Sweep onto a halberd, spear or greatsword at a Stillbell.',
    'Gatewardens sweep the gateway clear before they close it. What remains inside is no longer their concern.'),
  imprint('greyford_flourish', 'Imprints Greyford Flourish onto a curved sword or dagger at a Stillbell.',
    'The muster\'s parade salute, turned to other use at the ford. Brannoc says the captain taught it to them.'),
  imprint('knell_strike', 'Imprints Grave Knell onto a mace, hammer or hand bell at a Stillbell.',
    'Funeral priests struck the crypt door once for each year of the life inside.'),
  imprint('chain_whirl', 'Imprints Unbroken Links onto a flail at a Stillbell.',
    'The yard cells had room enough to swing a chain, if one was patient. The condemned had time to be.'),
  imprint('pinning_shot', 'Imprints Pinning Shot onto a bow or crossbow at a Stillbell.',
    'Parapet crews aimed low at the drawbridge. A man pinned on the planks could be questioned later.'),
  imprint('impaling_charge', 'Imprints Impaling Charge onto a spear or halberd at a Stillbell.',
    'The garrison\'s morning drill: forty paces at the run, and the straw man behind the gate.'),
  imprint('ember_edge', 'Imprints Ember Edge onto any melee weapon at a Stillbell.',
    'Woodsmen knew how to make a fire with nothing but resin and an axe. Soldiers learned it from them.', 1500),
  imprint('vow_parry', 'Imprints Vow Parry onto an estoc or straight sword at a Stillbell.',
    'Household duellists parried with the blade to show they had no need of a dirk. Some of them were right.'),
  imprint('vow_pursuit', 'Imprints Vow\'s Pursuit onto an estoc or spear at a Stillbell.',
    'An oathblade does not stop until the vow is kept. The technique does not stop either.'),
  imprint('stilled_breath', 'Imprints Stilled Breath onto a bow or crossbow at a Stillbell.',
    'The huntsman\'s first lesson: the arrow leaves between one heartbeat and the next.'),

  // ---------------------------------------------------------------- memories
  {
    id: 'memory_corvane', name: 'Final Memory of Ser Corvane', kind: 'memory',
    description: 'At a Stillbell, exchange it for one of several rewards: a technique, a weapon, or a great sum of Hours.',
    lore: 'The last thing Corvane saw was a bell that would not ring for him. The memory is heavy, and a little cold.',
    memory: { boss: 'corvane' },
  },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  DEFS.map((d) => [d.id, { ...d, icon: d.icon ?? d.id } as ItemDef]),
);

/** Ranged weapon → ammunition item id it requires. */
export const BOW_AMMO: Record<string, string> = { huntsman_bow: 'bone_arrow', garrison_arbalest: 'iron_bolt' };

/** Armour item id → visual set (same as `ItemDef.armorSet`, typed for the model builder). */
export const ARMOR_LOOKS: Record<string, ArmorLook> = Object.fromEntries(
  Object.values(ITEMS).filter((i) => i.kind === 'armor').map((i) => [i.id, (i.armorSet ?? 'none') as ArmorLook]),
);

/**
 * Smith shop stock (Hesper Vail, npc id 'hesper'). `stock: null` = unlimited.
 * `requiresFlag`: only listed once that world flag is set (GDD §5.5: Tempered Scrap after the first boss).
 */
export const SHOP_STOCK: Record<string, { itemId: string; stock: number | null; requiresFlag?: string }[]> = {
  hesper: [
    { itemId: 'throwing_knife', stock: 20 },
    { itemId: 'bone_arrow', stock: null },
    { itemId: 'iron_bolt', stock: null },
    { itemId: 'ember_resin', stock: 5 },
    { itemId: 'imprint_ember_edge', stock: 1 },
    { itemId: 'tempered_scrap', stock: null, requiresFlag: 'boss.corvane' },
  ],
};

/** Default counts for stackable items in origin kits (anything unlisted = 1). */
export const KIT_COUNTS: Record<string, number> = { throwing_knife: 8, bone_arrow: 40, iron_bolt: 20, ember_resin: 2 };

/** Regions add items/techniques here. */
export function registerItems(items: ItemDef[], techniques: Record<string, TechniqueDef> = {}) {
  for (const i of items) (ITEMS as Record<string, ItemDef>)[i.id] = i;
  Object.assign(TECHNIQUES, techniques);
}
