import { defineStore } from 'pinia'
import type { PlayerState } from '../types/player'
import type { SaveSlotId } from '../utils/storage'

export const defaultPlayerState = (): PlayerState => ({
  activeSaveSlot: null,
  metadata: {
    currentNodeId: 'n_start',
  },
  vitals: {
    hpCurrent: 20,
  },
  inventory: {
    currency: 10,
    items: {
      lockpick: 1,
    },
  },
  equipment: {
    mainHand: 'dagger_iron',
  },
  flags: {
    met_goblin: false,
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
      this.metadata.currentNodeId = 'n_start'
      this.activeSaveSlot = slotId
    },
    hydrate(state: PlayerState) {
      this.$patch(state)
    },
    navigateTo(nodeId: string) {
      this.metadata.currentNodeId = nodeId
    },
    adjustHp(amount: number) {
      this.vitals.hpCurrent = Math.max(0, this.vitals.hpCurrent + amount)
    },
    setFlag(key: string, value: boolean) {
      this.flags[key] = value
    },
    addItem(itemId: string, qty = 1) {
      const currentQty = this.inventory.items[itemId] ?? 0
      this.inventory.items[itemId] = currentQty + Math.max(1, qty)
    },
    removeItem(itemId: string, qty = 1) {
      const currentQty = this.inventory.items[itemId] ?? 0
      const nextQty = currentQty - Math.max(1, qty)
      if (nextQty <= 0) {
        delete this.inventory.items[itemId]
        return
      }

      this.inventory.items[itemId] = nextQty
    },
    adjustCurrency(amount: number) {
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
