/**
 * Pure graph analysis: incoming/outgoing edges, orphan and dead-end nodes.
 * No Node built-ins. Safe to import from browser (authoring app).
 */

import { DIAGNOSTIC_SEVERITY } from './types.js'

/** Runtime default when `exitNodeId` omitted — mirrors `src/plugins/theater/index.ts`. */
export const THEATER_DEFAULT_EXIT_NODE_ID = 'theater_revelation'
/** Runtime default when `exitNodeId` omitted — mirrors `src/plugins/feral-parliament/index.ts`. */
export const FERAL_DEFAULT_EXIT_NODE_ID = 'cat_colony_treaty'

export function walkNodeKey(nodeId) {
  return `node:${nodeId}`
}

export function walkEncKey(encounterId) {
  return `enc:${encounterId}`
}

/**
 * One structural move the QA walker can make (includes authoring choice context where applicable).
 *
 * - **narrativeNodeId** is the story node where a player choice originates (null for encounter_resolution).
 * - **encounterId** is set for combat/skill→encounter hops and for resolution source encounter.
 *
 * @typedef {Object} StructuralTransition
 * @property {string} from
 * @property {string} to
 * @property {'narrative_choice' | 'encounter_resolution'} edgeKind
 * @property {string | null} narrativeNodeId
 * @property {string | null} choiceId
 * @property {string | null} choiceLabel
 * @property {string | null} mechanicType
 * @property {string | null} mechanicBranch — e.g. onSuccess / onFailure for skill_check
 * @property {string | null} encounterId
 * @property {'onVictory' | 'onDefeat' | null} resolutionBranch
 */

/**
 * Full transition list for QA traces and graph analysis.
 *
 * @param {Record<string, { id: string, type?: string, text?: string, choices?: Array<{ id?: string, label?: string, mechanic?: Record<string, unknown> }> }>} nodes
 * @param {Record<string, { id?: string, name?: string, resolution?: { onVictory?: { nextNodeId?: string }, onDefeat?: { nextNodeId?: string } } }>} encounters
 * @returns {StructuralTransition[]}
 */
export function getStructuralTransitions(nodes, encounters) {
  /** @type {StructuralTransition[]} */
  const trs = []

  function addNarrative(fromN, to, nodeId, choice, mechanicType, mechanicBranch, encounterId = null) {
    trs.push({
      from: fromN,
      to,
      edgeKind: 'narrative_choice',
      narrativeNodeId: nodeId,
      choiceId: choice?.id != null ? String(choice.id) : null,
      choiceLabel: choice?.label != null ? String(choice.label) : null,
      mechanicType,
      mechanicBranch,
      encounterId,
      resolutionBranch: null,
    })
  }

  for (const [nodeId, node] of Object.entries(nodes)) {
    const fromN = walkNodeKey(nodeId)
    if (!node.choices) continue
    for (const choice of node.choices) {
      const m = choice.mechanic
      if (!m || typeof m !== 'object') continue
      const t = m.type
      if (t === 'navigate' && m.nextNodeId) {
        addNarrative(fromN, walkNodeKey(m.nextNodeId), nodeId, choice, 'navigate', null)
      }
      if (t === 'theater_begin') {
        const exit = m.exitNodeId || THEATER_DEFAULT_EXIT_NODE_ID
        addNarrative(fromN, walkNodeKey(exit), nodeId, choice, 'theater_begin', null)
      }
      if (t === 'feral_parliament_begin') {
        const exit = m.exitNodeId || FERAL_DEFAULT_EXIT_NODE_ID
        addNarrative(fromN, walkNodeKey(exit), nodeId, choice, 'feral_parliament_begin', null)
      }
      if (t === 'combat_init' && m.encounterId) {
        addNarrative(fromN, walkEncKey(m.encounterId), nodeId, choice, 'combat_init', null, String(m.encounterId))
      }
      if (t === 'skill_check') {
        if (m.onSuccess?.nextNodeId) {
          addNarrative(fromN, walkNodeKey(m.onSuccess.nextNodeId), nodeId, choice, 'skill_check', 'onSuccess')
        }
        if (m.onFailureEncounterId) {
          addNarrative(
            fromN,
            walkEncKey(m.onFailureEncounterId),
            nodeId,
            choice,
            'skill_check',
            'onFailureEncounter',
            String(m.onFailureEncounterId),
          )
        } else if (m.onFailure?.nextNodeId) {
          addNarrative(fromN, walkNodeKey(m.onFailure.nextNodeId), nodeId, choice, 'skill_check', 'onFailure')
        }
      }
    }
  }

  for (const [encId, enc] of Object.entries(encounters)) {
    const fromE = walkEncKey(encId)
    const encName = enc.name || encId
    const v = enc.resolution?.onVictory?.nextNodeId
    const d = enc.resolution?.onDefeat?.nextNodeId
    if (v) {
      trs.push({
        from: fromE,
        to: walkNodeKey(v),
        edgeKind: 'encounter_resolution',
        narrativeNodeId: null,
        choiceId: null,
        choiceLabel: `After encounter “${encName}” (${encId}) — victory`,
        mechanicType: 'encounter_resolution',
        mechanicBranch: null,
        encounterId: encId,
        resolutionBranch: 'onVictory',
      })
    }
    if (d) {
      trs.push({
        from: fromE,
        to: walkNodeKey(d),
        edgeKind: 'encounter_resolution',
        narrativeNodeId: null,
        choiceId: null,
        choiceLabel: `After encounter “${encName}” (${encId}) — defeat`,
        mechanicType: 'encounter_resolution',
        mechanicBranch: null,
        encounterId: encId,
        resolutionBranch: 'onDefeat',
      })
    }
  }

  trs.sort((a, b) => {
    if (a.from !== b.from) return a.from.localeCompare(b.from)
    if (a.to !== b.to) return a.to.localeCompare(b.to)
    const c1 = `${a.choiceId ?? ''}:${a.mechanicBranch ?? ''}:${a.resolutionBranch ?? ''}`
    const c2 = `${b.choiceId ?? ''}:${b.mechanicBranch ?? ''}:${b.resolutionBranch ?? ''}`
    return c1.localeCompare(c2)
  })

  return trs
}

