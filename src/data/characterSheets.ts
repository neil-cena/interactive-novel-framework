import { GAME_CONFIG } from '../config'
import type { CharacterSheetPreset, PointBuyConfig } from '../types/characterSheet'

const defaultFlags = { ...GAME_CONFIG.player.startingFlags }

/** D&D ability score to framework modifier: floor((score - 10) / 2). */
function mod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Preset character sheets (Balor Party / Sigil-style). */
export const CHARACTER_SHEET_PRESETS: CharacterSheetPreset[] = [
  {
    id: 'char_wizard',
    name: 'Arannis Moonwhisper',
    description: 'A scholarly High Elf wizard seeking the arcane secrets of Sigil.',
    class: 'Wizard',
    startingHp: 18,
    startingWeaponId: 'dagger_iron',
    startingArmorId: 'robe_scholar',
    startingItems: { health_potion: 1, robe_scholar: 1 },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(8), dexterity: mod(12), intelligence: mod(16) },
  },
  {
    id: 'char_paladin',
    name: 'Thonk the Pious',
    description: 'A Half-Orc Paladin who smites evil first and asks questions later.',
    class: 'Paladin',
    startingHp: 24,
    startingWeaponId: 'greatsword_iron',
    startingArmorId: 'chainmail',
    startingItems: { holy_symbol: 1, chainmail: 1 },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(16), dexterity: mod(10), intelligence: mod(8) },
  },
  {
    id: 'char_rogue',
    name: 'Lila Tealeaf',
    description: 'A Halfling Rogue with sticky fingers and a sharp wit.',
    class: 'Rogue',
    startingHp: 20,
    startingWeaponId: 'blade_of_shadows',
    startingArmorId: 'leather_armor',
    startingItems: { lockpick_set: 1, smoke_bomb: 2, leather_armor: 1 },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(10), dexterity: mod(16), intelligence: mod(12) },
  },
  {
    id: 'char_cleric',
    name: 'Bofur Stonefist',
    description: 'A Dwarf Cleric who believes healing is just delayed punching.',
    class: 'Cleric',
    startingHp: 22,
    startingWeaponId: 'mace_iron',
    startingArmorId: 'scale_mail',
    startingItems: { health_potion: 2, holy_symbol: 1, scale_mail: 1 },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(14), dexterity: mod(8), intelligence: mod(14) },
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
