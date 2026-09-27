/**
 * The player's arsenal (GDD §4.3, §4.8, §12): one moveset per WeaponClass, every Imprint
 * Technique as a real move, and the spell archetype casts. Clips: src/actors/anim/clips/weapons/*
 * (the active keys of each clip match the `hits` windows below).
 *
 * Conventions
 *  - `dmg` / `posture` are multipliers of the weapon's attack rating (Player.attackPacket /
 *    postureDamage, which also apply the item's postureMult and the heavy charge).
 *  - Two-handed classes author their clips with both hands; every such move has a `_1h` twin
 *    (same windows, clip `<clip>_1h`) that the Player uses while the left hand holds a shield or
 *    off-hand weapon (`resolveMove`).
 *  - Moves are registered into the shared MOVES registry at import.
 */
import type { CueId } from '../audio/contract';
import type { WeaponClass } from '../game/types';
import type { DamageKind, HitSpec, MoveDef, MoveEvent } from './types';
import { MOVES, registerMoves } from './moves';

// ------------------------------------------------------------------ move factory

interface Atk {
  id: string; clip: string; dur: number; stamina: number;
  /** Primary active window (weapon source unless `source` says otherwise). */
  hit?: [number, number];
  dmg?: number; posture?: number; poise?: number; kind?: DamageKind; knock?: number; guardBreak?: boolean;
  source?: HitSpec['source']; sphere?: HitSpec['sphere'];
  /** Extra / explicit hit windows (appended). */
  hits?: HitSpec[];
  motion?: [number, number][]; track?: [number, number];
  cancel: { chain?: number; dodge?: number; free?: number };
  next?: string; hyper?: [number, number, number]; speed?: number; fade?: number;
  swing?: CueId | null; trail?: boolean; events?: { t: number; e: MoveEvent }[];
  guard?: boolean; parry?: [number, number]; walk?: number; iframes?: [number, number];
}

function atk(o: Atk): MoveDef {
  const hits: HitSpec[] = [];
  if (o.hit) hits.push({ start: o.hit[0], end: o.hit[1], source: o.source ?? 'weaponR', sphere: o.sphere, dmg: o.dmg ?? 1, posture: o.posture ?? 1, poise: o.poise ?? 20, kind: o.kind ?? 'slash', knock: o.knock ?? 1, guardBreak: o.guardBreak });
  if (o.hits) hits.push(...o.hits);
  const first = hits.length ? Math.min(...hits.map((h) => h.start)) : 0;
  const last = hits.length ? Math.max(...hits.map((h) => h.end)) : 0;
  const events: { t: number; e: MoveEvent }[] = [...(o.events ?? [])];
  if (hits.length && o.swing !== null) events.push({ t: Math.max(0, first - 0.03), e: { type: 'sfx', cue: o.swing ?? 'swing_light' } });
  const weaponTrail = o.trail ?? hits.some((h) => h.source === 'weaponR' || h.source === 'weaponL');
  if (hits.length && weaponTrail) events.push({ t: Math.max(0, first - 0.02), e: { type: 'trail', on: true } }, { t: last + 0.04, e: { type: 'trail', on: false } });
  const d: MoveDef = {
    id: o.id, clip: o.clip, dur: o.dur, stamina: o.stamina, cancel: o.cancel, events,
    track: o.track ?? (hits.length ? [Math.max(0.05, first - 0.02), 7] : undefined),
  };
  if (hits.length) d.hits = hits;
  if (o.motion) d.motion = o.motion;
  if (o.next) d.next = o.next;
  if (o.hyper) d.hyper = o.hyper;
  if (o.speed) d.speed = o.speed;
  if (o.fade !== undefined) d.fade = o.fade;
  if (o.guard) d.guard = true;
  if (o.parry) d.parry = o.parry;
  if (o.walk !== undefined) d.walk = o.walk;
  if (o.iframes) d.iframes = o.iframes;
  return d;
}

const hitW = (start: number, end: number, dmg: number, posture: number, poise: number, kind: DamageKind, x: Partial<HitSpec> = {}): HitSpec =>
  ({ start, end, source: 'weaponR', dmg, posture, poise, kind, knock: 1.5, ...x });
const aoe = (start: number, end: number, offset: [number, number, number], radius: number, dmg: number, posture: number, poise: number, kind: DamageKind, x: Partial<HitSpec> = {}): HitSpec =>
  ({ start, end, source: 'sphere', sphere: { bone: 'root', offset, radius }, dmg, posture, poise, kind, knock: 4, ...x });
const charge = (id: string, clip: string, dur: number, hyper: number, x: Partial<MoveDef> = {}): MoveDef =>
  ({ id, clip, dur, stamina: 0, track: [dur, 5], hyper: [0.15, dur, hyper], events: [{ t: 0.05, e: { type: 'sfx', cue: 'charge_heavy' } }], ...x });
const fx = (t: number, kind: string): { t: number; e: MoveEvent } => ({ t, e: { type: 'fx', kind } });
const sfx = (t: number, cue: CueId, volume?: number): { t: number; e: MoveEvent } => ({ t, e: { type: 'sfx', cue, volume } });
const custom = (t: number, id: string): { t: number; e: MoveEvent } => ({ t, e: { type: 'custom', id } });
const shake = (t: number, amount: number): { t: number; e: MoveEvent } => ({ t, e: { type: 'shake', amount } });

// ------------------------------------------------------------------ weapon class moves

