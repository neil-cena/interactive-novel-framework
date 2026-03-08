import { describe, it, expect } from 'vitest'
import {
  QA_PROFILE_IDS,
  getQaProfile,
  mergeExitOutcomes,
} from '../data-core/qa-profiles.js'

const EXHAUSTIVENESS = /** @type {const} */ (['preflight', 'release', 'full'])
const RESOURCE_SEMANTIC = /** @type {const} */ (['failure', 'inconclusive'])
const OUTCOME = /** @type {const} */ (['failure', 'inconclusive', 'pass'])

/**
 * @param {unknown} profile
 * @param {string} expectedId
 */
function assertProfileShape(profile, expectedId) {
  expect(profile).toBeTypeOf('object')
  expect(profile).not.toBeNull()
  expect(Array.isArray(profile)).toBe(false)
  expect(Object.isFrozen(profile)).toBe(true)

  expect(profile.id).toBe(expectedId)
  expect(EXHAUSTIVENESS).toContain(profile.exhaustiveness)

  expect(Array.isArray(profile.stages)).toBe(true)
  expect(profile.stages.length).toBeGreaterThan(0)
  expect(Object.isFrozen(profile.stages)).toBe(true)
  for (const stageId of profile.stages) {
    expect(typeof stageId).toBe('string')
    expect(stageId.length).toBeGreaterThan(0)
  }

  expect(profile.resourceLimitSemantics).toBeTypeOf('object')
  expect(profile.resourceLimitSemantics).not.toBeNull()
  expect(RESOURCE_SEMANTIC).toContain(profile.resourceLimitSemantics.wallClockExceeded)
  expect(RESOURCE_SEMANTIC).toContain(profile.resourceLimitSemantics.stepBudgetExceeded)
}

describe('qa-profiles', () => {
  describe('QA_PROFILE_IDS', () => {
    it('lists known profile ids including ci-pr, nightly, local-full', () => {
      expect(Array.isArray(QA_PROFILE_IDS)).toBe(true)
      expect(QA_PROFILE_IDS.length).toBeGreaterThanOrEqual(3)
      expect(QA_PROFILE_IDS).toEqual(
        expect.arrayContaining(['ci-pr', 'nightly', 'local-full']),
      )
      for (const id of QA_PROFILE_IDS) {
        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getQaProfile', () => {
    it('returns a frozen profile for ci-pr: preflight, PR fast path without structural stage', () => {
      const profile = getQaProfile('ci-pr')
      assertProfileShape(profile, 'ci-pr')
      expect(profile.exhaustiveness).toBe('preflight')
      // PR fast path: omit structural; if structural is ever added, document why here.
      expect(profile.stages).not.toContain('structural')
    })

    it('returns a frozen profile for nightly: full exhaustiveness and structural stage', () => {
      const profile = getQaProfile('nightly')
      assertProfileShape(profile, 'nightly')
      expect(profile.exhaustiveness).toBe('full')
      expect(profile.stages).toContain('structural')
    })

    it('returns a frozen profile for local-full with full exhaustiveness', () => {
      const profile = getQaProfile('local-full')
      assertProfileShape(profile, 'local-full')
      expect(profile.exhaustiveness).toBe('full')
    })

    it('preserves stages order for the same id across calls', () => {
      const a = getQaProfile('nightly').stages
      const b = getQaProfile('nightly').stages
      expect(a).toEqual(b)
    })

    it('throws a clear error for unknown-profile', () => {
      expect(() => getQaProfile('unknown-profile')).toThrowError(/unknown-profile/i)
    })
  })

  describe('mergeExitOutcomes', () => {
    it('returns pass only when both outcomes are pass', () => {
      expect(mergeExitOutcomes('pass', 'pass')).toBe('pass')
    })

    it('failure dominates pass and inconclusive (either argument order)', () => {
      expect(mergeExitOutcomes('failure', 'pass')).toBe('failure')
      expect(mergeExitOutcomes('pass', 'failure')).toBe('failure')
      expect(mergeExitOutcomes('failure', 'inconclusive')).toBe('failure')
      expect(mergeExitOutcomes('inconclusive', 'failure')).toBe('failure')
    })

    it('inconclusive dominates pass but loses to failure', () => {
      expect(mergeExitOutcomes('inconclusive', 'pass')).toBe('inconclusive')
      expect(mergeExitOutcomes('pass', 'inconclusive')).toBe('inconclusive')
    })

    it('is idempotent for identical outcomes', () => {
      for (const o of OUTCOME) {
        expect(mergeExitOutcomes(o, o)).toBe(o)
      }
    })
  })
})
