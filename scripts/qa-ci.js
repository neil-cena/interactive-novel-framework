/**
 * CI-oriented QA entry: runs runFullProjectQa for a named profile.
 * Default profile: ci-pr (preflight + narrative static; no structural walk).
 *
 * Usage: node scripts/qa-ci.js [--profile=ci-pr|nightly|local-full]
 * Env: QA_PROFILE overrides default when --profile is omitted.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runFullProjectQa } from './data-core/qa-orchestrator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function parseProfileId() {
  const args = process.argv.slice(2)
  for (const a of args) {
    if (a.startsWith('--profile=')) {
      return a.slice('--profile='.length)
    }
  }
  return process.env.QA_PROFILE || 'ci-pr'
}

function main() {
  const profileId = parseProfileId()
  const csvDir = path.join(projectRoot, 'data', 'csv')

  const envelope = runFullProjectQa({ profileId, csvDir })

  console.log(
    `[qa-ci] envelope v${envelope.version} profile=${envelope.profileId} mergedOutcome=${envelope.mergedOutcome}`,
  )
  for (const [name, stage] of Object.entries(envelope.stages)) {
    console.log(`[qa-ci]   stage ${name}:`, stage.outcome ?? stage)
  }

  if (envelope.mergedOutcome === 'pass') {
    process.exit(0)
  }
  if (envelope.mergedOutcome === 'inconclusive') {
    process.exit(1)
  }
  process.exit(1)
}

main()
