/**
 * Melee hit tracing and the defensive rules shared by every attack:
 *   i-frames → parry → guard → clean hit (poise → flinch, posture → break, hp → death).
 * Weapon hit segments are swept between simulation steps against bone-driven hurt capsules, so a
 * hit lands exactly when the drawn blade crosses the drawn body.
 */
import * as THREE from 'three';
import type { Actor } from '../actors/Actor';
import type { HitSpec, MoveDef } from './types';
import { segmentSegmentDistSq } from '../core/math';

export interface DamagePacket { physical: number; magic: number; fire: number }

export type HitOutcome = 'dodged' | 'parried' | 'blocked' | 'guardBroken' | 'hit' | 'killed';

export interface HitResult {
  attacker: Actor; target: Actor; spec: HitSpec; move: MoveDef;
  outcome: HitOutcome; damage: number; point: THREE.Vector3;
  /** Horizontal unit direction from attacker to target. */
  dir: THREE.Vector3;
  flinch: 'none' | 'light' | 'heavy';
  postureBroken: boolean;
  critical?: boolean;
}

/** Hooks implemented by actor classes (Player/Enemy) — see Actor subclasses. */
export interface Combatant extends Actor {
  attackPacket(spec: HitSpec, move: MoveDef, slot: 'R' | 'L' | 'S' | 'X'): DamagePacket;
  postureDamage(spec: HitSpec, move: MoveDef): number;
  defend(p: DamagePacket, kind: HitSpec['kind']): number; // final hp damage
  guardInfo(): { physical: number; magic: number; stability: number } | null;
  react(kind: 'light' | 'heavy' | 'guardHit' | 'guardBreak' | 'parried' | 'postureBreak' | 'death', from: THREE.Vector3): void;
  onDealtHit?(r: HitResult): void;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
const _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3();
const _sa = new THREE.Vector3(), _sb = new THREE.Vector3();

export class Combat {
  /** Called after every resolved hit (feedback: sfx, particles, hit-stop, HUD). */
  onResult: (r: HitResult) => void = () => {};
  /** Debug: record swept segments for the hitbox overlay. */
  debugSegments: { a: THREE.Vector3; b: THREE.Vector3; r: number }[] = [];
  debug = false;

  /** Trace all active melee hit windows for this step. */
  trace(actors: Combatant[]) {
    if (this.debug) this.debugSegments.length = 0;
    for (const att of actors) {
      const m = att.move;
      if (!m || att.dead) { att.prevSeg.R.valid = att.prevSeg.L.valid = att.prevSeg.S.valid = false; continue; }
      const hits = m.def.hits;
      if (!hits) continue;
      for (let hi = 0; hi < hits.length; hi++) {
        const h = hits[hi];
        const active = m.t >= h.start && m.t <= h.end + 1e-6;
        const slot = h.source === 'weaponR' ? 'R' : h.source === 'weaponL' ? 'L' : h.source === 'shieldL' ? 'S' : 'X';
        if (!active) { if (slot !== 'X' && m.t > h.end) att.prevSeg[slot].valid = false; continue; }
        const group = h.group ?? hi;
        let log = m.hitLog.get(group);
        if (!log) m.hitLog.set(group, (log = new Set()));
        if (slot === 'X') {
          this.sphereHits(att, h, m.def, log, actors);
          continue;
        }
        const r = att.weaponSegment(slot, _a, _b);
        if (r === null) continue;
        const prev = att.prevSeg[slot];
        if (!prev.valid) { prev.a.copy(_a); prev.b.copy(_b); prev.valid = true; }
        if (this.debug) this.debugSegments.push({ a: _a.clone(), b: _b.clone(), r });
        for (const tgt of actors) {
          if (tgt === att || tgt.dead || tgt.team === att.team || log.has(tgt.id)) continue;
          if (tgt.distTo(att) > 8) continue;
          // sweep: sample the quad between prev and current segment
          let best = Infinity; const pt = new THREE.Vector3();
          const N = 5;
          for (let s = 0; s <= N; s++) {
            const f = s / N;
            _sa.lerpVectors(prev.a, _a, f); _sb.lerpVectors(prev.b, _b, f);
            for (const hv of tgt.hurt) {
              const d2 = segmentSegmentDistSq(_sa, _sb, hv.a, hv.b, _c1, _c2);
              const rr = r + hv.r;
              if (d2 < rr * rr && d2 < best) { best = d2; pt.copy(_c1).lerp(_c2, 0.5); }
            }
          }
          if (best < Infinity) { log.add(tgt.id); this.resolve(att, tgt, h, m.def, slot, pt); }
        }
        prev.a.copy(_a); prev.b.copy(_b);
      }
    }
  }

