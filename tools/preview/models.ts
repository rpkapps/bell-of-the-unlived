/**
 * Model preview: lineups of every look and weapon on real rigs, in an A-pose and in a guard pose
 * driven by the actual PoseSolver (so weapon/shield seating in the fist is exactly as in game).
 *
 * URL params:
 *   group = player | player2 | enemies | npcs | weapons | hands | single
 *   look  = armour look for group=single (e.g. retainer); sex = m | f
 *   pose  = both | a | guard     angle = camera yaw in degrees (static)     orbit = 1 (slow orbit)
 *   dist  = camera distance multiplier    y = camera height    fov
 * The page sets `window.__ready = true` when cloth has settled, and `window.__stats` with
 * triangle / mesh counts per model (read by the screenshot script).
 */
import * as THREE from 'three';
import { Rig } from '../../src/actors/Rig';
import { PoseSolver } from '../../src/actors/anim/PoseSolver';
import type { PoseSpec, HandKey } from '../../src/actors/anim/types';
import { models, WEAPON_IDS, type BuiltModel, type WeaponModelExt, type CharacterLookExt } from '../../src/actors/models/index';
import type { ArmorLook, EnemyLook, NpcLook, CharacterModel } from '../../src/actors/models/contract';
import { initMaterials } from '../../src/render/materials';

const qs = new URLSearchParams(location.search);
const group = qs.get('group') ?? 'player';
const poseMode = qs.get('pose') ?? 'both';
const orbit = qs.get('orbit') === '1';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2d33);
scene.fog = new THREE.Fog(0x2a2d33, 14, 40);
const camera = new THREE.PerspectiveCamera(Number(qs.get('fov') ?? 30), innerWidth / innerHeight, 0.05, 100);

scene.add(new THREE.HemisphereLight(0xb8c4d8, 0x3a3228, 1.1));
const key = new THREE.DirectionalLight(0xfff0dc, 3.2);
key.position.set(4, 7, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 6; key.shadow.camera.bottom = -3;
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xa8c0ff, 1.6);
rim.position.set(-5, 4, -6);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x3c3a36, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ------------------------------------------------------------------------------------ poses

const D = (x: number, y: number, z: number): [number, number, number] => [x, y, z];

function basePose(): PoseSpec {
  return {
    hipsPos: D(0, 0, 0), hips: D(0, 0, 0), spine: D(0, 0, 0), chest: D(0, 0, 0), neck: D(0, 0, 0), head: D(0, 0, 0),
    handR: null, handL: null, footL: D(0.11, 0.05, 0.0), footR: D(-0.11, 0.05, 0.0), footPitchL: 0, footPitchR: 0,
    fk: { upperArmL: D(0, 0, 22), upperArmR: D(0, 0, -22), forearmL: D(-8, 0, 0), forearmR: D(-8, 0, 0) },
  };
}

/** Guard: sword raised forward-right, shield (or off-hand) forward-left, staggered feet. */
function guardPose(kind: 'sword' | 'staff' | 'bow' | 'twohand' | 'none', shield: boolean): PoseSpec {
  const p = basePose();
  p.hipsPos = D(0, -0.05, 0);
  p.spine = D(6, -8, 0);
  p.chest = D(4, -6, 0);
  p.footL = D(0.14, 0.05, 0.16);
  p.footR = D(-0.14, 0.05, -0.18);
  p.fk = {};
  const handR: HandKey = kind === 'staff'
    ? { p: D(-0.24, 1.0, 0.18), dir: D(0.0, 1, 0.12), up: D(0, 0, 1) }
    : kind === 'bow'
      ? { p: D(-0.1, 1.28, 0.2), dir: D(0.1, 0.2, 1), up: D(0, -1, 0) }
      : kind === 'twohand'
        ? { p: D(-0.1, 1.02, 0.3), dir: D(0.25, 0.85, 0.45), up: D(0, -0.45, 0.9) }
        : { p: D(-0.26, 1.06, 0.3), dir: D(0.25, 0.75, 0.6), up: D(0.1, -0.6, 0.8) };
  p.handR = kind === 'none' ? null : handR;
  if (shield) p.handL = { p: D(0.2, 1.12, 0.38), dir: D(-0.1, 1, 0.05), up: D(0.15, 0, 1), socket: 'shieldL' };
  else if (kind === 'bow') p.handL = { p: D(0.08, 1.35, 0.55), dir: D(0, 1, 0.05), up: D(0, 0, 1) };
  else if (kind === 'twohand') p.handL = { p: D(-0.07, 0.94, 0.26), dir: D(0.25, 0.85, 0.45), up: D(0, -0.45, 0.9) };
  else p.fk = { upperArmL: D(-20, 0, 24), forearmL: D(-50, 0, 0) };
  if (kind === 'none' && !shield) p.fk = { upperArmL: D(-10, 0, 20), forearmL: D(-30, 0, 0), upperArmR: D(-10, 0, -20), forearmR: D(-30, 0, 0) };
  return p;
}