const A: MoveDef[] = [
  // ---------------------------------------------------------------- straight sword extras
  atk({ id: 'sword_run', clip: 'light3', dur: 0.95, stamina: 18, hit: [0.35, 0.5], dmg: 1.25, posture: 1.4, poise: 32, knock: 2, motion: [[0.3, 0.6], [0.46, 1.7], [0.6, 1.85]], track: [0.3, 4], cancel: { chain: 0.6, dodge: 0.58, free: 0.8 }, swing: 'swing_heavy', next: 'sword_light2' }),
  atk({ id: 'sword_roll', clip: 'light2', dur: 0.76, stamina: 14, hit: [0.23, 0.39], dmg: 1.0, posture: 1.0, poise: 22, motion: [[0.18, 0.3], [0.36, 0.8]], cancel: { chain: 0.42, dodge: 0.44, free: 0.62 }, next: 'sword_light3' }),

  // ---------------------------------------------------------------- curved sword: fast, wide, light posture
  atk({ id: 'curved_light1', clip: 'sabreLight1', dur: 0.64, stamina: 11, hit: [0.16, 0.3], dmg: 0.92, posture: 0.75, poise: 16, motion: [[0.14, 0], [0.28, 0.4], [0.4, 0.45]], cancel: { chain: 0.32, dodge: 0.34, free: 0.5 }, next: 'curved_light2' }),
  atk({ id: 'curved_light2', clip: 'sabreLight2', dur: 0.62, stamina: 11, hit: [0.14, 0.28], dmg: 0.92, posture: 0.75, poise: 16, motion: [[0.12, 0], [0.26, 0.35]], cancel: { chain: 0.3, dodge: 0.32, free: 0.48 }, next: 'curved_light3' }),
  atk({ id: 'curved_light3', clip: 'sabreLight3', dur: 0.8, stamina: 14, hit: [0.27, 0.4], dmg: 1.1, posture: 1.0, poise: 26, knock: 1.6, motion: [[0.2, 0], [0.36, 0.7], [0.5, 0.8]], cancel: { chain: 0.44, dodge: 0.44, free: 0.64 }, next: 'curved_light1', swing: 'swing_heavy' }),
  charge('curved_heavy_charge', 'sabreHeavyCharge', 1.25, 20),
  atk({ id: 'curved_heavy_release', clip: 'sabreHeavyRelease', dur: 0.8, stamina: 20, hit: [0.05, 0.21], dmg: 1.35, posture: 1.6, poise: 40, knock: 2.5, motion: [[0.04, 0], [0.2, 0.8]], hyper: [0, 0.2, 18], cancel: { dodge: 0.42, free: 0.6 }, swing: 'swing_huge' }),
  atk({ id: 'curved_run', clip: 'sabreLight1', dur: 0.64, stamina: 14, hit: [0.16, 0.3], dmg: 1.05, posture: 0.9, poise: 22, motion: [[0.14, 0.5], [0.3, 1.5], [0.45, 1.65]], track: [0.15, 4], cancel: { chain: 0.34, dodge: 0.36, free: 0.52 }, next: 'curved_light2' }),
  atk({ id: 'curved_roll', clip: 'sabreLight2', dur: 0.62, stamina: 11, hit: [0.14, 0.28], dmg: 0.95, posture: 0.8, poise: 18, motion: [[0.12, 0.3], [0.26, 0.7]], cancel: { chain: 0.3, dodge: 0.32, free: 0.48 }, next: 'curved_light3' }),

  // ---------------------------------------------------------------- greatsword: slow, huge posture & poise
  atk({ id: 'great_light1', clip: 'greatLight1', dur: 1.1, stamina: 24, hit: [0.43, 0.59], dmg: 1.25, posture: 1.8, poise: 45, knock: 2.5, motion: [[0.36, 0], [0.56, 0.7], [0.7, 0.8]], track: [0.4, 5], hyper: [0.28, 0.6, 25], cancel: { chain: 0.74, dodge: 0.7, free: 0.92 }, next: 'great_light2', swing: 'swing_heavy' }),
  atk({ id: 'great_light2', clip: 'greatLight2', dur: 1.05, stamina: 24, hit: [0.37, 0.53], dmg: 1.25, posture: 1.8, poise: 45, knock: 2.5, motion: [[0.3, 0], [0.5, 0.6]], track: [0.34, 5], hyper: [0.24, 0.53, 25], cancel: { chain: 0.68, dodge: 0.66, free: 0.86 }, next: 'great_light3', swing: 'swing_heavy' }),
  atk({ id: 'great_light3', clip: 'greatLight3', dur: 1.2, stamina: 28, hit: [0.47, 0.61], dmg: 1.45, posture: 2.2, poise: 60, knock: 3, motion: [[0.4, 0], [0.58, 0.8]], track: [0.44, 5], hyper: [0.3, 0.61, 35], cancel: { chain: 0.8, dodge: 0.76, free: 1.0 }, next: 'great_light1', swing: 'swing_huge', events: [shake(0.58, 0.15)] }),
  charge('great_heavy_charge', 'greatHeavyCharge', 1.5, 60),
  atk({ id: 'great_heavy_release', clip: 'greatHeavyRelease', dur: 1.1, stamina: 34, hit: [0.1, 0.27], dmg: 1.7, posture: 2.8, poise: 75, knock: 4, guardBreak: true, motion: [[0.08, 0], [0.26, 1.0]], hyper: [0, 0.3, 60], cancel: { dodge: 0.68, free: 0.9 }, swing: 'swing_huge', events: [shake(0.24, 0.3)] }),
  atk({ id: 'great_run', clip: 'greatLight3', dur: 1.2, stamina: 30, hit: [0.47, 0.61], dmg: 1.5, posture: 2.3, poise: 60, knock: 3, motion: [[0.3, 0.8], [0.58, 2.2], [0.7, 2.3]], track: [0.4, 3], hyper: [0.2, 0.61, 35], cancel: { chain: 0.8, dodge: 0.76, free: 1.0 }, next: 'great_light1', swing: 'swing_huge' }),

  // ---------------------------------------------------------------- dagger: four quick cuts, short reach
  atk({ id: 'dagger_light1', clip: 'daggerLight1', dur: 0.48, stamina: 9, hit: [0.11, 0.23], dmg: 0.78, posture: 0.5, poise: 10, knock: 0.6, motion: [[0.1, 0], [0.2, 0.3]], track: [0.11, 9], cancel: { chain: 0.25, dodge: 0.26, free: 0.38 }, next: 'dagger_light2' }),
  atk({ id: 'dagger_light2', clip: 'daggerLight2', dur: 0.46, stamina: 9, hit: [0.09, 0.21], dmg: 0.78, posture: 0.5, poise: 10, knock: 0.6, motion: [[0.08, 0], [0.18, 0.25]], track: [0.09, 9], cancel: { chain: 0.23, dodge: 0.24, free: 0.36 }, next: 'dagger_light3' }),
  atk({ id: 'dagger_light3', clip: 'daggerLight3', dur: 0.5, stamina: 10, hit: [0.13, 0.22], dmg: 0.85, posture: 0.6, poise: 12, kind: 'thrust', knock: 0.8, motion: [[0.1, 0], [0.2, 0.4]], track: [0.12, 9], cancel: { chain: 0.26, dodge: 0.28, free: 0.4 }, next: 'dagger_light4' }),
  atk({ id: 'dagger_light4', clip: 'daggerLight4', dur: 0.6, stamina: 12, hit: [0.19, 0.3], dmg: 1.0, posture: 0.8, poise: 18, knock: 1.2, motion: [[0.14, 0], [0.28, 0.5]], track: [0.18, 8], cancel: { chain: 0.36, dodge: 0.34, free: 0.5 }, next: 'dagger_light1' }),
  charge('dagger_heavy_charge', 'daggerHeavyCharge', 1.1, 12),
  atk({ id: 'dagger_heavy_release', clip: 'daggerHeavyRelease', dur: 0.7, stamina: 16, hit: [0.04, 0.15], dmg: 1.2, posture: 1.2, poise: 26, kind: 'thrust', knock: 1.5, motion: [[0.02, 0], [0.12, 0.9]], cancel: { dodge: 0.36, free: 0.52 } }),
  atk({ id: 'dagger_run', clip: 'daggerLight3', dur: 0.5, stamina: 12, hit: [0.13, 0.22], dmg: 1.0, posture: 0.7, poise: 16, kind: 'thrust', motion: [[0.1, 0.6], [0.2, 1.3]], track: [0.12, 4], cancel: { chain: 0.26, dodge: 0.28, free: 0.4 }, next: 'dagger_light4' }),
  atk({ id: 'dagger_roll', clip: 'daggerLight3', dur: 0.5, stamina: 10, hit: [0.13, 0.22], dmg: 0.9, posture: 0.6, poise: 12, kind: 'thrust', motion: [[0.1, 0.2], [0.2, 0.7]], cancel: { chain: 0.26, dodge: 0.28, free: 0.4 }, next: 'dagger_light4' }),

  // ---------------------------------------------------------------- estoc: thrusts with long reach
  atk({ id: 'estoc_light1', clip: 'estocLight1', dur: 0.66, stamina: 12, hit: [0.19, 0.3], dmg: 0.95, posture: 0.8, poise: 18, kind: 'thrust', motion: [[0.16, 0], [0.26, 0.45], [0.36, 0.5]], track: [0.18, 8], cancel: { chain: 0.34, dodge: 0.36, free: 0.52 }, next: 'estoc_light2' }),
  atk({ id: 'estoc_light2', clip: 'estocLight2', dur: 0.64, stamina: 12, hit: [0.17, 0.28], dmg: 0.95, posture: 0.8, poise: 18, kind: 'thrust', motion: [[0.14, 0], [0.24, 0.4]], track: [0.16, 8], cancel: { chain: 0.32, dodge: 0.34, free: 0.5 }, next: 'estoc_light3' }),
  atk({ id: 'estoc_light3', clip: 'estocLight3', dur: 0.85, stamina: 15, hit: [0.3, 0.42], dmg: 1.15, posture: 1.1, poise: 26, kind: 'thrust', knock: 1.8, motion: [[0.26, 0], [0.38, 0.95], [0.5, 1.0]], track: [0.28, 7], cancel: { chain: 0.5, dodge: 0.5, free: 0.7 }, next: 'estoc_light1', swing: 'swing_heavy' }),
  charge('estoc_heavy_charge', 'estocHeavyCharge', 1.25, 18),
  atk({ id: 'estoc_heavy_release', clip: 'estocHeavyRelease', dur: 0.85, stamina: 22, hit: [0.04, 0.17], dmg: 1.5, posture: 1.8, poise: 42, kind: 'thrust', knock: 2.5, motion: [[0.03, 0], [0.14, 1.4], [0.3, 1.5]], hyper: [0, 0.17, 15], cancel: { dodge: 0.46, free: 0.66 }, swing: 'swing_heavy' }),
  atk({ id: 'estoc_run', clip: 'estocLight3', dur: 0.85, stamina: 18, hit: [0.3, 0.42], dmg: 1.3, posture: 1.3, poise: 30, kind: 'thrust', knock: 2, motion: [[0.26, 0.8], [0.38, 2.0], [0.5, 2.1]], track: [0.28, 4], cancel: { chain: 0.5, dodge: 0.5, free: 0.7 }, next: 'estoc_light1', swing: 'swing_heavy' }),
  atk({ id: 'estoc_roll', clip: 'estocLight1', dur: 0.66, stamina: 12, hit: [0.19, 0.3], dmg: 1.0, posture: 0.85, poise: 20, kind: 'thrust', motion: [[0.16, 0.3], [0.26, 0.9]], cancel: { chain: 0.34, dodge: 0.36, free: 0.52 }, next: 'estoc_light2' }),

  // ---------------------------------------------------------------- axe (haft clips)
  atk({ id: 'axe_light1', clip: 'haftLight1', dur: 0.8, stamina: 16, hit: [0.27, 0.39], dmg: 1.1, posture: 1.2, poise: 28, knock: 1.5, motion: [[0.2, 0], [0.36, 0.45]], track: [0.25, 7], cancel: { chain: 0.48, dodge: 0.5, free: 0.66 }, next: 'axe_light2', swing: 'swing_heavy' }),
  atk({ id: 'axe_light2', clip: 'haftLight2', dur: 0.78, stamina: 16, hit: [0.25, 0.37], dmg: 1.1, posture: 1.2, poise: 28, knock: 1.5, motion: [[0.2, 0], [0.34, 0.4]], track: [0.23, 7], cancel: { chain: 0.46, dodge: 0.48, free: 0.64 }, next: 'axe_light3', swing: 'swing_heavy' }),
  atk({ id: 'axe_light3', clip: 'haftLight3', dur: 0.95, stamina: 19, hit: [0.35, 0.47], dmg: 1.3, posture: 1.5, poise: 36, knock: 2, motion: [[0.3, 0], [0.44, 0.6]], track: [0.32, 6], cancel: { chain: 0.6, dodge: 0.6, free: 0.8 }, next: 'axe_light1', swing: 'swing_heavy' }),
  charge('axe_heavy_charge', 'haftHeavyCharge', 1.3, 28),
  atk({ id: 'axe_heavy_release', clip: 'haftHeavyRelease', dur: 0.9, stamina: 26, hit: [0.06, 0.21], dmg: 1.55, posture: 2.2, poise: 52, knock: 3, motion: [[0.05, 0], [0.2, 0.7]], hyper: [0, 0.21, 25], cancel: { dodge: 0.52, free: 0.72 }, swing: 'swing_huge', events: [shake(0.2, 0.18)] }),
  atk({ id: 'axe_run', clip: 'haftLight3', dur: 0.95, stamina: 21, hit: [0.35, 0.47], dmg: 1.35, posture: 1.6, poise: 38, knock: 2, motion: [[0.3, 0.7], [0.44, 1.9]], track: [0.3, 3], cancel: { chain: 0.6, dodge: 0.6, free: 0.8 }, next: 'axe_light1', swing: 'swing_heavy' }),

  // ---------------------------------------------------------------- mace (haft clips): blunt, pressures guards
  atk({ id: 'mace_light1', clip: 'haftLight1', dur: 0.8, stamina: 16, hit: [0.27, 0.39], dmg: 1.05, posture: 1.5, poise: 30, kind: 'strike', guardBreak: true, knock: 1.6, motion: [[0.2, 0], [0.36, 0.45]], track: [0.25, 7], cancel: { chain: 0.48, dodge: 0.5, free: 0.66 }, next: 'mace_light2', swing: 'swing_heavy' }),
  atk({ id: 'mace_light2', clip: 'haftLight2', dur: 0.78, stamina: 16, hit: [0.25, 0.37], dmg: 1.05, posture: 1.5, poise: 30, kind: 'strike', guardBreak: true, knock: 1.6, motion: [[0.2, 0], [0.34, 0.4]], track: [0.23, 7], cancel: { chain: 0.46, dodge: 0.48, free: 0.64 }, next: 'mace_light3', swing: 'swing_heavy' }),
  atk({ id: 'mace_light3', clip: 'haftLight3', dur: 0.95, stamina: 19, hit: [0.35, 0.47], dmg: 1.25, posture: 1.9, poise: 40, kind: 'strike', guardBreak: true, knock: 2.2, motion: [[0.3, 0], [0.44, 0.6]], track: [0.32, 6], cancel: { chain: 0.6, dodge: 0.6, free: 0.8 }, next: 'mace_light1', swing: 'swing_heavy' }),
  charge('mace_heavy_charge', 'haftHeavyCharge', 1.3, 30),
  atk({ id: 'mace_heavy_release', clip: 'haftHeavyRelease', dur: 0.9, stamina: 26, hit: [0.06, 0.21], dmg: 1.5, posture: 2.6, poise: 58, kind: 'strike', guardBreak: true, knock: 3, motion: [[0.05, 0], [0.2, 0.7]], hyper: [0, 0.21, 28], cancel: { dodge: 0.52, free: 0.72 }, swing: 'swing_huge', events: [shake(0.2, 0.2)] }),
  atk({ id: 'mace_run', clip: 'haftLight3', dur: 0.95, stamina: 21, hit: [0.35, 0.47], dmg: 1.3, posture: 2.0, poise: 42, kind: 'strike', guardBreak: true, knock: 2, motion: [[0.3, 0.7], [0.44, 1.9]], track: [0.3, 3], cancel: { chain: 0.6, dodge: 0.6, free: 0.8 }, next: 'mace_light1', swing: 'swing_heavy' }),

  // ---------------------------------------------------------------- hammer (2h): crushing, guard-breaking
  atk({ id: 'hammer_light1', clip: 'hammerLight1', dur: 1.2, stamina: 26, hit: [0.5, 0.62], dmg: 1.3, posture: 2.2, poise: 55, kind: 'strike', guardBreak: true, knock: 3, motion: [[0.4, 0], [0.6, 0.5]], track: [0.46, 5], hyper: [0.3, 0.62, 35], cancel: { chain: 0.82, dodge: 0.78, free: 1.0 }, next: 'hammer_light2', swing: 'swing_huge', events: [shake(0.6, 0.18), fx(0.6, 'slam')] }),
  atk({ id: 'hammer_light2', clip: 'hammerLight2', dur: 1.15, stamina: 26, hit: [0.44, 0.57], dmg: 1.25, posture: 2.0, poise: 50, kind: 'strike', guardBreak: true, knock: 3, motion: [[0.36, 0], [0.54, 0.5]], track: [0.4, 5], hyper: [0.3, 0.57, 30], cancel: { chain: 0.78, dodge: 0.74, free: 0.96 }, next: 'hammer_light1', swing: 'swing_huge' }),
  charge('hammer_heavy_charge', 'hammerHeavyCharge', 1.6, 70),
  atk({ id: 'hammer_heavy_release', clip: 'hammerHeavyRelease', dur: 1.2, stamina: 38, hit: [0.12, 0.26], dmg: 1.85, posture: 3.4, poise: 90, kind: 'strike', guardBreak: true, knock: 4.5, motion: [[0.1, 0], [0.24, 0.6]], hyper: [0, 0.3, 70], cancel: { dodge: 0.7, free: 0.95 }, swing: 'swing_huge', events: [shake(0.24, 0.35), fx(0.24, 'slam')] }),
  atk({ id: 'hammer_run', clip: 'hammerLight1', dur: 1.2, stamina: 28, hit: [0.5, 0.62], dmg: 1.4, posture: 2.4, poise: 60, kind: 'strike', guardBreak: true, knock: 3, motion: [[0.3, 0.8], [0.6, 2.0]], track: [0.4, 3], hyper: [0.2, 0.62, 40], cancel: { chain: 0.82, dodge: 0.78, free: 1.0 }, next: 'hammer_light2', swing: 'swing_huge', events: [fx(0.6, 'slam')] }),

  // ---------------------------------------------------------------- flail: wide arcs that wrap guards (heavy stamina pressure)
  atk({ id: 'flail_light1', clip: 'flailLight1', dur: 0.9, stamina: 18, hit: [0.33, 0.46], dmg: 1.1, posture: 1.3, poise: 30, kind: 'strike', guardBreak: true, knock: 1.5, motion: [[0.26, 0], [0.44, 0.4]], track: [0.3, 6], cancel: { chain: 0.54, dodge: 0.56, free: 0.74 }, next: 'flail_light2', swing: 'swing_heavy', events: [sfx(0.2, 'chain_rattle', 0.7)] }),
  atk({ id: 'flail_light2', clip: 'flailLight2', dur: 0.88, stamina: 18, hit: [0.31, 0.44], dmg: 1.1, posture: 1.3, poise: 30, kind: 'strike', guardBreak: true, knock: 1.5, motion: [[0.26, 0], [0.42, 0.4]], track: [0.28, 6], cancel: { chain: 0.52, dodge: 0.54, free: 0.72 }, next: 'flail_light3', swing: 'swing_heavy', events: [sfx(0.2, 'chain_rattle', 0.7)] }),
  atk({ id: 'flail_light3', clip: 'flailLight3', dur: 1.0, stamina: 21, hit: [0.4, 0.52], dmg: 1.3, posture: 1.6, poise: 40, kind: 'strike', guardBreak: true, knock: 2, motion: [[0.32, 0], [0.5, 0.5]], track: [0.36, 6], cancel: { chain: 0.64, dodge: 0.64, free: 0.84 }, next: 'flail_light1', swing: 'swing_heavy', events: [sfx(0.26, 'chain_rattle', 0.7)] }),
  charge('flail_heavy_charge', 'flailHeavyCharge', 1.25, 25, { events: [sfx(0.05, 'charge_heavy'), sfx(0.2, 'chain_rattle'), sfx(0.7, 'chain_rattle')] }),
  atk({ id: 'flail_heavy_release', clip: 'flailHeavyRelease', dur: 0.95, stamina: 26, hit: [0.07, 0.2], dmg: 1.6, posture: 2.4, poise: 55, kind: 'strike', guardBreak: true, knock: 3, motion: [[0.05, 0], [0.18, 0.6]], hyper: [0, 0.2, 25], cancel: { dodge: 0.56, free: 0.76 }, swing: 'swing_huge', events: [shake(0.18, 0.2)] }),
  atk({ id: 'flail_run', clip: 'flailLight3', dur: 1.0, stamina: 22, hit: [0.4, 0.52], dmg: 1.35, posture: 1.7, poise: 42, kind: 'strike', guardBreak: true, knock: 2, motion: [[0.3, 0.7], [0.5, 1.9]], track: [0.36, 3], cancel: { chain: 0.64, dodge: 0.64, free: 0.84 }, next: 'flail_light1', swing: 'swing_heavy' }),

  // ---------------------------------------------------------------- spear (2h; `_1h` with a shield)
  atk({ id: 'spear_light1', clip: 'spearLight1', dur: 0.72, stamina: 13, hit: [0.2, 0.32], dmg: 0.95, posture: 0.9, poise: 20, kind: 'thrust', knock: 1.2, motion: [[0.18, 0], [0.28, 0.5], [0.4, 0.55]], track: [0.2, 8], cancel: { chain: 0.36, dodge: 0.38, free: 0.56 }, next: 'spear_light2' }),
  atk({ id: 'spear_light2', clip: 'spearLight2', dur: 0.7, stamina: 13, hit: [0.18, 0.3], dmg: 0.95, posture: 0.9, poise: 20, kind: 'thrust', knock: 1.2, motion: [[0.16, 0], [0.26, 0.45]], track: [0.18, 8], cancel: { chain: 0.34, dodge: 0.36, free: 0.54 }, next: 'spear_light3' }),
  atk({ id: 'spear_light3', clip: 'spearLight3', dur: 0.9, stamina: 16, hit: [0.29, 0.42], dmg: 1.15, posture: 1.2, poise: 30, kind: 'thrust', knock: 2, motion: [[0.26, 0], [0.38, 1.0], [0.5, 1.05]], track: [0.28, 7], cancel: { chain: 0.52, dodge: 0.52, free: 0.72 }, next: 'spear_light1', swing: 'swing_heavy' }),
  charge('spear_heavy_charge', 'spearHeavyCharge', 1.3, 22),
  atk({ id: 'spear_heavy_release', clip: 'spearHeavyRelease', dur: 0.95, stamina: 22, hit: [0.04, 0.17], dmg: 1.45, posture: 2.0, poise: 45, kind: 'thrust', knock: 3, motion: [[0.03, 0], [0.14, 1.3], [0.3, 1.4]], hyper: [0, 0.17, 18], cancel: { dodge: 0.5, free: 0.72 }, swing: 'swing_heavy' }),
  atk({ id: 'spear_run', clip: 'spearLight3', dur: 0.9, stamina: 18, hit: [0.29, 0.42], dmg: 1.3, posture: 1.4, poise: 34, kind: 'thrust', knock: 2.5, motion: [[0.26, 0.8], [0.38, 2.2], [0.5, 2.3]], track: [0.28, 4], cancel: { chain: 0.52, dodge: 0.52, free: 0.72 }, next: 'spear_light1', swing: 'swing_heavy' }),
  /** Spear + shield: thrust while the guard stays up. */
  atk({ id: 'spear_guard_thrust', clip: 'spearGuardThrust', dur: 0.75, stamina: 14, hit: [0.18, 0.31], dmg: 0.85, posture: 0.8, poise: 18, kind: 'thrust', knock: 1, guard: true, motion: [[0.16, 0], [0.26, 0.2]], track: [0.18, 8], cancel: { chain: 0.4, dodge: 0.42, free: 0.6 }, next: 'spear_guard_thrust' }),

  // ---------------------------------------------------------------- halberd (2h): sweep, thrust, chop
  atk({ id: 'halberd_light1', clip: 'halberdLight1', dur: 1.0, stamina: 20, hit: [0.35, 0.53], dmg: 1.15, posture: 1.4, poise: 35, knock: 2, motion: [[0.3, 0], [0.5, 0.4]], track: [0.32, 6], hyper: [0.3, 0.5, 20], cancel: { chain: 0.66, dodge: 0.64, free: 0.84 }, next: 'halberd_light2', swing: 'swing_heavy' }),
  atk({ id: 'halberd_light2', clip: 'halberdLight2', dur: 0.8, stamina: 17, hit: [0.22, 0.34], dmg: 1.05, posture: 1.2, poise: 30, kind: 'thrust', knock: 1.8, motion: [[0.2, 0], [0.3, 0.6]], track: [0.22, 8], cancel: { chain: 0.44, dodge: 0.46, free: 0.64 }, next: 'halberd_light3' }),
  atk({ id: 'halberd_light3', clip: 'halberdLight3', dur: 1.1, stamina: 22, hit: [0.47, 0.59], dmg: 1.3, posture: 1.8, poise: 45, knock: 2.5, motion: [[0.4, 0], [0.56, 0.5]], track: [0.44, 5], hyper: [0.3, 0.59, 25], cancel: { chain: 0.72, dodge: 0.7, free: 0.92 }, next: 'halberd_light1', swing: 'swing_huge' }),
  charge('halberd_heavy_charge', 'halberdHeavyCharge', 1.5, 40),
  atk({ id: 'halberd_heavy_release', clip: 'halberdHeavyRelease', dur: 1.15, stamina: 32, hit: [0.08, 0.32], dmg: 1.6, posture: 2.4, poise: 60, knock: 3.5, motion: [[0.08, 0], [0.3, 0.8]], hyper: [0, 0.32, 40], cancel: { dodge: 0.66, free: 0.9 }, swing: 'swing_huge' }),
  atk({ id: 'halberd_run', clip: 'halberdLight2', dur: 0.8, stamina: 20, hit: [0.22, 0.34], dmg: 1.25, posture: 1.4, poise: 36, kind: 'thrust', knock: 2.4, motion: [[0.2, 0.8], [0.3, 2.0], [0.45, 2.1]], track: [0.22, 4], cancel: { chain: 0.44, dodge: 0.46, free: 0.64 }, next: 'halberd_light3' }),

  // ---------------------------------------------------------------- catalysts (melee heavies)
  charge('cat_heavy_charge', 'catHeavyCharge', 0.9, 10, { track: [0.9, 5] }),
  atk({ id: 'cat_heavy_release', clip: 'catHeavyRelease', dur: 0.75, stamina: 22, hit: [0.08, 0.22], dmg: 1.4, posture: 1.9, poise: 40, kind: 'strike', knock: 2.5, motion: [[0.05, 0], [0.2, 0.5]], cancel: { dodge: 0.45, free: 0.6 }, swing: 'swing_heavy' }),
  charge('bell_heavy_charge', 'bellRaise', 0.9, 8),
  atk({ id: 'bell_heavy_release', clip: 'bellBash', dur: 0.7, stamina: 16, hit: [0.08, 0.2], source: 'sphere', sphere: { bone: 'handR', offset: [0, -0.07, 0.19], radius: 0.22 }, dmg: 1.3, posture: 1.4, poise: 30, kind: 'strike', knock: 1.8, motion: [[0.05, 0], [0.18, 0.4]], cancel: { dodge: 0.42, free: 0.56 }, trail: false, events: [sfx(0.18, 'stillbell_ring', 0.5)] }),
  charge('censer_heavy_charge', 'censerCharge', 1.1, 12, { events: [sfx(0.05, 'charge_heavy'), sfx(0.2, 'chain_rattle', 0.6), fx(0.4, 'embers')] }),
  atk({ id: 'censer_heavy_release', clip: 'censerSwing', dur: 0.85, stamina: 20, hit: [0.06, 0.22], dmg: 1.35, posture: 1.3, poise: 35, kind: 'strike', knock: 2, motion: [[0.05, 0], [0.2, 0.5]], cancel: { dodge: 0.48, free: 0.66 }, swing: 'swing_heavy', events: [fx(0.1, 'embers'), fx(0.16, 'embers'), fx(0.22, 'embers')] }),

  // ---------------------------------------------------------------- bow & crossbow (custom 'shoot' / 'reload')
  atk({ id: 'bow_shoot', clip: 'bowShoot', dur: 0.9, stamina: 10, track: [0.42, 10], walk: 0.25, cancel: { chain: 0.62, dodge: 0.44, free: 0.7 }, events: [sfx(0.14, 'bow_draw'), custom(0.42, 'shoot')] }),
  atk({ id: 'bow_shoot_aimed', clip: 'bowShootAimed', dur: 0.55, stamina: 8, walk: 0.35, cancel: { chain: 0.42, dodge: 0.12, free: 0.5 }, events: [custom(0.05, 'shoot'), sfx(0.3, 'bow_draw', 0.6)] }),
  { id: 'bow_heavy_charge', clip: 'bowDrawCharge', dur: 1.6, stamina: 0, walk: 0.15, track: [1.6, 6], events: [{ t: 0.1, e: { type: 'sfx', cue: 'bow_draw' } }] },
  atk({ id: 'bow_heavy_release', clip: 'bowRelease', dur: 0.62, stamina: 14, walk: 0.2, cancel: { chain: 0.36, dodge: 0.2, free: 0.46 }, events: [custom(0.03, 'shoot')] }),
  atk({ id: 'xbow_shoot', clip: 'xbowShoot', dur: 1.6, stamina: 8, track: [0.14, 12], walk: 0.2, cancel: { dodge: 0.3, chain: 1.45, free: 1.5 }, events: [custom(0.14, 'shoot'), sfx(0.62, 'chain_rattle', 0.8), custom(1.3, 'reload')] }),
  atk({ id: 'xbow_reload', clip: 'xbowReload', dur: 1.25, stamina: 0, walk: 0.3, cancel: { dodge: 0.1, chain: 1.12, free: 1.15 }, events: [sfx(0.4, 'chain_rattle', 0.8), custom(1.05, 'reload')] }),
  { id: 'xbow_heavy_charge', clip: 'xbowBrace', dur: 1.6, stamina: 0, walk: 0.1, track: [1.6, 6], events: [{ t: 0.1, e: { type: 'sfx', cue: 'charge_heavy', volume: 0.5 } }] },
  atk({ id: 'xbow_heavy_release', clip: 'xbowBraceRelease', dur: 1.5, stamina: 10, walk: 0.15, cancel: { dodge: 0.3, chain: 1.35, free: 1.4 }, events: [custom(0.04, 'shoot'), sfx(0.5, 'chain_rattle', 0.8), custom(1.2, 'reload')] }),

  // ---------------------------------------------------------------- fists (unarmed fallback)
  atk({ id: 'fist_light1', clip: 'fistLight1', dur: 0.45, stamina: 8, hit: [0.09, 0.18], dmg: 0.9, posture: 0.6, poise: 12, kind: 'strike', knock: 0.8, motion: [[0.08, 0], [0.16, 0.25]], track: [0.1, 9], cancel: { chain: 0.2, dodge: 0.24, free: 0.36 }, next: 'fist_light2', trail: false }),
  atk({ id: 'fist_light2', clip: 'fistLight2', dur: 0.48, stamina: 8, hit: [0.1, 0.19], source: 'weaponL', dmg: 0.9, posture: 0.6, poise: 12, kind: 'strike', knock: 0.8, motion: [[0.08, 0], [0.17, 0.25]], track: [0.1, 9], cancel: { chain: 0.21, dodge: 0.25, free: 0.38 }, next: 'fist_light3', trail: false }),
  atk({ id: 'fist_light3', clip: 'fistLight3', dur: 0.62, stamina: 10, hit: [0.18, 0.29], dmg: 1.05, posture: 0.9, poise: 20, kind: 'strike', knock: 1.4, motion: [[0.12, 0], [0.26, 0.3]], track: [0.16, 8], cancel: { chain: 0.36, dodge: 0.38, free: 0.52 }, next: 'fist_light1', trail: false }),
  charge('fist_heavy_charge', 'fistHeavyCharge', 1.1, 10),
  atk({ id: 'fist_heavy_release', clip: 'fistHeavyRelease', dur: 0.8, stamina: 16, hit: [0.05, 0.16], dmg: 1.3, posture: 1.4, poise: 38, kind: 'strike', knock: 2.5, motion: [[0.04, 0], [0.14, 0.6]], cancel: { dodge: 0.42, free: 0.6 }, trail: false, swing: 'swing_heavy' }),

  // ---------------------------------------------------------------- weapon parries (no shield / off-hand)
  atk({ id: 'parry_great', clip: 'parryGreat', dur: 0.72, stamina: 12, parry: [0.08, 0.28], cancel: { free: 0.62 }, events: [sfx(0.05, 'parry_attempt')] }),
  atk({ id: 'parry_pole', clip: 'parryPole', dur: 0.72, stamina: 12, parry: [0.08, 0.28], cancel: { free: 0.62 }, events: [sfx(0.05, 'parry_attempt')] }),
];

