import type { FrameworkPlugin, ActionHandler, ConditionEvaluator } from '../types'
import { useNotificationStore } from '../../stores/notificationStore'

const REPUTATION_STATS = new Set([
  'scholarRep',
  'ceaRep',
  'freehandsRep',
  'workerRep',
])

function reputationLabel(stat: string): string {
  switch (stat) {
    case 'scholarRep': return 'Scholar Standing'
    case 'ceaRep': return 'CEA Standing'
    case 'freehandsRep': return 'Freehands Standing'
    case 'workerRep': return 'Worker Standing'
    default: return stat
  }
}

function makeAdjustHandler(stat: string): ActionHandler {
  return (payload, { store }) => {
    if (typeof payload.amount === 'number') {
      const fn = store.adjustReputation as ((stat: string, amount: number) => void) | undefined
      if (fn) fn(stat, payload.amount)
      try {
        const notificationStore = useNotificationStore()
        const sign = payload.amount >= 0 ? '+' : ''
        notificationStore.add(
          'info',
          `${reputationLabel(stat)}: ${sign}${payload.amount}`,
        )
      } catch { /* store may be unavailable */ }
      return { type: `adjust_${stat}`, value: payload.amount }
    }
    console.warn(`[reputation] adjust_${stat}: invalid amount`, payload)
    return { type: `adjust_${stat}` }
  }
}

const reputationCheck: ConditionEvaluator = (requirement, state) => {
  const rep = (state as Record<string, unknown>).reputation as Record<string, number> | undefined
  if (!rep) return false
  const stat = requirement.stat as string
  if (!stat || !REPUTATION_STATS.has(stat)) return false
  const current = rep[stat] ?? 0
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

export const reputationPlugin: FrameworkPlugin = {
  id: 'reputation',

  playerStateDefaults: () => ({
    reputation: {
      scholarRep: 60,
      ceaRep: 30,
      freehandsRep: 20,
      workerRep: 20,
    },
  }),

  actions: {
    adjust_scholar_rep: makeAdjustHandler('scholarRep'),
    adjust_cea_rep: makeAdjustHandler('ceaRep'),
    adjust_freehands_rep: makeAdjustHandler('freehandsRep'),
    adjust_worker_rep: makeAdjustHandler('workerRep'),
  },

  conditions: {
    reputation_check: reputationCheck,
  },
}
