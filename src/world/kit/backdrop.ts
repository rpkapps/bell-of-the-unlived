/**
 * Distant backdrop: cheap city silhouettes (house blocks with gables and a few warm windows),
 * spired towers, a cathedral mass, and mountain ridges. Meant to sit beyond the playable space
 * and dissolve into fog so every view has depth. No colliders.
 */
import * as THREE from 'three';
import type { MaterialId } from '../../render/materialIds';
import { Rng } from '../../core/rng';
import { Kit } from './Kit';
import { gablePrism, cone, cyl, pyramid } from './geom';

/** Simple house silhouette: walls + gable roof prism + chimney, a few lit windows. */
export function silhouetteHouse(kit: Kit, rng: Rng, x: number, y: number, z: number, yaw: number, w: number, d: number, h: number, lit = 0.25) {
  kit.push(x, y, z, yaw);
  const wm: MaterialId = rng.chance(0.4) ? 'plaster' : rng.chance(0.5) ? 'stone_wall' : 'stone_dark';
  kit.bmm(wm, -w / 2, -2, -d / 2, w / 2, h, d / 2, { cast: false, receive: false });
  const rise = (w / 2) * Math.tan((52 + rng.range(0, 10)) * Math.PI / 180);
  kit.add('roof_slate', gablePrism(w + 0.6, rise, d + 0.5), { y: h }, { cast: false, receive: false });
  if (rng.chance(0.6)) kit.bmm('stone_dark', w * 0.2, h, -0.3, w * 0.2 + 0.7, h + rise * 0.9, 0.4, { cast: false, receive: false });
  const nWin = Math.floor(w / 1.8) * Math.floor(h / 2.8);
  for (let i = 0; i < nWin; i++) {
    if (!rng.chance(lit)) continue;
    const wx = -w / 2 + 0.9 + rng.int(0, Math.max(0, Math.floor(w / 1.8) - 1)) * 1.8;
    const wy = 1.2 + rng.int(0, Math.max(0, Math.floor(h / 2.8) - 1)) * 2.8;
    kit.box('window_warm', wx, wy, d / 2 + 0.02, 0.6, 0.9, 0.05, { cast: false, receive: false });
  }
  kit.pop();
}

/** Square tower with a tall slate spire. */
export function spireTower(kit: Kit, x: number, y: number, z: number, w: number, h: number, spireH: number, mat: MaterialId = 'stone_dark') {
  kit.bmm(mat, x - w / 2, y - 2, z - w / 2, x + w / 2, y + h, z + w / 2, { cast: false, receive: false });
  kit.bmm('stone_trim', x - w / 2 - 0.4, y + h - 0.6, z - w / 2 - 0.4, x + w / 2 + 0.4, y + h, z + w / 2 + 0.4, { cast: false, receive: false });
  kit.add('roof_slate', cone(w * 0.62, spireH, 8), { x, y: y + h, z }, { cast: false, receive: false });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.add('roof_slate', cone(w * 0.14, spireH * 0.3, 6), { x: x + sx * w / 2, y: y + h, z: z + sz * w / 2 }, { cast: false, receive: false });
  if (h > 16) kit.box('window_warm', x, y + h * 0.7, z + w / 2 + 0.03, w * 0.18, 1.6, 0.05, { cast: false, receive: false });
}

/** Cathedral mass: nave, aisles, transept, twin west towers with spires, crossing spire. */
export function cathedral(kit: Kit, x: number, y: number, z: number, yaw: number, s = 1) {
  kit.push(x, y, z, yaw);
  const o = { cast: false, receive: false };
  kit.bmm('stone_wall', -7 * s, -2, -30 * s, 7 * s, 22 * s, 20 * s, o);
  kit.add('roof_slate', gablePrism(15 * s, 10 * s, 50 * s), { y: 22 * s, z: -5 * s }, o);
  for (const sx of [-1, 1]) {
    kit.bmm('stone_dark', sx * 7 * s, -2, -28 * s, sx * 12 * s, 12 * s, 18 * s, o);
    for (let i = 0; i < 8; i++) kit.bmm('stone_dark', sx * 12 * s, 0, (-26 + i * 6) * s, sx * 13.4 * s, 16 * s, (-25 + i * 6) * s, o);
    for (let i = 0; i < 7; i++) kit.box('window_warm', sx * 7.05 * s, 16 * s, (-24 + i * 6) * s, 0.1, 4 * s, 1.4 * s, o);
  }
  kit.bmm('stone_wall', -18 * s, -2, -16 * s, 18 * s, 20 * s, -6 * s, o);
  kit.add('roof_slate', gablePrism(10 * s, 7 * s, 36 * s), { y: 20 * s, z: -11 * s, ry: Math.PI / 2 }, o);
  for (const sx of [-1, 1]) spireTower(kit, sx * 7 * s, 0, 22 * s, 7 * s, 34 * s, 26 * s, 'stone_wall');
  kit.add('roof_slate', cone(3.5 * s, 30 * s, 8), { y: 30 * s, z: -11 * s }, o);
  kit.add('stone_trim', cyl(4 * s, 4.4 * s, 8 * s, 8), { y: 22 * s, z: -11 * s }, o);
  kit.add('window_warm', cyl(2.2 * s, 2.2 * s, 0.2, 12), { y: 16 * s, z: 20.05 * s, rx: Math.PI / 2 }, o);
  kit.pop();
}

