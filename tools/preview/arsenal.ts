/**
 * Arsenal preview: contact sheets of weapon-class clips on the mannequin with the REAL weapon
 * models (so grips, two-handed offhand placement and blade edges are exactly as in game).
 *
 * URL params:
 *   weapon=<item id>   right hand (e.g. bellwarden_greatsword)     left=<item id> (shield / dirk)
 *   stance=<STANCES key>   (default: from the weapon class moveset)
 *   clips=a,b,c        one row per clip          ts=0,0.3,0.5 (fractions of each clip; `abs=1` = seconds)
 *   view=side|front34|front|top|back|right      dist=<m>     speed=<m/s> locomotion (no clip)
 *   hit=1  draw the weapon hit segment (red) and tip trace
 * Sets window.__ready when drawn; `window.__render(query)` redraws another sheet without reloading.
 */
import * as THREE from 'three';
import { Rig } from '../../src/actors/Rig';
import { Animator } from '../../src/actors/anim/Animator';
import { buildMannequin } from '../../src/actors/debugModel';
import { STANCES, SHIELD_REST, DIRK_REST } from '../../src/actors/anim/clips/stances';
import { CLIPS } from '../../src/actors/anim/clips/index';
import { models } from '../../src/actors/models/index';
import type { WeaponModelExt } from '../../src/actors/models/weapons';
import { initMaterials } from '../../src/render/materials';
import { ITEMS } from '../../src/content/items';
import { movesetFor } from '../../src/combat/movesets';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setScissorTest(true);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 6, 4); scene.add(sun);
scene.add(new THREE.GridHelper(6, 12, 0x777777, 0x444444));
scene.add(new THREE.AxesHelper(0.4));

await initMaterials(renderer).catch(() => {});
const rig = new Rig();
buildMannequin(rig);
scene.add(rig.root);
const anim = new Animator(rig);
const segGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const seg = new THREE.Line(segGeo, new THREE.LineBasicMaterial({ color: 0xff3030, depthTest: false }));
seg.renderOrder = 10;
scene.add(seg);
const views: Record<string, [number, number, number]> = { front34: [2.2, 1.7, 2.6], side: [-3.4, 1.4, 0.4], front: [0, 1.4, 3.4], back: [0.5, 1.8, -3.2], top: [0.01, 4.8, 0.6], right: [-3.4, 1.4, 0.4], left: [3.4, 1.4, 0.4], back34: [-2.2, 1.7, -2.4] };

