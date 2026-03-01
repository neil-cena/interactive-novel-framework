import { defineStore } from 'pinia'

const AUDIO_PREFS_KEY = 'game_audio_prefs'

export interface AudioPreferences {
  muted: boolean
  masterVolume: number
  musicVolume: number
  sfxVolume: number
}

const defaults: AudioPreferences = {
  muted: false,
  masterVolume: 1,
  musicVolume: 0.8,
  sfxVolume: 1,
}

function loadPrefs(): AudioPreferences {
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<AudioPreferences>
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : defaults.muted,
      masterVolume: clamp(parsed.masterVolume ?? defaults.masterVolume, 0, 1),
      musicVolume: clamp(parsed.musicVolume ?? defaults.musicVolume, 0, 1),
      sfxVolume: clamp(parsed.sfxVolume ?? defaults.sfxVolume, 0, 1),
    }
  } catch {
    return { ...defaults }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function savePrefs(prefs: AudioPreferences): void {
  try {
    localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.warn('[audio] failed to persist preferences', e)
  }
}

export const useAudioStore = defineStore('audio', {
  state: (): AudioPreferences & { unlocked: boolean } => ({
    ...loadPrefs(),
    unlocked: false,
  }),

  getters: {
    effectiveMusicVolume(state): number {
      if (state.muted) return 0
      return state.masterVolume * state.musicVolume
    },
    effectiveSfxVolume(state): number {
      if (state.muted) return 0
      return state.masterVolume * state.sfxVolume
    },
  },

  actions: {
    setMuted(muted: boolean) {
      this.muted = muted
      savePrefs({
        muted: this.muted,
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
      })
    },
    setMasterVolume(v: number) {
      this.masterVolume = clamp(v, 0, 1)
      savePrefs({
        muted: this.muted,
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
      })
    },
    setMusicVolume(v: number) {
      this.musicVolume = clamp(v, 0, 1)
      savePrefs({
        muted: this.muted,
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
      })
    },
    setSfxVolume(v: number) {
      this.sfxVolume = clamp(v, 0, 1)
      savePrefs({
        muted: this.muted,
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
      })
    },
    unlock() {
      this.unlocked = true
    },
  },
})
