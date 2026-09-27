/**
 * Forememory journal (GDD §6) on parchment pages.
 *
 *  - Leads: each lead shows three always-separate sections — Remembered (sepia, handwritten-feel
 *    italic, bell-ink quill), Observed now (plain, ruled, eye) and Confirmed change (bronze frame,
 *    seal; losses get a broken seal and a LOSS tag). A contradicted memory is never removed: it
 *    stays in place with an inline "Contradicted: …" note.
 *  - Practice: the practice-yard plaques (host.practiceTopics()) with live input glyphs.
 *  - Map: a sketched map of Ashbridge with lit/unlit Stillbells.
 */
import type { JournalEntry, JournalLead } from '../../game/types';
import { formatActions } from '../../content/text';
import type { PracticeTopic } from '../contract';
import { h, fmtTime } from '../dom';
import { icon } from '../icons';
import { navItem } from '../nav';
import { cycle, Screen, tabBar, type UICtx } from '../screen';

type Tab = 'leads' | 'practice' | 'map';
const TABS: Tab[] = ['leads', 'practice', 'map'];
const STATUS_LABEL: Record<JournalLead['status'], string> = { open: 'Open lead', resolved: 'Resolved', lost: 'Lost' };
const STATUS_ICON: Record<JournalLead['status'], string> = { open: 'lead_open', resolved: 'lead_resolved', lost: 'lead_lost' };

export class JournalScreen extends Screen {
  private left = h('div.page.left');
  private right = h('div.page.right');
  private leads: JournalLead[] = [];
  private topics: PracticeTopic[] = [];
  private shownLead = '';

  constructor(ctx: UICtx, private tab: Tab, private focusTopic?: string) {
    super(ctx, 'journal-screen');
  }

  render(): void {
    this.left = h('div.page.left');
    this.right = h('div.page.right');
    if (this.tab === 'leads') this.renderLeads();
    else if (this.tab === 'practice') this.renderPractice();
    else this.renderMap();
    this.el.replaceChildren(
      h('div.scr-head', null, h('div.scr-title', null, 'Forememory'),
        h('div.scr-sub', null, 'What I remember. What I see. What I have changed.')),
      tabBar(this.ctx, [{ id: 'leads', label: 'Leads', icon: 'remembered' }, { id: 'practice', label: 'Practice', icon: 'practice' }, { id: 'map', label: 'Ashbridge', icon: 'map' }],
        this.tab, (id) => this.switchTab(id as Tab)),
      h('div.book', null, this.left, this.right),
      h('div.scr-foot', { style: 'margin-top:1.4rem' }, h('div.help', null, this.tab === 'leads' ? 'Memories are never erased. When the present disagrees, both stay written.' : ''),
        this.ctx.prompts([{ nav: 'confirm', label: 'Read' }, { nav: 'back', label: 'Close', onClick: () => this.onBack() }])),
    );
  }

  // ---------------------------------------------------------------- leads

  private renderLeads(): void {
    this.leads = this.ctx.host.journal();
    this.left.append(h('h2', null, 'Leads'), h('div.p-sub', null, 'Ashbridge, on the first day of service'), h('div.p-rule'));
    const list = h('div', { 'data-nav-wrap': '' });
    this.leads.forEach((l, i) => {
      const row = navItem(h('div', { class: `lead-row ${l.status}`, 'data-key': `lead:${l.id}`, 'data-lead': l.id },
        h('span.icw', { html: icon(STATUS_ICON[l.status]) }),
        h('div', null, h('div.lt', null, l.title), h('div.lr', null, l.region)),
        h('span.ls', null, STATUS_LABEL[l.status])));
      row.addEventListener('click', () => this.focusFirstEntry());
      if (i === 0) row.setAttribute('data-nav-default', '');
      list.appendChild(row);
    });
    if (!this.leads.length) list.appendChild(h('div.jnone', null, 'Nothing written yet.'));
    this.left.appendChild(list);
    this.shownLead = '';
    if (this.leads[0]) this.showLead(this.leads[0]);
  }

