/**
 * Siegeholm dynamic pieces: fog veils, doors, portcullises, winches, the gate-leaves of the
 * Ram-Knight's passage, the eastern powder magazine (intact / blown), Marshal Varr's
 * war-standard (the anchor, shatters) and the Army's Great Bell (its golden light dies).
 * Every `set(t)` is idempotent and instant; colliders follow the visual state.
 */
import * as THREE from 'three';
import type { Anchor, DynamicPiece } from '../../world/levelTypes';
import type { Collider } from '../../world/Collision';
import { getMaterial, cloneMaterial } from '../../render/materials';
import { registerLight } from '../../render/lights';
import { Kit, cyl, bellGeo, rock, rubble } from '../../world/kit';
import { Rng } from '../../core/rng';
import { type AreaCtx, anchor, bannerMaterial } from './levelCommon';
import { bannerGeo } from '../../world/kit/geom';

export type Piece = DynamicPiece & { anchor?: Anchor };
export type Gate = DynamicPiece & { anchor: Anchor; enterTo: Anchor };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// ------------------------------------------------------------------------------------ fog veil

/** Fog veil across a passage. `yaw` = the direction one walks INTO the arena. */
export function fogVeil(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, W = 5.6, H = 6): Gate {
  const root = new THREE.Group();
  root.name = 'fog:' + id;
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  ctx.dynamicRoot.add(root);
  const mat = getMaterial('fog_veil');
  const layers: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), mat);
    m.position.set(0, H / 2, (i - 1) * 0.28);
    m.renderOrder = 7;
    root.add(m);
    layers.push(m);
  }
  const c = ctx.shared.collision?.addDynamicBox('army:fog:' + id, [W, H, 0.7], 'stone');
  c?.setMatrix(new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y + H / 2, z));
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const piece: Gate = {
    object: root,
    collider: c,
    anchor: anchor(x - dx * 1.9, y, z - dz * 1.9, yaw),
    enterTo: anchor(x + dx * 2.3, y, z + dz * 2.3, yaw),
    set(t: number) {
      const e = clamp01(t);
      layers.forEach((m, i) => {
        const k = Math.max(0.001, 1 - e * (1 + i * 0.15));
        m.scale.set(1 + e * 0.15, k, 1);
        m.position.y = (H / 2) * k;
      });
      root.visible = e < 0.999;
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

// ------------------------------------------------------------------------------------ doors

/**
 * Single door leaf hinged at (hx, y, hz); closed, the leaf runs along the local +X direction for
 * `w` metres where local +X = (cos yaw, 0, −sin yaw). Opens by `swing` radians about the hinge.
 * `anchor` = where the player stands to use it (given by the caller).
 */
export function doorLeaf(ctx: AreaCtx, id: string, hx: number, y: number, hz: number, yaw: number, w: number, h: number, swing: number, use: Anchor, o: { iron?: boolean; bar?: boolean; barSide?: 1 | -1 } = {}): Piece {
  const pivot = new THREE.Group();
  pivot.name = 'door:' + id;
  pivot.position.set(hx, y, hz);
  pivot.rotation.y = yaw;
  ctx.dynamicRoot.add(pivot);
  const k = new Kit('door:' + id, ctx.shared, 3);
  const n = Math.max(3, Math.round(w / 0.28));
  for (let i = 0; i < n; i++) k.bmm('planks', (w * i) / n + 0.005, 0.02, -0.07, (w * (i + 1)) / n - 0.005, h, 0.07, { variant: i % 3 });
  for (const yy of [0.35, h * 0.5, h - 0.4]) k.bmm('iron', 0.05, yy - 0.06, 0.07, w - 0.05, yy + 0.06, 0.1, { cast: false });
  if (o.iron) for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) k.box('iron', 0.2 + (i * (w - 0.4)) / 4, 0.3 + (j * (h - 0.6)) / 6, 0.1, 0.05, 0.05, 0.03, { cast: false });
  k.add('iron', new THREE.TorusGeometry(0.1, 0.02, 5, 10), { x: w - 0.3, y: h * 0.48, z: 0.13 }, { cast: false });
  k.finish(pivot);
  let bar: THREE.Group | null = null;
  if (o.bar) {
    // a heavy oak bar in iron brackets across the outer face (lifted aside in the first half of the open)
    bar = new THREE.Group();
    const bk = new Kit('bar:' + id, ctx.shared, 4);
    bk.bmm('timber_dark', -0.2, -0.12, -0.1, w + 0.4, 0.12, 0.1);
    bk.finish(bar);
    bar.position.set(hx, y + h * 0.52, hz);
    bar.rotation.y = yaw;
    const bs = o.barSide ?? 1;
    bar.translateZ(0.28 * bs);
    ctx.dynamicRoot.add(bar);
    const bk2 = new Kit('barBrackets:' + id, ctx.shared, 5);
    bk2.push(hx, y + h * 0.52, hz, yaw);
    for (const xx of [-0.35, w + 0.35]) bk2.bmm('iron', xx - 0.08, -0.16, 0.05 * bs, xx + 0.08, 0.16, 0.42 * bs, { cast: false });
    bk2.pop();
    bk2.finish(ctx.dynamicRoot);
  }
  const col = ctx.shared.collision;
  let c: Collider | undefined;
  if (col) c = col.addDynamicBox('army:door:' + id, [w, h, 0.3], 'wood');
  const barBase = bar ? bar.position.clone() : null;
  const m = new THREE.Matrix4(), T = new THREE.Matrix4();
  const piece: Piece = {
    object: pivot,
    collider: c,
    anchor: use,
    set(t: number) {
      const e = clamp01(t);
      const openT = bar ? clamp01((e - 0.4) / 0.6) : e;
      pivot.rotation.y = yaw + swing * openT * openT * (3 - 2 * openT);
      pivot.updateMatrixWorld(true);
      if (bar && barBase) {
        const b = clamp01(e / 0.4);
        bar.position.copy(barBase).add(new THREE.Vector3(0, b * 0.5 - (b > 0.7 ? (b - 0.7) * 3 : 0), 0));
        bar.rotation.z = b * 0.9;
        bar.visible = e < 0.99;
      }
      if (c) {
        T.makeTranslation(w / 2, h / 2, 0);
        m.copy(pivot.matrixWorld).multiply(T);
        c.setMatrix(m);
        c.enabled = openT < 0.5;
      }
    },
  };
  piece.set(0);
  return piece;
}

/** Twin gate leaves across an opening of width W centred at (x, y, z), facing `yaw`; open away from the viewer (+local Z). */
export function twinGate(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, W: number, H: number): Piece {
  const root = new THREE.Group();
  root.name = 'gate:' + id;
  ctx.dynamicRoot.add(root);
  const leaves: THREE.Group[] = [];
  const cx = Math.cos(yaw), cz = -Math.sin(yaw);
  for (const s of [-1, 1]) {
    const pv = new THREE.Group();
    pv.position.set(x + cx * s * (W / 2), y, z + cz * s * (W / 2));
    pv.rotation.y = yaw;
    const k = new Kit('gateLeaf:' + id + s, ctx.shared, 6 + s);
    const lw = W / 2;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = -s * (lw * i) / n, b = -s * (lw * (i + 1)) / n;
      k.bmm('timber_dark', Math.min(a, b) + 0.004, 0, -0.12, Math.max(a, b) - 0.004, H - (i % 2) * 0.05, 0.12, { variant: i % 2 });
    }
    for (const yy of [0.5, H * 0.35, H * 0.65, H - 0.5]) k.bmm('iron', Math.min(0, -s * lw) + 0.05, yy - 0.08, 0.12, Math.max(0, -s * lw) - 0.05, yy + 0.08, 0.16, { cast: false });
    for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) k.box('iron', -s * (0.25 + (i * (lw - 0.5)) / 7), 0.4 + (j * (H - 0.8)) / 5, 0.17, 0.07, 0.07, 0.04, { cast: false });
    k.finish(pv);
    root.add(pv);
    leaves.push(pv);
  }
  const col = ctx.shared.collision;
  let c: Collider | undefined;
  if (col) { c = col.addDynamicBox('army:gate:' + id, [W, H, 0.5], 'wood'); c.setMatrix(new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y + H / 2, z)); }
  const piece: Piece = {
    object: root,
    collider: c,
    set(t: number) {
      const e = clamp01(t);
      const a = e * e * (3 - 2 * e) * 1.75;
      leaves[0].rotation.y = yaw + a;   // s = −1 leaf swings one way …
      leaves[1].rotation.y = yaw - a;   // … s = +1 the other (both away from local +Z viewer)
      if (c) c.enabled = e < 0.5;
    },
  };
  piece.set(0);
  return piece;
}

