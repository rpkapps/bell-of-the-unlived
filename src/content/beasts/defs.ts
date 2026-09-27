/**
 * Beast enemy definitions and movesets (logic only — no geometry; looks live in models.ts).
 *
 *  warHound     Royal Army mastiff in barding. Circles at 2.6–5 m, darts in: snap bite (0.45 s
 *               tell), lunge bite from 1.5–4 m (0.6 s crouch), unparryable pounce from range
 *               (rump-wiggle tell + jagged ring), a rearing forepaw rake that CAN be parried, a
 *               retreat hop. Low poise, 160 HP.
 *  huntingHound Royal Household sighthound. Faster, wider circles, a low hamstring bite that
 *               staggers, a lunge, a bay that wakes nearby enemies (with beastPackStep), 120 HP.
 *  carrionStag  Heavy optional variant: antler gore, gore charge, unparryable rearing stomp.
 *
 * Bites are sphere hits on the head bone (the engine never parries sphere hits); the war hound's
 * rake uses the right forepaw as a fist, so it is parryable and leads to a riposte.
 */
import type { EnemyDef, EnemyAttack } from '../../actors/Enemy';
import type { StanceWithBody } from '../../actors/anim/Animator';
import type { HitSpec, MoveDef, MoveEvent } from '../../combat/types';
import { registerMoves } from '../../combat/moves';
import { registerClips } from '../../actors/anim/clips';
import { registerEnemyDefs } from '../enemies';
import { beastClips, BT } from './clips';
import { QuadGait } from './gait';
import type { QuadDims } from './body';
import { CARRION_STAG, HUNTING_HOUND, WAR_HOUND } from './species';

type Ev = { t: number; e: MoveEvent };
const sfx = (t: number, cue: Extract<MoveEvent, { type: 'sfx' }>['cue'], volume?: number): Ev => ({ t, e: { type: 'sfx', cue, volume } });

/** Stance carrying the quadruped body plan: gait + critical-victim / idle clip overrides. */
export function beastStance(d: QuadDims, clips: Record<string, import('../../actors/anim/Clip').Clip>): StanceWithBody {
  const c = (n: string) => clips[`${d.id}_${n}`];
  return {
    handR: null, handL: null,
    body: {
      gait: () => new QuadGait(d),
      clips: { victimBack: c('victimBack'), victimFront: c('victimFront'), victimDown: c('victimDown'), sentryIdle: c('rest') },
    },
  };
}

const bite = (d: QuadDims, start: number, end: number, dmg: number, poise: number, o: Partial<HitSpec> = {}): HitSpec => ({
  start, end, source: 'sphere', sphere: { bone: 'head', offset: [0, 0.2 * d.s, 0.05 * d.s], radius: 0.26 * d.s }, dmg, posture: 0, poise, kind: 'thrust', knock: 1.5, parryable: true, ...o,
});

