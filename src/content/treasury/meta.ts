/**
 * treasury — always-loaded metadata for the Undervaults (the Royal Treasury): region items, journal
 * leads (the debtors' cage, the twofold market, the Treasurer's wards, the central revelation, the
 * unpaid muster), text (areas, Stillbells, bosses, inspectables, warnings, hints, Final Memory),
 * dialogue that must exist outside the region (Ione at the Hospice), the Hospice guest and her shop.
 * The model builders are imported so Ione's look exists at the Hospice (no geometry is built here).
 */
import type { ItemDef } from '../../game/types';
import type { DialogueLine } from '../../game/types';
import { registerItems, SHOP_STOCK } from '../items';
import { registerLeads, LEADS, type LeadDef } from '../journal';
import { registerText } from '../text';
import { registerDialogue } from '../dialogue';
import { registerHospiceGuest } from '../../game/regions/hub';
import './models';

// ------------------------------------------------------------------ items

const items: ItemDef[] = [
  {
    id: 'memory_aurelmask', name: 'Final Memory of Treasurer Aurel', kind: 'memory', icon: 'memory_aurelmask',
    description: 'At a Stillbell, exchange it for one of several rewards: a technique, the Treasurer\'s tally-staff, or a great sum of Hours.',
    lore: 'The last thing Aurel saw was a column that would not balance. The memory is heavy, and adds up to less than it should.',
    memory: { boss: 'aurelmask' },
  },
  {
    id: 'tally_staff', name: 'Tally-Staff of the Treasury', kind: 'catalyst', icon: 'tally_staff', weight: 3.5,
    description: 'A black rod with a keyhole plate for a head and a small bell beneath. Casts sorceries; its strikes land heavier than a court staff\'s.',
    lore: 'Treasurer Aurel counted with it: one tap on the floor for every future the crown accepted, two for every future refused. The floor of the Vault is worn in pairs.',
    weapon: {
      class: 'staff', damage: { physical: 58, magic: 0, fire: 0 },
      scaling: { intellect: 'B', strength: 'E' }, requirements: { strength: 9, intellect: 15 },
      criticalMult: 2.3, postureMult: 0.7, technique: 'bellglass_ward', casts: 'sorcery', maxUpgrade: 10,
    },
  },
  {
    id: 'gilded_tooth', name: 'Gilded Tooth', kind: 'talisman', icon: 'gilded_tooth', weight: 0.5,
    description: 'A gold tooth pulled from the Mimic Sovereign. Raises maximum stamina by 10 %.',
    lore: 'Every tooth in the Sovereign\'s jaw was a coin once. This one still bears half a king.',
    talisman: { effect: 'staminaMax10' },
  },
  {
    id: 'tally_key', name: 'Tally Key', kind: 'key', icon: 'tally_key',
    description: 'A heavy key with a notched brass bow. Unlocks the winch of the debtors\' cage in the Counting Deep.',
    lore: 'The Head Collector wore it on his belt beside the purses. Only the key was never counted.',
  },
  {
    id: 'greyford_payroll', name: 'Greyford Pay-Roll', kind: 'key', icon: 'greyford_payroll',
    description: 'A roll of names from the wardens\' lockers: the Greyford muster, every man, and the wages owed them. Stamped "WITHHELD — WAR NOT HELD".',
    lore: 'Four hundred and twelve names. Beside each, the same entry in the same clerk\'s hand: nothing paid, nothing owed, nothing happened.',
  },
];
registerItems(items);

// ------------------------------------------------------------------ journal

