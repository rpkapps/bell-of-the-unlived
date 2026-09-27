/**
 * The Belfry of Return — region controller (quest logic, Aldren's fight visuals, the endings).
 *
 * Persistence (ws.flags):
 *   belfry.revealed      first-arrival camera reveal played
 *   belfry.greatDoor     the Great Door's bar lifted from inside (shortcut 1: foot ↔ F1)
 *   belfry.galleryGate   the Buttress Gallery gate drawn from the stair side (shortcut 2: foot ↔ F5)
 *   belfry.ossuaryDoor   the loose name-plate pressed (the way to the Branding Cell)
 *   belfry.recordLaid    the full record laid on the empty throne (the council takes its seats)
 *   boss.aldren / boss.bellkeeper, ending = 'break' | 'inherit' | 'shelter'
 *
 * The final decision is made deliberately, at the Bell of Return's rope after Aldren falls, never by
 * death count. Unavailable endings are listed with a plain-language reason.
 */
import * as THREE from 'three';
import type { Game } from '../../game/Game';
import type { Session } from '../../game/Session';
import type { RegionInfo } from '../../game/regions/catalog';
import { RegionBase } from '../../game/regions/RegionBase';
import type { Boss } from '../bosses';
import type { ArenaLayout } from '../../world/levelTypes';
import type { DialogueLine, DialogueChoice } from '../../game/types';
import type { WorldState } from '../../systems/WorldState';
import type { MusicState } from '../../audio/contract';
import type { Combatant } from '../../combat/Combat';
import { DIALOGUE, registerDialogue, type CinematicCard } from '../dialogue';
import { alliesSaved, musterComplete, MUSTER_REGIONS, HOSPICE_GUESTS } from '../../game/regions/hub';
import { AldrenBoss, RING_BANDS, RING_WARN } from './bosses';
import { BELFRY_LEAD, ensureRevelationEntry } from './meta';
import { PLAN } from './levelCommon';
import type { BelfryLayout } from './level';

const RETURNED = 'The Returned';
const ALDREN_MEM = 'King Aldren';

// ================================================================== endings (pure logic, tested)

export type EndingId = 'break' | 'inherit' | 'shelter';
export interface EndingOption { id: EndingId; label: string; available: boolean; reason: string }

/** Which endings can be chosen now, with plain-language reasons for those that cannot. */
export function endingOptions(ws: WorldState): EndingOption[] {
  const allies = alliesSaved(ws);
  const muster = MUSTER_REGIONS.filter((r) => ws.flags['muster.' + r]).length;
  const mc = musterComplete(ws);
  return [
    { id: 'break', label: 'Break the Covenant', available: true, reason: '' },
    {
      id: 'inherit', label: 'Inherit the Covenant', available: allies >= 3,
      reason: allies >= 3 ? '' : `This needs at least three allies saved. You saved ${allies === 0 ? 'none' : allies === 1 ? 'one' : 'two'}.`,
    },
    {
      id: 'shelter', label: 'Shelter the Unlived', available: mc,
      reason: mc ? '' : `This needs the Unlived Muster completed in all five regions. ${muster === 0 ? 'None are' : `Only ${muster} of 5 ${muster === 1 ? 'is' : 'are'}`} complete.`,
    },
  ];
}

const KNOWN_NAMES: Record<string, string> = { oswin: 'Oswin Marrow', hesper: 'Hesper Vail', brannoc: 'Sergeant Brannoc' };
const nameOf = (id: string) => HOSPICE_GUESTS.find((g) => g.id === id)?.name ?? KNOWN_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/[_.-]+/g, ' ');
const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** Who lived and who was lost, from the NPC fates of the whole campaign. */
export function fates(ws: WorldState): { lived: string[]; lost: string[] } {
  const lived: string[] = [], lost: string[] = [];
  for (const [id, f] of Object.entries(ws.npcs)) {
    if (f === 'rescued' || f === 'present') lived.push(nameOf(id));
    else if (f === 'taken' || f === 'dead' || f === 'imprisoned') lost.push(nameOf(id));
  }
  return { lived, lost };
}

