/**
 * Narrative and UI text for the Ashbridge slice: inspectables, hints, area names, banners,
 * warnings, memory rewards and item acquisition notes.
 *
 * Placeholders: `{<ActionId>}` (e.g. `{light}`, `{parry}`) is replaced by the action's glyph.
 * Two extra tokens have no ActionId: `{move}` (left stick / WASD) and `{camera}` (right stick / mouse).
 * `formatActions()` below performs the substitution.
 */
import type { ActionId } from '../input/actions';
import { ACTIONS } from '../input/actions';
import type { MemoryReward } from '../ui/contract';

// ------------------------------------------------------------------ inspectables

export const INSPECT: Record<string, { title: string; lines: string[] }> = {
  fresh_masonry: {
    title: 'Fresh Masonry',
    lines: [
      'Bricks laid across the old stair beneath the counting room.',
      'The mortar gives under a thumb. It is still damp.',
      'A trowel and a bucket of lime were left behind in a hurry.',
    ],
  },
  service_hatch: {
    title: 'Service Hatch',
    lines: [
      'An iron hatch set in the floor beside the new wall, its ring rusted stiff.',
      'Cold air rises through the seams. It leads down to the passage the masonry was meant to close.',
    ],
  },
  greyford_relief: {
    title: 'The Victory of Greyford',
    lines: [
      'Carved in pale stone: soldiers at a ford, a banner held high, a young king watching from a rise.',
      'The inscription reads: "Greyford. Their courage kept the crown."',
      'You have never heard of Greyford. You served the crown for twenty years.',
    ],
  },
  greyford_graves: {
    title: 'Graves of the Muster',
    lines: [
      'A row of soldiers\' graves, neatly kept. "Tobin Hale, of the Greyford Muster." "Maud Serrow, of the Greyford Muster."',
      'Every stone is dated years before the victory celebrated above them.',
      'Someone still leaves fresh heather here.',
    ],
  },
  corvane_orders: {
    title: 'Orders Under Seal',
    lines: [
      '"By the Bell\'s appointment. Seal the counting-room stair. Let no one pass below the mint."',
      '"Move the healer Marrow to the yard cells at first bell. He is not to speak with the townsfolk."',
      '"The east gate remains in my keeping until the appointed hour. — C. Aldmoor"',
    ],
  },
  corvane_letters: {
    title: 'Letters to the Bell-Warden',
    lines: [
      '"To the Bell-Warden. Ashbridge is quiet. The road is closed, as you asked."',
      '"I do not understand why the gate must open, only that it must. I will be ready at the appointed hour."',
      '"If the Bell has chosen this, then it is no betrayal. Tell me it is no betrayal."',
    ],
  },
  ledger_hook: {
    title: 'Ledger Hook',
    lines: [
      'A brass hook by the counting desk, where the clerks hung their keys.',
      'One key remains, tagged in a clerk\'s hand: "Refuge — below."',
    ],
  },
  rosary: {
    title: 'Oswin\'s Rosary',
    lines: [
      'A string of small bronze bells, worn smooth by a healer\'s thumb.',
      'The cell door stands open. Whoever moved him did not let him take it.',
    ],
  },
  drawbridge_raised: {
    title: 'The Drawbridge',
    lines: [
      'Across the ravine, the courtyard drawbridge hangs raised on its chains.',
      'Its lever must be on the far side. From there, the way back would be short.',
    ],
  },
  anchor_bell: {
    title: 'Anchor-Bell',
    lines: [
      'A bell-standard of bellbronze, cracked through the crown.',
      'It bound Ser Corvane to the Bell\'s appointment. It holds nothing now.',
    ],
  },
  toll_post: {
    title: 'Toll-Post',
    lines: [
      'A small iron bell on a post, green with age, set where the ways divide.',
      'While a lead remains unresolved, it answers faintly from that direction. It never says how far.',
    ],
  },
};

// ------------------------------------------------------------------ hints

