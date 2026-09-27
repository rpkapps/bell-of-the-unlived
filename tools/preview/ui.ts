/**
 * UI preview harness: the real UI + real Input against a mock UIHost backed by the real content
 * data. Open /tools/preview/ui.html?screen=<name> with the dev server running.
 *
 * Params:
 *   screen = title|origin|hud|pause|stillbell|attributes|status|equipment|inventory|journal|practice|map|
 *            settings|accessibility|controls|smith|shop|travel|attune|imprint|memories|dialogue|death|
 *            confirm|credits|cinematic|loading|icons
 *   device = kbm|pad        force prompt device        pad = xbox|playstation
 *   scale  = 0.8..1.6       text scale                  hv = 1  high-visibility cues
 *   toll   = left|right|ahead|behind|off                bg = 0  no backdrop
 */
import { UI } from '../../src/ui/UI';
import type { UIHost, EquipmentView, SaveSummary } from '../../src/ui/contract';
import { defaultSettings, type Settings } from '../../src/game/settings';
import {
  ATTRIBUTES, type Attributes, type EquipSlot, type HudState, type InventoryEntry, type ItemDef, type JournalLead,
  type LoadClass, type OriginId, type PlayerSheet,
} from '../../src/game/types';
import { Input } from '../../src/input/Input';
import type { Device, IInput } from '../../src/input/actions';
import { ITEMS, TECHNIQUES, SHOP_STOCK } from '../../src/content/items';
import { SPELLS } from '../../src/content/spells';
import { ORIGINS } from '../../src/content/origins';
import { LEADS } from '../../src/content/journal';
import { PRACTICE_TOPICS } from '../../src/content/practice';
import { MEMORY_REWARDS, WARNINGS, DEATH_TEXT, HINTS, formatActions } from '../../src/content/text';
import { DIALOGUE, INTRO_CARDS } from '../../src/content/dialogue';
import { AttributesScreen } from '../../src/ui/screens/attributes';
import { EquipmentScreen } from '../../src/ui/screens/equipment';
import { JournalScreen } from '../../src/ui/screens/journal';
import { SettingsScreen } from '../../src/ui/screens/settings';
import { AttuneScreen, ImprintScreen, MemoriesScreen, TravelScreen } from '../../src/ui/screens/stillbell';
import { CreditsScreen } from '../../src/ui/screens/title';
import { icon, iconIds } from '../../src/ui/icons';

const q = new URLSearchParams(location.search);
const screen = q.get('screen') ?? 'title';

// ------------------------------------------------------------------ settings

let settings: Settings = defaultSettings();
if (q.get('scale')) settings.accessibility.textScale = Number(q.get('scale'));
if (q.get('hv')) settings.accessibility.highVisibilityCues = true;
if (q.get('pad')) settings.controls.padLayout = q.get('pad') as 'xbox' | 'playstation';

// ------------------------------------------------------------------ input (real, device forcible)

const real = new Input(document.getElementById('app')!, () => settings);
const forced = q.get('device') as Device | null;
const input: IInput = forced
  ? new Proxy(real, {
      get(t, p) {
        if (p === 'device') return forced;
        if (p === 'glyph') return (a: Parameters<IInput['glyph']>[0], d?: Device) => t.glyph(a, d ?? forced);
        const v = Reflect.get(t, p, t) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
      },
    })
  : real;

// ------------------------------------------------------------------ mock game state

const entry = (id: string, count = 1, upgrade = 0): InventoryEntry => ({ id, count, upgrade, def: ITEMS[id] as ItemDef });
const inv: InventoryEntry[] = [
  entry('retainer_sword', 1, 3), entry('garrison_spear'), entry('coinbreaker_hammer'), entry('court_staff', 1, 1), entry('parrying_dirk'),
  entry('household_shield'), entry('mint_buckler'),
  entry('retainer_helm'), entry('retainer_harness'), entry('retainer_gauntlets'), entry('retainer_greaves'),
  entry('warden_talisman'), entry('recall_flask', 3), entry('recall_flask_focus', 2), entry('throwing_knife', 8), entry('ember_resin', 2),
  entry('tempered_scrap', 3), entry('bellbronze_shard'), entry('refuge_key'), entry('grimoire_cinder_bolt'), entry('imprint_ember_edge'),
  entry('memory_corvane'),
].filter((e) => e.def);

