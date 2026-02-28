/**
 * Pure graph analysis: incoming/outgoing edges, orphan and dead-end nodes.
 * No Node built-ins. Safe to import from browser (authoring app).
 */

import { DIAGNOSTIC_SEVERITY } from './types.js'

/**
 * Collect all node IDs that are targets of an edge (from nodes and encounters).
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

  for (const [nodeId, node] of Object.entries(nodes)) {
    if (!node.choices) continue
    for (const choice of node.choices) {
      const m = choice.mechanic
      if (!m) continue
      if (m.type === 'navigate' && m.nextNodeId) addEdge(m.nextNodeId, nodeId)
      if (m.type === 'skill_check') {
        if (m.onSuccess?.nextNodeId) addEdge(m.onSuccess.nextNodeId, nodeId)
        if (m.onFailure?.nextNodeId) addEdge(m.onFailure.nextNodeId, nodeId)
      }
    }
  }

  for (const [encId, enc] of Object.entries(encounters)) {
    const v = enc.resolution?.onVictory?.nextNodeId
    const d = enc.resolution?.onDefeat?.nextNodeId
    if (v) addEdge(v, `enc:${encId}`)
    if (d) addEdge(d, `enc:${encId}`)
  }

  return incoming
}

/**
 * Which nodes have at least one outgoing edge (choice or encounter resolution)?
 *
 * @param {Record<string, { id: string, type: string, choices?: Array<{ mechanic?: { type: string, nextNodeId?: string, encounterId?: string, onSuccess?: { nextNodeId: string }, onFailure?: { nextNodeId: string } } }> }>} nodes
 * @param {Record<string, { enemies?: Array<unknown>, resolution?: { onVictory?: { nextNodeId: string }, onDefeat?: { nextNodeId: string } } }>} encounters
 * @returns {Set<string>} node ids that have at least one outgoing edge
 */
function nodesWithOutgoing(nodes, encounters) {
  const hasOutgoing = new Set()
  for (const node of Object.values(nodes)) {
    if (!node.choices?.length) continue
    for (const choice of node.choices) {
      const m = choice.mechanic
      if (!m) continue
      if (m.type === 'navigate' && m.nextNodeId) hasOutgoing.add(node.id)
      if (m.type === 'combat_init') hasOutgoing.add(node.id)
      if (m.type === 'skill_check') hasOutgoing.add(node.id)
    }
  }
  for (const enc of Object.values(encounters)) {
    if (enc.resolution?.onVictory?.nextNodeId || enc.resolution?.onDefeat?.nextNodeId) {
      // Encounter resolution targets are nodes; we don't mark encounters as "having outgoing" for dead-end of nodes
    }
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
