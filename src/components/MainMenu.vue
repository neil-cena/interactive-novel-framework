<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AuthPanel from './AuthPanel.vue'
import OutcomeStatsPanel from './OutcomeStatsPanel.vue'
import StoryLibrary from './StoryLibrary.vue'
import TelemetryDashboard from './TelemetryDashboard.vue'
import { useAudio } from '../composables/useAudio'
import { GAME_CONFIG } from '../config'
import { useAuthStore } from '../stores/authStore'
import { CHARACTER_SHEET_PRESETS, POINT_BUY_CONFIG } from '../data/characterSheets'
import {
  buildCustomSheetPayload,
  computePointBuySpend,
  validatePointBuy,
} from '../engine/characterSheetBuilder'
import type { SaveConflict, SaveSyncState } from '../types/cloud'
import type { CharacterSheetPayload } from '../types/characterSheet'
import type { PlayerState } from '../types/player'
import type { PlayerAttributes } from '../types/player'
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
  startGame: [slotId: SaveSlotId, savedState: PlayerState | null, sheetPayload?: CharacterSheetPayload]
}>()

const slots = ref<SaveSlotMeta[]>([])
const confirmingDeleteSlot = ref<SaveSlotId | null>(null)

/** When set, show character sheet picker for this slot (new game). */
const sheetPickerSlotId = ref<SaveSlotId | null>(null)
/** 'preset' | 'custom' */
const sheetPickerMode = ref<'preset' | 'custom'>('preset')
const selectedPresetId = ref<string>(CHARACTER_SHEET_PRESETS[0]?.id ?? '')
const customAttributes = ref<PlayerAttributes>({
  strength: POINT_BUY_CONFIG.attributeStart,
  dexterity: POINT_BUY_CONFIG.attributeStart,
  intelligence: POINT_BUY_CONFIG.attributeStart,
})
const customHp = ref(POINT_BUY_CONFIG.hpMin)

const pointBuySpend = computed(() =>
  computePointBuySpend(customAttributes.value, customHp.value, POINT_BUY_CONFIG),
)
const pointBuyValidation = computed(() =>
  validatePointBuy(customAttributes.value, customHp.value, POINT_BUY_CONFIG),
)
const canConfirmCustom = computed(() => pointBuyValidation.value.valid)

function refreshSlots(): void {
  slots.value = getAllSaves().map((slot) => ({
    ...slot,
    sync: getSlotSyncState(slot.slotId),
  }))
}

function handleStart(slotId: SaveSlotId, savedState: PlayerState | null, sheetPayload?: CharacterSheetPayload): void {
  emit('startGame', slotId, savedState, sheetPayload)
}

function openSheetPicker(slotId: SaveSlotId): void {
  sheetPickerSlotId.value = slotId
  sheetPickerMode.value = 'preset'
  selectedPresetId.value = CHARACTER_SHEET_PRESETS[0]?.id ?? ''
  customAttributes.value = {
    strength: POINT_BUY_CONFIG.attributeStart,
    dexterity: POINT_BUY_CONFIG.attributeStart,
    intelligence: POINT_BUY_CONFIG.attributeStart,
  }
  customHp.value = POINT_BUY_CONFIG.hpMin
}

function closeSheetPicker(): void {
  sheetPickerSlotId.value = null
}

function confirmSheetChoice(): void {
  const slotId = sheetPickerSlotId.value
  if (!slotId) return
  if (sheetPickerMode.value === 'preset') {
    handleStart(slotId, null, { type: 'preset', presetId: selectedPresetId.value })
  } else {
    if (!canConfirmCustom.value) return
    handleStart(slotId, null, buildCustomSheetPayload(customAttributes.value, customHp.value))
  }
  closeSheetPicker()
}

function adjustCustomAttr(attr: keyof PlayerAttributes, delta: number): void {
  const next = customAttributes.value[attr] + delta
  customAttributes.value = {
    ...customAttributes.value,
    [attr]: Math.max(POINT_BUY_CONFIG.attributeMin, Math.min(POINT_BUY_CONFIG.attributeMax, next)),
  }
}

