/**
 * The Returned: input → moves, resources, flasks, spells, techniques, criticals.
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
import { STANCES, SHIELD_REST, DIRK_REST, STAFF_REST, SWORD_REST } from './anim/clips/stances';
import { CLIPS } from './anim/clips';
import { angleDiff, approachAngle, clamp, yawOf } from '../core/math';
import type { SpellDef } from '../game/types';
import { SPELLS } from '../content/spells';
import { ITEMS } from '../content/items';

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

  constructor(private svc: Services, data: PlayerData) {
    super({ height: 1, bulk: 1, shoulder: 1 });
    this.name = 'The Returned';
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
    const rc = r?.weapon?.class;
    const handR = !r ? null : (rc === 'staff' || rc === 'bell' || rc === 'censer') ? STAFF_REST : SWORD_REST;
    const handL = !l ? null : l.kind === 'shield' ? SHIELD_REST : DIRK_REST;
    const base = rc === 'staff' ? STANCES.staff : STANCES.swordShield;
    this.setStance({ ...base, handR, handL });
  }

  // ------------------------------------------------------------------ control (per sim step)

  control(dt: number, c: PlayerControl) {
    this.lastCtl = c;
    const inp = c.input;
    const s = this.svc.settings.accessibility.holdToggle;
    if (this.dead) { this.wish.set(0, 0, 0); return; }
    if (c.blocked) { this.wish.set(0, 0, 0); this.guarding = false; this.anim.setOverlay(null, 0); this.sprinting = false; return; }

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
    const wantGuard = this.guardToggle && !!(this.leftDef || this.rightDef);

    // --- sprint
    const sprintHeld = s.sprint === 'toggle' ? (this.sprinting ? hasMove : this.dodgeHeld > 0.25) : this.dodgeHeld > 0.25;
    this.sprinting = sprintHeld && hasMove && this.stamina > 0 && !this.move && !wantGuard && this.derived.loadClass !== 'overloaded';
    if (this.sprinting) { this.stamina -= 9 * dt; this.staminaDelay = 0.4; }

    // --- charge heavy
    if (this.charging) {
      this.heavyHeldT += dt;
      const held = s.chargeHeavy === 'toggle' ? !this.chargeReleaseQueued : inp.down('heavy');
      if (s.chargeHeavy === 'toggle' && inp.pressed('heavy') && this.heavyHeldT > 0.05) this.chargeReleaseQueued = true;
      const t = this.move?.t ?? 0;
      if ((!held && t >= 0.28) || t >= 1.05) this.releaseHeavy();
      else if (!this.move || !this.move.def.id.endsWith('_charge')) this.charging = false;
    }

    // --- free state or cancellable: act on buffered input
    if (this.buffered) this.tryBuffered(c, hasMove, wx, wz, wantGuard);

    // --- locomotion
    const free = !this.move;
    this.guarding = (free && wantGuard) || !!this.move?.def.guard;
    this.anim.setOverlay(this.guarding && (free || this.move?.def.guard) ? CLIPS.guard : null, 1, 14);
    const loadMul = DODGE[this.derived.loadClass].speedMult;
    let speed = (this.sprinting ? SPRINT : walking || this.derived.loadClass === 'overloaded' ? WALK : this.guarding ? GUARD_WALK : RUN * Math.min(1, mag * 1.15)) * loadMul;
    if (!hasMove) speed = 0;
    this.wish.set(hasMove ? (wx / Math.max(mag, 1e-3)) * speed * Math.min(1, mag * 1.4) : 0, 0, hasMove ? (wz / Math.max(mag, 1e-3)) * speed * Math.min(1, mag * 1.4) : 0);
    if (this.move) {
      // walking moves (drink, cast): keep wish for `walk` factor; facing handled by track
      if (this.move.def.walk && hasMove) { const ty = yawOf(wx, wz); if (!c.lock) this.yaw = approachAngle(this.yaw, ty, 6 * dt); }
      return;
    }
    // facing
    if (c.lock && !this.sprinting) {
      const ty = yawOf(c.lock.pos.x - this.pos.x, c.lock.pos.z - this.pos.z);
      this.yaw = approachAngle(this.yaw, ty, 10 * dt);
    } else if (hasMove) {
      this.yaw = approachAngle(this.yaw, yawOf(wx, wz), (this.sprinting ? 9 : 13) * dt);
    }
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
        const cls = this.rightDef?.weapon?.class;
        const prev = this.move?.def;
        const nextId = prev?.next && prev.id.startsWith('sword_light') && this.move && this.move.t >= (prev.cancel?.chain ?? 99) ? prev.next : 'sword_light1';
        void cls;
        this.startMove(MOVES[nextId]);
        break;
      }
      case 'heavy': {
        if (!ok('chain')) return;
        if (this.crit && (!this.move || this.canCancel('free'))) { this.startCritical(); break; }
        const staff = !!this.catalyst;
        this.startMove(MOVES[staff ? 'staff_heavy_charge' : 'sword_heavy_charge']);
        this.charging = true; this.heavyHeldT = 0; this.chargeReleaseQueued = false;
        break;
      }
      case 'parry': {
        if (!ok('free')) return;
        this.startMove(this.leftDef?.kind === 'shield' ? MOVES.parry_shield : MOVES.parry_hand);
        break;
      }
      case 'technique': {
        if (!ok('free')) return;
        const onShield = wantGuard && this.leftDef?.kind === 'shield';
        const tech = techniqueFor(this.data, onShield ? leftId(this.data) : rightId(this.data)) ?? techniqueFor(this.data, leftId(this.data));
        if (!tech) { this.buffered = null; return; }
        if (this.focus < tech.focus) { this.svc.sfx('ui_error'); this.svc.hint('focus'); this.buffered = null; return; }
        const mv = techniqueMove(tech.id);
        if (!mv) { this.buffered = null; return; }
        this.startMove({ ...mv, focus: tech.focus, stamina: tech.stamina });
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

  private releaseHeavy() {
    const t = this.move?.t ?? 0;
    const charge = clamp((t - 0.3) / 0.7, 0, 1);
    this.charging = false;
    const staff = !!this.catalyst;
    this.startMove(MOVES[staff ? 'staff_heavy_release' : 'sword_heavy_release'], { charge, fade: 0.04 });
    if (charge >= 0.95) this.svc.sfx('charge_full', { pos: this.pos });
  }

  // ------------------------------------------------------------------ spells

  private castSpell(c: PlayerControl) {
    const sp = activeSpell(this.data);
    const cat = this.catalyst;
    if (!sp || !cat || cat.weapon?.casts !== sp.school) { this.svc.sfx('ui_error'); this.svc.hint('cast'); return; }
    if (this.focus < sp.focus) { this.svc.sfx('ui_error'); this.svc.hint('focus'); return; }
    const kind = sp.kind;
    const mv = kind === 'projectile' && sp.id === 'glinting_shard' || kind === 'volley' || sp.id === 'knell_of_rest' ? MOVES.cast_quick
      : kind === 'projectile' || kind === 'lance' || kind === 'delayedStrike' ? MOVES.cast_heavy : MOVES.cast_channel;
    this.startMove({ ...mv, focus: sp.focus, stamina: sp.stamina }, { data: { spell: sp.id } });
    this.svc.sfx(sp.id === 'cinder_bolt' ? 'cast_cinder' : sp.school === 'rite' ? 'spell_heal' : 'cast_shard', { pos: this.pos });
    void c;
  }

  private fireSpell(sp: SpellDef) {
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
      case 'glinting_shard': P('shard', 30, { magic: 100 }); break;
      case 'cinder_bolt': P('cinder', 17, { fire: 155 }, { burst: 1.8, status: { id: 'burn', seconds: 3, dps: 12 * power }, posture: 40 * power, poise: 45 }); break;
      case 'shard_volley': for (const a of [-0.13, 0, 0.13]) P('shard', 28, { magic: 72 }, {}, aim.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a)); break;
      case 'bellglass_lance': P('shard', 55, { magic: 240 }, { radius: 0.25, posture: 60 * power, poise: 70 }); break;
      case 'knell_of_rest': P('knell', 22, { magic: 60, physical: 40 }, { damageKind: 'holy' }); break;
      case 'falling_hour': P('knell', 12, { magic: 200 }, { burst: 2.4, posture: 80 * power, poise: 80, gravity: 6 }); break;
      case 'stilling_chime': this.healPool += this.hpMax * 0.35 * Math.max(1, power * 0.8); this.svc.fx('healMotes', this.chest); break;
      case 'ashen_veil': this.buffs.set('ward', 6); break;
      case 'ember_blessing': this.buffs.set('ember', 30); break;
      case 'vigil_of_ash': this.buffs.set('staminaRegen', 30); break;
      case 'toll_of_warding': {
        for (const a of this.svc.actors()) if (a.team !== this.team && !a.dead && a.distTo(this) < 3.2) {
          this.svc.combat.resolveWith(this, a as Combatant, { start: 0, end: 0, source: 'sphere', dmg: 0, posture: 0, poise: 60, kind: 'holy', knock: 5 }, MOVES.cast_channel, a.chest, { physical: 0, magic: 90 * power, fire: 0 }, 50 * power);
        }
        this.svc.fx('bellMotes', this.chest, { count: 60, speed: 6 });
        break;
      }
    }
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
      case 'cast': { const sp = SPELLS[m.data.spell as string]; if (sp) this.fireSpell(sp); break; }
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
        if (m.def.id === 'tech_ward') { this.buffs.set('ward', 2.5); this.svc.fx('bellMotes', this.chest, { count: 40 }); }
        break;
      }
      case 'critHit': {
        const v = m.data.victim as Combatant | undefined;
        if (!v || v.dead) break;
        const r = this.rightDef;
        const ar = r?.weapon ? attackRating(r, this.data.inventory[r.id]?.upgrade ?? 0, this.data.attributes) : { physical: 60, magic: 0, fire: 0 };
        const mult = (r?.weapon?.criticalMult ?? 2.2) * (m.data.kind === 'backstab' ? 1.0 : m.data.kind === 'riposte' ? 1.1 : 1.0);
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

  /** Per-step upkeep: heal-over-time, burn, focus/hp caps. */
  upkeep(dt: number) {
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
    if (r?.weapon?.class === 'staff') return { physical: 50, magic: 45, stability: 15 };
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
  }

  /** Items (dev helpers) */
  hasItem(id: string) { return (this.data.inventory[id]?.count ?? 0) > 0; }
  itemName(id: string) { return ITEMS[id]?.name ?? id; }
}

/** Technique → move. */
export function techniqueMove(id: string): MoveDef | null {
  switch (id) {
    case 'oathbound_lunge': case 'impaling_charge': case 'vow_pursuit': return MOVES.tech_lunge;
    case 'bulwark_toll': return MOVES.tech_bash;
    case 'bellglass_ward': return MOVES.tech_ward;
    case 'measured_cut': case 'greyford_flourish': return MOVES.tech_lunge;
    default: return MOVES.tech_lunge;
  }
}
