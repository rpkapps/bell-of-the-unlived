/**
 * Siegeholm — the Royal Army (lazy region module): level builder + region controller. Importing it
 * registers the region's enemies, bosses, clips, models and environment presets.
 */
import type { RegionModule } from '../../game/regions/catalog';
import { regionInfo } from '../../game/regions/catalog';
import { buildArmy, type ArmyLayout } from './level';
import { ArmyRegion } from './Region';
import './enemies';
import './bosses';
import './models';
import './environments';

// War hounds come from the shared beasts module (built concurrently); load it when it exists.
// Until then `warHound` spawns fall back to infantry (Game.spawnEnemy).
import.meta.glob('../beasts/index.ts', { eager: true });

const armyModule: RegionModule = {
  build: (ctx) => buildArmy(ctx),
  create: (game, session, layout) => new ArmyRegion(game, session, layout as ArmyLayout, regionInfo('army')!),
};
export default armyModule;
