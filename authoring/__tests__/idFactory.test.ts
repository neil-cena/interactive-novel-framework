import { describe, it, expect } from 'vitest'
import { createIdFactory, collectIdContext } from '../utils/idFactory'

describe('idFactory', () => {
  it('nextNodeId returns unique node id with prefix', () => {
    const ctx = collectIdContext({}, {}, {}, {})
    const f = createIdFactory(ctx)
    expect(f.nextNodeId()).toBe('n_node_1')
    const ctx2 = collectIdContext({ n_node_1: { id: 'n_node_1', choices: [] } } as never, {}, {}, {})
    const f2 = createIdFactory(ctx2)
    expect(f2.nextNodeId()).toBe('n_node_2')
    expect(f2.nextNodeId('start')).toBe('n_start_1')
  })

  it('nextNodeId avoids collision with existing nodes', () => {
    const ctx = collectIdContext(
      { n_node_1: { id: 'n_node_1', choices: [] } } as never,
      {},
      {},
      {}
    )
    const f = createIdFactory(ctx)
    expect(f.nextNodeId()).toBe('n_node_2')
  })

  it('nextChoiceId returns unique choice id for node', () => {
    const ctx = collectIdContext({}, {}, {}, {})
    const f = createIdFactory(ctx)
    expect(f.nextChoiceId('n_1', [])).toBe('c_n_1_1')
    expect(f.nextChoiceId('n_1', ['c_n_1_1'])).toBe('c_n_1_2')
  })

  it('nextEncounterId returns unique encounter id', () => {
    const ctx = collectIdContext({}, { enc_1: { id: 'enc_1' } } as never, {}, {})
    const f = createIdFactory(ctx)
    expect(f.nextEncounterId()).toBe('enc_enc_1')
    expect(f.nextEncounterId('boss')).toBe('enc_boss_1')
  })

  it('nextItemId and nextEnemyId return unique ids', () => {
    const ctx = collectIdContext({}, {}, { item_1: { id: 'item_1' } } as never, { enemy_1: { id: 'enemy_1' } } as never)
    const f = createIdFactory(ctx)
    expect(f.nextItemId()).toBe('item_item_1')
    expect(f.nextEnemyId()).toBe('enemy_enemy_1')
  })
})
