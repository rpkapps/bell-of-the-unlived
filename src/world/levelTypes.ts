/**
 * CONTRACT — what a region builder hands to the game.
 *
 * World axes: X = east, Y = up, Z = south (so NORTH is -Z). Metres. Yaw 0 faces +Z (south);
 * yaw = atan2(dx, dz).
 */
import type * as THREE from 'three';
import type { CollisionWorld, Collider } from './Collision';
import type { Quality } from '../game/settings';

/** The caller must run `collision.build()` after the builder returns (dynamic pieces manage their own colliders). */
export interface LevelContext {
  scene: THREE.Scene;
  collision: CollisionWorld;
  quality: Quality;
  /** The renderer's shadow-casting sun (already added to the scene); the level may reposition its target. */
  sun: THREE.DirectionalLight;
}

export interface Anchor { pos: THREE.Vector3; yaw: number }

/** An animated, stateful piece of the level. `set(t)` must be idempotent and instant for t in [0,1]. */
export interface DynamicPiece {
  object: THREE.Object3D;
  collider?: Collider;
  /** 0 = initial state, 1 = final state (e.g. drawbridge lowered, hatch open, door open). */
  set(t: number): void;
}

export type EnemyKind = 'infantry' | 'sentry' | 'shieldBearer' | 'archer' | 'commander' | (string & {});

export interface EnemySpawn {
  id: string;             // unique and stable (used by saves)
  kind: EnemyKind;
  anchor: Anchor;
  /** Optional patrol loop (world points on the ground). */
  patrol?: THREE.Vector3[];
  /** Leash: the enemy never pursues beyond this radius from its anchor. */
  leash?: number;
  /** Starts unaware and facing away (sentry) — backstab tutorial. */
  idleAnim?: 'stand' | 'sentryWall' | 'sit' | 'kneel';
}

export interface Zone {
  id: string;
  name: string;            // shown as an area title the first time the player enters
  box: THREE.Box3;
  ambience: 'outdoor' | 'interior' | 'undercroft' | 'hospice' | 'arena' | 'battlefield' | (string & {});
  music?: string;
  /** Environment preset for this zone (defaults by ambience). */
  environment?: string;
}

export interface Trigger { id: string; box: THREE.Box3 }

/** Ashbridge — everything the game logic needs from the level. */
export interface AshbridgeLayout {
  playerStart: Anchor;
  /** Where the player stands to rest at each bell; `bell` swings/rings (animated by the game). */
  stillbells: { id: 'watchtower' | 'hospice'; name: string; anchor: Anchor; bell: THREE.Object3D; light: THREE.PointLight }[];
  enemies: EnemySpawn[];
  zones: Zone[];
  /** Crossroads with an iron bell-post for the Unfinished Toll. `options` are the branch directions (world points). */
  tollPosts: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] }[];

  // --- the Old Mint lead ---
  countingRoomTrigger: Trigger;          // entering → the remembered lead fires
  freshMasonry: Anchor;                  // inspect point in front of the barred escape route
  hatch: DynamicPiece & { anchor: Anchor };            // set(1) = open; closed hatch collider blocks the stair below
  refugeKeyHook: Anchor;                 // alternate Refuge Key location (ledger hook in counting room)
  ordersDesk: Anchor;                    // Corvane's orders (observed evidence)
  grimoire: Anchor;                      // Cinder Bolt spellbook on the clerk's desk
  chest: DynamicPiece & { anchor: Anchor };             // set(1) = lid open
  refugeDoor: DynamicPiece & { anchor: Anchor };        // barred cell door; set(1) = open
  oswinCell: Anchor;                     // where the healer sits while imprisoned
  rosaryDrop: Anchor;                    // where his dropped rosary lies if he was taken

  // --- lower street ---
  greyfordRelief: Anchor;                // inspect: relief of a victory next to graves that predate it

  // --- courtyard & shortcut ---
  drawbridge: DynamicPiece;              // set(1) = lowered (walkable)
  drawbridgeLever: DynamicPiece & { anchor: Anchor };   // set(1) = pulled
  bellbronzeShard: Anchor;

  // --- hospice ---
  oswinHospice: Anchor;
  hesper: Anchor;                        // smith
  forge: Anchor;
  gearRack: Anchor;                      // alternate starting gear
  practicePlaques: { topic: string; anchor: Anchor }[];
  practiceDummies: Anchor[];

  // --- boss ---
  fogGate: DynamicPiece & { anchor: Anchor; enterTo: Anchor }; // set(1) = dissolved (no collider)
  arenaCenter: THREE.Vector3;
  arenaRadius: number;
  arenaEntry: Anchor;                    // Last Breath / respawn-side anchor just outside the fog
  anchorBell: DynamicPiece;              // Corvane's bell-standard; set(1) = shattered
  /** Collapse of the yard floor revealing the battlefield below; set(t) animates 0→1. */
  battlefieldReveal: DynamicPiece;
  brannoc: Anchor;                       // where Sergeant Brannoc stands after the reveal (reachable edge)

  /** Hidden loot spots off the critical path. */
  lootNooks?: Anchor[];

  /** Below this Y the player has fallen to death. */
  killY: number;
  /** Animate flames, banners, water... `time` = seconds since start. */
  update(dt: number, time: number, camera: THREE.Camera): void;
}

// ====================================================================== Phase 2: generic regions

/** A boss arena: fog gate, where the boss waits, and where the Last Breath goes if you die inside. */
export interface ArenaLayout {
  /** Boss id registered in src/content/bosses (e.g. 'varr'). Flag `boss.<id>` is set when defeated. */
  bossId: string;
  center: THREE.Vector3;
  radius: number;
  fogGate: DynamicPiece & { anchor: Anchor; enterTo: Anchor };
  /** Outside the veil (Last Breath / retry position). */
  entry: Anchor;
  /** Where the boss stands when the fight begins. */
  spawn: Anchor;
  /** Optional pieces animated to t=1 when the boss dies (anchor shatter, doors opening, bridges). */
  onDefeat?: DynamicPiece[];
}

/**
 * What every region builder (except Ashbridge, which predates it) returns. Region-specific quest
 * logic addresses anchors and pieces by name.
 */
export interface RegionLayout {
  playerStart: Anchor;
  stillbells: { id: string; name: string; anchor: Anchor; bell: THREE.Object3D; light: THREE.PointLight }[];
  enemies: EnemySpawn[];
  zones: Zone[];
  tollPosts: { id: string; pos: THREE.Vector3; radius: number; options: { id: string; toward: THREE.Vector3 }[] }[];
  arenas: ArenaLayout[];
  /** Named standing points (NPCs, inspectables, pickups, triggers' focus). */
  anchors: Record<string, Anchor>;
  /** Named animated pieces (doors, levers, lifts, bridges, chests, shortcut gates). */
  pieces: Record<string, DynamicPiece & { anchor?: Anchor }>;
  /** Named trigger volumes (memories, ambushes, area events). */
  triggers: Record<string, THREE.Box3>;
  killY: number;
  update(dt: number, time: number, camera: THREE.Camera): void;
}
