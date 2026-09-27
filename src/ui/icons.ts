/**
 * Procedural icon library — every icon in the game is inline SVG line art drawn here
 * (thin antique-gold strokes on dark, `currentColor`), no image files.
 *
 * `icon(id, kind)` returns SVG markup. Lookup order: exact id → alias → keyword heuristics on the id
 * → generic fallback for the ItemKind (or domain) → a plain diamond.
 *
 * Style classes (see styles.css `.ic`): default stroke = currentColor, no fill;
 *   `f` soft tonal fill, `s` solid fill, `t` thin stroke, `hl` highlight colour, `fp` focus blue,
 *   `hp` health red. All drawings use a 64×64 viewBox.
 */

// ------------------------------------------------------------------ primitives

const p = (d: string, cls = '') => `<path d="${d}"${cls ? ` class="${cls}"` : ''}/>`;
const c = (x: number, y: number, r: number, cls = '') => `<circle cx="${x}" cy="${y}" r="${r}"${cls ? ` class="${cls}"` : ''}/>`;
const l = (x1: number, y1: number, x2: number, y2: number, cls = '') => p(`M${x1} ${y1}L${x2} ${y2}`, cls);
const g = (tf: string, inner: string) => `<g transform="${tf}">${inner}</g>`;
const n = (v: number) => Math.round(v * 100) / 100;

/** Bell silhouette path: `cx` centre, `top` crown, `w` lip width, `ht` height. */
function bellD(cx: number, top: number, w: number, ht: number): string {
  const b = top + ht, L = cx - w / 2, R = cx + w / 2;
  return `M${n(L)} ${n(b)}L${n(L + w * 0.1)} ${n(b - ht * 0.16)}C${n(L + w * 0.2)} ${n(b - ht * 0.45)} ${n(cx - w * 0.32)} ${n(top + ht * 0.42)} ${n(cx - w * 0.28)} ${n(top + ht * 0.14)}Q${n(cx)} ${n(top - ht * 0.12)} ${n(cx + w * 0.28)} ${n(top + ht * 0.14)}C${n(cx + w * 0.32)} ${n(top + ht * 0.42)} ${n(R - w * 0.2)} ${n(b - ht * 0.45)} ${n(R - w * 0.1)} ${n(b - ht * 0.16)}L${n(R)} ${n(b)}Z`;
}
/** Complete small bell: body, crown loop, lip line and clapper. */
function bell(cx: number, top: number, w: number, ht: number, cls = 'f'): string {
  return p(bellD(cx, top, w, ht), cls) + p(bellD(cx, top, w, ht)) +
    c(cx, top - ht * 0.06, Math.max(1.2, w * 0.07)) +
    l(cx - w * 0.44, top + ht * 0.86, cx + w * 0.44, top + ht * 0.86, 't') +
    c(cx, top + ht + Math.max(1.4, w * 0.07), Math.max(1.2, w * 0.07), 's');
}

/** The royal arms (crown over bar over arch with bell over base bar) in a 40×54 box. */
function armsBody(): string {
  return p('M4 17L1 6L10 11L13 3L17 9L20 0L23 9L27 3L30 11L39 6L36 17Z', 's') +
    p('M5 20H35V24.5H5Z', 's') +
    p('M4 49V38A16 13 0 0 1 36 38V49H30.5V39.5A10.5 8.5 0 0 0 9.5 39.5V49Z', 's') +
    p(bellD(20, 33, 12, 13), 's') + p('M1 50.5H39V55H1Z', 's');
}
function arms(tx: number, ty: number, sc: number): string {
  return g(`translate(${tx} ${ty}) scale(${sc})`, armsBody());
}

/** Straight sword along the diagonal (bottom-left grip, top-right tip). */
function sword(opts: { tip?: number; width?: number; guard?: 'bar' | 'curved' | 'cup' | 'ring'; pommel?: 'round' | 'bell' } = {}): string {
  const tip = opts.tip ?? 53, w = opts.width ?? 1.8;
  const bx = 22, by = 42; // blade base
  let s = p(`M${bx - w} ${by - w}L${tip - 3} ${64 - tip + 0.4}L${tip} ${64 - tip - 0}L${tip - 0.4} ${64 - tip + 3}L${bx + w} ${by + w}Z`, 'f');
  s += p(`M${bx - w} ${by - w}L${tip - 3} ${64 - tip + 0.4}L${tip} ${64 - tip}L${tip - 0.4} ${64 - tip + 3}L${bx + w} ${by + w}`);
  s += l(bx + 1, by - 1, tip - 4, 64 - tip + 4, 't');
  switch (opts.guard ?? 'bar') {
    case 'bar': s += l(14.5, 35.5, 28.5, 49.5) + c(14, 35, 1.4, 's') + c(29, 50, 1.4, 's'); break;
    case 'curved': s += p('M12 38Q17 36 20 40Q24 44 26 52') + c(12, 38, 1.5, 's') + c(26, 52, 1.5, 's'); break;
    case 'cup': s += p('M14 34A9.5 9.5 0 0 0 30 50', '') + p('M14 34A9.5 9.5 0 0 0 30 50L22 42Z', 'f'); break;
    case 'ring': s += l(15.5, 36.5, 27.5, 48.5) + c(26, 38, 3.2); break;
  }
  s += p('M19.5 44.5L13 51', '') + l(19.5, 44.5, 13, 51, 'hl');
  s += (opts.pommel ?? 'round') === 'bell' ? p(bellD(11, 50.5, 6, 6), 's') : c(11.5, 52.5, 2.6, 'f') + c(11.5, 52.5, 2.6);
  return s;
}

/** Heater shield outline. */
const HEATER = 'M14 9H50V28C50 44 40 52 32 57C24 52 14 44 14 28Z';

/** Flask with liquid. */
function flask(liquidCls: string): string {
  return p('M27 7H37V11H27Z', 'f') + p('M27 7H37V11H27Z') +
    p('M28.5 11V19C17 23 13.5 32 15 42C16.5 53 47.5 53 49 42C50.5 32 47 23 35.5 19V11') +
    p('M16.5 33C24 30 40 36 47.5 33C49 38 49 41 48 44C46 52 18 52 16 44C15 41 15.5 36 16.5 33Z', liquidCls) +
    p('M25 36L28 40L26 45M38 35L36 40L39 44M31 38V47', 't hl') + p('M20 26C18.5 29 18 32 18.5 35', 't');
}

/** Four-point sparkle. */
const spark = (x: number, y: number, r: number) =>
  p(`M${x} ${y - r}L${x + r * 0.25} ${y - r * 0.25}L${x + r} ${y}L${x + r * 0.25} ${y + r * 0.25}L${x} ${y + r}L${x - r * 0.25} ${y + r * 0.25}L${x - r} ${y}L${x - r * 0.25} ${y - r * 0.25}Z`, 's');

/** Diamond ornament. */
const diamond = (x: number, y: number, r: number, cls = '') => p(`M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`, cls);

/** Hourglass (Hours currency). */
function hourglass(): string {
  return p('M18 8H46M18 56H46', '') + l(18, 8, 18, 12) + l(46, 8, 46, 12) + l(18, 56, 18, 52) + l(46, 56, 46, 52) +
    p('M21 11C21 24 29 28 31 32C29 36 21 40 21 53H43C43 40 35 36 33 32C35 28 43 24 43 11Z') +
    p('M25 19C27 24 30 27 32 29C34 27 37 24 39 19Z', 's') + p('M24 52C26 45 29 43 32 42C35 43 38 45 40 52Z', 'f') +
    l(32, 30, 32, 44, 't hl');
}

