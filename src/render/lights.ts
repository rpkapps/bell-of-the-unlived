/**
 * Point-light budget for level designers.
 *
 * Levels may place any number of lamps. Registered lights are *descriptions*: they live on
 * `VIRTUAL_LIGHT_LAYER` (the camera never enables it, so three.js ignores them for shading) and
 * each frame the most important N are copied into a fixed pool of real PointLights. The number of
 * real lights never changes, so no shader ever recompiles and the per-pixel light loop stays
 * bounded.
 *
 * Nothing pops: a light that loses its slot fades out (and keeps the slot while it does), a light
 * that gains one fades in; a light only displaces a slot holder when it is clearly more important
 * (hysteresis), so lights near the budget boundary do not trade places every frame. Importance is
 * camera distance relative to the light's reach, and lights whose reach does not touch the view
 * frustum rank last (swapping those is invisible).
 *
 *   const lamp = makeFlameLight(0xffa050, 6, 9);   // registered + flickering
 *   lamp.position.set(...); someParent.add(lamp);  // toggle with lamp.visible / lamp.intensity
 *   registerLight(existingPointLight);             // any PointLight (no flicker)
 *   updateLights(time, camera.position, camera);   // per frame (GameRenderer does it for you)
 *
 * PointLights added to the scene without registering are adopted automatically by
 * `adoptStrayLights` (GameRenderer runs it every frame before rendering), except lights that were
 * direct children of the scene on the first frame (persistent rigs such as the camera fill light)
 * and lights flagged `userData.unbudgeted = true`.
 *
 * No point-light shadows (the sun is the only shadow caster).
 */
import * as THREE from 'three';
import type { Quality } from '../game/settings';

/** Layer used to hide virtual lights from the renderer. */
export const VIRTUAL_LIGHT_LAYER = 31;

/** Seconds for a light to fade in after gaining a slot / fade out after losing it. */
const FADE_IN = 0.45;
const FADE_OUT = 0.45;
/** A slot holder keeps its slot unless a candidate's score is better by this much. */
const HYSTERESIS = 1.5;
/** Score penalty for lights whose reach does not touch the view frustum. */
const OFFSCREEN = 1000;
/** Score penalty for lights at zero intensity (they light nothing; keep them only if slots are free). */
const DARK = 500;

interface Entry {
  light: THREE.PointLight;
  flicker: boolean;
  phase: number;
  score: number;
  live: boolean;
  /** Pool slot index or -1. */
  slot: number;
}

const entries: Entry[] = [];
const pool: THREE.PointLight[] = [];
const slotOwner: (Entry | null)[] = [];
const slotFade: number[] = [];
/** Last full (unfaded) intensity per slot, used while a hidden light fades out. */
const slotBase: number[] = [];
let budget = 8;
let lastTime = -1;
const _p = new THREE.Vector3();
const _frustum = new THREE.Frustum();
const _m = new THREE.Matrix4();
const _sphere = new THREE.Sphere();

/** Budget per quality level. */
export function lightBudgetFor(q: Quality): number {
  return q === 'low' ? 4 : q === 'medium' ? 6 : q === 'high' ? 8 : 12;
}

function releaseSlot(s: number): void {
  const e = slotOwner[s];
  if (e) e.slot = -1;
  slotOwner[s] = null;
  slotFade[s] = 0;
  if (pool[s]) pool[s].intensity = 0;
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
    l.userData.lightPool = true;
    pool.push(l);
    slotOwner.push(null);
    slotFade.push(0);
    slotBase.push(0);
  }
  for (let i = 0; i < pool.length; i++) {
    const l = pool[i];
    if (i < count) { if (l.parent !== scene) scene.add(l); }
    else { l.removeFromParent(); releaseSlot(i); }
  }
}

/** Register a PointLight to be served by the budget. Returns the same light. */
export function registerLight<T extends THREE.PointLight>(light: T, opts: { flicker?: boolean } = {}): T {
  if (light.userData.lightPool) return light;
  if (entries.some((e) => e.light === light)) return light;
  light.layers.set(VIRTUAL_LIGHT_LAYER);
  light.castShadow = false;
  entries.push({ light, flicker: !!opts.flicker, phase: Math.random() * 100, score: Infinity, live: false, slot: -1 });
  return light;
}

/** Stop serving a light (it becomes a normal, always-on light again on layer 0). */
export function unregisterLight(light: THREE.PointLight): void {
  const i = entries.findIndex((e) => e.light === light);
  if (i < 0) return;
  const e = entries[i];
  entries.splice(i, 1);
  if (e.slot >= 0) releaseSlot(e.slot);
  light.layers.set(0);
  // Taken out of the budget on purpose: never adopt it again automatically.
  light.userData.unbudgeted = true;
}

