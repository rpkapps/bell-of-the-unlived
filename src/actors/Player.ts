/**
 * The Returned: input → moves, resources, flasks, spells, techniques, criticals.
 * The arsenal (per-class movesets, techniques, spell casts, bows/crossbows) is defined in
 * src/combat/movesets.ts; this class selects from it and implements the effects.
 */
import * as THREE from 'three';
import { Actor, type Team } from './Actor';
import type { Combatant, DamagePacket, HitResult } from '../combat/Combat';
import type { HitSpec, MoveDef, MoveEvent } from '../combat/types';
import type { MoveInstance } from './Actor';
import { MOVES } from '../combat/moves';
import { applyDefense, attackRating, DODGE, spellPower } from '../combat/stats';
import type { IInput } from '../input/actions';
import type { Services } from '../game/services';
import {
  activeQuick, activeSpell, derive, item, leftId, quickIds, rightId, spellIds, techniqueFor,
  type Derived, type PlayerData,
} from '../systems/PlayerData';
import { STANCES, SHIELD_REST, DIRK_REST } from './anim/clips/stances';
import { CLIPS } from './anim/clips';
import type { Clip } from './anim/Clip';
import { angleDiff, approachAngle, clamp, segmentSegmentDistSq, wrapAngle, yawOf } from '../core/math';
import type { SpellDef, WeaponClass } from '../game/types';
import { SPELLS } from '../content/spells';
import { BOW_AMMO, ITEMS } from '../content/items';
import { castMoveFor, movesetFor, resolveMove, SPIN, TECH_CHARGE, techniqueMoveFor, type Moveset } from '../combat/movesets';

type Buffered = 'light' | 'heavy' | 'dodge' | 'parry' | 'technique' | 'useItem';
export type CritKind = 'backstab' | 'riposte' | 'guardBreak' | 'postureBreak';

export interface PlayerControl {
  input: IInput;
  /** Camera yaw (radians, 0 = looking toward +Z). */
  camYaw: number;
  /** Camera forward (world, normalised) for free aim. */
  camForward: THREE.Vector3;
  lock: Combatant | null;
  /** Gameplay input blocked (menus, dialogue). */
  blocked: boolean;
}

const RUN = 4.3, WALK = 1.7, SPRINT = 6.3, GUARD_WALK = 1.9;
const BUFFER = 0.3;
/** Poise value marking a Pinning Shot projectile (read back in onDealtHit). */
const PIN_POISE = 241;
const PIN_SECONDS = 2.0;

export class Player extends Actor implements Combatant {
  readonly team: Team = 'player';
  data: PlayerData;
  derived!: Derived;
  private buffered: { a: Buffered; t: number } | null = null;
  private dodgeHeld = 0;
  private dodgeWasDown = false;
  sprinting = false;
  private walkToggle = false;
  private guardToggle = false;
  private heavyHeldT = 0;
  private charging = false;
  private chargeReleaseQueued = false;
  /** Current eligible critical (for the HUD marker and the attack input). */
  crit: { target: Combatant; kind: CritKind } | null = null;
  /** Set by the controller; consumed by the interaction system. */
  interactPressed = false;
  /** Heal-over-time remaining (hp) and rate. */
  private healPool = 0;
  onDeath: () => void = () => {};
  onEquipChanged: () => void = () => {};
  onStatsChanged: () => void = () => {};
  /** Last known hostile actor list for crit checks. */
  private lastCtl: PlayerControl | null = null;
  /** Over-the-shoulder aim (bow/crossbow + guard held). Read by CameraRig each frame. */
  aiming = false;
  /** Crossbow: a bolt is seated (cleared on firing, set by the reload event). */
  xbowLoaded = true;
  /** Stilled Breath: empowered shots left. */
  stilledShots = 0;
  /** What the current charge releases into (heavy attacks, bow draws, Grave Knell). */
  private chargeSpec: { chargeId: string; release: string; input: 'heavy' | 'technique'; max: number } | null = null;
  /** Falling Hour marks waiting for their bell. */
  private fallingHours: { pos: THREE.Vector3; t: number; power: number; fxT: number }[] = [];
  /** Pinning Shot roots (Enemy has no root status yet: the anchor is re-applied after physics). */
  private pinned: { a: Actor; x: number; z: number; t: number }[] = [];

  constructor(private svc: Services, data: PlayerData) {
    super({ height: 1, bulk: 1, shoulder: 1 });
    this.name = 'The Returned';
    // a raised guard covers the whole front half (circling foes should not slip past it)
    this.guardArc = Math.PI * 0.5;
    this.data = data;
    this.refresh();
    this.hp = Math.min(data.hp || this.hpMax, this.hpMax);
    this.focus = Math.min(data.focus ?? this.focusMax, this.focusMax);
    this.stamina = this.staminaMax;
  }

  // ------------------------------------------------------------------ equipment / stats

  get rightDef() { return item(rightId(this.data)); }
  get leftDef() { return item(leftId(this.data)); }
  get catalyst() { const r = this.rightDef; return r?.weapon?.casts ? r : null; }
  /** The right-hand weapon class's moveset (fists when empty). */
  get moveset(): Moveset { return movesetFor(this.rightDef?.weapon?.class ?? null); }
  /** Two-handed class with the off-hand busy (shield / off-hand weapon) → one-handed twins. */
  get oneHanded() { return !!(this.moveset.twoHanded && this.leftDef); }
  /** Move id → definition for the current grip. */
  private mv(id: string): MoveDef { return resolveMove(id, this.oneHanded); }

  /** Recompute derived stats & stance after any attribute/equipment change. */
  refresh() {
    const d = (this.derived = derive(this.data));
    const hpRatio = this.hpMax > 0 ? this.hp / this.hpMax : 1;
    this.hpMax = d.hpMax; this.focusMax = d.focusMax; this.staminaMax = d.staminaMax;
    if (this.hp > this.hpMax || hpRatio === 1) this.hp = Math.min(this.hp || this.hpMax, this.hpMax);
    this.focus = Math.min(this.focus, this.focusMax);
    this.poise = d.poise;
    this.staminaRegen = 45;
    if (this.data.equipment.talisman0 === 'warden_talisman' || this.data.equipment.talisman1 === 'warden_talisman') this.staminaRegen *= 1.15;
    this.updateStance();
    this.onStatsChanged();
  }

  updateStance() {
    const r = this.rightDef, l = this.leftDef;
    const base = STANCES[this.moveset.stance] ?? STANCES.sword;
    const handR = r ? base.handR : null;
    const handL = l ? (l.kind === 'shield' ? SHIELD_REST : DIRK_REST) : base.handL;
    this.setStance({ ...base, handR, handL });
  }

