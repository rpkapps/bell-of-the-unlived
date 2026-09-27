/**
 * cathedral — always-loaded metadata (owned by the cathedral region build): items, journal leads,
 * text (areas, Stillbell names, boss names, inspectables, warnings, memory rewards), dialogue, and
 * the Hospice guest (Wenna Hale). No geometry: the NPC look builder only registers a function.
 */
import type { ItemDef } from '../../game/types';
import { registerItems } from '../items';
import { registerLeads } from '../journal';
import { registerText } from '../text';
import { registerDialogue } from '../dialogue';
import { registerHospiceGuest } from '../../game/regions/hub';
import { registerCathedralNpcLooks } from './models';

// ------------------------------------------------------------------ items

const ITEMS: ItemDef[] = [
  {
    id: 'crozier_of_names', name: 'Crozier of the Hundred Names', kind: 'catalyst', icon: 'court_staff', weight: 4.5,
    description: 'Saint Vessaline\'s crozier, crowned with a bell of beaten names. Rings bell rites; swings long and heavy.',
    lore: 'Every pilgrim who gave up a name to the Saint pressed it into the bell\'s bronze with a thumb. The metal is soft with them.',
    weapon: {
      class: 'staff', damage: { physical: 62, magic: 22, fire: 0 },
      scaling: { strength: 'E', devotion: 'B' }, requirements: { strength: 10, devotion: 16 },
      criticalMult: 2.2, postureMult: 0.7, technique: 'bellglass_ward', casts: 'rite', maxUpgrade: 10,
    },
  },
  {
    id: 'veil_of_names', name: 'Veil of the Hundred Names', kind: 'armor', icon: 'funeral_veil', weight: 3,
    armorSet: 'funeral',
    description: 'A gilt veil stitched over and over with names. Light, and unusually good against rites and sorcery.',
    lore: 'The stitches overlap so thickly that no single name can be read. The Saint said that was the point.',
    armor: { slot: 'head', physical: 4, magic: 9, fire: 3, poise: 2 },
  },
  {
    id: 'memory_vessaline', name: 'Final Memory of Saint Vessaline', kind: 'memory', icon: 'memory_corvane',
    description: 'At a Stillbell, exchange it for one of several rewards: a crozier, a veil, or a great sum of Hours.',
    lore: 'The last thing the Saint felt was a hundred hands letting go of hers. The memory is crowded, and very quiet.',
    memory: { boss: 'vessaline' },
  },
  {
    id: 'name_tablet_wenna', name: 'Name-Tablet: Wenna Hale', kind: 'key', icon: 'refuge_key',
    description: 'A slate tablet cut from the Pilgrim Roll. It bears one name: WENNA HALE.',
    lore: 'Tagged HELD FOR THE SAINT. The letters are cut deep, by someone who meant them to last.',
  },
  {
    id: 'greyford_roll', name: 'The Greyford Roll', kind: 'key', icon: 'refuge_key',
    description: 'The Cathedral\'s sealed copy of the Greyford muster roll: forty names under a river no map shows.',
    lore: 'Sealed by the Crown for safekeeping, in a year before the war it records. The wax is still soft.',
  },
];

registerItems(ITEMS);

// ------------------------------------------------------------------ journal

