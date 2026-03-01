import { describe, it, expect } from 'vitest'
import {
  computePointBuySpend,
  validatePointBuy,
  buildCustomSheetPayload,
} from '../characterSheetBuilder'
import { POINT_BUY_CONFIG } from '../../data/characterSheets'

describe('characterSheetBuilder', () => {
  describe('computePointBuySpend', () => {
    it('returns zero spend when at minimums', () => {
      const attrs = {
        strength: POINT_BUY_CONFIG.attributeStart,
        dexterity: POINT_BUY_CONFIG.attributeStart,
        intelligence: POINT_BUY_CONFIG.attributeStart,
      }
      const result = computePointBuySpend(attrs, POINT_BUY_CONFIG.hpMin, POINT_BUY_CONFIG)
      expect(result.totalSpend).toBe(0)
      expect(result.remaining).toBe(POINT_BUY_CONFIG.budget)
    })

    it('charges 1 point per attribute point above start', () => {
      const attrs = { strength: 2, dexterity: 0, intelligence: 0 }
      const result = computePointBuySpend(attrs, POINT_BUY_CONFIG.hpMin, POINT_BUY_CONFIG)
      expect(result.attributeSpend).toBe(2)
      expect(result.hpSpend).toBe(0)
      expect(result.remaining).toBe(POINT_BUY_CONFIG.budget - 2)
    })

    it('charges hpCostPerPoint for HP above hpMin', () => {
      const attrs = {
        strength: 0,
        dexterity: 0,
        intelligence: 0,
      }
      const hp = POINT_BUY_CONFIG.hpMin + 5
      const result = computePointBuySpend(attrs, hp, POINT_BUY_CONFIG)
      expect(result.hpSpend).toBe(5 * POINT_BUY_CONFIG.hpCostPerPoint)
    })
  })

  describe('validatePointBuy', () => {
    it('valid when within budget and bounds', () => {
      const attrs = { strength: 1, dexterity: 2, intelligence: 1 }
      const hp = 34
      const result = validatePointBuy(attrs, hp, POINT_BUY_CONFIG)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('invalid when over budget', () => {
      const attrs = { strength: 5, dexterity: 5, intelligence: 5 }
      const hp = POINT_BUY_CONFIG.hpMax
      const result = validatePointBuy(attrs, hp, POINT_BUY_CONFIG)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Over budget'))).toBe(true)
    })

    it('invalid when attribute below min', () => {
      const attrs = { strength: -1, dexterity: 0, intelligence: 0 }
      const result = validatePointBuy(attrs, POINT_BUY_CONFIG.hpMin, POINT_BUY_CONFIG)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('strength'))).toBe(true)
    })

    it('invalid when HP above max', () => {
      const attrs = { strength: 0, dexterity: 0, intelligence: 0 }
      const result = validatePointBuy(attrs, POINT_BUY_CONFIG.hpMax + 1, POINT_BUY_CONFIG)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('HP'))).toBe(true)
    })
  })

  describe('buildCustomSheetPayload', () => {
    it('returns custom payload with given attributes and hp', () => {
      const attrs = { strength: 2, dexterity: 1, intelligence: 0 }
      const hp = 38
      const payload = buildCustomSheetPayload(attrs, hp)
      expect(payload.type).toBe('custom')
      expect(payload.startingHp).toBe(38)
      expect(payload.startingAttributes).toEqual(attrs)
    })
  })
})