  // ------------------------------------------------------------------ control (per sim step)

  control(dt: number, c: PlayerControl) {
    this.lastCtl = c;
    const inp = c.input;
    const s = this.svc.settings.accessibility.holdToggle;
    if (this.dead) { this.wish.set(0, 0, 0); this.aiming = false; return; }
    if (c.blocked) { this.wish.set(0, 0, 0); this.guarding = false; this.aiming = false; this.anim.setOverlay(null, 0); this.sprinting = false; return; }

    // --- buffer presses
    const press = (a: Buffered, action: Parameters<IInput['pressed']>[0]) => { if (inp.pressed(action)) this.buffered = { a, t: this.svc.time }; };
    press('light', 'light'); press('parry', 'parry'); press('technique', 'technique'); press('useItem', 'useItem');
    if (inp.pressed('interact')) this.interactPressed = true;
    // heavy: press starts a charge
    if (inp.pressed('heavy')) this.buffered = { a: 'heavy', t: this.svc.time };
    // dodge: tap (release < 0.25 s) = dodge, hold = sprint
    const dDown = inp.down('dodge');
    if (dDown) this.dodgeHeld += dt;
    if (this.dodgeWasDown && !dDown && this.dodgeHeld < 0.25) this.buffered = { a: 'dodge', t: this.svc.time };
    if (!dDown) this.dodgeHeld = 0;
    this.dodgeWasDown = dDown;
    if (this.buffered && this.svc.time - this.buffered.t > BUFFER) this.buffered = null;

    // cycles
    if (inp.pressed('cycleSpell')) { this.data.activeSpell = (this.data.activeSpell + 1) % Math.max(1, spellIds(this.data).length); this.svc.sfx('ui_move'); }
    if (inp.pressed('cycleItem')) { this.data.activeQuick = (this.data.activeQuick + 1) % Math.max(1, quickIds(this.data).length); this.svc.sfx('ui_move'); }
    if (inp.pressed('cycleRight') && !this.move) { this.data.activeRight = this.data.activeRight ? 0 : 1; if (!this.data.equipment[this.data.activeRight ? 'right1' : 'right0']) this.data.activeRight = 0; this.refresh(); this.onEquipChanged(); }
    if (inp.pressed('cycleLeft') && !this.move) { this.data.activeLeft = this.data.activeLeft ? 0 : 1; if (!this.data.equipment[this.data.activeLeft ? 'left1' : 'left0']) this.data.activeLeft = 0; this.refresh(); this.onEquipChanged(); }
    if (inp.pressed('walk')) this.walkToggle = !this.walkToggle;

    // --- movement intent (camera-relative)
    const mv = inp.move();
    const mag = Math.min(1, Math.hypot(mv.x, mv.y));
    const cy = c.camYaw;
    // camera forward on XZ: (sin cy, cos cy); camera right: (-cos cy, sin cy)
    const wx = Math.sin(cy) * mv.y - Math.cos(cy) * mv.x;
    const wz = Math.cos(cy) * mv.y + Math.sin(cy) * mv.x;
    const hasMove = mag > 0.12;
    const walking = s.walk === 'toggle' ? this.walkToggle : inp.down('walk');

    // --- guard (hold / toggle)
    if (s.guard === 'toggle') { if (inp.pressed('guard')) this.guardToggle = !this.guardToggle; } else this.guardToggle = inp.down('guard');
    const ms = this.moveset;
    // Bows & crossbows: the guard input aims (over-the-shoulder; CameraRig reads `aiming`).
    this.aiming = !!ms.ranged && this.guardToggle;
    const wantGuard = this.guardToggle && !!(this.leftDef || this.rightDef) && !ms.ranged;

    // --- sprint
    const sprintHeld = s.sprint === 'toggle' ? (this.sprinting ? hasMove : this.dodgeHeld > 0.25) : this.dodgeHeld > 0.25;
    this.sprinting = sprintHeld && hasMove && this.stamina > 0 && !this.move && !wantGuard && !this.aiming && this.derived.loadClass !== 'overloaded';
    if (this.sprinting) { this.stamina -= 9 * dt; this.staminaDelay = 0.4; }

    // --- charge (heavy attacks, bow draws; Grave Knell charges on the technique input)
    if (this.charging) {
      this.heavyHeldT += dt;
      const spec = this.chargeSpec;
      const input = spec?.input ?? 'heavy';
      const toggle = s.chargeHeavy === 'toggle' && input === 'heavy';
      const held = toggle ? !this.chargeReleaseQueued : inp.down(input);
      if (toggle && inp.pressed('heavy') && this.heavyHeldT > 0.05) this.chargeReleaseQueued = true;
      const t = this.move?.t ?? 0;
      if (!this.move || !spec || this.move.def.id !== spec.chargeId) this.charging = false;
      else if ((!held && t >= 0.28) || t >= spec.max) this.releaseHeavy();
    }
    // --- held techniques: leaving Riposte Stance early
    {
      const m = this.move;
      if (m && m.def.id.startsWith('tech_riposte_stance') && m.t > 0.35 && !inp.down('technique')) this.startMove(MOVES.tech_riposte_release, { fade: 0.1 });
    }
    // --- root spins (Rending Sweep, Unbroken Links): the whole body turns so the blade sweeps a circle.
    // Integrated on move time (this step advances it by dt unless hit-stopped) so the total is exact.
    {
      const m = this.move;
      const sp = m ? SPIN[m.def.id] : undefined;
      if (m && sp && this.hitstop <= 0) {
        const want = sp[2] * clamp((Math.min(m.t + dt, sp[1]) - sp[0]) / (sp[1] - sp[0]), 0, 1);
        const done = (m.data.spun as number | undefined) ?? 0;
        if (want > done) { this.yaw = wrapAngle(this.yaw + want - done); m.data.spun = want; }
      }
    }

    // --- free state or cancellable: act on buffered input
    if (this.buffered) this.tryBuffered(c, hasMove, wx, wz, wantGuard);

    // --- locomotion
    const free = !this.move;
    this.guarding = (free && wantGuard) || !!this.move?.def.guard;
    this.anim.setOverlay(this.overlayClip(free, ms), 1, 14);
    const loadMul = DODGE[this.derived.loadClass].speedMult;
    let speed = (this.sprinting ? SPRINT : walking || this.derived.loadClass === 'overloaded' ? WALK : this.guarding || this.aiming ? GUARD_WALK : RUN * Math.min(1, mag * 1.15)) * loadMul;
    if (!hasMove) speed = 0;
    this.wish.set(hasMove ? (wx / Math.max(mag, 1e-3)) * speed * Math.min(1, mag * 1.4) : 0, 0, hasMove ? (wz / Math.max(mag, 1e-3)) * speed * Math.min(1, mag * 1.4) : 0);
    if (this.move) {
      // walking moves (drink, cast): keep wish for `walk` factor; facing handled by track
      if (this.aiming && !c.lock && this.move.def.walk !== undefined) this.yaw = approachAngle(this.yaw, c.camYaw, 12 * dt);
      else if (this.move.def.walk && hasMove) { const ty = yawOf(wx, wz); if (!c.lock) this.yaw = approachAngle(this.yaw, ty, 6 * dt); }
      return;
    }
    // facing
    if (this.aiming && !c.lock) {
      this.yaw = approachAngle(this.yaw, c.camYaw, 14 * dt);
    } else if (c.lock && !this.sprinting) {
      const ty = yawOf(c.lock.pos.x - this.pos.x, c.lock.pos.z - this.pos.z);
      this.yaw = approachAngle(this.yaw, ty, 10 * dt);
    } else if (hasMove) {
      this.yaw = approachAngle(this.yaw, yawOf(wx, wz), (this.sprinting ? 9 : 13) * dt);
    }
  }

