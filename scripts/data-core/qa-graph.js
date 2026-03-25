/**
 * Walk-graph helpers for structural QA (pure; no Node built-ins).
 */

import { getStructuralTransitions, walkNodeKey, walkEncKey } from './graph.js'

/**
 * @param {Record<string, unknown>} nodes
 * @param {Record<string, unknown>} encounters
 * @returns {{ adj: Map<string, Array<{ to: string, transition: import('./graph.js').StructuralTransition }>>, brokenEdges: Array<{ from: string, to: string, reason: string }> }}
 */
export function buildWalkAdjacency(nodes, encounters) {
  const adj = new Map()
  const brokenEdges = []

  function add(from, payload) {
    if (!adj.has(from)) adj.set(from, [])
    adj.get(from).push(payload)
  }

  for (const transition of getStructuralTransitions(nodes, encounters)) {
    const { from, to } = transition
    if (to.startsWith('node:')) {
      const id = to.slice('node:'.length)
      if (!nodes[id]) {
        brokenEdges.push({ from, to, reason: `missing_node:${id}` })
        continue
      }
    } else if (to.startsWith('enc:')) {
      const id = to.slice('enc:'.length)
      if (!encounters[id]) {
        brokenEdges.push({ from, to, reason: `missing_encounter:${id}` })
        continue
      }
    }
    add(from, { to, transition })
  }

  for (const [, outs] of adj) {
    outs.sort((a, b) => {
      if (a.to !== b.to) return a.to.localeCompare(b.to)
      const ka = `${a.transition.choiceId ?? ''}:${a.transition.mechanicBranch ?? ''}:${a.transition.resolutionBranch ?? ''}`
      const kb = `${b.transition.choiceId ?? ''}:${b.transition.mechanicBranch ?? ''}:${b.transition.resolutionBranch ?? ''}`
      return ka.localeCompare(kb)
    })
  }

  return { adj, brokenEdges }
}

/**
 * @param {string[]} stack walk vertices on path (excluding `next`)
 * @param {string} next
 * @returns {boolean}
 */
export function wouldStackCycle(stack, next) {
  return stack.includes(next)
}

export { walkNodeKey, walkEncKey, getStructuralTransitions }
