export type ActionType =
  | 'set_flag'
  | 'adjust_hp'
  | 'add_item'
  | 'remove_item'
  | 'adjust_currency'
  | 'heal'

export interface ActionPayload {
  action: ActionType
  key?: string
  value?: string | boolean | number
  amount?: string | number
  itemId?: string
  qty?: number
}

export type VisibilityType = 'has_flag' | 'has_item' | 'stat_check'

export interface VisibilityRequirement {
  type: VisibilityType
  key?: string
  itemId?: string
  stat?: 'hpCurrent' | 'currency'
  operator?: '>=' | '<=' | '==' | '>' | '<'
  value?: number | boolean
}

export interface ChoiceOutcome {
  nextNodeId: string
}

export type ChoiceMechanic =
  | {
      type: 'navigate'
      nextNodeId: string
    }
  | {
      type: 'combat_init'
      encounterId: string
    }
  | {
      type: 'skill_check'
      dice: string
      dc: number
      attribute?: 'strength' | 'dexterity' | 'intelligence'
      onSuccess: ChoiceOutcome
      onFailure: ChoiceOutcome
      onFailureEncounterId?: string
    }

export interface Choice {
  id: string
  label: string
  visibilityRequirements?: VisibilityRequirement[]
  mechanic: ChoiceMechanic
}

export interface StoryNode {
  id: string
  type: 'narrative' | 'encounter' | 'ending'
  text: string
  onEnter?: ActionPayload[]
  choices?: Choice[]
}
