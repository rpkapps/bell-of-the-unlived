/**
 * RegionBase — the generic region controller every Phase 2 region extends (Ashbridge predates it
 * and keeps its own controller). It provides:
 *  - enemies from the layout (ENEMY_DEFS) and bosses from arenas (BOSSES), reset on rest/death,
 *  - boss arenas: fog gate, optional plain-language warning, boss bar, procedural boss music
 *    (`boss:<id>:<phase>`), phase looks, defeat → flag `boss.<id>`, Final Memory, onDefeat pieces,
 *  - Stillbells (rest/kindle/glow), zones (area titles, ambience, music, environment),
 *    the Unfinished Toll (from `objective()`), interactions, tweens, triggers,
 *  - helpers: talk / inspect / pickup / lever / door / NPC spawning / memory flash / hint.
 *
 * Subclasses implement `setup()` (register interactables & triggers), optionally `objective()`,
 * `applyRegionState()`, `onBossDefeated(id)`, `onZoneEnter(id)`, `stepRegion(dt)`.
 * Persistent state lives in `ws.flags` (use `flag()`/`setFlag()`), `ws.npcs`, `ws.pickups`.
 */
import * as THREE from 'three';
import type { Game } from '../Game';
import type { Region, Session } from '../Session';
import type { Anchor, ArenaLayout, DynamicPiece, RegionLayout } from '../../world/levelTypes';
import { Interactions, type Interactable } from '../Interactions';
import { Npc } from '../../actors/Npc';
import type { Enemy } from '../../actors/Enemy';
import { Boss, BOSSES } from '../../content/bosses';
import { DIALOGUE } from '../../content/dialogue';
import { INSPECT, WARNINGS, BOSS, BOSS_DEFEATED_TEXT, STILLBELL_NAMES } from '../../content/text';
import type { HudState, DialogueLine } from '../types';
import { angleDiff, yawOf } from '../../core/math';
import { SPIRITS } from './hub';
import { Ally } from '../../actors/Ally';
import { ENEMY_DEFS } from '../../content/enemies';
import type { AmbienceId, MusicState } from '../../audio/contract';
import type { RegionInfo } from './catalog';
import type { EnemyLook, NpcLook } from '../../actors/models/contract';

interface Tween { piece: DynamicPiece; from: number; to: number; t: number; dur: number; done?: () => void }

export abstract class RegionBase implements Region {
  readonly inter = new Interactions();
  protected enemyList: { e: Enemy; anchor: Anchor }[] = [];
  readonly bosses = new Map<string, Boss>();
  /** Active boss fight (arena), or null. */
  protected fight: { arena: ArenaLayout; boss: Boss } | null = null;
  readonly npcs = new Map<string, Npc>();
  protected tweens: Tween[] = [];
  protected zoneId = '';
  protected time = 0;
  private tollT = 0;
  private hudPrompt: HudState['prompt'] = null;
  private toll: HudState['toll'] = { active: false, dir: 0, behind: false, intensity: 0 };
  private busy = false;
  private bellSwing: { obj: THREE.Object3D; t: number } | null = null;
  private triggersFired = new Set<string>();
  private triggerFns: { name: string; fn: () => void; repeat: boolean }[] = [];
  /** Environment preset used when a zone doesn't name one. */
  defaultEnvironment = 'ashbridgeDusk';
  /** Exploration music for zones that don't name one. */
  defaultMusic: MusicState = 'ashbridge';

