export interface PlayerMetadata {
  currentNodeId: string
}

export interface PlayerVitals {
  hpCurrent: number
}

export interface PlayerInventory {
  currency: number
  items: Record<string, number>
}

export interface PlayerEquipment {
  mainHand: string | null
}

export interface PlayerState {
  activeSaveSlot: string | null
  metadata: PlayerMetadata
  vitals: PlayerVitals
  inventory: PlayerInventory
  equipment: PlayerEquipment
  flags: Record<string, boolean>
}
