/**
 * Dev watcher for data/csv. Rebuilds src/data/*.ts on CSV changes.
 * Uses chokidar; queue/coalesce events; no overwrite on validation errors unless --force-write.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import chokidar from 'chokidar'
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
import { debounce } from './data-core/debounce.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const csvDir = path.join(projectRoot, 'data', 'csv')
const dataDir = path.join(projectRoot, 'src', 'data')

const forceWrite = process.argv.includes('--force-write')

function runRebuild() {
  const start = Date.now()
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
    console.error('[dev:data] Parse failed:', err.message)
    return
  }
  const nodes = parseNodes(nodesRows)
  const items = parseItems(itemsRows)
  const enemies = parseEnemies(enemiesRows)
  const encounters = parseEncounters(encountersRows)
  const { errors, warnings } = validateData(nodes, items, enemies, encounters)
  const { diagnostics: graphDiagnostics } = analyzeGraph(nodes, encounters)
  const allWarnings = [...warnings, ...graphDiagnostics]

  for (const w of allWarnings) {
    console.warn('[dev:data] Warning:', w.message)
  }
  for (const e of errors) {
    console.error('[dev:data] Error:', e.message)
  }

  if (errors.length > 0 && !forceWrite) {
    console.log(`[dev:data] ${errors.length} error(s) — not writing. Use --force-write to overwrite.`)
    return
  }

  try {
    writeDataFile(dataDir, 'nodes.ts', generateTsFile('../types/story', 'StoryNode', 'STORY_NODES', nodes))
    writeDataFile(dataDir, 'items.ts', generateTsFile('../types/items', 'ItemTemplate', 'ITEM_DICTIONARY', items))
    writeDataFile(dataDir, 'enemies.ts', generateTsFile('../types/combat', 'EnemyTemplate', 'ENEMY_DICTIONARY', enemies))
    writeDataFile(
      dataDir,
      'encounters.ts',
      generateTsFile('../types/combat', 'CombatEncounter', 'COMBAT_ENCOUNTERS', encounters),
    )
  } catch (err) {
    console.error('[dev:data] Write failed:', err.message)
    return
  }

  const duration = Date.now() - start
  console.log(
    `[dev:data] Rebuilt in ${duration}ms — ${errors.length} error(s), ${allWarnings.length} warning(s)`,
  )
}

const debouncedRebuild = debounce(runRebuild, 150)

function main() {
  console.log('[dev:data] Watching data/csv/ ...')
  runRebuild()

  const watcher = chokidar.watch(csvDir, {
    ignoreInitial: true,
  })

  watcher.on('add', (p) => {
    if (path.extname(p) === '.csv') debouncedRebuild()
  })
  watcher.on('change', (p) => {
    if (path.extname(p) === '.csv') debouncedRebuild()
  })
  watcher.on('unlink', (p) => {
    if (path.extname(p) === '.csv') debouncedRebuild()
  })

  const shutdown = () => {
    watcher.close().then(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()
