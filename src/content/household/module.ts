/**
 * The Garden Court (Royal Household) — lazy region module: level, environments, models, clips,
 * enemies, bosses and the region controller. Hunting hounds come from the shared beasts module
 * (loaded when present; until it lands, hound spawns are skipped rather than replaced).
 */
import type { RegionModule } from '../../game/regions/catalog';
import { regionInfo } from '../../game/regions/catalog';
import './environments';
import './models';
import './enemies';
import './bosses';
import { buildHousehold, type HouseholdLayout } from './level';
import { HouseholdRegion } from './Region';

// Shared quadrupeds (kind 'huntingHound'): eager glob import so this compiles before the module exists.
import.meta.glob('../beasts/index.ts', { eager: true });

const mod: RegionModule = {
  build: (ctx) => buildHousehold(ctx),
  create: (game, session, layout) => new HouseholdRegion(game, session, layout as HouseholdLayout, regionInfo('household')!),
};
export default mod;
