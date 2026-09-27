/**
 * academy — always-loaded metadata for the Suspended Campus (the Royal Academy): region items,
 * journal leads, Stillbell/boss/area names, warnings, Final Memory rewards, the Hospice guest
 * (Ansel Wick, the expelled scholar) with his shop and lines, and the NPC looks that must exist
 * outside the region (the Hospice). No level geometry here.
 */
import type { ItemDef } from '../../game/types';
import { registerItems, SHOP_STOCK } from '../items';
import { registerLeads } from '../journal';
import { registerText } from '../text';
import { registerDialogue } from '../dialogue';
import { registerHospiceGuest } from '../../game/regions/hub';
import './npcLooks';

// ------------------------------------------------------------------ items

const items: ItemDef[] = [
  {
    id: 'keepers_lens_staff', name: 'Keeper\'s Lens Staff', kind: 'catalyst', icon: 'keepers_lens_staff', weight: 4,
    description: 'A tall staff crowned with a ground lens in a bronze cage. Its sorceries strike hardest of any staff, for those with the Intellect to focus it.',
    lore: 'Ilsabet Orrow ground the lens herself, from a pane of the first Observatory. She said a lens does not care what it burns, only that it is aimed.',
    weapon: {
      class: 'staff', damage: { physical: 34, magic: 0, fire: 0 },
      scaling: { intellect: 'A' }, requirements: { strength: 7, intellect: 18 },
      criticalMult: 2.2, postureMult: 0.55, technique: 'bellglass_ward', casts: 'sorcery', maxUpgrade: 10,
    },
  },
  {
    id: 'memory_orrow', name: 'Final Memory of Keeper Orrow', kind: 'memory', icon: 'memory_orrow',
    description: 'At a Stillbell, exchange it for one of several rewards: a sorcery, the Keeper\'s staff, or a great sum of Hours.',
    lore: 'The last thing Orrow saw was the register, open to a page she had not finished striking out. The memory is sharp at the edges.',
    memory: { boss: 'orrow' },
  },
  {
    id: 'wick_copy_shard_volley', name: 'Scholar\'s Copy: Shard Volley', kind: 'spellbook', icon: 'grimoire_shard_volley', price: 1800,
    description: 'Ansel Wick\'s fair copy of Shard Volley. Teaches the sorcery; casting it needs a sorcery catalyst and 13 Intellect.',
    lore: 'Copied out twice, because the first copy was confiscated. The margins are full of sea-birds.',
    spellbook: { spell: 'shard_volley' },
  },
  {
    id: 'wick_copy_falling_hour', name: 'Scholar\'s Copy: Falling Hour', kind: 'spellbook', icon: 'grimoire_falling_hour', price: 3600,
    description: 'Ansel Wick\'s copy of Falling Hour. Teaches the sorcery; casting it needs a sorcery catalyst and 16 Intellect.',
    lore: 'Wick corrected the Academy\'s diagram of the falling bell. His version lands a heartbeat later, and misses the scribe.',
    spellbook: { spell: 'falling_hour' },
  },
  {
    id: 'wick_copy_bellglass_lance', name: 'Scholar\'s Copy: Bellglass Lance', kind: 'spellbook', icon: 'grimoire_bellglass_lance', price: 6000,
    description: 'Ansel Wick\'s copy of Bellglass Lance, written from memory after the Keeper fell. Casting it needs a sorcery catalyst and 18 Intellect.',
    lore: 'He wrote it in one night, without looking up. In the morning he asked to be told whether it was right, and would not read it back.',
    spellbook: { spell: 'bellglass_lance' },
  },
  {
    id: 'register_leaf', name: 'Leaf of the Register', kind: 'key', icon: 'register_leaf',
    description: 'A page cut from the Academy\'s Register of Unmade Names. Corporal Fenn\'s name is on it, struck through and written again.',
    lore: 'Two hands on one line: a clerk\'s neat stroke through the name, and below it the same name in capitals, pressed so hard the nib tore the page.',
  },
];
registerItems(items);

// ------------------------------------------------------------------ Hospice guest: Ansel Wick

