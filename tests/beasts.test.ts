import { describe, it, expect } from 'vitest';
import { flatWorld, mockServices, THREE } from './helpers';
import { Enemy } from '../src/actors/Enemy';
import { ENEMY_DEFS } from '../src/content/enemies';
import { MOVES } from '../src/combat/moves';
import { CLIPS } from '../src/actors/anim/clips';
import type { StanceWithBody } from '../src/actors/anim/Animator';
import type { Combatant } from '../src/combat/Combat';
import '../src/content/beasts/defs';
import { BEAST_KINDS } from '../src/content/beasts/defs';
import { beastPackStep } from '../src/content/beasts/pack';

const KINDS = ['warHound', 'huntingHound', 'carrionStag'];

function arena() {
  const world = flatWorld();
  const actors: Enemy[] = [];
  const svc = mockServices(world, () => actors);
  const step = (dt: number, target: Enemy | null) => {
    svc.t += dt;
    for (const a of actors) if (target && a !== target) a.think(dt, target);
    for (const a of actors) if (!a.dead || a.move) a.stepPhysics(dt, world, a.target?.pos ?? null, null);
    for (const a of actors) a.stepAnimation(dt);
    svc.combat.trace(actors as unknown as Combatant[]);
    for (const a of actors) a.updateDeath(dt);
  };
  return { world, actors, svc, step };
}

/** A passive stand-in for the player (team 'player'). */
function target(svc: ReturnType<typeof arena>['svc'], pos: THREE.Vector3) {
  const t = new Enemy(ENEMY_DEFS.dummy, svc, 99);
  (t as unknown as { team: string }).team = 'player';
  t.resetAt(pos, Math.PI);
  return t;
}

describe('beasts: registration & consistency', () => {
  it('registers every kind with moves, clips and a quadruped body plan', () => {
    expect(BEAST_KINDS.sort()).toEqual([...KINDS].sort());
    for (const k of KINDS) {
      const def = ENEMY_DEFS[k];
      expect(def, k).toBeTruthy();
      const body = (def.stance as StanceWithBody).body;
      expect(body?.gait, k).toBeTypeOf('function');
      for (const n of ['victimBack', 'victimFront', 'victimDown', 'sentryIdle']) {
        const c = body!.clips![n];
        expect(c, `${k} ${n}`).toBeTruthy();
        // an override must last as long as the engine move that plays it
        const mv = n === 'victimBack' ? MOVES.victim_back : n === 'victimFront' ? MOVES.victim_front : n === 'victimDown' ? MOVES.victim_down : null;
        if (mv) expect(c.duration).toBeGreaterThanOrEqual(mv.dur - 1e-6);
      }
      const ids = [...def.attacks.map((a) => a.move), ...def.attacks.flatMap((a) => (a.follow ?? []).map((f) => f[0])), ...Object.values(def.reactions ?? {})];
      for (const id of ids) {
        const m = MOVES[id!];
        expect(m, `${k}: move ${id}`).toBeTruthy();
        expect(CLIPS[m.clip], `${k}: clip ${m.clip}`).toBeTruthy();
        for (const h of m.hits ?? []) {
          expect(h.start).toBeGreaterThanOrEqual(0);
          expect(h.end).toBeGreaterThan(h.start);
          expect(h.end).toBeLessThanOrEqual(m.dur);
        }
        if (m.hyper) expect(m.hyper[1]).toBeLessThanOrEqual(m.dur);
        if (m.track) expect(m.track[0]).toBeLessThanOrEqual(m.dur);
        for (const e of m.events ?? []) expect(e.t).toBeLessThanOrEqual(m.dur);
        const last = (c: [number, number][] | undefined) => (c ? c[c.length - 1][0] : 0);
        expect(last(m.motion)).toBeLessThanOrEqual(m.dur);
      }
      expect(MOVES[def.reactions!.parried!].vulnerable).toBe('parried');
      expect(MOVES[def.reactions!.postureBreak!].vulnerable).toBe('postureBroken');
    }
  });

  it('opening attacks have readable tells; pounces and stomps are marked unparryable', () => {
    for (const k of KINDS) {
      for (const a of ENEMY_DEFS[k].attacks) {
        const m = MOVES[a.move];
        if (!m.hits) continue;
        expect(m.hits[0].start, a.move).toBeGreaterThanOrEqual(0.45);
        if (m.hits.some((h) => h.unparryable)) expect(m.tell).toBe('unparryable');
      }
    }
    expect(MOVES.wh_pounce.tell).toBe('unparryable');
    expect(MOVES.wh_lunge.hits![0].start).toBeGreaterThanOrEqual(0.6);
    expect(MOVES.wh_maul.hits![0].source).toBe('weaponR'); // the parryable one
  });

  it('numbers match the brief', () => {
    expect(ENEMY_DEFS.warHound.hp).toBe(160);
    expect(ENEMY_DEFS.huntingHound.hp).toBe(120);
    expect(ENEMY_DEFS.warHound.hours).toBe(70);
    expect(ENEMY_DEFS.huntingHound.hours).toBe(60);
    expect(ENEMY_DEFS.huntingHound.run).toBeGreaterThan(ENEMY_DEFS.warHound.run);
  });
});

