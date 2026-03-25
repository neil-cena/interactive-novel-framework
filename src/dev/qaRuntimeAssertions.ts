/**
 * Dev-only QA hooks for the main game (no Node / no data-core). Extend from stores or router as needed.
 */

export function installQaDevAssertions(): void {
  if (!import.meta.env.DEV) return
}

export function logQaDevAssertion(kind: string, detail: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return
  console.warn(`[qa-dev] ${kind}`, detail)
}
