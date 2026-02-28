/**
 * Pure parsing: string/token/object transforms only. No Node built-ins.
 * Safe to import from browser (authoring app).
 */

export function splitPipe(value) {
  if (!value) return []
  return value
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function previewBrokenRow(row) {
  if (row && typeof row.text === 'string' && row.text.trim()) {
    return `${row.text.substring(0, 30)}...`
  }
  return JSON.stringify(row ?? {}).substring(0, 50)
}

export function asNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function asBoolean(value, fallback = false) {
  if (!value) return fallback
  const normalized = String(value).toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}

export function parseAction(actionToken, logPrefix = '[parse]') {
  const [action, ...parts] = String(actionToken ?? '')
    .split(':')
    .map((token) => token.trim())
  if (!action) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`${logPrefix} parseAction: empty or invalid action token:`, JSON.stringify(actionToken))
    }
    return null
  }

  switch (action) {
    case 'set_flag': {
      const [key, rawValue] = parts
      if (!key) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`${logPrefix} parseAction: set_flag missing key. Token:`, JSON.stringify(actionToken))
        }
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
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`${logPrefix} parseAction: add_item/remove_item missing itemId. Token:`, JSON.stringify(actionToken))
        }
        return null
      }
      return { action, itemId, qty: asNumber(qtyValue, 1) }
    }
    case 'adjust_hp':
    case 'adjust_currency': {
      const [amountValue] = parts
      return { action, amount: asNumber(amountValue, 0) }
    }
    case 'heal': {
      const [amountValue] = parts
      return { action: 'heal', amount: amountValue || '0' }
    }
    default:
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} parseAction: unknown action type:`, action, 'Token:', JSON.stringify(actionToken))
      }
      return null
  }
}

export function parseOnEnter(value, logPrefix = '[parse]') {
  const actions = splitPipe(value).map((t) => parseAction(t, logPrefix)).filter(Boolean)
  return actions.length > 0 ? actions : undefined
}

export function parseVisibility(value, logPrefix = '[parse]') {
  const requirements = splitPipe(value)
    .map((token) => {
      const [type, ...parts] = token.split(':').map((segment) => segment.trim())
      if (!type) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`${logPrefix} parseVisibility: missing type. Token:`, JSON.stringify(token))
        }
        return null
      }
      if (type === 'has_flag') {
        const [key] = parts
        if (!key) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(`${logPrefix} parseVisibility: has_flag missing key. Token:`, JSON.stringify(token))
          }
          return null
        }
        return { type: 'has_flag', key }
      }
      if (type === 'has_item') {
        const [itemId] = parts
        if (!itemId) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(`${logPrefix} parseVisibility: has_item missing itemId. Token:`, JSON.stringify(token))
          }
          return null
        }
        return { type: 'has_item', itemId }
      }
      if (type === 'stat_check') {
        const [stat, operator, rawValue] = parts
        if (!stat || !operator || rawValue === undefined || rawValue === '') {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(`${logPrefix} parseVisibility: stat_check missing stat/operator/value. Token:`, JSON.stringify(token))
          }
          return null
        }
        return { type: 'stat_check', stat, operator, value: asNumber(rawValue, 0) }
      }
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} parseVisibility: unknown type:`, type, 'Token:', JSON.stringify(token))
      }
      return null
    })
    .filter(Boolean)
  return requirements.length > 0 ? requirements : undefined
}

