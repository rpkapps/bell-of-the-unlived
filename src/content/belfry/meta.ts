/**
 * belfry — always-loaded metadata (owned by the belfry region build): items, journal leads, text
 * (areas, Stillbell names, boss names, inspectables, warnings) and memory rewards.
 * Keep this light: no geometry, no clips. Heavy content goes in ./module.ts (lazy-loaded).
 *
 * Journal entry ids are global keys in the save, so every Belfry entry is prefixed `bf_`.
 * The central revelation lead (`revelation`) belongs to the Treasury build; the Belfry adds its
 * closing entry `conf_revelation` to that lead when it exists (see `ensureRevelationEntry`) and
 * keeps its own evidence in the `belfry` lead ("The Full Record").
 */
import { registerItems } from '../items';
import { registerLeads, LEADS, type LeadEntryDef } from '../journal';
import { registerText } from '../text';

// ------------------------------------------------------------------ items

registerItems([
  {
    id: 'memory_aldren', name: 'Final Memory of King Aldren', kind: 'memory', icon: 'memory_aldren',
    description: 'At a Stillbell, exchange it for one of several rewards: a talisman, a sorcery, or a great sum of Hours.',
    lore: 'Three reigns in one memory: a young man with a lance, a sorcerer under a crown of bells, an old king holding up the sky. None of them is sorry.',
    memory: { boss: 'aldren' },
  },
  {
    id: 'memory_bellkeeper', name: 'Final Memory of the Condemned Bellkeeper', kind: 'memory', icon: 'memory_bellkeeper',
    description: 'At a Stillbell, exchange it for one of several rewards: a technique, a hand bell, or a sum of Hours.',
    lore: 'The smell of hot iron, and a hand that did not shake. He branded a dying man so that one person would remember. He never learned whether it worked.',
    memory: { boss: 'bellkeeper' },
  },
  {
    id: 'aldren_signet', name: 'Signet of the Unrung Crown', kind: 'talisman', icon: 'aldren_signet', weight: 0.5,
    description: 'Raises maximum stamina by 10 %.',
    lore: 'Struck for a coronation that never happened. The face on it is not Aldren\'s. It is a council of seven, and none of them is looking at the viewer.',
    talisman: { effect: 'staminaMax10' },
  },
  {
    id: 'bellkeeper_confession', name: 'The Bellkeeper\'s Confession', kind: 'key', icon: 'bellkeeper_confession',
    description: 'A soot-black book of names, recovered from the Branding Cell beneath the Belfry.',
    lore: 'Every soul the Bellkeeper branded to remember, in his own hand. Most lines end in a date and the word "forgot". The last line has no date. It is the Returned\'s name, and after it: "Let this one keep it."',
  },
]);

// ------------------------------------------------------------------ Forememory

export const BELFRY_LEAD = 'belfry';

const BELFRY_ENTRIES: Record<string, LeadEntryDef> = {
  bf_mem_once: {
    category: 'remembered',
    text: 'On the last day, on the bell-tower stair, Aldren said it was the first time. "Only once," he told the dark. "Only because there is no other way."',
  },
  bf_obs_victory: {
    category: 'observed',
    text: 'A victory roll in the Belfry\'s first hall celebrates a triumph at Greyford. The Army\'s own graves call it a rout. Aldren\'s seal is on both.',
  },
  bf_obs_theatre: {
    category: 'observed',
    text: 'A lecturer\'s slate in the drowned theatre: "The Ninth Future, in which the river guilds lift the siege and the crown is not required." Struck through, in the king\'s hand.',
  },
  bf_obs_nave: {
    category: 'observed',
    text: 'Every name-plate in the nave has been scraped blank. One still bears a name. It is mine.',
  },
  bf_obs_vault: {
    category: 'observed',
    text: 'The vault ledger counts forty-one ringings of the five bells. Beside each, a sum of lives, and one word: "insufficient".',
  },
  bf_obs_coronation: {
    category: 'observed',
    text: 'The coronation roll crowns a Regency Council in a future where Aldren died at thirty. That kingdom lived another hundred years. He rang the bells over it anyway.',
    contradicts: 'bf_mem_once',
    contradictionNote: 'It was never the first time. He had rung them dozens of times, even over futures that survived without him.',
  },
  bf_conf_record: {
    category: 'confirmed',
    text: 'I laid the full record on the empty throne. The council of the coronation that never happened took their seats, and they have not left.',
  },
  bf_obs_brand: {
    category: 'observed',
    text: 'Beneath the Belfry, in a cell cut into the crag, the Condemned Bellkeeper still heats the brand that marked me. He was condemned for refusing to ring.',
  },
  bf_conf_bellkeeper: {
    category: 'confirmed',
    text: 'The Bellkeeper is at rest. His confession names every soul he branded to remember, and how each one forgot. Mine is the last line.',
    loss: true,
  },
  bf_conf_aldren: {
    category: 'confirmed',
    text: 'King Aldren has fallen at the Bell Crown. The Bell of Return hangs lowered and silent, waiting for a hand.',
    sets: 'resolved',
  },
};

