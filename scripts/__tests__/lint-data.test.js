import { describe, it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = path.resolve(__dirname, '..', '..')
const nodeBin = process.execPath
const lintDataPath = path.join(projectRoot, 'scripts', 'lint-data.js')

function runLintData(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(nodeBin, [lintDataPath, ...args], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += d.toString() })
    child.stderr?.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code, signal) => {
      resolve({ code: code ?? undefined, signal, stdout, stderr })
    })
    child.on('error', reject)
  })
}

describe('lint-data CLI', () => {
  it('exits 0 when no errors (current project data)', async () => {
    const result = await runLintData([])
    expect(result.code).toBe(0)
  })

  it('--format=json outputs valid JSON with success, errorCount, warningCount', async () => {
    const result = await runLintData(['--format=json'])
    expect(result.code).toBe(0)
    const data = JSON.parse(result.stdout)
    expect(data).toHaveProperty('success')
    expect(data).toHaveProperty('errorCount')
    expect(data).toHaveProperty('warningCount')
    expect(data).toHaveProperty('errors')
    expect(data).toHaveProperty('warnings')
    expect(Array.isArray(data.errors)).toBe(true)
    expect(Array.isArray(data.warnings)).toBe(true)
    expect(typeof data.success).toBe('boolean')
    expect(typeof data.errorCount).toBe('number')
    expect(typeof data.warningCount).toBe('number')
  })

  it('--strict treats warnings as errors in exit code', async () => {
    const result = await runLintData(['--format=json', '--strict'])
    const data = JSON.parse(result.stdout)
    if (data.warningCount > 0) {
      expect(result.code).toBe(1)
    }
  })
})
