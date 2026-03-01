import type { ActionPayload } from './story'

export interface ItemTemplate {
  id: string
  name: string
  type: 'weapon' | 'consumable' | 'tool' | 'armor'
  damage?: string
  attackBonus?: number
  acBonus?: number
  effect?: ActionPayload
  scalingAttribute?: 'strength' | 'dexterity' | 'intelligence'
  aoe?: boolean
}
