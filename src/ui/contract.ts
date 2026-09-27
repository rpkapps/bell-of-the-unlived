/**
 * CONTRACT — the boundary between the game and the DOM UI.
 *
 *  - `IUI` is implemented by src/ui/UI.ts. The game calls it.
 *  - `UIHost` is implemented by the game (src/game/*). The UI calls it for data and commands.
 *
 * The UI is an HTML/CSS overlay in #ui. Every screen is navigable by controller/keyboard via
 * `IInput.consumeUi()` and clickable with the mouse. Prompts use `IInput.glyph()`.
 */
import type { IInput, ActionId } from '../input/actions';
import type { Settings } from '../game/settings';
import type {
  HudState, PlayerSheet, Attributes, OriginDef, OriginId, InventoryEntry, EquipSlot, JournalLead,
  DialogueLine, DialogueChoice, SpellDef, TechniqueDef, ItemKind,
} from '../game/types';

export interface SaveSummary { level: number; location: string; playtime: number; origin: string; savedAt: number }
export interface TravelDestination { id: string; name: string; region: string; unlocked: boolean; current: boolean }
export interface FlaskState { total: number; health: number; focus: number }
export interface UpgradeOption {
  itemId: string; name: string; icon: string; from: number; to: number;
  materials: { id: string; name: string; have: number; need: number }[];
  hours: number; affordable: boolean; maxed: boolean;
  preview: { attack: [number, number] };
}
export interface ShopEntry { itemId: string; name: string; icon: string; price: number; stock: number | null; description: string }
export interface MemoryReward { id: string; name: string; icon: string; kind: 'weapon' | 'technique' | 'spell' | 'hours' | 'item'; description: string }
export interface PracticeTopic { id: string; title: string; body: string[] }

export interface EquipmentView {
  slots: Record<EquipSlot, InventoryEntry | null>;
  /** Items that can go into a given slot. */
  candidates(slot: EquipSlot): InventoryEntry[];
}

export interface UIHost {
  readonly input: IInput;

  // title / session
  hasSave(): boolean;
  saveSummary(): SaveSummary | null;
  origins(): OriginDef[];
  newGame(origin: OriginId): void;
  continueGame(): void;
  /** Return to title from the pause menu (game autosaves first). */
  quitToTitle(): void;

  // settings
  getSettings(): Settings;
  applySettings(s: Settings): void;

  // character
  sheet(): PlayerSheet;
  /** Preview a candidate attribute set (for level-up/respec screen). */
  previewAttributes(a: Attributes): { sheet: PlayerSheet; hoursCost: number; valid: boolean; reason?: string };
  /** Commit attributes at a Stillbell. Returns false if invalid/unaffordable. */
  commitAttributes(a: Attributes): boolean;

  // Stillbell
  atStillbell(): { id: string; name: string } | null;
  flask(): FlaskState;
  setFlaskSplit(health: number): void;
  destinations(): TravelDestination[];
  travel(id: string): void;
  knownSpells(): SpellDef[];
  techniques(): TechniqueDef[];
  pendingMemories(): { id: string; bossName: string; rewards: MemoryReward[] }[];
  exchangeMemory(memoryId: string, rewardId: string): boolean;
  /** Leave the Stillbell menu (resume play). */
  leaveStillbell(): void;

  // equipment / inventory
  equipment(): EquipmentView;
  inventory(kind?: ItemKind): InventoryEntry[];
  equip(slot: EquipSlot, itemId: string | null): void;

  // smith & shops
  upgradeOptions(): UpgradeOption[];
  upgrade(itemId: string): boolean;
  shop(npcId: string): ShopEntry[];
  buy(npcId: string, itemId: string): boolean;

  // journal
  journal(): JournalLead[];
  practiceTopics(): PracticeTopic[];

  // pause
  resume(): void;
  playtime(): number;
}

export type ToastKind = 'item' | 'info' | 'journal' | 'warning' | 'hours';
export type BannerKind = 'death' | 'bossDefeated' | 'stillbellLit' | 'memory' | 'area' | 'regionComplete';

export interface IUI {
  init(host: UIHost): void;
  /** Per frame, after the game updates. `dt` real seconds. The UI reads nav input itself when a screen is open. */
  update(dt: number): void;
  /** True while any screen that blocks gameplay input is open. */
  readonly blocking: boolean;

  // screens
  showTitle(): void;
  showOriginSelect(): Promise<OriginId | null>;
  showPause(): void;
  showStillbell(): void;
  showJournal(): void;
  showSmith(npcId: string): void;
  showShop(npcId: string): void;
  showPractice(topicId?: string): void;
  closeAll(): void;
  /** Plain-language yes/no confirm (e.g. boss arena warning). Resolves true for yes. */
  confirm(title: string, body: string, yes?: string, no?: string): Promise<boolean>;

  // in-game overlays
  setHudVisible(v: boolean): void;
  hud(state: HudState): void;
  /** Conversation: shows lines one by one (confirm advances); returns chosen choice id or null. */
  dialogue(lines: DialogueLine[], choices?: DialogueChoice[]): Promise<string | null>;
  /** Non-blocking subtitle (barks, ambient speech). */
  subtitle(line: DialogueLine): void;
  /** Sound caption for accessibility: "[Bell tolls — left]" etc. */
  caption(text: string, dir?: 'left' | 'right' | 'ahead' | 'behind' | null): void;
  toast(text: string, kind?: ToastKind, icon?: string): void;
  banner(kind: BannerKind, title: string, subtitle?: string): void;
  /** Context tutorial hint (only when gameplay hints are on). Shown once per id per save. */
  hint(id: string, text: string, actions?: ActionId[]): void;
  /** Full-screen fade (0 clear → 1 black), duration seconds. */
  fade(to: 0 | 1, duration: number, color?: string): Promise<void>;
  /** Cinematic letterbox + centred text cards for the intro and ending. */
  cinematic(cards: { text: string; speaker?: string; duration: number; style?: 'memory' | 'plain' | 'title' }[]): Promise<void>;
  loading(progress: number | null, label?: string): void;
  fps(v: number | null): void;
}
