/**
 * Session: the game's flow and persistence (title → new/continue → play), resting, travel, death and
 * the Last Breath, pickups, saving — and the UIHost the menus talk to.
 */
import * as THREE from 'three';
import type { Game } from './Game';
import type { IUI, UIHost, SaveSummary, TravelDestination, FlaskState, UpgradeOption, ShopEntry, MemoryReward, PracticeTopic, EquipmentView } from '../ui/contract';
import type { IAudio } from '../audio/contract';
import type { Settings } from './settings';
import type { Attributes, EquipSlot, InventoryEntry, ItemKind, JournalLead, OriginDef, OriginId, PlayerSheet, SpellDef, TechniqueDef } from './types';
import { ATTRIBUTE_FLOOR, ATTRIBUTES } from './types';
import { SaveSystem } from '../systems/Save';
import { newWorldState, type WorldState } from '../systems/WorldState';
import { Journal } from '../systems/Journal';
import { addItem, derive, inventoryEntries, item, newPlayerData, refillFlasks, removeItem, sheet, type PlayerData } from '../systems/PlayerData';
import { ORIGINS } from '../content/origins';
import { ITEMS, SHOP_STOCK, TECHNIQUES } from '../content/items';
import { SPELLS } from '../content/spells';
import { PRACTICE_TOPICS } from '../content/practice';
import { MEMORY_REWARDS, DEATH_TEXT, formatActions } from '../content/text';
import { levelCost, levelOf, levelRangeCost, attackRating } from '../combat/stats';
import { INTRO_CARDS } from '../content/dialogue';

export interface Region {
  readonly id: string;
  readonly name: string;
  stillbells(): { id: string; name: string; pos: THREE.Vector3; yaw: number }[];
  /** Place persistent state (flags, NPC fates, pickups) into the world. */
  applyState(): void;
  /** Respawn ordinary enemies (rest/death). */
  resetEnemies(): void;
  /** Where the Last Breath goes when the player dies at `pos`. */
  lastBreathPos(pos: THREE.Vector3): THREE.Vector3;
  /** Is it safe to save the exact position here (not in a boss fight)? */
  safeToResume(pos: THREE.Vector3): boolean;
  step(dt: number): void;
  frame(dt: number): void;
  onRest(stillbellId: string): void;
  onPlayerDeath(): void;
  /** Title vista camera. */
  titleCamera(t: number, cam: THREE.PerspectiveCamera): void;
}

const EQUIP_KINDS: Record<string, ItemKind[]> = {
  right: ['weapon', 'catalyst', 'bow'], left: ['weapon', 'shield', 'catalyst', 'bow'],
  head: ['armor'], body: ['armor'], arms: ['armor'], legs: ['armor'], talisman: ['talisman'], quick: ['consumable'], spell: [],
};

export class Session implements UIHost {
  pd!: PlayerData;
  ws!: WorldState;
  readonly journalSys: Journal;
  readonly saves = new SaveSystem();
  region: Region | null = null;
  atBell: { id: string; name: string } | null = null;
  private autosaveT = 0;
  private lastBreathFx: { stop(): void } | null = null;
  private lastBreathObj: THREE.Object3D | null = null;
  playing = false;
  /** Development: skip the opening cinematic. */
  skipIntro = false;

  constructor(readonly game: Game, readonly ui: IUI, readonly audio: IAudio | null, private settingsRef: Settings, private saveSettings: () => void) {
    this.journalSys = new Journal(() => this.ws);
  }
  get input() { return this.game.input; }

  // ------------------------------------------------------------------ title / session

  hasSave() { return this.saves.exists(); }
  saveSummary(): SaveSummary | null {
    const s = this.saves.load();
    if (!s) return null;
    const o = ORIGINS.find((x) => x.id === s.player.origin);
    return { level: levelOf(s.player.attributes), location: s.world.region === 'ashbridge' ? 'Ashbridge' : s.world.region, playtime: s.world.playtime, origin: o?.name ?? '', savedAt: s.savedAt };
  }
  origins(): OriginDef[] { return ORIGINS; }

