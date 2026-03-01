import { Howl } from 'howler'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useAudioStore } from '../stores/audioStore'

/** SFX event keys for playSfx() */
export type SfxKey =
  | 'dice_roll'
  | 'hit'
  | 'miss'
  | 'victory'
  | 'defeat'
  | 'ui_click'

/** Music track keys for playMusic() */
export type MusicKey = 'menu' | 'narrative' | 'combat'

const SFX_PATHS: Record<SfxKey, string> = {
  dice_roll: '/audio/sfx/dice_roll.mp3',
  hit: '/audio/sfx/hit.mp3',
  miss: '/audio/sfx/miss.mp3',
  victory: '/audio/sfx/victory.mp3',
  defeat: '/audio/sfx/defeat.mp3',
  ui_click: '/audio/sfx/ui_click.mp3',
}

const MUSIC_PATHS: Record<MusicKey, string> = {
  menu: '/audio/music/menu.mp3',
  narrative: '/audio/music/narrative.mp3',
  combat: '/audio/music/combat.mp3',
}

const sfxCache = new Map<SfxKey, Howl>()
const musicCache = new Map<MusicKey, Howl>()
let currentMusic: Howl | null = null
let currentMusicKey: MusicKey | null = null

function getSfx(key: SfxKey, volume: number): Howl | null {
  let howl = sfxCache.get(key)
  if (howl) {
    howl.volume(volume)
    return howl
  }
  const path = SFX_PATHS[key]
  try {
    howl = new Howl({
      src: [path],
      volume,
      onloaderror: () => {
        console.warn('[audio] SFX failed to load:', key, path)
      },
    })
    sfxCache.set(key, howl)
    return howl
  } catch (e) {
    console.warn('[audio] SFX create failed:', key, e)
    return null
  }
}

function getMusic(key: MusicKey, volume: number): Howl | null {
  let howl = musicCache.get(key)
  if (howl) {
    howl.volume(volume)
    return howl
  }
  const path = MUSIC_PATHS[key]
  try {
    howl = new Howl({
      src: [path],
      volume,
      html5: true,
      onloaderror: () => {
        console.warn('[audio] Music failed to load:', key, path)
      },
    })
    musicCache.set(key, howl)
    return howl
  } catch (e) {
    console.warn('[audio] Music create failed:', key, e)
    return null
  }
}

export function useAudio() {
  const store = useAudioStore()
  const { effectiveSfxVolume, effectiveMusicVolume, unlocked } = storeToRefs(store)

  const effectiveSfx = computed(() => effectiveSfxVolume.value)
  const effectiveMusic = computed(() => effectiveMusicVolume.value)

  function playSfx(eventKey: SfxKey): void {
    if (!unlocked.value) return
    const vol = effectiveSfx.value
    if (vol <= 0) return
    const howl = getSfx(eventKey, vol)
    if (howl) {
      howl.volume(vol)
      howl.play()
    }
  }

  function playMusic(
    trackKey: MusicKey,
    options: { loop?: boolean; fadeMs?: number } = {},
  ): void {
    if (!unlocked.value) return
    const { loop = true, fadeMs = 0 } = options
    const vol = effectiveMusic.value
    if (currentMusicKey === trackKey && currentMusic) {
      currentMusic.volume(vol)
      if (!currentMusic.playing()) currentMusic.play()
      return
    }
    stopMusic({ fadeMs })
    const howl = getMusic(trackKey, vol)
    if (howl) {
      howl.loop(loop)
      if (fadeMs > 0) {
        howl.volume(0)
        howl.play()
        howl.fade(0, vol, fadeMs / 1000)
      } else {
        howl.volume(vol)
        howl.play()
      }
      currentMusic = howl
      currentMusicKey = trackKey
    }
  }

  function stopMusic(options: { fadeMs?: number } = {}): void {
    const { fadeMs = 0 } = options
    if (!currentMusic) {
      currentMusicKey = null
      return
    }
    const vol = currentMusic.volume()
    if (fadeMs > 0 && vol > 0) {
      currentMusic.fade(vol, 0, fadeMs / 1000)
      setTimeout(() => {
        currentMusic?.stop()
        currentMusic = null
        currentMusicKey = null
      }, fadeMs)
    } else {
      currentMusic.stop()
      currentMusic = null
      currentMusicKey = null
    }
  }

  watch(effectiveMusic, (v) => {
    if (currentMusic) currentMusic.volume(v)
  })

  watch(effectiveSfx, () => {
    sfxCache.forEach((h) => h.volume(effectiveSfx.value))
  })

  return {
    playSfx,
    playMusic,
    stopMusic,
    setMuted: store.setMuted.bind(store),
    setMasterVolume: store.setMasterVolume.bind(store),
    setMusicVolume: store.setMusicVolume.bind(store),
    setSfxVolume: store.setSfxVolume.bind(store),
    unlock: store.unlock.bind(store),
    muted: computed(() => store.muted),
    masterVolume: computed(() => store.masterVolume),
    musicVolume: computed(() => store.musicVolume),
    sfxVolume: computed(() => store.sfxVolume),
    unlocked,
  }
}
