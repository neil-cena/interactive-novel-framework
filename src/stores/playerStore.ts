import { defineStore } from 'pinia'
import { GAME_CONFIG } from '../config'
import type { PlayerState } from '../types/player'
import type { SaveSlotId } from '../utils/storage'

const { player: playerConfig } = GAME_CONFIG

export const defaultPlayerState = (): PlayerState => ({
  activeSaveSlot: null,
  metadata: {
    currentNodeId: playerConfig.startingNodeId,
  },
  vitals: {
    hpCurrent: playerConfig.startingHp,
  },
  inventory: {
    currency: playerConfig.startingCurrency,
    items: { ...playerConfig.startingItems },
  },
  equipment: {
    mainHand: playerConfig.startingWeaponId,
  },
  flags: {
    ...playerConfig.startingFlags,
  },
})

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => defaultPlayerState(),
  actions: {
    loadGame(slotId: SaveSlotId, savedState: PlayerState) {
      this.$patch(savedState)
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
      this.vitals.hpCurrent = Math.max(0, this.vitals.hpCurrent + amount)
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
    equipItem(slot: 'mainHand', itemId: string | null) {
      this.equipment[slot] = itemId
    },
    resetToDefaults() {
      this.$patch(defaultPlayerState())
    },
  },
})
