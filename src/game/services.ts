/**
 * What actors and systems may call on the running game. Keeps actor code decoupled from Game.
 */
import type * as THREE from 'three';
import type { CueId, PlayOpts } from '../audio/contract';
import type { ParticleKind, EmitOpts } from '../render/contract';
import type { CollisionWorld } from '../world/Collision';
import type { Combat } from '../combat/Combat';
import type { Settings } from './settings';
import type { Actor } from '../actors/Actor';
import type { ProjectileSpec } from '../combat/Projectiles';

export interface Services {
  readonly world: CollisionWorld;
  readonly combat: Combat;
  readonly settings: Settings;
  /** Seconds of simulation since the session began. */
  readonly time: number;
  sfx(cue: CueId, opts?: PlayOpts): void;
  fx(kind: ParticleKind, pos: THREE.Vector3, opts?: EmitOpts): void;
  shake(amount: number): void;
  spawnProjectile(spec: ProjectileSpec): void;
  /** All combat-relevant actors (player, enemies, allies). */
  actors(): readonly Actor[];
  hint(id: string): void;
  trail(actor: Actor, on: boolean): void;
}
