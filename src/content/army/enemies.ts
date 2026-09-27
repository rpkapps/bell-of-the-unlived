/**
 * Siegeholm's enemies: definitions, movesets and behaviour.
 *
 *  - Pike wall (`pikeman`): three bearers of pike and pavise who face you and step as one, guarding
 *    in front; they thrust in sequence (the middle pike first — its thrust tells the others). Break
 *    one bearer's guard (or posture), or circle past the wall's slow turn to its flank, and the
 *    formation dissolves into three ordinary soldiers.
 *  - Crossbowman: raises and holds the aim (the tell), looses a heavy bolt, then needs a long
 *    windlass reload — the window to close in.
 *  - Sapper: lights a fire pot at the belt and lobs it in an arc (burst + burning); hatchet up close.
 *  - Siege knight: slow, heavy, hyper-armoured greatsword; long recoveries after every string.
 *  - Twice-slain: a soldier who died in both histories; unless killed by a critical or while its
 *    posture is broken, it falls and rises once more.
 *  - Cannon crew: tends the gate bombard. While any crew member lives, the bombard fires along its
 *    sightline at whoever stands on the killing ground: the fuse glows and hisses, a marker shows
 *    where the shot will land, and a wall or mantlet between you and the gun is safety.
 *  - Magazine guard: living defenders of the eastern magazine (sword and royal shield).
 *  - War hounds come from the shared beasts module (kind `warHound`).
 */
import * as THREE from 'three';
import type { EnemyDef } from '../../actors/Enemy';
import { Enemy } from '../../actors/Enemy';
import type { Actor, MoveInstance } from '../../actors/Actor';
import type { MoveDef, HitSpec } from '../../combat/types';
import type { Combatant, DamagePacket } from '../../combat/Combat';
import { registerMoves, MOVES } from '../../combat/moves';
import { registerClips } from '../../actors/anim/clips';
import { registerEnemyDefs, ENEMY_DEFS } from '../enemies';
import { INF_SWORD, TOWER_REST } from '../../actors/anim/clips/unlived';
import type { Game } from '../../game/Game';
import type { EnemySpawn } from '../../world/levelTypes';
import { angleDiff, approachAngle, yawOf } from '../../core/math';
import { armyClips, PIKE_REST, XB_REST, XB_REST_L, SK_REST, SK_REST_L } from './clips';
import { TOWER_GUARD } from '../../actors/anim/clips/unlived';

registerClips(armyClips);

const M = (d: MoveDef) => d;
const trail = (on: number, off: number) => [{ t: on, e: { type: 'trail' as const, on: true } }, { t: off, e: { type: 'trail' as const, on: false } }];