  private sphereHits(att: Combatant, h: HitSpec, move: MoveDef, log: Set<number>, actors: Combatant[]) {
    const sp = h.sphere!;
    const c = new THREE.Vector3(sp.offset[0], sp.offset[1], sp.offset[2]);
    if (sp.bone === 'root') c.applyMatrix4(att.rig.root.matrixWorld);
    else c.applyMatrix4(att.rig.bones[sp.bone].matrixWorld);
    if (this.debug) this.debugSegments.push({ a: c.clone(), b: c.clone(), r: sp.radius });
    for (const tgt of actors) {
      if (tgt === att || tgt.dead || tgt.team === att.team || log.has(tgt.id)) continue;
      for (const hv of tgt.hurt) {
        const d2 = segmentSegmentDistSq(c, c, hv.a, hv.b, _c1, _c2);
        const rr = sp.radius + hv.r;
        if (d2 < rr * rr) { log.add(tgt.id); this.resolve(att, tgt, h, move, 'X', _c2.clone().lerp(c, 0.5)); break; }
      }
    }
  }

  /** Apply a hit (also used by projectiles and spells with slot 'X'). */
  resolve(att: Combatant, tgt: Combatant, h: HitSpec, move: MoveDef, slot: 'R' | 'L' | 'S' | 'X', point: THREE.Vector3): HitResult {
    const dir = new THREE.Vector3(tgt.pos.x - att.pos.x, 0, tgt.pos.z - att.pos.z);
    if (dir.lengthSq() < 1e-6) dir.set(Math.sin(att.yaw), 0, Math.cos(att.yaw)); else dir.normalize();
    const res: HitResult = { attacker: att, target: tgt, spec: h, move, outcome: 'hit', damage: 0, point, dir, flinch: 'none', postureBroken: false };

    if (tgt.invulnerable) { res.outcome = 'dodged'; this.onResult(res); return res; }

    const facing = Math.abs(tgt.angleTo(att.pos));
    // Parry: melee, parryable, facing the attacker.
    if (tgt.parrying && !h.unparryable && !h.unblockable && slot !== 'X' && facing < Math.PI * 0.55) {
      res.outcome = 'parried';
      att.react('parried', tgt.pos);
      tgt.hitstop = 0.06;
      this.onResult(res); att.onDealtHit?.(res);
      return res;
    }
    const packet = att.attackPacket(h, move, slot);
    const guard = tgt.guarding ? tgt.guardInfo() : null;
    if (guard && !h.unblockable && facing < tgt.guardArc) {
      const raw = packet.physical + packet.magic + packet.fire;
      const chip = packet.physical * (1 - guard.physical / 100) + (packet.magic + packet.fire) * (1 - guard.magic / 100);
      const stCost = Math.max(6, raw * 0.55 * (1 - guard.stability / 100) * (h.guardBreak ? 1.8 : 1) + h.poise * 0.25);
      tgt.spendStamina(stCost);
      if (chip > 0.5) { tgt.hp = Math.max(0, tgt.hp - Math.round(chip)); res.damage = Math.round(chip); }
      // guard pressure also builds posture on enemies
      tgt.posture += att.postureDamage(h, move) * 0.6;
      tgt.postureDelay = 2.2;
      if (tgt.stamina <= 0) {
        res.outcome = 'guardBroken';
        tgt.react('guardBreak', att.pos);
      } else {
        res.outcome = 'blocked';
        tgt.react('guardHit', att.pos);
        att.hitstop = Math.max(att.hitstop, 0.05);
      }
      tgt.hitstop = Math.max(tgt.hitstop, 0.05);
      if (tgt.hp <= 0) this.kill(tgt, att, res);
      this.onResult(res); att.onDealtHit?.(res);
      return res;
    }

    // Clean hit.
    const crit = tgt.vulnerable ? 1.0 : 1.0; // criticals are separate moves; hits on vulnerable targets do normal damage
    const dmg = Math.round(tgt.defend(packet, h.kind) * crit);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    tgt.recentDamage += dmg; tgt.recentDamageT = 2.5;
    res.damage = dmg;
    tgt.flash = 1;
    // posture
    const pd = att.postureDamage(h, move);
    tgt.posture += pd;
    tgt.postureDelay = 2.2;
    tgt.aware = true;
    const stopT = Math.min(0.11, 0.05 + dmg / 3000);
    att.hitstop = Math.max(att.hitstop, stopT);
    tgt.hitstop = Math.max(tgt.hitstop, stopT);
    if (tgt.hp <= 0) { this.kill(tgt, att, res); this.onResult(res); att.onDealtHit?.(res); return res; }
    if (tgt.criticalable && tgt.posture >= tgt.postureMax && !tgt.vulnerable) {
      res.postureBroken = true;
      tgt.posture = tgt.postureMax;
      tgt.react('postureBreak', att.pos);
    } else if (!tgt.vulnerable) {
      // poise
      tgt.poiseDamage += h.poise;
      tgt.poiseTimer = 1.6;
      if (tgt.poiseDamage > tgt.poiseNow && !tgt.move?.def.noFlinch) {
        res.flinch = h.poise >= 45 ? 'heavy' : 'light';
        tgt.poiseDamage = 0;
        tgt.react(res.flinch, att.pos);
      } else tgt.anim.addFlinch(dir.x, dir.z, 0.25);
      if (h.knock && res.flinch !== 'none') tgt.knock.addScaledVector(dir, h.knock);
    }
    this.onResult(res); att.onDealtHit?.(res);
    return res;
  }

  kill(tgt: Combatant, att: Combatant, res: HitResult) {
    if (tgt.dead) return;
    res.outcome = 'killed';
    tgt.react('death', att.pos);
  }
}
