/**
 * Arsenal: every weapon class has a complete moveset, every Imprint Technique is a real move,
 * every spell has an archetype cast, move windows are sane — plus headless simulations of the
 * behaviours that live in Player (shots & ammo, crossbow reload, piercing lance, delayed bell,
 * weapon buff, riposte stance, root spin, pinning root, class chains).
 */
import { describe, it, expect } from 'vitest';
import { flatWorld, mockServices, THREE } from './helpers';
import { MOVES } from '../src/combat/moves';
import { ARSENAL_MOVES, MOVESETS, SPIN, TECH_CHARGE, castMoveFor, movesetFor, resolveMove, techniqueMoveFor } from '../src/combat/movesets';
import { CLIPS } from '../src/actors/anim/clips';
import { STANCES } from '../src/actors/anim/clips/stances';
import { ITEMS, TECHNIQUES } from '../src/content/items';
import { SPELLS } from '../src/content/spells';
import type { MoveDef } from '../src/combat/types';
import type { WeaponClass } from '../src/game/types';
import { Player, techniqueMove, type PlayerControl } from '../src/actors/Player';
import { Enemy } from '../src/actors/Enemy';
import { ENEMY_DEFS } from '../src/content/enemies';
import { newPlayerData, addItem } from '../src/systems/PlayerData';
import type { Combatant } from '../src/combat/Combat';
import type { ProjectileSpec } from '../src/combat/Projectiles';
import type { IInput } from '../src/input/actions';

const CLASSES: WeaponClass[] = ['straightSword', 'curvedSword', 'greatsword', 'dagger', 'estoc', 'axe', 'mace', 'hammer', 'flail', 'spear', 'halberd', 'staff', 'bell', 'censer', 'bow', 'crossbow', 'fist'];

function movesOf(cls: WeaponClass): string[] {
  const m = MOVESETS[cls];
  return [...m.light, m.heavyCharge, m.heavyRelease, m.running, m.rolling, m.parry, m.guardAttack].filter((x): x is string => !!x);
}

function checkWindows(d: MoveDef) {
  const tag = d.id;
  expect(d.dur, tag).toBeGreaterThan(0);
  let lastEnd = 0;
  for (const h of d.hits ?? []) {
    expect(h.start, tag).toBeGreaterThanOrEqual(0);
    expect(h.end, tag).toBeGreaterThan(h.start);
    expect(h.end, tag).toBeLessThanOrEqual(d.dur);
    if (h.source === 'sphere') expect(h.sphere, tag).toBeTruthy();
    lastEnd = Math.max(lastEnd, h.end);
  }
  for (const k of ['chain', 'dodge', 'free'] as const) {
    const c = d.cancel?.[k];
    if (c === undefined) continue;
    expect(c, `${tag}.${k}`).toBeLessThanOrEqual(d.dur + 1e-9);
    if (d.hits?.length) expect(c, `${tag}.${k} after active`).toBeGreaterThanOrEqual(lastEnd);
  }
  for (const e of d.events ?? []) expect(e.t, tag).toBeLessThanOrEqual(d.dur);
  if (d.parry) { expect(d.parry[1]).toBeGreaterThan(d.parry[0]); expect(d.parry[1]).toBeLessThanOrEqual(d.dur); }
  if (d.hyper) expect(d.hyper[1]).toBeLessThanOrEqual(d.dur);
  expect(CLIPS[d.clip], `${tag} clip ${d.clip}`).toBeTruthy();
}