registerMoves({
  // pike wall
  pike_thrust: M({ id: 'pike_thrust', clip: 'pikeThrust', dur: 1.35, hits: [{ start: 0.6, end: 0.75, source: 'weaponR', dmg: 165, posture: 0, poise: 35, kind: 'thrust', knock: 2 }], motion: [[0.55, 0], [0.72, 0.45]], track: [0.56, 3.5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.58, e: { type: 'sfx', cue: 'swing_light' } }] }),
  pike_bash: M({ id: 'pike_bash', clip: 'pikeBash', dur: 1.4, tell: 'unparryable', hits: [{ start: 0.64, end: 0.78, source: 'sphere', sphere: { bone: 'handL', offset: [0.1, 0.1, 0], radius: 0.6 }, dmg: 115, posture: 0, poise: 70, kind: 'strike', unparryable: true, knock: 5, guardBreak: true }], motion: [[0.6, -0.2], [0.76, 1.1]], track: [0.58, 4], events: [{ t: 0.12, e: { type: 'sfx', cue: 'enemy_grunt' } }] }),
  // crossbowman
  xbow_shoot: M({ id: 'xbow_shoot', clip: 'xbowShoot', dur: 2.95, track: [1.08, 2.5], events: [{ t: 0.25, e: { type: 'sfx', cue: 'bow_draw' } }, { t: 1.12, e: { type: 'custom', id: 'bolt' } }, { t: 1.9, e: { type: 'sfx', cue: 'chain_rattle', volume: 0.35 } }] }),
  xbow_bash: M({ id: 'xbow_bash', clip: 'xbowBash', dur: 1.1, hits: [{ start: 0.55, end: 0.7, source: 'sphere', sphere: { bone: 'handR', offset: [0, 0.25, 0.05], radius: 0.35 }, dmg: 95, posture: 0, poise: 30, kind: 'strike', knock: 2 }], motion: [[0.5, 0], [0.66, 0.5]], track: [0.5, 5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }] }),
  // sapper
  sapper_throw: M({ id: 'sapper_throw', clip: 'sapperThrow', dur: 1.7, track: [0.9, 4], events: [{ t: 0.35, e: { type: 'custom', id: 'light' } }, { t: 0.36, e: { type: 'sfx', cue: 'cast_cinder', volume: 0.5 } }, { t: 0.95, e: { type: 'sfx', cue: 'throw' } }, { t: 0.96, e: { type: 'custom', id: 'pot' } }] }),
  sapper_chop: M({ id: 'sapper_chop', clip: 'infSlash', dur: 1.45, hits: [{ start: 0.57, end: 0.72, source: 'weaponR', dmg: 140, posture: 0, poise: 30, kind: 'slash', knock: 1.5 }], motion: [[0.5, 0], [0.7, 0.6]], track: [0.52, 4.5], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.55, e: { type: 'sfx', cue: 'swing_light' } }, ...trail(0.55, 0.74)] }),
  // siege knight
  sk_cleave: M({ id: 'sk_cleave', clip: 'skCleave', dur: 2.35, hits: [{ start: 1.08, end: 1.24, source: 'weaponR', dmg: 290, posture: 0, poise: 85, kind: 'strike', knock: 4 }], motion: [[1.0, 0], [1.2, 0.7]], track: [0.95, 3], hyper: [0.3, 1.24, 70], events: [{ t: 0.12, e: { type: 'sfx', cue: 'enemy_grunt' } }, { t: 1.05, e: { type: 'sfx', cue: 'swing_huge' } }, { t: 1.2, e: { type: 'shake', amount: 0.35 } }, ...trail(1.04, 1.25)] }),
  sk_sweep: M({ id: 'sk_sweep', clip: 'skSweep', dur: 1.95, hits: [{ start: 0.9, end: 1.1, source: 'weaponR', dmg: 245, posture: 0, poise: 60, kind: 'slash', knock: 3 }], motion: [[0.85, 0], [1.05, 0.6]], track: [0.82, 3.5], hyper: [0.3, 1.1, 50], events: [{ t: 0.1, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.88, e: { type: 'sfx', cue: 'swing_heavy' } }, ...trail(0.88, 1.12)] }),
  sk_thrust: M({ id: 'sk_thrust', clip: 'skThrust', dur: 1.75, hits: [{ start: 0.84, end: 0.98, source: 'weaponR', dmg: 230, posture: 0, poise: 50, kind: 'thrust', knock: 3 }], motion: [[0.78, -0.1], [0.95, 1.3]], track: [0.8, 4], hyper: [0.3, 0.98, 40], events: [{ t: 0.12, e: { type: 'sfx', cue: 'enemy_windup' } }, { t: 0.82, e: { type: 'sfx', cue: 'swing_heavy' } }, ...trail(0.82, 1.0)] }),
  sk_shove: M({ id: 'sk_shove', clip: 'skShove', dur: 1.35, tell: 'unparryable', hits: [{ start: 0.66, end: 0.82, source: 'sphere', sphere: { bone: 'chest', offset: [0, 0.1, 0.3], radius: 0.7 }, dmg: 130, posture: 0, poise: 90, kind: 'strike', unparryable: true, guardBreak: true, knock: 6 }], motion: [[0.6, -0.1], [0.8, 1.2]], track: [0.6, 4], events: [{ t: 0.12, e: { type: 'sfx', cue: 'enemy_grunt' } }] }),
  // twice-slain
  ts_fall: M({ id: 'ts_fall', clip: 'death', dur: 2.7, fade: 0.05, noFlinch: true }),
  ts_rise: M({ id: 'ts_rise', clip: 'reform', dur: 1.7, fade: 0.02, iframes: [0, 1.5], noFlinch: true, events: [{ t: 0.05, e: { type: 'custom', id: 'rise' } }, { t: 1.1, e: { type: 'sfx', cue: 'enemy_alert' } }] }),
});

const UNLIVED = { physical: 0.1, magic: 0.05, fire: 0.0 };
const INF = ENEMY_DEFS.infantry;

