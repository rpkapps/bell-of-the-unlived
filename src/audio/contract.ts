/**
 * CONTRACT — procedural audio. Implemented by src/audio/Audio.ts (WebAudio, all sounds synthesised
 * in code: no sample files). Every "important" cue emits a caption so it has a visible equivalent.
 */
import type * as THREE from 'three';

export const CUES = [
  // UI
  'ui_move', 'ui_confirm', 'ui_back', 'ui_error', 'ui_open', 'ui_close', 'ui_levelup', 'ui_tab',
  // player movement
  'step', 'roll', 'land', 'armor_rattle', 'cloth_rustle',
  // melee
  'swing_light', 'swing_heavy', 'swing_huge', 'charge_heavy', 'charge_full',
  'hit_flesh', 'hit_armor', 'hit_wood', 'hit_stone', 'hit_heavy',
  'guard_block', 'guard_break', 'parry_attempt', 'parry_success', 'posture_break',
  'critical_ready', 'critical_stab', 'stagger',
  // magic & tools
  'cast_shard', 'cast_cinder', 'fire_burst', 'spell_heal', 'ward_up', 'technique', 'throw',
  'bow_draw', 'bow_release', 'arrow_hit',
  // enemies
  'enemy_alert', 'enemy_windup', 'enemy_grunt', 'enemy_pain', 'enemy_death', 'unparryable_tell', 'boss_roar',
  // player state
  'player_hurt', 'player_death', 'drink_flask', 'hours_gain', 'pickup', 'last_breath_recover', 'low_health',
  // world
  'stillbell_ring', 'stillbell_rest', 'great_bell_toll', 'unfinished_toll', 'door_open', 'gate_open',
  'hatch_open', 'lever_pull', 'chain_rattle', 'drawbridge_slam', 'chest_open', 'fog_enter', 'anchor_shatter',
  'collapse_rumble', 'memory_trigger', 'journal_update', 'masonry_touch', 'forge_hammer',
] as const;
export type CueId = (typeof CUES)[number];

/** Captions for cues that carry gameplay meaning. Direction is appended by the audio system. */
export const CUE_CAPTIONS: Partial<Record<CueId, string>> = {
  enemy_alert: 'Enemy alerted',
  enemy_windup: 'Attack winding up',
  unparryable_tell: 'Unstoppable attack',
  critical_ready: 'Opening',
  parry_success: 'Parried',
  guard_break: 'Guard broken',
  posture_break: 'Posture broken',
  stillbell_ring: 'Stillbell rings',
  great_bell_toll: 'A Great Bell tolls',
  unfinished_toll: 'The Unfinished Toll',
  bow_draw: 'Bowstring drawn',
  drawbridge_slam: 'Drawbridge lands',
  anchor_shatter: 'Anchor shatters',
  collapse_rumble: 'The ground gives way',
  low_health: 'Health low',
  boss_roar: 'Commander bellows',
};

export type LoopCueId = 'amb_wind' | 'amb_fire' | 'amb_interior' | 'amb_hospice' | 'amb_battlefield' | 'amb_undercroft' | 'stillbell_hum' | 'fog_hum' | 'forge' | 'brazier';
export type MusicState = 'none' | 'title' | 'intro' | 'ashbridge' | 'hospice' | 'boss1' | 'boss2' | 'victory' | 'battlefield';
export type AmbienceId = 'outdoor' | 'interior' | 'undercroft' | 'hospice' | 'arena' | 'battlefield' | 'none';

export interface PlayOpts {
  /** World position for 3D panning/attenuation. Omit for 2D (UI, player-centric). */
  pos?: THREE.Vector3 | { x: number; y: number; z: number };
  volume?: number;   // 0..2, default 1
  rate?: number;     // pitch/speed multiplier, default 1
  /** Footsteps/impacts: surface variant. */
  surface?: 'stone' | 'wood' | 'dirt' | 'metal' | 'water';
  /** Suppress the caption for this play. */
  silentCaption?: boolean;
}

export interface LoopHandle { setVolume(v: number, fade?: number): void; setPos(p: { x: number; y: number; z: number }): void; stop(fade?: number): void }

export interface IAudio {
  /** Create/resume the AudioContext. Must be called from a user gesture the first time. */
  unlock(): Promise<void>;
  readonly ready: boolean;
  setVolumes(v: { master: number; music: number; sfx: number; ambience: number; voice: number; ui: number; mono: boolean }): void;
  /** Per frame: listener = camera. */
  setListener(pos: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3): void;
  play(cue: CueId, opts?: PlayOpts): void;
  loop(cue: LoopCueId, opts?: PlayOpts): LoopHandle;
  setMusic(state: MusicState, fade?: number): void;
  setAmbience(id: AmbienceId, fade?: number): void;
  /** Pause menus: duck/lowpass world audio. */
  setMenuMuffle(on: boolean): void;
  /** Receives captions ("[Enemy alerted — left]"); wired to IUI.caption by the game. */
  onCaption(fn: (text: string, dir: 'left' | 'right' | 'ahead' | 'behind' | null) => void): void;
}
