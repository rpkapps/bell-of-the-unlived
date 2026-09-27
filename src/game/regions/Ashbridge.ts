/**
 * Ashbridge — the first region. Wires the level's anchors to quest logic:
 *  - the refugee road (remembered) vs the fresh masonry (observed) and the service hatch,
 *  - Oswin's fate (rescued → hospice, or taken if the player enters the Commander's Yard first),
 *  - the drawbridge shortcut, Stillbells, the Unfinished Toll,
 *  - Ser Corvane (two phases, the Measure) and the battlefield beneath the town.
 * Every persistent change is a flag in WorldState and is re-applied on load.
 */
import * as THREE from 'three';
import type { Game } from '../Game';
import type { Region, Session } from '../Session';
import type { AshbridgeLayout, Anchor, DynamicPiece } from '../../world/levelTypes';
import { Interactions } from '../Interactions';
import { Npc } from '../../actors/Npc';
import { Enemy } from '../../actors/Enemy';
import { Boss, CORVANE } from '../../content/bosses';
import { DIALOGUE, SLICE_END_CARDS } from '../../content/dialogue';
import { INSPECT, WARNINGS, BOSS, BOSS_DEFEATED_TEXT, STILLBELL_NAMES } from '../../content/text';
import type { HudState } from '../types';
import { ORIGINS } from '../../content/origins';
import { ITEMS } from '../../content/items';
import { angleDiff, yawOf } from '../../core/math';
import type { AmbienceId, MusicState } from '../../audio/contract';
import type { EnvironmentPreset } from '../../render/contract';

interface Tween { piece: DynamicPiece; from: number; to: number; t: number; dur: number; done?: () => void }

const F = {
  hatch: 'ashbridge.hatchOpen', drawbridge: 'ashbridge.drawbridge', chest: 'ashbridge.chest', refuge: 'ashbridge.refugeOpen',
  boss: 'boss.corvane', reveal: 'ashbridge.reveal', gear: 'ashbridge.gearRack', hospice: 'ashbridge.hospiceVisited',
  brannoc: 'ashbridge.brannocMet', oswinTaught: 'ashbridge.oswinTaught', oswinAfter: 'ashbridge.oswinAfter', hesperMet: 'ashbridge.hesperMet',
  sliceEnd: 'ashbridge.sliceEnd',
};

export class AshbridgeRegion implements Region {
  readonly id = 'ashbridge';
  readonly name = 'Ashbridge';
  readonly inter = new Interactions();
  private enemies: { e: Enemy; anchor: Anchor }[] = [];
  boss: Boss | null = null;
  private bossPhase = 0;
  private fighting = false;
  private npcs = new Map<string, Npc>();
  private tweens: Tween[] = [];
  private zoneId = '';
  private tollT = 0;
  private hudPrompt: HudState['prompt'] = null;
  private toll: HudState['toll'] = { active: false, dir: 0, behind: false, intensity: 0 };
  private busy = false;
  private time = 0;

  constructor(private game: Game, private session: Session, readonly L: AshbridgeLayout) {
    this.buildInteractables();
  }

  private get ws() { return this.session.ws; }
  private get pd() { return this.session.pd; }
  private flag(k: string) { return !!this.ws.flags[k]; }
  private setFlag(k: string, v: boolean | number | string = true) { this.ws.flags[k] = v; }

  stillbells() {
    return this.L.stillbells.map((b) => ({ id: b.id, name: STILLBELL_NAMES[b.id] ?? b.name, pos: b.anchor.pos, yaw: b.anchor.yaw }));
  }

  // ------------------------------------------------------------------ state application

  applyState() {
    const L = this.L;
    L.hatch.set(this.flag(F.hatch) ? 1 : 0);
    L.drawbridge.set(this.flag(F.drawbridge) ? 1 : 0);
    L.drawbridgeLever.set(this.flag(F.drawbridge) ? 1 : 0);
    L.chest.set(this.flag(F.chest) ? 1 : 0);
    L.refugeDoor.set(this.flag(F.refuge) ? 1 : 0);
    L.fogGate.set(this.flag(F.boss) ? 1 : 0);
    L.anchorBell.set(this.flag(F.boss) ? 1 : 0);
    L.battlefieldReveal.set(this.flag(F.reveal) ? 1 : 0);
    for (const c of [L.hatch, L.drawbridge, L.refugeDoor, L.fogGate, L.drawbridgeLever, L.chest]) c.collider && this.syncCollider(c);
    this.spawnEnemies();
    this.placeNpcs();
  }

