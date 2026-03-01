<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAudio } from '../composables/useAudio'
import { GAME_CONFIG } from '../config'
import type { PlayerState } from '../types/player'
import { deleteSave, getAllSaves, type SaveSlotId } from '../utils/storage'

const { unlock, playMusic } = useAudio()
function unlockAndPlayMenuMusic(): void {
  unlock()
  playMusic('menu', { loop: true, fadeMs: 200 })
}

interface SaveSlotMeta {
  slotId: SaveSlotId
  data: PlayerState | null
}

const emit = defineEmits<{
  startGame: [slotId: SaveSlotId, savedState: PlayerState | null]
}>()

const slots = ref<SaveSlotMeta[]>([])
const confirmingDeleteSlot = ref<SaveSlotId | null>(null)

function refreshSlots(): void {
  slots.value = getAllSaves()
}

function handleStart(slotId: SaveSlotId, savedState: PlayerState | null): void {
  emit('startGame', slotId, savedState)
}

function requestDelete(slotId: SaveSlotId): void {
  confirmingDeleteSlot.value = slotId
}

function cancelDelete(): void {
  confirmingDeleteSlot.value = null
}

function confirmDelete(slotId: SaveSlotId): void {
  deleteSave(slotId)
  confirmingDeleteSlot.value = null
  refreshSlots()
}

onMounted(() => {
  refreshSlots()
})
</script>

<template>
  <main
    class="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-4"
    role="main"
    aria-label="Main menu"
    @click.once="unlockAndPlayMenuMusic"
  >
    <header class="rounded-lg border border-slate-700 bg-slate-900 p-6">
      <h1 class="text-3xl font-bold text-slate-50">{{ GAME_CONFIG.ui.gameTitle }}</h1>
      <p class="mt-2 text-sm text-slate-300">Choose one of three save slots.</p>
    </header>

    <section class="space-y-4">
      <article
        v-for="(slot, index) in slots"
        :key="slot.slotId"
        class="rounded-lg border border-slate-700 bg-slate-900/80 p-5"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-100">Slot {{ index + 1 }}</h2>
          <span class="text-xs uppercase tracking-wide text-slate-400">
            {{ slot.data ? 'Occupied' : 'Empty' }}
          </span>
        </div>

        <p v-if="slot.data" class="mt-3 text-sm text-slate-300">
          Continue from node <span class="font-semibold text-slate-100">{{ slot.data.metadata.currentNodeId }}</span>
          with
          <span class="font-semibold text-slate-100">{{ slot.data.vitals.hpCurrent }} / {{ slot.data.vitals.hpMax ?? slot.data.vitals.hpCurrent }} HP</span>.
        </p>
        <p v-else class="mt-3 text-sm text-slate-300">Start a new run in this slot.</p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            :aria-label="slot.data ? `Continue from slot ${index + 1}` : `Start new game in slot ${index + 1}`"
            @click="handleStart(slot.slotId, slot.data)"
          >
            {{ slot.data ? 'Continue' : 'New Game' }}
          </button>

          <template v-if="slot.data">
            <button
              v-if="confirmingDeleteSlot !== slot.slotId"
              type="button"
              class="rounded border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200 hover:bg-red-900/70"
              aria-label="Delete save slot"
              @click="requestDelete(slot.slotId)"
            >
              Delete
            </button>
            <button
              v-else
              type="button"
              class="rounded border border-red-700 bg-red-900 px-3 py-2 text-sm text-red-100 hover:bg-red-800"
              aria-label="Confirm delete save slot"
              @click="confirmDelete(slot.slotId)"
            >
              Confirm Delete
            </button>
            <button
              v-if="confirmingDeleteSlot === slot.slotId"
              type="button"
              class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
              aria-label="Cancel delete"
              @click="cancelDelete"
            >
              Cancel
            </button>
          </template>
        </div>
      </article>
    </section>
  </main>
</template>
