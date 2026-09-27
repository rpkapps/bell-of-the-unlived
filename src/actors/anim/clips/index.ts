import type { Clip } from '../Clip';
import { swordClips } from './sword';
import { genericClips } from './generic';
import { staffClips } from './staff';
import { npcClips } from './npc';

/** Every clip by id. Movesets for other weapon classes and enemies register here too. */
export const CLIPS: Record<string, Clip> = { ...genericClips, ...swordClips, ...staffClips, ...npcClips };

/** Allow feature modules (enemy/boss movesets) to add clips at import time. */
export function registerClips(c: Record<string, Clip>) { Object.assign(CLIPS, c); }