describe('weapon class movesets', () => {
  it('every WeaponClass resolves to a moveset whose moves, clips, stance and guard exist', () => {
    for (const cls of CLASSES) {
      const ms = movesetFor(cls);
      expect(ms.cls).toBe(cls);
      expect(STANCES[ms.stance], `${cls} stance`).toBeTruthy();
      expect(CLIPS[ms.guardClip], `${cls} guard clip`).toBeTruthy();
      expect(ms.light.length, cls).toBeGreaterThanOrEqual(1);
      for (const id of movesOf(cls)) {
        const d = MOVES[id];
        expect(d, `${cls}: ${id}`).toBeTruthy();
        checkWindows(d);
        if (ms.twoHanded) { const t = resolveMove(id, true); expect(CLIPS[t.clip], `${id} 1h clip`).toBeTruthy(); }
      }
    }
    expect(movesetFor(null).cls).toBe('fist');
  });

  it('melee light chains have 2–4 hits and loop; daggers chain 4', () => {
    for (const cls of CLASSES) {
      const ms = MOVESETS[cls];
      if (ms.casts || ms.ranged) continue;
      expect(ms.light.length, cls).toBeGreaterThanOrEqual(2);
      expect(ms.light.length, cls).toBeLessThanOrEqual(4);
      for (let i = 0; i < ms.light.length; i++) {
        const d = MOVES[ms.light[i]];
        expect(d.hits?.length, d.id).toBeGreaterThan(0);
        expect(d.next, d.id).toBe(ms.light[(i + 1) % ms.light.length]);
        expect(d.cancel?.chain, d.id).toBeDefined();
      }
      expect(MOVES[ms.heavyRelease].hits?.length, cls).toBeGreaterThan(0);
    }
    expect(MOVESETS.dagger.light.length).toBe(4);
    expect(MOVESETS.dagger.critMult).toBe(3.5);
  });

  it('class identities: greatsword/hammer heavies carry hyper-armour and big posture; daggers are quick; hammers break guards', () => {
    const rel = (c: WeaponClass) => MOVES[MOVESETS[c].heavyRelease];
    for (const c of ['greatsword', 'hammer'] as WeaponClass[]) {
      expect(rel(c).hyper?.[2]).toBeGreaterThanOrEqual(60);
      expect(rel(c).hits![0].posture).toBeGreaterThan(MOVES.sword_heavy_release.hits![0].posture);
      expect(MOVESETS[c].twoHanded).toBe(true);
    }
    expect(MOVES.dagger_light1.dur).toBeLessThan(MOVES.sword_light1.dur);
    expect(MOVES.curved_light1.dur).toBeLessThan(MOVES.sword_light1.dur);
    expect(MOVES.curved_light1.hits![0].posture).toBeLessThan(MOVES.sword_light1.hits![0].posture);
    expect(MOVES.hammer_light1.hits!.every((h) => h.guardBreak)).toBe(true);
    expect(MOVES.estoc_light1.hits![0].kind).toBe('thrust');
    expect(MOVESETS.spear.guardAttack && MOVES[MOVESETS.spear.guardAttack].guard).toBe(true);
  });

  it('every arsenal move has sane windows and an existing clip (incl. one-handed twins)', () => {
    for (const d of Object.values(ARSENAL_MOVES)) checkWindows(d);
    for (const id of Object.keys(SPIN)) expect(MOVES[id], id).toBeTruthy();
  });
});

describe('imprint techniques', () => {
  it('all 16 techniques map to a move with hits or an effect, for every compatible class', () => {
    expect(Object.keys(TECHNIQUES).length).toBe(16);
    for (const t of Object.values(TECHNIQUES)) {
      for (const cls of t.compatible) {
        for (const oneHanded of [false, true]) {
          const d = techniqueMoveFor(t.id, cls, { oneHanded, shield: cls === 'shield' });
          expect(d, `${t.id} on ${cls}`).toBeTruthy();
          checkWindows(d!);
          const release = TECH_CHARGE[d!.id] ? MOVES[TECH_CHARGE[d!.id].release] : null;
          const effect = !!d!.hits?.length || !!release?.hits?.length || !!d!.parry || !!d!.events?.some((e) => e.e.type === 'technique' || e.e.type === 'custom');
          expect(effect, `${t.id} on ${cls} does something`).toBe(true);
        }
      }
    }
    // Player keeps its exported helper.
    expect(techniqueMove('oathbound_lunge')).toBe(MOVES.tech_lunge);
    // Technique-specific tells.
    expect(techniqueMoveFor('vow_parry', 'estoc')!.parry![1] - techniqueMoveFor('vow_parry', 'estoc')!.parry![0]).toBeGreaterThan(MOVES.parry_hand.parry![1] - MOVES.parry_hand.parry![0]);
    expect(techniqueMoveFor('bell_breaker', 'greatsword')!.hits!.some((h) => h.source === 'sphere')).toBe(true);
    expect(techniqueMoveFor('greyford_flourish', 'dagger')!.hits!.length).toBe(3);
    expect(techniqueMoveFor('vow_pursuit', 'estoc')!.hits!.at(-1)!.guardBreak).toBe(true);
    expect(SPIN[techniqueMoveFor('rending_sweep', 'halberd')!.id][2]).toBeCloseTo(Math.PI * 2);
    expect(SPIN[techniqueMoveFor('chain_whirl', 'flail')!.id][2]).toBeCloseTo(Math.PI * 4);
    // One-handed classes keep their one-handed clips through a held technique's release.
    const knellMace = techniqueMoveFor('knell_strike', 'mace')!;
    expect(resolveMove(TECH_CHARGE[knellMace.id].release, false).clip).toBe('knellStrike_1h');
    const knellHammer = techniqueMoveFor('knell_strike', 'hammer')!;
    expect(resolveMove(TECH_CHARGE[knellHammer.id].release, false).clip).toBe('knellStrike');
  });
});

