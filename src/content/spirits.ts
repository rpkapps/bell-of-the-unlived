/** Spirit allies available across regions. Brannoc of the Greyford muster answers after Ashbridge. */
import { registerEnemyDefs, ENEMY_DEFS } from './enemies';
import { registerSpirit } from '../game/regions/hub';

registerEnemyDefs({
  spiritBrannoc: {
    ...ENEMY_DEFS.infantry,
    kind: 'spiritBrannoc', name: 'Sergeant Brannoc (spirit)', look: 'greyfordSoldier',
    hp: 900, poise: 40, postureMax: 400, hours: 0, sight: 30, run: 4.6,
    attacks: [
      { move: 'inf_slash', range: [0, 2.6], weight: 4, follow: [['inf_backhand', 0.5]] },
      { move: 'inf_thrust', range: [1.6, 3.8], weight: 2, cooldown: 3 },
    ],
    recover: [0.9, 1.6], aggression: 0.5, backstabbable: false, criticalable: false,
  },
});

registerSpirit({ id: 'brannoc', name: 'Sergeant Brannoc', kind: 'spiritBrannoc', available: (ws) => !!ws.flags['ashbridge.brannocMet'] });
