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
  <section class="rounded-lg border border-slate-700 bg-slate-900/80 p-4" aria-label="Player status">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Player</h2>
    <div class="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-100">
      <p>HP: {{ playerStore.vitals.hpCurrent }} / {{ playerStore.vitals.hpMax }}</p>
      <p>Gold: {{ playerStore.inventory.currency }}</p>
      <p>Weapon: {{ equippedWeapon?.name ?? 'Unarmed' }}</p>
      <p>Atk Bonus: +{{ totalAttackBonus }}</p>
    </div>
    <div class="mt-2 flex gap-3 text-sm text-slate-300">
      <span>STR {{ playerStore.attributes.strength }}</span>
      <span>DEX {{ playerStore.attributes.dexterity }}</span>
      <span>INT {{ playerStore.attributes.intelligence }}</span>
    </div>
    <div class="mt-2 flex gap-3 text-sm text-slate-300">
      <span>Lv {{ playerStore.progression.level }}</span>
      <span>XP {{ playerStore.progression.xp }} / {{ playerStore.progression.xpToNextLevel }}</span>
      <span v-if="playerStore.progression.unspentAttributePoints > 0" class="rounded bg-amber-800/60 px-1.5 py-0.5 text-xs text-amber-200">
        {{ playerStore.progression.unspentAttributePoints }} pts
      </span>
    </div>
  </section>
</template>
