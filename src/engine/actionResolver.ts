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
      }
      return
    case 'adjust_hp':
      if (typeof payload.amount === 'number') {
        store.adjustHp(payload.amount)
      }
      return
    case 'add_item':
      if (typeof payload.itemId === 'string') {
        store.addItem(payload.itemId, payload.qty ?? 1)
      }
      return
    case 'remove_item':
      if (typeof payload.itemId === 'string') {
        store.removeItem(payload.itemId, payload.qty ?? 1)
      }
      return
    case 'adjust_currency':
      if (typeof payload.amount === 'number') {
        store.adjustCurrency(payload.amount)
      }
      return
  }
}
