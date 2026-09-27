/**
 * Shared BEASTS module: four-legged Unlived usable by any region.
 *
 *   import '../beasts';            // side-effect registration (defs, moves, clips, looks)
 *   kinds: 'warHound' | 'huntingHound' | 'carrionStag'
 *   optional per-step pack behaviour: beastPackStep(game.enemies, dt)
 *
 * Built on the humanoid rig posed on all fours (see body.ts), so collision, hurt capsules,
 * criticals (backstab a hound), AI and saving work unchanged.
 */
import './defs';
import './models';

export { beastPackStep, BARK_RADIUS } from './pack';
export { BEAST_KINDS } from './defs';
