/** Non-combat animated characters (Oswin, Hesper, Brannoc...). Idle loops + look-at the player. */
import type * as THREE from 'three';
import { Actor, type Team } from './Actor';
import { CLIPS } from './anim/clips';
import { angleDiff, clamp, yawOf } from '../core/math';

export class Npc extends Actor {
  readonly team: Team = 'neutral';
  idleClip: string | null = null;
  lookTarget: THREE.Vector3 | null = null;
  constructor(public npcId: string, props = { height: 1, bulk: 1, shoulder: 1 }) { super(props); }

  setIdle(clip: string | null) {
    this.idleClip = clip;
    const c = clip ? CLIPS[clip] : null;
    if (c) this.anim.play(c, { fade: 0.3 }); else this.anim.stop(0.3);
  }

  /** Called every sim step. */
  tick(dt: number) {
    this.prevPos.copy(this.pos); this.prevYaw = this.yaw;
    if (this.lookTarget) {
      const a = angleDiff(this.yaw, yawOf(this.lookTarget.x - this.pos.x, this.lookTarget.z - this.pos.z));
      const want = Math.abs(a) < 1.6 ? clamp(a * 57, -70, 70) : 0;
      this.anim.lookYaw += (want - this.anim.lookYaw) * (1 - Math.exp(-4 * dt));
    }
    this.stepAnimation(dt);
  }
}
