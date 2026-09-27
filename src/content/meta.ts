/** Imports every region's always-loaded metadata (items, leads, text, Hospice guests). */
import './army/meta';
import './academy/meta';
import './cathedral/meta';
import './treasury/meta';
import './household/meta';
import './belfry/meta';

/**
 * Every region's model registrations (weapons, NPC and enemy looks). Reward weapons and Hospice
 * guests are seen outside their home region, so these load at startup, in parallel, as their own
 * chunks, before the first region is built.
 */
export function loadAllModels() {
  return Promise.all([
    import('./army/models'), import('./academy/models'), import('./cathedral/models'),
    import('./treasury/models'), import('./household/models'), import('./belfry/models'),
  ]);
}