registerEnemyDefs({
  pikeman: {
    kind: 'pikeman', name: 'Pike Wall Bearer', look: 'pikeman', props: { height: 1.03, bulk: 1.08, shoulder: 1.04 }, radius: 0.45, height: 1.86,
    hp: 280, poise: 35, postureMax: 220, postureRegen: 30, defense: 72, absorb: { physical: 0.18, magic: 0.05, fire: 0.05 }, hours: 170, walk: 1.3, run: 3.0, sight: 16,
    weaponR: 'army_pike', shield: 'army_pavise', stance: { handR: PIKE_REST, handL: TOWER_GUARD, chest: [4, 4, 0] },
    attacks: [
      { move: 'pike_thrust', range: [1.2, 4.4], weight: 3, cooldown: 1.2 },
      { move: 'pike_bash', range: [0, 1.8], weight: 1.5, cooldown: 5 },
    ],
    guard: { physical: 100, magic: 55, stability: 68, stamina: 120, chance: 1 },
    recover: [0.9, 1.5], aggression: 0.5,
  },
  crossbowman: {
    kind: 'crossbowman', name: 'Siegeholm Crossbowman', look: 'crossbowman', props: { height: 1, bulk: 0.95, shoulder: 1 }, radius: 0.37, height: 1.8,
    hp: 170, poise: 10, postureMax: 120, postureRegen: 24, defense: 50, absorb: UNLIVED, hours: 95, walk: 1.6, run: 3.8, sight: 28,
    weaponR: 'garrison_arbalest', stance: { handR: XB_REST, handL: XB_REST_L, chest: [2, -4, 0] },
    attacks: [
      { move: 'xbow_shoot', range: [4, 30], angle: 0.5, weight: 3, cooldown: 1.6 },
      { move: 'xbow_bash', range: [0, 2.2], weight: 2 },
    ],
    keepDistance: [6, 18], recover: [0.8, 1.4], aggression: 0.7,
  },
  sapper: {
    kind: 'sapper', name: 'Siegeholm Sapper', look: 'sapper', props: { height: 0.97, bulk: 0.95, shoulder: 0.95 }, radius: 0.36, height: 1.76,
    hp: 190, poise: 12, postureMax: 130, postureRegen: 26, defense: 50, absorb: { physical: 0.1, magic: 0.05, fire: 0.3 }, hours: 95, walk: 1.7, run: 4.0, sight: 20,
    weaponR: 'woodsman_axe', stance: { handR: INF_SWORD, handL: null, chest: [6, -4, 0] },
    attacks: [
      { move: 'sapper_throw', range: [3.5, 17], angle: 0.6, weight: 3, cooldown: 2.6 },
      { move: 'sapper_chop', range: [0, 2.4], weight: 2 },
    ],
    keepDistance: [5, 12], recover: [0.8, 1.5], aggression: 0.65,
  },
  siegeKnight: {
    kind: 'siegeKnight', name: 'Siege Knight', look: 'siegeKnight', props: { height: 1.12, bulk: 1.3, shoulder: 1.15 }, radius: 0.55, height: 2.05,
    hp: 640, poise: 60, postureMax: 380, postureRegen: 36, defense: 88, absorb: { physical: 0.3, magic: 0.1, fire: 0.1 }, hours: 420, walk: 1.25, run: 2.8, sight: 14,
    weaponR: 'bellwarden_greatsword', stance: { handR: SK_REST, handL: SK_REST_L, chest: [4, -6, 0] },
    attacks: [
      { move: 'sk_sweep', range: [0, 3.4], weight: 3, follow: [['sk_cleave', 0.35]] },
      { move: 'sk_cleave', range: [0, 3.2], weight: 2.5, cooldown: 4 },
      { move: 'sk_thrust', range: [2.2, 4.8], weight: 2, cooldown: 4 },
      { move: 'sk_shove', range: [0, 1.9], weight: 1.2, cooldown: 7 },
    ],
    recover: [1.1, 1.9], aggression: 0.5,
  },
  twiceSlain: {
    ...INF, kind: 'twiceSlain', name: 'Twice-Slain Soldier', look: 'twiceSlain', props: { height: 1, bulk: 0.98, shoulder: 1 },
    hp: 240, poise: 22, postureMax: 170, hours: 110, sight: 14,
  },
  cannonCrew: {
    ...INF, kind: 'cannonCrew', name: 'Bombard Crew', look: 'cannonCrew', props: { height: 0.98, bulk: 1.05, shoulder: 1 },
    hp: 170, poise: 10, postureMax: 110, hours: 70, walk: 1.5, run: 3.6, sight: 18, weaponR: 'army_rammer',
    attacks: [
      { move: 'inf_slash', range: [0, 2.8], weight: 3, follow: [['inf_backhand', 0.3]] },
      { move: 'inf_thrust', range: [1.6, 3.8], weight: 2, cooldown: 3 },
    ],
  },
  magazineGuard: {
    kind: 'magazineGuard', name: 'Magazine Guard', look: 'armyLiving', props: { height: 1.02, bulk: 1.05, shoulder: 1.02 }, radius: 0.4, height: 1.84,
    hp: 280, poise: 25, postureMax: 190, postureRegen: 28, defense: 66, absorb: { physical: 0.15, magic: 0.05, fire: 0.05 }, hours: 130, walk: 1.6, run: 4.0, sight: 15,
    weaponR: 'enemy_sword', shield: 'household_shield', stance: { handR: INF_SWORD, handL: TOWER_REST, chest: [4, -4, 0] },
    attacks: [
      { move: 'inf_slash', range: [0, 2.6], weight: 4, follow: [['inf_backhand', 0.45]] },
      { move: 'inf_thrust', range: [1.6, 3.8], weight: 2, cooldown: 3 },
      { move: 'sb_bash', range: [0, 2.0], weight: 1.2, cooldown: 5 },
    ],
    guard: { physical: 90, magic: 40, stability: 55, stamina: 90, chance: 1 },
    recover: [0.8, 1.4], aggression: 0.55,
  },
} satisfies Record<string, EnemyDef>);

