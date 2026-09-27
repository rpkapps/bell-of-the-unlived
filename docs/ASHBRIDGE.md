# Ashbridge — Playable Slice Specification

One 20–40 minute expedition. Border province town at dusk: half-timbered houses colliding with
stone, a burned district from a war that has not happened yet, the gatehouse from the concept art.

## Cast
| Character | Role |
|---|---|
| **The Returned** | Player. A royal retainer twenty years younger than his memories. |
| **Oswin Marrow** | Healer. In the remembered future: imprisoned by the Commander, died in a cell before the siege. Now: held in the locked refuge below the mint. |
| **Hesper Vail** | Smith. Stayed behind in the abandoned hospice; sets up the forge there. |
| **Ser Corvane Aldmoor** | The bell-appointed Commander of Ashbridge. Remembered: sealed the refugee road, imprisoned Oswin, opened the east gate to the enemy host. |
| **Sergeant Brannoc** | An Unlived soldier beneath the town, from a war (Greyford) that was erased. Recognises the Returned. Starts the *Unlived Muster* questline. |

## Route (critical path, with the loop)

```
                        [Commander's Yard]  ← arena (fog of bell-light, plain-language warning)
                                |
                        [Gate Approach]     ← 2 infantry, stair up
                                |
[Watchtower]══drawbridge══[Courtyard]──[Hospice]  (refuge: smith, practice yard, alt gear, Stillbell)
  Stillbell ☼       ↑ lever  |  shield bearer, archer on parapet, Bellbronze Shard
     │                       │ stair up
     │ cliff stair      [Lower Passage]  ← sentry (backstab), infantry, Cinder Bolt grimoire,
     │                       │             chest, locked refuge (Oswin)
[Lower Street]──────[Old Mint]─[Counting Room] ← barred escape route + service hatch
  3 infantry           2 infantry
```

1. **Watchtower Stillbell** — opening: the dying memory, the brand, waking twenty years earlier.
   Origin selection (Household Knight or Court Mage; all six shown, four marked "Chronicle
   unwritten"). From the rampart the raised drawbridge across the ravine is visible — a promise
   of a shortcut.
2. **Lower Street** — burned timber houses cutting through a prosperous stone facade; a relief
   celebrating the *Victory of Greyford* above graves dated years before it. First infantry.
3. **Old Mint** — entry hall with coin presses, counting room.
   * Memory trigger at the counting room door: the refugees' escape route under the floor.
   * Present: the route is **barred with fresh masonry** (damp mortar, tools left behind).
   * A **service hatch** beside it (visible, rusted ring) — interact to heave it open
     (persistent). It drops to the same lower passage.
4. **Lower Passage** — vaulted service tunnel.
   * **Lone sentry** faces a wall, muttering; approach from behind → backstab tutorial prompt.
   * Infantry patrol.
   * **Cinder Bolt** grimoire on a clerk's desk (learnable by anyone; castable with a catalyst).
   * **Treasure chest** — Warden's Talisman (+15 % stamina regeneration).
   * **Locked refuge** — Oswin behind a barred door. The sentry carries the *Refuge Key*
     (also found on the counting-room ledger hook for players who avoid the sentry).
     Freeing him: short dialogue; he leaves for the hospice.
   * Stair up to the courtyard.
5. **Courtyard** — shield bearer (teaches guard breaks: tutorial hint on first block),
   archer on the parapet (reachable by side stair), one infantry. **Drawbridge lever** at the
   west gate lowers the drawbridge to the watchtower (persistent shortcut). Bellbronze Shard on
   a fallen cart.
6. **Hospice** — abandoned hospice turned refuge. Stillbell. Hesper Vail (smith). Practice
   yard with plaques: guard, parry, backstab, guard break, posture break, dodge i-frames,
   Forememory. A rack with the other origin's starting gear so the player can switch builds.
   After rescue, Oswin tends the beds and teaches *Stilling Chime*.
7. **Gate Approach** — stair up past the gatehouse; two infantry.
8. **Commander's Yard** — before the fog: warning, in plain language:
   > *"Beyond this veil, Ser Corvane waits. Once you cross it, the Commander's men will move
   > anyone still imprisoned below the mint. Cross now?"*  (only shown while Oswin is still
   > imprisoned; otherwise: "Beyond this veil, Ser Corvane waits.")
   Entering with Oswin still in the refuge → he is **taken** (persistent): the refuge is empty
   with a dropped rosary, and the journal records the loss.

## Commander Corvane (two phases)
* **Phase 1 — "The Appointed Commander"** (HP 100 %→55 %). Longsword + bell-standard at his
  back. Moves: diagonal cut (0.55 s windup), two-cut chain, lunging thrust (0.7 s windup,
  parryable), shoulder charge (unparryable, jagged ring icon), toll slam (ground AoE, jump
  back tell), backstep. Readable windows after every string.
* **Transition**: his anchor-bell rings; he sheds his cloak; competing version of his theme.
* **Phase 2 — "The Measure"** (55 %→0). Faster recovery, adds **the Measure**: two diagonal cuts,
  a thrust, then an **exposed overhead** (1.1 s windup, long recovery). Knowing about it helps
  — it is *never* retimed by memory. Also adds bell-fire sweep (fire trail) and a delayed
  overhead feint that is a single, clearly separate move.
* On defeat: the anchor (bell-standard) shatters; the yard floor collapses into light and
  reveals **the impossible battlefield** below: rows of Unlived soldiers from Greyford.
  Sergeant Brannoc: *"Captain…? You held the ford with us. You said you'd come back."*
  The Returned: *"I have never been to Greyford."* → End of slice / region.
* Short retry path: Hospice Stillbell → 25 s walk → fog.

## Persistence checklist
| Change | Flag |
|---|---|
| Service hatch opened | `ashbridge.hatchOpen` |
| Oswin rescued / taken | `npc.oswin` = `rescued` / `taken` |
| Drawbridge lowered | `ashbridge.drawbridge` |
| Commander defeated | `boss.corvane` |
| Chest opened, grimoire, shard, key | `pickup.*` |
| Stillbells lit | `stillbell.*` |

## Forememory entries
See `src/content/journal.ts` — every lead has *Remembered*, *Observed now* and *Confirmed change*
entries, and players can name: the remembered lead (escape route under the counting room), the
present contradiction (fresh masonry), and the intervention (healer rescued → hospice, or
taken → empty refuge).
