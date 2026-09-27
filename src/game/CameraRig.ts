/**
 * Souls-style third-person camera: free orbit, lock-on (with target switching), wall collision,
 * gentle auto-recenter, and accessibility-scaled shake.
 */
import * as THREE from 'three';
import type { Actor } from '../actors/Actor';
import type { CollisionWorld } from '../world/Collision';
import { angleDiff, clamp, damp, dampAngle, wrapAngle, yawOf } from '../core/math';

const PITCH_MIN = -0.95, PITCH_MAX = 1.15;

export class CameraRig {
  yaw = 0;
  /** Elevation: + looks down on the player from above. */
  pitch = 0.28;
  dist = 4.4;
  private curDist = 4.4;
  lock: Actor | null = null;
  private lostT = 0;
  private shakeAmt = 0;
  private shakeT = 0;
  private idleT = 0;
  readonly pivot = new THREE.Vector3();
  private pivotS = new THREE.Vector3();
  readonly forward = new THREE.Vector3(0, 0, 1);
  shakeScale = 1;
  /** Over-the-shoulder aiming (bows/crossbows): 0..1 blend. */
  private aimW = 0;
  baseFov = 60;
  autoRecenter = true;
  private recenterT = 0;

  constructor(public camera: THREE.PerspectiveCamera, private world: CollisionWorld) {}

  snapBehind(a: Actor) {
    this.yaw = a.yaw; this.pitch = 0.28;
    this.pivotS.set(a.pos.x, a.pos.y + 1.55, a.pos.z);
    this.curDist = this.dist;
  }

  shake(amount: number) { this.shakeAmt = Math.min(1, this.shakeAmt + amount * this.shakeScale); }

  /** Toggle lock-on. Returns the new target (or null). */
  toggleLock(player: Actor, candidates: readonly Actor[]): Actor | null {
    if (this.lock) { this.lock = null; return null; }
    const t = this.pick(player, candidates, 0);
    this.lock = t;
    if (!t) this.recenterT = 0.3; // no target: recenter behind the player (Souls convention)
    return t;
  }

  /** Switch target left (-1) or right (+1) relative to the current one on screen. */
  switchTarget(dir: number, player: Actor, candidates: readonly Actor[]) {
    if (!this.lock) return;
    // on screen, right of the current target means a smaller yaw (angleDiff < 0)
    const next = this.pick(player, candidates, -dir);
    if (next) this.lock = next;
  }

  private pick(player: Actor, candidates: readonly Actor[], dir: number): Actor | null {
    let best: Actor | null = null, bestScore = Infinity;
    const refYaw = this.lock && dir !== 0 ? yawOf(this.lock.pos.x - this.pivot.x, this.lock.pos.z - this.pivot.z) : this.yaw;
    for (const c of candidates) {
      if (c.dead || c === player || c === this.lock && dir !== 0) continue;
      const d = player.distTo(c);
      if (d > 22) continue;
      const ang = angleDiff(refYaw, yawOf(c.pos.x - this.pivot.x, c.pos.z - this.pivot.z));
      if (dir === 0 && Math.abs(ang) > 1.05) continue;
      if (dir !== 0 && Math.sign(ang) !== Math.sign(dir) && Math.abs(ang) > 0.02) continue;
      if (!this.world.lineOfSight(this.pivot, c.chest)) continue;
      const score = dir === 0 ? Math.abs(ang) * 8 + d : Math.abs(ang) * 10 + d * 0.3;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  update(dt: number, player: Actor, look: { x: number; y: number }, moving: boolean) {
    const aiming = !!(player as unknown as { aiming?: boolean }).aiming && !this.lock;
    this.aimW = damp(this.aimW, aiming ? 1 : 0, 10, dt);
    // pivot follows the player smoothly (vertical smoothing hides stair steps)
    const target = new THREE.Vector3(player.object.position.x, player.object.position.y + 1.55, player.object.position.z);
    this.pivotS.x = target.x; this.pivotS.z = target.z;
    this.pivotS.y = damp(this.pivotS.y, target.y, 12, dt);
    this.pivot.copy(this.pivotS);

    if (this.lock && (this.lock.dead || player.distTo(this.lock) > 26)) this.lock = null;
    if (this.lock) {
      if (!this.world.lineOfSight(this.pivot, this.lock.chest)) { this.lostT += dt; if (this.lostT > 2) this.lock = null; }
      else this.lostT = 0;
    }
    if (this.lock) {
      const lp = this.lock.chest;
      const ty = yawOf(lp.x - this.pivot.x, lp.z - this.pivot.z);
      this.yaw = dampAngle(this.yaw, ty, 9, dt);
      const hd = Math.hypot(lp.x - this.pivot.x, lp.z - this.pivot.z);
      const tp = clamp(Math.atan2(this.pivot.y - lp.y, hd) + 0.22, -0.3, 0.8);
      this.pitch = damp(this.pitch, tp, 5, dt);
    } else {
      // +yaw turns the view toward +X, which is screen-left; look.x > 0 means "look right"
      this.yaw = wrapAngle(this.yaw - look.x);
      this.pitch = clamp(this.pitch - look.y, PITCH_MIN, PITCH_MAX);
      if (Math.abs(look.x) + Math.abs(look.y) > 1e-4) this.idleT = 0; else this.idleT += dt;
      if (this.recenterT > 0) {
        this.recenterT -= dt;
        this.yaw = dampAngle(this.yaw, player.yaw, 14, dt);
        this.pitch = damp(this.pitch, 0.28, 10, dt);
      } else if (this.autoRecenter && moving && this.idleT > 1.6) {
        // gentle follow: drift toward the movement heading
        this.yaw = dampAngle(this.yaw, player.yaw, 0.9, dt);
      }
    }
    // camera position
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const back = new THREE.Vector3(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);
    const want = (this.lock ? this.dist + 0.3 : this.dist) * (1 - 0.4 * this.aimW);
    const hit = this.world.raycast(this.pivot, back, want + 0.3);
    const allowed = hit ? Math.max(0.6, hit.distance - 0.3) : want;
    this.curDist = allowed < this.curDist ? allowed : damp(this.curDist, allowed, 3, dt);
    const pos = this.pivot.clone().addScaledVector(back, this.curDist);
    // shoulder offset while aiming (to the character's right = camera right)
    if (this.aimW > 0.001) {
      const right = new THREE.Vector3(Math.cos(this.yaw) * -1, 0, Math.sin(this.yaw));
      pos.addScaledVector(right, 0.85 * this.aimW);
      pos.y += 0.1 * this.aimW;
    }
    const fov = this.baseFov * (1 - 0.28 * this.aimW);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    // shake
    if (this.shakeAmt > 0.001) {
      this.shakeT += dt * 40;
      const a = this.shakeAmt * this.shakeAmt * 0.12;
      pos.x += Math.sin(this.shakeT * 1.3) * a; pos.y += Math.sin(this.shakeT * 1.7 + 1) * a; pos.z += Math.sin(this.shakeT * 1.1 + 2) * a;
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
    }
    this.camera.position.copy(pos);
    const lookAt = this.pivot.clone();
    if (this.lock) lookAt.lerp(this.lock.chest, 0.18);
    if (this.aimW > 0.001) lookAt.addScaledVector(new THREE.Vector3(Math.cos(this.yaw) * -1, 0, Math.sin(this.yaw)), 0.55 * this.aimW).addScaledVector(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 2 * this.aimW);
    this.camera.lookAt(lookAt);
    this.camera.getWorldDirection(this.forward);
  }
}
