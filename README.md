# Bells of the Unlived

A single-player, offline, third-person Soulslike action RPG.

> *You remember the catastrophe, but every life you save changes the future you know.*

Current milestone: **Ashbridge** — the complete first region (20–40 minutes): the Watchtower,
Lower Street, the Old Mint and its barred refugee road, the undercroft and the imprisoned healer,
the garrison courtyard and drawbridge shortcut, the Hospice of the Quiet Hour, and Ser Corvane
Aldmoor, the Bell-Appointed Commander.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # typecheck + production build in dist/ (+ dist/licenses)
npm run play       # build, then serve dist/ on 127.0.0.1:4173 and open it (fully offline)
npm test           # unit tests (combat timing, saves, journal, balance, input)
```

Everything (models, textures, animation, sound, music, icons) is generated procedurally at runtime;
there are no binary assets. The game runs fully offline once built.

Development URL options: `?skipintro` (new game without the opening), `?origin=courtMage`,
`?sandbox` (test arena; `&enemies=4&kinds=infantry,archer`, `&boss`), `?hitboxes`, `?mannequin`.

## Controls (defaults; remappable per device in Settings → Controls)

| Action | Controller | Keyboard & mouse |
|---|---|---|
| Light attack / cast | RB / R1 | Left mouse |
| Heavy attack (hold to charge) | RT / R2 | Shift + left mouse |
| Guard | LB / L1 | Right mouse |
| Parry | LT / L2 | Shift + right mouse |
| Imprint Technique (hold guard: shield technique) | Y / △ | F |
| Dodge (tap) · Sprint (hold) | B / ○ | Space |
| Interact | A / ✕ | E |
| Use item | X / □ | R |
| Lock on / switch target | R3 · right stick | Q or middle mouse · mouse flick / wheel |
| Cycle spell / item / right / left | D-pad | 1 2 3 4 (or arrows) |
| Journal · Pause | View · Menu | J · Esc |

## Structure

| Path | What |
|---|---|
| `docs/GDD.md`, `docs/ASHBRIDGE.md` | Design (systems, numbers, campaign) and the slice spec |
| `docs/LICENSES.md` | Third-party license record |
| `src/core` | Fixed-step loop (60 Hz, interpolated rendering), math, events |
| `src/input` | Keyboard/mouse + gamepad actions, remapping, prompts, device switching |
| `src/actors` | Rig, IK animation system and clips, Player, Enemy, NPC, models |
| `src/combat` | Moves (windup/active/recovery), hit tracing, defence rules, projectiles, stats |
| `src/systems` | Player data, world state, Forememory journal, saves |
| `src/game` | Game loop glue, camera, session flow, UI host, region logic |
| `src/world`, `src/content/ashbridge` | Collision, architecture kit, the Ashbridge level |
| `src/render` | Renderer, post-processing, procedural materials, heraldry, particles |
| `src/audio` | Procedural sound effects, ambience and music |
| `src/ui` | HUD and every menu (HTML/CSS overlay) |
| `tests`, `tools` | Unit tests, browser play-tests, previews |
