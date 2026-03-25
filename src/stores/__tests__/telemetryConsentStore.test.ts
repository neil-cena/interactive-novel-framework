import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTelemetryConsentStore } from '../telemetryConsentStore'

const STORAGE_KEY = 'telemetry_consent'

function makeStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v) },
    removeItem: (k: string) => { data.delete(k) },
  }
}

describe('telemetryConsentStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStorage())
    setActivePinia(createPinia())
  })

  it('hasConsent returns null when not set', () => {
    const store = useTelemetryConsentStore()
    expect(store.hasConsent()).toBeNull()
    expect(store.consent).toBeNull()
  })

  it('setConsent(true) sets accepted and persists', () => {
    const store = useTelemetryConsentStore()
    store.setConsent(true)
    expect(store.hasConsent()).toBe(true)
    expect(store.consent).toBe('accepted')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('accepted')
  })

  it('setConsent(false) sets declined and persists', () => {
    const store = useTelemetryConsentStore()
    store.setConsent(false)
    expect(store.hasConsent()).toBe(false)
    expect(store.consent).toBe('declined')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('declined')
  })

  it('resetConsent clears state and storage', () => {
    const store = useTelemetryConsentStore()
    store.setConsent(true)
    store.resetConsent()
    expect(store.hasConsent()).toBeNull()
    expect(store.consent).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('reads initial state from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    const store = useTelemetryConsentStore()
    expect(store.hasConsent()).toBe(true)
  })
})
