/**
 * Moves: every action (attacks, dodges, casts, reactions, criticals) is a MoveDef with explicit
 * windup → active → recovery timing in seconds. Actors execute one move at a time.
 */
import type { CueId } from '../audio/contract';
import type { BoneName } from '../actors/rigDefs';
import type { V3 } from '../actors/anim/types';

export type DamageKind = 'slash' | 'thrust' | 'strike' | 'fire' | 'magic' | 'holy';

export interface HitSpec {
  /** Active window (seconds into the move). */
  start: number; end: number;
  /** What deals damage: a held item's hit segment, or a sphere on a bone (shield bash, kick, body slam, AoE). */
  source: 'weaponR' | 'weaponL' | 'shieldL' | 'sphere';
  sphere?: { bone: BoneName | 'root'; offset: V3; radius: number };
  /** Damage: multiplier of the weapon's attack rating (player) or absolute value (enemies/spells). */
  dmg: number;
  /** Posture damage (same convention as dmg: multiplier for player, absolute for enemies). */
  posture: number;
  /** Poise damage (absolute). */
  poise: number;
  kind: DamageKind;
  guardBreak?: boolean;
  unparryable?: boolean;
  /** Sphere hits are unparryable by default (bodies, AoE); set for bites, fists and other parryable limbs. */
  parryable?: boolean;
  unblockable?: boolean;
  /** Knockback impulse (m/s) on a clean hit. */
  knock?: number;
  /** Hit group: windows sharing a group can only hit each target once in total. */
  group?: number;
}

export type Vulnerable = 'parried' | 'guardBroken' | 'postureBroken';

export interface MoveDef {
  id: string;
  clip: string;
  /** Total duration (the move ends here even if the clip is longer). */
  dur: number;
  /** The weapon may strike walls without rebounding (slams, wall-scraping techniques). */
  noBounce?: boolean;
  /** Clip playback speed. */
  speed?: number;
  fade?: number;
  stamina?: number;
  focus?: number;
  hits?: HitSpec[];
  /** Root motion: cumulative forward metres over time, [t, metres] points (linear between). */
  motion?: [number, number][];
  /** Lateral root motion (metres toward the character's right = -X) for side-steps. */
  motionSide?: [number, number][];
  /** Rotate toward the lock target / stick until t, at `rate` rad/s. */
  track?: [number, number];
  /** Invulnerability window. */
  iframes?: [number, number];
  /** Hyper-armour: poise bonus during [start, end]. */
  hyper?: [number, number, number];
  /** Parry active window. */
  parry?: [number, number];
  /** Guarding during the whole move (e.g. guard-counter, shield-up techniques). */
  guard?: boolean;
  /** Cancel windows (seconds): `chain` = buffered follow-up attack may start; `dodge` = may be cancelled by dodge; `free` = move becomes fully interruptible (movement). */
  cancel?: { chain?: number; dodge?: number; free?: number };
  /** Follow-up for the light chain. */
  next?: string;
  /** Timed events. */
  events?: { t: number; e: MoveEvent }[];
  /** The move leaves the actor vulnerable to a critical (reaction moves). */
  vulnerable?: Vulnerable;
  /** Move speed multiplier for walking during the move (drinking, casting while moving). 0 = rooted. */
  walk?: number;
  /** Visual tell type for enemy attacks (readability markers). */
  tell?: 'unparryable' | 'grab';
  /** Can't be interrupted by flinches (reactions still apply to hp). */
  noFlinch?: boolean;
}

export type MoveEvent =
  | { type: 'sfx'; cue: CueId; volume?: number }
  | { type: 'cast' }                 // fire the attuned spell / projectile
  | { type: 'drink' }                // apply flask
  | { type: 'technique' }            // apply technique effect (buffs, projectiles)
  | { type: 'critHit'; mult: number }// critical damage moment
  | { type: 'trail'; on: boolean }
  | { type: 'shake'; amount: number }
  | { type: 'fx'; kind: string }
  | { type: 'throw' }
  | { type: 'custom'; id: string };
