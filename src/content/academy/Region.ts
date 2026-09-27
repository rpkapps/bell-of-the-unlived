/**
 * The Suspended Campus — quest logic and the region's bespoke mechanics.
 *
 *  - Ranged pressure: glass acolytes loose glass shards; lens wardens (and Keeper Orrow) focus
 *    beams across lanes — a light line narrows for 1.35 s, locks, then fires (resolved here).
 *  - Interrupted rituals: a chanting ritual choir wards nearby Unlived (visible bubbles and
 *    threads, damage ×0.3). Any blow on the choir interrupts the chant for 9 s (posture break 14 s).
 *  - Echo constructs copy the last Imprint Technique the Returned used.
 *  - The lift (Lift Well ⇄ Lens Terrace), the Sea Gate and the drawbridge shortcuts (flags).
 *  - Keeper Orrow's lens floor: plates turn unsafe on a timer (glow + broken-ring glyph ≥ 1.6 s,
 *    then a burning light column); the chosen pattern always leaves a connected, reachable safe set.
 *  - Forememory: The Expelled Scholar (Ansel Wick — remembered builder of the bell engines; his
 *    notes in two incompatible states; winch his cage in and free him → Hospice teacher, or cross
 *    the Keeper's veil first and lose him). The Unlived Muster: Corporal Fenn's name in the register.
 */
import * as THREE from 'three';
import type { Game } from '../../game/Game';
import type { Session } from '../../game/Session';
import type { RegionInfo } from '../../game/regions/catalog';
import type { ArenaLayout } from '../../world/levelTypes';
import type { MusicState } from '../../audio/contract';
import type { Enemy, EnemyDef } from '../../actors/Enemy';
import type { MoveInstance } from '../../actors/Actor';
import type { Combatant } from '../../combat/Combat';
import type { HitSpec, MoveDef } from '../../combat/types';
import { RegionBase } from '../../game/regions/RegionBase';
import type { Boss } from '../bosses';
import { MOVES } from '../../combat/moves';
import { ENEMY_DEFS } from '../enemies';
import { DIALOGUE } from '../dialogue';
import { segmentSegmentDistSq } from '../../core/math';
import { addMat } from './levelCommon';
import type { AcademyLayout } from './level';
import { ECHO_FOR } from './enemies';
import { ORROW_ATTACKS } from './bosses';
import { BLADE_REST } from './clips';
import './lines';

const F = {
  seaGate: 'academy.seaGate', drawbridge: 'academy.drawbridge', liftUp: 'academy.liftUp', cageDocked: 'academy.cageDocked',
  wickBoard: 'academy.wickBoard', notesA: 'academy.notesA', notesB: 'academy.notesB', fennMet: 'academy.fennMet', muster: 'muster.academy',
  register: 'academy.register', arrived: 'academy.arrived', wickShout: 'academy.wickShout', x9Reward: 'academy.x9Reward',
};

const BEAM_MOVE: MoveDef = { id: 'academy_beam', clip: '', dur: 0 };
const FLOOR_MOVE: MoveDef = { id: 'academy_lens_floor', clip: '', dur: 0 };
const magicSpec = (poise: number, knock = 1.5): HitSpec => ({ start: 0, end: 0, source: 'sphere', dmg: 0, posture: 0, poise, kind: 'magic', unparryable: true, unblockable: true, knock });

interface Beam { owner: Enemy; mesh: THREE.Mesh; state: 'aim' | 'lock' | 'fire' | 'fade'; t: number; dir: THREE.Vector3; origin: THREE.Vector3; len: number; dmg: number; hit: boolean }
interface Ward { bubble: THREE.Mesh; link: THREE.Mesh | null; until: number; from: Enemy | null }
interface Mark { pos: THREE.Vector3; t: number; mesh: THREE.Mesh; pillar: THREE.Mesh; owner: Enemy; done: boolean }

export class AcademyRegion extends RegionBase {
  declare readonly L: AcademyLayout;
  override defaultEnvironment = 'academyStorm';
  override defaultMusic: MusicState = 'academy';

  private fxRoot = new THREE.Group();
  private beams: Beam[] = [];
  private wards = new Map<Enemy, Ward>();
  private choirs = new Map<Enemy, { lastHp: number; until: number }>();
  private lastTech: string | null = null;
  private echoOf = new WeakMap<Enemy, string | null>();
  private marks: Mark[] = [];
  private liftT = 0;
  private liftTarget = 0;
  private liftMoving = false;
  private liftLeverPos = new THREE.Vector3();
  private cageT = 0;
  private cageMoving = false;
  private readonly _v = new THREE.Vector3();
  // lens floor
  private floor = { active: false, nextAt: 0, pending: -1, states: [] as { s: 0 | 1 | 2 | 3; t: number; warn: number }[], tickT: 0, seen: false };

  constructor(game: Game, session: Session, L: AcademyLayout, info: RegionInfo) {
    super(game, session, L, info);
    this.fxRoot.name = 'academy:fx';
    L.root.add(this.fxRoot);
    this.floor.states = L.lensFloor.plates.map(() => ({ s: 0, t: 0, warn: 2.2 }));
    // (added here, not in setup(): subclass fields are initialised only after RegionBase's constructor)
    this.add('lift:ride', this.liftLeverPos, 1.6, () => (this.liftMoving ? null : this.liftT < 0.5 ? 'Work the lift (up)' : 'Work the lift (down)'), () => this.playerAct('lever', () => this.startLift(this.liftT < 0.5 ? 1 : 0)), false);
  }

  private get wick() { return this.ws.npcs.wick as string | undefined; }

