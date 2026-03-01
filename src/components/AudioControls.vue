<script setup lang="ts">
import { useAudio } from '../composables/useAudio'
import { storeToRefs } from 'pinia'
import { useAudioStore } from '../stores/audioStore'

const {
  setMuted,
  setMasterVolume,
  setMusicVolume,
  setSfxVolume,
  unlock,
} = useAudio()

const store = useAudioStore()
const { muted, masterVolume, musicVolume, sfxVolume } = storeToRefs(store)

function handleInteraction(): void {
  unlock()
}
</script>

<template>
  <div
    class="flex items-center gap-3 rounded border border-slate-600 bg-slate-800/80 px-3 py-2"
    role="group"
    aria-label="Audio controls"
  >
    <button
      type="button"
      class="rounded p-1.5 text-slate-200 transition hover:bg-slate-700 hover:text-slate-50"
      :aria-label="muted ? 'Unmute' : 'Mute'"
      @click="handleInteraction(); setMuted(!muted)"
    >
      <span v-if="muted" aria-hidden="true">🔇</span>
      <span v-else aria-hidden="true">🔊</span>
    </button>
    <div class="flex flex-col gap-1 text-xs text-slate-300">
      <label class="flex items-center gap-2">
        <span class="w-10">Master</span>
        <input
          :value="masterVolume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          class="h-2 w-20 accent-slate-400"
          aria-label="Master volume"
          @input="handleInteraction(); setMasterVolume(+(($event.target as HTMLInputElement).value))"
        />
      </label>
      <label class="flex items-center gap-2">
        <span class="w-10">Music</span>
        <input
          :value="musicVolume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          class="h-2 w-20 accent-slate-400"
          aria-label="Music volume"
          @input="handleInteraction(); setMusicVolume(+(($event.target as HTMLInputElement).value))"
        />
      </label>
      <label class="flex items-center gap-2">
        <span class="w-10">SFX</span>
        <input
          :value="sfxVolume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          class="h-2 w-20 accent-slate-400"
          aria-label="Sound effects volume"
          @input="handleInteraction(); setSfxVolume(+(($event.target as HTMLInputElement).value))"
        />
      </label>
    </div>
  </div>
</template>