  private focusFirstEntry(): void {
    const e = this.right.querySelector<HTMLElement>('[data-nav]');
    if (e) this.nav.focus(e);
  }

  private showLead(l: JournalLead): void {
    if (this.shownLead === l.id) return;
    this.shownLead = l.id;
    const by = (c: JournalEntry['category']) => l.entries.filter((e) => e.category === c).sort((a, b) => a.time - b.time);
    const entry = (e: JournalEntry, inner: (HTMLElement | string | null)[], cls = '') =>
      navItem(h('div', { class: `jentry ${cls}`, 'data-key': `e:${e.id}` }, ...inner, h('span.jt', null, `Recorded at ${fmtTime(e.time)}`)));

    const remembered = h('div.jsec.remembered', null,
      h('div.jsec-head', null, h('span.icw', { html: icon('remembered') }), 'Remembered'));
    for (const e of by('remembered')) {
      remembered.appendChild(entry(e, [
        h('span', null, e.text),
        e.contradictedBy ? h('div.contra', null, h('span.icw', { html: icon('contradicted') }), h('span', null, h('b', null, 'Contradicted:'), e.contradictedBy)) : null,
      ]));
    }
    if (!by('remembered').length) remembered.appendChild(h('div.jnone', null, 'I remember nothing of this.'));

    const observed = h('div.jsec.observed', null, h('div.jsec-head', null, h('span.icw', { html: icon('observed') }), 'Observed now'));
    for (const e of by('observed')) observed.appendChild(entry(e, [e.text]));
    if (!by('observed').length) observed.appendChild(h('div.jnone', null, 'Nothing seen yet.'));

    const confirmed = h('div.jsec.confirmed', null, h('div.jsec-head', null, h('span.icw', { html: icon('confirmed') }), 'Confirmed change'));
    for (const e of by('confirmed')) {
      confirmed.appendChild(entry(e, [
        h('span.icw', { html: icon(e.loss ? 'seal_broken' : 'confirmed') }),
        h('span', null, e.loss ? h('span.ltag', null, 'Loss') : null, e.text),
      ], `change${e.loss ? ' loss' : ''}`));
    }
    if (!by('confirmed').length) confirmed.appendChild(h('div.jnone', null, 'Nothing has changed yet.'));

    this.right.replaceChildren(
      h('div', { style: 'display:flex;align-items:flex-start;gap:1rem' },
        h('div', { style: 'flex:1' }, h('h2', null, l.title), h('div.p-sub', null, l.region)),
        h('span', { class: `lead-status ${l.status}` }, h('span.icw', { html: icon(STATUS_ICON[l.status]) }), STATUS_LABEL[l.status])),
      h('div.p-rule'),
      remembered, observed, confirmed);
    this.right.scrollTop = 0;
  }

  // ---------------------------------------------------------------- practice

  private renderPractice(): void {
    this.topics = this.ctx.host.practiceTopics();
    this.left.append(h('h2', null, 'Practice'), h('div.p-sub', null, 'Plaques of the Hospice practice yard'), h('div.p-rule'));
    const list = h('div', { 'data-nav-wrap': '' });
    this.topics.forEach((t, i) => {
      const row = navItem(h('div.topic-row', { 'data-key': `t:${t.id}`, 'data-topic': t.id }, h('span.icw', { html: icon('practice') }), t.title));
      if ((this.focusTopic ? t.id === this.focusTopic : i === 0)) row.setAttribute('data-nav-default', '');
      list.appendChild(row);
    });
    this.left.appendChild(list);
    const first = this.topics.find((t) => t.id === this.focusTopic) ?? this.topics[0];
    if (first) this.showTopic(first);
  }

  private showTopic(t: PracticeTopic): void {
    const input = this.ctx.host.input;
    const body = h('div.topic-body');
    for (const p of t.body) body.appendChild(h('p', null, formatActions(p, (a) => input.glyph(a), input.device)));
    this.right.replaceChildren(h('h2', null, t.title), h('div.p-rule'), body);
  }

