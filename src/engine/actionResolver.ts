import type { Store } from 'pinia'
import type { ActionPayload } from '../types/story'
import { getPluginRegistry } from '../plugins/registry'

export interface ProcessedAction {
  type: string
  value?: number
}

type PlayerStoreContract = Store & {
  setFlag: (key: string, value: boolean) => void
  adjustHp: (amount: number) => void
  addItem: (itemId: string, qty?: number) => void
  removeItem: (itemId: string, qty?: number) => void
  adjustCurrency: (amount: number) => void
}

export function resolveAction(payload: ActionPayload, store: PlayerStoreContract): ProcessedAction {
  if (payload.action === 'set_flag') {
    if (typeof payload.key === 'string' && typeof payload.value === 'boolean') {
      store.setFlag(payload.key, payload.value)
    } else {
      console.warn('[actionResolver] set_flag: invalid payload (key or value)', payload)
    }
    return { type: 'set_flag' }
  }

  const registry = getPluginRegistry()
  const handler = registry.actions[payload.action]
  if (handler) {
    return handler(payload as Record<string, unknown>, { store: store as never })
  }

  console.warn(`[actionResolver] Unknown action type: "${payload.action}"`, payload)
  return { type: payload.action }
}
