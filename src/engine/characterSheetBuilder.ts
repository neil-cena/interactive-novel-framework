import { GAME_CONFIG } from '../config'
import type { CharacterSheetPayload, PointBuyConfig } from '../types/characterSheet'
import type { PlayerAttributes } from '../types/player'

export interface PointBuySpend {
  attributeSpend: number
  hpSpend: number
  totalSpend: number
  remaining: number
}

export interface PointBuyValidation {
  valid: boolean
  errors: string[]
}

/**
 * Compute total point spend and remaining budget for a custom build.
 */
export function computePointBuySpend(
  attributes: PlayerAttributes,
  hp: number,
  config: PointBuyConfig,
): PointBuySpend {
  let attributeSpend = 0
  const attrs: (keyof PlayerAttributes)[] = ['strength', 'dexterity', 'intelligence']
  for (const attr of attrs) {
    const delta = (attributes[attr] ?? config.attributeStart) - config.attributeStart
    if (delta > 0) {
      attributeSpend += delta * (config.attributePointCosts[attr] ?? 1)
    }
  }
  const hpAboveMin = Math.max(0, hp - config.hpMin)
  const hpSpend = hpAboveMin * config.hpCostPerPoint
  const totalSpend = attributeSpend + hpSpend
  const remaining = Math.max(0, config.budget - totalSpend)
  return { attributeSpend, hpSpend, totalSpend, remaining }
}

/**
 * Validate that a custom build is within point-buy rules.
 */
export function validatePointBuy(
  attributes: PlayerAttributes,
  hp: number,
  config: PointBuyConfig,
): PointBuyValidation {
  const errors: string[] = []
  const attrs: (keyof PlayerAttributes)[] = ['strength', 'dexterity', 'intelligence']

  for (const attr of attrs) {
    const v = attributes[attr] ?? config.attributeStart
    if (v < config.attributeMin) errors.push(`${attr} cannot be below ${config.attributeMin}`)
    if (v > config.attributeMax) errors.push(`${attr} cannot exceed ${config.attributeMax}`)
  }
  if (hp < config.hpMin) errors.push(`HP cannot be below ${config.hpMin}`)
  if (hp > config.hpMax) errors.push(`HP cannot exceed ${config.hpMax}`)

  const { totalSpend, remaining } = computePointBuySpend(attributes, hp, config)
  if (totalSpend > config.budget) errors.push(`Over budget by ${totalSpend - config.budget} points`)

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Build a CharacterSheetPayload (custom) from validated point-buy choices.
 * Uses config defaults for items, flags, and weapon.
 */
export function buildCustomSheetPayload(
  attributes: PlayerAttributes,
  hp: number,
): CharacterSheetPayload {
  return {
    type: 'custom',
    startingHp: hp,
    startingWeaponId: GAME_CONFIG.player.startingWeaponId,
    startingItems: { ...GAME_CONFIG.player.startingItems },
    startingFlags: { ...GAME_CONFIG.player.startingFlags },
    startingAttributes: { ...attributes },
  }
}
