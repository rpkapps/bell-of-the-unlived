/** Minimal IRenderer used until/if the full post-processed renderer is unavailable (tests, fallback). */
import * as THREE from 'three';
import type { EnvironmentPreset, IRenderer } from '../render/contract';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Settings } from './settings';

export class BasicRenderer implements IRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 900);
  readonly sun = new THREE.DirectionalLight(0xb8c4dd, 2.2);
  constructor(canvas: HTMLCanvasElement, g: Settings['graphics']) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(0x4a5566);
    this.scene.fog = new THREE.FogExp2(0x4a5566, 0.012);
    this.sun.position.set(-30, 50, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera; c.left = -30; c.right = 30; c.top = 30; c.bottom = -30; c.far = 150;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new THREE.HemisphereLight(0x9aa8c0, 0x2a2622, 1.1));
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.applySettings(g);
    this.resize();
  }
  applySettings(g: Settings['graphics']) {
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio * g.renderScale));
    this.camera.fov = g.fov; this.camera.updateProjectionMatrix();
    this.renderer.toneMappingExposure = g.brightness;
  }
  setEnvironment(_p: EnvironmentPreset) {}
  setFocus(p: THREE.Vector3) { this.sun.target.position.copy(p); this.sun.position.copy(p).add(new THREE.Vector3(-30, 50, 20)); }
  setGrade() {}
  render() { this.renderer.render(this.scene, this.camera); }
  resize() {
    const w = this.renderer.domElement.clientWidth || window.innerWidth, h = this.renderer.domElement.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  stats() { return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }; }
}