// ====================================================================== the pike wall

const BREAKING = new Set(['guard_broken', 'posture_broken', 'parried']);

/** Three pikes that face the enemy and step together; broken by a broken guard or a flank. */
export class Formation {
  readonly members: Pikeman[] = [];
  broken = false;
  yaw = 0;
  readonly center = new THREE.Vector3();
  clock = 0;
  private stamp = -1;
  private volleyCd = 1.2;
  private bashCd = 3;
  private behindT = 0;
  pending: { m: Pikeman; t: number; move: string }[] = [];
  onBreak: (why: string) => void = () => {};

  constructor(readonly id: string) {}

  reset() {
    this.broken = false;
    this.center.set(0, 0, 0);
    for (const m of this.members) this.center.add(m.home);
    this.center.divideScalar(Math.max(1, this.members.length));
    this.yaw = this.members[0]?.homeYaw ?? 0;
    this.volleyCd = 1.2; this.bashCd = 3; this.behindT = 0; this.pending = []; this.stamp = -1;
  }
  alive() { return this.members.filter((m) => !m.dead); }
  alert(target: Actor) { for (const m of this.members) if (!m.dead) m.becomeAware(target); }
  break(why: string) {
    if (this.broken) return;
    this.broken = true;
    this.pending = [];
    this.onBreak(why);
  }

  update(time: number, dt: number, target: THREE.Vector3) {
    if (this.stamp === time) return;
    this.stamp = time;
    this.clock += dt;
    const al = this.alive();
    if (al.length < 2) { this.break('thinned'); return; }
    for (const m of al) {
      const id = m.move?.def.id ?? '';
      if (BREAKING.has(id) || id.startsWith('victim_')) { this.break('guard'); return; }
    }
    const want = yawOf(target.x - this.center.x, target.z - this.center.z);
    const diff = angleDiff(this.yaw, want);
    this.yaw = approachAngle(this.yaw, want, 0.85 * dt);
    if (Math.abs(diff) > 1.35) { this.behindT += dt; if (this.behindT > 1.6) { this.break('flank'); return; } }
    else this.behindT = Math.max(0, this.behindT - dt);
    const d = Math.hypot(target.x - this.center.x, target.z - this.center.z);
    const speed = d > 3.4 ? 1.05 : d < 2.0 ? -0.7 : 0;
    if (Math.abs(diff) < 0.7 && speed !== 0) {
      const nx = this.center.x + Math.sin(this.yaw) * speed * dt, nz = this.center.z + Math.cos(this.yaw) * speed * dt;
      // the wall only advances while every bearer keeps up with its slot
      const lag = al.reduce((s, m) => Math.max(s, m.pos.distanceTo(this.slotPos(m))), 0);
      if (lag < 1.2) { this.center.x = nx; this.center.z = nz; }
    }
    this.volleyCd -= dt; this.bashCd -= dt;
    if (this.volleyCd <= 0 && d > 1.0 && d < 4.9 && Math.abs(diff) < 0.55) {
      // the middle pike first; the flanks follow — the first thrust is the tell for the others
      const order = [...al].sort((a, b) => Math.abs(this.slotIndex(a) - (al.length - 1) / 2) - Math.abs(this.slotIndex(b) - (al.length - 1) / 2));
      order.forEach((m, i) => this.pending.push({ m, t: this.clock + i * 0.32, move: 'pike_thrust' }));
      this.volleyCd = 2.6 + Math.random() * 0.9;
    } else if (this.bashCd <= 0 && d < 1.7) {
      let best = al[0], bd = Infinity;
      for (const m of al) { const dd = m.pos.distanceTo(target); if (dd < bd) { bd = dd; best = m; } }
      this.pending.push({ m: best, t: this.clock, move: 'pike_bash' });
      this.bashCd = 4.5;
    }
  }
  slotIndex(m: Pikeman) { return this.alive().sort((a, b) => a.slot - b.slot).indexOf(m); }
  slotPos(m: Pikeman, out = new THREE.Vector3()) {
    const al = this.alive().sort((a, b) => a.slot - b.slot);
    const i = al.indexOf(m), n = al.length;
    const off = (i - (n - 1) / 2) * 1.55;
    // right of the wall = (−cos yaw, 0, sin yaw)
    return out.set(this.center.x - Math.cos(this.yaw) * off, m.pos.y, this.center.z + Math.sin(this.yaw) * off);
  }
}

