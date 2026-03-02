<script setup lang="ts">
import type { MaybeRef } from 'vue'
import { computed, nextTick, ref, unref, watch } from 'vue'
import { ITEM_DICTIONARY } from '../data/items'
import { resolveAction } from '../engine/actionResolver'
import { usePlayerStore } from '../stores/playerStore'

const props = defineProps<{
  /** Element or ref to focus when closing (e.g. Inventory button). */
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

const equippedWeapon = computed(() => {
  const id = playerStore.equipment.mainHand
  return id ? { id, ...ITEM_DICTIONARY[id] } : null
})

const equippedArmor = computed(() => {
  const id = playerStore.equipment.armor
  return id ? { id, ...ITEM_DICTIONARY[id] } : null
})

const inventoryItems = computed(() => {
  return Object.entries(playerStore.inventory.items).map(([id, qty]) => {
    const template = ITEM_DICTIONARY[id]
    return {
      id,
      qty,
      name: template?.name ?? id,
      description: template?.description,
      type: template?.type ?? 'unknown',
      damage: template?.damage,
      attackBonus: template?.attackBonus,
      acBonus: template?.acBonus,
      scalingAttribute: template?.scalingAttribute,
      isConsumable: template?.type === 'consumable' && !!template.effect,
      isWeapon: template?.type === 'weapon',
      isArmor: template?.type === 'armor',
      isEquipped: playerStore.equipment.mainHand === id,
      isArmorEquipped: playerStore.equipment.armor === id,
    }
  })
})

function handleEquip(itemId: string) {
  playerStore.equipItem('mainHand', itemId)
}

function handleUnequip() {
  playerStore.equipItem('mainHand', null)
}

function handleEquipArmor(itemId: string) {
  playerStore.equipItem('armor', itemId)
}

function handleUnequipArmor() {
  playerStore.equipItem('armor', null)
}

function handleUseConsumable(itemId: string) {
  const template = ITEM_DICTIONARY[itemId]
  if (!template?.effect) return
  resolveAction(template.effect, playerStore)
  playerStore.removeItem(itemId, 1)
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    role="dialog"
    aria-modal="true"
    aria-labelledby="inventory-title"
    @click.self="closeAndReturnFocus"
  >
    <div ref="panelRef" class="flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl sm:p-6">
      <div class="flex items-center justify-between">
        <h2 id="inventory-title" class="text-lg font-bold text-slate-50">Inventory</h2>
        <button
          type="button"
          class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
          aria-label="Close inventory"
          @click="closeAndReturnFocus"
        >
          Close
        </button>
      </div>

      <section class="mt-4">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Equipped Weapon</h3>
        <div v-if="equippedWeapon" class="mt-2 rounded border border-slate-600 bg-slate-800/60 p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-medium text-slate-100">{{ equippedWeapon.name }}</span>
            <button
              type="button"
              class="rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600"
              aria-label="Unequip weapon"
              @click="handleUnequip"
            >
              Unequip
            </button>
          </div>
          <div class="mt-1 flex gap-3 text-xs text-slate-400">
            <span v-if="equippedWeapon.damage">Dmg: {{ equippedWeapon.damage }}</span>
            <span v-if="equippedWeapon.attackBonus != null">Atk: +{{ equippedWeapon.attackBonus }}</span>
            <span v-if="equippedWeapon.scalingAttribute">{{ equippedWeapon.scalingAttribute.toUpperCase() }}</span>
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-slate-500">Unarmed</p>
      </section>

      <section class="mt-4">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Equipped Armor</h3>
        <div v-if="equippedArmor" class="mt-2 rounded border border-slate-600 bg-slate-800/60 p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-medium text-slate-100">{{ equippedArmor.name }}</span>
            <button
              type="button"
              class="rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600"
              aria-label="Unequip armor"
              @click="handleUnequipArmor"
            >
              Unequip
            </button>
          </div>
          <div v-if="equippedArmor.acBonus != null" class="mt-1 text-xs text-slate-400">AC: +{{ equippedArmor.acBonus }}</div>
        </div>
        <p v-else class="mt-2 text-sm text-slate-500">No armor</p>
      </section>

      <section class="mt-4">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Items</h3>
        <p class="mt-1 text-xs text-slate-500">Name, description, and stats shown for all items.</p>
        <div v-if="inventoryItems.length === 0" class="mt-2 text-sm text-slate-500">No items.</div>
        <ul v-else class="mt-2 space-y-3">
          <li
            v-for="item in inventoryItems"
            :key="item.id"
            class="rounded border border-slate-700 bg-slate-800/40 p-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium text-slate-100">{{ item.name }}</span>
                  <span class="text-xs text-slate-500">&times;{{ item.qty }}</span>
                  <span
                    class="rounded px-1.5 py-0.5 text-xs"
                    :class="{
                      'bg-red-900/40 text-red-300': item.type === 'weapon',
                      'bg-emerald-900/40 text-emerald-300': item.type === 'consumable',
                      'bg-sky-900/40 text-sky-300': item.type === 'tool',
                      'bg-slate-600/40 text-slate-300': item.type === 'armor',
                    }"
                  >
                    {{ item.type }}
                  </span>
                </div>
                <p v-if="item.description" class="mt-1 text-sm text-slate-400">{{ item.description }}</p>
                <p v-else-if="item.damage || item.attackBonus != null || item.acBonus != null || item.scalingAttribute" class="mt-1 text-xs text-slate-500">
                  <template v-if="item.damage">Dmg: {{ item.damage }}</template>
                  <template v-if="item.attackBonus != null">{{ item.damage ? ' · ' : '' }}Atk: +{{ item.attackBonus }}</template>
                  <template v-if="item.acBonus != null">{{ item.damage || item.attackBonus != null ? ' · ' : '' }}AC: +{{ item.acBonus }}</template>
                  <template v-if="item.scalingAttribute">{{ item.damage || item.attackBonus != null || item.acBonus != null ? ' · ' : '' }}{{ item.scalingAttribute.toUpperCase() }}</template>
                </p>
                <p v-else class="mt-1 text-xs text-slate-500">—</p>
              </div>
              <div class="flex flex-wrap gap-2">
              <button
                v-if="item.isWeapon && !item.isEquipped"
                type="button"
                class="rounded border border-amber-700 bg-amber-900/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/70"
                :aria-label="`Equip weapon ${item.name}`"
                @click="handleEquip(item.id)"
              >
                Equip
              </button>
              <span
                v-if="item.isWeapon && item.isEquipped"
                class="rounded bg-amber-900/30 px-2 py-1 text-xs text-amber-400"
              >
                Equipped
              </span>
              <button
                v-if="item.isArmor && !item.isArmorEquipped"
                type="button"
                class="rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600"
                :aria-label="`Equip armor ${item.name}`"
                @click="handleEquipArmor(item.id)"
              >
                Equip armor
              </button>
              <span
                v-if="item.isArmor && item.isArmorEquipped"
                class="rounded bg-slate-700/50 px-2 py-1 text-xs text-slate-400"
              >
                Worn
              </span>
              <button
                v-if="item.isConsumable"
                type="button"
                class="rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-900/70"
                :aria-label="`Use ${item.name}`"
                @click="handleUseConsumable(item.id)"
              >
                Use
              </button>
              </div>
            </div>
            <div v-if="(item.damage || item.attackBonus != null || item.acBonus != null || item.scalingAttribute) && item.description" class="mt-2 border-t border-slate-700/60 pt-2 text-xs text-slate-500">
              <template v-if="item.damage">Dmg: {{ item.damage }}</template>
              <template v-if="item.attackBonus != null">{{ item.damage ? ' · ' : '' }}Atk: +{{ item.attackBonus }}</template>
              <template v-if="item.acBonus != null">{{ item.damage || item.attackBonus != null ? ' · ' : '' }}AC: +{{ item.acBonus }}</template>
              <template v-if="item.scalingAttribute">{{ item.damage || item.attackBonus != null || item.acBonus != null ? ' · ' : '' }}{{ item.scalingAttribute.toUpperCase() }}</template>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