// ------------------------------------------------------------------------------------ portcullis & winch

/** Iron portcullis across an opening (width w, height h) centred at (x, y, z), plane facing `yaw`. t=1 = raised. */
export function portcullis(ctx: AreaCtx, id: string, x: number, y: number, z: number, yaw: number, w: number, h: number): Piece {
  const g = new THREE.Group();
  g.name = 'portcullis:' + id;
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  ctx.dynamicRoot.add(g);
  const k = new Kit('portcullis:' + id, ctx.shared, 8);
  const nx = Math.round(w / 0.32);
  for (let i = 0; i <= nx; i++) {
    const xx = -w / 2 + (w * i) / nx;
    k.box('iron', xx, h / 2, 0, 0.07, h, 0.07);
    k.add('iron', new THREE.ConeGeometry(0.06, 0.25, 4), { x: xx, y: -0.1, rx: Math.PI }, { cast: false });
  }
  for (let j = 1; j < 6; j++) k.box('iron', 0, (h * j) / 6, 0.04, w, 0.07, 0.05);
  k.finish(g);
  const col = ctx.shared.collision;
  let c: Collider | undefined;
  if (col) { c = col.addDynamicBox('army:portcullis:' + id, [w, h, 0.4], 'metal'); c.setMatrix(new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y + h / 2, z)); }
  const piece: Piece = {
    object: g,
    collider: c,
    set(t: number) {
      const e = clamp01(t);
      g.position.y = y + e * (h - 0.35);
      if (c) c.enabled = e < 0.75;
    },
  };
  piece.set(0);
  return piece;
}

