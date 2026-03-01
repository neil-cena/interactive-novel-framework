import { GAME_CONFIG } from '../config'
import type { CharacterSheetPreset, PointBuyConfig } from '../types/characterSheet'

const defaultItems = { ...GAME_CONFIG.player.startingItems }
const defaultFlags = { ...GAME_CONFIG.player.startingFlags }

/** Preset character sheets. Balanced for 3rd–4th level equivalent survivability. */
export const CHARACTER_SHEET_PRESETS: CharacterSheetPreset[] = [
  {
    id: 'sturdy',
    name: 'Sturdy',
    description: 'High HP and strength. Can take a beating and hit hard.',
    startingHp: 42,
    startingWeaponId: GAME_CONFIG.player.startingWeaponId,
    startingItems: { ...defaultItems },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: 3, dexterity: 0, intelligence: 0 },
  },
  {
    id: 'agile',
    name: 'Agile',
    description: 'Dexterous and quick. Strikes first and dodges blows.',
    startingHp: 36,
    startingWeaponId: GAME_CONFIG.player.startingWeaponId,
    startingItems: { ...defaultItems },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: 0, dexterity: 4, intelligence: 0 },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Even spread of HP and attributes. Reliable all-rounder.',
    startingHp: 38,
    startingWeaponId: GAME_CONFIG.player.startingWeaponId,
    startingItems: { ...defaultItems },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: 1, dexterity: 2, intelligence: 1 },
  },
  {
    id: 'clever',
    name: 'Clever',
    description: 'Intelligence-focused. Better at skill checks and tactics.',
    startingHp: 34,
    startingWeaponId: GAME_CONFIG.player.startingWeaponId,
    startingItems: { ...defaultItems },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: 0, dexterity: 1, intelligence: 4 },
  },
]

/** Point-buy rules so custom builds match preset power level. */
export const POINT_BUY_CONFIG: PointBuyConfig = {
  attributeStart: 0,
  attributeMin: 0,
  attributeMax: 5,
  attributePointCosts: { strength: 1, dexterity: 1, intelligence: 1 },
  budget: 12,
  hpMin: 28,
  hpMax: 48,
  hpCostPerPoint: 1,
}

export function getPresetById(id: string): CharacterSheetPreset | undefined {
  return CHARACTER_SHEET_PRESETS.find((p) => p.id === id)
}
