/**
 * BRT (Phase 2 /auto-debug): After the crane branch hazard report, players who already
 * met Elara must not be offered a visible path back into the first-time intro (`meet_elara`)
 * from the purifier basement entrance nodes.
 *
 * Asserts expected visibility + routing from graph data (black-box vs. engine internals).
 */
import { describe, it, expect } from 'vitest'
import { STORY_NODES } from '../nodes'
import { isChoiceVisible } from '../../engine/visibilityResolver'
import type { PlayerState } from '../../types/player'

const PURIFIER_ENTRANCE_NODE_IDS = ['purifier_entrance_open', 'purifier_entrance_force'] as const

const stateAlreadyMetElara: Pick<PlayerState, 'flags' | 'inventory' | 'vitals' | 'worldState'> = {
  flags: { elara_met: true },
  inventory: { currency: 0, items: {} },
  vitals: { hpCurrent: 10, hpMax: 10 },
  worldState: {
    vaelEnergy: 50,
    communityCost: 0,
    stateChaos: 0,
    districtStability: 0,
  },
}

describe('BRT: purifier entrance routing when elara_met (crane / report loop)', () => {
  it('does not expose navigate:meet_elara as a visible choice once Elara is already met', () => {
    for (const nodeId of PURIFIER_ENTRANCE_NODE_IDS) {
      const node = STORY_NODES[nodeId]
      expect(node, `story node ${nodeId} must exist`).toBeDefined()

      const choices = node.choices ?? []
      const visible = choices.filter((c) => isChoiceVisible(c.visibilityRequirements, stateAlreadyMetElara))

      expect(
        visible.length,
        `${nodeId}: player with elara_met must still have at least one visible choice (return visit path)`,
      ).toBeGreaterThan(0)

      const visibleNavToFirstIntro = visible.some(
        (c) => c.mechanic.type === 'navigate' && c.mechanic.nextNodeId === 'meet_elara',
      )
      expect(
        visibleNavToFirstIntro,
        `${nodeId}: when elara_met is true, no visible choice should route to meet_elara (first intro replay)`,
      ).toBe(false)
    }
  })
})
