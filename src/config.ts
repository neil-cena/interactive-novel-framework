/**
 * Central game constants. Single source of truth for tunable values.
 */

export const GAME_CONFIG = {
  /** Player default state */
  player: {
    startingNodeId: 'n_start',
    startingHp: 20,
    startingCurrency: 10,
    startingWeaponId: 'dagger_iron',
    startingItems: { lockpick: 1 } as Record<string, number>,
    startingFlags: { met_goblin: false } as Record<string, boolean>,
    startingAttributes: { strength: 0, dexterity: 2, intelligence: 1 },
  },

  /** Leveling / progression */
  leveling: {
    startingLevel: 1,
    startingXp: 0,
    xpThresholds: [0, 100, 250, 500, 1000] as readonly number[],
    hpPerLevel: 5,
    attributePointsPerLevel: 1,
  },

  /** DnD-style skills (ability + optional proficiency) */
  skills: {
    proficiencyBonus: 2,
    list: [
      { id: 'acrobatics', name: 'Acrobatics', ability: 'dexterity' as const },
      { id: 'athletics', name: 'Athletics', ability: 'strength' as const },
      { id: 'animal_handling', name: 'Animal Handling', ability: 'intelligence' as const },
      { id: 'insight', name: 'Insight', ability: 'intelligence' as const },
      { id: 'perception', name: 'Perception', ability: 'intelligence' as const },
      { id: 'stealth', name: 'Stealth', ability: 'dexterity' as const },
      { id: 'investigation', name: 'Investigation', ability: 'intelligence' as const },
      { id: 'persuasion', name: 'Persuasion', ability: 'intelligence' as const },
      { id: 'sleight_of_hand', name: 'Sleight of Hand', ability: 'dexterity' as const },
    ] as readonly { id: string; name: string; ability: 'strength' | 'dexterity' | 'intelligence' }[],
  },

  /** Combat system */
  combat: {
    baseAc: 10,
    unarmedDamage: '1d2',
    attackRollDice: '1d20',
    enemyTurnDelayMs: 300,
  },

  /** Save system */
  save: {
    slotKeys: ['save_slot_1', 'save_slot_2', 'save_slot_3'] as const,
    debounceDelayMs: 500,
  },

  /** Feature flags (Phase 5 rollout controls) */
  features: {
    cloudSave: true,
    sharedOutcomes: true,
    storyPackages: true,
  },

  /** UI strings */
  ui: {
    gameTitle: 'The Cellar Debt',
  },
} as const

export type SaveSlotId = (typeof GAME_CONFIG.save.slotKeys)[number]
