import { GAME_CONFIG } from '../config'
import type { CharacterSheetPreset, PointBuyConfig } from '../types/characterSheet'

const defaultFlags = { ...GAME_CONFIG.player.startingFlags }

/** D&D ability score to framework modifier: floor((score - 10) / 2). */
function mod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Preset character sheets tuned for Death House: Midnight Rose. */
export const CHARACTER_SHEET_PRESETS: CharacterSheetPreset[] = [
  {
    id: 'char_wizard',
    name: 'Arannis Moonwhisper',
    description: 'A scholarly High Elf wizard preserving lore against the darkness of Barovia.',
    class: 'Wizard',
    startingLevel: 3,
    startingHp: 18,
    startingWeaponId: 'dagger_iron',
    startingArmorId: 'robe_scholar',
    startingItems: {
      dagger_iron: 1,
      robe_scholar: 1,
      spellbook: 1,
      health_potion: 1,
      torch_bundle: 1,
    },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(8), dexterity: mod(12), intelligence: mod(16) },
  },
  {
    id: 'char_paladin',
    name: 'Thonk the Pious',
    description: 'A Half-Orc paladin sworn to shield the innocent from undead and fiends.',
    class: 'Paladin',
    startingLevel: 3,
    startingHp: 24,
    startingWeaponId: 'greatsword_iron',
    startingArmorId: 'chainmail',
    startingItems: {
      greatsword_iron: 1,
      chainmail: 1,
      holy_symbol: 1,
      health_potion: 1,
      torch_bundle: 1,
    },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(16), dexterity: mod(10), intelligence: mod(8) },
  },
  {
    id: 'char_rogue',
    name: 'Lila Tealeaf',
    description: 'A Halfling rogue who survives cursed places with stealth, speed, and nerve.',
    class: 'Rogue',
    startingLevel: 3,
    startingHp: 20,
    startingWeaponId: 'blade_of_shadows',
    startingArmorId: 'leather_armor',
    startingItems: {
      blade_of_shadows: 1,
      leather_armor: 1,
      lockpick_set: 1,
      thieves_tools: 1,
      smoke_bomb: 2,
      torch_bundle: 1,
    },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(10), dexterity: mod(16), intelligence: mod(12) },
  },
  {
    id: 'char_cleric',
    name: 'Bofur Stonefist',
    description: 'A Dwarf cleric carrying hard-earned faith into the haunted halls of Death House.',
    class: 'Cleric',
    startingLevel: 3,
    startingHp: 22,
    startingWeaponId: 'mace_iron',
    startingArmorId: 'scale_mail',
    startingItems: {
      mace_iron: 1,
      scale_mail: 1,
      holy_symbol: 1,
      holy_water_dawn: 1,
      health_potion: 1,
      torch_bundle: 1,
    },
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