  constructor(protected game: Game, protected session: Session, readonly L: RegionLayout, readonly info: RegionInfo) {
    for (const b of L.stillbells) this.add('bell:' + b.id, b.anchor, 2.2, () => (this.ws.stillbells[b.id] ? 'Rest at the Stillbell' : 'Kindle the Stillbell'), () => this.rest(b.id));
    for (const a of L.arenas) {
      this.add('fog:' + a.bossId, a.fogGate.anchor, 2.4, () => (this.flag('boss.' + a.bossId) || this.fight ? null : 'Pass through the veil'), () => this.enterArena(a));
      // A spirit bell beside the veil (only when a spirit has answered the Returned before).
      const spot = a.fogGate.anchor.pos.clone().add(new THREE.Vector3(Math.cos(a.fogGate.anchor.yaw) * 2.2, 0, -Math.sin(a.fogGate.anchor.yaw) * 2.2));
      this.add('spirit:' + a.bossId, spot, 2.0, () => {
        if (this.flag('boss.' + a.bossId) || this.fight || this.summoned.length) return null;
        const s = SPIRITS.find((x) => x.available(this.ws));
        return s ? `Ring the spirit bell (${s.name})` : null;
      }, () => this.summonSpirit());
    }
    this.setup();
  }

  get id() { return this.info.id; }
  get name() { return this.info.name; }
  protected get ws() { return this.session.ws; }
  protected get pd() { return this.session.pd; }
  protected get player() { return this.game.player; }
  flag(k: string) { return !!this.ws.flags[k]; }
  setFlag(k: string, v: boolean | number | string = true) { this.ws.flags[k] = v; }
  /** Named anchor (throws a readable error if the level forgot it). */
  protected A(name: string): Anchor { const a = this.L.anchors[name]; if (!a) throw new Error(`${this.id}: missing anchor '${name}'`); return a; }
  protected P(name: string) { const p = this.L.pieces[name]; if (!p) throw new Error(`${this.id}: missing piece '${name}'`); return p; }

  // ------------------------------------------------------------------ subclass hooks

  /** Register interactables and triggers. */
  protected abstract setup(): void;
  /** Where the current unresolved lead is (drives the Unfinished Toll). */
  protected objective(): THREE.Vector3 | null { return null; }
  /** Re-apply persistent flags to pieces/NPCs after load. */
  protected applyRegionState(): void {}
  protected onBossDefeated(_id: string): void | Promise<void> {}
  protected onBossPhase(_id: string, _phase: number, _b: Boss): void {}
  protected onZoneEnter(_id: string): void {}
  protected stepRegion(_dt: number): void {}
  /** Pieces whose state follows a flag: piece name → flag key (applied at load). */
  protected pieceFlags(): Record<string, string> { return {}; }

  stillbells() {
    return this.L.stillbells.map((b) => ({ id: b.id, name: STILLBELL_NAMES[b.id] ?? b.name, pos: b.anchor.pos, yaw: b.anchor.yaw }));
  }

  // ------------------------------------------------------------------ state

  applyState() {
    for (const [piece, f] of Object.entries(this.pieceFlags())) this.L.pieces[piece]?.set(this.flag(f) ? 1 : 0);
    for (const a of this.L.arenas) {
      const dead = this.flag('boss.' + a.bossId);
      a.fogGate.set(dead ? 1 : 0);
      for (const p of a.onDefeat ?? []) p.set(dead ? 1 : 0);
    }
    this.spawnEnemies();
    this.applyRegionState();
  }

  protected spawnEnemies() {
    const g = this.game;
    for (const { e } of this.enemyList) { e.object.removeFromParent(); const i = g.enemies.indexOf(e); if (i >= 0) g.enemies.splice(i, 1); }
    this.enemyList = [];
    for (const b of this.bosses.values()) { b.object.removeFromParent(); const i = g.enemies.indexOf(b); if (i >= 0) g.enemies.splice(i, 1); }
    this.bosses.clear();
    let seed = 11;
    for (const s of this.L.enemies) {
      const e = g.spawnEnemy(s.kind, s.anchor.pos.clone(), s.anchor.yaw, { id: s.id, leash: s.leash, patrol: s.patrol, idle: s.idleAnim, seed: seed++ });
      this.enemyList.push({ e, anchor: s.anchor });
    }
    for (const a of this.L.arenas) if (!this.flag('boss.' + a.bossId)) this.spawnBoss(a);
  }

