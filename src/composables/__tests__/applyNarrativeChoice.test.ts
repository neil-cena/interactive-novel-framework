import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { applyNarrativeChoice, filterVisibleNarrativeChoices } from '../applyNarrativeChoice'
import { usePlayerStore } from '../../stores/playerStore'
import { createPluginRegistry } from '../../plugins/registry'
import * as analyticsClient from '../../services/analyticsClient'
import * as gameEventBus from '../../services/events/gameEventBus'
import type { Choice } from '../../types/story'
import type { StoryNode } from '../../types/story'

vi.mock('../../services/analyticsClient', () => ({
  trackOutcomeEvent: vi.fn(),
}))

vi.mock('../../services/events/gameEventBus', () => ({
  emitGameEvent: vi.fn(),
}))

describe('applyNarrativeChoice', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('navigates to nextNodeId', () => {
    const store = usePlayerStore()
    store.metadata.currentNodeId = 'node_a'
    const registry = createPluginRegistry()
    const choice: Choice = {
      id: 'c1',
      label: 'Go',
      mechanic: { type: 'navigate', nextNodeId: 'node_b' },
    }
    const currentNode = {
      id: 'node_a',
      type: 'narrative',
      text: 't',
      choices: [choice],
    } as StoryNode

    const r = applyNarrativeChoice(choice, {
      playerStore: store,
      currentNode,
      registry,
      startGameMode: vi.fn(),
      notify: vi.fn(),
      playSfx: vi.fn(),
    })

    expect(r.kind).toBe('navigate')
    expect(store.metadata.currentNodeId).toBe('node_b')
  })

  it('returns unsupported when mechanic missing from registry', () => {
    const store = usePlayerStore()
    store.metadata.currentNodeId = 'node_a'
    const registry = createPluginRegistry()
    const choice: Choice = {
      id: 'c1',
      label: 'X',
      mechanic: { type: 'nonexistent_mechanic_xyz' } as Choice['mechanic'],
    }
    const r = applyNarrativeChoice(choice, {
      playerStore: store,
      currentNode: { id: 'node_a', type: 'narrative', text: 't' } as StoryNode,
      registry,
      startGameMode: vi.fn(),
      notify: vi.fn(),
      playSfx: vi.fn(),
    })
    expect(r.kind).toBe('unsupported')
  })

  it('suppressSideEffects skips analytics, bus, and narrative history', () => {
    const store = usePlayerStore()
    store.metadata.currentNodeId = 'node_a'
    const recordSpy = vi.spyOn(store, 'recordNarrativeChoice')
    const registry = createPluginRegistry()
    const choice: Choice = {
      id: 'c1',
      label: 'Go',
      mechanic: { type: 'navigate', nextNodeId: 'node_b' },
    }
    vi.mocked(analyticsClient.trackOutcomeEvent).mockClear()
    vi.mocked(gameEventBus.emitGameEvent).mockClear()

    const r = applyNarrativeChoice(choice, {
      playerStore: store,
      currentNode: { id: 'node_a', type: 'narrative', text: 't', choices: [choice] } as StoryNode,
      registry,
      startGameMode: vi.fn(),
      notify: vi.fn(),
      playSfx: vi.fn(),
      suppressSideEffects: true,
    })

    expect(r.kind).toBe('navigate')
    expect(analyticsClient.trackOutcomeEvent).not.toHaveBeenCalled()
    expect(gameEventBus.emitGameEvent).not.toHaveBeenCalled()
    expect(recordSpy).not.toHaveBeenCalled()
  })
})

describe('filterVisibleNarrativeChoices', () => {
  it('filters by visibility', () => {
    const choices: Choice[] = [
      {
        id: 'always',
        label: 'A',
        mechanic: { type: 'navigate', nextNodeId: 'x' },
      },
      {
        id: 'hidden',
        label: 'B',
        visibilityRequirements: [{ type: 'has_flag', key: 'flag_that_is_never_set' }],
        mechanic: { type: 'navigate', nextNodeId: 'y' },
      },
    ]
    const state = {
      flags: {},
      inventory: { currency: 0, items: {} },
      vitals: { hpCurrent: 10, hpMax: 10 },
      worldState: {},
    }
    const v = filterVisibleNarrativeChoices(choices, state)
    expect(v.map((c) => c.id)).toEqual(['always'])
  })
})
