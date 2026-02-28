/**
 * Thin orchestrator: reads CSVs via data-core/io, parses/validates/generates via data-core.
 * Node-only entrypoint; do not import io.js from browser code.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv, writeDataFile } from './data-core/io.js'
import {
  parseNodes,
  parseItems,
  parseEnemies,
  parseEncounters,
} from './data-core/parse.js'
import { validateData } from './data-core/validate.js'
import { analyzeGraph } from './data-core/graph.js'
import { generateTsFile } from './data-core/generate.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const csvDir = path.join(projectRoot, 'data', 'csv')
const dataDir = path.join(projectRoot, 'src', 'data')

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)

function run() {
  const validateOnly = process.argv.includes('--validate-only')
  const nodesRows = readCsv(csvDir, 'nodes.csv')
  const itemsRows = readCsv(csvDir, 'items.csv')
  const enemiesRows = readCsv(csvDir, 'enemies.csv')
  const encountersRows = readCsv(csvDir, 'encounters.csv')

  const nodes = parseNodes(nodesRows)
  const items = parseItems(itemsRows)
  const enemies = parseEnemies(enemiesRows)
  const encounters = parseEncounters(encountersRows)

  const { errors, warnings } = validateData(nodes, items, enemies, encounters)
  const { diagnostics: graphDiagnostics } = analyzeGraph(nodes, encounters)
  const allWarnings = [...warnings, ...graphDiagnostics]

  for (const w of allWarnings) {
    console.warn('Warning:', w.message)
  }
  for (const e of errors) {
    console.error('Error:', e.message)
  }
  if (errors.length > 0) {
    process.exitCode = 1
    if (validateOnly) return
    return
  }
  if (validateOnly) {
    console.log('Validation complete.', errors.length ? 'Errors found.' : 'No errors.')
    return
  }

  writeDataFile(dataDir, 'nodes.ts', generateTsFile('../types/story', 'StoryNode', 'STORY_NODES', nodes))
  writeDataFile(dataDir, 'items.ts', generateTsFile('../types/items', 'ItemTemplate', 'ITEM_DICTIONARY', items))
  writeDataFile(dataDir, 'enemies.ts', generateTsFile('../types/combat', 'EnemyTemplate', 'ENEMY_DICTIONARY', enemies))
  writeDataFile(
    dataDir,
    'encounters.ts',
    generateTsFile('../types/combat', 'CombatEncounter', 'COMBAT_ENCOUNTERS', encounters),
  )

  console.log(
    [
      `Wrote nodes.ts (${Object.keys(nodes).length} rows)`,
      `Wrote items.ts (${Object.keys(items).length} rows)`,
      `Wrote enemies.ts (${Object.keys(enemies).length} rows)`,
      `Wrote encounters.ts (${Object.keys(encounters).length} rows)`,
    ].join('\n'),
  )
}

if (isMain) {
  run()
}

// Re-export for tests and consumers that import from build-data
export {
  splitPipe,
  asNumber,
  asBoolean,
  parseAction,
  parseOnEnter,
  parseVisibility,
  parseMechanic,
  parseNodes,
  parseItems,
  parseEnemies,
  parseEncounterEnemies,
  parseEncounters,
  NODE_TYPES,
  ITEM_TYPES,
  STAT_CHECK_OPERATORS,
  STAT_CHECK_STATS,
  DICE_NOTATION_REGEX,
  VALID_ATTRIBUTES,
} from './data-core/parse.js'
export { validateData } from './data-core/validate.js'
