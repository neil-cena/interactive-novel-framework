import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteCloudSave,
  getSaveSyncState,
  queueCloudSave,
  reconcileFromCloud,
  syncQueuedCloudSaves,
} from '../saveRepository'

const mockSaveProvider = {
  listSaves: vi.fn(() => Promise.resolve({})),
  getSave: vi.fn(() => Promise.resolve(null)),
  upsertSave: vi.fn(() => Promise.resolve({ ok: true })),
  deleteSave: vi.fn(() => Promise.resolve()),
}

vi.mock('../providers/providerFactory', () => ({
  getProviders: () => ({
    authProvider: {},
    saveProvider: mockSaveProvider,
    analyticsProvider: {},
    storyPackageProvider: {},
  }),
}))

vi.mock('../phase5Diagnostics', () => ({
  recordSyncFailure: vi.fn(),
  recordConflict: vi.fn(),
  recordAnalyticsIngestError: vi.fn(),
}))

function makeStorage() {
  const data = new Map<string, string>()
  return {
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { data.set(k, v) }),
    removeItem: vi.fn((k: string) => { data.delete(k) }),
  }
}

const persisted = {
  metadata: { currentNodeId: 'n_start' },
  vitals: { hpCurrent: 20, hpMax: 20 },
  inventory: { currency: 10, items: {} },
  equipment: { mainHand: 'dagger_iron' },
  attributes: { strength: 0, dexterity: 2, intelligence: 1 },
  progression: { xp: 0, level: 1, xpToNextLevel: 100, unspentAttributePoints: 0 },
  flags: {},
}

describe('saveRepository', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStorage())
    mockSaveProvider.deleteSave.mockClear()
  })

  it('keeps synced state when no authenticated user', async () => {
    await queueCloudSave('save_slot_1', persisted)
    expect(getSaveSyncState('save_slot_1').status).toBe('synced')
  })

  it('queues and syncs when authenticated', async () => {
    localStorage.setItem('phase5_auth_session', JSON.stringify({ userId: 'user_test' }))
    await queueCloudSave('save_slot_1', persisted)
    expect(getSaveSyncState('save_slot_1').status).toBe('pending')
    await syncQueuedCloudSaves()
    expect(getSaveSyncState('save_slot_1').status).toBe('synced')
  })

  it('sets conflict state when upsert returns conflict', async () => {
    const cloudDoc = {
      slotId: 'save_slot_1' as const,
      userId: 'user_test',
      revision: 2,
      updatedAt: new Date().toISOString(),
      source: 'cloud' as const,
      data: { ...persisted, metadata: { currentNodeId: 'n_other' } },
    }
    mockSaveProvider.getSave.mockResolvedValue({ ...cloudDoc, revision: 2 })
    mockSaveProvider.upsertSave.mockResolvedValue({ ok: false, conflict: cloudDoc })
    localStorage.setItem('phase5_auth_session', JSON.stringify({ userId: 'user_test' }))
    await queueCloudSave('save_slot_1', persisted)
    await syncQueuedCloudSaves()
    const state = getSaveSyncState('save_slot_1')
    expect(state.status).toBe('conflict')
    expect(state.conflict?.cloud.revision).toBe(2)
  })

  it('reconcileFromCloud writes cloud data to localStorage', async () => {
    localStorage.setItem('phase5_auth_session', JSON.stringify({ userId: 'user_test' }))
    const cloudData = { ...persisted, metadata: { currentNodeId: 'n_cloud' } }
    mockSaveProvider.listSaves.mockResolvedValue({
      save_slot_1: {
        slotId: 'save_slot_1',
        userId: 'user_test',
        revision: 1,
        updatedAt: new Date().toISOString(),
        source: 'cloud',
        data: cloudData,
      },
      save_slot_2: null,
      save_slot_3: null,
    })
    await reconcileFromCloud('user_test')
    expect(localStorage.setItem).toHaveBeenCalledWith('save_slot_1', JSON.stringify(cloudData))
  })

  it('deleteCloudSave calls provider when authenticated', async () => {
    localStorage.setItem('phase5_auth_session', JSON.stringify({ userId: 'user_test' }))
    await deleteCloudSave('save_slot_1')
    expect(mockSaveProvider.deleteSave).toHaveBeenCalledWith('user_test', 'save_slot_1')
  })

  it('deleteCloudSave does nothing when not authenticated', async () => {
    localStorage.removeItem('phase5_auth_session')
    await deleteCloudSave('save_slot_1')
    expect(mockSaveProvider.deleteSave).not.toHaveBeenCalled()
  })
})
