import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthoringData } from '../composables/useAuthoringData'

vi.mock('../api/authoringClient', () => ({
  loadFromApi: vi.fn().mockResolvedValue({
    nodes: {},
    items: {},
    enemies: {},
    encounters: {},
    errors: [],
    warnings: [],
  }),
  validateOnApi: vi.fn().mockResolvedValue({ errors: [], warnings: [] }),
  saveToApi: vi.fn().mockResolvedValue({ success: true, written: [], backups: [], warnings: [] }),
}))

describe('useAuthoringData mutations', () => {
  beforeEach(async () => {
    vi.mocked((await import('../api/authoringClient')).loadFromApi).mockResolvedValue({
      nodes: {},
      items: {},
      enemies: {},
      encounters: {},
      errors: [],
      warnings: [],
    })
  })

  it('createNode adds node and selects it', () => {
    const { nodes, createNode, selectedNodeId } = useAuthoringData()
    const id = createNode('narrative')
    expect(id).toBe('n_node_1')
    expect(nodes.value[id]).toBeDefined()
    expect(nodes.value[id].type).toBe('narrative')
    expect(nodes.value[id].text).toBe('')
    expect(selectedNodeId.value).toBe(id)
  })

  it('deleteNode removes node', () => {
    const { nodes, createNode, deleteNode, selectedNodeId } = useAuthoringData()
    const id = createNode('narrative')
    deleteNode(id, 'cascade')
    expect(nodes.value[id]).toBeUndefined()
    expect(selectedNodeId.value).toBeNull()
  })

  it('createChoice adds choice to node', () => {
    const { nodes, createNode, createChoice } = useAuthoringData()
    const nodeId = createNode('narrative')
    const choiceId = createChoice(nodeId, 'navigate')
    expect(choiceId).not.toBeNull()
    const node = nodes.value[nodeId]
    expect(node?.choices?.length).toBe(1)
    expect(node?.choices?.[0].mechanic).toEqual({ type: 'navigate', nextNodeId: '' })
  })

  it('setChoiceMechanic updates choice mechanic', () => {
    const { nodes, createNode, createChoice, setChoiceMechanic } = useAuthoringData()
    const nodeId = createNode('narrative')
    const choiceId = createChoice(nodeId, 'navigate')!
    setChoiceMechanic(nodeId, choiceId, { type: 'navigate', nextNodeId: 'n_2' })
    expect(nodes.value[nodeId].choices?.[0].mechanic).toEqual({ type: 'navigate', nextNodeId: 'n_2' })
  })

  it('createEncounter adds encounter', () => {
    const { encounters, createEncounter, selectedEncounterId } = useAuthoringData()
    const id = createEncounter()
    expect(id).toBe('enc_enc_1')
    expect(encounters.value[id]).toBeDefined()
    expect(selectedEncounterId.value).toBe(id)
  })

  it('createItem and createEnemy add entities', () => {
    const { items, enemies, createItem, createEnemy } = useAuthoringData()
    const itemId = createItem()
    const enemyId = createEnemy()
    expect(items.value[itemId]).toBeDefined()
    expect(enemies.value[enemyId]).toBeDefined()
  })
})