// ------------------------------------------------------------------ Imprint Techniques

const T: MoveDef[] = [
  /** Oathbound Lunge with a polearm (sword/estoc/curved use the existing tech_lunge). */
  atk({ id: 'tech_lunge_pole', clip: 'spearLight3', dur: 0.95, stamina: 20, hit: [0.29, 0.43], dmg: 1.55, posture: 2.4, poise: 40, kind: 'thrust', knock: 2.5, motion: [[0.26, 0], [0.38, 2.0], [0.5, 2.2]], track: [0.28, 8], hyper: [0.2, 0.43, 30], cancel: { dodge: 0.62, free: 0.78 }, swing: 'swing_heavy', events: [sfx(0.08, 'technique')] }),
  atk({
    id: 'tech_measured_great', clip: 'measuredCutGreat', dur: 1.2, stamina: 26,
    hits: [hitW(0.27, 0.4, 1.2, 1.8, 35, 'slash', { knock: 1.5, group: 0 }), hitW(0.61, 0.74, 1.35, 2.0, 40, 'slash', { knock: 2, group: 1 })],
    motion: [[0.1, 0], [0.32, 2.2], [0.6, 2.4], [0.72, 3.0]], track: [0.6, 6], hyper: [0.2, 0.75, 35], cancel: { dodge: 0.86, free: 1.0 }, swing: 'swing_heavy', events: [sfx(0.05, 'technique'), sfx(0.58, 'swing_heavy')],
  }),
  /** Riposte Stance: held low guard; any melee blow in it is parried and answered (Player). */
  atk({ id: 'tech_riposte_stance', clip: 'riposteStance', dur: 2.2, stamina: 12, parry: [0.16, 2.2], walk: 0, cancel: { dodge: 0.2, chain: 0.3, free: 0.3 }, events: [sfx(0.05, 'technique'), sfx(0.16, 'parry_attempt', 0.5)] }),
  atk({ id: 'tech_riposte_stance_shield', clip: 'riposteStanceShield', dur: 2.2, stamina: 12, parry: [0.16, 2.2], walk: 0, cancel: { dodge: 0.2, chain: 0.3, free: 0.3 }, events: [sfx(0.05, 'technique'), sfx(0.16, 'parry_attempt', 0.5)] }),
  atk({ id: 'tech_riposte_release', clip: 'riposteRelease', dur: 0.35, stamina: 0, cancel: { chain: 0.15, dodge: 0.05, free: 0.2 } }),
  /** Bell Breaker: leap and crush; an AoE shock where it lands. */
  atk({
    id: 'tech_bell_breaker', clip: 'bellBreaker', dur: 1.6, stamina: 32,
    hits: [hitW(0.71, 0.84, 1.5, 3.0, 80, 'strike', { guardBreak: true, knock: 4, group: 0 }), aoe(0.8, 0.87, [0, 0.4, 1.35], 1.9, 0.9, 2.2, 70, 'strike', { knock: 5, group: 1 })],
    motion: [[0.3, 0], [0.72, 2.2], [0.8, 2.4]], track: [0.6, 5], hyper: [0.25, 0.9, 60], cancel: { dodge: 1.25, free: 1.4 }, swing: 'swing_huge',
    events: [sfx(0.05, 'technique'), fx(0.8, 'slam'), shake(0.8, 0.45), sfx(0.8, 'hit_stone', 1.4)],
  }),
  /** Rending Sweep: the whole body turns a full circle (see SPIN). */
  atk({ id: 'tech_rending_sweep', clip: 'rendingSweep', dur: 1.4, stamina: 30, hit: [0.42, 0.96], dmg: 1.25, posture: 1.6, poise: 45, knock: 3.5, motion: [[0.45, 0], [0.9, 0.5]], track: [0.3, 6], hyper: [0.3, 1.0, 45], cancel: { dodge: 1.1, free: 1.25 }, swing: 'swing_huge', events: [sfx(0.05, 'technique'), sfx(0.7, 'swing_heavy')] }),
  atk({ id: 'tech_rending_sweep_great', clip: 'rendingSweepGreat', dur: 1.4, stamina: 30, hit: [0.42, 0.96], dmg: 1.25, posture: 1.6, poise: 45, knock: 3.5, motion: [[0.45, 0], [0.9, 0.5]], track: [0.3, 6], hyper: [0.3, 1.0, 45], cancel: { dodge: 1.1, free: 1.25 }, swing: 'swing_huge', events: [sfx(0.05, 'technique'), sfx(0.7, 'swing_heavy')] }),
  /** Greyford Flourish: three quick slashes; hard to interrupt. */
  atk({
    id: 'tech_flourish', clip: 'greyfordFlourish', dur: 1.0, stamina: 20,
    hits: [hitW(0.16, 0.27, 0.75, 0.8, 18, 'slash', { group: 0 }), hitW(0.38, 0.47, 0.75, 0.8, 18, 'slash', { group: 1 }), hitW(0.59, 0.69, 0.85, 1.0, 24, 'slash', { group: 2 })],
    motion: [[0.1, 0], [0.3, 0.5], [0.5, 0.8], [0.7, 1.2]], track: [0.55, 8], hyper: [0.1, 0.75, 40], cancel: { dodge: 0.8, free: 0.9 },
    events: [sfx(0.04, 'technique'), sfx(0.36, 'swing_light'), sfx(0.57, 'swing_light')],
  }),
  /** Grave Knell: gather (held technique button), then a tolling crush that staggers those beside the target. */
  charge('tech_knell_charge', 'knellCharge', 1.4, 30, { events: [sfx(0.05, 'technique'), sfx(0.3, 'charge_heavy')] }),
  atk({
    id: 'tech_knell_strike', clip: 'knellStrike', dur: 1.1, stamina: 0,
    hits: [hitW(0.09, 0.22, 1.4, 3.2, 70, 'strike', { guardBreak: true, knock: 3, group: 0 }), aoe(0.18, 0.25, [0, 0.5, 1.25], 1.5, 0.6, 1.6, 50, 'holy', { group: 1 })],
    motion: [[0.08, 0], [0.2, 0.4]], hyper: [0, 0.25, 40], cancel: { dodge: 0.66, free: 0.9 }, swing: 'swing_huge',
    events: [sfx(0.2, 'forge_hammer', 1.4), fx(0.2, 'toll'), shake(0.2, 0.3)],
  }),
  /** Unbroken Links: two full turns, one hit per turn; poise holds. */
  atk({
    id: 'tech_chain_whirl', clip: 'chainWhirl', dur: 1.8, stamina: 30,
    // The first turn holds foes in (no knockback) so the second turn lands too.
    hits: [hitW(0.35, 0.85, 0.9, 1.1, 30, 'strike', { knock: 0, group: 0 }), hitW(0.85, 1.36, 0.95, 1.2, 34, 'strike', { knock: 3, group: 1 })],
    track: [0.3, 6], hyper: [0.25, 1.4, 60], cancel: { dodge: 1.55, free: 1.7 }, swing: 'swing_heavy',
    events: [sfx(0.05, 'technique'), sfx(0.3, 'chain_rattle'), sfx(0.8, 'chain_rattle'), sfx(1.3, 'chain_rattle')],
  }),
  /** Pinning Shot (bow / crossbow): a barbed shot that roots its target (Player 'pinShot'). */
  atk({ id: 'tech_pinning_shot', clip: 'bowShoot', dur: 1.05, stamina: 16, speed: 0.86, track: [0.49, 10], walk: 0.1, cancel: { dodge: 0.55, free: 0.82 }, events: [sfx(0.05, 'technique'), sfx(0.16, 'bow_draw'), custom(0.49, 'pinShot')] }),
  atk({ id: 'tech_pinning_shot_x', clip: 'xbowShoot', dur: 1.6, stamina: 16, track: [0.14, 12], walk: 0.1, cancel: { dodge: 0.3, chain: 1.45, free: 1.5 }, events: [sfx(0.02, 'technique'), custom(0.14, 'pinShot'), sfx(0.62, 'chain_rattle', 0.8), custom(1.3, 'reload')] }),
  /** Impaling Charge: run the point in (legs from locomotion); anything in the path is struck too. */
  atk({
    id: 'tech_impaling_charge', clip: 'impalingCharge', dur: 1.5, stamina: 28,
    hits: [hitW(0.3, 0.95, 1.0, 1.4, 40, 'thrust', { knock: 2.5, group: 0 }), hitW(0.96, 1.1, 1.8, 3.0, 70, 'thrust', { knock: 4, group: 1 })],
    motion: [[0.15, 0], [0.9, 4.6], [1.05, 5.2]], track: [0.9, 3], hyper: [0.1, 1.1, 50], cancel: { dodge: 1.2, free: 1.35 }, swing: 'swing_heavy',
    events: [sfx(0.05, 'technique'), sfx(0.94, 'swing_huge')],
  }),
  /** Ember Edge: 20 s weapon fire (Player 'technique' event). */
  atk({ id: 'tech_ember_edge', clip: 'emberEdge', dur: 1.2, stamina: 6, walk: 0.3, cancel: { dodge: 0.9, chain: 1.0, free: 1.0 }, events: [sfx(0.05, 'technique'), { t: 0.8, e: { type: 'technique' } }, sfx(0.78, 'fire_burst', 0.4)] }),
  /** Vow Parry: long-window parry with the blade itself. */
  atk({ id: 'tech_vow_parry', clip: 'vowParry', dur: 0.8, stamina: 12, parry: [0.05, 0.42], cancel: { free: 0.7 }, events: [sfx(0.03, 'parry_attempt')] }),
  /** Vow's Pursuit: three advancing thrusts; the last pierces a raised guard. */
  atk({
    id: 'tech_vow_pursuit', clip: 'vowPursuit', dur: 1.3, stamina: 24,
    hits: [hitW(0.19, 0.28, 0.8, 0.9, 22, 'thrust', { group: 0 }), hitW(0.43, 0.52, 0.8, 0.9, 22, 'thrust', { group: 1 }), hitW(0.73, 0.85, 1.2, 1.8, 40, 'thrust', { guardBreak: true, knock: 2.5, group: 2 })],
    motion: [[0.14, 0], [0.22, 0.7], [0.36, 0.8], [0.46, 1.5], [0.62, 1.6], [0.76, 2.6], [0.9, 2.7]], track: [0.7, 7], hyper: [0.1, 0.85, 25], cancel: { dodge: 1.0, free: 1.15 },
    events: [sfx(0.04, 'technique'), sfx(0.41, 'swing_light'), sfx(0.7, 'swing_heavy')],
  }),
  /** Stilled Breath: settle the draw; the next 3 shots fly faster and hit harder. */
  atk({ id: 'tech_stilled_breath', clip: 'stilledBreath', dur: 1.3, stamina: 18, walk: 0.1, cancel: { dodge: 0.95, chain: 1.1, free: 1.1 }, events: [sfx(0.05, 'technique'), sfx(0.2, 'bow_draw'), { t: 0.9, e: { type: 'technique' } }] }),
  atk({ id: 'tech_stilled_breath_x', clip: 'stilledBreathX', dur: 1.3, stamina: 18, walk: 0.1, cancel: { dodge: 0.95, chain: 1.1, free: 1.1 }, events: [sfx(0.05, 'technique'), { t: 0.9, e: { type: 'technique' } }] }),
];