describe('spells', () => {
  it('every spell has an archetype cast with a cast event on an existing clip', () => {
    for (const sp of Object.values(SPELLS)) {
      const d = castMoveFor(sp);
      checkWindows(d);
      expect(d.events?.some((e) => e.e.type === 'cast'), sp.id).toBe(true);
    }
    expect(castMoveFor(SPELLS.shard_volley).events!.filter((e) => e.e.type === 'cast').length).toBe(3);
    expect(castMoveFor(SPELLS.bellglass_lance).clip).toBe('castLance');
    expect(castMoveFor(SPELLS.falling_hour).clip).toBe('castSky');
    expect(castMoveFor(SPELLS.toll_of_warding).clip).toBe('castToll');
  });
});

// ------------------------------------------------------------------ headless simulation

class FakeInput {
  downs = new Set<string>(); presses = new Set<string>(); mv = { x: 0, y: 0 };
  pressed(a: string) { return this.presses.has(a); }
  released() { return false; }
  down(a: string) { return this.downs.has(a); }
  heldTime() { return 0; }
  move() { return this.mv; }
  look() { return { x: 0, y: 0 }; }
  targetSwitch() { return 0; }
  endStep() { this.presses.clear(); }
  tap(a: string) { this.presses.add(a); }
}
/** A dodge is a short press-and-release of the dodge input. */
function tapDodge(s: { input: FakeInput; step: (t: number) => void }) { s.input.downs.add('dodge'); s.step(2 / 60); s.input.downs.delete('dodge'); s.step(1 / 60); }

const HITS: Record<string, { from: number; to: number; radius: number } | null> = {
  bellwarden_greatsword: { from: 0.18, to: 1.5, radius: 0.06 }, retainer_sword: { from: 0.12, to: 0.99, radius: 0.035 },
  gatewarden_halberd: { from: 1.14, to: 1.68, radius: 0.12 }, condemned_chain: { from: 0.3, to: 0.8, radius: 0.09 },
  oath_estoc: { from: 0.12, to: 1.12, radius: 0.022 }, huntsman_bow: null, garrison_arbalest: null, court_staff: { from: 0.95, to: 1.36, radius: 0.1 },
};

