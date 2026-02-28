import { GAME_CONFIG, type SaveSlotId } from '../config'
import type { PlayerState } from '../types/player'

export const SLOT_KEYS = GAME_CONFIG.save.slotKeys
export type { SaveSlotId }

type PersistedPlayerState = Omit<PlayerState, 'activeSaveSlot'>

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

export function isSaveSlotId(value: string): value is SaveSlotId {
  return SLOT_KEYS.includes(value as SaveSlotId)
}

function stripRuntimeState(state: PlayerState): PersistedPlayerState {
  const { activeSaveSlot: _activeSaveSlot, ...persisted } = state
  return persisted
}

export function getAllSaves(): Array<{ slotId: SaveSlotId; data: PlayerState | null }> {
  return SLOT_KEYS.map((slotId) => ({
    slotId,
    data: loadSave(slotId),
  }))
}

export function loadSave(slotId: SaveSlotId): PlayerState | null {
  const rawState = localStorage.getItem(slotId)
  if (!rawState) {
    return null
  }

  try {
    const parsed = JSON.parse(rawState) as PersistedPlayerState
    return {
      activeSaveSlot: null,
      ...parsed,
    }
  } catch (err) {
    console.error(
      '[storage] loadSave: failed to parse slot',
      slotId,
      'preview:',
      rawState.substring(0, 80) + (rawState.length > 80 ? '...' : ''),
      err,
    )
    return null
  }
}

export function saveGame(slotId: SaveSlotId, state: PlayerState): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }

  saveDebounceTimer = setTimeout(() => {
    localStorage.setItem(slotId, JSON.stringify(stripRuntimeState(state)))
  }, GAME_CONFIG.save.debounceDelayMs)
}

export function saveGameNow(slotId: SaveSlotId, state: PlayerState): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }

  localStorage.setItem(slotId, JSON.stringify(stripRuntimeState(state)))
}

export function deleteSave(slotId: SaveSlotId): void {
  localStorage.removeItem(slotId)
}
