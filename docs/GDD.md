# Bells of the Unlived — Game Design Document

> *You remember the catastrophe, but every life you save changes the future you know.*

Single-player, offline, premium third-person Soulslike action RPG. This document is the
authoritative design. Numbers here are the tuning targets used in `src/content/`; when code and
this document disagree, the code comment must say why.

---

## 1. Fantasy, theme and tone

The Returned is a royal retainer who died watching **King Aldren** ring the five **Great Bells**
and erase the kingdom rather than accept defeat. A condemned bellkeeper branded his soul; he wakes
**twenty years earlier**, on his first day of service, still remembering.

The central question — *who has the right to decide which lives deserve to continue?* — is asked
by every region: the keepers each believe they protect the kingdom; the Unlived are the lives
Aldren decided were not worth keeping; the Returned is tempted, at the end, to make the same
decision.

Tone: funerary, restrained, humane. Bronze, candle smoke, worn heraldry. Hope is small and earned.

### 1.1 Restoration rules (enforced by systems, not by fiction alone)

| Rule | System |
|---|---|
| The opening regression happens once. Death never rewinds the world. | `WorldState` is never reset by death; only Unlived spawns respawn. |
| The Returned re-forms at his last Stillbell. | `Save.lastStillbell`. |
| Resting renews ordinary Unlived. | `Region.respawnUnlived()` on rest / death. |
| Boss anchors are destroyed on defeat; bosses stay dead. | `flags.boss.<id>.defeated`. |
| Living NPCs don't come back. Deaths and consequences persist. | `npcs.<id>.state` ∈ {`present`,`rescued`,`taken`,`dead`,…}. |
| Doors, bridges, loot and claimed training persist. | `flags.*`, `pickups.*` in the save. |

---

## 2. Design pillars → concrete rules

1. **Build freedom.** Every origin can reach every build. Respec is free and unlimited at any
   Stillbell. Smith materials have a catch-up source (the Hospice smith sells Tempered Scrap for
   Hours after the first boss).
2. **Readable combat and earned mastery.** Every action (player and enemy) is authored as
   `windup → active → recovery` with explicit seconds. Enemy windups ≥ 0.35 s except
   combo follow-ups, which are telegraphed by the first hit. Hitboxes are the swept blade of the
   visible weapon (see §4.7). Hitbox debug view is available in Settings → Gameplay.
3. **Knowledge as progression.** The journal keeps what you learned. Shortcuts stay open.
4. **Second chances with consequences.** Death costs Hours and position, never world state.
5. **A world worth learning.** Each region: one landmark visible from its start, ≥1 looping
   shortcut, a vertical traversal, ≥2 secrets, and contradicting histories placed side by side.

Core loop: recall a lead or follow a landmark → investigate the present → choose an approach and
fight → witness the consequence → return, prepare, reconsider what you remember.

---

## 3. Controls (Souls-standard defaults, fully remappable per device)

| Action | Controller (Xbox / PlayStation) | Keyboard & mouse |
|---|---|---|
| Move / camera | Left stick / right stick | WASD / mouse |
| Light attack · cast (catalyst in hand) | RB / R1 | Left mouse |
| Heavy attack (hold to charge) | RT / R2 | Shift + left mouse |
| Guard (hold or toggle) | LB / L1 | Right mouse |
| Parry | LT / L2 | Shift + right mouse |
| Imprint Technique | Y / △ | F |
| Dodge (tap) · Sprint (hold) | B / ○ | Space |
| Interact · confirm | A / ✕ | E |
| Use quick item (Recall Flask) | X / □ | R |
| Lock-on · switch target | R3 · right stick flick | Q or middle mouse · mouse flick / wheel |
| Cycle spell / item / right weapon / left weapon | D-pad ↑ ↓ → ← | 1 / 2 / 3 / 4 (also ↑ ↓ → ←) |
| Journal | View / Touchpad | J |
| Pause menu | Menu / Options | Esc |
| Walk (toggle) | L3 | Left Alt |