export class Pikeman extends Enemy {
  formation: Formation | null = null;
  slot = 0;
  private readonly _slot = new THREE.Vector3();

  override think(dt: number, player: Actor) {
    const f = this.formation;
    if (!f || f.broken || this.dead) { super.think(dt, player); return; }
    if (!this.aware) {
      super.think(dt, player);
      if (this.aware && this.target) { f.alert(this.target); this.svc.hint('armyFormation'); }
      return;
    }
    if (player.dead || this.home.distanceTo(this.pos) > this.leash + 2) { f.break('leash'); super.think(dt, player); return; }
    f.update(this.svc.time, dt, player.pos);
    if (f.broken) { super.think(dt, player); return; }
    this.guarding = !this.move && this.stamina > 10;
    const i = f.pending.findIndex((p) => p.m === this);
    if (i >= 0 && f.clock >= f.pending[i].t && !this.move) {
      const mv = f.pending[i].move;
      f.pending.splice(i, 1);
      this.guarding = false;
      this.doAttack(mv);
    }
    if (this.move) { this.wish.set(0, 0, 0); return; }
    const s = f.slotPos(this, this._slot);
    const dx = s.x - this.pos.x, dz = s.z - this.pos.z, d = Math.hypot(dx, dz);
    const sp = Math.min(this.def.walk * 1.25, d * 2.5);
    if (d > 0.05 && this.groundOk(dx / d, dz / d)) this.wish.set((dx / d) * sp, 0, (dz / d) * sp);
    else this.wish.set(0, 0, 0);
    this.yaw = approachAngle(this.yaw, f.yaw, 4 * dt);
  }
  private groundOk(x: number, z: number) { return !!this.svc.world.groundAt(this.pos.x + x * 0.9, this.pos.y + 0.8, this.pos.z + z * 0.9, 2.2); }
}

// ====================================================================== crossbowman & sapper

export class Crossbowman extends Enemy {
  protected override onCustom(id: string, m: MoveInstance) {
    if (id !== 'bolt' || !this.target) { super.onCustom(id, m); return; }
    const origin = new THREE.Vector3().setFromMatrixPosition(this.rig.sockets.weaponR.matrixWorld);
    origin.addScaledVector(this.forward, 0.45);
    const aim = this.target.chest.clone();
    aim.addScaledVector(this.target.vel, Math.min(0.3, origin.distanceTo(aim) / 36));
    const dir = aim.sub(origin).normalize();
    dir.y += 0.01;
    this.svc.spawnProjectile({ kind: 'bolt', owner: this, pos: origin, vel: dir.multiplyScalar(36), gravity: 1.5, radius: 0.06, life: 3, packet: { physical: 115, magic: 0, fire: 0 }, posture: 15, poise: 40, damageKind: 'thrust' });
    this.svc.sfx('bow_release', { pos: this.pos, rate: 0.7 });
  }
}

export class Sapper extends Enemy {
  protected override onCustom(id: string, m: MoveInstance) {
    const hand = new THREE.Vector3().setFromMatrixPosition(this.rig.bones.handL.matrixWorld);
    if (id === 'light') { this.svc.fx('embers', hand, { count: 16 }); return; }
    if (id !== 'pot' || !this.target) { super.onCustom(id, m); return; }
    const tgt = this.target.pos.clone().addScaledVector(this.target.vel, 0.35);
    tgt.y += 0.2;
    const d = Math.hypot(tgt.x - hand.x, tgt.z - hand.z);
    const T = Math.min(1.3, Math.max(0.6, 0.55 + d * 0.045)), g = 14;
    const vel = new THREE.Vector3((tgt.x - hand.x) / T, (tgt.y - hand.y + 0.5 * g * T * T) / T, (tgt.z - hand.z) / T);
    this.svc.spawnProjectile({ kind: 'fireball', owner: this, pos: hand, vel, gravity: g, radius: 0.15, life: 3, packet: { physical: 30, magic: 0, fire: 105 }, posture: 20, poise: 50, damageKind: 'fire', burst: 2.0, status: { id: 'burn', seconds: 3, dps: 10 } });
  }
}