  protected spawnBoss(a: ArenaLayout): Boss {
    const g = this.game;
    const spec = BOSSES[a.bossId];
    if (!spec) throw new Error('unknown boss ' + a.bossId);
    const B = spec.cls ?? Boss;
    const b = new B(spec, g, 5);
    b.spawnId = a.bossId;
    b.home.copy(a.spawn.pos); b.homeYaw = a.spawn.yaw;
    this.dressBoss(b, 1);
    b.onKilled = () => void this.bossDefeated(a, b);
    b.onPhase = (ph) => this.bossPhase(a, b, ph);
    g.scene.add(b.object);
    b.resetAt(a.spawn.pos.clone(), a.spawn.yaw);
    g.enemies.push(b);
    this.bosses.set(a.bossId, b);
    return b;
  }

  protected dressBoss(b: Boss, phase: number) {
    const m = this.game.deps.models;
    const spec = b.spec;
    const look = spec.looks?.[Math.min(phase, spec.looks.length) - 1] ?? spec.def.look;
    if (m) {
      if (b.model) { b.model.dispose(); }
      b.model = m.buildEnemy(b.rig, look as EnemyLook, 1);
      if (phase === 1) {
        for (const [slot, id] of [['R', spec.weaponR ?? spec.def.weaponR], ['L', spec.weaponL ?? spec.def.weaponL], ['S', spec.shield ?? spec.def.shield]] as const) {
          if (!id) continue;
          const w = m.buildWeapon(id);
          if (slot === 'R') { b.weaponR = { id, model: w }; b.rig.sockets.weaponR.add(w.object); }
          if (slot === 'L') { b.weaponL = { id, model: w }; b.rig.sockets.weaponL.add(w.object); }
          if (slot === 'S') { b.shield = { id, model: w }; b.rig.sockets.shieldL.add(w.object); }
        }
      }
    }
    b.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
  }

  resetEnemies() {
    for (const { e, anchor } of this.enemyList) e.resetAt(anchor.pos.clone(), anchor.yaw);
    for (const { e } of this.enemyList) if (e.idleAnim === 'sentryWall') e.startMove({ id: 'sentry_idle_loop', clip: 'sentryIdle', dur: 1e9 });
    for (const a of this.L.arenas) {
      if (this.flag('boss.' + a.bossId)) continue;
      const old = this.bosses.get(a.bossId);
      if (old) { old.object.removeFromParent(); const i = this.game.enemies.indexOf(old); if (i >= 0) this.game.enemies.splice(i, 1); }
      this.spawnBoss(a);
      a.fogGate.set(0);
    }
    if (this.fight) { this.fight = null; this.session.audio?.setMusic(this.defaultMusic, 2); }
  }

  lastBreathPos(pos: THREE.Vector3) {
    for (const a of this.L.arenas) if (this.inArena(a, pos)) return a.entry.pos.clone();
    if (pos.y < this.L.killY + 2) {
      const b = this.stillbells().find((s) => s.id === this.ws.lastStillbell) ?? this.stillbells()[0];
      return b.pos.clone().add(new THREE.Vector3(1.5, 0, 0));
    }
    const gr = this.game.world.groundAt(pos.x, pos.y + 1, pos.z, 4);
    return gr ? new THREE.Vector3(pos.x, gr.y, pos.z) : pos;
  }
  protected inArena(a: ArenaLayout, p: THREE.Vector3) { return p.distanceTo(a.center) < a.radius + 1.5 && Math.abs(p.y - a.center.y) < 6; }
  safeToResume(p: THREE.Vector3) { return !this.fight && !this.L.arenas.some((a) => this.inArena(a, p)); }
  onRest(_id: string) {}
  onPlayerDeath() { if (this.fight) this.fight.boss.engaged = false; this.fight = null; this.dismissSpirits(); }

  // ------------------------------------------------------------------ helpers for subclasses

  protected add(id: string, a: Anchor | THREE.Vector3, radius: number, prompt: () => string | null, action: () => void, facing = true): Interactable {
    return this.inter.add({ id, pos: a instanceof THREE.Vector3 ? a : a.pos, radius, prompt, action, facing });
  }

