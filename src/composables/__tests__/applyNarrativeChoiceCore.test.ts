import { describe, it, expect, vi } from 'vitest'
import { applyNarrativeChoiceCore } from '../applyNarrativeChoice'
import type { Choice } from '../../types/story'
import type { StoryNode } from '../../types/story'

describe('applyNarrativeChoiceCore', () => {
  it('applies navigate mechanic without outer telemetry', () => {
    const navigateTo = vi.fn()
    const choice: Choice = {
      id: 'c1',
      label: 'Go',
      mechanic: { type: 'navigate', nextNodeId: 'room_a' },
    }
    const currentNode = { id: 'start' } as StoryNode
    const playerStore = {
      metadata: { currentNodeId: 'start' },
      navigateTo,
      activeSaveSlot: null as string | null,
      startNewGame: vi.fn(),
      resetToDefaults: vi.fn(),
      recordNarrativeChoice: vi.fn(),
    }
    const r = applyNarrativeChoiceCore(choice, {
      playerStore,
      currentNode,
      registry: { mechanics: {} },
      startGameMode: vi.fn(),
      notify: vi.fn(),
      playSfx: vi.fn(),
      suppressSideEffects: true,
    })
    expect(r).toEqual({ kind: 'navigate' })
    expect(navigateTo).toHaveBeenCalledWith('room_a')
  })
})
