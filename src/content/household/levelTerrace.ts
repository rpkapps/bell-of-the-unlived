/**
 * The Terrace of the Great Bell (YT) — Dame Celwyn's arena — with the GREAT FRAME: two gothic
 * pillars and an arch from which the cracked Household Great Bell hangs (the landmark visible from
 * the Servants' Gate), and its ANCHOR: a gilt reliquary on the terrace floor tethered to the bell by
 * four chains of bell-light. When Celwyn falls the reliquary shatters, the chains fall, the bell's
 * gold goes dark and it hangs askew — silenced.
 *
 * Also the backdrop: the capital below the palace hill (skyline, spires, the Cathedral far to the
 * east), autumn woods beyond the garden walls and mountains in the haze.
 */
import * as THREE from 'three';
import type { Anchor, ArenaLayout, DynamicPiece } from '../../world/levelTypes';
import { cyl, brazier, skylineRing, spireTower, cathedral, mountainRing, farKeep, bellGeo, wallGeo } from '../../world/kit';
import { getMaterial, cloneMaterial } from '../../render/materials';
import { registerLight } from '../../render/lights';
import {
  type AreaCtx, newKit, anchor, PLAN, Y0, YU, YT, YAW_E, YAW_W, balustrade, pinnacle, hangingBanner, statue, autumnTree, leafLitter, Rng, AUTUMN,
} from './levelCommon';
import { fogGate } from './levelOrangery';

export interface TerraceBuild {
  arena: ArenaLayout;
  bell: THREE.Object3D;
  anchors: Record<string, Anchor>;
  update: (time: number) => void;
}