* Free aim: when not locked on, spells, bows and thrown tools travel toward the centre-screen
  reticle (shown only when a ranged action is available). Lock-on auto-aims at the target.
* Menus: stick/D-pad/arrow keys navigate, A/✕/Enter/E confirm, B/○/Esc back, LB/RB or Q/E switch
  tabs. The mouse can also click everything.
* The prompt glyphs follow the last device used. Mouse movement or a key press switches to KB/M
  prompts; any stick/button past dead-zone switches to controller prompts.
* Controller disconnect during play → pause with a "Controller disconnected" notice. All held
  inputs are released on disconnect, window blur and pause.
* Hold/toggle options: Guard, Sprint, Walk, Charge-heavy (toggle = press once to charge, press to
  release), Aim.

---

## 4. Combat

### 4.1 Rhythm
Read the threat → defend or reposition → exploit an opening → keep resources for the response.

### 4.2 Resources
* **Health** — Vigor. 0 → death.
* **Stamina** — Endurance. Spent by attacks, dodges, sprinting, casting and blocked hits.
  Regenerates after a 0.45 s delay at 45/s (30/s while guarding). Running out while guarding
  breaks the guard (1.1 s stagger). Actions can start with any positive stamina; they may
  overdraw into a negative pool that must regenerate back to 0 (prevents "free" last actions
  being punished twice, and matches the Souls feel).
* **Focus** — Mind. Pays for spells and Imprint Techniques only. No basic action ever costs
  Focus. Does not regenerate passively; restored by Recall Flask (Focus) charges and resting.
* **Posture** (enemies) — pressure meter. Hits add posture damage; guarding enemies take extra.
  Regenerates after 2.2 s without posture damage. When full → **posture break**
  (kneel, vulnerable 2.4 s). Bosses: 1.8 s.
* **Poise** — hidden resilience value that absorbs *interruption*, never damage. Each hit deals
  poise damage; if accumulated poise damage within 1.6 s exceeds poise, the target flinches.
  Heavy armour and certain enemy attacks ("hyper-armour" windows) add poise.
* **Equipment weight** — total load ÷ max load:
  * ≤ 30 % Light: fast roll (i-frames 0.06–0.42 s, 0.62 s total), 110 % move speed.
  * ≤ 70 % Medium: roll (i-frames 0.06–0.38 s, 0.72 s total).
  * ≤ 100 % Heavy: slow roll (i-frames 0.08–0.32 s, 0.95 s total), 88 % move speed.
  * > 100 % Overloaded: no roll (backstep only), walk speed.

Invulnerability is explicit: dodge i-frames are listed on the equipment screen and the character
flashes a faint bronze outline during i-frames when Settings → Gameplay → "Show i-frames" is on.

### 4.3 Actions (player)
Every action has `windup`, `active`, `recovery`, stamina cost, and cancel windows.
Light chains are 3 hits for swords (4 for daggers). Heavy attacks charge up to 0.8 s:
full charge = ×1.45 damage, ×2 posture damage, and breaks enemy guards.

| Action | Stamina | Notes |
|---|---|---|
| Light (sword) | 14 | chain; can cancel into dodge in recovery after 60 % |
| Heavy (sword) | 24 (+8 charged) | guard-breaking when charged |
| Dodge roll | 16 | i-frames per load class |
| Backstep | 10 | i-frames 0.05–0.20 s |
| Sprint | 9 / s | |
| Guard (hold) | — | blocked hit costs `damage × (1 − stability)` stamina, min 6 |
| Parry | 12 | active 0.08–0.30 s, recovery 0.42 s; whiffing is punishable |
| Cast | per spell | stamina + focus |
| Technique | per technique | stamina + focus |

### 4.4 Defensive rules (consistent for every attack)
* Every enemy attack is **blockable**, **parryable** or **unparryable**. Unparryable attacks glow
  with a red-bronze *and* show a jagged ring icon (never colour only). Grabs are unblockable and
  show a hand icon.
