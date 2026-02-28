import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rollDice } from '../dice'

describe('rollDice', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns flat integer for numeric string', () => {
    const result = rollDice('5')
    expect(result).toEqual({ rolls: [], modifier: 5, total: 5 })
  })

  it('returns flat integer for "0"', () => {
    const result = rollDice('0')
    expect(result).toEqual({ rolls: [], modifier: 0, total: 0 })
  })

  it('returns 1d20 with one roll in range 1-20', () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDice('1d20')
      expect(result.rolls).toHaveLength(1)
      expect(result.rolls[0]).toBeGreaterThanOrEqual(1)
      expect(result.rolls[0]).toBeLessThanOrEqual(20)
      expect(result.modifier).toBe(0)
      expect(result.total).toBe(result.rolls[0])
    }
  })

  it('returns 2d6+3 with two rolls and modifier', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1.5 / 6)
    const result = rollDice('2d6+3')
    expect(result.rolls).toHaveLength(2)
    expect(result.rolls[0]).toBe(1)
    expect(result.rolls[1]).toBe(2)
    expect(result.modifier).toBe(3)
    expect(result.total).toBe(1 + 2 + 3)
    vi.restoreAllMocks()
  })

  it('applies negative modifier correctly', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollDice('1d20-2')
    expect(result.rolls).toHaveLength(1)
    expect(result.modifier).toBe(-2)
    expect(result.total).toBe(result.rolls[0] - 2)
    vi.restoreAllMocks()
  })

  it('normalizes whitespace in " 1d20 + 2 "', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const result = rollDice(' 1d20 + 2 ')
    expect(result.rolls).toHaveLength(1)
    expect(result.rolls[0]).toBe(1)
    expect(result.modifier).toBe(2)
    expect(result.total).toBe(3)
    vi.restoreAllMocks()
  })

  it('returns zero fallback for invalid "abc"', () => {
    const result = rollDice('abc')
    expect(result).toEqual({ rolls: [], modifier: 0, total: 0 })
    expect(console.warn).toHaveBeenCalled()
  })

  it('returns zero fallback for empty string', () => {
    const result = rollDice('')
    expect(result.total).toBe(0)
  })

  it('returns zero fallback for "0d6"', () => {
    const result = rollDice('0d6')
    expect(result).toEqual({ rolls: [], modifier: 0, total: 0 })
  })

  it('returns zero fallback for "1d0"', () => {
    const result = rollDice('1d0')
    expect(result).toEqual({ rolls: [], modifier: 0, total: 0 })
  })
})
