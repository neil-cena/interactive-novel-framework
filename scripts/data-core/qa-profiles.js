/** @typedef {'preflight' | 'release' | 'full'} QaExhaustiveness */
/** @typedef {'failure' | 'inconclusive' | 'pass'} ExitOutcome */

/**
 * @param {{
 *   id: string
 *   exhaustiveness: QaExhaustiveness
 *   stages: string[]
 *   resourceLimitSemantics: {
 *     wallClockExceeded: 'failure' | 'inconclusive'
 *     stepBudgetExceeded: 'failure' | 'inconclusive'
 *   }
 * }} raw
 */
function freezeProfile(raw) {
  const stages = Object.freeze([...raw.stages])
  const resourceLimitSemantics = Object.freeze({
    wallClockExceeded: raw.resourceLimitSemantics.wallClockExceeded,
    stepBudgetExceeded: raw.resourceLimitSemantics.stepBudgetExceeded,
  })
  return Object.freeze({
    id: raw.id,
    exhaustiveness: raw.exhaustiveness,
    stages,
    resourceLimitSemantics,
  })
}

const _profiles = {
  'ci-pr': freezeProfile({
    id: 'ci-pr',
    exhaustiveness: 'preflight',
    /** Preflight: schema + release graph; no capped structural walk on PR by default. */
    stages: ['validate', 'graph', 'narrative'],
    resourceLimitSemantics: {
      wallClockExceeded: 'failure',
      stepBudgetExceeded: 'inconclusive',
    },
  }),
  nightly: freezeProfile({
    id: 'nightly',
    exhaustiveness: 'full',
    stages: ['validate', 'graph', 'structural', 'narrative'],
    resourceLimitSemantics: {
      wallClockExceeded: 'failure',
      stepBudgetExceeded: 'failure',
    },
  }),
  'local-full': freezeProfile({
    id: 'local-full',
    exhaustiveness: 'full',
    stages: ['validate', 'graph', 'structural', 'narrative'],
    resourceLimitSemantics: {
      wallClockExceeded: 'inconclusive',
      stepBudgetExceeded: 'failure',
    },
  }),
}

export const QA_PROFILE_IDS = Object.freeze(['ci-pr', 'nightly', 'local-full'])

/**
 * @param {string} id
 */
export function getQaProfile(id) {
  const profile = _profiles[id]
  if (profile === undefined) {
    throw new Error(`Unknown profile: ${id}`)
  }
  return profile
}

/**
 * Worst-of merge: failure > inconclusive > pass (commutative).
 * @param {ExitOutcome} a
 * @param {ExitOutcome} b
 * @returns {ExitOutcome}
 */
export function mergeExitOutcomes(a, b) {
  if (a === 'failure' || b === 'failure') return 'failure'
  if (a === 'inconclusive' || b === 'inconclusive') return 'inconclusive'
  return 'pass'
}
