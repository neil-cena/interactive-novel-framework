<script setup lang="ts">
import { computed, ref } from 'vue'
import { CHARACTER_SHEET_PRESETS, POINT_BUY_CONFIG } from '../../data/characterSheets'
import {
  buildCustomSheetPayload,
  computePointBuySpend,
  validatePointBuy,
} from '../../engine/characterSheetBuilder'
import type { CharacterSheetPayload } from '../../types/characterSheet'
import type { PlayerAttributes } from '../../types/player'

const props = defineProps<{
  slotId: string
}>()

const emit = defineEmits<{
  confirm: [slotId: string, payload: CharacterSheetPayload]
  cancel: []
}>()

const mode = ref<'preset' | 'custom'>('preset')
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

function confirmChoice(): void {
  if (mode.value === 'preset') {
    emit('confirm', props.slotId, { type: 'preset', presetId: selectedPresetId.value })
  } else {
    if (!canConfirmCustom.value) return
    emit('confirm', props.slotId, buildCustomSheetPayload(customAttributes.value, customHp.value))
  }
}

function adjustAttr(attr: keyof PlayerAttributes, delta: number): void {
  const next = customAttributes.value[attr] + delta
  customAttributes.value = {
    ...customAttributes.value,
    [attr]: Math.max(POINT_BUY_CONFIG.attributeMin, Math.min(POINT_BUY_CONFIG.attributeMax, next)),
  }
}

function adjustHp(delta: number): void {
  customHp.value = Math.max(
    POINT_BUY_CONFIG.hpMin,
    Math.min(POINT_BUY_CONFIG.hpMax, customHp.value + delta),
  )
}
</script>

<template>
  <div
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
          @click="emit('cancel')"
        >
          Cancel
        </button>
      </div>
      <div class="flex border-b border-slate-700">
        <button
          type="button"
          class="flex-1 px-4 py-3 text-sm font-medium"
          :class="mode === 'preset' ? 'border-b-2 border-sky-500 bg-slate-800/50 text-sky-200' : 'text-slate-400 hover:text-slate-200'"
          @click="mode = 'preset'"
        >
          Presets
        </button>
        <button
          type="button"
          class="flex-1 px-4 py-3 text-sm font-medium"
          :class="mode === 'custom' ? 'border-b-2 border-sky-500 bg-slate-800/50 text-sky-200' : 'text-slate-400 hover:text-slate-200'"
          @click="mode = 'custom'"
        >
          Custom
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <template v-if="mode === 'preset'">
          <ul class="space-y-3">
            <li
              v-for="preset in CHARACTER_SHEET_PRESETS"
              :key="preset.id"
              class="cursor-pointer rounded-lg border transition"
              :class="selectedPresetId === preset.id ? 'border-sky-500 bg-slate-800' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'"
              @click="selectedPresetId = preset.id"
            >
              <div class="p-3">
                <p class="font-medium text-slate-100">{{ preset.name }}{{ preset.class ? ` (${preset.class})` : '' }}</p>
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
                @click="adjustHp(-1)"
              >
                −
              </button>
              <span class="min-w-[2rem] text-center font-medium text-slate-100">{{ customHp }}</span>
              <button
                type="button"
                class="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                :disabled="customHp >= POINT_BUY_CONFIG.hpMax"
                @click="adjustHp(1)"
              >
                +
              </button>
            </div>
          </div>
          <div class="space-y-3">
            <div v-for="attr in (['strength', 'dexterity', 'intelligence'] as const)" :key="attr" class="flex items-center justify-between rounded border border-slate-700 bg-slate-800/40 p-3">
              <span class="text-sm font-medium capitalize text-slate-300">{{ attr }}</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded border border-slate-600 bg-slate-700 px-2.5 py-1 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                  :disabled="customAttributes[attr] <= POINT_BUY_CONFIG.attributeMin"
                  @click="adjustAttr(attr, -1)"
                >
                  −
                </button>
                <span class="min-w-[1.5rem] text-center text-slate-100">{{ customAttributes[attr] }}</span>
                <button
                  type="button"
                  class="rounded border border-slate-600 bg-slate-700 px-2.5 py-1 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                  :disabled="customAttributes[attr] >= POINT_BUY_CONFIG.attributeMax"
                  @click="adjustAttr(attr, 1)"
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
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded border border-sky-600 bg-sky-800 px-3 py-2 text-sm text-sky-100 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="mode === 'custom' && !canConfirmCustom"
          @click="confirmChoice"
        >
          Start game
        </button>
      </div>
    </div>
  </div>
</template>
