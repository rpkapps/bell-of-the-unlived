/**
 * Siegeholm — the Royal Army's region controller (quest logic on top of RegionBase).
 *
 * Leads:
 *  - The Eastern Magazine (Forememory): Remembered on entering the magazine yard (the powder-master
 *    Rook Tallis betrayed the magazine and was hanged); Observed: the living guards, the order in a
 *    hand that is not the Marshal's (contradicts), Tallis alive behind the barred door. Intervention:
 *    lift the bar → Tallis rescued (Hospice quartermaster, the Siegeholm Sash). Crossing into the
 *    Ram-Knight's passage while he is still locked in → the magazine goes up (persistent ruin, loss).
 *  - The Siege That Never Ended: the victory monument vs the graves of the same night, the lime pit
 *    by the triumphal arch, the Hall of the Last Feast; resolved when Marshal Varr falls.
 *  - The Unlived Muster: the Greyford soldier at the monument; bring him the muster roll from the
 *    lime ossuary → `muster.army`.
 * Mechanics wired here: pike-wall formations, the gate bombard (sightline artillery), twice-slain
 * (in their class), the Ram-Knight's wall stagger (boss class), Varr's volley from the towers.
 * Shortcuts: the Postern (casemate → Siege Road) and the Eastern Lane portcullis (ward → magazine).
 */
import * as THREE from 'three';
import type { Game } from '../../game/Game';
import type { Session } from '../../game/Session';
import type { ArenaLayout } from '../../world/levelTypes';
import { RegionBase } from '../../game/regions/RegionBase';
import type { RegionInfo } from '../../game/regions/catalog';
import type { Boss } from '../bosses';
import { registerDialogue, DIALOGUE } from '../dialogue';
import { spawnArmyEnemy, Formation, Pikeman, Shells, Battery } from './enemies';
import type { ArmyLayout } from './level';

const DIALOGUE_LINES = (k: string) => DIALOGUE[k] ?? [];
const RETURNED = 'The Returned', TALLIS = 'Rook Tallis', VARR = 'Marshal Ysolde Varr', ODERIC = 'Oderic, the Ram-Knight', MUSTER = 'Greyford Soldier';