/** Epilogue cards for an ending (10–16 cards), naming who lived and who was lost. */
export function epilogueCards(id: EndingId, ws: WorldState): CinematicCard[] {
  const { lived, lost } = fates(ws);
  const oswinLived = ws.npcs.oswin === 'rescued';
  const keeper = !!ws.flags['boss.bellkeeper'];
  const record = !!ws.flags['belfry.recordLaid'];
  const muster = musterComplete(ws);
  const P = (text: string, duration = 5): CinematicCard => ({ text, style: 'plain', duration });
  const Mem = (text: string, duration = 5): CinematicCard => ({ text, style: 'memory', duration });
  const cards: CinematicCard[] = [Mem('The King lay under the lowered bell. He looked younger than I had ever seen him.', 5)];
  const livedCard = (tail: string) => lived.length ? [P(`${list(lived)} ${lived.length === 1 ? 'lived' : 'lived'}. ${tail}`, 6)] : [P('None of those I tried to save were left to see it. I had tried. It is not the same thing.', 6)];
  const lostCard = (tail: string) => lost.length ? [P(`${list(lost)} ${lost.length === 1 ? 'was' : 'were'} not coming back. ${tail}`, 6)] : [];
  if (id === 'break') {
    cards.push(
      P('I took the rope in both hands, and I did not ring it.', 4),
      P('I cut it. The Bell of Return came down through the Crown and did not break, and did not sound.', 5.5),
      P('The Covenant came apart like wet thread. Every Stillbell in the kingdom rang once, and then never again.', 6),
      P('No one would return now. Not the king. Not me.', 4),
      ...livedCard('They never knew how near the end had come, and I did not tell them.'),
      ...lostCard(`I said ${lost.length === 1 ? 'the name' : 'their names'} on the stair${oswinLived ? ', the way Oswin says them' : '. Someone had to'}.`),
      P('The war came, as it was always going to. The kingdom lost a province, and then a second, and held the river.', 6),
      P('It was a smaller kingdom. It was the one that happened.', 4.5),
      P(muster ? 'The Greyford muster kept its watch beneath Ashbridge until the light went out of them, one by one, at peace.' : 'The Unlived faded with the bells. No one remembered their wars. I tried.', 6),
      P(keeper ? 'I buried the Bellkeeper\'s book under the watchtower. Someone must remember. It does not have to be a bell.' : 'Somewhere under the Belfry, a condemned man went on heating his brands for a stranger. I hope he stopped.', 6),
      ...(record ? [P('The council of seven never sat. But their chairs are still in the tower, and people climb up to sit in them.', 6)] : []),
      Mem('Twenty years on, I am an old retainer on a small border. I remember all of it. I am the only one who does.', 6),
      Mem('Who has the right to decide which lives continue? No one. Not even me.', 5),
      { text: 'THE COVENANT IS BROKEN', style: 'title', duration: 5 },
    );
  } else if (id === 'inherit') {
    cards.push(
      P('I took the rope in both hands, and I rang it once, softly, the way he never had.', 5),
      P('The Covenant turned toward me like a hound toward a new master. It knew my name. It had always known it.', 6),
      P('I did not unmake the kingdom. I did not have to. I only had to be ready to.', 5),
      ...livedCard('Whenever the war came near them, it turned aside. I made sure of it.'),
      ...lostCard('The bell would have let me bring them back. I did not ask it. Not yet.'),
      P('The war came. It was lost at the border and won at the river, and won again, and again, until it was simply won.', 6),
      P('Each time a friend was threatened I climbed the Belfry, and each time the climb was shorter.', 5),
      P(muster ? 'The Greyford muster still stands beneath Ashbridge, waiting for their captain\'s order. I have not given one. I could.' : 'The Unlived still walk the old roads. They look at me the way they looked at him.', 6),
      P(keeper ? 'There is no one left to brand the next retainer. I keep the Bellkeeper\'s book at the Crown, open at my name.' : 'Beneath the Belfry, a condemned man is still waiting to brand whoever comes after me.', 6),
      ...(record ? [P('The seven councillors sit before the empty throne. Some nights I hear them counting. They always reach the same sum.', 6)] : []),
      P('Aldren believed every life he spent bought a better kingdom. I believed him wrong. I still do. I keep the rope close anyway.', 6.5),
      Mem('I remember everything. That is the Covenant\'s only price. I pay it gladly, and I know what that means.', 6),
      Mem('Who has the right to decide which lives continue? I have not decided. Not yet.', 5),
      { text: 'THE COVENANT IS INHERITED', style: 'title', duration: 5 },
    );
  } else {
    cards.push(
      P('I took the rope, and I did not ring it for the living.', 4.5),
      P('I rang it for the others: every future he had struck through, every army he had unmade, every name scraped from every plate.', 6.5),
      P('The Bell of Return sounded once, low, for a very long time.', 4.5),
      P('And the discarded histories came down the Belfry stair and did not vanish. They were given a place.', 6),
      P('The Greyford muster marched out of the ground beneath Ashbridge under their captain\'s banner. Sergeant Brannoc asked me for orders. I told him there were none. He laughed.', 7),
      ...livedCard('Now they have neighbours from other histories, who remember them differently, and are sometimes right.'),
      ...lostCard(`Even a sheltered history keeps its losses. We keep a chair for ${lost.length === 1 ? 'that one' : 'each of them'}.`),
      P('The river guilds of the Ninth Future opened their granaries in a kingdom that had never heard of them.', 6),
      ...(record ? [P('The council of seven came down from the Coronation and took seats among the Estates. They were very good at arguing.', 6)] : []),
      P(keeper ? 'The Bellkeeper\'s book was read aloud in the square, every name in it. For once, no one forgot.' : 'Even the Condemned Bellkeeper was offered a place. They say he refused, and kept his brazier lit, in case.', 6),
      P('It is a crowded kingdom now, and a strange one, and not always kind. But no life in it was judged unworthy of continuing.', 6.5),
      Mem('Who has the right to decide which lives continue? We decide it together, badly, every day.', 5.5),
      { text: 'THE UNLIVED ARE SHELTERED', style: 'title', duration: 5 },
    );
  }
  return cards.slice(0, 16);
}

