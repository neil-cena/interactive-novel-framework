import { describe, it, expect } from 'vitest'
import { createQaEnvelope, QA_REPORT_ENVELOPE_VERSION, appendDiagnostics } from '@data-core/qa-envelope.js'
import { getQaProfile } from '@data-core/qa-profiles.js'
import { DIAGNOSTIC_SEVERITY } from '@data-core/types.js'

describe('qa-envelope', () => {
  it('createQaEnvelope includes version and profile snapshot', () => {
    const p = getQaProfile('ci-pr')
    const e = createQaEnvelope({ profileId: 'ci-pr', profile: p })
    expect(e.version).toBe(QA_REPORT_ENVELOPE_VERSION)
    expect(e.profileSnapshot?.id).toBe('ci-pr')
    expect(e.mergedOutcome).toBe('pass')
  })

  it('appendDiagnostics mutates list', () => {
    const e = createQaEnvelope({ profileId: 'x', profile: null })
    appendDiagnostics(e.diagnostics, [
      { code: 'T', severity: DIAGNOSTIC_SEVERITY.error, message: 'm', context: {} },
    ])
    expect(e.diagnostics.length).toBe(1)
  })
})