  private syncCollider(_p: DynamicPiece) { /* pieces manage their own colliders in set() */ }

  private spawnEnemies() {
    const g = this.game;
    for (const { e } of this.enemies) { g.scene.remove(e.object); const i = g.enemies.indexOf(e); if (i >= 0) g.enemies.splice(i, 1); }
    this.enemies = [];
    if (this.boss) { g.scene.remove(this.boss.object); const i = g.enemies.indexOf(this.boss); if (i >= 0) g.enemies.splice(i, 1); this.boss = null; }
    let seed = 11;
    for (const s of this.L.enemies) {
      if (s.kind === 'commander') { if (!this.flag(F.boss)) this.spawnBoss(s.anchor); continue; }
      const e = g.spawnEnemy(s.kind, s.anchor.pos.clone(), s.anchor.yaw, { id: s.id, leash: s.leash, patrol: s.patrol, idle: s.idleAnim, seed: seed++ });
      if (s.kind === 'sentry') e.onKilled = (en) => { (g as any).onEnemyKilled(en); if (!this.pd.inventory.refuge_key) { this.session.grantItem('refuge_key'); } };
      this.enemies.push({ e, anchor: s.anchor });
    }
    // practice dummies (never hostile)
    for (const [i, a] of this.L.practiceDummies.entries()) {
      const d = g.spawnEnemy('dummy', a.pos.clone(), a.yaw, { id: 'dummy' + i, seed: 90 + i });
      d.anim.play((d.anim as any).constructor && (window as any) ? CLIP_RIGID() : CLIP_RIGID(), { fade: 0 });
      this.enemies.push({ e: d, anchor: a });
    }
  }

  private spawnBoss(a: Anchor) {
    const g = this.game;
    const b = new Boss(CORVANE, g, 5);
    b.spawnId = 'corvane';
    b.home.copy(a.pos); b.homeYaw = a.yaw;
    const m = g.deps.models;
    if (m) b.model = m.buildEnemy(b.rig, 'commander', 1);
    const wm = m ? m.buildWeapon('corvane_sword') : { object: new THREE.Group(), hit: { from: 0.15, to: 1.35, radius: 0.06 } };
    b.weaponR = { id: 'corvane_sword', model: wm };
    b.rig.sockets.weaponR.add(wm.object);
    b.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    b.onKilled = () => this.onBossDefeated();
    b.onPhase = () => this.onBossPhase2();
    b.onMeasure = () => { if (this.session.journalSys.has('mem_measure')) this.session.record('measure', 'obs_measure'); };
    b.onShockwave = (p) => { g.fx('dust', p, { count: 80, speed: 6 }); g.fx('sparks', p, { count: 20 }); };
    b.onFireTrail = (a2, b2) => { for (let i = 0; i <= 6; i++) g.fx('embers', a2.clone().lerp(b2, i / 6), { count: 12 }); };
    g.scene.add(b.object);
    b.resetAt(a.pos.clone(), a.yaw);
    g.enemies.push(b);
    this.boss = b;
  }

  resetEnemies() {
    for (const { e, anchor } of this.enemies) e.resetAt(anchor.pos.clone(), anchor.yaw);
    for (const { e } of this.enemies) if (e.idleAnim === 'sentryWall') e.startMove({ id: 'sentry_idle_loop', clip: 'sentryIdle', dur: 1e9 });
    for (const { e } of this.enemies) if (e.def.kind === 'dummy') e.anim.play(CLIP_RIGID(), { fade: 0 });
    if (this.boss && !this.flag(F.boss)) {
      // A new approach: the Commander waits again; the veil re-forms.
      const bi = this.L.enemies.find((s) => s.kind === 'commander')!;
      this.game.scene.remove(this.boss.object);
      const i = this.game.enemies.indexOf(this.boss);
      if (i >= 0) this.game.enemies.splice(i, 1);
      this.spawnBoss(bi.anchor);
      this.fighting = false; this.bossPhase = 0;
      this.L.fogGate.set(0);
      this.session.audio?.setMusic('ashbridge', 2);
    }
  }