registerLeads({
  [BELFRY_LEAD]: { title: 'The Full Record', region: 'The Belfry of Return', entries: BELFRY_ENTRIES },
});

/** The Belfry's closing entry for the central revelation lead (owned by the Treasury build). */
export const CONF_REVELATION: LeadEntryDef = {
  category: 'confirmed',
  text: 'I have read the full record at the top of the Belfry. Aldren rejected dozens of futures before mine, including every one in which the kingdom lived without him.',
};

/**
 * Adds `conf_revelation` to the `revelation` lead if another region registered that lead and it
 * doesn't define the entry itself. Returns the lead id to record the revelation under.
 */
export function ensureRevelationEntry(): { lead: string; entry: string } {
  const lead = LEADS.revelation;
  if (lead) {
    if (!lead.entries.conf_revelation) lead.entries.conf_revelation = CONF_REVELATION;
    return { lead: 'revelation', entry: 'conf_revelation' };
  }
  // No revelation lead in this build: keep the Belfry's own record (never lose the entry).
  if (!LEADS[BELFRY_LEAD].entries.bf_conf_revelation) LEADS[BELFRY_LEAD].entries.bf_conf_revelation = CONF_REVELATION;
  return { lead: BELFRY_LEAD, entry: 'bf_conf_revelation' };
}
ensureRevelationEntry();

// ------------------------------------------------------------------ text