  // ---------------------------------------------------------------- map

  private renderMap(): void {
    const dests = this.ctx.host.destinations();
    const lit = new Set(dests.filter((d) => d.unlocked).map((d) => d.id));
    const extra = this.ctx.host as unknown as { discoveredAreas?: () => string[] };
    const known = extra.discoveredAreas ? new Set(extra.discoveredAreas()) : null;
    this.left.append(h('h2', null, 'Ashbridge'), h('div.p-sub', null, 'Border province · sketched from memory, corrected by sight'), h('div.p-rule'),
      h('div', { style: 'font-size:1.15rem;line-height:1.5' },
        h('p', null, 'A town at dusk: timber houses colliding with stone, a district burned by a war that has not happened yet.'),
        h('div', { style: 'display:flex;gap:0.6rem;align-items:center;margin-top:1rem' }, h('span.icw', { html: icon('stillbell') }), 'Stillbell (filled: lit)'),
        h('div', { style: 'display:flex;gap:0.6rem;align-items:center;margin-top:0.4rem' }, h('span', { style: 'width:1.4rem;border-top:2px solid #4a3218;display:inline-block' }), 'Drawbridge'),
        h('div', { style: 'display:flex;gap:0.6rem;align-items:center;margin-top:0.4rem' }, h('span', { style: 'width:1.4rem;border-top:2px dashed #4a3218;display:inline-block' }), 'Path, stair or hatch')));
    // focusable so the page is reachable / scrollable with a pad
    this.left.appendChild(navItem(h('div', { 'data-key': 'map', 'data-nav-default': '', style: 'height:1px' })));
    this.right.appendChild(sketchMap(lit, known));
  }

  // ---------------------------------------------------------------- shared

  protected override onFocus(el: HTMLElement): void {
    const leadId = el.getAttribute('data-lead');
    if (leadId) { const l = this.leads.find((x) => x.id === leadId); if (l) this.showLead(l); return; }
    const topicId = el.getAttribute('data-topic');
    if (topicId) { const t = this.topics.find((x) => x.id === topicId); if (t) this.showTopic(t); }
  }

  protected override onTab(d: number): void { this.switchTab(cycle(TABS, this.tab, d)); }
  protected override onJournal(): void { this.onBack(); }

  private switchTab(t: Tab): void {
    if (t === this.tab) return;
    this.tab = t;
    this.focusTopic = undefined;
    this.ctx.sound('ui_tab');
    this.render();
    this.nav.focused = null;
    this.nav.ensure();
  }

  protected override onBack(): void {
    // From the right page, back returns to the list first.
    if (this.nav.focused && this.right.contains(this.nav.focused) && this.shownLead) {
      this.ctx.sound('ui_back');
      this.nav.restore(`lead:${this.shownLead}`);
      return;
    }
    super.onBack();
  }
}

