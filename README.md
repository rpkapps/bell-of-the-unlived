# Bells of the Unlived

A single-player, offline, third-person Soulslike action RPG.

> *You remember the catastrophe, but every life you save changes the future you know.*

The full campaign is playable from the Watchtower to the three endings:

| Region | Stillbells | Bosses |
|---|---|---|
| **Ashbridge** and the Hospice of the Quiet Hour (hub) | Watchtower, Hospice | Ser Corvane Aldmoor |
| **Siegeholm**, the Royal Army | Siege Road, Barbican, Marshal's Keep | Ram-Knight Oderic · Marshal Ysolde Varr |
| **The Suspended Campus**, the Royal Academy | Causeway, Lens Hall, Spire | Experiment No. 9 (optional) · Keeper Ilsabet Orrow |
| **The Pilgrim Stair** and the Cathedral | Pilgrims' Gate, Ossuary, Nave | The Procession · Saint Vessaline |
| **The Undervaults**, the Royal Treasury | Market, Counting Deep, Vault | Mimic Sovereign (optional) · Treasurer Aurel Mask |
| **The Garden Court**, the Royal Household | Servants' Gate, Orangery, Throne | The Twin Heirs · Dame Celwyn Ardent |
| **The Belfry of Return** | Foot, Crown | Condemned Bellkeeper (secret) · King Aldren (three phases) |

Army and Academy open after Corvane; the Cathedral after one Great Bell falls, the Treasury after
two, the Household after four, the Belfry after all five. Every institution has an ally who can be
saved (and then teaches, trades or smiths at the Hospice) or lost, and a Greyford soldier for the
Unlived Muster. The ending is chosen at the Bell of Return: Break the Covenant; Inherit it (three
allies saved); or Shelter the Unlived (the Muster complete).

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # typecheck + production build in dist/ (+ dist/licenses)
npm run play       # build, then serve dist/ on 127.0.0.1:4173 and open it (fully offline)
npm test           # unit tests (combat, saves, journal, balance, input, every level's traversal,
                   #   arsenal reach, beasts, registry id clashes)
```

Browser play-tests (headless, against the no-reload test server `sh tools/restart-test-server.sh`, :5191):
`node tools/slice-test.mjs <url>` (Ashbridge), `node tools/campaign-test.mjs` (travel through every
region and home), and per region `tools/preview/<region>.flow.mjs` / `army.mjs <url> all` /
`belfry.run.mjs <url> break|inherit|shelter`.

Everything (models, textures, animation, sound, music, icons) is generated procedurally at runtime;
there are no binary assets. The game runs fully offline once built.

Development URL options: `?skipintro` (new game without the opening), `?origin=courtMage`,
`?region=<id>` (new character at that region's entry Stillbell, earlier bosses marked defeated),
`?sandbox` (test arena; `&enemies=4&kinds=infantry,archer,warHound`, `&boss`), `?hitboxes`, `?mannequin`.

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
| `src/world`, `src/content/<region>` | Collision, architecture kit, and each region's level, enemies, bosses and quests (`docs/REGION_GUIDE.md`) |
| `src/content/beasts` | Quadruped enemies (hounds, carrion stag) shared by regions |
| `src/render` | Renderer, post-processing, procedural materials, heraldry, particles |
| `src/audio` | Procedural sound effects, ambience and music |
| `src/ui` | HUD and every menu (HTML/CSS overlay) |
| `tests`, `tools` | Unit tests, browser play-tests, previews |