  newGame(origin: OriginId) {
    this.pd = newPlayerData(origin);
    this.ws = newWorldState();
    this.startPlay(null, true);
  }
  continueGame() {
    const s = this.saves.load();
    if (!s) { this.ui.toast('No save found.', 'warning'); return; }
    this.pd = s.player; this.ws = s.world;
    this.startPlay(s.position, false);
  }

  private async startPlay(position: { pos: [number, number, number]; yaw: number } | null, fresh: boolean) {
    const g = this.game;
    this.ui.closeAll();
    this.audio?.setMusic('none', 1.5);
    await this.ui.fade(1, 0.8);
    if (fresh && !this.skipIntro) {
      this.game.mode = 'cinematic';
      this.ui.fade(0, 0.1);
      this.audio?.setMusic('intro', 1);
      await this.ui.cinematic(INTRO_CARDS);
      await this.ui.fade(1, 0.01);
    }
    const r = this.region!;
    r.applyState();
    const bell = r.stillbells().find((b) => b.id === this.ws.lastStillbell) ?? r.stillbells()[0];
    const pos = position ? new THREE.Vector3(...position.pos) : bell.pos.clone();
    const yaw = position ? position.yaw : bell.yaw;
    const p = g.createPlayer(this.pd, pos, yaw);
    this.ws.stillbells[bell.id] = true;
    r.resetEnemies();
    this.placeLastBreath();
    g.mode = 'play';
    this.playing = true;
    this.ui.setHudVisible(true);
    this.input.setPointerLock(true);
    this.audio?.setMusic('ashbridge', 3);
    if (fresh) {
      p.startMove({ id: 'rise', clip: 'rise', dur: 1.4, speed: 0.6 });
      // He wakes knowing what he came to prevent.
      this.journalSys.record('betrayal', 'mem_gate');
      this.save();
    }
    await this.ui.fade(0, 1.6);
    if (fresh) { this.game.hint('move'); setTimeout(() => this.game.hint('camera'), 6000); }
  }

  quitToTitle() {
    if (this.playing) this.save();
    this.playing = false;
    this.game.mode = 'title';
    this.ui.closeAll();
    this.ui.setHudVisible(false);
    this.input.setPointerLock(false);
    this.audio?.setMusic('title', 2);
    this.ui.showTitle();
  }

  // ------------------------------------------------------------------ save

  save() {
    if (!this.pd || !this.ws || !this.game.player) return;
    const p = this.game.player;
    this.pd.hp = p.hp; this.pd.focus = p.focus;
    const safe = !p.dead && p.grounded && this.region!.safeToResume(p.pos);
    const ok = this.saves.write({ player: this.pd, world: this.ws, position: safe ? { pos: [p.pos.x, p.pos.y, p.pos.z], yaw: p.yaw } : null });
    if (!ok) this.ui.toast('Saving failed: ' + (this.saves.lastError ?? 'unknown'), 'warning');
  }

  /** Per-sim-step bookkeeping (called by the game loop through the region hook). */
  tick(dt: number) {
    if (!this.playing) return;
    this.ws.playtime += dt;
    this.autosaveT += dt;
    if (this.autosaveT > 60 && this.game.mode === 'play' && !this.game.player.dead && !this.game.player.move) { this.autosaveT = 0; this.save(); }
    // Last Breath recovery
    const lb = this.ws.lastBreath;
    if (lb && !this.game.player.dead) {
      const d = this.game.player.pos.distanceTo(new THREE.Vector3(...lb.pos));
      if (d < 1.3) {
        this.pd.hours += lb.hours;
        this.ui.toast(`Recovered ${lb.hours.toLocaleString()} Hours`, 'hours');
        this.audio?.play('last_breath_recover');
        this.game.fx('hoursStream', new THREE.Vector3(...lb.pos).add(new THREE.Vector3(0, 1, 0)), { count: 60, target: this.game.player.chest });
        this.ws.lastBreath = null;
        this.placeLastBreath();
        this.save();
      }
    }
  }

