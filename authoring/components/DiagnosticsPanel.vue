<script setup lang="ts">
import type { Diagnostic } from '../api/authoringClient'

defineProps<{
  errors: Diagnostic[]
  warnings: Diagnostic[]
}>()
</script>

<template>
  <div class="diagnostics-panel">
    <h4>Diagnostics</h4>
    <div v-if="errors.length" class="errors">
      <div v-for="(e, i) in errors" :key="i" class="diag error"><span class="code">{{ e.code }}</span> {{ e.message }}</div>
    </div>
    <div v-if="warnings.length" class="warnings">
      <div v-for="(w, i) in warnings" :key="i" class="diag warning"><span class="code">{{ w.code }}</span> {{ w.message }}</div>
    </div>
    <p v-if="!errors.length && !warnings.length" class="empty">No errors or warnings.</p>
  </div>
</template>

<style scoped>
.diagnostics-panel { padding: 0.75rem; background: #f5f5f5; border-top: 1px solid #eee; max-height: 180px; overflow-y: auto; font-size: 0.85rem; }
.diagnostics-panel h4 { margin: 0 0 8px 0; font-size: 0.9rem; }
.diag { padding: 4px 0; }
.diag.error { color: #c62828; }
.diag.warning { color: #e65100; }
.code { font-family: monospace; margin-right: 6px; }
.empty { color: #999; margin: 0; }
</style>
