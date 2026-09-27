/**
 * Region-only text for the Suspended Campus: dialogue (Keeper Orrow's convictions, Ansel Wick in
 * his cage, Corporal Fenn of the muster) and inspectables whose two versions of history sit side
 * by side. Loaded with the region module; the Hospice lines live in ./meta.ts.
 */
import { registerDialogue } from '../dialogue';
import { registerText } from '../text';

const ORROW = 'Keeper Orrow';
const WICK = 'Ansel Wick';
const FENN = 'Corporal Fenn';
const RETURNED = 'The Returned';

registerDialogue({
  // ---------------------------------------------------------------- Keeper Ilsabet Orrow
  orrow_intro: [
    { speaker: ORROW, text: 'Another experiment walks in off the causeway. You remember a future, Returned. Whose notes do you think you are reading from?', duration: 6 },
    { speaker: ORROW, text: 'Memory without a keeper is only damage. I will keep yours.', duration: 4.5 },
  ],
  orrow_phase2: [
    { speaker: ORROW, text: 'You would spend a kingdom\'s learning to save a handful of students. Then learn what it is to be the page that is torn out.', duration: 6 },
  ],
  orrow_phase3: [
    { speaker: ORROW, text: 'When the bells ring, the people go. What was learned must not. I have preserved it. I will preserve you.', duration: 6 },
  ],
  orrow_death: [
    { speaker: ORROW, text: 'The register… someone must go on writing in it…', duration: 4 },
    { speaker: ORROW, text: 'You carry an experiment no one approved. Do not let it end with you.', duration: 5 },
  ],
  // ---------------------------------------------------------------- Ansel Wick
  wick_shout: [
    { speaker: WICK, text: 'Hello? Is someone on the bridges? I would wave, but the cage takes it personally.', duration: 5 },
  ],
  wick_cage: [
    { speaker: WICK, text: 'You winched me in. Nobody winches me in. They winch me out, usually, and leave me to think about my conduct.', duration: 5 },
    { speaker: RETURNED, text: 'Ansel Wick.' },
    { speaker: WICK, text: 'You know my name. Then you have read the register. I am being struck from it this evening, for "a dangerous purpose".' },
    { speaker: WICK, text: 'I designed a bell for the sea wall. It rings when the swell rises. The Keeper says a bell that small is a waste of a mind.' },
    { speaker: RETURNED, text: 'I remember you building a larger one.' },
    { speaker: WICK, text: 'Then you remember someone who stayed. Open the door, and I will not.' },
  ],
  wick_freed: [
    { speaker: WICK, text: 'The hinge is glass. Of course it is. Everything here is glass, or chains, or a lecture.' },
    { speaker: WICK, text: 'There is a hospice past the border road, isn\'t there? With a healer who does not ask what you studied?' },
    { speaker: RETURNED, text: 'The Hospice of the Quiet Hour. Tell Oswin I sent you.' },
    { speaker: WICK, text: 'I will draw you something useful when you come. Something that throws glass instead of sense.' },
  ],
  // ---------------------------------------------------------------- Corporal Fenn (the Unlived Muster)
  fenn_first: [
    { speaker: FENN, text: 'Captain. You came up the stair like it owed you money. Same as at the ford.' },
    { speaker: RETURNED, text: 'I have never been to Greyford.' },
    { speaker: FENN, text: 'No. Nobody has. That\'s the trouble.' },
    { speaker: FENN, text: 'The scholars keep a book of names up in the glass hall. Names they decided not to keep. Is mine in it? I\'d like to know I was worth crossing out.' },
  ],
  fenn_leaf: [
    { speaker: RETURNED, text: 'Fenn, Corporal, Fourth Company. Struck through, and written again underneath.' },
    { speaker: FENN, text: 'Written again. In capitals, too. Someone meant it.' },
    { speaker: FENN, text: 'Then I\'ll answer, when the muster\'s called. The Fourth never missed a roll. We just missed the war.' },
  ],
  fenn_idle: [
    { speaker: FENN, text: 'Half this room is drowned and half is dry. Scholars. Couldn\'t decide which sea to have.', duration: 4.5 },
    { speaker: FENN, text: 'The Fourth Company will answer, Captain. Just say when.', duration: 4 },
    { speaker: FENN, text: 'They lecture to empty benches. I sit at the back and don\'t take notes.', duration: 4 },
  ],
});

registerText({
  inspect: {
    academy_wick_notes_a: {
      title: 'A Scholar\'s Notebook',
      lines: [
        'Ansel Wick, second year. Page after page of an engine for striking a great bell: cams, a yoke, a lever as long as a man.',
        'In the margin, in the same hand: "It would ring everything at once. Everything."',
        'You have seen this engine. It stood in the Belfry the night the kingdom was rung away.',
      ],
    },
    academy_wick_notes_b: {
      title: 'The Same Notebook',
      lines: [
        'The same cover, the same date, the same hand. A different engine.',
        'A small bell on the sea wall, a float on a chain in the swell: when the water rises, it rings, and the boats keep off the rocks.',
        'Both books are real. On the flyleaf of this one: "Expelled for impractical aims. — I. O."',
      ],
    },
    academy_register: {
      title: 'The Register of Unmade Names',
      lines: [
        'A great ledger of students, clerks and soldiers the Academy chose not to keep. Whole pages struck through in the Keeper\'s hand.',
        'Here and there a line is written in again beneath, in capitals, pressed so hard the nib tore the page.',
      ],
    },
    academy_register_fenn: {
      title: 'The Register of Unmade Names',
      lines: [
        '"Fenn, Corporal, Fourth Company (Greyford)." Struck through. Beneath it, in capitals: FENN.',
        'You cut the leaf out of the book.',
      ],
    },
    academy_drowned_desks: {
      title: 'The Drowned Benches',
      lines: [
        'On this side of the theatre the benches are barnacled and hung with weed, as if the sea had filled the room for a hundred years.',
        'Three paces west the same benches are dry, polished, with this morning\'s lecture notes still on them.',
        'The water stands in a clean wall down the middle of the room and does not spill.',
      ],
    },
    academy_spire_plaque: {
      title: 'Foundation Stone',
      lines: [
        '"This stone was laid in the thirty-first year of the reign of Aldren, for the Observatory that will outlast the kingdom."',
        'The thirty-first year of Aldren\'s reign is twenty-two years from now.',
        'The stone is pale and warm to the touch. No quarry you know cuts stone like it.',
      ],
    },
    academy_sea_gate: {
      title: 'The Sea Gate',
      lines: ['An iron portcullis in the cliff. The winch that raises it is on the other side.'],
    },
    academy_bridge_raised: {
      title: 'Raised Bridge',
      lines: ['Beyond the door the bridge stands raised on the far side of the cleft. Its chains run to a lever over there.'],
    },
    academy_empty_cage: {
      title: 'The Empty Cage',
      lines: ['The cage hangs open over the drop. On the floor, a torn page: a small bell on a sea wall, and a float on a chain.'],
    },
  },
  hints: {
    academy_ward: 'A ward of ringing glass shields these Unlived. Strike the ritual choir — any blow interrupts the chant and breaks the ward.',
    academy_beam: 'A narrowing line of light marks where the lens will burn. Step out of it before it locks — or roll through as it fires.',
    academy_echo: 'The construct\'s mirror caught your Imprint Technique. It will use it against you.',
    academy_lens: 'Plates about to burn glow and show a broken ring. Move to a plate without the mark.',
  },
});