registerDialogue({
  oderic_intro: [
    { speaker: ODERIC, text: 'The gate held. The gate broke. Either way, I am the one who stands in it.', duration: 5 },
  ],
  oderic_phase2: [
    { speaker: ODERIC, text: 'Again. The ram goes in again. It always goes in again.', duration: 4 },
  ],
  oderic_death: [
    { speaker: ODERIC, text: 'Which of me… opened it…', duration: 4 },
  ],
  varr_intro: [
    { speaker: VARR, text: 'So the deserter comes back to the gate. I have held it nine winters. I will hold it a tenth.', duration: 5 },
    { speaker: VARR, text: 'Siegeholm stands because it has never lost. Not once. Not even tonight.', duration: 5 },
  ],
  varr_phase2: [
    { speaker: VARR, text: 'The banner burns. It burned before, and we won then too.', duration: 4.5 },
    { speaker: VARR, text: 'If the siege ends, the kingdom ends with it. Stand still and let me win it.', duration: 5 },
  ],
  varr_death: [
    { speaker: VARR, text: 'You opened it… Nine winters, and it was always going to be you at the gate.', duration: 5 },
    { speaker: VARR, text: 'Ring nothing for me. Let them think we won.', duration: 5 },
  ],
  army_arrival: [
    { speaker: RETURNED, text: 'Siegeholm. I remember the bells for its relief. I remember the smoke of its fall. The same night.', duration: 6 },
  ],
  army_magazine_memory: [
    { speaker: RETURNED, text: 'The eastern magazine. This is where it ended: the night it went up, and the man they hanged for it.', duration: 6 },
  ],
  army_feast_memory: [
    { speaker: RETURNED, text: 'Tables set for a victory, then turned over for a last stand. Nobody cleared either.', duration: 5.5 },
  ],
  army_pit_memory: [
    { speaker: RETURNED, text: 'They built the arch facing away from this.', duration: 4 },
  ],
  army_magazine_blast: [
    { speaker: RETURNED, text: 'The magazine… Tallis.', duration: 4 },
  ],
  army_bell_silent: [
    { speaker: RETURNED, text: 'The Army\'s bell is silent. Somewhere, a siege is finally over.', duration: 6 },
  ],
  army_oderic_after: [
    { speaker: RETURNED, text: 'The passage is open. The Upper Ward, and above it the keep.', duration: 4.5 },
  ],
  tallis_door: [
    { speaker: TALLIS, text: 'Who\'s out there? If it\'s the watch, tell whoever wrote that order I can smell the match.' },
    { speaker: RETURNED, text: 'I am not the watch.' },
    { speaker: TALLIS, text: 'Then listen. They barred me in with the powder. The seal is the Marshal\'s, but she never wrote it. I know her hand.' },
    { speaker: TALLIS, text: 'The bar lifts from your side. Quickly, before second bell. That is when they light it.' },
  ],
  tallis_freed: [
    { speaker: TALLIS, text: 'Air. Cold, blessed air. No, leave the match to me, I know where it runs.' },
    { speaker: TALLIS, text: 'In the other history they say I did this. Perhaps they already have.' },
    { speaker: RETURNED, text: 'Not in this one.' },
    { speaker: TALLIS, text: 'The healers keep a refuge, the Quiet Hour. I will take my tools there. Come and buy bolts from a dead man.' },
  ],
  muster_army_first: [
    { speaker: MUSTER, text: 'Captain? No… you have the look, but not the scars. Forgive me.' },
    { speaker: MUSTER, text: 'Every regiment of the relief is on this stone. The Greyford column marched in first. We are not here.' },
    { speaker: MUSTER, text: 'Our roll went into the ossuary with our dead, behind the bailey\'s east wall. If it still exists, so do we.' },
  ],
  muster_army_roll: [
    { speaker: RETURNED, text: 'I found your roll.' },
    { speaker: MUSTER, text: 'Hald. Moray. Tessin. Ivo, Brannoc\'s cousin… They were here. We were here.' },
    { speaker: MUSTER, text: 'Tell Sergeant Brannoc the Siegeholm company stands. I will hold this road for you, Captain, whatever the stone says.' },
  ],
  muster_army_after: [
    { speaker: MUSTER, text: 'The road is held, Captain.' },
  ],
});

const _occA = new THREE.Vector3(), _occB = new THREE.Vector3();

const F = {
  postern: 'army.postern',
  eastGate: 'army.eastGate',
  magOpen: 'army.magazineOpen',
  magBlown: 'army.magazineBlown',
  muster: 'muster.army',
  musterMet: 'army.musterMet',
  arrival: 'army.arrived',
  reveal: 'army.bellRevealed',
};

export class ArmyRegion extends RegionBase {
  override defaultEnvironment = 'armySnow';
  override defaultMusic = 'army' as const;
  private formations: Formation[] = [];
  private shells!: Shells;
  private battery: Battery | null = null;
  private blastT = -1;
  private get AL() { return this.L as ArmyLayout; }

  constructor(game: Game, session: Session, L: ArmyLayout, info: RegionInfo) {
    super(game, session, L, info);
    this.shells = new Shells(game, L.root);
  }

  // ------------------------------------------------------------------ setup: interactables & triggers