const slots: Record<EquipSlot, InventoryEntry | null> = {
  right0: inv.find((e) => e.id === 'retainer_sword')!, right1: inv.find((e) => e.id === 'court_staff')!,
  left0: inv.find((e) => e.id === 'household_shield')!, left1: null,
  head: inv.find((e) => e.id === 'retainer_helm') ?? null, body: inv.find((e) => e.id === 'retainer_harness') ?? null,
  arms: inv.find((e) => e.id === 'retainer_gauntlets') ?? null, legs: inv.find((e) => e.id === 'retainer_greaves') ?? null,
  talisman0: inv.find((e) => e.id === 'warden_talisman')!, talisman1: null,
  quick0: inv.find((e) => e.id === 'recall_flask')!, quick1: inv.find((e) => e.id === 'recall_flask_focus')!,
  quick2: inv.find((e) => e.id === 'throwing_knife')!, quick3: null,
  spell0: null, spell1: null, spell2: null,
};

let attrs: Attributes = { ...ORIGINS[0]!.attributes, strength: 14, vigor: 15 };
let hours = 3412;
let flask = { total: 5, health: 3, focus: 2 };
const attuned: (string | null)[] = ['glinting_shard', 'cinder_bolt', null];
const imprints: Record<string, string> = {};
const pendingMem = [{ id: 'memory_corvane', bossName: 'Ser Corvane', rewards: MEMORY_REWARDS.memory_corvane ?? [] }];

const levelOf = (a: Attributes) => ATTRIBUTES.reduce((s, k) => s + a[k], 0) - 70 + 1;
const levelCost = (L: number) => Math.max(400, Math.round(0.02 * L ** 3 + 3.06 * L ** 2 + 105.6 * L - 895));

function sheetFor(a: Attributes): PlayerSheet {
  const eq = Object.values(slots).filter(Boolean) as InventoryEntry[];
  const load = eq.reduce((s, e) => s + (e.def.kind === 'consumable' ? 0 : e.def.weight ?? 0), 0);
  const loadMax = 30 + a.endurance * 2;
  const r = load / loadMax;
  const loadClass: LoadClass = r <= 0.3 ? 'light' : r <= 0.7 ? 'medium' : r <= 1 ? 'heavy' : 'overloaded';
  const armor = eq.filter((e) => e.def.armor);
  const w = slots.right0?.def.weapon;
  return {
    level: levelOf(a), hours, nextLevelCost: levelCost(levelOf(a)), attributes: { ...a },
    hpMax: 300 + a.vigor * 18, focusMax: 40 + a.mind * 6, staminaMax: 70 + a.endurance * 3,
    equipLoad: load, equipLoadMax: loadMax, loadClass,
    dodgeIFrames: loadClass === 'light' ? [0.06, 0.42] : loadClass === 'medium' ? [0.06, 0.38] : [0.08, 0.32],
    poise: armor.reduce((s, e) => s + (e.def.armor?.poise ?? 0), 0),
    defense: {
      physical: 40 + armor.reduce((s, e) => s + (e.def.armor?.physical ?? 0), 0) + a.vigor,
      magic: 30 + armor.reduce((s, e) => s + (e.def.armor?.magic ?? 0), 0) + a.intellect * 2,
      fire: 30 + armor.reduce((s, e) => s + (e.def.armor?.fire ?? 0), 0),
    },
    attackRight: (w?.damage.physical ?? 0) + 12 + Math.round(a.strength * 1.6 + a.dexterity * 1.4) + (slots.right0?.upgrade ?? 0) * 11,
    attackLeft: 38 + a.strength, spellPower: 60 + a.intellect * 4, originId: 'householdKnight',
  };
}

function journal(): JournalLead[] {
  const t0 = 180;
  const mk = (leadId: string, ids: string[], status: JournalLead['status']): JournalLead => {
    const def = LEADS[leadId]!;
    const entries = ids.map((id, i) => {
      const e = def.entries[id]!;
      // A remembered entry contradicted by a recorded observation keeps its text and gains a note.
      const contra = Object.entries(def.entries).find(([oid, o]) => ids.includes(oid) && o.contradicts === id);
      return { id, category: e.category, text: e.text, time: t0 + i * 340, contradictedBy: contra?.[1].contradictionNote, loss: e.loss };
    });
    return { id: leadId, title: def.title, region: def.region, status, entries };
  };
  return [
    mk('refugee_road', ['mem_route', 'obs_masonry', 'obs_hatch', 'conf_hatch'], 'open'),
    mk('healer', ['mem_oswin', 'obs_cell', 'conf_taken'], 'lost'),
    mk('measure', ['mem_measure', 'obs_measure'], 'open'),
    mk('betrayal', ['mem_gate', 'obs_letters'], 'open'),
    mk('greyford', ['obs_relief'], 'open'),
  ];
}