// ------------------------------------------------------------------ spell archetype casts

const C: MoveDef[] = [
  atk({ id: 'cast_volley', clip: 'castVolley', dur: 0.9, stamina: 0, track: [0.3, 9], walk: 0.2, cancel: { chain: 0.62, dodge: 0.55, free: 0.72 }, events: [{ t: 0.3, e: { type: 'cast' } }, { t: 0.36, e: { type: 'cast' } }, { t: 0.42, e: { type: 'cast' } }] }),
  atk({ id: 'cast_lance', clip: 'castLance', dur: 1.3, stamina: 0, track: [0.7, 5], cancel: { chain: 1.0, dodge: 0.95, free: 1.1 }, events: [sfx(0.2, 'ward_up', 0.6), { t: 0.72, e: { type: 'cast' } }] }),
  atk({ id: 'cast_sky', clip: 'castSky', dur: 1.2, stamina: 0, track: [0.6, 6], walk: 0.1, cancel: { chain: 0.9, dodge: 0.85, free: 1.0 }, events: [{ t: 0.66, e: { type: 'cast' } }] }),
  atk({ id: 'cast_toll', clip: 'castToll', dur: 1.2, stamina: 0, cancel: { dodge: 0.85, free: 1.0 }, events: [{ t: 0.56, e: { type: 'cast' } }, shake(0.56, 0.2)] }),
  atk({ id: 'cast_ring', clip: 'castRing', dur: 0.8, stamina: 0, track: [0.3, 9], walk: 0.25, cancel: { chain: 0.5, dodge: 0.5, free: 0.62 }, events: [{ t: 0.34, e: { type: 'cast' } }] }),
  atk({ id: 'cast_bless', clip: 'castBless', dur: 1.1, stamina: 0, walk: 0.2, cancel: { dodge: 0.8, free: 0.95 }, events: [{ t: 0.62, e: { type: 'cast' } }] }),
];