/** Contextual tutorial hints. Shown once per id per save (when hints are on). */
export const HINTS: Record<string, string> = {
  move: '{move} to move. Hold {dodge} to sprint. {walk} toggles walking.',
  camera: '{camera} to look around.',
  lockon: '{lockOn} to lock on to a nearby foe. Flick the camera to switch targets; press again to release.',
  attack: '{light} light attack. {heavy} heavy attack — hold to charge. A full charge breaks guards.',
  dodge: 'Tap {dodge} to roll. While the roll\'s i-frames last, attacks pass through you. Lighter loads roll longer and faster.',
  guard: 'Hold {guard} to guard. Blocked hits cost stamina instead of health. Run out, and your guard breaks.',
  parry: '{parry} just as a blow lands to parry it. A parried foe reels, open to a riposte with {light}.',
  backstab: 'Approach an unaware foe from behind. When the critical marker appears, {light} to backstab.',
  guardbreak: 'This foe hides behind its shield. A fully charged {heavy} breaks the guard. Then {light} for a critical.',
  postureBreak: 'Keep up the pressure. When a foe\'s posture fills, it kneels. {light} for a posture-break critical.',
  flask: '{useItem} to drink from the Recall Flask. Drinking leaves you open, so find a gap first.',
  stillbell: '{interact} to rest at a Stillbell: refill flasks, level up, respec, travel. Resting renews the Unlived.',
  hours: 'Hours are your currency and experience. Spend them at a Stillbell to raise attributes, or at the smith.',
  lastBreath: 'Your Hours wait in your Last Breath where you fell. Touch it to recover them. Die before you do, and they are lost.',
  hatch: '{interact} to heave the hatch open.',
  toll: 'At a toll-post, a faint toll sounds from the direction of an unresolved lead. The bell at the top of the screen swings toward it.',
  journal: '{journal} opens the Forememory: what you remember, what you have observed, and what you have changed.',
  drawbridge: '{interact} to pull the lever and lower the drawbridge. It will stay down.',
  cast: 'With a catalyst in hand, {light} casts the attuned spell. {cycleSpell} changes spells. Spells cost focus.',
  technique: '{technique} performs the Imprint Technique of the weapon in hand. Techniques cost focus.',
  criticalMarker: 'The bronze diamond marks an opening. {light} to claim it, with or without lock-on.',
};

/** The actions each hint shows glyphs for (for `IUI.hint(id, text, actions)`). */
export const HINT_ACTIONS: Record<string, ActionId[]> = Object.fromEntries(
  Object.entries(HINTS).map(([id, text]) => [id, actionsIn(text)]),
);

/** ActionIds referenced by `{...}` placeholders in a string, in order, without duplicates. */
export function actionsIn(text: string): ActionId[] {
  const out: ActionId[] = [];
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    const a = m[1] as ActionId;
    if ((ACTIONS as readonly string[]).includes(a) && !out.includes(a)) out.push(a);
  }
  return out;
}

/**
 * Replace `{<ActionId>}`, `{move}` and `{camera}` with prompt labels.
 * `glyph` is usually `input.glyph`; `device` picks the stick/mouse wording for move/camera.
 */
export function formatActions(text: string, glyph: (a: ActionId) => string, device: 'kbm' | 'pad' = 'kbm'): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    if (name === 'move') return device === 'pad' ? 'Left stick' : 'WASD';
    if (name === 'camera') return device === 'pad' ? 'Right stick' : 'Mouse';
    return (ACTIONS as readonly string[]).includes(name) ? glyph(name as ActionId) : whole;
  });
}

// ------------------------------------------------------------------ names & banners

export const REGION_NAME = 'Ashbridge';

export const AREA_NAMES: Record<string, string> = {
  watchtower: 'Ashbridge Watchtower',
  lowerStreet: 'Lower Street',
  oldMint: 'The Old Mint',
  countingRoom: 'The Counting Room',
  lowerPassage: 'Lower Passage',
  courtyard: 'Gatehouse Courtyard',
  hospice: 'Hospice of the Quiet Hour',
  gateApproach: 'Gate Approach',
  commandersYard: 'The Commander\'s Yard',
  fieldBeneath: 'The Field Beneath',
};

