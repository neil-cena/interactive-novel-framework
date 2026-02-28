/**
 * Pure validation: object diagnostics only. No Node built-ins.
 * Safe to import from browser (authoring app).
 */

import {
  NODE_TYPES,
  ITEM_TYPES,
  VALID_ATTRIBUTES,
  STAT_CHECK_OPERATORS,
  STAT_CHECK_STATS,
  DICE_NOTATION_REGEX,
} from './parse.js'
import { DIAGNOSTIC_SEVERITY } from './types.js'

const E = DIAGNOSTIC_SEVERITY.error
const W = DIAGNOSTIC_SEVERITY.warning

/**
 * @param {import('./types.js').Diagnostic} d
 * @returns {import('./types.js').Diagnostic}
 */
function diag(severity, code, message, context = {}, hint) {
  const d = { code, severity, message, context }
  if (hint) d.hint = hint
  return d
}

/**
 * Validate parsed nodes, items, enemies, encounters. Returns structured diagnostics.
 * Orphan/dead-end analysis is in graph.js and can be merged by the caller.
 *
 * @param {Record<string, { id: string, type: string, text: string, choices?: Array<{ id: string, mechanic?: { type: string, nextNodeId?: string, encounterId?: string, onSuccess?: { nextNodeId: string }, onFailure?: { nextNodeId: string }, onFailureEncounterId?: string, dice?: string, attribute?: string }, visibilityRequirements?: Array<{ type: string, itemId?: string, stat?: string, operator?: string }> }>, onEnter?: Array<{ action: string, itemId?: string }> }>} nodes
 * @param {Record<string, { id: string, type: string, effect?: { action: string, itemId?: string }, scalingAttribute?: string, damage?: string }>} items
 * @param {Record<string, { id: string, hp: number, ac: number, damage?: string }>} enemies
 * @param {Record<string, { id: string, enemies?: Array<{ enemyId: string }>, resolution?: { onVictory?: { nextNodeId: string }, onDefeat?: { nextNodeId: string } } }>} encounters
 * @returns {{ errors: import('./types.js').Diagnostic[], warnings: import('./types.js').Diagnostic[] }}
 */