export function buildTerrace(ctx: AreaCtx): TerraceBuild {
  const k = newKit(ctx, 'terrace', 151);
  const B = PLAN.bell, C = B.c, R = 13.5;
  const anchors: Record<string, Anchor> = {};

  // ================================================================ the platform (octagon) on its substructure
  const oct: [number, number][] = [];
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; oct.push([C.x + Math.cos(a) * R, C.z + Math.sin(a) * R]); }
  const shape = new THREE.Shape(oct.map(([x, z]) => new THREE.Vector2(x, -z)));
  const slab = new THREE.ExtrudeGeometry(shape, { depth: YT - Y0 + 2, bevelEnabled: false });
  slab.rotateX(-Math.PI / 2); slab.translate(0, Y0 - 2, 0);
  k.add('stone_wall', slab);
  k.colGeo(slab.clone());
  const top = new THREE.ShapeGeometry(shape, 1); top.rotateX(-Math.PI / 2); top.translate(0, YT + 0.012, 0);
  k.add('flagstone', top, undefined, { cast: false, uv: 'world' });
  // inlaid ring and the household mark in gilt at the centre
  k.add('gold_trim', new THREE.RingGeometry(R - 2.2, R - 2.0, 48).rotateX(-Math.PI / 2), { x: C.x, y: YT + 0.02, z: C.z }, { cast: false });
  k.add('stone_trim', new THREE.RingGeometry(3.6, 4.2, 40).rotateX(-Math.PI / 2), { x: C.x, y: YT + 0.02, z: C.z }, { cast: false });
  k.add('gold_trim', new THREE.RingGeometry(1.4, 1.62, 24, 1, 0, Math.PI).rotateX(-Math.PI / 2), { x: C.x, y: YT + 0.025, z: C.z }, { cast: false });
  // buttresses down the substructure faces
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * Math.PI * 2;
    const x = C.x + Math.cos(a) * (R + 0.4), z = C.z + Math.sin(a) * (R + 0.4);
    k.box('stone_wall', x, (Y0 + YT) / 2 - 1, z, 1.6, YT - Y0 + 1, 1.6, { ry: -a });
    pinnacle(k, x, YT, z, 3.4, 0.8, i % 2 === 0);
  }
  // balustrade on the octagon edges (the west edge has the stair landing; the north edge the frame)
  for (let i = 0; i < 8; i++) {
    const [x0, z0] = oct[i], [x1, z1] = oct[(i + 1) % 8];
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const inset = (x: number, z: number): [number, number] => [C.x + (x - C.x) * 0.975, C.z + (z - C.z) * 0.975];
    const [ax, az] = inset(x0, z0), [bx, bz] = inset(x1, z1);
    if (mx < C.x - 10) {
      // west: leave the landing gap (z ∈ [-78.2, -73.8])
      const zl = -78.4, zh = -73.6;
      const zA = Math.max(az, bz), zB = Math.min(az, bz);
      const xA = az > bz ? ax : bx, xB = az > bz ? bx : ax;
      const xAt = (z: number) => xA + (xB - xA) * (z - zA) / (zB - zA);
      balustrade(k, xA, zA, xAt(zh), zh, YT);
      balustrade(k, xAt(zl), zl, xB, zB, YT);
      continue;
    }
    balustrade(k, ax, az, bx, bz, YT);
  }
  // braziers and banners on the rim
  for (const [dx, dz] of [[-8.5, 8.5], [8.5, 8.5], [8.8, -7.5], [-8.8, -7.5]]) brazier(k, C.x + dx, YT, C.z + dz, true, 1.2);
  k.light(0xffa860, 4.2, 16, C.x - 8, YT + 2, C.z + 8, 0.6);
  k.light(0xffa860, 4.2, 16, C.x + 8, YT + 2, C.z - 7, 0.6);
  for (const s of [-1, 1]) hangingBanner(k, C.x + s * 10, YT + 18, B.frameZ + 1.92, 0, 2.0, 9, 'heraldry_banner');

  // ================================================================ the great frame (two pillars and an arch) and the Great Bell
  const fz = B.frameZ, px = 10, PW = 3.8, PH = 40;
  for (const s of [-1, 1]) {
    const x = C.x + s * px;
    k.bmm('stone_wall', x - PW / 2, Y0, fz - PW / 2, x + PW / 2, YT + PH, fz + PW / 2, { col: true });
    for (let y = YT + 4; y < YT + PH; y += 6.5) k.bmm('stone_trim', x - PW / 2 - 0.25, y, fz - PW / 2 - 0.25, x + PW / 2 + 0.25, y + 0.4, fz + PW / 2 + 0.25, { cast: false });
    for (let y = YT + 6; y < YT + PH - 2; y += 6.5) for (const sz of [-1, 1]) k.box('stone_dark', x, y + 2, fz + sz * (PW / 2 + 0.02), 0.9, 3.2, 0.1, { cast: false });
    k.bmm('gold_trim', x - PW / 2 - 0.05, YT + PH - 3, fz - PW / 2 - 0.05, x + PW / 2 + 0.05, YT + PH - 2.7, fz + PW / 2 + 0.05, { cast: false });
    pinnacle(k, x, YT + PH + 7.5, fz, 7, 1.8, true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pinnacle(k, x + sx * PW / 2, YT + PH + 7.5, fz + sz * PW / 2, 3.2, 0.5, false);
  }
  // the arch across the top: a deep lintel block with a pointed opening cut from below, gilt keystone
  const span = 2 * px - PW, ay = YT + PH - 3;
  k.add('stone_wall', wallGeo(2 * px + PW, 10, PW * 0.92, [{ u: 0, w: span, sill: 0, h: 0.01, kind: 'pointed', rise: 7 }]), { x: C.x, y: ay, z: fz });
  k.bmm('stone_trim', C.x - px - PW / 2 - 0.3, ay + 10, fz - PW / 2 - 0.3, C.x + px + PW / 2 + 0.3, ay + 10.5, fz + PW / 2 + 0.3, { cast: false });
  k.box('gold_trim', C.x, ay + 7.4, fz + PW * 0.46 + 0.05, 1.2, 1.6, 0.2, { cast: false });
  const rise = 7;
  k.box('iron', C.x, YT + 36.4, fz, span + 1, 0.9, 1.1);
  // the Household mark on the arch: arch, crown, bell in gilt
  k.add('gold_trim', new THREE.TorusGeometry(1.6, 0.18, 6, 20, Math.PI), { x: C.x, y: ay + rise + 1.6, z: fz + PW / 2 - 0.1 }, { cast: false });
  k.add('gold_trim', cyl(0.5, 0.8, 1.0, 12), { x: C.x, y: ay + rise + 0.2, z: fz + PW / 2 }, { cast: false });
  for (let i = 0; i < 5; i++) k.add('gold_trim', new THREE.ConeGeometry(0.13, 0.5, 4), { x: C.x - 0.6 + i * 0.3, y: ay + rise + 3.5, z: fz + PW / 2 }, { cast: false });

  // the bell (its own object: the anchor piece makes it hang askew and go dark)
  const bell = new THREE.Group();
  bell.name = 'householdGreatBell';
  bell.position.set(C.x, YT + 36, fz);
  const bellH = 11;
  const bellMat = cloneMaterial(getMaterial('bronze_bell'));
  bellMat.side = THREE.DoubleSide;
  const body = new THREE.Mesh(bellGeo(bellH, 32), bellMat);
  body.castShadow = true;
  bell.add(body);
  // gold cracks (emissive) across the bell's face, built as thin ribbons following the surface
  const crackGeo: THREE.BufferGeometry[] = [];
  const rng = new Rng(907);
  const PROF: [number, number][] = [[0.02, 0.25], [0.07, 0.46], [0.16, 0.55], [0.3, 0.58], [0.5, 0.64], [0.72, 0.78], [0.9, 0.93], [0.97, 1.0], [1.0, 0.94]];
  const prof = (yy: number) => { // outer radius at depth yy (0 = crown .. 1 = mouth)
    const t = Math.min(1, Math.max(0.02, yy));
    for (let i = 1; i < PROF.length; i++) if (t <= PROF[i][0]) { const [t0, r0] = PROF[i - 1], [t1, r1] = PROF[i]; return bellH * 0.62 * (r0 + (r1 - r0) * (t - t0) / (t1 - t0)); }
    return bellH * 0.62 * 0.94;
  };
  for (let c = 0; c < 9; c++) {
    let a = rng.range(0, Math.PI * 2), yy = rng.range(0.15, 0.45);
    for (let s = 0; s < 9; s++) {
      const a2 = a + rng.range(-0.18, 0.18), y2 = yy + rng.range(0.05, 0.1);
      if (y2 > 0.98) break;
      const r1 = prof(yy) + 0.04, r2 = prof(y2) + 0.04;
      const p1 = new THREE.Vector3(Math.sin(a) * r1, -yy * bellH, Math.cos(a) * r1), p2 = new THREE.Vector3(Math.sin(a2) * r2, -y2 * bellH, Math.cos(a2) * r2);
      const len = p1.distanceTo(p2);
      const g = new THREE.BoxGeometry(0.09, len, 0.05);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize()));
      g.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2);
      crackGeo.push(g);
      a = a2; yy = y2;
    }
  }
  const cracks = new THREE.Mesh(mergeAll(crackGeo), getMaterial('unlived_crack'));
  bell.add(cracks);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.2), getMaterial('iron'));
  yoke.position.y = 0.35;
  bell.add(yoke);
  ctx.dynamicRoot.add(bell);
  const bellGlow = registerLight(new THREE.PointLight(0xffc870, 0, 26, 2));
  bellGlow.position.set(C.x, YT + 28, fz + 3);
  ctx.dynamicRoot.add(bellGlow);

  // ================================================================ the anchor: a gilt reliquary tethered to the bell by four chains of light
  const A = new THREE.Vector3(C.x, YT, fz + 4.2);
  k.bmm('stone_trim', A.x - 1.5, YT, A.z - 1.2, A.x + 1.5, YT + 0.7, A.z + 1.2, { col: true });
  k.bmm('stone_dark', A.x - 1.3, YT + 0.7, A.z - 1.0, A.x + 1.3, YT + 0.85, A.z + 1.0);
  const anchorPiece = buildAnchor(ctx, A.clone().setY(YT + 0.85), bell, cracks, bellGlow, bellH);

  // ================================================================ fog gate at the top of the Bell Stair (the veil faces west)
  const fx = PLAN.bStair.x1 + 2.2, fzc = PLAN.bStair.zc;
  const fog = fogGate(ctx, 'celwyn', fx, YT, fzc, 'x', 4.4, 5.2);
  const arena: ArenaLayout = {
    bossId: 'celwyn', center: new THREE.Vector3(C.x, YT, C.z), radius: B.r,
    fogGate: { ...fog, anchor: anchor(fx - 1.3, YT, fzc, YAW_E), enterTo: anchor(fx + 2.6, YT, fzc, YAW_E) },
    entry: anchor(fx - 1.6, YT, fzc, YAW_E),
    spawn: anchor(C.x + 1.5, YT, C.z - 2, YAW_W),
    onDefeat: [anchorPiece],
  };
  anchors.celwynDeath = anchor(C.x, YT, C.z, YAW_W);
  anchors.greatBell = anchor(C.x, YT, fz + 6.5, Math.PI);

  // ================================================================ backdrop: the capital, spires, woods and hills
  const b = newKit(ctx, 'backdrop', 171);
  skylineRing(b, 0, -10, 150, 260, -Math.PI * 0.95, Math.PI * 0.95, Math.round(120 * ctx.shared.detail), -18, 7, 0.1);
  const spires: [number, number, number, number, number][] = [
    [-70, -110, 8, 38, 28], [-28, -120, 6, 34, 22], [70, -120, 9, 42, 30], [95, -40, 7, 30, 24], [-92, -30, 7, 33, 26],
    [-60, 90, 6, 26, 18], [60, 100, 6, 24, 18], [120, 30, 8, 32, 26], [-130, 40, 8, 30, 22],
  ];
  for (const [x, z, w, h, sh] of spires) spireTower(b, x, -6, z, w, h, sh, 'stone_dark');
  cathedral(b, 190, -24, -40, -Math.PI / 2, 1.6);
  farKeep(b, -210, -10, -150, 1.4);
  mountainRing(b, 0, -20, 520, 22, 5, -40);
  // the palace's own towers behind the throne room and the west wing (silhouette)
  spireTower(b, -46, Y0, -34, 9, 30, 18, 'stone_wall');
  spireTower(b, 20, Y0, -92, 8, 34, 22, 'stone_wall');
  spireTower(b, -22, Y0, -96, 7, 28, 16, 'stone_wall');
  b.bmm('stone_wall', -24, Y0, -104, 18, 18, -87, { cast: false });
  b.bmm('stone_wall', 52, Y0, -64, 64, 12, -8, { cast: false });
  // autumn woods beyond the garden walls (outside the playable space)
  const woods: [number, number][] = [];
  for (let i = 0; i < 26; i++) { const a = -0.3 + (i / 26) * (Math.PI + 0.6); woods.push([Math.cos(a) * 84 + 2, 30 + Math.sin(a) * 44]); }
  for (const [x, z] of woods) if (z > 56 || x > 62 || x < -60) autumnTree(ctx, b, x, Y0 - 1, z, 12 + ((x * 7 + z) % 5), Math.round(x * 13 + z), AUTUMN, false);
  statue(b, 2, Y0, 72, Math.PI, 2, 3, 1.6);

  const update = (time: number) => {
    const lit = !(anchorPiece as unknown as { state: number }).state;
    bellGlow.intensity = lit ? 2.2 + Math.sin(time * 0.9) * 0.6 : 0;
  };
  return { arena, bell, anchors, update };
}

