import { defineStore } from 'pinia'
import { GAME_CONFIG } from '../config'
import { getPresetById } from '../data/characterSheets'
import type { CharacterSheetPayload } from '../types/characterSheet'
import type {
  ChoiceHistoryEntry,
  PlayerAttributes,
  PlayerState,
  WorldState,
  ReputationState,
} from '../types/player'
import type { SaveSlotId } from '../utils/storage'

const { player: playerConfig, leveling: levelConfig } = GAME_CONFIG

function clampStartingLevel(level: number | undefined): number {
  const maxLevel = levelConfig.xpThresholds.length - 1
  const safe = Number.isFinite(level) ? Math.floor(level as number) : levelConfig.startingLevel
  return Math.max(levelConfig.startingLevel, Math.min(maxLevel, safe))
}

function buildProgressionForLevel(level: number) {
  const currentLevel = clampStartingLevel(level)
  const xpIndex = Math.max(0, currentLevel - 1)
  const xp = levelConfig.xpThresholds[xpIndex] ?? levelConfig.startingXp
  const xpToNextLevel = levelConfig.xpThresholds[currentLevel] ?? Infinity
  const unspentAttributePoints =
    Math.max(0, currentLevel - levelConfig.startingLevel) * levelConfig.attributePointsPerLevel
  return {
    xp,
    level: currentLevel,
    xpToNextLevel,
    unspentAttributePoints,
  }
}

export const defaultPlayerState = (): PlayerState => ({
  activeSaveSlot: null,
  metadata: {
    currentNodeId: playerConfig.startingNodeId,
  },
  vitals: {
    hpCurrent: playerConfig.startingHp,
    hpMax: playerConfig.startingHp,
  },
  inventory: {
    currency: playerConfig.startingCurrency,
    items: { ...playerConfig.startingItems },
  },
  equipment: {
    mainHand: playerConfig.startingWeaponId,
    armor: null,
  },
  attributes: {
    ...playerConfig.startingAttributes,
  },
  progression: {
    xp: levelConfig.startingXp,
    level: levelConfig.startingLevel,
    xpToNextLevel: levelConfig.xpThresholds[1] ?? 100,
    unspentAttributePoints: 0,
  },
  skillsProficiency: {},
  flags: {
    ...playerConfig.startingFlags,
  },
  worldState: {
    vaelEnergy: 100,
    communityCost: 20,
    stateChaos: 10,
    districtStability: 65,
  },
  reputation: {
    scholarRep: 60,
    ceaRep: 30,
    freehandsRep: 20,
    workerRep: 20,
  },
  visitedNodes: [],
  choiceHistory: [],
})

/** Build initial state from a selected character sheet (preset or custom). */
export function playerStateFromSheet(payload: CharacterSheetPayload): PlayerState {
  const base = defaultPlayerState()
  if (payload.type === 'preset') {
    const preset = getPresetById(payload.presetId)
    if (!preset) return base
    const startingLevel = clampStartingLevel(preset.startingLevel)
    const hpScaled = preset.startingHp + (startingLevel - 1) * levelConfig.hpPerLevel
    return {
      ...base,
      metadata: {
        ...base.metadata,
        characterSheetId: preset.id,
        isCustomSheet: false,
      },
      vitals: {
        hpCurrent: hpScaled,
        hpMax: hpScaled,
      },
      inventory: {
        ...base.inventory,
        items: { ...preset.startingItems },
      },
      equipment: {
        mainHand: preset.startingWeaponId,
        armor: preset.startingArmorId ?? null,
      },
      attributes: { ...preset.startingAttributes },
      progression: buildProgressionForLevel(startingLevel),
      skillsProficiency: { ...(preset.startingProficiencies ?? {}) },
      flags: { ...preset.startingFlags },
      worldState: { ...base.worldState },
      reputation: { ...base.reputation },
    }
  }
  return {
    ...base,
    metadata: {
      ...base.metadata,
      characterSheetId: undefined,
      isCustomSheet: true,
    },
    vitals: {
      hpCurrent: payload.startingHp,
      hpMax: payload.startingHp,
    },
    inventory: {
      ...base.inventory,
      items: { ...payload.startingItems },
    },
    equipment: {
      mainHand: payload.startingWeaponId,
      armor: payload.startingArmorId ?? null,
    },
    attributes: { ...payload.startingAttributes },
    skillsProficiency: { ...(payload.startingProficiencies ?? {}) },
    flags: { ...payload.startingFlags },
    worldState: { ...base.worldState },
    reputation: { ...base.reputation },
  }
}