function setup(right: string, opts: { left?: string | null; enemies?: [number, number][]; origin?: Parameters<typeof newPlayerData>[0] } = {}) {
  const world = flatWorld();
  const enemies: Enemy[] = [];
  const shots: ProjectileSpec[] = [];
  let player!: Player;
  const svc = mockServices(world, () => [player, ...enemies]);
  svc.spawnProjectile = (s: ProjectileSpec) => { shots.push(s); };
  const data = newPlayerData(opts.origin ?? 'householdKnight');
  addItem(data, right, 1);
  data.equipment.right0 = right; data.activeRight = 0;
  data.equipment.left0 = opts.left ?? null; data.equipment.left1 = null; data.activeLeft = 0;
  data.attributes.strength = 30; data.attributes.dexterity = 30; data.attributes.intellect = 30; data.attributes.devotion = 30; data.attributes.mind = 30;
  player = new Player(svc, data);
  player.focus = player.focusMax = 200;
  const hit = HITS[right] ?? null;
  const wm = { object: new THREE.Group(), hit };
  player.weaponR = { id: right, model: wm as any };
  player.rig.sockets.weaponR.add(wm.object);
  player.teleport(new THREE.Vector3(0, 0, 0), 0);
  for (const [x, z] of opts.enemies ?? []) {
    const e = new Enemy(ENEMY_DEFS.infantry, svc, enemies.length + 3);
    e.hp = e.hpMax = 5000;
    e.teleport(new THREE.Vector3(x, 0, z), Math.PI);
    enemies.push(e);
  }
  const input = new FakeInput();
  const ctl = (lock: Combatant | null = null): PlayerControl => ({ input: input as unknown as IInput, camYaw: 0, camForward: new THREE.Vector3(0, 0, 1), lock, blocked: false });
  const step = (secs: number, lock: Combatant | null = null) => {
    for (let t = 0; t < secs - 1e-9; t += 1 / 60) {
      const dt = 1 / 60;
      svc.t += dt;
      player.control(dt, ctl(lock));
      player.stepPhysics(dt, world, lock ? lock.pos : null, null);
      for (const e of enemies) e.stepPhysics(dt, world, null, null);
      player.stepAnimation(dt);
      for (const e of enemies) e.stepAnimation(dt);
      svc.combat.trace([player, ...enemies] as unknown as Combatant[]);
      player.upkeep(dt);
      input.endStep();
    }
  };
  return { world, svc, player, enemies, input, step, shots, data };
}

