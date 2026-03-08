/**
 * Shared CSV → parse → validate → graph preflight for lint CLI and QA orchestrator.
 * Node-free logic except readCsv: callers supply csvDir and use io from Node entrypoints.
 */

import { readCsv } from './io.js'
import {
  parseNodes,
  parseItems,
  parseEnemies,
  parseEncounters,
} from './parse.js'
import { validateData } from './validate.js'
import { analyzeGraph } from './graph.js'
import { DIAGNOSTIC_SEVERITY } from './types.js'

/**
 * @param {Array<Record<string, string>>} rows
 * @param {string} file
 * @param {string} [idColumn]
 * @returns {import('./types.js').Diagnostic[]}
 */
export function duplicateIdDiagnostics(rows, file, idColumn = 'id') {
  const seen = new Map()
  const diagnostics = []
  rows.forEach((row, index) => {
    const id = row[idColumn]?.trim()
    if (!id) return
    const rowNum = index + 2
    if (seen.has(id)) {
      diagnostics.push({
        code: 'DATA001',
        severity: DIAGNOSTIC_SEVERITY.error,
        file,
        row: rowNum,
        message: `Duplicate ID "${id}" (also at row ${seen.get(id)})`,
        context: { id, file },
      })
    } else {
      seen.set(id, rowNum)
    }
  })
  return diagnostics
}

/**
 * @param {import('./types.js').Diagnostic} d
 * @returns {import('./types.js').Diagnostic}
 */
export function attachFileToDiagnostic(d) {
  const c = d.context || {}
  if (c.nodeId != null) return { ...d, file: d.file || 'nodes.csv' }
  if (c.itemId != null) return { ...d, file: d.file || 'items.csv' }
  if (c.enemyId != null) return { ...d, file: d.file || 'enemies.csv' }
  if (c.encounterId != null) return { ...d, file: d.file || 'encounters.csv' }
  return d
}

/**
 * Read CSVs under csvDir, run duplicate-id checks, parse, validateData, analyzeGraph.
 *
 * @param {string} csvDir absolute or project-relative directory containing *.csv
 * @param {{ allowedStartIds?: Iterable<string>, deadEndAllowlist?: Set<string> }} graphOptions
 * @returns {{
 *   nodes: Record<string, unknown>,
 *   items: Record<string, unknown>,
 *   enemies: Record<string, unknown>,
 *   encounters: Record<string, unknown>,
 *   duplicateDiagnostics: import('./types.js').Diagnostic[],
 *   validateErrors: import('./types.js').Diagnostic[],
 *   validateWarnings: import('./types.js').Diagnostic[],
 *   graphOrphans: string[],
 *   graphDeadEnds: string[],
 *   graphDiagnostics: import('./types.js').Diagnostic[],
 *   allErrors: import('./types.js').Diagnostic[],
 *   allWarnings: import('./types.js').Diagnostic[],
 * }}
 */
export function runCsvDataPreflight(csvDir, graphOptions) {
  const nodesRows = readCsv(csvDir, 'nodes.csv')
  const itemsRows = readCsv(csvDir, 'items.csv')
  const enemiesRows = readCsv(csvDir, 'enemies.csv')
  const encountersRows = readCsv(csvDir, 'encounters.csv')

  const duplicateDiagnostics = [
    ...duplicateIdDiagnostics(nodesRows, 'nodes.csv'),
    ...duplicateIdDiagnostics(itemsRows, 'items.csv'),
    ...duplicateIdDiagnostics(enemiesRows, 'enemies.csv'),
    ...duplicateIdDiagnostics(encountersRows, 'encounters.csv'),
  ]

  const nodes = parseNodes(nodesRows)
  const items = parseItems(itemsRows)
  const enemies = parseEnemies(enemiesRows)
  const encounters = parseEncounters(encountersRows)

  const { errors: validateErrors, warnings: validateWarnings } = validateData(
    nodes,
    items,
    enemies,
    encounters,
  )
  const { orphans: graphOrphans, deadEnds: graphDeadEnds, diagnostics: graphDiagnostics } = analyzeGraph(
    nodes,
    encounters,
    graphOptions,
  )

  const allErrors = [
    ...duplicateDiagnostics.filter((d) => d.severity === DIAGNOSTIC_SEVERITY.error),
    ...validateErrors.map(attachFileToDiagnostic),
  ]
  const allWarnings = [
    ...duplicateDiagnostics.filter((d) => d.severity === DIAGNOSTIC_SEVERITY.warning),
    ...validateWarnings.map(attachFileToDiagnostic),
    ...graphDiagnostics.map(attachFileToDiagnostic),
  ]

  return {
    nodes,
    items,
    enemies,
    encounters,
    duplicateDiagnostics,
    validateErrors,
    validateWarnings,
    graphOrphans,
    graphDeadEnds,
    graphDiagnostics,
    allErrors,
    allWarnings,
  }
}
