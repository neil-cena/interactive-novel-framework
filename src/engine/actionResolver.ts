import type { Store } from 'pinia'
import type { ActionPayload } from '../types/story'

type PlayerStoreContract = Store & {
  setFlag: (key: string, value: boolean) => void
  adjustHp: (amount: number) => void
  addItem: (itemId: string, qty?: number) => void
  removeItem: (itemId: string, qty?: number) => void
  adjustCurrency: (amount: number) => void
}

export function resolveAction(payload: ActionPayload, store: PlayerStoreContract): void {
  switch (payload.action) {
    case 'set_flag':
      if (typeof payload.key === 'string' && typeof payload.value === 'boolean') {
        store.setFlag(payload.key, payload.value)
      } else {
        console.warn('[actionResolver] set_flag: invalid payload (key or value)', payload)
      }
      return
    case 'adjust_hp':
      if (typeof payload.amount === 'number') {
        store.adjustHp(payload.amount)
      } else {
        console.warn('[actionResolver] adjust_hp: invalid amount', payload)
      }
      return
    case 'add_item':
      if (typeof payload.itemId === 'string') {
        store.addItem(payload.itemId, payload.qty ?? 1)
      } else {
        console.warn('[actionResolver] add_item: missing itemId', payload)
      }
      return
    case 'remove_item':
      if (typeof payload.itemId === 'string') {
        store.removeItem(payload.itemId, payload.qty ?? 1)
      } else {
        console.warn('[actionResolver] remove_item: missing itemId', payload)
      }
      return
    case 'adjust_currency':
      if (typeof payload.amount === 'number') {
        store.adjustCurrency(payload.amount)
      } else {
        console.warn('[actionResolver] adjust_currency: invalid amount', payload)
      }
      return
  }
}
