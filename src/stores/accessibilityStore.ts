import { defineStore } from 'pinia'

const PREFS_KEY = 'game_accessibility_prefs'

export interface AccessibilityPreferences {
  highContrast: boolean
}

const defaults: AccessibilityPreferences = {
  highContrast: false,
}

function loadPrefs(): AccessibilityPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>
    return {
      highContrast: typeof parsed.highContrast === 'boolean' ? parsed.highContrast : defaults.highContrast,
    }
  } catch {
    return { ...defaults }
  }
}

function savePrefs(prefs: AccessibilityPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.warn('[accessibility] failed to persist preferences', e)
  }
}

export const useAccessibilityStore = defineStore('accessibility', {
  state: (): AccessibilityPreferences => loadPrefs(),

  getters: {
    /** Whether to apply high-contrast styling (user toggle). */
    isHighContrast(state): boolean {
      return state.highContrast
    },
  },

  actions: {
    setHighContrast(value: boolean) {
      this.highContrast = value
      savePrefs({ highContrast: this.highContrast })
    },
    toggleHighContrast() {
      this.setHighContrast(!this.highContrast)
    },
  },
})
