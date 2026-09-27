/**
 * The impossible battlefield beneath the Commander's Yard (revealed after Corvane falls): a vast
 * misty plain at y ≈ -60 with a river ford (Greyford), hundreds of Unlived soldiers standing in
 * formation (instanced silhouettes with gold visor cracks), spears and banners, broken siege
 * works, and a pale gold haze. Everything lives in one group that stays hidden until revealed.
 */
import * as THREE from 'three';
import { getMaterial } from '../../render/materials';
import { Kit, type KitShared, mergeSimple, cyl, cone, PuffField, fallenBeam, rockProp } from '../../world/kit';
import { Rng } from '../../core/rng';

export interface Battlefield { group: THREE.Group; haze: PuffField; shaft: THREE.Mesh; update(time: number): void }

const BOX = (sx: number, sy: number, sz: number, x: number, y: number, z: number, rx = 0, rz = 0) => {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  if (rx || rz) g.rotateX(rx).rotateZ(rz);
  return g.translate(x, y, z);
};

/** Low-poly soldier silhouette (~110 tris), feet at y=0, facing +Z. */
function soldierGeo() {
  return mergeSimple([
    BOX(0.16, 0.8, 0.18, -0.11, 0.4, 0), BOX(0.16, 0.8, 0.18, 0.11, 0.4, 0.02),
    BOX(0.5, 0.62, 0.3, 0, 1.12, 0), BOX(0.64, 0.14, 0.34, 0, 1.44, 0),
    BOX(0.12, 0.6, 0.14, -0.33, 1.1, 0.04, 0.2), BOX(0.12, 0.6, 0.14, 0.33, 1.12, 0.1, -0.5),
    cyl(0.13, 0.15, 0.3, 6).translate(0, 1.5, 0), cyl(0.27, 0.27, 0.03, 8).translate(0, 1.72, 0), cone(0.16, 0.12, 6).translate(0, 1.73, 0),
    BOX(0.46, 0.8, 0.04, 0, 0.95, -0.19), BOX(0.5, 0.72, 0.06, -0.36, 1.0, 0.2, 0, 0.05),
  ]);
}
const spearGeo = () => mergeSimple([BOX(0.04, 2.8, 0.04, 0, 1.4, 0), cone(0.05, 0.3, 4).translate(0, 2.8, 0)]);
const glowGeo = () => mergeSimple([BOX(0.18, 0.035, 0.02, 0, 1.56, 0.15), BOX(0.03, 0.34, 0.02, 0.05, 1.15, 0.155), BOX(0.12, 0.02, 0.02, 0.07, 1.25, 0.155)]);
const bannerGeo = () => mergeSimple([BOX(0.07, 5, 0.07, 0, 2.5, 0), BOX(1.1, 0.06, 0.06, 0.5, 4.9, 0), BOX(1.0, 1.9, 0.03, 0.55, 3.9, 0)]);

