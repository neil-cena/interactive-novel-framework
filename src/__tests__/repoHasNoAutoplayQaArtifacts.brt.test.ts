import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Black-box BRT: passes only after repo cleanup (docs, root JSON dumps, orchestration files).
 * Fails on the current tree while Autoplay QA artifacts remain at project root or in qa-layers doc.
 */

const __filename = fileURLToPath(import.meta.url)
const projectRoot = join(dirname(__filename), '..', '..')

const QA_LAYERS_PATH = join(projectRoot, 'docs', 'qa-layers.md')

const QA_LAYERS_FORBIDDEN_SUBSTRINGS = [
  'Autoplay QA',
  'qaAutoplay',
  'AutoplayQaPanel',
  'useQaAutoplay',
  'QA_AUTOPLAY',
  'qaAutoplayStoryGraphAudit',
  'src/types/qaAutoplay.ts',
  'qa-autoplay-',
  'qa-unique-paths-',
] as const

function collectQaLayersForbiddenMatches(content: string): string[] {
  const found: string[] = []
  for (const s of QA_LAYERS_FORBIDDEN_SUBSTRINGS) {
    if (content.includes(s)) {
      found.push(s)
    }
  }
  return found
}

function rootJsonArtifactBasenames(): string[] {
  const names = readdirSync(projectRoot)
  return names.filter(
    (name) =>
      /^qa-autoplay-.*\.json$/u.test(name) || /^qa-unique-paths-.*\.json$/u.test(name),
  )
}

describe('repo has no Autoplay QA artifacts at root or in docs/qa-layers.md (BRT)', () => {
  it('docs/qa-layers.md must exist and must not contain forbidden Autoplay QA substrings', () => {
    expect(
      existsSync(QA_LAYERS_PATH),
      `expected ${QA_LAYERS_PATH} to exist`,
    ).toBe(true)

    const text = readFileSync(QA_LAYERS_PATH, 'utf8')
    const matches = collectQaLayersForbiddenMatches(text)

    expect(
      matches,
      matches.length > 0
        ? `docs/qa-layers.md contains forbidden substring(s): ${matches.map((m) => JSON.stringify(m)).join(', ')}`
        : undefined,
    ).toEqual([])
  })

  it('project root must not contain qa-autoplay-*.json or qa-unique-paths-*.json', () => {
    const bad = rootJsonArtifactBasenames().sort()
    expect(
      bad,
      bad.length > 0
        ? `Remove JSON artifacts from project root: ${bad.join(', ')}`
        : undefined,
    ).toEqual([])
  })

  it('build_plan.md must not exist at project root', () => {
    const p = join(projectRoot, 'build_plan.md')
    expect(existsSync(p), `remove ${p} (or move out of repo root)`).toBe(false)
  })

  it('workflow_state.md must not exist at project root', () => {
    const p = join(projectRoot, 'workflow_state.md')
    expect(existsSync(p), `remove ${p} (or move out of repo root)`).toBe(false)
  })
})