const leads: Record<string, LeadDef> = {
  debtors_cage: {
    title: 'The Debtors\' Cage',
    region: 'The Undervaults',
    entries: {
      tr_mem_ione: {
        category: 'remembered',
        text: 'Ione Tallow, a clerk of the Counting Deep, falsified the famine ledgers to feed the east quay. In the future I remember, they hung her cage over the coin-sluice and opened it at the ninth toll.',
      },
      tr_obs_cage: {
        category: 'observed',
        text: 'Her cage hangs over the coin pit in the Counting Deep. The sluice beneath it has been dry for years; the pit holds coin, not water.',
        contradicts: 'tr_mem_ione',
        contradictionNote: 'The sluice she drowned in is dry. Whatever they mean for her, it is not water.',
      },
      tr_obs_debt: {
        category: 'observed',
        text: 'The collectors\' ledger: "Tallow, I. — debt unpayable. To be written off at the Treasurer\'s crossing." The Head Collector keeps the key to the cage winch.',
      },
      tr_conf_ione: {
        category: 'confirmed',
        text: 'I lowered the cage. Ione is free, and has gone to the Hospice with a satchel of other people\'s ledgers. She says she will sell, and never buy.',
        sets: 'resolved',
      },
      tr_conf_ione_taken: {
        category: 'confirmed',
        text: 'I crossed into the Vault of Futures while Ione was still caged. The cage hangs open and empty; her page has been struck through in gold.',
        loss: true,
        sets: 'lost',
      },
    },
  },
  twofold: {
    title: 'The Twofold Market',
    region: 'The Undervaults',
    entries: {
      tr_mem_market: {
        category: 'remembered',
        text: 'I remember the Treasury market in the year of the famine: the canal ran dry, the stalls stood empty, and the bread line reached the Hall of Weights.',
      },
      tr_obs_stalls: {
        category: 'observed',
        text: 'The same stall stands twice: on the west quay laid with gilt plate under a red awning, on the east quay bare, its awning rotted. The canal is drowned on one side of the weir and cracked dry on the other.',
        contradicts: 'tr_mem_market',
        contradictionNote: 'Both markets are here at once. One of them was never meant to last.',
      },
      tr_obs_breadline: {
        category: 'observed',
        text: 'The bread line waits on the ghat steps beneath a banquet balcony still laid for dinner. A tally board keeps the famine\'s arithmetic in chalk.',
      },
      tr_conf_market: {
        category: 'confirmed',
        text: 'With the Treasury bell silent, the gilded market has faded from the east quay. What remains is the market I remember: dry, empty, and real.',
        sets: 'resolved',
      },
    },
  },
  aurel_wards: {
    title: 'The Treasurer\'s Wards',
    region: 'The Undervaults',
    entries: {
      tr_mem_wards: {
        category: 'remembered',
        text: 'Treasurer Aurel Mask was said to be untouchable. When the army came for the Treasury, blades turned on him as if on a vault door.',
      },
      tr_obs_coffers: {
        category: 'observed',
        text: 'Four ward-coffers stand in the corners of the Vault of Futures, chained to the bell above. His protection is kept in them, not in him.',
        contradicts: 'tr_mem_wards',
        contradictionNote: 'Not untouchable — insured. Break the coffers and the ward breaks with them.',
      },
      tr_conf_aurel: {
        category: 'confirmed',
        text: 'Aurel is dead. The lock on the Treasury Great Bell has shattered, and the bell hangs silent over the vault.',
        sets: 'resolved',
      },
    },
  },
  unpaid_muster: {
    title: 'The Unpaid Muster',
    region: 'The Undervaults',
    entries: {
      tr_obs_dunmore: {
        category: 'observed',
        text: 'Private Hale Dunmore of the Greyford muster sits among the famine quarter. The muster was never paid; he wants to see the roll that proves they marched.',
      },
      tr_conf_paid: {
        category: 'confirmed',
        text: 'I brought Dunmore the Greyford pay-roll. He read every name aloud, and went to join the others under Ashbridge.',
        sets: 'resolved',
      },
    },
  },
};
registerLeads(leads);

/**
 * The central revelation (GDD §7). Other regions add entries to the same lead (the Cathedral's
 * record of names; the Belfry's `conf_revelation`), so merge rather than replace.
 */