  protected setup() {
    // pickups (item positions); `after` grants the rest of a cache
    const grant = (id: string, n = 1) => () => this.session.grantItem(id, n);
    this.pickup('army.arbalest', 'arbalest', 'garrison_arbalest', 1, 'Take the arbalest', () => { this.session.grantItem('iron_bolt', 20); this.session.grantItem('imprint_pinning_shot'); });
    this.pickup('army.towerNook', 'towerNook', 'greyford_tower_shield', 1, 'Take the tower shield', grant('tempered_scrap'));
    this.pickup('army.campScrap', 'campScrap', 'tempered_scrap', 2, 'Search the crate');
    this.pickup('army.pikeScroll', 'pikeRack', 'imprint_impaling_charge', 1, 'Take the scroll from the pike stand');
    this.pickup('army.casemateArmour', 'casemateAlcove', 'gatewarden_helm', 1, 'Take the gatewarden\'s armour', grant('gatewarden_greaves'));
    this.pickup('army.musterRoll', 'ossuaryRoll', 'greyford_muster_roll', 1, 'Take the folded roll', grant('bellbronze_scrap'));
    this.pickup('army.laneShard', 'laneShard', 'bellbronze_shard', 1, 'Take the bellbronze shard');
    this.pickup('army.greatsword', 'bellwardenSword', 'bellwarden_greatsword', 1, 'Take the greatsword');
    this.pickup('army.wardScrap', 'wardScrap', 'tempered_scrap', 1, 'Search the stores');
    this.pickup('army.hallRack', 'hallRack', 'gatewarden_halberd', 1, 'Take the halberd from the rack');
    this.pickup('army.hallArmour', 'hallArmour', 'gatewarden_plate', 1, 'Take the gatewarden\'s plate', grant('gatewarden_gauntlets'));
    this.pickup('army.highTable', 'highTable', 'imprint_bell_breaker', 1, 'Take the scroll from the high table');
    this.pickup('army.keepScrap', 'keepScrap', 'bellbronze_scrap', 1, 'Search the crates', grant('tempered_scrap'));

    // the two histories, side by side
    this.inspectAt('army_victory_relief', 'victoryRelief', 'Read the monument', () => this.record('siegeholm', 'mem_victory'));
    this.inspectAt('army_mass_grave', 'massGrave', 'Examine the graves', () => { this.record('siegeholm', 'mem_victory'); this.record('siegeholm', 'obs_graves'); });
    this.inspectAt('army_victory_arch', 'victoryArch', 'Read the arch', () => this.record('siegeholm', 'mem_victory'));
    this.inspectAt('army_lime_pit', 'limePit', 'Look into the pit', () => this.record('siegeholm', 'obs_pit'));
    this.inspectAt('army_feast', 'feastInspect', 'Look at the tables', () => this.record('siegeholm', 'obs_hall'));
    this.inspectAt('army_last_stand', 'lastStand', 'Look at the barricade', () => this.record('siegeholm', 'obs_hall'));
    this.inspectAt('army_orders', 'orders', 'Read the orders on the desk', () => {
      this.record('eastern_magazine', 'mem_magazine');
      this.record('eastern_magazine', 'obs_order');
      this.session.save();
    });

    // shortcut 1: the Postern (opened from the casemate side)
    this.opener('postern', 'postern', F.postern, 'Lift the bar and open the postern', { anchorName: 'posternInside', cue: 'door_open', dur: 1.4, after: () => this.game.sfx('chain_rattle', { pos: this.A('posternInside').pos }) });
    this.add('posternOut', this.A('posternOutside'), 1.8, () => (this.flag(F.postern) ? null : 'The postern (barred)'), () => this.inspect('army_postern_locked'));

    // shortcut 2: the Eastern Lane portcullis (winch on the ward side)
    const winchP = this.P('eastWinch');
    this.add('winch', winchP.anchor!, 2.0, () => (this.flag(F.eastGate) ? null : 'Turn the winch'), () => this.playerAct('lever', () => {
      this.tween(winchP, 0, 1, 2.6);
      this.tween(this.P('eastGate'), 0, 1, 3.0, () => this.game.sfx('drawbridge_slam', { pos: this.A('eastGateWard').pos, volume: 0.6 }));
      this.game.sfx('chain_rattle', { pos: winchP.anchor!.pos });
      this.game.sfx('gate_open', { pos: this.A('eastGateWard').pos });
      this.setFlag(F.eastGate);
      this.session.save();
    }));
    this.add('laneGate', this.A('eastGateLane'), 2.0, () => (this.flag(F.eastGate) ? null : 'The portcullis'), () => { this.game.deps.ui?.toast('The portcullis is raised by a winch on the other side.', 'info'); this.game.sfx('ui_error'); });

    // the eastern magazine
    this.add('magazine', this.A('magazineDoor'), 2.2, () => {
      if (this.flag(F.magBlown) || this.flag(F.magOpen)) return null;
      return this.heard('tallis_door') ? 'Lift the bar' : 'Listen at the barred door';
    }, () => this.magazineDoor());

    // the Unlived Muster soldier
    this.add('muster', this.A('musterSoldier'), 2.6, () => 'Speak with the soldier', () => void this.talkMuster(), false);

    // triggers
    this.onTrigger('roadStart', () => { this.revealBell(); for (const l of DIALOGUE_LINES('army_arrival')) this.subtitle(l.text, l.speaker, l.duration ?? 5); this.record('siegeholm', 'mem_victory'); });
    this.onTrigger('magazineYard', () => {
      if (this.ws.npcs.tallis !== 'imprisoned') return;
      this.memoryFlash();
      for (const l of DIALOGUE_LINES('army_magazine_memory')) this.subtitle(l.text, l.speaker, l.duration ?? 5);
      this.record('eastern_magazine', 'mem_magazine');
      this.record('eastern_magazine', 'obs_guards');
      this.session.save();
    });
    this.onTrigger('feastHall', () => { for (const l of DIALOGUE_LINES('army_feast_memory')) this.subtitle(l.text, l.speaker, l.duration ?? 5); this.record('siegeholm', 'obs_hall'); });
    this.onTrigger('limePit', () => { for (const l of DIALOGUE_LINES('army_pit_memory')) this.subtitle(l.text, l.speaker, l.duration ?? 4); });
  }

