/**
 * Point-light budget for level designers.
 *
 * Levels may place any number of lamps. Registered lights are *descriptions*: they live on
 * `VIRTUAL_LIGHT_LAYER` (the camera never enables it, so three.js ignores them for shading) and
 * each frame the nearest N (by camera distance weighted by reach) are copied into a fixed pool
 * of real PointLights. The number of real lights never changes, so no shader ever recompiles and
 * the per-pixel light loop stays bounded. Newly selected lights fade in over ~0.3 s.
 *
 *   const lamp = makeFlameLight(0xffa050, 6, 9);   // registered + flickering
 *   lamp.position.set(...); someParent.add(lamp);  // toggle with lamp.visible / lamp.intensity
 *   registerLight(existingPointLight);             // any PointLight (no flicker)
 *   updateLights(time, camera.position);           // per frame (GameRenderer does it for you)
 *
 * No point-light shadows (the sun is the only shadow caster).
 */
import * as THREE from 'three';
import type { Quality } from '../game/settings';

/** Layer used to hide virtual lights from the renderer. */
export const VIRTUAL_LIGHT_LAYER = 31;

interface Entry {
  light: THREE.PointLight;
  flicker: boolean;
  phase: number;
  fade: number;
  score: number;
}

const entries: Entry[] = [];
const pool: THREE.PointLight[] = [];
const slotOwner: (Entry | null)[] = [];
let budget = 8;
let lastTime = -1;
const _p = new THREE.Vector3();

/** Budget per quality level. */
export function lightBudgetFor(q: Quality): number {
  return q === 'low' ? 4 : q === 'medium' ? 6 : q === 'high' ? 8 : 12;
}

/**
 * Create the slot pool in `scene` (GameRenderer calls this). Changing `count` later changes the
 * shader light count once (one recompile), so do it only on quality changes.
 */
export function initLightPool(scene: THREE.Scene, count: number): void {
  budget = count;
  while (pool.length < count) {
    const l = new THREE.PointLight(0xffffff, 0, 1, 2);
    l.name = `lightPool:${pool.length}`;
    l.castShadow = false;
    pool.push(l);
    slotOwner.push(null);
  }
  for (let i = 0; i < pool.length; i++) {
    const l = pool[i];
    if (i < count) { if (l.parent !== scene) scene.add(l); }
    else { l.removeFromParent(); slotOwner[i] = null; }
  }
}

/** Register a PointLight to be served by the budget. Returns the same light. */
export function registerLight<T extends THREE.PointLight>(light: T, opts: { flicker?: boolean } = {}): T {
  if (entries.some((e) => e.light === light)) return light;
  light.layers.set(VIRTUAL_LIGHT_LAYER);
  light.castShadow = false;
  entries.push({ light, flicker: !!opts.flicker, phase: Math.random() * 100, fade: 0, score: 0 });
  return light;
}

/** Stop serving a light (it becomes a normal, always-on light again on layer 0). */
export function unregisterLight(light: THREE.PointLight): void {
  const i = entries.findIndex((e) => e.light === light);
  if (i < 0) return;
  const e = entries[i];
  entries.splice(i, 1);
  for (let s = 0; s < slotOwner.length; s++) if (slotOwner[s] === e) slotOwner[s] = null;
  light.layers.set(0);
}

/**
 * A warm, flickering flame light (torches, braziers, candles, hearths), already registered.
 * `distance` = reach in metres (physically-based decay 2).
 */
export function makeFlameLight(color: THREE.ColorRepresentation = 0xffa050, intensity = 6, distance = 9): THREE.PointLight {
  const l = new THREE.PointLight(color, intensity, distance, 2);
  l.name = 'flameLight';
  l.userData.baseIntensity = intensity;
  return registerLight(l, { flicker: true });
}

/** Two-octave flame flicker in ~[0.72, 1.08]. */
function flicker(t: number, phase: number): number {
  const a = Math.sin(t * 7.3 + phase) * 0.5 + Math.sin(t * 13.1 + phase * 1.7) * 0.3 + Math.sin(t * 23.7 + phase * 0.3) * 0.2;
  const slow = Math.sin(t * 1.3 + phase * 2.1);
  return 0.9 + 0.1 * a + 0.06 * slow;
}

/** Per-frame: pick the nearest lights, copy them into the pool, animate flicker. */
export function updateLights(time: number, cameraPos: THREE.Vector3): void {
  const dt = lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - lastTime));
  lastTime = time;
  // score = distance beyond the light's reach (lights you are inside of win)
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const l = e.light;
    let live = l.visible && l.intensity > 0 && !!l.parent;
    if (live) {
      // honour hidden ancestors
      let o: THREE.Object3D | null = l.parent;
      while (o) { if (!o.visible) { live = false; break; } o = o.parent; }
    }
    if (!live) { e.score = Infinity; continue; }
    l.getWorldPosition(_p);
    const reach = l.distance > 0 ? l.distance : 20;
    e.score = Math.max(0, _p.distanceTo(cameraPos) - reach * 0.5) / Math.max(1, reach * 0.25);
  }
  const ranked = entries.filter((e) => e.score < Infinity).sort((a, b) => a.score - b.score).slice(0, budget);
  const chosen = new Set(ranked);
  // keep lights in their current slot when still chosen (stable), free others
  for (let s = 0; s < budget; s++) if (slotOwner[s] && !chosen.has(slotOwner[s]!)) { slotOwner[s]!.fade = 0; slotOwner[s] = null; }
  for (const e of ranked) {
    if (slotOwner.includes(e)) continue;
    const free = slotOwner.findIndex((o, i) => i < budget && o === null);
    if (free >= 0) { slotOwner[free] = e; e.fade = 0; }
  }
  for (let s = 0; s < budget; s++) {
    const slot = pool[s];
    const e = slotOwner[s];
    if (!e) { slot.intensity = 0; slot.visible = true; continue; }
    const l = e.light;
    e.fade = Math.min(1, e.fade + dt / 0.3);
    l.getWorldPosition(slot.position);
    const k = e.flicker ? flicker(time, e.phase) : 1;
    if (e.flicker) slot.position.y += (k - 0.9) * 0.05;
    slot.color.copy(l.color);
    slot.distance = l.distance;
    slot.decay = l.decay;
    slot.intensity = l.intensity * k * e.fade;
  }
}

/** Debug: how many lights are registered / served. */
export function lightStats(): { registered: number; budget: number; active: number } {
  return { registered: entries.length, budget, active: slotOwner.slice(0, budget).filter((o) => o).length };
}

/** All currently registered lights (used to release a region's lights when it unloads). */
export function registeredLights(): THREE.PointLight[] { return entries.map((e) => e.light); }
