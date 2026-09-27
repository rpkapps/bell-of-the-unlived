/**
 * Region loading: builds a region's level into the running game (fresh collision world), attaches
 * its controller, and unloads the previous region (scene objects, lights, actors, projectiles).
 */
import * as THREE from 'three';
import type { Game } from '../Game';
import type { Region, Session } from '../Session';
import { CollisionWorld } from '../../world/Collision';
import { Projectiles } from '../../combat/Projectiles';
import { regionInfo } from './catalog';
import { registeredLights, unregisterLight } from '../../render/lights';

let owned: { objects: THREE.Object3D[]; lights: THREE.PointLight[] } | null = null;

function unloadCurrent(game: Game) {
  if (!owned) return;
  for (const o of owned.objects) {
    o.removeFromParent();
    o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) m.geometry?.dispose(); });
  }
  for (const l of owned.lights) unregisterLight(l);
  for (const e of game.enemies) e.object.removeFromParent();
  game.enemies.length = 0;
  for (const x of game.extras) x.object.removeFromParent();
  game.extras.length = 0;
  for (const p of game.projectiles.list) p.mesh?.removeFromParent();
  game.projectiles.list.length = 0;
  game.cam.lock = null;
  game.cameraOverride = null;
  owned = null;
}

export async function loadRegion(game: Game, session: Session, id: string): Promise<Region> {
  const info = regionInfo(id) ?? regionInfo('ashbridge')!;
  const mod = await info.load();
  unloadCurrent(game);
  const world = new CollisionWorld();
  game.world = world;
  (game.cam as any).world = world;
  const proj = new Projectiles(game.scene, world, game.combat);
  proj.makeMesh = game.projectiles.makeMesh;
  proj.onImpact = game.projectiles.onImpact;
  proj.onStatus = game.projectiles.onStatus;
  game.projectiles = proj;
  const before = new Set(game.scene.children);
  const lightsBefore = new Set(registeredLights());
  const layout = mod.build({ scene: game.scene, collision: world, quality: game.settings.graphics.quality, sun: game.deps.renderer.sun });
  world.build();
  owned = {
    objects: game.scene.children.filter((c) => !before.has(c) && c !== game.player?.object),
    lights: registeredLights().filter((l) => !lightsBefore.has(l)),
  };
  const region = mod.create(game, session, layout);
  session.region = region;
  session.ws && (session.ws.region = info.id);
  game.region = { step: (dt) => region.step(dt), frame: (dt) => region.frame(dt), hud: (h) => (region as any).hud?.(h) };
  game.onDeath = () => session.onPlayerDeath();
  game.titleView = (t) => region.titleCamera(t, game.deps.renderer.camera);
  game.deps.renderer.setEnvironment((region as any).defaultEnvironment ?? 'ashbridgeDusk', 0);
  return region;
}

/** Initial boot: Ashbridge (the title vista), or the region of the latest save. */
export async function bootRegion(game: Game, session: Session) {
  const save = session.saves.load();
  return loadRegion(game, session, save?.world.region ?? 'ashbridge');
}