registerLeads({
  cath_hymn: {
    title: 'The Girl Who Led the Hymn',
    region: 'The Pilgrim Stair',
    entries: {
      mem_hymn: {
        category: 'remembered',
        text: 'On the road north from Ashbridge, a pilgrim girl named Wenna Hale led the refugees\' hymn. She sang her own name into the last verse, so that no one would forget whose song it was.',
      },
      obs_nameless: {
        category: 'observed',
        text: 'A pilgrim girl kneels in the Chapel of Rewritten Names. Her name has been chiselled from the Pilgrim Roll, and she no longer knows it. She does not know any hymn.',
        contradicts: 'mem_hymn',
        contradictionNote: 'She does not remember her name — or the song she has not yet led.',
      },
      obs_tablet: {
        category: 'observed',
        text: 'In the Name-Ossuary, names cut from the Roll are kept on slate tablets, HELD FOR THE SAINT. One of them reads WENNA HALE.',
      },
      conf_returned: {
        category: 'confirmed',
        text: 'I gave Wenna Hale her name back. She sang it — badly, then well. She has gone to the Hospice of the Quiet Hour to teach the pilgrims\' rites.',
        sets: 'resolved',
      },
      conf_absorbed: {
        category: 'confirmed',
        text: 'I crossed into the choir while Wenna was still nameless. Her mat in the chapel is empty. The Saint sang with her voice.',
        loss: true,
        sets: 'lost',
      },
    },
  },
  cath_saint: {
    title: 'The Saint of the Hundred Names',
    region: 'The Pilgrim Stair',
    entries: {
      mem_saint: {
        category: 'remembered',
        text: 'In the future I remember, the Cathedral\'s Great Bell rang one last time over an empty city. They said the Saint carried the whole congregation inside her.',
      },
      obs_plaques: {
        category: 'observed',
        text: 'The Pilgrim Roll on Candle Street has been chiselled out and recut. One name appears three times, above three different dates of death.',
      },
      obs_twice: {
        category: 'observed',
        text: 'The same pilgrim walks twice in the street procession: the same face, the same limp, the same name stitched on both backs.',
        contradicts: 'mem_saint',
        contradictionNote: 'The congregation is not empty. It is being used twice.',
      },
      obs_conviction: {
        category: 'observed',
        text: 'Vessaline says she keeps the forgotten from vanishing by carrying them. She says I would let them fall into nothing, and call it mercy.',
      },
      conf_vessaline: {
        category: 'confirmed',
        text: 'Saint Vessaline is dead. The Great Bell above the portal has gone dark, and the names she carried have nowhere left to go but back to their owners.',
        sets: 'resolved',
      },
    },
  },
  muster_cathedral: {
    title: 'The Greyford Roll',
    region: 'The Pilgrim Stair',
    entries: {
      obs_soames: {
        category: 'observed',
        text: 'Private Edric Soames of the Greyford muster searches the ossuary walls for his squad. He says the Cathedral keeps a copy of every roll the Crown ever sealed — even for wars that never happened.',
      },
      conf_roll: {
        category: 'confirmed',
        text: 'I brought Soames the Cathedral\'s copy of the Greyford roll. He read every name aloud, then went down to join the Muster beneath Ashbridge.',
        sets: 'resolved',
      },
    },
  },
});

// ------------------------------------------------------------------ text

