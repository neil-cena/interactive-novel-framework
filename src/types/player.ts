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

export interface WorldState {
  vaelEnergy: number
  communityCost: number
  stateChaos: number
  districtStability: number
}

export interface ReputationState {
  scholarRep: number
  ceaRep: number
  freehandsRep: number
  workerRep: number
}

export interface PlayerProgression {
  xp: number
  level: number
  xpToNextLevel: number
  unspentAttributePoints: number
}

/** DnD-style: skill id -> whether the character is proficient. */
export type SkillsProficiency = Record<string, boolean>

/** One narrative choice picked by the player (QA / playtest trail). */
export interface ChoiceHistoryEntry {
  nodeId: string
  choiceId: string
  label: string
  mechanicType: string
}

export interface PlayerState {
  activeSaveSlot: string | null
  metadata: PlayerMetadata
  vitals: PlayerVitals
  inventory: PlayerInventory
  equipment: PlayerEquipment
  attributes: PlayerAttributes
  progression: PlayerProgression
  /** Skill proficiencies for DnD-style skill checks. */
  skillsProficiency: SkillsProficiency
  flags: Record<string, boolean>
  worldState: WorldState
  reputation: ReputationState
  /** Node IDs whose onEnter actions have already been executed this run. Persisted so save/load doesn't re-fire them. */
  visitedNodes: string[]
  /** Sequence of narrative choices taken this run (DEV-recorded for playtest; persisted with saves in dev). */
  choiceHistory: ChoiceHistoryEntry[]
}