// ------------------------------------------------------------------------------------ lineup

interface Entry {
  label: string;
  proportions?: { height: number; bulk: number; shoulder: number };
  build: (rig: Rig) => CharacterModel;
  right?: string; left?: string; shield?: string;
  kind?: 'sword' | 'staff' | 'bow' | 'twohand' | 'none';
}

const sexQ = (qs.get('sex') ?? 'm') as 'm' | 'f';
const player = (label: string, look: ArmorLook, extra: Partial<Entry> = {}, sex: 'm' | 'f' = sexQ, hair?: 'dark' | 'fair'): Entry => ({
  label: `${label}${sex === 'f' ? ' ♀' : ''}`,
  build: (rig) => models.buildCharacter(rig, { head: look, body: look, arms: look, legs: look, cloak: true, sex, hair } as CharacterLookExt),
  ...extra,
});

const GROUPS: Record<string, () => Entry[]> = {
  player: () => [
    player('none', 'none', { kind: 'none' }),
    player('retainer', 'retainer', { right: 'retainer_sword', shield: 'household_shield', kind: 'sword' }),
    player('court', 'court', { right: 'court_staff', left: 'parrying_dirk', kind: 'staff' }),
    player('oath', 'oath', { right: 'oath_estoc', left: 'parrying_dirk', kind: 'sword' }),
    player('funeral', 'funeral', { right: 'mourning_mace', left: 'hand_bell', kind: 'sword' }),
    player('huntsman', 'huntsman', { right: 'skinning_knife', left: 'huntsman_bow', kind: 'none' }),
    player('condemned', 'condemned', { right: 'condemned_chain', kind: 'sword' }),
  ],
  player2: () => [
    player('commander', 'commander', { right: 'commander_blade', kind: 'twohand' }),
    player('greyford', 'greyford', { right: 'greyford_sabre', shield: 'greyford_tower_shield', kind: 'sword' }),
    player('warden', 'warden', { right: 'coinbreaker_hammer', shield: 'mint_buckler', kind: 'sword' }),
    player('hospice', 'hospice', { right: 'pilgrim_censer', shield: 'pilgrim_roundshield', kind: 'sword' }),
    player('bellkeeper', 'bellkeeper', { right: 'mint_seal_staff', kind: 'staff' }),
    player('gatewarden', 'gatewarden', { right: 'gatewarden_halberd', kind: 'twohand' }),
    player('retainer', 'retainer', { right: 'bellwarden_greatsword', kind: 'twohand' }, 'f', 'fair'),
    player('court', 'court', { right: 'court_staff', kind: 'staff' }, 'f', 'fair'),
  ],
  enemies: () => [
    ...(['infantry', 'sentry', 'shieldBearer', 'archer', 'greyfordSoldier'] as EnemyLook[]).map((l, i): Entry => ({
      label: l,
      build: (rig) => models.buildEnemy(rig, l, i + 1),
      right: l === 'sentry' ? 'enemy_spear' : l === 'archer' ? undefined : l === 'greyfordSoldier' ? 'greyford_sabre' : 'enemy_sword',
      left: l === 'archer' ? 'enemy_bow' : undefined,
      shield: l === 'shieldBearer' ? 'tower_shield' : undefined,
      kind: l === 'sentry' ? 'twohand' : l === 'archer' ? 'bow' : 'sword',
    })),
    { label: 'infantry#2', build: (rig) => models.buildEnemy(rig, 'infantry', 7), right: 'enemy_sword', kind: 'sword' },
    { label: 'commander', proportions: { height: 1.12, bulk: 1.25, shoulder: 1.1 }, build: (rig) => models.buildEnemy(rig, 'commander', 1), right: 'corvane_sword', kind: 'twohand' },
    { label: 'commander2', proportions: { height: 1.12, bulk: 1.25, shoulder: 1.1 }, build: (rig) => models.buildEnemy(rig, 'commander2', 1), right: 'corvane_sword', kind: 'twohand' },
  ],
  npcs: () => (['oswin', 'hesper', 'brannoc', 'dummy', 'bellkeeper', 'aldren_memory'] as NpcLook[]).map((l): Entry => ({
    label: l,
    proportions: l === 'aldren_memory' ? { height: 1.1, bulk: 1.05, shoulder: 1.05 } : l === 'hesper' ? { height: 0.97, bulk: 1.0, shoulder: 0.98 } : undefined,
    build: (rig) => models.buildNpc(rig, l),
    kind: 'none',
  })),
  single: () => {
    const l = (qs.get('look') ?? 'retainer') as ArmorLook;
    return [player(l, l, { right: 'retainer_sword', shield: 'household_shield', kind: 'sword' })];
  },
};