// ------------------------------------------------------------------ icon table

const ICONS: Record<string, () => string> = {
  // ---------------------------------------------------------------- weapons
  retainer_sword: () => sword(),
  commander_blade: () => sword({ tip: 55, width: 2.1, guard: 'curved', pommel: 'bell' }),
  parrying_dirk: () => g('translate(9 -9)', sword({ tip: 50, width: 2.2, guard: 'ring' })),
  oath_estoc: () => sword({ tip: 56, width: 1.1, guard: 'cup' }),
  skinning_knife: () =>
    p('M25 39C31 26 41 17 52 13C48 25 39 35 29 43Z', 'f') + p('M25 39C31 26 41 17 52 13C48 25 39 35 29 43Z') +
    l(28, 40, 45, 21, 't') + l(20, 38, 30, 48) + p('M24 44L13 55', '') + c(12, 56, 2),
  mourning_mace: () =>
    l(13, 53, 37, 29) + l(11, 55, 15, 51, 'hl') + c(43, 22, 7.5, 'f') + c(43, 22, 7.5) +
    [0, 60, 120, 180, 240, 300].map((a) => {
      const r = (a * Math.PI) / 180;
      return l(n(43 + Math.cos(r) * 7.5), n(22 + Math.sin(r) * 7.5), n(43 + Math.cos(r) * 11.5), n(22 + Math.sin(r) * 11.5));
    }).join('') +
    p('M31 35C26 36 23 41 22 47C25 44 27 43 30 43C28 40 29 37 31 35Z', 's'),
  hand_bell: () => l(32, 7, 32, 17) + c(32, 6, 2) + p('M28 17H36', '') + bell(32, 21, 26, 25),
  huntsman_bow: () =>
    p('M22 7C18 8 18 12 21 14C40 24 40 40 21 50C18 52 18 56 22 57') + l(21, 13, 21, 51, 't') +
    l(9, 32, 52, 32) + p('M52 32L46 29L47 32L46 35Z', 's') + p('M9 32L13 28M9 32L13 36M12 32L16 28M12 32L16 36', 't'),
  condemned_chain: () =>
    l(10, 55, 22, 43) + l(9, 56, 13, 52, 'hl') +
    `<ellipse cx="25.5" cy="38.5" rx="4" ry="2.4" transform="rotate(-45 25.5 38.5)"/>` +
    `<ellipse cx="30" cy="33" rx="2.4" ry="4" transform="rotate(-45 30 33)"/>` +
    `<ellipse cx="34.5" cy="28.5" rx="4" ry="2.4" transform="rotate(-45 34.5 28.5)"/>` +
    c(43, 19, 7, 'f') + c(43, 19, 7) +
    [20, 80, 140, 200, 260, 320].map((a) => {
      const r = (a * Math.PI) / 180;
      return p(`M${n(43 + Math.cos(r) * 7)} ${n(19 + Math.sin(r) * 7)}L${n(43 + Math.cos(r) * 11)} ${n(19 + Math.sin(r) * 11)}`);
    }).join(''),
  court_staff: () =>
    l(13, 55, 38, 26) + l(11, 57, 15, 53, 'hl') + c(44, 19, 8.5) + c(44, 19, 3, 'f') + c(44, 19, 3) +
    `<ellipse cx="44" cy="19" rx="12" ry="4" transform="rotate(-30 44 19)" class="t"/>` +
    l(44, 8, 44, 30, 't') + l(33, 19, 55, 19, 't') + spark(44, 19, 2.2),
  household_shield: () => p(HEATER, 'f') + p(HEATER) + p('M18 13H46V28C46 41 38 48 32 52C26 48 18 41 18 28Z', 't') + arms(23.5, 17, 0.45),
  // ---------------------------------------------------------------- consumables & tools
  recall_flask: () => flask('hlf'),
  flask_health: () => flask('hpf'),
  flask_focus: () => flask('fpf'),
  throwing_knife: () =>
    [-24, 0, 24].map((a) =>
      g(`rotate(${a} 32 54)`, p('M32 8L35.5 28L32 32L28.5 28Z', 'f') + p('M32 8L35.5 28L32 32L28.5 28Z') + l(32, 32, 32, 40) + c(32, 43, 3))).join(''),
  bellbronze_shard: () =>
    p('M21 17L37 9L47 24L42 46L27 53L17 36Z', 'f') + p('M21 17L37 9L47 24L42 46L27 53L17 36Z') +
    p('M37 9L32 27L42 46M32 27L17 36M32 27L27 53', 't') + spark(48, 12, 4) + spark(14, 50, 2.5),
  tempered_scrap: () =>
    p('M10 40L28 31L52 37L34 47Z', 'f') + p('M10 40L28 31L52 37L34 47ZM10 40V45L34 53V47M34 53L52 43V37') +
    p('M16 30L30 23L48 27L36 34', 't') + p('M20 38L26 36M32 40L40 38', 't hl'),
  bellbronze_scrap: () =>
    p('M10 44Q32 14 54 44L47 48Q32 26 17 48Z', 'f') + p('M10 44Q32 14 54 44L47 48Q32 26 17 48Z') +
    c(20, 38, 1.4, 's') + c(32, 31, 1.4, 's') + c(44, 38, 1.4, 's') + p('M28 22L31 27L29 31', 't hl'),
  refuge_key: () =>
    c(16, 32, 9) + c(16, 32, 4, 'f') + c(16, 32, 4) + l(25, 32, 55, 32) + p('M46 32V41H50V37H53V41H55V32') + diamond(16, 32, 1.5, 's'),
  warden_talisman: () =>
    p('M20 7L32 19L44 7', 't') + c(32, 36, 15, 'f') + c(32, 36, 15) + c(32, 36, 11.5, 't') +
    p('M26 46V31H38V46ZM26 31V27H29V29H32V27H35V29H38V27', '') + p('M30.5 46V40A1.5 1.5 0 0 1 33.5 40V46', 't'),
  // ---------------------------------------------------------------- spells
  glinting_shard: () =>
    p('M34 5L42 30L30 59L24 32Z', 'f') + p('M34 5L42 30L30 59L24 32Z') + l(34, 5, 30, 59, 't') + l(24, 32, 42, 30, 't') +
    spark(48, 14, 4) + spark(16, 18, 2.6) + spark(47, 48, 2.2),
  cinder_bolt: () =>
    p('M42 18C54 22 55 40 42 45C31 49 21 42 22 32C23 23 32 15 42 18Z', 'f') + p('M42 18C54 22 55 40 42 45C31 49 21 42 22 32C23 23 32 15 42 18Z') +
    p('M24 38C17 42 13 48 8 56M27 43C22 48 19 52 16 58M22 30C16 30 12 33 8 38', 't') +
    p('M40 24C46 27 47 36 41 39C36 41 31 37 33 31C34 28 37 26 40 28', 'hl') + c(12, 46, 1.2, 's') + c(20, 55, 1, 's'),
  stilling_chime: () =>
    bell(32, 16, 18, 22) + p('M14 22Q9 30 14 38M9 18Q2 30 9 42M50 22Q55 30 50 38M55 18Q62 30 55 42', 't'),
  ashen_veil: () =>
    p('M14 56C14 18 50 18 50 56', 'f') + p('M14 56C14 18 50 18 50 56') +
    p('M22 56C20 44 24 34 22 26M32 56C30 44 34 32 32 21M42 56C40 44 44 34 42 26', 't') + c(32, 14, 2, 's') + l(32, 8, 32, 12, 't'),
  // ---------------------------------------------------------------- techniques
  oathbound_lunge: () =>
    l(10, 32, 50, 32) + p('M50 30L57 32L50 34Z', 's') + l(20, 26, 20, 38) + l(10, 32, 15, 32, 'hl') +
    p('M26 24H44M30 40H46M34 18H42', 't'),
  bulwark_toll: () =>
    g('translate(-6 0)', p(HEATER, 'f') + p(HEATER)) + p('M48 20Q54 32 48 44M53 15Q61 32 53 49', 't hl') + diamond(26, 30, 4, 's'),
  bellglass_ward: () =>
    p('M32 6L54 19V45L32 58L10 45V19Z', 'f') + p('M32 6L54 19V45L32 58L10 45V19Z') + p('M32 14L47 23V41L32 50L17 41V23Z', 't') +
    bell(32, 24, 12, 14, 'f'),
  measured_cut: () =>
    p('M10 50Q28 40 52 12', '') + p('M18 56Q36 46 58 22', 'hl') + l(12, 48, 8, 58, 't') + spark(52, 12, 3),
  technique: () => sword() + spark(48, 44, 5),
  // ---------------------------------------------------------------- memories
  memory_corvane: () =>
    c(32, 32, 20, 'f') + c(32, 32, 20, 't') + l(32, 18, 32, 50) + p('M32 18H42V27L37 25L32 27', 'hl') + bell(32, 30, 12, 13) +
    p('M32 6V10M32 54V58M6 32H10M54 32H58', 't'),
  // ---------------------------------------------------------------- armour
  helm: () =>
    p('M17 50V27C17 13 47 13 47 27V50Z', 'f') + p('M17 50V27C17 13 47 13 47 27V50Z') + p('M21 30H43V34H21Z', 's') +
    l(32, 15, 32, 50, 't') + p('M24 40H26M24 44H26M38 40H40M38 44H40', 't'),
  hood: () =>
    p('M14 54C14 30 20 12 32 10C44 12 50 30 50 54L40 50C41 38 38 28 32 26C26 28 23 38 24 50Z', 'f') +
    p('M14 54C14 30 20 12 32 10C44 12 50 30 50 54L40 50C41 38 38 28 32 26C26 28 23 38 24 50Z'),
  cuirass: () =>
    p('M18 12L26 9H38L46 12L52 24L45 29V54H19V29L12 24Z', 'f') + p('M18 12L26 9H38L46 12L52 24L45 29V54H19V29L12 24Z') +
    p('M26 9Q32 16 38 9', 't') + l(32, 16, 32, 42, 't') + p('M19 42H45M19 46H45', 't') + diamond(32, 44, 2, 's'),
  robe: () =>
    p('M24 8H40L44 18L52 56H12L20 18Z', 'f') + p('M24 8H40L44 18L52 56H12L20 18Z') + p('M24 8L32 20L40 8', 't') +
    l(32, 20, 32, 56, 't') + p('M22 30H42', 't hl'),
  rags: () =>
    p('M20 8H44L48 30L44 38L47 48L40 44L36 56L30 48L24 55L21 44L15 46L18 32Z', 'f') +
    p('M20 8H44L48 30L44 38L47 48L40 44L36 56L30 48L24 55L21 44L15 46L18 32Z') + p('M24 18L30 26M38 20L34 30', 't'),
  gauntlet: () =>
    p('M22 56V40L18 30L21 17H25L27 28L28 12H32L33 27L35 13H39L39 28L42 17H45L46 32L42 40V56Z', 'f') +
    p('M22 56V40L18 30L21 17H25L27 28L28 12H32L33 27L35 13H39L39 28L42 17H45L46 32L42 40V56Z') + p('M22 44H42M22 48H42', 't'),
  greaves: () =>
    p('M17 8H29V40L31 52H13L15 40Z', 'f') + p('M17 8H29V40L31 52H13L15 40Z') + p('M35 8H47V40L51 52H33L35 40Z', 'f') +
    p('M35 8H47V40L51 52H33L35 40Z') + p('M17 22H29M35 22H47', 't') + c(23, 30, 2.4, 't') + c(41, 30, 2.4, 't'),
  // ---------------------------------------------------------------- attributes
  vigor: () =>
    p('M32 54C12 40 8 28 12 20C16 12 27 12 32 22C37 12 48 12 52 20C56 28 52 40 32 54Z', 'f') +
    p('M32 54C12 40 8 28 12 20C16 12 27 12 32 22C37 12 48 12 52 20C56 28 52 40 32 54Z') + p('M22 22C20 24 19 27 20 30', 't hl'),
  mind: () =>
    diamond(32, 32, 24, 't') + p('M32 12C38 22 42 28 42 36C42 44 37 50 32 50C27 50 22 44 22 36C22 28 26 22 32 12Z', 'fpf') +
    p('M32 12C38 22 42 28 42 36C42 44 37 50 32 50C27 50 22 44 22 36C22 28 26 22 32 12Z') + p('M32 30C35 34 36 38 34 43', 't'),
  endurance: () => p('M6 52L24 24L32 36L42 18L58 52Z', 'f') + p('M6 52L24 24L32 36L42 18L58 52Z') + p('M38 24L42 18L46 26', 't hl') + l(4, 56, 60, 56, 't'),
  strength: () =>
    l(32, 20, 32, 58) + p('M16 10H48V22H16Z', 'f') + p('M16 10H48V22H16Z') + p('M48 12L54 16L48 20', '') + l(22, 10, 22, 22, 't') +
    l(28, 58, 36, 58, 'hl'),
  dexterity: () =>
    l(10, 54, 52, 12) + p('M52 12L44 14L50 20Z', 's') +
    p('M10 54L8 46L16 50M14 50L12 42L20 46M18 46L16 38L24 42', 't'),
  intellect: () =>
    c(32, 32, 20) + c(32, 32, 13, 't') + c(32, 32, 4, 'f') + c(32, 32, 4) + l(32, 8, 32, 56, 't') + l(8, 32, 56, 32, 't') +
    `<ellipse cx="32" cy="32" rx="24" ry="8" transform="rotate(35 32 32)" class="t hl"/>` + spark(32, 32, 2),
  devotion: () =>
    bell(32, 20, 22, 24) + p('M32 5V11M17 10L20 15M47 10L44 15M10 22L15 24M54 22L49 24', 't hl'),
  // ---------------------------------------------------------------- derived stats
  stat_hp: () => ICONS.vigor(),
  stat_focus: () => p('M32 8C40 20 46 28 46 38C46 48 39 56 32 56C25 56 18 48 18 38C18 28 24 20 32 8Z', 'fpf') + p('M32 8C40 20 46 28 46 38C46 48 39 56 32 56C25 56 18 48 18 38C18 28 24 20 32 8Z'),
  stat_stamina: () =>
    p('M12 44C20 28 34 20 54 18C50 36 38 50 16 52Z', 'f') + p('M12 44C20 28 34 20 54 18C50 36 38 50 16 52Z') + p('M10 56L40 30', 't hl'),
  stat_load: () =>
    l(32, 8, 32, 54) + l(12, 16, 52, 16) + p('M22 54H42', '') + p('M12 16L6 34H18Z M52 16L46 34H58Z', 'f') + p('M12 16L6 34H18ZM52 16L46 34H58Z') + c(32, 8, 2, 's'),
  stat_poise: () => p('M14 54H50L44 44H20Z', 'f') + p('M14 54H50L44 44H20Z') + p('M20 44L26 22H38L44 44', '') + p('M22 22H42V14H22Z', 'f') + p('M22 22H42V14H22Z'),
  def_physical: () => p(HEATER, 'f') + p(HEATER) + p('M32 12V53M18 26H46', 't'),
  def_magic: () => p(HEATER, 'f') + p(HEATER) + diamond(32, 30, 9, 'fpf') + diamond(32, 30, 9) + spark(32, 30, 3),
  def_fire: () => p(HEATER, 'f') + p(HEATER) + p('M32 18C37 26 40 30 40 36C40 42 36 46 32 46C28 46 24 42 24 36C24 32 27 29 29 26C30 30 31 32 33 32C34 28 33 23 32 18Z', 'hl'),
  stat_attack: () => sword(),
  stat_spell: () => spark(32, 30, 20) + c(32, 30, 22, 't') + c(20, 52, 1.3, 's') + c(48, 50, 1.3, 's'),
  stat_iframes: () => p('M8 46Q24 20 44 22', 't') + p('M12 54Q28 32 50 30', '') + p('M50 30L44 25M50 30L45 36', '') + diamond(50, 14, 6, 'f') + diamond(50, 14, 6),
  level: () => diamond(32, 44, 8, 'f') + diamond(32, 44, 8) + diamond(32, 28, 6, 'f') + diamond(32, 28, 6) + diamond(32, 15, 4, 's'),
  hours: () => hourglass(),
  // ---------------------------------------------------------------- journal (Forememory)
  remembered: () =>
    p('M50 6C38 10 26 22 20 40L24 42C32 28 42 18 50 6Z', 'f') + p('M50 6C38 10 26 22 20 40L24 42C32 28 42 18 50 6Z') +
    p('M44 12L30 30', 't') + l(21, 41, 17, 50) + p(bellD(15, 49, 8, 8), 's') + p('M8 60H40', 't'),
  observed: () =>
    p('M6 32C14 20 23 15 32 15C41 15 50 20 58 32C50 44 41 49 32 49C23 49 14 44 6 32Z', 'f') +
    p('M6 32C14 20 23 15 32 15C41 15 50 20 58 32C50 44 41 49 32 49C23 49 14 44 6 32Z') + c(32, 32, 9) + c(32, 32, 3.5, 's') +
    c(35, 29, 1.2, 'hl'),
  confirmed: () => sealD(false),
  seal_broken: () => sealD(true),
  contradicted: () => diamond(32, 32, 20, 'f') + diamond(32, 32, 20) + p('M22 22L42 42M42 22L22 42', ''),
  lead_open: () => diamond(32, 32, 16) + diamond(32, 32, 6, 't'),
  lead_resolved: () => sealD(false),
  lead_lost: () => sealD(true),
  // ---------------------------------------------------------------- menu tabs & UI
  equipment: () => ICONS.helm(),
  inventory: () =>
    p('M16 24H48L52 56H12Z', 'f') + p('M16 24H48L52 56H12Z') + p('M22 24C22 12 42 12 42 24', '') + p('M12 32H52', 't') + diamond(32, 38, 3, 's'),
  status: () =>
    c(32, 14, 7) + p('M18 58V36C18 28 24 24 32 24C40 24 46 28 46 36V58', '') + p('M26 58V40M38 58V40', 't'),
  journal: () =>
    p('M8 14C18 10 26 12 32 16C38 12 46 10 56 14V52C46 48 38 50 32 54C26 50 18 48 8 52Z', 'f') +
    p('M8 14C18 10 26 12 32 16C38 12 46 10 56 14V52C46 48 38 50 32 54C26 50 18 48 8 52Z') + l(32, 16, 32, 54) +
    p('M14 22Q20 20 26 22M14 28Q20 26 26 28M38 22Q44 20 50 22M38 28Q44 26 50 28', 't'),
  practice: () =>
    l(12, 12, 50, 50) + l(52, 12, 14, 50) + l(10, 22, 22, 10, 'hl') + l(42, 10, 54, 22, 'hl') + c(10, 54, 2.5) + c(54, 54, 2.5),
  map: () =>
    p('M8 14L22 8L42 14L56 8V50L42 56L22 50L8 56Z', 'f') + p('M8 14L22 8L42 14L56 8V50L42 56L22 50L8 56Z') + l(22, 8, 22, 50, 't') +
    l(42, 14, 42, 56, 't') + p('M14 40C20 32 28 38 34 30C38 24 44 28 50 22', 't hl') + p('M46 38L50 42M50 38L46 42', 't'),
  settings: () =>
    c(32, 32, 9) + c(32, 32, 3, 's') +
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const r = (a * Math.PI) / 180;
      return l(n(32 + Math.cos(r) * 13), n(32 + Math.sin(r) * 13), n(32 + Math.cos(r) * 22), n(32 + Math.sin(r) * 22));
    }).join('') + c(32, 32, 17, 't'),
  graphics: () =>
    p('M8 12H56V46H8Z', 'f') + p('M8 12H56V46H8Z') + p('M8 40L22 26L32 36L40 28L56 42', '') + c(44, 20, 3, 'hl') + l(24, 54, 40, 54),
  audio: () => bell(26, 14, 22, 26) + p('M44 22Q49 30 44 38M49 17Q57 30 49 43', 't'),
  gameplay: () => g('translate(-4 2) scale(0.9)', sword()) + g('translate(28 26) scale(0.5)', p(HEATER, 'f') + p(HEATER)),
  accessibility: () =>
    c(32, 12, 5) + p('M14 22L32 26L50 22M32 26V40L22 56M32 40L42 56', '') + c(32, 12, 1.5, 's'),
  controls: () =>
    p('M14 22H50C56 22 60 30 60 40C60 48 56 52 52 52C46 52 44 44 40 44H24C20 44 18 52 12 52C8 52 4 48 4 40C4 30 8 22 14 22Z', 'f') +
    p('M14 22H50C56 22 60 30 60 40C60 48 56 52 52 52C46 52 44 44 40 44H24C20 44 18 52 12 52C8 52 4 48 4 40C4 30 8 22 14 22Z') +
    p('M16 28V38M11 33H21', '') + c(46, 29, 2, 's') + c(51, 34, 2, 's') + c(41, 34, 2, 's') + c(46, 39, 2, 's'),
  resume: () => diamond(32, 32, 20, 't') + p('M26 20L44 32L26 44Z', 'f') + p('M26 20L44 32L26 44Z'),
  quit: () =>
    p('M16 56V16C16 8 48 8 48 16V56', '') + p('M16 56H48', '') + p('M22 56V20C22 14 42 14 42 20V56', 'f') + c(37, 38, 1.8, 's'),
  stillbell: () =>
    p('M10 58V18C10 10 54 10 54 18V58', '') + p('M6 58H58', '') + p('M16 58V20C16 15 48 15 48 20V58', 't') + bell(32, 22, 18, 22),
  travel: () =>
    p('M18 58C24 44 40 42 36 30C33 22 22 22 28 12', 't') + c(18, 58, 1.2, 's') + c(28, 12, 3, 'hl') +
    p('M44 58V36H52L56 40L52 44H44', '') + p('M10 22V14H18L20 17L18 20H10', ''),
  attune: () =>
    p('M8 18C18 14 26 16 32 20C38 16 46 14 56 18V50C46 46 38 48 32 52C26 48 18 46 8 50Z', 'f') +
    p('M8 18C18 14 26 16 32 20C38 16 46 14 56 18V50C46 46 38 48 32 52C26 48 18 46 8 50Z') + l(32, 20, 32, 52) + spark(20, 32, 6) + spark(44, 32, 6),
  techniques: () => ICONS.technique(),
  memories: () => ICONS.memory_corvane(),
  flask: () => flask('hlf'),
  smith: () =>
    p('M8 26H46C46 32 40 36 34 36V44H42V50H14V44H22V36C14 36 10 32 8 26Z', 'f') +
    p('M8 26H46C46 32 40 36 34 36V44H42V50H14V44H22V36C14 36 10 32 8 26Z') + l(40, 20, 56, 6) + p('M50 4L58 12L54 16L46 8Z', 's') +
    spark(26, 16, 3),
  shop: () =>
    c(22, 40, 12, 'f') + c(22, 40, 12) + c(22, 40, 8, 't') + c(40, 26, 12, 'f') + c(40, 26, 12) + c(40, 26, 8, 't') + diamond(40, 26, 3, 's'),
  credits: () =>
    p('M14 8H44L50 14V56H14Z', 'f') + p('M14 8H44L50 14V56H14Z') + p('M44 8V14H50', 't') + p('M20 22H44M20 28H44M20 34H38M20 40H42', 't') + spark(40, 48, 4),
  newgame: () => bell(32, 12, 24, 28) + p('M32 50V60M27 55H37', 'hl'),
  continue: () => p('M18 16L38 32L18 48', '') + p('M30 16L50 32L30 48', 'hl'),
  leave: () => p('M26 10H12V54H26', '') + l(22, 32, 54, 32) + p('M44 22L54 32L44 42', ''),
  rest: () => ICONS.stillbell(),
  // ---------------------------------------------------------------- statuses
  burn: () => p('M32 6C38 18 48 24 48 38C48 48 41 56 32 56C23 56 16 48 16 38C16 30 22 24 24 18C26 24 28 28 32 28C34 22 34 14 32 6Z', 'f') + p('M32 6C38 18 48 24 48 38C48 48 41 56 32 56C23 56 16 48 16 38C16 30 22 24 24 18C26 24 28 28 32 28C34 22 34 14 32 6Z') + p('M32 40C36 42 37 48 32 50C28 48 28 44 32 40Z', 's'),
  bleed: () => p('M32 6C40 20 46 30 46 40C46 50 40 56 32 56C24 56 18 50 18 40C18 30 24 20 32 6Z', 'hpf') + p('M32 6C40 20 46 30 46 40C46 50 40 56 32 56C24 56 18 50 18 40C18 30 24 20 32 6Z'),
  ward: () => ICONS.bellglass_ward(),
  veil: () => ICONS.ashen_veil(),
  regen: () => ICONS.stat_stamina(),
  stamina_regen: () => ICONS.stat_stamina(),
  heal: () => ICONS.stilling_chime(),
  last_breath: () => p('M32 56C20 48 18 36 26 26C30 20 28 12 32 8C36 14 44 22 44 34C44 44 40 50 32 56Z', 'f') + p('M32 56C20 48 18 36 26 26C30 20 28 12 32 8C36 14 44 22 44 34C44 44 40 50 32 56Z') + hourglass().replace(/<path/g, '<path transform="translate(22 26) scale(.3)"'),
  // ---------------------------------------------------------------- heraldry & origins
  arms_royal: () => arms(12, 5, 1),
  crown: () => p('M8 50L4 14L20 30L32 8L44 30L60 14L56 50Z', 's') + p('M8 56H56', ''),
  arms_household: () =>
    p('M8 58L12 50V22H6L8 18H56L58 22H52V50L56 58H44V36C44 26 20 26 20 36V58Z', 's') + p('M22 6L25 16H39L42 6L37 11L32 4L27 11Z', 's') +
    p(bellD(32, 34, 14, 15), 's') + c(32, 52, 2, 's'),
  arms_army: () =>
    p('M6 56V14H10V10H14V14H18V10H22V14H26V24H38V14H42V10H46V14H50V10H54V14H58V56H42V34C42 28 22 28 22 34V56Z', 's') +
    p('M32 30L34 36V48L32 52L30 48V36Z', 's') + l(28, 45, 36, 45),
  arms_academy: () => p('M32 4L60 32L32 60L4 32Z', 's') + p('M32 12L52 32L32 52L12 32Z', 'cut') + p('M32 14C36 24 36 40 32 50C28 40 28 24 32 14Z', 's'),
  arms_cathedral: () =>
    p('M4 12H60V16H56V58H44V30C44 20 32 14 32 14C32 14 20 20 20 30V58H8V16H4Z', 's') + p(bellD(32, 32, 16, 17), 's') + c(32, 29, 2, 's') + c(32, 53, 2, 's'),
  arms_treasury: () =>
    p('M8 8H56V56H8Z', 's') + p('M14 14H50V50H14Z', 'cut') + p('M32 22A6 6 0 0 1 36 32L39 46H25L28 32A6 6 0 0 1 32 22Z', 's'),
  origin_householdKnight: () =>
    l(32, 6, 32, 58) + l(14, 22, 50, 22) + p('M28 58H36', '') + c(22, 12, 1.8, 's') + c(42, 12, 1.8, 's') + c(22, 32, 1.8, 's') + c(42, 32, 1.8, 's') + diamond(32, 22, 3, 's'),
  origin_courtMage: () =>
    c(32, 32, 16) + c(32, 32, 10, 't') + c(32, 32, 3, 's') + l(32, 4, 32, 60, 't') + l(4, 32, 60, 32, 't') +
    p('M32 4L34 12H30Z M32 60L34 52H30Z M4 32L12 30V34Z M60 32L52 30V34Z', 's') + l(20, 20, 44, 44, 't') + l(44, 20, 20, 44, 't'),
  origin_oathblade: () =>
    p('M30 8L32 4L34 8V40H30Z', 'f') + p('M30 8L32 4L34 8V40H30Z') + l(20, 40, 44, 40) + l(32, 40, 32, 54) + c(32, 57, 2.5) + c(20, 40, 1.5, 's') + c(44, 40, 1.5, 's'),
  origin_funeralPriest: () => bell(32, 12, 30, 34, 's') + l(32, 4, 32, 9),
  origin_royalHuntsman: () =>
    p('M32 58C28 50 26 44 26 38M32 58C36 50 38 44 38 38', '') + p('M26 38C20 30 14 26 10 12M26 38C22 30 22 22 24 14M18 28L8 24M14 20L6 12', '') +
    p('M38 38C44 30 50 26 54 12M38 38C42 30 42 22 40 14M46 28L56 24M50 20L58 12', '') + c(32, 44, 3, 's'),
  origin_condemnedRetainer: () =>
    c(32, 32, 14) + c(32, 32, 9, 't') +
    Array.from({ length: 12 }, (_, i) => {
      const r = (i / 12) * Math.PI * 2;
      return p(`M${n(32 + Math.cos(r) * 14)} ${n(32 + Math.sin(r) * 14)}L${n(32 + Math.cos(r + 0.13) * 22)} ${n(32 + Math.sin(r + 0.13) * 22)}L${n(32 + Math.cos(r + 0.26) * 14)} ${n(32 + Math.sin(r + 0.26) * 14)}`);
    }).join(''),
  // ---------------------------------------------------------------- expanded arsenal
  bellwarden_greatsword: () => sword({ tip: 58, width: 3.2, guard: 'bar', pommel: 'bell' }) + l(25, 36, 48, 13, 't hl'),
  greyford_sabre: () =>
    p('M23 43C34 36 46 24 54 9C51 25 40 37 26 46Z', 'f') + p('M23 43C34 36 46 24 54 9C51 25 40 37 26 46Z') +
    p('M18 38C12 44 12 50 16 53L20 49', '') + l(16, 36, 28, 48) + p('M21 46L13 54', '') + c(12, 55, 2),
  garrison_spear: () =>
    l(8, 57, 44, 21) + l(6, 59, 10, 55, 'hl') + p('M43 21Q46 11 57 7Q53 18 43 21Z', 'f') + p('M43 21Q46 11 57 7Q53 18 43 21Z') +
    l(46, 18, 54, 10, 't') + p('M39 23L42 26M41 21L44 24', ''),
  gatewarden_halberd: () =>
    l(10, 58, 50, 18) + l(50, 18, 57, 9) + p('M38 30L29 25C27 16 32 11 38 12L46 22Z', 'f') + p('M38 30L29 25C27 16 32 11 38 12L46 22') +
    p('M44 24L52 30L49 22', '') + l(8, 60, 12, 56, 'hl'),
  coinbreaker_hammer: () =>
    l(12, 56, 36, 32) + l(10, 58, 14, 54, 'hl') + g('rotate(-45 40 26)', p('M28 19H52V33H28Z', 'f') + p('M28 19H52V33H28Z') + p('M52 21H56V31H52Z', 's')) +
    c(20, 20, 5, 't') + c(20, 20, 2, 's'),
  woodsman_axe: () =>
    l(14, 58, 40, 20) + l(12, 60, 16, 56, 'hl') + p('M36 26C30 20 30 12 36 6C42 12 50 16 56 16C52 24 44 30 36 26Z', 'f') +
    p('M36 26C30 20 30 12 36 6C42 12 50 16 56 16C52 24 44 30 36 26Z') + p('M38 10C42 14 48 16 52 17', 't'),
  garrison_arbalest: () =>
    p('M8 28Q32 12 56 28', '') + p('M8 28L32 36L56 28', 't') + p('M29 20H35V56H29Z', 'f') + p('M29 20H35V56H29Z') +
    l(32, 10, 32, 36, 'hl') + p('M32 8L35 14H29Z', 's') + p('M35 44H40V50H35', ''),
  iron_bolt: () =>
    [22, 32, 42].map((x) => l(x, 54, x, 18) + p(`M${x - 3} 18H${x + 3}V12L${x} 8L${x - 3} 12Z`, 's') + p(`M${x - 3} 54V48L${x} 50L${x + 3} 48V54`, 't')).join(''),
  pilgrim_censer: () =>
    p('M32 4V16M24 16L32 4L40 16', 't') + p('M20 22H44V26C44 36 38 42 32 42C26 42 20 36 20 26Z', 'f') +
    p('M20 22H44V26C44 36 38 42 32 42C26 42 20 36 20 26Z') + p('M22 22Q32 12 42 22', '') + c(27, 30, 1.2, 's') + c(32, 32, 1.2, 's') +
    c(37, 30, 1.2, 's') + p('M28 46Q24 50 28 54Q32 58 28 62M36 46Q40 50 36 54', 't hl'),
  mint_seal_staff: () =>
    l(12, 57, 36, 30) + l(10, 59, 14, 55, 'hl') + c(43, 21, 11, 'f') + c(43, 21, 11) + c(43, 21, 7.5, 't') +
    p('M43 15A3 3 0 0 1 45 20L46.5 27H39.5L41 20A3 3 0 0 1 43 15Z', 's'),
  mint_buckler: () =>
    c(32, 32, 22, 'f') + c(32, 32, 22) + c(32, 32, 18, 't') + c(32, 32, 7, 'f') + c(32, 32, 7) +
    Array.from({ length: 8 }, (_, i) => { const r = (i / 8) * Math.PI * 2; return c(n(32 + Math.cos(r) * 14), n(32 + Math.sin(r) * 14), 1.2, 's'); }).join(''),
  greyford_tower_shield: () =>
    p('M14 14Q32 4 50 14V50Q32 60 14 50Z', 'f') + p('M14 14Q32 4 50 14V50Q32 60 14 50Z') + p('M18 17Q32 9 46 17V47Q32 55 18 47Z', 't') +
    p('M18 34Q25 29 32 34Q39 39 46 34M18 40Q25 35 32 40Q39 45 46 40', 'hl'),
  pilgrim_roundshield: () =>
    c(32, 32, 23, 'f') + c(32, 32, 23) + c(32, 32, 19, 't') + p('M22 48V30C22 22 32 17 32 17C32 17 42 22 42 30V48', '') + p(bellD(32, 29, 10, 11), 's'),
  // spells
  shard_volley: () =>
    [-22, 0, 22].map((a) => g(`rotate(${a} 32 58)`, p('M32 6L36 26L32 34L28 26Z', 'f') + p('M32 6L36 26L32 34L28 26Z') + l(32, 6, 32, 34, 't'))).join('') +
    spark(52, 44, 3) + spark(12, 44, 2.4),
  bellglass_lance: () =>
    p('M8 56L46 18L58 6L50 22L12 60Z', 'f') + p('M8 56L46 18L58 6L50 22L12 60Z') + l(10, 58, 54, 14, 't') + spark(50, 42, 4) + spark(22, 20, 3),
  falling_hour: () =>
    g('translate(16 22) scale(0.5)', hourglass()) + p('M16 4V16M24 2V12M40 2V12M48 4V16', 't hl') + p('M12 58H52', 't') + p('M20 54L16 58L20 62M44 54L48 58L44 62', 't'),
  knell_of_rest: () =>
    bell(32, 12, 26, 28) + p('M14 54Q32 62 50 54', 't') + p('M24 26Q28 28 32 26M34 26Q38 28 42 26', 't hl'),
  ember_blessing: () =>
    sword() + p('M44 36C48 30 54 30 54 24C58 30 58 38 52 42C48 45 44 42 44 36Z', 'hl') + c(40, 28, 1.2, 's') + c(48, 18, 1, 's'),
  vigil_of_ash: () =>
    p('M24 30H40V56H24Z', 'f') + p('M24 30H40V56H24Z') + l(32, 22, 32, 30) + p('M32 6C36 12 38 16 38 20C38 24 35 26 32 26C29 26 26 24 26 20C26 16 28 12 32 6Z', 'hl') +
    p('M18 58H46', '') + p('M24 36C27 38 27 42 24 44', 't'),
  toll_of_warding: () =>
    c(32, 34, 24, 't') + c(32, 34, 18, 't hl') + bell(32, 20, 18, 22),
  // techniques
  riposte_stance: () =>
    l(10, 54, 44, 20) + l(54, 54, 20, 20) + spark(32, 32, 7) + c(32, 32, 12, 't'),
  bell_breaker: () =>
    bell(38, 22, 24, 26) + p('M38 30L34 38L40 42L36 50', 'hl') + g('rotate(-30 16 16)', p('M6 10H26V20H6Z', 's') + l(16, 20, 16, 38)),
  rending_sweep: () =>
    p('M8 42Q32 8 56 42', '') + p('M12 50Q32 20 52 50', 'hl') + p('M56 42L52 34M56 42L48 42', '') + spark(32, 52, 3),
  greyford_flourish: () =>
    p('M32 32C40 28 44 36 38 42C30 48 20 40 22 30C24 18 40 14 48 22C56 30 52 46 40 52', 'hl') + g('translate(-6 -2) scale(0.6)', ICONS.greyford_sabre()),
  knell_strike: () => bell(20, 10, 16, 18) + p('M36 8L52 40', '') + p('M52 40L46 38M52 40L54 34', '') + p('M8 56H56', 't') + p('M44 50L48 56L52 50', 't hl'),
  chain_whirl: () =>
    c(32, 32, 20, 't') + `<ellipse cx="32" cy="12" rx="3.2" ry="2" />` + `<ellipse cx="46" cy="18" rx="2" ry="3.2" transform="rotate(-45 46 18)"/>` +
    c(50, 34, 6, 'f') + c(50, 34, 6) + p('M12 44L32 32', '') + p('M22 20Q16 26 16 34', 't hl'),
  pinning_shot: () => l(8, 16, 44, 46) + p('M44 46L36 44L42 38Z', 's') + p('M8 16L6 22M8 16L14 18', 't') + p('M30 52H58', '') + p('M40 48L44 52L48 48', 't hl'),
  impaling_charge: () =>
    l(6, 32, 50, 32) + p('M50 28L60 32L50 36Z', 's') + p('M14 22H36M10 42H32M20 16H34M18 48H30', 't hl'),
  ember_edge: () => ICONS.ember_blessing(),
  vow_parry: () =>
    g('translate(9 -9)', sword({ tip: 50, width: 2.2, guard: 'ring' })) + diamond(20, 20, 8, 'f') + diamond(20, 20, 8, 'hl') + spark(20, 20, 3),
  imprint_scroll: () =>
    p('M14 12H46V52H14Z', 'f') + p('M14 12H46V52H14Z') + p('M10 12A4 4 0 0 1 18 12M42 52A4 4 0 0 0 50 52', '') +
    p('M20 22H40M20 28H40M20 34H32', 't') + c(40, 44, 7, 'hlf') + c(40, 44, 7) + diamond(40, 44, 3, 's'),
  kind_imprint: () => ICONS.imprint_scroll(),
  vow_pursuit: () => g('translate(-2 4) scale(0.85)', ICONS.oath_estoc()) + p('M40 40L54 40M44 46L56 46M36 34L50 34', 't hl'),
  stilled_breath: () => ICONS.huntsman_bow() + p('M46 14Q52 18 50 24M50 10Q58 16 55 26', 't hl'),
  ember_resin: () =>
    p('M22 20H42L46 26V52C46 55 18 55 18 52V26Z', 'f') + p('M22 20H42L46 26V52C46 55 18 55 18 52V26Z') + p('M24 14H40V20H24Z') +
    p('M32 30C36 36 38 38 38 42C38 46 35 48 32 48C29 48 26 46 26 42C26 39 28 37 29 35C30 38 31 39 33 39C34 36 33 33 32 30Z', 'hl'),
  bone_arrow: () => ICONS.kind_ammo(),
  // ---------------------------------------------------------------- small UI glyphs
  warning: () => p('M32 6L60 56H4Z', 'f') + p('M32 6L60 56H4Z') + p('M32 22V40', '') + c(32, 47, 2, 's'),
  lock: () => p('M20 28V20C20 8 44 8 44 20V28', '') + p('M14 28H50V56H14Z', 'f') + p('M14 28H50V56H14Z') + c(32, 40, 3, 's') + l(32, 42, 32, 49),
  check: () => p('M10 34L26 48L54 16', ''),
  close: () => p('M14 14L50 50M50 14L14 50', ''),
  diamond: () => diamond(32, 32, 18, 'f') + diamond(32, 32, 18),
  arrow_up: () => p('M32 10L52 40H40V54H24V40H12Z', 'f') + p('M32 10L52 40H40V54H24V40H12Z'),
  arrow_down: () => p('M32 54L52 24H40V10H24V24H12Z', 'f') + p('M32 54L52 24H40V10H24V24H12Z'),
  // ---------------------------------------------------------------- kind fallbacks
  kind_weapon: () => sword(),
  kind_shield: () => p(HEATER, 'f') + p(HEATER) + p('M18 13H46V28C46 41 38 48 32 52C26 48 18 41 18 28Z', 't') + diamond(32, 28, 5, 's'),
  kind_catalyst: () => ICONS.court_staff(),
  kind_bow: () => ICONS.huntsman_bow(),
  kind_armor: () => ICONS.cuirass(),
  kind_talisman: () => p('M20 7L32 19L44 7', 't') + c(32, 36, 15, 'f') + c(32, 36, 15) + diamond(32, 36, 7, 's'),
  kind_consumable: () =>
    p('M26 8H38V14H26Z', '') + p('M28 14V22C20 26 18 34 20 44C22 54 42 54 44 44C46 34 44 26 36 22V14') + p('M21 36H43C44 40 43 44 42 46C38 52 26 52 22 46C21 44 20 40 21 36Z', 'hlf'),
  kind_material: () => ICONS.tempered_scrap(),
  kind_key: () => ICONS.refuge_key(),
  kind_spellbook: () =>
    p('M14 8H48V56H14Z', 'f') + p('M14 8H48V56H14Z') + p('M18 8V56', 't') + diamond(33, 30, 9, 't') + spark(33, 30, 5) + p('M48 12H52V52H48', 't'),
  kind_memory: () => ICONS.memory_corvane(),
  kind_ammo: () =>
    [22, 32, 42].map((x) => l(x, 54, x, 14) + p(`M${x} 8L${x + 3} 16H${x - 3}Z`, 's') + p(`M${x - 3} 54L${x} 48L${x + 3} 54`, 't')).join(''),
  generic: () => diamond(32, 32, 18, 'f') + diamond(32, 32, 18) + diamond(32, 32, 6, 's'),
};