  private placeNpcs() {
    const g = this.game;
    for (const n of this.npcs.values()) { g.scene.remove(n.object); const i = g.extras.indexOf(n); if (i >= 0) g.extras.splice(i, 1); }
    this.npcs.clear();
    const fate = this.ws.npcs.oswin;
    if (fate === 'imprisoned') this.spawnNpc('oswin', this.L.oswinCell, 'sit');
    else if (fate === 'rescued') this.spawnNpc('oswin', this.L.oswinHospice, 'standPray');
    this.spawnNpc('hesper', this.L.hesper, 'forge');
    if (this.flag(F.reveal)) this.spawnNpc('brannoc', this.L.brannoc, null);
  }

  private spawnNpc(id: 'oswin' | 'hesper' | 'brannoc', a: Anchor, idle: string | null) {
    const g = this.game;
    const n = new Npc(id, id === 'hesper' ? { height: 0.97, bulk: 0.95, shoulder: 0.95 } : { height: 1, bulk: 1, shoulder: 1 });
    n.name = id;
    if (g.deps.models) n.model = g.deps.models.buildNpc(n.rig, id);
    n.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    if (id === 'hesper' && g.deps.models) { const w = g.deps.models.buildWeapon('coinbreaker_hammer'); n.rig.sockets.weaponR.add(w.object); }
    g.scene.add(n.object);
    n.teleport(a.pos.clone(), a.yaw);
    n.setIdle(idle);
    n.lookTarget = g.player?.pos ?? null;
    g.extras.push(n);
    this.npcs.set(id, n);
    return n;
  }

  private removeNpc(id: string) {
    const n = this.npcs.get(id);
    if (!n) return;
    this.game.scene.remove(n.object);
    const i = this.game.extras.indexOf(n);
    if (i >= 0) this.game.extras.splice(i, 1);
    this.npcs.delete(id);
  }

  lastBreathPos(pos: THREE.Vector3) {
    if (this.inArena(pos)) return this.L.arenaEntry.pos.clone();
    if (pos.y < this.L.killY + 2) {
      // fell into the ravine: leave the Breath at the rim nearest the last Stillbell
      const b = this.stillbells().find((s) => s.id === this.ws.lastStillbell) ?? this.stillbells()[0];
      return b.pos.clone().add(new THREE.Vector3(1.5, 0, 0));
    }
    const gr = this.game.world.groundAt(pos.x, pos.y + 1, pos.z, 4);
    return gr ? new THREE.Vector3(pos.x, gr.y, pos.z) : pos;
  }
  private inArena(p: THREE.Vector3) { return p.distanceTo(this.L.arenaCenter) < this.L.arenaRadius + 1.5 && p.y > this.L.arenaCenter.y - 3; }
  safeToResume(p: THREE.Vector3) { return !this.inArena(p) && !this.fighting; }

  onRest(_id: string) { if (this.ws.npcs.oswin === 'rescued') this.npcs.get('oswin')?.teleport(this.L.oswinHospice.pos.clone(), this.L.oswinHospice.yaw); }
  onPlayerDeath() { this.fighting = false; this.boss && (this.boss.engaged = false); }

  // ------------------------------------------------------------------ interactables