/** Moves authored with both hands: each gets a one-handed twin `<id>_1h` on clip `<clip>_1h`. */
const TWIN_CLIPS = new Set([
  'greatLight1', 'greatLight2', 'greatLight3', 'greatHeavyCharge', 'greatHeavyRelease',
  'hammerLight1', 'hammerLight2', 'hammerHeavyCharge', 'hammerHeavyRelease',
  'spearLight1', 'spearLight2', 'spearLight3', 'spearHeavyCharge', 'spearHeavyRelease',
  'halberdLight1', 'halberdLight2', 'halberdLight3', 'halberdHeavyCharge', 'halberdHeavyRelease',
  'bellBreaker', 'measuredCutGreat', 'rendingSweep', 'rendingSweepGreat', 'knellCharge', 'knellStrike', 'impalingCharge',
  'parryGreat', 'parryPole', 'vowPursuit',
]);

export const ARSENAL_MOVES: Record<string, MoveDef> = {};
for (const d of [...A, ...T, ...C]) {
  ARSENAL_MOVES[d.id] = d;
  if (TWIN_CLIPS.has(d.clip)) ARSENAL_MOVES[d.id + '_1h'] = { ...d, id: d.id + '_1h', clip: d.clip + '_1h', next: d.next ? d.next + '_1h' : undefined };
}
registerMoves(ARSENAL_MOVES);

