/**
 * CSV text serialization only. No Node built-ins.
 * Safe to import from browser (authoring app).
 * Note: Inline comments and custom whitespace are not preserved; quoting may be normalized.
 */

/**
 * Escape a CSV field: wrap in double quotes if contains comma, newline, or quote; double internal quotes.
 * @param {string} s
 * @returns {string}
 */
function escapeCsvField(s) {
  const str = String(s ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Serialize action object to token string.
 * @param {{ action: string, key?: string, value?: boolean, itemId?: string, qty?: number, amount?: number }} action
 * @returns {string}
 */
function serializeAction(action) {
  if (!action?.action) return ''
  switch (action.action) {
    case 'set_flag':
      return action.value === false ? `set_flag:${action.key}:false` : `set_flag:${action.key}`
    case 'add_item':
    case 'remove_item':
      return `${action.action}:${action.itemId ?? ''}:${action.qty ?? 1}`
    case 'adjust_hp':
    case 'adjust_currency':
      return `${action.action}:${action.amount ?? 0}`
    case 'heal':
      return `heal:${action.amount ?? '0'}`
    default:
      return ''
  }
}

/**
 * Serialize visibility requirement to token string.
 * @param {{ type: string, key?: string, itemId?: string, stat?: string, operator?: string, value?: number }} req
 * @returns {string}
 */
function serializeVisibility(req) {
  if (!req?.type) return ''
  if (req.type === 'has_flag') return `has_flag:${req.key ?? ''}`
  if (req.type === 'has_item') return `has_item:${req.itemId ?? ''}`
  if (req.type === 'stat_check') return `stat_check:${req.stat ?? ''}:${req.operator ?? ''}:${req.value ?? 0}`
  return ''
}

/**
 * Serialize mechanic object to token string.
 * @param {{ type: string, nextNodeId?: string, encounterId?: string, dice?: string, dc?: number, onSuccess?: { nextNodeId: string }, onFailure?: { nextNodeId: string }, onFailureEncounterId?: string, attribute?: string }} m
 * @returns {string}
 */
function serializeMechanic(m) {
  if (!m?.type) return ''
  if (m.type === 'navigate') return `navigate:${m.nextNodeId ?? ''}`
  if (m.type === 'combat_init') return `combat_init:${m.encounterId ?? ''}`
  if (m.type === 'skill_check') {
    const parts = [
      m.dice ?? '',
      m.dc ?? 0,
      m.onSuccess?.nextNodeId ?? '',
      m.onFailure?.nextNodeId ?? '',
    ]
    if (m.onFailureEncounterId) parts.push(m.onFailureEncounterId)
    if (m.attribute) parts.push(m.attribute)
    return `skill_check:${parts.join(':')}`
  }
  return ''
}

const NODES_HEADERS = [
  'id',
  'type',
  'text',
  'image',
  'onEnter',
  'choice1_id',
  'choice1_label',
  'choice1_visibility',
  'choice1_mechanic',
  'choice2_id',
  'choice2_label',
  'choice2_visibility',
  'choice2_mechanic',
  'choice3_id',
  'choice3_label',
  'choice3_visibility',
  'choice3_mechanic',
]

const ITEMS_HEADERS = ['id', 'name', 'type', 'damage', 'attackBonus', 'acBonus', 'effect', 'scalingAttribute', 'aoe']

const ENEMIES_HEADERS = ['id', 'name', 'hp', 'maxHp', 'ac', 'attackBonus', 'damage', 'xpReward']

const ENCOUNTERS_HEADERS = ['id', 'name', 'enemies', 'onVictory', 'onDefeat']

/**
 * @param {Record<string, { id: string, type: string, text: string, onEnter?: Array<{ action: string, key?: string, value?: boolean, itemId?: string, qty?: number, amount?: number }>, choices?: Array<{ id: string, label: string, visibilityRequirements?: Array<{ type: string, key?: string, itemId?: string, stat?: string, operator?: string, value?: number }>, mechanic?: { type: string, nextNodeId?: string, encounterId?: string, dice?: string, dc?: number, onSuccess?: { nextNodeId: string }, onFailure?: { nextNodeId: string }, onFailureEncounterId?: string, attribute?: string } }> }>} nodes
 * @returns {string} CSV file content (no trailing newline)
 */
export function serializeNodesToCsv(nodes) {
  const rows = [NODES_HEADERS.join(',')]
  for (const node of Object.values(nodes)) {
    const onEnterStr = node.onEnter?.map(serializeAction).filter(Boolean).join(' | ') ?? ''
    const c1 = node.choices?.[0]
    const c2 = node.choices?.[1]
    const c3 = node.choices?.[2]
    const row = [
      escapeCsvField(node.id),
      escapeCsvField(node.type),
      escapeCsvField(node.text),
      escapeCsvField(node.image ?? ''),
      escapeCsvField(onEnterStr),
      escapeCsvField(c1?.id ?? ''),
      escapeCsvField(c1?.label ?? ''),
      escapeCsvField(c1?.visibilityRequirements?.map(serializeVisibility).filter(Boolean).join(' | ') ?? ''),
      escapeCsvField(serializeMechanic(c1?.mechanic)),
      escapeCsvField(c2?.id ?? ''),
      escapeCsvField(c2?.label ?? ''),
      escapeCsvField(c2?.visibilityRequirements?.map(serializeVisibility).filter(Boolean).join(' | ') ?? ''),
      escapeCsvField(serializeMechanic(c2?.mechanic)),
      escapeCsvField(c3?.id ?? ''),
      escapeCsvField(c3?.label ?? ''),
      escapeCsvField(c3?.visibilityRequirements?.map(serializeVisibility).filter(Boolean).join(' | ') ?? ''),
      escapeCsvField(serializeMechanic(c3?.mechanic)),
    ]
    rows.push(row.join(','))
  }
  return rows.join('\n')
}

/**
 * @param {Record<string, { id: string, name?: string, type: string, damage?: string, attackBonus?: number, acBonus?: number, effect?: { action: string, itemId?: string, qty?: number, amount?: number }, scalingAttribute?: string, aoe?: boolean }>} items
 * @returns {string}
 */
export function serializeItemsToCsv(items) {
  const rows = [ITEMS_HEADERS.join(',')]
  for (const item of Object.values(items)) {
    const effectStr = item.effect ? serializeAction(item.effect) : ''
    const row = [
      escapeCsvField(item.id),
      escapeCsvField(item.name ?? item.id),
      escapeCsvField(item.type),
      escapeCsvField(item.damage ?? ''),
      escapeCsvField(item.attackBonus ?? ''),
      escapeCsvField(item.acBonus ?? ''),
      escapeCsvField(effectStr),
      escapeCsvField(item.scalingAttribute ?? ''),
      escapeCsvField(item.aoe === true ? 'true' : item.aoe === false ? 'false' : ''),
    ]
    rows.push(row.join(','))
  }
  return rows.join('\n')
}

/**
 * @param {Record<string, { id: string, name?: string, hp: number, ac: number, attackBonus?: number, damage?: string, xpReward?: number }>} enemies
 * @returns {string}
 */
export function serializeEnemiesToCsv(enemies) {
  const rows = [ENEMIES_HEADERS.join(',')]
  for (const enemy of Object.values(enemies)) {
    const row = [
      escapeCsvField(enemy.id),
      escapeCsvField(enemy.name ?? enemy.id),
      escapeCsvField(enemy.hp),
      escapeCsvField(enemy.hp),
      escapeCsvField(enemy.ac),
      escapeCsvField(enemy.attackBonus ?? 0),
      escapeCsvField(enemy.damage ?? '1d2'),
      escapeCsvField(enemy.xpReward ?? 0),
    ]
    rows.push(row.join(','))
  }
  return rows.join('\n')
}

/**
 * @param {Record<string, { id: string, name?: string, enemies?: Array<{ enemyId: string, count?: number }>, resolution?: { onVictory?: { nextNodeId: string }, onDefeat?: { nextNodeId: string } } }>} encounters
 * @returns {string}
 */
export function serializeEncountersToCsv(encounters) {
  const rows = [ENCOUNTERS_HEADERS.join(',')]
  for (const enc of Object.values(encounters)) {
    const enemiesStr = (enc.enemies ?? []).map((e) => `${e.enemyId}:${e.count ?? 1}`).join(' | ')
    const onVictory = enc.resolution?.onVictory?.nextNodeId ?? ''
    const onDefeat = enc.resolution?.onDefeat?.nextNodeId ?? ''
    const row = [
      escapeCsvField(enc.id),
      escapeCsvField(enc.name ?? enc.id),
      escapeCsvField(enemiesStr),
      escapeCsvField(onVictory),
      escapeCsvField(onDefeat),
    ]
    rows.push(row.join(','))
  }
  return rows.join('\n')
}