  /** One-time pickup at a named anchor. */
  protected pickup(key: string, anchorName: string, itemId: string, count = 1, prompt = 'Take it', after?: () => void) {
    this.add('pickup:' + key, this.A(anchorName), 1.8, () => (this.ws.pickups[key] ? null : prompt), () => this.playerAct('pickup', () => {
      this.ws.pickups[key] = true;
      this.session.grantItem(itemId, count);
      after?.();
      this.session.save();
    }));
  }

  /** A lever/wheel/door piece that opens once (persistent flag). */
  protected opener(key: string, pieceName: string, flagKey: string, prompt: string, opts: { anchorName?: string; dur?: number; cue?: 'lever_pull' | 'door_open' | 'gate_open' | 'hatch_open'; after?: () => void; requires?: { item: string; locked: string } } = {}) {
    const piece = this.P(pieceName);
    const a = opts.anchorName ? this.A(opts.anchorName) : piece.anchor ?? this.A(pieceName);
    this.add('open:' + key, a, 2.0, () => (this.flag(flagKey) ? null : prompt), () => {
      if (opts.requires && !this.pd.inventory[opts.requires.item]) { this.game.deps.ui?.toast(opts.requires.locked, 'info'); this.game.sfx('ui_error'); return; }
      this.playerAct(opts.cue === 'lever_pull' ? 'lever' : 'interact', () => {
        this.tween(piece, 0, 1, opts.dur ?? 1.2);
        this.game.sfx(opts.cue ?? 'door_open', { pos: a.pos });
        this.setFlag(flagKey);
        opts.after?.();
        this.session.save();
      });
    });
  }

  /** Inspectable text (INSPECT key) at a named anchor; `after` runs once read. */
  protected inspectAt(key: string, anchorName: string, prompt: string, after?: () => void, radius = 2.2) {
    this.add('inspect:' + key, this.A(anchorName), radius, () => prompt, () => this.inspect(key, after));
  }

  /** Run `fn` the first time the player enters trigger `name` (persistent unless repeat). */
  protected onTrigger(name: string, fn: () => void, repeat = false) { this.triggerFns.push({ name, fn, repeat }); }

  protected playerAct(move: 'interact' | 'pickup' | 'lever', then: () => void) {
    const p = this.player;
    if (p.move || this.busy) return;
    this.busy = true;
    p.startMove({ id: move, clip: move, dur: move === 'lever' ? 1.4 : move === 'pickup' ? 1.0 : 0.9, cancel: { free: move === 'lever' ? 1.3 : 0.8 } });
    setTimeout(() => { this.busy = false; then(); }, move === 'lever' ? 800 : 500);
  }

  protected async dialogue(lines: DialogueLine[]) {
    const ui = this.game.deps.ui;
    if (!ui) return null;
    this.game.mode = 'dialogue';
    this.game.input.releaseAll();
    const r = await ui.dialogue(lines);
    this.game.input.releaseAll();
    if (this.game.mode === 'dialogue') this.game.mode = 'play';
    return r;
  }
  protected async talk(key: string, after?: () => void) {
    const lines = DIALOGUE[key];
    if (lines) await this.dialogue(lines);
    if (!this.ws.heard.includes(key)) this.ws.heard.push(key);
    after?.();
  }
  protected heard(key: string) { return this.ws.heard.includes(key); }
  protected async inspect(key: string, after?: () => void) {
    const t = INSPECT[key];
    if (t) await this.dialogue(t.lines.map((text) => ({ speaker: t.title, text })));
    after?.();
  }
  protected record(lead: string, entry: string) { this.session.record(lead, entry); }
  protected subtitle(text: string, speaker = 'The Returned', duration = 5) { this.game.deps.ui?.subtitle({ speaker, text, duration }); }

