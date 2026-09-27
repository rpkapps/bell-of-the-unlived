/**
 * The Garden Court — region controller (quest logic over RegionBase).
 *
 *  - The Postern Page (Forememory): remembered — a page opened the postern for the enemy and was
 *    hanged; observed — Wynn Harrow is being coerced by a masked courtier in the linen room (the wax
 *    key); intervention — kill the courtier and free him (→ Hospice merchant; the postern is barred),
 *    or cross the Twin Heirs' veil (or Celwyn's) first and he is taken (the postern stands open, his
 *    cap in the lane).
 *  - Shortcuts (persistent): the kitchen door (bolted from inside → the Servants' Yard), the
 *    portcullis (winch on the Great Hall balcony → the Palace Terrace), and the Court of Two Claims'
 *    north gate (opens when the heirs fall → the loggia and the antechamber).
 *  - The Twin Heirs (duo mid-boss): two bosses in one arena, one combined bar; the survivor enrages;
 *    their Signet of Two Claims opens the throne room's sealed door onto the Bell Stair.
 *  - Dame Celwyn Ardent (keeper): a first-meeting conversation with a choice (journal only), her
 *    habit-reading stance, three phases, the Great Bell's anchor shattering on defeat.
 *  - The Unlived Muster: Corporal Aske in the Servants' Yard wants his company's colour back
 *    (in the maze's grave corner) → `muster.household`.
 */
import * as THREE from 'three';
import { RegionBase } from '../../game/regions/RegionBase';
import type { ArenaLayout } from '../../world/levelTypes';
import type { HudState, DialogueLine, DialogueChoice } from '../../game/types';
import type { Enemy } from '../../actors/Enemy';
import type { Boss } from '../bosses';
import { BOSSES } from '../bosses';
import { ENEMY_DEFS } from '../enemies';
import { DIALOGUE, registerDialogue } from '../dialogue';
import { WARNINGS } from '../text';
import { removeItem } from '../../systems/PlayerData';
import type { HouseholdLayout } from './level';
import { applyHouseholdBehaviour } from './enemies';
import { CelwynBoss, HeirBoss } from './bosses';

const F = {
  arrived: 'household.arrived', kitchen: 'household.kitchenDoor', portcullis: 'household.portcullis', buttery: 'household.butteryDoor',
  signet: 'household.signetDoor', celwynMet: 'household.celwynMet', musterMet: 'household.musterMet', muster: 'muster.household',
  heirs: 'boss.heirs', celwyn: 'boss.celwyn', celwynRead: 'household.celwynRead',
};

// ============================================================================ dialogue (lazy: only needed in the region)

