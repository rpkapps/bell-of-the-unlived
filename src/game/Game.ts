/**
 * The running game: owns the fixed-step loop, actors, combat, camera and the glue to render,
 * audio, UI and region logic. Region-specific rules live in src/game/regions/*.
 */
import * as THREE from 'three';
import { FixedLoop, SIM_DT } from '../core/loop';
import type { IInput } from '../input/actions';
import type { IRenderer, IParticles, ITrails, ITrail, ParticleKind, EmitOpts } from '../render/contract';
import type { IAudio, CueId, PlayOpts } from '../audio/contract';
import type { IUI } from '../ui/contract';
import type { ModelFactory } from '../actors/models/contract';
import { CollisionWorld } from '../world/Collision';
import { Combat, type Combatant, type HitResult } from '../combat/Combat';
import { Projectiles, type ProjectileSpec, type Projectile } from '../combat/Projectiles';
import { Player } from '../actors/Player';
import { Enemy } from '../actors/Enemy';
import type { Actor } from '../actors/Actor';
import { CameraRig } from './CameraRig';
import type { Services } from './services';
import type { Settings } from './settings';
import { buildMannequin, debugShield, debugSword } from '../actors/debugModel';
import { ENEMY_DEFS } from '../content/enemies';
import { ARMOR_LOOKS } from '../content/items';
import { newPlayerData, type PlayerData, activeQuick, activeSpell, rightId, leftId, item } from '../systems/PlayerData';
import type { HudState, HudSlot } from '../game/types';
import { HINTS, formatActions } from '../content/text';
import { clamp } from '../core/math';

export interface GameDeps {
  canvas: HTMLCanvasElement;
  renderer: IRenderer;
  input: IInput;
  settings: Settings;
  saveSettings: () => void;
  audio?: IAudio | null;
  ui?: IUI | null;
  models?: ModelFactory | null;
  particles?: IParticles | null;
  trails?: ITrails | null;
  /** Per-frame hooks for renderer extras (materials time, light manager). */
  onFrame?: (time: number, camera: THREE.Camera) => void;
}

export type Mode = 'title' | 'play' | 'menu' | 'dialogue' | 'cinematic' | 'dead' | 'loading';

export class Game implements Services {
  readonly loop: FixedLoop;
  world = new CollisionWorld();
  readonly combat = new Combat();
  projectiles!: Projectiles;
  readonly cam: CameraRig;
  player!: Player;
  readonly enemies: Enemy[] = [];
  /** Non-combat animated actors (NPCs) that still need rendering. */
  readonly extras: Actor[] = [];
  mode: Mode = 'loading';
  time = 0;
  private realTime = 0;
  private trailsByActor = new Map<Actor, ITrail>();
  private hintsShown = new Set<string>();
  private hitboxGroup = new THREE.Group();
  /** Region logic hook (set by region controllers). */
  region: { step(dt: number): void; frame(dt: number): void; hud?(h: HudState): void } | null = null;
  readonly levelRoot = new THREE.Group();
  private fpsAcc = 0; private fpsFrames = 0;

  constructor(readonly deps: GameDeps) {
    this.cam = new CameraRig(deps.renderer.camera, this.world);
    this.loop = new FixedLoop({
      frameStart: (dt) => this.frameStart(dt),
      step: (dt) => this.step(dt),
      render: (a, dt) => this.render(a, dt),
    });
    deps.renderer.scene.add(this.levelRoot, this.hitboxGroup);
    this.projectiles = new Projectiles(deps.renderer.scene, this.world, this.combat);
    this.projectiles.makeMesh = (p) => this.projectileMesh(p);
    this.projectiles.onImpact = (p, pt) => this.projectileImpact(p, pt);
    this.projectiles.onStatus = (t, s) => { t.buffs.set(s.id, s.seconds); };
    this.combat.onResult = (r) => this.onHit(r);
    window.addEventListener('resize', () => deps.renderer.resize());
  }