const REVELATION: Record<string, LeadDef['entries'][string]> = {
  mem_defeat: {
    category: 'remembered',
    text: 'The defeat at the gates was where the catastrophe began. Aldren rang the five Great Bells once, in despair, and erased the kingdom rather than lose it.',
  },
  obs_ledger: {
    category: 'observed',
    text: 'The Treasury\'s Ledger of Rejected Futures: Aldren\'s own accounts of every future he paid for with a ringing of the Great Bells. Dozens of entries, each struck through in gold, long before the defeat I remember.',
    contradicts: 'mem_defeat',
    contradictionNote: 'Not once. Dozens of times. The defeat I remember was only the last entry.',
  },
};
LEADS.revelation = {
  title: LEADS.revelation?.title ?? 'The Rejected Futures',
  region: LEADS.revelation?.region ?? 'The Kingdom',
  entries: { ...(LEADS.revelation?.entries ?? {}), ...REVELATION },
};

// ------------------------------------------------------------------ text

registerText({
  areas: {
    tr_market: 'The Twofold Market', tr_balcony: 'The Banquet Balcony', tr_culvert: 'The Dry Culvert', tr_sluice: 'The Sluice Hall',
    tr_hall: 'Hall of Weights', tr_deep: 'The Counting Deep', tr_strong: 'The Strongrooms', tr_gallery: 'The Scale Gallery',
    tr_hoard: 'The Hoard', tr_ante: 'Antechamber of Futures', tr_archive: 'Archive of Rejected Futures', tr_vault: 'The Vault of Futures',
  },
  stillbells: { 'treasury.market': 'Twofold Market Stillbell', 'treasury.counting': 'Counting Deep Stillbell', 'treasury.vault': 'Vault of Futures Stillbell' },
  bosses: {
    aurelmask: { name: 'Treasurer Aurel Mask', title: 'Keeper of the Treasury Bell' },
    mimicsovereign: { name: 'The Mimic Sovereign', title: 'Hoard of the Undervaults' },
  },
  warnings: {
    trAurelPrisoner: {
      title: 'Treasurer Aurel Waits',
      body: 'Beyond this veil, Treasurer Aurel Mask waits. Once you cross it, the collectors will write off the debtor still caged in the Counting Deep. Cross now?',
      yes: 'Cross', no: 'Not yet',
    },
    trAurelPlain: { title: 'Treasurer Aurel Waits', body: 'Beyond this veil, Treasurer Aurel Mask waits. Cross now?', yes: 'Cross', no: 'Not yet' },
    trHoard: { title: 'The Hoard', body: 'Something vast breathes behind this veil. It is not required to go on. Cross now?', yes: 'Cross', no: 'Not yet' },
  },
  hints: {
    tr_grab: 'An open, gilded hand drawn back means a GRAB: it cannot be blocked or parried. Roll away from the reach. A collector who takes your Hours keeps them until he is killed.',
    tr_ward: 'The Treasurer is warded while his ward-coffers stand. Break the coffers in the corners of the vault.',
    tr_mimic: 'Some chests breathe. Watch the lid, and the coins in its seam.',
    tr_lever: '{interact} to work the mechanism. It will stay as you leave it.',
  },
  inspect: {
    tr_twin_stalls: {
      title: 'Twin Stalls',
      lines: [
        'On the west quay a stall is laid with gilt plate and white bread. Across the water the same stall stands bare, its awning rotted to ribbons.',
        'The same carpenter\'s mark is cut into both frames. The same crack runs through both counters.',
        'Every so often, the bare one glints, as if remembering the other.',
      ],
    },
    tr_breadline: {
      title: 'The Tally Board',
      lines: [
        'A board of chalk tallies under the balcony: loaves given, loaves owed, names crossed out when the owing stopped.',
        'Above it, the banquet balcony is still laid for dinner. Someone has counted the plates, too.',
      ],
    },
    tr_banquet: {
      title: 'The Banquet',
      lines: [
        'Eight gilt plates, a roast gone to bronze, candles that burn without shortening.',
        'The chairs face the canal, so the diners could watch the bread line while they ate.',
      ],
    },
    tr_collectors_ledger: {
      title: 'The Collectors\' Ledger',
      lines: [
        'Debts in one column, collections in the next. Most rows end in a single word: "written off".',
        '"Tallow, I. — clerk. Falsified the famine ledgers; fed the east quay on the crown\'s account. Debt: unpayable."',
        '"To be written off at the Treasurer\'s crossing." Beneath, in another hand: "the Head Collector keeps the key."',
      ],
    },
    tr_cage_pit: {
      title: 'The Coin Pit',
      lines: [
        'The cage hangs over a pit of dull coin. The sluice that fed it has been dry for years; tide-marks ring the walls well above the coin.',
        'There is no water here to drown in. The Treasury has other ways to close an account.',
      ],
    },
    tr_vault_door_sealed: {
      title: 'The Round Door',
      lines: [
        'A vault door like a great coin set on its edge. There is no handle on this side, only a keyhole plate with no keyhole.',
        'The wheel that turns it must be on the other side.',
      ],
    },
    tr_weigh_beam: {
      title: 'The Weighing Beam',
      lines: [
        'The great beam of the Hall of Weights: coin chests on one pan, sacks of grain on the other.',
        'The grain is heavier. The beam has been pinned so that it reads the other way.',
      ],
    },
    tr_coffers: {
      title: 'Wall of Debts',
      lines: [
        'Bronze plaques, each engraved with a name and a sum. Beneath them, a warden\'s notice:',
        '"The Treasurer is kept by four coffers in the Vault. While they stand, no blade may touch the account."',
      ],
    },
    tr_ledger: {
      title: 'The Ledger of Rejected Futures',
      lines: [
        'A book as long as a man, chained open on a bronze lectern. The hand is the king\'s.',
        '"A future in which the harvest fails for seven years. Price: the bells, rung. Paid."',
        '"A future in which the Queen dies in childbirth, and the heir with her. Price: the bells, rung. Paid."',
        '"A future in which the Army is broken at the Greyford crossing. Price: the bells, rung. Paid."',
        'Page after page, the same entry: a future described, a price, and the word "Paid" in gold. Forty-seven of them. Forty-eight.',
        'The last line is blank but for a date — the day of the defeat you remember — and a single word, not yet gilded: "Again?"',
      ],
    },
    tr_ione_page: {
      title: 'A Torn Page',
      lines: [
        'A page from the collectors\' ledger lies in the empty cage. One name on it is struck through with gold leaf.',
        '"Tallow, I. — written off."',
      ],
    },
    tr_payroll: {
      title: 'The Wardens\' Coffer',
      lines: [
        'An old iron coffer stencilled with a river no map of the kingdom includes.',
        'Inside, a roll of names: the Greyford muster, and the wages owed them. Every line is stamped "WITHHELD — WAR NOT HELD".',
      ],
    },
  },
  memoryRewards: {
    memory_aurelmask: [
      {
        id: 'bell_breaker', name: 'Bell Breaker', icon: 'bell_breaker', kind: 'technique',
        description: 'An Imprint Technique: leap and bring the weapon down in a crushing overhead. Can be imprinted on a greatsword, hammer, axe or mace.',
      },
      {
        id: 'tally_staff', name: 'Tally-Staff of the Treasury', icon: 'tally_staff', kind: 'weapon',
        description: 'Aurel\'s counting rod, remade as a catalyst. Casts sorceries and strikes harder than a court staff. Requires 15 Intellect and 9 Strength.',
      },
      {
        id: 'hours:9000', name: '9,000 Hours', icon: 'hours', kind: 'hours',
        description: 'Let the memory go, and keep what it was worth. The Treasurer would have approved of the arithmetic.',
      },
    ],
  },
});