/** A winch drum with a spoked wheel (turns as t goes 0 → 1). Static frame goes into `k`. */
export function winch(ctx: AreaCtx, k: Kit, id: string, x: number, y: number, z: number, yaw: number, use: Anchor): Piece {
  k.push(x, y, z, yaw);
  for (const s of [-1, 1]) {
    k.box('timber_dark', s * 0.7, 0.7, 0, 0.18, 1.4, 0.5, { col: 'wood' });
    k.box('timber_dark', s * 0.7, 0.05, 0, 0.3, 0.1, 1.0, { cast: false });
  }
  k.add('rope', cyl(0.24, 0.24, 1.1, 10), { y: 1.1, rz: Math.PI / 2 }, { cast: false });
  k.pop();
  const wheel = new THREE.Group();
  wheel.name = 'winch:' + id;
  const wk = new Kit('winchWheel:' + id, ctx.shared, 9);
  wk.add('timber_dark', new THREE.TorusGeometry(0.62, 0.05, 6, 14), { ry: Math.PI / 2 });
  for (let i = 0; i < 6; i++) wk.box('timber_dark', 0, 0, 0, 0.06, 1.25, 0.06, { rx: (i / 6) * Math.PI });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; wk.add('timber_dark', cyl(0.03, 0.03, 0.3, 5), { x: 0.15, y: Math.cos(a) * 0.62, z: Math.sin(a) * 0.62, rz: Math.PI / 2 }, { cast: false }); }
  wk.finish(wheel);
  const p = k.wp(0, 0, 0);
  const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  wheel.position.set(x + side.x * 0.9, y + 1.1, z + side.z * 0.9);
  wheel.rotation.y = yaw;
  void p;
  ctx.dynamicRoot.add(wheel);
  const piece: Piece = { object: wheel, anchor: use, set(t: number) { wheel.rotation.x = clamp01(t) * Math.PI * 3; } };
  piece.set(0);
  return piece;
}