/** Shared hound moveset (per breed ids), scaled by `k` damage and `reach` metres. */
function houndMoves(d: QuadDims, k: { dmg: number; reach: number }): Record<string, MoveDef> {
  const id = d.id, B = BT;
  const M = (m: Omit<MoveDef, 'id' | 'clip'> & { clip?: string }, name: string): [string, MoveDef] => [`${id}_${name}`, { id: `${id}_${name}`, clip: `${id}_${m.clip ?? name}`, ...m } as MoveDef];
  return Object.fromEntries([
    M({ dur: B.bite.dur, hits: [bite(d, B.bite.tell + 0.02, B.bite.shut - 0.02, 105 * k.dmg, 28)], motion: [[B.bite.tell - 0.03, 0], [B.bite.snap + 0.03, 0.45 * k.reach]], track: [B.bite.tell, 5],
      events: [sfx(0.05, 'enemy_windup'), sfx(B.bite.tell - 0.01, 'swing_light')] }, 'bite'),
    M({ dur: B.bite2.dur, hits: [bite(d, B.bite2.tell + 0.01, B.bite2.snap + 0.07, 90 * k.dmg, 24)], motion: [[B.bite2.tell - 0.02, 0], [B.bite2.snap + 0.04, 0.35 * k.reach]], track: [B.bite2.tell, 6],
      events: [sfx(B.bite2.tell - 0.02, 'swing_light')] }, 'bite2'),
    M({ dur: B.lunge.dur, hits: [{ ...bite(d, B.lunge.launch + 0.02, B.lunge.land - 0.02, 150 * k.dmg, 45, { knock: 3 }), sphere: { bone: 'head', offset: [0, 0.2 * d.s, 0.05 * d.s], radius: 0.3 * d.s } }],
      motion: [[B.lunge.tell, -0.08], [B.lunge.launch, 0.3], [B.lunge.land - 0.06, 2.4 * k.reach], [B.lunge.land + 0.04, 2.6 * k.reach]], track: [B.lunge.tell + 0.06, 3.5], hyper: [B.lunge.tell, B.lunge.land, 30],
      events: [sfx(0.08, 'enemy_windup'), sfx(B.lunge.launch - 0.02, 'swing_heavy')] }, 'lunge'),
    M({ dur: B.hop.dur, motion: [[0.12, 0.03], [0.46, -1.8]], events: [sfx(0.5, 'enemy_grunt', 0.6)] }, 'hop'),
    M({ dur: B.bark.dur, events: [sfx(0.36, 'enemy_alert'), { t: 0.38, e: { type: 'custom', id: 'bark' } }, sfx(0.7, 'enemy_alert', 0.7), sfx(1.0, 'enemy_alert', 0.6)] }, 'bark'),
    // reactions
    M({ dur: B.flinch.dur, fade: 0.03, cancel: { dodge: 0.28, free: 0.36 } }, 'flinch'),
    M({ dur: B.stagger.dur, fade: 0.03, motion: [[0.3, -0.7]], cancel: { dodge: 0.6, free: 0.78 } }, 'stagger'),
    M({ dur: B.parried.dur, fade: 0.03, vulnerable: 'parried', motion: [[0.3, -0.4]] }, 'parried'),
    M({ dur: B.broken.dur, fade: 0.05, vulnerable: 'postureBroken' }, 'broken'),
    M({ dur: B.death.dur, fade: 0.05 }, 'death'),
  ]);
}

const reactions = (id: string): EnemyDef['reactions'] => ({
  light: `${id}_flinch`, heavy: `${id}_stagger`, guardHit: `${id}_flinch`, guardBreak: `${id}_stagger`,
  parried: `${id}_parried`, postureBreak: `${id}_broken`, death: `${id}_death`,
});

// ------------------------------------------------------------------------------------ war hound

const whClips = beastClips(WAR_HOUND);
const hhClips = beastClips(HUNTING_HOUND);
const csClips = beastClips(CARRION_STAG);
registerClips({ ...whClips, ...hhClips, ...csClips });

