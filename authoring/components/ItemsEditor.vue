<script setup lang="ts">
import { computed } from 'vue'
import type { ItemModel } from '../api/authoringClient'

const props = defineProps<{
  items: Record<string, ItemModel>
  selectedId: string | null
}>()
const emit = defineEmits<{
  select: [id: string | null]
  create: []
  delete: [id: string]
  update: [id: string, patch: Partial<ItemModel>]
}>()

const list = computed(() => Object.values(props.items))
const selected = computed(() => (props.selectedId && props.items[props.selectedId]) ?? null)

const TYPES = ['weapon', 'consumable', 'tool']
const ATTRIBUTES = ['strength', 'dexterity', 'intelligence']
</script>

<template>
  <div class="items-editor">
    <h3>Items</h3>
    <button type="button" class="btn-add" @click="emit('create')">Add item</button>
    <ul class="item-list">
      <li
        v-for="item in list"
        :key="item.id"
        :class="{ selected: selectedId === item.id }"
        @click="emit('select', item.id)"
      >
        {{ item.name ?? item.id }} ({{ item.type }})
      </li>
    </ul>
    <div v-if="selected" class="item-form">
      <div class="field">
        <label>ID</label>
        <input :value="selected.id" disabled />
      </div>
      <div class="field">
        <label>Name</label>
        <input :value="selected.name ?? ''" @input="(e) => emit('update', selected.id, { name: (e.target as HTMLInputElement).value })" />
      </div>
      <div class="field">
        <label>Type</label>
        <select :value="selected.type" @change="(e) => emit('update', selected.id, { type: (e.target as HTMLSelectElement).value })">
          <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <template v-if="selected.type === 'weapon'">
        <div class="field">
          <label>Damage</label>
          <input :value="selected.damage ?? ''" @input="(e) => emit('update', selected.id, { damage: (e.target as HTMLInputElement).value })" placeholder="1d6" />
        </div>
        <div class="field">
          <label>Attack bonus</label>
          <input :value="selected.attackBonus ?? 0" type="number" @input="(e) => emit('update', selected.id, { attackBonus: Number((e.target as HTMLInputElement).value) || 0 })" />
        </div>
        <div class="field">
          <label>Scaling attribute</label>
          <select :value="selected.scalingAttribute ?? ''" @change="(e) => emit('update', selected.id, { scalingAttribute: (e.target as HTMLSelectElement).value || undefined })">
            <option value="">—</option>
            <option v-for="a in ATTRIBUTES" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="field">
          <label>AoE</label>
          <input type="checkbox" :checked="selected.aoe === true" @change="(e) => emit('update', selected.id, { aoe: (e.target as HTMLInputElement).checked })" />
        </div>
      </template>
      <template v-if="selected.type === 'consumable'">
        <div class="field">
          <label>Effect (e.g. heal:2d4+2)</label>
          <input :value="selected.effect ? (selected.effect as { action?: string; amount?: string }).action + ':' + (selected.effect as { amount?: string }).amount : ''" @input="(e) => { const v = (e.target as HTMLInputElement).value; const [action, amount] = v.split(':'); if (action) emit('update', selected.id, { effect: { action, amount: amount ?? '0' } }) }" />
        </div>
      </template>
      <button type="button" class="btn-remove" @click="emit('delete', selected.id)">Delete item</button>
    </div>
  </div>
</template>

<style scoped>
.items-editor { padding: 1rem; }
.items-editor h3 { margin: 0 0 8px 0; font-size: 1rem; }
.item-list { list-style: none; padding: 0; margin: 0 0 12px 0; max-height: 200px; overflow-y: auto; }
.item-list li { padding: 6px 8px; cursor: pointer; border-radius: 4px; }
.item-list li.selected { background: #e3f2fd; }
.item-list li:hover { background: #f5f5f5; }
.item-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; }
.field { margin-bottom: 8px; }
.field label { display: block; font-size: 0.8rem; color: #666; margin-bottom: 2px; }
.field input, .field select { width: 100%; padding: 4px 8px; box-sizing: border-box; }
.btn-add { padding: 6px 12px; cursor: pointer; margin-bottom: 8px; }
.btn-remove { margin-top: 8px; padding: 6px 12px; cursor: pointer; }
</style>
