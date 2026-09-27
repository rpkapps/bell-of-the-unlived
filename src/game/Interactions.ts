/** Context interactions: the best candidate in reach gets the prompt; the interact input triggers it. */
import * as THREE from 'three';
import type { Actor } from '../actors/Actor';
import { angleDiff, yawOf } from '../core/math';

export interface Interactable {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  /** Prompt text, or null when not currently available. */
  prompt: () => string | null;
  action: () => void;
  /** Must the player face it? (default true) */
  facing?: boolean;
}

export class Interactions {
  readonly list: Interactable[] = [];
  add(i: Interactable) { this.list.push(i); return i; }
  remove(id: string) { const k = this.list.findIndex((x) => x.id === id); if (k >= 0) this.list.splice(k, 1); }
  clear() { this.list.length = 0; }

  best(p: Actor): { it: Interactable; text: string } | null {
    let best: { it: Interactable; text: string } | null = null, bd = Infinity;
    for (const it of this.list) {
      const dx = it.pos.x - p.pos.x, dz = it.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius || Math.abs(it.pos.y - p.pos.y) > 2.2) continue;
      if (it.facing !== false && d > 0.5 && Math.abs(angleDiff(p.yaw, yawOf(dx, dz))) > 1.9) continue;
      const text = it.prompt();
      if (!text) continue;
      if (d < bd) { bd = d; best = { it, text }; }
    }
    return best;
  }
}