  get settings() { return this.deps.settings; }
  get scene() { return this.deps.renderer.scene; }
  get input() { return this.deps.input; }

  // ------------------------------------------------------------------ Services

  sfx(cue: CueId, opts?: PlayOpts) { this.deps.audio?.play(cue, opts); }
  fx(kind: ParticleKind, pos: THREE.Vector3, opts?: EmitOpts) { this.deps.particles?.emit(kind, pos, opts); }
  shake(amount: number) { this.cam.shake(amount * this.settings.graphics.cameraShake); }
  spawnProjectile(spec: ProjectileSpec) { this.projectiles.spawn(spec); }
  actors(): readonly Actor[] { return this.player ? [this.player, ...this.enemies] : this.enemies; }
  hint(id: string) {
    if (!this.settings.gameplay.hints || this.hintsShown.has(id) || !HINTS[id]) return;
    this.hintsShown.add(id);
    const text = formatActions(HINTS[id], (a) => this.input.glyph(a), this.input.device);
    this.deps.ui?.hint(id, text);
  }
  trail(actor: Actor, on: boolean) {
    const tr = this.deps.trails;
    if (!tr) return;
    let t = this.trailsByActor.get(actor);
    if (!t) { t = tr.create(actor.team === 'player' ? 0xd8c8a0 : 0xffc680, 1); this.trailsByActor.set(actor, t); }
    t.setActive(on);
  }

  // ------------------------------------------------------------------ setup helpers

