/**
 * Structural graph QA: exhaustive multi-path DFS (backtracking) over the walk graph.
 * Node-safe; suitable for tooling and the authoring API.
 *
 * Explores all structural branches from each release start until each path ends in an
 * ending node, a stack-cycle, a non-ending sink, or an encounter sink. Global step/time/depth
 * caps may stop enumeration early (`abortReason: resource_limit`).
 */

import { validateData } from './validate.js'
import { analyzeGraph } from './graph.js'
import { getReleaseGraphAnalyzeOptions } from './qa-bind-options.js'
import { buildWalkAdjacency, wouldStackCycle, walkNodeKey } from './qa-graph.js'

/** Kinds that count as structural defects (`hasStructuralDefects`) and may be stored in `pathEvents`. */
export const STRUCTURAL_DEFECT_TERMINAL_KINDS = Object.freeze([
  'stack_cycle',
  'structural_dead_end',
  'encounter_sink',
])

const DEFECT_TERMINAL_KIND_SET = new Set(STRUCTURAL_DEFECT_TERMINAL_KINDS)

/**
 * @param {string} terminalKind
 * @returns {boolean}
 */
export function isStructuralDefectTerminalKind(terminalKind) {
  return DEFECT_TERMINAL_KIND_SET.has(terminalKind)
}

const DEFAULTS = {
  maxTraversalSteps: 500_000,
  maxWallMs: 120_000,
  maxPathDepth: 500,
  maxBranchingPerVertex: 64,
  /** Cap stored **defect** path samples in JSON (`ending_leaf` is never stored; all terminals stay in `countsByKind`). */
  maxStoredPathEvents: 400,
}

/**
 * @param {Record<string, unknown>} nodes
 * @param {Record<string, unknown>} items
 * @param {Record<string, unknown>} enemies
 * @param {Record<string, unknown>} encounters
 * @param {Partial<typeof DEFAULTS> & {
 *   graphOptions?: { allowedStartIds?: Iterable<string>, deadEndAllowlist?: Set<string> },
 *   reusePreflight?: {
 *     validateErrors: import('./types.js').Diagnostic[],
 *     validateWarnings: import('./types.js').Diagnostic[],
 *     graphOut: { orphans: string[], deadEnds: string[], diagnostics: import('./types.js').Diagnostic[] },
 *   },
 * }} [opts]
 */
