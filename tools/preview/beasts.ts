/**
 * Beasts preview: real Enemy instances (built as Game.spawnEnemy builds them: def → Enemy → model
 * from the look registry) in a minimal scene.
 *
 * URL params:
 *   kinds = warHound,huntingHound,carrionStag     (lineup; default all three)
 *   clip  = bite | lunge | … (clip suffix, per kind prefix)   ts = 0,0.45,0.6   (frames side by side)
 *   speed = m/s gait preview (with ts = sim seconds per frame)  dir = fwd|side|back   turn = rad/s
 *   sim   = 1  live AI: each beast fights a passive target; hitboxes = 1 draws hurt capsules
 *   angle = camera yaw (deg)  y = camera height  d = distance  fov
 * Sets window.__ready (after a few frames) and window.__stats (triangles / meshes per look).
 */
import * as THREE from 'three';
import { initMaterials } from '../../src/render/materials';
import { models } from '../../src/actors/models/index';
import { Enemy } from '../../src/actors/Enemy';
import { ENEMY_DEFS } from '../../src/content/enemies';
import { CLIPS } from '../../src/actors/anim/clips';
import { MOVES } from '../../src/combat/moves';
import { Combat, type Combatant } from '../../src/combat/Combat';
import { CollisionWorld } from '../../src/world/Collision';
import { defaultSettings } from '../../src/game/settings';
import type { Services } from '../../src/game/services';
import type { Actor } from '../../src/actors/Actor';
import '../../src/content/beasts';
import { beastPackStep } from '../../src/content/beasts';

const qs = new URLSearchParams(location.search);
const info = document.getElementById('p')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = qs.get('shadows') === '1';
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2d33);
const camera = new THREE.PerspectiveCamera(Number(qs.get('fov') ?? 32), innerWidth / innerHeight, 0.05, 100);
scene.add(new THREE.HemisphereLight(0xb8c4d8, 0x3a3228, 1.2));
const key = new THREE.DirectionalLight(0xfff0dc, 3.0);
key.position.set(4, 7, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 6; key.shadow.camera.bottom = -4;
scene.add(key);
const rim = new THREE.DirectionalLight(0xa8c0ff, 1.4); rim.position.set(-5, 4, -6); scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x3c3a36, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
scene.add(new THREE.GridHelper(20, 20, 0x555555, 0x444444));

const world = new CollisionWorld();
world.addBox([0, -0.5, 0], [100, 1, 100]);
world.build();
const actors: Enemy[] = [];
const svc = {
  world, combat: new Combat(), settings: defaultSettings(), t: 0,
  get time() { return svc.t; },
  sfx(c: string) { log.push(c); }, fx() {}, shake() {}, spawnProjectile() {}, actors: () => actors as Actor[], hint() {}, trail() {},
} as unknown as Services & { t: number };
const log: string[] = [];

const kinds = (qs.get('kinds') ?? 'warHound,huntingHound,carrionStag').split(',');
const ts = qs.get('ts') ? qs.get('ts')!.split(',').map(Number) : null;
const clip = qs.get('clip');
/** frames=bite@0.45,lunge@0.6,gait@0.3 — one instance per frame, one row per kind ("gait" = locomotion at `speed`). */
const frames = qs.get('frames')?.split(',').map((f) => { const [c, t] = f.split('@'); return { c, t: Number(t ?? 0) }; }) ?? null;
const speed = Number(qs.get('speed') ?? 0);
const sim = qs.get('sim') === '1';
const stats: Record<string, { triangles: number; meshes: number }> = {};

function spawn(kind: string, x: number, z: number, yaw: number, seed: number) {
  const def = ENEMY_DEFS[kind];
  const e = new Enemy(def, svc, seed);
  const m = models.buildEnemy(e.rig, def.look, seed) as ReturnType<typeof models.buildEnemy> & { info?: { triangles: number; meshes: number } };
  e.model = m;
  if (m.info) stats[kind] = { triangles: m.info.triangles, meshes: m.info.meshes };
  e.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
  scene.add(e.object);
  e.resetAt(new THREE.Vector3(x, 0, z), yaw);
  actors.push(e);
  return e;
}

// ---- hurt capsule overlay
const capMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, wireframe: true, transparent: true, opacity: 0.5 });
const capMeshes: THREE.Mesh[] = [];
function drawHurt() {
  for (const m of capMeshes) scene.remove(m);
  capMeshes.length = 0;
  for (const a of actors) for (const h of a.hurt) {
    const len = h.a.distanceTo(h.b);
    const g = new THREE.CapsuleGeometry(h.r, len, 4, 8);
    const m = new THREE.Mesh(g, capMat);
    m.position.copy(h.a).lerp(h.b, 0.5);
    if (len > 1e-4) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), h.b.clone().sub(h.a).normalize());
    scene.add(m); capMeshes.push(m);
  }
}