  private buildInteractables() {
    const L = this.L;
    const add = (id: string, a: Anchor | THREE.Vector3, radius: number, prompt: () => string | null, action: () => void, facing = true) =>
      this.inter.add({ id, pos: a instanceof THREE.Vector3 ? a : a.pos, radius, prompt, action, facing });

    for (const b of L.stillbells) add('bell:' + b.id, b.anchor, 2.2, () => (this.ws.stillbells[b.id] ? 'Rest at the Stillbell' : 'Kindle the Stillbell'), () => this.rest(b.id));

    add('masonry', L.freshMasonry, 2.2, () => 'Examine the masonry', () => this.inspect('fresh_masonry', () => {
      this.session.record('refugee_road', 'mem_route');
      this.session.record('refugee_road', 'obs_masonry');
      this.session.record('refugee_road', 'obs_hatch');
      this.game.sfx('masonry_touch');
    }));
    add('hatch', L.hatch.anchor, 2.0, () => (this.flag(F.hatch) ? null : 'Heave open the service hatch'), () => {
      this.playerAct('lever', () => {
        this.tween(L.hatch, 0, 1, 1.1);
        this.game.sfx('hatch_open', { pos: L.hatch.anchor.pos });
        this.setFlag(F.hatch);
        this.session.record('refugee_road', 'obs_hatch');
        this.session.record('refugee_road', 'conf_hatch');
        this.game.hint('hatch');
        this.session.save();
      });
    });
    add('keyhook', L.refugeKeyHook, 1.8, () => (this.pd.inventory.refuge_key || this.ws.pickups.refugeKeyHook ? null : 'Take the key from the ledger hook'), () => this.playerAct('interact', () => { this.ws.pickups.refugeKeyHook = true; this.session.grantItem('refuge_key'); this.session.save(); }));
    add('orders', L.ordersDesk, 1.8, () => 'Read the papers on the desk', () => this.inspect('corvane_orders', () => {
      this.session.record('refugee_road', 'obs_orders');
      this.session.record('betrayal', 'mem_gate');
      this.session.record('betrayal', 'obs_letters');
    }));
    add('grimoire', L.grimoire, 1.8, () => (this.ws.pickups.grimoire ? null : 'Take the grimoire'), () => this.playerAct('pickup', () => { this.ws.pickups.grimoire = true; this.session.grantItem('grimoire_cinder_bolt'); this.game.hint('cast'); this.session.save(); }));
    add('chest', L.chest.anchor, 1.9, () => (this.flag(F.chest) ? null : 'Open the chest'), () => this.playerAct('interact', () => {
      this.tween(L.chest, 0, 1, 0.9);
      this.game.sfx('chest_open', { pos: L.chest.anchor.pos });
      this.setFlag(F.chest);
      this.session.grantItem('warden_talisman');
      setTimeout(() => this.session.grantItem('tempered_scrap', 2), 700);
      this.session.save();
    }));
    add('oswinCell', L.oswinCell, 2.6, () => (this.ws.npcs.oswin === 'imprisoned' && !this.flag(F.refuge) ? 'Speak through the bars' : null), () => this.talk('oswin_cell', () => this.session.record('healer', 'obs_cell')), false);
    add('refuge', L.refugeDoor.anchor, 2.0, () => (this.flag(F.refuge) ? null : this.pd.inventory.refuge_key ? 'Unlock the refuge' : 'The refuge door (locked)'), () => {
      if (!this.pd.inventory.refuge_key) { this.game.deps.ui?.toast('Locked. Someone down here carries the key.', 'info'); this.game.sfx('ui_error'); return; }
      this.playerAct('interact', () => {
        this.tween(L.refugeDoor, 0, 1, 1.2);
        this.game.sfx('door_open', { pos: L.refugeDoor.anchor.pos });
        this.setFlag(F.refuge);
        if (this.ws.npcs.oswin === 'imprisoned') {
          this.talk('oswin_freed', () => {
            this.ws.npcs.oswin = 'rescued';
            this.session.record('healer', 'obs_cell');
            this.session.record('healer', 'conf_rescued');
            this.removeNpc('oswin');
            this.spawnNpc('oswin', L.oswinHospice, 'standPray');
            this.session.save();
          });
        } else this.session.save();
      });
    });
    add('rosary', L.rosaryDrop, 1.8, () => (this.ws.npcs.oswin === 'taken' ? 'Examine the rosary' : null), () => this.inspect('rosary'));
    add('relief', L.greyfordRelief, 2.6, () => 'Examine the relief', () => this.inspect('greyford_relief', () => this.session.record('greyford', 'obs_relief')));
    add('lever', L.drawbridgeLever.anchor, 1.9, () => (this.flag(F.drawbridge) ? null : 'Pull the drawbridge lever'), () => this.playerAct('lever', () => {
      this.tween(L.drawbridgeLever, 0, 1, 0.9);
      this.game.sfx('lever_pull', { pos: L.drawbridgeLever.anchor.pos });
      setTimeout(() => { this.game.sfx('chain_rattle', { pos: L.drawbridgeLever.anchor.pos }); this.tween(L.drawbridge, 0, 1, 3.6, () => { this.game.sfx('drawbridge_slam', { pos: L.drawbridgeLever.anchor.pos }); this.game.shake(0.3); }); }, 500);
      this.setFlag(F.drawbridge);
      this.game.hint('drawbridge');
      this.session.save();
    }));
    add('shard', L.bellbronzeShard, 1.8, () => (this.ws.pickups.shard ? null : 'Take the bellbronze shard'), () => this.playerAct('pickup', () => { this.ws.pickups.shard = true; this.session.grantItem('bellbronze_shard'); this.session.save(); }));
    add('hesper', L.hesper, 2.4, () => 'Speak with Hesper', () => this.talkHesper(), false);
    add('oswinHospice', L.oswinHospice, 2.4, () => (this.ws.npcs.oswin === 'rescued' ? 'Speak with Oswin' : null), () => this.talkOswin(), false);
    add('gear', L.gearRack, 2.0, () => (this.flag(F.gear) ? null : 'Take gear from the rack'), () => this.playerAct('pickup', () => this.takeGear()));
    for (const pl of L.practicePlaques) add('plaque:' + pl.topic, pl.anchor, 1.8, () => 'Read the plaque', () => { this.game.mode = 'menu'; this.game.input.setPointerLock(false); this.game.deps.ui?.showPractice(pl.topic); });
    add('fog', L.fogGate.anchor, 2.4, () => (this.flag(F.boss) || this.fighting ? null : 'Pass through the veil'), () => this.enterArena());
    add('brannoc', L.brannoc, 2.6, () => (this.npcs.has('brannoc') ? 'Speak with the sergeant' : null), () => this.talkBrannoc(), false);
  }