/** Scatter silhouette houses in an annular sector around (cx, cz). Angles: 0 = east (+X), CCW toward north (-Z). */
export function skylineRing(kit: Kit, cx: number, cz: number, r0: number, r1: number, a0: number, a1: number, count: number, y: number, seed: number, towers = 0.06) {
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) {
    const a = rng.range(a0, a1), r = rng.range(r0, r1);
    const x = cx + Math.cos(a) * r, z = cz - Math.sin(a) * r;
    const yaw = Math.atan2(cx - x, cz - z) + rng.range(-0.3, 0.3); // face the centre
    if (rng.chance(towers)) spireTower(kit, x, y, z, rng.range(4, 7), rng.range(14, 26), rng.range(10, 22));
    else silhouetteHouse(kit, rng, x, y, z, yaw, rng.range(5, 9), rng.range(6, 10), rng.range(5, 10), 0.18);
  }
}

/** Jagged mountain cone. */
export function mountain(kit: Kit, x: number, y: number, z: number, r: number, h: number, seed: number, mat: MaterialId = 'rock_cliff') {
  const rng = new Rng(seed);
  const g = new THREE.ConeGeometry(r, h, 11, 5, true);
  const p = g.attributes.position as THREE.BufferAttribute;
  const cache = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(2)},${p.getY(i).toFixed(2)},${p.getZ(i).toFixed(2)}`;
    let d = cache.get(key);
    if (!d) { const top = p.getY(i) > h / 2 - 0.01; d = top ? [rng.range(-0.1, 0.1) * r, -rng.range(0, 0.15) * h, rng.range(-0.1, 0.1) * r] : [rng.range(-0.18, 0.18) * r, rng.range(-0.16, 0.16) * h, rng.range(-0.18, 0.18) * r]; cache.set(key, d); }
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  g.translate(0, h / 2, 0);
  g.computeVertexNormals();
  kit.add(mat, g, { x, y, z, ry: rng.range(0, 6) }, { cast: false, receive: false });
}

/** Ring of mountains around (cx, cz). */
export function mountainRing(kit: Kit, cx: number, cz: number, r: number, count: number, seed: number, y = -20) {
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const rr = r * rng.range(0.9, 1.15);
    mountain(kit, cx + Math.cos(a) * rr, y, cz - Math.sin(a) * rr, rng.range(220, 360), rng.range(110, 230), seed * 31 + i, rng.chance(0.5) ? 'rock_cliff' : 'stone_dark');
    // a lower shoulder beside each peak breaks the cone silhouette into a ridge
    const a2 = a + rng.range(0.08, 0.16);
    mountain(kit, cx + Math.cos(a2) * rr * 0.95, y, cz - Math.sin(a2) * rr * 0.95, rng.range(180, 280), rng.range(70, 140), seed * 57 + i, 'stone_dark');
  }
}

/** A far hilltop keep (big blocky castle silhouette). */
export function farKeep(kit: Kit, x: number, y: number, z: number, s = 1) {
  const o = { cast: false, receive: false };
  kit.add('rock_cliff', cone(40 * s, 30 * s, 8), { x, y: y - 2, z }, o);
  kit.bmm('stone_dark', x - 14 * s, y + 20 * s, z - 10 * s, x + 14 * s, y + 42 * s, z + 10 * s, o);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    kit.add('stone_dark', cyl(4 * s, 4.3 * s, 36 * s, 10), { x: x + sx * 14 * s, y: y + 18 * s, z: z + sz * 10 * s }, o);
    kit.add('roof_slate', cone(5 * s, 12 * s, 10), { x: x + sx * 14 * s, y: y + 54 * s, z: z + sz * 10 * s }, o);
  }
  kit.add('roof_slate', pyramid(26 * s, 18 * s, 12 * s), { x, y: y + 42 * s, z }, o);
  for (let i = 0; i < 6; i++) kit.box('window_warm', x - 10 * s + i * 4 * s, y + 34 * s, z + 10.05 * s, 0.8 * s, 1.6 * s, 0.1, o);
}
