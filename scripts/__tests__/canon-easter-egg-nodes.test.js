import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv } from '../data-core/io.js'
import {
  parseNodes,
  parseItems,
  parseEnemies,
  parseEncounters,
  validateData,
} from '../build-data.js'
import { analyzeGraph } from '../data-core/graph.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvDir = path.resolve(__dirname, '../../data/csv')

const ALLOWED_START_IDS = new Set(['n_start', 'start'])

describe('canon easter egg branch (nodes.csv)', () => {
  it('hides egg on chronicler path at chronicle_distribution; exit returns to distribution', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const itemsRows = readCsv(csvDir, 'items.csv')
    const enemiesRows = readCsv(csvDir, 'enemies.csv')
    const encountersRows = readCsv(csvDir, 'encounters.csv')

    const nodes = parseNodes(nodesRows)
    const items = parseItems(itemsRows)
    const enemies = parseEnemies(enemiesRows)
    const encounters = parseEncounters(encountersRows)

    expect(nodes.start.choices.some((c) => c.id === 'c_start_4')).toBe(false)

    expect(nodes.egg_canon_codex).toBeDefined()
    expect(nodes.egg_canon_codex.type).toBe('narrative')
    expect(nodes.egg_canon_codex.text).toContain('Mandatory inspection sequence')
    expect(nodes.egg_canon_codex.text).toContain('basement lamplight')

    const dist = nodes.chronicle_distribution
    expect(dist).toBeDefined()
    const eggChoice = dist.choices.find((c) => c.id === 'c_dist_egg')
    expect(eggChoice).toBeDefined()
    expect(eggChoice?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'egg_canon_codex' })
    expect(eggChoice?.visibilityRequirements).toEqual([{ type: 'has_flag', key: 'chose_chronicler' }])

    const eggExit = nodes.egg_canon_codex.choices[0]
    expect(eggExit?.id).toBe('c_egg_canon_ack')
    expect(eggExit?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'chronicle_distribution' })

    const { errors } = validateData(nodes, items, enemies, encounters)
    expect(errors).toEqual([])

    const { diagnostics } = analyzeGraph(nodes, encounters, { allowedStartIds: ALLOWED_START_IDS })
    const eggOrphans = diagnostics.filter(
      (d) => d.code === 'DATA008' && d.context?.nodeId === 'egg_canon_codex',
    )
    expect(eggOrphans).toEqual([])
  })
})