export const CREDIT_CARDS: CinematicCard[] = [
  { text: 'BELLS OF THE UNLIVED', style: 'title', duration: 5 },
  { text: 'Design, code, art and audio: procedural. Every stone, bell, face, voice and melody is made by code as you play.', style: 'plain', duration: 6 },
  { text: 'Fonts: Cinzel and Cormorant Garamond, under the SIL Open Font License 1.1.', style: 'plain', duration: 5 },
  { text: 'three.js and three-mesh-bvh, under the MIT License.', style: 'plain', duration: 4.5 },
  { text: 'Thank you for remembering.', style: 'memory', duration: 5 },
];

const ENDING_CONFIRM: Record<EndingId, { title: string; body: string; yes: string }> = {
  break: { title: 'Break the Covenant?', body: 'Return will end for everyone: the king, and you. The world moves on with its losses. This cannot be undone.', yes: 'Break it' },
  inherit: { title: 'Inherit the Covenant?', body: 'Your allies will be protected. You will hold the power to unmake what threatens them, as Aldren did. This cannot be undone.', yes: 'Inherit it' },
  shelter: { title: 'Shelter the Unlived?', body: 'The discarded histories will be given a place in the world, beside this one. This cannot be undone.', yes: 'Shelter them' },
};

// ================================================================== region dialogue

const ALDREN_INTRO = DIALOGUE.aldren_intro;
const ALDREN_INTRO_RECORD = DIALOGUE.aldren_intro_record;

registerDialogue({
  belfry_offer: [
    { speaker: ALDREN_MEM, text: 'You have the rope. I held it forty-one times. It is lighter than you think.' },
    { speaker: ALDREN_MEM, text: 'The Covenant is not a cruelty, retainer. It is a promise: that no loss need be final while someone is willing to choose.' },
    { speaker: ALDREN_MEM, text: 'Keep it, and your friends will never be lost again. You will only have to decide, now and then, who else can be spared.' },
    { speaker: RETURNED, text: 'That is what you told yourself.' },
    { speaker: ALDREN_MEM, text: 'It is what I told myself, yes. It was also true. Choose.' },
  ],
  belfry_brannoc: [
    { speaker: 'Sergeant Brannoc', text: 'Captain. The muster\'s all here. Every man you found in every house of the crown.' },
    { speaker: 'Sergeant Brannoc', text: 'We\'ve no orders. We\'ve never had orders. We\'d take a place, though, if there was one going.' },
  ],
  belfry_council: [
    { speaker: 'Councillor', text: 'We kept the peace for one hundred and four years. We were very dull. Nobody died of it.' },
  ],
});

const FLOOR_MEMORIES: Record<string, string> = {
  f1: 'Greyford. Brannoc\'s war. Here it is a victory, and every one of them died in it.',
  f2: 'A lecture hall under still water. The Academy taught nine futures, once. Someone drowned the lesson.',
  f3: 'A nave with no names. Hundreds of plates scraped clean. Except one.',
  f4: 'The Treasury\'s vault, emptied into a ledger. Every coin counted, and spent on a bell.',
  f5: 'A coronation that never happened. Seven chairs, waiting for people who were never needed.',
};
const RECORD_ENTRIES = ['bf_obs_victory', 'bf_obs_theatre', 'bf_obs_nave', 'bf_obs_vault', 'bf_obs_coronation'];

// ================================================================== the controller

export class BelfryRegion extends RegionBase {
  override defaultEnvironment = 'belfryStorm';
  override defaultMusic: MusicState = 'belfry';
  private deciding = false;
  private bandFlash = [0, 0, 0, 0];
  private waveMeshes: THREE.Mesh[] = [];
  private streamT = 0;
  private distantTollT = 30;
  private readonly waveMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

  /** Interior kits per floor (F1..F5) and the name-plates, hidden when they cannot be seen. */
  private floorGroups: THREE.Object3D[][] = [];

  constructor(game: Game, session: Session, L: BelfryLayout, info: RegionInfo) {
    super(game, session, L, info);
    for (let f = 1; f <= 5; f++) {
      const list: THREE.Object3D[] = [];
      const kit = L.root.getObjectByName('kit:tower.f' + f);
      if (kit) list.push(kit);
      if (f === 3) { const plates = L.root.getObjectByName('inst:bf_plate'); if (plates) list.push(plates); }
      this.floorGroups.push(list);
    }
    const waveGeo = new THREE.RingGeometry(0.93, 1, 64, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(waveGeo, this.waveMat);
      m.visible = false; m.renderOrder = 6;
      L.root.add(m);
      this.waveMeshes.push(m);
    }
  }