/** Seal with a bell (confirmed change) — optionally broken in two for a loss. */
function sealD(broken: boolean): string {
  const scallop = Array.from({ length: 16 }, (_, i) => {
    const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 0.5) / 16) * Math.PI * 2;
    return `${i === 0 ? 'M' : 'L'}${n(32 + Math.cos(a0) * 22)} ${n(32 + Math.sin(a0) * 22)}L${n(32 + Math.cos(a1) * 19)} ${n(32 + Math.sin(a1) * 19)}`;
  }).join('') + 'Z';
  const whole = p(scallop, 'f') + p(scallop) + c(32, 32, 14, 't') + bell(32, 22, 14, 15, 's');
  if (!broken) return whole;
  // Two halves pulled apart along a jagged crack.
  const clipL = `<clipPath id="sbL"><path d="M0 0H33L29 18L35 30L28 42L33 64H0Z"/></clipPath>`;
  const clipR = `<clipPath id="sbR"><path d="M64 0H33L29 18L35 30L28 42L33 64H64Z"/></clipPath>`;
  return `<defs>${clipL}${clipR}</defs>` +
    `<g clip-path="url(#sbL)" transform="translate(-3 1) rotate(-6 32 32)">${whole}</g>` +
    `<g clip-path="url(#sbR)" transform="translate(3 -1) rotate(6 32 32)">${whole}</g>` +
    p('M33 4L29 18L35 30L28 42L33 60', 't hl');
}

