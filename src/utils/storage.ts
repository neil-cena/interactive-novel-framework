import { GAME_CONFIG, type SaveSlotId } from '../config'
import type { PlayerState } from '../types/player'
import { deleteCloudSave, getSaveSyncState, queueCloudSave, resolveCloudConflict, syncQueuedCloudSaves, toPersistedState } from '../services/saveRepository'
import type { SaveConflict, SaveMergeChoice, SaveSyncState } from '../types/cloud'

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
    const persisted = stripRuntimeState(state)
    localStorage.setItem(slotId, JSON.stringify(persisted))
    void queueCloudSave(slotId, toPersistedState({ activeSaveSlot: state.activeSaveSlot, ...persisted }))
  }, GAME_CONFIG.save.debounceDelayMs)
}

export function saveGameNow(slotId: SaveSlotId, state: PlayerState): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }

  const persisted = stripRuntimeState(state)
  localStorage.setItem(slotId, JSON.stringify(persisted))
  void queueCloudSave(slotId, toPersistedState({ activeSaveSlot: state.activeSaveSlot, ...persisted }))
}

export async function deleteSave(slotId: SaveSlotId): Promise<void> {
  await deleteCloudSave(slotId)
  localStorage.removeItem(slotId)
}

export async function syncCloudSavesNow(): Promise<void> {
  await syncQueuedCloudSaves()
}

export function getSlotSyncState(slotId: SaveSlotId): SaveSyncState {
  return getSaveSyncState(slotId)
}

export async function resolveSlotConflict(conflict: SaveConflict, choice: SaveMergeChoice): Promise<void> {
  await resolveCloudConflict(conflict, choice)
}
