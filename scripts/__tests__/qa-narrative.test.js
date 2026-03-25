import { describe, it, expect } from 'vitest'
import { runNarrativeStaticChecks } from '@data-core/qa-narrative.js'

describe('runNarrativeStaticChecks', () => {
  it('warns on empty narrative text', () => {
    const nodes = {
      n1: { id: 'n1', type: 'narrative', text: '   ', choices: [] },
    }
    const d = runNarrativeStaticChecks(nodes)
    expect(d.some((x) => x.code === 'DATA011')).toBe(true)
  })

  it('warns on choice with empty label', () => {
    const nodes = {
      n1: {
        id: 'n1',
        type: 'narrative',
        text: 'ok',
        choices: [{ id: 'c1', label: '' }],
      },
    }
    const d = runNarrativeStaticChecks(nodes)
    expect(d.some((x) => x.code === 'DATA012')).toBe(true)
  })
})