/** Wall lever (iron arm on a pivot): t=0 up, t=1 pulled down. */
export function wallLever(ctx: AreaCtx, k: Kit, id: string, x: number, y: number, z: number, yaw: number, use: Anchor): Piece {
  k.push(x, y, z, yaw);
  k.bmm('iron', -0.45, 0, -0.35, 0.45, 1.1, 0, { col: 'metal' });
  k.bmm('timber_dark', -0.55, 1.1, -0.45, 0.55, 1.3, 0.1, { cast: false });
  k.pop();
  const pv = new THREE.Group();
  pv.name = 'lever:' + id;
  const d = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  pv.position.set(x + d.x * 0.15, y + 1.25, z + d.z * 0.15);
  pv.rotation.y = yaw;
  const a = new Kit('leverArm:' + id, ctx.shared, 4);
  a.add('iron', cyl(0.05, 0.06, 1.1, 6), { y: 0.55 });
  a.add('leather_dark', cyl(0.07, 0.07, 0.3, 6), { y: 1.0 }, { cast: false });
  a.add('iron', cyl(0.12, 0.12, 0.25, 8), { rz: Math.PI / 2 }, { cast: false });
  a.finish(pv);
  ctx.dynamicRoot.add(pv);
  const piece: Piece = { object: pv, anchor: use, set(t: number) { pv.rotation.x = 0.5 + clamp01(t) * 2.1; } };
  piece.set(0);
  return piece;
}

// ------------------------------------------------------------------------------------ the powder magazine

/**
 * The eastern magazine's destructible upper works. t=0: roof, gable, powder kegs, fuse line and
 * lamp intact; t=1: roof gone, scorched stumps, blackened rubble spill, charred beams and a
 * smouldering crater glow. (The lower walls are static and shared by both states.)
 */
