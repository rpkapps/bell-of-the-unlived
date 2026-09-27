/**
 * Render module entry point.
 *
 *   const { renderer, particles, trails, onFrame } = await createRenderer(canvas, settings.graphics);
 *   // every frame:  onFrame(time, camera); particles.update(dt, camera); renderer.render(dt);
 *
 * Init order: the GameRenderer is created, then every material texture is generated on the GPU
 * (`initMaterials`) before this resolves — build levels after it.
 */
import type * as THREE from 'three';
import type { Settings } from '../game/settings';
import type { IParticles, IRenderer, ITrails } from './contract';
import { GameRenderer } from './Renderer';
import { Particles } from './Particles';
import { Trails } from './Trails';
import { initMaterials, updateMaterials } from './materials';
import { updateLights } from './lights';

export { GameRenderer } from './Renderer';
export { Particles } from './Particles';
export { Trails } from './Trails';
export { getMaterial, getMaterialVariant, initMaterials, updateMaterials, cloneMaterial, setWetness, setGroundLevel, materialStats } from './materials';
export { makeFlameLight, registerLight, unregisterLight, updateLights } from './lights';
export { drawHeraldry, heraldryTexture } from './heraldry';
export { heraldrySvg } from './heraldrySvg';

export interface RenderBundle {
  renderer: IRenderer & GameRenderer;
  particles: IParticles & Particles;
  trails: ITrails & Trails;
  /** Per-frame updates other than particles.update (materials clock, light budget). */
  onFrame: (time: number, camera: THREE.Camera) => void;
}

export async function createRenderer(canvas: HTMLCanvasElement, g: Settings['graphics']): Promise<RenderBundle> {
  const renderer = new GameRenderer(canvas, g);
  await initMaterials(renderer.renderer, g.quality);
  const particles = new Particles(renderer.scene);
  particles.setIntensity(g.effectsIntensity);
  const trails = new Trails(renderer.scene);
  const onFrame = (time: number, camera: THREE.Camera) => {
    updateMaterials(time);
    updateLights(time, camera.position);
  };
  return { renderer, particles, trails, onFrame };
}
