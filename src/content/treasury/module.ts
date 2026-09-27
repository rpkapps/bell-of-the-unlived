/**
 * The Undervaults — the Royal Treasury (lazy region module). Everything heavy is imported here:
 * environment presets, enemy/boss definitions, models and clips, the level builder and the region
 * controller.
 */
import type { RegionModule } from '../../game/regions/catalog';
import type { LevelContext } from '../../world/levelTypes';
import './environments';
import './models';
import './enemies';
import './bosses';
import { buildTreasury, type TreasuryLayout } from './level';
import { TreasuryRegion } from './Region';

const mod: RegionModule = {
  build(ctx: LevelContext) { return buildTreasury(ctx); },
  create(game, session, layout) { return new TreasuryRegion(game, session, layout as TreasuryLayout); },
};
export default mod;
