/**
 * Dialogue, barks and cinematic cards for the Ashbridge slice.
 * Lines are kept short enough for subtitles (≤ ~140 characters).
 * Keys ending in `_idle`, and the bark sets `sentry_mutter` / `infantry_barks`, are pools:
 * play ONE line at random each time (they carry `duration` for auto-advancing subtitles).
 */
import type { DialogueLine } from '../game/types';

export interface CinematicCard { text: string; speaker?: string; duration: number; style?: 'memory' | 'plain' | 'title' }

const OSWIN = 'Oswin Marrow';
const HESPER = 'Hesper Vail';
const CORVANE = 'Ser Corvane';
const BRANNOC = 'Sergeant Brannoc';
const RETURNED = 'The Returned';
const SENTRY = 'Sentry';
const INFANTRY = 'Garrison Soldier';

export const DIALOGUE: Record<string, DialogueLine[]> = {
  // ---------------------------------------------------------------- Oswin Marrow
  oswin_cell: [
    { speaker: OSWIN, text: 'Another key in the lock? No… you are not one of his.' },
    { speaker: OSWIN, text: 'If you have come to move me to the yard, I would rather walk. My knees have outlived my patience.' },
    { speaker: RETURNED, text: 'I am not here for the Commander.' },
    { speaker: OSWIN, text: 'Then you are a fool or a friend. In Ashbridge, lately, the two look much alike.' },
    { speaker: OSWIN, text: 'The sentry keeps the key on his belt. The clerks hung a spare on the ledger hook in the counting room.' },
    { speaker: OSWIN, text: 'Please. There are beds upstairs with no one in them, and people in this town who ought to be in them.' },
  ],
  oswin_freed: [
    { speaker: OSWIN, text: 'Air that does not taste of iron. Thank you.' },
    { speaker: OSWIN, text: 'They meant to move me to the yard cells at first bell. Corvane\'s orders. I heard the sentry read them twice.' },
    { speaker: OSWIN, text: 'The old hospice by the courtyard still has its roof. I will go there. Someone ought to light the lamps.' },
    { speaker: RETURNED, text: 'Go carefully.' },
    { speaker: OSWIN, text: 'Careful is all I have left. Find me there, if you need mending.' },
  ],
  oswin_hospice_first: [
    { speaker: OSWIN, text: 'You found your way. Good. I have swept the ward and counted the blankets. Eleven. Enough to begin.' },
    { speaker: OSWIN, text: 'Hesper\'s forge keeps the damp from my bones. Between the two of us, this may be a refuge again.' },
    { speaker: OSWIN, text: 'You look at me as if you had seen me buried.' },
    { speaker: RETURNED, text: 'I remember a cell. And a healer who did not leave it.' },
    { speaker: OSWIN, text: 'Then remember this as well. I am here, and the kettle is on.' },
  ],
  oswin_hospice_idle: [
    { speaker: OSWIN, text: 'The bell by the door is a Stillbell. Rest beside it. It keeps its own count of you.', duration: 4.5 },
    { speaker: OSWIN, text: 'Eat something, if you can. The dead are never hungry. You should be.', duration: 4 },
    { speaker: OSWIN, text: 'I used to pray the sick would recover. Now I pray they live long enough to be treated.', duration: 4.5 },
    { speaker: OSWIN, text: 'Mind the third bed. The frame is cracked, and so is the man who built it.', duration: 4 },
  ],
  oswin_teach: [
    { speaker: OSWIN, text: 'In that cell I had nothing but a bell and the hours. I learned to make a small sound that stills a wound.' },
    { speaker: OSWIN, text: 'The Stilling Chime. Ring it, and the body remembers being whole.' },
    { speaker: OSWIN, text: 'It asks for a little devotion, nothing more. Most people have that, even soldiers.' },
    { speaker: OSWIN, text: 'And take my hand bell, if you have none. It has rung for more deaths than births. Change that for me.' },
  ],
  oswin_teach_ember: [
    { speaker: OSWIN, text: 'The hearth-prayer, too. Ember Blessing. We used it to warm the linens in winter.' },
    { speaker: OSWIN, text: 'Spoken over steel, it warms rather more than linen. Use it on those who would not use it on you.' },
  ],
  oswin_after_boss: [
    { speaker: OSWIN, text: 'The yard went quiet an hour ago. I heard a bell break. I did not know a bell could.' },
    { speaker: OSWIN, text: 'Corvane was a hard man. But he was a man. I will say his name tonight, with the others.' },
    { speaker: OSWIN, text: 'I kept one more prayer for when it was over. Ashen Veil. It turns aside a little of what the world throws at you.' },
    { speaker: OSWIN, text: 'Take it. The world has not finished throwing.' },
  ],

  // ---------------------------------------------------------------- Hesper Vail
  hesper_first: [
    { speaker: HESPER, text: 'Mind the anvil. I have only just got it level.' },
    { speaker: HESPER, text: 'Hesper Vail. I kept the gatehouse forge until the Commander wanted it for his own men. This hospice was empty, so now it is mine.' },
    { speaker: HESPER, text: 'That blade of yours can take more temper than it has. Bring me tempered scrap and a few Hours, and I will raise it a grade.' },
    { speaker: HESPER, text: 'Past the fifth tempering, steel wants bellbronze instead. That is rarer. Keep every scrap you find.' },
    { speaker: RETURNED, text: 'Hours?' },
    { speaker: HESPER, text: 'The time you take off the Unlived when they fall. It works into steel better than coal. Do not ask me why.' },
    { speaker: HESPER, text: 'Once the Commander is gone, I will have scrap to sell. Change weapons if you like; I will bring the new one up to your hand.' },
  ],
  hesper_idle: [
    { speaker: HESPER, text: 'Heat, hammer, patience. The order matters.', duration: 3 },
    { speaker: HESPER, text: 'If it is dull, bring it here. If it is broken, bring it anyway.', duration: 3.5 },
    { speaker: HESPER, text: 'The rack by the wall holds what others left behind. Take what suits you.', duration: 3.5 },
    { speaker: HESPER, text: 'The bellows sigh like a sick man. I have grown fond of them.', duration: 3.5 },
  ],
  hesper_after_boss: [
    { speaker: HESPER, text: 'Corvane\'s men came for their blades and never came back for them. I have scrap to spare now.' },
    { speaker: HESPER, text: 'Six hundred Hours a piece for tempered scrap. A fair price. Less than fair, if you count the soot.' },
    { speaker: HESPER, text: 'Whatever you mean to carry next, I will see it fit for the road.' },
  ],

  // ---------------------------------------------------------------- Ser Corvane
  corvane_intro: [
    { speaker: CORVANE, text: 'Halt. This yard is held by the Bell\'s appointment, and so am I.' },
    { speaker: CORVANE, text: 'You have a retainer\'s eyes and a dead man\'s patience. Have we met?' },
    { speaker: RETURNED, text: 'Not yet.' },
    { speaker: CORVANE, text: 'The Bell rang, and it named me. Order must hold, whatever it costs this town.' },
    { speaker: CORVANE, text: 'The road is sealed. The gate opens at the appointed hour. None of it is mine to question.' },
    { speaker: CORVANE, text: 'Nor yours. Draw, then, and let the Bell decide which of us it keeps.' },
  ],
  corvane_phase2: [
    { speaker: CORVANE, text: 'Do you hear it? The Bell remembers me better than I remember myself.', duration: 4 },
    { speaker: CORVANE, text: 'Then I will fight the way the Bell remembers.', duration: 3.5 },
  ],
  corvane_death: [
    { speaker: CORVANE, text: 'It rang for me. It chose me.', duration: 3 },
    { speaker: CORVANE, text: 'Why does it let me go…?', duration: 3.5 },
    { speaker: CORVANE, text: 'Tell the Warden… no. There is no one to tell.', duration: 4 },
  ],

  // ---------------------------------------------------------------- Sergeant Brannoc
  brannoc_reveal: [
    { speaker: BRANNOC, text: 'Captain…?' },
    { speaker: BRANNOC, text: 'You held the ford with us. You said you would come back.' },
    { speaker: RETURNED, text: 'I have never been to Greyford.' },
    { speaker: BRANNOC, text: 'No. Not yet. Or not anymore.' },
  ],
  brannoc_after: [
    { speaker: BRANNOC, text: 'The muster is still down here, Captain. Four hundred of us, give or take the ones who stopped answering.' },
    { speaker: BRANNOC, text: 'We do not sleep. We wait for orders that stopped coming the day the ford was forgotten.' },
    { speaker: BRANNOC, text: 'Take this. It was yours, or will be. The edge remembers your hand better than I do.' },
    { speaker: BRANNOC, text: 'Find out who forgot us. Then come back and tell us whether we were worth remembering.' },
    { speaker: RETURNED, text: 'I will come back.' },
    { speaker: BRANNOC, text: 'You said that last time.' },
  ],

  // ---------------------------------------------------------------- barks
  sentry_mutter: [
    { speaker: SENTRY, text: 'Hold the ford… hold the ford. They said relief by the third bell.', duration: 4 },
    { speaker: SENTRY, text: 'Greyford. Greyford. Why does nobody know the name?', duration: 3.5 },
    { speaker: SENTRY, text: 'I wrote my wife I\'d be home by harvest. Which harvest…', duration: 4 },
    { speaker: SENTRY, text: 'There was a war here. I was in it. I was in it.', duration: 3.5 },
  ],
  infantry_barks: [
    { speaker: INFANTRY, text: 'There!', duration: 1.5 },
    { speaker: INFANTRY, text: 'Intruder on the stair!', duration: 2 },
    { speaker: INFANTRY, text: 'For the Commander!', duration: 2 },
    { speaker: INFANTRY, text: 'Close ranks!', duration: 1.5 },
    { speaker: INFANTRY, text: 'The Bell sees you.', duration: 2 },
    { speaker: INFANTRY, text: 'Hold the line… hold…', duration: 2 },
  ],

  // ---------------------------------------------------------------- inspection / first-time
  gear_rack: [
    { speaker: RETURNED, text: 'Arms and armour left behind by those who fled. A retainer\'s sword, a court mage\'s staff, a dirk, folded robes.' },
    { speaker: RETURNED, text: 'Whatever I began as, I need not stay. What I carry is my own choice now.' },
  ],
  stillbell_first: [
    { speaker: RETURNED, text: 'A Stillbell. The Covenant of Return runs through it like thread through a needle.' },
    { speaker: RETURNED, text: 'Every sworn servant of the crown is written into the Covenant. When we die, it gathers us back to a bell that knows our name.' },
    { speaker: RETURNED, text: 'It restores me. It does not restore those I fail. And when I rest, the Unlived walk again.' },
  ],
};

