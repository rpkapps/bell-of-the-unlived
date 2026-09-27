/**
 * The Garden Court: build + traversal. A capsule walks the loop (entry → maze → servants' passages →
 * gallery → balcony → antechamber → hall → portcullis → terrace → parterre → orangery → the heirs'
 * court → loggia → antechamber → throne room → Bell Stair → terrace of the Great Bell), the side
 * rooms and secrets; negative checks prove the closed pieces (bolted door, portcullis, fog gates,
 * heirs' gate, signet door, buttery) really block. Also checks the content wiring (Stillbell ids,
 * anchors the controller needs, bosses/enemies/items registered).
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { walk, type WalkResult } from '../src/content/ashbridge/connectivity';
import { buildHousehold, type HouseholdLayout } from '../src/content/household/level';
import { MAZE, mazeCell, mazePath, GARDEN_DOOR_Z } from '../src/content/household/levelGarden';
import { PLAN, Y0, YH, YU, YT } from '../src/content/household/levelCommon';
import { regionInfo } from '../src/game/regions/catalog';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function build() {
  const scene = new THREE.Scene();
  const collision = new CollisionWorld();
  const L = buildHousehold({ scene, collision, quality: 'low', sun: new THREE.DirectionalLight() });
  collision.build();
  return { L, collision, scene };
}

/** Cell-centre path until it reaches the grave corner (rows 10–11 of columns 0–1), where the tomb stands in the middle. */
function toCorner(path: THREE.Vector3[]) {
  const i = path.findIndex((p) => p.x < -30.5 && p.z < 10.5);
  return (i >= 0 ? path.slice(0, i) : path).slice(1);
}

