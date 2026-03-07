/**
 * Action types are extensible via the plugin system.
 * Core provides 'set_flag'; plugins register additional types
 * (e.g. 'adjust_hp', 'add_item', 'heal').
 */
export type ActionType = string

export interface ActionPayload {
  action: ActionType
  key?: string
  value?: string | boolean | number
  amount?: string | number
  itemId?: string
  qty?: number
  [extra: string]: unknown
}

/**
 * Visibility condition types are extensible via the plugin system.
 * Core provides 'has_flag', 'not_has_flag', 'stat_check';
 * plugins register additional types (e.g. 'has_item').
 */
export type VisibilityType = string

export interface VisibilityRequirement {
  type: VisibilityType
  key?: string
  itemId?: string
  stat?: string
  operator?: '>=' | '<=' | '==' | '>' | '<'
  value?: number | boolean
  [extra: string]: unknown
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
      type: 'theater_begin'
      exitNodeId: string
    }
  | {
      type: 'feral_parliament_begin'
      exitNodeId: string
    }
  | {
      type: 'skill_check'
      dice: string
      dc: number
      attribute?: 'strength' | 'dexterity' | 'intelligence'
      /** Optional DnD skill id (e.g. acrobatics); adds proficiency bonus if player is proficient. */
      skillId?: string
      onSuccess: ChoiceOutcome
      onFailure: ChoiceOutcome
      onFailureEncounterId?: string
    }

export interface Choice {
  id: string
  label: string
  visibilityRequirements?: VisibilityRequirement[]
  /** Actions fired immediately when this choice is selected, before the mechanic executes. */
  onSelect?: ActionPayload[]
  mechanic: ChoiceMechanic
}

export interface StoryNode {
  id: string
  type: 'narrative' | 'encounter' | 'ending'
  text: string
  /** Optional image path (e.g. /images/... from public). */
  image?: string
  onEnter?: ActionPayload[]
  choices?: Choice[]
}