  // ================================================================== setup
  protected setup() {
    const A = (n: string) => this.A(n);
    // ---- pickups (loot, secrets)
    this.pickup('academy.shard', 'shard', 'bellbronze_shard', 1, 'Take the bellbronze shard');
    this.pickup('academy.pinning', 'prompterScroll', 'imprint_pinning_shot', 1, 'Take the scroll');
    this.pickup('academy.courtHood', 'courtHood', 'court_hood', 1, 'Take the hood');
    this.pickup('academy.courtGloves', 'courtGloves', 'court_gloves', 1, 'Take the gloves');
    this.pickup('academy.scrapTunnel', 'scrapTunnel', 'tempered_scrap', 2, 'Take the scrap');
    this.pickup('academy.knives', 'knives', 'throwing_knife', 5, 'Take the knives');
    this.pickup('academy.sealStaff', 'sealStaff', 'mint_seal_staff', 1, 'Take the staff');
    this.pickup('academy.wardScroll', 'wardScroll', 'imprint_bellglass_ward', 1, 'Take the scroll');
    this.pickup('academy.scrapLabB', 'scrapLabB', 'bellbronze_scrap', 1, 'Take the bell-metal');
    this.pickup('academy.scrapYard', 'scrapYard', 'tempered_scrap', 2, 'Take the scrap');
    this.pickup('academy.scrapSpire', 'scrapSpire', 'bellbronze_scrap', 1, 'Take the bell-metal');
    this.pickup('academy.hospiceHood', 'lab9Reward', 'hospice_hood', 1, 'Take the hood');
    // ---- shortcuts
    this.opener('seaGate', 'seaGateLever', F.seaGate, 'Pull the gate lever', {
      anchorName: 'seaGateLever', cue: 'lever_pull',
      after: () => { setTimeout(() => { this.game.sfx('gate_open', { pos: this.P('seaGate').object.position }); this.tween(this.P('seaGate'), 0, 1, 3.2); }, 600); },
    });
    this.add('seaGate:outside', new THREE.Vector3(0, 2, 21.2), 2.2, () => (this.flag(F.seaGate) ? null : 'Examine the gate'), () => this.inspect('academy_sea_gate'));
    this.opener('drawbridge', 'drawbridgeLever', F.drawbridge, 'Pull the bridge lever', {
      anchorName: 'drawbridgeLever', cue: 'lever_pull',
      after: () => { setTimeout(() => { this.game.sfx('chain_rattle', { pos: this.A('drawbridgeLever').pos }); this.tween(this.P('drawbridge'), 0, 1, 3.6, () => { this.game.sfx('drawbridge_slam'); this.game.shake(0.3); }); }, 500); this.game.hint('drawbridge'); },
    });
    this.add('drawbridge:far', new THREE.Vector3(0, 24, -11), 2.0, () => (this.flag(F.drawbridge) ? null : 'Look across'), () => this.inspect('academy_bridge_raised'));
    // ---- the lift
    this.add('lift:callLow', A('liftCallLow'), 1.8, () => (this.liftMoving || this.liftT < 0.5 ? null : 'Call the lift'), () => this.playerAct('lever', () => { this.P('liftCallLow').set(1); setTimeout(() => this.P('liftCallLow').set(0), 900); this.startLift(0); }));
    this.add('lift:callHigh', A('liftCallHigh'), 1.8, () => (this.liftMoving || this.liftT > 0.5 ? null : 'Call the lift'), () => this.playerAct('lever', () => { this.P('liftCallHigh').set(1); setTimeout(() => this.P('liftCallHigh').set(0), 900); this.startLift(1); }));
    // ---- the Expelled Scholar
    this.inspectAt('academy_wick_notes_a', 'wickNotesA', 'Read the notebook on the lectern', () => {
      if (!this.flag(F.notesA)) { this.setFlag(F.notesA); this.memoryFlash(); this.subtitle('Wick. I remember the name — and his hand on the lever, the night the bells were rung.'); }
      this.record('academy_scholar', 'mem_wick');
      this.record('academy_scholar', 'obs_notes_bell');
      this.session.save();
    });
    this.inspectAt('academy_wick_notes_b', 'wickNotesB', 'Read the notebook on the stool', () => {
      this.setFlag(F.notesB);
      this.record('academy_scholar', 'mem_wick');
      this.record('academy_scholar', 'obs_notes_sea');
      this.session.save();
    });
    this.add('winch', A('winch'), 1.9, () => (this.wick === 'imprisoned' && !this.flag(F.cageDocked) && !this.cageMoving ? 'Work the winch' : null), () => this.playerAct('lever', () => this.dockCage()));
    this.add('cage', A('cageSpeak'), 2.2, () => (this.wick === 'imprisoned' && this.flag(F.cageDocked) && !this.cageMoving ? 'Open the cage' : this.wick === 'taken' ? 'Examine the cage' : null), () => {
      if (this.wick === 'taken') { void this.inspect('academy_empty_cage'); return; }
      void this.freeWick();
    }, false);
    // ---- the Unlived Muster: Corporal Fenn and the register
    this.add('fenn', A('fenn'), 2.6, () => 'Speak with the soldier', () => void this.talkFenn(), false);
    this.inspectAt('academy_register', 'register', 'Read the register', () => {
      this.record('academy_keeper', 'mem_orrow');
      this.record('academy_keeper', 'obs_register');
      if (this.flag(F.fennMet) && !this.pd.inventory.register_leaf && !this.flag(F.muster)) {
        void this.inspect('academy_register_fenn', () => { this.session.grantItem('register_leaf'); this.record('muster_academy', 'obs_leaf'); this.session.save(); });
      } else this.session.save();
    });
    // ---- histories side by side
    this.inspectAt('academy_drowned_desks', 'drownedDesks', 'Examine the benches');
    this.inspectAt('academy_spire_plaque', 'spirePlaque', 'Read the foundation stone');
    // ---- triggers
    this.onTrigger('arrival', () => {
      this.record('academy_keeper', 'mem_orrow');
      this.subtitle('The Academy. The bell up there rang over the water the night the kingdom was rung away.', 'The Returned', 6);
    });
    this.onTrigger('labs', () => {
      if (this.wick !== 'imprisoned') return;
      this.record('academy_scholar', 'obs_cage');
      for (const l of this.dialogueLines('wick_shout')) this.game.deps.ui?.subtitle(l);
    });
    this.onTrigger('observatory', () => { this.game.sfx('great_bell_toll', { pos: this.L.greatBell.position, volume: 0.8 }); });
  }

  private dialogueLines(key: string) { return DIALOGUE[key] ?? []; }

  // ================================================================== state

  protected override pieceFlags() {
    return { seaGate: F.seaGate, seaGateLever: F.seaGate, drawbridge: F.drawbridge, drawbridgeLever: F.drawbridge, wickBoard: F.wickBoard, lift: F.liftUp, cage: F.cageDocked };
  }