// ====================================================================== twice-slain

export class TwiceSlain extends Enemy {
  revived = false;
  down = false;
  override resetAt(pos: THREE.Vector3, yaw: number) { super.resetAt(pos, yaw); this.revived = false; this.down = false; }
  override react(kind: Parameters<Enemy['react']>[0], from: THREE.Vector3) {
    if (this.down || this.dead) return;
    if (kind === 'death' && !this.revived) {
      const m = this.move?.def;
      const critical = !!m && m.id.startsWith('victim_');
      const broken = !!m && (m.vulnerable === 'postureBroken' || m.id === 'posture_broken');
      if (!critical && !broken) {
        this.down = true;
        this.hp = 0;
        this.guarding = false;
        this.svc.trail(this, false);
        const dx = this.pos.x - from.x, dz = this.pos.z - from.z;
        if (dx * dx + dz * dz > 1e-6) this.yaw = yawOf(-dx, -dz);
        this.startMove(MOVES.ts_fall, { fade: 0.05 });
        this.svc.sfx('enemy_death', { pos: this.pos });
        return;
      }
    }
    super.react(kind, from);
  }
  protected override onMoveEnd(m: MoveInstance) {
    if (m.def.id === 'ts_fall' && this.down) {
      this.hp = Math.round(this.hpMax * 0.55);
      this.posture = 0;
      this.startMove(MOVES.ts_rise);
      return;
    }
    if (m.def.id === 'ts_rise') { this.down = false; this.revived = true; }
    super.onMoveEnd(m);
  }
  protected override onCustom(id: string, m: MoveInstance) {
    if (id === 'rise') {
      this.svc.fx('goldMotes', this.chest, { count: 90, speed: 2.5 });
      this.svc.fx('bellMotes', this.pos.clone().setY(this.pos.y + 0.3), { count: 30 });
      this.svc.sfx('memory_trigger', { pos: this.pos, volume: 0.35 });
      this.svc.hint('armyTwiceSlain');
      return;
    }
    super.onCustom(id, m);
  }
}

/** Classes for the region's enemy kinds (plain Enemy for the rest). */
export const ARMY_ENEMY_CLASSES: Record<string, new (def: EnemyDef, svc: Game, seed: number) => Enemy> = {
  pikeman: Pikeman, crossbowman: Crossbowman, sapper: Sapper, twiceSlain: TwiceSlain,
};

/** Spawn an enemy with its region class (mirrors Game.spawnEnemy's dressing). */
export function spawnArmyEnemy(g: Game, s: EnemySpawn, seed: number): Enemy {
  const Cls = ARMY_ENEMY_CLASSES[s.kind];
  const def = ENEMY_DEFS[s.kind];
  const pos = s.anchor.pos.clone(), yaw = s.anchor.yaw;
  if (!Cls || !def) return g.spawnEnemy(s.kind, pos, yaw, { id: s.id, leash: s.leash, patrol: s.patrol, idle: s.idleAnim, seed });
  const e = new Cls(def, g, seed);
  e.spawnId = s.id;
  e.home.copy(pos); e.homeYaw = yaw;
  if (s.leash) e.leash = s.leash;
  if (s.patrol) e.patrol = s.patrol;
  if (s.idleAnim) e.idleAnim = s.idleAnim;
  const m = g.deps.models;
  if (m) {
    e.model = m.buildEnemy(e.rig, def.look, seed);
    if (def.weaponR) { const w = m.buildWeapon(def.weaponR); e.weaponR = { id: def.weaponR, model: w }; e.rig.sockets.weaponR.add(w.object); }
    if (def.weaponL) { const w = m.buildWeapon(def.weaponL); e.weaponL = { id: def.weaponL, model: w }; e.rig.sockets.weaponL.add(w.object); }
    if (def.shield) { const w = m.buildWeapon(def.shield); e.shield = { id: def.shield, model: w }; e.rig.sockets.shieldL.add(w.object); }
  } else {
    // headless: no visuals, but melee hit segments still need weapon extents
    const seg = (id: string) => ({ object: new THREE.Group(), hit: id.includes('shield') || id.includes('pavise') || id.includes('arbalest') ? null : { from: 0.12, to: id.includes('pike') ? 2.3 : id.includes('greatsword') ? 1.5 : 1.0, radius: 0.06 } });
    if (def.weaponR) { const w = seg(def.weaponR); e.weaponR = { id: def.weaponR, model: w }; e.rig.sockets.weaponR.add(w.object); }
    if (def.shield) { const w = seg(def.shield); e.shield = { id: def.shield, model: w }; e.rig.sockets.shieldL.add(w.object); }
  }
  e.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
  e.onKilled = (en) => (g as unknown as { onEnemyKilled(x: Enemy): void }).onEnemyKilled(en);
  g.scene.add(e.object);
  e.resetAt(pos, yaw);
  g.enemies.push(e);
  return e;
}

