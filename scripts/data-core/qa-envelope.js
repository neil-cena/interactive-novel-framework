/**
 * Versioned top-level shape for QA orchestrator output (CI parsers, authoring).
 * No Node built-ins.
 */

export const QA_REPORT_ENVELOPE_VERSION = '1.0.0'

/**
 * @typedef {'failure' | 'inconclusive' | 'pass'} QaExitOutcome
 */

/**
 * @param {{
 *   profileId: string
 *   profile?: object | null
 * }} args
 */
export function createQaEnvelope({ profileId, profile = null }) {
  return {
    version: QA_REPORT_ENVELOPE_VERSION,
    profileId,
    profileSnapshot: profile
      ? Object.freeze({
          id: profile.id,
          exhaustiveness: profile.exhaustiveness,
          stages: Object.freeze([...profile.stages]),
        })
      : null,
    /** @type {Record<string, { outcome: QaExitOutcome, detail?: Record<string, unknown> }>} */
    stages: {},
    mergedOutcome: /** @type {QaExitOutcome} */ ('pass'),
    /** Flattened blocking diagnostics from preflight (optional) */
    diagnostics: /** @type {import('./types.js').Diagnostic[]} */ ([]),
    structural: null,
  }
}

/**
 * @param {import('./types.js').Diagnostic[]} diagnostics
 * @param {import('./types.js').Diagnostic[]} more
 */
export function appendDiagnostics(diagnostics, more) {
  diagnostics.push(...more)
}
