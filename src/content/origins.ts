/**
 * The six origins (GDD §5.2). The slice offers Household Knight and Court Mage; the other four
 * are shown as "Chronicle unwritten".
 * Kit entries are item ids (see ./items.ts), or `spell:<id>` for a known spell (see ./spells.ts).
 * Stackable kit items use KIT_COUNTS from ./items.ts.
 */
import type { OriginDef } from '../game/types';

export const ORIGINS: OriginDef[] = [
  {
    id: 'householdKnight', name: 'Household Knight', motto: 'Loyalty endures, even in ruin.',
    description: 'A sworn retainer of the royal Household, armoured in blackened steel and trained to stand between the crown and harm. Sturdy, patient and hard to break.',
    attributes: { vigor: 13, mind: 8, endurance: 12, strength: 13, dexterity: 11, intellect: 7, devotion: 9 },
    kit: [
      'retainer_sword', 'household_shield',
      'retainer_helm', 'retainer_harness', 'retainer_gauntlets', 'retainer_greaves',
      'recall_flask', 'recall_flask_focus', 'throwing_knife',
    ],
    available: true,
  },
  {
    id: 'courtMage', name: 'Court Mage', motto: 'Knowledge remembers differently.',
    description: 'A keeper of the court\'s records, taught the sorceries that were thought too useful to forget. Fragile up close, dangerous at a distance.',
    attributes: { vigor: 9, mind: 15, endurance: 9, strength: 8, dexterity: 10, intellect: 16, devotion: 8 },
    kit: [
      'court_staff', 'parrying_dirk',
      'court_hood', 'court_robes', 'court_gloves', 'court_boots',
      'spell:glinting_shard',
      'recall_flask', 'recall_flask_focus', 'throwing_knife',
    ],
    available: true,
  },
  {
    id: 'oathblade', name: 'Oathblade', motto: 'A vow sharper than life.',
    description: 'A duellist bound by a private vow, who rode ahead of the army to carry the king\'s word. Quick, precise and lightly armoured.',
    attributes: { vigor: 11, mind: 9, endurance: 12, strength: 10, dexterity: 15, intellect: 8, devotion: 8 },
    kit: [
      'oath_estoc', 'parrying_dirk',
      'oath_scarf', 'oath_coat', 'oath_bracers', 'oath_boots',
      'recall_flask', 'recall_flask_focus', 'throwing_knife',
    ],
    available: false,
  },
  {
    id: 'funeralPriest', name: 'Funeral Priest', motto: 'All things return. Not all rest.',
    description: 'A priest who rang the kingdom\'s dead into the ground and learned which of them would not stay. Rings bell rites and fights with a heavy mace.',
    attributes: { vigor: 11, mind: 13, endurance: 10, strength: 11, dexterity: 8, intellect: 7, devotion: 15 },
    kit: [
      'mourning_mace', 'hand_bell',
      'funeral_veil', 'funeral_vestments', 'funeral_gloves', 'funeral_boots',
      'spell:knell_of_rest',
      'recall_flask', 'recall_flask_focus',
    ],
    available: false,
  },
  {
    id: 'royalHuntsman', name: 'Royal Huntsman', motto: 'The wild still obeys.',
    description: 'A keeper of the king\'s forests, at home with bow and knife. Strikes from range and finishes up close.',
    attributes: { vigor: 10, mind: 9, endurance: 13, strength: 9, dexterity: 15, intellect: 9, devotion: 8 },
    kit: [
      'huntsman_bow', 'skinning_knife', 'bone_arrow',
      'huntsman_hat', 'huntsman_jerkin', 'huntsman_gloves', 'huntsman_boots',
      'recall_flask', 'recall_flask_focus',
    ],
    available: false,
  },
  {
    id: 'condemnedRetainer', name: 'Condemned Retainer', motto: 'Forgotten but unbroken.',
    description: 'A retainer struck from the rolls and chained in the yard cells for a crime no record names. Starts with little but strength and a length of chain.',
    attributes: { vigor: 14, mind: 7, endurance: 13, strength: 15, dexterity: 9, intellect: 7, devotion: 8 },
    kit: [
      'condemned_chain',
      'condemned_hood', 'condemned_rags', 'condemned_shackles', 'condemned_wraps',
      'recall_flask', 'recall_flask_focus',
    ],
    available: false,
  },
];