  private rest(id: string) {
    if (this.fighting) return;
    const b = this.L.stillbells.find((x) => x.id === id)!;
    this.game.sfx('stillbell_ring', { pos: b.anchor.pos });
    this.bellSwing = { obj: b.bell, t: 0 };
    this.session.restAt(id, STILLBELL_NAMES[id] ?? b.name);
    if (!this.ws.heard.includes('stillbell_first')) { this.ws.heard.push('stillbell_first'); }
  }
  private bellSwing: { obj: THREE.Object3D; t: number } | null = null;

  private playerAct(move: 'interact' | 'pickup' | 'lever', then: () => void) {
    const p = this.game.player;
    if (p.move || this.busy) return;
    this.busy = true;
    const ids = { interact: 'interact', pickup: 'pickup', lever: 'lever' };
    p.startMove({ id: ids[move], clip: move, dur: move === 'lever' ? 1.4 : move === 'pickup' ? 1.0 : 0.9, cancel: { free: move === 'lever' ? 1.3 : 0.8 } });
    setTimeout(() => { this.busy = false; then(); }, move === 'lever' ? 800 : 500);
  }

  private async inspect(key: string, after?: () => void) {
    const t = INSPECT[key];
    if (!t) return;
    await this.dialogue(t.lines.map((text) => ({ speaker: t.title, text })));
    after?.();
  }

  private async dialogue(lines: { speaker: string; text: string }[]) {
    const ui = this.game.deps.ui;
    if (!ui) return null;
    this.game.mode = 'dialogue';
    this.game.input.releaseAll();
    const r = await ui.dialogue(lines);
    this.game.input.releaseAll();
    this.game.mode = 'play';
    return r;
  }

  private async talk(key: string, after?: () => void) {
    const lines = DIALOGUE[key];
    if (!lines) { after?.(); return; }
    await this.dialogue(lines);
    if (!this.ws.heard.includes(key)) this.ws.heard.push(key);
    after?.();
  }

  private async talkHesper() {
    if (!this.flag(F.hesperMet)) { await this.talk('hesper_first'); this.setFlag(F.hesperMet); }
    else if (this.flag(F.boss) && !this.ws.heard.includes('hesper_after_boss')) await this.talk('hesper_after_boss');
    else { const pool = DIALOGUE.hesper_idle ?? []; if (pool.length) await this.dialogue([pool[Math.floor(Math.random() * pool.length)]]); }
    this.game.mode = 'menu';
    this.game.input.setPointerLock(false);
    this.game.deps.ui?.showSmith('hesper');
  }

  private async talkOswin() {
    if (!this.ws.heard.includes('oswin_hospice_first')) { await this.talk('oswin_hospice_first'); return; }
    if (!this.flag(F.oswinTaught)) {
      await this.talk('oswin_teach');
      this.setFlag(F.oswinTaught);
      const hasRite = Object.keys(this.pd.inventory).some((id) => ITEMS[id]?.weapon?.casts === 'rite');
      if (!hasRite) this.session.grantItem('hand_bell');
      for (const s of ['stilling_chime', 'ember_blessing']) if (!this.pd.knownSpells.includes(s)) this.pd.knownSpells.push(s);
      this.game.deps.ui?.toast('Learned: Stilling Chime, Ember Blessing', 'item');
      this.session.save();
      return;
    }
    if (this.flag(F.boss) && !this.flag(F.oswinAfter)) {
      await this.talk('oswin_after_boss');
      this.setFlag(F.oswinAfter);
      if (!this.pd.knownSpells.includes('ashen_veil')) { this.pd.knownSpells.push('ashen_veil'); this.game.deps.ui?.toast('Learned: Ashen Veil', 'item'); }
      this.session.save();
      return;
    }
    const pool = DIALOGUE.oswin_hospice_idle ?? [];
    if (pool.length) await this.dialogue([pool[Math.floor(Math.random() * pool.length)]]);
  }

