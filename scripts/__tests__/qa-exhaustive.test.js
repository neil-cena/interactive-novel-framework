import { describe, it, expect } from 'vitest'
import { runStructuralQa } from '@data-core/qa-exhaustive.js'
import { getStructuralEdges, getStructuralTransitions } from '@data-core/graph.js'
import { formatQaReportMarkdown } from '@data-core/qa-report-md.js'

function minimalModel(overrides = {}) {
  return {
    nodes: {},
    items: {},
    enemies: {},
    encounters: {},
    ...overrides,
  }
}

describe('getStructuralTransitions / getStructuralEdges skill_check XOR', () => {
  it('failure uses encounter edge when onFailureEncounterId is set (not failure nextNodeId)', () => {
    const nodes = {
      a: {
        id: 'a',
        type: 'narrative',
        text: 't',
        choices: [
          {
            id: 'c1',
            label: 'roll',
            mechanic: {
              type: 'skill_check',
              dice: '1d20',
              dc: 10,
              onSuccess: { nextNodeId: 'succ' },
              onFailure: { nextNodeId: 'fail_node' },
              onFailureEncounterId: 'enc_f',
            },
          },
        ],
      },
    }
    const edges = getStructuralEdges(nodes, {})
    const fromA = edges.filter((e) => e.from === 'node:a')
    const targets = fromA.map((e) => e.to)
    expect(targets).toContain('node:succ')
    expect(targets).toContain('enc:enc_f')
    expect(targets).not.toContain('node:fail_node')

    const trs = getStructuralTransitions(nodes, {})
    const failTr = trs.find((t) => t.to === 'enc:enc_f')
    expect(failTr?.mechanicBranch).toBe('onFailureEncounter')
    expect(failTr?.choiceId).toBe('c1')
  })

  it('keeps two transitions when two choices share the same target (disambiguated by choice id)', () => {
    const nodes = {
      hub: {
        id: 'hub',
        type: 'narrative',
        text: 'hub',
        choices: [
          { id: 'c_a', label: 'A way', mechanic: { type: 'navigate', nextNodeId: 'x' } },
          { id: 'c_b', label: 'B way', mechanic: { type: 'navigate', nextNodeId: 'x' } },
        ],
      },
      x: { id: 'x', type: 'ending', text: 'x', choices: [] },
    }
    const trs = getStructuralTransitions(nodes, {})
    const fromHub = trs.filter((t) => t.from === 'node:hub' && t.to === 'node:x')
    expect(fromHub).toHaveLength(2)
    expect(new Set(fromHub.map((t) => t.choiceId))).toEqual(new Set(['c_a', 'c_b']))
  })

  it('labels encounter resolution transitions', () => {
    const encounters = {
      boss: {
        id: 'boss',
        name: 'Boss',
        type: 'combat',
        enemies: [{ enemyId: 'g', count: 1 }],
        resolution: { onVictory: { nextNodeId: 'win' }, onDefeat: { nextNodeId: 'lose' } },
      },
    }
    const nodes = {
      win: { id: 'win', type: 'ending', text: 'w', choices: [] },
      lose: { id: 'lose', type: 'ending', text: 'l', choices: [] },
    }
    const trs = getStructuralTransitions(nodes, encounters)
    const vic = trs.find((t) => t.resolutionBranch === 'onVictory')
    expect(vic?.choiceLabel).toMatch(/victory/i)
    expect(vic?.edgeKind).toBe('encounter_resolution')
  })
})