// ------------------------------------------------------------------ lookup

/** Explicit aliases for ids used by other modules. */
const ALIASES: Record<string, string> = {
  hospice_stillbell: 'stillbell', stillbell_icon: 'stillbell', flask_health: 'flask_health', recall_flask_focus: 'flask_focus',
  household_knight: 'origin_householdKnight',
  court_mage: 'origin_courtMage', measured_cut_memory: 'measured_cut', hp: 'stat_hp', focus: 'stat_focus', stamina: 'stat_stamina',
  load: 'stat_load', poise: 'stat_poise', attack: 'stat_attack', spellpower: 'stat_spell', iframes: 'stat_iframes',
  physical: 'def_physical', magic: 'def_magic', fire: 'def_fire', key: 'kind_key', burning: 'burn', warded: 'ward',
};

/** Keyword heuristics for ids we have not drawn explicitly (e.g. new armour pieces). */
const KEYWORDS: [RegExp, string][] = [
  [/^(grimoire|prayer|psalter|tome)_/, 'kind_spellbook'], [/^imprint_|scroll/, 'imprint_scroll'], [/greatsword|claymore/, 'bellwarden_greatsword'], [/sabre|saber|scimitar/, 'greyford_sabre'],
  [/halberd|glaive|poleaxe/, 'gatewarden_halberd'], [/spear|pike|lance$/, 'garrison_spear'], [/axe/, 'woodsman_axe'],
  [/arbalest|crossbow/, 'garrison_arbalest'], [/censer|thurible/, 'pilgrim_censer'], [/tower_shield|pavise/, 'greyford_tower_shield'],
  [/buckler/, 'mint_buckler'], [/roundshield/, 'pilgrim_roundshield'],
  [/helm|hat|crown_of|visor|coif/, 'helm'], [/hood|cowl/, 'hood'], [/robe|vestment|cassock/, 'robe'], [/rag|tatter/, 'rags'],
  [/harness|armou?r|cuirass|coat|jerkin|mail|plate|body|tabard/, 'cuirass'], [/gauntlet|glove|bracer|arms$|vambrace/, 'gauntlet'],
  [/greave|boot|leg|trouser|sabaton/, 'greaves'], [/shield|buckler/, 'kind_shield'], [/staff|wand|rod/, 'court_staff'],
  [/bell/, 'hand_bell'], [/bow/, 'huntsman_bow'], [/dirk|dagger|knife/, 'parrying_dirk'], [/estoc|rapier/, 'oath_estoc'],
  [/mace|hammer/, 'mourning_mace'], [/flail|chain/, 'condemned_chain'], [/sword|blade/, 'retainer_sword'], [/flask/, 'recall_flask'],
  [/shard/, 'bellbronze_shard'], [/scrap|ingot|ore/, 'tempered_scrap'], [/key/, 'refuge_key'], [/talisman|amulet|ring|charm/, 'kind_talisman'],
  [/memory/, 'memory_corvane'], [/grimoire|tome|book|scroll/, 'kind_spellbook'], [/arrow|bolt_ammo/, 'kind_ammo'],
  [/fire|burn|cinder|ember/, 'burn'], [/heal|chime/, 'stilling_chime'], [/ward|guard/, 'bellglass_ward'],
];

