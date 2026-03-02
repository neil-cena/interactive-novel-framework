<script setup lang="ts">
import { computed } from 'vue'
import { ITEM_DICTIONARY } from '../data/items'
import { usePlayerStore } from '../stores/playerStore'

const playerStore = usePlayerStore()

const equippedWeapon = computed(() => {
  const weaponId = playerStore.equipment.mainHand
  return weaponId ? ITEM_DICTIONARY[weaponId] : null
})

const totalAttackBonus = computed(() => {
  const baseBonus = equippedWeapon.value?.attackBonus ?? 0
  const scalingAttr = equippedWeapon.value?.scalingAttribute ?? 'strength'
  return baseBonus + (playerStore.attributes[scalingAttr] ?? 0)
})
</script>

<template>
  <section
    class="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 sm:px-4 sm:py-3"
    aria-label="Player status"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
      <span class="font-medium text-slate-400">Player</span>
      <span class="text-slate-100">{{ playerStore.vitals.hpCurrent }}/{{ playerStore.vitals.hpMax }} HP</span>
      <span class="text-slate-300">{{ playerStore.inventory.currency }}g</span>
      <span class="min-w-0 truncate text-slate-300" :title="equippedWeapon?.name ?? 'Unarmed'">
        {{ equippedWeapon?.name ?? 'Unarmed' }}
      </span>
      <span class="text-slate-400">+{{ totalAttackBonus }} atk</span>
      <span class="text-slate-400">
        STR {{ playerStore.attributes.strength }} DEX {{ playerStore.attributes.dexterity }} INT {{ playerStore.attributes.intelligence }}
      </span>
      <span class="text-slate-400">Lv{{ playerStore.progression.level }} XP {{ playerStore.progression.xp }}/{{ playerStore.progression.xpToNextLevel }}</span>
      <span
        v-if="playerStore.progression.unspentAttributePoints > 0"
        class="rounded bg-amber-800/60 px-1.5 py-0.5 text-amber-200"
      >
        {{ playerStore.progression.unspentAttributePoints }} pts
      </span>
    </div>
  </section>
</template>