SHOP_STOCK.wick = [
  { itemId: 'wick_copy_shard_volley', stock: 1 },
  { itemId: 'wick_copy_falling_hour', stock: 1 },
  { itemId: 'wick_copy_bellglass_lance', stock: 1, requiresFlag: 'boss.orrow' },
  { itemId: 'grimoire_cinder_bolt', stock: 1 },
];

registerHospiceGuest({
  id: 'wick', name: 'Ansel Wick', look: 'anselWick', idle: 'sit',
  present: (ws) => ws.npcs.wick === 'rescued',
  greet: 'wick_hospice_first', idlePool: 'wick_hospice_idle', shop: 'wick', teaches: ['shard_volley'],
});

const WICK = 'Ansel Wick';
const RETURNED = 'The Returned';
registerDialogue({
  wick_hospice_first: [
    { speaker: WICK, text: 'A hospice. I have never been anywhere with so few locks. It is very disorienting.' },
    { speaker: WICK, text: 'Oswin says I may keep a table by the window if I stop drawing on the walls.' },
    { speaker: RETURNED, text: 'What are you drawing?' },
    { speaker: WICK, text: 'A bell for the sea wall. It rings when the swell rises, so the boats stay off the rocks. Nothing a king would want.' },
    { speaker: WICK, text: 'Let me teach you something that throws glass instead of sense. You look like you need both.' },
  ],
  wick_hospice_idle: [
    { speaker: WICK, text: 'The Keeper wrote that I "confused the purpose of knowledge with its comfort." She was half right.', duration: 5 },
    { speaker: WICK, text: 'Shards go straighter if you aim at the space just behind the target. So do most arguments.', duration: 5 },
    { speaker: WICK, text: 'Sometimes I dream of an engine with a lever, and my hand on it. I wake before I pull.', duration: 5 },
    { speaker: WICK, text: 'I have copies of what the Academy would not let me keep. Take what is useful.', duration: 4 },
  ],
});

// ------------------------------------------------------------------ journal

registerLeads({
  academy_scholar: {
    title: 'The Expelled Scholar',
    region: 'The Royal Academy',
    entries: {
      mem_wick: {
        category: 'remembered',
        text: 'Ansel Wick was expelled from the Royal Academy the week I entered the king\'s service. Years later he built the striking-engines of the Great Bells for Aldren. I remember his hand on the lever.',
      },
      obs_notes_bell: {
        category: 'observed',
        text: 'Wick\'s notebook on a lectern in the Hall of Lenses: page after page of a striking-engine for a great bell. The same engine I saw in the Belfry, the night the kingdom was rung away.',
      },
      obs_notes_sea: {
        category: 'observed',
        text: 'A second copy of the same notebook, same hand and same date, shows another engine: a storm-bell for the sea wall, to warn boats off the rocks. Both books are real. Only one of them will be kept.',
        contradicts: 'mem_wick',
        contradictionNote: 'The same notes exist in a state where he builds nothing for the king.',
      },
      obs_cage: {
        category: 'observed',
        text: 'Wick is alive, shut in a laboratory cage hung on chains over the drop. The Keeper\'s wardens mean to strike his name from the register, and him with it.',
      },
      conf_rescued: {
        category: 'confirmed',
        text: 'I winched the cage to the bridge and set Ansel Wick free. He has gone to the Hospice. On his drafting board in the Hall of Lenses, the storm-bell has replaced the striking-engine.',
        sets: 'resolved',
      },
      conf_taken: {
        category: 'confirmed',
        text: 'I crossed the Keeper\'s veil while Wick was still caged. The cage hangs open and empty, and his line in the register is scraped clean. Only the striking-engine notebook remains.',
        loss: true,
        sets: 'lost',
      },
    },
  },
  academy_keeper: {
    title: 'The Keeper of the Academy',
    region: 'The Royal Academy',
    entries: {
      mem_orrow: {
        category: 'remembered',
        text: 'In the last year Keeper Ilsabet Orrow sealed the Academy archive against the war and burned the students\' names out of the register, so that what they knew would outlive them.',
      },
      obs_register: {
        category: 'observed',
        text: 'The Register of Unmade Names is still open in the archive. Whole pages are struck through in the Keeper\'s hand. Some lines have been written in again by someone else.',
        contradicts: 'mem_orrow',
        contradictionNote: 'Not burned yet, and someone is writing the names back.',
      },
      obs_lens_floor: {
        category: 'observed',
        text: 'The Observatory floor is laid in lens-plates. Plates about to burn glow and show a broken ring for a breath before the light falls. The Keeper turns them as she fights.',
      },
      conf_orrow: {
        category: 'confirmed',
        text: 'Keeper Orrow is dead and the anchor of the Academy\'s Great Bell has shattered. The bell hangs silent over the sea.',
        sets: 'resolved',
      },
    },
  },
  muster_academy: {
    title: 'The Unlived Muster: Corporal Fenn',
    region: 'The Royal Academy',
    entries: {
      obs_fenn: {
        category: 'observed',
        text: 'Corporal Fenn of the Greyford muster sits in the dry half of the drowned theatre. He asks whether his name is written anywhere the Academy keeps.',
      },
      obs_leaf: {
        category: 'observed',
        text: 'In the archive\'s Register of Unmade Names: "Fenn, Corporal, Fourth Company". Struck through, and written again beneath in capitals. I cut the leaf out.',
      },
      conf_fenn: {
        category: 'confirmed',
        text: 'I showed Fenn his name. He will answer when the muster is called.',
        sets: 'resolved',
      },
    },
  },
});