const slotKinds = (slot: EquipSlot): ((e: InventoryEntry) => boolean) => {
  if (slot.startsWith('right')) return (e) => ['weapon', 'catalyst', 'bow'].includes(e.def.kind);
  if (slot.startsWith('left')) return (e) => ['shield', 'weapon', 'catalyst'].includes(e.def.kind);
  if (slot.startsWith('talisman')) return (e) => e.def.kind === 'talisman';
  if (slot.startsWith('quick')) return (e) => e.def.kind === 'consumable';
  if (slot.startsWith('spell')) return (e) => e.def.kind === 'spellbook';
  return (e) => e.def.armor?.slot === slot;
};

const knownSpells = () => ['glinting_shard', 'cinder_bolt', 'shard_volley', 'stilling_chime', 'bellglass_lance'].map((id) => SPELLS[id]).filter(Boolean) as NonNullable<(typeof SPELLS)[string]>[];

const host: UIHost = {
  input,
  hasSave: () => q.get('save') !== '0',
  saveSummary: (): SaveSummary => ({ level: sheetFor(attrs).level, location: 'Hospice of the Quiet Hour', playtime: 4520, origin: 'Household Knight', savedAt: Date.now() }),
  origins: () => ORIGINS,
  newGame: (o: OriginId) => { log(`newGame(${o})`); ui.closeAll(); },
  continueGame: () => { log('continueGame()'); ui.closeAll(); },
  quitToTitle: () => { log('quitToTitle()'); ui.showTitle(); },
  getSettings: () => settings,
  applySettings: (s) => { settings = s; log(`applySettings(textScale=${s.accessibility.textScale})`); },
  sheet: () => sheetFor(attrs),
  previewAttributes: (a) => {
    const base = sheetFor(attrs);
    const sumB = ATTRIBUTES.reduce((s, k) => s + attrs[k], 0), sumA = ATTRIBUTES.reduce((s, k) => s + a[k], 0);
    let cost = 0;
    for (let L = base.level; L < base.level + (sumA - sumB); L++) cost += levelCost(L);
    const valid = sumA >= sumB && cost <= hours;
    return { sheet: { ...sheetFor(a), level: levelOf(a) }, hoursCost: cost, valid, reason: sumA < sumB ? `${sumB - sumA} freed point${sumB - sumA > 1 ? 's' : ''} still to assign.` : cost > hours ? 'Not enough Hours.' : undefined };
  },
  commitAttributes: (a) => { const p = host.previewAttributes(a); if (!p.valid) return false; hours -= p.hoursCost; attrs = { ...a }; return true; },
  atStillbell: () => ({ id: 'hospice', name: 'Hospice Stillbell' }),
  flask: () => ({ ...flask }),
  setFlaskSplit: (hh) => { flask = { total: flask.total, health: hh, focus: flask.total - hh }; },
  destinations: () => [
    { id: 'watchtower', name: 'Watchtower Stillbell', region: 'Ashbridge', unlocked: true, current: false },
    { id: 'hospice', name: 'Hospice Stillbell', region: 'Ashbridge', unlocked: true, current: true },
    { id: 'yard', name: 'Commander\'s Yard', region: 'Ashbridge', unlocked: false, current: false },
  ],
  travel: (id) => log(`travel(${id})`),
  knownSpells,
  attuneSpell: (slot, id) => { attuned[slot] = id; },
  attunedSpells: () => [...attuned],
  techniques: () => Object.values(TECHNIQUES),
  imprintOptions: (itemId) => {
    const def = ITEMS[itemId]!;
    const cls = def.weapon?.class ?? (def.shield ? 'shield' : null);
    return {
      current: imprints[itemId] ?? def.weapon?.technique ?? def.shield?.technique ?? null,
      options: Object.values(TECHNIQUES).filter((t) => cls && (t.compatible as string[]).includes(cls)),
    };
  },
  imprint: (itemId, t) => { imprints[itemId] = t; return true; },
  pendingMemories: () => pendingMem,
  exchangeMemory: (m, r) => { log(`exchangeMemory(${m}, ${r})`); pendingMem.splice(0); return true; },
  leaveStillbell: () => log('leaveStillbell()'),
  equipment: (): EquipmentView => ({ slots: { ...slots }, candidates: (slot) => inv.filter(slotKinds(slot)) }),
  inventory: (kind) => (kind ? inv.filter((e) => e.def.kind === kind) : [...inv]),
  equip: (slot, id) => { slots[slot] = id ? inv.find((e) => e.id === id) ?? null : null; },
  upgradeOptions: () => inv.filter((e) => e.def.weapon).map((e) => ({
    itemId: e.id, name: e.def.name, icon: e.def.icon, from: e.upgrade, to: e.upgrade + 1,
    materials: [{ id: 'tempered_scrap', name: 'Tempered Scrap', have: 3, need: e.upgrade + 1 }],
    hours: 600 + e.upgrade * 400, affordable: e.upgrade + 1 <= 3, maxed: e.upgrade >= (e.def.weapon?.maxUpgrade ?? 10),
    preview: { attack: [e.def.weapon!.damage.physical + e.upgrade * 11, e.def.weapon!.damage.physical + (e.upgrade + 1) * 11] as [number, number] },
  })),
  upgrade: (id) => { const e = inv.find((x) => x.id === id); if (e) e.upgrade++; return true; },
  shop: (npc) => (SHOP_STOCK[npc] ?? []).map((s) => { const d = ITEMS[s.itemId]!; return { itemId: s.itemId, name: d.name, icon: d.icon, price: d.price ?? 100, stock: s.stock, description: d.description }; }),
  buy: (_n, id) => { log(`buy(${id})`); return true; },
  journal,
  practiceTopics: () => PRACTICE_TOPICS,
  resume: () => log('resume()'),
  playtime: () => 4520,
};
// optional extras the UI uses when present
Object.assign(host, { uiSound: (c: string) => log(`sound ${c}`), discoveredAreas: () => ['watchtower', 'lowerStreet', 'oldMint', 'countingRoom', 'lowerPassage', 'courtyard', 'hospice', 'gateApproach'] });

