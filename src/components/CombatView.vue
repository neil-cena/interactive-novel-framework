<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { COMBAT_ENCOUNTERS } from '../data/encounters'
import { ITEM_DICTIONARY } from '../data/items'
import { useCombat } from '../composables/useCombat'
import { usePlayerStore } from '../stores/playerStore'

const props = defineProps<{
  encounterId: string
}>()

const emit = defineEmits<{
  resolved: [outcome: 'victory' | 'defeat']
}>()

const playerStore = usePlayerStore()
const { turn, enemies, roundCount, log, isResolved, initCombat, playerAttack, enemyTurn } = useCombat()
const isResolving = ref(false)

const playerAc = computed(() => {
  const weaponId = playerStore.equipment.mainHand
  const acBonus = weaponId ? ITEM_DICTIONARY[weaponId]?.acBonus ?? 0 : 0
  return 10 + acBonus
})

const playerAttackBonus = computed(() => {
  const weaponId = playerStore.equipment.mainHand
  return weaponId ? ITEM_DICTIONARY[weaponId]?.attackBonus ?? 0 : 0
})

function initializeCombat(): void {
  const encounter = COMBAT_ENCOUNTERS[props.encounterId]
  if (!encounter) {
    return
  }

  initCombat(encounter)
  isResolving.value = false
}

function resolveIfFinished(): void {
  if (isResolving.value) {
    return
  }

  if (playerStore.vitals.hpCurrent <= 0) {
    isResolving.value = true
    emit('resolved', 'defeat')
    return
  }

  if (isResolved.value === 'victory') {
    isResolving.value = true
    emit('resolved', 'victory')
  }
}

function handlePlayerAttack(index: number): void {
  if (turn.value !== 'player') {
    return
  }

  playerAttack(index, playerStore.equipment.mainHand, playerAttackBonus.value)
  resolveIfFinished()
  if (isResolving.value) {
    return
  }

  window.setTimeout(() => {
    enemyTurn(playerAc.value, (damage) => playerStore.adjustHp(-damage))
    resolveIfFinished()
  }, 300)
}

watch(
  () => props.encounterId,
  () => initializeCombat(),
  { immediate: true },
)
</script>

<template>
  <section class="rounded-lg border border-red-700 bg-slate-900 p-6">
    <h2 class="text-xl font-semibold text-red-300">Combat</h2>
    <p class="mt-2 text-sm text-slate-200">Round {{ roundCount }}</p>
    <p class="text-sm text-slate-200">Your HP: {{ playerStore.vitals.hpCurrent }}</p>

    <div class="mt-4 space-y-3">
      <button
        v-for="(enemy, index) in enemies"
        :key="enemy.id"
        :disabled="enemy.hpCurrent <= 0 || turn !== 'player'"
        class="block w-full rounded border border-slate-600 px-3 py-2 text-left transition enabled:hover:bg-slate-800 disabled:opacity-60"
        @click="handlePlayerAttack(index)"
      >
        {{ enemy.name }} - HP {{ enemy.hpCurrent }}
      </button>
    </div>

    <div class="mt-4 rounded border border-slate-700 bg-slate-950 p-3">
      <p class="mb-2 text-sm font-semibold text-slate-300">Combat Log</p>
      <ul class="space-y-1 text-sm text-slate-200">
        <li v-for="(entry, idx) in log" :key="idx">{{ entry }}</li>
      </ul>
    </div>
  </section>
</template>
