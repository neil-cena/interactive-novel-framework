<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Diagnostic } from '../api/authoringClient'

const props = defineProps<{
  errors: Diagnostic[]
  warnings: Diagnostic[]
}>()
const emit = defineEmits<{ focus: [diagnostic: Diagnostic] }>()

const severityFilter = ref<'all' | 'error' | 'warning'>('all')
const codeFilter = ref<string>('')
const expandedId = ref<string | null>(null)

const allDiagnostics = computed(() => {
  const errs = (props.errors ?? []).map((e) => ({ ...e, severity: 'error' as const }))
  const warns = (props.warnings ?? []).map((w) => ({ ...w, severity: 'warning' as const }))
  return [...errs, ...warns]
})

const filtered = computed(() => {
  let list = allDiagnostics.value
  if (severityFilter.value !== 'all') {
    list = list.filter((d) => d.severity === severityFilter.value)
  }
  if (codeFilter.value.trim()) {
    const code = codeFilter.value.trim().toUpperCase()
    list = list.filter((d) => d.code?.toUpperCase().includes(code))
  }
  return list
})

function diagKey(d: Diagnostic, i: number): string {
  return `${d.code}-${d.message}-${i}`
}

function toggleExpand(d: Diagnostic, i: number) {
  const key = diagKey(d, i)
  expandedId.value = expandedId.value === key ? null : key
}

function handleClick(d: Diagnostic) {
  emit('focus', d)
}

function contextSummary(ctx: Record<string, unknown> | undefined): string {
  if (!ctx) return ''
  const parts = Object.entries(ctx).map(([k, v]) => `${k}: ${v}`)
  return parts.join(', ')
}
</script>

<template>
  <div class="diagnostics-panel">
    <div class="panel-header">
      <h4>Diagnostics</h4>
      <div class="filters">
        <select v-model="severityFilter">
          <option value="all">All</option>
          <option value="error">Errors</option>
          <option value="warning">Warnings</option>
        </select>
        <input v-model="codeFilter" type="text" placeholder="Filter by code" class="code-filter" />
      </div>
    </div>
    <div v-if="filtered.length" class="diag-list">
      <div
        v-for="(d, i) in filtered"
        :key="diagKey(d, i)"
        class="diag-row"
        :class="[d.severity, { expanded: expandedId === diagKey(d, i) }]"
        @click="handleClick(d)"
      >
        <button type="button" class="diag-summary" @click.stop="toggleExpand(d, i)">
          <span class="code">{{ d.code }}</span>
          {{ d.message }}
        </button>
        <div v-if="expandedId === diagKey(d, i)" class="diag-detail" @click.stop>
          <p v-if="d.file">File: {{ d.file }}</p>
          <p v-if="d.row">Row: {{ d.row }}</p>
          <p v-if="d.hint">Hint: {{ d.hint }}</p>
          <p v-if="d.context && Object.keys(d.context).length">Context: {{ contextSummary(d.context) }}</p>
        </div>
      </div>
    </div>
    <p v-else class="empty">No errors or warnings.</p>
  </div>
</template>

<style scoped>
.diagnostics-panel {
  padding: 0.75rem;
  background: #f5f5f5;
  border-top: 1px solid #eee;
  max-height: 220px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
}
.panel-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.panel-header h4 { margin: 0; font-size: 0.9rem; }
.filters { display: flex; gap: 8px; align-items: center; }
.code-filter { width: 120px; padding: 2px 6px; font-size: 0.85rem; }
.diag-list { overflow-y: auto; flex: 1; min-height: 0; }
.diag-row { border-radius: 4px; margin-bottom: 2px; }
.diag-row.error { background: #ffebee; }
.diag-row.warning { background: #fff3e0; }
.diag-summary { display: block; width: 100%; text-align: left; padding: 4px 8px; cursor: pointer; border: none; background: transparent; font-size: inherit; }
.diag-summary:hover { text-decoration: underline; }
.diag-row .code { font-family: monospace; margin-right: 6px; }
.diag-detail { padding: 4px 8px 8px 24px; font-size: 0.8rem; color: #555; }
.diag-detail p { margin: 2px 0; }
.empty { color: #999; margin: 0; }
</style>
