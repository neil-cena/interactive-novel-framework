/**
 * Placeholder for bounded dynamic / stateful simulation (non-exhaustive by design).
 * Safe to call from orchestrator when wired; does not spawn subprocesses or shells.
 */

/**
 * @returns {{ disclaimer: string, stepsUsed: number, outcome: 'pass' }}
 */
export function runBoundedDynamicQaStub() {
  return {
    disclaimer:
      'Dynamic/stateful QA is not implemented — this stub exists so the orchestrator can reserve a stage without shell execution.',
    stepsUsed: 0,
    outcome: 'pass',
  }
}