  /** Build a flat sandbox arena (used for tests and before the region loads). */
  buildSandbox() {
    this.world = new CollisionWorld();
    (this.cam as any).world = this.world;
    this.projectiles = new Projectiles(this.scene, this.world, this.combat);
    this.projectiles.makeMesh = (p) => this.projectileMesh(p);
    this.projectiles.onImpact = (p, pt) => this.projectileImpact(p, pt);
    this.projectiles.onStatus = (t, s) => { t.buffs.set(s.id, s.seconds); };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x55524c, roughness: 0.95 }));
    ground.receiveShadow = true;
    this.levelRoot.add(ground);
    this.world.addBox([0, -0.5, 0], [80, 1, 80]);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x6b6862, roughness: 0.9 });
    for (const [x, z, w, d] of [[0, -20, 40, 1], [0, 20, 40, 1], [-20, 0, 1, 40], [20, 0, 1, 40], [6, -4, 2, 2], [-7, 5, 3, 1.5]] as const) {
      const h = x === 6 || x === -7 ? 1.4 : 4;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true;
      this.levelRoot.add(m);
      this.world.addBox([x, h / 2, z], [w, h, d]);
    }
    this.world.addRamp([-10, 0, -10], [-10, 2, -15], 3);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 5.4), wallMat);
    ramp.position.set(-10, 1, -12.5); ramp.rotation.x = Math.atan2(2, 5); this.levelRoot.add(ramp);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), wallMat); plat.position.set(-10, 1, -18); this.levelRoot.add(plat);
    this.world.addBox([-10, 1, -18], [6, 2, 6]);
    this.world.build();
  }

  createPlayer(data: PlayerData, pos: THREE.Vector3, yaw: number) {
    if (this.player) this.scene.remove(this.player.object);
    const p = new Player(this, data);
    p.onEquipChanged = () => this.dressPlayer();
    p.onDeath = () => this.onPlayerDeath();
    this.player = p;
    this.scene.add(p.object);
    this.dressPlayer();
    p.teleport(pos, yaw);
    this.cam.snapBehind(p);
    return p;
  }

  /** (Re)build the player's visuals from equipment. */
  dressPlayer() {
    const p = this.player;
    const m = this.deps.models;
    // clear previous
    p.model?.dispose();
    for (const b of Object.values(p.rig.bones)) for (const c of [...b.children]) if ((c as any).isMesh || (c as any).isGroup) { if (!Object.values(p.rig.bones).includes(c) && !Object.values(p.rig.sockets).includes(c)) b.remove(c); }
    for (const s of Object.values(p.rig.sockets)) s.clear();
    const eq = p.data.equipment;
    const look = (id: string | null) => (id ? ARMOR_LOOKS[id] ?? 'none' : 'none');
    if (m) {
      p.model = m.buildCharacter(p.rig, { head: look(eq.head), body: look(eq.body), arms: look(eq.arms), legs: look(eq.legs), cloak: true, hair: 'dark' });
    } else buildMannequin(p.rig, 0x55606e);
    const r = rightId(p.data), l = leftId(p.data);
    const mk = (id: string) => (m ? m.buildWeapon(id) : { object: id.includes('shield') ? debugShield() : debugSword(id.includes('staff') ? 1.4 : 0.95), hit: id.includes('shield') ? null : { from: 0.12, to: id.includes('staff') ? 1.5 : 1.05, radius: 0.05 } });
    p.weaponR = r ? { id: r, model: mk(r) } : null;
    if (p.weaponR) p.rig.sockets.weaponR.add(p.weaponR.model.object);
    const ld = item(l);
    p.shield = null; p.weaponL = null;
    if (l && ld?.kind === 'shield') { p.shield = { id: l, model: mk(l) }; p.rig.sockets.shieldL.add(p.shield.model.object); }
    else if (l) { p.weaponL = { id: l, model: mk(l) }; p.rig.sockets.weaponL.add(p.weaponL.model.object); }
    for (const o of [p.object]) o.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; } });
    p.updateStance();
  }

  spawnEnemy(kind: string, pos: THREE.Vector3, yaw: number, opts: { id?: string; leash?: number; patrol?: THREE.Vector3[]; idle?: Enemy['idleAnim']; seed?: number } = {}) {
    const def = ENEMY_DEFS[kind];
    if (!def) throw new Error('unknown enemy ' + kind);
    const e = new Enemy(def, this, opts.seed ?? this.enemies.length + 7);
    e.spawnId = opts.id ?? kind + this.enemies.length;
    e.home.copy(pos); e.homeYaw = yaw;
    if (opts.leash) e.leash = opts.leash;
    if (opts.patrol) e.patrol = opts.patrol;
    if (opts.idle) e.idleAnim = opts.idle;
    const m = this.deps.models;
    if (m) e.model = def.kind === 'dummy' ? m.buildNpc(e.rig, 'dummy') : m.buildEnemy(e.rig, def.look, opts.seed ?? this.enemies.length);
    else buildMannequin(e.rig, 0x7a6a50);
    const mk = (id: string) => (m ? m.buildWeapon(id) : { object: id.includes('shield') ? debugShield() : debugSword(id.includes('spear') ? 1.6 : 0.95), hit: id.includes('shield') || id.includes('bow') ? null : { from: 0.12, to: id.includes('spear') ? 1.7 : 1.05, radius: 0.05 } });
    if (def.weaponR) { e.weaponR = { id: def.weaponR, model: mk(def.weaponR) }; e.rig.sockets.weaponR.add(e.weaponR.model.object); }
    if (def.weaponL) { e.weaponL = { id: def.weaponL, model: mk(def.weaponL) }; e.rig.sockets.weaponL.add(e.weaponL.model.object); }
    if (def.shield) { e.shield = { id: def.shield, model: mk(def.shield) }; e.rig.sockets.shieldL.add(e.shield.model.object); }
    e.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    e.onKilled = (en) => this.onEnemyKilled(en);
    this.scene.add(e.object);
    e.resetAt(pos, yaw);
    if (e.idleAnim === 'sentryWall') e.startMove({ id: 'sentry_idle_loop', clip: 'sentryIdle', dur: 1e9 });
    this.enemies.push(e);
    return e;
  }

  // ------------------------------------------------------------------ loop

  start() { this.loop.start(); }

  private frameStart(dt: number) {
    this.realTime += dt;
    this.input.beginFrame(dt);
  }

  private step(dt: number) {
    this.time += dt;
    const inp = this.input;
    const playing = this.mode === 'play' || this.mode === 'dead';
    if (!this.player) { inp.endStep(); return; }
    const ui = this.deps.ui;
    const blocked = this.mode !== 'play' || !!ui?.blocking;
    // lock-on
    if (!blocked) {
      if (inp.pressed('lockOn')) this.cam.toggleLock(this.player, this.enemies.filter((e) => e.aware || e.isBoss || true));
      if (inp.pressed('pause')) this.openPause();
    }
    this.player.control(dt, { input: inp, camYaw: this.cam.yaw, camForward: this.cam.forward, lock: this.cam.lock as Combatant | null, blocked });
    if (playing) for (const e of this.enemies) e.think(dt, this.player);
    // physics + animation
    const trackT = this.cam.lock ? this.cam.lock.pos : null;
    this.player.stepPhysics(dt, this.world, trackT, trackT ? null : this.playerTrackYaw());
    for (const e of this.enemies) if (!e.dead || e.move) e.stepPhysics(dt, this.world, e.target?.pos ?? null, null);
    this.separate();
    this.player.stepAnimation(dt);
    for (const e of this.enemies) if (e.object.visible) e.stepAnimation(dt);
    // combat
    this.combat.debug = this.settings.gameplay.showHitboxes;
    const combatants = [this.player, ...this.enemies] as Combatant[];
    this.combat.trace(combatants);
    this.projectiles.step(dt, combatants);
    this.player.upkeep(dt);
    for (const e of this.enemies) {
      e.updateDeath(dt);
      const burn = e.buffs.get('burn');
      if (burn && !e.dead) { e.hp = Math.max(0, e.hp - 12 * dt); if (e.hp <= 0) e.react('death', e.pos); }
    }
    this.player.updateCrit(this.enemies);
    this.region?.step(dt);
    // falling out of the world
    if (!this.player.dead && this.player.pos.y < -30) { this.player.hp = 0; this.player.react('death', this.player.pos); }
    inp.endStep();
  }

  /** Stick direction as a yaw, for tracking moves without lock-on. */
  private playerTrackYaw(): number | null {
    const mv = this.input.move();
    if (Math.hypot(mv.x, mv.y) < 0.2) return null;
    const cy = this.cam.yaw;
    const wx = Math.sin(cy) * mv.y - Math.cos(cy) * mv.x, wz = Math.cos(cy) * mv.y + Math.sin(cy) * mv.x;
    return Math.atan2(wx, wz);
  }

  /** Push overlapping actors apart (horizontal). */
  private separate() {
    const all = [this.player, ...this.enemies].filter((a) => !a.dead && a.object.visible);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a.move?.def.id.startsWith('crit') || b.move?.def.id.startsWith('crit') || a.move?.def.id.startsWith('victim') || b.move?.def.id.startsWith('victim')) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz), min = a.radius + b.radius;
      if (d < min && d > 1e-4 && Math.abs(a.pos.y - b.pos.y) < 1.5) {
        const push = (min - d) / 2, nx = dx / d, nz = dz / d;
        const wa = b.mass / (a.mass + b.mass), wb = 1 - wa;
        a.pos.x -= nx * push * 2 * wa; a.pos.z -= nz * push * 2 * wa;
        b.pos.x += nx * push * 2 * wb; b.pos.z += nz * push * 2 * wb;
      }
    }
  }

  private render(alpha: number, realDt: number) {
    const r = this.deps.renderer;
    if (this.mode === 'title' && this.titleView) {
      this.titleView(this.realTime);
      this.region?.frame(realDt);
    } else if (this.player) {
      const lk = this.input.look();
      const sw = this.input.targetSwitch();
      if (sw && this.cam.lock) this.cam.switchTarget(sw, this.player, this.enemies);
      const blocked = this.mode !== 'play' || !!this.deps.ui?.blocking;
      this.player.renderPose(alpha, SIM_DT, realDt);
      for (const e of this.enemies) if (e.object.visible) e.renderPose(alpha, SIM_DT, realDt);
      for (const x of this.extras) x.renderPose(alpha, SIM_DT, realDt);
      this.cam.shakeScale = this.settings.graphics.cameraShake;
      this.cam.autoRecenter = this.settings.gameplay.cameraAutoRecenter;
      const mv = this.input.move();
      this.cam.update(realDt, this.player, blocked ? { x: 0, y: 0 } : lk, Math.hypot(mv.x, mv.y) > 0.2);
      r.setFocus(this.player.object.position);
      // trails
      for (const [a, t] of this.trailsByActor) {
        if (a.weaponR?.model.trail) {
          const s = a.rig.sockets.weaponR;
          t.push(new THREE.Vector3(0, a.weaponR.model.trail.from, 0).applyMatrix4(s.matrixWorld), new THREE.Vector3(0, a.weaponR.model.trail.to, 0).applyMatrix4(s.matrixWorld));
        } else if (a.weaponR?.model.hit) {
          const s = a.rig.sockets.weaponR;
          t.push(new THREE.Vector3(0, a.weaponR.model.hit.from, 0).applyMatrix4(s.matrixWorld), new THREE.Vector3(0, a.weaponR.model.hit.to, 0).applyMatrix4(s.matrixWorld));
        }
        t.update(realDt);
      }
      this.drawHitboxes();
      this.region?.frame(realDt);
      if (this.deps.ui && (this.mode === 'play' || this.mode === 'dead')) this.deps.ui.hud(this.buildHud());
      const a = this.deps.audio;
      if (a) { const c = r.camera; a.setListener(c.position, this.cam.forward, c.up); }
    }
    this.deps.particles?.update(realDt, r.camera);
    this.deps.onFrame?.(this.realTime, r.camera);
    this.deps.ui?.update(realDt);
    r.render(realDt);
    // fps
    this.fpsAcc += realDt; this.fpsFrames++;
    if (this.fpsAcc > 0.5) { this.deps.ui?.fps(this.settings.graphics.showFps ? Math.round(this.fpsFrames / this.fpsAcc) : null); this.fpsAcc = 0; this.fpsFrames = 0; }
  }

  // ------------------------------------------------------------------ combat feedback

  private onHit(r: HitResult) {
    const tgt = r.target, att = r.attacker;
    const unlived = tgt.team === 'unlived';
    switch (r.outcome) {
      case 'dodged': return;
      case 'parried':
        this.sfx('parry_success', { pos: r.point });
        this.fx('sparks', r.point, { count: 40, speed: 7 });
        this.shake(0.2);
        if (tgt === this.player) this.hint('criticalMarker');
        return;
      case 'blocked':
        this.sfx('guard_block', { pos: r.point });
        this.fx('blockSparks', r.point, { count: 18 });
        if (att === this.player && (tgt as Combatant).guardInfo()) this.hint('guardbreak');
        return;
      case 'guardBroken':
        this.fx('sparks', r.point, { count: 30 });
        this.shake(0.25);
        return;
      default: break;
    }
    const armored = true;
    this.sfx(r.spec.kind === 'fire' ? 'fire_burst' : armored ? (r.damage > 150 ? 'hit_heavy' : 'hit_armor') : 'hit_flesh', { pos: r.point });
    this.fx(unlived ? 'goldMotes' : 'blood', r.point, { count: unlived ? 22 : 12, dir: r.dir });
    this.fx('sparks', r.point, { count: 8 });
    if (tgt === this.player) { this.shake(0.25 + Math.min(0.4, r.damage / 400)); }
    else if (att === this.player) this.shake(0.06 + Math.min(0.12, r.damage / 1500));
  }

  private onEnemyKilled(e: Enemy) {
    if (!this.player) return;
    const hours = e.def.hours;
    this.player.data.hours += hours;
    this.sfx('hours_gain', { pos: e.pos });
    this.fx('hoursStream', e.chest, { count: Math.min(60, 10 + hours / 10), target: this.player.chest });
    if (this.cam.lock === e) this.cam.lock = null;
  }

  /** Death handler (the Session sets this); default respawns in the sandbox. */
  onDeath: (() => void) | null = null;
  /** Title-screen camera animation (set by the region). */
  titleView: ((t: number) => void) | null = null;

  private onPlayerDeath() {
    this.mode = 'dead';
    if (this.onDeath) { this.onDeath(); return; }
    this.deps.ui?.banner('death', 'THE BELL RECALLS YOU');
    setTimeout(() => this.respawn(), 3500);
  }

  /** Default respawn (sandbox): re-form at the start. Regions override via `respawnHandler`. */
  respawnHandler: (() => void) | null = null;
  respawn() {
    if (this.respawnHandler) { this.respawnHandler(); return; }
    const p = this.player;
    p.dead = false; p.hp = p.hpMax; p.stamina = p.staminaMax; p.move = null;
    p.teleport(new THREE.Vector3(0, 0, 8), Math.PI);
    p.startMove({ id: 'reform', clip: 'reform', dur: 1.6 });
    for (const e of this.enemies) e.resetAt(e.home, e.homeYaw);
    this.mode = 'play';
  }

  openPause() {
    const ui = this.deps.ui;
    if (!ui) return;
    this.mode = 'menu';
    this.input.releaseAll();
    this.input.setPointerLock(false);
    this.deps.audio?.setMenuMuffle(true);
    ui.showPause();
  }
  resumePlay() {
    this.mode = 'play';
    this.input.releaseAll();
    this.input.setPointerLock(true);
    this.deps.audio?.setMenuMuffle(false);
  }

  // ------------------------------------------------------------------ projectiles

  private projectileMesh(p: Projectile): THREE.Object3D | null {
    const col = p.kind === 'cinder' || p.kind === 'fireball' ? 0xff7a30 : p.kind === 'shard' ? 0xffe2a0 : p.kind === 'knell' ? 0xe8e0c8 : 0x999999;
    if (p.kind === 'knife' || p.kind === 'arrow' || p.kind === 'bolt') {
      const g = new THREE.CylinderGeometry(0.012, 0.012, p.kind === 'knife' ? 0.25 : 0.8, 5).rotateX(Math.PI / 2);
      return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.6, metalness: 0.3 }));
    }
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(p.radius, 1), new THREE.MeshBasicMaterial({ color: col }));
    const light = new THREE.PointLight(col, 3, 6, 2);
    m.add(light);
    return m;
  }
  private projectileImpact(p: Projectile, pt: THREE.Vector3) {
    if (p.kind === 'cinder' || p.kind === 'fireball') { this.fx('fireBurst', pt, { count: 50 }); this.sfx('fire_burst', { pos: pt }); this.shake(0.12); }
    else if (p.kind === 'shard' || p.kind === 'knell') this.fx('sparks', pt, { count: 14, color: 0xffe2a0 });
    else this.sfx('arrow_hit', { pos: pt });
  }

  // ------------------------------------------------------------------ HUD

  private toScreen(p: THREE.Vector3) {
    const cam = this.deps.renderer.camera;
    const v = p.clone().project(cam);
    const el = this.deps.canvas;
    const w = el.clientWidth, h = el.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 };
  }

  buildHud(): HudState {
    const p = this.player;
    const d = p.data;
    const slot = (id: string | null, extra: Partial<HudSlot> = {}): HudSlot => {
      const def = item(id);
      return def ? { name: def.name, icon: def.id, upgrade: d.inventory[def.id]?.upgrade, ...extra } : { name: '', icon: '', empty: true };
    };
    const q = activeQuick(d);
    const qCount = q === 'recall_flask' ? d.flask.leftHealth : q === 'recall_flask_focus' ? d.flask.leftFocus : q ? d.inventory[q]?.count ?? 0 : 0;
    const sp = activeSpell(d);
    const bars = [];
    for (const e of this.enemies) {
      if (e.dead || e.isBoss || !e.aware || (e.hp >= e.hpMax && e.posture <= 0 && this.cam.lock !== e)) continue;
      if (e.distTo(p) > 18) continue;
      const head = e.chest.clone(); head.y += e.height * 0.42;
      const s = this.toScreen(head);
      bars.push({ id: e.id, x: s.x, y: s.y, hp01: e.hp / e.hpMax, posture01: clamp(e.posture / e.postureMax, 0, 1), damage: e.recentDamage || undefined, visible: s.visible });
    }
    const lock = this.cam.lock ? this.toScreen(this.cam.lock.chest) : { x: 0, y: 0, visible: false };
    const crit = p.crit ? this.toScreen(p.crit.target.chest) : null;
    const hasRanged = !!p.catalyst || d.equipment.quick2 === 'throwing_knife' && activeQuick(d) === 'throwing_knife';
    const hud: HudState = {
      hp: p.hp, hpMax: p.hpMax, stamina: Math.max(0, p.stamina), staminaMax: p.staminaMax, focus: p.focus, focusMax: p.focusMax,
      hours: d.hours,
      right: slot(rightId(d)), left: slot(leftId(d)),
      quick: q ? { ...slot(q), count: qCount } : slot(null),
      spell: sp ? { name: sp.name, icon: sp.id, cost: sp.focus } : { name: '', icon: '', empty: true },
      flask: { health: d.flask.leftHealth, focus: d.flask.leftFocus },
      toll: { active: false, dir: 0, behind: false, intensity: 0 },
      lock: { visible: !!this.cam.lock && lock.visible, x: lock.x, y: lock.y },
      enemyBars: bars,
      boss: null,
      critical: crit ? { visible: crit.visible, x: crit.x, y: crit.y, kind: p.crit!.kind } : { visible: false, x: 0, y: 0, kind: null },
      reticle: hasRanged && !this.cam.lock,
      prompt: null,
      statuses: [...p.buffs.entries()].map(([id, t]) => ({ id, icon: id, label: id, remaining01: Math.min(1, t / 30) })),
      iframes: this.settings.gameplay.showIFrames && p.invulnerable,
      lowHealth: p.hp / p.hpMax < 0.25 && !p.dead,
    };
    this.region?.hud?.(hud);
    return hud;
  }

  // ------------------------------------------------------------------ debug hitboxes

  private hbMat = new THREE.MeshBasicMaterial({ color: 0xff3355, wireframe: true, transparent: true, opacity: 0.8, depthTest: false });
  private hurtMat = new THREE.MeshBasicMaterial({ color: 0x33ddff, wireframe: true, transparent: true, opacity: 0.35, depthTest: false });
  private drawHitboxes() {
    const g = this.hitboxGroup;
    for (const c of [...g.children]) { g.remove(c); (c as THREE.Mesh).geometry?.dispose(); }
    if (!this.settings.gameplay.showHitboxes) return;
    const cap = (a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) => {
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(len, 0.001), 2, 6), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      if (len > 1e-4) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      m.renderOrder = 999;
      g.add(m);
    };
    for (const a of [this.player, ...this.enemies]) if (!a.dead) for (const h of a.hurt) cap(h.a, h.b, h.r, this.hurtMat);
    for (const s of this.combat.debugSegments) cap(s.a, s.b, s.r, this.hbMat);
  }
}

export { newPlayerData };