  private async talkBrannoc() {
    if (!this.flag(F.brannoc)) {
      await this.talk('brannoc_reveal');
      this.session.record('greyford', 'obs_battlefield');
      this.session.record('greyford', 'conf_brannoc');
      this.setFlag(F.brannoc);
      await this.talk('brannoc_after');
      this.session.grantItem('greyford_sabre');
      this.session.save();
      if (!this.flag(F.sliceEnd)) {
        this.setFlag(F.sliceEnd);
        const ui = this.game.deps.ui;
        if (ui) {
          this.game.mode = 'cinematic';
          this.game.input.setPointerLock(false);
          this.session.audio?.setMusic('battlefield', 2);
          await ui.cinematic(SLICE_END_CARDS);
          this.game.resumePlay();
        }
      }
      return;
    }
    await this.talk('brannoc_after');
  }

  private takeGear() {
    const other = this.pd.origin === 'householdKnight' ? 'courtMage' : 'householdKnight';
    const o = ORIGINS.find((x) => x.id === other)!;
    const got: string[] = [];
    for (const k of o.kit) {
      if (k.startsWith('spell:')) { const s = k.slice(6); if (!this.pd.knownSpells.includes(s)) { this.pd.knownSpells.push(s); got.push(s); } continue; }
      if (ITEMS[k] && !this.pd.inventory[k] && ITEMS[k].kind !== 'consumable') { this.session.grantItem(k, 1, true); got.push(ITEMS[k].name); }
    }
    this.setFlag(F.gear);
    this.inspect('gear_rack');
    this.game.deps.ui?.toast(`Took the ${o.name}'s gear`, 'item');
    this.session.save();
  }

  // ------------------------------------------------------------------ boss

  private async enterArena() {
    const ui = this.game.deps.ui;
    if (!ui || !this.boss) return;
    const prisoner = this.ws.npcs.oswin === 'imprisoned';
    const w = prisoner ? WARNINGS.arenaWithPrisoner : WARNINGS.arenaPlain;
    this.game.mode = 'menu';
    this.game.input.releaseAll();
    this.game.input.setPointerLock(false);
    const ok = prisoner ? await ui.confirm(w.title, w.body, (w as any).yes, (w as any).no) : true;
    this.game.resumePlay();
    if (!ok) return;
    if (prisoner) {
      // The Commander's men move him: persistent loss.
      this.ws.npcs.oswin = 'taken';
      this.removeNpc('oswin');
      this.session.record('healer', 'mem_oswin');
      this.session.record('healer', 'conf_taken');
    }
    this.game.sfx('fog_enter');
    await ui.fade(1, 0.35);
    const p = this.game.player;
    p.teleport(this.L.fogGate.enterTo.pos.clone(), this.L.fogGate.enterTo.yaw);
    this.game.cam.snapBehind(p);
    this.fighting = true;
    await ui.fade(0, 0.5);
    this.session.record('measure', 'mem_measure');
    this.session.audio?.setMusic('boss1', 0.5);
    const lines = DIALOGUE.corvane_intro ?? [];
    for (const l of lines) ui.subtitle(l);
    if (this.boss) { this.boss.engaged = true; this.boss.becomeAware(p); }
    this.bossPhase = 1;
  }

  private onBossPhase2() {
    this.bossPhase = 2;
    this.session.audio?.setMusic('boss2', 0.2);
    for (const l of DIALOGUE.corvane_phase2 ?? []) this.game.deps.ui?.subtitle(l);
    const b = this.boss!;
    const m = this.game.deps.models;
    if (m) {
      b.model?.dispose();
      for (const bone of Object.values(b.rig.bones)) for (const c of [...bone.children]) if ((c as THREE.Mesh).isMesh || (c as THREE.Group).isGroup) bone.remove(c);
      b.model = m.buildEnemy(b.rig, 'commander2', 1);
      b.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    }
    this.game.fx('goldMotes', b.chest, { count: 120, speed: 3 });
    this.game.shake(0.4);
  }