const stats: Record<string, unknown> = {};
(window as unknown as { __stats: typeof stats }).__stats = stats;
const info = document.getElementById('info')!;
const actors: { rig: Rig; model: CharacterModel; solver: PoseSolver; pose: PoseSpec }[] = [];
let span = 0;

function addCharacters(entries: Entry[]) {
  const poses = poseMode === 'both' ? ['a', 'guard'] : [poseMode];
  const spacing = 1.15;
  const lines: string[] = [];
  entries.forEach((e, i) => {
    poses.forEach((pm, j) => {
      const rig = new Rig(e.proportions ?? { height: 1, bulk: 1, shoulder: 1 });
      const t0 = performance.now();
      const model = e.build(rig) as BuiltModel;
      const ms = performance.now() - t0;
      const x = (i - (entries.length - 1) / 2) * spacing * (e.proportions ? 1.1 : 1);
      rig.root.position.set(x, 0, poses.length > 1 ? (j === 0 ? 0.9 : -0.9) : 0);
      if (poses.length > 1 && j === 1) rig.root.rotation.y = 0;
      scene.add(rig.root);
      const hasShield = !!e.shield;
      const pose = pm === 'a' ? basePose() : guardPose(e.kind ?? 'sword', hasShield);
      const solver = new PoseSolver(rig);
      let wTris = 0;
      const attach = (id: string | undefined, socket: 'weaponR' | 'weaponL' | 'shieldL') => {
        if (!id) return;
        const w = models.buildWeapon(id) as WeaponModelExt;
        rig.sockets[socket].add(w.object);
        wTris += w.triangles ?? 0;
      };
      attach(e.right, 'weaponR');
      attach(e.left, 'weaponL');
      attach(e.shield, 'shieldL');
      actors.push({ rig, model, solver, pose });
      if (j === 0) {
        stats[e.label] = { ...model.info, weaponTris: wTris, buildMs: Math.round(ms) };
        lines.push(`${e.label.padEnd(16)} tris ${String(model.info.triangles).padStart(6)}  meshes ${String(model.info.meshes).padStart(2)}  cloth ${model.info.cloths}  weapons ${wTris}  ${Math.round(ms)}ms`);
      }
    });
  });
  span = entries.length * spacing;
  info.textContent = lines.join('\n');
}

