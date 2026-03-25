import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { runFullProjectQa } from '@data-core/qa-orchestrator.js'
import { QA_REPORT_ENVELOPE_VERSION } from '@data-core/qa-envelope.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..', '..')
const csvDir = path.join(projectRoot, 'data', 'csv')

describe('runFullProjectQa', () => {
  it('returns versioned envelope and pass mergedOutcome for ci-pr on current data', () => {
    const envelope = runFullProjectQa({ profileId: 'ci-pr', csvDir })
    expect(envelope.version).toBe(QA_REPORT_ENVELOPE_VERSION)
    expect(envelope.profileId).toBe('ci-pr')
    expect(envelope.mergedOutcome).toBe('pass')
    expect(envelope.stages.preflight?.outcome).toBe('pass')
    expect(envelope.stages.narrative?.outcome).toBe('pass')
    expect(envelope.stages.structural).toBeUndefined()
  })
})