// ====================================================================== artillery

const SHOT_MOVE: MoveDef = { id: 'bombard_shot', clip: '', dur: 0 };
const SHOT_SPEC: HitSpec = { start: 0, end: 0, source: 'sphere', dmg: 0, posture: 0, poise: 110, kind: 'fire', unparryable: true, knock: 7 };

interface Shell { from: THREE.Vector3; to: THREE.Vector3; t: number; flight: number; delay: number; mesh: THREE.Mesh; marker: THREE.Group; fill: THREE.Mesh; owner: Combatant; packet: DamagePacket; radius: number; fired: boolean }

let MARKER_MATS: { ring: THREE.MeshBasicMaterial; fill: THREE.MeshBasicMaterial; iron: THREE.MeshStandardMaterial } | null = null;
function markerMats() {
  if (!MARKER_MATS) {
    MARKER_MATS = {
      ring: new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      fill: new THREE.MeshBasicMaterial({ color: 0xff5a20, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      iron: new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.5, metalness: 0.8 }),
    };
  }
  return MARKER_MATS;
}

/**
 * Shells in flight with their ground markers: a jagged ring the size of the blast (the shape reads
 * without colour) and a filling disc that completes the instant the shot lands. Damage is an AoE
 * resolved through the shared combat rules; a wall between the blast and you stops it.
 */
export class Shells {
  private list: Shell[] = [];
  constructor(private g: Game, private parent: THREE.Object3D) {}

  /** Launch a shot from `from` to the ground point `to`, landing after `delay + flight` seconds. */
  launch(owner: Combatant, from: THREE.Vector3, to: THREE.Vector3, o: { flight?: number; delay?: number; radius?: number; packet?: DamagePacket } = {}) {
    const mats = markerMats();
    const radius = o.radius ?? 2.4;
    const marker = new THREE.Group();
    const ring = new THREE.Mesh(jaggedRing(radius), mats.ring);
    ring.rotation.x = -Math.PI / 2;
    const fill = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.96, 32), mats.fill);
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.01;
    marker.add(ring, fill);
    marker.position.copy(to).setY(to.y + 0.06);
    marker.renderOrder = 6;
    this.parent.add(marker);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mats.iron);
    mesh.visible = false;
    this.parent.add(mesh);
    this.list.push({ from: from.clone(), to: to.clone(), t: 0, flight: o.flight ?? 1.0, delay: o.delay ?? 0, mesh, marker, fill, owner, packet: o.packet ?? { physical: 150, magic: 0, fire: 130 }, radius, fired: false });
  }

  step(dt: number) {
    for (const s of this.list) {
      s.t += dt;
      const total = s.delay + s.flight;
      const k = Math.min(1, s.t / total);
      s.fill.scale.setScalar(Math.max(0.02, k));
      (s.marker.children[0] as THREE.Mesh).rotation.z += dt * 0.8;
      if (!s.fired && s.t >= s.delay) {
        s.fired = true;
        s.mesh.visible = true;
        this.g.sfx('fire_burst', { pos: s.from, volume: 0.9 });
        this.g.sfx('hit_heavy', { pos: s.from, rate: 0.6 });
        this.g.fx('fireBurst', s.from, { count: 24 });
        this.g.fx('dust', s.from, { count: 30, speed: 3 });
      }
      if (s.fired) {
        const u = Math.min(1, (s.t - s.delay) / s.flight);
        const p = s.from.clone().lerp(s.to, u);
        p.y += Math.sin(u * Math.PI) * Math.min(8, s.from.distanceTo(s.to) * 0.18);
        s.mesh.position.copy(p);
      }
      if (s.t >= total) this.impact(s);
    }
    this.list = this.list.filter((s) => s.t < s.delay + s.flight);
  }

  private impact(s: Shell) {
    const g = this.g;
    s.marker.removeFromParent(); s.mesh.removeFromParent();
    s.mesh.geometry.dispose();
    (s.marker.children as THREE.Mesh[]).forEach((c) => c.geometry.dispose());
    const p = s.to;
    g.fx('fireBurst', p, { count: 80 });
    g.fx('rubble', p, { count: 30 });
    g.fx('dust', p, { count: 60, speed: 5 });
    g.sfx('fire_burst', { pos: p });
    g.sfx('collapse_rumble', { pos: p, volume: 0.45 });
    const pl = g.player;
    if (pl) g.shake(Math.max(0, 0.5 - pl.pos.distanceTo(p) * 0.03));
    const eye = p.clone().setY(p.y + 0.6);
    for (const a of g.actors()) {
      if (a.dead || a.team !== 'player') continue;
      const c = a.chest;
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d > s.radius + a.radius || Math.abs(a.pos.y - p.y) > 2.5) continue;
      if (!g.world.lineOfSight(eye, c)) continue;
      const k = d < s.radius * 0.45 ? 1 : 1 - 0.6 * (d - s.radius * 0.45) / (s.radius * 0.55 + a.radius);
      g.combat.resolveWith(s.owner, a as unknown as Combatant, SHOT_SPEC, SHOT_MOVE, c, { physical: s.packet.physical * k, magic: 0, fire: s.packet.fire * k }, 40 * k);
    }
  }

  clear() { for (const s of this.list) { s.marker.removeFromParent(); s.mesh.removeFromParent(); } this.list = []; }
  get active() { return this.list.length; }
}