describe('arsenal in play (headless)', { timeout: 30_000 }, () => {
  it('greatsword light chain lands both blows and uses the two-handed moves', () => {
    const s = setup('bellwarden_greatsword', { enemies: [[0, 1.9]] });
    s.input.tap('light');
    s.step(0.9);
    expect(s.player.move?.def.id).toBe('great_light1');
    const hp1 = s.enemies[0].hp;
    expect(hp1).toBeLessThan(5000);
    s.input.tap('light');
    s.step(1.0);
    expect(s.enemies[0].hp).toBeLessThan(hp1);
  });

  it('with a shield, a two-handed class plays its one-handed twins', () => {
    const s = setup('bellwarden_greatsword', { left: 'household_shield' });
    s.input.tap('light');
    s.step(0.1);
    expect(s.player.move?.def.id).toBe('great_light1_1h');
    expect(s.player.move?.def.clip).toBe('greatLight1_1h');
  });

  it('bow: light looses an arrow and spends ammunition; empty quiver refuses', () => {
    const s = setup('huntsman_bow');
    s.data.inventory.bone_arrow = { id: 'bone_arrow', count: 2, upgrade: 0 } as any;
    s.input.tap('light');
    s.step(1.0);
    expect(s.shots.length).toBe(1);
    expect(s.shots[0].kind).toBe('arrow');
    expect(s.data.inventory.bone_arrow.count).toBe(1);
    s.data.inventory.bone_arrow.count = 0;
    s.input.tap('light');
    s.step(1.0);
    expect(s.shots.length).toBe(1);
    expect(s.svc.log).toContain('sfx:ui_error');
  });

  it('bow: guard held = aiming (camera hook) and aimed shots are quick', () => {
    const s = setup('huntsman_bow');
    s.data.inventory.bone_arrow = { id: 'bone_arrow', count: 10, upgrade: 0 } as any;
    s.input.downs.add('guard');
    s.step(0.2);
    expect(s.player.aiming).toBe(true);
    expect(s.player.guarding).toBe(false);
    s.input.tap('light');
    s.step(0.2);
    expect(s.player.move?.def.id).toBe('bow_shoot_aimed');
    expect(s.shots.length).toBe(1);
    // the shot flies along the camera forward (+Z)
    expect(s.shots[0].vel.z).toBeGreaterThan(Math.abs(s.shots[0].vel.x) * 5);
    s.input.downs.delete('guard');
    s.step(0.6);
    expect(s.player.aiming).toBe(false);
  });

  it('crossbow: one bolt, then the reload seats the next', () => {
    const s = setup('garrison_arbalest');
    s.data.inventory.iron_bolt = { id: 'iron_bolt', count: 5, upgrade: 0 } as any;
    s.input.tap('light');
    s.step(0.3);
    expect(s.shots.length).toBe(1);
    expect(s.shots[0].kind).toBe('bolt');
    expect(s.player.xbowLoaded).toBe(false);
    s.step(1.4);
    expect(s.player.xbowLoaded).toBe(true);
    // a dodge during the reload leaves it empty → next light reloads instead of shooting
    s.input.tap('light'); s.step(0.4);
    tapDodge(s); s.step(0.9);
    expect(s.player.xbowLoaded).toBe(false);
    s.input.tap('light'); s.step(0.1);
    expect(s.player.move?.def.id).toBe('xbow_reload');
    expect(s.shots.length).toBe(2);
  });

  it('Bellglass Lance pierces every foe on the line', () => {
    const s = setup('court_staff', { enemies: [[0, 4], [0.1, 8]], origin: 'courtMage' });
    s.data.knownSpells.push('bellglass_lance');
    s.data.equipment.spell0 = 'bellglass_lance'; s.data.activeSpell = 0;
    s.input.tap('light');
    s.step(1.0, s.enemies[0] as unknown as Combatant);
    expect(s.enemies[0].hp).toBeLessThan(5000);
    expect(s.enemies[1].hp).toBeLessThan(5000);
  });

  it('Falling Hour strikes 1.2 s after the mark, not before', () => {
    const s = setup('court_staff', { enemies: [[0, 5]], origin: 'courtMage' });
    s.data.knownSpells.push('falling_hour');
    s.data.equipment.spell0 = 'falling_hour'; s.data.activeSpell = 0;
    const lock = s.enemies[0] as unknown as Combatant;
    s.input.tap('light');
    s.step(0.75, lock); // cast event at 0.66
    s.step(1.0, lock);
    expect(s.enemies[0].hp).toBe(5000);
    s.step(0.4, lock);
    expect(s.enemies[0].hp).toBeLessThan(5000);
  });

  it('Ember Edge sets the weapon alight for 20 s; Rending Sweep turns a full circle', () => {
    const s = setup('gatewarden_halberd');
    s.data.imprints.gatewarden_halberd = 'ember_edge';
    s.input.tap('technique');
    s.step(1.0);
    expect(s.player.buffs.get('ember')).toBeGreaterThan(19);
    s.step(0.5);
    s.data.imprints.gatewarden_halberd = 'rending_sweep';
    const yaw0 = s.player.yaw;
    s.input.tap('technique');
    s.step(0.44);
    expect(s.player.move?.def.id).toBe('tech_rending_sweep');
    const mid = s.player.yaw;
    s.step(0.5);
    let turned = s.player.yaw - mid; while (turned < 0) turned += Math.PI * 2;
    expect(Math.abs(mid - yaw0)).toBeLessThan(0.5);
    expect(Math.min(turned, Math.PI * 2 - turned)).toBeLessThan(0.05); // a whole turn (2π) brings it back round
  });

  it('Riposte Stance turns a blow aside and answers with a riposte', () => {
    const s = setup('skinning_knife', { enemies: [[0, 1.4]] });
    s.data.imprints.skinning_knife = 'riposte_stance';
    const e = s.enemies[0];
    const wm = { hit: { from: 0.12, to: 1.05, radius: 0.05 }, object: new THREE.Group() };
    e.weaponR = { id: 'enemy_sword', model: wm as any };
    e.rig.sockets.weaponR.add(wm.object);
    s.input.downs.add('technique'); s.input.tap('technique');
    s.step(0.3);
    expect(s.player.move?.def.id).toBe('tech_riposte_stance');
    e.startMove(MOVES.inf_slash);
    let crit = false;
    for (let i = 0; i < 90 && !crit; i++) { s.step(1 / 60); crit = s.player.move?.def.id === 'crit_front'; }
    expect(crit).toBe(true);
  });

  it('Pinning Shot roots its target in place', () => {
    const s = setup('huntsman_bow', { enemies: [[0, 6]] });
    const e = s.enemies[0];
    s.player.onDealtHit({ attacker: s.player, target: e, spec: { start: 0, end: 0, source: 'sphere', dmg: 0, posture: 0, poise: 241, kind: 'thrust' }, move: { id: 'projectile', clip: '', dur: 0 }, outcome: 'hit', damage: 10, point: e.chest, dir: new THREE.Vector3(0, 0, 1), flinch: 'none', postureBroken: false });
    expect(e.buffs.has('rooted')).toBe(true);
    e.wish.set(3, 0, 0);
    for (let i = 0; i < 30; i++) { e.stepPhysics(1 / 60, s.world, null, null); s.player.upkeep(1 / 60); }
    expect(Math.abs(e.pos.x)).toBeLessThan(1e-6);
  });

  it('running attack when sprinting; estoc Vow Pursuit advances and pierces guard on the last thrust', () => {
    const s = setup('oath_estoc');
    s.input.mv = { x: 0, y: 1 };
    s.input.downs.add('dodge');
    s.step(0.5);
    expect(s.player.sprinting).toBe(true);
    s.input.tap('light');
    s.step(1 / 60);
    expect(s.player.move?.def.id).toBe('estoc_run');
    s.input.downs.delete('dodge'); s.input.mv = { x: 0, y: 0 };
    s.step(1.0);
    const z0 = s.player.pos.z;
    s.input.tap('technique');
    s.step(1.0);
    expect(s.player.move?.def.id).toBe('tech_vow_pursuit_1h');
    expect(s.player.pos.z - z0).toBeGreaterThan(2);
  });
});