/** The opening: the last day of the war, the brand, the waking. */
export const INTRO_CARDS: CinematicCard[] = [
  { text: 'The last day of the war.', style: 'memory', duration: 3.5 },
  { text: 'The capital burned from the river to the palace steps. The enemy was already in the lower city.', style: 'memory', duration: 5 },
  { text: 'I had served the royal Household for twenty years. I was dying on the stair of the bell-tower.', style: 'memory', duration: 5 },
  { text: 'King Aldren did not flee. He climbed past me and rang the first of the five Great Bells.', style: 'memory', duration: 5 },
  { text: 'Then the second. The third. With every toll, streets I knew went out like lamps.', style: 'memory', duration: 5 },
  { text: 'A condemned bellkeeper knelt beside me, and pressed a burning brand to my chest.', style: 'memory', duration: 5 },
  { text: 'Remember. Someone must.', speaker: 'The Condemned Bellkeeper', style: 'memory', duration: 4 },
  { text: 'The fifth bell rang. The kingdom was not defeated. It was simply no longer there.', style: 'memory', duration: 5 },
  { text: '…', style: 'plain', duration: 3 },
  { text: 'Ashbridge. The watchtower on the border. The first day of my service.', style: 'plain', duration: 4.5 },
  { text: 'Twenty years before the end. And I remember all of it.', style: 'plain', duration: 4 },
  { text: 'BELLS OF THE UNLIVED', style: 'title', duration: 5 },
];

/** After Brannoc: the end of the Ashbridge slice. */
export const SLICE_END_CARDS: CinematicCard[] = [
  { text: 'Ashbridge holds, for now. Its dead are counted, and some of them are counted twice.', style: 'plain', duration: 5 },
  { text: 'Beneath the town, the Greyford muster waits for a captain who has not yet fought their war.', style: 'plain', duration: 5 },
  { text: 'Five Great Bells hang in five houses of the crown: the Army, the Academy, the Cathedral, the Treasury and the Household.', style: 'plain', duration: 6 },
  { text: 'Each has a keeper. Each keeper believes the bell protects the kingdom.', style: 'plain', duration: 4.5 },
  { text: 'King Aldren is young, and loved. He has rung the bells before. He will ring them again.', style: 'plain', duration: 5 },
  { text: 'Who has the right to decide which lives continue?', style: 'memory', duration: 4.5 },
  { text: 'THE ASHBRIDGE CHRONICLE IS RECORDED', style: 'title', duration: 5 },
];