describe('beasts: body on the humanoid rig', () => {
  it('stands on four paws with a horizontal torso capsule', () => {
    for (const k of KINDS) {
      const { svc, actors, step } = arena();
      const e = new Enemy(ENEMY_DEFS[k], svc, 3);
      actors.push(e);
      e.resetAt(new THREE.Vector3(0, 0, 0), 0);
      for (let i = 0; i < 30; i++) step(1 / 60, null);
      const b = e.rig.bones;
      const w = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
      // front paws (socket = grip) and hind hocks near the ground; the torso up high
      for (const s of ['weaponL', 'weaponR'] as const) expect(w(e.rig.sockets[s]).y, `${k} ${s}`).toBeLessThan(0.45);
      for (const f of [b.footL, b.footR]) expect(w(f).y, k).toBeLessThan(0.5);
      const body = e.hurt[0];
      const len = body.a.distanceTo(body.b);
      expect(len, k).toBeGreaterThan(0.4);
      expect(Math.abs(body.a.y - body.b.y) / len, `${k} torso pitch`).toBeLessThan(0.45);
      // head ahead of the root, rump behind it
      expect(w(b.head).z).toBeGreaterThan(0.15);
      expect(w(b.hips).z).toBeLessThan(-0.15);
    }
  });

  it('gait: four distinct footfalls per stride and paws planted while in stance', () => {
    const { svc, actors, step } = arena();
    const e = new Enemy(ENEMY_DEFS.warHound, svc, 3);
    actors.push(e);
    e.resetAt(new THREE.Vector3(0, 0, 0), 0);
    const down: Record<string, number[]> = { LF: [], RF: [], LH: [], RH: [] };
    const prevUp: Record<string, boolean> = {};
    const socket = { LF: e.rig.sockets.weaponL, RF: e.rig.sockets.weaponR, LH: e.rig.bones.footL, RH: e.rig.bones.footR };
    const base: Record<string, number> = {};
    for (let i = 0; i < 240; i++) {
      e.wish.set(0, 0, 1.2); // walk
      step(1 / 60, null);
      if (i < 60) continue;
      for (const [n, o] of Object.entries(socket)) {
        const y = o.getWorldPosition(new THREE.Vector3()).y;
        base[n] = Math.min(base[n] ?? 9, y);
        const up = y > base[n] + 0.02;
        if (prevUp[n] && !up) down[n].push(svc.t);
        prevUp[n] = up;
      }
    }
    for (const n of Object.keys(down)) expect(down[n].length, n).toBeGreaterThanOrEqual(2);
    // four-beat walk: no two paws land together
    const all = Object.entries(down).flatMap(([n, l]) => l.map((t) => ({ n, t }))).sort((a, b) => a.t - b.t);
    for (let i = 1; i < all.length; i++) expect(all[i].t - all[i - 1].t, `${all[i - 1].n}→${all[i].n}`).toBeGreaterThan(0.08);
  });

  it('criticals play the quadruped victim clips; humanoids keep the generic ones', () => {
    const { svc } = arena();
    const h = new Enemy(ENEMY_DEFS.warHound, svc, 1);
    h.beginCriticalVictim('backstab', h);
    expect(h.anim.clip?.name).toBe('wh_victimBack');
    h.beginCriticalVictim('riposte', h);
    expect(h.anim.clip?.name).toBe('wh_victimFront');
    const inf = new Enemy(ENEMY_DEFS.infantry, svc, 1);
    inf.beginCriticalVictim('backstab', inf);
    expect(inf.anim.clip?.name).toBe('victimBack');
  });

  it('dies on its side (low body, not standing)', () => {
    const { svc, actors, step } = arena();
    const e = new Enemy(ENEMY_DEFS.huntingHound, svc, 1);
    actors.push(e);
    e.resetAt(new THREE.Vector3(0, 0, 0), 0);
    e.react('death', new THREE.Vector3(0, 0, 3));
    for (let i = 0; i < 150; i++) step(1 / 60, null);
    expect(e.dead).toBe(true);
    const hips = e.rig.bones.hips.getWorldPosition(new THREE.Vector3());
    expect(hips.y).toBeLessThan(0.35);
  });
});