* Guarding negates physical damage by the shield's guard % (Household Shield 100 %), magic by
  magic guard %. Chip damage applies to non-negated portion.
* Parry succeeds when the parry active window overlaps the attack's impact. Success →
  attacker enters **Parried** vulnerable pose (1.5 s) → riposte available.
* Dodging through an active hitbox during i-frames takes nothing.

### 4.5 The four earned criticals
| Critical | Trigger | Vulnerable pose |
|---|---|---|
| Backstab | attack from behind (±50°) an unaware or recovering humanoid | none needed; marker shows |
| Parry riposte | successful parry | *Parried* — reeling, arms thrown wide |
| Guard-break critical | break an enemy's guard (charged heavy / sustained pressure on guard) | *Guard broken* — shield arm thrown up |
| Posture-break critical | fill posture | *Posture broken* — kneeling |

* An eligible target shows its vulnerable pose. When the player is in range (≤ 2.2 m, facing
  within 60°) a **critical marker** appears: a bronze diamond with a notched centre plus a pulse
  ring (shape + motion, never colour alone) and a soft chime with a subtitle cue "[Opening]".
* The normal attack input claims it, with or without lock-on.
* Criticals deal `weapon critical ×` damage (swords ×3.0, catalyst bash ×2.2). Bosses take the
  same multiplier but damage is capped at the current phase's remaining HP — a critical can
  never skip a phase.
* Allies can never fill posture beyond 90 % and can never perform criticals.

### 4.6 Criticals are never required
Every enemy is tuned so a build using only ordinary light/heavy attacks or ordinary spells can
win. The Commander has a readable window after every combination.

### 4.7 Hit detection (why attacks connect)
* Melee: during `active` the weapon's blade segment (grip → tip, from the animated rig used
  for rendering) is swept between simulation steps; the swept quad is tested against each
  target's hurt capsules. The same rig pose drives what you see, so hits match the blade.
* Each swing hits a target at most once. Contact point spawns sparks, a hit-stop of 60–110 ms
  (scales with damage), and a hit sound.
* Projectiles are swept spheres against world and hurt capsules.
* Simulation runs at a fixed 60 Hz; rendering interpolates. All timings are seconds, so
  results are identical at any frame rate (see `tests/combat-timing.test.ts`).