  /** Upper-body overlay: guard (per class / shield) or the ranged aim hold. */
  private overlayClip(free: boolean, ms: Moveset): Clip | null {
    const m = this.move;
    if (this.aiming) return free ? CLIPS[ms.guardClip] ?? null : null;
    if (!this.guarding) return null;
    // Guard moves that attack (shield bash, spear guard-thrust) animate both hands themselves.
    if (!free && !(m?.def.guard && !m.def.hits)) return null;
    if (this.leftDef?.kind === 'shield') return ms.cls === 'spear' ? CLIPS.guardSpearShield : CLIPS.guard;
    if (ms.twoHanded && this.leftDef) return CLIPS.guardBlade;
    return CLIPS[ms.guardClip] ?? CLIPS.guardBlade;
  }

  private canAct(kind: 'chain' | 'dodge' | 'free') {
    if (!this.move) return true;
    if (this.move.def.id === 'rest') return false;
    return this.canCancel(kind) || this.canCancel('free');
  }

  private tryBuffered(c: PlayerControl, hasMove: boolean, wx: number, wz: number, wantGuard: boolean) {
    const b = this.buffered!;
    const ok = (k: 'chain' | 'dodge' | 'free') => this.canAct(k) && this.stamina > 0;
    switch (b.a) {
      case 'dodge': {
        if (!this.canAct('dodge') || this.stamina <= 0) return;
        this.charging = false;
        const prof = DODGE[this.derived.loadClass];
        if (!hasMove || this.derived.loadClass === 'overloaded') {
          this.startMove(MOVES.backstep);
        } else {
          this.yaw = yawOf(wx, wz);
          const def: MoveDef = { ...MOVES.roll, dur: prof.dur, iframes: prof.iframes, stamina: prof.stamina, speed: 0.72 / prof.dur, motion: [[prof.dur * 0.7, prof.distance], [prof.dur, prof.distance * 1.05]], cancel: { chain: prof.dur * 0.72, free: prof.dur * 0.84 } };
          this.startMove(def);
          this.svc.sfx('roll', { pos: this.pos, surface: this.groundSurface });
        }
        break;
      }
      case 'light': {
        if (!ok('chain')) return;
        if (this.crit && (!this.move || this.canCancel('free'))) { this.startCritical(); break; }
        if (this.catalyst) { this.castSpell(c); break; }
        const ms = this.moveset;
        if (ms.ranged) { if (!this.startShot(ms)) { this.buffered = null; return; } break; }
        // Spear + shield: thrust over the raised guard.
        if (ms.guardAttack && wantGuard && this.leftDef?.kind === 'shield') { this.startMove(this.mv(ms.guardAttack)); break; }
        const prev = this.move?.def;
        const base = (id: string) => id.replace(/_1h$/, '');
        const ownMoves = [...ms.light, ms.running, ms.rolling, ms.guardAttack];
        let id = ms.light[0];
        if (prev && this.move && prev.next && ownMoves.includes(base(prev.id)) && this.move.t >= (prev.cancel?.chain ?? 99)) id = base(prev.next);
        else if (prev?.id === 'roll' && ms.rolling) id = ms.rolling;
        else if (!prev && this.sprinting && ms.running) id = ms.running;
        this.startMove(this.mv(id));
        break;
      }
      case 'heavy': {
        if (!ok('chain')) return;
        if (this.crit && (!this.move || this.canCancel('free'))) { this.startCritical(); break; }
        const ms = this.moveset;
        if (ms.ranged) {
          if (this.ammoLeft() <= 0) { this.noAmmo(); this.buffered = null; return; }
          if (ms.ranged === 'crossbow' && !this.xbowLoaded) { this.startMove(MOVES.xbow_reload); break; }
        }
        this.beginCharge(this.mv(ms.heavyCharge), ms.heavyRelease, 'heavy', ms.ranged ? 1.55 : 1.05);
        break;
      }
      case 'parry': {
        if (!ok('free')) return;
        const l = this.leftDef;
        this.startMove(l?.kind === 'shield' ? MOVES.parry_shield : l ? MOVES.parry_hand : this.mv(this.moveset.parry));
        break;
      }
      case 'technique': {
        if (!ok('free')) return;
        const onShield = this.guardToggle && this.leftDef?.kind === 'shield';
        const rid = rightId(this.data), lid = leftId(this.data);
        let srcId = onShield ? lid : rid;
        let tech = techniqueFor(this.data, srcId);
        if (!tech) { srcId = lid; tech = techniqueFor(this.data, lid); }
        if (!tech) { this.buffered = null; return; }
        if (this.focus < tech.focus) { this.svc.sfx('ui_error'); this.svc.hint('focus'); this.buffered = null; return; }
        const src = item(srcId);
        const cls: WeaponClass | 'shield' | null = src?.kind === 'shield' ? 'shield' : src?.weapon?.class ?? null;
        const mv = techniqueMoveFor(tech.id, cls, { oneHanded: this.oneHanded, shield: this.leftDef?.kind === 'shield' });
        if (!mv) { this.buffered = null; return; }
        const def: MoveDef = { ...mv, focus: tech.focus, stamina: tech.stamina };
        if (tech.id === 'pinning_shot') {
          if (this.ammoLeft() <= 0) { this.noAmmo(); this.buffered = null; return; }
          if (this.moveset.ranged === 'crossbow' && !this.xbowLoaded) { this.startMove(MOVES.xbow_reload); break; }
        }
        const held = TECH_CHARGE[mv.id];
        if (held) this.beginCharge(def, held.release, 'technique', 1.3);
        else this.startMove(def);
        break;
      }
      case 'useItem': {
        if (!ok('free')) return;
        const q = activeQuick(this.data);
        if (!q) { this.buffered = null; return; }
        if (q === 'recall_flask' || q === 'recall_flask_focus') {
          const left = q === 'recall_flask' ? this.data.flask.leftHealth : this.data.flask.leftFocus;
          if (left <= 0) { this.svc.sfx('ui_error'); this.buffered = null; return; }
          this.startMove(MOVES.drink, { data: { flask: q } });
        } else if (q === 'throwing_knife') {
          if ((this.data.inventory.throwing_knife?.count ?? 0) <= 0) { this.svc.sfx('ui_error'); this.buffered = null; return; }
          this.startMove(MOVES.throw);
        } else { this.buffered = null; return; }
        break;
      }
    }
    this.buffered = null;
  }