function log(s: string): void { const el = document.getElementById('dev'); if (el) el.textContent = s; console.log('[host]', s); }

// ------------------------------------------------------------------ boot

const ui = new UI(document.getElementById('ui')!);
ui.init(host);

const view = document.getElementById('view')!;
const bgFor: Record<string, string> = { title: 'alternates/ashbridge-wide-overlook.png', hud: 'selected/ashbridge.png', dialogue: 'selected/ashbridge.png', death: 'selected/ashbridge.png', confirm: 'selected/ashbridge.png' };
if (q.get('bg') !== '0') view.style.backgroundImage = `url(/concept-art/${bgFor[screen] ?? 'selected/ashbridge.png'})`;

const tollMode = q.get('toll') ?? 'left';
function hudState(t: number): HudState {
  const W = innerWidth, H = innerHeight;
  const sh = sheetFor(attrs);
  const boss = ['hud', 'death'].includes(screen) && q.get('boss') !== '0';
  return {
    hp: sh.hpMax * (0.62 + 0.04 * Math.sin(t * 0.7)), hpMax: sh.hpMax,
    stamina: sh.staminaMax * (0.55 + 0.4 * Math.abs(Math.sin(t * 0.4))), staminaMax: sh.staminaMax,
    focus: sh.focusMax * 0.7, focusMax: sh.focusMax, hours,
    right: { name: 'Retainer Sword', icon: 'retainer_sword', upgrade: 3 }, left: { name: 'Household Shield', icon: 'household_shield' },
    quick: { name: 'Recall Flask', icon: 'recall_flask', count: flask.health }, spell: { name: 'Glinting Shard', icon: 'glinting_shard' },
    flask: { health: flask.health, focus: flask.focus },
    toll: tollMode === 'off' ? { active: false, dir: 0, behind: false, intensity: 0 }
      : { active: true, dir: tollMode === 'left' ? -0.8 : tollMode === 'right' ? 0.8 : tollMode === 'behind' ? 1 : 0, behind: tollMode === 'behind', intensity: 0.85 },
    lock: { visible: true, x: W * 0.305, y: H * 0.6 },
    enemyBars: [
      { id: 1, x: W * 0.305, y: H * 0.52, hp01: 0.45, posture01: 0.7, damage: 142, visible: true },
      { id: 2, x: W * 0.69, y: H * 0.5, hp01: 0.9, posture01: 0.1, visible: true },
    ],
    boss: boss ? { name: 'Ser Corvane Aldmoor', title: 'Bell-Appointed Commander of Ashbridge', hp01: 0.58, posture01: 0.62, phase: 1 } : null,
    critical: { visible: q.get('crit') !== '0', x: W * 0.69, y: H * 0.64, kind: 'riposte' },
    reticle: false,
    prompt: q.get('prompt') !== '0' ? { text: 'Rest at the Stillbell', action: 'interact' } : null,
    statuses: [{ id: 'burn', icon: 'burn', label: 'Burning', remaining01: 0.6 }, { id: 'ward', icon: 'ward', label: 'Bellglass Ward', remaining01: 0.3 }],
    iframes: false, lowHealth: q.get('low') === '1',
  };
}

