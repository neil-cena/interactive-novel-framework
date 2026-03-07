import type { FrameworkPlugin, ActionHandler, ConditionEvaluator } from '../types'
import { useNotificationStore } from '../../stores/notificationStore'

const addItem: ActionHandler = (payload, { store }) => {
  if (typeof payload.itemId === 'string') {
    store.addItem(payload.itemId, (payload.qty as number) ?? 1)
  } else {
    console.warn('[inventory] add_item: missing itemId', payload)
  }
  return { type: 'add_item' }
}

const removeItem: ActionHandler = (payload, { store }) => {
  if (typeof payload.itemId === 'string') {
    store.removeItem(payload.itemId, (payload.qty as number) ?? 1)
  } else {
    console.warn('[inventory] remove_item: missing itemId', payload)
  }
  return { type: 'remove_item' }
}

const adjustCurrency: ActionHandler = (payload, { store }) => {
  if (typeof payload.amount === 'number') {
    store.adjustCurrency(payload.amount)
    try {
      const notificationStore = useNotificationStore()
      const msg = payload.amount >= 0 ? `+${payload.amount} gold` : `${payload.amount} gold`
      notificationStore.add('currency', msg)
    } catch {
      // Store may be unavailable outside app context
    }
    return { type: 'adjust_currency', value: payload.amount }
  }
  console.warn('[inventory] adjust_currency: invalid amount', payload)
  return { type: 'adjust_currency' }
}

const hasItem: ConditionEvaluator = (requirement, state) => {
  if (!requirement.itemId) return false
  const inventory = state.inventory as { items: Record<string, number> } | undefined
  return (inventory?.items?.[requirement.itemId as string] ?? 0) > 0
}

const notHasItem: ConditionEvaluator = (requirement, state) => !hasItem(requirement, state)

export const inventoryPlugin: FrameworkPlugin = {
  id: 'inventory',

  actions: {
    add_item: addItem,
    remove_item: removeItem,
    adjust_currency: adjustCurrency,
  },

  conditions: {
    has_item: hasItem,
    not_has_item: notHasItem,
  },
}
