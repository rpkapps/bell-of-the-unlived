/**
 * Tiny DOM helpers for the UI overlay. No framework: screens build their DOM with `h()` and
 * rebuild it only when their data changes. The HUD caches elements and writes styles directly.
 */

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

/**
 * Create an element. `tag` may carry classes: `h('div.panel.frame')`.
 * Attributes starting with `on` and a function value become event listeners; `html` sets innerHTML
 * (used for trusted, procedurally generated SVG icons only); `style` takes a CSS string.
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K | `${K}.${string}`, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K];
export function h(tag: string, attrs?: Attrs | null, ...children: Child[]): HTMLElement;
export function h(tag: string, attrs?: Attrs | null, ...children: Child[]): HTMLElement {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'html') el.innerHTML = String(v);
      else if (k === 'class') el.className += (el.className ? ' ' : '') + String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

/** Append children (flattened, skipping falsy). */
export function append(el: HTMLElement, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

/** Remove all children. */
export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Replace the children of `el`. */
export function setChildren(el: HTMLElement, ...children: Child[]): void {
  clear(el);
  append(el, children);
}

/** Escape text for innerHTML templates. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** Format a play time in seconds as "12h 04m" / "4m 12s". */
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  if (hh > 0) return `${hh}h ${String(mm).padStart(2, '0')}m`;
  return `${mm}m ${String(s % 60).padStart(2, '0')}s`;
}

/** Thousands separators for Hours ("12,480"). */
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Roman numerals for small numbers (phases, upgrade tiers in titles). */
export function roman(n: number): string {
  const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let v = Math.max(0, Math.floor(n));
  for (const [k, r] of map) while (v >= k) { out += r; v -= k; }
  return out || '0';
}

/** Deep clone of plain JSON data (settings). */
export function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