  /** Start a held charge that `releaseHeavy` turns into `release` (with the charge level). */
  private beginCharge(def: MoveDef, release: string, input: 'heavy' | 'technique', max: number) {
    this.startMove(def);
    this.charging = true; this.heavyHeldT = 0; this.chargeReleaseQueued = false;
    this.chargeSpec = { chargeId: def.id, release, input, max };
  }

  private releaseHeavy() {
    const t = this.move?.t ?? 0;
    const charge = clamp((t - 0.3) / 0.7, 0, 1);
    this.charging = false;
    const spec = this.chargeSpec;
    this.chargeSpec = null;
    if (!spec) return;
    this.startMove(this.mv(spec.release), { charge, fade: 0.04 });
    if (charge >= 0.95) this.svc.sfx('charge_full', { pos: this.pos });
  }

  // ------------------------------------------------------------------ bows & crossbows

  /** Ammunition item for the right-hand bow / crossbow. */
  private ammoId(): string | null {
    const r = this.rightDef;
    if (!r?.weapon || (r.weapon.class !== 'bow' && r.weapon.class !== 'crossbow')) return null;
    return r.weapon.ammo ?? BOW_AMMO[r.id] ?? (r.weapon.class === 'crossbow' ? 'iron_bolt' : 'bone_arrow');
  }
  ammoLeft(): number { const a = this.ammoId(); return a ? this.data.inventory[a]?.count ?? 0 : 0; }
  private noAmmo() { this.svc.sfx('ui_error'); this.svc.hint('ammo'); }

  /** Light with a bow / crossbow: shoot (or reload an empty crossbow). */
  private startShot(ms: Moveset): boolean {
    if (this.ammoLeft() <= 0) { this.noAmmo(); return false; }
    if (ms.ranged === 'crossbow') { this.startMove(this.xbowLoaded ? MOVES.xbow_shoot : MOVES.xbow_reload); return true; }
    this.startMove(this.aiming ? MOVES.bow_shoot_aimed : MOVES.bow_shoot);
    return true;
  }

  /** Where a shot should fly: the lock target, else the point under the centre-screen reticle. */
  private aimDirection(origin: THREE.Vector3): THREE.Vector3 {
    const ctl = this.lastCtl;
    if (ctl?.lock && !ctl.lock.dead) return ctl.lock.chest.clone().sub(origin).normalize();
    if (!ctl) return this.forward;
    const f = ctl.camForward.clone().normalize();
    // The camera looks at its pivot (+ the shoulder offset while aiming), so that point is on the reticle ray.
    const look = new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
    if (this.aiming) {
      look.x += -Math.cos(ctl.camYaw) * 0.55 + Math.sin(ctl.camYaw) * 2;
      look.z += Math.sin(ctl.camYaw) * 0.55 + Math.cos(ctl.camYaw) * 2;
    }
    const hit = this.svc.world.raycast(look, f, 60);
    let dist = hit ? hit.distance : 40;
    for (const a of this.svc.actors()) {
      if (a.team === this.team || a.dead) continue;
      const v = a.chest.sub(look);
      const along = v.dot(f);
      if (along < 1 || along > dist) continue;
      if (v.addScaledVector(f, -along).length() < 0.6) dist = along;
    }
    return look.addScaledVector(f, dist).sub(origin).normalize();
  }

  /** Loose an arrow / bolt (the 'shoot' / 'pinShot' move events). */
  private fireShot(m: MoveInstance, pin: boolean) {
    const r = this.rightDef;
    const ammo = this.ammoId();
    if (!r?.weapon || !ammo) return;
    const inv = this.data.inventory[ammo];
    if (!inv || inv.count <= 0) { this.noAmmo(); return; }
    inv.count--;
    const xbow = r.weapon.class === 'crossbow';
    if (xbow) this.xbowLoaded = false;
    const ar = attackRating(r, this.data.inventory[r.id]?.upgrade ?? 0, this.data.attributes);
    const charge = m.charge;
    let mult = 1 + 0.6 * charge + (pin ? 0.1 : 0);
    let speed = xbow ? 62 : 44 + 16 * charge;
    if (this.stilledShots > 0) { this.stilledShots--; mult *= 1.4; speed *= 1.3; }
    const sock = this.rig.sockets.weaponR;
    const origin = xbow ? new THREE.Vector3(0, 0.45, -0.03).applyMatrix4(sock.matrixWorld) : new THREE.Vector3().setFromMatrixPosition(sock.matrixWorld);
    const dir = this.aimDirection(origin);
    if (!xbow) origin.addScaledVector(dir, 0.3);
    const ember = this.buffs.has('ember') ? ar.physical * 0.35 : 0;
    const postureBase = ar.total * 0.34 * (r.weapon.postureMult ?? 1);
    const lock = this.lastCtl?.lock;
    this.svc.spawnProjectile({
      kind: xbow ? 'bolt' : 'arrow', owner: this, pos: origin, vel: dir.clone().multiplyScalar(speed),
      gravity: xbow ? 2.5 : 4.5 - 2.5 * charge, radius: 0.06, life: 3,
      packet: { physical: ar.physical * mult, magic: ar.magic * mult, fire: (ar.fire + ember) * mult },
      posture: postureBase * (pin ? 4 : 1 + charge), poise: pin ? PIN_POISE : 16 + 24 * charge, damageKind: 'thrust',
      homing: lock && !lock.dead ? { target: lock, rate: 0.35 } : undefined,
    });
    this.svc.sfx('bow_release', { pos: this.pos });
  }

