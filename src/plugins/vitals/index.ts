import type { FrameworkPlugin, ActionHandler } from '../types'
import { rollDice } from '../../utils/dice'
import { useNotificationStore } from '../../stores/notificationStore'

const adjustHp: ActionHandler = (payload, { store }) => {
  if (typeof payload.amount === 'number') {
    store.adjustHp(payload.amount)
    return { type: 'adjust_hp', value: payload.amount }
  }
  console.warn('[vitals] adjust_hp: invalid amount', payload)
  return { type: 'adjust_hp' }
}

const heal: ActionHandler = (payload, { store }) => {
  if (typeof payload.amount === 'string') {
    const result = rollDice(payload.amount)
    store.adjustHp(result.total)
    try {
      const notificationStore = useNotificationStore()
      const message =
        result.rolls.length > 0
          ? `Heal (${payload.amount}): +${result.total} HP`
          : `Heal: +${result.total} HP`
      const detail =
        result.rolls.length > 0
          ? `Rolls: [${result.rolls.join(', ')}]${result.modifier >= 0 ? ' +' : ' '}${result.modifier} = ${result.total}`
          : `Fixed: ${result.total} HP`
      notificationStore.add('dice', message, detail)
    } catch {
      // Store may be unavailable outside app context
    }
    return { type: 'heal', value: result.total }
  }
  console.warn('[vitals] heal: invalid amount (expected dice string or number string)', payload)
  return { type: 'heal' }
}

export const vitalsPlugin: FrameworkPlugin = {
  id: 'vitals',

  actions: {
    adjust_hp: adjustHp,
    heal,
  },
}