  protected spawnNpc(id: string, a: Anchor, idle: string | null, look?: NpcLook, props = { height: 1, bulk: 1, shoulder: 1 }): Npc {
    this.removeNpc(id);
    const g = this.game;
    const n = new Npc(id, props);
    n.name = id;
    if (g.deps.models) n.model = g.deps.models.buildNpc(n.rig, (look ?? id) as NpcLook);
    n.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    g.scene.add(n.object);
    n.teleport(a.pos.clone(), a.yaw);
    n.setIdle(idle);
    g.extras.push(n);
    this.npcs.set(id, n);
    return n;
  }
  protected removeNpc(id: string) {
    const n = this.npcs.get(id);
    if (!n) return;
    n.object.removeFromParent();
    const i = this.game.extras.indexOf(n);
    if (i >= 0) this.game.extras.splice(i, 1);
    this.npcs.delete(id);
  }

  protected tween(piece: DynamicPiece, from: number, to: number, dur: number, done?: () => void) { this.tweens.push({ piece, from, to, t: 0, dur, done }); }

  protected memoryFlash() {
    this.game.sfx('memory_trigger');
    const r = this.game.deps.renderer;
    let t = 0;
    const id = setInterval(() => { t += 0.05; r.setGrade({ memory: Math.max(0, Math.sin(Math.min(1, t / 2.5) * Math.PI)) }); if (t > 2.5) { clearInterval(id); r.setGrade({ memory: 0 }); } }, 50);
  }

  // ------------------------------------------------------------------ spirit allies

  protected summoned: Ally[] = [];
  protected summonSpirit() {
    const s = SPIRITS.find((x) => x.available(this.ws));
    const def = s && ENEMY_DEFS[s.kind];
    if (!s || !def) return;
    const g = this.game;
    const al = new Ally(def, g, g.player, 13);
    al.spawnId = 'spirit:' + s.id;
    if (g.deps.models) al.model = g.deps.models.buildEnemy(al.rig, def.look, 3);
    if (def.weaponR && g.deps.models) { const w = g.deps.models.buildWeapon(def.weaponR); al.weaponR = { id: def.weaponR, model: w }; al.rig.sockets.weaponR.add(w.object); }
    al.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    g.scene.add(al.object);
    const p = g.player;
    al.appear(p.pos.clone().add(new THREE.Vector3(Math.sin(p.yaw + 2.2) * 1.8, 0, Math.cos(p.yaw + 2.2) * 1.8)), p.yaw);
    g.enemies.push(al);
    this.summoned.push(al);
    g.deps.ui?.toast(`${s.name} answers the bell`, 'info');
  }
  protected dismissSpirits() {
    for (const a of this.summoned) {
      this.game.fx('bellMotes', a.chest, { count: 40 });
      a.object.removeFromParent();
      const i = this.game.enemies.indexOf(a);
      if (i >= 0) this.game.enemies.splice(i, 1);
    }
    this.summoned = [];
  }

  // ------------------------------------------------------------------ Stillbells

  private rest(id: string) {
    if (this.fight) return;
    const b = this.L.stillbells.find((x) => x.id === id)!;
    this.game.sfx('stillbell_ring', { pos: b.anchor.pos });
    this.bellSwing = { obj: b.bell, t: 0 };
    this.session.restAt(id, STILLBELL_NAMES[id] ?? b.name);
  }

  // ------------------------------------------------------------------ bosses

  protected async enterArena(a: ArenaLayout) {
    const ui = this.game.deps.ui;
    const boss = this.bosses.get(a.bossId);
    if (!ui || !boss) return;
    const w = WARNINGS[this.arenaWarning(a)];
    if (w) {
      this.game.mode = 'menu';
      this.game.input.releaseAll();
      this.game.input.setPointerLock(false);
      const ok = await ui.confirm(w.title, w.body, w.yes, w.no);
      this.game.resumePlay();
      if (!ok) return;
    }
    this.beforeArena(a);
    this.game.sfx('fog_enter');
    await ui.fade(1, 0.35);
    const p = this.player;
    p.teleport(a.fogGate.enterTo.pos.clone(), a.fogGate.enterTo.yaw);
    for (const [i, al] of this.summoned.entries()) al.teleport(a.fogGate.enterTo.pos.clone().add(new THREE.Vector3((i + 1) * 1.6, 0, 0.5)), a.fogGate.enterTo.yaw);
    this.game.cam.snapBehind(p);
    this.fight = { arena: a, boss };
    await ui.fade(0, 0.5);
    this.session.audio?.setMusic(`boss:${boss.spec.music ?? a.bossId}:1`, 0.5);
    for (const l of DIALOGUE[a.bossId + '_intro'] ?? []) ui.subtitle(l);
    boss.engaged = true;
    boss.becomeAware(p);
  }
  /** WARNINGS key to confirm before entering (return '' for none). */
  protected arenaWarning(_a: ArenaLayout): string { return ''; }
  /** Consequences of entering (e.g. an NPC is moved). */
  protected beforeArena(_a: ArenaLayout): void {}