function runChecks(L: HouseholdLayout, world: CollisionWorld): WalkResult[] {
  const out: WalkResult[] = [];
  const K = L.killY;
  const P = L.pieces;
  const heirs = L.arenas.find((a) => a.bossId === 'heirs')!, cel = L.arenas.find((a) => a.bossId === 'celwyn')!;
  const all = [P.kitchenDoor, P.portcullis, P.butteryDoor, P.signetDoor, P.heirsGate, P.posternDoor, heirs.fogGate, cel.fogGate];
  const reset = () => all.forEach((p) => p.set(0));

  // ------------------------------------------------ negative checks
  reset();
  out.push(walk(world, 'bolted kitchen door blocks the yard', V(-36.4, Y0, 56), [V(-40, Y0, 56)], K, true));
  out.push(walk(world, 'portcullis blocks the palace', V(0, YH, -11), [V(0, YH, -18)], K, true));
  out.push(walk(world, 'signet door blocks the Bell Stair', V(12, YU, -76), [V(17, YU + 1.2, -76)], K, true));
  out.push(walk(world, 'heirs fog blocks the court', V(47, Y0, -3), [V(47, Y0, -10)], K, true));
  out.push(walk(world, 'heirs gate blocks the loggia stair', V(47, Y0, -37), [V(47, Y0, -42)], K, true));
  out.push(walk(world, 'Celwyn fog blocks the terrace', V(24.8, YT, -76), [V(29, YT, -76)], K, true));
  out.push(walk(world, 'locked buttery', V(-50, Y0, 46), [V(-50, Y0, 41)], K, true));
  out.push(walk(world, 'the postern is shut', V(-51, Y0, 7), [V(-56, Y0, 7)], K, true));
  out.push(walk(world, 'no way out of the parterre north of the maze', V(-20, Y0, 1.8), [V(-20, Y0, -8)], K, true));

  // ------------------------------------------------ open everything the loop needs
  reset();
  for (const p of all) if (p !== P.posternDoor) p.set(1);
  const s = L.playerStart.pos;
  const maze = L.maze;
  const toDoor = mazePath(maze, [3, 0], [0, 5]);
  out.push(walk(world, 'entry → yard arch → maze → garden door → passage', s.clone(), [
    V(-22, Y0, 60), V(-22, Y0, 50), V(-24.9, Y0, 49.2), ...toDoor, V(-37.2, Y0, GARDEN_DOOR_Z), V(-41, Y0, GARDEN_DOOR_Z), V(-45.5, Y0, GARDEN_DOOR_Z),
  ], K));
  out.push(walk(world, 'maze → gazebo (Vow Parry) and back to the east mouth', mazeCell(0, 5), [
    ...mazePath(maze, [0, 5], [3, 5]).slice(1), V(-23, Y0 + 0.1, 27.1), ...mazePath(maze, [3, 5], [7, 6]), V(-6.5, Y0, 23.6), V(0, Y0, 24),
  ], K));
  out.push(walk(world, 'maze → grave corner (Oath set, Greyford colour)', mazeCell(0, 5), [
    ...toCorner(mazePath(maze, [0, 5], [0, 10])), V(-34.2, Y0, 7.4), V(-35.4, Y0, 7.2), V(-34.2, Y0, 6.5),
  ], K));
  out.push(walk(world, 'passage side rooms (linen, postern lobby, pantry)', V(-45.5, Y0, GARDEN_DOOR_Z), [
    V(-45.5, Y0, 25), V(-49, Y0, 25), V(-50, Y0, 27.5), V(-49, Y0, 25), V(-45.5, Y0, 25),
    V(-45.5, Y0, 12), V(-41.5, Y0, 12), V(-41, Y0, 10.8), V(-45.5, Y0, 12),
    V(-45.5, Y0, 7), V(-50.5, Y0, 7), V(-45.5, Y0, 7),
  ], K));
  out.push(walk(world, 'passage → kitchen → (kitchen door) → yard; buttery', V(-45.5, Y0, 30), [
    V(-45.5, Y0, 46), V(-42, Y0, 47.5), V(-42, Y0, 53), V(-40, Y0, 56), V(-36, Y0, 56), V(-30, Y0, 62), V(-37, Y0, 56), V(-42, Y0, 53), V(-42, Y0, 47.5),
    V(-50, Y0, 46.5), V(-50, Y0, 42), V(-49.6, Y0, 40.8),
  ], K));
  out.push(walk(world, 'passage → servants\' stair → landing → gallery → jib door → balcony → antechamber', V(-45.5, Y0, 0), [
    V(-45.5, Y0, -5.5), V(-45.5, YU, -20.2), V(-45.5, YU, -22), V(-40, YU, -21.6), V(-36, YU, -21.6), V(-23, YU, -23), V(-15.5, YU, -23),
    V(-11.2, YU, -23), V(-10, YU, -30), V(-10, YU, -43), V(-10, YU, -46), V(-3, YU, -48),
  ], K));
  out.push(walk(world, 'antechamber → grand stair → hall → portcullis → terrace → avenue → crossing', V(0, YU, -47), [
    V(0, YU, -44.5), V(0, YH, -30.4), V(-3.5, YH, -29), V(-3.5, YH, -16.4), V(0, YH, -16.2), V(0, YH, -12), V(0, YH, -4.4), V(0, Y0, 1.8), V(0, Y0, 10), V(0, Y0, 24),
  ], K));
  out.push(walk(world, 'crossing → around the fountain → orangery → Stillbell → walkway (shard)', V(0, Y0, 24), [
    V(14, Y0, 24), V(15, Y0, 28.2), V(26, Y0, 28.2), V(30, Y0, 24), V(35, Y0, 24), V(38, Y0, 24), V(40.2, Y0, 30.6), V(42, Y0, 32.3), V(44.2, Y0, 32.3),
    V(54.3, 3.6, 32.3), V(55.6, 3.6, 31.4), V(55.6, 3.6, -3.4),
  ], K));
  out.push(walk(world, 'orangery → heirs\' court → gate → loggia stair → loggia → antechamber', V(47, Y0, 24), [
    V(47, Y0, -2), V(47, Y0, -10), V(47, Y0, -24), V(47, Y0, -38.5), V(47, Y0, -41.2), V(47, YU, -52.8), V(47, YU, -55.5), V(30, YU, -55.5), V(15, YU, -55.2), V(11, YU, -55), V(4, YU, -52),
  ], K));
  out.push(walk(world, 'antechamber → throne room → dais (scrap) → signet door → Bell Stair → terrace of the Great Bell', V(0, YU, -52), [
    V(0, YU, -57), V(0, YU, -62), V(0, YU, -74.6), V(2.8, YU + 0.9, -79), V(2.8, YU + 0.9, -85.6), V(0, YU + 0.9, -85.6), V(2.8, YU + 0.9, -85.6),
    V(2.8, YU + 0.9, -79), V(8, YU, -75.8), V(12.5, YU, -76), V(16, YU, -76), V(PLAN.bStair.x1 - 0.2, YT, -76), V(25.6, YT, -76), V(29, YT, -76),
    V(PLAN.bell.c.x, YT, PLAN.bell.c.z), V(PLAN.bell.c.x, YT, -84.4),
  ], K));
  out.push(walk(world, 'yard: muster soldier and the servants\' gate Stillbell', s.clone(), [V(-33.5, Y0, 57), V(-26, Y0, 66), L.stillbells[0].anchor.pos.clone()], K));
  out.push(walk(world, 'bell terrace: the rim holds (no falling off the north edge)', V(PLAN.bell.c.x, YT, PLAN.bell.c.z), [V(PLAN.bell.c.x + 4, YT, -89.5)], K, true));
  return out;
}