  protected override applyRegionState() {
    if (!this.ws.npcs.wick) this.ws.npcs.wick = 'imprisoned';
    this.liftT = this.flag(F.liftUp) ? 1 : 0;
    this.liftTarget = this.liftT;
    this.liftMoving = false;
    this.cageMoving = false;
    const cage = this.P('cage') as ReturnType<typeof this.P> & { door?: THREE.Object3D };
    this.cageT = this.wick === 'imprisoned' && this.flag(F.cageDocked) ? 1 : 0;
    cage.set(this.cageT);
    if (cage.door) cage.door.rotation.y = this.wick === 'imprisoned' ? 0 : -1.6;
    this.P('wickBoard').set(this.wick === 'rescued' ? 1 : 0);
    this.removeNpc('wick');
    if (this.wick === 'imprisoned') this.placeWick();
    this.removeNpc('fenn');
    this.spawnNpc('fenn', this.A('fenn'), 'sit', 'corporalFenn');
    this.resetFloor();
    this.clearFx();
  }

  private placeWick() {
    const cage = this.P('cage') as unknown as { pos(t: number): THREE.Vector3 };
    const p = cage.pos(this.cageT);
    const n = this.npcs.get('wick') ?? this.spawnNpc('wick', { pos: p.clone().setY(p.y + 0.16), yaw: -Math.PI / 2 }, 'sit', 'anselWick');
    n.teleport(p.clone().setY(p.y + 0.16), Math.PI / 2);
  }

  // ================================================================== enemies & bosses

  protected override spawnEnemies() {
    super.spawnEnemies();
    this.wards.forEach((w) => { w.bubble.removeFromParent(); w.link?.removeFromParent(); });
    this.wards.clear();
    this.choirs.clear();
    for (const { e } of this.enemyList) this.attachBehaviour(e);
  }

  override resetEnemies() {
    super.resetEnemies();
    for (const { e } of this.enemyList) { e.def = ENEMY_DEFS[e.def.kind] ?? e.def; this.echoOf.delete(e); }
    this.choirs.clear();
    this.clearFx();
    this.resetFloor();
  }

  protected override spawnBoss(a: ArenaLayout): Boss {
    const b = super.spawnBoss(a);
    b.onEvent = (id) => this.enemyEvent(b, id);
    b.onShockwave = (p) => { this.game.fx('dust', p, { count: 60, speed: 5 }); };
    if (a.bossId === 'orrow') b.def = { ...b.spec.def, attacks: ORROW_ATTACKS[1] };
    return b;
  }

  /** Per-enemy bespoke behaviour: custom move events and the ward damage wrapper. */
  private attachBehaviour(e: Enemy) {
    const self = this;
    const ex = e as unknown as { onCustom: (id: string, m: MoveInstance) => void; defend: Combatant['defend']; __academy?: boolean };
    if (ex.__academy) return;
    ex.__academy = true;
    const baseCustom = ex.onCustom.bind(e);
    ex.onCustom = (id: string, m: MoveInstance) => { if (!self.enemyEvent(e, id)) baseCustom(id, m); };
    const baseDefend = ex.defend.bind(e);
    ex.defend = (p, k) => {
      const d = baseDefend(p, k);
      const w = self.wards.get(e);
      if (w && self.time < w.until) { self.game.fx('blockSparks', e.chest, { count: 10, color: 0xffe8b0 }); return Math.round(d * 0.3); }
      return d;
    };
    if (e.def.kind === 'choirLeader') this.choirs.set(e, { lastHp: e.hp, until: 0 });
  }

  /** Custom move events for Academy enemies and bosses. Returns true when handled. */
  private enemyEvent(e: Enemy, id: string): boolean {
    const g = this.game;
    switch (id) {
      case 'charge': { const p = this.castPoint(e); if (p) g.fx('bellMotes', p, { count: 14, speed: 0.6 }); return true; }
      case 'glassShard': this.shootShards(e, [0], 20, 80); return true;
      case 'glassShardL': this.shootShards(e, [-0.14], 20, 70); return true;
      case 'glassShardR': this.shootShards(e, [0.14], 20, 70); return true;
      case 'orrowShards': this.shootShards(e, e.phase >= 2 ? [-0.2, -0.07, 0.07, 0.2] : [-0.16, 0, 0.16], 22, 110); return true;
      case 'beamAim': this.beamAim(e); return true;
      case 'beamLock': { const b = this.beams.find((x) => x.owner === e && x.state === 'aim'); if (b) { b.state = 'lock'; b.t = 0; g.sfx('parry_attempt', { pos: e.pos, volume: 0.8 }); } return true; }
      case 'beamFire': { const b = this.beams.find((x) => x.owner === e && (x.state === 'lock' || x.state === 'aim')); if (b) this.beamFire(b); return true; }
      case 'chant': return true;
      case 'tollRing': g.fx('dust', e.pos.clone().add(new THREE.Vector3(0, 0.2, 0)), { count: 50, speed: 5 }); g.fx('bellMotes', e.chest, { count: 30, speed: 3 }); return true;
      case 'echo': {
        g.fx('bellMotes', e.chest.add(new THREE.Vector3(0, 0.4, 0)), { count: 20, speed: 1.5 });
        g.sfx('technique', { pos: e.pos });
        if (this.echoOf.get(e)) g.hint('academy_echo');
        return true;
      }
      case 'echoWard': this.giveWard(e, 4.5, null); return true;
      case 'slamDust': g.fx('dust', e.pos.clone().add(e.forward.multiplyScalar(1.6)), { count: 90, speed: 6 }); g.fx('rubble', e.pos, { count: 20 }); return true;
      case 'chainRattle': g.sfx('chain_rattle', { pos: e.pos }); return true;
      case 'burst': {
        const dirs: number[] = [];
        for (let i = 0; i < 10; i++) dirs.push((i / 10) * Math.PI * 2);
        this.shootRing(e, dirs, 14, 90);
        g.fx('shatter', e.chest, { count: 60 });
        return true;
      }
      case 'realignStart': return true;
      case 'realign': this.startFloorPattern(); return true;
      case 'shatterLens': { const p = this.castPoint(e); if (p) { g.fx('shatter', p, { count: 50 }); g.fx('bellMotes', p, { count: 40, speed: 2 }); } return true; }
      case 'preserve': g.fx('goldMotes', e.chest, { count: 120, speed: 2 }); return true;
      case 'hourMark': this.hourMark(e); return true;
      default: return false;
    }
  }