registerText({
  areas: {
    cathGate: 'Pilgrims\' Gate',
    candleStreet: 'Candle Street',
    masonsYard: 'The Masons\' Yard',
    pilgrimStair: 'The Pilgrim Stair',
    parvis: 'The Parvis',
    chapelNames: 'Chapel of Rewritten Names',
    ossuary: 'The Name-Ossuary',
    graveStair: 'The Stair of Graves',
    cloister: 'The Processional Cloister',
    nave: 'Nave of Hundred Names',
    triforium: 'The Triforium',
    choir: 'Choir of the Hundred Names',
  },
  stillbells: {
    'cathedral.gate': 'Pilgrims\' Gate Stillbell',
    'cathedral.ossuary': 'Name-Ossuary Stillbell',
    'cathedral.nave': 'Nave Stillbell',
  },
  bosses: {
    procession: { name: 'The Procession', title: 'Bearers of the Saint\'s Portion' },
    vessaline: { name: 'Saint Vessaline of the Hundred Names', title: 'Keeper of the Cathedral Bell' },
  },
  hints: {
    cathHealer: 'Healer-priests restore their allies\' health and posture with a rite. Strike the priest first — or interrupt the rite.',
    cathProcession: 'Processions do not stop for anyone. Step aside, or roll through the gap between bearers.',
    cathGrab: 'An open hand marks a grab. It cannot be blocked or parried — roll away from it.',
  },
  warnings: {
    vessalineNameless: {
      title: 'Saint Vessaline Waits',
      body: 'Beyond this veil, Saint Vessaline waits. The nameless pilgrim in the chapel has no one to hold her name: if you cross now, the Saint will carry her too. Cross now?',
      yes: 'Cross', no: 'Not yet',
    },
    vessalinePlain: { title: 'Saint Vessaline Waits', body: 'Beyond this veil, Saint Vessaline waits. Cross now?', yes: 'Cross', no: 'Not yet' },
    processionPlain: { title: 'The Procession', body: 'Beyond this veil, the Procession climbs the cloister. Cross now?', yes: 'Cross', no: 'Not yet' },
  },
  memoryRewards: {
    memory_vessaline: [
      {
        id: 'crozier_of_names', name: 'Crozier of the Hundred Names', icon: 'court_staff', kind: 'weapon',
        description: 'The Saint\'s crozier: a long catalyst for bell rites that swings like a staff. Requires 16 Devotion and 10 Strength.',
      },
      {
        id: 'veil_of_names', name: 'Veil of the Hundred Names', icon: 'funeral_veil', kind: 'item',
        description: 'A light head covering stitched with names. Strong against rites and sorcery.',
      },
      {
        id: 'hours:5000', name: '5,000 Hours', icon: 'hours', kind: 'hours',
        description: 'Let the memory go, and keep the time it held. The names were never hers to spend.',
      },
    ],
  },
  inspect: {
    cath_roll: {
      title: 'The Pilgrim Roll',
      lines: [
        'A roll of pilgrims who climbed the Stair, cut into the wall. Half the names have been chiselled away; new names are cut over the scars, in another hand.',
        'One name — MAREN OST — appears three times, above three different dates of death.',
      ],
    },
    cath_twice: {
      title: 'The Street Procession',
      lines: [
        'An old woman walks in the procession with a limp and a lantern. Four paces behind her walks the same woman, with the same limp and the same lantern.',
        'Both have MAREN OST stitched across their backs.',
      ],
    },
    cath_masons: {
      title: 'Masons\' Order',
      lines: [
        'By order of the Chapter: the following names are released from the Stair and are to be cut over for re-use. Sixty lines follow.',
        'At the foot, in another hand: "Some of them are still here. Some of them stand in the yard and watch us cut."',
      ],
    },
    cath_mercy: {
      title: 'Relief of the Saint\'s Mercy',
      lines: [
        'Saint Vessaline gathers the dying of a plague into her robes. The inscription reads: NONE SHALL BE FORGOTTEN.',
        'A fresher panel beside it lists the plague\'s dead. There are no names — only how many times each was returned.',
      ],
    },
    cath_doors: {
      title: 'The Great Doors',
      lines: [
        'The west doors are barred from within. Through the crack comes candlelight, and a hymn sung by more voices than the nave could hold.',
      ],
    },
    cath_bell: {
      title: 'The Great Bell',
      lines: [
        'The Cathedral\'s Great Bell hangs over the portal. Its cracks glow like a hearth seen through a door.',
        'It is not ringing. The air trembles anyway, as if it had only just stopped.',
      ],
    },
    cath_wall: {
      title: 'Wall of Unclaimed Names',
      lines: [
        'Slate tablets stacked like bones in the niches, each bearing a name cut from the Pilgrim Roll. A tag on every shelf: HELD FOR THE SAINT.',
      ],
    },
    cath_graves: {
      title: 'The Stair of Graves',
      lines: [
        'The steps are grave-slabs laid face up. Every name has been worn smooth by pilgrims\' feet — except down the middle, where the Saint\'s processions walk.',
      ],
    },
    cath_rolls: {
      title: 'Sealed Muster Rolls',
      lines: [
        'Muster rolls, sealed by the Crown for the Cathedral\'s keeping: ASHBRIDGE, SIEGEHOLM, GREYFORD.',
        'The Greyford roll is newer than the others, and older than the war it lists.',
      ],
    },
    cath_mat: {
      title: 'An Empty Mat',
      lines: [
        'A kneeling mat, still warm, and a candle burned down to nothing. Someone knelt here a long time, waiting to hear a name read out.',
      ],
    },
    cath_grate: {
      title: 'Ossuary Grate',
      lines: ['An iron grate, locked from the other side. Cold air breathes through it, smelling of wax and bone.'],
    },
  },
});

// ------------------------------------------------------------------ dialogue

const WENNA = 'Wenna Hale';
const PILGRIM = 'Nameless Pilgrim';
const SOAMES = 'Private Soames';
const SAINT = 'Saint Vessaline';
const RETURNED = 'The Returned';
const CANTOR = 'Cantor';

