<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useCombat } from '../composables/useCombat'
import { COMBAT_ENCOUNTERS } from '../data/encounters'
import { ITEM_DICTIONARY } from '../data/items'
import { GAME_CONFIG } from '../config'
import { resolveAction } from '../engine/actionResolver'
import { usePlayerStore } from '../stores/playerStore'

const props = defineProps<{
  encounterId: string
}>()

const emit = defineEmits<{
  resolved: [outcome: 'victory' | 'defeat']
  error: []
}>()

const playerStore = usePlayerStore()
const { playSfx } = useAudio()
const { turn, enemies, roundCount, log, turnOrder, isResolved, initCombat, playerAttack, playerAoeAttack, enemyTurn, useItem } = useCombat()
const isResolving = ref(false)
const encounterNotFound = ref(false)

const playerAc = computed(() => {
  const weaponId = playerStore.equipment.mainHand
  const acBonus = weaponId ? ITEM_DICTIONARY[weaponId]?.acBonus ?? 0 : 0
  return GAME_CONFIG.combat.baseAc + acBonus
})

const playerAttackBonus = computed(() => {
  const weaponId = playerStore.equipment.mainHand
  const weapon = weaponId ? ITEM_DICTIONARY[weaponId] : undefined
  const baseBonus = weapon?.attackBonus ?? 0
  const scalingAttr = weapon?.scalingAttribute ?? 'strength'
  return baseBonus + (playerStore.attributes[scalingAttr] ?? 0)
})

const weaponIsAoe = computed(() => {
  const weaponId = playerStore.equipment.mainHand
  return weaponId ? ITEM_DICTIONARY[weaponId]?.aoe === true : false
})

const usableConsumables = computed(() => {
  return Object.entries(playerStore.inventory.items)
    .map(([id, qty]) => {
      const item = ITEM_DICTIONARY[id]
      if (!item || item.type !== 'consumable' || !item.effect) return null
      return { id, name: item.name, qty }
    })
    .filter(Boolean) as { id: string; name: string; qty: number }[]
})

