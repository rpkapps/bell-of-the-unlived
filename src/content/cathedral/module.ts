/**
 * The Pilgrim Stair — the Cathedral (lazy chunk): registers the region's environments, enemies,
 * bosses, looks and weapons, and exports the RegionModule (level builder + controller).
 */
import './environments';
import './enemies';
import './bosses';
import { registerCathedralLooks } from './models';
import { buildCathedralLevel, type CathedralLayout } from './level';
import { CathedralRegion } from './Region';
import { regionInfo, type RegionModule } from '../../game/regions/catalog';

registerCathedralLooks();

const mod: RegionModule = {
  build: (ctx) => buildCathedralLevel(ctx),
  create: (game, session, layout) => new CathedralRegion(game, session, layout as CathedralLayout, regionInfo('cathedral')!),
};
export default mod;
