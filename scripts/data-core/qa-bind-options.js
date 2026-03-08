/**
 * Single place for graph/analysis options used by lint, build, structural QA, and orchestrator.
 * Per-profile overrides can be added without forking validate/analyze call sites.
 */

import { RELEASE_GRAPH_OPTIONS } from './graph-options.js'

/**
 * Options object suitable for analyzeGraph third argument (and aligned with structural QA).
 * @returns {{ allowedStartIds: Set<string>, deadEndAllowlist: Set<string> }}
 */
export function getReleaseGraphAnalyzeOptions() {
  return {
    allowedStartIds: RELEASE_GRAPH_OPTIONS.allowedStartIds,
    deadEndAllowlist: RELEASE_GRAPH_OPTIONS.deadEndAllowlist,
  }
}

/**
 * @param {object} [_profile] reserved for per-profile graph overrides
 * @returns {{ allowedStartIds: Set<string>, deadEndAllowlist: Set<string> }}
 */
export function resolveGraphOptionsForProfile(_profile) {
  void _profile
  return getReleaseGraphAnalyzeOptions()
}
