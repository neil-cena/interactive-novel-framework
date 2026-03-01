import { describe, expect, it } from 'vitest'
import { isValidPackageManifest, sanitizeModelTextFields } from '../data-core/package-schema.js'
import { validateAssets } from '../data-core/package-io.js'

describe('story package schema', () => {
  it('validates required manifest fields', () => {
    expect(isValidPackageManifest({
      storyId: 'default',
      version: 'v1',
      title: 'Test Story',
      author: 'tester',
    })).toBe(true)
    expect(isValidPackageManifest({ storyId: 'x' })).toBe(false)
  })

  it('sanitizes script payloads from model text fields', () => {
    const model = {
      nodes: {
        n1: {
          id: 'n1',
          type: 'narrative',
          text: '<script>alert(1)</script>Hello',
          choices: [{ id: 'c1', label: 'Go <script>bad()</script>' }],
        },
      },
      items: {},
      enemies: {},
      encounters: {},
    }
    const sanitized = sanitizeModelTextFields(model)
    expect(sanitized.nodes.n1.text).toContain('Hello')
    expect(sanitized.nodes.n1.text).not.toContain('<script>')
    expect(sanitized.nodes.n1.choices[0].label).not.toContain('<script>')
  })
})

describe('story package asset checks', () => {
  it('accepts known signatures and rejects unknown', () => {
    // PNG signature bytes
    const png = Buffer.from('89504e470d0a1a0a0000000d', 'hex').toString('base64')
    const bad = Buffer.from('00112233445566778899aabb', 'hex').toString('base64')
    const diagnostics = validateAssets([
      { name: 'ok.png', base64: png },
      { name: 'bad.bin', base64: bad },
    ])
    expect(diagnostics.some((d) => d.code === 'asset_signature')).toBe(true)
    expect(diagnostics.some((d) => d.message?.includes('ok.png'))).toBe(false)
  })
})
