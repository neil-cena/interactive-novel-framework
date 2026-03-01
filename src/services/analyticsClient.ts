import type { AnalyticsEventEnvelope, AnalyticsEventType, SessionOutcomeSummary } from '../types/cloud'
import { getProviders } from './providers/providerFactory'
import { recordAnalyticsIngestError } from './phase5Diagnostics'

const ALLOWLIST: ReadonlySet<AnalyticsEventType> = new Set([
  'chapter_completed',
  'ending_reached',
  'run_failed',
  'rare_milestone_unlocked',
])

const MAX_EVENTS_PER_SESSION = 32
const MAX_METADATA_KEYS = 8

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

let sessionId = generateSessionId()
let startedAt = Date.now()
const eventBuffer: AnalyticsEventEnvelope[] = []
const counters: Partial<Record<AnalyticsEventType, number>> = {}
const milestoneSet = new Set<string>()
let flushing = false

export function resetAnalyticsSession(): void {
  sessionId = generateSessionId()
  startedAt = Date.now()
  eventBuffer.length = 0
  milestoneSet.clear()
  for (const key of Object.keys(counters) as AnalyticsEventType[]) {
    delete counters[key]
  }
}

/** Strip PII and allowlisted fields only; never send userId to analytics. */
function sanitizeEnvelope(ev: AnalyticsEventEnvelope): Omit<AnalyticsEventEnvelope, 'userId'> {
  const { userId: _uid, metadata, ...rest } = ev
  const meta = metadata
    ? Object.fromEntries(Object.entries(metadata).slice(0, MAX_METADATA_KEYS))
    : undefined
  return { ...rest, ...(meta && { metadata: meta }) }
}

export function trackOutcomeEvent(event: AnalyticsEventEnvelope): void {
  if (!ALLOWLIST.has(event.type)) return
  if (eventBuffer.length >= MAX_EVENTS_PER_SESSION) return
  eventBuffer.push(sanitizeEnvelope(event) as AnalyticsEventEnvelope)
  counters[event.type] = (counters[event.type] ?? 0) + 1
  if (event.type === 'rare_milestone_unlocked') {
    const milestone = String(event.metadata?.milestone ?? '')
    if (milestone) milestoneSet.add(milestone)
  }
}

export async function flushOutcomeEvents(storyId: string, storyVersion?: string): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    const { analyticsProvider } = getProviders()
    const toIngest = eventBuffer.length > 0 ? [...eventBuffer] : []
    if (toIngest.length > 0) {
      try {
        await analyticsProvider.ingestEvents(toIngest)
      } catch (e) {
        recordAnalyticsIngestError(e instanceof Error ? e.message : String(e))
        throw e
      }
    }
    const summary: SessionOutcomeSummary = {
      storyId,
      ...(storyVersion !== undefined && { storyVersion }),
      sessionId,
      startedAt,
      endedAt: Date.now(),
      counters: { ...counters },
      milestones: Array.from(milestoneSet),
    }
    try {
      await analyticsProvider.ingestSessionSummary(summary)
    } catch (e) {
      recordAnalyticsIngestError(e instanceof Error ? e.message : String(e))
      throw e
    }
  } finally {
    resetAnalyticsSession()
    flushing = false
  }
}

export async function getOutcomeStats(storyId: string) {
  const { analyticsProvider } = getProviders()
  return analyticsProvider.getOutcomeStats(storyId)
}
