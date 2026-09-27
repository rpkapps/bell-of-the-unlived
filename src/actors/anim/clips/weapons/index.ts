/** Phase 2 arsenal clips (every weapon class, techniques, spell archetypes). */
import type { Clip } from '../../Clip';
import { bladeClips } from './blades';
import { heavyClips } from './heavy';
import { polearmClips } from './polearms';
import { rangedClips } from './ranged';
import { catalystClips } from './catalyst';
import { techniqueClips } from './techniques';

export const weaponClips: Record<string, Clip> = {
  ...bladeClips, ...heavyClips, ...polearmClips, ...rangedClips, ...catalystClips, ...techniqueClips,
};
