import { describe, it, expect } from 'vitest'
import { isChoiceVisible } from '../visibilityResolver'

describe('isChoiceVisible', () => {
  const baseState = {
    flags: {} as Record<string, boolean>,
    inventory: { currency: 0, items: {} as Record<string, number> },
    vitals: { hpCurrent: 10 },
  }

  it('returns true when requirements are undefined', () => {
    expect(isChoiceVisible(undefined, baseState)).toBe(true)
  })

  it('returns true when requirements are empty array', () => {
    expect(isChoiceVisible([], baseState)).toBe(true)
  })

  it('has_flag: returns true when flag is truthy', () => {
    const state = { ...baseState, flags: { met_npc: true } }
    expect(isChoiceVisible([{ type: 'has_flag', key: 'met_npc' }], state)).toBe(true)
  })

  it('has_flag: returns false when flag is falsy or missing', () => {
    expect(isChoiceVisible([{ type: 'has_flag', key: 'met_npc' }], baseState)).toBe(false)
    const state = { ...baseState, flags: { met_npc: false } }
    expect(isChoiceVisible([{ type: 'has_flag', key: 'met_npc' }], state)).toBe(false)
  })

  it('not_has_flag: returns true when flag is falsy or missing', () => {
    expect(isChoiceVisible([{ type: 'not_has_flag', key: 'robbed_armory' }], baseState)).toBe(true)
    const state = { ...baseState, flags: { robbed_armory: false } }
    expect(isChoiceVisible([{ type: 'not_has_flag', key: 'robbed_armory' }], state)).toBe(true)
  })

  it('not_has_flag: returns false when flag is set', () => {
    const state = { ...baseState, flags: { robbed_armory: true } }
    expect(isChoiceVisible([{ type: 'not_has_flag', key: 'robbed_armory' }], state)).toBe(false)
  })

  it('has_item: returns true when qty > 0', () => {
    const state = {
      ...baseState,
      inventory: { ...baseState.inventory, items: { key: 2 } },
    }
    expect(isChoiceVisible([{ type: 'has_item', itemId: 'key' }], state)).toBe(true)
  })

  it('has_item: returns false when qty 0 or missing', () => {
    expect(isChoiceVisible([{ type: 'has_item', itemId: 'key' }], baseState)).toBe(false)
    const state = {
      ...baseState,
      inventory: { ...baseState.inventory, items: { key: 0 } },
    }
    expect(isChoiceVisible([{ type: 'has_item', itemId: 'key' }], state)).toBe(false)
  })

  it('stat_check: hpCurrent >= value', () => {
    const state = { ...baseState, vitals: { hpCurrent: 15 } }
    expect(
      isChoiceVisible(
        [{ type: 'stat_check', stat: 'hpCurrent', operator: '>=', value: 10 }],
        state,
      ),
    ).toBe(true)
    expect(
      isChoiceVisible(
        [{ type: 'stat_check', stat: 'hpCurrent', operator: '>=', value: 20 }],
        state,
      ),
    ).toBe(false)
  })

  it('stat_check: currency <= value', () => {
    const state = { ...baseState, inventory: { ...baseState.inventory, currency: 5 } }
    expect(
      isChoiceVisible(
        [{ type: 'stat_check', stat: 'currency', operator: '<=', value: 10 }],
        state,
      ),
    ).toBe(true)
    expect(
      isChoiceVisible(
        [{ type: 'stat_check', stat: 'currency', operator: '<=', value: 3 }],
        state,
      ),
    ).toBe(false)
  })

  it('stat_check: operators >, <, ==', () => {
    const state = { ...baseState, vitals: { hpCurrent: 10 } }
    expect(
      isChoiceVisible([{ type: 'stat_check', stat: 'hpCurrent', operator: '>', value: 9 }], state),
    ).toBe(true)
    expect(
      isChoiceVisible([{ type: 'stat_check', stat: 'hpCurrent', operator: '<', value: 11 }], state),
    ).toBe(true)
    expect(
      isChoiceVisible([{ type: 'stat_check', stat: 'hpCurrent', operator: '==', value: 10 }], state),
    ).toBe(true)
  })

  it('multiple requirements: all must pass (AND)', () => {
    const state = {
      ...baseState,
      flags: { ready: true },
      inventory: { ...baseState.inventory, items: { sword: 1 } },
    }
    expect(
      isChoiceVisible(
        [
          { type: 'has_flag', key: 'ready' },
          { type: 'has_item', itemId: 'sword' },
        ],
        state,
      ),
    ).toBe(true)
    const stateMissingItem = { ...state, inventory: { ...state.inventory, items: {} } }
    expect(
      isChoiceVisible(
        [
          { type: 'has_flag', key: 'ready' },
          { type: 'has_item', itemId: 'sword' },
        ],
        stateMissingItem,
      ),
    ).toBe(false)
  })

  it('invalid requirement type returns false', () => {
    expect(
      isChoiceVisible([{ type: 'unknown' as any }], baseState),
    ).toBe(false)
  })
})
