/**
 * Reusable architecture & prop kit for procedural regions.
 *
 *   const shared = createKitShared(quality, collision);
 *   const kit = new Kit('street', shared, seed);
 *   wall(kit, 'stone_wall', x0, z0, x1, z1, y0, h, t, { openings: [...] });
 *   house(kit, x, y, z, yaw, { w: 6, d: 8, storeys: 3 });
 *   kit.finish(scene);                         // merge per material → few meshes
 *   shared.instances.build(scene);             // instanced props (candles, flames…)
 */
export * from './Kit';
export * from './geom';
export * from './architecture';
export * from './house';
export * from './props';
export * from './shrine';
export * from './effects';
export * from './backdrop';