const cache = new Map<string, string>();

/**
 * SVG markup for an icon id. `kind` (ItemKind or a domain like 'status') supplies the fallback.
 * `extraClass` is added to the `<svg>` element.
 */
export function icon(id: string | null | undefined, kind?: string | null, extraClass = ''): string {
  const key = `${id ?? ''}|${kind ?? ''}|${extraClass}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let name = id ?? '';
  if (ALIASES[name]) name = ALIASES[name];
  if (!ICONS[name]) {
    const kw = KEYWORDS.find(([re]) => re.test(name));
    if (kw && kind !== 'status') name = kw[1];
    else if (kind && ICONS[`kind_${kind}`]) name = `kind_${kind}`;
    else if (kw) name = kw[1];
    else name = 'generic';
  }
  const svg = `<svg class="ic${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${ICONS[name]!()}</svg>`;
  cache.set(key, svg);
  return svg;
}

/** Fallback icon per weapon class when an item id has no drawing of its own. */
const CLASS_ICONS: Record<string, string> = {
  straightSword: 'retainer_sword', curvedSword: 'greyford_sabre', greatsword: 'bellwarden_greatsword', dagger: 'parrying_dirk',
  estoc: 'oath_estoc', axe: 'woodsman_axe', mace: 'mourning_mace', hammer: 'coinbreaker_hammer', flail: 'condemned_chain',
  spear: 'garrison_spear', halberd: 'gatewarden_halberd', staff: 'court_staff', bell: 'hand_bell', censer: 'pilgrim_censer',
  bow: 'huntsman_bow', crossbow: 'garrison_arbalest', fist: 'gauntlet',
};
const ARMOR_ICONS: Record<string, string> = { head: 'helm', body: 'cuirass', arms: 'gauntlet', legs: 'greaves' };

