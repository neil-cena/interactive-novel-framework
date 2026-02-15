import type { PlayerState } from '../types/player'

export const SLOT_KEYS = ['save_slot_1', 'save_slot_2', 'save_slot_3'] as const
export type SaveSlotId = (typeof SLOT_KEYS)[number]

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
  } catch {
    return null
  }
}

export function saveGame(slotId: SaveSlotId, state: PlayerState): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }

  saveDebounceTimer = setTimeout(() => {
    localStorage.setItem(slotId, JSON.stringify(stripRuntimeState(state)))
  }, 500)
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
