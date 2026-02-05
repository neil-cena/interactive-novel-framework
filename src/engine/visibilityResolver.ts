import type { VisibilityRequirement } from '../types/story'
import type { PlayerState } from '../types/player'

type VisibilityState = Pick<PlayerState, 'flags' | 'inventory' | 'vitals'>

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

export function isChoiceVisible(
  requirements: VisibilityRequirement[] | undefined,
  state: VisibilityState,
): boolean {
  if (!requirements || requirements.length === 0) {
    return true
  }

  return requirements.every((requirement) => {
    if (requirement.type === 'has_flag' && requirement.key) {
      return Boolean(state.flags[requirement.key])
    }

    if (requirement.type === 'has_item' && requirement.itemId) {
      return (state.inventory.items[requirement.itemId] ?? 0) > 0
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

    return false
  })
}