export function parseMechanic(value, logPrefix = '[parse]') {
  const [mechanicType, ...parts] = String(value ?? '')
    .split(':')
    .map((segment) => segment.trim())
  if (!mechanicType) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`${logPrefix} parseMechanic: empty or missing mechanic type. Value:`, JSON.stringify(value))
    }
    return null
  }
  if (mechanicType === 'navigate') {
    const [nextNodeId] = parts
    if (!nextNodeId) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} parseMechanic: navigate missing nextNodeId. Value:`, JSON.stringify(value))
      }
      return null
    }
    return { type: 'navigate', nextNodeId }
  }
  if (mechanicType === 'combat_init') {
    const [encounterId] = parts
    if (!encounterId) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} parseMechanic: combat_init missing encounterId. Value:`, JSON.stringify(value))
      }
      return null
    }
    return { type: 'combat_init', encounterId }
  }
  if (mechanicType === 'skill_check') {
    const [dice, dcValue, successNodeId, failureNodeId, onFailureEncounterId, attribute] = parts
    if (!dice || !dcValue || !successNodeId || !failureNodeId) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} parseMechanic: skill_check missing dice/dc/successNodeId/failureNodeId. Value:`, JSON.stringify(value))
      }
      return null
    }
    const mechanic = {
      type: 'skill_check',
      dice,
      dc: asNumber(dcValue, 0),
      onSuccess: { nextNodeId: successNodeId },
      onFailure: { nextNodeId: failureNodeId },
    }
    if (onFailureEncounterId) mechanic.onFailureEncounterId = onFailureEncounterId
    if (attribute) mechanic.attribute = attribute
    return mechanic
  }
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`${logPrefix} parseMechanic: unknown mechanic type:`, mechanicType, 'Value:', JSON.stringify(value))
  }
  return null
}

export function parseNodes(rows, logPrefix = '[parse]') {
  const nodes = {}
  for (const row of rows) {
    const id = row.id
    if (!id) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} Skipped row due to missing ID. Row data:`, previewBrokenRow(row))
      }
      continue
    }
    const choices = []
    for (let index = 1; index <= 3; index += 1) {
      const choiceId = row[`choice${index}_id`]
      if (!choiceId) continue
      const label = row[`choice${index}_label`]
      const mechanicRaw = row[`choice${index}_mechanic`]
      const mechanic = parseMechanic(mechanicRaw, logPrefix)
      if (!label || !mechanic) continue
      const choice = { id: choiceId, label, mechanic }
      const visibility = parseVisibility(row[`choice${index}_visibility`], logPrefix)
      if (visibility) choice.visibilityRequirements = visibility
      choices.push(choice)
    }
    const node = { id, type: row.type, text: row.text ?? '' }
    const onEnter = parseOnEnter(row.onEnter, logPrefix)
    if (onEnter) node.onEnter = onEnter
    if (choices.length > 0) node.choices = choices
    nodes[id] = node
  }
  return nodes
}

export function parseItems(rows, logPrefix = '[parse]') {
  const items = {}
  for (const row of rows) {
    const id = row.id
    if (!id) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} Skipped row due to missing ID. Row data:`, previewBrokenRow(row))
      }
      continue
    }
    const item = { id, name: row.name ?? id, type: row.type }
    if (row.damage) item.damage = row.damage
    if (row.attackBonus !== undefined && row.attackBonus !== '') item.attackBonus = asNumber(row.attackBonus, 0)
    if (row.acBonus !== undefined && row.acBonus !== '') item.acBonus = asNumber(row.acBonus, 0)
    if (row.effect) {
      const parsedEffect = parseAction(row.effect, logPrefix)
      if (parsedEffect) item.effect = parsedEffect
    }
    if (row.scalingAttribute) item.scalingAttribute = row.scalingAttribute
    if (row.aoe !== undefined && row.aoe !== '') item.aoe = asBoolean(row.aoe, false)
    items[id] = item
  }
  return items
}

export function parseEnemies(rows, logPrefix = '[parse]') {
  const enemies = {}
  for (const row of rows) {
    const id = row.id
    if (!id) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} Skipped row due to missing ID. Row data:`, previewBrokenRow(row))
      }
      continue
    }
    enemies[id] = {
      id,
      name: row.name ?? id,
      hp: asNumber(row.hp, 1),
      ac: asNumber(row.ac, 10),
      attackBonus: asNumber(row.attackBonus, 0),
      damage: row.damage ?? '1d2',
      xpReward: asNumber(row.xpReward, 0),
    }
  }
  return enemies
}

export function parseEncounterEnemies(value) {
  return splitPipe(value)
    .map((token) => {
      const [enemyId, countValue] = token.split(':').map((part) => part.trim())
      if (!enemyId) return null
      return { enemyId, count: asNumber(countValue, 1) }
    })
    .filter(Boolean)
}

export function parseEncounters(rows, logPrefix = '[parse]') {
  const encounters = {}
  for (const row of rows) {
    const id = row.id
    if (!id) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${logPrefix} Skipped row due to missing ID. Row data:`, previewBrokenRow(row))
      }
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

export const NODE_TYPES = new Set(['narrative', 'encounter', 'ending'])
export const ITEM_TYPES = new Set(['weapon', 'consumable', 'tool'])
export const VALID_ATTRIBUTES = new Set(['strength', 'dexterity', 'intelligence'])
export const STAT_CHECK_OPERATORS = new Set(['>=', '<=', '==', '>', '<'])
export const STAT_CHECK_STATS = new Set(['hpCurrent', 'currency'])
export const DICE_NOTATION_REGEX = /^\d+d\d+([+-]\d+)?$/i