const CEL = 'Dame Celwyn', WYNN = 'Wynn Harrow', RET = 'The Returned', ASKE = 'Corporal Aske', LAW = 'Casimir', BLOOD = 'Corisande', MASK = 'Masked Courtier';
registerDialogue({
  hh_arrive: [{ speaker: RET, text: 'The Household. Dame Celwyn\'s yard is beyond the gardens, under the bell.', duration: 4.5 }],
  hh_postern_memory: [{ speaker: RET, text: 'A page opened this door once. They hanged him from the orangery beam for it.', duration: 5 }],
  hh_coercer_bark: [{ speaker: MASK, text: 'Hush, now. The second watch, the garden door. Your mother sleeps sound tonight.', duration: 5 }],
  wynn_bound: [
    { speaker: WYNN, text: 'Please go. If he sees you he\'ll say I sent for you, and then it\'s my mother\'s turn.' },
  ],
  wynn_freed: [
    { speaker: WYNN, text: 'He\'s… he\'s not getting up? Then I don\'t have to open it.' },
    { speaker: WYNN, text: 'The postern. I was to draw the bar at the second watch. He had a key cut from my wax. I\'ll bar it again. Twice.' },
    { speaker: RET, text: 'There is a hospice at Ashbridge. The Hospice of the Quiet Hour. Go there, and stay.' },
    { speaker: WYNN, text: 'Ashbridge. I know the road; I carried letters on it. I\'ll take the pages\' keys with me. The steward won\'t miss them.' },
  ],
  hh_muster_first: [
    { speaker: ASKE, text: 'Captain? Captain. They said you would come to the palace in the end.' },
    { speaker: RET, text: 'I have never been to Greyford.' },
    { speaker: ASKE, text: 'No, sir. None of us have, now. But the muster remembers who stood at the ford.' },
    { speaker: ASKE, text: 'The gardeners took our company\'s colour to bury with a prince of the Elder Claim. It\'s in the maze, among the old graves.' },
    { speaker: ASKE, text: 'I can\'t go in. The hedges close up whenever I try. Bring it out, sir, and I\'ll stand when the muster\'s called.' },
  ],
  hh_muster_wait: [{ speaker: ASKE, text: 'The grave corner, sir. North and west, where the tree grows through the tomb.', duration: 4 }],
  hh_muster_colour: [
    { speaker: ASKE, text: 'That\'s it. That\'s ours. River-stained and all.' },
    { speaker: ASKE, text: 'A prince who never saw a battle, buried under the flag of one that never happened. They\'d have liked each other.' },
    { speaker: ASKE, text: 'When the muster\'s called, Corporal Aske stands. Take this. The captain taught it to us, before.' },
  ],
  hh_muster_idle: [
    { speaker: ASKE, text: 'Palace gardens. Greyford had reeds and a ford and not one statue.', duration: 4 },
    { speaker: ASKE, text: 'The muster\'s gathering, sir. Slowly. We have time. That\'s the one thing we were given.', duration: 4.5 },
  ],
  // ---- the Twin Heirs
  heirs_intro: [
    { speaker: LAW, text: 'The law is plain. The crown passes to the elder.', duration: 3.5 },
    { speaker: BLOOD, text: 'The blood is plainer. It passes to the worthy.', duration: 3.5 },
  ],
  heirs_enrage_law: [{ speaker: LAW, text: 'Sister— No. Then the law will have its heir, and you will be its first sentence.', duration: 5 }],
  heirs_enrage_blood: [{ speaker: BLOOD, text: 'Brother? …Then there is one claim left, and it is mine to prove on you.', duration: 5 }],
  heirs_rival: [
    { speaker: LAW, text: 'Stand aside, sister!', duration: 2.5 },
    { speaker: BLOOD, text: 'Mind your blade, brother. Or don\'t.', duration: 2.5 },
  ],
  heirs_death: [{ speaker: BLOOD, text: 'Two crowns, one door. It was never going to open.', duration: 4.5 }],
  // ---- Dame Celwyn
  celwyn_meet: [
    { speaker: CEL, text: 'You came up by the servants\' stair. You always did. The front door was for people with nothing to hide.' },
    { speaker: CEL, text: 'Twenty years I have kept this bell for the crown. You were meant to keep it with me.' },
    { speaker: CEL, text: 'Tell me why, before we begin. I should like to know what I failed to teach you.' },
  ],
  celwyn_answer_crown: [{ speaker: CEL, text: 'The crown has already chosen. Loyalty to the crown is loyalty to its choices, even the terrible ones. Especially those.' }],
  celwyn_answer_people: [{ speaker: CEL, text: 'Half a lesson. The easier half. You were always quick with the easy half.' }],
  celwyn_answer_silence: [{ speaker: CEL, text: 'Still. That was the one habit of yours I never managed to break.' }],
  celwyn_guard: [{ speaker: CEL, text: 'You still drop your guard after the third cut. Show me you remember why that matters.' }],
  celwyn_intro: [{ speaker: CEL, text: 'Again, then. From the beginning. Feet first.', duration: 3.5 }],
  celwyn_phase2: [{ speaker: CEL, text: 'Enough ceremony. This is the lesson you slept through.', duration: 4 }],
  celwyn_phase3: [{ speaker: CEL, text: 'Hear it? That is the crown, choosing. I choose with it.', duration: 4.5 }],
  celwyn_death: [
    { speaker: CEL, text: 'Good. That was… good.', duration: 3.5 },
    { speaker: CEL, text: 'You think you are protecting them from him. Someone must protect them from you, afterwards. Remember that.', duration: 6 },
  ],
  celwyn_read_third: [{ speaker: CEL, text: 'You still drop your guard after the third cut.', duration: 3 }],
  celwyn_read_repeat: [
    { speaker: CEL, text: 'The same blow twice. I taught you better than that.', duration: 3 },
    { speaker: CEL, text: 'Again? I can read you like a duty roster.', duration: 3 },
  ],
  celwyn_caught: [
    { speaker: CEL, text: 'There. That one I did not see.', duration: 3 },
    { speaker: CEL, text: 'Better. That is better.', duration: 2.5 },
  ],
  celwyn_parried: [{ speaker: CEL, text: 'Mind the third cut.', duration: 2.5 }],
  hh_bell_silent: [{ speaker: RET, text: 'The Household bell is silent. Four chains, and not one of them held her.', duration: 5 }],
});