export function buildBattlefield(shared: KitShared, parent: THREE.Object3D, center: THREE.Vector3, floorY: number): Battlefield {
  const group = new THREE.Group();
  group.name = 'battlefield';
  parent.add(group);
  const rng = new Rng(1917);
  const d = shared.detail;

  // ---------------------------------------------------------------- the plain (gentle hills, flat near the centre)
  const size = 900, seg = 90;
  const plain = new THREE.PlaneGeometry(size, size, seg, seg);
  plain.rotateX(-Math.PI / 2);
  const p = plain.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    const hills = Math.sin(x * 0.013) * Math.cos(z * 0.011) * 9 + Math.sin(x * 0.031 + 1.3) * Math.sin(z * 0.027) * 3;
    const riverBed = -3.5 * Math.exp(-Math.pow((x - riverX(z)) / 14, 2));
    p.setY(i, (hills * Math.min(1, Math.max(0, (r - 60) / 140))) + riverBed + (r > 330 ? (r - 330) * 0.25 : 0));
  }
  plain.computeVertexNormals();
  const plainMesh = new THREE.Mesh(plain, getMaterial('mud'));
  plainMesh.position.set(center.x, floorY, center.z);
  plainMesh.receiveShadow = true;
  group.add(plainMesh);
  // river (the ford at Greyford)
  const river = new THREE.PlaneGeometry(26, size, 1, 60);
  river.rotateX(-Math.PI / 2);
  const rp = river.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rp.count; i++) rp.setX(i, rp.getX(i) + riverX(rp.getZ(i)));
  river.computeVertexNormals();
  const riverMesh = new THREE.Mesh(river, getMaterial('water'));
  riverMesh.position.set(center.x, floorY - 1.6, center.z);
  group.add(riverMesh);

  // ---------------------------------------------------------------- formations of the Unlived
  const soldiers: THREE.Matrix4[] = [], spears: THREE.Matrix4[] = [], banners: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const nForm = Math.round(34 * d);
  for (let f = 0; f < nForm; f++) {
    const ring = f < 8 ? 0 : f < 20 ? 1 : 2;
    const ang = rng.range(0, Math.PI * 2);
    const dist = [18, 55, 120][ring] + rng.range(0, [30, 60, 120][ring]);
    const fx = Math.cos(ang) * dist, fz = Math.sin(ang) * dist;
    if (Math.abs(fx - riverX(fz)) < 18) continue; // keep the ford clear
    const yaw = Math.atan2(-fx, -fz) + rng.range(-0.15, 0.15); // face the centre (the hole above)
    const rows = rng.int(3, 6), cols = rng.int(6, 12);
    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (rng.chance(0.08)) continue;
      const lx = (c - (cols - 1) / 2) * 1.25 + rng.range(-0.15, 0.15), lz = -r * 1.5 + rng.range(-0.15, 0.15);
      const x = fx + lx * cyaw + lz * syaw, z = fz - lx * syaw + lz * cyaw;
      const y = groundAt(x, z);
      e.set(0, yaw + rng.range(-0.1, 0.1), rng.range(-0.04, 0.04));
      q.setFromEuler(e);
      s.setScalar(rng.range(0.95, 1.08));
      m.compose(v.set(center.x + x, floorY + y, center.z + z), q, s);
      soldiers.push(m.clone());
      if ((r + c) % 2 === 0) {
        e.set(rng.range(-0.12, 0.05), yaw, 0);
        q.setFromEuler(e);
        m.compose(v.set(center.x + x + 0.3 * cyaw, floorY + y + 0.3, center.z + z - 0.3 * syaw), q, s);
        spears.push(m.clone());
      }
    }
    // one banner per formation, at the front right
    const bx = fx + ((cols / 2) * 1.25 + 0.8) * cyaw + 1.2 * syaw, bz = fz - ((cols / 2) * 1.25 + 0.8) * syaw + 1.2 * cyaw;
    q.setFromEuler(e.set(rng.range(-0.08, 0.08), yaw, rng.range(-0.1, 0.1)));
    m.compose(v.set(center.x + bx, floorY + groundAt(bx, bz), center.z + bz), q, s.setScalar(1));
    banners.push(m.clone());
  }
  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], name: string) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((mm, i) => im.setMatrixAt(i, mm));
    im.count = list.length;
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.name = name;
    group.add(im);
    return im;
  };
  mk(soldierGeo(), getMaterial('steel_armor'), soldiers, 'unlivedSoldiers');
  mk(glowGeo(), getMaterial('unlived_crack'), soldiers, 'unlivedGlow');
  mk(spearGeo(), getMaterial('timber_dark'), spears, 'unlivedSpears');
  mk(bannerGeo(), getMaterial('cloth_red'), banners, 'unlivedBanners');

  // ---------------------------------------------------------------- broken siege works (merged kit)
  const k = new Kit('battlefieldWorks', shared, 1918);
  const Y = floorY;
  for (let i = 0; i < Math.round(10 * d); i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(70, 260);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    const y = Y + groundAt(x - center.x, z - center.z);
    const yaw = rng.range(0, Math.PI * 2);
    k.push(x, y, z, yaw);
    if (i % 3 === 0) {
      // broken siege tower, leaning
      k.pushMatrix(new THREE.Matrix4().makeRotationZ(rng.range(-0.35, 0.35)));
      for (const [sx, sz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) k.box('timber_dark', sx, 7, sz, 0.5, 14 * rng.range(0.6, 1), 0.5);
      for (let h = 2; h < 12; h += 3.3) k.box('planks', 0, h, 2.6, 5.4, 2.4, 0.15);
      k.pop();
    } else if (i % 3 === 1) {
      // trebuchet frame
      for (const sx of [-1.6, 1.6]) { k.box('timber_dark', sx, 3.5, 0, 0.45, 7, 0.45, { rx: 0.25 }); k.box('timber_dark', sx, 3.5, 0, 0.45, 7, 0.45, { rx: -0.25 }); }
      k.box('timber_dark', 0, 6.4, 0, 3.8, 0.4, 0.4);
      k.box('timber', 0, 7.5, 1.5, 0.35, 0.35, 11, { rx: -0.6 });
      k.box('timber_dark', 0, 0.4, 0, 4, 0.5, 6);
    } else {
      // palisade line of stakes
      for (let j = 0; j < 14; j++) k.box('timber_dark', -9 + j * 1.4, 1.2, rng.range(-0.3, 0.3), 0.3, 2.6, 0.3, { rx: -0.5 + rng.range(-0.2, 0.2) });
    }
    k.pop();
  }
  for (let i = 0; i < 16; i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(20, 200);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r, y = Y + groundAt(x - center.x, z - center.z);
    fallenBeam(k, [x, y + 0.2, z], [x + rng.range(-4, 4), y + rng.range(0.2, 1.5), z + rng.range(-4, 4)], 0.35, 'timber_dark');
    rockProp(k, x + 3, y, z - 2, rng.range(1, 3), 300 + i, 0.6);
  }
  k.finish(group);

  // ---------------------------------------------------------------- pale gold haze + light shaft from the hole
  const cols: import('../../world/kit').PuffColumn[] = [];
  for (let i = 0; i < Math.round(46 * d); i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(10, 280);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    cols.push({ pos: new THREE.Vector3(x, Y + groundAt(x - center.x, z - center.z) + 1, z), height: rng.range(6, 16), size0: 18, size1: 46, count: 3, life: 40, drift: new THREE.Vector3(rng.range(-8, 8), 0, rng.range(-8, 8)), spread: 12 });
  }
  const haze = new PuffField(cols, { color: 0xffe2a8, baseColor: 0xd8b070, opacity: 0.16, additive: true }, 77);
  group.add(haze.mesh);
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xffdf9a, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(8, 22, 8 - floorY, 24, 1, true), shaftMat);
  shaft.position.set(center.x, (8 + floorY) / 2, center.z);
  shaft.renderOrder = 6;
  group.add(shaft);

  group.visible = false;
  return { group, haze, shaft, update: (time: number) => haze.update(time) };
}

/** River centre line (x offset) as a function of z, in plain-local coordinates. */
function riverX(z: number) { return 45 + Math.sin(z * 0.012) * 30 + Math.sin(z * 0.004 + 2) * 40; }

/** Approximate ground height (local to the plain centre) — matches the plain displacement. */
function groundAt(x: number, z: number) {
  const r = Math.hypot(x, z);
  const hills = Math.sin(x * 0.013) * Math.cos(z * 0.011) * 9 + Math.sin(x * 0.031 + 1.3) * Math.sin(z * 0.027) * 3;
  const riverBed = -3.5 * Math.exp(-Math.pow((x - riverX(z)) / 14, 2));
  return hills * Math.min(1, Math.max(0, (r - 60) / 140)) + riverBed;
}
