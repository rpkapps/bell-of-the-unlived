/**
 * The campaign's regions: metadata that must be known without building a level (Stillbells for the
 * travel list, unlock rules) plus a lazy loader so each region is its own code chunk.
 *
 * Unlock rules (GDD §7): after Corvane, the Royal Army and the Royal Academy are open; the Cathedral
 * opens after any institution bell is silenced; the Treasury after two; the Household after four;
 * the Belfry (Aldren) after all five.
 */
import type { Game } from '../Game';
import type { Region, Session } from '../Session';
import type { LevelContext } from '../../world/levelTypes';
import type { WorldState } from '../../systems/WorldState';

export interface RegionModule {
  /** Build the level into ctx.scene / ctx.collision (the caller builds the collision world afterwards). */
  build(ctx: LevelContext): unknown;
  /** Create the region controller for a built layout. */
  create(game: Game, session: Session, layout: unknown): Region;
}

export interface RegionInfo {
  id: string;
  name: string;
  /** Stillbells in this region (ids must be globally unique; the first is the entry bell). */
  bells: { id: string; name: string }[];
  unlocked(ws: WorldState): boolean;
  load(): Promise<RegionModule>;
}

/** Institution keepers whose defeat silences a Great Bell. */
export const GREAT_BELL_KEEPERS = ['varr', 'orrow', 'vessaline', 'aurelmask', 'celwyn'] as const;
export const bellsSilenced = (ws: WorldState) => GREAT_BELL_KEEPERS.filter((k) => ws.flags['boss.' + k]).length;

export const REGIONS: RegionInfo[] = [
  {
    id: 'ashbridge', name: 'Ashbridge',
    bells: [{ id: 'watchtower', name: 'Watchtower' }, { id: 'hospice', name: 'Hospice of the Quiet Hour' }],
    unlocked: () => true,
    load: async () => (await import('./ashbridgeModule')).default,
  },
  {
    id: 'army', name: 'Siegeholm — the Royal Army',
    bells: [{ id: 'army.road', name: 'The Siege Road' }, { id: 'army.barbican', name: 'Barbican of Two Victories' }, { id: 'army.keep', name: 'Marshal\'s Keep' }],
    unlocked: (ws) => !!ws.flags['boss.corvane'],
    load: async () => (await import('../../content/army/module')).default,
  },
  {
    id: 'academy', name: 'The Suspended Campus — the Royal Academy',
    bells: [{ id: 'academy.causeway', name: 'Sea Causeway' }, { id: 'academy.lenshall', name: 'Hall of Lenses' }, { id: 'academy.spire', name: 'The Unfinished Spire' }],
    unlocked: (ws) => !!ws.flags['boss.corvane'],
    load: async () => (await import('../../content/academy/module')).default,
  },
  {
    id: 'cathedral', name: 'The Pilgrim Stair — the Cathedral',
    bells: [{ id: 'cathedral.gate', name: 'Pilgrims\' Gate' }, { id: 'cathedral.ossuary', name: 'The Name-Ossuary' }, { id: 'cathedral.nave', name: 'Nave of Hundred Names' }],
    unlocked: (ws) => bellsSilenced(ws) >= 1,
    load: async () => (await import('../../content/cathedral/module')).default,
  },
  {
    id: 'treasury', name: 'The Undervaults — the Royal Treasury',
    bells: [{ id: 'treasury.market', name: 'Twofold Market' }, { id: 'treasury.counting', name: 'The Counting Deep' }, { id: 'treasury.vault', name: 'Vault of Futures' }],
    unlocked: (ws) => bellsSilenced(ws) >= 2,
    load: async () => (await import('../../content/treasury/module')).default,
  },
  {
    id: 'household', name: 'The Garden Court — the Royal Household',
    bells: [{ id: 'household.gate', name: 'Servants\' Gate' }, { id: 'household.orangery', name: 'The Orangery' }, { id: 'household.throne', name: 'Antechamber of Successions' }],
    unlocked: (ws) => bellsSilenced(ws) >= 4,
    load: async () => (await import('../../content/household/module')).default,
  },
  {
    id: 'belfry', name: 'The Belfry of Return',
    bells: [{ id: 'belfry.foot', name: 'Foot of the Belfry' }, { id: 'belfry.crown', name: 'The Bell Crown' }],
    unlocked: (ws) => bellsSilenced(ws) >= 5,
    load: async () => (await import('../../content/belfry/module')).default,
  },
];

export const regionInfo = (id: string) => REGIONS.find((r) => r.id === id);
export const regionOfBell = (bellId: string) => REGIONS.find((r) => r.bells.some((b) => b.id === bellId));