// ------------------------------------------------------------------ reach: every blow lands where it should

/** Class → [item, its model's hit segment (weapons.ts), nominal reach (m)]. */
const REACH: Partial<Record<WeaponClass, [string, { from: number; to: number; radius: number } | null, number]>> = {
  straightSword: ['retainer_sword', { from: 0.12, to: 0.99, radius: 0.035 }, 1.5], curvedSword: ['greyford_sabre', { from: 0.1, to: 0.86, radius: 0.035 }, 1.4],
  greatsword: ['bellwarden_greatsword', { from: 0.18, to: 1.5, radius: 0.06 }, 2.0], dagger: ['skinning_knife', { from: 0.05, to: 0.21, radius: 0.022 }, 1.0],
  estoc: ['oath_estoc', { from: 0.12, to: 1.12, radius: 0.022 }, 1.8], axe: ['woodsman_axe', { from: 0.42, to: 0.62, radius: 0.1 }, 1.3],
  mace: ['mourning_mace', { from: 0.44, to: 0.72, radius: 0.08 }, 1.3], hammer: ['coinbreaker_hammer', { from: 0.58, to: 0.8, radius: 0.12 }, 1.6],
  flail: ['condemned_chain', { from: 0.3, to: 0.8, radius: 0.09 }, 1.6], spear: ['garrison_spear', { from: 1.38, to: 1.78, radius: 0.05 }, 2.2],
  halberd: ['gatewarden_halberd', { from: 1.14, to: 1.68, radius: 0.12 }, 2.2], staff: ['court_staff', { from: 0.95, to: 1.36, radius: 0.1 }, 1.6],
  censer: ['pilgrim_censer', { from: 0.4, to: 0.58, radius: 0.07 }, 1.3], bell: ['hand_bell', null, 1.0], fist: ['', null, 0.9],
};