const dirQ = qs.get('dir') ?? 'fwd';
const turn = Number(qs.get('turn') ?? 0);
function poseStatic(e: Enemy, t: number, clipName: string | null = clip) {
  const loco = { speed, dirX: dirQ === 'side' ? 1 : 0, dirZ: dirQ === 'side' ? 0 : dirQ === 'back' ? -1 : 1, sprint: speed > 5, alert: 0.3, turnRate: turn };
  if (clipName && clipName !== 'gait') {
    const c = CLIPS[`${ENEMY_DEFS[e.def.kind].attacks[0].move.split('_')[0]}_${clipName}`];
    if (c) { e.anim.play(c, { fade: 0 }); }
    for (let k = 0; k < 10; k++) e.anim.update(0.1, loco);
    e.anim.clipT = t;
  } else {
    const n = Math.round(t / (1 / 60));
    for (let k = 0; k < 30 + n; k++) e.anim.update(1 / 60, loco);
  }
  e.syncRoot(1);
  e.anim.evaluate(0);
  e.rig.root.updateMatrixWorld(true);
  (e as unknown as { updateHurt(): void }).updateHurt();
}

let span = 0;
async function main() {
  await initMaterials(renderer);
  const times = ts ?? [0];
  let x = 0;
  const dummies: Enemy[] = [];
  if (frames) {
    let z = 0;
    for (const kind of kinds) {
      const s = ENEMY_DEFS[kind].props.height;
      frames.forEach((f, i) => { const e = spawn(kind, i * 1.9 * s, z, Math.PI / 2, 7 + actors.length); poseStatic(e, f.t, f.c); });
      x = Math.max(x, frames.length * 1.9 * s);
      z -= 2.2 * s;
    }
  }
  for (const kind of frames ? [] : kinds) {
    const s = ENEMY_DEFS[kind].props.height;
    for (const t of times) {
      if (sim) {
        const e = spawn(kind, x, -2.5, 0, 7 + actors.length);
        const dummy = new Enemy(ENEMY_DEFS.dummy, svc, 99);
        (dummy as unknown as { team: string }).team = 'player';
        dummy.model = models.buildNpc(dummy.rig, 'dummy');
        scene.add(dummy.object); dummy.resetAt(new THREE.Vector3(x, 0, 2.5), Math.PI);
        dummies.push(dummy);
        e.becomeAware(dummy);
      } else {
        const e = spawn(kind, x, 0, Math.PI / 2, 7 + actors.length);
        poseStatic(e, t);
      }
      x += (sim ? 5 : 1.9) * s;
    }
  }
  span = x;
  if (qs.get('hitboxes') === '1') drawHurt();
  const yaw = Number(qs.get('angle') ?? 0) * Math.PI / 180;
  const cx = Number(qs.get('cx') ?? (x - 1.9) / 2);
  const d = Number(qs.get('d') ?? Math.max(4, span * 1.25));
  const cy = Number(qs.get('y') ?? 1.1);
  camera.position.set(cx + Math.sin(yaw) * d, cy, Number(qs.get('cz') ?? 0) + Math.cos(yaw) * d);
  camera.lookAt(cx, 0.55, Number(qs.get('cz') ?? 0));
  let nFrames = 0;
  const clock = new THREE.Clock();
  const tick = () => {
    const dt = Math.min(0.05, clock.getDelta());
    if (sim) {
      const all = [...actors, ...dummies];
      const steps = Math.max(1, Math.round(dt / (1 / 60)));
      for (let k = 0; k < steps; k++) {
        const h = 1 / 60; svc.t += h;
        for (let i = 0; i < actors.length; i++) actors[i].think(h, dummies[i]);
        for (const a of all) if (!a.dead || a.move) a.stepPhysics(h, world, (a as Enemy).target?.pos ?? null, null);
        for (const a of all) a.stepAnimation(h);
        svc.combat.trace(all as unknown as Combatant[]);
        for (const a of actors) a.updateDeath(h);
        beastPackStep(actors, h);
      }
      if (qs.get('hitboxes') === '1') drawHurt();
      info.textContent = actors.map((a) => `${a.def.kind} hp ${a.hp.toFixed(0)} ${a.move?.def.id ?? a.ai} | target hp ${dummies[actors.indexOf(a)].hp.toFixed(0)}`).join('\n');
    } else {
      info.textContent = `${kinds.join(',')} ${clip ?? (speed ? 'gait ' + speed : 'idle')} ts=${times.join(',')}\n` + Object.entries(stats).map(([k, v]) => `${k}: ${v.triangles} tris, ${v.meshes} meshes`).join('\n');
    }
    for (const a of [...actors, ...dummies]) { a.renderPose(1, 1 / 60, dt); }
    renderer.render(scene, camera);
    if (++nFrames === 3) (window as unknown as { __ready: boolean; __stats: unknown }).__ready = true;
    // static poses: stop rendering once ready (software GL is slow); the sim keeps running
    if (sim || nFrames < 3) requestAnimationFrame(tick);
  };
  (window as unknown as { __stats: unknown }).__stats = stats;
  (window as unknown as { __actors: unknown }).__actors = actors;
  (window as unknown as { __log: unknown }).__log = log;
  tick();
}
void MOVES;
main();