const B = BT;
registerMoves({
  ...houndMoves(WAR_HOUND, { dmg: 1, reach: 1 }),
  wh_pounce: {
    id: 'wh_pounce', clip: 'wh_pounce', dur: B.pounce.dur, tell: 'unparryable',
    hits: [{ start: B.pounce.apex - 0.06, end: B.pounce.land + 0.06, source: 'sphere', sphere: { bone: 'chest', offset: [0, 0.3, 0.1], radius: 0.62 }, dmg: 170, posture: 0, poise: 90, kind: 'strike', unparryable: true, knock: 5 }],
    motion: [[B.pounce.tell, -0.06], [B.pounce.launch, 0.5], [B.pounce.land - 0.02, 3.3], [B.pounce.land + 0.08, 3.4]], track: [B.pounce.tell + 0.06, 3], hyper: [0.7, B.pounce.land + 0.1, 60],
    events: [sfx(0.1, 'enemy_windup'), sfx(B.pounce.launch - 0.04, 'enemy_grunt'), sfx(B.pounce.launch, 'swing_heavy'), { t: B.pounce.land, e: { type: 'shake', amount: 0.22 } }],
  },
  wh_maul: {
    id: 'wh_maul', clip: 'wh_maul', dur: B.maul.dur,
    hits: [{ start: B.maul.tell + 0.02, end: B.maul.strike + 0.06, source: 'weaponR', dmg: 120, posture: 0, poise: 35, kind: 'slash', knock: 2 }],
    motion: [[B.maul.tell - 0.02, -0.05], [B.maul.strike + 0.02, 0.55]], track: [B.maul.tell, 4],
    events: [sfx(0.1, 'enemy_grunt'), sfx(B.maul.tell, 'swing_light')],
  },
  ...houndMoves(HUNTING_HOUND, { dmg: 0.82, reach: 0.9 }),
  hh_hamstring: {
    id: 'hh_hamstring', clip: 'hh_hamstring', dur: B.hamstring.dur,
    hits: [{ start: B.hamstring.tell + 0.02, end: B.hamstring.snap + 0.1, source: 'sphere', sphere: { bone: 'head', offset: [0, 0.22 * HUNTING_HOUND.s, 0.06], radius: 0.26 }, dmg: 80, posture: 0, poise: 55, kind: 'slash', knock: 1 }],
    motion: [[B.hamstring.tell - 0.02, 0], [B.hamstring.snap + 0.05, 0.6]], motionSide: [[B.hamstring.tell - 0.02, 0], [B.hamstring.snap + 0.1, -0.35]], track: [B.hamstring.tell, 5],
    events: [sfx(0.08, 'enemy_windup'), sfx(B.hamstring.tell, 'swing_light')],
  },
  ...houndMoves(CARRION_STAG, { dmg: 1.3, reach: 1.1 }),
  cs_gore: {
    id: 'cs_gore', clip: 'cs_gore', dur: B.gore.dur,
    hits: [{ start: B.gore.strike - 0.06, end: B.gore.strike + 0.12, source: 'sphere', sphere: { bone: 'head', offset: [0, 0.0, -0.3 * CARRION_STAG.s], radius: 0.5 }, dmg: 190, posture: 0, poise: 60, kind: 'thrust', knock: 4 }],
    motion: [[B.gore.tell, -0.1], [B.gore.strike + 0.05, 0.8]], track: [B.gore.tell - 0.05, 3.5], hyper: [0.4, B.gore.strike + 0.1, 40],
    events: [sfx(0.1, 'enemy_grunt'), sfx(B.gore.strike - 0.06, 'swing_heavy')],
  },
  cs_charge: {
    id: 'cs_charge', clip: 'cs_gore', dur: B.gore.dur + 0.2, speed: 0.95,
    hits: [{ start: B.gore.strike - 0.1, end: B.gore.strike + 0.2, source: 'sphere', sphere: { bone: 'head', offset: [0, 0.0, -0.3 * CARRION_STAG.s], radius: 0.55 }, dmg: 220, posture: 0, poise: 80, kind: 'thrust', knock: 5 }],
    motion: [[B.gore.tell, -0.1], [B.gore.strike + 0.1, 3.4]], track: [B.gore.tell, 2.5], hyper: [0.4, B.gore.strike + 0.2, 60],
    events: [sfx(0.1, 'enemy_windup'), sfx(B.gore.strike - 0.1, 'swing_huge')],
  },
  cs_rear: {
    id: 'cs_rear', clip: 'cs_rear', dur: B.rear.dur, tell: 'unparryable',
    hits: [{ start: B.rear.strike - 0.04, end: B.rear.strike + 0.1, source: 'sphere', sphere: { bone: 'chest', offset: [0, 0.45 * CARRION_STAG.s, 0.3], radius: 0.95 }, dmg: 240, posture: 0, poise: 100, kind: 'strike', unparryable: true, knock: 6 }],
    motion: [[B.rear.tell, -0.15], [B.rear.strike, 0.6]], track: [B.rear.tell - 0.1, 3], hyper: [0.3, B.rear.strike + 0.15, 80],
    events: [sfx(0.2, 'enemy_grunt'), { t: B.rear.strike, e: { type: 'shake', amount: 0.4 } }],
  },
});