export class HouseholdRegion extends RegionBase {
  declare readonly L: HouseholdLayout;
  override defaultEnvironment = 'householdGarden';
  override defaultMusic = 'household' as const;
  /** The younger heir (spawned alongside the arena boss). */
  private younger: HeirBoss | null = null;
  private heirsFallen = new Set<HeirBoss>();
  private coercer: Enemy | null = null;
  private barkCd = 0;

  // ------------------------------------------------------------------ helpers
  private get page() { return this.ws.npcs.wynn; }
  private get pageHeld() { const p = this.ws.npcs.wynn; return !p || p === 'imprisoned'; }
  private has(id: string) { return (this.pd.inventory[id]?.count ?? 0) > 0; }
  private lines(key: string, one = false) {
    const pool = DIALOGUE[key] ?? [];
    if (!pool.length) return;
    const list = one ? [pool[Math.floor(Math.random() * pool.length)]] : pool;
    for (const l of list) this.game.deps.ui?.subtitle({ ...l, duration: l.duration ?? 4 });
  }
  private async choose(lines: DialogueLine[], choices: DialogueChoice[]) {
    const ui = this.game.deps.ui;
    if (!ui) return null;
    this.game.mode = 'dialogue';
    this.game.input.releaseAll();
    const r = await ui.dialogue(lines, choices);
    this.game.input.releaseAll();
    if (this.game.mode === 'dialogue') this.game.mode = 'play';
    return r;
  }

  protected override pieceFlags() {
    return { kitchenDoor: F.kitchen, portcullis: F.portcullis, winch: F.portcullis, butteryDoor: F.buttery, signetDoor: F.signet, heirsGate: F.heirs };
  }

