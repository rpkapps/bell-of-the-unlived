/**
 * CONTRACT — renderer, environment, particles and trails (implemented in src/render/*).
 */
import type * as THREE from 'three';
import type { Settings } from '../game/settings';

export type EnvironmentPreset = 'ashbridgeDusk' | 'undercroft' | 'hospiceInterior' | 'arena' | 'battlefield' | 'title';

export interface IRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** Shadow-casting key light (moon/sunset). */
  readonly sun: THREE.DirectionalLight;
  applySettings(s: Settings['graphics']): void;
  /** Blend to an environment preset (sky, fog colour/density, ambient/hemisphere, sun colour, grade). */
  setEnvironment(p: EnvironmentPreset, blendSeconds?: number): void;
  /** Keep the shadow frustum centred on the player. */
  setFocus(pos: THREE.Vector3): void;
  /** Post-process extras: 0..1 desaturation/vignette for low health; memory = sepia wash for flashbacks. */
  setGrade(g: { lowHealth?: number; memory?: number; flash?: number; flashColor?: THREE.ColorRepresentation }): void;
  render(dt: number): void;
  resize(): void;
  stats(): { drawCalls: number; triangles: number };
}

export type ParticleKind =
  | 'sparks'        // metal hit / parry sparks (bright, fast, short)
  | 'blockSparks'   // guard sparks
  | 'goldMotes'     // Unlived hit/death: golden motes drifting up (Unlived "bleed" light, not blood)
  | 'blood'         // living NPC/player hit: dark, restrained
  | 'dust'          // footsteps, rolls, landings
  | 'embers'        // ambient (fires)
  | 'fireBurst'     // Cinder Bolt explosion
  | 'fireTrail'     // projectile trail
  | 'shardTrail'    // Glinting Shard trail
  | 'healMotes'     // flask / heal
  | 'bellMotes'     // Stillbell ambient / rest
  | 'hoursStream'   // Hours flowing from a dead enemy to a target point
  | 'shatter'       // anchor bell fragments
  | 'rubble'        // collapse debris
  | 'fogMotes';

export interface EmitOpts {
  count?: number;
  dir?: THREE.Vector3;       // main direction
  spread?: number;           // radians
  speed?: number;
  color?: THREE.ColorRepresentation;
  scale?: number;
  target?: THREE.Vector3;    // hoursStream destination (live-updated object allowed)
}

export interface IParticles {
  emit(kind: ParticleKind, pos: THREE.Vector3, opts?: EmitOpts): void;
  /** A persistent emitter (e.g. Last Breath glow, brazier); returns a handle. */
  attach(kind: ParticleKind, pos: THREE.Vector3, rate: number): { setPos(p: THREE.Vector3): void; setRate(r: number): void; stop(): void };
  update(dt: number, camera: THREE.Camera): void;
  setIntensity(k: number): void;
}

export interface ITrail {
  /** Add the current weapon segment (world space). */
  push(base: THREE.Vector3, tip: THREE.Vector3): void;
  /** Start/stop emitting; existing segments fade over `fade` seconds. */
  setActive(on: boolean): void;
  update(dt: number): void;
  dispose(): void;
}
export interface ITrails { create(color?: THREE.ColorRepresentation, width?: number): ITrail }
