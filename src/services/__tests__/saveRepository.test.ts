import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSaveSyncState, queueCloudSave, syncQueuedCloudSaves } from '../saveRepository'

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
})