let adoptSweeps = 0;
/**
 * Keep the shader light count constant: register any PointLight that was added to `scene`
 * without going through the budget (e.g. `new THREE.PointLight()` in gameplay code). A light that
 * appears or disappears on its own changes the number of lights every lit shader is compiled
 * for, which recompiles every program (a hitch and, on some drivers, black frames).
 * Direct children of the scene present on the first sweep are persistent rigs and left alone.
 */
export function adoptStrayLights(scene: THREE.Scene): void {
  const first = adoptSweeps++ === 0;
  scene.traverse((o) => {
    const l = o as THREE.PointLight;
    if (!l.isPointLight || l.userData.lightPool || l.userData.unbudgeted || l.layers.mask === 1 << VIRTUAL_LIGHT_LAYER) return;
    if (first && l.parent === scene) { l.userData.unbudgeted = true; return; }
    registerLight(l, { flicker: l.name === 'flameLight' });
  });
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

/**
 * Gentle flame flicker in ~[0.87, 1.0]: a slow breath plus two faster, small octaves. Real flames
 * lighting a wall vary little; a deep or fast flicker reads as the screen flickering.
 */
export function flameFlicker(t: number, phase: number): number {
  const a = Math.sin(t * 4.1 + phase) * 0.5 + Math.sin(t * 7.3 + phase * 1.7) * 0.32 + Math.sin(t * 11.9 + phase * 0.3) * 0.18;
  const slow = Math.sin(t * 1.1 + phase * 2.1);
  return 0.935 + 0.04 * a + 0.025 * slow;
}

/**
 * Per-frame: rank the lights, move slots with fades, copy them into the pool, animate flicker.
 * Pass the camera to rank lights whose reach is outside the view last.
 */
export function updateLights(time: number, cameraPos: THREE.Vector3, camera?: THREE.Camera): void {
  // Robust to a second call in the same frame or a clock from a different source.
  const dt = lastTime < 0 || time <= lastTime ? 0 : Math.min(0.1, time - lastTime);
  lastTime = time;
  if (camera) {
    camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  }
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const l = e.light;
    let live = l.visible && !!l.parent;
    if (live) {
      // honour hidden ancestors (and lights removed from the scene with their parent)
      let o: THREE.Object3D | null = l.parent, top: THREE.Object3D = l;
      while (o) { if (!o.visible) { live = false; break; } top = o; o = o.parent; }
      if (live && !(top as THREE.Scene).isScene) live = false;
    }
    e.live = live;
    if (!live) { e.score = Infinity; continue; }
    l.getWorldPosition(_p);
    const reach = l.distance > 0 ? l.distance : 20;
    let score = Math.max(0, _p.distanceTo(cameraPos) - reach * 0.5) / Math.max(1, reach * 0.25);
    if (camera && l.distance > 0 && !_frustum.intersectsSphere(_sphere.set(_p, reach))) score += OFFSCREEN;
    if (!(l.intensity > 0)) score += DARK;
    if (e.slot >= 0) score -= HYSTERESIS;
    e.score = score;
  }
  const ranked = entries.filter((e) => e.score < Infinity).sort((a, b) => a.score - b.score).slice(0, budget);
  const chosen = new Set(ranked);
  // Slot holders that are no longer wanted fade out and keep the slot until dark.
  for (let s = 0; s < budget; s++) {
    const e = slotOwner[s];
    if (!e) continue;
    if (chosen.has(e)) slotFade[s] = Math.min(1, slotFade[s] + dt / FADE_IN);
    else {
      slotFade[s] = Math.max(0, slotFade[s] - dt / (e.live ? FADE_OUT : FADE_OUT * 0.5));
      if (slotFade[s] <= 0) releaseSlot(s);
    }
  }
  for (const e of ranked) {
    if (e.slot >= 0) continue;
    let free = -1;
    for (let s = 0; s < budget; s++) if (!slotOwner[s]) { free = s; break; }
    if (free < 0) break; // wait for an outgoing light to finish fading
    slotOwner[free] = e;
    slotFade[free] = 0;
    e.slot = free;
  }
  for (let s = 0; s < budget; s++) {
    const slot = pool[s];
    const e = slotOwner[s];
    slot.visible = true;
    if (!e) { slot.intensity = 0; continue; }
    const l = e.light;
    if (e.live) l.getWorldPosition(slot.position);
    const k = e.flicker ? flameFlicker(time, e.phase) : 1;
    slot.color.copy(l.color);
    slot.distance = l.distance;
    slot.decay = l.decay;
    // smoothstep the linear fade so starts and ends have no visible kink
    const f = slotFade[s], ff = f * f * (3 - 2 * f);
    if (e.live) slotBase[s] = l.intensity * k;
    slot.intensity = slotBase[s] * ff;
  }
}

/** Debug: how many lights are registered / served. */
export function lightStats(): { registered: number; budget: number; active: number } {
  return { registered: entries.length, budget, active: slotOwner.slice(0, budget).filter((o) => o).length };
}

/** All currently registered lights (used to release a region's lights when it unloads). */
export function registeredLights(): THREE.PointLight[] { return entries.map((e) => e.light); }
