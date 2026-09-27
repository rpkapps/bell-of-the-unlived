/**
 * army — always-loaded metadata (owned by the army region build): items, journal leads, text
 * (areas, Stillbell names, boss names, inspectables, warnings, hints, memory rewards), the Hospice
 * guest Rook Tallis (powder-master turned quartermaster) with his shop and look.
 * Keep this light: no geometry, no clips. Heavy content goes in ./module.ts (lazy-loaded).
 */
import type { ItemDef } from '../../game/types';
import { registerItems, SHOP_STOCK } from '../items';
import { registerLeads } from '../journal';
import { registerText, ACQUISITION } from '../text';
import { registerDialogue } from '../dialogue';
import { registerHospiceGuest } from '../../game/regions/hub';
import { registerNpcLook, CharBuilder } from '../../actors/models';
import { LOOKS } from '../../actors/models/character';
import { addNeck, addHead } from '../../actors/models/anatomy';

const RETURNED = 'The Returned';
const TALLIS = 'Rook Tallis';
const VARR = 'Marshal Ysolde Varr';
const ODERIC = 'Oderic, the Ram-Knight';
const MUSTER = 'Greyford Soldier';

// ------------------------------------------------------------------ items

const def = (d: Omit<ItemDef, 'icon'> & { icon?: string }): ItemDef => ({ ...d, icon: d.icon ?? d.id });
registerItems([
  def({
    id: 'varr_halberd', name: 'Marshal Varr\'s Halberd', kind: 'weapon', weight: 8.5,
    description: 'A marshal\'s halberd with a gilded collar and a scrap of victory ribbon. Sweeps that clear a breach; thrusts that hold one. Carries Rending Sweep.',
    lore: 'Ysolde Varr held the Siegeholm gate with it through nine winters, and through the night the gate was opened. She never set it down between the two.',
    weapon: { class: 'halberd', damage: { physical: 152, magic: 0, fire: 0 }, scaling: { strength: 'C', dexterity: 'C' }, requirements: { strength: 16, dexterity: 13 }, criticalMult: 2.7, postureMult: 1.35, technique: 'rending_sweep', maxUpgrade: 10 },
  }),
  def({
    id: 'ram_knight_maul', name: 'Ram-Knight\'s Maul', kind: 'weapon', weight: 13,
    description: 'A battering ram shortened into a maul, its bronze ram\'s head worn smooth. Ponderous, crushing, and ruinous to any guard.',
    lore: 'Oderic broke the barbican gate with its parent log. When the gate was mended in the other history, he was set to guard it. He never learned which of him was right.',
    weapon: { class: 'hammer', damage: { physical: 168, magic: 0, fire: 0 }, scaling: { strength: 'B', dexterity: 'E' }, requirements: { strength: 20, dexterity: 9 }, criticalMult: 2.5, postureMult: 1.6, technique: 'bell_breaker', maxUpgrade: 10 },
  }),
  def({
    id: 'siegeholm_sash', name: 'Siegeholm Sash', kind: 'talisman', weight: 0.3,
    description: 'Raises maximum stamina by 10 %.',
    lore: 'A victory sash of the relief, cut down to fit a powder-master\'s wrist. Tallis wears the other half. "For the night nothing happened," he says.',
    talisman: { effect: 'staminaMax10' },
  }),
  def({
    id: 'greyford_muster_roll', name: 'Greyford Muster Roll', kind: 'key',
    description: 'The roll of the Greyford relieving column at Siegeholm: names, ranks, and a date that the victory monument does not carry.',
    lore: 'Found in the lime ossuary with the column\'s dead. Someone folded it with care, and then someone else decided it had never been written.',
  }),
  def({
    id: 'memory_varr', name: 'Final Memory of Marshal Varr', kind: 'memory',
    description: 'At a Stillbell, exchange it for one of several rewards: her halberd, a technique, or a great sum of Hours.',
    lore: 'She remembered the siege as won. She remembered it as lost. At the end she remembered the gate, and a deserter walking towards it, and could not tell which of them she had been.',
    memory: { boss: 'varr' },
  }),
]);

