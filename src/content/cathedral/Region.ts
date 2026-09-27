/**
 * The Pilgrim Stair — region controller.
 *
 * Quest logic (leads `cath_hymn`, `cath_saint`, `muster_cathedral`), interactables, and the region's
 * mechanics that sit on top of the generic enemy AI:
 *  - healer-priests begin their rite when an ally near them is hurt; the rite (interruptible) heals
 *    allies' health and posture at 1.9 s, shown by a ring under the priest and a light-link to each ally;
 *  - flagellants scourge themselves into a frenzy and hit harder the more they have bled;
 *  - mourner giants (and the Saint's borrowed grasp) grab: the Returned is held, crushed, thrown down;
 *  - pleading pilgrims kneel before the Roll and do not fight unless startled or struck;
 *  - processions walk their routes and knock down whoever stands in their way;
 *  - the Procession fight: two bearers and a cantor join the reliquary-bearer; the cantor's hymn makes
 *    the reliquary pulse (heals & restores posture) until the cantor falls;
 *  - Saint Vessaline's borrowed styles (name callouts, veils), her spectral hand, her hymn if Wenna
 *    was absorbed.
 */
import * as THREE from 'three';
import type { Game } from '../../game/Game';
import type { Session } from '../../game/Session';
import type { ArenaLayout } from '../../world/levelTypes';
import type { RegionInfo } from '../../game/regions/catalog';
import type { Enemy } from '../../actors/Enemy';
import type { MoveInstance } from '../../actors/Actor';
import type { HitResult, DamagePacket } from '../../combat/Combat';
import type { HitSpec } from '../../combat/types';
import { RegionBase } from '../../game/regions/RegionBase';
import { MOVES } from '../../combat/moves';
import { DIALOGUE } from '../dialogue';
import { removeItem } from '../../systems/PlayerData';
import { yawOf } from '../../core/math';
import type { Boss } from '../bosses';
import { CathBoss, VessalineBoss, STYLE_CALLOUTS } from './bosses';
import type { VeilId } from './models';
import type { CathedralLayout } from './level';

type Hooked = Enemy & { __cath?: true };
interface Ring { mesh: THREE.Mesh; t: number; dur: number; r0: number; r1: number; follow?: Enemy }
interface Grab { by: Enemy; crush: string; dmg: number }

interface State {
  links: [Enemy, Enemy][];
  beams: THREE.Mesh[];
  rings: Ring[];
  fx: THREE.Group;
  healCd: Map<Enemy, number>;
  barkT: number;
  procHitT: number;
  procSoundT: number[];
  grab: Grab | null;
  adds: Enemy[];
  cantor: Enemy | null;
  hymnCd: number;
  cantorFellSaid: boolean;
  cullT: number;
  twicePos: THREE.Vector3;
  wennaTalking: boolean;
}

const RING_MAT = () => new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const BEAM_MAT = () => new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });

export class CathedralRegion extends RegionBase {
  declare private S: State;
  declare readonly L: CathedralLayout;

  constructor(game: Game, session: Session, layout: CathedralLayout, info: RegionInfo) {
    super(game, session, layout, info);
    this.defaultEnvironment = 'cathedralStair';
    this.defaultMusic = 'cathedral';
  }

  // ================================================================== setup

