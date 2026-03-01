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
    expect(state.vitals.hpMax).toBe(GAME_CONFIG.player.startingHp)
    expect(state.inventory.currency).toBe(GAME_CONFIG.player.startingCurrency)
    expect(state.equipment.mainHand).toBe(GAME_CONFIG.player.startingWeaponId)
    expect(state.inventory.items.lockpick).toBe(1)
  })

  it('navigateTo updates currentNodeId', () => {
    const store = usePlayerStore()
    store.navigateTo('n_market')
    expect(store.metadata.currentNodeId).toBe('n_market')
  })

  it('adjustHp clamps between 0 and hpMax', () => {
    const store = usePlayerStore()
    store.adjustHp(5)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp)
    store.adjustHp(-10)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp - 10)
    store.adjustHp(-100)
    expect(store.vitals.hpCurrent).toBe(0)
  })

  it('adjustHp respects hpMax ceiling after increaseMaxHp', () => {
    const store = usePlayerStore()
    store.increaseMaxHp(10)
    expect(store.vitals.hpMax).toBe(GAME_CONFIG.player.startingHp + 10)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp + 10)
    store.adjustHp(-5)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp + 5)
    store.adjustHp(100)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp + 10)
  })

  it('increaseMaxHp rejects invalid amounts', () => {
    const store = usePlayerStore()
    const before = store.vitals.hpMax
    store.increaseMaxHp(NaN)
    expect(store.vitals.hpMax).toBe(before)
    store.increaseMaxHp(-5)
    expect(store.vitals.hpMax).toBe(before)
    store.increaseMaxHp(0)
    expect(store.vitals.hpMax).toBe(before)
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

  it('startNewGame resets and sets slot when no payload', () => {
    const store = usePlayerStore()
    store.navigateTo('n_market')
    store.adjustHp(-5)
    store.startNewGame('save_slot_1')
    expect(store.metadata.currentNodeId).toBe(GAME_CONFIG.player.startingNodeId)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp)
    expect(store.vitals.hpMax).toBe(GAME_CONFIG.player.startingHp)
    expect(store.activeSaveSlot).toBe('save_slot_1')
  })

  it('startNewGame with preset payload initializes from preset', () => {
    const store = usePlayerStore()
    store.startNewGame('save_slot_2', { type: 'preset', presetId: 'char_paladin' })
    expect(store.metadata.characterSheetId).toBe('char_paladin')
    expect(store.metadata.isCustomSheet).toBe(false)
    expect(store.vitals.hpCurrent).toBe(24)
    expect(store.vitals.hpMax).toBe(24)
    expect(store.attributes.strength).toBe(3)
    expect(store.attributes.dexterity).toBe(0)
    expect(store.attributes.intelligence).toBe(-1)
    expect(store.activeSaveSlot).toBe('save_slot_2')
  })

  it('startNewGame with custom payload initializes from custom build', () => {
    const store = usePlayerStore()
    store.startNewGame('save_slot_3', {
      type: 'custom',
      startingHp: 35,
      startingWeaponId: null,
      startingItems: {},
      startingFlags: {},
      startingAttributes: { strength: 1, dexterity: 2, intelligence: 1 },
    })
    expect(store.metadata.isCustomSheet).toBe(true)
    expect(store.vitals.hpCurrent).toBe(35)
    expect(store.vitals.hpMax).toBe(35)
    expect(store.attributes.strength).toBe(1)
    expect(store.attributes.dexterity).toBe(2)
    expect(store.attributes.intelligence).toBe(1)
    expect(store.activeSaveSlot).toBe('save_slot_3')
  })

  it('startNewGame with unknown preset id falls back to defaults', () => {
    const store = usePlayerStore()
    store.startNewGame('save_slot_1', { type: 'preset', presetId: 'nonexistent' })
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp)
    expect(store.vitals.hpMax).toBe(GAME_CONFIG.player.startingHp)
    expect(store.activeSaveSlot).toBe('save_slot_1')
  })

  it('loadGame with legacy save without sheet metadata merges defaults', () => {
    const store = usePlayerStore()
    const legacySave = {
      metadata: { currentNodeId: 'n_tavern' },
      vitals: { hpCurrent: 8, hpMax: 20 },
      inventory: { currency: 5, items: {} },
      equipment: { mainHand: 'dagger_iron' },
      attributes: { strength: 0, dexterity: 2, intelligence: 1 },
      progression: { xp: 0, level: 1, xpToNextLevel: 100, unspentAttributePoints: 0 },
      flags: {},
    } as Partial<import('../../types/player').PlayerState>
    store.loadGame('save_slot_1', legacySave)
    expect(store.metadata.currentNodeId).toBe('n_tavern')
    expect(store.vitals.hpCurrent).toBe(8)
    expect(store.metadata.characterSheetId).toBeUndefined()
  })

  it('loadGame patches state and sets slot', () => {
    const store = usePlayerStore()
    const saved = {
      ...defaultPlayerState(),
      metadata: { currentNodeId: 'n_armory' },
      vitals: { hpCurrent: 5, hpMax: 20 },
    }
    store.loadGame('save_slot_2', saved)
    expect(store.metadata.currentNodeId).toBe('n_armory')
    expect(store.vitals.hpCurrent).toBe(5)
    expect(store.vitals.hpMax).toBe(20)
    expect(store.activeSaveSlot).toBe('save_slot_2')
  })

  it('loadGame deep-merges with defaults for old save shapes', () => {
    const store = usePlayerStore()
    const oldSave = {
      metadata: { currentNodeId: 'n_armory' },
      vitals: { hpCurrent: 12 },
      inventory: { currency: 5, items: { key: 1 } },
      equipment: { mainHand: null },
      flags: { quest_done: true },
    } as Partial<import('../../types/player').PlayerState>
    store.loadGame('save_slot_1', oldSave)
    expect(store.metadata.currentNodeId).toBe('n_armory')
    expect(store.vitals.hpCurrent).toBe(12)
    expect(store.vitals.hpMax).toBe(GAME_CONFIG.player.startingHp)
    expect(store.activeSaveSlot).toBe('save_slot_1')
  })

  it('resetToDefaults restores default state', () => {
    const store = usePlayerStore()
    store.navigateTo('n_armory')
    store.adjustHp(-10)
    store.resetToDefaults()
    expect(store.metadata.currentNodeId).toBe(GAME_CONFIG.player.startingNodeId)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp)
  })

  it('defaultPlayerState includes attributes from config', () => {
    const state = defaultPlayerState()
    expect(state.attributes).toEqual(GAME_CONFIG.player.startingAttributes)
  })

  it('defaultPlayerState includes progression', () => {
    const state = defaultPlayerState()
    expect(state.progression.level).toBe(GAME_CONFIG.leveling.startingLevel)
    expect(state.progression.xp).toBe(GAME_CONFIG.leveling.startingXp)
    expect(state.progression.unspentAttributePoints).toBe(0)
  })

  it('adjustAttribute increments attribute', () => {
    const store = usePlayerStore()
    const before = store.attributes.dexterity
    store.adjustAttribute('dexterity', 3)
    expect(store.attributes.dexterity).toBe(before + 3)
  })

  it('adjustAttribute with NaN is no-op', () => {
    const store = usePlayerStore()
    const before = store.attributes.strength
    store.adjustAttribute('strength', NaN)
    expect(store.attributes.strength).toBe(before)
  })

  it('awardXp adds XP without leveling when below threshold', () => {
    const store = usePlayerStore()
    const leveled = store.awardXp(10)
    expect(leveled).toBe(false)
    expect(store.progression.xp).toBe(10)
    expect(store.progression.level).toBe(1)
  })

  it('awardXp triggers level-up at threshold', () => {
    const store = usePlayerStore()
    const leveled = store.awardXp(GAME_CONFIG.leveling.xpThresholds[1])
    expect(leveled).toBe(true)
    expect(store.progression.level).toBe(2)
    expect(store.vitals.hpMax).toBe(GAME_CONFIG.player.startingHp + GAME_CONFIG.leveling.hpPerLevel)
    expect(store.vitals.hpCurrent).toBe(GAME_CONFIG.player.startingHp + GAME_CONFIG.leveling.hpPerLevel)
    expect(store.progression.unspentAttributePoints).toBe(GAME_CONFIG.leveling.attributePointsPerLevel)
  })

  it('awardXp rejects invalid amounts', () => {
    const store = usePlayerStore()
    expect(store.awardXp(NaN)).toBe(false)
    expect(store.awardXp(-5)).toBe(false)
    expect(store.awardXp(0)).toBe(false)
    expect(store.progression.xp).toBe(0)
  })

  it('spendAttributePoint decrements points and increases attribute', () => {
    const store = usePlayerStore()
    store.awardXp(GAME_CONFIG.leveling.xpThresholds[1])
    expect(store.progression.unspentAttributePoints).toBe(1)
    const beforeInt = store.attributes.intelligence
    store.spendAttributePoint('intelligence')
    expect(store.attributes.intelligence).toBe(beforeInt + 1)
    expect(store.progression.unspentAttributePoints).toBe(0)
  })

  it('spendAttributePoint does nothing when no points available', () => {
    const store = usePlayerStore()
    const beforeStr = store.attributes.strength
    store.spendAttributePoint('strength')
    expect(store.attributes.strength).toBe(beforeStr)
  })

  it('loadGame deep-merges attributes and progression for old saves', () => {
    const store = usePlayerStore()
    const oldSave = {
      metadata: { currentNodeId: 'n_armory' },
      vitals: { hpCurrent: 10 },
      inventory: { currency: 5, items: {} },
      equipment: { mainHand: null },
      flags: {},
    } as Partial<import('../../types/player').PlayerState>
    store.loadGame('save_slot_1', oldSave)
    expect(store.attributes).toEqual(GAME_CONFIG.player.startingAttributes)
    expect(store.progression.level).toBe(GAME_CONFIG.leveling.startingLevel)
    expect(store.progression.xp).toBe(GAME_CONFIG.leveling.startingXp)
  })
})
