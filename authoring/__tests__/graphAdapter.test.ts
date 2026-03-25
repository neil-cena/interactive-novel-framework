import { describe, it, expect } from 'vitest'
import { modelToVueFlow } from '../adapters/graphAdapter'

describe('graphAdapter', () => {
  it('modelToVueFlow returns flowNodes and flowEdges', () => {
    const nodes = {
      n_1: { id: 'n_1', type: 'narrative', text: 'Start', choices: [{ id: 'c1', label: 'Go', mechanic: { type: 'navigate', nextNodeId: 'n_2' } }] },
      n_2: { id: 'n_2', type: 'ending', text: 'End' },
    }
    const { flowNodes, flowEdges } = modelToVueFlow(nodes, {})
    expect(flowNodes.length).toBe(2)
    expect(flowEdges.length).toBe(1)
    expect(flowEdges[0].source).toBe('n_1')
    expect(flowEdges[0].target).toBe('n_2')
    expect(flowEdges[0].data).toEqual({ sourceNodeId: 'n_1', choiceId: 'c1', branchType: undefined })
  })

  it('modelToVueFlow adds encounter resolution edge data', () => {
    const nodes = { n_win: { id: 'n_win', type: 'ending', text: 'Win' } }
    const encounters = {
      enc_1: {
        id: 'enc_1',
        type: 'combat',
        enemies: [{ enemyId: 'e1', count: 1 }],
        resolution: { onVictory: { nextNodeId: 'n_win' }, onDefeat: { nextNodeId: 'n_win' } },
      },
    }
    const { flowEdges } = modelToVueFlow(nodes, encounters)
    const victoryEdge = flowEdges.find((e) => e.label === 'victory')
    expect(victoryEdge?.data).toEqual({ encounterId: 'enc_1', resolutionType: 'onVictory' })
  })
})