function adjustCustomHp(delta: number): void {
  customHp.value = Math.max(
    POINT_BUY_CONFIG.hpMin,
    Math.min(POINT_BUY_CONFIG.hpMax, customHp.value + delta),
  )
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
          class="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
          @click="syncNow"
        >
          Sync now
        </button>
      </div>
    </header>

    <AuthPanel v-if="GAME_CONFIG.features.cloudSave" />
    <OutcomeStatsPanel v-if="GAME_CONFIG.features.sharedOutcomes" />
    <TelemetryDashboard v-if="GAME_CONFIG.features.sharedOutcomes" />
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
            <button type="button" class="rounded border border-amber-700 bg-amber-900/40 px-3 py-1.5 text-sm hover:bg-amber-900/70" @click="resolveConflict(slot.sync.conflict, 'use_local')">Use local</button>
            <button type="button" class="rounded border border-amber-700 bg-amber-900/40 px-3 py-1.5 text-sm hover:bg-amber-900/70" @click="resolveConflict(slot.sync.conflict, 'use_cloud')">Use cloud</button>
            <button type="button" class="rounded border border-amber-700 bg-amber-900/40 px-3 py-1.5 text-sm hover:bg-amber-900/70" @click="resolveConflict(slot.sync.conflict, 'keep_both')">Keep both</button>
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
            v-if="slot.data"
            type="button"
            class="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            :aria-label="`Continue from slot ${index + 1}`"
            @click="handleStart(slot.slotId, slot.data)"
          >
            Continue
          </button>
          <button
            v-else
            type="button"
            class="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            :aria-label="`Start new game in slot ${index + 1}`"
            @click="openSheetPicker(slot.slotId)"
          >
            New Game
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

    <!-- Character sheet picker (new game) -->
    <div
      v-if="sheetPickerSlotId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-picker-title"
    >
      <div class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
        <div class="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 id="sheet-picker-title" class="text-lg font-semibold text-slate-100">Choose your character</h2>
          <button
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
            aria-label="Cancel"
            @click="closeSheetPicker"
          >
            Cancel
          </button>
        </div>
        <div class="flex border-b border-slate-700">
          <button
            type="button"
            class="flex-1 px-4 py-3 text-sm font-medium"
            :class="sheetPickerMode === 'preset' ? 'border-b-2 border-sky-500 bg-slate-800/50 text-sky-200' : 'text-slate-400 hover:text-slate-200'"
            @click="sheetPickerMode = 'preset'"
          >
            Presets
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-3 text-sm font-medium"
            :class="sheetPickerMode === 'custom' ? 'border-b-2 border-sky-500 bg-slate-800/50 text-sky-200' : 'text-slate-400 hover:text-slate-200'"
            @click="sheetPickerMode = 'custom'"
          >
            Custom
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <template v-if="sheetPickerMode === 'preset'">
            <ul class="space-y-3">
              <li
                v-for="preset in CHARACTER_SHEET_PRESETS"
                :key="preset.id"
                class="rounded-lg border cursor-pointer transition"
                :class="selectedPresetId === preset.id ? 'border-sky-500 bg-slate-800' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'"
                @click="selectedPresetId = preset.id"
              >
                <div class="p-3">
                  <p class="font-medium text-slate-100">{{ preset.name }}</p>
                  <p class="mt-1 text-xs text-slate-400">{{ preset.description }}</p>
                  <p class="mt-2 text-xs text-slate-500">
                    {{ preset.startingHp }} HP · STR {{ preset.startingAttributes.strength }} DEX {{ preset.startingAttributes.dexterity }} INT {{ preset.startingAttributes.intelligence }}
                  </p>
                </div>
              </li>
            </ul>
          </template>
          <template v-else>
            <p class="mb-3 text-sm text-slate-400">Spend points on HP and attributes. Budget: {{ POINT_BUY_CONFIG.budget }}.</p>
            <div class="mb-4 rounded border border-slate-700 bg-slate-800/40 p-3">
              <p class="text-sm font-medium text-slate-300">Points remaining: {{ pointBuySpend.remaining }}</p>
              <p class="mt-1 text-xs text-slate-500">HP cost: {{ pointBuySpend.hpSpend }} · Attributes: {{ pointBuySpend.attributeSpend }}</p>
            </div>
            <div class="mb-4">
              <label class="mb-2 block text-sm font-medium text-slate-300">HP ({{ POINT_BUY_CONFIG.hpMin }}–{{ POINT_BUY_CONFIG.hpMax }})</label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                  :disabled="customHp <= POINT_BUY_CONFIG.hpMin"
                  @click="adjustCustomHp(-1)"
                >
                  −
                </button>
                <span class="min-w-[2rem] text-center font-medium text-slate-100">{{ customHp }}</span>
                <button
                  type="button"
                  class="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                  :disabled="customHp >= POINT_BUY_CONFIG.hpMax"
                  @click="adjustCustomHp(1)"
                >
                  +
                </button>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="attr in ['strength', 'dexterity', 'intelligence']" :key="attr" class="flex items-center justify-between rounded border border-slate-700 bg-slate-800/40 p-3">
                <span class="text-sm font-medium capitalize text-slate-300">{{ attr }}</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded border border-slate-600 bg-slate-700 px-2.5 py-1 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                    :disabled="customAttributes[attr] <= POINT_BUY_CONFIG.attributeMin"
                    @click="adjustCustomAttr(attr as keyof PlayerAttributes, -1)"
                  >
                    −
                  </button>
                  <span class="min-w-[1.5rem] text-center text-slate-100">{{ customAttributes[attr] }}</span>
                  <button
                    type="button"
                    class="rounded border border-slate-600 bg-slate-700 px-2.5 py-1 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                    :disabled="customAttributes[attr] >= POINT_BUY_CONFIG.attributeMax"
                    @click="adjustCustomAttr(attr as keyof PlayerAttributes, 1)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <ul v-if="pointBuyValidation.errors.length" class="mt-3 space-y-1 text-sm text-amber-400">
              <li v-for="(err, i) in pointBuyValidation.errors" :key="i">{{ err }}</li>
            </ul>
          </template>
        </div>
        <div class="flex justify-end gap-2 border-t border-slate-700 p-4">
          <button
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            @click="closeSheetPicker"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded border border-sky-600 bg-sky-800 px-3 py-2 text-sm text-sky-100 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="sheetPickerMode === 'custom' && !canConfirmCustom"
            @click="confirmSheetChoice"
          >
            Start game
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