export function magazineState(ctx: AreaCtx, x0: number, y: number, z0: number, x1: number, z1: number, door: Piece): Piece {
  const intact = new THREE.Group(); intact.name = 'magazine:intact';
  const ruin = new THREE.Group(); ruin.name = 'magazine:ruin';
  ctx.dynamicRoot.add(intact, ruin);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0;
  const ki = new Kit('magazineIntact', ctx.shared, 21);
  // upper walls (y+3 → y+5.2) and a stone-slab pitched roof (bomb-proof vault look)
  ki.bmm('stone_dark', x0, y + 3, z0, x1, y + 5.2, z0 + 1.1);
  ki.bmm('stone_dark', x0, y + 3, z1 - 1.1, x1, y + 5.2, z1);
  ki.bmm('stone_dark', x0, y + 3, z0, x0 + 1.1, y + 5.2, z1);
  ki.bmm('stone_dark', x1 - 1.1, y + 3, z0, x1, y + 5.2, z1);
  for (const s of [-1, 1]) ki.box('roof_slate', cx, y + 6.3, cz + s * D * 0.25, W + 0.8, 0.35, D * 0.56, { rx: s * 0.42 });
  ki.box('stone_trim', cx, y + 7.35, cz, W + 0.9, 0.3, 0.5);
  ki.box('stone_trim', cx, y + 5.2, cz, W + 0.3, 0.2, D + 0.3, { cast: false });
  // kegs stacked inside, the slow-match fuse snaking to them
  const rng = new Rng(77);
  for (let i = 0; i < 14; i++) {
    const kx = x1 - 1.6 - (i % 4) * 0.75, kz = z0 + 1.6 + Math.floor(i / 4) * 0.8;
    ki.add('timber', cyl(0.3, 0.3, 0.75, 10), { x: kx, y: y + 0.38 + (i > 11 ? 0.75 : 0), z: kz + rng.range(-0.05, 0.05) }, { cast: false });
    ki.add('iron', cyl(0.31, 0.31, 0.05, 10), { x: kx, y: y + 0.2 + (i > 11 ? 0.75 : 0), z: kz }, { cast: false });
    ki.add('iron', cyl(0.31, 0.31, 0.05, 10), { x: kx, y: y + 0.58 + (i > 11 ? 0.75 : 0), z: kz }, { cast: false });
  }
  for (let i = 0; i < 9; i++) ki.box('rope', x0 + 1.4 + i * 0.7, y + 0.03, cz + Math.sin(i * 1.3) * 0.5, 0.72, 0.03, 0.04, { ry: Math.sin(i) * 0.4, cast: false });
  ki.box('ember_glow', x0 + 1.3, y + 0.05, cz, 0.08, 0.06, 0.08, { cast: false });
  ki.finish(intact);
  const kr = new Kit('magazineRuin', ctx.shared, 22);
  const rr = new Rng(91);
  // broken stumps of the upper walls, blackened
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const side = i % 4;
    const hh = rr.range(0.2, 1.6);
    if (side === 0) kr.bmm('timber_burnt', x0 + t * W, y + 3, z0, x0 + t * W + W / 10, y + 3 + hh, z0 + 1.1);
    else if (side === 1) kr.bmm('stone_dark', x0 + t * W, y + 3, z1 - 1.1, x0 + t * W + W / 10, y + 3 + hh, z1);
    else if (side === 2) kr.bmm('stone_dark', x0, y + 3, z0 + t * D, x0 + 1.1, y + 3 + hh, z0 + t * D + D / 10);
    else kr.bmm('timber_burnt', x1 - 1.1, y + 3, z0 + t * D, x1, y + 3 + hh, z0 + t * D + D / 10);
  }
  for (let i = 0; i < 16; i++) kr.add(i % 3 ? 'rubble' : 'stone_dark', rock(rr.range(0.4, 1.1), 300 + i, 0.6), { x: cx + rr.range(-W * 0.6, W * 0.6), y: y + 0.2, z: cz + rr.range(-D * 0.7, D * 0.7), ry: rr.range(0, 6) });
  for (let i = 0; i < 5; i++) kr.box('timber_burnt', cx + rr.range(-2, 2), y + 0.5 + i * 0.15, cz + rr.range(-3, 3), 0.25, 0.25, rr.range(2.5, 5), { ry: rr.range(0, 3), rx: rr.range(-0.3, 0.3) });
  kr.box('ember_glow', cx, y + 0.04, cz, W * 0.5, 0.02, D * 0.5, { cast: false });
  rubble(kr, cx - W / 2 - 1.5, y, cz, 1.4, true);
  rubble(kr, cx, y, z1 + 1.2, 1.2, true);
  kr.finish(ruin);
  const piece: Piece = {
    object: intact,
    set(t: number) {
      const blown = t > 0.5;
      intact.visible = !blown;
      ruin.visible = blown;
      if (blown) { door.object.visible = false; if (door.collider) door.collider.enabled = false; }
      else door.object.visible = true;
    },
  };
  piece.set(0);
  return piece;
}

// ------------------------------------------------------------------------------------ Varr's war-standard

