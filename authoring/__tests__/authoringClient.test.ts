import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadFromApi, validateOnApi, saveToApi, saveDraftToApi, loadDraftFromApi } from '../api/authoringClient'

describe('authoringClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loadFromApi returns parsed load response when ok', async () => {
    const mockRes = { ok: true, json: async () => ({ nodes: {}, items: {}, enemies: {}, encounters: {}, errors: [], warnings: [] }) }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockRes)
    const data = await loadFromApi()
    expect(data).toHaveProperty('nodes')
    expect(data).toHaveProperty('errors')
    expect(data).toHaveProperty('warnings')
  })

  it('loadFromApi throws when not ok', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, text: async () => 'Server error' })
    await expect(loadFromApi()).rejects.toThrow()
  })

  it('validateOnApi sends POST with model and returns errors/warnings', async () => {
    const mockRes = { ok: true, json: async () => ({ errors: [], warnings: [] }) }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockRes)
    const res = await validateOnApi({ nodes: {}, items: {}, enemies: {}, encounters: {} })
    expect(res).toHaveProperty('errors')
    expect(res).toHaveProperty('warnings')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/authoring/validate', expect.objectContaining({ method: 'POST' }))
  })

  it('saveDraftToApi sends POST and returns metadata', async () => {
    const mockRes = { ok: true, json: async () => ({ success: true, path: 'x', savedAt: new Date().toISOString() }) }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockRes)
    const res = await saveDraftToApi({ nodes: {}, items: {}, enemies: {}, encounters: {} })
    expect(res).toHaveProperty('success', true)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/authoring/save-draft', expect.objectContaining({ method: 'POST' }))
  })

  it('loadDraftFromApi fetches draft payload', async () => {
    const mockRes = { ok: true, json: async () => ({ exists: true, savedAt: new Date().toISOString(), model: { nodes: {}, items: {}, enemies: {}, encounters: {} } }) }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockRes)
    const res = await loadDraftFromApi()
    expect(res).toHaveProperty('exists', true)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/authoring/load-draft')
  })
})
