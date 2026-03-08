import { describe, it, expect } from 'vitest'
import { validateData } from '@data-core/validate.js'

/**
 * BRT (narrative graph integrity): flow mechanics that declare an exit node must
 * reference a real node ID — same class of invariant as navigate/skill_check DATA002.
 * Currently validateData does not inspect theater_begin/feral_parliament exitNodeId,
 * so this test fails until that reference check exists.
 */
describe('story graph integrity — validateData exit targets', () => {
  it('emits DATA002 when theater_begin exitNodeId points at a non-existent node', () => {
    const nodes = {
      n_hub: {
        id: 'n_hub',
        type: 'narrative',
        text: 'hub',
        choices: [
          {
            id: 'c_enter_theater',
            mechanic: { type: 'theater_begin', exitNodeId: 'n_missing_exit' },
          },
        ],
      },
    }
    const items = {}
    const enemies = {}
    const encounters = {}

    const { errors } = validateData(nodes, items, enemies, encounters)

    const exitTargetErrors = errors.filter(
      (e) =>
        e.code === 'DATA002' &&
        e.severity === 'error' &&
        e.context?.nodeId === 'n_hub' &&
        e.context?.choiceId === 'c_enter_theater' &&
        e.context?.ref === 'n_missing_exit' &&
        e.context?.refType === 'node',
    )

    expect(exitTargetErrors.length).toBeGreaterThan(0)
  })
})
