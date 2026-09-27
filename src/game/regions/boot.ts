/** Builds the Ashbridge level into the running game and attaches its region controller. */
import type { Game } from '../Game';
import type { Session } from '../Session';
import { buildAshbridge } from '../../content/ashbridge/level';
import { AshbridgeRegion } from './Ashbridge';
import { CollisionWorld } from '../../world/Collision';
import { Projectiles } from '../../combat/Projectiles';

export async function bootRegion(game: Game, session: Session) {
  const world = new CollisionWorld();
  game.world = world;
  (game.cam as any).world = world;
  const proj = new Projectiles(game.scene, world, game.combat);
  proj.makeMesh = game.projectiles.makeMesh;
  proj.onImpact = game.projectiles.onImpact;
  proj.onStatus = game.projectiles.onStatus;
  game.projectiles = proj;
  const layout = buildAshbridge({ scene: game.scene, collision: world, quality: game.settings.graphics.quality, sun: game.deps.renderer.sun });
  if (!(world as any).debugMesh) world.build();
  game.deps.renderer.setEnvironment('ashbridgeDusk', 0);
  const region = new AshbridgeRegion(game, session, layout);
  session.region = region;
  game.region = { step: (dt) => region.step(dt), frame: (dt) => region.frame(dt), hud: (h) => region.hud(h) };
  game.onDeath = () => session.onPlayerDeath();
  game.titleView = (t) => region.titleCamera(t, game.deps.renderer.camera);
  return region;
}