/** Render one contact sheet for a query string (see the header for params). */
async function render(query: string) {
  const q = new URLSearchParams(query);
  for (const el of [...document.querySelectorAll('.lbl')]) el.remove();
  for (const s of [rig.sockets.weaponR, rig.sockets.weaponL, rig.sockets.shieldL]) s.clear();
  const weaponId = q.get('weapon') ?? 'retainer_sword';
  const leftId = q.get('left');
  const wdef = ITEMS[weaponId];
  const ms = movesetFor(wdef?.weapon?.class ?? 'fist', !!leftId);
  let wm: WeaponModelExt | null = null;
  if (wdef && !q.get('cells')) { wm = models.buildWeapon(weaponId) as WeaponModelExt; rig.sockets.weaponR.add(wm.object); }
  const ldef = leftId ? ITEMS[leftId] : null;
  if (leftId && ldef) (ldef.kind === 'shield' ? rig.sockets.shieldL : rig.sockets.weaponL).add(models.buildWeapon(leftId).object);
  const base = STANCES[q.get('stance') ?? ms.stance] ?? STANCES.sword;
  anim.stance = { ...base, handL: ldef ? (ldef.kind === 'shield' ? SHIELD_REST : DIRK_REST) : base.handL };
  seg.visible = q.get('hit') !== '0' && !!wm?.hit;
  const clipNames = (q.get('clips') ?? q.get('clip') ?? '').split(',').filter(Boolean);
  const ts = (q.get('ts') ?? '0,0.25,0.4,0.55,0.8').split(',').map(Number);
  const abs = q.get('abs') === '1';
  const view = q.get('view') ?? 'front34';
  const dist = parseFloat(q.get('dist') ?? '1');
  const speed = parseFloat(q.get('speed') ?? '0');
  const v = views[view] ?? views.front34;
  const rows = Math.max(1, clipNames.length), cols = clipNames.length ? ts.length : Math.max(1, ts.length);
  const W = innerWidth, Hh = innerHeight, cw = W / cols, ch = Hh / rows;
  const cam = new THREE.PerspectiveCamera(40, cw / ch, 0.05, 100);
  cam.position.set(v[0] * dist, v[1] * (view === 'top' ? dist : 1), v[2] * dist); cam.lookAt(0, 1.0, 0.35);
  const loco = { speed, dirX: 0, dirZ: 1, sprint: speed > 5, alert: 0, turnRate: 0 };
  if (anim.clip) anim.stop(0);
  const pose = (clipName: string | null, t: number) => {
    const c = clipName ? CLIPS[clipName] : null;
    if (c) { anim.play(c, { fade: 0 }); anim.clipT = abs ? t : t * c.duration; } else { if (anim.clip) anim.stop(0); anim.update(t, loco); }
    anim.update(0, loco);
    anim.evaluate(0);
    rig.root.updateMatrixWorld(true);
    if (wm?.hit) {
      const s = rig.sockets.weaponR;
      segGeo.setFromPoints([new THREE.Vector3(0, wm.hit.from, 0).applyMatrix4(s.matrixWorld), new THREE.Vector3(0, wm.hit.to, 0).applyMatrix4(s.matrixWorld)]);
    }
    return c;
  };
  // Lineup mode: `cells=weapon[|left]:clip:t;...` — each cell has its own weapon, clip (or `-` for the
  // idle stance) and time (fraction of the clip). Row-major on a `cols` grid (default 4).
  const cells = q.get('cells');
  if (cells) {
    const list = cells.split(';').filter(Boolean);
    const nc = Math.min(list.length, parseInt(q.get('cols') ?? '4')), nr = Math.ceil(list.length / nc);
    const cw2 = W / nc, ch2 = Hh / nr;
    cam.aspect = cw2 / ch2; cam.updateProjectionMatrix();
    list.forEach((cell, i) => {
      const [wl, clipName, tt] = cell.split(':');
      const [w, l] = wl.split(/[+| ]/);
      for (const s of [rig.sockets.weaponR, rig.sockets.weaponL, rig.sockets.shieldL]) s.clear();
      const wd = ITEMS[w];
      wm = wd ? models.buildWeapon(w) as WeaponModelExt : null;
      if (wm) rig.sockets.weaponR.add(wm.object);
      const ld = l ? ITEMS[l] : null;
      if (l && ld) (ld.kind === 'shield' ? rig.sockets.shieldL : rig.sockets.weaponL).add(models.buildWeapon(l).object);
      const m2 = movesetFor(wd?.weapon?.class ?? 'fist', !!ld);
      const b2 = STANCES[m2.stance] ?? STANCES.sword;
      anim.stance = { ...b2, handR: wd ? b2.handR : null, handL: ld ? (ld.kind === 'shield' ? SHIELD_REST : DIRK_REST) : b2.handL };
      seg.visible = !!wm?.hit && q.get('hit') !== '0';
      const clipName2 = clipName && clipName !== '-' ? clipName : null;
      const c = pose(clipName2, parseFloat(tt ?? '0') || 0);
      const x = (i % nc) * cw2, y = Hh - (Math.floor(i / nc) + 1) * ch2;
      renderer.setViewport(x, y, cw2, ch2); renderer.setScissor(x, y, cw2, ch2);
      scene.background = new THREE.Color(i % 2 ? 0x2c2f36 : 0x30343c);
      renderer.render(scene, cam);
      const el = document.createElement('div'); el.className = 'lbl';
      el.style.left = `${x + 2}px`; el.style.top = `${Math.floor(i / nc) * ch2 + 2}px`;
      el.textContent = `${w}${l ? '+' + l : ''} ${clipName2 ?? m2.stance}${c || !clipName2 ? '' : ' (MISSING)'}`;
      document.body.appendChild(el);
    });
    return;
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const name = clipNames[r] ?? null;
    const clip = pose(name, ts[c] ?? 0);
    const x = c * cw, y = Hh - (r + 1) * ch;
    renderer.setViewport(x, y, cw, ch); renderer.setScissor(x, y, cw, ch);
    scene.background = new THREE.Color((r + c) % 2 ? 0x2c2f36 : 0x30343c);
    renderer.render(scene, cam);
    const el = document.createElement('div'); el.className = 'lbl';
    el.style.left = `${x + 2}px`; el.style.top = `${r * ch + 2}px`;
    el.textContent = name ? `${name}${clip ? '' : ' (MISSING)'} t=${abs ? ts[c] : ((ts[c] ?? 0) * (clip?.duration ?? 0)).toFixed(2)}` : `${ms.stance} v=${speed} +${ts[c] ?? 0}s`;
    document.body.appendChild(el);
  }
}
(window as any).__render = render;
await render(location.search.slice(1));
(window as any).__ready = true;
