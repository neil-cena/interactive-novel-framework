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

  /** UI strings */
  ui: {
    gameTitle: 'The Cellar Debt',
  },
} as const

export type SaveSlotId = (typeof GAME_CONFIG.save.slotKeys)[number]
