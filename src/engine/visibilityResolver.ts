import type { VisibilityRequirement } from '../types/story'
import type { PlayerState } from '../types/player'
import { getPluginRegistry } from '../plugins/registry'

type VisibilityState = Pick<PlayerState, 'flags' | 'inventory' | 'vitals' | 'worldState'>

function compareNumbers(operator: string, left: number, right: number): boolean {
  switch (operator) {
    case '>=':
      return left >= right
    case '<=':
      return left <= right
    case '>':
      return left > right
    case '<':
      return left < right
    case '==':
      return left === right
    default:
      return false
  }
}

function evaluateCore(requirement: VisibilityRequirement, state: VisibilityState): boolean | null {
  if (requirement.type === 'has_flag' && requirement.key) {
    return Boolean(state.flags[requirement.key])
  }

  if (requirement.type === 'not_has_flag' && requirement.key) {
    return !Boolean(state.flags[requirement.key])
  }

  if (
    requirement.type === 'stat_check' &&
    requirement.stat &&
    requirement.operator &&
    typeof requirement.value === 'number'
  ) {
    const sourceValue = requirement.stat === 'hpCurrent' ? state.vitals.hpCurrent : state.inventory.currency
    return compareNumbers(requirement.operator, sourceValue, requirement.value)
  }

  return null
}

export function isChoiceVisible(
  requirements: VisibilityRequirement[] | undefined,
  state: VisibilityState,
): boolean {
  if (!requirements || requirements.length === 0) {
    return true
  }

  const registry = getPluginRegistry()

  return requirements.every((requirement) => {
    const coreResult = evaluateCore(requirement, state)
    if (coreResult !== null) return coreResult

    const evaluator = registry.conditions[requirement.type]
    if (evaluator) {
      return evaluator(requirement as Record<string, unknown>, state as unknown as Record<string, unknown>)
    }

    console.warn(`[visibilityResolver] Unknown condition type: "${requirement.type}"`)
    return false
  })
}