  // ------------------------------------------------------------------ setup
  protected setup() {
    const L = this.L, A = (n: string) => this.A(n);
    if (!this.ws.npcs.wynn) this.ws.npcs.wynn = 'imprisoned';

    // --- shortcuts
    this.opener('kitchen', 'kitchenDoor', F.kitchen, 'Draw the bolt', { cue: 'door_open', after: () => this.subtitle('The kitchen door opens onto the Servants\' Yard.', 'The Returned', 3.5) });
    this.add('kitchenYard', A('kitchenDoorYard'), 1.9, () => (this.flag(F.kitchen) ? null : 'Try the door'), () => this.inspect('hh_kitchen_bolted'));
    this.opener('winch', 'winch', F.portcullis, 'Turn the portcullis winch', {
      cue: 'lever_pull', dur: 2.4,
      after: () => {
        this.game.sfx('chain_rattle', { pos: L.pieces.portcullis.anchor!.pos });
        this.tween(this.P('portcullis'), 0, 1, 3.2, () => this.game.sfx('gate_open', { pos: L.pieces.portcullis.anchor!.pos }));
        this.game.shake(0.2);
      },
    });
    this.add('portcullisOut', L.pieces.portcullis.anchor!, 2.2, () => (this.flag(F.portcullis) ? null : 'Examine the portcullis'), () => this.inspectLines('Palace Gate', ['The portcullis is down, its chains taut. The winch that raises it must be inside, above the hall.']));
    this.opener('buttery', 'butteryDoor', F.buttery, 'Unlock the buttery', { requires: { item: 'hh_cellar_key', locked: 'Locked. The palace pages carried the keys.' } });
    this.opener('signet', 'signetDoor', F.signet, 'Open the sealed door', { cue: 'gate_open', dur: 1.8, requires: { item: 'hh_signet', locked: 'Sealed with two half-crowns. It wants a single signet ring.' } });

    // --- loot
    this.pickup('hhYardScrap', 'yardScrap', 'bellbronze_scrap', 1);
    this.pickup('hhParterreKnives', 'parterreScrap', 'throwing_knife', 4);
    this.pickup('hhGazebo', 'gazeboTable', 'imprint_vow_parry', 1, 'Take the scroll');
    this.add('pickup:hhOathSet', A('oathSet'), 1.8, () => (this.ws.pickups.hhOathSet ? null : 'Search the tomb'), () => this.playerAct('pickup', () => {
      this.ws.pickups.hhOathSet = true;
      for (const id of ['oath_scarf', 'oath_coat', 'oath_bracers', 'oath_boots']) this.session.grantItem(id, 1);
      this.record('household_successions', 'obs_graves');
      this.session.save();
    }));
    this.add('pickup:hhColour', A('greyfordColour'), 1.8, () => (this.ws.pickups.hhColour || this.flag(F.muster) ? null : 'Take the folded colour'), () => this.playerAct('pickup', () => {
      this.ws.pickups.hhColour = true;
      this.session.grantItem('hh_greyford_colour');
      this.record('household_muster', 'obs_soldier');
      this.session.save();
    }));
    this.add('pickup:hhPantry', A('pantryLoot'), 1.8, () => (this.ws.pickups.hhPantry ? null : 'Search the shelves'), () => this.playerAct('pickup', () => {
      this.ws.pickups.hhPantry = true;
      this.session.grantItem('throwing_knife', 5);
      this.session.grantItem('imprint_riposte_stance');
      this.session.save();
    }));
    this.pickup('hhNiche', 'galleryNiche', 'parrying_dirk', 1, 'Lift the veil', () => this.record('household_successions', 'obs_portraits'));
    this.pickup('hhResin', 'hallResin', 'ember_resin', 2);
    this.pickup('hhThroneScrap', 'throneScrap', 'bellbronze_scrap', 2);
    this.pickup('hhShard', 'orangeryShard', 'bellbronze_shard', 1);
    this.add('pickup:hhButtery', A('butteryLoot'), 1.8, () => (this.ws.pickups.hhButtery ? null : 'Take the armour'), () => this.playerAct('pickup', () => {
      this.ws.pickups.hhButtery = true;
      for (const id of ['household_guard_helm', 'household_guard_plate', 'household_guard_gauntlets', 'household_guard_greaves']) this.session.grantItem(id, 1);
      this.session.grantItem('ember_resin', 2);
      this.session.save();
    }));

    // --- histories that contradict each other
    this.inspectAt('hh_statues', 'avenueStatue', 'Read the plaques');
    this.inspectAt('hh_graves', 'mazeGraves', 'Read the headstones', () => this.record('household_successions', 'obs_graves'));
    this.inspectAt('hh_portraits', 'portraits', 'Look at the portraits', () => this.record('household_successions', 'obs_portraits'));
    this.inspectAt('hh_rolls', 'coronationRolls', 'Read the coronation rolls', () => { this.record('household_successions', 'mem_coronation'); this.record('household_successions', 'obs_thrones'); });
    this.inspectAt('hh_thrones', 'thrones', 'Look at the thrones', () => { this.record('household_successions', 'mem_coronation'); this.record('household_successions', 'obs_thrones'); });
    this.inspectAt('hh_orangery_beam', 'orangeryBeam', 'Look up at the beam', () => this.record('household_postern', 'mem_postern'), 2.6);
    this.inspectAt('hh_bell', 'greatBell', 'Look up at the Great Bell', undefined, 3);
    this.inspectAt('hh_signet_locked', 'bellStairFoot', 'Examine the door', undefined, 0.01);

    // --- the Postern Page
    this.add('postern', A('postern'), 2.0, () => 'Examine the postern', () => this.inspect('hh_postern', () => { this.record('household_postern', 'mem_postern'); if (this.pageHeld) this.subtitle('Oiled hinges. Someone means to open it soon.', RET, 3.5); }));
    this.add('wax', A('waxTable'), 1.8, () => (this.pageHeld ? 'Read the note on the table' : null), () => this.inspect('hh_wax', () => { this.record('household_postern', 'obs_wax'); this.record('household_postern', 'obs_coerced'); }));
    this.add('page', A('page'), 2.2, () => (this.pageHeld ? (this.coercerAlive() ? 'Speak with the page' : 'Free the page') : null), () => void this.talkPage(), false);
    this.add('pageCap', A('pageCap'), 1.8, () => (this.page === 'taken' ? 'Examine the cap' : null), () => this.inspect('hh_page_cap'));
    this.onTrigger('posternMemory', () => {
      this.memoryFlash();
      this.record('household_postern', 'mem_postern');
      this.lines('hh_postern_memory');
    });
    this.onTrigger('linenApproach', () => {
      if (!this.pageHeld) return;
      this.record('household_postern', 'mem_postern');
      this.record('household_postern', 'obs_coerced');
      if (this.coercerAlive()) this.lines('hh_coercer_bark');
    });

    // --- the Unlived Muster
    this.add('muster', A('musterSoldier'), 2.4, () => 'Speak with the Greyford soldier', () => void this.talkMuster(), false);

    // --- arrival line
    if (!this.flag(F.arrived)) { this.setFlag(F.arrived); setTimeout(() => this.lines('hh_arrive'), 2500); }
    if (!this.session.journalSys?.has?.('mem_training')) this.record('household_celwyn', 'mem_training');
  }

