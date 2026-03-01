/**
 * Phase 5 observability: counters for sync failures, conflicts, analytics ingest errors.
 * Use getPhase5Diagnostics() to read; in dev, available as window.__phase5_diagnostics.
 */

const PREFIX = '[phase5]'

export interface Phase5Diagnostics {
  syncFailures: number
  conflictCount: number
  analyticsIngestErrors: number
  lastSyncFailureAt: string | null
  lastConflictAt: string | null
  lastAnalyticsErrorAt: string | null
}

const state: Phase5Diagnostics = {
  syncFailures: 0,
  conflictCount: 0,
  analyticsIngestErrors: 0,
  lastSyncFailureAt: null,
  lastConflictAt: null,
  lastAnalyticsErrorAt: null,
}

function nowIso(): string {
  return new Date().toISOString()
}

export function recordSyncFailure(reason?: string): void {
  state.syncFailures += 1
  state.lastSyncFailureAt = nowIso()
  if (import.meta.env.DEV) {
    console.warn(`${PREFIX} sync failure #${state.syncFailures}`, reason ?? '')
  }
}

export function recordConflict(slotId: string): void {
  state.conflictCount += 1
  state.lastConflictAt = nowIso()
  if (import.meta.env.DEV) {
    console.warn(`${PREFIX} conflict #${state.conflictCount} slot=${slotId}`)
  }
}

export function recordAnalyticsIngestError(reason?: string): void {
  state.analyticsIngestErrors += 1
  state.lastAnalyticsErrorAt = nowIso()
  if (import.meta.env.DEV) {
    console.warn(`${PREFIX} analytics ingest error #${state.analyticsIngestErrors}`, reason ?? '')
  }
}

export function getPhase5Diagnostics(): Readonly<Phase5Diagnostics> {
  return { ...state }
}

export function resetPhase5Diagnostics(): void {
  state.syncFailures = 0
  state.conflictCount = 0
  state.analyticsIngestErrors = 0
  state.lastSyncFailureAt = null
  state.lastConflictAt = null
  state.lastAnalyticsErrorAt = null
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as unknown as { __phase5_diagnostics?: () => Readonly<Phase5Diagnostics> }).__phase5_diagnostics =
    getPhase5Diagnostics
}
