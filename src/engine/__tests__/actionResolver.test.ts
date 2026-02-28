import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveAction } from '../actionResolver'

describe('resolveAction', () => {
  const createMockStore = () => ({
    setFlag: vi.fn(),
    adjustHp: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    adjustCurrency: vi.fn(),
  })

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls setFlag with key and value for set_flag', () => {
    const store = createMockStore()
    resolveAction({ action: 'set_flag', key: 'foo', value: true }, store as any)
    expect(store.setFlag).toHaveBeenCalledWith('foo', true)
    resolveAction({ action: 'set_flag', key: 'bar', value: false }, store as any)
    expect(store.setFlag).toHaveBeenCalledWith('bar', false)
  })

  it('calls adjustHp with amount for adjust_hp', () => {
    const store = createMockStore()
    resolveAction({ action: 'adjust_hp', amount: -5 }, store as any)
    expect(store.adjustHp).toHaveBeenCalledWith(-5)
  })

  it('calls addItem with itemId and qty for add_item', () => {
    const store = createMockStore()
    resolveAction({ action: 'add_item', itemId: 'potion', qty: 2 }, store as any)
    expect(store.addItem).toHaveBeenCalledWith('potion', 2)
  })

  it('calls addItem with default qty 1 when qty omitted', () => {
    const store = createMockStore()
    resolveAction({ action: 'add_item', itemId: 'potion' }, store as any)
    expect(store.addItem).toHaveBeenCalledWith('potion', 1)
  })

  it('calls removeItem with itemId and qty for remove_item', () => {
    const store = createMockStore()
    resolveAction({ action: 'remove_item', itemId: 'key', qty: 1 }, store as any)
    expect(store.removeItem).toHaveBeenCalledWith('key', 1)
  })

  it('calls adjustCurrency with amount for adjust_currency', () => {
    const store = createMockStore()
    resolveAction({ action: 'adjust_currency', amount: 25 }, store as any)
    expect(store.adjustCurrency).toHaveBeenCalledWith(25)
  })

  it('does not call setFlag when key is missing', () => {
    const store = createMockStore()
    resolveAction({ action: 'set_flag', value: true } as any, store as any)
    expect(store.setFlag).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
  })

  it('does not call setFlag when value is not boolean', () => {
    const store = createMockStore()
    resolveAction({ action: 'set_flag', key: 'x', value: 'yes' as any }, store as any)
    expect(store.setFlag).not.toHaveBeenCalled()
  })

  it('does not call adjustHp when amount is not number', () => {
    const store = createMockStore()
    resolveAction({ action: 'adjust_hp', amount: 'five' as any }, store as any)
    expect(store.adjustHp).not.toHaveBeenCalled()
  })

  it('does not call addItem when itemId is missing', () => {
    const store = createMockStore()
    resolveAction({ action: 'add_item', qty: 1 } as any, store as any)
    expect(store.addItem).not.toHaveBeenCalled()
  })
})