// ------------------------------------------------------------------ names, warnings, memory rewards

registerText({
  stillbells: {
    'academy.causeway': 'Sea Causeway Stillbell',
    'academy.lenshall': 'Hall of Lenses Stillbell',
    'academy.spire': 'Unfinished Spire Stillbell',
  },
  bosses: {
    orrow: { name: 'Keeper Ilsabet Orrow', title: 'Keeper of the Suspended Campus' },
    experiment9: { name: 'Aberrant Experiment No. 9', title: 'Unfinished Work of the Royal Academy' },
  },
  areas: {
    'academy.causeway': 'Sea Causeway', 'academy.tidalStair': 'Tidal Stair', 'academy.theatre': 'The Drowned Theatre',
    'academy.tunnel': 'Prompters\' Passage', 'academy.liftWell': 'Lift Well', 'academy.hall': 'Hall of Lenses',
    'academy.terrace': 'Lens Terrace', 'academy.bridge': 'Chain Bridge', 'academy.labs': 'The Suspended Laboratories',
    'academy.lab9': 'Laboratory No. 9', 'academy.spireYard': 'Spire Yard', 'academy.spire': 'The Unfinished Spire',
    'academy.observatory': 'The Observatory of Lenses',
  },
  warnings: {
    orrowWithScholar: {
      title: 'Keeper Orrow Waits',
      body: 'Beyond this veil, Keeper Orrow waits. Once you cross it, her wardens will strike the caged scholar from the register, and he will be lost. Cross now?',
      yes: 'Cross', no: 'Not yet',
    },
    orrowPlain: { title: 'Keeper Orrow Waits', body: 'Beyond this veil, Keeper Orrow waits. Cross now?', yes: 'Cross', no: 'Not yet' },
  },
  memoryRewards: {
    memory_orrow: [
      {
        id: 'grimoire_bellglass_lance', name: 'Bellglass Lance', icon: 'bellglass_lance', kind: 'spell',
        description: 'A sorcery: a long spear of ringing glass that pierces through a line of foes. Requires 18 Intellect.',
      },
      {
        id: 'keepers_lens_staff', name: 'Keeper\'s Lens Staff', icon: 'keepers_lens_staff', kind: 'weapon',
        description: 'Orrow\'s catalyst. Sorcery scaling A with Intellect; carries Bellglass Ward. Requires 18 Intellect.',
      },
      {
        id: 'hours:6000', name: '6,000 Hours', icon: 'hours', kind: 'hours',
        description: 'Let the memory go, and keep the time it held.',
      },
    ],
  },
});
