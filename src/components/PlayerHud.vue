<script setup lang="ts">
import { computed } from 'vue'
import { ITEM_DICTIONARY } from '../data/items'
import { usePlayerStore } from '../stores/playerStore'
import { usePluginRegistry } from '../plugins/registry'

const playerStore = usePlayerStore()
const registry = usePluginRegistry()

const hasVitals = computed(() => registry.hasPlugin('vitals'))
const hasCombat = computed(() => registry.hasPlugin('combat'))
const hasInventory = computed(() => registry.hasPlugin('inventory'))
const hasProgression = computed(() => registry.hasPlugin('progression'))
const hasWorldState = computed(() => registry.hasPlugin('world-state'))

const equippedWeapon = computed(() => {
  const weaponId = playerStore.equipment.mainHand
  return weaponId ? ITEM_DICTIONARY[weaponId] : null
})

const totalAttackBonus = computed(() => {
  const baseBonus = equippedWeapon.value?.attackBonus ?? 0
  const scalingAttr = equippedWeapon.value?.scalingAttribute ?? 'strength'
  return baseBonus + (playerStore.attributes[scalingAttr] ?? 0)
})

function barColor(stat: string, value: number): string {
  if (stat === 'vaelEnergy' || stat === 'districtStability') {
    if (value >= 60) return 'bg-emerald-500'
    if (value >= 30) return 'bg-amber-500'
    return 'bg-red-500'
  }
  if (value >= 70) return 'bg-red-500'
  if (value >= 40) return 'bg-amber-500'
  return 'bg-emerald-500'
}
</script>

<template>
  <section
    v-if="hasVitals || hasInventory || hasProgression || hasWorldState"
    class="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 sm:px-4 sm:py-3"
    aria-label="Player status"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
      <span class="font-medium text-slate-400">Vael</span>
      <span v-if="hasVitals" class="text-slate-100">{{ playerStore.vitals.hpCurrent }}/{{ playerStore.vitals.hpMax }} Resolve</span>
      <span v-if="hasInventory" class="text-slate-300">{{ playerStore.inventory.currency }}g</span>
      <template v-if="hasCombat">
        <span class="min-w-0 truncate text-slate-300" :title="equippedWeapon?.name ?? 'Unarmed'">
          {{ equippedWeapon?.name ?? 'Unarmed' }}
        </span>
        <span class="text-slate-400">+{{ totalAttackBonus }} atk</span>
      </template>
      <span v-if="hasProgression" class="text-slate-400">
        STR {{ playerStore.attributes.strength }} DEX {{ playerStore.attributes.dexterity }} INT {{ playerStore.attributes.intelligence }}
      </span>
      <span v-if="hasProgression" class="text-slate-400">Lv{{ playerStore.progression.level }} XP {{ playerStore.progression.xp }}/{{ playerStore.progression.xpToNextLevel }}</span>
      <span
        v-if="hasProgression && playerStore.progression.unspentAttributePoints > 0"
        class="rounded bg-amber-800/60 px-1.5 py-0.5 text-amber-200"
      >
        {{ playerStore.progression.unspentAttributePoints }} pts
      </span>
    </div>

    <div v-if="hasWorldState" class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
      <div>
        <div class="mb-0.5 flex items-center justify-between text-xs">
          <span class="text-cyan-300">Energy</span>
          <span class="tabular-nums text-slate-400">{{ playerStore.worldState.vaelEnergy }}</span>
        </div>
        <div class="h-1.5 rounded-full bg-slate-700">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="barColor('vaelEnergy', playerStore.worldState.vaelEnergy)"
            :style="{ width: `${playerStore.worldState.vaelEnergy}%` }"
          />
        </div>
      </div>
      <div>
        <div class="mb-0.5 flex items-center justify-between text-xs">
          <span class="text-amber-300">Comm. Cost</span>
          <span class="tabular-nums text-slate-400">{{ playerStore.worldState.communityCost }}</span>
        </div>
        <div class="h-1.5 rounded-full bg-slate-700">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="barColor('communityCost', playerStore.worldState.communityCost)"
            :style="{ width: `${playerStore.worldState.communityCost}%` }"
          />
        </div>
      </div>
      <div>
        <div class="mb-0.5 flex items-center justify-between text-xs">
          <span class="text-red-300">Chaos</span>
          <span class="tabular-nums text-slate-400">{{ playerStore.worldState.stateChaos }}</span>
        </div>
        <div class="h-1.5 rounded-full bg-slate-700">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="barColor('stateChaos', playerStore.worldState.stateChaos)"
            :style="{ width: `${playerStore.worldState.stateChaos}%` }"
          />
        </div>
      </div>
      <div>
        <div class="mb-0.5 flex items-center justify-between text-xs">
          <span class="text-blue-300">Stability</span>
          <span class="tabular-nums text-slate-400">{{ playerStore.worldState.districtStability }}</span>
        </div>
        <div class="h-1.5 rounded-full bg-slate-700">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="barColor('districtStability', playerStore.worldState.districtStability)"
            :style="{ width: `${playerStore.worldState.districtStability}%` }"
          />
        </div>
      </div>
    </div>
  </section>
</template>
