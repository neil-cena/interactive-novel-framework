/**
 * Static narrative / CSV-facing checks (no graph walk). Pure; no Node built-ins.
 */

import { DIAGNOSTIC_SEVERITY } from './types.js'

/**
 * @param {Record<string, { id?: string, type?: string, text?: string, choices?: Array<{ id?: string, label?: string }> }>} nodes
 * @returns {import('./types.js').Diagnostic[]}
 */
export function runNarrativeStaticChecks(nodes) {
  const diagnostics = []
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === 'narrative' || node.type === 'ending') {
      const text = typeof node.text === 'string' ? node.text.trim() : ''
      if (!text) {
        diagnostics.push({
          code: 'DATA011',
          severity: DIAGNOSTIC_SEVERITY.warning,
          file: 'nodes.csv',
          message: `Node "${id}" (${node.type}) has empty or missing text`,
          context: { nodeId: id, type: node.type },
          hint: 'Add visible story text or mark as WIP explicitly in tooling.',
        })
      }
    }
    if (Array.isArray(node.choices)) {
      for (const ch of node.choices) {
        const label = typeof ch.label === 'string' ? ch.label.trim() : ''
        if (ch.id && !label) {
          diagnostics.push({
            code: 'DATA012',
            severity: DIAGNOSTIC_SEVERITY.warning,
            file: 'nodes.csv',
            message: `Node "${id}" choice "${ch.id}" has empty label`,
            context: { nodeId: id, choiceId: ch.id },
          })
        }
      }
    }
  }
  return diagnostics
}