  private async onBossDefeated() {
    const g = this.game;
    this.fighting = false;
    this.setFlag(F.boss);
    (g as any).onEnemyKilled(this.boss);
    for (const l of DIALOGUE.corvane_death ?? []) g.deps.ui?.subtitle(l);
    this.session.audio?.setMusic('victory', 1);
    this.session.grantItem('memory_corvane', 1, true);
    this.session.record('measure', 'conf_corvane');
    this.session.record('betrayal', 'mem_gate');
    this.session.record('betrayal', 'conf_gate');
    this.session.save();
    await wait(2200);
    g.sfx('anchor_shatter', { pos: this.L.arenaCenter });
    this.tween(this.L.anchorBell, 0, 1, 1.4);
    g.fx('shatter', this.L.arenaCenter.clone().add(new THREE.Vector3(0, 3, -12)), { count: 80 });
    g.deps.ui?.banner('bossDefeated', BOSS_DEFEATED_TEXT, BOSS.corvane.name);
    this.L.fogGate.set(1);
    await wait(3500);
    // The ground gives way: the impossible battlefield.
    g.sfx('collapse_rumble', { pos: this.L.arenaCenter });
    g.shake(0.8);
    this.tween(this.L.battlefieldReveal, 0, 1, 6);
    this.session.audio?.setMusic('battlefield', 4);
    this.setFlag(F.reveal);
    await wait(6500);
    this.spawnNpc('brannoc', this.L.brannoc, null);
    this.session.save();
  }

  // ------------------------------------------------------------------ per step / frame

  step(dt: number) {
    this.time += dt;
    this.session.tick(dt);
    const g = this.game, p = g.player;
    if (!p) return;
    // tweens
    for (const tw of this.tweens) {
      tw.t = Math.min(tw.dur, tw.t + dt);
      const x = tw.t / tw.dur;
      tw.piece.set(tw.from + (tw.to - tw.from) * (x * x * (3 - 2 * x)));
      if (tw.t >= tw.dur && tw.done) { const d = tw.done; tw.done = undefined; d(); }
    }
    this.tweens = this.tweens.filter((t) => t.t < t.dur);
    // interaction
    const best = g.mode === 'play' && !p.dead && !p.move ? this.inter.best(p) : null;
    this.hudPrompt = best ? { text: best.text, action: 'interact' } : null;
    if (p.interactPressed) { p.interactPressed = false; if (best && g.mode === 'play') best.it.action(); }
    // triggers
    if (!this.session.journalSys.has('mem_route') && boxHas(this.L.countingRoomTrigger.box, p.pos)) {
      this.session.record('refugee_road', 'mem_route');
      this.memoryFlash();
      g.deps.ui?.subtitle({ speaker: 'The Returned', text: 'I remember this room. The refugees went down beneath its floor — the night the town fell.', duration: 5 });
    }
    // zones
    for (const z of this.L.zones) if (boxHas(z.box, p.pos)) { if (z.id !== this.zoneId) this.enterZone(z.id); break; }
    // falling into the ravine
    if (!p.dead && p.pos.y < this.L.killY) { p.hp = 0; p.react('death', p.pos); }
    // sentry backstab tutorial
    for (const { e } of this.enemies) {
      if (e.def.kind === 'sentry' && !e.aware && !e.dead && e.distTo(p) < 6) {
        const behind = Math.abs(angleDiff(e.yaw, yawOf(p.pos.x - e.pos.x, p.pos.z - e.pos.z))) > 2.2;
        if (behind) g.hint('backstab');
      }
      if (e.def.kind === 'shieldBearer' && e.aware && e.distTo(p) < 7) g.hint('guard');
    }
    // NPCs
    for (const n of this.npcs.values()) { n.lookTarget = p.pos; n.tick(dt); }
    // toll
    this.updateToll(dt);
    // boss: if the player left or died, fighting ends
    if (this.fighting && this.boss && !p.dead && !this.inArena(p.pos)) { /* veil keeps them in */ }
  }