/** Root yaw spins (radians over [t0, t1]) — the Player turns its root so the blade sweeps a full circle. */
export const SPIN: Record<string, [number, number, number]> = {
  tech_rending_sweep: [0.45, 0.9, Math.PI * 2], tech_rending_sweep_great: [0.45, 0.9, Math.PI * 2],
  tech_rending_sweep_1h: [0.45, 0.9, Math.PI * 2], tech_rending_sweep_great_1h: [0.45, 0.9, Math.PI * 2],
  tech_chain_whirl: [0.35, 1.35, Math.PI * 4],
};

// ------------------------------------------------------------------ movesets

export interface Moveset {
  cls: WeaponClass;
  /** STANCES key (idle / locomotion hold). */
  stance: string;
  /** Light chain move ids (each move's `next` continues the chain). */
  light: string[];
  heavyCharge: string;
  heavyRelease: string;
  running?: string;
  rolling?: string;
  /** Guard overlay clip without a shield (a shield always uses the shield guard). */
  guardClip: string;
  /** Parry move without a shield. */
  parry: string;
  /** Clips hold the weapon in both hands (moves have `_1h` twins for a busy off-hand). */
  twoHanded?: boolean;
  /** Critical multiplier floor for this class (the item's own value is used if higher). */
  critMult?: number;
  ranged?: 'bow' | 'crossbow';
  /** Light casts the attuned spell (catalysts). */
  casts?: boolean;
  /** With a shield: light while guarding (spear). */
  guardAttack?: string;
  /** Blocked-hit pressure on the defender: extra stamina (× hit damage) and posture (× posture damage). */
  guardPressure?: { stamina: number; posture: number };
  /** Blocked hits curl around the guard: this share of the damage goes through as chip. */
  wrapChip?: number;
}