let last = performance.now();
let tt = 0;
const showHud = ['hud', 'dialogue', 'death', 'confirm', 'pause', 'stillbell'].includes(screen);
ui.setHudVisible(showHud);
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  tt += dt;
  real.beginFrame(dt);
  if (showHud) ui.hud(hudState(tt));
  ui.update(dt);
  real.endStep();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Damage the first frames so the lag chunk shows in screenshots.
if (screen === 'hud') setTimeout(() => { attrs = { ...attrs }; }, 0);

switch (screen) {
  case 'title': ui.showTitle(); break;
  case 'origin': void ui.showOriginSelect().then((o) => log(`origin → ${o}`)); break;
  case 'pause': ui.showPause(); break;
  case 'stillbell': ui.showStillbell(); break;
  case 'attributes': ui.showStillbell(); ui.push(new AttributesScreen(ui, false)); break;
  case 'status': ui.push(new AttributesScreen(ui, true)); break;
  case 'equipment': ui.push(new EquipmentScreen(ui, 'equipment')); break;
  case 'inventory': ui.push(new EquipmentScreen(ui, 'inventory')); break;
  case 'journal': ui.showJournal(); break;
  case 'practice': ui.showPractice('parry'); break;
  case 'map': ui.push(new JournalScreen(ui, 'map')); break;
  case 'settings': ui.push(new SettingsScreen(ui)); break;
  case 'accessibility': ui.push(new SettingsScreen(ui, 'accessibility')); break;
  case 'controls': ui.push(new SettingsScreen(ui, 'controls')); break;
  case 'smith': ui.showSmith('hesper'); break;
  case 'shop': ui.showShop('hesper'); break;
  case 'travel': ui.push(new TravelScreen(ui)); break;
  case 'attune': ui.push(new AttuneScreen(ui)); break;
  case 'imprint': ui.push(new ImprintScreen(ui)); break;
  case 'memories': ui.push(new MemoriesScreen(ui)); break;
  case 'credits': ui.push(new CreditsScreen(ui)); break;
  case 'dialogue':
    void ui.dialogue(DIALOGUE.oswin_cell ?? [], [{ id: 'free', text: 'I will find the key.' }, { id: 'leave', text: 'Not yet.' }]).then((c) => log(`dialogue → ${c}`));
    break;
  case 'death': ui.banner('death', DEATH_TEXT, 'Your Hours linger in the Last Breath.'); break;
  case 'confirm': {
    const w = WARNINGS.arenaWithPrisoner;
    void ui.confirm(w.title, w.body, w.yes, w.no).then((v) => log(`confirm → ${v}`));
    break;
  }
  case 'cinematic': void ui.cinematic(INTRO_CARDS).then(() => log('cinematic done')); break;
  case 'loading': ui.loading(0.42, 'Remembering Ashbridge'); break;
  case 'hud':
    ui.subtitle({ speaker: 'Garrison Soldier', text: 'By the Bell — who let you past the gate?', duration: 60 });
    ui.caption('Attack winding up', 'left');
    ui.toast('Bellbronze Shard', 'item', 'bellbronze_shard');
    ui.toast('Forememory updated: The Refugee Road', 'journal');
    ui.hint('demo', formatActions(HINTS.guard ?? HINTS[Object.keys(HINTS)[0]!] ?? '', (a) => input.glyph(a), input.device), ['guard', 'parry']);
    ui.fps(60);
    break;
  case 'icons': {
    const grid = document.createElement('div');
    grid.style.cssText = 'position:fixed;inset:0;overflow:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,96px);gap:8px;background:#0a0807;z-index:100';
    for (const id of iconIds()) {
      const c = document.createElement('div');
      c.style.cssText = 'color:#b8925a;font:9px monospace;text-align:center;border:1px solid #2a2218;padding:6px';
      c.innerHTML = `<div style="width:56px;height:56px;margin:0 auto 4px">${icon(id)}</div>${id}`;
      grid.appendChild(c);
    }
    document.body.appendChild(grid);
    break;
  }
}
(window as unknown as { __ready: boolean; ui: UI }).__ready = true;
(window as unknown as { ui: UI }).ui = ui;