  private placeLastBreath() {
    this.lastBreathFx?.stop(); this.lastBreathFx = null;
    if (this.lastBreathObj) { this.game.scene.remove(this.lastBreathObj); this.lastBreathObj = null; }
    const lb = this.ws.lastBreath;
    if (!lb) return;
    const pos = new THREE.Vector3(...lb.pos);
    const grp = new THREE.Group();
    grp.position.copy(pos);
    const light = new THREE.PointLight(0xffd79a, 4, 7, 2); light.position.y = 0.8; grp.add(light);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe6b0 }));
    orb.position.y = 0.7; grp.add(orb);
    this.game.scene.add(grp);
    this.lastBreathObj = grp;
    this.lastBreathFx = this.game.deps.particles?.attach('bellMotes', pos.clone().add(new THREE.Vector3(0, 0.7, 0)), 18) ?? null;
  }

  // ------------------------------------------------------------------ death

  async onPlayerDeath() {
    const g = this.game;
    const p = g.player;
    this.region?.onPlayerDeath();
    await wait(1800);
    this.ui.banner('death', DEATH_TEXT);
    await wait(2600);
    await this.ui.fade(1, 1.2);
    // Last Breath: unspent Hours stay where he fell; a previous unrecovered Breath is lost.
    if (this.pd.hours > 0) {
      const at = this.region!.lastBreathPos(p.pos.clone());
      this.ws.lastBreath = { pos: [at.x, at.y, at.z], hours: this.pd.hours };
    } else this.ws.lastBreath = null;
    this.pd.hours = 0;
    this.respawnAtBell(this.ws.lastStillbell, true);
    this.save();
    await this.ui.fade(0, 1.4);
  }

  private respawnAtBell(bellId: string, reform: boolean) {
    const g = this.game;
    const r = this.region!;
    const bell = r.stillbells().find((b) => b.id === bellId) ?? r.stillbells()[0];
    const p = g.player;
    p.dead = false; p.move = null; p.buffs.clear();
    p.refresh();
    p.hp = p.hpMax; p.focus = p.focusMax; p.stamina = p.staminaMax;
    refillFlasks(this.pd);
    p.teleport(bell.pos.clone(), bell.yaw);
    g.cam.lock = null;
    g.cam.snapBehind(p);
    r.resetEnemies();
    this.placeLastBreath();
    if (reform) p.startMove({ id: 'reform', clip: 'reform', dur: 1.6 });
    g.mode = 'play';
  }

  // ------------------------------------------------------------------ Stillbell

  restAt(bellId: string, name: string) {
    const g = this.game, p = g.player;
    const first = !this.ws.stillbells[bellId];
    this.ws.stillbells[bellId] = true;
    this.ws.lastStillbell = bellId;
    p.startMove({ id: 'rest', clip: 'rest', dur: 1e9, fade: 0.4 });
    p.hp = p.hpMax; p.focus = p.focusMax; p.buffs.clear();
    refillFlasks(this.pd);
    this.region!.resetEnemies();
    this.region!.onRest(bellId);
    this.audio?.play('stillbell_rest');
    if (first) this.ui.banner('stillbellLit', 'STILLBELL KINDLED', name);
    this.atBell = { id: bellId, name };
    this.save();
    this.game.mode = 'menu';
    this.game.menuHoldUntil = this.game.now + (first ? 2.0 : 0.9);
    this.input.releaseAll();
    this.input.setPointerLock(false);
    setTimeout(() => this.ui.showStillbell(), first ? 1600 : 500);
  }

  atStillbell() { return this.atBell; }
  leaveStillbell() {
    this.atBell = null;
    this.ui.closeAll();
    const p = this.game.player;
    p.startMove({ id: 'rise', clip: 'rise', dur: 0.8 });
    this.game.resumePlay();
    this.save();
  }
  flask(): FlaskState { return { total: this.pd.flask.total, health: this.pd.flask.health, focus: this.pd.flask.focusCharges }; }
  setFlaskSplit(health: number) {
    const f = this.pd.flask;
    f.health = Math.max(0, Math.min(f.total, Math.round(health)));
    f.focusCharges = f.total - f.health;
    refillFlasks(this.pd);
  }
  destinations(): TravelDestination[] {
    return (this.region?.stillbells() ?? []).map((b) => ({ id: b.id, name: b.name, region: this.region!.name, unlocked: !!this.ws.stillbells[b.id], current: this.atBell?.id === b.id }));
  }
  async travel(id: string) {
    if (!this.ws.stillbells[id]) return;
    this.ui.closeAll();
    await this.ui.fade(1, 0.8);
    this.ws.lastStillbell = id;
    this.respawnAtBell(id, false);
    const bell = this.region!.stillbells().find((b) => b.id === id)!;
    this.atBell = { id, name: bell.name };
    this.game.player.startMove({ id: 'rest', clip: 'rest', dur: 1e9, fade: 0 });
    this.game.mode = 'menu';
    this.game.menuHoldUntil = this.game.now + 2.5;
    this.save();
    await this.ui.fade(0, 0.8);
    this.ui.showStillbell();
  }

  // ------------------------------------------------------------------ character

  getSettings() { return this.settingsRef; }
  applySettings(s: Settings) {
    if (s !== this.settingsRef) Object.assign(this.settingsRef, s);
    this.game.deps.renderer.applySettings(this.settingsRef.graphics);
    this.audio?.setVolumes(this.settingsRef.audio);
    this.saveSettings();
  }
  sheet(): PlayerSheet { this.syncVitals(); return sheet(this.pd); }
  private syncVitals() { const p = this.game.player; if (p) { this.pd.hp = p.hp; this.pd.focus = p.focus; } }

  previewAttributes(a: Attributes) {
    const cur = levelOf(this.pd.attributes), next = levelOf(a);
    const trial: PlayerData = { ...this.pd, attributes: { ...a } };
    let valid = true, reason: string | undefined;
    for (const k of ATTRIBUTES) {
      if (a[k] < ATTRIBUTE_FLOOR) { valid = false; reason = `Attributes cannot go below ${ATTRIBUTE_FLOOR}.`; }
      if (a[k] > 99) { valid = false; reason = 'Attributes cannot exceed 99.'; }
    }
    const hoursCost = next > cur ? levelRangeCost(cur, next) : 0;
    if (next < cur) { valid = false; reason = `Assign all freed points (${cur - next} remaining).`; }
    if (hoursCost > this.pd.hours) { valid = false; reason = 'Not enough Hours.'; }
    if (!this.atBell) { valid = false; reason = 'Only at a Stillbell.'; }
    return { sheet: sheet(trial), hoursCost, valid, reason };
  }
  commitAttributes(a: Attributes) {
    const pv = this.previewAttributes(a);
    if (!pv.valid) return false;
    this.pd.hours -= pv.hoursCost;
    this.pd.attributes = { ...a };
    const p = this.game.player;
    p.refresh(); p.hp = p.hpMax; p.focus = p.focusMax;
    this.audio?.play('ui_levelup');
    this.save();
    return true;
  }

  knownSpells(): SpellDef[] { return this.pd.knownSpells.map((s) => SPELLS[s]).filter(Boolean); }
  attunedSpells() { return [this.pd.equipment.spell0, this.pd.equipment.spell1, this.pd.equipment.spell2]; }
  attuneSpell(slot: number, spellId: string | null) {
    if (!this.atBell) return;
    (this.pd.equipment as any)['spell' + slot] = spellId;
    this.pd.activeSpell = 0;
  }
  techniques(): TechniqueDef[] { return this.pd.techniques.map((t) => TECHNIQUES[t]).filter(Boolean); }
  imprintOptions(itemId: string) {
    const d = ITEMS[itemId];
    const cls = d?.shield ? 'shield' : d?.weapon?.class;
    const cur = this.pd.imprints[itemId] ?? d?.weapon?.technique ?? d?.shield?.technique ?? null;
    return { current: cur, options: this.techniques().filter((t) => cls && (t.compatible as string[]).includes(cls)) };
  }
  imprint(itemId: string, techniqueId: string) {
    if (!this.atBell || !this.imprintOptions(itemId).options.some((t) => t.id === techniqueId)) return false;
    this.pd.imprints[itemId] = techniqueId;
    this.save();
    return true;
  }
  pendingMemories() {
    return inventoryEntries(this.pd, (d) => d.kind === 'memory').map((e) => ({ id: e.id, bossName: e.def.name, rewards: (MEMORY_REWARDS[e.id] ?? []) as MemoryReward[] }));
  }
  exchangeMemory(memoryId: string, rewardId: string) {
    if (!this.atBell || !removeItem(this.pd, memoryId)) return false;
    if (rewardId.startsWith('hours:')) this.pd.hours += parseInt(rewardId.slice(6));
    else if (TECHNIQUES[rewardId]) { if (!this.pd.techniques.includes(rewardId)) this.pd.techniques.push(rewardId); }
    else if (ITEMS[rewardId]) addItem(this.pd, rewardId);
    this.audio?.play('ui_levelup');
    this.save();
    return true;
  }

  // ------------------------------------------------------------------ equipment

  equipment(): EquipmentView {
    const slots = {} as Record<EquipSlot, InventoryEntry | null>;
    for (const [s, id] of Object.entries(this.pd.equipment) as [EquipSlot, string | null][]) {
      const d = item(id);
      slots[s] = d ? { id: d.id, count: this.pd.inventory[d.id]?.count ?? 1, upgrade: this.pd.inventory[d.id]?.upgrade ?? 0, def: d } : null;
    }
    return { slots, candidates: (slot) => this.candidates(slot) };
  }
  private candidates(slot: EquipSlot): InventoryEntry[] {
    const base = slot.replace(/\d$/, '');
    if (base === 'spell') return [];
    const kinds = EQUIP_KINDS[base] ?? [];
    return inventoryEntries(this.pd, (d) => kinds.includes(d.kind) && (base !== 'head' && base !== 'body' && base !== 'arms' && base !== 'legs' || d.armor?.slot === base) && (base !== 'quick' || !!d.consumable));
  }
  inventory(kind?: ItemKind) { return inventoryEntries(this.pd, kind ? (d) => d.kind === kind : undefined); }
  equip(slot: EquipSlot, itemId: string | null) {
    if (itemId && !this.candidates(slot).some((c) => c.id === itemId)) return;
    // an item can only occupy one hand slot
    if (itemId) for (const s of Object.keys(this.pd.equipment) as EquipSlot[]) if (s !== slot && this.pd.equipment[s] === itemId && !s.startsWith('quick')) this.pd.equipment[s] = null;
    this.pd.equipment[slot] = itemId;
    const p = this.game.player;
    p.refresh();
    this.game.dressPlayer();
  }

  // ------------------------------------------------------------------ smith & shop

  upgradeOptions(): UpgradeOption[] {
    const out: UpgradeOption[] = [];
    for (const e of inventoryEntries(this.pd, (d) => !!d.weapon?.maxUpgrade)) {
      const max = e.def.weapon!.maxUpgrade;
      const lvl = e.upgrade, to = lvl + 1;
      const mat = to <= 5 ? 'tempered_scrap' : 'bellbronze_scrap';
      const need = to <= 5 ? to : to - 5;
      const hours = 250 * to;
      const have = this.pd.inventory[mat]?.count ?? 0;
      const ar = (u: number) => Math.round(attackRating(e.def, u, this.pd.attributes).total);
      out.push({ itemId: e.id, name: e.def.name, icon: e.id, from: lvl, to, materials: [{ id: mat, name: ITEMS[mat]?.name ?? mat, have, need }], hours, affordable: lvl < max && have >= need && this.pd.hours >= hours, maxed: lvl >= max, preview: { attack: [ar(lvl), ar(Math.min(max, to))] } });
    }
    return out;
  }
  upgrade(itemId: string) {
    const o = this.upgradeOptions().find((x) => x.itemId === itemId);
    if (!o || !o.affordable) return false;
    removeItem(this.pd, o.materials[0].id, o.materials[0].need);
    this.pd.hours -= o.hours;
    this.pd.inventory[itemId].upgrade++;
    this.audio?.play('forge_hammer');
    this.game.player.refresh();
    this.save();
    return true;
  }
  shop(npcId: string): ShopEntry[] {
    return (SHOP_STOCK[npcId] ?? []).filter((s) => !s.requiresFlag || this.ws.flags[s.requiresFlag]).map((s) => {
      const bought = (this.ws.flags[`shop.${npcId}.${s.itemId}`] as number) ?? 0;
      const d = ITEMS[s.itemId];
      return { itemId: s.itemId, name: d?.name ?? s.itemId, icon: s.itemId, price: d?.price ?? 100, stock: s.stock === null ? null : Math.max(0, s.stock - bought), description: d?.description ?? '' };
    });
  }
  buy(npcId: string, itemId: string) {
    const e = this.shop(npcId).find((x) => x.itemId === itemId);
    if (!e || (e.stock !== null && e.stock <= 0) || this.pd.hours < e.price) return false;
    this.pd.hours -= e.price;
    this.grantItem(itemId, 1, true);
    const k = `shop.${npcId}.${itemId}`;
    this.ws.flags[k] = ((this.ws.flags[k] as number) ?? 0) + 1;
    this.save();
    return true;
  }

  /** Give an item, unlocking spells/techniques from books & scrolls. */
  grantItem(id: string, count = 1, quiet = false) {
    const d = ITEMS[id];
    if (!d) return;
    if (d.spellbook) { if (!this.pd.knownSpells.includes(d.spellbook.spell)) this.pd.knownSpells.push(d.spellbook.spell); }
    if (d.imprint) { if (!this.pd.techniques.includes(d.imprint.technique)) this.pd.techniques.push(d.imprint.technique); }
    if (d.consumable?.effect === 'flaskCharge') { this.pd.flask.total += 1; this.pd.flask.health += 1; this.pd.flask.leftHealth += 1; }
    addItem(this.pd, id, count);
    if (!quiet) { this.ui.toast(count > 1 ? `${d.name} ×${count}` : d.name, 'item', id); this.audio?.play('pickup'); }
    this.game.player?.refresh();
  }

  // ------------------------------------------------------------------ journal & misc

  journal(): JournalLead[] { return this.journalSys.leads(); }
  record(lead: string, entry: string) {
    if (this.journalSys.record(lead, entry)) {
      this.ui.toast('Journal updated', 'journal');
      this.audio?.play('journal_update');
      this.game.hint('journal');
    }
  }
  practiceTopics(): PracticeTopic[] {
    const g = (a: any) => this.input.glyph(a);
    return PRACTICE_TOPICS.map((t) => ({ ...t, body: t.body.map((b) => formatActions(b, g, this.input.device)) }));
  }
  resume() { this.ui.closeAll(); this.game.resumePlay(); }
  playtime() { return this.ws?.playtime ?? 0; }
  nextLevelCost() { return levelCost(derive(this.pd).level); }

  uiSound(cue: Parameters<NonNullable<UIHost['uiSound']>>[0]) { this.audio?.play(cue); }
  hintSeen(id: string) { return !!this.ws?.hints.includes(id); }
  markHintSeen(id: string) { if (this.ws && !this.ws.hints.includes(id)) this.ws.hints.push(id); }
  discoveredAreas() { return this.ws?.areas ?? []; }
  currentArea() { return (this.region as any)?.currentAreaName?.() ?? this.region?.name ?? ''; }
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