function addWeapons() {
  const ids = WEAPON_IDS;
  const cols = 11;
  const lines: string[] = [];
  ids.forEach((id, i) => {
    const w = models.buildWeapon(id) as WeaponModelExt;
    const c = i % cols, r = Math.floor(i / cols);
    const holder = new THREE.Group();
    holder.position.set((c - (cols - 1) / 2) * 0.62, 0.25 + (2 - r) * 1.0 + (w.object.name.includes('spear') || w.object.name.includes('halberd') ? 0 : 0), 0);
    const isShield = /shield|buckler/.test(id);
    // show blade flats to the camera (flats face ±X), shields face-on
    w.object.rotation.y = isShield ? 0 : Math.PI / 2;
    const long = /spear|halberd|staff|greatsword|corvane/.test(id);
    if (long) { w.object.scale.setScalar(0.5); }
    holder.add(w.object);
    // grip marker
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    holder.add(m);
    if (w.hit) {
      const s = long ? 0.5 : 1;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(w.hit.radius * s, w.hit.radius * s, (w.hit.to - w.hit.from) * s, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x40ff80, wireframe: true, transparent: true, opacity: 0.25 }));
      seg.position.y = ((w.hit.from + w.hit.to) / 2) * s;
      holder.add(seg);
    }
    scene.add(holder);
    lines.push(`${id.padEnd(22)} tris ${String(w.triangles).padStart(5)} meshes ${w.object.children.length}${w.offhandGrip !== undefined ? ` offhand ${w.offhandGrip}` : ''}`);
    stats[id] = { triangles: w.triangles, meshes: w.object.children.length };
  });
  // household shield back view
  const back = models.buildWeapon('household_shield');
  back.object.rotation.y = Math.PI;
  back.object.position.set(3.6, 0.5, 0);
  scene.add(back.object);
  span = cols * 0.62;
  info.textContent = lines.join('\n');
}

function addHands() {
  // close-ups: retainer with sword + shield in guard and A pose, court with staff, huntsman with bow
  const entries: Entry[] = [
    player('retainer', 'retainer', { right: 'retainer_sword', shield: 'household_shield', kind: 'sword' }),
    player('court', 'court', { right: 'court_staff', kind: 'staff' }),
    player('huntsman', 'huntsman', { left: 'huntsman_bow', right: 'arrow', kind: 'bow' }),
  ];
  addCharacters(entries);
}

async function main() {
  await initMaterials(renderer);
  if (group === 'weapons') addWeapons();
  else if (group === 'hands') addHands();
  else addCharacters((GROUPS[group] ?? GROUPS.player)());
  for (const a of actors) {
    a.solver.apply(a.pose);
    a.rig.root.updateMatrixWorld(true);
    a.model.resetSecondary();
    // settle cloth
    for (let i = 0; i < 150; i++) a.model.updateSecondary(1 / 60);
  }
  const clock = new THREE.Clock();
  let frames = 0;
  const yaw0 = Number(qs.get('angle') ?? 20) * Math.PI / 180;
  const distK = Number(qs.get('dist') ?? 1);
  const camY = Number(qs.get('y') ?? (group === 'weapons' ? 1.5 : 1.25));
  const target = new THREE.Vector3(Number(qs.get('tx') ?? 0), Number(qs.get('ty') ?? (group === 'weapons' ? 1.4 : 0.95)), 0);
  const dAbs = qs.get('d') ? Number(qs.get('d')) : 0;
  const tick = () => {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    const yaw = orbit ? yaw0 + t * 0.15 : yaw0;
    const d = dAbs || Math.max(4.5, span * 1.05) * distK * (group === 'hands' ? 0.5 : 1);
    camera.position.set(target.x + Math.sin(yaw) * d, camY + (group === 'hands' ? 0.1 : 0), Math.cos(yaw) * d);
    camera.lookAt(target);
    for (const a of actors) {
      a.solver.apply(a.pose);
      a.rig.root.updateMatrixWorld(true);
      a.model.updateSecondary(dt);
    }
    renderer.render(scene, camera);
    if (++frames === 8) (window as unknown as { __ready: boolean }).__ready = true;
    requestAnimationFrame(tick);
  };
  tick();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

main().catch((e) => { info.textContent = String(e?.stack ?? e); console.error(e); });
