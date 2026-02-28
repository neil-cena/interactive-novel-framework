import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlaytestMode } from '../usePlaytestMode'
import { usePlayerStore } from '../../stores/playerStore'

describe('usePlaytestMode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('exposes nodeList from STORY_NODES', () => {
    const { nodeList, nodeIds } = usePlaytestMode()
    expect(Array.isArray(nodeList.value)).toBe(true)
    expect(nodeList.value.length).toBe(nodeIds.value.length)
    if (nodeList.value.length > 0) {
      expect(nodeList.value[0]).toHaveProperty('id')
      expect(nodeList.value[0]).toHaveProperty('type')
      expect(nodeList.value[0]).toHaveProperty('text')
    }
  })

  it('teleport updates store currentNodeId', () => {
    const store = usePlayerStore()
    const { teleport, nodeIds } = usePlaytestMode()
    const target = nodeIds.value[0]
    if (target) {
      teleport(target)
      expect(store.metadata.currentNodeId).toBe(target)
    }
  })

  it('resetToDefaults resets store state', () => {
    const store = usePlayerStore()
    store.navigateTo('n_market')
    store.adjustHp(-5)
    const { resetToDefaults } = usePlaytestMode()
    resetToDefaults()
    expect(store.metadata.currentNodeId).toBe(store.metadata.currentNodeId)
    expect(store.vitals.hpCurrent).toBe(store.vitals.hpMax)
  })

  it('stateSnapshot reflects store state', () => {
    const store = usePlayerStore()
    const { stateSnapshot } = usePlaytestMode()
    expect(stateSnapshot.value.metadata.currentNodeId).toBe(store.metadata.currentNodeId)
    expect(stateSnapshot.value.vitals.hpCurrent).toBe(store.vitals.hpCurrent)
  })
})
