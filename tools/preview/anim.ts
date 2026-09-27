import * as THREE from 'three';
import { Rig } from '../../src/actors/Rig';
import { Animator } from '../../src/actors/anim/Animator';
import { buildMannequin, debugShield, debugSword } from '../../src/actors/debugModel';
import { STANCES } from '../../src/actors/anim/clips/stances';
import { CLIPS } from '../../src/actors/anim/clips/index';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x303038);
const cam = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 100);
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(3, 6, 4); sun.castShadow = true; scene.add(sun);
const grid = new THREE.GridHelper(10, 20, 0x666666, 0x444444); scene.add(grid);
const axes = new THREE.AxesHelper(0.5); scene.add(axes);

const stanceName = q.get('stance') ?? 'swordShield';
const rig = new Rig();
buildMannequin(rig);
scene.add(rig.root);
if (stanceName.startsWith('sword')) rig.sockets.weaponR.add(debugSword());
if (stanceName === 'swordShield') rig.sockets.shieldL.add(debugShield());
if (stanceName.startsWith('staff')) { const s = debugSword(1.5); s.children[0].scale.set(2, 1, 0.5); rig.sockets.weaponR.add(s); }
const anim = new Animator(rig);
anim.stance = STANCES[stanceName];
const clipName = q.get('clip');
const clip = clipName ? CLIPS[clipName] : null;
const fixedT = q.get('t');
const view = q.get('view') ?? 'front34';
const speed = parseFloat(q.get('speed') ?? '0');
const views: Record<string, [number, number, number]> = { front34: [2.2, 1.6, 2.6], side: [3.2, 1.3, 0], front: [0, 1.4, 3.2], back: [0.5, 1.8, -3], top: [0.01, 4.5, 0.5], right: [-3.2, 1.3, 0.3] };
const v = views[view];
cam.position.set(v[0], v[1], v[2]); cam.lookAt(0, 1.0, 0.3);
const info = document.getElementById('p')!;
const dt = 1 / 60;
function frame() {
  if (clip) {
    if (!anim.clip) anim.play(clip, { fade: 0 });
    if (fixedT !== null) { anim.clipT = parseFloat(fixedT); }
    else if (anim.clipT > clip.duration + 0.4) anim.play(clip, { fade: 0 });
  }
  anim.update(fixedT !== null ? 0 : dt, { speed, dirX: 0, dirZ: 1, sprint: false, alert: 0, turnRate: 0 });
  anim.evaluate(0);
  info.textContent = `${stanceName} ${clipName ?? 'loco'} t=${anim.clipT.toFixed(2)}`;
  renderer.render(scene, cam);
  requestAnimationFrame(frame);
}
if (fixedT !== null) { for (let i = 0; i < 5; i++) { anim.update(1, { speed, dirX: 0, dirZ: 1, sprint: false, alert: 0, turnRate: 0 }); } }
frame();
(window as any).__ready = true;
