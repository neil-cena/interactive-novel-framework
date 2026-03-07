/**
 * Single implementation for applying a narrative choice (shared by NarrativeView and tests).
 */

import { GAME_CONFIG } from '../config'
import { resolveAction } from '../engine/actionResolver'
import { isChoiceVisible } from '../engine/visibilityResolver'
import { trackOutcomeEvent } from '../services/analyticsClient'
import { emitGameEvent } from '../services/events/gameEventBus'
import type { PluginRegistry } from '../plugins/registry'
import type { CharacterSheetPayload } from '../types/characterSheet'
import type { ChoiceHistoryEntry, PlayerState } from '../types/player'
import type { Choice, StoryNode } from '../types/story'
import { isSaveSlotId, type SaveSlotId } from '../utils/storage'

export type ApplyNarrativeChoicePlayerStore = {
  metadata: PlayerState['metadata']
  recordNarrativeChoice: (entry: ChoiceHistoryEntry) => void
  navigateTo: (nodeId: string) => void
  startNewGame: (slotId: SaveSlotId, payload?: CharacterSheetPayload) => void
  resetToDefaults: () => void
  activeSaveSlot: PlayerState['activeSaveSlot']
}

export type ApplyNarrativeChoiceNotify = (type: string, message: string, detail?: string) => void
export type ApplyNarrativeChoicePlaySfx = (id: string) => void

export type ApplyChoiceResult =
  | { kind: 'navigate' }
  | { kind: 'mechanic'; mechanicType: string }
  | { kind: 'unsupported'; mechanicType: string }

export function filterVisibleNarrativeChoices(
  choices: Choice[] | undefined,
  state: Pick<PlayerState, 'flags' | 'inventory' | 'vitals' | 'worldState'>,
): Choice[] {
  if (!choices?.length) return []
  return choices.filter((choice) => isChoiceVisible(choice.visibilityRequirements, state))
}

/**
 * Apply the same effects as the player selecting a choice in narrative mode.
 */
export type ApplyNarrativeChoiceCoreCtx = {
  playerStore: ApplyNarrativeChoicePlayerStore
  currentNode: StoryNode | undefined
  registry: Pick<PluginRegistry, 'mechanics'>
  startGameMode: (mode: string, data?: Record<string, unknown>) => void
  notify: ApplyNarrativeChoiceNotify
  playSfx: ApplyNarrativeChoicePlaySfx
  /**
   * When true, skips mechanic `trackOutcome` analytics only inside core; outer wrapper still skips bus/history.
   */
  suppressSideEffects?: boolean
}

/**
 * Narrative transition only (onSelect → navigate/mechanic/unsupported). Tests should prefer this when paired
 * with an explicit side-effect policy; `applyNarrativeChoice` wraps with real-player telemetry.
 */
export function applyNarrativeChoiceCore(choice: Choice, ctx: ApplyNarrativeChoiceCoreCtx): ApplyChoiceResult {
  const { playerStore, currentNode, registry, startGameMode, notify, playSfx } = ctx
  const suppress = ctx.suppressSideEffects === true

  if (choice.onSelect) {
    choice.onSelect.forEach((payload) => resolveAction(payload, playerStore as never))
  }

  if (choice.mechanic.type === 'navigate') {
    const shouldStartNewRun =
      choice.mechanic.nextNodeId === GAME_CONFIG.player.startingNodeId &&
      currentNode?.id !== GAME_CONFIG.player.startingNodeId
    if (shouldStartNewRun) {
      if (playerStore.activeSaveSlot && isSaveSlotId(playerStore.activeSaveSlot)) {
        playerStore.startNewGame(playerStore.activeSaveSlot)
      } else {
        playerStore.resetToDefaults()
      }
      return { kind: 'navigate' }
    }

    playerStore.navigateTo(choice.mechanic.nextNodeId)
    return { kind: 'navigate' }
  }

  const handler = registry.mechanics[choice.mechanic.type]
  if (handler) {
    handler(choice.mechanic as unknown as Record<string, unknown>, {
      playerStore: playerStore as never,
      currentNodeId: playerStore.metadata.currentNodeId,
      choiceId: choice.id,
      navigateTo: (nodeId: string) => playerStore.navigateTo(nodeId),
      startGameMode: (mode: string, data?: Record<string, unknown>) => startGameMode(mode, data),
      notify: (type: string, message: string, detail?: string) => notify(type, message, detail),
      playSfx: (id: string) => playSfx(id),
      trackOutcome: (type: string, metadata?: Record<string, unknown>) => {
        if (suppress) return
        trackOutcomeEvent({
          storyId: 'default',
          type: type as never,
          ts: Date.now(),
          metadata: metadata as never,
        })
      },
    })
    return { kind: 'mechanic', mechanicType: choice.mechanic.type }
  }

  console.warn(`[applyNarrativeChoice] No handler for mechanic type: "${choice.mechanic.type}"`)
  return { kind: 'unsupported', mechanicType: choice.mechanic.type }
}

export function applyNarrativeChoice(
  choice: Choice,
  ctx: {
    playerStore: ApplyNarrativeChoicePlayerStore
    currentNode: StoryNode | undefined
    registry: Pick<PluginRegistry, 'mechanics'>
    startGameMode: (mode: string, data?: Record<string, unknown>) => void
    notify: ApplyNarrativeChoiceNotify
    playSfx: ApplyNarrativeChoicePlaySfx
    /**
     * When true, skips DEV choice history, game bus, and analytics (including mechanic `trackOutcome`).
     * Use in tests when those side effects must be suppressed; default path must match real play.
     */
    suppressSideEffects?: boolean
  },
): ApplyChoiceResult {
  const { playerStore, registry, startGameMode, notify, playSfx } = ctx
  const suppress = ctx.suppressSideEffects === true

  if (import.meta.env.DEV && !suppress) {
    playerStore.recordNarrativeChoice({
      nodeId: playerStore.metadata.currentNodeId,
      choiceId: choice.id,
      label: choice.label,
      mechanicType: choice.mechanic.type,
    })
  }

  if (!suppress) {
    emitGameEvent('choiceSelected', {
      nodeId: playerStore.metadata.currentNodeId,
      choiceId: choice.id,
    })
    trackOutcomeEvent({
      storyId: 'default',
      type: 'choice_selected',
      ts: Date.now(),
      metadata: {
        nodeId: playerStore.metadata.currentNodeId,
        choiceId: choice.id,
        mechanicType: choice.mechanic.type,
      },
    })
  }

  return applyNarrativeChoiceCore(choice, {
    playerStore,
    currentNode: ctx.currentNode,
    registry,
    startGameMode,
    notify,
    playSfx,
    suppressSideEffects: ctx.suppressSideEffects,
  })
}