describe('beasts: AI in a headless fight', () => {
  for (const kind of ['warHound', 'huntingHound']) {
    it(`${kind} closes in, attacks and lands a hit on a target`, () => {
      const { svc, actors, step } = arena();
      const hits: string[] = [];
      svc.combat.onResult = (r) => { if (r.attacker.team === 'unlived' && (r.outcome === 'hit' || r.outcome === 'killed')) hits.push(r.move.id); };
      const hound = new Enemy(ENEMY_DEFS[kind], svc, 5);
      const tgt = target(svc, new THREE.Vector3(0, 0, 9));
      actors.push(hound, tgt);
      hound.resetAt(new THREE.Vector3(0, 0, 0), 0);
      hound.becomeAware(tgt);
      const hp0 = tgt.hp;
      let minD = Infinity;
      for (let i = 0; i < 60 * 25 && hits.length < 2; i++) { step(1 / 60, tgt); minD = Math.min(minD, hound.distTo(tgt)); }
      expect(minD).toBeLessThan(4.5);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((id) => id.startsWith(kind === 'warHound' ? 'wh_' : 'hh_'))).toBe(true);
      expect(tgt.hp < hp0 || tgt.recentDamage > 0 || hits.length > 0).toBe(true);
      expect(svc.log).toContain('sfx:enemy_alert');
    });
  }

  it('a baying hound wakes nearby enemies (beastPackStep)', () => {
    const { svc, actors } = arena();
    const hound = new Enemy(ENEMY_DEFS.huntingHound, svc, 1);
    const sleeper = new Enemy(ENEMY_DEFS.infantry, svc, 2);
    const far = new Enemy(ENEMY_DEFS.infantry, svc, 3);
    const tgt = target(svc, new THREE.Vector3(0, 0, 8));
    actors.push(hound, sleeper, far, tgt);
    hound.resetAt(new THREE.Vector3(0, 0, 0), 0);
    sleeper.resetAt(new THREE.Vector3(6, 0, -4), 0);
    far.resetAt(new THREE.Vector3(40, 0, 0), 0);
    hound.becomeAware(tgt);
    hound.startMove(MOVES.hh_bark);
    for (let i = 0; i < 60; i++) {
      hound.stepPhysics(1 / 60, svc.world, null, null);
      beastPackStep(actors, 1 / 60);
    }
    expect(sleeper.aware).toBe(true);
    expect(sleeper.target).toBe(tgt);
    expect(far.aware).toBe(false);
  });
});
