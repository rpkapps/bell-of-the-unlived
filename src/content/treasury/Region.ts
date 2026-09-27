/**
 * The Undervaults — region controller (quest logic over RegionBase).
 *
 *  - The Debtors' Cage: Ione Tallow hangs over the coin pit in the Counting Deep. The Head Collector
 *    carries the Tally Key; the winch lowers the cage and frees her (→ Hospice merchant). Crossing
 *    into the Vault of Futures while she is caged writes her off (taken; persistent).
 *  - Debt collectors' grab takes Hours (30 % carried); the collector holds them (persisted per
 *    collector) until he is killed, then they return. Aurel's levy works the same way.
 *  - Coin-mimics wait disguised (breathing lid, coins askew) and spring when approached or opened;
 *    vault guardians kneel until disturbed; clockwork sentries turn on fixed quarter-turn schedules.
 *  - Shortcuts: the weigh-gate (Hall of Weights → market) and the round vault door (Antechamber →
 *    Sluice Hall); the counterweight scale bridge on the critical path. All persistent.
 *  - Treasurer Aurel Mask: four ward-coffers (breakable) project a ward (keyhole-ring overlay, rim
 *    glow, beams, captions); he summons coin-sentinels; phases 1–3; the write-off ring. Defeat:
 *    the Treasury Great Bell's lock-yoke anchor shatters and falls down the shaft.
 *  - The Mimic Sovereign (optional) guards the Hoard's alcove (Bellbronze Shard).
 *  - The Ledger of Rejected Futures records the central revelation.
 *  - The Unlived Muster: Private Dunmore wants the Greyford pay-roll (sets `muster.treasury`).
 */
import * as THREE from 'three';
import type { Game } from '../../game/Game';
import type { Session } from '../../game/Session';
import { RegionBase } from '../../game/regions/RegionBase';
import { regionInfo } from '../../game/regions/catalog';
import type { Anchor, ArenaLayout } from '../../world/levelTypes';
import type { Enemy } from '../../actors/Enemy';
import type { Boss } from '../bosses';
import type { HitResult } from '../../combat/Combat';
import { MOVES } from '../../combat/moves';
import { ENEMY_DEFS } from '../enemies';
import { DIALOGUE } from '../dialogue';
import type { TreasuryLayout } from './level';
import { WardCoffer } from './enemies';
import type { AurelBoss } from './bosses';

