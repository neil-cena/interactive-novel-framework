<script setup lang="ts">
import { computed } from 'vue'

export interface OnEnterAction {
  action: string
  key?: string
  value?: boolean
  itemId?: string
  qty?: number
  amount?: number | string
}

const props = defineProps<{
  actions: OnEnterAction[]
  itemIds?: string[]
}>()
const emit = defineEmits<{ update: [actions: OnEnterAction[]] }>()

const itemIds = computed(() => props.itemIds ?? [])

function updateAt(index: number, patch: Partial<OnEnterAction>) {
  const next = [...(props.actions ?? [])]
  next[index] = { ...next[index], ...patch }
  emit('update', next)
}

function remove(index: number) {
  const next = (props.actions ?? []).filter((_, i) => i !== index)
  emit('update', next)
}

function add(type: OnEnterAction['action']) {
  const next = [...(props.actions ?? [])]
  if (type === 'set_flag') next.push({ action: 'set_flag', key: '', value: true })
  else if (type === 'add_item' || type === 'remove_item') next.push({ action: type, itemId: '', qty: 1 })
  else if (type === 'adjust_hp' || type === 'adjust_currency' || type === 'heal') next.push({ action: type, amount: 0 })
  else next.push({ action: type })
  emit('update', next)
}
</script>

<template>
  <div class="on-enter-editor">
    <label class="section-label">On enter actions</label>
    <div v-for="(act, idx) in (actions ?? [])" :key="idx" class="action-row">
      <select :value="act.action" @change="(e) => updateAt(idx, { action: (e.target as HTMLSelectElement).value })">
        <option value="set_flag">set_flag</option>
        <option value="add_item">add_item</option>
        <option value="remove_item">remove_item</option>
        <option value="adjust_hp">adjust_hp</option>
        <option value="adjust_currency">adjust_currency</option>
        <option value="heal">heal</option>
      </select>
      <template v-if="act.action === 'set_flag'">
        <input
          :value="act.key ?? ''"
          placeholder="key"
          @input="(e) => updateAt(idx, { key: (e.target as HTMLInputElement).value })"
        />
        <label><input type="checkbox" :checked="act.value !== false" @change="(e) => updateAt(idx, { value: (e.target as HTMLInputElement).checked })" /> true</label>
      </template>
      <template v-else-if="act.action === 'add_item' || act.action === 'remove_item'">
        <select
          :value="act.itemId ?? ''"
          @change="(e) => updateAt(idx, { itemId: (e.target as HTMLSelectElement).value })"
        >
          <option value="">— Select —</option>
          <option v-for="id in itemIds" :key="id" :value="id">{{ id }}</option>
        </select>
        <input
          :value="act.qty ?? 1"
          type="number"
          min="1"
          @input="(e) => updateAt(idx, { qty: Number((e.target as HTMLInputElement).value) || 1 })"
        />
      </template>
      <template v-else-if="act.action === 'adjust_hp' || act.action === 'adjust_currency' || act.action === 'heal'">
        <input
          :value="act.amount ?? 0"
          type="text"
          placeholder="e.g. -3 or 2d4+2"
          @input="(e) => updateAt(idx, { amount: (e.target as HTMLInputElement).value })"
        />
      </template>
      <button type="button" class="btn-remove" @click="remove(idx)">×</button>
    </div>
    <div class="add-btns">
      <button type="button" class="btn-add" @click="add('set_flag')">+ set_flag</button>
      <button type="button" class="btn-add" @click="add('add_item')">+ add_item</button>
      <button type="button" class="btn-add" @click="add('remove_item')">+ remove_item</button>
      <button type="button" class="btn-add" @click="add('adjust_hp')">+ adjust_hp</button>
      <button type="button" class="btn-add" @click="add('adjust_currency')">+ adjust_currency</button>
      <button type="button" class="btn-add" @click="add('heal')">+ heal</button>
    </div>
  </div>
</template>

<style scoped>
.on-enter-editor { margin-top: 0.75rem; }
.section-label { font-size: 0.85rem; color: #666; display: block; margin-bottom: 4px; }
.action-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 4px; }
.action-row select, .action-row input { padding: 2px 6px; font-size: 0.85rem; min-width: 0; }
.btn-remove { padding: 2px 6px; cursor: pointer; }
.add-btns { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.btn-add { padding: 2px 8px; font-size: 0.8rem; cursor: pointer; }
</style>