export const STILLBELL_NAMES: Record<string, string> = {
  watchtower: 'Watchtower Stillbell',
  hospice: 'Hospice Stillbell',
};

export const BOSS: Record<string, { name: string; title: string }> & { corvane: { name: string; title: string } } = {
  corvane: { name: 'Ser Corvane Aldmoor', title: 'Bell-Appointed Commander of Ashbridge' },
};

/** Boss phase names (for captions or the boss bar, optional). */
export const BOSS_PHASES = {
  corvane: ['The Appointed Commander', 'The Measure'],
} as const;

export const WARNINGS: Record<string, { title: string; body: string; yes?: string; no?: string }> & { arenaWithPrisoner: { title: string; body: string; yes: string; no: string }; arenaPlain: { title: string; body: string; yes: string; no: string } } = {
  arenaWithPrisoner: {
    title: 'Ser Corvane Waits',
    body: 'Beyond this veil, Ser Corvane waits. Once you cross it, the Commander\'s men will move anyone still imprisoned below the mint. Cross now?',
    yes: 'Cross',
    no: 'Not yet',
  },
  arenaPlain: {
    title: 'Ser Corvane Waits',
    body: 'Beyond this veil, Ser Corvane waits. Cross now?',
    yes: 'Cross',
    no: 'Not yet',
  },
};

export const DEATH_TEXT = 'THE BELL RECALLS YOU';
export const STILLBELL_LIT_TEXT = 'STILLBELL KINDLED';
export const BOSS_DEFEATED_TEXT = 'ANCHOR SHATTERED';
export const REGION_COMPLETE_TEXT = 'ASHBRIDGE REMEMBERED';
export const MEMORY_BANNER_TEXT = 'FINAL MEMORY';

/** Sound captions (accessibility). */
export const CAPTIONS: Record<string, string> = {
  toll: '[Bell tolls]',
  opening: '[Opening]',
  anchorBell: '[Anchor-bell rings]',
  anchorShatter: '[Bell shatters]',
  sentryMutter: '[Sentry muttering]',
  hatch: '[Iron grinds open]',
  drawbridge: '[Chains rattle — drawbridge lowers]',
  stillbell: '[Stillbell chimes]',
  parry: '[Steel rings]',
  guardBreak: '[Guard cracks]',
};

// ------------------------------------------------------------------ memory rewards

/**
 * Final Memory exchanges. Reward ids: a technique id (grants its `imprint_<id>` scroll),
 * an item id, or `hours:<amount>`.
 */
export const MEMORY_REWARDS: Record<string, MemoryReward[]> = {
  memory_corvane: [
    {
      id: 'measured_cut', name: 'Measured Cut', icon: 'measured_cut', kind: 'technique',
      description: 'An Imprint Technique: dash forward with two measured cuts. Can be imprinted on a straight sword, curved sword or greatsword.',
    },
    {
      id: 'commander_blade', name: 'Commander\'s Blade', icon: 'commander_blade', kind: 'weapon',
      description: 'Ser Corvane\'s long, heavy sword. Carries Measured Cut. Requires 14 Strength and 11 Dexterity.',
    },
    {
      id: 'hours:4000', name: '4,000 Hours', icon: 'hours', kind: 'hours',
      description: 'Let the memory go, and keep the time it held. Enough for several levels or a good deal of smithing.',
    },
  ],
};

// ------------------------------------------------------------------ acquisition notes

/**
 * Where each item / spell is obtained. For pickup placement by the integrator.
 * "Origin: X" = starting kit. "Later: <region>" = not placed in the Ashbridge slice.
 * Spell entries are keyed `spell:<id>`.
 */
