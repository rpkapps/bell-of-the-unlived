/**
 * Forememory: Remembered / Observed now / Confirmed change, always kept separate. A remembered entry
 * is never removed; contradicting evidence annotates it.
 */
import { LEADS } from '../content/journal';
import type { JournalEntry, JournalLead } from '../game/types';
import type { WorldState } from './WorldState';

export class Journal {
  constructor(private ws: () => WorldState) {}

  has(entryId: string) { return !!this.ws().journal[entryId]; }

  /** Record an entry. Returns true if it is new. */
  record(leadId: string, entryId: string): boolean {
    const w = this.ws();
    if (w.journal[entryId]) return false;
    if (!LEADS[leadId]?.entries[entryId]) { console.warn('unknown journal entry', leadId, entryId); return false; }
    w.journal[entryId] = { lead: leadId, time: w.playtime };
    return true;
  }

  leads(): JournalLead[] {
    const w = this.ws();
    const out: JournalLead[] = [];
    for (const [leadId, def] of Object.entries(LEADS)) {
      const recorded = Object.entries(def.entries).filter(([id]) => w.journal[id]);
      if (!recorded.length) continue;
      let status: JournalLead['status'] = 'open';
      const entries: JournalEntry[] = recorded.map(([id, e]) => {
        if (e.sets === 'resolved' && status !== 'lost') status = 'resolved';
        if (e.sets === 'lost') status = 'lost';
        return { id, category: e.category, text: e.text, time: w.journal[id].time, loss: e.loss };
      });
      // contradictions annotate (never replace) the remembered entry
      for (const [id, e] of recorded) {
        if (!e.contradicts) continue;
        const mem = entries.find((x) => x.id === e.contradicts);
        if (mem) mem.contradictedBy = e.contradictionNote ?? def.entries[id].text;
      }
      entries.sort((a, b) => a.time - b.time);
      out.push({ id: leadId, title: def.title, region: def.region, status, entries });
    }
    return out;
  }
}
