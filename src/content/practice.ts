/**
 * Practice-yard plaques (Hospice). Precise statements of the combat rules in docs/GDD.md §4–6.
 * `{<ActionId>}` placeholders are replaced by prompt glyphs (see formatActions in ./text.ts).
 * If tuning numbers change in the GDD, change them here too.
 */
import type { PracticeTopic } from '../ui/contract';

export const PRACTICE_TOPICS: PracticeTopic[] = [
  {
    id: 'guard',
    title: 'Guard',
    body: [
      'Hold {guard} to guard. A shield negates physical damage by its guard percentage (the Household Shield: 100 %) and magic by its magic guard. Whatever is not negated still reaches you.',
      'Each blocked hit costs stamina: the hit\'s damage × (1 − the shield\'s stability), at least 6.',
      'While guarding, stamina regenerates at 30 per second instead of 45.',
      'If your stamina runs out while guarding, your guard breaks and you stagger for 1.1 seconds.',
      'Grabs cannot be blocked. They show a hand icon — dodge them.',
    ],
  },
  {
    id: 'parry',
    title: 'Parry',
    body: [
      '{parry} parries. The parry is active from 0.08 to 0.30 seconds after you press, then recovers for 0.42 seconds. It costs 12 stamina.',
      'A parry succeeds when its active window overlaps the moment the attack lands. Time it to the impact, not the windup.',
      'A parried attacker is thrown into the Parried pose — reeling, arms wide — for 1.5 seconds. Step in and press {light} to riposte.',
      'A parry that meets nothing leaves you open for its whole recovery.',
      'Unparryable attacks glow red-bronze and show a jagged ring. Guard against them or dodge.',
    ],
  },
  {
    id: 'backstab',
    title: 'Backstab',
    body: [
      'Strike a humanoid from behind — within 50° of its back — while it is unaware or recovering from an action.',
      'No vulnerable pose is needed. When you are within 2.2 metres and facing it (within 60°), the critical marker appears.',
      'Press {light} to claim it, locked on or not.',
    ],
  },
  {
    id: 'guardBreak',
    title: 'Guard Break',
    body: [
      'A fully charged heavy attack breaks an enemy\'s raised guard. Hold {heavy} for 0.8 seconds, then release.',
      'Sustained pressure on a raised guard breaks it too, as do some Imprint Techniques, such as Bulwark Toll.',
      'A guard-broken enemy throws its shield arm up. Press {light} for a guard-break critical.',
      'A full charge also deals 1.45 × damage and 2 × posture damage, even when it does not break a guard.',
    ],
  },
  {
    id: 'postureBreak',
    title: 'Posture Break',
    body: [
      'Every hit adds to an enemy\'s posture. Hits against a guarding enemy add more.',
      'Posture recovers after 2.2 seconds without posture damage. Keep up the pressure.',
      'When posture fills, the enemy kneels, vulnerable for 2.4 seconds (bosses: 1.8 seconds). Press {light} for a posture-break critical.',
      'Allies can fill an enemy\'s posture to 90 % at most. The final push is always yours.',
    ],
  },
  {
    id: 'dodge',
    title: 'Dodge',
    body: [
      'Tap {dodge} to roll. During the roll\'s invulnerability frames (i-frames), an active attack passes through you and deals nothing.',
      'Your load — equipped weight ÷ maximum load — sets the roll:',
      'Light (up to 30 %): i-frames 0.06–0.42 s, roll 0.62 s, 110 % movement speed.',
      'Medium (up to 70 %): i-frames 0.06–0.38 s, roll 0.72 s.',
      'Heavy (up to 100 %): i-frames 0.08–0.32 s, roll 0.95 s, 88 % movement speed.',
      'Overloaded (over 100 %): no roll. Backstep only (i-frames 0.05–0.20 s), at walking speed.',
      'A roll costs 16 stamina, a backstep 10. Your current window is shown on the equipment screen. Settings → Gameplay → Show i-frames outlines you in bronze while they last.',
    ],
  },
  {
    id: 'stamina',
    title: 'Stamina',
    body: [
      'Stamina pays for attacks, dodges, sprinting, casting and blocked hits.',
      'It begins to regenerate 0.45 seconds after you last spent it, at 45 per second (30 while guarding).',
      'An action can begin with any stamina left. It may overdraw into a deficit, which must regenerate back to zero before your stamina rises again.',
      'Costs: light attack 14 · heavy 24 (+8 charged) · roll 16 · backstep 10 · parry 12 · sprint 9 per second.',
    ],
  },
  {
    id: 'focus',
    title: 'Focus',
    body: [
      'Focus pays for spells and Imprint Techniques, and nothing else. No basic action ever costs focus.',
      'Focus does not regenerate on its own. Drink from a Recall Flask (Focus), or rest at a Stillbell.',
      'Divide your flask charges between Health and Focus at any Stillbell. Mind raises maximum focus.',
      '{technique} uses the technique of the weapon in hand. With a catalyst in hand, {light} casts; {cycleSpell} changes spells.',
    ],
  },
  {
    id: 'criticals',
    title: 'Criticals',
    body: [
      'There are four criticals: backstab, parry riposte, guard-break and posture-break.',
      'An eligible enemy shows its vulnerable pose. When you are within 2.2 metres and facing it within 60°, the critical marker appears: a bronze diamond with a notched centre and a pulsing ring, with a soft chime and the caption [Opening].',
      'Your normal attack, {light}, claims it — with or without lock-on.',
      'A critical deals the weapon\'s critical multiplier: swords × 3.0, catalyst bash × 2.2.',
      'Bosses take the same multiplier, but a critical can never skip a phase: its damage stops at what remains of the current phase.',
      'Criticals are never required. Every enemy can be beaten with ordinary attacks and ordinary spells, and the Commander leaves a readable window after every combination.',
    ],
  },
  {
    id: 'hours',
    title: 'Hours and the Last Breath',
    body: [
      'Hours are both currency and experience. Spend them at a Stillbell to raise attributes, or with the smith.',
      'When you die, all unspent Hours remain in your Last Breath where you fell. Touch it to recover them.',
      'Die again before you reach it, and those Hours are lost; a new Last Breath holds what you carried.',
      'If you fall in a boss arena, your Last Breath waits at the arena entrance.',
      'Death never rewinds the world. Doors you opened, lives you saved and lives you lost stay as they are.',
    ],
  },
  {
    id: 'respec',
    title: 'Respec and Changing Builds',
    body: [
      'At any Stillbell you may redistribute every attribute point, as often as you like, at no cost.',
      'Any attribute can be lowered to 6, whatever your origin. Your origin decides only where you begin.',
      'The rack in the Hospice holds the other origin\'s starting gear.',
      'Hesper Vail brings a new weapon up to strength. After Ser Corvane falls she sells Tempered Scrap for 600 Hours.',
    ],
  },
  {
    id: 'forememory',
    title: 'Forememory',
    body: [
      '{journal} opens the Forememory. Each lead keeps three kinds of entry, always apart.',
      'Remembered: what you recall of the erased future. Written in sepia ink.',
      'Observed now: evidence you have found in the present.',
      'Confirmed change: what you have made true.',
      'A remembered entry is never overwritten. When the present contradicts it, it stays, marked as contradicted.',
      'Memories never make you stronger and never change an enemy\'s timing. They are never required: everything you need can be found in the present.',
      'At toll-posts, a faint toll sounds from the direction of an unresolved lead, and the bell at the top of the screen swings toward it. It never gives a marker or a distance.',
    ],
  },
];