  protected override setup() {
    const fx = new THREE.Group();
    fx.name = 'cathedral:fx';
    this.L.root.add(fx);
    const beams: THREE.Mesh[] = [];
    const beamMat = BEAM_MAT();
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 5, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), beamMat);
      m.visible = false;
      m.frustumCulled = false;
      fx.add(m);
      beams.push(m);
    }
    this.S = {
      links: [], beams, rings: [], fx, healCd: new Map(), barkT: 0, procHitT: 0, procSoundT: this.L.processions.map((_, i) => i * 1.3),
      grab: null, adds: [], cantor: null, hymnCd: 4, cantorFellSaid: false, cullT: 0, twicePos: new THREE.Vector3(), wennaTalking: false,
    };

    // ---- pickups
    this.pickup('cath.nook', 'yardNook', 'imprint_riposte_stance', 1, 'Search behind the tablets', () => this.session.grantItem('tempered_scrap', 2));
    this.pickup('cath.censer', 'censer', 'pilgrim_censer', 1, 'Take the censer from the shrine');
    this.pickup('cath.shield', 'shieldNook', 'pilgrim_roundshield');
    this.pickup('cath.vigil', 'lectern', 'prayer_vigil_of_ash', 1, 'Take the prayer from the lectern');
    this.pickup('cath.funeral', 'funeral', 'funeral_vestments', 1, 'Take the funeral vestments', () => { for (const id of ['funeral_veil', 'funeral_gloves', 'funeral_boots']) this.session.grantItem(id); });
    this.pickup('cath.scrap1', 'scrapPassage', 'tempered_scrap');
    this.pickup('cath.shard', 'shard', 'bellbronze_shard', 1, 'Take the Bellbronze Shard');
    this.pickup('cath.knell', 'knellAisle', 'imprint_knell_strike');
    this.pickup('cath.psalter', 'psalter', 'psalter_toll_of_warding', 1, 'Take the psalter', () => this.session.grantItem('bellbronze_scrap'));
    this.pickup('cath.roll', 'rolls', 'greyford_roll', 1, 'Take the Greyford roll', () => void this.inspect('cath_rolls'));
    this.pickup('cath.tablet', 'tablet', 'name_tablet_wenna', 1, 'Take the tablet', () => {
      this.record('cath_hymn', 'obs_tablet');
      this.subtitle('(WENNA HALE. The letters are cut deep, by someone who meant them to last.)');
    });

    // ---- inspectables
    this.inspectAt('cath_roll', 'roll', 'Read the Pilgrim Roll', () => this.record('cath_saint', 'obs_plaques'));
    this.inspectAt('cath_masons', 'masonsOrder', 'Read the order');
    this.inspectAt('cath_mercy', 'mercy', 'Examine the relief');
    this.inspectAt('cath_wall', 'tabletWall', 'Examine the shelves');
    this.inspectAt('cath_graves', 'graves', 'Look at the steps');
    this.inspectAt('cath_bell', 'bellView', 'Look up at the Great Bell', undefined, 2.6);
    this.add('inspect:doors', this.A('doorsOutside'), 2.2, () => (this.flag('cathedral.greatDoors') ? null : 'Try the great doors'), () => void this.inspect('cath_doors'));
    this.add('inspect:grate', this.A('grateOutside'), 2.2, () => (this.flag('cathedral.grate') ? null : 'Try the grate'), () => void this.inspect('cath_grate'));
    this.add('inspect:mat', this.A('wennaMat'), 1.8, () => (this.ws.npcs.wenna === 'taken' ? 'Look at the empty mat' : null), () => void this.inspect('cath_mat'));
    // the same woman, twice (moves with the street procession)
    this.add('inspect:twice', this.S.twicePos, 3.2, () => (this.L.processions[0].running ? 'Look closer at the mourners' : null), () => void this.inspect('cath_twice', () => this.record('cath_saint', 'obs_twice')), false);

    // ---- shortcuts
    this.opener('grate', 'grate', 'cathedral.grate', 'Raise the grate', { anchorName: 'grateInside', cue: 'gate_open', dur: 1.6, after: () => this.subtitle('(The Stair\'s foot. A short way back to the gate.)') });
    this.opener('doors', 'greatDoors', 'cathedral.greatDoors', 'Lift the bar', { anchorName: 'doorsInside', cue: 'door_open', dur: 2.2, after: () => this.subtitle('(Snow-light on the parvis. The Stair is just outside.)') });

    // ---- people
    this.add('npc:wenna', this.A('wenna').pos.clone().add(new THREE.Vector3(1.0, 0, 0)), 2.4, () => this.wennaPrompt(), () => void this.talkWenna(), false);
    this.add('npc:soames', this.A('soames').pos, 2.4, () => (this.flag('muster.cathedral') ? null : this.pd.inventory.greyford_roll ? 'Give Soames the roll' : 'Speak with the soldier'), () => void this.talkSoames(), false);

    // ---- triggers
    this.onTrigger('arrival', () => {
      this.record('cath_saint', 'mem_saint');
      this.subtitle('(The Great Bell. In the future I remember, it rang once more over an empty city.)', 'The Returned', 6);
    });
    this.onTrigger('procession', () => { this.game.hint('cathProcession'); this.subtitle('(A procession. They carry something up the Stair, and they will not stop for me.)', 'The Returned', 5); });
    this.onTrigger('stairFoot', () => {
      this.memoryFlash();
      this.record('cath_hymn', 'mem_hymn');
      this.subtitle('(A girl led the refugees up a road like this, singing. Wenna Hale. She sang her own name into the last verse.)', 'The Returned', 7);
    });
    this.onTrigger('naveEnter', () => this.subtitle('(Hundreds of voices. There are thirty people in this nave.)', 'The Returned', 5));
  }

  // ================================================================== state

  protected override pieceFlags() { return { grate: 'cathedral.grate', greatDoors: 'cathedral.greatDoors' }; }

  protected override applyRegionState() {
    if (!this.ws.npcs.wenna) this.ws.npcs.wenna = 'present';
    this.placeNpcs();
    const quiet = this.flag('boss.vessaline');
    for (const p of this.L.processions) p.running = !quiet;
  }

  private placeNpcs() {
    this.removeNpc('wenna');
    this.removeNpc('soames');
    if (this.ws.npcs.wenna === 'present') this.spawnNpc('wenna', this.A('wenna'), 'rest', 'wenna', { height: 0.94, bulk: 0.9, shoulder: 0.92 });
    if (!this.flag('muster.cathedral')) this.spawnNpc('soames', this.A('soames'), 'standPray', 'cath_soames');
  }

  /** Where the unresolved lead is (the Unfinished Toll). */
  protected override objective(): THREE.Vector3 | null {
    const inv = this.pd.inventory;
    if (this.ws.npcs.wenna === 'present') return inv.name_tablet_wenna ? this.A('wenna').pos : this.A('tablet').pos;
    if (!this.flag('muster.cathedral') && this.heard('soames_first')) return inv.greyford_roll ? this.A('soames').pos : this.A('rolls').pos;
    if (!this.flag('boss.vessaline')) return this.L.arenas[1].center;
    return null;
  }

  // ================================================================== people

  private wennaPrompt() {
    if (this.ws.npcs.wenna !== 'present' || this.S?.wennaTalking) return null;
    if (this.pd.inventory.name_tablet_wenna) return 'Say her name';
    return 'Speak with the pilgrim';
  }

  private async talkWenna() {
    if (this.ws.npcs.wenna !== 'present' || this.S.wennaTalking) return;
    this.S.wennaTalking = true;
    try {
      if (this.pd.inventory.name_tablet_wenna) {
        if (!this.ws.journal.mem_hymn) this.record('cath_hymn', 'mem_hymn');
        if (!this.heard('wenna_nameless')) this.record('cath_hymn', 'obs_nameless');
        await this.talk('wenna_returned');
        removeItem(this.pd, 'name_tablet_wenna');
        this.ws.npcs.wenna = 'rescued';
        this.record('cath_hymn', 'conf_returned');
        this.game.sfx('memory_trigger');
        this.game.fx('bellMotes', this.A('wenna').pos.clone().add(new THREE.Vector3(0, 1.2, 0)), { count: 60 });
        this.game.deps.ui?.toast('Wenna Hale has gone to the Hospice of the Quiet Hour', 'info');
        setTimeout(() => this.removeNpc('wenna'), 1200);
        this.session.save();
      } else if (!this.heard('wenna_nameless')) {
        if (!this.ws.journal.mem_hymn) this.record('cath_hymn', 'mem_hymn');
        await this.talk('wenna_nameless');
        this.record('cath_hymn', 'obs_nameless');
        this.session.save();
      } else {
        const pool = DIALOGUE.wenna_nameless_idle ?? [];
        if (pool.length) this.game.deps.ui?.subtitle(pool[Math.floor(Math.random() * pool.length)]);
      }
    } finally { this.S.wennaTalking = false; }
  }

  private async talkSoames() {
    if (this.flag('muster.cathedral')) return;
    if (this.pd.inventory.greyford_roll) {
      if (!this.heard('soames_first')) { await this.talk('soames_first'); this.record('muster_cathedral', 'obs_soames'); }
      await this.talk('soames_roll');
      removeItem(this.pd, 'greyford_roll');
      this.setFlag('muster.cathedral');
      this.session.grantItem('greyford_vambraces');
      this.session.grantItem('bellbronze_scrap');
      this.record('muster_cathedral', 'conf_roll');
      this.game.fx('goldMotes', this.A('soames').pos.clone().add(new THREE.Vector3(0, 1.2, 0)), { count: 80 });
      setTimeout(() => this.removeNpc('soames'), 1500);
      this.session.save();
    } else if (!this.heard('soames_first')) {
      await this.talk('soames_first');
      this.record('muster_cathedral', 'obs_soames');
      this.session.save();
    } else await this.talk('soames_waiting');
  }

  // ================================================================== enemies: decoration

  protected override spawnEnemies() {
    super.spawnEnemies();
    for (const { e } of this.enemyList) this.decorate(e);
    for (const b of this.bosses.values()) this.hookBoss(b);
    this.kneelAll();
  }

  override resetEnemies() {
    this.clearAdds();
    this.releaseGrab(false);
    super.resetEnemies();
    for (const b of this.bosses.values()) this.hookBoss(b);
    this.kneelAll();
    this.S.healCd.clear();
    this.S.hymnCd = 4;
    this.S.cantorFellSaid = false;
  }

  override onPlayerDeath() {
    super.onPlayerDeath();
    this.releaseGrab(false);
  }

  private kneelAll() {
    for (const { e } of this.enemyList) {
      if (!e.spawnId.startsWith('plead')) continue;
      e.idleAnim = 'sentryWall'; // no proximity wake: they are praying, not watching
      e.startMove({ id: 'cath_kneel_loop', clip: 'cathPilKneel', dur: 1e9 });
    }
  }

  /** Attach region mechanics to an ordinary enemy (once). */
  private decorate(e0: Enemy) {
    const e = e0 as Hooked;
    if (e.__cath) return;
    e.__cath = true;
    const kind = e.def.kind;
    const hook = (fn: (id: string, m: MoveInstance) => void) => {
      const self = e as unknown as { onCustom: (id: string, m: MoveInstance) => void };
      const base = self.onCustom.bind(e);
      self.onCustom = (id, m) => { fn(id, m); base(id, m); };
    };
    if (e.spawnId.startsWith('plead')) e.def = { ...e.def, sight: 0 };
    if (kind === 'cath_flagellant') {
      const baseDef = e.def, frenzyDef = { ...e.def, recover: [0.25, 0.6] as [number, number] };
      const basePacket = e.attackPacket.bind(e);
      e.attackPacket = (spec: HitSpec): DamagePacket => {
        const p = basePacket(spec);
        const k = 1 + 0.8 * (1 - e.hp / e.hpMax) + (e.buffs.has('frenzy') ? 0.3 : 0);
        return { physical: p.physical * k, magic: p.magic * k, fire: p.fire * k };
      };
      hook((id) => {
        if (id === 'scourge') {
          e.hp = Math.max(1, e.hp - Math.round(e.hpMax * 0.06));
          this.game.fx('goldMotes', e.chest, { count: 18 });
          this.game.sfx('hit_flesh', { pos: e.pos, volume: 0.7 });
        } else if (id === 'frenzy') {
          e.buffs.set('frenzy', 15);
          e.def = frenzyDef;
          e.model?.setStatusGlow('buff', 1);
        }
      });
      // the frenzy ends: back to the ordinary recovery (checked each step in stepRegion)
      (e as unknown as { __unfrenzy: () => void }).__unfrenzy = () => { e.def = baseDef; e.model?.setStatusGlow('none', 0); };
    } else if (kind === 'cath_healer') {
      hook((id) => {
        if (id === 'riteStart') {
          this.ring(e.pos, 0.6, 3.2, 1.8, e);
          if (this.player.pos.distanceTo(e.pos) < 22) this.game.hint('cathHealer');
        } else if (id === 'rite') this.rite(e);
        else if (id === 'tollRing') this.ring(e.pos, 0.4, 2.6, 0.5);
      });
    } else if (kind === 'cath_mourner') {
      e.onDealtHit = (r) => { if (r.move.id === 'cath_mg_grab') this.beginGrab(e, r, 'cath_mg_crush', 260); };
      hook((id) => {
        if (id === 'crushRelease') this.crushRelease(e);
        else if (id === 'shockwave') { this.ring(e.pos, 0.6, 3.2, 0.55); this.game.fx('dust', e.pos.clone().add(new THREE.Vector3(0, 0.2, 0)), { count: 40 }); }
      });
    } else if (kind === 'cath_cantor') {
      hook((id) => { if (id === 'hymn') this.reliquaryPulse(); else if (id === 'hymnStart') this.ring(e.pos, 0.4, 1.8, 2.2, e); });
    }
  }

  // ================================================================== bosses

  protected override spawnBoss(a: ArenaLayout): Boss {
    const b = super.spawnBoss(a);
    this.hookBoss(b);
    return b;
  }

  private hookBoss(b: Boss) {
    const hb = b as Boss & { __cath?: true };
    if (hb.__cath) return;
    hb.__cath = true;
    if (b instanceof VessalineBoss) b.hymn = this.ws.npcs.wenna === 'taken';
    if (b instanceof CathBoss) {
      b.onDealt = (r) => {
        if (r.target !== this.player) return;
        if (r.move.id === 'cath_ves_grasp') this.beginGrab(b, r, 'cath_ves_crush', 240);
        else if (r.move.id === 'cath_prc_march' && r.outcome === 'hit' && !this.player.dead) this.knockdown(b.pos, 0);
      };
    }
    b.onShockwave = (pos) => { this.ring(pos, 0.6, 3.4, 0.6); this.game.fx('dust', pos.clone().add(new THREE.Vector3(0, 0.2, 0)), { count: 50 }); };
    b.onEvent = (id, boss) => {
      if (id.startsWith('style:')) {
        const style = id.slice(6) as VeilId;
        if (style !== 'own') this.game.deps.ui?.subtitle({ speaker: 'Saint Vessaline', text: STYLE_CALLOUTS[style], duration: 4.5 });
        this.game.fx('goldMotes', boss.chest.clone().add(new THREE.Vector3(0, 0.4, 0)), { count: 40 });
      } else if (id === 'handOn' || id === 'handOff') {
        const h = boss.rig.bones.handL.getObjectByName('vess:hand');
        if (h) h.visible = id === 'handOn';
        if (id === 'handOn' && boss.move?.def.id === 'cath_ves_grasp') this.game.hint('cathGrab');
      } else if (id === 'crushRelease') this.crushRelease(boss);
      else if (id === 'ring') this.ring(boss.pos, 0.5, 3.6, 0.6);
    };
  }

  protected override arenaWarning(a: ArenaLayout) {
    if (a.bossId === 'vessaline') return this.ws.npcs.wenna === 'present' ? 'vessalineNameless' : 'vessalinePlain';
    return 'processionPlain';
  }

  protected override beforeArena(a: ArenaLayout) {
    if (a.bossId === 'procession') this.spawnAdds();
    if (a.bossId === 'vessaline') {
      if (this.ws.npcs.wenna === 'present') {
        // the nameless are carried into the Saint when she wakes
        this.ws.npcs.wenna = 'taken';
        this.removeNpc('wenna');
        this.record('cath_hymn', 'conf_absorbed');
        const b = this.bosses.get('vessaline');
        if (b instanceof VessalineBoss) b.hymn = true;
      }
      this.record('cath_saint', 'obs_conviction');
      this.session.save();
    }
  }

  protected override onBossPhase(id: string, _phase: number, b: Boss) {
    if (id === 'vessaline' && b instanceof VessalineBoss) b.afterPhase();
    if (id === 'procession') this.S.hymnCd = Math.min(this.S.hymnCd, 3);
  }

  protected override async onBossDefeated(id: string) {
    if (id === 'procession') {
      this.clearAdds(true);
      this.session.grantItem('hand_bell');
      this.session.grantItem('bellbronze_scrap');
      this.subtitle('(The cloister door stands open. The nave is beyond it.)');
    }
    if (id === 'vessaline') {
      this.record('cath_saint', 'conf_vessaline');
      for (const p of this.L.processions) p.running = false;
      await new Promise((r) => setTimeout(r, 2500));
      this.subtitle('(Out on the Stair, the processions have stopped. Someone is saying names aloud — their own.)', 'The Returned', 7);
    }
  }

  private spawnAdds() {
    this.clearAdds();
    const g = this.game;
    const mk = (kind: string, an: string, id: string) => {
      const a = this.A(an);
      const e = g.spawnEnemy(kind, a.pos.clone(), a.yaw, { id, leash: 40, seed: 900 + this.S.adds.length });
      this.decorate(e);
      e.becomeAware(this.player);
      this.S.adds.push(e);
      return e;
    };
    mk('cath_bearer', 'processionAdd1', 'prc_bearer1');
    mk('cath_bearer', 'processionAdd2', 'prc_bearer2');
    this.S.cantor = mk('cath_cantor', 'cantor', 'prc_cantor');
    this.S.hymnCd = 3.5;
    this.S.cantorFellSaid = false;
  }

  private clearAdds(dissolve = false) {
    const g = this.game;
    for (const e of this.S.adds) {
      if (dissolve && !e.dead) { e.hp = 0; e.react('death', e.pos); continue; }
      e.object.removeFromParent();
      const i = g.enemies.indexOf(e);
      if (i >= 0) g.enemies.splice(i, 1);
    }
    if (!dissolve) { this.S.adds = []; this.S.cantor = null; }
  }

  /** The reliquary pulses: the bearer and the bearers heal and steady themselves. */
  private reliquaryPulse() {
    const boss = this.bosses.get('procession');
    if (!boss || boss.dead || !this.fight) return;
    const phase2 = boss.phase > 1;
    const src = boss.chest.clone().add(new THREE.Vector3(0, 0.4, 0));
    boss.hp = Math.min(boss.hpMax, boss.hp + boss.hpMax * (phase2 ? 0.04 : 0.05));
    boss.posture = 0;
    this.game.fx('healMotes', src, { count: 50 });
    this.ring(boss.pos, 0.8, 7, 1.0);
    this.game.sfx('great_bell_toll', { pos: boss.pos, volume: 0.5 });
    this.pulseLinks = [];
    for (const e of this.S.adds) {
      if (e.dead || e === this.S.cantor) continue;
      e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.3);
      e.posture = 0;
      this.game.fx('healMotes', e.chest, { count: 20 });
      this.pulseLinks.push([boss, e]);
    }
    if (this.S.cantor) this.pulseLinks.push([this.S.cantor, boss]);
    this.linkT = 0.9;
  }
  private linkT = 0;
  private pulseLinks: [Enemy, Enemy][] = [];

  // ================================================================== healer-priests

  private rite(h: Enemy) {
    for (const a of this.alliesNear(h, 12)) {
      a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.35);
      a.posture = 0;
      this.game.fx('healMotes', a.chest, { count: 24 });
    }
    this.ring(h.pos, 0.8, 5.5, 0.8);
  }

  private alliesNear(h: Enemy, r: number) {
    return this.game.enemies.filter((a) => a !== h && !a.dead && !a.isBoss && a.team === 'unlived' && a.distTo(h) < r && Math.abs(a.pos.y - h.pos.y) < 4);
  }

  // ================================================================== grabs and knockdowns

  private beginGrab(by: Enemy, r: HitResult, crush: string, dmg: number) {
    const p = this.player;
    if (this.S.grab || r.target !== p || r.outcome !== 'hit' || p.dead) return;
    this.S.grab = { by, crush, dmg };
    by.startMove(MOVES[crush]);
    p.startMove(MOVES.cath_held);
    p.guarding = false;
    this.game.sfx('player_hurt', { pos: p.pos });
  }

  private crushRelease(by: Enemy) {
    const g = this.S.grab;
    if (!g || g.by !== by) return;
    this.S.grab = null;
    this.knockdown(by.pos, g.dmg);
  }

  private releaseGrab(knock: boolean) {
    const g = this.S?.grab;
    if (!g) return;
    this.S.grab = null;
    const p = this.player;
    if (p && !p.dead && p.move?.def.id === 'cath_held') { if (knock) this.knockdown(g.by.pos, 0); else p.endMove(); }
  }

  /** Thrown down: damage (armour applies), the knockdown move, a shove away from the source. */
  private knockdown(from: THREE.Vector3, dmg: number) {
    const p = this.player;
    if (!p || p.dead) return;
    if (dmg > 0) {
      const dealt = p.defend({ physical: dmg, magic: 0, fire: 0 }, 'strike');
      p.hp = Math.max(0, p.hp - dealt);
      this.game.sfx('hit_heavy', { pos: p.pos });
      this.game.fx('dust', p.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), { count: 30 });
      if (p.hp <= 0) { p.react('death', from); return; }
    }
    const dir = new THREE.Vector3(p.pos.x - from.x, 0, p.pos.z - from.z);
    if (dir.lengthSq() < 1e-4) dir.set(Math.sin(p.yaw), 0, Math.cos(p.yaw)).negate();
    dir.normalize();
    p.yaw = yawOf(-dir.x, -dir.z);
    p.startMove(MOVES.cath_knockdown);
    p.knock.addScaledVector(dir, 5);
    this.game.shake(0.45);
    this.game.sfx('player_hurt', { pos: p.pos });
  }

  // ================================================================== per step

  protected override stepRegion(dt: number) {
    const S = this.S, p = this.player;
    if (!p) return;
    S.procHitT = Math.max(0, S.procHitT - dt);

    // ---- processions: walk, ring, knock down (they keep to simulation time: frozen in menus)
    const live = this.game.mode === 'play' || this.game.mode === 'dead';
    this.L.processions.forEach((pr, i) => {
      if (!live) return;
      pr.step(dt);
      if (!pr.running) return;
      S.procSoundT[i] -= dt;
      if (S.procSoundT[i] <= 0) {
        S.procSoundT[i] = 3.2;
        if (pr.pos.distanceTo(p.pos) < 35) this.game.sfx('chain_rattle', { pos: pr.pos, volume: 0.7 });
      }
      if (!p.dead && S.procHitT <= 0 && !p.invulnerable && p.move?.def.id !== 'cath_knockdown' && pr.hits(p.pos, 0.3)) {
        S.procHitT = 1.5;
        this.knockdown(pr.pos, 140);
      }
    });
    S.twicePos.copy(this.L.processions[0].twicePos());

    // ---- held by a grab: pinned in front of the grabbing hand
    const g = S.grab;
    if (g) {
      if (g.by.dead || g.by.move?.def.id !== g.crush || p.dead) this.releaseGrab(!p.dead);
      else {
        const hand = new THREE.Vector3().setFromMatrixPosition(g.by.rig.bones.handL.matrixWorld);
        const fwd = g.by.forward;
        const target = hand.addScaledVector(fwd, 0.35);
        target.y -= 1.25;
        p.pos.copy(target);
        p.vel.set(0, 0, 0); p.vy = 0; p.knock.set(0, 0, 0);
        p.yaw = yawOf(g.by.pos.x - p.pos.x, g.by.pos.z - p.pos.z);
        if (p.move?.def.id !== 'cath_held') p.startMove(MOVES.cath_held);
      }
    }

    // ---- pleading pilgrims: rise when startled; otherwise murmur when the Returned is near
    S.barkT -= dt;
    for (const { e } of this.enemyList) {
      if (e.dead || !e.spawnId.startsWith('plead')) continue;
      if (e.move?.def.id === 'cath_kneel_loop') {
        if (e.aware) { e.startMove(MOVES.cath_pil_rise); continue; }
        if (S.barkT <= 0 && e.distTo(p) < 3.6 && !this.fight) {
          S.barkT = 9;
          const pool = DIALOGUE.cath_pilgrim_barks ?? [];
          if (pool.length) this.game.deps.ui?.subtitle(pool[Math.floor(Math.random() * pool.length)]);
        }
      }
    }

    // ---- healer-priests: begin the rite when an ally near them is hurt
    for (const e of this.game.enemies) {
      if (e.dead || e.def.kind !== 'cath_healer') continue;
      const cd = (S.healCd.get(e) ?? 2) - dt;
      S.healCd.set(e, cd);
      if (cd > 0 || e.move || !e.aware || !e.target) continue;
      const hurt = this.alliesNear(e, 12).some((a) => a.hp < a.hpMax * 0.8 || a.posture > a.postureMax * 0.35);
      if (hurt && e.distTo(e.target) > 1.6) { e.startMove(MOVES.cath_hlr_rite); S.healCd.set(e, 9); }
    }

    // ---- flagellants: the frenzy wears off
    for (const e of this.game.enemies) {
      if (e.def.kind !== 'cath_flagellant' || e.dead) continue;
      const un = (e as unknown as { __unfrenzy?: () => void }).__unfrenzy;
      if (!e.buffs.has('frenzy') && e.def.recover[0] < 0.3 && un) un();
    }

    // ---- the Procession fight: the cantor sings the reliquary awake
    const boss = this.bosses.get('procession');
    const cantor = S.cantor;
    if (this.fight?.arena.bossId === 'procession' && boss && !boss.dead) {
      if (cantor && !cantor.dead) {
        S.hymnCd -= dt;
        if (S.hymnCd <= 0 && !cantor.move) { cantor.startMove(MOVES.cath_ctr_hymn); S.hymnCd = boss.phase > 1 ? 7 : 9; }
      } else if (cantor && cantor.dead && !S.cantorFellSaid) {
        S.cantorFellSaid = true;
        this.game.deps.ui?.subtitle({ speaker: 'Cantor', text: '[The hymn falters. The reliquary dims.]', duration: 3.5 });
      }
    }

    // ---- heal links (drawn in frame): priests mid-rite, and the reliquary's pulse for a moment
    if (this.linkT > 0) this.linkT -= dt; else this.pulseLinks = [];
    const links: [Enemy, Enemy][] = this.pulseLinks.filter(([x, y]) => !x.dead && !y.dead);
    for (const e of this.game.enemies) {
      if (e.dead || e.move?.def.id !== 'cath_hlr_rite' || e.move.t < 0.2 || e.move.t > 2.0) continue;
      for (const a of this.alliesNear(e, 12).slice(0, 6)) links.push([e, a]);
    }
    S.links = links;

    // ---- far, unaware enemies are hidden (saves draw calls; they wake by perception as usual)
    S.cullT -= dt;
    if (S.cullT <= 0) {
      S.cullT = 0.5;
      const cam = this.game.deps.renderer.camera.position;
      for (const e of this.game.enemies) {
        if (e.dead) continue;
        const far = !e.aware && e.pos.distanceTo(cam) > 58;
        e.object.visible = !far;
      }
    }
  }

  // ================================================================== visuals

  override frame(dt: number) {
    super.frame(dt);
    const S = this.S;
    // links
    let i = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (const [from, to] of S.links) {
      if (i >= S.beams.length) break;
      const hand = from.def.kind === 'cath_healer' ? from.rig.bones.handL : from.rig.bones.chest;
      a.setFromMatrixPosition(hand.matrixWorld);
      b.copy(to.chest);
      const m = S.beams[i++];
      const d = a.distanceTo(b);
      m.position.copy(a);
      m.lookAt(b);
      m.scale.set(1 + Math.sin(this.time * 20 + i) * 0.3, 1 + Math.sin(this.time * 20 + i) * 0.3, d);
      m.visible = true;
    }
    for (; i < S.beams.length; i++) S.beams[i].visible = false;
    // rings
    for (const r of S.rings) {
      r.t += dt;
      const k = Math.min(1, r.t / r.dur);
      const rad = r.r0 + (r.r1 - r.r0) * (r.follow ? 0.5 + 0.5 * Math.sin(r.t * 6) : k);
      r.mesh.scale.set(rad, rad, rad);
      if (r.follow) r.mesh.position.set(r.follow.pos.x, r.follow.pos.y + 0.06, r.follow.pos.z);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (r.follow ? Math.min(1, (r.dur - r.t) * 2) : 1 - k);
    }
    S.rings = S.rings.filter((r) => {
      const alive = r.t < r.dur && !(r.follow && (r.follow.dead || !r.follow.move || (r.follow.move.def.id !== 'cath_hlr_rite' && r.follow.move.def.id !== 'cath_ctr_hymn')));
      if (!alive) { r.mesh.removeFromParent(); (r.mesh.material as THREE.Material).dispose(); r.mesh.geometry.dispose(); }
      return alive;
    });
  }

  /** A flat, expanding ring of light on the ground (rites, tolls, shockwaves). */
  private ring(pos: THREE.Vector3, r0: number, r1: number, dur: number, follow?: Enemy) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2), RING_MAT());
    m.position.set(pos.x, pos.y + 0.06, pos.z);
    m.renderOrder = 6;
    m.frustumCulled = false;
    this.S.fx.add(m);
    this.S.rings.push({ mesh: m, t: 0, dur, r0, r1, follow });
  }
}
