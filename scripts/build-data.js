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
    return null
  }

  switch (action) {
    case 'set_flag': {
      const [key, rawValue] = parts
      if (!key) {
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
        return null
      }

      if (type === 'has_flag') {
        const [key] = parts
        return key ? { type: 'has_flag', key } : null
      }

      if (type === 'has_item') {
        const [itemId] = parts
        return itemId ? { type: 'has_item', itemId } : null
      }

      if (type === 'stat_check') {
        const [stat, operator, rawValue] = parts
        if (!stat || !operator || rawValue === undefined || rawValue === '') {
          return null
        }
        return {
          type: 'stat_check',
          stat,
          operator,
          value: asNumber(rawValue, 0),
        }
      }

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
    return null
  }

  if (mechanicType === 'navigate') {
    const [nextNodeId] = parts
    return nextNodeId ? { type: 'navigate', nextNodeId } : null
  }

  if (mechanicType === 'combat_init') {
    const [encounterId] = parts
    return encounterId ? { type: 'combat_init', encounterId } : null
  }

  if (mechanicType === 'skill_check') {
    const [dice, dcValue, successNodeId, failureNodeId, onFailureEncounterId] = parts
    if (!dice || !dcValue || !successNodeId || !failureNodeId) {
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

function run() {
  const nodesRows = readCsv('nodes.csv')
  const itemsRows = readCsv('items.csv')
  const enemiesRows = readCsv('enemies.csv')
  const encountersRows = readCsv('encounters.csv')

  const nodes = parseNodes(nodesRows)
  const items = parseItems(itemsRows)
  const enemies = parseEnemies(enemiesRows)
  const encounters = parseEncounters(encountersRows)

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

run()