SHOP_STOCK.tallis = [
  { itemId: 'iron_bolt', stock: null },
  { itemId: 'throwing_knife', stock: 12 },
  { itemId: 'ember_resin', stock: 4 },
  { itemId: 'imprint_stilled_breath', stock: 1 },
  { itemId: 'garrison_arbalest', stock: 1 },
  { itemId: 'tempered_scrap', stock: 6 },
  { itemId: 'bellbronze_scrap', stock: 2, requiresFlag: 'boss.varr' },
];

// ------------------------------------------------------------------ leads

registerLeads({
  eastern_magazine: {
    title: 'The Eastern Magazine', region: 'Siegeholm',
    entries: {
      mem_magazine: {
        category: 'remembered',
        text: 'Siegeholm fell on the night its eastern powder magazine went up. They said the powder-master, Rook Tallis, sold the key and lit the fuse himself. They hanged what was left of him from the gate.',
      },
      obs_guards: {
        category: 'observed',
        text: 'The magazine is barred from the outside, and guarded by living men, not the Unlived. They are not keeping anyone out. They are keeping someone in.',
      },
      obs_order: {
        category: 'observed',
        text: 'On the guard-post desk: withdraw the magazine watch at second bell, bar the door, "the powder-master to remain at his post". The Marshal\'s seal — but not her hand.',
        contradicts: 'mem_magazine',
        contradictionNote: 'Tallis did not sell the magazine. Someone else wrote the betrayal and sealed it with hers.',
      },
      obs_tallis: {
        category: 'observed',
        text: 'Through the door: Tallis is alive, bound among the kegs, with a slow-match laid to the powder.',
      },
      conf_rescued: {
        category: 'confirmed', sets: 'resolved',
        text: 'I lifted the bar and cut the match. Tallis walked out of the magazine that was meant to be his grave, and has gone to the Hospice with his tools.',
      },
      conf_lost: {
        category: 'confirmed', loss: true, sets: 'lost',
        text: 'I crossed into the Ram-Knight\'s passage and the eastern magazine went up behind me. Tallis was still inside. The history I remember kept its shape.',
      },
    },
  },
  siegeholm: {
    title: 'The Siege That Never Ended', region: 'Siegeholm',
    entries: {
      mem_victory: {
        category: 'remembered',
        text: 'I remember the bells for the relief of Siegeholm: nine winters of siege broken, the Marshal carried on shields. I was in the crowd in the capital. I cheered.',
      },
      obs_graves: {
        category: 'observed',
        text: 'The mass graves beside the victory monument are dated the night of the relief. The monument and the graves describe the same night twice.',
        contradicts: 'mem_victory',
        contradictionNote: 'The victory I cheered and the defeat under the snow are one night.',
      },
      obs_pit: {
        category: 'observed',
        text: 'Inside the gate, twenty paces from the triumphal arch, a lime pit holds the garrison\'s dead in rows. Nobody moved them. Nobody finished burying them.',
      },
      obs_hall: {
        category: 'observed',
        text: 'In the Hall of the Last Feast the tables are laid for a victory and turned over for a last stand. Both were real. Neither is over.',
      },
      conf_bell: {
        category: 'confirmed', sets: 'resolved',
        text: 'Marshal Varr has fallen and the Army\'s Great Bell is silent. In both histories, the siege is finally over.',
      },
    },
  },
  muster_army: {
    title: 'The Unlived Muster: Siegeholm', region: 'Siegeholm',
    entries: {
      obs_soldier: {
        category: 'observed',
        text: 'A Greyford soldier searches the victory monument for his company\'s name. The relieving column is carved there, every regiment but his.',
      },
      conf_roll: {
        category: 'confirmed', sets: 'resolved',
        text: 'I brought him the muster roll from the lime ossuary. He read the names aloud and said he would hold the road for me. The Muster has a man at Siegeholm.',
      },
    },
  },
});

// ------------------------------------------------------------------ text

