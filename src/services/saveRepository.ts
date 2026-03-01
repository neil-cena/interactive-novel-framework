import { GAME_CONFIG, type SaveSlotId } from '../config'
import type {
  CloudSaveDocument,
  PersistedPlayerState,
  SaveConflict,
  SaveMergeChoice,
  SaveSyncState,
} from '../types/cloud'
import { getProviders } from './providers/providerFactory'
import { enqueueSaveWrite, getQueuedSaveWrites, clearQueuedSaveWrites } from './sync/offlineQueue'

const syncStates = new Map<SaveSlotId, SaveSyncState>()

function nowIso(): string {
  return new Date().toISOString()
}

export function getCurrentUserId(): string | null {
  const raw = localStorage.getItem('phase5_auth_session')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { userId?: string }
    return parsed.userId ?? null
  } catch {
    return null
  }
}

export function toPersistedState(state: { activeSaveSlot: string | null } & PersistedPlayerState): PersistedPlayerState {
  const { activeSaveSlot: _activeSaveSlot, ...persisted } = state
  return persisted
}

function setSyncState(slotId: SaveSlotId, patch: Partial<SaveSyncState>): void {
  const prev = syncStates.get(slotId) ?? { slotId, status: 'synced' as const }
  syncStates.set(slotId, { ...prev, ...patch, slotId })
}

export function getSaveSyncState(slotId: SaveSlotId): SaveSyncState {
  return syncStates.get(slotId) ?? { slotId, status: 'synced' }
}

export async function queueCloudSave(slotId: SaveSlotId, data: PersistedPlayerState): Promise<void> {
  const userId = getCurrentUserId()
  if (!userId) {
    setSyncState(slotId, { status: 'synced', message: 'Offline/local mode' })
    return
  }
  enqueueSaveWrite({ userId, slotId, data, enqueuedAt: nowIso() })
  setSyncState(slotId, { status: 'pending', message: 'Pending cloud sync' })
}

export async function syncQueuedCloudSaves(): Promise<void> {
  const userId = getCurrentUserId()
  if (!userId) return
  const { saveProvider } = getProviders()
  const queued = getQueuedSaveWrites()
  if (queued.length === 0) return
  for (const queuedWrite of queued) {
    const current = await saveProvider.getSave(userId, queuedWrite.slotId)
    const nextDoc: CloudSaveDocument = {
      slotId: queuedWrite.slotId,
      userId,
      data: queuedWrite.data,
      revision: (current?.revision ?? 0) + 1,
      updatedAt: nowIso(),
      source: 'cloud',
    }
    const result = await saveProvider.upsertSave(nextDoc, { expectedRevision: current?.revision ?? null })
    if (!result.ok && result.conflict) {
      const conflict: SaveConflict = {
        slotId: queuedWrite.slotId,
        local: {
          slotId: queuedWrite.slotId,
          userId,
          data: queuedWrite.data,
          revision: current?.revision ?? 0,
          updatedAt: queuedWrite.enqueuedAt,
          source: 'local',
        },
        cloud: result.conflict,
      }
      setSyncState(queuedWrite.slotId, { status: 'conflict', conflict, message: 'Cloud conflict detected' })
      continue
    }
    setSyncState(queuedWrite.slotId, { status: 'synced', updatedAt: nextDoc.updatedAt, message: 'Synced' })
  }
  clearQueuedSaveWrites()
}

export async function resolveCloudConflict(conflict: SaveConflict, choice: SaveMergeChoice): Promise<void> {
  const { saveProvider } = getProviders()
  const userId = conflict.cloud.userId
  if (choice === 'keep_both') {
    const copySlot = GAME_CONFIG.save.slotKeys.find((id) => id !== conflict.slotId)
    if (copySlot) {
      const copyDoc: CloudSaveDocument = {
        ...conflict.local,
        slotId: copySlot,
        revision: conflict.cloud.revision + 1,
        updatedAt: nowIso(),
        source: 'cloud',
      }
      await saveProvider.upsertSave(copyDoc)
      setSyncState(copySlot, { status: 'synced', updatedAt: copyDoc.updatedAt, message: 'Synced as copy' })
    }
  } else if (choice === 'use_local') {
    const localWinner: CloudSaveDocument = {
      ...conflict.local,
      revision: conflict.cloud.revision + 1,
      updatedAt: nowIso(),
      source: 'cloud',
    }
    await saveProvider.upsertSave(localWinner)
  } else {
    await saveProvider.upsertSave(conflict.cloud, { expectedRevision: conflict.cloud.revision })
  }
  setSyncState(conflict.slotId, { status: 'synced', conflict: undefined, message: 'Conflict resolved', updatedAt: nowIso() })
  void userId
}
