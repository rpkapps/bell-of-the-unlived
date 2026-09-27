/**
 * Spirit allies: summoned at boss veils, they fight beside the player using the Enemy AI with the
 * target swapped for the nearest hostile. Rules (GDD §8): allies draw aggro and deal damage but
 * never fill posture past 90 % and never perform criticals (they have no critical moves).
 */
import * as THREE from 'three';
import { Enemy, type EnemyDef } from './Enemy';
import type { Team, Actor } from './Actor';
import type { Services } from '../game/services';

export class Ally extends Enemy {
  override readonly team: Team = 'player';
  /** Seconds the spirit remains after its fight ends. */
  lingering = 0;
  constructor(def: EnemyDef, svc: Services, public owner: Actor, seed = 9) {
    super(def, svc, seed);
    this.aware = true;
    this.backstabbable = false;
    this.criticalable = false;
  }

  /** Pick the nearest living hostile; otherwise stay near the owner. */
  tickAlly(dt: number, hostiles: readonly Actor[]) {
    let best: Actor | null = null, bd = 22;
    for (const h of hostiles) {
      if (h.dead || h.team === this.team || !h.object.visible) continue;
      const d = this.distTo(h);
      if (d < bd) { bd = d; best = h; }
    }
    if (best) {
      this.target = best;
      this.aware = true;
      this.think(dt, best);
      return;
    }
    // follow the owner at a respectful distance
    this.target = null;
    const d = this.distTo(this.owner);
    if (!this.move && d > 3.2) {
      const dx = (this.owner.pos.x - this.pos.x) / d, dz = (this.owner.pos.z - this.pos.z) / d;
      const sp = d > 7 ? this.def.run : this.def.walk;
      this.wish.set(dx * sp, 0, dz * sp);
      this.faceToward(this.owner.pos.x, this.owner.pos.z, 8 * dt);
    } else if (!this.move) this.wish.set(0, 0, 0);
  }

  /** Spirits fade in with golden motes. */
  appear(at: THREE.Vector3, yaw: number) {
    this.resetAt(at, yaw);
    this.aware = true;
    this.svc.fx('bellMotes', this.chest, { count: 60, speed: 2 });
    this.svc.sfx('stillbell_ring', { pos: at });
  }
}
