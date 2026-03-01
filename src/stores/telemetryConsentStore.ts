import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'telemetry_consent'

export type TelemetryConsent = 'accepted' | 'declined' | null

function readStored(): TelemetryConsent {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'accepted' || v === 'declined') return v
  } catch {
    // ignore
  }
  return null
}

export const useTelemetryConsentStore = defineStore('telemetryConsent', () => {
  const consent = ref<TelemetryConsent>(readStored())

  function setConsent(accepted: boolean): void {
    const value: TelemetryConsent = accepted ? 'accepted' : 'declined'
    consent.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // ignore
    }
  }

  function hasConsent(): boolean | null {
    const c = consent.value
    if (c === 'accepted') return true
    if (c === 'declined') return false
    return null
  }

  function resetConsent(): void {
    consent.value = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return { consent, setConsent, hasConsent, resetConsent }
})