  private async magazineDoor() {
    if (this.ws.npcs.tallis === 'imprisoned' && !this.heard('tallis_door')) {
      await this.talk('tallis_door');
      this.record('eastern_magazine', 'mem_magazine');
      this.record('eastern_magazine', 'obs_tallis');
      this.session.save();
      return;
    }
    const door = this.P('magazineDoor');
    this.playerAct('lever', () => {
      this.tween(door, 0, 1, 2.2);
      this.game.sfx('lever_pull', { pos: this.A('magazineDoor').pos });
      setTimeout(() => this.game.sfx('door_open', { pos: this.A('magazineDoor').pos }), 900);
      this.setFlag(F.magOpen);
      this.session.save();
      if (this.ws.npcs.tallis !== 'imprisoned') return;
      setTimeout(() => void this.talk('tallis_freed', () => {
        this.ws.npcs.tallis = 'rescued';
        this.record('eastern_magazine', 'obs_tallis');
        this.record('eastern_magazine', 'conf_rescued');
        this.game.fx('bellMotes', this.A('tallisCell').pos.clone().setY(this.A('tallisCell').pos.y + 1), { count: 40 });
        this.removeNpc('tallis');
        this.game.deps.ui?.toast('Rook Tallis has gone to the Hospice of the Quiet Hour', 'journal');
        this.session.save();
      }), 1500);
    });
  }

  private async talkMuster() {
    if (!this.flag(F.musterMet)) {
      await this.talk('muster_army_first');
      this.setFlag(F.musterMet);
      this.record('muster_army', 'obs_soldier');
      this.session.save();
      return;
    }
    if (!this.flag(F.muster) && this.pd.inventory.greyford_muster_roll) {
      await this.talk('muster_army_roll');
      this.setFlag(F.muster);
      this.record('muster_army', 'conf_roll');
      this.session.grantItem('tempered_scrap', 2);
      this.session.save();
      return;
    }
    await this.talk(this.flag(F.muster) ? 'muster_army_after' : 'muster_army_first');
  }

  // ------------------------------------------------------------------ state

  protected override pieceFlags() {
    return { postern: F.postern, eastGate: F.eastGate, eastWinch: F.eastGate, magazineDoor: F.magOpen, magazine: F.magBlown };
  }

