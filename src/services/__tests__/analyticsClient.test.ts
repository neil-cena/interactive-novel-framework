import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushOutcomeEvents, getOutcomeStats, resetAnalyticsSession, trackOutcomeEvent } from '../analyticsClient'

const mockAnalyticsProvider = {
  ingestEvents: vi.fn(() => Promise.resolve()),
  ingestSessionSummary: vi.fn(() => Promise.resolve()),
  getOutcomeStats: vi.fn(() => Promise.resolve([])),
}

vi.mock('../providers/providerFactory', () => ({
  getProviders: () => ({
    authProvider: {},
    saveProvider: {},
    analyticsProvider: mockAnalyticsProvider,
    storyPackageProvider: {},
  }),
}))

vi.mock('../phase5Diagnostics', () => ({
  recordAnalyticsIngestError: vi.fn(),
}))

describe('analyticsClient', () => {
  beforeEach(() => {
    resetAnalyticsSession()
    vi.clearAllMocks()
  })

  it('buffers only allowlisted event types', () => {
    trackOutcomeEvent({
      storyId: 'default',
      type: 'ending_reached',
      ts: Date.now(),
    })
    trackOutcomeEvent({
      storyId: 'default',
      type: 'chapter_completed' as const,
      ts: Date.now(),
    })
    expect(mockAnalyticsProvider.ingestEvents).not.toHaveBeenCalled()
  })

  it('ignores non-allowlisted event type and does not ingest events on flush', async () => {
    trackOutcomeEvent({
      storyId: 'default',
      type: 'invalid_type' as 'ending_reached',
      ts: Date.now(),
    })
    await flushOutcomeEvents('default')
    expect(mockAnalyticsProvider.ingestEvents).not.toHaveBeenCalled()
    expect(mockAnalyticsProvider.ingestSessionSummary).toHaveBeenCalledTimes(1)
  })

  it('flush calls ingestEvents and ingestSessionSummary', async () => {
    trackOutcomeEvent({
      storyId: 'default',
      type: 'ending_reached',
      ts: Date.now(),
    })
    await flushOutcomeEvents('default')
    expect(mockAnalyticsProvider.ingestEvents).toHaveBeenCalledTimes(1)
    const events = mockAnalyticsProvider.ingestEvents.mock.calls[0][0]
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('ending_reached')
    expect(events[0]).not.toHaveProperty('userId')
    expect(mockAnalyticsProvider.ingestSessionSummary).toHaveBeenCalledTimes(1)
    const summary = mockAnalyticsProvider.ingestSessionSummary.mock.calls[0][0]
    expect(summary.storyId).toBe('default')
    expect(summary.counters?.ending_reached).toBe(1)
  })

  it('getOutcomeStats delegates to provider', async () => {
    mockAnalyticsProvider.getOutcomeStats.mockResolvedValue([
      { key: 'ending_reached', count: 10, percentage: 50, sampleSize: 20, updatedAt: new Date().toISOString() },
    ])
    const stats = await getOutcomeStats('default')
    expect(stats).toHaveLength(1)
    expect(stats[0].key).toBe('ending_reached')
    expect(mockAnalyticsProvider.getOutcomeStats).toHaveBeenCalledWith('default')
  })
})