  private enterZone(id: string) {
    this.zoneId = id;
    const z = this.L.zones.find((x) => x.id === id)!;
    const a = this.session.audio;
    if (!this.ws.areas.includes(id)) { this.ws.areas.push(id); this.game.deps.ui?.banner('area', z.name); }
    const amb: Record<string, AmbienceId> = { outdoor: 'outdoor', interior: 'interior', undercroft: 'undercroft', hospice: 'hospice', arena: 'arena', battlefield: 'battlefield' };
    a?.setAmbience(amb[z.ambience] ?? 'outdoor', 2);
    if (!this.fighting && z.music) a?.setMusic(z.music as MusicState, 3);
    const env: Record<string, EnvironmentPreset> = { undercroft: 'undercroft', hospice: 'hospiceInterior', arena: 'arena', battlefield: 'battlefield' };
    this.game.deps.renderer.setEnvironment(env[z.ambience] ?? 'ashbridgeDusk', 2.5);
    if (z.ambience === 'hospice' && !this.flag(F.hospice)) { this.setFlag(F.hospice); this.session.save(); }
    if (z.ambience === 'undercroft') this.session.record('healer', 'mem_oswin');
  }

  private memoryFlash() {
    this.game.sfx('memory_trigger');
    const r = this.game.deps.renderer;
    let t = 0;
    const id = setInterval(() => { t += 0.05; r.setGrade({ memory: Math.max(0, Math.sin(Math.min(1, t / 2.5) * Math.PI)) }); if (t > 2.5) { clearInterval(id); r.setGrade({ memory: 0 }); } }, 50);
  }

  /** The current unresolved lead's location (drives the Unfinished Toll). */
  private objective(): THREE.Vector3 | null {
    const L = this.L;
    if (!this.flag(F.hatch)) return L.freshMasonry.pos;
    if (this.ws.npcs.oswin === 'imprisoned') return L.oswinCell.pos;
    if (!this.flag(F.hospice)) return L.hesper.pos;
    if (!this.flag(F.boss)) return L.fogGate.anchor.pos;
    return this.npcs.has('brannoc') && !this.flag(F.brannoc) ? L.brannoc.pos : null;
  }

  private updateToll(dt: number) {
    const p = this.game.player;
    const obj = this.objective();
    this.toll = { active: false, dir: 0, behind: false, intensity: 0 };
    if (!obj) return;
    for (const post of this.L.tollPosts) {
      const d = p.pos.distanceTo(post.pos);
      if (d > post.radius) continue;
      // pick the branch whose direction best matches the unresolved lead
      const want = obj.clone().sub(post.pos).setY(0).normalize();
      let best = post.options[0], bd = -2;
      for (const o of post.options) { const v = o.toward.clone().sub(post.pos).setY(0).normalize(); const dd = v.dot(want); if (dd > bd) { bd = dd; best = o; } }
      const dirYaw = yawOf(best.toward.x - p.pos.x, best.toward.z - p.pos.z);
      const rel = angleDiff(this.game.cam.yaw, dirYaw);
      this.toll = { active: true, dir: Math.max(-1, Math.min(1, -Math.sin(rel))), behind: Math.abs(rel) > 1.9, intensity: 1 - d / post.radius * 0.6 };
      this.tollT -= dt;
      if (this.tollT <= 0) {
        this.tollT = 5.5;
        const src = post.pos.clone().add(best.toward.clone().sub(post.pos).setY(0).normalize().multiplyScalar(10));
        src.y += 3;
        this.game.sfx('unfinished_toll', { pos: src });
        this.game.hint('toll');
      }
      break;
    }
  }

  frame(dt: number) {
    this.L.update(dt, this.time, this.game.deps.renderer.camera);
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
    const b = this.boss;
    if (b && this.fighting && !b.dead) h.boss = { name: BOSS.corvane.name, title: BOSS.corvane.title, hp01: b.hp / b.hpMax, posture01: Math.min(1, b.posture / b.postureMax), phase: this.bossPhase };
  }

  titleCamera(t: number, cam: THREE.PerspectiveCamera) {
    const s = this.L.playerStart.pos;
    const a = -0.9 + Math.sin(t * 0.05) * 0.25;
    cam.position.set(s.x + Math.sin(a) * 3, s.y + 2.2, s.z + Math.cos(a) * 3);
    cam.lookAt(s.x + 40, s.y - 6, s.z + 25);
  }

  private tween(piece: DynamicPiece, from: number, to: number, dur: number, done?: () => void) {
    this.tweens.push({ piece, from, to, t: 0, dur, done });
  }
}

function boxHas(b: THREE.Box3, p: THREE.Vector3) { return b.containsPoint(new THREE.Vector3(p.x, p.y + 0.9, p.z)); }
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
import { CLIPS } from '../../actors/anim/clips';
const CLIP_RIGID = () => CLIPS.rigid;
