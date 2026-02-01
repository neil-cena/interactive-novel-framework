import type { ActionPayload } from './story'

export interface ItemTemplate {
  id: string
  name: string
  type: 'weapon' | 'consumable' | 'tool'
  damage?: string
  attackBonus?: number
  acBonus?: number
  effect?: ActionPayload
}
