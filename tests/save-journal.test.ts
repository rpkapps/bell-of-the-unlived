import { describe, it, expect } from 'vitest';
import { SaveSystem } from '../src/systems/Save';
import { newWorldState } from '../src/systems/WorldState';
import { newPlayerData, derive } from '../src/systems/PlayerData';
import { Journal } from '../src/systems/Journal';

class Mem { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }

describe('save system', () => {
  it('round-trips and survives a corrupted newest slot', () => {
    const store = new Mem();
    const s = new SaveSystem(store);
    const w = newWorldState(); w.flags['ashbridge.drawbridge'] = true;
    const p = newPlayerData('householdKnight');
    expect(s.write({ player: p, world: w, position: null })).toBe(true);
    w.flags['boss.corvane'] = true;
    expect(s.write({ player: p, world: w, position: null })).toBe(true);
    expect(s.load()!.world.flags['boss.corvane']).toBe(true);
    // corrupt the newest slot: the previous save must still load
    const newest = s.load()!.seq % 2 === 0 ? 'A' : 'B';
    store.setItem('botu.save.' + newest, store.getItem('botu.save.' + newest)!.replace('true', 'fals'));
    const back = new SaveSystem(store).load();
    expect(back).not.toBeNull();
    expect(back!.world.flags['ashbridge.drawbridge']).toBe(true);
  });
});

describe('journal (Forememory)', () => {
  it('keeps a remembered entry visible and annotated when contradicted', () => {
    const w = newWorldState();
    const j = new Journal(() => w);
    j.record('refugee_road', 'mem_route');
    j.record('refugee_road', 'obs_masonry');
    const lead = j.leads().find((l) => l.id === 'refugee_road')!;
    const mem = lead.entries.find((e) => e.id === 'mem_route')!;
    expect(mem.category).toBe('remembered');
    expect(mem.contradictedBy).toBeTruthy();
    expect(lead.entries.map((e) => e.category)).toContain('observed');
  });
  it('records a loss as a lost lead', () => {
    const w = newWorldState();
    const j = new Journal(() => w);
    j.record('healer', 'mem_oswin'); j.record('healer', 'conf_taken');
    expect(j.leads().find((l) => l.id === 'healer')!.status).toBe('lost');
  });
});

describe('origins & stats', () => {
  it('both slice origins start with sensible derived stats', () => {
    const k = derive(newPlayerData('householdKnight'));
    const m = derive(newPlayerData('courtMage'));
    expect(k.hpMax).toBeGreaterThan(m.hpMax);
    expect(m.focusMax).toBeGreaterThan(k.focusMax);
    expect(k.loadClass).not.toBe('overloaded');
    expect(m.loadClass).toBe('light');
  });
});