registerText({
  areas: {
    siegeRoad: 'The Siege Road', outerRamparts: 'The Outer Ramparts', lowerBailey: 'The Lower Bailey', casemate: 'The West Casemate',
    ossuary: 'The Lime Ossuary', barbican: 'Barbican of Two Victories', magazine: 'The Eastern Magazine', eastLane: 'The Eastern Lane',
    ramKnightPassage: 'The Ram-Knight\'s Passage', upperWard: 'The Upper Ward', feastHall: 'Hall of the Last Feast', keep: 'The Marshal\'s Keep',
    bellRampart: 'The Bell Rampart',
  },
  stillbells: { 'army.road': 'Siege Road Stillbell', 'army.barbican': 'Barbican Stillbell', 'army.keep': 'Marshal\'s Keep Stillbell' },
  bosses: {
    oderic: { name: 'Oderic, the Ram-Knight', title: 'Breaker of the Barbican Gate' },
    varr: { name: 'Marshal Ysolde Varr', title: 'Keeper of the Army\'s Great Bell' },
  },
  hints: {
    armyFormation: 'A pike wall faces you and steps as one. Break one bearer\'s guard, or circle past its slow turn and strike the flank.',
    armyBombard: 'The bombard\'s fuse glows before it fires, and the ground is marked where the shot will fall. Get clear, or put a mantlet or a wall between you and the gun. Silence the crew to stop it.',
    armyTwiceSlain: 'The twice-slain rise once more unless finished with a critical, or while their posture is broken.',
    armyRamWall: 'The Ram-Knight struck stone instead of you. He is staggered: strike now.',
  },
  warnings: {
    armyOdericPrisoner: {
      title: 'The Ram-Knight Holds the Gate',
      body: 'Beyond this veil, Oderic the Ram-Knight holds the barbican passage. Once you cross it, the magazine guard will light the eastern magazine — and whoever is locked inside it. Cross now?',
      yes: 'Cross', no: 'Not yet',
    },
    armyOderic: { title: 'The Ram-Knight Holds the Gate', body: 'Beyond this veil, Oderic the Ram-Knight holds the barbican passage. Cross now?', yes: 'Cross', no: 'Not yet' },
    armyVarr: { title: 'The Marshal Waits', body: 'Beyond this veil, Marshal Ysolde Varr keeps the Army\'s Great Bell. Cross now?', yes: 'Cross', no: 'Not yet' },
  },
  memoryRewards: {
    memory_varr: [
      { id: 'varr_halberd', name: 'Marshal Varr\'s Halberd', icon: 'varr_halberd', kind: 'weapon', description: 'Her halberd. Carries Rending Sweep. Requires 16 Strength and 13 Dexterity.' },
      { id: 'rending_sweep', name: 'Rending Sweep', icon: 'rending_sweep', kind: 'technique', description: 'An Imprint Technique: turn on the heel in one wide sweep that strikes everything around you. For a halberd, spear or greatsword.' },
      { id: 'hours:6000', name: '6,000 Hours', icon: 'hours', kind: 'hours', description: 'Let the memory go, and keep the time it held. Nine winters of it.' },
    ],
  },
  inspect: {
    army_victory_relief: { title: 'The Relief of Siegeholm', lines: [
      'SIEGEHOLM RELIEVED. THE NINE WINTERS BROKEN. MARSHAL YSOLDE VARR HELD THE GATE.',
      'The relief shows the column marching in under banners, the Marshal raised on shields, the besiegers fleeing into the snow.',
      'Every regiment of the relief is named along the base. The chisel stops, as if a name had been left out on purpose.',
    ] },
    army_mass_grave: { title: 'The Graves by the Road', lines: [
      'Rows of mounds under the snow, marked with swords, shields, planks. The markers are cut with the same date.',
      'It is the date on the victory monument, twenty paces away.',
    ] },
    army_victory_arch: { title: 'The Arch of the Nine Winters', lines: [
      'A triumphal arch, the gilding still bright. Trophies of arms, the Marshal\'s name, the king\'s thanks.',
      'Beyond it, the lime pit. The arch was built looking the other way.',
    ] },
    army_lime_pit: { title: 'The Lime Pit', lines: [
      'The garrison\'s dead lie in rows under lime and snow, shrouded in the linen of the victory feast.',
      'The tags on the stakes give names and the same night. Some tags give two dates, one scratched out.',
    ] },
    army_orders: { title: 'Orders on the Guard-Post Desk', lines: [
      'By order of the Marshal: withdraw the magazine watch at second bell. Bar the door. The powder-master to remain at his post.',
      'The seal is Ysolde Varr\'s. The hand is not — hers is on the duty roll beside it, square and slow. This one is quick, and leans.',
      'On the back, in the same quick hand: "When it goes, say it was Tallis."',
    ] },
    army_feast: { title: 'The Tables of the Victory', lines: [
      'Goblets filled and never drunk. Candles lit and never burned down. Places set for every captain of the relief.',
      'Under the benches, spent bolts, and the dark stains of the last stand.',
    ] },
    army_last_stand: { title: 'The Last Stand at the Door', lines: [
      'The feast tables, turned over and dragged to the door. Bolts stand in the boards like a second grain.',
      'Whoever held here held long enough for the other history to begin.',
    ] },
    army_postern_locked: { title: 'The Postern', lines: ['A heavy door in the curtain wall, iron-strapped. Barred from the other side.'] },
    army_magazine_barred: { title: 'The Magazine Door', lines: ['Barred from the outside with an oak beam in iron brackets. Someone inside is breathing.'] },
  },
});

