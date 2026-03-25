<script setup lang="ts">
import type { MaybeRef } from 'vue'
import { computed, nextTick, ref, unref, watch } from 'vue'
import { GAME_CONFIG } from '../config'
import { usePlayerStore } from '../stores/playerStore'

const props = defineProps<{
  returnFocusTo?: MaybeRef<HTMLElement | null | undefined>
}>()

const emit = defineEmits<{ close: [] }>()
const playerStore = usePlayerStore()
const panelRef = ref<HTMLElement | null>(null)

function closeAndReturnFocus() {
  const el = unref(props.returnFocusTo)
  emit('close')
  nextTick(() => el?.focus({ preventScroll: true }))
}

watch(
  () => panelRef.value,
  (el) => {
    if (!el) return
    nextTick(() => {
      const focusable = el.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus({ preventScroll: true })
    })
  },
  { immediate: true },
)

const hasUnspentPoints = computed(() => playerStore.progression.unspentAttributePoints > 0)

function spendPoint(attr: 'strength' | 'dexterity' | 'intelligence') {
  playerStore.spendAttributePoint(attr)
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    role="dialog"
    aria-modal="true"
    aria-labelledby="progression-title"
    @click.self="closeAndReturnFocus"
  >
    <div
      ref="panelRef"
      class="flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl sm:p-6"
    >
      <div class="flex items-center justify-between">
        <h2 id="progression-title" class="text-lg font-bold text-slate-50">Level & Attributes</h2>
        <button
          type="button"
          class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
          aria-label="Close progression panel"
          @click="closeAndReturnFocus"
        >
          Close
        </button>
      </div>

      <section class="mt-4">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Level</h3>
        <p class="mt-1 text-sm text-slate-200">
          Level {{ playerStore.progression.level }} · XP {{ playerStore.progression.xp }} / {{ playerStore.progression.xpToNextLevel }}
        </p>
      </section>

      <section class="mt-4">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Attributes</h3>
        <p class="mt-1 text-sm text-slate-300">
          STR {{ playerStore.attributes.strength }} · DEX {{ playerStore.attributes.dexterity }} · INT {{ playerStore.attributes.intelligence }}
        </p>
      </section>

      <section class="mt-4">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Skills (DnD)</h3>
        <p class="mt-1 text-xs text-slate-500">Proficiency bonus: +{{ GAME_CONFIG.skills.proficiencyBonus }}</p>
        <ul class="mt-2 space-y-1 text-sm text-slate-300">
          <li
            v-for="skill in GAME_CONFIG.skills.list"
            :key="skill.id"
            class="flex items-center gap-2"
          >
            <span v-if="playerStore.skillsProficiency[skill.id]" class="text-amber-400" aria-hidden="true">✓</span>
            <span v-else class="w-4" aria-hidden="true" />
            <span>{{ skill.name }}</span>
            <span class="text-xs text-slate-500">({{ skill.ability.slice(0, 3).toUpperCase() }})</span>
          </li>
        </ul>
      </section>

      <section v-if="hasUnspentPoints" class="mt-4">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Unspent attribute points ({{ playerStore.progression.unspentAttributePoints }})
        </h3>
        <p class="mt-1 text-xs text-slate-400">Spend points to increase an attribute.</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded border border-amber-700 bg-amber-900/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/70"
            aria-label="Spend 1 point on strength"
            @click="spendPoint('strength')"
          >
            +1 STR ({{ playerStore.attributes.strength }})
          </button>
          <button
            type="button"
            class="rounded border border-amber-700 bg-amber-900/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/70"
            aria-label="Spend 1 point on dexterity"
            @click="spendPoint('dexterity')"
          >
            +1 DEX ({{ playerStore.attributes.dexterity }})
          </button>
          <button
            type="button"
            class="rounded border border-amber-700 bg-amber-900/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/70"
            aria-label="Spend 1 point on intelligence"
            @click="spendPoint('intelligence')"
          >
            +1 INT ({{ playerStore.attributes.intelligence }})
          </button>
        </div>
      </section>
      <p v-else class="mt-4 text-sm text-slate-500">No unspent attribute points.</p>
    </div>
  </div>
</template>
