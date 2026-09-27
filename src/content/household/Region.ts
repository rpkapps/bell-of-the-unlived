import { RegionBase } from '../../game/regions/RegionBase';
import type { HouseholdLayout } from './level';
export class HouseholdRegion extends RegionBase {
  declare readonly L: HouseholdLayout;
  override defaultEnvironment = 'householdGarden';
  protected setup() {}
  protected override spawnEnemies() {}
  override resetEnemies() {}
}