  private inspectLines(title: string, text: string[]) { return this.dialogue(text.map((t) => ({ speaker: title, text: t }))); }

  // ------------------------------------------------------------------ state
  protected override applyRegionState() {
    const P = this.L.pieces;
    P.posternDoor?.set(this.page === 'taken' ? 1 : 0);
    P.posternBar?.set(this.page === 'rescued' ? 1 : 0);
    this.placeNpcs();
  }

  private placeNpcs() {
    this.removeNpc('wynn');
    if (this.pageHeld) this.spawnNpc('wynn', this.A('page'), 'hhKneel', 'wynn', { height: 0.9, bulk: 0.85, shoulder: 0.9 });
    this.removeNpc('aske');
    this.spawnNpc('aske', this.A('musterSoldier'), this.flag(F.muster) ? 'standPray' : 'sit', 'hhMuster');
  }

  protected override spawnEnemies() {
    super.spawnEnemies();
    this.coercer = null;
    for (const { e } of this.enemyList) {
      applyHouseholdBehaviour(e);
      if (e.spawnId === 'hh_coercer') {
        this.coercer = e;
        if (!this.pageHeld) this.hideEnemy(e);
      }
    }
  }

  override resetEnemies() {
    this.despawnYounger();
    super.resetEnemies();
    for (const { e } of this.enemyList) applyHouseholdBehaviour(e);
    if (this.coercer && !this.pageHeld) this.hideEnemy(this.coercer);
  }

  private hideEnemy(e: Enemy) {
    e.object.removeFromParent();
    const i = this.game.enemies.indexOf(e);
    if (i >= 0) this.game.enemies.splice(i, 1);
  }
  private coercerAlive() { const c = this.coercer; return !!c && !c.dead && this.game.enemies.includes(c); }

  // ------------------------------------------------------------------ the page
  private async talkPage() {
    if (!this.pageHeld) return;
    if (this.coercerAlive()) { await this.talk('wynn_bound'); this.record('household_postern', 'obs_coerced'); return; }
    await this.talk('wynn_freed');
    this.ws.npcs.wynn = 'rescued';
    this.record('household_postern', 'mem_postern');
    this.record('household_postern', 'obs_coerced');
    this.record('household_postern', 'conf_freed');
    this.removeNpc('wynn');
    this.game.fx('bellMotes', this.A('page').pos.clone().add(new THREE.Vector3(0, 1, 0)), { count: 40 });
    this.tween(this.P('posternBar'), 0, 1, 0.8, () => this.game.sfx('door_open', { pos: this.A('postern').pos }));
    this.game.deps.ui?.toast('Wynn Harrow will wait at the Hospice of the Quiet Hour', 'info');
    this.session.save();
  }

  /** Crossing a veil while he is still held: the courtier takes him through the postern. */
  private takePage() {
    if (!this.pageHeld) return;
    this.ws.npcs.wynn = 'taken';
    this.record('household_postern', 'mem_postern');
    this.record('household_postern', 'conf_taken');
    this.removeNpc('wynn');
    if (this.coercer) this.hideEnemy(this.coercer);
    this.P('posternDoor').set(1);
    this.session.save();
  }

