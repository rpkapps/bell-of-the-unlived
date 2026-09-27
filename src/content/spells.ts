/**
 * Sorceries (cast with a sorcery catalyst, scale with Intellect) and bell rites
 * (cast with a rite catalyst, scale with Devotion). GDD §4.9.
 * In origin kits and inventories a known spell is referenced as `spell:<id>`.
 */
import type { SpellDef } from '../game/types';

export const SPELLS: Record<string, SpellDef> = {
  // ---------------------------------------------------------------- sorceries
  glinting_shard: {
    id: 'glinting_shard', name: 'Glinting Shard', icon: 'glinting_shard', school: 'sorcery', kind: 'projectile',
    focus: 8, stamina: 10, requirements: { intellect: 10 }, slots: 1,
    source: 'Court Mage origin',
    description: 'Loose a fast shard of bronze light at the target. Quick to cast and quick to fly; the court mage\'s first lesson.',
  },
  cinder_bolt: {
    id: 'cinder_bolt', name: 'Cinder Bolt', icon: 'cinder_bolt', school: 'sorcery', kind: 'projectile',
    focus: 14, stamina: 16, requirements: { intellect: 10 }, slots: 1,
    source: 'Grimoire on a clerk\'s desk in the Lower Passage',
    description: 'Hurl a slow ball of cinders that bursts on impact and sets the target burning for 3 seconds.',
  },
  shard_volley: {
    id: 'shard_volley', name: 'Shard Volley', icon: 'shard_volley', school: 'sorcery', kind: 'volley',
    focus: 16, stamina: 18, requirements: { intellect: 13 }, slots: 1,
    source: 'Grimoire hidden in a nook of the Lower Street south alley',
    description: 'Loose three glinting shards in a narrow fan. Punishes foes who sidestep, and strikes groups at the door.',
  },
  bellglass_lance: {
    id: 'bellglass_lance', name: 'Bellglass Lance', icon: 'bellglass_lance', school: 'sorcery', kind: 'lance',
    focus: 26, stamina: 20, requirements: { intellect: 18 }, slots: 2,
    source: 'Later: Royal Academy',
    description: 'Hold to gather a beam of ringing glass, then release it in a straight line. Pierces every foe in its path.',
  },
  falling_hour: {
    id: 'falling_hour', name: 'Falling Hour', icon: 'falling_hour', school: 'sorcery', kind: 'delayedStrike',
    focus: 22, stamina: 16, requirements: { intellect: 16 }, slots: 1,
    source: 'Later: Royal Academy',
    description: 'Mark the ground. After 1.2 seconds a phantom bell falls there, striking hard and breaking posture.',
  },

  // ---------------------------------------------------------------- bell rites
  stilling_chime: {
    id: 'stilling_chime', name: 'Stilling Chime', icon: 'stilling_chime', school: 'rite', kind: 'heal',
    focus: 20, stamina: 12, requirements: { devotion: 10 }, slots: 1,
    source: 'Taught by Oswin Marrow after his rescue',
    description: 'Ring a soft, low note. Restores 35 % of health over 2 seconds.',
  },
  ashen_veil: {
    id: 'ashen_veil', name: 'Ashen Veil', icon: 'ashen_veil', school: 'rite', kind: 'ward',
    focus: 16, stamina: 14, requirements: { devotion: 12 }, slots: 1,
    source: 'Taught by Oswin Marrow after Ser Corvane falls',
    description: 'Draw a veil of grey ash about yourself. For a few seconds, much of the damage you take is turned aside.',
  },
  knell_of_rest: {
    id: 'knell_of_rest', name: 'Knell of Rest', icon: 'knell_of_rest', school: 'rite', kind: 'projectile',
    focus: 12, stamina: 14, requirements: { devotion: 12 }, slots: 1,
    source: 'Funeral Priest origin',
    description: 'Toll once toward the target. The note travels as a ring of pale light and strikes the Unlived hardest.',
  },
  ember_blessing: {
    id: 'ember_blessing', name: 'Ember Blessing', icon: 'ember_blessing', school: 'rite', kind: 'weaponBuff',
    focus: 14, stamina: 10, requirements: { devotion: 10 }, slots: 1,
    source: 'Taught by Oswin Marrow after his rescue',
    description: 'Bless the right-hand weapon with a hearth\'s warmth. Adds fire damage for 30 seconds.',
  },
  vigil_of_ash: {
    id: 'vigil_of_ash', name: 'Vigil of Ash', icon: 'vigil_of_ash', school: 'rite', kind: 'regen',
    focus: 12, stamina: 8, requirements: { devotion: 10 }, slots: 1,
    source: 'Prayer beside Oswin\'s cot in the locked refuge',
    description: 'Keep a short vigil. For 30 seconds, stamina returns noticeably faster.',
  },
  toll_of_warding: {
    id: 'toll_of_warding', name: 'Toll of Warding', icon: 'toll_of_warding', school: 'rite', kind: 'burst',
    focus: 18, stamina: 20, requirements: { devotion: 14 }, slots: 1,
    source: 'Later: Cathedral',
    description: 'Strike the bell hard. A short-range shockwave staggers everything close about you.',
  },
};
