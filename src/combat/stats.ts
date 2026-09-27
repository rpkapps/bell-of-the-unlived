/**
 * Attribute → derived stat formulas and damage math. Pure functions (unit tested).
 */
import type { Attributes, Grade, ItemDef, LoadClass } from '../game/types';

export const GRADE_COEF: Record<Grade, number> = { S: 1.6, A: 1.25, B: 0.95, C: 0.7, D: 0.48, E: 0.28, '-': 0 };

/** Soft-capped attribute saturation curve 0..~1.1. */
export function saturation(a: number): number {
  if (a <= 8) return 0;
  if (a <= 40) return Math.pow((a - 8) / 32, 0.85) * 0.9;
  if (a <= 60) return 0.9 + ((a - 40) / 20) * 0.15;
  return Math.min(1.1, 1.05 + ((a - 60) / 39) * 0.05);
}

export const hpFor = (v: number) => Math.round(v <= 25 ? 280 + 26 * (v - 6) : v <= 40 ? 774 + 18 * (v - 25) : 1044 + 6 * (v - 40));
export const focusFor = (m: number) => Math.round(50 + 6 * (m - 6) - Math.max(0, m - 30) * 3);
export const staminaFor = (e: number) => Math.round(Math.min(80 + 3.5 * (e - 6), 80 + 3.5 * 34 + (e - 40) * 0.8));
export const loadFor = (e: number) => Math.round((45 + 1.4 * (e - 6)) * 10) / 10;

export function levelOf(a: Attributes): number {
  return a.vigor + a.mind + a.endurance + a.strength + a.dexterity + a.intellect + a.devotion - 69;
}
/** Hours to go from `level` to `level + 1`. */
export function levelCost(level: number): number {
  const L = level + 1;
  return Math.max(400, Math.round(0.02 * L ** 3 + 3.06 * L ** 2 + 105.6 * L - 895));
}
/** Hours to go from level a to level b. */
export function levelRangeCost(from: number, to: number): number {
  let c = 0;
  for (let l = from; l < to; l++) c += levelCost(l);
  return c;
}

export function loadClass(load: number, max: number): LoadClass {
  const r = load / Math.max(max, 1);
  return r <= 0.3 ? 'light' : r <= 0.7 ? 'medium' : r <= 1 ? 'heavy' : 'overloaded';
}

export interface DodgeProfile { dur: number; iframes: [number, number]; distance: number; stamina: number; speedMult: number }
export const DODGE: Record<LoadClass, DodgeProfile> = {
  light: { dur: 0.62, iframes: [0.06, 0.42], distance: 3.4, stamina: 16, speedMult: 1.1 },
  medium: { dur: 0.72, iframes: [0.06, 0.38], distance: 3.1, stamina: 16, speedMult: 1.0 },
  heavy: { dur: 0.95, iframes: [0.08, 0.32], distance: 2.4, stamina: 18, speedMult: 0.88 },
  overloaded: { dur: 0.6, iframes: [0.05, 0.2], distance: 1.3, stamina: 12, speedMult: 0.55 },
};

/** Weapon attack rating by damage type, including attribute scaling and upgrade level. */
export function attackRating(def: ItemDef, upgrade: number, a: Attributes): { physical: number; magic: number; fire: number; total: number; meetsReq: boolean } {
  const w = def.weapon;
  if (!w) return { physical: 0, magic: 0, fire: 0, total: 0, meetsReq: true };
  const up = 1 + 0.085 * upgrade;
  const upScale = 1 + 0.04 * upgrade;
  let meetsReq = true;
  for (const [k, v] of Object.entries(w.requirements)) if ((a as any)[k] < (v ?? 0)) meetsReq = false;
  let bonus = 0;
  for (const [k, g] of Object.entries(w.scaling)) bonus += GRADE_COEF[g as Grade] * saturation((a as any)[k]) * upScale;
  const phys = w.damage.physical * up * (1 + bonus);
  const mag = w.damage.magic * up * (1 + bonus * 0.8);
  const fire = w.damage.fire * up * (1 + bonus * 0.8);
  const pen = meetsReq ? 1 : 0.6;
  return { physical: phys * pen, magic: mag * pen, fire: fire * pen, total: (phys + mag + fire) * pen, meetsReq };
}

/** Spell scaling multiplier for a catalyst (1.0 = base spell damage). */
export function spellPower(def: ItemDef | null, upgrade: number, a: Attributes, school: 'sorcery' | 'rite'): number {
  if (!def?.weapon?.casts || def.weapon.casts !== school) return 0;
  const attr = school === 'sorcery' ? a.intellect : a.devotion;
  const g = (def.weapon.scaling[school === 'sorcery' ? 'intellect' : 'devotion'] ?? 'C') as Grade;
  return (1 + GRADE_COEF[g] * saturation(attr) * 1.4) * (1 + 0.06 * upgrade);
}

/** Damage after defence: flat-ish reduction then percentage absorption. */
export function applyDefense(raw: number, defense: number, absorption: number): number {
  const afterDef = raw * (raw / (raw + defense * 0.9 + 1e-6)) * 1.0;
  const r = Math.max(raw * 0.1, afterDef) * (1 - Math.min(absorption, 0.8));
  return Math.max(1, Math.round(r));
}