export function runStructuralQa(nodes, items, enemies, encounters, opts = {}) {
  const { graphOptions, reusePreflight, ...traversalOpts } = opts
  const options = { ...DEFAULTS, ...traversalOpts }
  const t0 = Date.now()
  const graphOpts = graphOptions ?? getReleaseGraphAnalyzeOptions()

  const countsByKind = {
    ending_leaf: 0,
    structural_dead_end: 0,
    stack_cycle: 0,
    encounter_sink: 0,
  }

  /** @type {Array<Record<string, unknown>>} */
  const pathEvents = []
  /** @type {Map<string, { terminalKind: string, atVertex: string | null, count: number, example: Record<string, unknown> }>} */
  const aggregateByKey = new Map()

  const state = {
    steps: 0,
    pathEvents,
    countsByKind,
    aggregateByKey,
    pathEventsTruncated: false,
    totalTerminalEvents: 0,
    resourceLimitHit: null,
  }

  const result = {
    abortReason: null,
    validateErrors: [],
    validateWarnings: [],
    graphDiagnostics: [],
    orphans: [],
    deadEnds: [],
    brokenEdges: [],
    traversal: {
      steps: 0,
      startedFrom: [],
      completedStarts: 0,
      branchingTruncations: [],
    },
    countsByKind,
    pathEvents,
    exploration: {
      enumerationFinished: false,
      stoppedBy: null,
      totalTerminalEventsObserved: 0,
      storedPathEventCount: 0,
      pathEventsTruncated: false,
      hasStructuralDefects: false,
      partialDueToBranchingCap: false,
    },
    uniqueIssueSummaries: [],
    blocker: null,
    resourceLimit: null,
  }

  if (reusePreflight) {
    result.validateErrors = reusePreflight.validateErrors
    result.validateWarnings = reusePreflight.validateWarnings
  } else {
    const { errors, warnings } = validateData(nodes, items, enemies, encounters)
    result.validateErrors = errors
    result.validateWarnings = warnings
  }

  if (result.validateErrors.length > 0) {
    result.abortReason = 'validate_preflight'
    return finalizeExplorationFields(result, state, options)
  }

  const graphOut = reusePreflight?.graphOut ?? analyzeGraph(nodes, encounters, graphOpts)
  result.orphans = graphOut.orphans
  result.deadEnds = graphOut.deadEnds
  result.graphDiagnostics = graphOut.diagnostics

  const { adj, brokenEdges } = buildWalkAdjacency(nodes, encounters)
  result.brokenEdges = brokenEdges

  if (brokenEdges.length > 0) {
    result.abortReason = 'structural_blocker'
    result.blocker = {
      kind: 'broken_edge',
      detail: brokenEdges,
      message: 'One or more structural edges point to missing nodes or encounters.',
      issueWhere: {
        vertex: null,
        summary: 'Broken references were detected before the walk began. See the broken-edge list.',
      },
    }
    return finalizeExplorationFields(result, state, options)
  }

  const allowed = [...graphOpts.allowedStartIds].filter((id) => nodes[id])
  allowed.sort()
  result.traversal.startedFrom = allowed

  if (allowed.length === 0) {
    result.abortReason = 'structural_blocker'
    result.blocker = {
      kind: 'no_start_nodes',
      detail: 'No allowed start ids exist in the model.',
      message: 'No release start nodes exist in this model.',
      path: [],
      vertexPath: [],
      traceSteps: [],
      issueWhere: { vertex: null, summary: 'Define at least one node whose id is in the release allowlist.' },
    }
    return finalizeExplorationFields(result, state, options)
  }

  for (const startId of allowed) {
    if (state.resourceLimitHit) break
    const startV = walkNodeKey(startId)
    visit(adj, nodes, startV, [], [], startId, state, result.traversal, t0, options)
    if (!state.resourceLimitHit) {
      result.traversal.completedStarts += 1
    }
  }

  if (state.resourceLimitHit) {
    result.abortReason = 'resource_limit'
    result.resourceLimit = state.resourceLimitHit
  } else {
    result.abortReason = 'complete'
  }

  return finalizeExplorationFields(result, state, options)
}

function finalizeExplorationFields(result, state, options) {
  result.traversal.steps = state.steps
  result.exploration.enumerationFinished = !state.resourceLimitHit
  result.exploration.stoppedBy = state.resourceLimitHit?.kind ?? null
  result.exploration.totalTerminalEventsObserved = state.totalTerminalEvents
  result.exploration.storedPathEventCount = state.pathEvents.length
  result.exploration.pathEventsTruncated = state.pathEventsTruncated
  const bad = STRUCTURAL_DEFECT_TERMINAL_KINDS.some((k) => (state.countsByKind[k] ?? 0) > 0)
  result.exploration.hasStructuralDefects = bad
  result.exploration.partialDueToBranchingCap = result.traversal.branchingTruncations.length > 0

  result.uniqueIssueSummaries = [...state.aggregateByKey.values()]
    .filter((row) => row.terminalKind !== 'ending_leaf')
    .sort((a, b) => b.count - a.count || String(a.atVertex).localeCompare(String(b.atVertex)))

  return result
}

/**
 * @param {Map<string, Array<{ to: string, transition: object }>>} adj
 * @param {Record<string, { type?: string, text?: string }>} nodes
 */