/** The Marshal's war-standard at the rampart's north edge: iron pole, crossbar, banner, a bronze bell. set(1) = shattered. */
export function warStandard(ctx: AreaCtx, k: Kit, x: number, y: number, z: number): Piece {
  k.bmm('stone_trim', x - 1.6, y, z - 1.1, x + 1.6, y + 0.5, z + 1.1, { col: true });
  k.bmm('stone_dark', x - 1.3, y + 0.5, z - 0.8, x + 1.3, y + 0.62, z + 0.8);
  const root = new THREE.Group();
  root.name = 'varrStandard';
  ctx.dynamicRoot.add(root);
  const iron = getMaterial('iron'), bronze = getMaterial('bronze_bell'), glow = getMaterial('unlived_crack');
  const pole = new THREE.Group();
  pole.position.set(x, y + 0.62, z);
  const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 8, 8).translate(0, 4, 0), iron);
  pm.castShadow = true;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.14).translate(0, 7.3, 0), iron);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 6).translate(0, 8.4, 0), getMaterial('gold_trim'));
  const banner = new THREE.Mesh(bannerGeo(2.4, 4.4, 8, true).translate(0, 7.2, 0.12), bannerMaterial('victory'));
  banner.castShadow = true;
  pole.add(pm, bar, finial, banner);
  root.add(pole);
  // the bell hangs in front of the banner, as 5 wedge fragments
  const hang = new THREE.Vector3(x, y + 0.62 + 5.2, z + 0.7);
  const bellH = 1.5;
  const frags: { g: THREE.Group; phi: number }[] = [];
  const armM = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.9).translate(0, 5.2, 0.4), iron);
  pole.add(armM);
  for (let i = 0; i < 5; i++) {
    const phi0 = (i / 5) * Math.PI * 2;
    const r = bellH * 0.62;
    const prof = [[r * 0.94, -bellH], [r, -bellH * 0.97], [r * 0.93, -bellH * 0.9], [r * 0.78, -bellH * 0.72], [r * 0.64, -bellH * 0.5], [r * 0.58, -bellH * 0.3], [r * 0.46, -bellH * 0.07], [0.001, 0]].map(([a, b]) => new THREE.Vector2(a, b));
    const g = new THREE.Group();
    g.position.copy(hang);
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 5, phi0, (Math.PI * 2) / 5), bronze);
    mesh.castShadow = true;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.035, bellH * 0.85, 0.035), glow);
    seam.position.set(Math.sin(phi0) * r * 0.8, -bellH * 0.5, Math.cos(phi0) * r * 0.8);
    seam.name = 'crack';
    g.add(mesh, seam);
    root.add(g);
    frags.push({ g, phi: phi0 + Math.PI / 5 });
  }
  const q = new THREE.Quaternion(), axis = new THREE.Vector3();
  const ground = y + 0.7;
  const piece: Piece = {
    object: root,
    set(t: number) {
      const e = clamp01(t);
      const u = clamp01((e - 0.25) / 0.75);
      for (const f of frags) {
        const fall = Math.min(1, (u * 1.7) ** 2);
        const dx = Math.sin(f.phi), dz = Math.cos(f.phi);
        f.g.position.set(hang.x + dx * u * 2.2, hang.y - (hang.y - ground - 0.3) * fall, hang.z + dz * u * 2.2);
        axis.set(dz, 0, -dx);
        q.setFromAxisAngle(axis, u * 1.9);
        f.g.quaternion.copy(q);
        if (e > 0 && e < 0.25) f.g.position.x += Math.sin(e * 180 + f.phi * 3) * 0.02;
      }
      // the pole snaps and leans; the banner drops with it
      pole.rotation.z = -u * 0.55;
      pole.rotation.x = u * 0.2;
      armM.visible = u < 0.05;
    },
  };
  piece.set(0);
  return piece;
}

// ------------------------------------------------------------------------------------ the Great Bell

/**
 * The Army's Great Bell hanging from the bridge between the two towers: bronze body with a web of
 * golden cracks (a separate mesh so its light can die), a crown of glowing "anchor" shackles and a
 * warm light beneath the mouth. set(1) = silenced: cracks go dark, the shackles shatter, the light
 * dies and the bell settles a little askew.
 */
const _tmpV = new THREE.Vector3();
let _halo: THREE.Texture | null = null;
function haloTexture() {
  if (_halo) return _halo;
  const n = 64, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5) / n * 2 - 1, dy = (y + 0.5) / n * 2 - 1;
    const d = Math.sqrt(dx * dx + dy * dy);
    const a = Math.pow(clamp01(1 - d), 2.2);
    const i = (y * n + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(a * 255);
  }
  _halo = new THREE.DataTexture(data, n, n);
  _halo.needsUpdate = true;
  return _halo;
}

