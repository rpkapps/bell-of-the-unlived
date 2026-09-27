/** Ashbridge as a RegionModule. */
import type { RegionModule } from './catalog';
import { buildAshbridge } from '../../content/ashbridge/level';
import { AshbridgeRegion } from './Ashbridge';
import type { AshbridgeLayout } from '../../world/levelTypes';

const mod: RegionModule = {
  build: (ctx) => buildAshbridge(ctx),
  create: (game, session, layout) => new AshbridgeRegion(game, session, layout as AshbridgeLayout),
};
export default mod;
