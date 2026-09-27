import { describe, it, expect } from 'vitest';
import { flatWorld, mockServices, THREE } from './helpers';
import { Enemy } from '../src/actors/Enemy';
import { ENEMY_DEFS } from '../src/content/enemies';
import { MOVES } from '../src/combat/moves';
import { FixedLoop } from '../src/core/loop';
import type { Combatant } from '../src/combat/Combat';

/** An infantry attacks a stationary dummy target; returns [time of first hit, damage]. */
function runAt(frameDts: () => number) {
  const world = flatWorld();
  const actors: Enemy[] = [];
  const svc = mockServices(world, () => actors);
  const hitTimes: number[] = [];
  let damage = 0;
  svc.combat.onResult = (r) => { if (r.outcome !== 'dodged') { hitTimes.push(svc.t); damage += r.damage; } };
  const att = new Enemy(ENEMY_DEFS.infantry, svc, 1);
  const tgt = new Enemy(ENEMY_DEFS.infantry, svc, 2);
  (tgt as any).team = 'player';
  const wm = { hit: { from: 0.12, to: 1.05, radius: 0.05 }, object: new THREE.Group() };
  att.weaponR = { id: 'enemy_sword', model: wm as any };
  att.rig.sockets.weaponR.add(wm.object);
  att.teleport(new THREE.Vector3(0, 0, 0), 0);
  tgt.teleport(new THREE.Vector3(0, 0, 1.6), Math.PI);
  actors.push(att, tgt);
  att.startMove(MOVES.inf_slash);
  const loop = new FixedLoop({
    frameStart() {},
    step(dt) {
      svc.t += dt;
      for (const a of actors) a.stepPhysics(dt, world, null, null);
      for (const a of actors) a.stepAnimation(dt);
      svc.combat.trace(actors as unknown as Combatant[]);
    },
    render() {},
  });
  let elapsed = 0;
  while (elapsed < 2) { const d = frameDts(); loop.advance(d); elapsed += d; }
  return { first: hitTimes[0], damage, count: hitTimes.length };
}

describe('combat timing is frame-rate independent', () => {
  it('same hit time and damage at 30, 60, 144 fps and jittery frames', () => {
    const r60 = runAt(() => 1 / 60);
    const r30 = runAt(() => 1 / 30);
    const r144 = runAt(() => 1 / 144);
    let k = 0;
    const rJit = runAt(() => [0.004, 0.031, 0.017, 0.009, 0.05][k++ % 5]);
    expect(r60.count).toBe(1);
    expect(r60.first).toBeGreaterThanOrEqual(MOVES.inf_slash.hits![0].start);
    expect(r60.first).toBeLessThanOrEqual(MOVES.inf_slash.hits![0].end + 1e-6);
    for (const r of [r30, r144, rJit]) {
      expect(r.first).toBeCloseTo(r60.first, 6);
      expect(r.damage).toBe(r60.damage);
      expect(r.count).toBe(1);
    }
  });

  it('i-frames make a dodging target take nothing', () => {
    const world = flatWorld();
    const actors: Enemy[] = [];
    const svc = mockServices(world, () => actors);
    const outcomes: string[] = [];
    svc.combat.onResult = (r) => outcomes.push(r.outcome);
    const att = new Enemy(ENEMY_DEFS.infantry, svc, 1);
    const tgt = new Enemy(ENEMY_DEFS.infantry, svc, 2);
    (tgt as any).team = 'player';
    const wm = { hit: { from: 0.12, to: 1.05, radius: 0.05 }, object: new THREE.Group() };
    att.weaponR = { id: 'enemy_sword', model: wm as any };
    att.rig.sockets.weaponR.add(wm.object);
    att.teleport(new THREE.Vector3(0, 0, 0), 0);
    tgt.teleport(new THREE.Vector3(0, 0, 1.6), Math.PI);
    actors.push(att, tgt);
    att.startMove(MOVES.inf_slash);
    const hp0 = tgt.hp;
    for (let i = 0; i < 90; i++) {
      const dt = 1 / 60; svc.t += dt;
      if (Math.abs(svc.t - 0.5) < 1e-3) tgt.startMove({ ...MOVES.backstep, motion: undefined, iframes: [0, 0.4], dur: 0.45 });
      for (const a of actors) a.stepPhysics(dt, world, null, null);
      for (const a of actors) a.stepAnimation(dt);
      svc.combat.trace(actors as any);
    }
    expect(tgt.hp).toBe(hp0);
    expect(outcomes.every((o) => o === 'dodged')).toBe(true);
  });
});