export function greatBell(ctx: AreaCtx, x: number, top: number, z: number, h: number): Piece {
  const root = new THREE.Group();
  root.name = 'greatBell';
  root.position.set(x, top, z);
  ctx.dynamicRoot.add(root);
  // double-sided: the bell is seen from below, into its mouth
  const bronzeDS = cloneMaterial(getMaterial('bronze_bell')) as THREE.MeshStandardMaterial;
  bronzeDS.side = THREE.DoubleSide;
  const body = new THREE.Mesh(bellGeo(h, 40), bronzeDS);
  body.castShadow = false;
  body.receiveShadow = true;
  root.add(body);
  // the hollow glows: a warm, dim inner shell lit by the cracks
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x5a3414, side: THREE.BackSide, fog: true, vertexColors: true });
  const innerGeo = bellGeo(h * 0.97, 32).scale(0.965, 1, 0.965);
  {
    // lit from the cracks near the lip, dark up in the crown
    const pos = innerGeo.attributes.position, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const v = clamp01(-pos.getY(i) / (h * 0.97));
      const k = 0.18 + 0.95 * v * v * v;
      cols[i * 3] = k * 1.1; cols[i * 3 + 1] = k; cols[i * 3 + 2] = k * 0.85;
    }
    innerGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }
  const innerShell = new THREE.Mesh(innerGeo, innerMat);
  innerShell.position.y = -h * 0.02;
  root.add(innerShell);
  // lip ring, waist bands and a relief band (the army's castle-and-sword, abstracted as crenels)
  const r = h * 0.62;
  const bandMat = getMaterial('bronze');
  const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, h * 0.02, 6, 48), bandMat);
  lip.rotation.x = Math.PI / 2; lip.position.y = -h * 0.965;
  const waist = new THREE.Mesh(new THREE.TorusGeometry(r * 0.64, h * 0.012, 6, 40), bandMat);
  waist.rotation.x = Math.PI / 2; waist.position.y = -h * 0.5;
  const shoulder = new THREE.Mesh(new THREE.TorusGeometry(r * 0.52, h * 0.012, 6, 40), bandMat);
  shoulder.rotation.x = Math.PI / 2; shoulder.position.y = -h * 0.14;
  root.add(lip, waist, shoulder);
  // cracks: branching random walks over the surface
  const crackMat = cloneMaterial(getMaterial('unlived_crack')) as THREE.MeshStandardMaterial;
  const baseEm = crackMat.emissiveIntensity;
  const rng = new Rng(4040);
  const parts: THREE.BufferGeometry[] = [];
  const radiusAt = (v: number) => {
    const prof: [number, number][] = [[0.94, 1], [1.0, 0.97], [0.93, 0.9], [0.78, 0.72], [0.64, 0.5], [0.58, 0.3], [0.55, 0.16], [0.46, 0.07], [0.25, 0.02]];
    for (let i = 0; i < prof.length - 1; i++) {
      const [ra, va] = prof[i], [rb, vb] = prof[i + 1];
      if (v <= va && v >= vb) return r * (ra + ((v - va) / (vb - va)) * (rb - ra));
    }
    return r * 0.25;
  };
  const P = (th: number, v: number, out = 0.02) => new THREE.Vector3(Math.sin(th) * (radiusAt(v) + out), -h * v, Math.cos(th) * (radiusAt(v) + out));
  const walk = (th: number, v: number, steps: number, width: number, depth: number) => {
    let a = th, b = v;
    for (let i = 0; i < steps; i++) {
      const na = a + rng.range(-0.09, 0.09), nb = b - rng.range(0.025, 0.05);
      if (nb < 0.12) break;
      const p0 = P(a, b), p1 = P(na, nb);
      const len = p0.distanceTo(p1);
      const seg = new THREE.BoxGeometry(width * (1 - i / (steps + 2)), len + 0.05, width * 0.8);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
      seg.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
      parts.push(seg);
      if (depth > 0 && rng.chance(0.2)) walk(na, nb, Math.round(steps * 0.5), width * 0.7, depth - 1);
      a = na; b = nb;
    }
  };
  for (let i = 0; i < 9; i++) walk(rng.range(-1.2, 1.2) + (i % 3 === 0 ? Math.PI : 0), rng.range(0.9, 0.98), rng.int(10, 18), h * 0.012, 2);
  const cracks = new THREE.Mesh(mergeBoxes(parts), crackMat);
  cracks.name = 'greatBell:cracks';
  root.add(cracks);
  // the crown: iron yoke and the glowing anchor shackles (the Covenant's hold on the bell)
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(h * 0.5, h * 0.08, h * 0.22), getMaterial('iron'));
  yoke.position.y = h * 0.05;
  root.add(yoke);
  const shackles = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.TorusGeometry(h * 0.07, h * 0.012, 6, 14), crackMat);
    s.position.set((i - 1.5) * h * 0.1, h * 0.12, 0);
    s.rotation.y = Math.PI / 2;
    shackles.add(s);
  }
  root.add(shackles);
  // a clapper
  const clap = new THREE.Mesh(new THREE.SphereGeometry(h * 0.08, 10, 8), getMaterial('iron'));
  clap.position.y = -h * 0.82;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.015, h * 0.015, h * 0.75, 6), getMaterial('iron'));
  rod.position.y = -h * 0.42;
  root.add(clap, rod);
  const light = new THREE.PointLight(0xffb45a, 90, 70, 1.6);
  light.position.set(x, top - h * 0.95, z);
  light.castShadow = false;
  light.userData.baseIntensity = 90;
  ctx.dynamicRoot.add(light);
  registerLight(light);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.BackSide, fog: true });
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.9, h * 0.06, 32, 1, true), glowMat);
  inner.position.y = -h * 0.88;
  root.add(inner);
  // far halo: the golden beacon that reads from the Siege Road; fades out as the camera nears
  const haloMat = new THREE.SpriteMaterial({ map: haloTexture(), color: 0xffc27a, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.setScalar(h * 2.6);
  halo.position.y = -h * 0.55;
  halo.renderOrder = 2;
  let haloBase = 0.5;
  halo.onBeforeRender = (_r, _s, cam) => {
    const d = cam.position.distanceTo(root.getWorldPosition(_tmpV));
    haloMat.opacity = haloBase * clamp01((d - 60) / 110);
  };
  root.add(halo);
  const piece: Piece = {
    object: root,
    set(t: number) {
      const e = clamp01(t);
      haloBase = 0.5 * (1 - e);
      halo.visible = e < 0.999;
      crackMat.emissiveIntensity = baseEm * (1 - e * 0.97);
      crackMat.color.setRGB(1 - e * 0.7, 1 - e * 0.75, 1 - e * 0.8);
      light.intensity = 90 * (1 - e);
      light.visible = e < 0.999;
      glowMat.opacity = 0.35 * (1 - e);
      innerMat.color.setRGB(0.62 * (1 - e) + 0.07, 0.36 * (1 - e) + 0.06, 0.14 * (1 - e) + 0.05);
      inner.visible = e < 0.999;
      shackles.children.forEach((c, i) => {
        const u = clamp01((e - 0.1 * i) / 0.5);
        c.position.set((i - 1.5) * h * 0.1 + (i - 1.5) * u * h * 0.3, h * 0.12 - u * u * h * 3, u * (i % 2 ? 1 : -1) * h * 0.2);
        c.rotation.x = u * 3;
        c.visible = u < 0.98;
      });
      root.rotation.z = e * 0.05;
      root.rotation.x = e * 0.03;
    },
  };
  piece.set(0);
  return piece;
}

function mergeBoxes(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const non = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of non) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of non) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}