  /** Pinning Shot landed: root the target in place (bosses only stumble). */
  private pin(t: Combatant) {
    t.hitstop = Math.max(t.hitstop, 0.3);
    this.svc.fx('sparks', t.pos.clone().setY(t.pos.y + 0.4), { count: 16 });
    if ((t as unknown as { isBoss?: boolean }).isBoss) return;
    t.buffs.set('rooted', PIN_SECONDS);
    const cur = this.pinned.find((p) => p.a === t);
    if (cur) cur.t = PIN_SECONDS; else this.pinned.push({ a: t, x: t.pos.x, z: t.pos.z, t: PIN_SECONDS });
  }

  // ------------------------------------------------------------------ spells

  private castSpell(c: PlayerControl) {
    const sp = activeSpell(this.data);
    const cat = this.catalyst;
    if (!sp || !cat || cat.weapon?.casts !== sp.school) { this.svc.sfx('ui_error'); this.svc.hint('cast'); return; }
    if (this.focus < sp.focus) { this.svc.sfx('ui_error'); this.svc.hint('focus'); return; }
    // The cast animation follows the spell's archetype (quick / hurl / volley sweep / lance / sky / toll / ring / bless / channel).
    const mv = castMoveFor(sp);
    this.startMove({ ...mv, focus: sp.focus, stamina: sp.stamina }, { data: { spell: sp.id, n: 0 } });
    this.svc.sfx(sp.id === 'cinder_bolt' ? 'cast_cinder' : sp.school === 'rite' ? 'spell_heal' : 'cast_shard', { pos: this.pos });
    void c;
  }