/** Minimal shape of an item definition needed to pick its icon. */
interface IconItem { id: string; icon: string; kind: string; weapon?: { class: string }; armor?: { slot: string } }

/**
 * Icon for an item definition: its own drawing if one exists, else a shape chosen from its
 * armour slot (hood/robe/rags keywords respected) or weapon class, else the ItemKind fallback.
 */
export function itemIcon(def: IconItem, extraClass = ''): string {
  const id = hasIcon(def.icon) ? def.icon : hasIcon(def.id) ? def.id : null;
  if (id) return icon(id, def.kind, extraClass);
  if (def.armor) {
    const kw = /hood|cowl/.test(def.id) ? 'hood' : /robe|vestment/.test(def.id) ? 'robe' : /rag/.test(def.id) ? 'rags' : null;
    return icon(kw ?? ARMOR_ICONS[def.armor.slot] ?? 'kind_armor', 'armor', extraClass);
  }
  if (def.weapon && CLASS_ICONS[def.weapon.class]) return icon(CLASS_ICONS[def.weapon.class], def.kind, extraClass);
  return icon(def.icon || def.id, def.kind, extraClass);
}

/** Whether an icon is explicitly drawn (not a fallback). */
export function hasIcon(id: string): boolean {
  return !!ICONS[ALIASES[id] ?? id];
}

/** All explicitly drawn icon ids (used by the preview sheet). */
export function iconIds(): string[] {
  return Object.keys(ICONS);
}
