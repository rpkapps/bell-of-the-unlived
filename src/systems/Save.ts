/**
 * Saves: versioned JSON in two rotating localStorage slots, each with a checksum. Loading picks the
 * newest slot that validates, so a crash mid-write can never destroy the previous save.
 */
import type { PlayerData } from './PlayerData';
import type { WorldState } from './WorldState';

export const SAVE_VERSION = 1;
const KEY = 'botu.save.';

export interface SaveData {
  version: number;
  savedAt: number;
  seq: number;
  player: PlayerData;
  world: WorldState;
  /** Resume position (null → last Stillbell). */
  position: { pos: [number, number, number]; yaw: number } | null;
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}

export interface Storage { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export class SaveSystem {
  private seq = 0;
  lastError: string | null = null;
  constructor(private store: Storage | null = (() => { try { return window.localStorage; } catch { return null; } })()) {
    const cur = this.load();
    this.seq = cur?.seq ?? 0;
  }

  write(data: Omit<SaveData, 'version' | 'savedAt' | 'seq'>): boolean {
    if (!this.store) { this.lastError = 'storage unavailable'; return false; }
    this.seq++;
    const full: SaveData = { ...data, version: SAVE_VERSION, savedAt: Date.now(), seq: this.seq };
    const json = JSON.stringify(full);
    const payload = JSON.stringify({ sum: fnv1a(json), json });
    const slot = this.seq % 2 === 0 ? 'A' : 'B';
    try {
      this.store.setItem(KEY + slot, payload);
      // verify the write round-trips
      const back = this.store.getItem(KEY + slot);
      if (back !== payload) throw new Error('verify failed');
      this.lastError = null;
      return true;
    } catch (e) {
      this.lastError = String(e);
      return false;
    }
  }

  private read(slot: 'A' | 'B'): SaveData | null {
    try {
      const raw = this.store?.getItem(KEY + slot);
      if (!raw) return null;
      const { sum, json } = JSON.parse(raw);
      if (fnv1a(json) !== sum) return null;
      const d = JSON.parse(json) as SaveData;
      if (d.version !== SAVE_VERSION) return migrate(d);
      return d;
    } catch { return null; }
  }

  load(): SaveData | null {
    const a = this.read('A'), b = this.read('B');
    if (a && b) return a.seq > b.seq ? a : b;
    return a ?? b;
  }

  exists() { return !!this.load(); }

  clear() { try { this.store?.removeItem(KEY + 'A'); this.store?.removeItem(KEY + 'B'); } catch { /* ignore */ } this.seq = 0; }
}

function migrate(d: SaveData): SaveData | null {
  // Future versions migrate here. Unknown versions are rejected rather than half-loaded.
  return d.version < SAVE_VERSION ? null : null;
}