// ------------------------------------------------------------------ dialogue

const IONE = 'Ione Tallow';
const MOTHER = 'Mother on the Quay';
const DUNMORE = 'Private Dunmore';
const AUREL = 'Treasurer Aurel';
const RETURNED = 'The Returned';

const dialogue: Record<string, DialogueLine[]> = {
  // ---------------------------------------------------------------- Ione
  tr_ione_cage: [
    { speaker: IONE, text: 'If you are here to collect, you are late. They took everything but the ledger in my head.' },
    { speaker: RETURNED, text: 'I am not a collector.' },
    { speaker: IONE, text: 'Then you are the first person in a year to come down here without a purse or a hook.' },
    { speaker: IONE, text: 'The winch by the pit lowers this thing. The Head Collector has the key. He walks the pit like it owes him money.' },
    { speaker: IONE, text: 'They are waiting for the Treasurer to cross into the Vault. Then they write me off. That is the word they use.' },
  ],
  tr_ione_freed: [
    { speaker: IONE, text: 'Floor. Real floor. I had started to think I would only ever stand on coin again.' },
    { speaker: IONE, text: 'I moved the bread money. Every week, a little, from the banquet account to the bread line. The sums never balanced after.' },
    { speaker: RETURNED, text: 'They balance now.' },
    { speaker: IONE, text: 'Kind. Wrong, but kind. There is a hospice on the Ashbridge road — the east-quay mothers talk of it. I will go there.' },
    { speaker: IONE, text: 'I will take a satchel of the Treasury\'s best. Come and buy it back from me. I never buy. I have had enough of being owed.' },
  ],
  tr_ione_hospice_first: [
    { speaker: IONE, text: 'You found me. Good. Everything on this blanket was the crown\'s, and none of it was ever counted twice.' },
    { speaker: IONE, text: 'Prices are fair. Fairer than the Treasury\'s. I do not buy — do not ask. I sell, and I remember who paid.' },
  ],
  tr_ione_hospice_idle: [
    { speaker: IONE, text: 'Oswin tried to pay me for a blanket. I told him the Hospice has credit. He did not know what I meant. I envy him.', duration: 5 },
    { speaker: IONE, text: 'Every coin I sell you was minted to pay for a future someone else lived. Spend it on this one.', duration: 5 },
    { speaker: IONE, text: 'The collectors used to say a debt never dies. Neither do clerks, apparently.', duration: 4 },
    { speaker: IONE, text: 'I kept the famine ledgers in my head so they could not burn them. I would like to forget one page a day.', duration: 5 },
  ],
  // ---------------------------------------------------------------- the mother on the east quay
  tr_mother: [
    { speaker: MOTHER, text: 'There is nothing here to take. The militia came yesterday, and the collectors the day before.' },
    { speaker: MOTHER, text: 'Some days I can smell bread from the west quay. The same street. The same stall. I have never been able to cross the water.' },
    { speaker: MOTHER, text: 'The clerk who fed us is in a cage in the Deep. They will write her off when the Treasurer passes into his vault.' },
  ],
  tr_mother_after: [
    { speaker: MOTHER, text: 'They say the clerk walked out of the Deep on her own feet. Then the bread line was a little shorter tonight.', duration: 5 },
  ],
  // ---------------------------------------------------------------- the Unlived Muster: Private Hale Dunmore
  tr_muster_first: [
    { speaker: DUNMORE, text: 'Captain? Captain! They said you would come through the Treasury if you came at all.' },
    { speaker: RETURNED, text: 'I have never commanded you. I do not know Greyford.' },
    { speaker: DUNMORE, text: 'Brannoc said you would say that. He said to ask you anyway.' },
    { speaker: DUNMORE, text: 'We were never paid, sir. Not a penny. The clerks said there is no wage for a war that was not held.' },
    { speaker: DUNMORE, text: 'But they kept the roll. The wardens locked it in the strongrooms under the Deep. If I could see our names, I would know we marched.' },
  ],
  tr_muster_wait: [
    { speaker: DUNMORE, text: 'The wardens\' room, sir, off the strongroom corridor. An old iron coffer with a river painted on it.', duration: 5 },
  ],
  tr_muster_paid: [
    { speaker: DUNMORE, text: 'Holt. Marrin. Asher the younger, Asher the elder. Dunmore, H. — that is me, sir. That is me.' },
    { speaker: DUNMORE, text: 'Withheld. War not held. Well. We held it.' },
    { speaker: DUNMORE, text: 'I will take this to the sergeant. The muster will want to hear the names read. Thank you, Captain.' },
  ],
  // ---------------------------------------------------------------- Treasurer Aurel Mask (subtitles)
  aurelmask_intro: [
    { speaker: AUREL, text: 'Another account comes due. The ledger has a line for you, Returned: a life the crown already paid for.', duration: 5 },
    { speaker: AUREL, text: 'Every future has a price. The crown bought this one with all the others. It cannot afford them twice.', duration: 5.5 },
  ],
  aurelmask_phase2: [
    { speaker: AUREL, text: 'You break the coffers as if the coin were the ward. The ward was the arithmetic.', duration: 4.5 },
    { speaker: AUREL, text: 'Do you know what a future costs? I do. I signed for every one of them.', duration: 4.5 },
  ],
  aurelmask_phase3: [
    { speaker: AUREL, text: 'No mask, then. Look at the face that balanced the kingdom\'s books.', duration: 4.5 },
    { speaker: AUREL, text: 'You are a debt, Returned. And debts are written off.', duration: 4 },
  ],
  aurelmask_death: [
    { speaker: AUREL, text: 'Then I was wrong in the sum… or you were never in it.', duration: 4.5 },
    { speaker: AUREL, text: 'Read the ledger. Count the bells. Then tell me which of us is the invader.', duration: 5 },
  ],
  mimicsovereign_intro: [
    { speaker: '', text: '[The hoard breathes]', duration: 3 },
  ],
  // ---------------------------------------------------------------- the Returned
  tr_market_memory: [
    { speaker: RETURNED, text: 'I remember this market empty. The canal dry to the stones, and the bread line all the way to the Hall.', duration: 5 },
  ],
  tr_deep_memory: [
    { speaker: RETURNED, text: 'The clerk in the cage. In the future I remember, they opened the sluice under her at the ninth toll.', duration: 5 },
  ],
  tr_ledger_after: [
    { speaker: RETURNED, text: 'Dozens of times. He rang them dozens of times before the gates.', duration: 4.5 },
    { speaker: RETURNED, text: 'The defeat I remember was not where it began. It was only the latest price.', duration: 4.5 },
  ],
  tr_after_aurel: [
    { speaker: RETURNED, text: 'The lock on the bell is broken. Up the shaft it hangs silent, and the gilt is going out of its cracks.', duration: 5 },
  ],
};
registerDialogue(dialogue);

// ------------------------------------------------------------------ Hospice guest: Ione Tallow (merchant)

SHOP_STOCK.ione = [
  { itemId: 'bellbronze_scrap', stock: 3 },
  { itemId: 'tempered_scrap', stock: 6 },
  { itemId: 'ember_resin', stock: 6 },
  { itemId: 'throwing_knife', stock: 20 },
  { itemId: 'imprint_chain_whirl', stock: 1 },
  { itemId: 'imprint_pinning_shot', stock: 1, requiresFlag: 'boss.aurelmask' },
];

registerHospiceGuest({
  id: 'ione', name: 'Ione Tallow', look: 'tr_ione', idle: 'standPray',
  present: (ws) => ws.npcs.ione === 'rescued',
  greet: 'tr_ione_hospice_first', idlePool: 'tr_ione_hospice_idle', shop: 'ione',
});
