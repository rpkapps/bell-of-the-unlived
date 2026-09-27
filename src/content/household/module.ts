/**
 * The Garden Court (Royal Household) — lazy region module: level, environments, enemies, bosses,
 * models, clips and the region controller.
 */
import type { RegionModule } from '../../game/regions/catalog';
import { regionInfo } from '../../game/regions/catalog';
import './environments';
import { buildHousehold, type HouseholdLayout } from './level';
import { HouseholdRegion } from './Region';

const mod: RegionModule = {
  build: (ctx) => buildHousehold(ctx),
  create: (game, session, layout) => new HouseholdRegion(game, session, layout as HouseholdLayout, regionInfo('household')!),
};
export default mod;