const UNLIVED_BEAST = { physical: 0.1, magic: 0.05, fire: -0.1 };
const att = (move: string, range: [number, number], weight: number, o: Partial<EnemyAttack> = {}): EnemyAttack => ({ move, range, weight, ...o });

export const BEAST_DEFS: Record<string, EnemyDef> = {
  warHound: {
    kind: 'warHound', name: 'Unlived War Hound', look: 'warHound',
    props: { height: WAR_HOUND.s, bulk: WAR_HOUND.bulk, shoulder: WAR_HOUND.shoulder }, radius: 0.46, height: 1.15,
    hp: 160, poise: 12, postureMax: 120, postureRegen: 30, defense: 55, absorb: { ...UNLIVED_BEAST, physical: 0.16 }, hours: 70,
    walk: 2.5, run: 6.8, sight: 16, stance: beastStance(WAR_HOUND, whClips),
    attacks: [
      att('wh_bite', [0, 2.2], 4, { follow: [['wh_bite2', 0.35], ['wh_hop', 0.35]] }),
      att('wh_maul', [0, 1.8], 1.6, { cooldown: 4 }),
      att('wh_lunge', [1.6, 4.2], 3, { cooldown: 3 }),
      att('wh_pounce', [3.2, 6.4], 2, { cooldown: 7, angle: 0.45 }),
      att('wh_hop', [0, 1.4], 0.8, { cooldown: 4 }),
      att('wh_bark', [5.5, 14], 3, { cooldown: 30 }),
    ],
    keepDistance: [2.6, 4.0], recover: [0.9, 1.6], aggression: 0.6, reactions: reactions('wh'),
  },
  huntingHound: {
    kind: 'huntingHound', name: 'Unlived Hunting Hound', look: 'huntingHound',
    props: { height: HUNTING_HOUND.s, bulk: HUNTING_HOUND.bulk, shoulder: HUNTING_HOUND.shoulder }, radius: 0.38, height: 1.0,
    hp: 120, poise: 6, postureMax: 95, postureRegen: 28, defense: 45, absorb: UNLIVED_BEAST, hours: 60,
    walk: 2.9, run: 7.6, sight: 20, stance: beastStance(HUNTING_HOUND, hhClips),
    attacks: [
      att('hh_bite', [0, 2.0], 3, { follow: [['hh_hop', 0.55], ['hh_bite2', 0.2]] }),
      att('hh_hamstring', [0, 2.2], 2.5, { cooldown: 3.5, follow: [['hh_hop', 0.6]] }),
      att('hh_lunge', [1.8, 4.4], 3, { cooldown: 2.5 }),
      att('hh_bark', [5, 16], 4, { cooldown: 20 }),
      att('hh_hop', [0, 1.5], 1, { cooldown: 3 }),
    ],
    keepDistance: [2.8, 4.2], recover: [0.7, 1.3], aggression: 0.62, reactions: reactions('hh'),
  },
  carrionStag: {
    kind: 'carrionStag', name: 'Carrion Stag', look: 'carrionStag',
    props: { height: CARRION_STAG.s, bulk: CARRION_STAG.bulk, shoulder: CARRION_STAG.shoulder }, radius: 0.55, height: 1.6,
    hp: 420, poise: 45, postureMax: 220, postureRegen: 30, defense: 70, absorb: { ...UNLIVED_BEAST, physical: 0.18 }, hours: 180,
    walk: 1.8, run: 5.6, sight: 18, stance: beastStance(CARRION_STAG, csClips),
    attacks: [
      att('cs_gore', [0, 2.8], 3, { follow: [['cs_bite', 0.3]] }),
      att('cs_bite', [0, 2.0], 2),
      att('cs_charge', [3, 7], 2, { cooldown: 6 }),
      att('cs_rear', [0, 2.6], 1.4, { cooldown: 6 }),
    ],
    recover: [1.0, 1.8], aggression: 0.5, reactions: reactions('cs'),
  },
};

registerEnemyDefs(BEAST_DEFS);

/** Kinds registered by this module. */
export const BEAST_KINDS = Object.keys(BEAST_DEFS);
