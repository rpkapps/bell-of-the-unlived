/**
 * Boot: settings, input, renderer, audio, UI, then the title screen (or a sandbox via ?sandbox).
 */
import * as THREE from 'three';
import { Input } from './input/Input';
import { defaultSettings, mergeSettings, type Settings } from './game/settings';
import { Game } from './game/Game';
import { BasicRenderer } from './game/BasicRenderer';
import { newPlayerData } from './systems/PlayerData';
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
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } };
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const input = new Input(canvas, () => settings);
  const renderer = new BasicRenderer(canvas, settings.graphics);
  const game = new Game({ canvas, renderer, input, settings, saveSettings });
  (window as any).__game = game;
  (window as any).THREE = THREE;
  game.buildSandbox();
  const origin = (q.get('origin') as OriginId) ?? 'householdKnight';
  game.createPlayer(newPlayerData(origin), new THREE.Vector3(0, 0, 8), Math.PI);
  const n = parseInt(q.get('enemies') ?? '3');
  const kinds = ['infantry', 'shieldBearer', 'archer', 'infantry', 'sentry'];
  for (let i = 0; i < n; i++) game.spawnEnemy(kinds[i % kinds.length], new THREE.Vector3(-4 + i * 4, 0, -6 - (i % 2) * 3), 0);
  game.mode = 'play';
  canvas.addEventListener('click', () => input.setPointerLock(true));
  game.start();
  (window as any).__ready = true;
}
boot();
