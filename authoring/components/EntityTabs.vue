<script setup lang="ts">
defineProps<{
  activeTab: 'node' | 'encounters' | 'items' | 'enemies'
}>()
const emit = defineEmits<{ 'update:activeTab': [tab: 'node' | 'encounters' | 'items' | 'enemies'] }>()
</script>

<template>
  <div class="entity-tabs">
    <button
      type="button"
      :class="{ active: activeTab === 'node' }"
      @click="emit('update:activeTab', 'node')"
    >
      Node
    </button>
    <button
      type="button"
      :class="{ active: activeTab === 'encounters' }"
      @click="emit('update:activeTab', 'encounters')"
    >
      Encounters
    </button>
    <button
      type="button"
      :class="{ active: activeTab === 'items' }"
      @click="emit('update:activeTab', 'items')"
    >
      Items
    </button>
    <button
      type="button"
      :class="{ active: activeTab === 'enemies' }"
      @click="emit('update:activeTab', 'enemies')"
    >
      Enemies
    </button>
  </div>
</template>

<style scoped>
.entity-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 8px 0;
  border-bottom: 1px solid #eee;
  background: #f5f5f5;
}
.entity-tabs button {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-bottom: none;
  margin-bottom: -1px;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
}
.entity-tabs button.active {
  background: #fff;
  border-color: #eee;
  border-radius: 4px 4px 0 0;
}
</style>
