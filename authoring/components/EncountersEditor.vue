<script setup lang="ts">
import { computed } from 'vue'
import type { EncounterModel } from '../api/authoringClient'

const props = defineProps<{
  encounters: Record<string, EncounterModel>
  nodes: Record<string, { id: string }>
  enemies: Record<string, { id: string }>
  selectedId: string | null
}>()
const emit = defineEmits<{
  select: [id: string | null]
  create: []
  delete: [id: string]
  update: [id: string, patch: Partial<EncounterModel>]
}>()

const nodeIds = computed(() => Object.keys(props.nodes))
const enemyIds = computed(() => Object.keys(props.enemies))
const list = computed(() => Object.values(props.encounters))
const selected = computed(() => (props.selectedId && props.encounters[props.selectedId]) ?? null)

function addEnemySlot(encounterId: string) {
  const enc = props.encounters[encounterId]
  const firstId = enemyIds.value[0] ?? ''
  const enemies = [...(enc?.enemies ?? []), { enemyId: firstId, count: 1 }]
  emit('update', encounterId, { enemies })
}

function updateEnemySlot(encounterId: string, index: number, enemyId: string, count: number) {
  const enc = props.encounters[encounterId]
  const enemies = [...(enc?.enemies ?? [])]
  if (enemies[index]) {
    enemies[index] = { enemyId, count }
    emit('update', encounterId, { enemies })
  }
}

function removeEnemySlot(encounterId: string, index: number) {
  const enc = props.encounters[encounterId]
  const enemies = (enc?.enemies ?? []).filter((_, i) => i !== index)
  emit('update', encounterId, { enemies })
}
</script>

<template>
  <div class="encounters-editor">
    <h3>Encounters</h3>
    <button type="button" class="btn-add" @click="emit('create')">Add encounter</button>
    <ul class="enc-list">
      <li
        v-for="enc in list"
        :key="enc.id"
        :class="{ selected: selectedId === enc.id }"
        @click="emit('select', enc.id)"
      >
        {{ enc.name ?? enc.id }}
      </li>
    </ul>
    <div v-if="selected" class="enc-form">
      <div class="field">
        <label>ID</label>
        <input :value="selected.id" disabled />
      </div>
      <div class="field">
        <label>Title</label>
        <input :value="selected.name ?? ''" @input="(e) => emit('update', selected.id, { name: (e.target as HTMLInputElement).value })" />
      </div>
      <div class="field">
        <label>Enemies</label>
        <div v-for="(slot, idx) in (selected.enemies ?? [])" :key="idx" class="enemy-slot">
          <select
            :value="slot.enemyId"
            @change="(e) => updateEnemySlot(selected.id, idx, (e.target as HTMLSelectElement).value, slot.count ?? 1)"
          >
            <option value="">— Select —</option>
            <option v-for="id in enemyIds" :key="id" :value="id">{{ id }}</option>
          </select>
          <input
            :value="slot.count ?? 1"
            type="number"
            min="1"
            @input="(e) => updateEnemySlot(selected.id, idx, slot.enemyId, Number((e.target as HTMLInputElement).value) || 1)"
          />
          <button type="button" class="btn-slot-remove" @click="removeEnemySlot(selected.id, idx)">×</button>
        </div>
        <button type="button" class="btn-slot-add" @click="addEnemySlot(selected.id)">+ Add enemy</button>
      </div>
      <div class="field">
        <label>On victory → node</label>
        <select
          :value="selected.resolution?.onVictory?.nextNodeId ?? ''"
          @change="(e) => emit('update', selected.id, { resolution: { onVictory: { nextNodeId: (e.target as HTMLSelectElement).value }, onDefeat: selected.resolution?.onDefeat ?? { nextNodeId: '' } } })"
        >
          <option value="">— Select —</option>
          <option v-for="id in nodeIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </div>
      <div class="field">
        <label>On defeat → node</label>
        <select
          :value="selected.resolution?.onDefeat?.nextNodeId ?? ''"
          @change="(e) => emit('update', selected.id, { resolution: { onVictory: selected.resolution?.onVictory ?? { nextNodeId: '' }, onDefeat: { nextNodeId: (e.target as HTMLSelectElement).value } } })"
        >
          <option value="">— Select —</option>
          <option v-for="id in nodeIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </div>
      <button type="button" class="btn-remove" @click="emit('delete', selected.id)">Delete encounter</button>
    </div>
  </div>
</template>

<style scoped>
.encounters-editor { padding: 1rem; }
.encounters-editor h3 { margin: 0 0 8px 0; font-size: 1rem; }
.enc-list { list-style: none; padding: 0; margin: 0 0 12px 0; max-height: 200px; overflow-y: auto; }
.enc-list li { padding: 6px 8px; cursor: pointer; border-radius: 4px; }
.enc-list li.selected { background: #e3f2fd; }
.enc-list li:hover { background: #f5f5f5; }
.enc-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; }
.field { margin-bottom: 8px; }
.field label { display: block; font-size: 0.8rem; color: #666; margin-bottom: 2px; }
.field input, .field select { width: 100%; padding: 4px 8px; box-sizing: border-box; }
.enemy-slot { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; }
.enemy-slot select { flex: 1; min-width: 0; }
.enemy-slot input { width: 50px; }
.btn-slot-add, .btn-slot-remove { padding: 2px 8px; cursor: pointer; font-size: 0.85rem; }
.btn-add { padding: 6px 12px; cursor: pointer; margin-bottom: 8px; }
.btn-remove { margin-top: 8px; padding: 6px 12px; cursor: pointer; }
</style>