/**
 * Fully replaces every property of the Pinia state to avoid the deep-merge
 * behaviour of $patch(object), which accumulates keys in nested objects
 * (e.g. inventory.items) instead of replacing them.
 */
function applyFullReset(state: PlayerState, next: PlayerState): void {
  state.activeSaveSlot = next.activeSaveSlot
  state.metadata = { ...next.metadata }
  state.vitals = { ...next.vitals }
  state.inventory = {
    currency: next.inventory.currency,
    items: { ...next.inventory.items },
  }
  state.equipment = { ...next.equipment }
  state.attributes = { ...next.attributes }
  state.progression = { ...next.progression }
  state.skillsProficiency = { ...next.skillsProficiency }
  state.flags = { ...next.flags }
  state.worldState = { ...next.worldState }
  state.reputation = { ...next.reputation }
  state.visitedNodes = Array.isArray(next.visitedNodes) ? [...next.visitedNodes] : []
  state.choiceHistory = Array.isArray(next.choiceHistory) ? [...next.choiceHistory] : []
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => defaultPlayerState(),
  actions: {
    loadGame(slotId: SaveSlotId, savedState: Partial<PlayerState>) {
      const defaults = defaultPlayerState()
      const merged: PlayerState = {
        ...defaults,
        ...savedState,
        metadata: { ...defaults.metadata, ...savedState.metadata },
        vitals: { ...defaults.vitals, ...savedState.vitals },
        inventory: {
          currency: savedState.inventory?.currency ?? defaults.inventory.currency,
          items: { ...(savedState.inventory?.items ?? defaults.inventory.items) },
        },
        equipment: { ...defaults.equipment, ...savedState.equipment },
        attributes: { ...defaults.attributes, ...savedState.attributes },
        progression: { ...defaults.progression, ...savedState.progression },
        skillsProficiency: { ...(savedState.skillsProficiency ?? defaults.skillsProficiency) },
        flags: { ...(savedState.flags ?? defaults.flags) },
        worldState: { ...defaults.worldState, ...savedState.worldState },
        reputation: { ...defaults.reputation, ...savedState.reputation },
        visitedNodes: Array.isArray(savedState.visitedNodes) ? [...savedState.visitedNodes] : [],
        choiceHistory: Array.isArray(savedState.choiceHistory) ? [...savedState.choiceHistory] : [],
      }
      this.$patch((state) => applyFullReset(state as PlayerState, merged))
      this.activeSaveSlot = slotId
    },
    startNewGame(slotId: SaveSlotId, payload?: CharacterSheetPayload) {
      const newState = payload ? playerStateFromSheet(payload) : defaultPlayerState()
      this.$patch((state) => applyFullReset(state as PlayerState, newState))
      this.metadata.currentNodeId = playerConfig.startingNodeId
      this.activeSaveSlot = slotId
    },
    hydrate(newState: PlayerState) {
      this.$patch((state) => applyFullReset(state as PlayerState, newState))
    },
    navigateTo(nodeId: string) {
      if (nodeId === 'meet_elara' && this.visitedNodes.includes('meet_elara')) {
        if (this.flags.elara_met !== true) {
          this.setFlag('elara_met', true)
        }
        this.metadata.currentNodeId = 'elara_basement_return'
        return
      }
      this.metadata.currentNodeId = nodeId
    },
    adjustHp(amount: number) {
      if (!Number.isFinite(amount)) {
        console.warn('[playerStore] adjustHp: invalid amount', amount)
        return
      }
      this.vitals.hpCurrent = Math.max(0, Math.min(this.vitals.hpCurrent + amount, this.vitals.hpMax))
    },
    increaseMaxHp(amount: number) {
      if (!Number.isFinite(amount) || amount <= 0) {
        console.warn('[playerStore] increaseMaxHp: invalid amount', amount)
        return
      }
      this.vitals.hpMax += amount
      this.vitals.hpCurrent += amount
    },
    setFlag(key: string, value: boolean) {
      this.flags[key] = value
    },
    addItem(itemId: string, qty = 1) {
      const safeQty = Number.isFinite(qty) ? Math.max(1, qty) : 1
      const currentQty = this.inventory.items[itemId] ?? 0
      this.inventory.items[itemId] = currentQty + safeQty
    },
    removeItem(itemId: string, qty = 1) {
      const safeQty = Number.isFinite(qty) ? Math.max(1, qty) : 1
      const currentQty = this.inventory.items[itemId] ?? 0
      const nextQty = currentQty - safeQty
      if (nextQty <= 0) {
        delete this.inventory.items[itemId]
        return
      }

      this.inventory.items[itemId] = nextQty
    },
    adjustCurrency(amount: number) {
      if (!Number.isFinite(amount)) {
        console.warn('[playerStore] adjustCurrency: invalid amount', amount)
        return
      }
      this.inventory.currency = Math.max(0, this.inventory.currency + amount)
    },
    adjustAttribute(attr: keyof PlayerAttributes, amount: number) {
      if (!Number.isFinite(amount)) {
        console.warn('[playerStore] adjustAttribute: invalid amount', amount)
        return
      }
      this.attributes[attr] += amount
    },
    awardXp(amount: number): boolean {
      if (!Number.isFinite(amount) || amount <= 0) return false
      this.progression.xp += amount
      let leveled = false
      const maxLevel = levelConfig.xpThresholds.length - 1
      while (
        this.progression.level < maxLevel &&
        this.progression.xp >= this.progression.xpToNextLevel
      ) {
        this.progression.level += 1
        this.increaseMaxHp(levelConfig.hpPerLevel)
        this.progression.unspentAttributePoints += levelConfig.attributePointsPerLevel
        const nextIdx = this.progression.level + 1
        this.progression.xpToNextLevel =
          nextIdx < levelConfig.xpThresholds.length
            ? (levelConfig.xpThresholds[nextIdx] ?? Infinity)
            : Infinity
        leveled = true
      }
      return leveled
    },
    spendAttributePoint(attr: keyof PlayerAttributes) {
      if (this.progression.unspentAttributePoints <= 0) return
      this.attributes[attr] += 1
      this.progression.unspentAttributePoints -= 1
    },
    setSkillProficiency(skillId: string, proficient: boolean) {
      if (proficient) {
        this.skillsProficiency[skillId] = true
      } else {
        delete this.skillsProficiency[skillId]
      }
    },
    equipItem(slot: 'mainHand' | 'armor', itemId: string | null) {
      this.equipment[slot] = itemId
    },
    adjustWorldState(stat: keyof WorldState, amount: number) {
      if (!Number.isFinite(amount)) {
        console.warn('[playerStore] adjustWorldState: invalid amount', amount)
        return
      }
      const current = this.worldState[stat]
      this.worldState[stat] = Math.max(0, Math.min(100, current + amount))
    },
    adjustReputation(stat: keyof ReputationState, amount: number) {
      if (!Number.isFinite(amount)) {
        console.warn('[playerStore] adjustReputation: invalid amount', amount)
        return
      }
      const current = this.reputation[stat]
      this.reputation[stat] = Math.max(0, Math.min(100, current + amount))
    },
    markNodeVisited(nodeId: string) {
      if (!this.visitedNodes.includes(nodeId)) {
        this.visitedNodes.push(nodeId)
      }
    },
    recordNarrativeChoice(entry: ChoiceHistoryEntry) {
      this.choiceHistory.push(entry)
    },
    resetToDefaults() {
      this.$patch((state) => applyFullReset(state as PlayerState, defaultPlayerState()))
    },
  },
})