function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    g.computeVertexNormals();
    pos.push(...(g.attributes.position.array as Float32Array));
    nor.push(...(g.attributes.normal.array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

/**
 * The bell's anchor: a gilt reliquary (a small bell in a crowned cage) on the plinth and four chains
 * of light rising to the Great Bell's rim. set(1): the reliquary bursts into fragments, the chains
 * fall away, the bell's gold goes dark and it settles askew.
 */
function buildAnchor(ctx: AreaCtx, at: THREE.Vector3, bell: THREE.Object3D, cracks: THREE.Mesh, glow: THREE.PointLight, bellH: number): DynamicPiece {
  const root = new THREE.Group();
  root.name = 'householdAnchor';
  ctx.dynamicRoot.add(root);
  const gold = getMaterial('gold_trim'), light = getMaterial('unlived_crack'), bronze = getMaterial('bronze_bell');
  const frags: { m: THREE.Object3D; dir: THREE.Vector3; spin: THREE.Vector3; home: THREE.Vector3 }[] = [];
  const rng = new Rng(31);
  const add = (m: THREE.Mesh, p: THREE.Vector3) => {
    m.position.copy(p); m.castShadow = true; root.add(m);
    const d = p.clone().sub(at).setY(0.6 + rng.next()).normalize();
    frags.push({ m, dir: d, spin: new THREE.Vector3(rng.range(-3, 3), rng.range(-3, 3), rng.range(-3, 3)), home: p.clone() });
  };
  // cage bars and crown
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), gold), new THREE.Vector3(at.x + Math.cos(a) * 0.7, at.y + 0.9, at.z + Math.sin(a) * 0.7));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), gold), new THREE.Vector3(at.x + Math.cos(a) * 0.55, at.y + 2.05, at.z + Math.sin(a) * 0.55));
  }
  add(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 6, 20).rotateX(Math.PI / 2), gold), new THREE.Vector3(at.x, at.y + 1.8, at.z));
  add(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 6, 20).rotateX(Math.PI / 2), gold), new THREE.Vector3(at.x, at.y + 0.05, at.z));
  // the small bell inside, glowing
  const small = new THREE.Mesh(bellGeo(0.9, 16), bronze);
  add(small, new THREE.Vector3(at.x, at.y + 1.55, at.z));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), light);
  add(core, new THREE.Vector3(at.x, at.y + 0.9, at.z));
  // chains of light to the bell's rim
  const chains: THREE.Mesh[] = [];
  const rim = new THREE.Vector3(bell.position.x, bell.position.y - bellH * 0.95, bell.position.z);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const top = rim.clone().add(new THREE.Vector3(Math.cos(a) * bellH * 0.45, 0, Math.sin(a) * bellH * 0.45));
    const bot = new THREE.Vector3(at.x + Math.cos(a) * 0.7, at.y + 1.8, at.z + Math.sin(a) * 0.7);
    const len = top.distanceTo(bot);
    const g = new THREE.CylinderGeometry(0.05, 0.05, len, 5);
    const m = new THREE.Mesh(g, light);
    m.position.copy(top).add(bot).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
    root.add(m);
    chains.push(m);
  }
  const bellRest = bell.rotation.clone();
  const piece = {
    object: root,
    state: 0,
    set(t: number) {
      const e = Math.min(1, Math.max(0, t));
      piece.state = e;
      const u = Math.min(1, Math.max(0, (e - 0.2) / 0.8));
      for (const f of frags) {
        f.m.position.copy(f.home).addScaledVector(f.dir, u * 3.2);
        f.m.position.y = f.home.y + f.dir.y * u * 2.4 - u * u * (f.home.y - at.y + 0.6);
        f.m.rotation.set(f.spin.x * u, f.spin.y * u, f.spin.z * u);
        f.m.visible = u < 0.999 || f.m !== core;
      }
      core.visible = e < 0.2;
      chains.forEach((c, i) => { c.visible = e < 0.35; c.scale.y = 1 - Math.min(1, e / 0.35) * (0.4 + i * 0.1); });
      cracks.visible = e < 0.5;
      bell.rotation.set(bellRest.x + u * 0.06, bellRest.y, bellRest.z + u * 0.1);
      glow.intensity = e < 0.5 ? glow.intensity : 0;
    },
  };
  piece.set(0);
  return piece;
}