Object.assign(ACQUISITION, {
  gatewarden_halberd: 'Siegeholm — the weapon rack on the dais of the Hall of the Last Feast.',
  'set:gatewarden': 'Siegeholm — helm and greaves on the armour stand in the West Casemate; plate and gauntlets on the stand in the Hall of the Last Feast.',
  garrison_arbalest: 'Siegeholm — the crossbow post at the west end of the Outer Ramparts (with Iron Bolts and the Pinning Shot scroll). Also sold by Rook Tallis.',
  greyford_tower_shield: 'Siegeholm — the ground room of the siege tower (entered from the west).',
  bellwarden_greatsword: 'Siegeholm — under a fallen bellwarden at the foot of the Upper Ward\'s Grand Stair.',
  imprint_bell_breaker: 'Siegeholm — the high table in the Hall of the Last Feast.',
  imprint_impaling_charge: 'Siegeholm — the pike stand beside the Arch of the Nine Winters.',
  imprint_pinning_shot: 'Siegeholm — the crossbow post on the Outer Ramparts.',
  imprint_rending_sweep: 'Final Memory of Marshal Varr (technique reward).',
  imprint_stilled_breath: 'Sold by Rook Tallis at the Hospice (if saved at Siegeholm).',
  varr_halberd: 'Final Memory of Marshal Varr.',
  ram_knight_maul: 'Oderic, the Ram-Knight (on defeat).',
  siegeholm_sash: 'Rook Tallis\'s thanks, if he is freed from the eastern magazine.',
  greyford_muster_roll: 'Siegeholm — the lime ossuary behind the Lower Bailey\'s east wall.',
  memory_varr: 'Marshal Ysolde Varr.',
});

// ------------------------------------------------------------------ the Hospice guest: Rook Tallis

registerDialogue({
  tallis_hospice: [
    { speaker: TALLIS, text: 'So this is where the saved end up. Warm, for a ruin. The healer let me have the old still-room for my kegs.' },
    { speaker: TALLIS, text: 'I sold bolts and powder to three kings\' armies and hanged for it in one of them. I would rather sell to you.' },
    { speaker: TALLIS, text: 'Take this. Half a victory sash. The other half is on my wrist, for the night nothing happened.' },
  ],
  tallis_idle: [
    { speaker: TALLIS, text: 'Keep your bolts dry and your fuses short. Or the other way round, if you want to be remembered.' },
    { speaker: TALLIS, text: 'The Marshal never wrote that order. I knew her hand. I still do not know whose it was.' },
    { speaker: TALLIS, text: 'A bombard wants three things: dry powder, a crew, and somebody standing still. Deny it one.' },
  ],
});

registerHospiceGuest({
  id: 'tallis', name: 'Rook Tallis', look: 'tallis', idle: null,
  present: (ws) => ws.npcs.tallis === 'rescued',
  greet: 'tallis_hospice', idlePool: 'tallis_idle', shop: 'tallis', gifts: ['siegeholm_sash'],
});

/** Tallis: a broad, grey-bearded powder-master, soot to the elbows, leather apron over a quilted coat. */
registerNpcLook('tallis', (rig) => {
  const b = new CharBuilder(rig, 'npc', 4711);
  const c = { sex: 'm' as const, hair: 'grey' as const, unlived: false, faceHidden: false, variant: 0 };
  addNeck(b, 'm', 'skin');
  LOOKS.warden.body(b, c);
  LOOKS.hospice.arms(b, c);
  LOOKS.warden.legs(b, c);
  addHead(b, { sex: 'm', hair: 'grey', style: 'cropped', beard: 'full', soot: true, old: true });
  return b.build();
});

export const ARMY_SPEAKERS = { RETURNED, TALLIS, VARR, ODERIC, MUSTER };