  private castPoint(e: Enemy): THREE.Vector3 | null {
    const w = e.weaponR;
    if (!w) return e.chest;
    const cp = w.model.castPoint ?? new THREE.Vector3(0, (w.model.hit?.to ?? 0.5), 0);
    e.rig.sockets.weaponR.updateWorldMatrix(true, false);
    return cp.clone().applyMatrix4(e.rig.sockets.weaponR.matrixWorld);
  }

  /** Glass shards toward the target (yaw offsets in radians), with a little lead. */
  private shootShards(e: Enemy, offsets: number[], speed: number, dmg: number) {
    const t = e.target ?? this.player;
    const origin = this.castPoint(e) ?? e.chest;
    const aim = t.chest.clone().addScaledVector(t.vel, Math.min(0.4, origin.distanceTo(t.chest) / speed));
    const base = aim.sub(origin).normalize();
    for (const o of offsets) {
      const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), o);
      this.spawnShard(e, origin, dir.multiplyScalar(speed), dmg);
    }
  }
  private shootRing(e: Enemy, yaws: number[], speed: number, dmg: number) {
    const origin = e.chest;
    for (const a of yaws) this.spawnShard(e, origin, new THREE.Vector3(Math.sin(a), 0.02, Math.cos(a)).multiplyScalar(speed), dmg, 1.6);
  }
  private spawnShard(e: Enemy, origin: THREE.Vector3, vel: THREE.Vector3, dmg: number, life = 2.6) {
    const g = this.game;
    g.spawnProjectile({ kind: 'shard', owner: e as Combatant, pos: origin.clone(), vel, gravity: 0.6, radius: 0.12, life, packet: { physical: dmg * 0.2, magic: dmg * 0.8, fire: 0 }, posture: 14, poise: 22, damageKind: 'magic' });
    // replace the default glowing orb (and its real point light) with a glass shard
    const p = g.projectiles.list[g.projectiles.list.length - 1];
    if (p?.mesh) {
      for (const c of [...p.mesh.children]) c.removeFromParent();
      const m = p.mesh as THREE.Mesh;
      m.geometry = SHARD_GEO();
      m.material = SHARD_MAT();
    }
    g.sfx('cast_shard', { pos: origin, volume: 0.7 });
  }

  // ---------------------------------------------------------------- beams

  private beamAim(e: Enemy) {
    const origin = this.castPoint(e) ?? e.chest;
    const mesh = new THREE.Mesh(BEAM_GEO(), addMat('beamAim', 0xffe2a8, 0.5).clone());
    mesh.renderOrder = 8;
    mesh.frustumCulled = false;
    this.fxRoot.add(mesh);
    const t = e.target ?? this.player;
    const dir = t.chest.clone().sub(origin).normalize();
    this.beams.push({ owner: e, mesh, state: 'aim', t: 0, dir, origin, len: 20, dmg: e.isBoss ? 230 : 200, hit: false });
    this.game.hint('academy_beam');
  }

  private beamFire(b: Beam) {
    b.state = 'fire'; b.t = 0;
    const g = this.game, p = this.player;
    g.sfx('fire_burst', { pos: b.origin, volume: 0.7 });
    g.shake(0.2);
    (b.mesh.material as THREE.Material).dispose();
    b.mesh.material = addMat('beamFire', 0xfff6e4, 0.95).clone();
    const end = b.origin.clone().addScaledVector(b.dir, b.len);
    if (!p.dead && !b.owner.dead) {
      const _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3();
      let best = Infinity;
      for (const hv of p.hurt) { const d2 = segmentSegmentDistSq(b.origin, end, hv.a, hv.b, _c1, _c2); best = Math.min(best, d2 - (hv.r + 0.42) ** 2); }
      if (best < 0) {
        const r = g.combat.resolveWith(b.owner as Combatant, p as unknown as Combatant, magicSpec(70, 3), BEAM_MOVE, p.chest, { physical: 0, magic: b.dmg, fire: 0 }, 30);
        if (r.outcome !== 'dodged') g.fx('sparks', p.chest, { count: 20, color: 0xfff0c8 });
      }
    }
    g.fx('sparks', end, { count: 24, color: 0xffe8b0 });
  }

  private stepBeams(dt: number) {
    for (const b of this.beams) {
      b.t += dt;
      const e = b.owner;
      if (e.dead || (b.state !== 'fade' && b.state !== 'fire' && !e.move?.def.id.includes('beam'))) { b.state = 'fade'; }
      if (b.state === 'aim' || b.state === 'lock') {
        const o = this.castPoint(e);
        if (o) b.origin.copy(o);
        if (b.state === 'aim') {
          const t = e.target ?? this.player;
          const want = t.chest.clone().sub(b.origin).normalize();
          const ang = b.dir.angleTo(want);
          if (ang > 1e-4) b.dir.lerp(want, Math.min(1, (1.3 * dt) / ang)).normalize();
        }
      }
      // length: to the first wall along the line (max 30 m)
      const hit = this.game.world.raycast(b.origin, b.dir, 30);
      b.len = hit ? hit.distance : 30;
      let w = 0.05, op = 0.5;
      if (b.state === 'aim') { const k = Math.min(1, b.t / 1.27); w = 0.9 - 0.8 * k; op = 0.18 + 0.3 * k + 0.12 * Math.sin(b.t * (8 + k * 14)); }
      else if (b.state === 'lock') { w = 0.07; op = 0.75 + 0.25 * Math.sin(b.t * 60); }
      else if (b.state === 'fire') { w = 0.55 - b.t * 0.6; op = 1; if (b.t > 0.2) { b.state = 'fade'; b.t = 0; } }
      else { w = Math.max(0.02, 0.3 - b.t); op = Math.max(0, 0.6 - b.t * 2); }
      const m = b.mesh;
      m.position.copy(b.origin);
      m.scale.set(Math.max(0.02, w), Math.max(0.02, w), b.len);
      this._v.copy(b.origin).add(b.dir);
      m.lookAt(this._v);
      (m.material as THREE.MeshBasicMaterial).opacity = op;
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      if (b.state === 'fade' && b.t > 0.35) { b.mesh.removeFromParent(); (b.mesh.material as THREE.Material).dispose(); this.beams.splice(i, 1); }
    }
  }

  // ---------------------------------------------------------------- wards (ritual choir, echo ward)

  private giveWard(e: Enemy, seconds: number, from: Enemy | null) {
    let w = this.wards.get(e);
    if (!w) {
      const bubble = new THREE.Mesh(WARD_GEO(), addMat('ward', 0xffe6a8, 0.22, THREE.FrontSide));
      bubble.renderOrder = 6;
      this.fxRoot.add(bubble);
      w = { bubble, link: null, until: 0, from: null };
      this.wards.set(e, w);
      this.game.sfx('ward_up', { pos: e.pos, volume: 0.6 });
    }
    w.until = Math.max(w.until, this.time + seconds);
    if (from && !w.link) {
      const link = new THREE.Mesh(LINK_GEO(), addMat('wardLink', 0xffe6a8, 0.45));
      link.renderOrder = 6;
      this.fxRoot.add(link);
      w.link = link;
    }
    if (!from && w.link) { w.link.removeFromParent(); w.link = null; }
    w.from = from;
  }

  private stepWards() {
    const g = this.game;
    // choir leaders: interruption and warding
    for (const [c, st] of this.choirs) {
      if (c.dead) continue;
      if (c.hp < st.lastHp) {
        st.until = this.time + (c.move?.def.id === 'posture_broken' ? 14 : 9);
        if (c.move?.def.id === 'choir_chant') c.endMove();
        g.fx('shatter', c.chest.add(new THREE.Vector3(0, 0.5, 0)), { count: 24 });
        g.sfx('guard_break', { pos: c.pos, volume: 0.6 });
        for (const w of this.wards.values()) if (w.from === c) w.until = 0;
      }
      st.lastHp = c.hp;
      const interrupted = this.time < st.until;
      const base = ENEMY_DEFS.choirLeader;
      const want = interrupted ? NO_CHANT(base) : base;
      if (c.def !== want) c.def = want;
      const chanting = c.move?.def.id === 'choir_chant' && c.aware && !interrupted;
      if (!chanting) continue;
      for (const { e } of this.enemyList) {
        if (e === c || e.dead || e.def.kind === 'choirLeader' || !e.object.visible) continue;
        if (e.pos.distanceTo(c.pos) > 11 || Math.abs(e.pos.y - c.pos.y) > 7) continue;
        this.giveWard(e, 0.6, c);
      }
      g.hint('academy_ward');
    }
    // visuals & expiry
    for (const [e, w] of this.wards) {
      const live = !e.dead && this.time < w.until;
      if (!live) { w.bubble.removeFromParent(); w.link?.removeFromParent(); this.wards.delete(e); if (!e.dead) g.fx('shatter', e.chest, { count: 16 }); continue; }
      const s = e.height * 0.62;
      w.bubble.position.copy(e.chest).setY(e.pos.y + e.height * 0.52);
      w.bubble.scale.set(s * 0.85, s, s * 0.85);
      (w.bubble.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.08 * Math.sin(this.time * 5 + e.id);
      const from = w.from;
      if (w.link && from) {
        const a = this.castPoint(from) ?? from.chest, b = e.chest;
        const d = b.clone().sub(a);
        w.link.position.copy(a);
        w.link.scale.set(1, 1, d.length());
        w.link.lookAt(b);
      }
    }
  }

  // ---------------------------------------------------------------- echo constructs

  private stepEcho() {
    const pm = this.player.move?.def.id;
    if (pm && pm.startsWith('tech_') && ECHO_FOR[pm] && this.lastTech !== pm) this.lastTech = pm;
    for (const { e } of this.enemyList) {
      if (e.def.kind !== 'echoConstruct' || e.dead) continue;
      if (this.echoOf.get(e) === this.lastTech && this.echoOf.has(e)) continue;
      this.echoOf.set(e, this.lastTech);
      const base = ENEMY_DEFS.echoConstruct;
      if (!this.lastTech) { e.def = base; continue; }
      const echo = ECHO_FOR[this.lastTech];
      e.def = { ...base, attacks: [...base.attacks.filter((a) => a.move !== 'echo_mirror'), { move: echo.move, range: echo.range, angle: echo.move === 'echo_ward' ? 3.2 : 0.5, weight: 3.5, cooldown: echo.cooldown }] };
    }
  }

  // ---------------------------------------------------------------- the lift

  private startLift(target: number) {
    if (this.liftMoving) return;
    this.liftTarget = target;
    this.liftMoving = true;
    this.game.sfx('chain_rattle', { pos: this._v.set(0, this.L.lift.y0 + (this.L.lift.y1 - this.L.lift.y0) * this.liftT, 13) });
  }

  private stepLift(dt: number) {
    const Lf = this.L.lift, piece = this.P('lift');
    const yOf = (t: number) => Lf.y0 + (Lf.y1 - Lf.y0) * t;
    const yBefore = yOf(this.liftT);
    if (this.liftMoving) {
      const dur = 6.5;
      const dir = Math.sign(this.liftTarget - this.liftT);
      this.liftT = Math.min(1, Math.max(0, this.liftT + (dir * dt) / dur));
      piece.set(this.liftT);
      const p = this.player;
      const on = p.pos.x > Lf.x0 + 0.05 && p.pos.x < Lf.x1 - 0.05 && p.pos.z > Lf.z0 + 0.05 && p.pos.z < Lf.z1 - 0.05 && Math.abs(p.pos.y - yBefore) < 0.9;
      if (on) { p.pos.y = yOf(this.liftT) + 0.01; p.vy = 0; p.fallStartY = p.pos.y; }
      if ((dir > 0 && this.liftT >= this.liftTarget) || (dir < 0 && this.liftT <= this.liftTarget) || dir === 0) {
        this.liftMoving = false;
        this.game.sfx('drawbridge_slam', { pos: this._v.set(0, yOf(this.liftT), 13), volume: 0.6 });
        this.setFlag(F.liftUp, this.liftT > 0.5);
      }
      if (Math.floor(this.time * 1.2) !== Math.floor((this.time - dt) * 1.2)) this.game.sfx('chain_rattle', { pos: this._v.set(0, yOf(this.liftT), 13), volume: 0.5 });
    }
    this.liftLeverPos.set((Lf.x0 + Lf.x1) / 2 + 1.0, yOf(this.liftT), (Lf.z0 + Lf.z1) / 2);
  }

  // ---------------------------------------------------------------- the scholar's cage

  private dockCage() {
    if (this.cageMoving || this.flag(F.cageDocked)) return;
    this.cageMoving = true;
    this.game.sfx('chain_rattle', { pos: this.A('winch').pos });
    this.tween(this.P('cage'), this.cageT, 1, 5.5, () => {
      this.cageMoving = false; this.cageT = 1;
      this.setFlag(F.cageDocked);
      this.game.sfx('drawbridge_slam', { pos: this.A('cageDocked').pos, volume: 0.5 });
      this.record('academy_scholar', 'obs_cage');
      this.session.save();
      void this.talk('wick_cage');
    });
  }

  private async freeWick() {
    const cage = this.P('cage') as unknown as { door: THREE.Object3D };
    this.game.sfx('door_open', { pos: this.A('cageDocked').pos });
    let t = 0;
    const id = setInterval(() => { t += 0.05; cage.door.rotation.y = -1.6 * Math.min(1, t / 0.8); if (t > 0.8) clearInterval(id); }, 50);
    await this.talk('wick_freed');
    this.ws.npcs.wick = 'rescued';
    this.record('academy_scholar', 'mem_wick');
    this.record('academy_scholar', 'conf_rescued');
    this.setFlag(F.wickBoard);
    this.P('wickBoard').set(1);
    const n = this.npcs.get('wick');
    if (n) this.game.fx('bellMotes', n.chest, { count: 60, speed: 1.2 });
    this.removeNpc('wick');
    this.session.save();
  }

  private loseWick() {
    this.ws.npcs.wick = 'taken';
    this.record('academy_scholar', 'mem_wick');
    this.record('academy_scholar', 'conf_taken');
    this.removeNpc('wick');
    const cage = this.P('cage') as unknown as { door: THREE.Object3D; set(t: number): void };
    cage.set(0); this.cageT = 0;
    cage.door.rotation.y = -1.6;
    this.setFlag(F.cageDocked, false);
    this.session.save();
  }

  // ---------------------------------------------------------------- Corporal Fenn

  private async talkFenn() {
    if (!this.flag(F.fennMet)) {
      await this.talk('fenn_first');
      this.setFlag(F.fennMet);
      this.record('muster_academy', 'obs_fenn');
      this.session.save();
      return;
    }
    if (!this.flag(F.muster) && this.pd.inventory.register_leaf) {
      await this.talk('fenn_leaf');
      this.setFlag(F.muster);
      this.record('muster_academy', 'conf_fenn');
      this.session.save();
      return;
    }
    const pool = DIALOGUE.fenn_idle ?? [];
    if (pool.length) await this.dialogue([pool[Math.floor(Math.random() * pool.length)]]);
  }

  // ================================================================== arenas

  protected override arenaWarning(a: ArenaLayout) {
    if (a.bossId === 'orrow') return this.wick === 'imprisoned' ? 'orrowWithScholar' : 'orrowPlain';
    return '';
  }
  protected override beforeArena(a: ArenaLayout) {
    if (a.bossId === 'orrow' && this.wick === 'imprisoned') this.loseWick();
    if (a.bossId === 'orrow') {
      this.floor.active = true;
      this.floor.nextAt = this.time + 4;
      this.floor.pending = -1;
      if (!this.floor.seen) { this.floor.seen = true; }
    }
  }

  protected override onBossPhase(id: string, phase: number, b: Boss) {
    if (id !== 'orrow') return;
    b.def = { ...b.spec.def, attacks: ORROW_ATTACKS[phase] ?? ORROW_ATTACKS[3] };
    if (phase === 2) {
      const m = this.game.deps.models;
      b.rig.sockets.weaponR.clear();
      const w = m ? m.buildWeapon('orrow_glass_blade') : { object: new THREE.Group(), hit: { from: 0.14, to: 1.18, radius: 0.05 } };
      b.weaponR = { id: 'orrow_glass_blade', model: w };
      b.rig.sockets.weaponR.add(w.object);
      w.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
      b.setStance({ handR: BLADE_REST, handL: null, chest: [2, -8, 0], spine: [0, -2, 0], hips: [0, -4, 0], head: [0, 6, 0] });
    }
    this.floor.nextAt = Math.min(this.floor.nextAt, this.time + 3);
  }

  protected override async onBossDefeated(id: string) {
    if (id === 'experiment9' && !this.flag(F.x9Reward)) {
      this.setFlag(F.x9Reward);
      this.session.grantItem('grimoire_falling_hour');
      setTimeout(() => this.session.grantItem('bellbronze_scrap', 2), 800);
      this.subtitle('It was a student once. The jars held what the Academy took out of it.', 'The Returned', 5);
    }
    if (id === 'orrow') {
      this.record('academy_keeper', 'conf_orrow');
      this.resetFloor();
      this.clearFx();
      this.game.sfx('great_bell_toll', { pos: this.L.greatBell.position, volume: 1.2 });
      setTimeout(() => this.subtitle('The Academy\'s bell is silent. Whatever it kept, it keeps no longer.', 'The Returned', 5), 3000);
    }
  }

  override onPlayerDeath() {
    super.onPlayerDeath();
    this.resetFloor();
  }

  // ================================================================== the lens floor

  private resetFloor() {
    this.floor.active = false;
    this.floor.pending = -1;
    for (const s of this.floor.states) { s.s = 0; s.t = 0; }
    const f = this.L.lensFloor;
    f.plates.forEach((_, i) => f.setState(i, 0, 0, this.time));
    for (const m of this.marks) { m.mesh.removeFromParent(); m.pillar.removeFromParent(); }
    this.marks = [];
  }

  private orrowBoss() { return this.bosses.get('orrow'); }

  private startFloorPattern() {
    const f = this.L.lensFloor, b = this.orrowBoss();
    if (!b || !this.fight || this.fight.arena.bossId !== 'orrow') return;
    if (this.floor.states.some((s) => s.s !== 0)) { this.floor.pending = -1; return; }
    const phase = b.phase;
    const warn = phase === 1 ? 2.4 : phase === 2 ? 1.9 : 1.65;
    const n = f.plates.length;
    const unsafe = new Set<number>();
    const kind = this.rngPick(phase === 1 ? ['halves', 'rings', 'spokes'] : phase === 2 ? ['halves', 'spokes', 'target', 'rings'] : ['target', 'spokes', 'halves', 'crescent']);
    const pPlate = f.plateAt(this.player.pos);
    const rot = Math.random() * Math.PI * 2;
    for (const pl of f.plates) {
      const am = (pl.a0 + pl.a1) / 2;
      switch (kind) {
        case 'halves': if (pl.ring > 0 && Math.cos(am - rot) > 0.05) unsafe.add(pl.index); break;
        case 'rings': if ((phase === 1 ? pl.ring === 2 : pl.ring !== 1)) unsafe.add(pl.index); break;
        case 'spokes': if (pl.ring === 2 ? pl.index % 2 === 0 : pl.ring === 1 ? pl.index % 2 === 1 : false) unsafe.add(pl.index); break;
        case 'target': if (pl.centre.distanceTo(this.player.pos) < 6.5) unsafe.add(pl.index); break;
        case 'crescent': if (pl.ring > 0 && Math.cos(am - rot) > -0.35) unsafe.add(pl.index); break;
      }
    }
    // Safety: a connected safe set with ≥ 30 % of the floor, reachable from the Returned's plate.
    this.makeSafe(unsafe, pPlate, Math.ceil(n * 0.3));
    for (const i of unsafe) { const s = this.floor.states[i]; s.s = 1; s.t = 0; s.warn = warn; }
    this.floor.pending = -1;
    this.floor.nextAt = this.time + warn + 2 + (phase === 1 ? 7.5 : phase === 2 ? 5 : 3.5);
    this.game.sfx('great_bell_toll', { pos: f.centre, volume: 0.35 });
    if (!this.flag('academy.lensSeen')) { this.setFlag('academy.lensSeen'); this.record('academy_keeper', 'obs_lens_floor'); }
    this.game.hint('academy_lens');
  }

  private rngPick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

  /** Ensure the safe plates form one connected group of at least `min` plates, touching the player's plate. */
  private makeSafe(unsafe: Set<number>, playerPlate: number, min: number) {
    const f = this.L.lensFloor;
    const safe = () => f.plates.filter((p) => !unsafe.has(p.index)).map((p) => p.index);
    // the player's plate or one of its neighbours must stay safe
    if (playerPlate >= 0) {
      const opts = [playerPlate, ...f.plates[playerPlate].neighbours];
      if (opts.every((i) => unsafe.has(i))) unsafe.delete(opts[1 + Math.floor(Math.random() * (opts.length - 1))] ?? playerPlate);
    }
    for (let guard = 0; guard < 40; guard++) {
      const s = safe();
      if (!s.length) { unsafe.delete(0); continue; }
      // connected components of safe plates
      const seen = new Set<number>();
      const comps: number[][] = [];
      for (const i of s) {
        if (seen.has(i)) continue;
        const comp: number[] = [];
        const stack = [i];
        seen.add(i);
        while (stack.length) { const c = stack.pop()!; comp.push(c); for (const nb of f.plates[c].neighbours) if (!unsafe.has(nb) && !seen.has(nb)) { seen.add(nb); stack.push(nb); } }
        comps.push(comp);
      }
      const near = playerPlate >= 0 ? new Set([playerPlate, ...f.plates[playerPlate].neighbours]) : null;
      const main = comps.find((c) => !near || c.some((i) => near.has(i))) ?? comps[0];
      if (comps.length === 1 && main.length >= min) return;
      // bridge: free the unsafe neighbour of the main component that touches another safe plate (or any)
      let freed = false;
      for (const i of main) {
        for (const nb of f.plates[i].neighbours) {
          if (!unsafe.has(nb)) continue;
          if (comps.length > 1 ? f.plates[nb].neighbours.some((x) => !unsafe.has(x) && !main.includes(x)) : true) { unsafe.delete(nb); freed = true; break; }
        }
        if (freed) break;
      }
      if (!freed) unsafe.delete([...unsafe][0]);
    }
  }

  private stepFloor(dt: number) {
    const f = this.L.lensFloor, b = this.orrowBoss();
    if (!this.floor.active || !b || !this.fight || this.fight.arena.bossId !== 'orrow') { if (this.floor.active && !this.fight) this.resetFloor(); return; }
    const phase = b.phase;
    const busy = this.floor.states.some((s) => s.s !== 0);
    // time for a re-alignment: she raises her staff if she is free; otherwise the lenses turn on their own
    if (!busy && this.floor.pending < 0 && this.time >= this.floor.nextAt) {
      if (!b.move && !b.dead && MOVES.orrow_realign) { b.startMove(MOVES.orrow_realign); this.floor.pending = this.time + 2.4; }
      else this.floor.pending = this.time + 1.2;
    }
    if (this.floor.pending >= 0 && this.time >= this.floor.pending) this.startFloorPattern();
    // plate lifecycle
    const pPlate = f.plateAt(this.player.pos);
    this.floor.tickT -= dt;
    let burnHere = false;
    this.floor.states.forEach((s, i) => {
      if (s.s === 0) return;
      s.t += dt;
      if (s.s === 1 && s.t >= s.warn) { s.s = 2; s.t = 0; this.game.sfx('fire_burst', { pos: f.plates[i].centre, volume: 0.35 }); }
      else if (s.s === 2 && s.t >= 1.2) { s.s = 3; s.t = 0; }
      else if (s.s === 3 && s.t >= 0.8) { s.s = 0; s.t = 0; }
      if (s.s === 2 && i === pPlate) burnHere = true;
      f.setState(i, s.s, s.s === 1 ? Math.min(1, s.t / s.warn) : s.s === 3 ? Math.min(1, s.t / 0.8) : 0, this.time);
    });
    if (burnHere && this.floor.tickT <= 0 && !this.player.dead) {
      this.floor.tickT = 0.33;
      const r = this.game.combat.resolveWith(b as Combatant, this.player as unknown as Combatant, magicSpec(30, 0.5), FLOOR_MOVE, this.player.chest, { physical: 0, magic: phase === 3 ? 125 : 105, fire: 0 }, 0);
      if (r.outcome !== 'dodged') this.game.fx('sparks', this.player.pos.clone().setY(this.player.pos.y + 0.3), { count: 12, color: 0xfff0c8 });
    }
  }

  // ---------------------------------------------------------------- the Falling Hour (Orrow, phase 3)

  private hourMark(e: Enemy) {
    const p = this.player.pos.clone();
    const mesh = new THREE.Mesh(MARK_GEO(), addMat('hourMark', 0xfff0c8, 0.8).clone());
    mesh.position.copy(p).setY(p.y + 0.12);
    mesh.renderOrder = 7;
    const pillar = new THREE.Mesh(PILLAR_GEO(), addMat('hourPillar', 0xfff4dc, 0.7).clone());
    pillar.position.copy(p);
    pillar.visible = false;
    this.fxRoot.add(mesh, pillar);
    this.marks.push({ pos: p, t: 0, mesh, pillar, owner: e, done: false });
    this.game.sfx('unparryable_tell', { pos: p });
  }

  private stepMarks(dt: number) {
    for (const m of this.marks) {
      m.t += dt;
      const k = Math.min(1, m.t / 1.5);
      m.mesh.scale.setScalar(2.4 - k * 0.3);
      m.mesh.rotation.y += dt * (1 + k * 4);
      (m.mesh.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.4 * Math.sin(m.t * (6 + k * 18));
      if (!m.done && m.t >= 1.5) {
        m.done = true;
        m.pillar.visible = true;
        this.game.sfx('great_bell_toll', { pos: m.pos, volume: 0.6 });
        this.game.shake(0.35);
        this.game.fx('shatter', m.pos.clone().setY(m.pos.y + 0.5), { count: 40 });
        const p = this.player;
        if (!p.dead && Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 2.3 && Math.abs(p.pos.y - m.pos.y) < 2) {
          this.game.combat.resolveWith(m.owner as Combatant, p as unknown as Combatant, magicSpec(90, 4), BEAM_MOVE, p.chest, { physical: 0, magic: 260, fire: 0 }, 40);
        }
      }
      if (m.done) { m.pillar.scale.set(1, Math.max(0.01, 1 - (m.t - 1.5) * 2.2), 1); m.mesh.visible = m.t < 1.7; }
    }
    this.marks = this.marks.filter((m) => { const keep = m.t < 2.1; if (!keep) { m.mesh.removeFromParent(); m.pillar.removeFromParent(); } return keep; });
  }

  private clearFx() {
    for (const b of this.beams) b.mesh.removeFromParent();
    this.beams = [];
    for (const w of this.wards.values()) { w.bubble.removeFromParent(); w.link?.removeFromParent(); }
    this.wards.clear();
  }

  // ================================================================== per step

  protected override stepRegion(dt: number) {
    this.stepLift(dt);
    this.stepBeams(dt);
    this.stepWards();
    this.stepEcho();
    this.stepFloor(dt);
    this.stepMarks(dt);
    // the scholar rides the cage
    if (this.cageMoving && this.wick === 'imprisoned') {
      const cage = this.P('cage') as unknown as { pos(t: number): THREE.Vector3 };
      this.cageT = Math.min(1, this.cageT + dt / 5.5);
      const n = this.npcs.get('wick');
      if (n) { const p = cage.pos(this.cageT); n.pos.copy(p).setY(p.y + 0.16); n.prevPos.copy(n.pos); }
    }
  }

  protected override objective(): THREE.Vector3 | null {
    if (this.wick === 'imprisoned') {
      if (!this.flag(F.notesA) && !this.session.journalSys.has('obs_cage')) return this.A('wickNotesA').pos;
      return this.flag(F.cageDocked) ? this.A('cageSpeak').pos : this.A('winch').pos;
    }
    if (this.flag(F.fennMet) && !this.flag(F.muster)) return this.pd.inventory.register_leaf ? this.A('fenn').pos : this.A('register').pos;
    if (!this.flag('boss.orrow')) return this.L.arenas.find((a) => a.bossId === 'orrow')!.fogGate.anchor.pos;
    return null;
  }

  override titleCamera(t: number, cam: THREE.PerspectiveCamera) {
    const a = -0.25 + Math.sin(t * 0.04) * 0.2;
    cam.position.set(Math.sin(a) * 10, 6, 78 + Math.cos(a) * 4);
    cam.lookAt(-6, 30, -40);
  }
}

// ====================================================================== shared fx geometry & helpers

const lazy = <T>(f: () => T) => { let v: T | null = null; return () => (v ??= f()); };
const SHARD_GEO = lazy(() => new THREE.OctahedronGeometry(0.12, 0).scale(0.55, 0.55, 2.2));
const SHARD_MAT = lazy(() => new THREE.MeshStandardMaterial({ color: 0xd8e8f0, emissive: 0xbfe0ff, emissiveIntensity: 1.4, metalness: 0.1, roughness: 0.05 }));
const BEAM_GEO = lazy(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5));
const LINK_GEO = lazy(() => new THREE.CylinderGeometry(0.018, 0.018, 1, 4, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5));
const WARD_GEO = lazy(() => new THREE.IcosahedronGeometry(1, 2));
const MARK_GEO = lazy(() => {
  const parts: THREE.BufferGeometry[] = [];
  for (let q = 0; q < 6; q++) parts.push(new THREE.RingGeometry(0.82, 1, 12, 1, (q / 6) * Math.PI * 2 + 0.1, Math.PI / 3 - 0.2).rotateX(-Math.PI / 2).toNonIndexed());
  parts.push(new THREE.RingGeometry(0.3, 0.38, 4, 1).rotateX(-Math.PI / 2).toNonIndexed());
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3); let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array as Float32Array, o); o += p.attributes.position.array.length; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
});
const PILLAR_GEO = lazy(() => new THREE.CylinderGeometry(2.2, 2.2, 16, 20, 1, true).translate(0, 8, 0));
const NO_CHANT = (() => { const cache = new WeakMap<EnemyDef, EnemyDef>(); return (d: EnemyDef) => { let v = cache.get(d); if (!v) { v = { ...d, attacks: d.attacks.filter((a) => a.move !== 'choir_chant'), keepDistance: undefined }; cache.set(d, v); } return v; }; })();
