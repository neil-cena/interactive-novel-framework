/**
 * Ensures browser-safe data-core modules do not import Node built-ins (node:fs, node:path, process, etc).
 * Prevents accidental leakage of Node APIs into authoring bundle.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dataCoreDir = join(__dirname, '..', 'data-core')

const BROWSER_SAFE_MODULES = [
  'parse.js',
  'validate.js',
  'graph.js',
  'generate.js',
  'export-csv.js',
  'types.js',
]

const NODE_ONLY_PATTERNS = [
  /require\s*\(\s*['"]node:/,
  /from\s*['"]node:/,
  /\bprocess\./,
  /\b__dirname\b/,
  /\b__filename\b/,
  /\brequire\s*\(/,
]

describe('module-boundaries', () => {
  for (const file of BROWSER_SAFE_MODULES) {
    it(`${file} does not import Node built-ins`, () => {
      const filePath = join(dataCoreDir, file)
      const content = readFileSync(filePath, 'utf8')
      for (const pattern of NODE_ONLY_PATTERNS) {
        expect(content).not.toMatch(pattern)
      }
    })
  }
})