/** Play `def` with a dummy at (x, z); returns how many hits landed on it. */
function strikes(item: string, hit: { from: number; to: number; radius: number } | null, def: MoveDef, x: number, z: number): number {
  const world = flatWorld(); let p!: Player; const enemies: Enemy[] = [];
  const svc = mockServices(world, () => [p, ...enemies]);
  const d = newPlayerData('householdKnight'); d.equipment.right0 = item || null; d.equipment.left0 = null;
  p = new Player(svc, d);
  if (item) { const wm = { object: new THREE.Group(), hit }; p.weaponR = { id: item, model: wm as any }; p.rig.sockets.weaponR.add(wm.object); }
  p.teleport(new THREE.Vector3(), 0);
  const e = new Enemy(ENEMY_DEFS.infantry, svc, 3); e.hp = e.hpMax = 1e5; e.teleport(new THREE.Vector3(x, 0, z), Math.PI); enemies.push(e);
  let n = 0; svc.combat.onResult = (r) => { if (r.target === e) n++; };
  p.startMove(def);
  const input = new FakeInput();
  for (let t = 0; t < def.dur; t += 1 / 60) {
    p.control(1 / 60, { input: input as unknown as IInput, camYaw: 0, camForward: new THREE.Vector3(0, 0, 1), lock: null, blocked: false });
    p.stepPhysics(1 / 60, world, null, null); e.stepPhysics(1 / 60, world, null, null);
    p.stepAnimation(1 / 60); e.stepAnimation(1 / 60);
    svc.combat.trace([p, e] as unknown as Combatant[]);
  }
  return n;
}

describe('reach', { timeout: 60_000 }, () => {
  it('every melee chain, heavy and running attack connects with a foe at the class reach (and up close)', () => {
    const miss: string[] = [];
    for (const [cls, [id, hit, dist]] of Object.entries(REACH) as [WeaponClass, [string, { from: number; to: number; radius: number } | null, number]][]) {
      const ms = MOVESETS[cls];
      for (const mid of [...ms.light, ms.heavyRelease, ms.running].filter((x): x is string => !!x)) {
        const run = mid === ms.running;
        const far = run ? dist + (MOVES[mid].motion?.at(-1)?.[1] ?? 0) * 0.7 : dist;
        const near = run || cls === 'spear' || cls === 'halberd' || cls === 'staff' ? [] : [1.0]; // polearm/staff heads overreach point-blank
        for (const z of [far, ...near]) if (!strikes(id, hit, MOVES[mid], 0, z)) miss.push(`${cls} ${mid} @${z.toFixed(1)}`);
      }
    }
    expect(miss).toEqual([]);
  });

  it('techniques land: Rending Sweep and Unbroken Links strike a foe behind; Bell Breaker lands on its target', () => {
    expect(strikes('gatewarden_halberd', REACH.halberd![1], MOVES.tech_rending_sweep, 0, -1.8)).toBeGreaterThan(0);
    expect(strikes('bellwarden_greatsword', REACH.greatsword![1], MOVES.tech_rending_sweep_great, 0, -1.6)).toBeGreaterThan(0);
    expect(strikes('condemned_chain', REACH.flail![1], MOVES.tech_chain_whirl, 0, -1.2)).toBe(2);
    expect(strikes('bellwarden_greatsword', REACH.greatsword![1], MOVES.tech_bell_breaker, 0, 3.2)).toBeGreaterThan(0);
    expect(strikes('greyford_sabre', REACH.curvedSword![1], MOVES.tech_flourish, 0, 1.6)).toBeGreaterThanOrEqual(2);
    expect(strikes('oath_estoc', REACH.estoc![1], MOVES.tech_vow_pursuit_1h, 0, 3.4)).toBeGreaterThanOrEqual(2);
    expect(strikes('garrison_spear', REACH.spear![1], MOVES.tech_impaling_charge, 0, 6.5)).toBeGreaterThan(0);
    expect(strikes('coinbreaker_hammer', REACH.hammer![1], MOVES.tech_knell_strike, 0, 1.6)).toBeGreaterThan(0);
  });
});

// Keep the item table honest: every weapon item's class has a moveset.
describe('item classes', () => {
  it('every weapon/catalyst/bow item resolves', () => {
    for (const d of Object.values(ITEMS)) if (d.weapon) expect(MOVESETS[d.weapon.class], d.id).toBeTruthy();
  });
});
