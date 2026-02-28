/**
 * CSV data linter CLI. Validates all CSVs and prints diagnostics.
 * Exit 0 = no errors, 1 = errors found, 2 = fatal parse/runtime failure.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv } from './data-core/io.js'
import {
  parseNodes,
  parseItems,
  parseEnemies,
  parseEncounters,
} from './data-core/parse.js'
import { validateData } from './data-core/validate.js'
import { analyzeGraph } from './data-core/graph.js'
import { DIAGNOSTIC_SEVERITY } from './data-core/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const csvDir = path.join(projectRoot, 'data', 'csv')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = { format: 'table', maxWarnings: Infinity, strict: false }
  for (const arg of args) {
    if (arg === '--format=json' || arg === '--format=table') {
      options.format = arg.split('=')[1]
    } else if (arg.startsWith('--max-warnings=')) {
      const n = parseInt(arg.split('=')[1], 10)
      if (!Number.isNaN(n)) options.maxWarnings = n
    } else if (arg === '--strict') {
      options.strict = true
    }
  }
  return options
}

/**
 * Collect duplicate-ID diagnostics from raw CSV rows (1-based row numbers).
 * @param {Array<Record<string, string>>} rows
 * @param {string} file
 * @param {string} idColumn
 * @returns {import('./data-core/types.js').Diagnostic[]}
 */
function duplicateIdDiagnostics(rows, file, idColumn = 'id') {
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

function run() {
  const options = parseArgs()

  let nodesRows
  let itemsRows
  let enemiesRows
  let encountersRows

  try {
    nodesRows = readCsv(csvDir, 'nodes.csv')
    itemsRows = readCsv(csvDir, 'items.csv')
    enemiesRows = readCsv(csvDir, 'enemies.csv')
    encountersRows = readCsv(csvDir, 'encounters.csv')
  } catch (err) {
    console.error('Fatal:', err.message)
    process.exit(2)
  }

  const duplicateDiag = [
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
  const { diagnostics: graphDiagnostics } = analyzeGraph(nodes, encounters)

  function attachFile(d) {
    const c = d.context || {}
    if (c.nodeId != null) return { ...d, file: d.file || 'nodes.csv' }
    if (c.itemId != null) return { ...d, file: d.file || 'items.csv' }
    if (c.enemyId != null) return { ...d, file: d.file || 'enemies.csv' }
    if (c.encounterId != null) return { ...d, file: d.file || 'encounters.csv' }
    return d
  }
  const allErrors = [
    ...duplicateDiag.filter((d) => d.severity === 'error'),
    ...validateErrors.map(attachFile),
  ]
  const allWarnings = [
    ...duplicateDiag.filter((d) => d.severity === 'warning'),
    ...validateWarnings.map(attachFile),
    ...graphDiagnostics.map(attachFile),
  ]

  if (options.strict) {
    allErrors.push(...allWarnings)
    allWarnings.length = 0
  }

  const errorCount = allErrors.length
  const warningCount = allWarnings.length
  const overWarningLimit =
    options.maxWarnings !== Infinity && warningCount > options.maxWarnings

  if (options.format === 'json') {
    const payload = {
      errors: allErrors,
      warnings: allWarnings,
      errorCount,
      warningCount,
      success: errorCount === 0 && !overWarningLimit,
    }
    console.log(JSON.stringify(payload, null, 0))
  } else {
    const byFile = (list) => {
      const map = new Map()
      for (const d of list) {
        const f = d.file || '(global)'
        if (!map.has(f)) map.set(f, [])
        map.get(f).push(d)
      }
      return map
    }
    const printList = (list, label) => {
      if (list.length === 0) return
      const byF = byFile(list)
      for (const [file, diags] of byF) {
        console.log(`\n${file} [${label}]`)
        for (const d of diags) {
          const loc = d.row != null ? `:${d.row}` : ''
          console.log(`  ${d.code}${loc}: ${d.message}`)
        }
      }
    }
    if (allErrors.length) printList(allErrors, 'error')
    if (allWarnings.length) printList(allWarnings, 'warning')
    if (allErrors.length || allWarnings.length) {
      console.log(`\n${errorCount} error(s), ${warningCount} warning(s)`)
    } else {
      console.log('No errors or warnings.')
    }
  }

  if (errorCount > 0) {
    process.exit(1)
  }
  if (overWarningLimit) {
    process.exit(1)
  }
  process.exit(0)
}

run()