/**
 * Directed structural edges (pairs only) — derived from {@link getStructuralTransitions}.
 *
 * @param {Record<string, unknown>} nodes
 * @param {Record<string, unknown>} encounters
 * @returns {Array<{ from: string, to: string }>}
 */
export function getStructuralEdges(nodes, encounters) {
  return getStructuralTransitions(nodes, encounters).map(({ from, to }) => ({ from, to }))
}

/**
 * Collect narrative node IDs that are targets of an edge (sources: narrative ids or `enc:*`).
 *
 * @param {Record<string, { id: string, type: string, choices?: Array<{ mechanic?: { type: string, nextNodeId?: string, onSuccess?: { nextNodeId: string }, onFailure?: { nextNodeId: string } } }>, onEnter?: unknown }>} nodes
 * @param {Record<string, { resolution?: { onVictory?: { nextNodeId: string }, onDefeat?: { nextNodeId: string } } }>} encounters
 * @returns {Map<string, Set<string>>} nodeId -> set of source node/encounter ids that point to it
 */
function buildIncoming(nodes, encounters) {
  const incoming = new Map()

  function addEdge(toId, fromId) {
    if (!toId) return
    if (!incoming.has(toId)) incoming.set(toId, new Set())
    incoming.get(toId).add(fromId)
  }

  for (const { from, to } of getStructuralEdges(nodes, encounters)) {
    if (!to.startsWith('node:')) continue
    const targetNodeId = to.slice('node:'.length)
    const fromId = from.startsWith('node:') ? from.slice('node:'.length) : from
    addEdge(targetNodeId, fromId)
  }

  return incoming
}

/**
 * Narrative nodes that have at least one outgoing structural edge.
 *
 * @param {Record<string, { id: string, type: string, choices?: Array<{ mechanic?: { type: string, nextNodeId?: string, encounterId?: string, onSuccess?: { nextNodeId: string }, onFailure?: { nextNodeId: string } } }> }>} nodes
 * @param {Record<string, { enemies?: Array<unknown>, resolution?: { onVictory?: { nextNodeId: string }, onDefeat?: { nextNodeId: string } } }>} encounters
 * @returns {Set<string>} node ids that have at least one outgoing edge
 */
function nodesWithOutgoing(nodes, encounters) {
  const hasOutgoing = new Set()
  for (const { from } of getStructuralEdges(nodes, encounters)) {
    if (from.startsWith('node:')) hasOutgoing.add(from.slice('node:'.length))
  }
  return hasOutgoing
}

/**
 * Orphan: node that has no inbound edges (except allowed start nodes).
 * Dead-end: node that has no outgoing choices and is not type 'ending' (and not in allowlist).
 *
 * @param {Record<string, { id: string, type: string, choices?: Array<unknown> }>} nodes
 * @param {Record<string, { resolution?: { onVictory?: { nextNodeId: string }, onDefeat?: { nextNodeId: string } } }>} encounters
 * @param {{ allowedStartIds?: string[], deadEndAllowlist?: Set<string> }} [options]
 * @returns {{ orphans: string[], deadEnds: string[], diagnostics: import('./types.js').Diagnostic[] }}
 */
export function analyzeGraph(nodes, encounters, options = {}) {
  const allowedStartIds = new Set(options.allowedStartIds ?? ['n_start'])
  const deadEndAllowlist = options.deadEndAllowlist ?? new Set()

  const nodeIds = new Set(Object.keys(nodes))
  const incoming = buildIncoming(nodes, encounters)
  const hasOutgoing = nodesWithOutgoing(nodes, encounters)

  const orphans = []
  const deadEnds = []
  const diagnostics = []
  const E = DIAGNOSTIC_SEVERITY.error
  const W = DIAGNOSTIC_SEVERITY.warning

  for (const id of nodeIds) {
    const inEdges = incoming.get(id)
    if (!inEdges?.size && !allowedStartIds.has(id)) {
      orphans.push(id)
      diagnostics.push({
        code: 'DATA008',
        severity: W,
        message: `Orphan node "${id}": no inbound edges (unreachable unless it is a start node)`,
        context: { nodeId: id },
        hint: 'Add a choice or encounter resolution that navigates to this node.',
      })
    }
  }

  for (const id of nodeIds) {
    if (deadEndAllowlist.has(id)) continue
    const node = nodes[id]
    if (node?.type === 'ending') continue
    if (hasOutgoing.has(id)) continue
    deadEnds.push(id)
    diagnostics.push({
      code: 'DATA009',
      severity: W,
      message: `Dead-end node "${id}": no outgoing choices (player cannot leave unless type is ending)`,
      context: { nodeId: id },
      hint: 'Add at least one choice with navigate/combat_init/skill_check, or set type to ending.',
    })
  }

  return { orphans, deadEnds, diagnostics }
}
