import { GAME_CONFIG } from '../config'
import type { CharacterSheetPreset, PointBuyConfig } from '../types/characterSheet'

const defaultFlags = { ...GAME_CONFIG.player.startingFlags }

/** D&D ability score to framework modifier: floor((score - 10) / 2). */
function mod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Preset character sheets tuned for mechanics-heavy trial stories. */
export const CHARACTER_SHEET_PRESETS: CharacterSheetPreset[] = [
  {
    id: 'char_wizard',
    name: 'Arannis Moonwhisper',
    description: 'Controller/caster profile with high knowledge utility and social leverage.',
    class: 'Wizard',
    startingLevel: 4,
    startingHp: 19,
    startingWeaponId: 'dagger_iron',
    startingArmorId: 'robe_scholar',
    startingItems: {
      dagger_iron: 1,
      robe_scholar: 1,
      spellbook: 1,
      health_potion: 2,
      torch_bundle: 1,
    },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(8), dexterity: mod(12), intelligence: mod(17) },
    startingProficiencies: {
      investigation: true,
      insight: true,
      perception: true,
      persuasion: true,
    },
  },
  {
    id: 'char_paladin',
    name: 'Thonk the Pious',
    description: 'Frontline tank profile with strong survivability and forceful route control.',
    class: 'Paladin',
    startingLevel: 4,
    startingHp: 26,
    startingWeaponId: 'greatsword_iron',
    startingArmorId: 'chainmail',
    startingItems: {
      greatsword_iron: 1,
      chainmail: 1,
      holy_symbol: 1,
      health_potion: 1,
      holy_water_dawn: 1,
      torch_bundle: 1,
    },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(17), dexterity: mod(10), intelligence: mod(9) },
    startingProficiencies: {
      athletics: true,
      animal_handling: true,
      insight: true,
    },
  },
  {
    id: 'char_rogue',
    name: 'Lila Tealeaf',
    description: 'Skill specialist profile for stealth, traversal, lockwork, and scouting routes.',
    class: 'Rogue',
    startingLevel: 4,
    startingHp: 21,
    startingWeaponId: 'blade_of_shadows',
    startingArmorId: 'leather_armor',
    startingItems: {
      blade_of_shadows: 1,
      leather_armor: 1,
      lockpick_set: 1,
      thieves_tools: 1,
      smoke_bomb: 2,
      health_potion: 1,
      torch_bundle: 1,
    },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(10), dexterity: mod(17), intelligence: mod(12) },
    startingProficiencies: {
      acrobatics: true,
      stealth: true,
      sleight_of_hand: true,
      perception: true,
    },
  },
  {
    id: 'char_cleric',
    name: 'Bofur Stonefist',
    description: 'Hybrid support profile with durable armor, healing utility, and steady checks.',
    class: 'Cleric',
    startingLevel: 4,
    startingHp: 24,
    startingWeaponId: 'mace_iron',
    startingArmorId: 'scale_mail',
    startingItems: {
      mace_iron: 1,
      scale_mail: 1,
      holy_symbol: 1,
      holy_water_dawn: 1,
      health_potion: 2,
      torch_bundle: 1,
    },
    startingFlags: { ...defaultFlags },
    startingAttributes: { strength: mod(14), dexterity: mod(9), intelligence: mod(15) },
    startingProficiencies: {
      insight: true,
      persuasion: true,
      perception: true,
      animal_handling: true,
    },
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