  private bossPhase(a: ArenaLayout, b: Boss, phase: number) {
    this.session.audio?.setMusic(`boss:${b.spec.music ?? a.bossId}:${phase}`, 0.2);
    for (const l of DIALOGUE[`${a.bossId}_phase${phase}`] ?? []) this.game.deps.ui?.subtitle(l);
    if (b.spec.looks?.[phase - 1]) this.dressBoss(b, phase);
    this.game.fx('goldMotes', b.chest, { count: 120, speed: 3 });
    this.game.shake(0.4);
    this.onBossPhase(a.bossId, phase, b);
  }

  private async bossDefeated(a: ArenaLayout, b: Boss) {
    const g = this.game;
    this.fight = null;
    setTimeout(() => this.dismissSpirits(), 4000);
    this.setFlag('boss.' + a.bossId);
    (g as any).onEnemyKilled(b);
    for (const l of DIALOGUE[a.bossId + '_death'] ?? []) g.deps.ui?.subtitle(l);
    this.session.audio?.setMusic('victory', 1);
    if (b.spec.memory) this.session.grantItem(b.spec.memory, 1, true);
    this.session.save();
    await new Promise((r) => setTimeout(r, 2200));
    g.sfx('anchor_shatter', { pos: a.center });
    for (const p of a.onDefeat ?? []) this.tween(p, 0, 1, 1.4);
    const name = (BOSS as Record<string, { name: string; title: string }>)[a.bossId]?.name ?? b.def.name;
    g.deps.ui?.banner('bossDefeated', BOSS_DEFEATED_TEXT, name);
    a.fogGate.set(1);
    await this.onBossDefeated(a.bossId);
    this.session.save();
  }

  // ------------------------------------------------------------------ per step / frame

  step(dt: number) {
    this.time += dt;
    this.session.tick(dt);
    const g = this.game, p = g.player;
    if (!p) return;
    for (const tw of this.tweens) {
      tw.t = Math.min(tw.dur, tw.t + dt);
      const x = tw.t / tw.dur;
      tw.piece.set(tw.from + (tw.to - tw.from) * (x * x * (3 - 2 * x)));
      if (tw.t >= tw.dur && tw.done) { const d = tw.done; tw.done = undefined; d(); }
    }
    this.tweens = this.tweens.filter((t) => t.t < t.dur);
    const best = g.mode === 'play' && !p.dead && !p.move ? this.inter.best(p) : null;
    this.hudPrompt = best ? { text: best.text, action: 'interact' } : null;
    if (p.interactPressed) { p.interactPressed = false; if (best && g.mode === 'play') best.it.action(); }
    const probe = new THREE.Vector3(p.pos.x, p.pos.y + 0.9, p.pos.z);
    for (const t of this.triggerFns) {
      const box = this.L.triggers[t.name];
      if (!box || !box.containsPoint(probe)) continue;
      const key = `${this.id}.trigger.${t.name}`;
      if (!t.repeat && (this.ws.flags[key] || this.triggersFired.has(key))) continue;
      this.triggersFired.add(key);
      if (!t.repeat) this.ws.flags[key] = true;
      t.fn();
    }
    for (const z of this.L.zones) if (z.box.containsPoint(probe)) { if (z.id !== this.zoneId) this.enterZone(z.id); break; }
    if (!p.dead && p.pos.y < this.L.killY) { p.hp = 0; p.react('death', p.pos); }
    for (const n of this.npcs.values()) { n.lookTarget = p.pos; n.tick(dt); }
    this.updateToll(dt);
    this.stepRegion(dt);
  }