const sword: Moveset = {
  cls: 'straightSword', stance: 'sword', light: ['sword_light1', 'sword_light2', 'sword_light3'],
  heavyCharge: 'sword_heavy_charge', heavyRelease: 'sword_heavy_release', running: 'sword_run', rolling: 'sword_roll',
  guardClip: 'guardBlade', parry: 'parry_hand', critMult: 3.0,
};
const catalyst = (cls: WeaponClass, stance: string, heavy: [string, string]): Moveset => ({
  cls, stance, light: ['staff_light'], heavyCharge: heavy[0], heavyRelease: heavy[1], guardClip: 'guardStaff', parry: 'parry_hand', casts: true, critMult: 2.2,
});

export const MOVESETS: Record<WeaponClass, Moveset> = {
  straightSword: sword,
  curvedSword: {
    cls: 'curvedSword', stance: 'sabre', light: ['curved_light1', 'curved_light2', 'curved_light3'],
    heavyCharge: 'curved_heavy_charge', heavyRelease: 'curved_heavy_release', running: 'curved_run', rolling: 'curved_roll',
    guardClip: 'guardBlade', parry: 'parry_hand', critMult: 2.9,
  },
  greatsword: {
    cls: 'greatsword', stance: 'greatsword', light: ['great_light1', 'great_light2', 'great_light3'],
    heavyCharge: 'great_heavy_charge', heavyRelease: 'great_heavy_release', running: 'great_run',
    guardClip: 'guardGreat', parry: 'parry_great', twoHanded: true, critMult: 2.6,
  },
  dagger: {
    cls: 'dagger', stance: 'dagger', light: ['dagger_light1', 'dagger_light2', 'dagger_light3', 'dagger_light4'],
    heavyCharge: 'dagger_heavy_charge', heavyRelease: 'dagger_heavy_release', running: 'dagger_run', rolling: 'dagger_roll',
    guardClip: 'guardBlade', parry: 'parry_hand', critMult: 3.5,
  },
  estoc: {
    cls: 'estoc', stance: 'estoc', light: ['estoc_light1', 'estoc_light2', 'estoc_light3'],
    heavyCharge: 'estoc_heavy_charge', heavyRelease: 'estoc_heavy_release', running: 'estoc_run', rolling: 'estoc_roll',
    guardClip: 'guardBlade', parry: 'parry_hand', critMult: 3.2,
  },
  axe: {
    cls: 'axe', stance: 'haft', light: ['axe_light1', 'axe_light2', 'axe_light3'],
    heavyCharge: 'axe_heavy_charge', heavyRelease: 'axe_heavy_release', running: 'axe_run',
    guardClip: 'guardBlade', parry: 'parry_hand', critMult: 2.8,
  },
  mace: {
    cls: 'mace', stance: 'haft', light: ['mace_light1', 'mace_light2', 'mace_light3'],
    heavyCharge: 'mace_heavy_charge', heavyRelease: 'mace_heavy_release', running: 'mace_run',
    guardClip: 'guardBlade', parry: 'parry_hand', critMult: 2.8, guardPressure: { stamina: 0.25, posture: 0.5 },
  },
  hammer: {
    cls: 'hammer', stance: 'hammer', light: ['hammer_light1', 'hammer_light2'],
    heavyCharge: 'hammer_heavy_charge', heavyRelease: 'hammer_heavy_release', running: 'hammer_run',
    guardClip: 'guardGreat', parry: 'parry_great', twoHanded: true, critMult: 2.6, guardPressure: { stamina: 0.35, posture: 0.6 },
  },
  flail: {
    cls: 'flail', stance: 'flail', light: ['flail_light1', 'flail_light2', 'flail_light3'],
    heavyCharge: 'flail_heavy_charge', heavyRelease: 'flail_heavy_release', running: 'flail_run',
    guardClip: 'guardBlade', parry: 'parry_hand', critMult: 2.5, guardPressure: { stamina: 0.3, posture: 0.3 }, wrapChip: 0.3,
  },
  spear: {
    cls: 'spear', stance: 'pole', light: ['spear_light1', 'spear_light2', 'spear_light3'],
    heavyCharge: 'spear_heavy_charge', heavyRelease: 'spear_heavy_release', running: 'spear_run',
    guardClip: 'guardPole', parry: 'parry_pole', twoHanded: true, critMult: 2.8, guardAttack: 'spear_guard_thrust',
  },
  halberd: {
    cls: 'halberd', stance: 'pole', light: ['halberd_light1', 'halberd_light2', 'halberd_light3'],
    heavyCharge: 'halberd_heavy_charge', heavyRelease: 'halberd_heavy_release', running: 'halberd_run',
    guardClip: 'guardPole', parry: 'parry_pole', twoHanded: true, critMult: 2.7,
  },
  staff: catalyst('staff', 'staff', ['cat_heavy_charge', 'cat_heavy_release']),
  bell: catalyst('bell', 'staff', ['bell_heavy_charge', 'bell_heavy_release']),
  censer: catalyst('censer', 'flail', ['censer_heavy_charge', 'censer_heavy_release']),
  bow: {
    cls: 'bow', stance: 'bow', light: ['bow_shoot'], heavyCharge: 'bow_heavy_charge', heavyRelease: 'bow_heavy_release',
    guardClip: 'bowAim', parry: 'parry_hand', ranged: 'bow', critMult: 1.8,
  },
  crossbow: {
    cls: 'crossbow', stance: 'crossbow', light: ['xbow_shoot'], heavyCharge: 'xbow_heavy_charge', heavyRelease: 'xbow_heavy_release',
    guardClip: 'xbowAim', parry: 'parry_hand', ranged: 'crossbow', critMult: 1.8,
  },
  fist: {
    cls: 'fist', stance: 'fist', light: ['fist_light1', 'fist_light2', 'fist_light3'],
    heavyCharge: 'fist_heavy_charge', heavyRelease: 'fist_heavy_release', guardClip: 'guardFist', parry: 'parry_hand', critMult: 2.0,
  },
};

