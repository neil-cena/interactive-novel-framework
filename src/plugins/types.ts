import type { Component } from 'vue'

export interface ActionContext {
  store: {
    setFlag: (key: string, value: boolean) => void
    adjustHp: (amount: number) => void
    addItem: (itemId: string, qty?: number) => void
    removeItem: (itemId: string, qty?: number) => void
    adjustCurrency: (amount: number) => void
    [key: string]: unknown
  }
}

export type ActionHandler = (
  payload: Record<string, unknown>,
  ctx: ActionContext,
) => { type: string; value?: number }

export type ConditionEvaluator = (
  requirement: Record<string, unknown>,
  state: Record<string, unknown>,
) => boolean

export interface MechanicContext {
  playerStore: ActionContext['store'] & {
    metadata: { currentNodeId: string }
    attributes: Record<string, number>
    skillsProficiency: Record<string, boolean>
    navigateTo: (nodeId: string) => void
    [key: string]: unknown
  }
  currentNodeId: string
  choiceId: string
  navigateTo: (nodeId: string) => void
  startGameMode: (mode: string, data?: Record<string, unknown>) => void
  notify: (type: string, message: string, detail?: string) => void
  playSfx: (id: string) => void
  trackOutcome: (type: string, metadata?: Record<string, unknown>) => void
}

export type MechanicHandler = (
  mechanic: Record<string, unknown>,
  ctx: MechanicContext,
) => void

export interface FrameworkPlugin {
  id: string

  /** Partial player state defaults this plugin contributes. */
  playerStateDefaults?: () => Record<string, unknown>

  /** Action handlers keyed by action type (e.g. 'adjust_hp'). */
  actions?: Record<string, ActionHandler>

  /** Visibility condition evaluators keyed by condition type (e.g. 'has_item'). */
  conditions?: Record<string, ConditionEvaluator>

  /** Mechanic handlers keyed by mechanic type (e.g. 'combat_init'). */
  mechanics?: Record<string, MechanicHandler>

  /** Game mode components keyed by mode name (e.g. 'combat' → CombatMode). */
  gameModes?: Record<string, Component>

  /** Component shown during new-game flow (e.g. character sheet picker). */
  newGameComponent?: Component

  /** Per-plugin configuration. */
  config?: Record<string, unknown>
}
