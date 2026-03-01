import type { PlayerAttributes } from './player'

/** A selectable preset character sheet. */
export interface CharacterSheetPreset {
  id: string
  name: string
  description: string
  startingHp: number
  startingWeaponId: string | null
  startingItems: Record<string, number>
  startingFlags: Record<string, boolean>
  startingAttributes: PlayerAttributes
}

/** Point-buy configuration for custom character creation. */
export interface PointBuyConfig {
  /** Starting value for each attribute before spending. */
  attributeStart: number
  attributeMin: number
  attributeMax: number
  /** Cost in points to increase an attribute by 1 (e.g. strength: 1, dexterity: 1). */
  attributePointCosts: Record<keyof PlayerAttributes, number>
  /** Total points the player can spend on attributes + HP. */
  budget: number
  hpMin: number
  hpMax: number
  /** Cost per additional HP above hpMin (hpMin is the free baseline). */
  hpCostPerPoint: number
}

/** Payload when starting a new game: either a preset id or a custom build. */
export type CharacterSheetPayload =
  | { type: 'preset'; presetId: string }
  | {
      type: 'custom'
      startingHp: number
      startingWeaponId: string | null
      startingItems: Record<string, number>
      startingFlags: Record<string, boolean>
      startingAttributes: PlayerAttributes
    }
