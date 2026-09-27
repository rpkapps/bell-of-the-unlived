/**
 * The Hospice of the Quiet Hour is the campaign's hub: allies rescued in any region move there and
 * become teachers, merchants, smiths or spirit allies. Regions register their guests here; the
 * Ashbridge controller spawns every guest whose `present` rule holds.
 */
import type { WorldState } from '../../systems/WorldState';
import type { NpcLook } from '../../actors/models/contract';

export interface HospiceGuest {
  id: string;
  name: string;
  look: NpcLook;
  /** Idle clip ('standPray', 'sit', 'forge', or a registered clip id). */
  idle: string | null;
  /** Is the guest at the Hospice now? (usually `ws.npcs[id] === 'rescued'`). */
  present(ws: WorldState): boolean;
  /** Dialogue key when first spoken to at the Hospice, then an idle pool key. */
  greet: string;
  idlePool?: string;
  /** Opens this shop (SHOP_STOCK key) after talking. */
  shop?: string;
  /** Spells taught (spell ids) the first time. */
  teaches?: string[];
  /** Items given the first time (item ids). */
  gifts?: string[];
}

export const HOSPICE_GUESTS: HospiceGuest[] = [];
export function registerHospiceGuest(g: HospiceGuest) {
  const i = HOSPICE_GUESTS.findIndex((x) => x.id === g.id);
  if (i >= 0) HOSPICE_GUESTS[i] = g; else HOSPICE_GUESTS.push(g);
}

/** Allies counted for the "Inherit the Covenant" ending: every NPC whose fate is 'rescued'. */
export const alliesSaved = (ws: WorldState) => Object.values(ws.npcs).filter((f) => f === 'rescued').length;
/** The Unlived Muster: `muster.<region>` flags for the five institutions. */
export const MUSTER_REGIONS = ['army', 'academy', 'cathedral', 'treasury', 'household'] as const;
export const musterComplete = (ws: WorldState) => MUSTER_REGIONS.every((r) => ws.flags['muster.' + r]);

/** Spirit allies that can be summoned at boss veils (GDD §8). */
export interface SpiritAlly {
  id: string;
  name: string;
  /** Enemy definition id (registered in ENEMY_DEFS) used for the spirit's body and moveset. */
  kind: string;
  available(ws: WorldState): boolean;
}
export const SPIRITS: SpiritAlly[] = [];
export function registerSpirit(s: SpiritAlly) {
  const i = SPIRITS.findIndex((x) => x.id === s.id);
  if (i >= 0) SPIRITS[i] = s; else SPIRITS.push(s);
}