  // ------------------------------------------------------------------ the muster
  private async talkMuster() {
    if (this.flag(F.muster)) { const pool = DIALOGUE.hh_muster_idle; await this.dialogue([pool[Math.floor(Math.random() * pool.length)]]); return; }
    if (!this.flag(F.musterMet)) { await this.talk('hh_muster_first'); this.setFlag(F.musterMet); this.record('household_muster', 'obs_soldier'); this.session.save(); }
    if (this.has('hh_greyford_colour')) {
      await this.talk('hh_muster_colour');
      removeItem(this.pd, 'hh_greyford_colour');
      this.setFlag(F.muster);
      this.record('household_muster', 'conf_muster');
      this.session.grantItem('imprint_greyford_flourish');
      if (!this.has('greyford_sabre')) this.session.grantItem('greyford_sabre');
      this.npcs.get('aske')?.setIdle('standPray');
      this.session.save();
    } else if (this.heard('hh_muster_first')) await this.talk('hh_muster_wait');
  }

  // ------------------------------------------------------------------ bosses
  protected override arenaWarning(a: ArenaLayout) {
    if (!this.pageHeld) return '';
    return a.bossId === 'heirs' ? 'hh_heirs_page' : a.bossId === 'celwyn' ? 'hh_celwyn_page' : '';
  }
  protected override beforeArena(_a: ArenaLayout) { this.takePage(); }

  protected override spawnBoss(a: ArenaLayout): Boss {
    const b = super.spawnBoss(a);
    const g = this.game;
    if (a.bossId === 'heirs' && b instanceof HeirBoss) {
      this.despawnYounger();
      const spec = BOSSES.heirs_blood;
      const y = new HeirBoss(spec, g, 6);
      y.spawnId = 'heirs_blood';
      const at = this.A('heirYounger');
      y.home.copy(at.pos); y.homeYaw = at.yaw;
      this.dressBoss(y, 1);
      g.scene.add(y.object);
      y.resetAt(at.pos.clone(), at.yaw);
      g.enemies.push(y);
      this.younger = y;
      this.heirsFallen.clear();
      b.rival = y; y.rival = b;
      const finish = b.onKilled;
      const fell = (h: HeirBoss) => {
        if (this.heirsFallen.has(h)) return;
        this.heirsFallen.add(h);
        const other = h === b ? y : b;
        if (!other.dead && this.heirsFallen.size < 2) {
          if (h === y) (g as unknown as { onEnemyKilled(e: Enemy): void }).onEnemyKilled(y);
          other.enrage();
          this.lines(other === b ? 'heirs_enrage_law' : 'heirs_enrage_blood');
          return;
        }
        if (h === y) (g as unknown as { onEnemyKilled(e: Enemy): void }).onEnemyKilled(y);
        finish(b);
      };
      b.onKilled = () => fell(b);
      y.onKilled = () => fell(y);
      const enraged = (h: Boss) => {
        this.dressBoss(h, 2);
        this.session.audio?.setMusic('boss:heirs:2', 0.3);
        this.game.fx('goldMotes', h.chest, { count: 120, speed: 3 });
        this.game.shake(0.4);
      };
      let rivalLine = 0;
      for (const h of [b, y]) {
        h.onEvent = (id) => { if (id === 'enraged') enraged(h); };
        h.onShockwave = (p) => { g.fx('dust', p, { count: 70, speed: 6 }); g.fx('sparks', p, { count: 16 }); };
        h.onRivalHit = () => { if (this.time - rivalLine > 12) { rivalLine = this.time; this.lines('heirs_rival', true); } };
      }
    }
    if (a.bossId === 'celwyn' && b instanceof CelwynBoss) {
      let caughtOnce = false;
      b.onRead = (kind) => {
        if (kind === 'third') this.lines('celwyn_read_third');
        else if (kind === 'repeat') this.lines('celwyn_read_repeat', true);
        else if (kind === 'caught') { if (!caughtOnce || Math.random() < 0.3) this.lines('celwyn_caught', true); caughtOnce = true; }
        else if (kind === 'parried' && Math.random() < 0.35) this.lines('celwyn_parried');
        if (kind !== 'parried') this.record('household_celwyn', 'obs_reads');
      };
      b.onShockwave = (p) => { g.fx('goldMotes', p, { count: 90, speed: 7 }); g.fx('dust', p, { count: 60, speed: 6 }); };
      b.onEvent = (id) => { if (id === 'bellLight') this.game.sfx('great_bell_toll', { pos: this.A('greatBell').pos }); };
    }
    return b;
  }

  private despawnYounger() {
    const y = this.younger;
    if (!y) return;
    this.hideEnemy(y);
    this.younger = null;
  }