  private get BL() { return this.L as BelfryLayout; }
  private get ui() { return this.game.deps.ui ?? null; }

  // ------------------------------------------------------------------ setup

  protected setup() {
    // --- the five records of rejected futures (the Full Record)
    for (let i = 1; i <= 5; i++) {
      const key = 'belfry.record' + i;
      this.add('record' + i, this.A('record' + i), 2.2, () => (i === 5 && this.canLayRecord() ? null : this.readPrompt(i)), () => this.inspect(key, () => this.readRecord(i)));
    }
    this.add('layRecord', this.A('record5'), 2.4, () => (this.canLayRecord() ? 'Lay the full record on the empty throne' : null), () => this.layRecord());
    // --- inspectables along the way
    this.inspectAt('belfry.statues', 'statues', 'Look at the monuments', undefined, 3.2);
    this.add('coffins', new THREE.Vector3(-7.4, 0, -3.8), 2.4, () => 'Look at the coffins', () => this.inspect('belfry.coffins'));
    this.add('seats', new THREE.Vector3(0, PLAN.floors[1], 3.6), 2.6, () => 'Read the chalk on the benches', () => this.inspect('belfry.seats'));
    this.add('plaques', new THREE.Vector3(-12.3, PLAN.floors[2], 11.5), 2.4, () => 'Look at the name-plates', () => this.inspect('belfry.plaques', () => this.record(BELFRY_LEAD, 'bf_obs_nave')));
    this.add('coffers', new THREE.Vector3(-4, PLAN.floors[3], 11.2), 2.4, () => 'Look into the coffers', () => this.inspect('belfry.coffers'));
    this.add('throne', new THREE.Vector3(2.8, PLAN.floors[4], -9.4), 2.2, () => (this.flag('belfry.recordLaid') ? 'Look at the council' : 'Look at the throne'), () => this.inspect(this.flag('belfry.recordLaid') ? 'belfry.throneLaid' : 'belfry.throne', () => { if (this.flag('belfry.recordLaid')) void this.talk('belfry_council'); }));
    // --- shortcuts and secrets
    this.opener('greatDoor', 'greatDoor', 'belfry.greatDoor', 'Lift the bar', { anchorName: 'greatDoorIn', dur: 2.4, cue: 'door_open', after: () => this.subtitle('The door swings out over the terrace. The Stillbell at the foot is just there, down the causeway.') });
    this.add('greatDoorOut', this.A('greatDoorOut'), 2.4, () => (this.flag('belfry.greatDoor') ? null : 'Push the door'), () => this.inspect('belfry.greatDoorBarred'));
    this.opener('galleryGate', 'galleryGate', 'belfry.galleryGate', 'Draw the gate bolt', { anchorName: 'galleryLever', dur: 1.6, cue: 'gate_open', after: () => this.subtitle('The gallery gate. From the foot, it is a short climb to the Coronation now.') });
    this.add('galleryGateOut', this.A('galleryGateOut'), 2.2, () => (this.flag('belfry.galleryGate') ? null : 'Try the gate'), () => this.inspect('belfry.galleryGate'));
    this.opener('ossuary', 'ossuaryDoor', 'belfry.ossuaryDoor', 'Press the plate that bears your name', { anchorName: 'ossuaryIn', dur: 2.0, cue: 'hatch_open', after: () => { this.memoryFlash(); this.subtitle('It gives. Behind the plates, a stair down the outside of the tower, and the smell of hot iron.'); } });
    this.pickup('belfry.nookF1', 'nookF1', 'bellbronze_scrap', 1, 'Take the bellbronze scrap');
    this.pickup('belfry.nookF2', 'nookF2', 'tempered_scrap', 3, 'Search the lecturer\'s desk');
    this.pickup('belfry.nookF4', 'nookF4', 'bellbronze_scrap', 2, 'Reach into the coffer');
    this.pickup('belfry.ledgeNook', 'ledgeNook', 'bellbronze_shard', 1, 'Take the bellbronze shard');
    this.pickup('belfry.galleryNook', 'galleryNook', 'ember_resin', 3, 'Take the resin pots');
    this.add('confession', this.A('confession'), 2.2, () => (this.flag('boss.bellkeeper') && !this.ws.pickups['belfry.confession'] ? 'Take the book from the anvil' : null), () => this.playerAct('pickup', () => {
      this.ws.pickups['belfry.confession'] = true;
      this.session.grantItem('bellkeeper_confession', 1);
      this.record(BELFRY_LEAD, 'bf_obs_brand');
      this.record(BELFRY_LEAD, 'bf_conf_bellkeeper');
      this.subtitle('Every name he branded. Every one of them forgot. And at the end, mine, with no date.');
      this.session.save();
    }));
    // --- the final decision
    this.add('bellRope', this.A('bellRope'), 2.6, () => (this.flag('boss.aldren') && !this.ws.flags.ending ? 'Take hold of the bell-rope' : this.flag('boss.aldren') && this.ws.flags.ending ? 'The rope hangs still' : null), () => {
      if (this.ws.flags.ending) { this.subtitle('It is done. The bell will not answer again.'); return; }
      void this.decide();
    }, false);
    this.add('aldrenMemory', new THREE.Vector3(-2.6, PLAN.roof, -9.2), 2.2, () => (this.flag('boss.aldren') && !this.ws.flags.ending && this.heard('belfry_offer') ? 'Listen to the King' : null), () => void this.talk('belfry_offer'));
    this.add('brannoc', new THREE.Vector3(3.4, PLAN.roof, -1.4), 2.2, () => (this.flag('boss.aldren') && musterComplete(this.ws) ? 'Speak with Sergeant Brannoc' : null), () => void this.talk('belfry_brannoc'));

    // --- triggers
    this.onTrigger('arrival', () => this.arrive());
    for (const f of ['f1', 'f2', 'f3', 'f4', 'f5']) this.onTrigger(f, () => { this.subtitle(FLOOR_MEMORIES[f], RETURNED, 6); if (f === 'f5') this.memoryFlash(); });
    this.onTrigger('crownArrive', () => this.subtitle(this.flag('boss.aldren') ? 'The Bell Crown, quiet at last.' : 'The Bell Crown. Five bells, silent now. And above them, his.', RETURNED, 5));
    this.onTrigger('cellSight', () => { this.subtitle('Smoke. Hot iron. I know this smell.', RETURNED, 4); });
  }