/** Hand-sketched SVG map of Ashbridge (layout from docs/ASHBRIDGE.md). */
function sketchMap(lit: Set<string>, known: Set<string> | null): SVGElement {
  const A: Record<string, { x: number; y: number; w: number; name: string }> = {
    commandersYard: { x: 330, y: 58, w: 150, name: "Commander's Yard" },
    gateApproach: { x: 330, y: 138, w: 128, name: 'Gate Approach' },
    courtyard: { x: 330, y: 222, w: 124, name: 'Courtyard' },
    hospice: { x: 500, y: 222, w: 110, name: 'Hospice' },
    watchtower: { x: 110, y: 222, w: 118, name: 'Watchtower' },
    lowerPassage: { x: 330, y: 306, w: 128, name: 'Lower Passage' },
    lowerStreet: { x: 110, y: 392, w: 118, name: 'Lower Street' },
    oldMint: { x: 290, y: 392, w: 104, name: 'Old Mint' },
    countingRoom: { x: 450, y: 392, w: 128, name: 'Counting Room' },
  };
  const has = (id: string) => !known || known.has(id);
  const route = (a: string, b: string, cls = 'route') => {
    const p = A[a]!, q = A[b]!;
    const mx = (p.x + q.x) / 2 + (p.y === q.y ? 0 : 8), my = (p.y + q.y) / 2 + (p.x === q.x ? 0 : -6);
    return `<path class="${cls}" d="M${p.x} ${p.y} Q${mx} ${my} ${q.x} ${q.y}"/>`;
  };
  let s = `<svg class="sketch-map" viewBox="0 0 600 450" preserveAspectRatio="xMidYMid meet">`;
  // ravine between watchtower and courtyard, cliff
  s += `<path d="M205 150 C215 190 200 230 214 270 C224 300 208 330 218 360" fill="none" stroke="#6a4a26" stroke-width="1.2" stroke-dasharray="2 3"/>`;
  s += `<path d="M225 150 C235 190 220 230 234 270 C244 300 228 330 238 360" fill="none" stroke="#6a4a26" stroke-width="1.2" stroke-dasharray="2 3"/>`;
  s += `<text x="221" y="140" font-size="10" text-anchor="middle" font-style="italic" fill="#6a4a26">ravine</text>`;
  s += route('watchtower', 'courtyard', 'route bridge') + route('courtyard', 'hospice') + route('courtyard', 'gateApproach') +
    route('gateApproach', 'commandersYard') + route('courtyard', 'lowerPassage') + route('watchtower', 'lowerStreet') +
    route('lowerStreet', 'oldMint') + route('oldMint', 'countingRoom') + route('countingRoom', 'lowerPassage');
  for (const [id, a] of Object.entries(A)) {
    const k = has(id);
    const hw = a.w / 2;
    // irregular, hand-drawn looking block
    s += `<path class="area${k ? '' : ' unknown'}" d="M${a.x - hw} ${a.y - 16} Q${a.x} ${a.y - 21} ${a.x + hw} ${a.y - 15} L${a.x + hw + 3} ${a.y + 15} Q${a.x} ${a.y + 19} ${a.x - hw - 2} ${a.y + 16} Z"/>`;
    s += `<text x="${a.x}" y="${a.y + 4}" font-size="${k ? 12 : 11}" text-anchor="middle" letter-spacing="1" ${k ? '' : 'opacity=".45"'}>${k ? a.name.toUpperCase() : '?'}</text>`;
  }
  // stillbells
  for (const id of ['watchtower', 'hospice']) {
    const a = A[id]!;
    const cx = a.x + a.w / 2 - 6, cy = a.y - 24;
    s += `<path class="bellmark${lit.has(id) || lit.has(`${id}_stillbell`) ? '' : ' unlit'}" d="M${cx - 7} ${cy + 9} L${cx - 6} ${cy + 6} C${cx - 5} ${cy + 1} ${cx - 5} ${cy - 5} ${cx} ${cy - 6} C${cx + 5} ${cy - 5} ${cx + 5} ${cy + 1} ${cx + 6} ${cy + 6} L${cx + 7} ${cy + 9} Z"/>`;
  }
  // arena veil and compass
  s += `<path d="M280 30 Q330 18 380 30" fill="none" stroke="#8b5a2b" stroke-width="2" stroke-dasharray="1 4"/>`;
  s += `<g transform="translate(548 70)" stroke="#4a3218" fill="none"><circle r="20" stroke-width="1"/><path d="M0 -26L4 0L0 26L-4 0Z" fill="#4a3218" fill-opacity=".25"/><text y="-30" font-size="10" text-anchor="middle" stroke="none" fill="#3a2814">N</text></g>`;
  s += `<text x="16" y="440" font-size="11" font-style="italic" fill="#6a4a26">The east gate lies beyond the Commander's Yard.</text>`;
  s += `</svg>`;
  const wrap = document.createElement('div');
  wrap.style.height = '100%';
  wrap.innerHTML = s;
  return wrap.firstElementChild as SVGElement;
}
