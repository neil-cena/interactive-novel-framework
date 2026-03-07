import type { FrameworkPlugin, ActionHandler, ConditionEvaluator } from '../types'
import { useNotificationStore } from '../../stores/notificationStore'

const WORLD_STATE_STATS = new Set([
  'vaelEnergy',
  'communityCost',
  'stateChaos',
  'districtStability',
])

function worldStatLabel(stat: string): string {
  switch (stat) {
    case 'vaelEnergy': return 'Energy'
    case 'communityCost': return 'Community Cost'
    case 'stateChaos': return 'State Chaos'
    case 'districtStability': return 'Stability'
    default: return stat
  }
}

function makeAdjustHandler(stat: string): ActionHandler {
  return (payload, { store }) => {
    if (typeof payload.amount === 'number') {
      const fn = store.adjustWorldState as ((stat: string, amount: number) => void) | undefined
      if (fn) fn(stat, payload.amount)
      try {
        const notificationStore = useNotificationStore()
        const sign = payload.amount >= 0 ? '+' : ''
        notificationStore.add(
          'info',
          `${worldStatLabel(stat)}: ${sign}${payload.amount}`,
        )
      } catch { /* store may be unavailable */ }
      return { type: `adjust_${stat}`, value: payload.amount }
    }
    console.warn(`[world-state] adjust_${stat}: invalid amount`, payload)
    return { type: `adjust_${stat}` }
  }
}

const worldCheck: ConditionEvaluator = (requirement, state) => {
  const ws = (state as Record<string, unknown>).worldState as Record<string, number> | undefined
  if (!ws) return false
  const stat = requirement.stat as string
  if (!stat || !WORLD_STATE_STATS.has(stat)) return false
  const current = ws[stat] ?? 0
  const op = requirement.operator as string
  const target = requirement.value as number
  if (typeof target !== 'number') return false
  switch (op) {
    case '>=': return current >= target
    case '<=': return current <= target
    case '>':  return current > target
    case '<':  return current < target
    case '==': return current === target
    default:   return false
  }
}

export const worldStatePlugin: FrameworkPlugin = {
  id: 'world-state',

  playerStateDefaults: () => ({
    worldState: {
      vaelEnergy: 100,
      communityCost: 20,
      stateChaos: 10,
      districtStability: 65,
    },
  }),

  actions: {
    adjust_energy: makeAdjustHandler('vaelEnergy'),
    adjust_community_cost: makeAdjustHandler('communityCost'),
    adjust_state_chaos: makeAdjustHandler('stateChaos'),
    adjust_stability: makeAdjustHandler('districtStability'),
  },

  conditions: {
    world_check: worldCheck,
  },
}
