/**
 * Optional pack behaviour for beasts, driven from a region's per-step update:
 *
 *   import { beastPackStep } from '../beasts';
 *   step(dt) { …; beastPackStep(this.game.enemies, dt); }
 *
 *  - A baying hound (`*_bark` move) wakes every unaware enemy within `BARK_RADIUS` and sets them on
 *    the hound's target (any enemy kind: the Household's hounds call the retainers).
 *  - Hounds engaged on the same target circle in opposite directions so the pack flanks instead
 *    of orbiting in one clump. This nudges Enemy's strafe fields (soft coupling: if those private
 *    fields are ever renamed it silently does nothing).
 */
import type { Enemy } from '../../actors/Enemy';

export const BARK_RADIUS = 16;
const BARK_T = 0.38;
const HOUND = /^(warHound|huntingHound)$/;

const lastT = new WeakMap<Enemy, number>();
let flankT = 0;

export function beastPackStep(enemies: readonly Enemy[], dt: number) {
  // bark → alert
  for (const e of enemies) {
    const m = e.move;
    const prev = lastT.get(e) ?? 1e9;
    lastT.set(e, m ? m.t : 1e9);
    if (e.dead || !m || !m.def.id.endsWith('_bark') || !e.target) continue;
    if (!(prev < BARK_T && m.t >= BARK_T)) continue;
    for (const o of enemies) {
      if (o === e || o.dead || o.aware || o.def.passive) continue;
      if (o.pos.distanceTo(e.pos) > BARK_RADIUS) continue;
      o.becomeAware(e.target);
    }
  }
  // flanking: alternate circling direction among hounds sharing a target
  flankT -= dt;
  if (flankT > 0) return;
  flankT = 2.4;
  const byTarget = new Map<unknown, Enemy[]>();
  for (const e of enemies) {
    if (e.dead || !e.aware || !e.target || !HOUND.test(e.def.kind)) continue;
    const l = byTarget.get(e.target) ?? [];
    l.push(e);
    byTarget.set(e.target, l);
  }
  for (const pack of byTarget.values()) {
    if (pack.length < 2) continue;
    pack.forEach((e, i) => {
      const f = e as unknown as { strafeDir?: number; strafeT?: number };
      if (typeof f.strafeDir !== 'number' || typeof f.strafeT !== 'number') return;
      f.strafeDir = i % 2 === 0 ? 1 : -1;
      f.strafeT = 2.4;
    });
  }
}
