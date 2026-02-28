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
  })
})
