import { describe, it, expect } from 'vitest'
import { RELEASE_GRAPH_OPTIONS } from '@data-core/graph-options.js'

/** Same entry ids as scripts/build-data.js release graph options (analyzeGraph third arg). */
const EXPECTED_ALLOWED_START_IDS = ['n_start', 'start']

describe('RELEASE_GRAPH_OPTIONS', () => {
  it('exposes allowedStartIds as a Set of the release start node ids (normal playthrough entry only)', () => {
    const { allowedStartIds } = RELEASE_GRAPH_OPTIONS

    expect(allowedStartIds).toBeInstanceOf(Set)
    expect(allowedStartIds.size).toBe(2)

    for (const id of EXPECTED_ALLOWED_START_IDS) {
      expect(allowedStartIds.has(id)).toBe(true)
    }
  })
})
