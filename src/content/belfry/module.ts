/**
 * The Belfry of Return — lazy region module: environments, models, enemies, bosses, the level and
 * the controller. Loaded after all five institution keepers fall.
 */
import type { RegionModule } from '../../game/regions/catalog';
import { regionInfo } from '../../game/regions/catalog';
import type { LevelContext } from '../../world/levelTypes';
import './environments';
import './models';
import './enemies';
import './bosses';
import { buildBelfry, type BelfryLayout } from './level';
import { BelfryRegion } from './Region';

const mod: RegionModule = {
  build(ctx: LevelContext) { return buildBelfry(ctx); },
  create(game, session, layout) { return new BelfryRegion(game, session, layout as BelfryLayout, regionInfo('belfry')!); },
};
export default mod;
