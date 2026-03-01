<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AuthPanel from './AuthPanel.vue'
import OutcomeStatsPanel from './OutcomeStatsPanel.vue'
import StoryLibrary from './StoryLibrary.vue'
import { useAudio } from '../composables/useAudio'
import { GAME_CONFIG } from '../config'
import { useAuthStore } from '../stores/authStore'
import type { SaveConflict, SaveSyncState } from '../types/cloud'
import type { PlayerState } from '../types/player'
import { deleteSave, getAllSaves, getSlotSyncState, resolveSlotConflict, syncCloudSavesNow, type SaveSlotId } from '../utils/storage'

const { unlock, playMusic } = useAudio()
const authStore = useAuthStore()
function unlockAndPlayMenuMusic(): void {
  unlock()
  playMusic('menu', { loop: true, fadeMs: 200 })
}

interface SaveSlotMeta {
  slotId: SaveSlotId
  data: PlayerState | null
  sync: SaveSyncState
}

const emit = defineEmits<{
  startGame: [slotId: SaveSlotId, savedState: PlayerState | null]
}>()

const slots = ref<SaveSlotMeta[]>([])
const confirmingDeleteSlot = ref<SaveSlotId | null>(null)

function refreshSlots(): void {
  slots.value = getAllSaves().map((slot) => ({
    ...slot,
    sync: getSlotSyncState(slot.slotId),
  }))
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

async function confirmDelete(slotId: SaveSlotId): Promise<void> {
  await deleteSave(slotId)
  confirmingDeleteSlot.value = null
  refreshSlots()
}

async function syncNow(): Promise<void> {
  if (!GAME_CONFIG.features.cloudSave) return
  await syncCloudSavesNow()
  refreshSlots()
}

async function resolveConflict(conflict: SaveConflict, choice: 'use_local' | 'use_cloud' | 'keep_both'): Promise<void> {
  await resolveSlotConflict(conflict, choice)
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
      <div class="mt-4 flex items-center gap-3 text-xs text-slate-400">
        <span>Cloud Sync:</span>
        <span>{{ authStore.isAuthenticated ? 'Enabled' : 'Anonymous mode' }}</span>
        <button
          type="button"
          class="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
          @click="syncNow"
        >
          Sync now
        </button>
      </div>
    </header>

    <AuthPanel v-if="GAME_CONFIG.features.cloudSave" />
    <OutcomeStatsPanel v-if="GAME_CONFIG.features.sharedOutcomes" />
    <StoryLibrary v-if="GAME_CONFIG.features.storyPackages" />

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
        <p class="mt-2 text-xs text-slate-400">
          Sync status: {{ slot.sync.status }}
          <span v-if="slot.sync.updatedAt"> • {{ new Date(slot.sync.updatedAt).toLocaleTimeString() }}</span>
        </p>
        <div v-if="slot.sync.status === 'conflict' && slot.sync.conflict" class="mt-2 rounded border border-amber-700 bg-amber-900/30 p-2 text-xs text-amber-200">
          <p>Conflict detected for this slot.</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button type="button" class="rounded border border-amber-700 bg-amber-900/40 px-2 py-1 hover:bg-amber-900/70" @click="resolveConflict(slot.sync.conflict, 'use_local')">Use local</button>
            <button type="button" class="rounded border border-amber-700 bg-amber-900/40 px-2 py-1 hover:bg-amber-900/70" @click="resolveConflict(slot.sync.conflict, 'use_cloud')">Use cloud</button>
            <button type="button" class="rounded border border-amber-700 bg-amber-900/40 px-2 py-1 hover:bg-amber-900/70" @click="resolveConflict(slot.sync.conflict, 'keep_both')">Keep both</button>
          </div>
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