describe('Garden Court (Royal Household)', () => {
  const { L, collision } = build();

  it('wiring: Stillbells, arenas, anchors, pieces', () => {
    const info = regionInfo('household')!;
    expect(L.stillbells.map((b) => b.id)).toEqual(info.bells.map((b) => b.id));
    expect(L.arenas.map((a) => a.bossId).sort()).toEqual(['celwyn', 'heirs']);
    for (const a of ['page', 'coercer', 'waxTable', 'postern', 'pageCap', 'musterSoldier', 'greyfordColour', 'oathSet', 'gazeboTable', 'pantryLoot', 'galleryNiche', 'hallResin',
      'throneScrap', 'orangeryShard', 'butteryLoot', 'yardScrap', 'parterreScrap', 'kitchenDoorYard', 'portraits', 'coronationRolls', 'thrones', 'avenueStatue', 'mazeGraves',
      'orangeryBeam', 'greatBell', 'bellStairFoot', 'heirYounger']) expect(L.anchors[a], a).toBeTruthy();
    for (const p of ['kitchenDoor', 'portcullis', 'winch', 'butteryDoor', 'signetDoor', 'heirsGate', 'posternDoor', 'posternBar']) expect(L.pieces[p], p).toBeTruthy();
    expect(Object.keys(L.triggers).sort()).toEqual(['linenApproach', 'posternMemory']);
    expect(L.tollPosts.length).toBeGreaterThanOrEqual(2);
    expect(L.arenas.find((a) => a.bossId === 'celwyn')!.onDefeat!.length).toBeGreaterThan(0);
    expect(L.stats.lights).toBeLessThanOrEqual(30);
    console.log('household stats', JSON.stringify(L.stats));
  });

  it('every walk check passes', () => {
    const results = runChecks(L, collision);
    const failed = results.filter((r) => !r.ok);
    for (const f of failed) console.log('FAIL', JSON.stringify(f));
    expect(results.length).toBeGreaterThan(15);
    expect(failed.length).toBe(0);
  }, 240000);

  it('the maze is connected (every cell reachable from the south mouth)', () => {
    for (let c = 0; c < MAZE.cols; c++) for (let r = 0; r < MAZE.rows; r++) expect(mazePath(L.maze, [3, 0], [c, r]).length, `${c},${r}`).toBeGreaterThan(0);
  });

  it('content registered: enemies, bosses, items, leads, text', async () => {
    await import('../src/content/household/meta');
    await import('../src/content/household/enemies');
    await import('../src/content/household/bosses');
    const { ENEMY_DEFS } = await import('../src/content/enemies');
    const { BOSSES } = await import('../src/content/bosses');
    const { ITEMS } = await import('../src/content/items');
    const { LEADS } = await import('../src/content/journal');
    const { MEMORY_REWARDS, WARNINGS, BOSS } = await import('../src/content/text');
    const { MOVES } = await import('../src/combat/moves');
    const { CLIPS } = await import('../src/actors/anim/clips');
    for (const k of ['hhRetainer', 'hhDuellist', 'hhGardener', 'hhCourtier', 'hhGhost']) {
      const d = ENEMY_DEFS[k];
      expect(d, k).toBeTruthy();
      for (const a of d.attacks) {
        const m = MOVES[a.move];
        expect(m, a.move).toBeTruthy();
        expect(CLIPS[m.clip], m.clip).toBeTruthy();
        // readable tells: the first hit of every attack starts ≥ 0.5 s in (follow-ups are told by the first)
        if (m.hits?.length && !L.enemies.some(() => false)) expect(m.hits[0].start, a.move).toBeGreaterThanOrEqual(a.move.includes('back') ? 0.35 : 0.5);
      }
    }
    for (const b of ['celwyn', 'heirs', 'heirs_blood']) {
      const spec = BOSSES[b];
      expect(spec, b).toBeTruthy();
      for (const a of spec.def.attacks) { const m = MOVES[a.move]; expect(m, a.move).toBeTruthy(); expect(CLIPS[m.clip], m.clip).toBeTruthy(); }
      for (const t of spec.transitions ?? []) expect(MOVES[t], t).toBeTruthy();
    }
    expect(BOSSES.celwyn.phases.length).toBe(2);
    expect(MEMORY_REWARDS.memory_celwyn.length).toBe(3);
    for (const r of MEMORY_REWARDS.memory_celwyn) if (!r.id.startsWith('hours:')) expect(ITEMS[r.id], r.id).toBeTruthy();
    for (const id of ['ardent_longsword', 'ardent_heater', 'hh_signet', 'hh_cellar_key', 'hh_greyford_colour', 'memory_celwyn', 'household_guard_plate', 'imprint_vow_parry', 'imprint_greyford_flourish', 'imprint_riposte_stance', 'parrying_dirk', 'oath_coat', 'greyford_sabre', 'bellbronze_scrap', 'bellbronze_shard']) expect(ITEMS[id], id).toBeTruthy();
    const pl = LEADS.household_postern;
    expect(pl.entries.obs_coerced.contradicts).toBe('mem_postern');
    expect(pl.entries.conf_taken.loss).toBe(true);
    expect(WARNINGS.hh_heirs_page).toBeTruthy();
    expect(BOSS.celwyn.name).toBe('Dame Celwyn Ardent');
  });
});