function visit(adj, nodes, v, stack, traceSteps, startId, state, traversalStats, t0, options) {
  if (state.resourceLimitHit) return

  if (Date.now() - t0 > options.maxWallMs) {
    state.resourceLimitHit = makeResourceLimit('timeout_ms', v, stack, traceSteps)
    return
  }
  state.steps += 1
  traversalStats.steps = state.steps
  if (state.steps > options.maxTraversalSteps) {
    state.resourceLimitHit = makeResourceLimit('max_traversal_steps', v, stack, traceSteps)
    return
  }
  if (stack.length >= options.maxPathDepth) {
    state.resourceLimitHit = makeResourceLimit('max_path_depth', v, stack, traceSteps)
    return
  }

  if (wouldStackCycle(stack, v)) {
    recordTerminal(state, {
      terminalKind: 'stack_cycle',
      startId,
      atVertex: v,
      vertexPath: stack.concat(v),
      traceSteps: [...traceSteps],
      message:
        'This path revisits a location that was still open on the stack — a structural infinite loop.',
      issueWhere: {
        vertex: v,
        summary: `Loop detected at ${v} along this choice sequence.`,
      },
    }, options)
    return
  }

  const outsFull = adj.get(v) ?? []
  if (outsFull.length > options.maxBranchingPerVertex) {
    traversalStats.branchingTruncations.push({
      at: v,
      explored: options.maxBranchingPerVertex,
      available: outsFull.length,
    })
  }
  const outs = outsFull.slice(0, options.maxBranchingPerVertex)

  if (outs.length === 0) {
    if (v.startsWith('enc:')) {
      recordTerminal(state, {
        terminalKind: 'encounter_sink',
        startId,
        atVertex: v,
        vertexPath: stack.concat(v),
        traceSteps: [...traceSteps],
        message: 'Encounter has no victory/defeat links to narrative nodes.',
        issueWhere: {
          vertex: v,
          summary: `${v} cannot resolve to a story node.`,
        },
      }, options)
      return
    }
    if (v.startsWith('node:')) {
      const nid = v.slice('node:'.length)
      const node = nodes[nid]
      if (node?.type === 'ending') {
        recordTerminal(state, {
          terminalKind: 'ending_leaf',
          startId,
          atVertex: v,
          vertexPath: stack.concat(v),
          traceSteps: [...traceSteps],
          message: `Reached ending node "${nid}".`,
          issueWhere: {
            vertex: v,
            summary: 'Valid structural ending for this path.',
          },
        }, options)
        return
      }
      if (node) {
        recordTerminal(state, {
          terminalKind: 'structural_dead_end',
          startId,
          atVertex: v,
          vertexPath: stack.concat(v),
          traceSteps: [...traceSteps],
          message: `Narrative node "${nid}" has no structural successors and is not an ending.`,
          issueWhere: {
            vertex: v,
            summary: `Player would be stuck at “${nid}”.`,
          },
        }, options)
        return
      }
    }
    return
  }

  const nextStack = stack.concat(v)
  for (const { to, transition } of outs) {
    if (state.resourceLimitHit) return
    const nextTrace = traceSteps.concat([{ fromVertex: v, toVertex: to, transition }])
    visit(adj, nodes, to, nextStack, nextTrace, startId, state, traversalStats, t0, options)
  }
}

function recordTerminal(state, event, options) {
  const { terminalKind, atVertex } = event
  state.totalTerminalEvents += 1
  state.countsByKind[terminalKind] = (state.countsByKind[terminalKind] ?? 0) + 1

  const storeSample = isStructuralDefectTerminalKind(terminalKind)
  const key = `${terminalKind}\u0000${atVertex ?? ''}`
  const existing = state.aggregateByKey.get(key)
  if (existing) {
    existing.count += 1
  } else {
    let example = { ...event }
    if (storeSample && state.pathEvents.length < options.maxStoredPathEvents) {
      example = { ...event, id: state.pathEvents.length }
    }
    state.aggregateByKey.set(key, {
      terminalKind,
      atVertex: atVertex ?? null,
      count: 1,
      example,
    })
  }

  if (storeSample) {
    if (state.pathEvents.length < options.maxStoredPathEvents) {
      state.pathEvents.push({ ...event, id: state.pathEvents.length })
    } else {
      state.pathEventsTruncated = true
    }
  }
}

function makeResourceLimit(kind, v, stack, traceSteps) {
  const vertexPath = stack.concat(v)
  return {
    type: 'resource_limit',
    kind,
    at: v,
    path: vertexPath,
    vertexPath,
    traceSteps,
    message:
      kind === 'timeout_ms'
        ? 'Enumeration stopped: wall-clock time budget exceeded (partial coverage).'
        : kind === 'max_traversal_steps'
          ? 'Enumeration stopped: maximum DFS expansions exceeded (partial coverage).'
          : 'Enumeration stopped: path depth cap reached (partial coverage).',
    issueWhere: {
      vertex: v,
      summary: 'Safety limit — not necessarily a story defect.',
    },
  }
}