  private enterZone(id: string) {
    this.zoneId = id;
    const z = this.L.zones.find((x) => x.id === id)!;
    const a = this.session.audio;
    if (!this.ws.areas.includes(id)) { this.ws.areas.push(id); this.game.deps.ui?.banner('area', z.name); }
    a?.setAmbience(z.ambience as AmbienceId, 2);
    if (!this.fight) a?.setMusic((z.music as MusicState) ?? this.defaultMusic, 3);
    this.game.deps.renderer.setEnvironment(z.environment ?? this.defaultEnvironment, 2.5);
    this.onZoneEnter(id);
  }

  currentAreaName() { return this.L.zones.find((z) => z.id === this.zoneId)?.name ?? this.name; }

  private updateToll(dt: number) {
    const p = this.player;
    const obj = this.objective();
    this.toll = { active: false, dir: 0, behind: false, intensity: 0 };
    if (!obj) return;
    for (const post of this.L.tollPosts) {
      const d = p.pos.distanceTo(post.pos);
      if (d > post.radius) continue;
      const want = obj.clone().sub(post.pos).setY(0).normalize();
      let best = post.options[0], bd = -2;
      for (const o of post.options) { const v = o.toward.clone().sub(post.pos).setY(0).normalize(); const dd = v.dot(want); if (dd > bd) { bd = dd; best = o; } }
      const rel = angleDiff(this.game.cam.yaw, yawOf(best.toward.x - p.pos.x, best.toward.z - p.pos.z));
      this.toll = { active: true, dir: Math.max(-1, Math.min(1, -Math.sin(rel))), behind: Math.abs(rel) > 1.9, intensity: 1 - (d / post.radius) * 0.6 };
      this.tollT -= dt;
      if (this.tollT <= 0) {
        this.tollT = 5.5;
        const src = post.pos.clone().add(best.toward.clone().sub(post.pos).setY(0).normalize().multiplyScalar(10));
        src.y += 3;
        this.game.sfx('unfinished_toll', { pos: src });
      }
      break;
    }
  }

  frame(dt: number) {
    this.L.update(dt, this.time, this.game.deps.renderer.camera);
    for (const b of this.L.stillbells) {
      const base = (b.light.userData.baseIntensity ??= b.light.intensity) as number;
      const want = this.ws?.stillbells[b.id] ? base : base * 0.3;
      b.light.intensity += (want - b.light.intensity) * Math.min(1, dt * 2);
    }
    if (this.bellSwing) {
      this.bellSwing.t += dt;
      const t = this.bellSwing.t;
      this.bellSwing.obj.rotation.x = Math.sin(t * 5) * 0.35 * Math.exp(-t * 1.2);
      if (t > 4) { this.bellSwing.obj.rotation.x = 0; this.bellSwing = null; }
    }
  }

  hud(h: HudState) {
    h.prompt = this.hudPrompt;
    h.toll = this.toll;
    const f = this.fight;
    if (f && !f.boss.dead) {
      const n = (BOSS as Record<string, { name: string; title: string }>)[f.arena.bossId];
      h.boss = { name: n?.name ?? f.boss.def.name, title: n?.title ?? '', hp01: f.boss.hp / f.boss.hpMax, posture01: Math.min(1, f.boss.posture / f.boss.postureMax), phase: f.boss.phase };
    }
  }

  titleCamera(t: number, cam: THREE.PerspectiveCamera) {
    const s = this.L.playerStart.pos;
    const a = t * 0.05;
    cam.position.set(s.x + Math.sin(a) * 6, s.y + 3, s.z + Math.cos(a) * 6);
    cam.lookAt(s.x, s.y + 1, s.z);
  }
}
