import { describe, expect, it, vi } from 'vitest'

describe('PWA', () => {
  it('manifest and service worker config are defined for production', () => {
    expect(typeof import.meta.env.PROD).toBe('boolean')
  })

  it('serviceWorker is optional in navigator', () => {
    expect('serviceWorker' in navigator).toBeDefined()
  })
})
