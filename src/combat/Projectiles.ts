/**
 * Projectiles: swept spheres against world collision and actor hurt volumes. Spells, thrown
 * knives, arrows and bolts all go through here and resolve with the shared defensive rules.
 */
import * as THREE from 'three';
import type { Combat, Combatant, DamagePacket } from './Combat';
import type { HitSpec, MoveDef } from './types';
import type { CollisionWorld } from '../world/Collision';
import { segmentSegmentDistSq } from '../core/math';

export type ProjectileKind = 'shard' | 'cinder' | 'knife' | 'arrow' | 'bolt' | 'knell' | 'fireball';

export interface ProjectileSpec {
  kind: ProjectileKind;
  owner: Combatant;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  gravity?: number;
  radius: number;
  life: number;
  packet: DamagePacket;
  posture: number;
  poise: number;
  damageKind: HitSpec['kind'];
  /** Explosion radius on impact (0 = none). */
  burst?: number;
  /** Homing strength toward a target (rad/s), for lock-on. */
  homing?: { target: Combatant; rate: number };
  /** Status applied on hit. */
  status?: { id: 'burn'; seconds: number; dps: number };
  unparryable?: boolean;
}

export interface Projectile extends ProjectileSpec { age: number; alive: boolean; mesh: THREE.Object3D | null; prev: THREE.Vector3 }

const PROJECTILE_MOVE: MoveDef = { id: 'projectile', clip: '', dur: 0 };
const _d = new THREE.Vector3(), _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3();

export class Projectiles {
  readonly list: Projectile[] = [];
  /** Visual factory (set by the game): returns a mesh for a projectile, or null. */
  makeMesh: (p: Projectile) => THREE.Object3D | null = () => null;
  onImpact: (p: Projectile, point: THREE.Vector3, hitActor: Combatant | null) => void = () => {};
  onStatus: (target: Combatant, s: NonNullable<ProjectileSpec['status']>) => void = () => {};

  constructor(private scene: THREE.Scene, private world: CollisionWorld, private combat: Combat) {}

  spawn(spec: ProjectileSpec) {
    const p: Projectile = { ...spec, pos: spec.pos.clone(), vel: spec.vel.clone(), prev: spec.pos.clone(), age: 0, alive: true, mesh: null };
    p.mesh = this.makeMesh(p);
    if (p.mesh) { p.mesh.position.copy(p.pos); this.scene.add(p.mesh); }
    this.list.push(p);
  }

  step(dt: number, actors: readonly Combatant[]) {
    for (const p of this.list) {
      if (!p.alive) continue;
      p.age += dt;
      p.prev.copy(p.pos);
      if (p.homing && !p.homing.target.dead) {
        const t = p.homing.target.chest;
        _d.copy(t).sub(p.pos).normalize();
        const sp = p.vel.length();
        const cur = p.vel.clone().normalize();
        const ang = cur.angleTo(_d);
        const step = Math.min(1, (p.homing.rate * dt) / Math.max(ang, 1e-4));
        cur.lerp(_d, step).normalize();
        p.vel.copy(cur.multiplyScalar(sp));
      }
      if (p.gravity) p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      // actors
      let hitActor: Combatant | null = null;
      for (const a of actors) {
        if (a === p.owner || a.dead || a.team === p.owner.team) continue;
        if (a.pos.distanceToSquared(p.pos) > 36) continue;
        for (const hv of a.hurt) {
          const d2 = segmentSegmentDistSq(p.prev, p.pos, hv.a, hv.b, _c1, _c2);
          const rr = p.radius + hv.r;
          if (d2 < rr * rr) { hitActor = a; break; }
        }
        if (hitActor) break;
      }
      // world
      _d.copy(p.pos).sub(p.prev);
      const len = _d.length();
      const wh = len > 1e-5 ? this.world.raycast(p.prev, _d.clone().divideScalar(len), len + p.radius) : null;
      if (hitActor && (!wh || wh.distance > hitActor.pos.distanceTo(p.prev) - 0.5)) this.impact(p, _c2.clone(), hitActor, actors);
      else if (wh) this.impact(p, wh.point, null, actors);
      else if (p.age > p.life) { p.alive = false; this.onImpact(p, p.pos.clone(), null); }
      if (p.mesh) {
        p.mesh.position.copy(p.pos);
        if (p.vel.lengthSq() > 1e-4) p.mesh.lookAt(_d.copy(p.pos).add(p.vel));
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (!p.alive) { if (p.mesh) this.scene.remove(p.mesh); this.list.splice(i, 1); }
    }
  }

  private impact(p: Projectile, point: THREE.Vector3, hit: Combatant | null, actors: readonly Combatant[]) {
    p.alive = false;
    const spec: HitSpec = { start: 0, end: 0, source: 'sphere', dmg: 0, posture: p.posture, poise: p.poise, kind: p.damageKind, unparryable: true, knock: p.burst ? 2 : 0.5 };
    const struck = new Set<Combatant>();
    if (hit) { this.combat.resolveWith(p.owner, hit, spec, PROJECTILE_MOVE, point, p.packet, p.posture); struck.add(hit); }
    if (p.burst) {
      for (const a of actors) {
        if (a === p.owner || a.dead || a.team === p.owner.team || struck.has(a)) continue;
        if (a.chest.distanceTo(point) < p.burst + a.radius) {
          const falloff = 0.6;
          this.combat.resolveWith(p.owner, a, spec, PROJECTILE_MOVE, a.chest, { physical: p.packet.physical * falloff, magic: p.packet.magic * falloff, fire: p.packet.fire * falloff }, p.posture * falloff);
          struck.add(a);
        }
      }
    }
    if (p.status) for (const a of struck) if (!a.dead) this.onStatus(a, p.status);
    this.onImpact(p, point, hit);
  }
}