  protected override async enterArena(a: ArenaLayout) {
    if (a.bossId === 'celwyn' && !this.flag(F.celwynMet)) { await this.meetCelwyn(a); return; }
    await super.enterArena(a);
    if (a.bossId === 'heirs' && this.fight && this.younger) {
      this.younger.engaged = true;
      this.younger.becomeAware(this.player);
      this.record('household_successions', 'obs_heirs');
    }
  }

  /** First crossing of Celwyn's veil: the conversation with a choice (journal only), then the fight. */
  private async meetCelwyn(a: ArenaLayout) {
    const ui = this.game.deps.ui;
    const boss = this.bosses.get('celwyn');
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
    this.game.cam.snapBehind(p);
    this.fight = { arena: a, boss };
    boss.faceToward(p.pos.x, p.pos.z, 10);
    await ui.fade(0, 0.5);
    this.session.audio?.setMusic('none', 1);
    const pick = await this.choose(DIALOGUE.celwyn_meet, [
      { id: 'crown', text: 'I am silencing the bells for the crown\'s own sake.' },
      { id: 'people', text: 'I am not here for the crown. I am here for the people it means to erase.' },
      { id: 'silence', text: '(Say nothing.)' },
    ]);
    const answer = pick === 'crown' || pick === 'people' ? pick : 'silence';
    this.setFlag(F.celwynMet);
    this.setFlag('household.celwynAnswer', answer);
    this.record('household_celwyn', 'mem_training');
    this.record('household_celwyn', `obs_answer_${answer}`);
    await this.talk(`celwyn_answer_${answer}`);
    await this.talk('celwyn_guard');
    this.session.save();
    if (this.fight?.boss !== boss || p.dead) return;
    this.session.audio?.setMusic('boss:celwyn:1', 0.5);
    boss.engaged = true;
    boss.becomeAware(p);
  }

  protected override async onBossDefeated(id: string) {
    if (id === 'heirs') {
      this.lines('heirs_death');
      this.session.grantItem('hh_signet');
      this.record('household_successions', 'obs_heirs');
      this.game.sfx('gate_open', { pos: this.P('heirsGate').anchor?.pos ?? this.L.arenas[0].center });
      this.younger = null;
    }
    if (id === 'celwyn') {
      this.record('household_celwyn', 'conf_celwyn');
      setTimeout(() => this.lines('hh_bell_silent'), 6000);
    }
  }

  override onPlayerDeath() {
    if (this.younger) this.younger.engaged = false;
    super.onPlayerDeath();
  }

  // ------------------------------------------------------------------ Unfinished Toll
  protected override objective(): THREE.Vector3 | null {
    if (this.pageHeld) return this.A('page').pos;
    if (!this.flag(F.muster) && (this.flag(F.musterMet) || this.ws.pickups.hhColour)) return this.has('hh_greyford_colour') ? this.A('musterSoldier').pos : this.A('greyfordColour').pos;
    if (!this.flag(F.heirs)) return this.L.arenas.find((a) => a.bossId === 'heirs')!.fogGate.anchor.pos;
    if (!this.flag(F.celwyn)) return this.L.arenas.find((a) => a.bossId === 'celwyn')!.fogGate.anchor.pos;
    return null;
  }

  // ------------------------------------------------------------------ per step / HUD
  protected override stepRegion(dt: number) {
    this.barkCd -= dt;
    // the courtier mutters at the page while the player is near the linen room
    if (this.pageHeld && this.coercerAlive() && this.barkCd <= 0 && this.player.pos.distanceTo(this.A('page').pos) < 9 && !this.coercer!.aware) {
      this.barkCd = 16;
      this.lines('hh_coercer_bark');
    }
  }

  override hud(h: HudState) {
    super.hud(h);
    const f = this.fight;
    if (f && f.arena.bossId === 'heirs' && this.younger) {
      const a = f.boss, b = this.younger;
      const hp = (a.dead ? 0 : a.hp) + (b.dead ? 0 : b.hp), max = a.hpMax + b.hpMax;
      if (hp > 0) h.boss = { name: 'The Twin Heirs', title: 'Casimir, Heir by Law · Corisande, Heir by Blood', hp01: hp / max, posture01: Math.max(a.dead ? 0 : a.posture / a.postureMax, b.dead ? 0 : b.posture / b.postureMax), phase: Math.max(a.phase, b.phase) };
    }
  }
}

void ENEMY_DEFS;
