# Building a region (Phase 2)

Every institution region (Army, Academy, Cathedral, Treasury, Household) and the Belfry are built the
same way. Ashbridge (`src/content/ashbridge/*`, `src/game/regions/Ashbridge.ts`) is the reference
implementation of quality and detail; new regions use the generic `RegionBase` instead of its
bespoke controller.

## Files a region owns (`<r>` = army | academy | cathedral | treasury | household | belfry)

| File | Purpose |
|---|---|
| `src/content/<r>/meta.ts` | **Always loaded.** `registerItems`, `registerLeads`, `registerText`, `registerDialogue` (only lines needed outside the region, e.g. Hospice guests), `registerHospiceGuest`, spells (`Object.assign(SPELLS, …)`), shop stock (`Object.assign(SHOP_STOCK, …)`), memory rewards. No geometry. |
| `src/content/<r>/module.ts` | **Lazy.** `export default { build, create }` (`RegionModule`). Imports everything heavy. |
| `src/content/<r>/level*.ts` | The level builder(s) returning `RegionLayout` (`src/world/levelTypes.ts`). |
| `src/content/<r>/enemies.ts` | `registerEnemyDefs`, `registerMoves`, `registerClips` for the region's enemies. |
| `src/content/<r>/bosses.ts` | `registerBoss(BossSpec)` for mid-boss and keeper (+ moves/clips). |
| `src/content/<r>/Region.ts` | `class XRegion extends RegionBase` — quest logic. |
| `src/content/<r>/models.ts` | `registerEnemyLook` / `registerNpcLook` / `registerWeaponModel` builders. |
| `src/content/<r>/clips.ts` | Animation clips (IK keyframes) for enemies/bosses/NPCs. |
| `src/content/<r>/environments.ts` | `registerEnvironment(id, def)` presets (copy `ENVIRONMENTS.ashbridgeDusk` and override). |
| `tests/<r>.test.ts` | Traversal/connectivity test of the level (see `tests/connectivity.test.ts`). |
| `tools/preview/<r>.html/.ts` | Optional preview page. |

Never edit shared files (contracts, `src/game/*`, `src/actors/*` outside `models/` registrations,
other regions). If you need a change, ask the lead in your final report. Registries exist so you
never have to.

## What every institution region must contain
1. **A dense, interconnected level** (~25–40 minutes): 3 Stillbells (ids fixed in
   `src/game/regions/catalog.ts`; the first is the entry bell and the player's arrival point), at
   least two looping shortcuts that persist (flags), verticality, 2+ secrets/loot nooks, a landmark
   (the Great Bell) visible from the entry, and histories that visibly contradict each other.
2. **5–7 enemy types** with distinct silhouettes and movesets, readable tells (windups ≥ 0.5 s,
   follow-ups told by the first hit), and at least one region-specific mechanic listed in your brief.
3. **Bosses**: the keeper (2–3 phases, `phases` thresholds, `transitions`, phase `looks`, a Final
   Memory item with 3 rewards) guarding the Great Bell; plus the mid-boss from the roster (GDD §13).
   The keeper's arena `onDefeat` pieces must include the Great Bell's anchor shattering.
   Boss music is automatic (`boss:<id>:<phase>`).
4. **Forememory**: at least one lead with a *Remembered* opportunity, *Observed* evidence that
   supports or contradicts it (use `contradicts` + `contradictionNote`), and an intervention whose
   *Confirmed change* is visible and persistent (and possibly a loss). Memories never buff stats and
   are never required.
5. **An ally** who can be saved or lost (`ws.npcs[id]` = `'rescued'` / `'taken'` / `'dead'`),
   registered as a Hospice guest (teacher, merchant or smith) in `meta.ts`.
6. **The Unlived Muster**: one Greyford soldier (look `greyfordSoldier` or your own) whose small
   optional task sets `ws.flags['muster.<r>'] = true` (the Shelter ending needs all five).
7. **Keepers have convictions**: intro / phase / death lines that make their case (some believe the
   Returned is the invader dismantling the kingdom's protection).
8. **The Unfinished Toll**: iron bell-posts at crossroads (`tollPosts`) and `objective()` returning
   the current unresolved lead's position.

## How things work (read these files)
* `src/game/regions/RegionBase.ts` — enemies/bosses/arenas/Stillbells/zones/toll/triggers and
  helpers: `pickup`, `opener`, `inspectAt`, `onTrigger`, `talk`, `inspect`, `spawnNpc`, `record`,
  `subtitle`, `memoryFlash`, `flag/setFlag`, `pieceFlags()`, `arenaWarning()`, `beforeArena()`,
  `onBossDefeated()`.
* `src/world/levelTypes.ts` — `RegionLayout`, `ArenaLayout`, `EnemySpawn`, `Zone`, `DynamicPiece`.
  The caller builds the collision world; dynamic pieces manage their own colliders in `set()`.
* `src/world/kit/*` — architecture & prop kit (walls, towers, houses, stairs+ramps, arches, vaults,
  roofs, ~50 props, shrine with bell, backdrops, smoke). `Kit` batches geometry per material.
* `src/render/materials.ts` / `materialIds.ts` — triplanar weathered materials; `lights.ts`
  `registerLight`/`makeFlameLight` for lamps (budgeted automatically).
* Enemies: `src/actors/Enemy.ts` (`EnemyDef`, AI: perception, strafe, attacks with ranges/weights/
  cooldowns/follow-ups, guard, keepDistance, passive), `src/content/enemies.ts` (examples),
  `src/combat/types.ts` (`MoveDef`, `HitSpec`: windows, hyper-armour, tells, sphere hits).
* Bosses: `src/content/bosses.ts` (`BossSpec`, `registerBoss`, `Boss` with `onEvent` for custom
  move events, `cls` for a subclass with bespoke mechanics).
* Animation: IK keyframes (`src/actors/anim/types.ts`, `Clip.ts`), examples in
  `src/actors/anim/clips/*` (`unlived.ts`, `commander.ts`). Preview: `tools/preview/anim.html`.
  Root space: +Z forward, −X is the character's right; hands are placed by grip position + item
  direction. Always author a readable windup.
* Models: `src/actors/models/*` — `CharBuilder` toolkit (see `enemies.ts`, `character.ts`),
  `registerEnemyLook(look, (rig, seed) => model)`.
* Content text style: `src/content/dialogue.ts`, `text.ts`, `journal.ts` (funerary, restrained,
  humane; subtitle lines ≤ 140 chars).

## Coordinates, budgets, testing
* World axes: X east, Y up, Z south (north is −Z); yaw 0 faces +Z. Build around the origin; each
  region is its own scene.
* Budgets per view: ≤ 300 draw calls, ≤ 1.5 M triangles; merge static geometry per material;
  instancing for repeats; ≤ ~24 registered lamps.
* Verify: `npx tsc --noEmit` (fix your own errors), a vitest traversal test for your level, and a
  headless logic run (`?norender`) through your quest flow. Screenshots: use a small viewport
  (960×540), `quality=low|medium`; software GL is slow and the machine is shared — keep browser
  sessions short and kill your dev servers. Start your own server on your assigned port:
  `npx vite --port <port> --strictPort`.
* To enter your region in the running game: `http://127.0.0.1:<port>/?skipintro&region=<r>`
  starts a new game directly at your entry Stillbell (all earlier unlock flags set).