  private fireSpell(sp: SpellDef, m: MoveInstance) {
    const cat = this.catalyst;
    const power = cat ? spellPower(cat, this.data.inventory[cat.id]?.upgrade ?? 0, this.data.attributes, sp.school) : 1;
    const sock = this.rig.sockets.weaponR;
    const origin = new THREE.Vector3(0, 1.3, 0).applyMatrix4(sock.matrixWorld);
    const ctl = this.lastCtl;
    const aim = new THREE.Vector3();
    if (ctl?.lock && !ctl.lock.dead) aim.copy(ctl.lock.chest).sub(origin).normalize();
    else if (ctl) {
      // free aim: along the camera ray, converging ~25 m ahead
      aim.copy(ctl.camForward);
      const far = new THREE.Vector3().copy(this.chest).addScaledVector(ctl.camForward, 25);
      aim.copy(far).sub(origin).normalize();
    } else aim.copy(this.forward);
    const homing = ctl?.lock ? { target: ctl.lock, rate: 1.4 } : undefined;
    const P = (kind: 'shard' | 'cinder' | 'knell', speed: number, dmg: { physical?: number; magic?: number; fire?: number }, extra: Partial<Parameters<Services['spawnProjectile']>[0]> = {}, dir = aim) =>
      this.svc.spawnProjectile({
        kind, owner: this, pos: origin.clone(), vel: dir.clone().multiplyScalar(speed), radius: kind === 'cinder' ? 0.22 : 0.12, life: 2.5,
        packet: { physical: (dmg.physical ?? 0) * power, magic: (dmg.magic ?? 0) * power, fire: (dmg.fire ?? 0) * power },
        posture: 18 * power, poise: 20, damageKind: dmg.fire ? 'fire' : 'magic', homing, ...extra,
      });
    switch (sp.id) {
      case 'glinting_shard': P('shard', 30, { magic: 110 }); break;
      case 'cinder_bolt': P('cinder', 17, { fire: 155 }, { burst: 1.8, status: { id: 'burn', seconds: 3, dps: 12 * power }, posture: 40 * power, poise: 45 }); break;
      case 'shard_volley': {
        // One shard per cast event as the staff sweeps right → left (see cast_volley).
        const n = (m.data.n as number) ?? 0;
        m.data.n = n + 1;
        const a = [-0.13, 0, 0.13][Math.min(n, 2)];
        P('shard', 28, { magic: 72 }, {}, aim.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a));
        break;
      }
      case 'bellglass_lance': this.fireLance(origin, aim, power); break;
      case 'knell_of_rest': P('knell', 22, { magic: 60, physical: 40 }, { damageKind: 'holy' }); break;
      case 'falling_hour': {
        const at = this.aimGround();
        this.fallingHours.push({ pos: at, t: 1.2, power, fxT: 0 });
        this.svc.fx('bellMotes', at.clone().setY(at.y + 0.1), { count: 36, speed: 2.5 });
        break;
      }
      case 'stilling_chime': this.healPool += this.hpMax * 0.35 * Math.max(1, power * 0.8); this.svc.fx('healMotes', this.chest); break;
      case 'ashen_veil': this.buffs.set('ward', 6); break;
      case 'ember_blessing': this.buffs.set('ember', 30); break;
      case 'vigil_of_ash': this.buffs.set('staminaRegen', 30); break;
      case 'toll_of_warding': {
        for (const a of this.svc.actors()) if (a.team !== this.team && !a.dead && a.distTo(this) < 3.2) {
          this.svc.combat.resolveWith(this, a as Combatant, { start: 0, end: 0, source: 'sphere', dmg: 0, posture: 0, poise: 60, kind: 'holy', knock: 5 }, MOVES.cast_channel, a.chest, { physical: 0, magic: 90 * power, fire: 0 }, 50 * power);
        }
        this.svc.fx('bellMotes', this.chest, { count: 60, speed: 6 });
        this.svc.fx('dust', this.pos.clone().setY(this.pos.y + 0.1), { count: 30, speed: 4 });
        break;
      }
    }
  }

  /**
   * Bellglass Lance: an instant piercing beam. Every foe whose hurt volumes cross the beam segment
   * (up to the first wall, 24 m) is struck once; the beam itself is drawn with particles.
   */
  private fireLance(origin: THREE.Vector3, aim: THREE.Vector3, power: number) {
    const dir = aim.clone().normalize();
    const wall = this.svc.world.raycast(origin, dir, 24);
    const len = wall ? wall.distance : 24;
    const end = origin.clone().addScaledVector(dir, len);
    const spec: HitSpec = { start: 0, end: 0, source: 'sphere', dmg: 0, posture: 0, poise: 70, kind: 'magic', knock: 2, unparryable: true };
    const c1 = new THREE.Vector3(), c2 = new THREE.Vector3();
    for (const a of this.svc.actors()) {
      if (a.team === this.team || a.dead) continue;
      let best = Infinity; const pt = new THREE.Vector3();
      for (const hv of a.hurt) {
        const d2 = segmentSegmentDistSq(origin, end, hv.a, hv.b, c1, c2);
        const rr = 0.28 + hv.r;
        if (d2 < rr * rr && d2 < best) { best = d2; pt.copy(c2); }
      }
      if (best < Infinity) this.svc.combat.resolveWith(this, a as Combatant, spec, MOVES.cast_lance, pt, { physical: 0, magic: 240 * power, fire: 0 }, 60 * power);
    }
    for (let d = 0.4; d < len; d += 0.5) this.svc.fx('shardTrail', origin.clone().addScaledVector(dir, d), { count: 3, color: 0xd8ecff, speed: 0.4 });
    this.svc.fx('sparks', end, { count: 24, color: 0xd8ecff, speed: 5 });
    this.svc.sfx('cast_shard', { pos: this.pos, volume: 1.4 });
    this.svc.shake(0.12);
  }

  /** Falling Hour target: the lock target's feet, else where the reticle ray meets the ground (≤ 18 m). */
  private aimGround(): THREE.Vector3 {
    const ctl = this.lastCtl;
    const lock = ctl?.lock;
    if (lock && !lock.dead) return lock.pos.clone();
    const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
    const f = ctl ? ctl.camForward.clone().normalize() : this.forward;
    const hit = this.svc.world.raycast(from, f, 18);
    const p = hit ? hit.point.clone() : from.clone().addScaledVector(f, 10);
    const g = this.svc.world.groundAt(p.x, p.y + 1.5, p.z, 30);
    if (g) p.y = g.y;
    return p;
  }

  /** The Falling Hour's bell lands. */
  private dropBell(h: { pos: THREE.Vector3; power: number }) {
    const spec: HitSpec = { start: 0, end: 0, source: 'sphere', dmg: 0, posture: 0, poise: 80, kind: 'magic', knock: 5, unparryable: true };
    for (const a of this.svc.actors()) {
      if (a.team === this.team || a.dead) continue;
      if (Math.hypot(a.pos.x - h.pos.x, a.pos.z - h.pos.z) < 2.4 + a.radius && Math.abs(a.pos.y - h.pos.y) < 2.5) {
        this.svc.combat.resolveWith(this, a as Combatant, spec, MOVES.cast_sky, a.chest, { physical: 0, magic: 200 * h.power, fire: 0 }, 80 * h.power);
      }
    }
    const p = h.pos.clone().setY(h.pos.y + 0.2);
    this.svc.fx('shatter', p, { count: 30, color: 0xe8e0c8 });
    this.svc.fx('dust', p, { count: 50, speed: 5 });
    this.svc.fx('bellMotes', p, { count: 40, speed: 6 });
    this.svc.sfx('great_bell_toll', { pos: h.pos, volume: 0.7, silentCaption: true });
    this.svc.sfx('hit_stone', { pos: h.pos, volume: 1.5 });
    this.svc.shake(0.35);
  }

  /** A point on the right-hand weapon (head / blade tip), for effects. */
  private weaponPoint(frac = 1): THREE.Vector3 {
    const w = this.weaponR?.model;
    const s = this.rig.sockets.weaponR;
    const y = w?.hit ? w.hit.from + (w.hit.to - w.hit.from) * frac : w?.castPoint?.y ?? 0.2;
    return new THREE.Vector3(0, y, 0).applyMatrix4(s.matrixWorld);
  }

  // ------------------------------------------------------------------ criticals

  /** Recompute the eligible critical each step (HUD marker + attack claim). */
  updateCrit(enemies: readonly Combatant[]) {
    this.crit = null;
    if (this.dead || (this.move && !this.canCancel('free') && !this.canCancel('chain'))) return;
    let best = Infinity;
    for (const e of enemies) {
      if (e.dead || !e.criticalable || e.team === this.team) continue;
      const d = this.distTo(e);
      if (d > 2.3) continue;
      const facing = Math.abs(this.angleTo(e.pos));
      if (facing > Math.PI / 3) continue;
      let kind: CritKind | null = null;
      const v = e.vulnerable;
      if (v === 'parried') kind = 'riposte';
      else if (v === 'guardBroken') kind = 'guardBreak';
      else if (v === 'postureBroken') kind = 'postureBreak';
      else if (e.backstabbable && d < 1.7) {
        const behind = Math.abs(angleDiff(e.yaw, yawOf(this.pos.x - e.pos.x, this.pos.z - e.pos.z)));
        const busy = e.move && e.move.def.hits?.some((h) => e.move!.t >= h.start - 0.1 && e.move!.t <= h.end);
        if (behind > Math.PI - 0.9 && !busy) kind = 'backstab';
      }
      if (kind && d < best) { best = d; this.crit = { target: e, kind }; }
    }
  }

  private startCritical() {
    const c = this.crit!;
    const e = c.target;
    this.crit = null;
    const kind = c.kind;
    const mine = kind === 'backstab' ? MOVES.crit_back : kind === 'postureBreak' ? MOVES.crit_down : MOVES.crit_front;
    // Align: face the victim; victim stands at a fixed offset.
    this.yaw = yawOf(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
    const off = kind === 'backstab' ? 0.78 : kind === 'postureBreak' ? 0.95 : 0.85;
    const f = this.forward;
    const target = new THREE.Vector3(this.pos.x + f.x * off, e.pos.y, this.pos.z + f.z * off);
    e.pos.copy(target);
    e.yaw = kind === 'backstab' ? this.yaw : this.yaw + Math.PI;
    e.hitstop = 0;
    this.startMove(mine, { data: { victim: e, kind } });
    (e as any).beginCriticalVictim?.(kind, this);
    this.svc.hint('criticalMarker');
  }

  // ------------------------------------------------------------------ move events

  protected override onMoveEvent(e: MoveEvent, m: MoveInstance) {
    switch (e.type) {
      case 'sfx': this.svc.sfx(e.cue, { pos: this.pos, volume: e.volume }); break;
      case 'trail': this.svc.trail(this, e.on); break;
      case 'shake': this.svc.shake(e.amount); break;
      case 'cast': { const sp = SPELLS[m.data.spell as string]; if (sp) this.fireSpell(sp, m); break; }
      case 'custom':
        if (e.id === 'shoot') this.fireShot(m, false);
        else if (e.id === 'pinShot') this.fireShot(m, true);
        else if (e.id === 'reload') this.xbowLoaded = true;
        break;
      case 'fx': {
        const tip = this.weaponPoint(0.9);
        if (e.kind === 'slam') {
          const g = tip.clone(); g.y = this.pos.y + 0.05;
          this.svc.fx('dust', g, { count: 40, speed: 4 });
          this.svc.fx('rubble', g, { count: 14 });
        } else if (e.kind === 'toll') this.svc.fx('bellMotes', tip, { count: 50, speed: 5 });
        else if (e.kind === 'embers') this.svc.fx('embers', tip, { count: 10, speed: 1.5 });
        break;
      }
      case 'drink': {
        const q = m.data.flask as string;
        if (q === 'recall_flask' && this.data.flask.leftHealth > 0) { this.data.flask.leftHealth--; this.healPool += this.hpMax * 0.45; this.svc.fx('healMotes', this.chest, { count: 40 }); }
        else if (q === 'recall_flask_focus' && this.data.flask.leftFocus > 0) { this.data.flask.leftFocus--; this.focus = Math.min(this.focusMax, this.focus + this.focusMax * 0.5); this.svc.fx('bellMotes', this.chest, { count: 30 }); }
        break;
      }
      case 'throw': {
        const inv = this.data.inventory.throwing_knife;
        if (!inv || inv.count <= 0) break;
        inv.count--;
        const origin = new THREE.Vector3().setFromMatrixPosition(this.rig.bones.handR.matrixWorld);
        const ctl = this.lastCtl;
        const dir = ctl?.lock ? ctl.lock.chest.clone().sub(origin).normalize() : ctl ? this.chest.clone().addScaledVector(ctl.camForward, 25).sub(origin).normalize() : this.forward;
        const dex = this.data.attributes.dexterity;
        this.svc.spawnProjectile({ kind: 'knife', owner: this, pos: origin, vel: dir.multiplyScalar(24), gravity: 3, radius: 0.08, life: 2, packet: { physical: 55 + dex * 2, magic: 0, fire: 0 }, posture: 12, poise: 15, damageKind: 'thrust' });
        this.svc.sfx('throw', { pos: this.pos });
        break;
      }
      case 'technique': {
        const id = m.def.id;
        if (id === 'tech_ward') { this.buffs.set('ward', 2.5); this.svc.fx('bellMotes', this.chest, { count: 40 }); }
        else if (id === 'tech_ember_edge') {
          this.buffs.set('ember', 20);
          for (const f of [0.2, 0.5, 0.8]) this.svc.fx('embers', this.weaponPoint(f), { count: 12, speed: 1.2 });
        } else if (id.startsWith('tech_stilled_breath')) {
          this.stilledShots = 3;
          this.buffs.set('stilledBreath', 30);
          this.svc.fx('bellMotes', this.chest, { count: 20, speed: 1 });
        }
        break;
      }
      case 'critHit': {
        const v = m.data.victim as Combatant | undefined;
        if (!v || v.dead) break;
        const r = this.rightDef;
        const ar = r?.weapon ? attackRating(r, this.data.inventory[r.id]?.upgrade ?? 0, this.data.attributes) : { physical: 60, magic: 0, fire: 0 };
        const mult = Math.max(r?.weapon?.criticalMult ?? 2.2, this.moveset.critMult ?? 0) * (m.data.kind === 'backstab' ? 1.0 : m.data.kind === 'riposte' ? 1.1 : 1.0);
        let dmg = v.defend({ physical: ar.physical * mult, magic: ar.magic * mult, fire: ar.fire * mult }, 'thrust');
        dmg = (v as any).capCriticalDamage ? (v as any).capCriticalDamage(dmg) : dmg;
        v.hp = Math.max(0, v.hp - dmg);
        v.recentDamage += dmg; v.recentDamageT = 3;
        v.posture = 0; v.flash = 1;
        v.hitstop = 0.12; this.hitstop = 0.12;
        this.svc.shake(0.35);
        this.svc.fx('goldMotes', v.chest, { count: 60 });
        this.svc.sfx('hit_heavy', { pos: v.pos });
        const res: HitResult = { attacker: this, target: v, spec: { start: 0, end: 0, source: 'weaponR', dmg: mult, posture: 0, poise: 0, kind: 'thrust' }, move: m.def, outcome: v.hp <= 0 ? 'killed' : 'hit', damage: dmg, point: v.chest, dir: this.forward, flinch: 'none', postureBroken: false, critical: true };
        this.svc.combat.onResult(res);
        break;
      }
      default: break;
    }
  }

  protected override onMoveEnd(m: MoveInstance) {
    if (m.def.id === 'death') this.onDeath();
  }

  protected override onLand(fall: number) {
    if (fall > 5.5 && !this.dead) {
      const dmg = fall > 14 ? this.hpMax * 2 : this.hpMax * ((fall - 5.5) / 9) * 0.9;
      this.hp = Math.max(0, this.hp - dmg);
      this.svc.sfx('land', { pos: this.pos, volume: 1.5 });
      if (this.hp <= 0) this.react('death', this.pos);
      else this.startMove(MOVES.hurt_heavy);
    } else if (fall > 1.2) this.svc.sfx('land', { pos: this.pos, surface: this.groundSurface });
  }

  /** Per-step upkeep: heal-over-time, burn, focus/hp caps, delayed spells, roots, counters. */
  upkeep(dt: number) {
    // Falling Hour: marked ground shimmers, then the bell drops.
    for (let i = this.fallingHours.length - 1; i >= 0; i--) {
      const h = this.fallingHours[i];
      h.t -= dt; h.fxT -= dt;
      if (h.fxT <= 0) {
        h.fxT = 0.12;
        this.svc.fx('bellMotes', h.pos.clone().setY(h.pos.y + 0.1), { count: 6, speed: 1 });
        if (h.t < 0.35) this.svc.fx('shardTrail', h.pos.clone().setY(h.pos.y + 0.5 + h.t * 14), { count: 10, color: 0xe8e0c8, speed: 0.5 });
      }
      if (h.t <= 0) { this.fallingHours.splice(i, 1); this.dropBell(h); }
    }
    // Pinning Shot roots: hold the anchor after everyone's physics ran this step.
    for (let i = this.pinned.length - 1; i >= 0; i--) {
      const p = this.pinned[i];
      p.t -= dt;
      if (p.t <= 0 || p.a.dead) { this.pinned.splice(i, 1); continue; }
      p.a.pos.x = p.x; p.a.pos.z = p.z; p.a.prevPos.x = p.x; p.a.prevPos.z = p.z;
      p.a.vel.x = 0; p.a.vel.z = 0; p.a.knock.set(0, 0, 0);
    }
    if (this.stilledShots > 0 && !this.buffs.has('stilledBreath')) this.stilledShots = 0;
    // Riposte Stance: a blow parried by the stance is answered at once with a riposte.
    const m = this.move;
    if (m && !this.dead && m.def.id.startsWith('tech_riposte_stance') && m.def.parry && m.t >= m.def.parry[0]) {
      for (const a of this.svc.actors()) {
        const e = a as Combatant;
        if (e.team === this.team || e.dead || !e.criticalable) continue;
        if (e.vulnerable === 'parried' && e.move && e.move.t < 0.3 && this.distTo(e) < 3.2 && Math.abs(this.angleTo(e.pos)) < 1.3) {
          this.crit = { target: e, kind: 'riposte' };
          this.startCritical();
          break;
        }
      }
    }
    if (this.healPool > 0 && !this.dead) {
      const h = Math.min(this.healPool, this.hpMax * 0.75 * dt);
      this.healPool -= h;
      this.hp = Math.min(this.hpMax, this.hp + h);
    }
    const burn = this.buffs.get('burn');
    if (burn && !this.dead) { this.hp = Math.max(0, this.hp - 10 * dt); if (this.hp <= 0) this.react('death', this.pos); }
  }

  // ------------------------------------------------------------------ Combatant

  attackPacket(spec: HitSpec, move: MoveDef, slot: 'R' | 'L' | 'S' | 'X'): DamagePacket {
    const src = slot === 'L' || slot === 'S' ? (this.leftDef?.weapon ? this.leftDef : this.rightDef) : this.rightDef;
    const ar = src?.weapon ? attackRating(src, this.data.inventory[src.id]?.upgrade ?? 0, this.data.attributes) : { physical: 45, magic: 0, fire: 0 };
    const charge = this.move && this.move.def === move ? this.move.charge : 0;
    const mult = spec.dmg * (1 + 0.45 * charge);
    const ember = this.buffs.has('ember') ? ar.physical * 0.35 : 0;
    return { physical: ar.physical * mult, magic: ar.magic * mult, fire: (ar.fire + ember) * mult };
  }
  postureDamage(spec: HitSpec, move: MoveDef): number {
    const src = this.rightDef;
    const ar = src?.weapon ? attackRating(src, this.data.inventory[src.id]?.upgrade ?? 0, this.data.attributes).total : 45;
    const charge = this.move && this.move.def === move ? this.move.charge : 0;
    return ar * 0.34 * spec.posture * (src?.weapon?.postureMult ?? 1) * (1 + charge);
  }
  defend(p: DamagePacket, _kind: HitSpec['kind']): number {
    const d = this.derived;
    let dmg = 0;
    if (p.physical > 0) dmg += applyDefense(p.physical, d.defense, d.absorb.physical);
    if (p.magic > 0) dmg += applyDefense(p.magic, d.defense * 0.8, d.absorb.magic);
    if (p.fire > 0) dmg += applyDefense(p.fire, d.defense * 0.8, d.absorb.fire);
    if (this.buffs.has('ward')) dmg *= 0.5;
    return Math.round(dmg);
  }
  guardInfo() {
    const l = this.leftDef;
    if (l?.shield) return { physical: l.shield.physicalGuard, magic: l.shield.magicGuard, stability: l.shield.stability };
    const r = this.rightDef;
    const ms = this.moveset;
    if (r?.weapon?.class === 'staff') return { physical: 50, magic: 45, stability: 15 };
    if (ms.twoHanded) return { physical: 70, magic: 30, stability: 35 };
    if (!r) return { physical: 30, magic: 10, stability: 8 };
    return { physical: 60, magic: 25, stability: 22 };
  }
  react(kind: 'light' | 'heavy' | 'guardHit' | 'guardBreak' | 'parried' | 'postureBreak' | 'death', from: THREE.Vector3) {
    if (this.dead) return;
    this.charging = false;
    this.svc.trail(this, false);
    const dir = new THREE.Vector3(this.pos.x - from.x, 0, this.pos.z - from.z).normalize();
    if (kind === 'death') {
      this.dead = true;
      this.guarding = false;
      this.anim.setOverlay(null, 0);
      this.yaw = yawOf(-dir.x, -dir.z);
      this.startMove(MOVES.death, { fade: 0.05 });
      this.svc.sfx('player_death');
      return;
    }
    if (kind !== 'guardHit') this.svc.sfx('player_hurt', { pos: this.pos });
    const face = () => { this.yaw = yawOf(-dir.x, -dir.z); };
    switch (kind) {
      case 'light': face(); this.startMove(MOVES.hurt_light); break;
      case 'heavy': face(); this.startMove(MOVES.hurt_heavy); break;
      case 'guardHit': this.startMove(MOVES.guard_hit); break;
      case 'guardBreak': face(); this.startMove(MOVES.guard_broken_player); this.svc.sfx('guard_break', { pos: this.pos }); break;
      case 'parried': this.startMove(MOVES.hurt_heavy); break;
      default: break;
    }
  }
  onDealtHit(r: HitResult) {
    if (r.outcome === 'parried') this.svc.hint('parry');
    if (r.move.id === 'projectile') {
      if (r.spec.poise === PIN_POISE && (r.outcome === 'hit' || r.outcome === 'blocked')) this.pin(r.target as Combatant);
      return;
    }
    // Maces, hammers and flails batter a raised guard; flail chains curl around it.
    const ms = this.moveset;
    const t = r.target as Combatant;
    if (r.outcome === 'blocked' && !t.dead && (ms.guardPressure || ms.wrapChip) && r.spec.source !== 'sphere') {
      const packet = this.attackPacket(r.spec, r.move, 'R');
      const raw = packet.physical + packet.magic + packet.fire;
      if (ms.guardPressure) {
        t.spendStamina(raw * ms.guardPressure.stamina);
        t.posture += this.postureDamage(r.spec, r.move) * ms.guardPressure.posture;
        t.postureDelay = 2.2;
      }
      if (ms.wrapChip) {
        const chip = t.defend({ physical: packet.physical * ms.wrapChip, magic: packet.magic * ms.wrapChip, fire: packet.fire * ms.wrapChip }, r.spec.kind);
        t.hp = Math.max(0, t.hp - chip);
        t.recentDamage += chip; t.recentDamageT = 2.5;
        if (t.hp <= 0) { this.svc.combat.kill(t, this, r); return; }
      }
      if (t.stamina <= 0) t.react('guardBreak', this.pos);
    }
  }

  /** Items (dev helpers) */
  hasItem(id: string) { return (this.data.inventory[id]?.count ?? 0) > 0; }
  itemName(id: string) { return ITEMS[id]?.name ?? id; }
}

/** Technique → move (class-agnostic default; the Player passes its weapon class — see techniqueMoveFor). */
export function techniqueMove(id: string, cls: WeaponClass | 'shield' | null = null): MoveDef | null {
  return techniqueMoveFor(id, cls);
}
