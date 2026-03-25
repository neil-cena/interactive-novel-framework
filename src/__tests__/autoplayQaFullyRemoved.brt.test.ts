import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Black-box BRT: passes only when Autoplay QA has been fully removed from `src/`
 * and `App.vue` no longer references it. Fails while the feature remains.
 */

const __filename = fileURLToPath(import.meta.url)
const projectRoot = join(dirname(__filename), '..', '..')
const srcRoot = join(projectRoot, 'src')
const appVuePath = join(srcRoot, 'App.vue')

const APP_VUE_FORBIDDEN_SUBSTRINGS = [
  'useQaAutoplay',
  'QA_AUTOPLAY_KEY',
  'AutoplayQaPanel',
  'qaAutoplayInject',
] as const

function collectFilesRecursive(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) {
      collectFilesRecursive(full, acc)
    } else if (ent.isFile()) {
      acc.push(full)
    }
  }
  return acc
}

function matchesAutoplayQaRemovalViolations(filePath: string): string[] {
  const reasons: string[] = []
  const relFromSrc = relative(srcRoot, filePath).replace(/\\/g, '/')
  const base = basename(filePath)

  if (/^qaAutoplay.*\.ts$/u.test(base)) {
    reasons.push('matches **/qaAutoplay*.ts')
  }
  if (base === 'useQaAutoplay.ts') {
    reasons.push('matches **/useQaAutoplay.ts')
  }
  if (/^AutoplayQa.*\.vue$/u.test(base)) {
    reasons.push('matches **/AutoplayQa*.vue')
  }
  if (base === 'qaPlaythroughSignature.ts') {
    reasons.push('matches **/qaPlaythroughSignature.ts')
  }
  if (/^qaAutoplay.*\.test\.ts$/u.test(base)) {
    reasons.push('matches **/qaAutoplay*.test.ts')
  }
  if (/^AutoplayQa.*\.test\.ts$/u.test(base)) {
    reasons.push('matches **/AutoplayQa*.test.ts')
  }
  if (base === 'qaPlaythroughSignature.test.ts') {
    reasons.push('matches **/qaPlaythroughSignature.test.ts')
  }
  if (relFromSrc === 'types/qaAutoplay.ts') {
    reasons.push('forbidden path src/types/qaAutoplay.ts')
  }

  return reasons
}

describe('Autoplay QA fully removed (BRT)', () => {
  it('App.vue must not reference Autoplay QA and src/ must contain no Autoplay QA artifacts', () => {
    expect(existsSync(srcRoot), `expected ${srcRoot} to exist`).toBe(true)
    expect(existsSync(appVuePath), `expected ${appVuePath} to exist`).toBe(true)

    const appSource = readFileSync(appVuePath, 'utf8')
    const appViolations: string[] = []
    for (const s of APP_VUE_FORBIDDEN_SUBSTRINGS) {
      if (appSource.includes(s)) {
        appViolations.push(`App.vue contains forbidden substring: ${s}`)
      }
    }

    const allFiles = collectFilesRecursive(srcRoot)
    const fileViolations: string[] = []
    for (const fp of allFiles) {
      const reasons = matchesAutoplayQaRemovalViolations(fp)
      if (reasons.length > 0) {
        const rel = relative(projectRoot, fp).replace(/\\/g, '/')
        fileViolations.push(`${rel}: ${reasons.join('; ')}`)
      }
    }
    fileViolations.sort()

    expect(
      { appViolations, fileViolations },
      'Remove Autoplay QA from App.vue and delete matching files under src/ until this assertion passes.',
    ).toEqual({ appViolations: [], fileViolations: [] })
  })
})
