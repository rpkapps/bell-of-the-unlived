// All region model registrations load together at startup (reward weapons and Hospice guests are seen
// outside their home region), so no two regions may register the same look or weapon id.
import { describe, expect, it, vi } from 'vitest';

describe('region model registrations', () => {
  it('no look or weapon id is registered by two regions', async () => {
    const owners = new Map<string, string>();
    const clashes: string[] = [];
    let current = '';
    const models = await import('../src/actors/models');
    const note = (kind: string) => (id: string) => {
      const key = kind + ':' + id, prev = owners.get(key);
      if (prev && prev !== current) clashes.push(`${key} (${prev}, ${current})`);
      owners.set(key, current);
    };
    const spies = [
      vi.spyOn(models, 'registerEnemyLook').mockImplementation(note('enemy')),
      vi.spyOn(models, 'registerNpcLook').mockImplementation(note('npc')),
      vi.spyOn(models, 'registerWeaponModel').mockImplementation(note('weapon')),
    ];
    for (const r of ['army', 'academy', 'cathedral', 'treasury', 'household', 'belfry']) {
      current = r;
      await import(`../src/content/${r}/models.ts`);
    }
    spies.forEach((s) => s.mockRestore());
    expect(owners.size).toBeGreaterThan(20);
    expect(clashes).toEqual([]);
  });
});

describe('region move / clip / enemy registrations', () => {
  it('regions never overwrite each other (modules stay loaded after travel)', async () => {
    await import('../src/combat/movesets'); // the player's moves (registered by Player at runtime)
    await import('../src/actors/anim/clips/weapons');
    const { MOVES } = await import('../src/combat/moves');
    const { CLIPS } = await import('../src/actors/anim/clips');
    const { ENEMY_DEFS } = await import('../src/content/enemies');
    const { BOSSES } = await import('../src/content/bosses');
    await import('../src/content/beasts');
    const tables = { MOVES, CLIPS, ENEMY_DEFS, BOSSES } as Record<string, Record<string, unknown>>;
    const clashes: string[] = [];
    for (const r of ['army', 'academy', 'cathedral', 'treasury', 'household', 'belfry']) {
      const before = Object.fromEntries(Object.entries(tables).map(([k, t]) => [k, { ...t }]));
      await import(`../src/content/${r}/module.ts`);
      for (const [k, t] of Object.entries(tables)) {
        for (const id of Object.keys(t)) if (id in before[k] && before[k][id] !== t[id]) clashes.push(`${k}.${id} (${r})`);
      }
    }
    expect(clashes).toEqual([]);
  }, 120000);
});