/** The moveset for the right-hand weapon class (null/unknown → fists). */
export function movesetFor(cls: WeaponClass | null | undefined, _offhandBusy = false): Moveset {
  return (cls && MOVESETS[cls]) || MOVESETS.fist;
}

/**
 * A move id → the definition to play: the one-handed twin when a two-handed class has a busy
 * off-hand. Explicit ids (including an explicit `_1h`, e.g. a one-handed mace's Grave Knell) are kept.
 */
export function resolveMove(id: string, oneHanded: boolean): MoveDef {
  if (!oneHanded) return MOVES[id];
  const base = id.endsWith('_1h') ? id.slice(0, -3) : id;
  return MOVES[base + '_1h'] || MOVES[id];
}

/** Imprint Technique → move for the wielded class. Every one of the 16 techniques resolves. */
export function techniqueMoveFor(id: string, cls: WeaponClass | 'shield' | null | undefined, opts: { oneHanded?: boolean; shield?: boolean } = {}): MoveDef | null {
  const pole = cls === 'spear' || cls === 'halberd';
  const great = cls === 'greatsword';
  const pick = (mid: string) => resolveMove(mid, !!opts.oneHanded);
  switch (id) {
    case 'oathbound_lunge': return pole ? pick('tech_lunge_pole') : MOVES.tech_lunge;
    case 'bulwark_toll': return MOVES.tech_bash;
    case 'bellglass_ward': return MOVES.tech_ward;
    case 'measured_cut': return great ? pick('tech_measured_great') : MOVES.tech_measured;
    case 'riposte_stance': return opts.shield ? MOVES.tech_riposte_stance_shield : MOVES.tech_riposte_stance;
    case 'bell_breaker': return cls === 'greatsword' || cls === 'hammer' ? pick('tech_bell_breaker') : MOVES.tech_bell_breaker_1h;
    case 'rending_sweep': return great ? pick('tech_rending_sweep_great') : pick('tech_rending_sweep');
    case 'greyford_flourish': return MOVES.tech_flourish;
    case 'knell_strike': return cls === 'hammer' ? pick('tech_knell_charge') : MOVES.tech_knell_charge_1h;
    case 'chain_whirl': return MOVES.tech_chain_whirl;
    case 'pinning_shot': return cls === 'crossbow' ? MOVES.tech_pinning_shot_x : MOVES.tech_pinning_shot;
    case 'impaling_charge': return pick('tech_impaling_charge');
    case 'ember_edge': return MOVES.tech_ember_edge;
    case 'vow_parry': return MOVES.tech_vow_parry;
    case 'vow_pursuit': return pole ? pick('tech_vow_pursuit') : MOVES.tech_vow_pursuit_1h;
    case 'stilled_breath': return cls === 'crossbow' ? MOVES.tech_stilled_breath_x : MOVES.tech_stilled_breath;
    default: return null;
  }
}

/** Held techniques: the technique button charges (released into `release`). */
export const TECH_CHARGE: Record<string, { release: string; full: number }> = {
  tech_knell_charge: { release: 'tech_knell_strike', full: 1.0 },
  tech_knell_charge_1h: { release: 'tech_knell_strike_1h', full: 1.0 },
};

/** Spell → cast move, by archetype (and the catalyst in hand). */
export function castMoveFor(sp: { id: string; kind: string; school: string }): MoveDef {
  switch (sp.kind) {
    case 'volley': return MOVES.cast_volley;
    case 'lance': return MOVES.cast_lance;
    case 'delayedStrike': return MOVES.cast_sky;
    case 'burst': return MOVES.cast_toll;
    case 'weaponBuff': return MOVES.cast_bless;
    case 'heal': case 'ward': case 'regen': return MOVES.cast_channel;
    case 'projectile':
      if (sp.school === 'rite') return MOVES.cast_ring;
      return sp.id === 'glinting_shard' ? MOVES.cast_quick : MOVES.cast_heavy;
    default: return MOVES.cast_quick;
  }
}
