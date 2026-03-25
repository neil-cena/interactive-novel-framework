import { describe, expect, it } from 'vitest'
import { isDivergedConflict, pickWinner } from '../sync/conflictResolver'

const base = {
  slotId: 'save_slot_1' as const,
  userId: 'u1',
  updatedAt: new Date().toISOString(),
  source: 'cloud' as const,
  data: {
    metadata: { currentNodeId: 'n_start' },
    vitals: { hpCurrent: 10, hpMax: 20 },
    inventory: { currency: 0, items: {} },
    equipment: { mainHand: null },
    attributes: { strength: 0, dexterity: 0, intelligence: 0 },
    progression: { xp: 0, level: 1, xpToNextLevel: 100, unspentAttributePoints: 0 },
    flags: {},
  },
}

describe('conflictResolver', () => {
  it('detects divergence by revision', () => {
    const conflict = {
      slotId: 'save_slot_1' as const,
      local: { ...base, source: 'local' as const, revision: 2 },
      cloud: { ...base, source: 'cloud' as const, revision: 3 },
    }
    expect(isDivergedConflict(conflict)).toBe(true)
  })

  it('returns local winner when requested', () => {
    const conflict = {
      slotId: 'save_slot_1' as const,
      local: { ...base, source: 'local' as const, revision: 2 },
      cloud: { ...base, source: 'cloud' as const, revision: 3 },
    }
    expect(pickWinner(conflict, 'use_local').source).toBe('local')
    expect(pickWinner(conflict, 'use_cloud').source).toBe('cloud')
  })
})
