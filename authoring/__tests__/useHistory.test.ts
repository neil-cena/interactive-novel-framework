import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useHistory } from '../composables/useHistory'

describe('useHistory', () => {
  it('undo restores previous state', () => {
    const model = ref({
      nodes: { n_1: { id: 'n_1', type: 'narrative', text: 'A' } },
      items: {},
      enemies: {},
      encounters: {},
    })
    const { push, undo, canUndo } = useHistory(model)
    expect(canUndo.value).toBe(false)
    push(model.value)
    model.value = {
      nodes: { n_1: { id: 'n_1', type: 'narrative', text: 'B' } },
      items: {},
      enemies: {},
      encounters: {},
    }
    const prev = undo()
    expect(prev).not.toBeNull()
    expect(prev?.nodes.n_1.text).toBe('A')
    if (prev) model.value = prev
    expect(model.value.nodes.n_1.text).toBe('A')
  })

  it('redo restores future state', () => {
    const model = ref({
      nodes: {},
      items: {},
      enemies: {},
      encounters: {},
    })
    const { push, undo, redo, canRedo } = useHistory(model)
    push(model.value)
    model.value = { nodes: { n_1: { id: 'n_1', text: 'X' } }, items: {}, enemies: {}, encounters: {} }
    undo()
    expect(canRedo.value).toBe(true)
    const next = redo()
    expect(next?.nodes.n_1?.text).toBe('X')
    if (next) model.value = next
    expect(model.value.nodes.n_1.text).toBe('X')
  })

  it('clear empties history', () => {
    const model = ref({ nodes: {}, items: {}, enemies: {}, encounters: {} })
    const { push, clear, undo } = useHistory(model)
    push(model.value)
    clear()
    expect(undo()).toBeNull()
  })
})