function jaggedRing(r: number) {
  const shape = new THREE.Shape();
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r * (i % 2 ? 1.0 : 1.08);
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const hole = new THREE.Path();
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const rr = r * 0.9; if (i === 0) hole.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else hole.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape);
}

/**
 * A bombard emplacement: while any of its crew lives it covers `lane`. With a clear sightline
 * from the muzzle to the target it lights the fuse (glow + hiss + caption, 1.3 s), marks where the
 * shot will land (the target's position when the fuse was lit) and fires; the shell lands ~1 s later.
 */
export class Battery {
  private t = 0;
  private state: 'idle' | 'fuse' = 'idle';
  private cd = 2.5;
  private target = new THREE.Vector3();
  private told = false;
  constructor(private g: Game, private shells: Shells, readonly muzzle: THREE.Vector3, readonly crew: Enemy[], readonly lane: THREE.Box3, private light: THREE.PointLight | null, private opts = { interval: 5.2, fuse: 1.3, flight: 1.05 }) {}

  reset() { this.t = 0; this.state = 'idle'; this.cd = 2.5; if (this.light) this.light.intensity = 0; }
  private owner() { return this.crew.find((c) => !c.dead) ?? null; }
  get silenced() { return !this.owner(); }

  step(dt: number) {
    const g = this.g, pl = g.player;
    const owner = this.owner();
    if (this.light) this.light.intensity = this.state === 'fuse' ? 6 + Math.sin(g.time * 40) * 2 : Math.max(0, this.light.intensity - dt * 20);
    if (!owner || !pl || pl.dead) { this.state = 'idle'; return; }
    const inLane = this.lane.containsPoint(pl.pos);
    if (this.state === 'idle') {
      this.cd -= dt;
      if (!inLane || this.cd > 0) return;
      const sight = g.world.lineOfSight(this.muzzle, pl.chest);
      if (!sight) { this.cd = 0.6; return; }
      for (const c of this.crew) if (!c.dead && !c.aware) c.becomeAware(pl);
      this.state = 'fuse'; this.t = 0;
      this.target.copy(pl.pos);
      const gr = g.world.groundAt(pl.pos.x, pl.pos.y + 1, pl.pos.z, 4);
      if (gr) this.target.y = gr.y;
      g.sfx('cast_cinder', { pos: this.muzzle, volume: 1.2, rate: 0.6 });
      g.sfx('enemy_windup', { pos: this.muzzle });
      g.deps.ui?.caption('[Bombard fuse hisses]');
      if (!this.told) { this.told = true; g.hint('armyBombard'); }
      // the mark goes down with the fuse: fuse + flight to get clear, or behind cover
      this.shells.launch(owner, this.muzzle, this.target, { delay: this.opts.fuse, flight: this.opts.flight, radius: 2.5 });
      return;
    }
    this.t += dt;
    if (Math.random() < dt * 12) g.fx('embers', this.muzzle, { count: 3 });
    if (this.t >= this.opts.fuse) { this.state = 'idle'; this.cd = this.opts.interval; }
  }
}