describe('runStructuralQa exhaustive enumeration', () => {
  it('completes acyclic path from n_start to ending (one ending_leaf)', () => {
    const { nodes, items, enemies, encounters } = minimalModel({
      nodes: {
        n_start: {
          id: 'n_start',
          type: 'narrative',
          text: 's',
          choices: [{ id: 'go', label: 'go', mechanic: { type: 'navigate', nextNodeId: 'n_end' } }],
        },
        n_end: { id: 'n_end', type: 'ending', text: 'e', choices: [] },
      },
    })
    const r = runStructuralQa(nodes, items, enemies, encounters, {
      maxTraversalSteps: 10_000,
      maxWallMs: 5000,
    })
    expect(r.abortReason).toBe('complete')
    expect(r.blocker).toBeNull()
    expect(r.countsByKind.ending_leaf).toBe(1)
    expect(r.exploration.hasStructuralDefects).toBe(false)
    expect(r.exploration.enumerationFinished).toBe(true)
    expect(r.pathEvents).toHaveLength(0)
    expect(r.exploration.storedPathEventCount).toBe(0)
  })

  it('records stack_cycle but continues enumeration until all branches done; run completes', () => {
    const { nodes, items, enemies, encounters } = minimalModel({
      nodes: {
        n_start: {
          id: 'n_start',
          type: 'narrative',
          text: 's',
          choices: [{ id: 'go', label: 'Enter loop', mechanic: { type: 'navigate', nextNodeId: 'loop_a' } }],
        },
        loop_a: {
          id: 'loop_a',
          type: 'narrative',
          text: 'a',
          choices: [{ id: 'x', label: 'To B', mechanic: { type: 'navigate', nextNodeId: 'loop_b' } }],
        },
        loop_b: {
          id: 'loop_b',
          type: 'narrative',
          text: 'b',
          choices: [{ id: 'y', label: 'Back to A', mechanic: { type: 'navigate', nextNodeId: 'loop_a' } }],
        },
      },
    })
    const r = runStructuralQa(nodes, items, enemies, encounters)
    expect(r.abortReason).toBe('complete')
    expect(r.countsByKind.stack_cycle).toBeGreaterThanOrEqual(1)
    expect(r.exploration.hasStructuralDefects).toBe(true)
    expect(r.pathEvents.some((e) => e.terminalKind === 'stack_cycle')).toBe(true)
  })

  it('counts two ending_leaf paths from a diamond', () => {
    const { nodes, items, enemies, encounters } = minimalModel({
      nodes: {
        n_start: {
          id: 'n_start',
          type: 'narrative',
          text: 's',
          choices: [
            { id: 'l', label: 'left', mechanic: { type: 'navigate', nextNodeId: 'left' } },
            { id: 'r', label: 'right', mechanic: { type: 'navigate', nextNodeId: 'right' } },
          ],
        },
        left: {
          id: 'left',
          type: 'narrative',
          text: 'L',
          choices: [{ id: 'e', label: 'end', mechanic: { type: 'navigate', nextNodeId: 'end_l' } }],
        },
        right: {
          id: 'right',
          type: 'narrative',
          text: 'R',
          choices: [{ id: 'e2', label: 'end2', mechanic: { type: 'navigate', nextNodeId: 'end_r' } }],
        },
        end_l: { id: 'end_l', type: 'ending', text: 'el', choices: [] },
        end_r: { id: 'end_r', type: 'ending', text: 'er', choices: [] },
      },
    })
    const r = runStructuralQa(nodes, items, enemies, encounters)
    expect(r.abortReason).toBe('complete')
    expect(r.countsByKind.ending_leaf).toBe(2)
    expect(r.exploration.hasStructuralDefects).toBe(false)
    expect(r.pathEvents).toHaveLength(0)
  })

  it('reports encounter_sink as a terminal event without aborting whole run', () => {
    const { nodes, items, enemies, encounters } = minimalModel({
      nodes: {
        n_start: {
          id: 'n_start',
          type: 'narrative',
          text: 's',
          choices: [{ id: 'fight', label: 'Fight', mechanic: { type: 'combat_init', encounterId: 'e1' } }],
        },
      },
      enemies: {
        goblin: { id: 'goblin', name: 'Goblin', hp: 5, ac: 10 },
      },
      encounters: {
        e1: { id: 'e1', name: 'x', type: 'combat', enemies: [{ enemyId: 'goblin', count: 1 }] },
      },
    })
    const r = runStructuralQa(nodes, items, enemies, encounters)
    expect(r.abortReason).toBe('complete')
    expect(r.countsByKind.encounter_sink).toBe(1)
    expect(r.exploration.hasStructuralDefects).toBe(true)
    expect(r.pathEvents[0].terminalKind).toBe('encounter_sink')
    expect(r.pathEvents[0].traceSteps[0].transition.choiceId).toBe('fight')
  })

  it('records branchingTruncations when hub exceeds maxBranchingPerVertex', () => {
    const choices = []
    for (let i = 0; i < 5; i += 1) {
      choices.push({
        id: `c_${i}`,
        label: `Opt ${i}`,
        mechanic: { type: 'navigate', nextNodeId: `e_${i}` },
      })
    }
    const nodes = {
      n_start: {
        id: 'n_start',
        type: 'narrative',
        text: 'start',
        choices: [{ id: 'to_hub', label: 'hub', mechanic: { type: 'navigate', nextNodeId: 'hub' } }],
      },
      hub: { id: 'hub', type: 'narrative', text: 'hub', choices },
      ...Object.fromEntries(
        [0, 1, 2, 3, 4].map((i) => [`e_${i}`, { id: `e_${i}`, type: 'ending', text: 'e', choices: [] }]),
      ),
    }
    const { items, enemies, encounters } = minimalModel({ nodes })
    const r = runStructuralQa(nodes, items, enemies, encounters, { maxBranchingPerVertex: 2 })
    expect(r.traversal.branchingTruncations?.length).toBeGreaterThanOrEqual(1)
    const t = r.traversal.branchingTruncations[0]
    expect(t.available).toBe(5)
    expect(t.explored).toBe(2)
    expect(r.abortReason).toBe('complete')
    expect(r.countsByKind.ending_leaf).toBe(2)
    expect(r.pathEvents).toHaveLength(0)
  })

  it('hits resource_limit when step budget is tiny', () => {
    const { nodes, items, enemies, encounters } = minimalModel({
      nodes: {
        n_start: {
          id: 'n_start',
          type: 'narrative',
          text: 's',
          choices: [{ id: 'go', label: 'go', mechanic: { type: 'navigate', nextNodeId: 'n_end' } }],
        },
        n_end: { id: 'n_end', type: 'ending', text: 'e', choices: [] },
      },
    })
    const r = runStructuralQa(nodes, items, enemies, encounters, { maxTraversalSteps: 1 })
    expect(r.abortReason).toBe('resource_limit')
    expect(r.resourceLimit?.kind).toBe('max_traversal_steps')
    expect(r.exploration.enumerationFinished).toBe(false)
    expect(r.pathEvents).toHaveLength(0)
  })

  it('does not assign example.id when defect sample storage is disabled (cap 0)', () => {
    const { nodes, items, enemies, encounters } = minimalModel({
      nodes: {
        n_start: {
          id: 'n_start',
          type: 'narrative',
          text: 's',
          choices: [{ id: 'go', label: 'Enter loop', mechanic: { type: 'navigate', nextNodeId: 'loop_a' } }],
        },
        loop_a: {
          id: 'loop_a',
          type: 'narrative',
          text: 'a',
          choices: [{ id: 'x', label: 'To B', mechanic: { type: 'navigate', nextNodeId: 'loop_b' } }],
        },
        loop_b: {
          id: 'loop_b',
          type: 'narrative',
          text: 'b',
          choices: [{ id: 'y', label: 'Back to A', mechanic: { type: 'navigate', nextNodeId: 'loop_a' } }],
        },
      },
    })
    const r = runStructuralQa(nodes, items, enemies, encounters, { maxStoredPathEvents: 0 })
    expect(r.pathEvents).toHaveLength(0)
    expect(r.exploration.pathEventsTruncated).toBe(true)
    const row = r.uniqueIssueSummaries.find((x) => x.terminalKind === 'stack_cycle')
    expect(row).toBeTruthy()
    expect(Object.prototype.hasOwnProperty.call(row.example, 'id')).toBe(false)
  })
})

