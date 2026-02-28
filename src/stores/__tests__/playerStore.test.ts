import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore, defaultPlayerState } from '../playerStore'
import { GAME_CONFIG } from '../../config'

describe('playerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaultPlayerState returns expected defaults from config', () => {
    const state = defaultPlayerState()
    expect(state.metadata.currentNodeId).toBe(GAME_CONFIG.player.startingNodeId)
    expect(state.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp)
    expect(state.inventory.currency).toBe(GAME_CONFIG.player.startingCurrency)
    expect(state.equipment.mainHand).toBe(GAME_CONFIG.player.startingWeaponId)
    expect(state.inventory.items.lockpick).toBe(1)
  })

  it('navigateTo updates currentNodeId', () => {
    const store = usePlayerStore()
    store.navigateTo('n_market')
    expect(store.metadata.currentNodeId).toBe('n_market')
  })

  it('adjustHp adds and subtracts, floors at 0', () => {
    const store = usePlayerStore()
    store.adjustHp(5)
    expect(store.vitals.hpCurrent).toBe(25)
    store.adjustHp(-10)
    expect(store.vitals.hpCurrent).toBe(15)
    store.adjustHp(-100)
    expect(store.vitals.hpCurrent).toBe(0)
  })

  it('adjustHp with NaN is no-op', () => {
    const store = usePlayerStore()
    const before = store.vitals.hpCurrent
    store.adjustHp(NaN)
    expect(store.vitals.hpCurrent).toBe(before)
    expect(console.warn).toHaveBeenCalled()
  })

  it('setFlag sets boolean flag', () => {
    const store = usePlayerStore()
    store.setFlag('met_npc', true)
    expect(store.flags.met_npc).toBe(true)
    store.setFlag('met_npc', false)
    expect(store.flags.met_npc).toBe(false)
  })

  it('addItem adds new item and increments existing', () => {
    const store = usePlayerStore()
    store.addItem('potion')
    expect(store.inventory.items.potion).toBe(1)
    store.addItem('potion', 2)
    expect(store.inventory.items.potion).toBe(3)
  })

  it('removeItem decrements and deletes at 0', () => {
    const store = usePlayerStore()
    store.addItem('key', 2)
    store.removeItem('key', 1)
    expect(store.inventory.items.key).toBe(1)
    store.removeItem('key', 1)
    expect(store.inventory.items.key).toBeUndefined()
  })

  it('adjustCurrency adds and subtracts, floors at 0', () => {
    const store = usePlayerStore()
    store.adjustCurrency(5)
    expect(store.inventory.currency).toBe(15)
    store.adjustCurrency(-100)
    expect(store.inventory.currency).toBe(0)
  })

  it('adjustCurrency with NaN is no-op', () => {
    const store = usePlayerStore()
    const before = store.inventory.currency
    store.adjustCurrency(NaN)
    expect(store.inventory.currency).toBe(before)
  })

  it('equipItem sets mainHand', () => {
    const store = usePlayerStore()
    store.equipItem('mainHand', 'blade_of_shadows')
    expect(store.equipment.mainHand).toBe('blade_of_shadows')
    store.equipItem('mainHand', null)
    expect(store.equipment.mainHand).toBe(null)
  })

  it('startNewGame resets and sets slot', () => {
    const store = usePlayerStore()
    store.navigateTo('n_market')
    store.adjustHp(-5)
    store.startNewGame('save_slot_1')
    expect(store.metadata.currentNodeId).toBe(GAME_CONFIG.player.startingNodeId)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp)
    expect(store.activeSaveSlot).toBe('save_slot_1')
  })

  it('loadGame patches state and sets slot', () => {
    const store = usePlayerStore()
    const saved = {
      ...defaultPlayerState(),
      metadata: { currentNodeId: 'n_armory' },
      vitals: { hpCurrent: 5 },
    }
    store.loadGame('save_slot_2', saved)
    expect(store.metadata.currentNodeId).toBe('n_armory')
    expect(store.vitals.hpCurrent).toBe(5)
    expect(store.activeSaveSlot).toBe('save_slot_2')
  })

  it('resetToDefaults restores default state', () => {
    const store = usePlayerStore()
    store.navigateTo('n_armory')
    store.adjustHp(-10)
    store.resetToDefaults()
    expect(store.metadata.currentNodeId).toBe(GAME_CONFIG.player.startingNodeId)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp)
  })
})