  protected override applyRegionState() {
    this.ws.npcs.tallis ??= 'imprisoned';
    this.removeNpc('tallis');
    if (this.ws.npcs.tallis === 'imprisoned' && !this.flag(F.magBlown)) this.spawnNpc('tallis', this.A('tallisCell'), 'sit', 'tallis', { height: 1.0, bulk: 1.12, shoulder: 1.05 });
    this.removeNpc('armyMuster');
    this.spawnNpc('armyMuster', this.A('musterSoldier'), this.flag(F.muster) ? null : 'standPray', 'armyMuster');
    if (!this.flag(F.arrival)) this.setFlag(F.arrival);
  }

  protected override objective(): THREE.Vector3 | null {
    if (this.ws.npcs.tallis === 'imprisoned' && !this.flag(F.magBlown)) return this.A('magazineDoor').pos;
    if (!this.flag(F.muster) && this.pd.inventory.greyford_muster_roll) return this.A('musterSoldier').pos;
    if (!this.flag('boss.oderic')) return this.arena('oderic').entry.pos;
    if (!this.flag('boss.varr')) return this.arena('varr').entry.pos;
    return null;
  }
  /**
   * First arrival: the Stillbell shrine stands between the player and the keep, so the opening
   * view is a short push from beside the shrine up to the Great Bell between its two towers (the
   * region's landmark and goal). Any player movement hands the camera back at once.
   */
  private revealPending = false;
  private revealBell() {
    if (!this.flag(F.reveal)) this.revealPending = true;
  }
  private startReveal() {
    this.revealPending = false;
    this.setFlag(F.reveal);
    const g = this.game, p = g.player;
    if (!p) return;
    const start = p.pos.clone();
    const bell = new THREE.Vector3(0, 78, -231);
    const from = new THREE.Vector3(start.x + 5.5, start.y + 2.2, start.z + 3.5), to = new THREE.Vector3(start.x + 6.5, start.y + 3.2, start.z - 1.5);
    let t = 0;
    g.cameraOverride = (dt, cam) => {
      t += Math.min(dt, 0.05);   // the first frames after loading can carry a long hitch
      const k = Math.min(1, t / 5.5), e = k * k * (3 - 2 * k);
      cam.position.lerpVectors(from, to, e);
      cam.lookAt(bell.x, 30 + 48 * e, bell.z);
      return t < 5.5 && !p.dead && p.pos.distanceToSquared(start) < 1.2 && g.mode === 'play';
    };
  }

  private arena(id: string) { return this.L.arenas.find((a) => a.bossId === id)!; }

  // ------------------------------------------------------------------ enemies: region classes, pike walls, the bombard

  protected override spawnEnemies() {
    const g = this.game;
    for (const { e } of this.enemyList) { e.object.removeFromParent(); const i = g.enemies.indexOf(e); if (i >= 0) g.enemies.splice(i, 1); }
    this.enemyList = [];
    for (const b of this.bosses.values()) { b.object.removeFromParent(); const i = g.enemies.indexOf(b); if (i >= 0) g.enemies.splice(i, 1); }
    this.bosses.clear();
    let seed = 11;
    for (const s of this.L.enemies) this.enemyList.push({ e: spawnArmyEnemy(g, s, seed++), anchor: s.anchor });
    for (const a of this.L.arenas) if (!this.flag('boss.' + a.bossId)) this.spawnBoss(a);
    // pike walls: members grouped by spawn id prefix (…_pike_a/_b/_c)
    const groups = new Map<string, Formation>();
    for (const { e } of this.enemyList) {
      if (!(e instanceof Pikeman)) continue;
      const m = /^(.*)_([abc])$/.exec(e.spawnId);
      if (!m) continue;
      let f = groups.get(m[1]);
      if (!f) { f = new Formation(m[1]); f.onBreak = () => this.game.deps.ui?.caption('[The pike wall breaks]'); groups.set(m[1], f); }
      e.formation = f; e.slot = 'abc'.indexOf(m[2]);
      f.members.push(e);
    }
    this.formations = [...groups.values()];
    for (const f of this.formations) f.reset();
    // the gate bombard and its crew
    const crew = this.enemyList.map((x) => x.e).filter((e) => e.def.kind === 'cannonCrew');
    this.battery = new Battery(g, this.shells, this.AL.bombardMuzzle, crew, new THREE.Box3(new THREE.Vector3(-12, -1, -18.5), new THREE.Vector3(18, 6, 24)), this.AL.bombardLight);
  }