describe('formatQaReportMarkdown', () => {
  it('uses exhaustive-report title and terminal counts', () => {
    const md = formatQaReportMarkdown(
      {
        abortReason: 'complete',
        validateErrors: [],
        validateWarnings: [],
        graphDiagnostics: [],
        orphans: [],
        deadEnds: [],
        brokenEdges: [],
        traversal: { steps: 40, startedFrom: ['n_start'], completedStarts: 1, branchingTruncations: [] },
        countsByKind: {
          ending_leaf: 2,
          stack_cycle: 0,
          structural_dead_end: 0,
          encounter_sink: 0,
        },
        pathEvents: [],
        exploration: {
          enumerationFinished: true,
          stoppedBy: null,
          totalTerminalEventsObserved: 2,
          storedPathEventCount: 0,
          pathEventsTruncated: false,
          hasStructuralDefects: false,
          partialDueToBranchingCap: false,
        },
        uniqueIssueSummaries: [],
        blocker: null,
        resourceLimit: null,
      },
      { nodes: {} },
    )
    expect(md).toContain('# Structural quality report')
    expect(md).toContain('Stored defect path samples')
    expect(md).toContain('Terminal counts')
    expect(md).toContain('Ending reached')
    expect(md).toContain('## Issues found — explained')
    expect(md).toContain('No defects on enumerated paths')
  })

  it('renders deduped issues and appendix for stack_cycle samples', () => {
    const md = formatQaReportMarkdown(
      {
        abortReason: 'complete',
        validateErrors: [],
        validateWarnings: [],
        graphDiagnostics: [],
        orphans: [],
        deadEnds: [],
        brokenEdges: [],
        traversal: { steps: 10, startedFrom: ['n_start'], completedStarts: 1, branchingTruncations: [] },
        countsByKind: { ending_leaf: 0, stack_cycle: 1, structural_dead_end: 0, encounter_sink: 0 },
        pathEvents: [
          {
            id: 0,
            terminalKind: 'stack_cycle',
            startId: 'n_start',
            atVertex: 'node:loop_a',
            traceSteps: [
              {
                fromVertex: 'node:n_start',
                toVertex: 'node:loop_a',
                transition: { choiceLabel: 'go', choiceId: 'c1', mechanicType: 'navigate' },
              },
            ],
            vertexPath: ['node:n_start', 'node:loop_a'],
            issueWhere: { summary: 'Loop.' },
          },
        ],
        exploration: {
          enumerationFinished: true,
          totalTerminalEventsObserved: 1,
          storedPathEventCount: 1,
          pathEventsTruncated: false,
          hasStructuralDefects: true,
          partialDueToBranchingCap: false,
        },
        uniqueIssueSummaries: [
          { terminalKind: 'stack_cycle', atVertex: 'node:loop_a', count: 1, example: {} },
        ],
        blocker: null,
        resourceLimit: null,
      },
      { nodes: {} },
    )
    expect(md).toContain('Deduped structural issues')
    expect(md).toContain('## Issues found — explained')
    expect(md).toContain('Stack loops')
    expect(md).toContain('Where it shows up (deduped)')
    expect(md).toContain('Sample defective paths')
    expect(md).toContain('stack_cycle')
  })
})
