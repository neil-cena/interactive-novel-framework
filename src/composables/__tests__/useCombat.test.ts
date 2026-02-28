import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCombat } from '../useCombat'
import type { CombatEncounter } from '../../types/combat'
import { rollDice } from '../../utils/dice'

vi.mock('../../utils/dice', () => ({
  rollDice: vi.fn((dice: string) => {
    const flat = Number(dice)
    if (Number.isFinite(flat)) {
      return { rolls: [], modifier: flat, total: flat }
    }
    const match = dice.match(/(\d+)d\d+([+-]\d+)?/)
    const modifier = match?.[2] ? Number(match[2]) : 0
    const roll = 10
    return { rolls: [roll], modifier, total: roll + modifier }
  }),
}))

const mockEncounter: CombatEncounter = {
  id: 'test_enc',
  type: 'combat',
  enemies: [{ enemyId: 'silk_thug', count: 1 }],
  resolution: {
    onVictory: { nextNodeId: 'n_win' },
    onDefeat: { nextNodeId: 'n_lose' },
  },
}

const mockEncounterTwo: CombatEncounter = {
  ...mockEncounter,
  id: 'test_two',
  enemies: [{ enemyId: 'silk_thug', count: 2 }],
}

describe('useCombat', () => {
  beforeEach(() => {
    vi.mocked(rollDice).mockImplementation((dice: string) => {
      const flat = Number(dice)
      if (Number.isFinite(flat)) return { rolls: [], modifier: flat, total: flat }
      const match = dice.match(/(\d+)d\d+([+-]\d+)?/)
      const modifier = match?.[2] ? Number(match[2]) : 0
      return { rolls: [10], modifier, total: 10 + modifier }
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initCombat spawns enemies with correct stats', () => {
    const { initCombat, enemies, roundCount, log } = useCombat()
    initCombat(mockEncounter)
    expect(enemies.value).toHaveLength(1)
    expect(enemies.value[0].name).toBe('Silk Mask Thug')
    expect(enemies.value[0].hpCurrent).toBe(15)
    expect(enemies.value[0].ac).toBe(12)
    expect(roundCount.value).toBe(1)
    expect(log.value).toContain('Combat begins.')
  })

  it('initCombat with count 2 numbers enemies', () => {
    const { initCombat, enemies } = useCombat()
    initCombat(mockEncounterTwo)
    expect(enemies.value).toHaveLength(2)
    expect(enemies.value[0].name).toBe('Silk Mask Thug 1')
    expect(enemies.value[1].name).toBe('Silk Mask Thug 2')
  })

  it('initCombat skips missing enemy template and warns', () => {
    const enc: CombatEncounter = {
      ...mockEncounter,
      enemies: [{ enemyId: 'missing_id', count: 1 }],
    }
    const { initCombat, enemies } = useCombat()
    initCombat(enc)
    expect(enemies.value).toHaveLength(0)
    expect(console.warn).toHaveBeenCalled()
  })

  it('playerAttack hit reduces enemy HP and switches to enemy turn', () => {
    vi.mocked(rollDice).mockImplementation((dice: string) => {
      const n = Number(dice)
      if (Number.isFinite(n)) return { rolls: [], modifier: n, total: n }
      if (dice.includes('1d20')) return { rolls: [15], modifier: 0, total: 15 }
      return { rolls: [4], modifier: 0, total: 4 }
    })
    const { initCombat, playerAttack, enemies, turn } = useCombat()
    initCombat(mockEncounter)
    const initialHp = enemies.value[0].hpCurrent
    playerAttack(0, 'dagger_iron', 0)
    expect(enemies.value[0].hpCurrent).toBe(initialHp - 4)
    expect(turn.value).toBe('enemy')
  })

  it('playerAttack miss leaves HP unchanged', () => {
    vi.mocked(rollDice).mockImplementation((dice: string) => {
      const n = Number(dice)
      if (Number.isFinite(n)) return { rolls: [], modifier: n, total: n }
      if (dice.includes('1d20')) return { rolls: [1], modifier: 0, total: 1 }
      return { rolls: [4], modifier: 0, total: 4 }
    })
    const { initCombat, playerAttack, enemies } = useCombat()
    initCombat(mockEncounter)
    const initialHp = enemies.value[0].hpCurrent
    playerAttack(0, 'dagger_iron', 0)
    expect(enemies.value[0].hpCurrent).toBe(initialHp)
  })

  it('playerAttack on dead enemy is no-op', () => {
    const { initCombat, playerAttack, enemies } = useCombat()
    initCombat(mockEncounter)
    enemies.value[0].hpCurrent = 0
    playerAttack(0, 'dagger_iron', 0)
    expect(enemies.value[0].hpCurrent).toBe(0)
  })

  it('enemyTurn hit calls onDamagePlayer and increments round', () => {
    vi.mocked(rollDice).mockImplementation((dice: string) => {
      const n = Number(dice)
      if (Number.isFinite(n)) return { rolls: [], modifier: n, total: n }
      return { rolls: [15], modifier: 0, total: 15 }
    })
    const { initCombat, enemyTurn, turn, roundCount } = useCombat()
    initCombat(mockEncounter)
    turn.value = 'enemy'
    const damageCb = vi.fn()
    enemyTurn(10, damageCb)
    expect(damageCb).toHaveBeenCalled()
    expect(turn.value).toBe('player')
    expect(roundCount.value).toBe(2)
  })

  it('isResolved returns victory when all enemies dead', () => {
    const { initCombat, enemies, isResolved } = useCombat()
    initCombat(mockEncounter)
    expect(isResolved.value).toBe(null)
    enemies.value[0].hpCurrent = 0
    expect(isResolved.value).toBe('victory')
  })

  it('resetCombat clears state', () => {
    const { initCombat, resetCombat, enemies, roundCount, log, turn, turnOrder } = useCombat()
    initCombat(mockEncounter)
    resetCombat()
    expect(enemies.value).toEqual([])
    expect(roundCount.value).toBe(1)
    expect(log.value).toEqual([])
    expect(turn.value).toBe('player')
    expect(turnOrder.value).toEqual([])
  })

  it('useItem calls callback, logs, and switches turn', () => {
    const { initCombat, useItem, turn, log } = useCombat()
    initCombat(mockEncounter)
    turn.value = 'player'
    const callback = vi.fn(() => ({ type: 'heal', value: 6 }))
    useItem('health_potion', callback)
    expect(callback).toHaveBeenCalled()
    expect(log.value.some((e: string) => e.includes('recovered 6 HP'))).toBe(true)
    expect(turn.value).toBe('enemy')
  })

  it('useItem logs generic message for non-heal effects', () => {
    const { initCombat, useItem, log } = useCombat()
    initCombat(mockEncounter)
    const callback = vi.fn(() => ({ type: 'adjust_hp', value: 5 }))
    useItem('health_potion', callback)
    expect(log.value.some((e: string) => e.includes('You used Health Potion'))).toBe(true)
  })

  it('useItem ignores non-consumable items', () => {
    const { initCombat, useItem, turn } = useCombat()
    initCombat(mockEncounter)
    turn.value = 'player'
    const callback = vi.fn(() => ({ type: 'heal' }))
    useItem('dagger_iron', callback)
    expect(callback).not.toHaveBeenCalled()
    expect(turn.value).toBe('player')
  })

  it('playerAoeAttack damages all living enemies and switches turn', () => {
    vi.mocked(rollDice).mockImplementation((dice: string) => {
      const n = Number(dice)
      if (Number.isFinite(n)) return { rolls: [], modifier: n, total: n }
      if (dice.includes('1d20')) return { rolls: [15], modifier: 0, total: 15 }
      return { rolls: [3], modifier: 0, total: 3 }
    })
    const { initCombat, playerAoeAttack, enemies, turn } = useCombat()
    initCombat(mockEncounterTwo)
    const hp0 = enemies.value[0].hpCurrent
    const hp1 = enemies.value[1].hpCurrent
    playerAoeAttack('dagger_iron', 0)
    expect(enemies.value[0].hpCurrent).toBe(hp0 - 3)
    expect(enemies.value[1].hpCurrent).toBe(hp1 - 3)
    expect(turn.value).toBe('enemy')
  })

  it('initCombat creates turnOrder with player and enemies', () => {
    const { initCombat, turnOrder } = useCombat()
    initCombat(mockEncounter, 2, false)
    expect(turnOrder.value.length).toBeGreaterThanOrEqual(2)
    expect(turnOrder.value.some((e: any) => e.isPlayer)).toBe(true)
    expect(turnOrder.value.some((e: any) => !e.isPlayer)).toBe(true)
  })

  it('initCombat player wins ties in initiative', () => {
    vi.mocked(rollDice).mockImplementation(() => ({ rolls: [10], modifier: 0, total: 10 }))
    const { initCombat, turnOrder } = useCombat()
    initCombat(mockEncounter, 0, false)
    expect(turnOrder.value[0].isPlayer).toBe(true)
  })

  it('initCombat surprise adds +10 to player initiative', () => {
    vi.mocked(rollDice).mockImplementation((dice: string) => {
      const n = Number(dice)
      if (Number.isFinite(n)) return { rolls: [], modifier: n, total: n }
      return { rolls: [5], modifier: 0, total: 5 }
    })
    const { initCombat, turnOrder } = useCombat()
    initCombat(mockEncounter, 0, true)
    const playerEntry = turnOrder.value.find((e: any) => e.isPlayer)
    expect(playerEntry?.initiative).toBe(15)
  })

  it('initCombat sets enemy turn when enemy rolls higher', () => {
    let callIndex = 0
    vi.mocked(rollDice).mockImplementation((dice: string) => {
      const n = Number(dice)
      if (Number.isFinite(n)) return { rolls: [], modifier: n, total: n }
      callIndex += 1
      if (callIndex === 1) return { rolls: [1], modifier: 0, total: 1 }
      return { rolls: [20], modifier: 0, total: 20 }
    })
    const { initCombat, turn } = useCombat()
    initCombat(mockEncounter, 0, false)
    expect(turn.value).toBe('enemy')
  })
})
