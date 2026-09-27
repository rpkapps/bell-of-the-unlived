/**
 * Boot: settings, input, renderer, audio, UI, then the title screen.
 * URL options (development): ?sandbox (test arena), ?origin=, ?enemies=, ?hitboxes, ?mannequin, ?skipintro.
 */
import * as THREE from 'three';
import { Input } from './input/Input';
import { defaultSettings, mergeSettings, type Settings } from './game/settings';
import { Game } from './game/Game';
import { BasicRenderer } from './game/BasicRenderer';
import { newPlayerData } from './systems/PlayerData';
import { models } from './actors/models';
import { Audio } from './audio/Audio';
import { UI } from './ui/UI';
import { Session } from './game/Session';
import './content/meta';
import type { OriginId } from './game/types';

const SETTINGS_KEY = 'botu.settings.v1';
function loadSettings(): Settings {
  try { const raw = localStorage.getItem(SETTINGS_KEY); if (raw) return mergeSettings(JSON.parse(raw)); } catch { /* ignore */ }
  return defaultSettings();
}

async function boot() {
  const q = new URLSearchParams(location.search);
  const settings = loadSettings();
  if (q.has('hitboxes')) settings.gameplay.showHitboxes = true;
  if (q.get('quality')) settings.graphics.quality = q.get('quality') as any;
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui') as HTMLElement;
  const input = new Input(canvas, () => settings);
  const ui = new UI(uiRoot);
  ui.loading(0.05, 'Casting bronze');
  const audio = new Audio();
  audio.setVolumes(settings.audio);
  audio.onCaption((text, dir) => ui.caption(text, dir));
  const unlock = () => { audio.unlock(); };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  const { renderer, extras } = await makeRenderer(canvas, settings);
  ui.loading(0.35, 'Weathering stone');
  const game = new Game({
    canvas, renderer, input, settings, saveSettings, audio, ui,
    models: q.has('mannequin') ? null : models,
    particles: extras.particles, trails: extras.trails, onFrame: extras.onFrame, noRender: q.has('norender'),
  });
  (window as any).__game = game;
  (window as any).THREE = THREE;
  const session = new Session(game, ui, audio, settings, saveSettings);
  (window as any).__session = session;
  ui.init(session);
  input.on('padDisconnected', () => { if (game.mode === 'play') { game.openPause(); ui.toast('Controller disconnected', 'warning'); } });
  canvas.addEventListener('click', () => { if (game.mode === 'play') input.setPointerLock(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'play') game.openPause(); });

  if (q.has('sandbox')) {
    game.buildSandbox();
    const origin = (q.get('origin') as OriginId) ?? 'householdKnight';
    session.pd = newPlayerData(origin);
    const { newWorldState } = await import('./systems/WorldState');
    session.ws = newWorldState();
    game.createPlayer(session.pd, new THREE.Vector3(0, 0, 8), Math.PI);
    const n = parseInt(q.get('enemies') ?? '3');
    const kinds = (q.get('kinds') ?? 'infantry,shieldBearer,archer,infantry,sentry').split(',');
    for (let i = 0; i < n; i++) game.spawnEnemy(kinds[i % kinds.length], new THREE.Vector3(-4 + i * 4, 0, -6 - (i % 2) * 3), 0);
    let hudBoss: any = null;
    if (q.has('boss')) {
      const { Boss, CORVANE } = await import('./content/bosses');
      const b = new Boss(CORVANE, game, 5);
      b.model = models.buildEnemy(b.rig, 'commander', 1);
      const w = models.buildWeapon('corvane_sword');
      b.weaponR = { id: 'corvane_sword', model: w }; b.rig.sockets.weaponR.add(w.object);
      b.object.traverse((c: any) => { if (c.isMesh) c.castShadow = true; });
      game.scene.add(b.object); b.resetAt(new THREE.Vector3(0, 0, -4), 0); b.home.set(0, 0, -4);
      game.enemies.push(b);
      b.engaged = !q.has('passive'); if (b.engaged) b.becomeAware(game.player);
      hudBoss = b;
      (window as any).__boss = b;
    }
    game.region = { step: (dt) => session.tick(dt), frame: () => {}, hud: (h) => { if (hudBoss && !hudBoss.dead) h.boss = { name: 'Ser Corvane Aldmoor', title: 'Bell-Appointed Commander of Ashbridge', hp01: hudBoss.hp / hudBoss.hpMax, posture01: Math.min(1, hudBoss.posture / hudBoss.postureMax), phase: hudBoss.phase }; } };
    game.mode = 'play';
    ui.loading(null);
    ui.setHudVisible(true);
    game.start();
    (window as any).__ready = true;
    return;
  }

  ui.loading(0.6, 'Raising Ashbridge');
  const { bootRegion } = await import('./game/regions/boot');
  await bootRegion(game, session);
  Object.defineProperty(window, '__region', { get: () => session.region, configurable: true });
  ui.loading(null);
  game.start();
  if (q.get('region')) {
    session.newGameAt((q.get('origin') as OriginId) ?? 'householdKnight', q.get('region')!);
  } else if (q.has('skipintro') || q.has('newgame')) {
    session.skipIntro = q.has('skipintro');
    session.newGame((q.get('origin') as OriginId) ?? 'householdKnight');
  } else {
    game.mode = 'title';
    audio.setMusic('title', 2);
    ui.showTitle();
  }
  (window as any).__ready = true;
}

/** Use the full post-processed renderer when available, otherwise the basic one. */
async function makeRenderer(canvas: HTMLCanvasElement, settings: Settings) {
  const extras: { particles: any; trails: any; onFrame?: (t: number, c: THREE.Camera) => void } = { particles: null, trails: null };
  try {
    const mod: any = await import('./render/index');
    const r = await mod.createRenderer(canvas, settings.graphics);
    extras.particles = r.particles; extras.trails = r.trails; extras.onFrame = r.onFrame;
    return { renderer: r.renderer, extras };
  } catch (e) {
    console.warn('Full renderer unavailable, using basic renderer:', e);
    return { renderer: new BasicRenderer(canvas, settings.graphics), extras };
  }
}

boot();