  override resetEnemies() {
    super.resetEnemies();
    for (const f of this.formations) f.reset();
    this.battery?.reset();
    this.shells?.clear();
  }

  protected override spawnBoss(a: ArenaLayout): Boss {
    const b = super.spawnBoss(a);
    const g = this.game;
    if (a.bossId === 'varr') {
      b.onEvent = (id) => { if (id === 'volley') this.volley(b); if (id === 'banner') this.burnBanner(); };
      b.onFireTrail = (p, q) => { for (let i = 0; i <= 6; i++) g.fx('embers', p.clone().lerp(q, i / 6), { count: 12 }); };
    }
    if (a.bossId === 'oderic') {
      b.onShockwave = (p) => { g.fx('dust', p, { count: 90, speed: 6 }); g.fx('rubble', p, { count: 20 }); };
      b.onEvent = (id) => { if (id === 'wallHit') g.deps.ui?.caption('[The Ram-Knight strikes the wall — staggered]'); };
    }
    return b;
  }

  /** Varr's call: the tower bombards fire on her word — marked blasts around the Returned. */
  private volley(b: Boss) {
    const g = this.game, p = g.player;
    if (!p || p.dead) return;
    const muzzles = this.AL.volleyMuzzles;
    const n = b.phase >= 2 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const t = p.pos.clone();
      if (i > 0) {
        const a = Math.random() * Math.PI * 2, r = 2.6 + Math.random() * 3;
        t.x += Math.cos(a) * r + p.vel.x * 0.6; t.z += Math.sin(a) * r + p.vel.z * 0.6;
      }
      // keep the marks on the rampart
      const c = this.arena('varr').center;
      const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz), R = this.arena('varr').radius - 1;
      if (d > R) { t.x = c.x + (dx / d) * R; t.z = c.z + (dz / d) * R; }
      t.y = c.y;
      this.shells.launch(b, muzzles[i % muzzles.length], t, { delay: 0.25 + i * 0.4, flight: 1.5, radius: 2.3, packet: { physical: 120, magic: 0, fire: 110 } });
    }
    g.deps.ui?.caption('[Bombards answer the Marshal]');
  }
  private burnBanner() {
    const g = this.game;
    const std = this.P('varrStandard').object;
    const pos = new THREE.Vector3();
    std.getWorldPosition(pos);
    const a = this.arena('varr');
    g.fx('fireBurst', new THREE.Vector3(a.center.x, a.center.y + 6.5, a.center.z - a.radius + 2.4), { count: 60 });
    g.fx('embers', new THREE.Vector3(a.center.x, a.center.y + 6, a.center.z - a.radius + 2.4), { count: 80 });
  }

  // ------------------------------------------------------------------ arenas

  protected override arenaWarning(a: ArenaLayout) {
    if (a.bossId === 'oderic') return this.ws.npcs.tallis === 'imprisoned' && !this.flag(F.magBlown) ? 'armyOdericPrisoner' : 'armyOderic';
    if (a.bossId === 'varr') return 'armyVarr';
    return '';
  }

  protected override beforeArena(a: ArenaLayout) {
    if (a.bossId !== 'oderic' || this.ws.npcs.tallis !== 'imprisoned' || this.flag(F.magBlown)) return;
    // the guard lights the magazine: the loss is immediate and persistent; the sound reaches the passage a little later
    this.ws.npcs.tallis = 'dead';
    this.setFlag(F.magBlown);
    this.P('magazine').set(1);
    this.removeNpc('tallis');
    this.record('eastern_magazine', 'conf_lost');
    this.session.save();
    this.blastT = 7;
  }

  protected override async onBossDefeated(id: string) {
    if (id === 'oderic') {
      this.session.grantItem('ram_knight_maul');
      setTimeout(() => { for (const l of DIALOGUE_LINES('army_oderic_after')) this.subtitle(l.text, l.speaker, l.duration ?? 4); }, 3500);
    }
    if (id === 'varr') {
      this.record('siegeholm', 'conf_bell');
      this.game.sfx('great_bell_toll', { pos: this.arena('varr').center.clone().setY(70), volume: 0.8, rate: 0.7 });
      this.game.shake(0.5);
      await new Promise((r) => setTimeout(r, 2600));
      for (const l of DIALOGUE_LINES('army_bell_silent')) this.subtitle(l.text, l.speaker, l.duration ?? 6);
      this.game.deps.ui?.banner('regionComplete', 'SIEGEHOLM REMEMBERED', 'The Army\'s Great Bell is silent');
    }
  }

  // ------------------------------------------------------------------ per frame: distance culling of actors

  /**
   * The long northward sightlines put much of the garrison inside the view frustum at once, and
   * characters are skinned meshes with one draw call per material. Actors are therefore not drawn
   * (the AI keeps thinking) when they are beyond ~38 m (46 m once alerted), or when the walls hide them from the camera:
   * a round-robin line-of-sight test against the static world (head and chest, two consecutive
   * blocked tests before hiding, shown again at the first clear one). The dead dissolve untouched.
   */
  private occluded = new WeakMap<object, number>();
  private occlCursor = 0;
  override frame(dt: number) {
    super.frame(dt);
    const cam = this.game.deps.renderer.camera.position;
    const fightBoss = this.fight?.boss ?? null;
    const list = this.game.enemies, n = list.length;
    const world = this.game.world;
    for (let k = 0, checks = Math.min(n, 10); k < checks; k++) {
      const e = list[this.occlCursor++ % n];
      if (!e || e.dead || e === fightBoss) continue;
      const d2 = e.pos.distanceToSquared(cam);
      if (d2 > 46 * 46 || d2 < 10 * 10) { this.occluded.set(e, 0); continue; }
      const head = _occA.set(e.pos.x, e.pos.y + 1.75, e.pos.z), chest = _occB.set(e.pos.x, e.pos.y + 0.9, e.pos.z);
      const blocked = !world.lineOfSight(cam, head) && !world.lineOfSight(cam, chest);
      this.occluded.set(e, blocked ? (this.occluded.get(e) ?? 0) + 1 : 0);
    }
    for (const e of list) {
      if (e.dead || e.deathT >= 0) continue;
      const far = e === fightBoss ? Infinity : e.isBoss ? 60 : e.aware ? 46 : 38;
      const vis = e === fightBoss || (e.pos.distanceToSquared(cam) < far * far && (this.occluded.get(e) ?? 0) < 2);
      if (e.object.visible !== vis) e.object.visible = vis;
    }
    for (const n of this.npcs.values()) n.object.visible = n.pos.distanceToSquared(cam) < 46 * 46;
  }

  // ------------------------------------------------------------------ per step

  protected override stepRegion(dt: number) {
    if (this.revealPending && this.game.mode === 'play' && !this.game.cameraOverride && this.game.player) this.startReveal();
    const inArenaFight = !!this.fight;
    if (!inArenaFight) this.battery?.step(dt);
    this.shells.step(dt);
    if (this.blastT > 0) {
      this.blastT -= dt;
      if (this.blastT <= 0) {
        const p = this.A('magazineBlast').pos;
        this.game.sfx('fire_burst', { pos: p, volume: 1.6, rate: 0.5 });
        this.game.sfx('collapse_rumble', { pos: p, volume: 1.4 });
        this.game.shake(0.6);
        this.game.deps.ui?.caption('[A great explosion — far to the east]', 'right');
        for (const l of DIALOGUE_LINES('army_magazine_blast')) this.subtitle(l.text, l.speaker, l.duration ?? 4);
      }
    }
  }
}