### 4.8 Imprint Techniques
Equippable weapon or catalyst skills. Slice set:
* **Oathbound Lunge** (Retainer Sword): stepping thrust, 18 focus, high posture damage.
* **Bulwark Toll** (Household Shield): shield bash that staggers; can break a guard.
* **Bellglass Ward** (Court Staff): 2.5 s ward that halves damage and adds poise; 22 focus.
* **Measured Cut** (Commander's Blade, reward): two-hit dash combo.

### 4.9 Spells (learned from teachers and grimoires)
| Spell | Source | Focus | Notes |
|---|---|---|---|
| Glinting Shard | Court Mage origin | 8 | fast bronze shard, Intellect |
| Cinder Bolt | Old Mint grimoire | 14 | slower fireball, burst, burns 3 s |
| Stilling Chime | Healer (after rescue) | 20 | heals 35 % over 2 s, Devotion |
| Ashen Veil | Healer (after boss) | 16 | brief damage-negation aura |

---

## 5. Progression

### 5.1 Attributes
| Attribute | Effect |
|---|---|
| Vigor | Health |
| Mind | Focus |
| Endurance | Stamina, equip load |
| Strength | Heavy weapons, strength scaling, guard stability |
| Dexterity | Fast weapons, bows, dex scaling |
| Intellect | Sorcery scaling, magic defence |
| Devotion | Rites (bell prayers) scaling, healing |

Level cost (Hours): `round(0.02·L³ + 3.06·L² + 105.6·L − 895)` clamped ≥ 400 (Souls-shaped).
Level = sum of attributes − 70 + 1.

### 5.2 Origins (all six defined; the slice offers Household Knight and Court Mage)
| Origin | Vig | Mnd | End | Str | Dex | Int | Dev | Kit |
|---|---|---|---|---|---|---|---|---|
| Household Knight | 13 | 8 | 12 | 13 | 11 | 7 | 9 | Retainer Sword, Household Shield, retainer's harness |
| Court Mage | 9 | 15 | 9 | 8 | 10 | 16 | 8 | Court Staff, Parrying Dirk, Glinting Shard, court robes |
| Oathblade | 11 | 9 | 12 | 10 | 15 | 8 | 8 | Oath Estoc, Parrying Dirk |
| Funeral Priest | 11 | 13 | 10 | 11 | 8 | 7 | 15 | Mourning Mace, Hand Bell (rites) |
| Royal Huntsman | 10 | 9 | 13 | 9 | 15 | 9 | 8 | Huntsman's Shortbow, Skinning Knife |
| Condemned Retainer | 14 | 7 | 13 | 15 | 9 | 7 | 8 | Condemned Chain (flail), rags |

The origin sets starting numbers and kit only. Respec redistributes every point freely.

### 5.3 Recall Flask
5 charges at start (+1 per Bellbronze Shard found; slice has one in the courtyard). Split between
Health (restore 45 % HP over 0.6 s) and Focus (restore 50 % focus) at any Stillbell.
Drinking: 0.35 s windup (slowed walk), 0.5 s recovery — punishable, readable.

### 5.4 Hours, death and Last Breath
Hours = currency and XP. On death all unspent Hours stay in the **Last Breath** at the death
position (clamped to last safe ground). Touching it restores them. Dying before recovering loses
them and leaves a new Last Breath. Boss arenas place the Last Breath at the arena entrance.

### 5.5 Smith
Weapon +0…+10. Cost: `Tempered Scrap` (+1…+5) and `Bellbronze Scrap` (+6…+10) plus Hours.
Catch-up: after the first boss, the Hospice smith sells Tempered Scrap (600 Hours each) so a
player switching build can bring a new weapon up to their level.

### 5.6 Boss memories
Each boss leaves a **Final Memory**. At a Stillbell it is exchanged for one of several previewed
rewards (weapon, technique, spell, or a large Hours sum). The Commander offers: *Measured Cut*
(technique), *Commander's Blade* (weapon), or 4,000 Hours.

---

## 6. Forememory

The journal keeps three categories per lead, always visually separate:

1. **Remembered** — what the Returned recalls of the erased future (sepia, handwritten style,
   bell-ink icon).
2. **Observed now** — evidence gathered in the present (plain, eye icon).
3. **Confirmed change** — a consequence the player caused, now true (bronze seal icon).

Rules: a remembered entry is never overwritten; when present evidence contradicts it, the
remembered entry stays visible and gains a "contradicted" annotation. Memories never buff stats,
never change timing, and are never required: everything required is findable in the present.

**Unfinished Toll**: at crossroads marked by a small iron bell-post, a faint toll plays from the
direction of the unresolved lead; the HUD bell at the top of the screen swings and its sound-line
brightens toward that direction (a visual equivalent that never requires hearing). It points
only at crossroads and never gives a marker or distance.

---

## 7. Campaign structure

1. **Ashbridge** (border province, tutorial region, 20–40 min) — see `docs/ASHBRIDGE.md`.
2. **Five institutions**, each keeping one Great Bell. After Ashbridge, Army and Academy are
   open; Cathedral opens after either; Treasury after any two; Household opens last (after
   four bells silenced).
3. **Central revelation** (after the third bell): the Treasury ledgers of *futures rejected*
   and the Cathedral's record of absorbed names show Aldren had rung the bells dozens of times
   before the defeat the Returned remembers.
4. **Aldren**, three versions of his reign in one fight.
5. **Three endings** determined by quest/alliance state plus a final decision.

### 7.1 Regions

| Region | Discarded history | Identity | Enemies | Keeper (boss) |
|---|---|---|---|---|
| **Royal Army** — Siegeholm | The same siege won and lost at once; victory reliefs next to mass graves. | Iron, siege works, percussion. Snow. | Shield formations (3-man walls that rotate), crossbow lines, artillery sightlines (cover-based). | **Marshal Ysolde Varr**, who believes the kingdom survives only by winning every siege — even one that never ended. |
| **Royal Academy** — the Suspended Campus | Incompatible experiments stacked vertically. | Glass, suspended structures, unresolved tones. Sea cliffs. | Glass acolytes (ranged), ritual circles to interrupt, echo-constructs. | **Keeper Ilsabet Orrow**, who changes which parts of the arena are safe by re-aligning lensed floors. |
| **Cathedral** — the Pilgrim Stair | Restored inhabitants losing their identities. | Monumental stone, processions, layered voices. | Healer-priests (kill order matters), processions (moving hazard), mourners. | **Saint Vessaline of the Hundred Names**, who borrows the techniques of absorbed worshippers. |
| **Royal Treasury** — the Undervaults | Prosperous and famine-stricken histories overlap in the same market. | Metal, vault mechanisms, mechanical rhythms. | Vault guardians, coin-mimics, starving militia. | **Treasurer Aurel Mask**, whose protections (ward-coffers) must be dismantled first. |
| **Royal Household** — the Garden Court | Incompatible royal successions occupying the same palace. | Formal gardens, courtly remnants, distant court music. Autumn. | Elite retainers (parry-heavy), court duellists. | **Dame Celwyn Ardent**, the Household's master-at-arms, who trained the Returned. |

Each region pairs a remembered opportunity with contradicting evidence and an intervention with
a persistent consequence (see `src/content/regions/*` for the quest graphs).

### 7.2 Aldren (final boss, three phases)
1. **The Young Conqueror** — knight with lance-sword; fast, aggressive, readable spacing.
2. **The Sorcerer-King** — bell sorcery; the arena rings in segments.
3. **The Ancient King** — sustained by borrowed centuries; slow, immense, drains Unlived.
Phase transitions play competing versions of his leitmotif.

### 7.3 Endings (never decided by death count)
* **Break the Covenant** — always available. Return ends; the world moves on with its losses.
* **Inherit the Covenant** — requires ≥ 3 allies rescued. Allies protected; the Returned
  inherits Aldren's temptation.
* **Shelter the Unlived** — requires the optional *Unlived Muster* questline (begins beneath
  Ashbridge: the soldiers who recognise the Returned) to be completed in all five regions.

---

## 8. Allies
Rescued NPCs gather at the Hospice (and later refuges): teachers, merchants, smiths and
optional spirit allies (summoned at a boss fog with a Stillbell sign). Allies draw aggro and deal
damage but cannot exceed 90 % posture on a target and never perform criticals.

---

## 9. Accessibility & options
Remapping per device · subtitles with speaker labels and sound captions ("[Bell tolls — left]")
· text size (80–160 %) · hold/toggle options · camera shake, motion blur, flashes/effects
intensity, film grain toggles · field of view · brightness · high-visibility critical markers ·
Toll visual indicator always on · hitbox and i-frame visualisation · pause anywhere (single-player).
No hidden difficulty adaptation, ever.

## 10. Audio direction
Stillbells: small, intimate, warm partials and long tails. Great Bells: detuned, inharmonic, sub
bass. Exploration: sparse wind, embers, distant tolls. Boss music develops per phase; at phase
change a second version of the melody enters in a competing key. Combat cues (parry ring, guard
break crack, critical chime, enemy windup whoosh) are routed on a bus that ducks music by 6 dB.

## 11. Technical
TypeScript + Three.js (WebGL2), Vite build. Offline: all assets are local; the game also runs
packaged. Fixed 60 Hz simulation with interpolated rendering. Collision: BVH (three-mesh-bvh)
capsule controller. Save: versioned JSON in two rotating slots with checksum; autosave on every
persistent world change. Performance budget: ≤ 350 draw calls, ≤ 1.5 M triangles on screen,
one shadow-casting directional light + baked/fake lights elsewhere; target 60 fps at 1440p
high on an RTX 4080 with large headroom.

---

## 12. Arsenal (data in `src/content/items.ts`, `spells.ts`)

Phase 1 (Ashbridge) places only the slice set: Retainer Sword, Household Shield, Court Staff,
Parrying Dirk, the Retainer and Court armour, Cinder Bolt, Glinting Shard, Stilling Chime, Ember
Blessing, Ashen Veil, the Warden's Talisman, the Bellbronze Shard, throwing knives, the Greyford
Sabre (Brannoc's gift) and the Commander's reward memory. Everything below is defined and balanced
on paper and is placed as later regions ship.

* **Weapon classes:** straight sword, curved sword, greatsword, dagger, estoc, axe, mace, hammer,
  flail, spear, halberd, staff, hand bell, censer, bow, crossbow. Each class has one moveset
  archetype (light chain, charged heavy, class technique).
* **Shields:** Household Shield, Mint Buckler (parry-focused), Greyford Tower Shield, Pilgrim
  Roundshield.
* **Armour sets (4 pieces):** Retainer, Court, Oath, Funeral, Huntsman, Condemned, Commander,
  Greyford, Mint Warden, Hospice, Bellkeeper, Gatewarden.
* **Spells (11):** sorceries: Glinting Shard, Cinder Bolt, Shard Volley, Bellglass Lance, Falling Hour;
  rites: Stilling Chime, Ashen Veil, Knell of Rest, Ember Blessing, Vigil of Ash, Toll of Warding.
* **Imprint Techniques (16):** transferable between compatible weapon classes at a Stillbell via
  imprint scrolls (Oathbound Lunge, Bulwark Toll, Bellglass Ward, Measured Cut, Riposte Stance,
  Bell Breaker, Rending Sweep, Greyford Flourish, Grave Knell, Unbroken Links, Pinning Shot,
  Impaling Charge, Ember Edge, Vow Parry, Vow Pursuit, Stilled Breath).

## 13. Bestiary & bosses (full campaign plan)

Monsters use the humanoid rig (with proportion variants for giants and husks) or a quadruped rig
for hounds and beasts.

| Region | Enemies | Mid-boss | Keeper |
|---|---|---|---|
| Ashbridge | Unlived infantry, sentry, shield bearer, archer | — | Ser Corvane Aldmoor |
| Royal Army | Pike wall (3-man formation), crossbowman, sapper (fire pots), war hound (quadruped), siege knight, twice-slain (revives unless posture-broken), cannon crew | The Ram-Knight Oderic | Marshal Ysolde Varr |
| Royal Academy | Glass acolyte, lens warden, echo construct (mimics the player's last technique), ritual choir (interrupt), homunculus swarm, suspended golem | Aberrant Experiment No. 9 (optional) | Keeper Ilsabet Orrow |
| Cathedral | Pilgrim, healer-priest (kill order matters), procession bearer (moving hazard), flagellant, mourner giant | The Procession (group boss) | Saint Vessaline of the Hundred Names |
| Royal Treasury | Vault guardian (animated armour), coin-mimic, starving militia, debt collector (grab), clockwork sentry | Mimic Sovereign (optional) | Treasurer Aurel Mask |
| Royal Household | Elite retainer (parry-heavy), court duellist, gardener with shears, hunting hound, masked courtier (caster), succession ghost | The Twin Heirs (duo) | Dame Celwyn Ardent |
| Finale | — | The Condemned Bellkeeper (secret) | King Aldren (three reigns) |