  private readPrompt(i: number) {
    return ['Read the victory roll', 'Read the slate', 'Read the register', 'Read the ledger', 'Read the coronation roll'][i - 1];
  }
  private recordsRead() { return RECORD_ENTRIES.filter((e) => this.session.journalSys.has(e)).length; }
  private canLayRecord() { return this.recordsRead() === 5 && !this.flag('belfry.recordLaid'); }

  private readRecord(i: number) {
    this.record(BELFRY_LEAD, 'bf_mem_once');
    this.record(BELFRY_LEAD, RECORD_ENTRIES[i - 1]);
    if (this.recordsRead() === 5 && !this.flag('belfry.revelation')) {
      this.setFlag('belfry.revelation');
      const r = ensureRevelationEntry();
      this.record(r.lead, r.entry);
      this.memoryFlash();
      this.subtitle('Forty-one times. He rang them forty-one times before the day I remember, and some of those kingdoms lived without him.', RETURNED, 7);
      this.game.deps.ui?.banner('memory', 'THE FULL RECORD', 'Aldren\'s rejected futures');
    }
    this.session.save();
  }

  private layRecord() {
    this.playerAct('interact', () => {
      this.setFlag('belfry.recordLaid');
      this.tween(this.P('throneRecord'), 0, 1, 3.5);
      this.game.sfx('memory_trigger');
      this.memoryFlash();
      this.record(BELFRY_LEAD, 'bf_conf_record');
      this.spawnCouncil(true);
      this.subtitle('The council of the coronation that never happened. They take their seats, and they do not leave.', RETURNED, 6);
      this.session.save();
    });
  }

  private spawnCouncil(fx: boolean) {
    for (let i = 0; i < 7; i++) {
      const a = this.A('council' + i);
      const n = this.spawnNpc('council' + i, a, 'standPray', 'councillor', { height: 0.96 + (i % 3) * 0.03, bulk: 0.95, shoulder: 0.96 });
      if (fx) this.game.fx('bellMotes', n.chest, { count: 30 });
    }
  }

  // ------------------------------------------------------------------ first arrival: the reveal

  private arrive() {
    this.record(BELFRY_LEAD, 'bf_mem_once');
    if (this.flag('belfry.revealed')) return;
    this.setFlag('belfry.revealed');
    const g = this.game;
    const from = this.A('revealFrom').pos.clone();
    const C = PLAN.crown.c;
    let t = 0;
    g.cameraOverride = (dt, cam) => {
      t += dt;
      const k = Math.min(1, t / 7.5), e = k * k * (3 - 2 * k);
      cam.position.set(from.x + Math.sin(t * 0.08) * 2, from.y + e * 3, from.z - e * 6);
      const look = new THREE.Vector3(0, 6 + e * 52, 15 - e * 16);
      cam.lookAt(look);
      void C;
      return t < 8 && !g.player.dead && g.mode === 'play';
    };
    this.subtitle('The Belfry of Return. He climbed it on the last day. I remember him passing me on the stair.', RETURNED, 6);
    this.session.save();
  }

  // ------------------------------------------------------------------ state

  protected override pieceFlags(): Record<string, string> {
    return { greatDoor: 'belfry.greatDoor', galleryGate: 'belfry.galleryGate', ossuaryDoor: 'belfry.ossuaryDoor', throneRecord: 'belfry.recordLaid' };
  }

