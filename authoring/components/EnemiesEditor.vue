<script setup lang="ts">
import { computed } from 'vue'
import type { EnemyModel } from '../api/authoringClient'

const props = defineProps<{
  enemies: Record<string, EnemyModel>
  selectedId: string | null
}>()
const emit = defineEmits<{
  select: [id: string | null]
  create: []
  delete: [id: string]
  update: [id: string, patch: Partial<EnemyModel>]
}>()

const list = computed(() => Object.values(props.enemies))
const selected = computed(() => (props.selectedId && props.enemies[props.selectedId]) ?? null)
</script>

<template>
  <div class="enemies-editor">
    <h3>Enemies</h3>
    <button type="button" class="btn-add" @click="emit('create')">Add enemy</button>
    <ul class="enemy-list">
      <li
        v-for="enemy in list"
        :key="enemy.id"
        :class="{ selected: selectedId === enemy.id }"
        @click="emit('select', enemy.id)"
      >
        {{ enemy.name ?? enemy.id }} (HP {{ enemy.hp }})
      </li>
    </ul>
    <div v-if="selected" class="enemy-form">
      <div class="field">
        <label>ID</label>
        <input :value="selected.id" disabled />
      </div>
      <div class="field">
        <label>Name</label>
        <input :value="selected.name ?? ''" @input="(e) => emit('update', selected.id, { name: (e.target as HTMLInputElement).value })" />
      </div>
      <div class="field">
        <label>HP</label>
        <input :value="selected.hp" type="number" min="1" @input="(e) => emit('update', selected.id, { hp: Number((e.target as HTMLInputElement).value) || 1 })" />
      </div>
      <div class="field">
        <label>AC</label>
        <input :value="selected.ac" type="number" min="0" @input="(e) => emit('update', selected.id, { ac: Number((e.target as HTMLInputElement).value) || 0 })" />
      </div>
      <div class="field">
        <label>Attack bonus</label>
        <input :value="selected.attackBonus ?? 0" type="number" @input="(e) => emit('update', selected.id, { attackBonus: Number((e.target as HTMLInputElement).value) || 0 })" />
      </div>
      <div class="field">
        <label>Damage</label>
        <input :value="selected.damage ?? ''" @input="(e) => emit('update', selected.id, { damage: (e.target as HTMLInputElement).value })" placeholder="1d6" />
      </div>
      <div class="field">
        <label>XP reward</label>
        <input :value="selected.xpReward ?? 0" type="number" min="0" @input="(e) => emit('update', selected.id, { xpReward: Number((e.target as HTMLInputElement).value) || 0 })" />
      </div>
      <button type="button" class="btn-remove" @click="emit('delete', selected.id)">Delete enemy</button>
    </div>
  </div>
</template>

<style scoped>
.enemies-editor { padding: 1rem; }
.enemies-editor h3 { margin: 0 0 8px 0; font-size: 1rem; }
.enemy-list { list-style: none; padding: 0; margin: 0 0 12px 0; max-height: 200px; overflow-y: auto; }
.enemy-list li { padding: 6px 8px; cursor: pointer; border-radius: 4px; }
.enemy-list li.selected { background: #e3f2fd; }
.enemy-list li:hover { background: #f5f5f5; }
.enemy-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; }
.field { margin-bottom: 8px; }
.field label { display: block; font-size: 0.8rem; color: #666; margin-bottom: 2px; }
.field input { width: 100%; padding: 4px 8px; box-sizing: border-box; }
.btn-add { padding: 6px 12px; cursor: pointer; margin-bottom: 8px; }
.btn-remove { margin-top: 8px; padding: 6px 12px; cursor: pointer; }
</style>
