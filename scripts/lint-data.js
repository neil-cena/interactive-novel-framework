/**
 * CSV data linter CLI. Validates all CSVs and prints diagnostics.
 * Exit 0 = no errors, 1 = errors found, 2 = fatal parse/runtime failure.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getReleaseGraphAnalyzeOptions } from './data-core/qa-bind-options.js'
import { runCsvDataPreflight } from './data-core/qa-data-preflight.js'

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

function run() {
  const options = parseArgs()

  let pre
  try {
    pre = runCsvDataPreflight(csvDir, getReleaseGraphAnalyzeOptions())
  } catch (err) {
    console.error('Fatal:', err instanceof Error ? err.message : err)
    process.exit(2)
  }

  const allErrors = [...pre.allErrors]
  let allWarnings = [...pre.allWarnings]

  if (options.strict) {
    allErrors.push(...allWarnings)
    allWarnings = []
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