export function validateData(nodes, items, enemies, encounters) {
  const errors = []
  const warnings = []
  const nodeIds = new Set(Object.keys(nodes))
  const itemIds = new Set(Object.keys(items))
  const enemyIds = new Set(Object.keys(enemies))
  const encounterIds = new Set(Object.keys(encounters))

  for (const [id, node] of Object.entries(nodes)) {
    if (!NODE_TYPES.has(node.type)) {
      errors.push(
        diag(
          E,
          'DATA006',
          `Node "${id}": invalid type "${node.type}". Must be one of: narrative, encounter, ending`,
          { nodeId: id, type: node.type },
          'Set type to narrative, encounter, or ending',
        ),
      )
    }
    if (!node.choices) continue
    for (const choice of node.choices) {
      const m = choice.mechanic
      if (!m) continue
      if (m.type === 'navigate') {
        if (!nodeIds.has(m.nextNodeId)) {
          errors.push(
            diag(
              E,
              'DATA002',
              `Node "${id}" choice "${choice.id}": navigate targets missing node "${m.nextNodeId}"`,
              { nodeId: id, choiceId: choice.id, ref: m.nextNodeId, refType: 'node' },
            ),
          )
        }
      } else if (m.type === 'combat_init') {
        if (!encounterIds.has(m.encounterId)) {
          errors.push(
            diag(
              E,
              'DATA005',
              `Node "${id}" choice "${choice.id}": combat_init targets missing encounter "${m.encounterId}"`,
              { nodeId: id, choiceId: choice.id, ref: m.encounterId, refType: 'encounter' },
            ),
          )
        }
      } else if (m.type === 'skill_check') {
        if (!nodeIds.has(m.onSuccess?.nextNodeId)) {
          errors.push(
            diag(
              E,
              'DATA002',
              `Node "${id}" choice "${choice.id}": skill_check onSuccess targets missing node "${m.onSuccess?.nextNodeId}"`,
              { nodeId: id, choiceId: choice.id, ref: m.onSuccess?.nextNodeId, refType: 'node' },
            ),
          )
        }
        if (!nodeIds.has(m.onFailure?.nextNodeId)) {
          errors.push(
            diag(
              E,
              'DATA002',
              `Node "${id}" choice "${choice.id}": skill_check onFailure targets missing node "${m.onFailure?.nextNodeId}"`,
              { nodeId: id, choiceId: choice.id, ref: m.onFailure?.nextNodeId, refType: 'node' },
            ),
          )
        }
        if (m.onFailureEncounterId && !encounterIds.has(m.onFailureEncounterId)) {
          errors.push(
            diag(
              E,
              'DATA005',
              `Node "${id}" choice "${choice.id}": skill_check onFailureEncounterId missing encounter "${m.onFailureEncounterId}"`,
              { nodeId: id, choiceId: choice.id, ref: m.onFailureEncounterId, refType: 'encounter' },
            ),
          )
        }
        if (m.dice && !DICE_NOTATION_REGEX.test(m.dice) && Number.isNaN(Number(m.dice))) {
          warnings.push(
            diag(
              W,
              'DATA010',
              `Node "${id}" choice "${choice.id}": skill_check dice "${m.dice}" is not valid notation`,
              { nodeId: id, choiceId: choice.id, value: m.dice },
              'Use e.g. 1d20+3',
            ),
          )
        }
        if (m.attribute && !VALID_ATTRIBUTES.has(m.attribute)) {
          errors.push(
            diag(
              E,
              'DATA006',
              `Node "${id}" choice "${choice.id}": skill_check invalid attribute "${m.attribute}"`,
              { nodeId: id, choiceId: choice.id, attribute: m.attribute },
              'Use strength, dexterity, or intelligence',
            ),
          )
        }
      }
      if (choice.visibilityRequirements) {
        for (const req of choice.visibilityRequirements) {
          if (req.type === 'has_item' && req.itemId && !itemIds.has(req.itemId)) {
            errors.push(
              diag(
                E,
                'DATA003',
                `Node "${id}" choice "${choice.id}": has_item references missing item "${req.itemId}"`,
                { nodeId: id, choiceId: choice.id, ref: req.itemId, refType: 'item' },
              ),
            )
          }
          if (req.type === 'stat_check') {
            if (req.operator && !STAT_CHECK_OPERATORS.has(req.operator)) {
              errors.push(
                diag(
                  E,
                  'DATA006',
                  `Node "${id}" choice "${choice.id}": stat_check invalid operator "${req.operator}"`,
                  { nodeId: id, choiceId: choice.id, operator: req.operator },
                ),
              )
            }
            if (req.stat && !STAT_CHECK_STATS.has(req.stat)) {
              errors.push(
                diag(
                  E,
                  'DATA006',
                  `Node "${id}" choice "${choice.id}": stat_check invalid stat "${req.stat}"`,
                  { nodeId: id, choiceId: choice.id, stat: req.stat },
                ),
              )
            }
          }
        }
      }
    }
    if (node.onEnter) {
      for (const action of node.onEnter) {
        if (
          (action.action === 'add_item' || action.action === 'remove_item') &&
          action.itemId &&
          !itemIds.has(action.itemId)
        ) {
          errors.push(
            diag(
              E,
              'DATA003',
              `Node "${id}" onEnter: ${action.action} references missing item "${action.itemId}"`,
              { nodeId: id, ref: action.itemId, refType: 'item' },
            ),
          )
        }
      }
    }
  }

  for (const [id, encounter] of Object.entries(encounters)) {
    if (!encounter.enemies || encounter.enemies.length === 0) {
      errors.push(
        diag(E, 'DATA011', `Encounter "${id}": has no enemies`, { encounterId: id }),
      )
    }
    for (const spawn of encounter.enemies || []) {
      if (!enemyIds.has(spawn.enemyId)) {
        errors.push(
          diag(
            E,
            'DATA004',
            `Encounter "${id}": references missing enemy "${spawn.enemyId}"`,
            { encounterId: id, ref: spawn.enemyId, refType: 'enemy' },
          ),
        )
      }
    }
    const onVictory = encounter.resolution?.onVictory?.nextNodeId
    const onDefeat = encounter.resolution?.onDefeat?.nextNodeId
    if (onVictory && !nodeIds.has(onVictory)) {
      errors.push(
        diag(
          E,
          'DATA002',
          `Encounter "${id}": onVictory targets missing node "${onVictory}"`,
          { encounterId: id, ref: onVictory, refType: 'node' },
        ),
      )
    }
    if (onDefeat && !nodeIds.has(onDefeat)) {
      errors.push(
        diag(
          E,
          'DATA002',
          `Encounter "${id}": onDefeat targets missing node "${onDefeat}"`,
          { encounterId: id, ref: onDefeat, refType: 'node' },
        ),
      )
    }
  }

  for (const [id, item] of Object.entries(items)) {
    if (!ITEM_TYPES.has(item.type)) {
      errors.push(
        diag(
          E,
          'DATA006',
          `Item "${id}": invalid type "${item.type}". Must be one of: weapon, consumable, tool`,
          { itemId: id, type: item.type },
        ),
      )
    }
    if (item.type === 'weapon' && !item.damage) {
      warnings.push(
        diag(W, 'DATA013', `Item "${id}": weapon missing damage field`, { itemId: id }),
      )
    }
    if (item.effect?.action === 'add_item' && item.effect.itemId && !itemIds.has(item.effect.itemId)) {
      errors.push(
        diag(
          E,
          'DATA003',
          `Item "${id}" effect: add_item references missing item "${item.effect.itemId}"`,
          { itemId: id, ref: item.effect.itemId, refType: 'item' },
        ),
      )
    }
    if (item.scalingAttribute && !VALID_ATTRIBUTES.has(item.scalingAttribute)) {
      errors.push(
        diag(
          E,
          'DATA006',
          `Item "${id}": invalid scalingAttribute "${item.scalingAttribute}"`,
          { itemId: id, scalingAttribute: item.scalingAttribute },
        ),
      )
    }
  }

  for (const [id, enemy] of Object.entries(enemies)) {
    if (enemy.hp <= 0) {
      errors.push(
        diag(E, 'DATA012', `Enemy "${id}": hp must be > 0`, { enemyId: id }),
      )
    }
    if (enemy.ac < 0) {
      errors.push(
        diag(E, 'DATA012', `Enemy "${id}": ac must be >= 0`, { enemyId: id }),
      )
    }
    if (
      enemy.damage &&
      !DICE_NOTATION_REGEX.test(enemy.damage) &&
      Number.isNaN(Number(enemy.damage))
    ) {
      warnings.push(
        diag(
          W,
          'DATA010',
          `Enemy "${id}": damage "${enemy.damage}" is not valid dice notation`,
          { enemyId: id, value: enemy.damage },
          'Use e.g. 1d6+2',
        ),
      )
    }
  }

  return { errors, warnings }
}