  protected override applyRegionState() {
    for (const id of [...this.npcs.keys()]) this.removeNpc(id);
    if (this.flag('belfry.recordLaid')) this.spawnCouncil(false);
    if (this.flag('boss.aldren')) this.placeAfterAldren();
    for (const m of this.BL.bands) { m.visible = false; (m.material as THREE.MeshBasicMaterial).opacity = 0; }
  }

  private placeAfterAldren() {
    if (!this.ws.flags.ending) {
      const n = this.spawnNpc('aldren_memory', { pos: new THREE.Vector3(-2.6, PLAN.roof, -9.2), yaw: Math.atan2(2.6, 5.4) }, 'standPray', 'aldren_memory', { height: 1.08, bulk: 1.05, shoulder: 1.05 });
      n.lookTarget = null;
    }
    if (musterComplete(this.ws)) this.spawnNpc('brannoc', { pos: new THREE.Vector3(3.4, PLAN.roof, -1.4), yaw: -2.4 }, null, 'brannoc');
  }

  protected override onZoneEnter(id: string) {
    if (id === 'belfry.crown' && this.flag('boss.aldren')) this.game.deps.renderer.setEnvironment('belfryAfter', 2.5);
  }

  /** The Unfinished Toll points at the next unread record, then the throne, the Crown, the rope. */
  protected override objective(): THREE.Vector3 | null {
    let target: THREE.Vector3 | null = null;
    for (let i = 0; i < 5 && !target; i++) if (!this.session.journalSys.has(RECORD_ENTRIES[i])) target = this.A('record' + (i + 1)).pos;
    if (!target && !this.flag('belfry.recordLaid')) target = this.A('record5').pos;
    if (!target && !this.flag('boss.aldren')) target = this.BL.arenas[0].fogGate.anchor.pos;
    if (!target && !this.ws.flags.ending) target = this.A('bellRope').pos;
    if (!target) return null;
    const p = this.player.pos;
    const outside = Math.abs(p.x) > PLAN.H || Math.abs(p.z) > PLAN.H;
    const inTower = Math.abs(target.x) < PLAN.H && Math.abs(target.z) < PLAN.H;
    if (outside && inTower && !this.flag('belfry.greatDoor') && p.y < 3) return this.A('posternIn').pos;
    return target;
  }

  // ------------------------------------------------------------------ bosses

  protected override spawnBoss(a: ArenaLayout): Boss {
    const b = super.spawnBoss(a);
    if (b instanceof AldrenBoss) {
      b.arenaCenter.copy(a.center);
      b.onRingsLit = (bands) => { for (const i of bands) if (i < 0) this.bandFlash[-1 - i] = 1; };
      b.onRingFired = (band) => { this.game.fx('goldMotes', a.center.clone().add(new THREE.Vector3((RING_BANDS[band][0] + RING_BANDS[band][1]) / 2, 0.3, 0)), { count: 30, speed: 4 }); };
      b.onDrain = (on, broken) => { if (!on && broken) this.game.deps.ui?.caption('[The stream of the Unlived breaks]', null); };
      b.onCrush = (p) => { this.game.fx('dust', p, { count: 90, speed: 7 }); this.game.fx('sparks', p, { count: 30 }); };
    } else if (a.bossId === 'bellkeeper') {
      b.onEvent = (id) => { if (id === 'brandGlow') this.game.fx('embers', new THREE.Vector3().setFromMatrixPosition(b.rig.bones.handL.matrixWorld), { count: 30 }); };
    }
    return b;
  }

  protected override arenaWarning(a: ArenaLayout): string { return a.bossId === 'aldren' ? 'belfry.aldren' : ''; }

  protected override beforeArena(a: ArenaLayout) {
    if (a.bossId === 'aldren') DIALOGUE.aldren_intro = this.flag('belfry.recordLaid') ? ALDREN_INTRO_RECORD : ALDREN_INTRO;
    if (a.bossId === 'bellkeeper') this.record(BELFRY_LEAD, 'bf_obs_brand');
  }