export const ACQUISITION: Record<string, string> = {
  // weapons
  retainer_sword: 'Origin: Household Knight. Also on the Hospice gear rack.',
  commander_blade: 'Final Memory of Ser Corvane (exchanged at a Stillbell).',
  bellwarden_greatsword: 'Gate Approach — on a fallen bellwarden by the gatehouse stair.',
  garrison_spear: 'Courtyard — armoury alcove beneath the parapet stair.',
  gatewarden_halberd: 'Later: Royal Army (Siegeholm) — carried by gatewardens.',
  greyford_sabre: 'The Field Beneath — given by Sergeant Brannoc after Ser Corvane falls. Later: dropped by Greyford soldiers.',
  coinbreaker_hammer: 'Old Mint — beside the coin presses in the entry hall.',
  woodsman_axe: 'Lower Street — in the woodpile of a burned house.',
  oath_estoc: 'Origin: Oathblade. Later: Royal Household.',
  mourning_mace: 'Origin: Funeral Priest. Later: Cathedral.',
  condemned_chain: 'Origin: Condemned Retainer. Later: Royal Household (the yard cells).',
  parrying_dirk: 'Origin: Court Mage, Oathblade. Also on the Hospice gear rack.',
  skinning_knife: 'Origin: Royal Huntsman. Later: Royal Army.',
  court_staff: 'Origin: Court Mage. Also on the Hospice gear rack.',
  mint_seal_staff: 'Counting Room — on the mint-master\'s desk.',
  hand_bell: 'Origin: Funeral Priest. Given by Oswin Marrow with Stilling Chime if you have no rite catalyst.',
  pilgrim_censer: 'Lower Street — roadside shrine at the foot of the cliff stair.',
  huntsman_bow: 'Origin: Royal Huntsman. Later: Royal Army.',
  garrison_arbalest: 'Courtyard parapet — at the archer\'s post (with 20 Iron Bolts).',
  // shields
  household_shield: 'Origin: Household Knight. Also on the Hospice gear rack.',
  mint_buckler: 'Old Mint — on the wardens\' rack in the entry hall.',
  greyford_tower_shield: 'The Field Beneath — propped against a Greyford grave marker (after Ser Corvane).',
  pilgrim_roundshield: 'Later: Cathedral (the Pilgrim Stair).',
  // armour sets
  'set:retainer': 'Origin: Household Knight. Also on the Hospice gear rack.',
  'set:court': 'Origin: Court Mage. Also on the Hospice gear rack.',
  'set:oath': 'Origin: Oathblade. Later: Royal Household.',
  'set:funeral': 'Origin: Funeral Priest. Later: Cathedral.',
  'set:huntsman': 'Origin: Royal Huntsman. Later: Royal Army.',
  'set:condemned': 'Origin: Condemned Retainer. Later: Royal Household.',
  'set:commander': 'Commander\'s Yard — the armour stand in the gatehouse, after Ser Corvane falls.',
  'set:greyford': 'Later: the Unlived Muster questline (Brannoc). Helm and brigandine: The Field Beneath.',
  'set:warden': 'Old Mint — the wardens\' lockers beside the entry hall.',
  'set:hospice': 'Hospice — the linen press in the ward, after Oswin is rescued.',
  'set:bellkeeper': 'Later: Royal Household (the bell-tower cells).',
  'set:gatewarden': 'Later: Royal Army (Siegeholm).',
  // talismans & consumables
  warden_talisman: 'Lower Passage — treasure chest.',
  recall_flask: 'Every origin.',
  recall_flask_focus: 'Every origin.',
  throwing_knife: 'Origin kits; Lower Street corpses (×3); sold by Hesper Vail.',
  ember_resin: 'Lower Street (×2, burned house); sold by Hesper Vail.',
  bone_arrow: 'Origin: Royal Huntsman; sold by Hesper Vail.',
  iron_bolt: 'With the Garrison Arbalest; sold by Hesper Vail.',
  // materials & keys
  tempered_scrap: 'Lower Street (×1), Old Mint (×2), Lower Passage (×1), Gate Approach (×1); sold by Hesper Vail after Ser Corvane falls.',
  bellbronze_scrap: 'The Field Beneath (×1). Later: every region.',
  bellbronze_shard: 'Courtyard — on the fallen cart.',
  refuge_key: 'Carried by the Lower Passage sentry; a spare hangs on the counting-room ledger hook.',
  // spellbooks
  grimoire_cinder_bolt: 'Lower Passage — a clerk\'s desk.',
  grimoire_shard_volley: 'Lower Street — a nook in the south alley.',
  grimoire_bellglass_lance: 'Later: Royal Academy.',
  grimoire_falling_hour: 'Later: Royal Academy.',
  prayer_vigil_of_ash: 'Lower Passage — beside Oswin\'s cot in the locked refuge (once opened).',
  psalter_toll_of_warding: 'Later: Cathedral.',
  // imprint scrolls
  imprint_measured_cut: 'Final Memory of Ser Corvane (technique reward).',
  imprint_riposte_stance: 'Hospice practice yard — on the lectern beside the parry plaque.',
  imprint_ember_edge: 'Sold by Hesper Vail (1,500 Hours).',
  imprint_bell_breaker: 'Lower Street — upper floor of the burned bell-foundry.',
  imprint_impaling_charge: 'Courtyard — armoury alcove, with the Garrison Spear.',
  imprint_pinning_shot: 'Courtyard parapet — at the archer\'s post.',
  imprint_greyford_flourish: 'Later: the Unlived Muster questline (Brannoc).',
  imprint_rending_sweep: 'Later: Royal Army.',
  imprint_knell_strike: 'Later: Cathedral.',
  imprint_vow_parry: 'Later: Royal Household.',
  imprint_oathbound_lunge: 'Later: Royal Household (innate to the Retainer Sword).',
  imprint_bulwark_toll: 'Later: Royal Household (innate to the Household Shield).',
  imprint_bellglass_ward: 'Later: Royal Academy (innate to the Court Staff).',
  imprint_chain_whirl: 'Later: Royal Household (innate to the Condemned Chain).',
  imprint_vow_pursuit: 'Later: Royal Household (innate to the Oath Estoc).',
  imprint_stilled_breath: 'Later: Royal Army (innate to the Huntsman\'s Shortbow).',
  // memories
  memory_corvane: 'Ser Corvane Aldmoor.',
  // spells
  'spell:glinting_shard': 'Origin: Court Mage.',
  'spell:cinder_bolt': 'Grimoire: Cinder Bolt (Lower Passage).',
  'spell:shard_volley': 'Grimoire: Shard Volley (Lower Street, south alley).',
  'spell:bellglass_lance': 'Later: Royal Academy.',
  'spell:falling_hour': 'Later: Royal Academy.',
  'spell:stilling_chime': 'Oswin Marrow, at the Hospice, after his rescue.',
  'spell:ember_blessing': 'Oswin Marrow, at the Hospice, after his rescue.',
  'spell:ashen_veil': 'Oswin Marrow, at the Hospice, after Ser Corvane falls (only if Oswin was rescued).',
  'spell:vigil_of_ash': 'Prayer: Vigil of Ash (Lower Passage refuge).',
  'spell:knell_of_rest': 'Origin: Funeral Priest. Later: Cathedral.',
  'spell:toll_of_warding': 'Later: Cathedral.',
};

/** Regions add inspectables, hints, area, Stillbell and boss names here. */
export function registerText(t: {
  inspect?: Record<string, { title: string; lines: string[] }>;
  hints?: Record<string, string>;
  areas?: Record<string, string>;
  stillbells?: Record<string, string>;
  bosses?: Record<string, { name: string; title: string }>;
  memoryRewards?: Record<string, MemoryReward[]>;
  warnings?: Record<string, { title: string; body: string; yes?: string; no?: string }>;
}) {
  if (t.inspect) Object.assign(INSPECT, t.inspect);
  if (t.hints) Object.assign(HINTS, t.hints);
  if (t.areas) Object.assign(AREA_NAMES, t.areas);
  if (t.stillbells) Object.assign(STILLBELL_NAMES, t.stillbells);
  if (t.bosses) Object.assign(BOSS, t.bosses);
  if (t.memoryRewards) Object.assign(MEMORY_REWARDS, t.memoryRewards);
  if (t.warnings) Object.assign(WARNINGS, t.warnings);
}
