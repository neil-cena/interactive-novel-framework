import { defineStore } from 'pinia'
import { GAME_CONFIG } from '../config'
import type { PlayerAttributes, PlayerState } from '../types/player'
import type { SaveSlotId } from '../utils/storage'

const { player: playerConfig, leveling: levelConfig } = GAME_CONFIG

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
  flags: {
    ...playerConfig.startingFlags,
  },
})

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
        inventory: { ...defaults.inventory, ...savedState.inventory },
        equipment: { ...defaults.equipment, ...savedState.equipment },
        attributes: { ...defaults.attributes, ...savedState.attributes },
        progression: { ...defaults.progression, ...savedState.progression },
        flags: { ...defaults.flags, ...savedState.flags },
      }
      this.$patch(merged)
      this.activeSaveSlot = slotId
    },
    startNewGame(slotId: SaveSlotId) {
      this.$reset()
      this.metadata.currentNodeId = playerConfig.startingNodeId
      this.activeSaveSlot = slotId
    },
    hydrate(state: PlayerState) {
      this.$patch(state)
    },
    navigateTo(nodeId: string) {
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
    equipItem(slot: 'mainHand', itemId: string | null) {
      this.equipment[slot] = itemId
    },
    resetToDefaults() {
      this.$patch(defaultPlayerState())
    },
  },
})
