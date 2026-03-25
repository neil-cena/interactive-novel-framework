import { describe, expect, it } from 'vitest'
import {
  getPhase5Diagnostics,
  recordAnalyticsIngestError,
  recordConflict,
  recordSyncFailure,
  resetPhase5Diagnostics,
} from '../phase5Diagnostics'

describe('phase5Diagnostics', () => {
  it('starts at zero', () => {
    resetPhase5Diagnostics()
    const d = getPhase5Diagnostics()
    expect(d.syncFailures).toBe(0)
    expect(d.conflictCount).toBe(0)
    expect(d.analyticsIngestErrors).toBe(0)
  })

  it('increments sync failure count', () => {
    resetPhase5Diagnostics()
    recordSyncFailure('network error')
    recordSyncFailure()
    const d = getPhase5Diagnostics()
    expect(d.syncFailures).toBe(2)
    expect(d.lastSyncFailureAt).toBeTruthy()
  })

  it('increments conflict count', () => {
    resetPhase5Diagnostics()
    recordConflict('save_slot_1')
    recordConflict('save_slot_2')
    const d = getPhase5Diagnostics()
    expect(d.conflictCount).toBe(2)
    expect(d.lastConflictAt).toBeTruthy()
  })

  it('increments analytics ingest error count', () => {
    resetPhase5Diagnostics()
    recordAnalyticsIngestError('permission denied')
    const d = getPhase5Diagnostics()
    expect(d.analyticsIngestErrors).toBe(1)
    expect(d.lastAnalyticsErrorAt).toBeTruthy()
  })

  it('reset clears all counters', () => {
    recordSyncFailure()
    recordConflict('s1')
    recordAnalyticsIngestError()
    resetPhase5Diagnostics()
    const d = getPhase5Diagnostics()
    expect(d.syncFailures).toBe(0)
    expect(d.conflictCount).toBe(0)
    expect(d.analyticsIngestErrors).toBe(0)
    expect(d.lastSyncFailureAt).toBeNull()
    expect(d.lastConflictAt).toBeNull()
    expect(d.lastAnalyticsErrorAt).toBeNull()
  })
})
