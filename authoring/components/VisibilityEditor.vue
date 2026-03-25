<script setup lang="ts">
import { computed } from 'vue'

export interface VisibilityReq {
  type: string
  key?: string
  itemId?: string
  stat?: string
  operator?: string
  value?: number
}

const props = defineProps<{
  requirements: VisibilityReq[]
  itemIds?: string[]
}>()
const emit = defineEmits<{ update: [requirements: VisibilityReq[]] }>()

const itemIds = computed(() => props.itemIds ?? [])
const STATS = ['hpCurrent', 'currency']
const OPERATORS = ['>=', '<=', '==', '>', '<']

function updateAt(index: number, patch: Partial<VisibilityReq>) {
  const next = [...(props.requirements ?? [])]
  next[index] = { ...next[index], ...patch }
  emit('update', next)
}

function remove(index: number) {
  const next = (props.requirements ?? []).filter((_, i) => i !== index)
  emit('update', next)
}

function add(type: 'has_flag' | 'has_item' | 'stat_check') {
  const next = [...(props.requirements ?? [])]
  if (type === 'has_flag') next.push({ type: 'has_flag', key: '' })
  else if (type === 'has_item') next.push({ type: 'has_item', itemId: '' })
  else next.push({ type: 'stat_check', stat: 'hpCurrent', operator: '>=', value: 0 })
  emit('update', next)
}
</script>

<template>
  <div class="visibility-editor">
    <label class="section-label">Visibility</label>
    <div v-for="(req, idx) in (requirements ?? [])" :key="idx" class="req-row">
      <select :value="req.type" @change="(e) => updateAt(idx, { type: (e.target as HTMLSelectElement).value })">
        <option value="has_flag">has_flag</option>
        <option value="has_item">has_item</option>
        <option value="stat_check">stat_check</option>
      </select>
      <template v-if="req.type === 'has_flag'">
        <input
          :value="req.key ?? ''"
          placeholder="flag key"
          @input="(e) => updateAt(idx, { key: (e.target as HTMLInputElement).value })"
        />
      </template>
      <template v-else-if="req.type === 'has_item'">
        <select
          :value="req.itemId ?? ''"
          @change="(e) => updateAt(idx, { itemId: (e.target as HTMLSelectElement).value })"
        >
          <option value="">— Select —</option>
          <option v-for="id in itemIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </template>
      <template v-else-if="req.type === 'stat_check'">
        <select
          :value="req.stat ?? 'hpCurrent'"
          @change="(e) => updateAt(idx, { stat: (e.target as HTMLSelectElement).value })"
        >
          <option v-for="s in STATS" :key="s" :value="s">{{ s }}</option>
        </select>
        <select
          :value="req.operator ?? '>='"
          @change="(e) => updateAt(idx, { operator: (e.target as HTMLSelectElement).value })"
        >
          <option v-for="op in OPERATORS" :key="op" :value="op">{{ op }}</option>
        </select>
        <input
          :value="req.value ?? 0"
          type="number"
          @input="(e) => updateAt(idx, { value: Number((e.target as HTMLInputElement).value) || 0 })"
        />
      </template>
      <button type="button" class="btn-remove" @click="remove(idx)">×</button>
    </div>
    <div class="add-btns">
      <button type="button" class="btn-add" @click="add('has_flag')">+ flag</button>
      <button type="button" class="btn-add" @click="add('has_item')">+ item</button>
      <button type="button" class="btn-add" @click="add('stat_check')">+ stat</button>
    </div>
  </div>
</template>

<style scoped>
.visibility-editor { margin-top: 6px; }
.section-label { font-size: 0.75rem; color: #666; display: block; margin-bottom: 4px; }
.req-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 4px; }
.req-row select, .req-row input { padding: 2px 6px; font-size: 0.85rem; min-width: 0; }
.req-row input[type="number"] { width: 60px; }
.btn-remove { padding: 2px 6px; cursor: pointer; }
.add-btns { display: flex; gap: 4px; margin-top: 4px; }
.btn-add { padding: 2px 8px; font-size: 0.8rem; cursor: pointer; }
</style>
