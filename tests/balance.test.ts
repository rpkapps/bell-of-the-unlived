import { describe, it, expect } from 'vitest';
import { attackRating, applyDefense, spellPower } from '../src/combat/stats';
import { newPlayerData, derive } from '../src/systems/PlayerData';
import { ITEMS } from '../src/content/items';
import { ENEMY_DEFS } from '../src/content/enemies';
import { CORVANE } from '../src/content/bosses';

function hitsToKill(dmg: number, hp: number) { return Math.ceil(hp / dmg); }

describe('balance: both starting builds can win with ordinary attacks', () => {
  const knight = newPlayerData('householdKnight');
  const mage = newPlayerData('courtMage');
  const kd = derive(knight), md = derive(mage);
  const ar = attackRating(ITEMS.retainer_sword, 0, knight.attributes);
  const sp = spellPower(ITEMS.court_staff, 0, mage.attributes, 'sorcery');
  const light = (def: { defense: number; absorb: { physical: number } }) => applyDefense(ar.physical, def.defense, def.absorb.physical);
  const shard = (def: { defense: number; absorb: { magic: number } }) => applyDefense(110 * sp, def.defense, def.absorb.magic);
  const cinder = (def: { defense: number; absorb: { fire: number } }) => applyDefense(155 * sp, def.defense, def.absorb.fire);
  it('reports', () => {
    const rows = {
      knightAR: Math.round(ar.physical), mageSpellPower: sp.toFixed(2),
      knightLightVsInfantry: light(ENEMY_DEFS.infantry), hitsInfantry: hitsToKill(light(ENEMY_DEFS.infantry), ENEMY_DEFS.infantry.hp),
      knightLightVsCorvane: light(CORVANE), hitsCorvane: hitsToKill(light(CORVANE), CORVANE.hp),
      shardVsInfantry: shard(ENEMY_DEFS.infantry), shardsInfantry: hitsToKill(shard(ENEMY_DEFS.infantry), ENEMY_DEFS.infantry.hp),
      shardVsCorvane: shard(CORVANE), shardsCorvane: hitsToKill(shard(CORVANE), CORVANE.hp), cinderVsCorvane: cinder(CORVANE),
      mageFocus: md.focusMax, knightHp: kd.hpMax, mageHp: md.hpMax,
      corvaneSlashOnKnight: applyDefense(220, kd.defense, kd.absorb.physical), corvaneSlashOnMage: applyDefense(220, md.defense, md.absorb.physical),
      infSlashOnKnight: applyDefense(150, kd.defense, kd.absorb.physical), infSlashOnMage: applyDefense(150, md.defense, md.absorb.physical),
    };
    console.log(rows);
    // Mage: total focus available (pool + 2 focus flasks at 50 %) must cover Corvane with ordinary shards.
    const focusBudget = md.focusMax + 2 * md.focusMax * 0.5;
    const shardCount = Math.floor(focusBudget / 7);
    expect(shardCount * shard(CORVANE)).toBeGreaterThan(CORVANE.hp * 1.0);
    // Knight: fewer than ~45 light hits.
    expect(rows.hitsCorvane).toBeLessThan(34);
    // Neither build is one- or two-shot by the Commander.
    expect(rows.corvaneSlashOnMage).toBeLessThan(md.hpMax / 2.2);
  });
});