function initializeCombat(): void {
  encounterNotFound.value = false
  const encounter = COMBAT_ENCOUNTERS[props.encounterId]
  if (!encounter) {
    encounterNotFound.value = true
    emit('error')
    return
  }

  initCombat(
    encounter,
    playerStore.attributes.dexterity,
    playerStore.flags.has_surprise ?? false,
  )
  isResolving.value = false

  if (turn.value === 'enemy') {
    window.setTimeout(() => {
      enemyTurn(
        playerAc.value,
        (damage) => playerStore.adjustHp(-damage),
        (hit) => (hit ? playSfx('hit') : playSfx('miss')),
      )
      resolveIfFinished()
    }, GAME_CONFIG.combat.enemyTurnDelayMs)
  }
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

function handleUseItem(itemId: string): void {
  if (turn.value !== 'player') return
  useItem(itemId, (effect) => {
    const result = resolveAction(effect, playerStore)
    playerStore.removeItem(itemId, 1)
    return result
  })
  resolveIfFinished()
  if (isResolving.value) return
  window.setTimeout(() => {
    enemyTurn(
      playerAc.value,
      (damage) => playerStore.adjustHp(-damage),
      (hit) => (hit ? playSfx('hit') : playSfx('miss')),
    )
    resolveIfFinished()
  }, GAME_CONFIG.combat.enemyTurnDelayMs)
}

function handleAoeAttack(): void {
  if (turn.value !== 'player') return
  playerAoeAttack(
    playerStore.equipment.mainHand,
    playerAttackBonus.value,
    (hit) => (hit ? playSfx('hit') : playSfx('miss')),
  )
  resolveIfFinished()
  if (isResolving.value) return
  window.setTimeout(() => {
    enemyTurn(
      playerAc.value,
      (damage) => playerStore.adjustHp(-damage),
      (hit) => (hit ? playSfx('hit') : playSfx('miss')),
    )
    resolveIfFinished()
  }, GAME_CONFIG.combat.enemyTurnDelayMs)
}

function handlePlayerAttack(index: number): void {
  if (turn.value !== 'player') {
    return
  }

  playerAttack(
    index,
    playerStore.equipment.mainHand,
    playerAttackBonus.value,
    (hit) => (hit ? playSfx('hit') : playSfx('miss')),
  )
  resolveIfFinished()
  if (isResolving.value) {
    return
  }

  window.setTimeout(() => {
    enemyTurn(
      playerAc.value,
      (damage) => playerStore.adjustHp(-damage),
      (hit) => (hit ? playSfx('hit') : playSfx('miss')),
    )
    resolveIfFinished()
  }, GAME_CONFIG.combat.enemyTurnDelayMs)
}

watch(
  () => props.encounterId,
  () => initializeCombat(),
  { immediate: true },
)
</script>

<template>
  <section
    class="rounded-lg border border-red-700 bg-slate-900 p-4 sm:p-6"
    role="region"
    aria-labelledby="combat-heading"
  >
    <div
      v-if="encounterNotFound"
      class="rounded border border-red-700 bg-slate-900/90 p-6"
    >
      <p class="text-base font-medium text-red-300">Encounter not found</p>
      <p class="mt-1 text-sm text-slate-400">Encounter ID: {{ encounterId }}</p>
      <button
        type="button"
        class="mt-4 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
        aria-label="Return to main menu"
        @click="emit('error')"
      >
        Return to Main Menu
      </button>
    </div>
    <template v-else>
    <h2 id="combat-heading" class="text-xl font-semibold text-red-300">Combat</h2>
    <p class="mt-2 text-sm text-slate-200">Round {{ roundCount }}</p>
    <p class="text-sm text-slate-200">Your HP: {{ playerStore.vitals.hpCurrent }} / {{ playerStore.vitals.hpMax }}</p>

    <div v-if="turnOrder.length > 0" class="mt-3 flex flex-wrap gap-1">
      <span
        v-for="entry in turnOrder"
        :key="entry.id"
        class="rounded px-2 py-0.5 text-xs"
        :class="entry.isPlayer
          ? (turn === 'player' ? 'bg-sky-700 text-sky-100' : 'bg-sky-900/40 text-sky-300')
          : (turn === 'enemy' ? 'bg-red-700 text-red-100' : 'bg-red-900/40 text-red-300')"
      >
        {{ entry.name }} ({{ entry.initiative }})
      </span>
    </div>

    <div class="mt-4 space-y-3">
      <template v-if="weaponIsAoe">
        <div v-for="enemy in enemies" :key="enemy.id" class="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200">
          {{ enemy.name }} - HP {{ enemy.hpCurrent }}
        </div>
        <button
          type="button"
          :disabled="turn !== 'player'"
          class="block w-full rounded border border-orange-600 bg-orange-900/40 px-3 py-2 text-sm text-orange-200 transition enabled:hover:bg-orange-900/70 disabled:opacity-60"
          aria-label="Attack all enemies"
          @click="handleAoeAttack"
        >
          Attack All
        </button>
      </template>
      <template v-else>
        <button
          v-for="(enemy, index) in enemies"
          :key="enemy.id"
          type="button"
          :disabled="enemy.hpCurrent <= 0 || turn !== 'player'"
          class="block w-full rounded border border-slate-600 px-3 py-2 text-left transition enabled:hover:bg-slate-800 disabled:opacity-60"
          :aria-label="`Attack ${enemy.name}, HP ${enemy.hpCurrent}`"
          @click="handlePlayerAttack(index)"
        >
          {{ enemy.name }} - HP {{ enemy.hpCurrent }}
        </button>
      </template>
    </div>

    <div v-if="usableConsumables.length > 0" class="mt-4">
      <p class="mb-2 text-sm font-semibold text-slate-300">Items</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="consumable in usableConsumables"
          :key="consumable.id"
          type="button"
          :disabled="turn !== 'player'"
          class="rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm text-emerald-200 transition enabled:hover:bg-emerald-900/70 disabled:opacity-60"
          :aria-label="`Use ${consumable.name}, ${consumable.qty} left`"
          @click="handleUseItem(consumable.id)"
        >
          {{ consumable.name }} ({{ consumable.qty }})
        </button>
      </div>
    </div>

    <div class="mt-4 rounded border border-slate-700 bg-slate-950 p-3" role="log" aria-live="polite" aria-label="Combat log">
      <p class="mb-2 text-sm font-semibold text-slate-300">Combat Log</p>
      <ul class="max-h-48 space-y-1 overflow-y-auto text-sm text-slate-200">
        <li v-for="(entry, idx) in log" :key="idx">{{ entry }}</li>
      </ul>
    </div>
    </template>
  </section>
</template>
