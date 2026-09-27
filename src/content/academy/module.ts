/**
 * The Suspended Campus (the Royal Academy) as a lazily loaded RegionModule: level builder +
 * controller, plus every heavy registration (enemies, bosses, clips, models, environments, lines).
 */
import type { RegionModule } from '../../game/regions/catalog';
import { regionInfo } from '../../game/regions/catalog';
import './environments';
import './models';
import './enemies';
import './bosses';
import { buildAcademy, type AcademyLayout } from './level';
import { AcademyRegion } from './Region';

const mod: RegionModule = {
  build: (ctx) => buildAcademy(ctx),
  create: (game, session, layout) => new AcademyRegion(game, session, layout as AcademyLayout, regionInfo('academy')!),
};
export default mod;
