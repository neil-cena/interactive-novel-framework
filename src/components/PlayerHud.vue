<script setup lang="ts">
import { computed } from 'vue'
import { ITEM_DICTIONARY } from '../data/items'
import { usePlayerStore } from '../stores/playerStore'

const playerStore = usePlayerStore()

const equippedWeapon = computed(() => {
  const weaponId = playerStore.equipment.mainHand
  return weaponId ? ITEM_DICTIONARY[weaponId] : null
})

const totalAttackBonus = computed(() => equippedWeapon.value?.attackBonus ?? 0)
</script>

<template>
  <section class="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Player</h2>
    <div class="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-100">
      <p>HP: {{ playerStore.vitals.hpCurrent }}</p>
      <p>Gold: {{ playerStore.inventory.currency }}</p>
      <p>Weapon: {{ equippedWeapon?.name ?? 'Unarmed' }}</p>
      <p>Atk Bonus: +{{ totalAttackBonus }}</p>
      <p>Lockpicks: {{ playerStore.inventory.items.lockpick ?? 0 }}</p>
      <p>Flags: {{ Object.keys(playerStore.flags).length }}</p>
    </div>
  </section>
</template>
