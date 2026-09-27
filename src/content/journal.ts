/**
 * Forememory content (GDD §6). Entry ids are referenced by the game; keep them stable.
 * Category order within a lead is fixed by the UI (remembered → observed → confirmed).
 */
import type { JournalCategory } from '../game/types';

export interface LeadEntryDef {
  category: JournalCategory;
  text: string;
  /** observed entries: the remembered entry id this contradicts */
  contradicts?: string;
  /** short note shown under the contradicted memory */
  contradictionNote?: string;
  loss?: boolean;
  /** recording this entry sets the lead status */
  sets?: 'resolved' | 'lost';
}
export interface LeadDef { title: string; region: string; entries: Record<string, LeadEntryDef> }

export const LEADS: Record<string, LeadDef> = {
  refugee_road: {
    title: 'The Refugee Road',
    region: 'Ashbridge',
    entries: {
      mem_route: {
        category: 'remembered',
        text: 'When Ashbridge fell, the refugees escaped through a passage under the counting room of the old mint. I remember the smell of lamp oil, and a child counting the steps aloud.',
      },
      obs_masonry: {
        category: 'observed',
        text: 'The stair under the counting room is barred with fresh masonry. The mortar is still damp, and the masons left their trowels behind.',
        contradicts: 'mem_route',
        contradictionNote: 'The route I remember is walled up — recently.',
      },
      obs_hatch: {
        category: 'observed',
        text: 'Beside the new wall there is a service hatch with a rusted ring. It leads down into the same passage the masonry was meant to close.',
      },
      obs_orders: {
        category: 'observed',
        text: 'Orders under the Commander\'s seal: seal the counting-room stair; move the healer to the yard cells at first bell. Someone is closing doors before the war arrives.',
      },
      conf_hatch: {
        category: 'confirmed',
        text: 'I opened the hatch. The lower passage is reachable again, whatever the Commander intended.',
      },
    },
  },

  healer: {
    title: 'The Healer of Ashbridge',
    region: 'Ashbridge',
    entries: {
      mem_oswin: {
        category: 'remembered',
        text: 'Oswin Marrow kept the hospice beds in Ashbridge. The Commander imprisoned him, and he died in a cell before the siege. No one could tell me of what.',
      },
      obs_cell: {
        category: 'observed',
        text: 'Oswin is alive. He is held in a locked refuge beneath the mint, and his hands are still steady.',
      },
      conf_rescued: {
        category: 'confirmed',
        text: 'Oswin is free. He tends the beds in the Hospice of the Quiet Hour, as though he had never left them.',
        sets: 'resolved',
      },
      conf_taken: {
        category: 'confirmed',
        text: 'I crossed into the Commander\'s Yard while Oswin was still imprisoned. His cell is empty; only his rosary remains.',
        loss: true,
        sets: 'lost',
      },
    },
  },

  measure: {
    title: 'The Commander\'s Measure',
    region: 'Ashbridge',
    entries: {
      mem_measure: {
        category: 'remembered',
        text: 'Corvane\'s favourite combination: two diagonal cuts, a thrust, then a rising overhead he always held a heartbeat too long. He killed my captain with it.',
      },
      obs_measure: {
        category: 'observed',
        text: 'He still ends the Measure with the overhead, and he still holds it too long. Some habits outlive a future.',
      },
      conf_corvane: {
        category: 'confirmed',
        text: 'Corvane is dead. His bell-anchor shattered, and he will not return.',
        sets: 'resolved',
      },
    },
  },

  betrayal: {
    title: 'The Gate of Ashbridge',
    region: 'Ashbridge',
    entries: {
      mem_gate: {
        category: 'remembered',
        text: 'In the future I remember, Corvane opened the east gate to the enemy host. Ashbridge burned by morning.',
      },
      obs_letters: {
        category: 'observed',
        text: 'Letters in Corvane\'s hand to someone he calls the Bell-Warden. They speak of "the appointed hour" as a duty, not a betrayal.',
      },
      conf_gate: {
        category: 'confirmed',
        text: 'With Corvane fallen, the gate will stay shut. For now.',
        sets: 'resolved',
      },
    },
  },

  greyford: {
    title: 'The Army Beneath',
    region: 'Ashbridge',
    entries: {
      obs_relief: {
        category: 'observed',
        text: 'A relief on Lower Street celebrates the Victory of Greyford. The graves beneath it are dated years before any battle at Greyford.',
      },
      obs_battlefield: {
        category: 'observed',
        text: 'Beneath Ashbridge lies a battlefield I never saw. Its soldiers know my name.',
      },
      conf_brannoc: {
        category: 'confirmed',
        text: 'Sergeant Brannoc of the Greyford muster remembers me as his captain. I remember no such war.',
      },
    },
  },
};
