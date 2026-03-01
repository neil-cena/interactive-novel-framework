import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAudioStore } from '../audioStore'

describe('audioStore', () => {
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

  it('has default muted false and volumes in 0-1', () => {
    const store = useAudioStore()
    expect(store.muted).toBe(false)
    expect(store.masterVolume).toBeGreaterThanOrEqual(0)
    expect(store.masterVolume).toBeLessThanOrEqual(1)
    expect(store.musicVolume).toBeGreaterThanOrEqual(0)
    expect(store.sfxVolume).toBeGreaterThanOrEqual(0)
  })

  it('setMuted updates state and persists', () => {
    const store = useAudioStore()
    store.setMuted(true)
    expect(store.muted).toBe(true)
    expect(localStorage.setItem).toHaveBeenCalledWith('game_audio_prefs', expect.any(String))
    const payload = JSON.parse((localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1])
    expect(payload.muted).toBe(true)
  })

  it('effectiveMusicVolume is 0 when muted', () => {
    const store = useAudioStore()
    store.masterVolume = 0.8
    store.musicVolume = 0.5
    expect(store.effectiveMusicVolume).toBe(0.4)
    store.setMuted(true)
    expect(store.effectiveMusicVolume).toBe(0)
  })

  it('setMasterVolume clamps to 0-1 and persists', () => {
    const store = useAudioStore()
    store.setMasterVolume(0.5)
    expect(store.masterVolume).toBe(0.5)
    store.setMasterVolume(1.5)
    expect(store.masterVolume).toBe(1)
    store.setMasterVolume(-0.1)
    expect(store.masterVolume).toBe(0)
    expect(localStorage.setItem).toHaveBeenCalled()
  })

  it('setMusicVolume and setSfxVolume update and persist', () => {
    const store = useAudioStore()
    store.setMusicVolume(0.6)
    expect(store.musicVolume).toBe(0.6)
    store.setSfxVolume(0.9)
    expect(store.sfxVolume).toBe(0.9)
    expect(localStorage.setItem).toHaveBeenCalled()
  })
})
