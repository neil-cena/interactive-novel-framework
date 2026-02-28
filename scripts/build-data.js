import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const csvDir = path.join(projectRoot, 'data', 'csv')
const dataDir = path.join(projectRoot, 'src', 'data')

function readCsv(fileName) {
  const filePath = path.join(csvDir, fileName)
  const csvText = fs.readFileSync(filePath, 'utf8')
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  })

  if (parsed.errors.length > 0) {
    const message = parsed.errors.map((error) => `${fileName}: ${error.message}`).join('\n')
    throw new Error(`CSV parse errors:\n${message}`)
  }

  return parsed.data
}

function splitPipe(value) {
  if (!value) {
    return []
  }

  return value
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function previewBrokenRow(row) {
  if (row && typeof row.text === 'string' && row.text.trim()) {
    return `${row.text.substring(0, 30)}...`
  }

  return JSON.stringify(row ?? {}).substring(0, 50)
}

function asNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asBoolean(value, fallback = false) {
  if (!value) {
    return fallback
  }

  const normalized = String(value).toLowerCase()
  if (normalized === 'true') {
    return true
  }
  if (normalized === 'false') {
    return false
  }
  return fallback
}

function parseAction(actionToken) {
  const [action, ...parts] = actionToken.split(':').map((token) => token.trim())
  if (!action) {
    console.warn('[build-data] parseAction: empty or invalid action token:', JSON.stringify(actionToken))
    return null
  }

  switch (action) {
    case 'set_flag': {
      const [key, rawValue] = parts
      if (!key) {
        console.warn('[build-data] parseAction: set_flag missing key. Token:', JSON.stringify(actionToken))
        return null
      }
      return {
        action: 'set_flag',
        key,
        value: rawValue === undefined || rawValue === '' ? true : asBoolean(rawValue, true),
      }
    }
    case 'add_item':
    case 'remove_item': {
      const [itemId, qtyValue] = parts
      if (!itemId) {
        console.warn('[build-data] parseAction: add_item/remove_item missing itemId. Token:', JSON.stringify(actionToken))
        return null
      }
      return {
        action,
        itemId,
        qty: asNumber(qtyValue, 1),
      }
    }
    case 'adjust_hp':
    case 'adjust_currency': {
      const [amountValue] = parts
      return {
        action,
        amount: asNumber(amountValue, 0),
      }
    }
    default:
      console.warn('[build-data] parseAction: unknown action type:', action, 'Token:', JSON.stringify(actionToken))
      return null
  }
}

function parseOnEnter(value) {
  const actions = splitPipe(value).map(parseAction).filter(Boolean)
  return actions.length > 0 ? actions : undefined
}

function parseVisibility(value) {
  const requirements = splitPipe(value)
    .map((token) => {
      const [type, ...parts] = token.split(':').map((segment) => segment.trim())
      if (!type) {
        console.warn('[build-data] parseVisibility: missing type. Token:', JSON.stringify(token))
        return null
      }

      if (type === 'has_flag') {
        const [key] = parts
        if (!key) {
          console.warn('[build-data] parseVisibility: has_flag missing key. Token:', JSON.stringify(token))
          return null
        }
        return { type: 'has_flag', key }
      }

      if (type === 'has_item') {
        const [itemId] = parts
        if (!itemId) {
          console.warn('[build-data] parseVisibility: has_item missing itemId. Token:', JSON.stringify(token))
          return null
        }
        return { type: 'has_item', itemId }
      }

      if (type === 'stat_check') {
        const [stat, operator, rawValue] = parts
        if (!stat || !operator || rawValue === undefined || rawValue === '') {
          console.warn('[build-data] parseVisibility: stat_check missing stat/operator/value. Token:', JSON.stringify(token))
          return null
        }
        return {
          type: 'stat_check',
          stat,
          operator,
          value: asNumber(rawValue, 0),
        }
      }

      console.warn('[build-data] parseVisibility: unknown type:', type, 'Token:', JSON.stringify(token))
      return null
    })
    .filter(Boolean)

  return requirements.length > 0 ? requirements : undefined
}

function parseMechanic(value) {
  const [mechanicType, ...parts] = String(value)
    .split(':')
    .map((segment) => segment.trim())
  if (!mechanicType) {
    console.warn('[build-data] parseMechanic: empty or missing mechanic type. Value:', JSON.stringify(value))
    return null
  }

  if (mechanicType === 'navigate') {
    const [nextNodeId] = parts
    if (!nextNodeId) {
      console.warn('[build-data] parseMechanic: navigate missing nextNodeId. Value:', JSON.stringify(value))
      return null
    }
    return { type: 'navigate', nextNodeId }
  }

  if (mechanicType === 'combat_init') {
    const [encounterId] = parts
    if (!encounterId) {
      console.warn('[build-data] parseMechanic: combat_init missing encounterId. Value:', JSON.stringify(value))
      return null
    }
    return { type: 'combat_init', encounterId }
  }

  if (mechanicType === 'skill_check') {
    const [dice, dcValue, successNodeId, failureNodeId, onFailureEncounterId] = parts
    if (!dice || !dcValue || !successNodeId || !failureNodeId) {
      console.warn('[build-data] parseMechanic: skill_check missing dice/dc/successNodeId/failureNodeId. Value:', JSON.stringify(value))
      return null
    }

    const mechanic = {
      type: 'skill_check',
      dice,
      dc: asNumber(dcValue, 0),
      onSuccess: { nextNodeId: successNodeId },
      onFailure: { nextNodeId: failureNodeId },
    }

    if (onFailureEncounterId) {
      mechanic.onFailureEncounterId = onFailureEncounterId
    }

    return mechanic
  }

  console.warn('[build-data] parseMechanic: unknown mechanic type:', mechanicType, 'Value:', JSON.stringify(value))
  return null
}

function parseNodes(rows) {
  const nodes = {}

  for (const row of rows) {
    const id = row.id
    if (!id) {
      console.warn(
        `Warning: Skipped a row due to missing ID. Row data: ${previewBrokenRow(row)}`,
      )
      continue
    }

    const choices = []
    for (let index = 1; index <= 3; index += 1) {
      const choiceId = row[`choice${index}_id`]
      if (!choiceId) {
        continue
      }

      const label = row[`choice${index}_label`]
      const mechanicRaw = row[`choice${index}_mechanic`]
      const mechanic = parseMechanic(mechanicRaw)
      if (!label || !mechanic) {
        continue
      }

      const choice = {
        id: choiceId,
        label,
        mechanic,
      }

      const visibility = parseVisibility(row[`choice${index}_visibility`])
      if (visibility) {
        choice.visibilityRequirements = visibility
      }

      choices.push(choice)
    }

    const node = {
      id,
      type: row.type,
      text: row.text ?? '',
    }

    const onEnter = parseOnEnter(row.onEnter)
    if (onEnter) {
      node.onEnter = onEnter
    }

    if (choices.length > 0) {
      node.choices = choices
    }

    nodes[id] = node
  }

  return nodes
}

function parseItems(rows) {
  const items = {}

  for (const row of rows) {
    const id = row.id
    if (!id) {
      console.warn(
        `Warning: Skipped a row due to missing ID. Row data: ${previewBrokenRow(row)}`,
      )
      continue
    }

    const item = {
      id,
      name: row.name ?? id,
      type: row.type,
    }

    if (row.damage) {
      item.damage = row.damage
    }

    if (row.attackBonus) {
      item.attackBonus = asNumber(row.attackBonus, 0)
    }

    if (row.acBonus) {
      item.acBonus = asNumber(row.acBonus, 0)
    }

    if (row.effect) {
      const parsedEffect = parseAction(row.effect)
      if (parsedEffect) {
        item.effect = parsedEffect
      }
    }

    items[id] = item
  }

  return items
}

function parseEnemies(rows) {
  const enemies = {}

  for (const row of rows) {
    const id = row.id
    if (!id) {
      console.warn(
        `Warning: Skipped a row due to missing ID. Row data: ${previewBrokenRow(row)}`,
      )
      continue
    }

    enemies[id] = {
      id,
      name: row.name ?? id,
      hp: asNumber(row.hp, 1),
      ac: asNumber(row.ac, 10),
      attackBonus: asNumber(row.attackBonus, 0),
      damage: row.damage ?? '1d2',
    }
  }

  return enemies
}

function parseEncounterEnemies(value) {
  return splitPipe(value)
    .map((token) => {
      const [enemyId, countValue] = token.split(':').map((part) => part.trim())
      if (!enemyId) {
        return null
      }

      return {
        enemyId,
        count: asNumber(countValue, 1),
      }
    })
    .filter(Boolean)
}

function parseEncounters(rows) {
  const encounters = {}

  for (const row of rows) {
    const id = row.id
    if (!id) {
      console.warn(
        `Warning: Skipped a row due to missing ID. Row data: ${previewBrokenRow(row)}`,
      )
      continue
    }

    encounters[id] = {
      id,
      type: 'combat',
      enemies: parseEncounterEnemies(row.enemies),
      resolution: {
        onVictory: { nextNodeId: row.onVictory },
        onDefeat: { nextNodeId: row.onDefeat },
      },
    }
  }

  return encounters
}

function generateTsFile(importPath, importName, exportName, value) {
  const objectLiteral = JSON.stringify(value, null, 2)
  return [
    '// Auto-generated by build-data. Do not edit manually.',
    `import type { ${importName} } from '${importPath}'`,
    '',
    `export const ${exportName}: Record<string, ${importName}> = ${objectLiteral}`,
    '',
  ].join('\n')
}

function writeDataFile(fileName, content) {
  const outputPath = path.join(dataDir, fileName)
  fs.writeFileSync(outputPath, content, 'utf8')
}

const NODE_TYPES = new Set(['narrative', 'encounter', 'ending'])
const ITEM_TYPES = new Set(['weapon', 'consumable', 'tool'])
const STAT_CHECK_OPERATORS = new Set(['>=', '<=', '==', '>', '<'])
const STAT_CHECK_STATS = new Set(['hpCurrent', 'currency'])
const DICE_NOTATION_REGEX = /^\d+d\d+([+-]\d+)?$/i

function validateData(nodes, items, enemies, encounters) {
  const errors = []
  const warnings = []
  const nodeIds = new Set(Object.keys(nodes))
  const itemIds = new Set(Object.keys(items))
  const enemyIds = new Set(Object.keys(enemies))
  const encounterIds = new Set(Object.keys(encounters))

  function err(msg) {
    errors.push(msg)
  }
  function warn(msg) {
    warnings.push(msg)
  }

  for (const [id, node] of Object.entries(nodes)) {
    if (!NODE_TYPES.has(node.type)) {
      err(`Node "${id}": invalid type "${node.type}". Must be one of: narrative, encounter, ending`)
    }
    if (!node.choices) continue
    for (const choice of node.choices) {
      const m = choice.mechanic
      if (!m) continue
      if (m.type === 'navigate') {
        if (!nodeIds.has(m.nextNodeId)) {
          err(`Node "${id}" choice "${choice.id}": navigate targets missing node "${m.nextNodeId}"`)
        }
      } else if (m.type === 'combat_init') {
        if (!encounterIds.has(m.encounterId)) {
          err(`Node "${id}" choice "${choice.id}": combat_init targets missing encounter "${m.encounterId}"`)
        }
      } else if (m.type === 'skill_check') {
        if (!nodeIds.has(m.onSuccess?.nextNodeId)) {
          err(`Node "${id}" choice "${choice.id}": skill_check onSuccess targets missing node "${m.onSuccess?.nextNodeId}"`)
        }
        if (!nodeIds.has(m.onFailure?.nextNodeId)) {
          err(`Node "${id}" choice "${choice.id}": skill_check onFailure targets missing node "${m.onFailure?.nextNodeId}"`)
        }
        if (m.onFailureEncounterId && !encounterIds.has(m.onFailureEncounterId)) {
          err(`Node "${id}" choice "${choice.id}": skill_check onFailureEncounterId missing encounter "${m.onFailureEncounterId}"`)
        }
        if (m.dice && !DICE_NOTATION_REGEX.test(m.dice) && Number.isNaN(Number(m.dice))) {
          warn(`Node "${id}" choice "${choice.id}": skill_check dice "${m.dice}" is not valid notation`)
        }
      }
      if (choice.visibilityRequirements) {
        for (const req of choice.visibilityRequirements) {
          if (req.type === 'has_item' && req.itemId && !itemIds.has(req.itemId)) {
            err(`Node "${id}" choice "${choice.id}": has_item references missing item "${req.itemId}"`)
          }
          if (req.type === 'stat_check') {
            if (req.operator && !STAT_CHECK_OPERATORS.has(req.operator)) {
              err(`Node "${id}" choice "${choice.id}": stat_check invalid operator "${req.operator}"`)
            }
            if (req.stat && !STAT_CHECK_STATS.has(req.stat)) {
              err(`Node "${id}" choice "${choice.id}": stat_check invalid stat "${req.stat}"`)
            }
          }
        }
      }
    }
    if (node.onEnter) {
      for (const action of node.onEnter) {
        if ((action.action === 'add_item' || action.action === 'remove_item') && action.itemId && !itemIds.has(action.itemId)) {
          err(`Node "${id}" onEnter: ${action.action} references missing item "${action.itemId}"`)
        }
      }
    }
  }

  for (const [id, encounter] of Object.entries(encounters)) {
    if (!encounter.enemies || encounter.enemies.length === 0) {
      err(`Encounter "${id}": has no enemies`)
    }
    for (const spawn of encounter.enemies || []) {
      if (!enemyIds.has(spawn.enemyId)) {
        err(`Encounter "${id}": references missing enemy "${spawn.enemyId}"`)
      }
    }
    const onVictory = encounter.resolution?.onVictory?.nextNodeId
    const onDefeat = encounter.resolution?.onDefeat?.nextNodeId
    if (onVictory && !nodeIds.has(onVictory)) {
      err(`Encounter "${id}": onVictory targets missing node "${onVictory}"`)
    }
    if (onDefeat && !nodeIds.has(onDefeat)) {
      err(`Encounter "${id}": onDefeat targets missing node "${onDefeat}"`)
    }
  }

  for (const [id, item] of Object.entries(items)) {
    if (!ITEM_TYPES.has(item.type)) {
      err(`Item "${id}": invalid type "${item.type}". Must be one of: weapon, consumable, tool`)
    }
    if (item.type === 'weapon' && !item.damage) {
      warn(`Item "${id}": weapon missing damage field`)
    }
    if (item.effect?.action === 'add_item' && item.effect.itemId && !itemIds.has(item.effect.itemId)) {
      err(`Item "${id}" effect: add_item references missing item "${item.effect.itemId}"`)
    }
  }

  for (const [id, enemy] of Object.entries(enemies)) {
    if (enemy.hp <= 0) {
      err(`Enemy "${id}": hp must be > 0`)
    }
    if (enemy.ac < 0) {
      err(`Enemy "${id}": ac must be >= 0`)
    }
    if (enemy.damage && !DICE_NOTATION_REGEX.test(enemy.damage) && Number.isNaN(Number(enemy.damage))) {
      warn(`Enemy "${id}": damage "${enemy.damage}" is not valid dice notation`)
    }
  }

  const seenNodeIds = new Set()
  for (const id of Object.keys(nodes)) {
    if (seenNodeIds.has(id)) warn(`Duplicate node id: "${id}"`)
    seenNodeIds.add(id)
  }
  const seenItemIds = new Set()
  for (const id of Object.keys(items)) {
    if (seenItemIds.has(id)) warn(`Duplicate item id: "${id}"`)
    seenItemIds.add(id)
  }
  const seenEnemyIds = new Set()
  for (const id of Object.keys(enemies)) {
    if (seenEnemyIds.has(id)) warn(`Duplicate enemy id: "${id}"`)
    seenEnemyIds.add(id)
  }
  const seenEncounterIds = new Set()
  for (const id of Object.keys(encounters)) {
    if (seenEncounterIds.has(id)) warn(`Duplicate encounter id: "${id}"`)
    seenEncounterIds.add(id)
  }

  return { errors, warnings }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)

function run() {
  const validateOnly = process.argv.includes('--validate-only')
  const nodesRows = readCsv('nodes.csv')
  const itemsRows = readCsv('items.csv')
  const enemiesRows = readCsv('enemies.csv')
  const encountersRows = readCsv('encounters.csv')

  const nodes = parseNodes(nodesRows)
  const items = parseItems(itemsRows)
  const enemies = parseEnemies(enemiesRows)
  const encounters = parseEncounters(encountersRows)

  const { errors, warnings } = validateData(nodes, items, enemies, encounters)
  for (const w of warnings) {
    console.warn('Warning:', w)
  }
  for (const e of errors) {
    console.error('Error:', e)
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

  writeDataFile('nodes.ts', generateTsFile('../types/story', 'StoryNode', 'STORY_NODES', nodes))
  writeDataFile('items.ts', generateTsFile('../types/items', 'ItemTemplate', 'ITEM_DICTIONARY', items))
  writeDataFile('enemies.ts', generateTsFile('../types/combat', 'EnemyTemplate', 'ENEMY_DICTIONARY', enemies))
  writeDataFile(
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
  validateData,
  NODE_TYPES,
  ITEM_TYPES,
  STAT_CHECK_OPERATORS,
  STAT_CHECK_STATS,
  DICE_NOTATION_REGEX,
}