  protected override onBossPhase(id: string, phase: number, b: Boss) {
    if (id !== 'aldren') return;
    const m = this.game.deps.models;
    if (phase === 3 && m) {
      // the Ancient King takes up the bell maul
      if (b.weaponR) b.weaponR.model.object.removeFromParent();
      const w = m.buildWeapon('aldren_maul');
      b.weaponR = { id: 'aldren_maul', model: w };
      b.rig.sockets.weaponR.add(w.object);
      w.object.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.castShadow = true; });
    } else if (phase === 3) b.weaponR = null;
    if (phase === 2) this.game.deps.renderer.setGrade({ flash: 0.6, flashColor: 0xffd9a0 });
    this.game.fx('bellMotes', b.chest, { count: 80, speed: 3 });
  }

  protected override async onBossDefeated(id: string) {
    if (id === 'bellkeeper') {
      this.record(BELFRY_LEAD, 'bf_obs_brand');
      this.subtitle('He is at rest. On the anvil at the back of the cell, a black book.', RETURNED, 5);
      return;
    }
    if (id !== 'aldren') return;
    this.record(BELFRY_LEAD, 'bf_conf_aldren');
    for (const m of this.BL.bands) m.visible = false;
    const g = this.game;
    const C = PLAN.crown.c;
    // watch the Bell of Return come down on its chains
    let t = 0;
    const p0 = g.player.pos.clone();
    g.cameraOverride = (dt, cam) => {
      t += dt;
      const k = Math.min(1, t / 6), e = k * k * (3 - 2 * k);
      cam.position.set(p0.x * 0.5 + 4, C.y + 3 + e * 2, C.z + 15 - e * 2);
      cam.lookAt(C.x, C.y + 24 - e * 14, C.z);
      return t < 6.5 && !g.player.dead;
    };
    this.tween(this.P('crownBell'), 0, 1, 6);
    g.sfx('chain_rattle', { pos: C.clone().setY(C.y + 20) });
    g.deps.renderer.setEnvironment('belfryAfter', 6);
    this.session.audio?.setMusic('belfry', 6);
    await new Promise((r) => setTimeout(r, 6200));
    this.placeAfterAldren();
    this.subtitle('The Bell of Return, lowered. The rope hangs within reach.', RETURNED, 5);
    this.session.save();
  }

  // ------------------------------------------------------------------ the decision

  private async choose(lines: DialogueLine[], choices: DialogueChoice[]): Promise<string | null> {
    const ui = this.ui;
    if (!ui) return null;
    this.game.mode = 'dialogue';
    this.game.input.releaseAll();
    this.game.input.setPointerLock(false);
    const r = await ui.dialogue(lines, choices);
    this.game.input.releaseAll();
    return r;
  }

  private endDecision() {
    this.deciding = false;
    if (this.game.mode === 'dialogue' || this.game.mode === 'menu') this.game.resumePlay();
  }

  /** At the rope: hear the offer, then choose (or step away). */
  async decide() {
    const ui = this.ui;
    if (!ui || this.deciding || this.fight) return;
    this.deciding = true;
    this.session.audio?.setMusic('ending', 3);
    if (!this.heard('belfry_offer')) await this.talk('belfry_offer');
    for (;;) {
      const opts = endingOptions(this.ws);
      const choices: DialogueChoice[] = opts.map((o) => ({ id: o.available ? o.id : 'locked:' + o.id, text: o.available ? o.label : `${o.label} (unavailable: ${o.reason})` }));
      choices.push({ id: 'wait', text: 'Let go of the rope, for now' });
      const r = await this.choose([{ speaker: 'The Bell of Return', text: 'The rope is in your hands. The Covenant waits for whoever holds it.' }], choices);
      if (!r || r === 'wait') { this.session.audio?.setMusic('belfry', 3); this.endDecision(); return; }
      if (r.startsWith('locked:')) {
        const o = opts.find((x) => 'locked:' + x.id === r)!;
        await this.choose([{ speaker: 'The Bell of Return', text: `${o.label} is not within your reach. ${o.reason}` }], []);
        continue;
      }
      const id = r as EndingId;
      const c = ENDING_CONFIRM[id];
      this.game.mode = 'menu';
      const ok = await ui.confirm(c.title, c.body, c.yes, 'Not yet');
      if (!ok) continue;
      await this.playEnding(id);
      return;
    }
  }

  /** Record the ending, play its epilogue and the credits, then return to the title. */
  async playEnding(id: EndingId) {
    const g = this.game, ui = this.ui;
    this.ws.flags.ending = id;
    this.ws.flags['belfry.endingSeen'] = true;
    this.removeNpc('aldren_memory');
    this.session.save();
    g.mode = 'cinematic';
    g.input.releaseAll();
    g.input.setPointerLock(false);
    ui?.setHudVisible(false);
    const C = PLAN.crown.c;
    g.sfx('great_bell_toll', { pos: C.clone().setY(C.y + 8), volume: id === 'break' ? 0.3 : 1.2, rate: id === 'shelter' ? 0.7 : 1 });
    g.shake(id === 'break' ? 0.3 : 0.8);
    g.fx(id === 'shelter' ? 'bellMotes' : 'goldMotes', C.clone().setY(C.y + 2), { count: 160, speed: 5 });
    this.session.audio?.setMusic('ending', 2);
    if (ui) {
      await new Promise((r) => setTimeout(r, 1800));
      await ui.fade(1, 2.0);
      await ui.cinematic(epilogueCards(id, this.ws));
      await ui.cinematic(CREDIT_CARDS);
    }
    this.deciding = false;
    this.session.quitToTitle();
    if (ui) void ui.fade(0, 2.0);
  }

  // ------------------------------------------------------------------ per step / frame

  protected override stepRegion(dt: number) {
    const g = this.game;
    // keep the draw budget: enemies on other floors (or far away) are not drawn
    const pp = this.player.pos;
    for (const { e } of this.enemyList) {
      if (e.dead && e.deathT > 2.2) continue;
      const d = e.pos.distanceTo(pp);
      e.object.visible = !(d > 60 || (Math.abs(e.pos.y - pp.y) > 5.5 && d > 12));
    }
    // Bell-ringers loose a slow, homing knell from the bell at the bottom of their swing
    for (const { e } of this.enemyList) {
      const m = e.move;
      if (!m || e.dead) continue;
      if (m.def.id === 'br_cast' && m.t >= 0.95 && !m.data.cast && e.target) {
        m.data.cast = true;
        const origin = new THREE.Vector3().setFromMatrixPosition(e.rig.sockets.weaponR.matrixWorld);
        const dir = e.target.chest.clone().sub(origin).normalize();
        g.spawnProjectile({ kind: 'knell', owner: e as unknown as Combatant, pos: origin, vel: dir.multiplyScalar(8), radius: 0.24, life: 4, packet: { physical: 0, magic: 130, fire: 0 }, posture: 15, poise: 25, damageKind: 'magic', homing: { target: e.target as unknown as Combatant, rate: 0.8 } });
        g.sfx('cast_shard', { pos: origin, rate: 0.7 });
      }
      if (m.def.id.startsWith('ec_blink') && m.t < dt * 1.5) g.fx('fogMotes', e.chest, { count: 24 });
    }
    // Aldren's Drain: the Unlived stream into him from the edge of the Crown
    const b = this.bosses.get('aldren');
    if (b instanceof AldrenBoss && b.drain.active && !b.dead) {
      this.streamT -= dt;
      if (this.streamT <= 0) {
        this.streamT = 0.12;
        const C = PLAN.crown.c, a = Math.random() * Math.PI * 2;
        g.fx('hoursStream', new THREE.Vector3(C.x + Math.cos(a) * 12.5, C.y + 1.2, C.z + Math.sin(a) * 12.5), { count: 14, target: b.chest });
      }
    }
    // a distant Great Bell tolls now and then while the King lives (the Belfry is never quiet)
    if (!this.flag('boss.aldren') && !this.fight) {
      this.distantTollT -= dt;
      if (this.distantTollT <= 0) { this.distantTollT = 45 + Math.random() * 20; g.sfx('great_bell_toll', { pos: new THREE.Vector3(0, 60, -5), volume: 0.22 }); }
    }
  }

  override frame(dt: number) {
    super.frame(dt);
    // interior floors: only the player's floor and its neighbours (the panes are opaque; from
    // outside the tower nothing inside can be seen except through the doorways of F1 and F5)
    const p = this.player?.pos;
    if (p) {
      const inside = Math.abs(p.x) < PLAN.H + 0.4 && Math.abs(p.z) < PLAN.H + 0.4 && p.y < PLAN.roof - 0.5;
      const fl = Math.max(0, Math.min(4, Math.floor((p.y + 1) / 7)));
      for (let i = 0; i < 5; i++) {
        const near = inside ? Math.abs(i - fl) <= 1 : (i === 0 && p.y < 4 && p.z > 0) || (i === 4 && p.y > 24) || (i === 2 && p.x < -14 && p.y > 6 && p.y < 17);
        for (const o of this.floorGroups[i]) o.visible = near;
      }
    }
    // ring-band telegraphs: brighten over the warning, flash on detonation, fade
    const b = this.bosses.get('aldren');
    const bands = this.BL.bands;
    const level = [0, 0, 0, 0];
    if (b instanceof AldrenBoss && !b.dead) {
      for (const h of b.bands) {
        const pulse = 0.75 + 0.25 * Math.sin(this.time * 20);
        const v = !h.fired ? (0.12 + 0.5 * (h.t / RING_WARN)) * pulse : Math.max(0, 1.3 - (h.t - RING_WARN) * 2.0);
        level[h.band] = Math.max(level[h.band], v);
      }
      b.waves.forEach((w, i) => {
        const m = this.waveMeshes[i];
        if (!m) return;
        m.visible = true;
        m.position.set(w.origin.x, w.origin.y + 0.06, w.origin.z);
        m.scale.setScalar(Math.max(0.1, w.r));
      });
      for (let i = b.waves.length; i < this.waveMeshes.length; i++) this.waveMeshes[i].visible = false;
    } else for (const m of this.waveMeshes) m.visible = false;
    for (let i = 0; i < bands.length; i++) {
      this.bandFlash[i] = Math.max(0, this.bandFlash[i] - dt * 1.2);
      const v = Math.max(level[i], this.bandFlash[i] * 0.8);
      const mat = bands[i].material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(1, v);
      bands[i].visible = v > 0.01;
    }
  }

  override titleCamera(t: number, cam: THREE.PerspectiveCamera) {
    const a = 0.4 + t * 0.02;
    cam.position.set(Math.sin(a) * 78, 16, 40 + Math.cos(a) * 60);
    cam.lookAt(0, 34, -5);
  }
}