registerDialogue({
  // ---- Wenna, nameless (the Chapel of Rewritten Names)
  wenna_nameless: [
    { speaker: PILGRIM, text: 'Are you here for the reading? They read the Roll every hour. I listen for mine, but I don\'t know which one it is.' },
    { speaker: PILGRIM, text: 'The sisters say a name is only a loan. The Saint keeps it safe until you\'re ready.' },
    { speaker: PILGRIM, text: 'I think I was ready. I think I was ready a long time ago.' },
    { speaker: RETURNED, text: '(I know that voice. It led a whole road of people north, singing.)' },
  ],
  wenna_nameless_idle: [
    { speaker: PILGRIM, text: 'Shh. They\'re reading. Maybe this time.', duration: 3.5 },
    { speaker: PILGRIM, text: 'I had a song, I think. Or someone had one near me.', duration: 3.5 },
  ],
  wenna_returned: [
    { speaker: RETURNED, text: 'Your name is Wenna Hale.' },
    { speaker: PILGRIM, text: 'Wenna… Hale. Wenna Hale.' },
    { speaker: WENNA, text: 'There was a song. I knew it walking. I knew it with a great many people behind me.' },
    { speaker: WENNA, text: '"Walk on, the road remembers, walk on, the bell is still—" Oh. Oh, I remember.' },
    { speaker: WENNA, text: 'I won\'t stay here to be read aloud. Tell me where people say names at supper.' },
    { speaker: RETURNED, text: 'The Hospice of the Quiet Hour, in Ashbridge. Ask for Oswin.' },
  ],
  wenna_hospice: [
    { speaker: WENNA, text: 'They say every name at supper here. Even the ones who\'ve gone. I taught them the second verse.' },
    { speaker: WENNA, text: 'The Cathedral kept its rites to itself. I kept a few for myself. Here — the Toll of Warding, and the Vigil. They\'re yours.' },
  ],
  wenna_idle: [
    { speaker: WENNA, text: 'Oswin says I sing flat. Oswin is right.', duration: 3.5 },
    { speaker: WENNA, text: 'If you hear a hymn on the road, it\'s probably mine. Walk toward it.', duration: 4 },
    { speaker: WENNA, text: 'Wenna Hale. I say it every morning, in case.', duration: 3.5 },
  ],

  // ---- Private Soames (Unlived Muster)
  soames_first: [
    { speaker: SOAMES, text: 'Captain? No… you\'ve the look of him, is all. Private Soames, Greyford muster. What\'s left of it.' },
    { speaker: SOAMES, text: 'I\'m looking for my squad. They carve everyone into these walls, sooner or later. Everyone but us.' },
    { speaker: SOAMES, text: 'The old sisters say the Cathedral keeps a copy of every muster roll the Crown ever sealed. Up in the gallery, over the nave.' },
    { speaker: SOAMES, text: 'If ours is there… I\'d like to hear their names, sir. Just once, in a church.' },
  ],
  soames_waiting: [
    { speaker: SOAMES, text: 'The gallery over the nave, sir. A stair in the east aisle, the sisters said.', duration: 4 },
  ],
  soames_roll: [
    { speaker: SOAMES, text: 'That\'s it. That\'s us.' },
    { speaker: SOAMES, text: 'Harl. Benet. Ide and Wat Moss. Corporal Anning. Forty of us, and every one spelled right.' },
    { speaker: SOAMES, text: 'I\'ll take them down to Brannoc. The Muster should hear their names. Take these — I\'ll not need them where I\'m going.' },
  ],

  // ---- pilgrims (barks)
  cath_pilgrim_barks: [
    { speaker: 'Pilgrim', text: 'Do you know my name? Say it. Please, say it.', duration: 3.5 },
    { speaker: 'Pilgrim', text: 'Up the Stair, up the Stair, and down again, and up…', duration: 3.5 },
    { speaker: 'Pilgrim', text: 'I climbed it nine times. Or someone did, wearing me.', duration: 3.5 },
    { speaker: 'Pilgrim', text: 'The Saint will hold it for us. The Saint will hold it.', duration: 3.5 },
  ],

  // ---- the Procession
  procession_intro: [
    { speaker: CANTOR, text: 'Make way. The Saint\'s portion goes up the Stair.', duration: 4 },
    { speaker: CANTOR, text: '[Sung] Carry them, carry them, up to the bell…', duration: 4 },
  ],
  procession_phase2: [
    { speaker: CANTOR, text: '[The reliquary opens. The hymn quickens.]', duration: 3.5 },
  ],
  procession_death: [
    { speaker: CANTOR, text: '[The hymn stops, mid-word.]', duration: 3.5 },
  ],

  // ---- Saint Vessaline
  vessaline_intro: [
    { speaker: SAINT, text: 'Another one who remembers. Kneel, child. You are carrying far too much, and none of it is yours.', duration: 5 },
    { speaker: SAINT, text: 'Every name in this house was dropped by someone. I picked them up. I am still holding them.', duration: 5 },
    { speaker: SAINT, text: 'You would let them fall into nothing, and call it mercy.', duration: 4.5 },
  ],
  vessaline_phase2: [
    { speaker: SAINT, text: 'You want them gone? Then hear them. All of them, at once.', duration: 4.5 },
    { speaker: SAINT, text: 'I have a hundred hands. Cut one, and another answers.', duration: 4 },
  ],
  vessaline_death: [
    { speaker: SAINT, text: 'Who will carry them now…?', duration: 4 },
    { speaker: SAINT, text: 'Say their names. Please. Someone must say their names.', duration: 5 },
  ],
});

// ------------------------------------------------------------------ the Hospice guest

registerHospiceGuest({
  id: 'wenna', name: WENNA, look: 'wenna', idle: 'standPray',
  present: (ws) => ws.npcs.wenna === 'rescued',
  greet: 'wenna_hospice', idlePool: 'wenna_idle',
  teaches: ['toll_of_warding', 'vigil_of_ash'],
});

registerCathedralNpcLooks();
