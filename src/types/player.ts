export interface PlayerMetadata {
  currentNodeId: string
  /** Id of selected preset, or undefined if legacy save / default. */
  characterSheetId?: string
  /** True when the run was started with a custom point-buy sheet. */
  isCustomSheet?: boolean
}

export interface PlayerVitals {
  hpCurrent: number
  hpMax: number
}

export interface PlayerInventory {
  currency: number
  items: Record<string, number>
}

export interface PlayerEquipment {
  mainHand: string | null
  armor: string | null
}

export interface PlayerAttributes {
  strength: number
  dexterity: number
  intelligence: number
}

export interface PlayerProgression {
  xp: number
  level: number
  xpToNextLevel: number
  unspentAttributePoints: number
}

export interface PlayerState {
  activeSaveSlot: string | null
  metadata: PlayerMetadata
  vitals: PlayerVitals
  inventory: PlayerInventory
  equipment: PlayerEquipment
  attributes: PlayerAttributes
  progression: PlayerProgression
  flags: Record<string, boolean>
}
