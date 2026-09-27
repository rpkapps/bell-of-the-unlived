// Light budget: constant shader light count, no pops, no thrash at the budget boundary.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

type Lights = typeof import('../src/render/lights');
let L: Lights;
beforeEach(async () => {
  vi.resetModules();
  L = await import('../src/render/lights');
});

/** Lights three.js would count for shading (what shader programs are compiled for). */
function shaderLights(scene: THREE.Scene, cam: THREE.Camera): number {
  let n = 0;
  scene.traverseVisible((o) => { if ((o as THREE.Light).isLight && o.layers.test(cam.layers)) n++; });
  return n;
}

function setup(budget: number, lamps: THREE.Vector3[], reach = 8) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 500);
  scene.add(cam);
  L.initLightPool(scene, budget);
  const lights = lamps.map((p) => {
    const l = L.registerLight(new THREE.PointLight(0xffaa66, 5, reach, 2));
    l.position.copy(p);
    scene.add(l);
    return l;
  });
  const pool = scene.children.filter((c) => c.name.startsWith('lightPool')) as THREE.PointLight[];
  return { scene, cam, lights, pool };
}

describe('light budget', () => {
  it('keeps the number of shader lights constant while the camera walks past many lamps', () => {
    const lamps = Array.from({ length: 24 }, (_, i) => new THREE.Vector3((i % 2 ? 3 : -3), 2.5, -i * 6));
    const { scene, cam } = setup(4, lamps);
    const counts = new Set<number>();
    for (let f = 0; f < 600; f++) {
      const t = f / 60;
      cam.position.set(0, 1.7, 4 - t * 12);
      cam.lookAt(0, 1.5, -100);
      L.adoptStrayLights(scene);
      L.updateLights(t, cam.position, cam);
      counts.add(shaderLights(scene, cam));
    }
    expect([...counts]).toEqual([4]);
  });

  it('fades slots in and out instead of popping', () => {
    const lamps = Array.from({ length: 12 }, (_, i) => new THREE.Vector3(0, 2.5, -i * 7));
    const { cam, pool } = setup(3, lamps);
    const prev = pool.map(() => 0);
    let maxStep = 0;
    for (let f = 0; f < 900; f++) {
      const t = f / 60;
      cam.position.set(0, 1.7, 5 - t * 6);
      cam.lookAt(0, 1.5, cam.position.z - 10);
      L.updateLights(t, cam.position, cam);
      pool.forEach((p, i) => { maxStep = Math.max(maxStep, Math.abs(p.intensity - prev[i])); prev[i] = p.intensity; });
    }
    // full intensity 5; 0.45 s smoothstep fade at 60 fps changes at most ~0.28 per frame
    expect(maxStep).toBeLessThan(0.35);
  });

  it('does not trade slots back and forth at the budget boundary', () => {
    const { cam, pool } = setup(1, [new THREE.Vector3(-6, 2, 0), new THREE.Vector3(6, 2, 0)]);
    const owners: string[] = [];
    for (let f = 0; f < 600; f++) {
      const t = f / 60;
      // wobble around the midpoint between the two lamps
      cam.position.set(Math.sin(t * 7) * 0.8, 1.7, 3);
      cam.lookAt(0, 1.5, 0);
      L.updateLights(t, cam.position, cam);
      owners.push(pool[0].position.x.toFixed(0));
    }
    let changes = 0;
    for (let i = 1; i < owners.length; i++) if (owners[i] !== owners[i - 1]) changes++;
    expect(changes).toBeLessThanOrEqual(1);
  });

  it('ignores a second update with the same clock (no double-speed fades)', () => {
    const { cam, pool } = setup(2, [new THREE.Vector3(0, 2, -3)]);
    cam.position.set(0, 1.7, 0);
    L.updateLights(1, cam.position, cam);
    for (let i = 0; i < 5; i++) L.updateLights(1 + 1 / 60, cam.position, cam);
    const lit = pool.find((p) => p.intensity > 0);
    expect(lit).toBeTruthy();
    // one 1/60 s step of a 0.45 s smoothstep fade: tiny, not 5 steps' worth
    expect(lit!.intensity).toBeLessThan(0.05);
  });

  it('adopts stray PointLights added later, keeps persistent rigs', () => {
    const { scene, cam } = setup(2, []);
    const fill = new THREE.PointLight(0xffffff, 2, 14);
    scene.add(fill);
    L.adoptStrayLights(scene); // first frame: `fill` is a persistent rig
    const before = shaderLights(scene, cam);
    const grp = new THREE.Group();
    const stray = new THREE.PointLight(0xffd79a, 4, 7, 2);
    grp.add(stray);
    scene.add(grp);
    L.adoptStrayLights(scene);
    expect(shaderLights(scene, cam)).toBe(before);
    expect(stray.layers.test(cam.layers)).toBe(false);
    expect(fill.layers.test(cam.layers)).toBe(true);
    grp.removeFromParent();
    L.updateLights(1, cam.position, cam);
    expect(shaderLights(scene, cam)).toBe(before);
  });

  it('flame flicker stays gentle', () => {
    let lo = Infinity, hi = -Infinity, maxStep = 0, prev = L.flameFlicker(0, 3);
    for (let i = 1; i < 6000; i++) {
      const k = L.flameFlicker(i / 60, 3);
      lo = Math.min(lo, k); hi = Math.max(hi, k); maxStep = Math.max(maxStep, Math.abs(k - prev)); prev = k;
    }
    expect(hi - lo).toBeLessThan(0.18);
    expect(maxStep).toBeLessThan(0.02);
  });
});