const F = {
  weighGate: 'treasury.weighGate', vaultDoor: 'treasury.vaultDoor', scaleBridge: 'treasury.scaleBridge', cage: 'treasury.cageLowered',
  chestMarket: 'treasury.chestMarket', treasureChest: 'treasury.treasureChest', musterMet: 'treasury.musterMet', muster: 'muster.treasury',
  boss: 'boss.aurelmask', sov: 'boss.mimicsovereign', debt: 'treasury.debt.',
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

interface WardFx { group: THREE.Group; ring: THREE.Mesh; glyphs: THREE.Mesh[]; beams: THREE.Mesh[]; mat: THREE.MeshBasicMaterial; beamMat: THREE.MeshBasicMaterial }

export class TreasuryRegion extends RegionBase {
  // Fields are created lazily: RegionBase's constructor calls setup() before subclass initialisers run.
  declare private st: {
    coffers: WardCoffer[];
    sentinels: Enemy[];
    sentryBase: Map<Enemy, { yaw: number; phase: number }>;
    risen: Set<Enemy>;
    ward: WardFx | null;
    writeoff: { mesh: THREE.Mesh; t: number; active: boolean } | null;
    lastWardCaption: number;
    markers: Map<string, THREE.Object3D>;
    collectorGlow: Set<Enemy>;
  };

  constructor(game: Game, session: Session, layout: TreasuryLayout) {
    super(game, session, layout, regionInfo('treasury')!);
    this.defaultEnvironment = 'treasuryMarket';
    this.defaultMusic = 'treasury';
  }

  private get TL() { return this.L as TreasuryLayout; }
  private get S() {
    if (!this.st) this.st = { coffers: [], sentinels: [], sentryBase: new Map(), risen: new Set(), ward: null, writeoff: null, lastWardCaption: -99, markers: new Map(), collectorGlow: new Set() };
    return this.st;
  }
  private get ione() { return this.ws.npcs.ione ?? 'imprisoned'; }
  private has(entry: string) { return this.session.journalSys.has(entry); }

  // ================================================================== persistent pieces

  protected override pieceFlags(): Record<string, string> {
    return {
      weighGate: F.weighGate, weighLever: F.weighGate, vaultDoor: F.vaultDoor, scaleBridge: F.scaleBridge, scaleLever: F.scaleBridge,
      cage: F.cage, cageWinch: F.cage, chestMarket: F.chestMarket, treasureChest: F.treasureChest, overlay: F.boss,
    };
  }

  // ================================================================== interactables & triggers

  protected setup() {
    const A = (n: string) => this.A(n);
    // ---------------------------------------------------------------- the Twofold Market
    this.inspectAt('tr_twin_stalls', 'twinStalls', 'Examine the stall', () => { this.record('twofold', 'tr_mem_market'); this.record('twofold', 'tr_obs_stalls'); });
    this.inspectAt('tr_breadline', 'tallyBoard', 'Read the tally board', () => { this.record('twofold', 'tr_mem_market'); this.record('twofold', 'tr_obs_breadline'); });
    this.inspectAt('tr_banquet', 'banquet', 'Look at the banquet', () => this.record('twofold', 'tr_obs_breadline'));
    this.pickup('tr_axe', 'woodpile', 'woodsman_axe', 1, 'Pull the axe from the woodpile');
    this.pickup('tr_resin', 'resinDoor', 'ember_resin', 2, 'Take the resin');
    this.pickup('tr_banquetScroll', 'banquet', 'imprint_ember_edge', 1, 'Take the scroll from the table');
    this.hoursPickup('tr_balconyPurse', 'balconyPurse', 1500);
    this.hoursPickup('tr_culvertPurse', 'culvertPurse', 600, () => this.session.grantItem('throwing_knife', 4));
    this.chest('chestMarket', F.chestMarket, () => { this.giveHours(900); this.session.grantItem('bellbronze_scrap', 1); });
    this.add('tr:mother', A('mother'), 2.6, () => 'Speak with the woman', () => this.talk(this.ione === 'rescued' ? 'tr_mother_after' : 'tr_mother'), false);
    this.add('tr:muster', A('musterSoldier'), 2.6, () => (this.flag(F.muster) ? null : 'Speak with the soldier'), () => void this.talkMuster(), false);
    this.onTrigger('marketMemory', () => {
      if (this.has('tr_mem_market')) return;
      this.memoryFlash();
      for (const l of DIALOGUE.tr_market_memory ?? []) this.game.deps.ui?.subtitle(l);
      this.record('twofold', 'tr_mem_market');
    });
    // coin-mimics: "Open the chest" on a disguised mimic springs it
    for (const s of this.L.enemies) if (s.kind === 'tr_mimic') {
      this.add('tr:mimic:' + s.id, s.anchor.pos, 1.9, () => {
        const e = this.enemyList.find((x) => x.e.spawnId === s.id)?.e;
        return e && !e.dead && !e.aware ? 'Open the chest' : null;
      }, () => {
        const e = this.enemyList.find((x) => x.e.spawnId === s.id)?.e;
        if (!e) return;
        e.becomeAware(this.player);
        this.springMimic(e, true);
        this.game.hint('tr_mimic');
      });
    }

    // ---------------------------------------------------------------- beneath the market
    this.pickup('tr_hammer', 'coinbreaker', 'coinbreaker_hammer', 1, 'Take the die-hammer');
    this.add('tr:vaultSealed', A('vaultDoorSealed'), 2.2, () => (this.flag(F.vaultDoor) ? null : 'Examine the round door'), () => this.inspect('tr_vault_door_sealed'));
    this.add('tr:weighLever', this.P('weighLever').anchor!, 2.0, () => (this.flag(F.weighGate) ? null : 'Pull the weigh-gate lever'), () => this.playerAct('lever', () => {
      this.tween(this.P('weighLever'), 0, 1, 0.8);
      this.game.sfx('lever_pull', { pos: this.P('weighLever').anchor!.pos });
      setTimeout(() => { this.game.sfx('gate_open', { pos: this.P('weighGate').anchor!.pos }); this.tween(this.P('weighGate'), 0, 1, 2.6); }, 400);
      this.setFlag(F.weighGate);
      this.game.hint('tr_lever');
      this.session.save();
    }));
    this.add('tr:weighBeam', V(-18, 0, -68.4), 2.4, () => 'Examine the weighing beam', () => this.inspect('tr_weigh_beam'));
    this.pickup('tr_hallScrap', 'hallScrap', 'tempered_scrap', 2, 'Take the scrap from the lectern');
    // the Counting Deep: Ione's cage
    this.onTrigger('deepMemory', () => {
      if (this.ione !== 'imprisoned' || this.has('tr_mem_ione')) return;
      this.memoryFlash();
      for (const l of DIALOGUE.tr_deep_memory ?? []) this.game.deps.ui?.subtitle(l);
      this.record('debtors_cage', 'tr_mem_ione');
    });
    this.add('tr:ioneCage', A('cage'), 3.4, () => (this.ione === 'imprisoned' && !this.flag(F.cage) ? 'Speak through the bars' : this.ione === 'taken' ? 'Examine the empty cage' : null), () => {
      if (this.ione === 'taken') { this.inspect('tr_ione_page'); return; }
      this.talk('tr_ione_cage', () => { this.record('debtors_cage', 'tr_mem_ione'); this.record('debtors_cage', 'tr_obs_debt'); });
    }, false);
    this.add('tr:pit', V(-38.4, -7.8, -91.4), 2.4, () => 'Look into the coin pit', () => this.inspect('tr_cage_pit', () => { this.record('debtors_cage', 'tr_mem_ione'); this.record('debtors_cage', 'tr_obs_cage'); }));
    this.inspectAt('tr_collectors_ledger', 'collectorsLedger', 'Read the collectors\' ledger', () => this.record('debtors_cage', 'tr_obs_debt'));
    this.add('tr:winch', this.P('cageWinch').anchor!, 2.0, () => {
      if (this.flag(F.cage) || this.ione !== 'imprisoned') return null;
      return this.pd.inventory.tally_key ? 'Unlock the winch and lower the cage' : 'The cage winch (padlocked)';
    }, () => {
      if (!this.pd.inventory.tally_key) { this.game.deps.ui?.toast('Padlocked. The Head Collector keeps the key.', 'info'); this.game.sfx('ui_error'); return; }
      this.playerAct('lever', () => this.lowerCage());
    });

    // ---------------------------------------------------------------- the strongrooms, gallery, hoard
    this.chest('treasureChest', F.treasureChest, () => { this.session.grantItem('imprint_chain_whirl'); this.giveHours(2500); });
    this.hoursPickup('tr_heapPurse', 'treasureScroll', 1200, () => this.session.grantItem('bellbronze_scrap', 1));
    this.add('tr:lockers', A('wardenLockers'), 2.2, () => (this.ws.pickups.tr_warden ? null : 'Open the wardens\' lockers'), () => this.playerAct('interact', () => {
      this.ws.pickups.tr_warden = true;
      for (const id of ['warden_bascinet', 'warden_coat', 'warden_gloves', 'warden_boots']) this.session.grantItem(id);
      this.session.save();
    }));
    this.add('tr:payroll', A('payroll'), 2.0, () => (this.ws.pickups.tr_payroll ? null : 'Open the old iron coffer'), () => this.inspect('tr_payroll', () => {
      this.ws.pickups.tr_payroll = true;
      this.session.grantItem('greyford_payroll');
      this.session.save();
    }));
    this.pickup('tr_srScrap', 'srScrap', 'tempered_scrap', 2, 'Take the scrap');
    this.pickup('tr_corridorResin', 'corridorResin', 'ember_resin', 2, 'Take the resin');
    this.pickup('tr_hoardShard', 'hoardShard', 'bellbronze_shard', 1, 'Take the bellbronze shard');
    this.pickup('tr_hoardBuckler', 'hoardBuckler', 'mint_buckler', 1, 'Take the buckler');
    this.hoursPickup('tr_hoardPurse', 'hoardPurse', 4000);
    this.add('tr:scaleLever', this.P('scaleLever').anchor!, 2.0, () => (this.flag(F.scaleBridge) ? null : 'Release the counterweight'), () => this.playerAct('lever', () => {
      this.tween(this.P('scaleLever'), 0, 1, 0.8);
      this.game.sfx('lever_pull');
      setTimeout(() => { this.game.sfx('chain_rattle'); this.tween(this.P('scaleBridge'), 0, 1, 3.4, () => { this.game.sfx('drawbridge_slam'); this.game.shake(0.25); }); }, 450);
      this.setFlag(F.scaleBridge);
      this.game.hint('tr_lever');
      this.session.save();
    }));

    // ---------------------------------------------------------------- Antechamber, Archive
    this.add('tr:vaultWheel', this.P('vaultDoor').anchor!, 2.2, () => (this.flag(F.vaultDoor) ? null : 'Turn the vault wheel'), () => this.playerAct('lever', () => {
      this.game.sfx('chain_rattle', { pos: this.P('vaultDoor').anchor!.pos });
      this.tween(this.P('vaultDoor'), 0, 1, 3.2, () => this.game.sfx('door_open'));
      this.setFlag(F.vaultDoor);
      this.session.save();
    }));
    this.inspectAt('tr_coffers', 'wallOfDebts', 'Read the wall of debts', () => { this.record('aurel_wards', 'tr_mem_wards'); this.record('aurel_wards', 'tr_obs_coffers'); });
    this.onTrigger('anteEnter', () => { if (!this.flag(F.boss)) this.record('aurel_wards', 'tr_mem_wards'); });
    this.inspectAt('tr_ledger', 'ledger', 'Read the great ledger', () => {
      this.record('revelation', 'mem_defeat');
      this.record('revelation', 'obs_ledger');
      this.memoryFlash();
      for (const l of DIALOGUE.tr_ledger_after ?? []) this.game.deps.ui?.subtitle(l);
      this.session.save();
    }, 2.6);
    this.pickup('tr_archiveScrap', 'archiveScrap', 'bellbronze_scrap', 1, 'Take the bellbronze scrap');
  }

  // ================================================================== state, spawns

  protected override applyRegionState() {
    this.placeNpcs();
    this.refreshMarkers();
  }

  protected override spawnEnemies() {
    super.spawnEnemies();
    this.prepareEnemies();
    this.spawnCoffers();
  }

  override resetEnemies() {
    super.resetEnemies();
    this.prepareEnemies();
    for (const e of this.S.sentinels) this.removeActor(e);
    this.S.sentinels = [];
    this.spawnCoffers();
    this.setWardFx(false);
  }

  /** Disguises, dormancy, watch schedules, collectors' purses. */
  private prepareEnemies() {
    const S = this.S;
    S.risen.clear();
    S.sentryBase.clear();
    let i = 0;
    for (const { e, anchor } of this.enemyList) {
      const k = e.def.kind;
      if (k === 'tr_mimic') e.startMove({ id: 'sentry_idle_loop', clip: 'trMimicDisguise', dur: 1e9 }, { fade: 0 });
      else if (k === 'tr_guardian' && e.idleAnim === 'sentryWall') e.startMove({ id: 'sentry_idle_loop', clip: 'trVgDormant', dur: 1e9 }, { fade: 0 });
      if (k === 'tr_sentry') S.sentryBase.set(e, { yaw: anchor.yaw, phase: (i++ % 4) * 0.9 });
      if (k === 'tr_collector' || k === 'tr_collectorHead') this.wireCollector(e);
    }
  }

  private wireCollector(e: Enemy) {
    const onKilled = e.onKilled;
    e.onKilled = (en) => {
      onKilled(en);
      this.repayDebt(en.spawnId, en);
      if (en.def.kind === 'tr_collectorHead' && !this.pd.inventory.tally_key && this.ione === 'imprisoned') {
        this.session.grantItem('tally_key');
        this.session.save();
      }
    };
    e.onDealtHit = (r: HitResult) => { if (r.move.id === 'tr_col_grab') this.levy(e, r); };
  }

  /** A grab that lands takes 30 % of carried Hours; the taker holds them until killed. */
  private levy(taker: Enemy, r: HitResult) {
    if (r.target !== this.player || (r.outcome !== 'hit' && r.outcome !== 'killed')) return;
    const pd = this.pd;
    const n = Math.floor(pd.hours * 0.3);
    this.game.hint('tr_grab');
    if (n <= 0) return;
    pd.hours -= n;
    const key = F.debt + taker.spawnId;
    this.setFlag(key, ((this.ws.flags[key] as number) || 0) + n);
    this.game.fx('hoursStream', this.player.chest, { count: Math.min(60, 10 + n / 40), target: taker.chest });
    this.game.sfx('hours_gain', { pos: taker.pos });
    this.game.deps.ui?.toast(`${taker.def.kind === 'aurelmask' ? 'The Treasurer' : 'The collector'} takes ${n.toLocaleString()} Hours — kill him to reclaim them`, 'warning');
    this.S.collectorGlow.add(taker);
    this.session.save();
  }

  private repayDebt(spawnId: string, from: Enemy) {
    const key = F.debt + spawnId;
    const n = (this.ws.flags[key] as number) || 0;
    if (n <= 0) return;
    delete this.ws.flags[key];
    this.pd.hours += n;
    this.game.fx('hoursStream', from.chest, { count: Math.min(60, 10 + n / 40), target: this.player.chest });
    this.game.deps.ui?.toast(`Reclaimed ${n.toLocaleString()} Hours`, 'hours');
    this.S.collectorGlow.delete(from);
    this.session.save();
  }

  private springMimic(e: Enemy, opened = false) {
    const S = this.S;
    if (S.risen.has(e) || e.dead) return;
    S.risen.add(e);
    e.startMove(MOVES.tr_mim_rise);
    if (opened) {
      // the lid snaps at whoever lifted it
      setTimeout(() => { if (!e.dead && e.move?.def.id === 'tr_mim_rise') e.startMove(MOVES.tr_mim_bite); }, 650);
    }
  }

  // ================================================================== ward-coffers & the ward

  private spawnCoffers() {
    const S = this.S, g = this.game;
    for (const c of S.coffers) this.removeActor(c);
    S.coffers = [];
    if (this.flag(F.boss)) return;
    const def = ENEMY_DEFS.tr_coffer;
    this.TL.coffers.forEach((a, i) => {
      const c = new WardCoffer(def, g, 400 + i);
      c.spawnId = 'tr_coffer' + i;
      c.home.copy(a.pos); c.homeYaw = a.yaw;
      if (g.deps.models) c.model = g.deps.models.buildEnemy(c.rig, 'tr_coffer', i);
      c.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      c.onKilled = () => this.cofferBroken(c);
      g.scene.add(c.object);
      c.resetAt(a.pos.clone(), a.yaw);
      g.enemies.push(c);
      S.coffers.push(c);
    });
    const b = this.bosses.get('aurelmask') as AurelBoss | undefined;
    if (b) b.coffers = S.coffers.length;
  }

  private cofferBroken(c: WardCoffer) {
    const alive = this.S.coffers.filter((x) => !x.dead).length;
    const b = this.bosses.get('aurelmask') as AurelBoss | undefined;
    if (b) b.coffers = alive;
    this.game.fx('goldMotes', c.chest, { count: 90, speed: 4 });
    this.game.sfx('great_bell_toll', { pos: c.pos, volume: 0.35 });
    this.game.shake(0.2);
    const ui = this.game.deps.ui;
    if (alive > 0) ui?.subtitle({ speaker: '', text: `[A ward-coffer breaks — ${alive} remain${alive === 1 ? 's' : ''}]`, duration: 3.5 });
    else ui?.subtitle({ speaker: '', text: '[The last ward-coffer breaks — the ward falls]', duration: 4 });
    if (alive === 2 && this.fight?.arena.bossId === 'aurelmask') this.summonSentinels(2);
  }

  private summonSentinels(n: number) {
    const S = this.S, g = this.game;
    S.sentinels = S.sentinels.filter((e) => !e.dead);
    const living = S.coffers.filter((c) => !c.dead);
    for (let i = 0; i < n && S.sentinels.length < 3 && living.length; i++) {
      const c = living[(i + Math.floor(this.time)) % living.length];
      const C = this.TL.arenas[0].center;
      const pos = c.pos.clone().lerp(C, 0.14);
      const e = g.spawnEnemy('tr_coinSentinel', pos, Math.atan2(C.x - pos.x, C.z - pos.z), { id: 'tr_sentinel' + Math.floor(this.time * 10) + i, leash: 30, seed: 900 + i });
      e.becomeAware(this.player);
      g.fx('goldMotes', e.chest, { count: 50, speed: 3 });
      S.sentinels.push(e);
    }
    g.sfx('stillbell_ring', { volume: 0.6 });
  }

  private removeActor(e: Enemy) {
    e.object.removeFromParent();
    const i = this.game.enemies.indexOf(e);
    if (i >= 0) this.game.enemies.splice(i, 1);
    if (this.game.cam.lock === e) this.game.cam.lock = null;
  }

  private setWardFx(on: boolean) {
    const S = this.S;
    if (!on) { if (S.ward) S.ward.group.visible = false; return; }
    if (!S.ward) S.ward = this.buildWardFx();
    S.ward.group.visible = true;
  }

  private buildWardFx(): WardFx {
    const group = new THREE.Group();
    group.name = 'tr:wardFx';
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 6, 48), mat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    // keyhole glyphs orbiting him (a shape, not just a colour)
    const key = new THREE.Shape();
    key.absarc(0, 0.12, 0.12, 0, Math.PI * 2, false);
    const slot = new THREE.Shape([new THREE.Vector2(-0.07, 0.04), new THREE.Vector2(0.07, 0.04), new THREE.Vector2(0.12, -0.28), new THREE.Vector2(-0.12, -0.28)]);
    const kg = new THREE.ShapeGeometry([key, slot]);
    const glyphs: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(kg, mat); group.add(m); glyphs.push(m); }
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffcf80, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const beams: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 5, 1, true), beamMat); this.TL.root.add(b); beams.push(b); }
    group.renderOrder = 8;
    this.TL.root.add(group);
    return { group, ring, glyphs, beams, mat, beamMat };
  }

  private updateWard() {
    const S = this.S;
    const b = this.bosses.get('aurelmask') as AurelBoss | undefined;
    const w = S.ward;
    if (!w) return;
    const on = !!b && !b.dead && b.warded && !!this.fight && this.fight.arena.bossId === 'aurelmask';
    w.group.visible = on;
    w.beams.forEach((m) => (m.visible = false));
    if (!on || !b) return;
    const t = this.time;
    const c = b.chest;
    w.group.position.set(b.pos.x, b.pos.y, b.pos.z);
    const k = b.coffers / 4;
    w.mat.opacity = 0.25 + 0.3 * k + 0.1 * Math.sin(t * 5);
    w.ring.position.y = 1.15 * b.rig.proportions.height;
    w.ring.scale.setScalar(0.8 + 0.3 * k);
    w.glyphs.forEach((g, i) => {
      const a = t * 0.9 + (i * Math.PI) / 2;
      g.visible = i < b.coffers;
      g.position.set(Math.sin(a) * 1.25, 1.2 * b.rig.proportions.height + Math.sin(t * 2 + i) * 0.1, Math.cos(a) * 1.25);
      g.rotation.y = a;
    });
    w.beamMat.opacity = 0.22 + 0.12 * Math.sin(t * 7);
    S.coffers.forEach((cf, i) => {
      const beam = w.beams[i];
      if (cf.dead) return;
      const a = cf.pos.clone().add(new THREE.Vector3(0, 1.05, 0));
      beam.visible = true;
      beam.position.copy(a).add(c).multiplyScalar(0.5);
      beam.scale.set(1, a.distanceTo(c), 1);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
    });
  }

  // ================================================================== bosses

  protected override spawnBoss(a: ArenaLayout): Boss {
    const b = super.spawnBoss(a);
    const g = this.game;
    if (a.bossId === 'aurelmask') {
      const ab = b as AurelBoss;
      ab.coffers = this.S.coffers.filter((c) => !c.dead).length || (this.flag(F.boss) ? 0 : 4);
      ab.onWardedHit = () => {
        if (this.time - this.S.lastWardCaption < 6) return;
        this.S.lastWardCaption = this.time;
        g.deps.ui?.subtitle({ speaker: '', text: `[The ward turns the blow — ${ab.coffers} coffer${ab.coffers === 1 ? '' : 's'} stand]`, duration: 3 });
        g.fx('blockSparks', ab.chest, { count: 16 });
        g.hint('tr_ward');
      };
      ab.onShockwave = (p) => { g.fx('dust', p, { count: 70, speed: 6 }); g.fx('sparks', p, { count: 24, color: 0xffd080 }); };
      ab.onEvent = (id) => this.aurelEvent(id, ab);
      ab.onDealtHit = (r: HitResult) => { if (r.move.id === 'tr_au_levy') this.levy(ab, r); };
    } else if (a.bossId === 'mimicsovereign') {
      b.onEvent = (id) => {
        if (id === 'coins') this.coinVolley(b, 5, 0.34, 16, 100);
        if (id === 'spill') g.fx('goldMotes', b.chest, { count: 140, speed: 5 });
      };
      b.onShockwave = (p) => { g.fx('dust', p, { count: 90, speed: 7 }); g.fx('sparks', p, { count: 30, color: 0xffd080 }); };
      b.startMove({ id: 'tr_sov_dormant', clip: 'trSovDormant', dur: 1e9 }, { fade: 0 });
    }
    return b;
  }

  private aurelEvent(id: string, b: AurelBoss) {
    const g = this.game;
    switch (id) {
      case 'summon': if (b.warded) this.summonSentinels(2); break;
      case 'coins': this.coinVolley(b, 3, 0.2, 19, 110); break;
      case 'writeoffMark': this.markWriteoff(b); break;
      case 'writeoff': g.fx('goldMotes', b.pos.clone().add(V(0, 0.5, 0)), { count: 160, speed: 8 }); if (this.S.writeoff) this.S.writeoff.t = 2.0; break;
      default: break;
    }
  }

  /** A fan of coins flung at the Returned (gold "shards"). */
  private coinVolley(b: Boss, n: number, spread: number, speed: number, dmg: number) {
    const g = this.game, p = this.player;
    const origin = b.chest.clone().add(new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw)).multiplyScalar(0.6));
    const aim = p.chest.clone().sub(origin).normalize();
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? 0 : -spread + (2 * spread * i) / (n - 1);
      const dir = aim.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      dir.y += 0.03;
      g.spawnProjectile({ kind: 'shard', owner: b, pos: origin.clone(), vel: dir.multiplyScalar(speed), gravity: 2.5, radius: 0.13, life: 2.4, packet: { physical: dmg * 0.6, magic: dmg * 0.4, fire: 0 }, posture: 20, poise: 25, damageKind: 'strike' });
    }
    g.sfx('throw', { pos: origin });
  }

  private markWriteoff(b: Boss) {
    const S = this.S;
    if (!S.writeoff) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.RingGeometry(5.25, 5.6, 64);
      const inner = new THREE.RingGeometry(0.6, 0.75, 24);
      const g2 = new THREE.BufferGeometry();
      const merged = mergeFlat([ring, inner]);
      g2.copy(merged);
      const mesh = new THREE.Mesh(g2, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 8;
      this.TL.root.add(mesh);
      S.writeoff = { mesh, t: 0, active: false };
    }
    const w = S.writeoff;
    w.mesh.position.set(b.pos.x, b.pos.y + 0.04, b.pos.z);
    w.t = 0; w.active = true;
    w.mesh.visible = true;
    this.game.deps.ui?.subtitle({ speaker: '', text: '[A ring of gilt spreads under the Treasurer — get clear of it]', duration: 3 });
  }

  protected override arenaWarning(a: ArenaLayout) {
    if (a.bossId === 'aurelmask') return this.ione === 'imprisoned' ? 'trAurelPrisoner' : 'trAurelPlain';
    if (a.bossId === 'mimicsovereign') return 'trHoard';
    return '';
  }

  protected override beforeArena(a: ArenaLayout) {
    if (a.bossId !== 'aurelmask') return;
    this.record('aurel_wards', 'tr_mem_wards');
    this.record('aurel_wards', 'tr_obs_coffers');
    if (this.ione === 'imprisoned') {
      this.ws.npcs.ione = 'taken';
      this.removeNpc('ione');
      this.record('debtors_cage', 'tr_conf_ione_taken');
      this.session.save();
    }
  }

  protected override async enterArena(a: ArenaLayout) {
    await super.enterArena(a);
    if (this.fight?.arena !== a) return;
    const b = this.fight.boss;
    if (a.bossId === 'aurelmask') {
      (b as AurelBoss).coffers = this.S.coffers.filter((c) => !c.dead).length;
      this.setWardFx(true);
      this.summonSentinels(2);
      this.game.deps.ui?.subtitle({ speaker: '', text: '[Aurel is warded by his coffers — break them]', duration: 4.5 });
    } else if (a.bossId === 'mimicsovereign') {
      b.startMove(MOVES.tr_sov_rise);
    }
  }

  protected override onBossPhase(id: string, phase: number, b: Boss) {
    if (id !== 'aurelmask') return;
    if (phase === 2) {
      this.setWardFx(false);
      this.game.fx('goldMotes', b.chest, { count: 160, speed: 6 });
      for (const e of this.S.sentinels) if (!e.dead) { e.hp = 0; e.react('death', e.pos); }
    }
  }

  protected override async onBossDefeated(id: string) {
    const ui = this.game.deps.ui;
    if (id === 'aurelmask') {
      this.record('aurel_wards', 'tr_conf_aurel');
      this.repayDebt('aurelmask', this.bosses.get('aurelmask') ?? this.player as unknown as Enemy);
      for (const c of this.S.coffers) this.removeActor(c);
      for (const e of this.S.sentinels) this.removeActor(e);
      this.S.coffers = []; this.S.sentinels = [];
      this.setWardFx(false);
      if (this.S.writeoff) this.S.writeoff.mesh.visible = false;
      this.tween(this.TL.overlay, 0, 1, 4);
      if (this.has('tr_mem_market') || this.has('tr_obs_stalls')) this.record('twofold', 'tr_conf_market');
      else { this.record('twofold', 'tr_mem_market'); this.record('twofold', 'tr_conf_market'); }
      await new Promise((r) => setTimeout(r, 1800));
      for (const l of DIALOGUE.tr_after_aurel ?? []) ui?.subtitle(l);
    } else if (id === 'mimicsovereign') {
      this.session.grantItem('gilded_tooth');
      ui?.subtitle({ speaker: '', text: '[The grate behind the hoard grinds open]', duration: 3.5 });
    }
    this.session.save();
  }

  override onPlayerDeath() {
    super.onPlayerDeath();
    this.setWardFx(false);
    if (this.S.writeoff) this.S.writeoff.mesh.visible = false;
  }

  // ================================================================== NPCs & quests

  private placeNpcs() {
    for (const id of ['ione', 'mother', 'child', 'dunmore']) this.removeNpc(id);
    if (this.ione === 'imprisoned') {
      const n = this.spawnNpc('ione', { pos: this.TL.cageInside(), yaw: 0.4 }, 'trCaged', 'tr_ione', { height: 0.95, bulk: 0.9, shoulder: 0.9 });
      n.lookTarget = null;
    }
    this.spawnNpc('mother', this.A('mother'), 'trHuddle', 'tr_mother', { height: 0.96, bulk: 0.86, shoulder: 0.9 });
    this.spawnNpc('child', this.A('child'), 'standPray', 'tr_child', { height: 0.62, bulk: 0.8, shoulder: 0.85 });
    if (!this.flag(F.muster)) this.spawnNpc('dunmore', this.A('musterSoldier'), 'sit', 'tr_muster');
  }

  private lowerCage() {
    const cage = this.P('cage'), winch = this.P('cageWinch');
    this.game.sfx('chain_rattle', { pos: winch.anchor!.pos });
    this.tween(winch, 0, 1, 3.0);
    this.tween(cage, 0, 1, 3.0, () => {
      this.game.sfx('door_open', { pos: this.A('cageLanded').pos });
      this.setFlag(F.cage);
      const n = this.npcs.get('ione');
      const stand = this.A('cageLanded');
      n?.teleport(stand.pos.clone().add(new THREE.Vector3(0.9, 0, 0)), Math.PI);
      n?.setIdle('trClerk');
      this.talk('tr_ione_freed', () => {
        this.ws.npcs.ione = 'rescued';
        this.record('debtors_cage', 'tr_mem_ione');
        this.record('debtors_cage', 'tr_conf_ione');
        this.game.fx('bellMotes', stand.pos.clone().add(new THREE.Vector3(0.9, 1, 0)), { count: 40 });
        this.removeNpc('ione');
        this.session.save();
      });
    });
    this.session.save();
  }

  private async talkMuster() {
    if (!this.flag(F.musterMet)) {
      await this.talk('tr_muster_first');
      this.setFlag(F.musterMet);
      this.record('unpaid_muster', 'tr_obs_dunmore');
      this.session.save();
      if (!this.pd.inventory.greyford_payroll) return;
    }
    if (!this.pd.inventory.greyford_payroll) { await this.talk('tr_muster_wait'); return; }
    await this.talk('tr_muster_paid');
    this.setFlag(F.muster);
    this.record('unpaid_muster', 'tr_conf_paid');
    const n = this.npcs.get('dunmore');
    if (n) this.game.fx('bellMotes', n.chest, { count: 50 });
    this.removeNpc('dunmore');
    this.session.save();
  }

  // ================================================================== helpers: chests, purses, markers

  private chest(piece: string, flagKey: string, reward: () => void) {
    const p = this.P(piece);
    this.add('tr:chest:' + piece, p.anchor!, 1.9, () => (this.flag(flagKey) ? null : 'Open the chest'), () => this.playerAct('interact', () => {
      this.tween(p, 0, 1, 0.9);
      this.game.sfx('chest_open', { pos: p.anchor!.pos });
      this.setFlag(flagKey);
      setTimeout(() => { reward(); this.session.save(); }, 450);
    }));
  }

  private giveHours(n: number) {
    this.pd.hours += n;
    this.game.sfx('hours_gain');
    this.game.fx('hoursStream', this.player.chest.clone().add(new THREE.Vector3(0, 0.6, 0.6)), { count: 30, target: this.player.chest });
    this.game.deps.ui?.toast(`+${n.toLocaleString()} Hours`, 'hours');
  }

  private hoursPickup(key: string, anchorName: string, amount: number, extra?: () => void) {
    this.add('pickup:' + key, this.A(anchorName), 1.8, () => (this.ws.pickups[key] ? null : 'Take the purse'), () => this.playerAct('pickup', () => {
      this.ws.pickups[key] = true;
      this.giveHours(amount);
      extra?.();
      this.refreshMarkers();
      this.session.save();
    }));
  }

  /** Small glinting purses/scrolls at pickups still in the world (hidden once taken). */
  private refreshMarkers() {
    const S = this.S;
    const spots: [string, string, 'purse' | 'item'][] = [
      ['tr_balconyPurse', 'balconyPurse', 'purse'], ['tr_culvertPurse', 'culvertPurse', 'purse'], ['tr_heapPurse', 'treasureScroll', 'purse'],
      ['tr_hoardPurse', 'hoardPurse', 'purse'], ['tr_axe', 'woodpile', 'item'], ['tr_resin', 'resinDoor', 'item'], ['tr_banquetScroll', 'banquet', 'item'],
      ['tr_hammer', 'coinbreaker', 'item'], ['tr_hallScrap', 'hallScrap', 'item'], ['tr_srScrap', 'srScrap', 'item'], ['tr_corridorResin', 'corridorResin', 'item'],
      ['tr_hoardShard', 'hoardShard', 'item'], ['tr_hoardBuckler', 'hoardBuckler', 'item'], ['tr_archiveScrap', 'archiveScrap', 'item'],
    ];
    for (const [key, an, kind] of spots) {
      let m = S.markers.get(key);
      if (!m) {
        const a = this.L.anchors[an];
        if (!a) continue;
        m = makeMarker(kind);
        // the item sits a little in front of where the player stands
        m.position.copy(a.pos).add(new THREE.Vector3(Math.sin(a.yaw) * 0.7, 0, Math.cos(a.yaw) * 0.7));
        const gr = this.game.world.groundAt(m.position.x, m.position.y + 1.2, m.position.z, 3);
        if (gr) m.position.y = gr.y;
        this.TL.root.add(m);
        S.markers.set(key, m);
      }
      m.visible = !this.ws.pickups[key];
    }
  }

  // ================================================================== per step

  protected override stepRegion(dt: number) {
    const S = this.S;
    // pickups taken through the base helper: hide their markers
    for (const [k, m] of S.markers) if (m.visible && this.ws.pickups[k]) m.visible = false;
    for (const m of S.markers.values()) if (m.visible) { m.rotation.y += dt * 0.8; const glow = m.getObjectByName('glow'); if (glow) glow.scale.setScalar(1 + Math.sin(this.time * 3 + m.position.x) * 0.15); }
    for (const { e } of this.enemyList) {
      if (e.dead) continue;
      const k = e.def.kind;
      // mimics and guardians: rise when they notice you
      if (k === 'tr_mimic' && e.aware && !S.risen.has(e)) this.springMimic(e);
      if (k === 'tr_guardian' && e.aware && !S.risen.has(e) && e.idleAnim === 'sentryWall') { S.risen.add(e); e.startMove(MOVES.tr_vg_wake); }
      // clockwork sentries keep a deterministic watch: a quarter turn every 3.5 s
      if (k === 'tr_sentry' && !e.aware) {
        const b = S.sentryBase.get(e);
        if (b) { const q = Math.floor((this.time + b.phase) / 3.5) % 4; e.homeYaw = b.yaw + q * (Math.PI / 2); }
      }
      if (S.collectorGlow.has(e)) e.model?.setStatusGlow('buff', 0.8);
    }
    // Ione rides the cage
    if (this.ione === 'imprisoned' && !this.flag(F.cage)) {
      const n = this.npcs.get('ione');
      if (n) { const p = this.TL.cageInside(); n.pos.copy(p); n.object.position.copy(p); }
    }
    for (const e of S.sentinels) if (e.dead && e.deathT > 3) this.removeActor(e);
    S.sentinels = S.sentinels.filter((e) => this.game.enemies.includes(e));
    this.updateWard();
    const w = S.writeoff;
    if (w?.active) {
      w.t += dt;
      const m = w.mesh.material as THREE.MeshBasicMaterial;
      if (w.t < 2.0) m.opacity = 0.15 + 0.6 * (w.t / 2) + 0.1 * Math.sin(w.t * 18);
      else { m.opacity = Math.max(0, 0.9 - (w.t - 2.0) * 1.5); if (m.opacity <= 0) { w.active = false; w.mesh.visible = false; } }
    }
  }

  override frame(dt: number) {
    super.frame(dt);
    // the ward's rim glow (drawn after the game's per-enemy status pass)
    const b = this.bosses.get('aurelmask') as AurelBoss | undefined;
    if (b && !b.dead && b.warded && this.fight) b.model?.setStatusGlow('ward', 0.7 + 0.3 * Math.sin(this.time * 4));
    for (const e of this.S.collectorGlow) if (!e.dead) e.model?.setStatusGlow('buff', 0.8);
  }

  // ================================================================== the Unfinished Toll

  protected override objective(): THREE.Vector3 | null {
    const A = (n: string) => this.L.anchors[n]?.pos ?? null;
    if (this.ione === 'imprisoned' && !this.flag(F.cage) && (this.has('tr_mem_ione') || this.has('tr_obs_debt'))) {
      return this.pd.inventory.tally_key ? this.P('cageWinch').anchor!.pos : A('cage');
    }
    if (this.flag(F.musterMet) && !this.flag(F.muster)) return this.pd.inventory.greyford_payroll ? A('musterSoldier') : A('payroll');
    if (!this.has('obs_ledger')) return A('ledger');
    if (!this.flag(F.boss)) return this.TL.arenas[0].fogGate.anchor.pos;
    return null;
  }

  /** Tools: the move registry (screenshots/tests start moves by id). */
  debugMoves() { return MOVES; }

  override titleCamera(t: number, cam: THREE.PerspectiveCamera) {
    const a = t * 0.03;
    cam.position.set(Math.sin(a) * 6 + 2, 6, 10 + Math.cos(a) * 4);
    cam.lookAt(6, 22, -110);
  }
}

// ------------------------------------------------------------------ small utils

function makeMarker(kind: 'purse' | 'item'): THREE.Group {
  const g = new THREE.Group();
  g.name = 'tr:pickupMarker';
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 6), glowMat);
  glow.name = 'glow';
  glow.position.y = 0.12;
  g.add(glow);
  if (kind === 'purse') {
    const purse = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8).scale(1, 0.9, 1), new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.9 }));
    purse.position.y = 0.12;
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 }));
    tie.position.y = 0.26;
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 10), new THREE.MeshStandardMaterial({ color: 0xd8a848, metalness: 1, roughness: 0.35 }));
    coin.position.set(0.14, 0.01, 0.05);
    g.add(purse, tie, coin);
  } else {
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.8 }));
    wrap.position.y = 0.06;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb08030, metalness: 0.8, roughness: 0.4 }));
    band.position.y = 0.06;
    g.add(wrap, band);
  }
  return g;
}

function mergeFlat(list: THREE.BufferGeometry[]) {
  const n = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let c = 0; for (const g of n) c += g.attributes.position.count;
  const pos = new Float32Array(c * 3);
  let o = 0;
  for (const g of n) { pos.set(g.attributes.position.array as Float32Array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return out;
}

export type { Anchor };
