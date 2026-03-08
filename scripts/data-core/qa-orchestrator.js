/**
 * Single composition root for disk-based QA: profile → stages → merged outcome.
 * Node: callers pass absolute csvDir (uses readCsv via preflight).
 */

import { getQaProfile, mergeExitOutcomes } from './qa-profiles.js'
import { resolveGraphOptionsForProfile } from './qa-bind-options.js'
import { runCsvDataPreflight } from './qa-data-preflight.js'
import { createQaEnvelope, appendDiagnostics } from './qa-envelope.js'
import { runStructuralQa } from './qa-exhaustive.js'
import { runNarrativeStaticChecks } from './qa-narrative.js'

/**
 * @param {object} structuralResult
 * @param {{ resourceLimitSemantics: { wallClockExceeded: string, stepBudgetExceeded: string } }} profile
 * @returns {'failure' | 'inconclusive' | 'pass'}
 */
export function evaluateStructuralQaOutcome(structuralResult, profile) {
  if (
    structuralResult.abortReason === 'validate_preflight' ||
    structuralResult.abortReason === 'structural_blocker'
  ) {
    return 'failure'
  }
  if (structuralResult.brokenEdges?.length > 0) return 'failure'
  if (structuralResult.exploration?.hasStructuralDefects) return 'failure'
  if (structuralResult.abortReason === 'resource_limit') {
    const kind = structuralResult.resourceLimit?.kind
    const sem =
      kind === 'timeout_ms'
        ? profile.resourceLimitSemantics.wallClockExceeded
        : profile.resourceLimitSemantics.stepBudgetExceeded
    return sem === 'failure' ? 'failure' : 'inconclusive'
  }
  return 'pass'
}

/**
 * @param {{ profileId: string, csvDir: string }} args
 */
export function runFullProjectQa({ profileId, csvDir }) {
  const profile = getQaProfile(profileId)
  const graphOpts = resolveGraphOptionsForProfile(profile)
  const envelope = createQaEnvelope({ profileId, profile })

  let merged = /** @type {'failure' | 'inconclusive' | 'pass'} */ ('pass')

  const needsPreflight =
    profile.stages.includes('validate') ||
    profile.stages.includes('graph') ||
    profile.stages.includes('structural')

  /** @type {ReturnType<typeof runCsvDataPreflight> | null} */
  let pre = null
  if (needsPreflight) {
    pre = runCsvDataPreflight(csvDir, graphOpts)
  }

  if (profile.stages.includes('validate') || profile.stages.includes('graph')) {
    if (!pre) {
      throw new Error('runFullProjectQa: internal error — preflight missing for validate/graph stage')
    }
    const blocking = pre.allErrors.length > 0
    const o = blocking ? 'failure' : 'pass'
    envelope.stages.preflight = {
      outcome: o,
      errorCount: pre.allErrors.length,
      warningCount: pre.allWarnings.length,
    }
    appendDiagnostics(envelope.diagnostics, pre.allErrors)
    merged = mergeExitOutcomes(merged, o)
  }

  if (profile.stages.includes('narrative') && pre) {
    const nar = runNarrativeStaticChecks(pre.nodes)
    envelope.stages.narrative = {
      outcome: nar.some((d) => d.severity === 'error') ? 'failure' : 'pass',
      warningCount: nar.filter((d) => d.severity === 'warning').length,
      issueCount: nar.length,
    }
    appendDiagnostics(envelope.diagnostics, nar)
    merged = mergeExitOutcomes(
      merged,
      nar.some((d) => d.severity === 'error') ? 'failure' : 'pass',
    )
  } else if (profile.stages.includes('narrative') && !pre) {
    envelope.stages.narrative = { outcome: 'pass', skipped: true, reason: 'no_model' }
  }

  if (profile.stages.includes('structural')) {
    if (!pre) {
      throw new Error('runFullProjectQa: internal error — preflight missing for structural stage')
    }
    if (pre.allErrors.length > 0) {
      envelope.stages.structural = { outcome: 'failure', skipped: true, reason: 'preflight_errors' }
      merged = mergeExitOutcomes(merged, 'failure')
    } else {
      const structuralResult = runStructuralQa(pre.nodes, pre.items, pre.enemies, pre.encounters, {
        graphOptions: graphOpts,
        reusePreflight: {
          validateErrors: pre.validateErrors,
          validateWarnings: pre.validateWarnings,
          graphOut: {
            orphans: pre.graphOrphans,
            deadEnds: pre.graphDeadEnds,
            diagnostics: pre.graphDiagnostics,
          },
        },
      })
      const o = evaluateStructuralQaOutcome(structuralResult, profile)
      envelope.stages.structural = {
        outcome: o,
        abortReason: structuralResult.abortReason,
        exploration: structuralResult.exploration,
      }
      envelope.structural = structuralResult
      merged = mergeExitOutcomes(merged, o)
    }
  }

  envelope.mergedOutcome = merged
  return envelope
}
