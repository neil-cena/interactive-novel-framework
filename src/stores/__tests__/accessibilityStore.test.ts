import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAccessibilityStore } from '../accessibilityStore'

describe('accessibilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('has default highContrast false', () => {
    const store = useAccessibilityStore()
    expect(store.highContrast).toBe(false)
    expect(store.isHighContrast).toBe(false)
  })

  it('setHighContrast updates state and persists', () => {
    const store = useAccessibilityStore()
    store.setHighContrast(true)
    expect(store.highContrast).toBe(true)
    expect(store.isHighContrast).toBe(true)
    expect(localStorage.setItem).toHaveBeenCalledWith('game_accessibility_prefs', expect.any(String))
    const payload = JSON.parse((localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1])
    expect(payload.highContrast).toBe(true)
  })

  it('toggleHighContrast flips highContrast', () => {
    const store = useAccessibilityStore()
    expect(store.highContrast).toBe(false)
    store.toggleHighContrast()
    expect(store.highContrast).toBe(true)
    store.toggleHighContrast()
    expect(store.highContrast).toBe(false)
  })
})
