/**
 * The Garden Court (Royal Household) — lazy region module: level, environments, models, clips,
 * enemies, bosses and the region controller. Hunting hounds come from the shared beasts module.
 */
import type { RegionModule } from '../../game/regions/catalog';
import { regionInfo } from '../../game/regions/catalog';
import './environments';
import './models';
import './enemies';
import './bosses';
import '../beasts'; // shared quadrupeds: kind 'huntingHound'
import { buildHousehold, type HouseholdLayout } from './level';
import { HouseholdRegion } from './Region';

const mod: RegionModule = {
  build: (ctx) => buildHousehold(ctx),
  create: (game, session, layout) => new HouseholdRegion(game, session, layout as HouseholdLayout, regionInfo('household')!),
};
export default mod;
