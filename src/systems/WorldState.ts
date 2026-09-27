/**
 * Everything about the world that persists across death and save/load (the Restoration rules):
 * flags (doors, bridges, bosses), NPC fates, collected pickups, lit Stillbells, the Last Breath,
 * journal entries. Ordinary Unlived are NOT stored: resting/death renews them.
 */
export type NpcFate = 'imprisoned' | 'rescued' | 'taken' | 'present' | 'dead';

export interface WorldState {
  region: string;
  flags: Record<string, boolean | number | string>;
  npcs: Record<string, NpcFate>;
  pickups: Record<string, true>;
  stillbells: Record<string, true>;
  lastStillbell: string;
  lastBreath: { pos: [number, number, number]; hours: number } | null;
  journal: Record<string, { lead: string; time: number }>;
  hints: string[];
  areas: string[];
  playtime: number;
  /** Dialogue keys already heard (for first-time lines). */
  heard: string[];
}

export function newWorldState(): WorldState {
  return {
    region: 'ashbridge', flags: {}, npcs: { oswin: 'imprisoned', hesper: 'present' }, pickups: {}, stillbells: {},
    lastStillbell: 'watchtower', lastBreath: null, journal: {}, hints: [], areas: [], playtime: 0, heard: [],
  };
}
