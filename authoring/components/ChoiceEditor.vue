<script setup lang="ts">
defineProps<{
  choiceId: string
  label: string
  mechanicSummary?: string
}>()
</script>

<template>
  <div class="choice-editor">
    <span class="choice-id">{{ choiceId }}</span>
    <span class="choice-label">{{ label }}</span>
    <span v-if="mechanicSummary" class="choice-mechanic">{{ mechanicSummary }}</span>
  </div>
</template>

<style scoped>
.choice-editor { display: flex; gap: 8px; align-items: center; padding: 4px 0; font-size: 0.9rem; }
.choice-id { color: #666; font-family: monospace; }
.choice-label { flex: 1; }
.choice-mechanic { font-size: 0.8rem; color: #888; }
</style>
