import type { Store } from 'pinia'
import type { ActionPayload } from '../types/story'
import { rollDice } from '../utils/dice'

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
  switch (payload.action) {
    case 'set_flag':
      if (typeof payload.key === 'string' && typeof payload.value === 'boolean') {
        store.setFlag(payload.key, payload.value)
      } else {
        console.warn('[actionResolver] set_flag: invalid payload (key or value)', payload)
      }
      return { type: 'set_flag' }
    case 'adjust_hp':
      if (typeof payload.amount === 'number') {
        store.adjustHp(payload.amount)
        return { type: 'adjust_hp', value: payload.amount }
      }
      console.warn('[actionResolver] adjust_hp: invalid amount', payload)
      return { type: 'adjust_hp' }
    case 'add_item':
      if (typeof payload.itemId === 'string') {
        store.addItem(payload.itemId, payload.qty ?? 1)
      } else {
        console.warn('[actionResolver] add_item: missing itemId', payload)
      }
      return { type: 'add_item' }
    case 'remove_item':
      if (typeof payload.itemId === 'string') {
        store.removeItem(payload.itemId, payload.qty ?? 1)
      } else {
        console.warn('[actionResolver] remove_item: missing itemId', payload)
      }
      return { type: 'remove_item' }
    case 'adjust_currency':
      if (typeof payload.amount === 'number') {
        store.adjustCurrency(payload.amount)
        return { type: 'adjust_currency', value: payload.amount }
      }
      console.warn('[actionResolver] adjust_currency: invalid amount', payload)
      return { type: 'adjust_currency' }
    case 'heal':
      if (typeof payload.amount === 'string') {
        const result = rollDice(payload.amount)
        store.adjustHp(result.total)
        return { type: 'heal', value: result.total }
      }
      console.warn('[actionResolver] heal: invalid amount (expected dice string)', payload)
      return { type: 'heal' }
    default:
      return { type: payload.action }
  }
}