registerText({
  areas: {
    'belfry.foot': 'Foot of the Belfry',
    'belfry.causeway': 'The Causeway of Petitions',
    'belfry.ledge': 'The Windward Ledge',
    'belfry.hall': 'Hall of the Victory That Was',
    'belfry.theatre': 'The Drowned Lecture Theatre',
    'belfry.nave': 'The Nameless Nave',
    'belfry.vault': 'The Empty Vault',
    'belfry.coronation': 'The Coronation That Never Happened',
    'belfry.gallery': 'The Buttress Gallery',
    'belfry.stair': 'The Crown Stair',
    'belfry.crown': 'The Bell Crown',
    'belfry.cell': 'The Branding Cell',
  },
  stillbells: {
    'belfry.foot': 'Foot of the Belfry',
    'belfry.crown': 'The Bell Crown',
  },
  bosses: {
    aldren: { name: 'King Aldren', title: 'Who Rang the Bells of Return' },
    bellkeeper: { name: 'The Condemned Bellkeeper', title: 'Who Branded the Returned' },
  },
  warnings: {
    'belfry.aldren': {
      title: 'The Bell Crown',
      body: 'Beyond this veil, King Aldren waits beneath the Bell of Return. Nothing is decided by crossing. Cross now?',
      yes: 'Cross', no: 'Not yet',
    },
  },
  memoryRewards: {
    memory_aldren: [
      { id: 'aldren_signet', name: 'Signet of the Unrung Crown', icon: 'aldren_signet', kind: 'item', description: 'A talisman that raises maximum stamina by 10 %.' },
      { id: 'grimoire_falling_hour', name: 'Grimoire: Falling Hour', icon: 'grimoire_falling_hour', kind: 'spell', description: 'The Sorcerer-King\'s own treatise. Teaches the sorcery Falling Hour (16 Intellect).' },
      { id: 'hours:30000', name: '30,000 Hours', icon: 'hours', kind: 'hours', description: 'Every hour he borrowed, returned to someone who will spend it.' },
    ],
    memory_bellkeeper: [
      { id: 'knell_strike', name: 'Grave Knell', icon: 'knell_strike', kind: 'technique', description: 'An Imprint Technique for maces, hammers and hand bells: a tolling blow that staggers.' },
      { id: 'hand_bell', name: 'Hand Bell', icon: 'hand_bell', kind: 'weapon', description: 'A rite catalyst. His own was cracked; this one still rings.' },
      { id: 'hours:12000', name: '12,000 Hours', icon: 'hours', kind: 'hours', description: 'Let the memory go, and keep the time it held.' },
    ],
  },
  inspect: {
    'belfry.greatDoorBarred': { title: 'The Great Door', lines: ['Barred from within. Beyond the planks, a bell tolls once, very far above, and the bar shivers in its brackets.'] },
    'belfry.statues': {
      title: 'Twin Monuments',
      lines: [
        'Two statues of Aldren flank the causeway. On the left, the Conqueror at twenty, lance raised over a kneeling city.',
        'On the right, the same young man on a scaffold, crowned with a noose. The plinth reads: "Deposed by the Estates. The kingdom endured."',
        'Both were cut from the same block, by the same hand.',
      ],
    },
    'belfry.record1': {
      title: 'The Victory Roll',
      lines: [
        'A roll of honour on a lectern, gilded at every edge: "The Victory at Greyford, won by the King\'s own lance."',
        'Beneath the gilt, older ink shows through: "Greyford — rout — the muster did not return. Ring."',
        'The same seal closes both.',
      ],
    },
    'belfry.record2': {
      title: 'A Lecturer\'s Slate',
      lines: [
        '"Lecture the Ninth: The Future of the River Guilds. The siege is lifted by barges of grain. The crown is not required."',
        'The last line has been struck through so hard the slate is cracked: "Not required."',
      ],
    },
    'belfry.record3': {
      title: 'The Nameless Register',
      lines: [
        'The nave\'s register of the dead. Each name has been scraped away, carefully, with a knife.',
        'Where the names were, someone has written numbers. The numbers add up. They always add up.',
      ],
    },
    'belfry.record4': {
      title: 'Ledger of Ringings',
      lines: [
        'A treasury ledger, bound in bell-bronze. Forty-one entries. Each gives a date, five bells, and a sum of lives.',
        'Each sum is marked "insufficient". The last entry is the day I remember. That one is marked "final".',
      ],
    },
    'belfry.record5': {
      title: 'The Coronation Roll',
      lines: [
        'A coronation roll for a Regency Council of seven, crowned after King Aldren died of a fever at thirty.',
        'Appended in a steadier hand: "The Council kept the peace for one hundred and four years. The river guilds were never hungry."',
        'And beneath, in Aldren\'s hand: "It would have been without me." Then the bells were rung.',
      ],
    },
    'belfry.coffins': { title: 'Draped Coffins', lines: ['Coffins under victory banners, lined up like a guard of honour. The plates give the date of the triumph. Every one of them died on it.'] },
    'belfry.seats': { title: 'Flooded Tiers', lines: ['The lowest tiers of the theatre are under still black water. Chalk on the benches: "Question: what is a kingdom worth without its king?" No one has written an answer.'] },
    'belfry.plaques': { title: 'Blank Name-Plates', lines: ['Hundreds of bronze plates, every one scraped clean. Only one, low on the west wall, still carries letters. It is my name, and it is loose in its setting.'] },
    'belfry.coffers': { title: 'Empty Coffers', lines: ['Every chest is open and every chest is empty. The scales beside them are perfectly balanced, weighing nothing against nothing.'] },
    'belfry.throne': { title: 'The Empty Throne', lines: ['A throne on a dais, a crown on a cushion beside it. The dust on the seat has never been disturbed. Seven chairs face it, and they are empty too.'] },
    'belfry.throneLaid': { title: 'The Empty Throne', lines: ['The record lies open on the seat. The council of seven sit in their chairs, pale as candle-smoke, and keep the silence of people who were never needed.'] },
    'belfry.galleryGate': { title: 'Iron Gate', lines: ['An iron gate, locked from the stair side. Above, a gallery climbs the buttresses into the storm.'] },
  },
});
